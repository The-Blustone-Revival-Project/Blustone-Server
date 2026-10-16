import importlib.util
import struct
import unittest
import zlib
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("jet_index", Path(__file__).resolve().parents[1] / "scripts/resources/jet-index.py")
jet = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(jet)

def chunk(name, payload, *, whole=None, part=0, compress=False, kinds=b"\0\0"):
    stored = zlib.compress(payload) if compress else payload
    return struct.pack("<3IQH2s", len(payload) if whole is None else whole,
                       len(payload), len(stored), jet.encode_name(name), part, kinds) + stored

class JetIndexTests(unittest.TestCase):
    def test_name_codec(self):
        for name in ["0", "A", "MRG001", "MIRAGE_BG_G", "BG_M_INGAME", "____________"]:
            self.assertEqual(jet.decode_name(jet.encode_name(name)), name)
        self.assertEqual(jet.decode_name(0x55d25c2a), "I6K5QQ")
        for value in [-1, 38**12, 2**64, True, 1.0]:
            with self.assertRaises(ValueError): jet.decode_name(value)
        for name in ["", "00", "a", "[", "é", "TOO_LONG_NAME_", "A/B"]:
            with self.assertRaises(ValueError): jet.encode_name(name)

    def test_index_raw_compressed_and_continuation(self):
        body = chunk("MRG001", b"S2hello", kinds=b"S2")
        body += chunk("IMAGE", b"I2" + b"a"*100, whole=202, compress=True)
        body += chunk("IMAGE", b"b"*100, whole=202, part=1, compress=True)
        report = jet.index_jet(body)
        self.assertEqual(report["exact_eof"], len(body))
        self.assertEqual(report["physical_chunks"], 3)
        self.assertEqual(report["resource_count"], 2)
        self.assertEqual(report["resources"][0]["payload_prefix_hex"], "5332")
        self.assertEqual(report["resources"][0]["chunks"][0]["type_bytes_hex"], "5332")
        self.assertEqual(report["resources"][1]["decoded_bytes"], 202)
        import hashlib
        self.assertEqual(report["resources"][1]["sha256"], hashlib.sha256(b"I2"+b"a"*100+b"b"*100).hexdigest())

    def test_malformed_inputs(self):
        valid = chunk("A", b"hello")
        bad = [b"", valid[:-1], valid+b"x", valid+valid,
               chunk("A", b"hello", whole=10), chunk("A", b"hello", part=1),
               chunk("A", b"hello", whole=10)+chunk("B", b"world", whole=10, part=1),
               chunk("A", b"hello", whole=10)+chunk("A", b"world", whole=10, part=2),
               chunk("A", b"hello", whole=10)+chunk("B", b"world"),
               chunk("A", b"hello", whole=10)+chunk("A", b"world", whole=9, part=1)]
        for data in bad:
            with self.subTest(data=data[:24]), self.assertRaises(ValueError): jet.index_jet(data)
        for offset, value, fmt in [(0, 0, "<I"), (4, 0, "<I"), (8, 0xffffffff, "<I"), (12, 38**12, "<Q")]:
            corrupt = bytearray(valid);struct.pack_into(fmt, corrupt, offset, value)
            with self.assertRaises(ValueError): jet.index_jet(bytes(corrupt))

    def test_bounded_inflate_and_exact_stream(self):
        packed = zlib.compress(b"x"*1000)
        for payload, expected in [(packed, 5), (packed[:-1], 1000), (packed+b"extra",1000), (packed+packed,1000), (b"bad",1000)]:
            with self.assertRaises(ValueError): jet.inflate_chunk(payload, expected)
        with self.assertRaises(ValueError): jet.index_jet(chunk("A", b"x"*1000, compress=True), max_inflated=999)
        two = chunk("A", b"abc")+chunk("B", b"def")
        with self.assertRaises(ValueError): jet.index_jet(two, max_inflated=5)
        with self.assertRaises(ValueError): jet.index_jet(two, max_chunks=1)
        with self.assertRaises(ValueError): jet.index_jet(two, max_file=len(two)-1)

    def test_supported_sprite_joins_full64_assembled_image(self):
        image_name = "IMAGE_123456"  # A key above2^32, never truncate to lowword.
        key = jet.encode_name(image_name)
        self.assertGreater(key, 2**32)
        sprite = b"S2" + struct.pack("<10fIQiiI", *([0.0]*6+[1.0]*4), 1, key, -320, -70, 0)
        self.assertEqual(len(sprite), 66)
        image = b"I2" + b"x"*100
        data = chunk("MRG001", sprite) + chunk(image_name, image[:50], whole=102, compress=True) + chunk(image_name, image[50:], whole=102, part=1, compress=True)
        report = jet.index_jet(data)
        projection = report["resources"][0]["s2projection"]
        self.assertTrue(projection["supported"])
        self.assertEqual(projection["image_encoded_name"], str(key))
        self.assertEqual(projection["image_name"], image_name)
        self.assertEqual(projection["point"], {"x": -320, "y": -70})
        self.assertEqual(projection["image_decoded_bytes"], 102)
        self.assertEqual(projection["image_sha256"], report["resources"][1]["sha256"])
        self.assertEqual(projection["transform_hex"], sprite[2:42].hex())
        self.assertEqual(projection["images"], [{key: projection[key] for key in
                         ["image_encoded_name", "image_name", "image_sha256", "image_decoded_bytes", "point"]}])
        with self.assertRaises(ValueError): jet.index_jet(chunk("MRG001", sprite))
        with self.assertRaises(ValueError): jet.index_jet(chunk("MRG001", sprite)+chunk(image_name,b"RWwrong"))
        nonfinite = bytearray(sprite);struct.pack_into("<f", nonfinite, 2, float("nan"))
        with self.assertRaises(ValueError): jet.index_jet(chunk("MRG001", bytes(nonfinite))+chunk(image_name,image))

    def test_unsupported_sprites_remain_indexed(self):
        short = jet.index_jet(chunk("ODD", b"S2short"))
        self.assertFalse(short["resources"][0]["s2projection"]["supported"])
        for count, auxiliary in [(0,0),(2,0),(1,1)]:
            payload=b"S2"+struct.pack("<10fIQiiI", *([0.0]*10),count,1,0,0,auxiliary)
            report=jet.index_jet(chunk("ODD",payload))
            self.assertFalse(report["resources"][0]["s2projection"]["supported"])

    def test_at_full64_sprite_frames_and_opaque_tags(self):
        sprite_name = "SPRITE_12345"
        sprite_key = jet.encode_name(sprite_name)
        self.assertGreater(sprite_key, 2**32)
        image_name = "IMAGE_123456"
        sprite = b"S2" + struct.pack("<10fIQiiI", *([0.0]*10), 1, jet.encode_name(image_name), 0, 0, 0)
        def frame(duration, tag):
            return struct.pack("<QfH", sprite_key, duration, len(tag)) + tag
        animation = b"AT" + struct.pack("<10fBI", *([0.0]*10), 255, 2) + frame(0.5, b"intro\0tail") + frame(0.0, b"")
        # Prefix split across physical chunks exercises bounded type discovery.
        data = chunk("ANIM", animation[:1], whole=len(animation))
        data += chunk("ANIM", animation[1:], whole=len(animation), part=1, compress=True)
        data += chunk(sprite_name, sprite) + chunk(image_name, b"I2payload")
        report = jet.index_jet(data)
        projection = report["resources"][0]["atprojection"]
        self.assertEqual(report["exact_eof"], len(data), "AT cursor must not replace the archive EOF cursor")
        self.assertTrue(projection["supported"])
        self.assertEqual(projection["opaque_byte"], 255)
        self.assertEqual(projection["frame_count"], 2)
        self.assertTrue(projection["all_sprite_projections_supported"])
        first, second = projection["frames"]
        self.assertEqual(first["sprite_encoded_name"], str(sprite_key))
        self.assertEqual(first["sprite_name"], sprite_name)
        self.assertEqual(first["duration_float32"], 0.5)
        self.assertEqual(first["tag_hex"], b"intro\0tail".hex(), "Tag bytes are preserved; native strlen semantics are not emulated")
        self.assertEqual(second["duration_float32"], 0.0)
        self.assertEqual(second["tag_hex"], "")
        self.assertEqual(first["sprite_sha256"], report["resources"][1]["sha256"])
        # Resolving the S2 record is distinct from decoding that sprite's internals.
        partial = jet.index_jet(chunk("ANIM", b"AT" + struct.pack("<10fBIQfH", *([0.0]*10), 112, 1, sprite_key, 0.5, 0)) + chunk(sprite_name, b"S2unknown"))
        self.assertTrue(partial["resources"][0]["atprojection"]["supported"])
        self.assertFalse(partial["resources"][0]["atprojection"]["all_sprite_projections_supported"])

    def test_at_refusal_and_unsupported_shapes(self):
        key = jet.encode_name("SPRITE")
        animation = b"AT" + struct.pack("<10fBIQfH", *([0.0]*10), 34, 1, key, 0.5, 0)
        self.assertEqual(len(animation), 61)
        for payload in [b"ATshort", animation[:-1], animation + b"trailing",
                        b"AT" + struct.pack("<10fBI", *([0.0]*10), 0, jet.MAX_AT_FRAMES + 1),
                        animation[:59] + struct.pack("<H", jet.MAX_AT_TAG_BYTES + 1)]:
            report = jet.index_jet(chunk("ANIM", payload))
            self.assertFalse(report["resources"][0]["atprojection"]["supported"])
        for duration in [float("inf"), float("nan"), -0.5]:
            invalid = bytearray(animation);struct.pack_into("<f", invalid, 55, duration)
            with self.assertRaises(ValueError): jet.index_jet(chunk("ANIM", bytes(invalid)) + chunk("SPRITE", b"S2unknown"))
        for referenced in [b"", chunk("SPRITE", b"I2wrong")]:
            with self.assertRaises(ValueError): jet.index_jet(chunk("ANIM", animation) + referenced)
        invalid_key = bytearray(animation);struct.pack_into("<Q", invalid_key, 47, 38**12)
        with self.assertRaises(ValueError): jet.index_jet(chunk("ANIM", bytes(invalid_key)))
        invalid_transform = bytearray(animation);struct.pack_into("<f", invalid_transform, 2, float("inf"))
        with self.assertRaises(ValueError): jet.index_jet(chunk("ANIM", bytes(invalid_transform)))

    def test_multi_image_s2_preserves_order_keys_and_coordinates(self):
        names = ["IMAGE_123456", "OTHER_123456"]
        keys = [jet.encode_name(name) for name in names]
        for key in keys: self.assertGreater(key, 2**32)
        sprite = b"S2" + struct.pack("<10fI", *([0.0]*10), 2)
        sprite += struct.pack("<Qii", keys[0], -272, -1320)
        sprite += struct.pack("<QiiI", keys[1], -488, -568, 0)
        self.assertEqual(len(sprite), 82)
        data = chunk("ST_SHA", sprite[:1], whole=82) + chunk("ST_SHA", sprite[1:], whole=82, part=1, compress=True)
        # Referenced image prefix can also span physical chunks.
        data += chunk(names[0], b"I", whole=5) + chunk(names[0], b"2one", whole=5, part=1)
        data += chunk(names[1], b"I2two")
        report = jet.index_jet(data)
        self.assertEqual(report["exact_eof"], len(data))
        projection = report["resources"][0]["s2projection"]
        self.assertTrue(projection["supported"])
        self.assertEqual(projection["image_count"], 2)
        self.assertEqual([entry["image_name"] for entry in projection["images"]], names)
        self.assertEqual([entry["image_encoded_name"] for entry in projection["images"]], list(map(str, keys)))
        self.assertEqual([entry["point"] for entry in projection["images"]], [{"x": -272,"y": -1320},{"x": -488,"y": -568}])
        self.assertNotIn("image_name", projection, "Multi-image projection must not invent a single primary image")
        self.assertEqual(projection["images"][0]["image_sha256"], report["resources"][1]["sha256"])
        for suffix in [b"", chunk(names[1], b"S2wrong")]:
            with self.assertRaises(ValueError): jet.index_jet(chunk("ST_SHA", sprite) + chunk(names[0], b"I2one") + suffix)
        duplicate = bytearray(sprite);struct.pack_into("<Q", duplicate, 62, keys[0])
        repeated = jet.index_jet(chunk("ST_SHA", bytes(duplicate)) + chunk(names[0], b"I2one"))
        self.assertEqual(len(repeated["resources"][0]["s2projection"]["images"]), 2,"Native image list retains repeated references")
        for payload in [sprite[:-1], sprite+b"x", sprite[:-4]+struct.pack("<I",1),
                        b"S2"+struct.pack("<10fI", *([0.0]*10), jet.MAX_S2_IMAGES+1)]:
            report=jet.index_jet(chunk("ST_SHA",payload))
            self.assertFalse(report["resources"][0]["s2projection"]["supported"])

if __name__ == "__main__":
    unittest.main()
