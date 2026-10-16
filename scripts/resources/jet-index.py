#!/usr/bin/env python3
"""Bounded original JET name/header index. No image conversion or sprite inference.

Header source: CRMResMap::ExtractJETInfo/GetResListinJET and RM10to38.
Strict offline admission additionally requires unique resources and contiguous
part indices; native replacement semantics are deliberately not emulated.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import struct
import sys
import zlib
from pathlib import Path

ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._"
HEADER = struct.Struct("<3IQH2s")
NAME_LIMIT = 38 ** 12
MAX_FILE = 128 * 1024 * 1024
MAX_INFLATED = 64 * 1024 * 1024
MAX_CHUNKS = 10000
MAX_AT_FRAMES = 1024
MAX_AT_TAG_BYTES = 4096
MAX_AT_CAPTURE = 47 + MAX_AT_FRAMES * (14 + MAX_AT_TAG_BYTES)
MAX_S2_IMAGES = 1024
MAX_S2_CAPTURE = 50 + 16 * MAX_S2_IMAGES
MIRAGE_SHA256 = "d2cf0adca895de1174f35f507cf5e38a21b8e74572a5c895c50ad6c062f4374e"

def decode_name(value: int) -> str:
    if type(value) is not int or not 0 <= value < NAME_LIMIT:
        raise ValueError("JET name must be unsigned and below native 38^12 bound")
    if value == 0:
        return "0"
    digits = []
    while value:
        value, digit = divmod(value, 38)
        digits.append(ALPHABET[digit])
    return "".join(reversed(digits))

def encode_name(name: str) -> int:
    # Native also accepts lowercase; canonical tooling uses uppercase only.
    # Native '[' alias for '.' is intentionally excluded from strict output.
    if type(name) is not str or not 1 <= len(name) <= 12 or any(c not in ALPHABET for c in name):
        raise ValueError("JET name requires 1..12 canonical base38 characters")
    result = 0
    for char in name:
        result = result * 38 + ALPHABET.index(char)
    if decode_name(result) != name:
        raise ValueError("JET name is not canonical (leading zero)")
    return result

def inflate_chunk(payload: bytes, expected: int) -> bytes:
    if len(payload) == expected:
        return payload
    try:
        inflater = zlib.decompressobj()
        result = inflater.decompress(payload, expected + 1)
    except zlib.error as error:
        raise ValueError("Invalid JET zlib payload") from error
    # Never call unbounded flush: the limit above covers all decompression.
    if len(result) != expected or not inflater.eof or inflater.unconsumed_tail or inflater.unused_data:
        raise ValueError("JET zlib length/end/trailing-data mismatch")
    return result

def index_jet(data: bytes, *, max_inflated: int = MAX_INFLATED,
              max_file: int = MAX_FILE, max_chunks: int = MAX_CHUNKS) -> dict:
    if type(data) is not bytes or not data or len(data) > max_file:
        raise ValueError("JET input empty or exceeds file limit")
    if any(type(v) is not int or v < 1 for v in (max_inflated, max_file, max_chunks)):
        raise ValueError("JET limits must be positive integers")
    position = 0
    inflated_total = 0
    chunk_count = 0
    resources = []
    prefixes = {}
    seen = set()
    current = None
    resource_hash = None
    while position < len(data):
        if len(data) - position < HEADER.size:
            raise ValueError("Truncated JET header; exact EOF required")
        if chunk_count >= max_chunks:
            raise ValueError("JET chunk limit exceeded")
        whole, raw_size, stored_size, identifier, part, type_bytes = HEADER.unpack_from(data, position)
        name = decode_name(identifier)
        if not whole or not raw_size or not stored_size or raw_size > whole or whole > max_inflated:
            raise ValueError("Invalid or oversized JET size header")
        end = position + HEADER.size + stored_size
        if end > len(data):
            raise ValueError("Truncated JET payload")
        if part == 0:
            if current is not None and current["decoded_bytes"] != current["total_bytes"]:
                raise ValueError("JET resource incomplete before next resource")
            if name in seen:
                raise ValueError("Duplicate JET resource; native replacement is unsupported")
            seen.add(name)
            current = {"name": name, "encoded_name": str(identifier), "offset": position,
                       "total_bytes": whole, "decoded_bytes": 0, "chunks": [], "payload_prefix_hex": ""}
            resources.append(current)
            prefixes[name] = bytearray()
            resource_hash = hashlib.sha256()
        elif current is None or current["name"] != name or part != len(current["chunks"]):
            raise ValueError("JET continuation identity/index mismatch")
        if whole != current["total_bytes"] or current["decoded_bytes"] + raw_size > whole:
            raise ValueError("JET continuation total length mismatch")
        inflated_total += raw_size
        if inflated_total > max_inflated:
            raise ValueError("JET cumulative inflation limit exceeded")
        decoded = inflate_chunk(data[position + HEADER.size:end], raw_size)
        capture = prefixes[name]
        # Capture bounded supported S2/AT structures, never complete images.
        kind = bytes(capture[:2])
        kind += decoded[:2 - len(kind)]
        limit = MAX_AT_CAPTURE if kind == b"AT" else MAX_S2_CAPTURE if kind == b"S2" else 66
        capture.extend(decoded[:max(0, limit - len(capture))])
        current["payload_prefix_hex"] = bytes(capture[:2]).hex()
        resource_hash.update(decoded)
        current["decoded_bytes"] += len(decoded)
        current["sha256"] = resource_hash.hexdigest()
        current["chunks"].append({"offset": position, "payload_offset": position + HEADER.size,
                                  "raw_bytes": raw_size, "stored_bytes": stored_size,
                                  "part": part, "type_bytes_hex": type_bytes.hex(),
                                  "header_hex": data[position:position + HEADER.size].hex()})
        chunk_count += 1
        position = end
    if current is None or current["decoded_bytes"] != current["total_bytes"]:
        raise ValueError("JET final resource is incomplete")
    by_name = {row["name"]: row for row in resources}
    for resource in resources:
        payload = bytes(prefixes[resource["name"]])
        if payload[:2] != b"S2":
            continue
        unsupported = {"supported": False, "reason": "Only bounded exact-EOF zero-auxiliary S2 image lists are decoded"}
        if resource["decoded_bytes"] != len(payload) or len(payload) < 50:
            resource["s2projection"] = unsupported
            continue
        count = struct.unpack_from("<I", payload, 42)[0]
        if not 1 <= count <= MAX_S2_IMAGES or len(payload) != 50 + 16 * count or struct.unpack_from("<I", payload, 46 + 16 * count)[0] != 0:
            resource["s2projection"] = unsupported
            continue
        transform = struct.unpack_from("<10f", payload, 2)
        if not all(math.isfinite(value) for value in transform):
            raise ValueError("Supported S2 transform contains nonfinite float32")
        images = []
        for index in range(count):
            image_key, x, y = struct.unpack_from("<Qii", payload, 46 + 16 * index)
            image_name = decode_name(image_key)
            image = by_name.get(image_name)
            if image is None or image["payload_prefix_hex"] != b"I2".hex():
                raise ValueError("Supported S2 image key does not resolve to an assembled I2 resource")
            images.append({"image_encoded_name": str(image_key), "image_name": image_name,
                           "image_sha256": image["sha256"], "image_decoded_bytes": image["decoded_bytes"],
                           "point": {"x": x, "y": y}})
        resource["s2projection"] = {"supported": True, "image_count": count, "auxiliary_count": 0,
                                    "transform_hex": payload[2:42].hex(), "transform_float32": list(transform),
                                    "images": images}
        if count == 1:
            resource["s2projection"].update(images[0])
    for resource in resources:
        payload = bytes(prefixes[resource["name"]])
        if payload[:2] != b"AT":
            continue
        unsupported = {"supported": False, "reason": "Only bounded exact-EOF AT frame/tag records are decoded"}
        if resource["decoded_bytes"] != len(payload) or len(payload) < 47:
            resource["atprojection"] = unsupported
            continue
        count = struct.unpack_from("<I", payload, 43)[0]
        if not 1 <= count <= MAX_AT_FRAMES:
            resource["atprojection"] = unsupported
            continue
        at_position = 47
        frames = []
        for _ in range(count):
            if len(payload) - at_position < 14:
                break
            key, duration = struct.unpack_from("<Qf", payload, at_position)
            tag_bytes = struct.unpack_from("<H", payload, at_position + 12)[0]
            if tag_bytes > MAX_AT_TAG_BYTES or len(payload) - at_position - 14 < tag_bytes:
                break
            frames.append({"sprite_encoded_name": str(key), "duration_float32": duration,
                           "duration_hex": payload[at_position + 8:at_position + 12].hex(),
                           "tag_hex": payload[at_position + 14:at_position + 14 + tag_bytes].hex()})
            at_position += 14 + tag_bytes
        if len(frames) != count or at_position != len(payload):
            resource["atprojection"] = unsupported
            continue
        transform = struct.unpack_from("<10f", payload, 2)
        if not all(math.isfinite(value) for value in transform):
            raise ValueError("Supported AT transform contains nonfinite float32")
        for frame in frames:
            # Finite, nonnegative duration is LOCAL supported admission; native
            # Add receives the float32 bits without a proved equivalent guard.
            if not math.isfinite(frame["duration_float32"]) or frame["duration_float32"] < 0:
                raise ValueError("Supported AT duration must be locally finite and nonnegative")
            sprite_name = decode_name(int(frame["sprite_encoded_name"]))
            sprite = by_name.get(sprite_name)
            if sprite is None or sprite["payload_prefix_hex"] != b"S2".hex():
                raise ValueError("Supported AT frame does not resolve to an assembled S2 resource")
            frame.update({"sprite_name": sprite_name, "sprite_sha256": sprite["sha256"],
                          "sprite_decoded_bytes": sprite["decoded_bytes"],
                          "sprite_projection_supported": sprite.get("s2projection", {}).get("supported", False)})
        resource["atprojection"] = {"supported": True, "frame_count": count,
                                    "opaque_byte": payload[42], "transform_hex": payload[2:42].hex(),
                                    "transform_float32": list(transform), "frames": frames,
                                    "all_sprite_projections_supported": all(frame["sprite_projection_supported"] for frame in frames),
                                    "admission": "LOCAL bounded frames/tags, exact EOF, finite transform and nonnegative finite durations"}
    digest = hashlib.sha256(data).hexdigest()
    return {"schema": 1, "format": "native-jet-base38-index", "bytes": len(data), "sha256": digest,
            "original_mirage_sha256_match": digest == MIRAGE_SHA256,
            "exact_eof": position, "physical_chunks": chunk_count, "resource_count": len(resources),
            "inflated_bytes": inflated_total, "resources": resources}

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path)
    args = parser.parse_args()
    try:
        # Bound the read itself, not only the allocation inside the parser.
        with args.path.open("rb") as stream:
            data = stream.read(MAX_FILE + 1)
        print(json.dumps(index_jet(data), ensure_ascii=True, separators=(",", ":")))
    except (OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
