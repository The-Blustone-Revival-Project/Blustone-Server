"""Install the pinned public resource bundle without replacing existing inputs."""
from __future__ import annotations
import argparse
from dataclasses import dataclass
import hashlib
import json
import os
import tempfile
from pathlib import Path, PurePosixPath
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[2]
CHUNK = 1024 * 1024


@dataclass(frozen=True)
class ReleasePin:
    name: str
    size: int
    sha256: str
    url: str


PUBLIC_RELEASE = ReleasePin(
    "Blustone-Server-Resources-1.2.0.zip", 1113549668,
    "8bee83d69c5105aedcfa834c789ff039009dc047aa0e139c5641548322df3ae1",
    "https://github.com/The-Blustone-Revival-Project/Blustone-Server/releases/download/v1.2.0/Blustone-Server-Resources-1.2.0.zip",
)


def digest(stream):
    checksum, size = hashlib.sha256(), 0
    while block := stream.read(CHUNK):
        checksum.update(block)
        size += len(block)
    return size, checksum.hexdigest()


def destination(root, name):
    if (not isinstance(name, str) or not name or "\\" in name or
            PurePosixPath(name).is_absolute() or any(p in ("", ".", "..") for p in name.split("/")) or
            ":" in name):
        raise ValueError("Unsafe resource path")
    result = root.joinpath(*name.split("/"))
    if not result.resolve().is_relative_to(root.resolve()):
        raise ValueError("Resource path escapes installation root")
    return result


def manifest_rows(root):
    rows = json.loads((root / "resources/manifests/imported-files.json").read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        raise ValueError("Invalid resource manifest")
    names = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid resource manifest row")
        name = row.get("destination")
        destination(root, name)
        if name in names:
            raise ValueError("Duplicate resource manifest destination")
        names.add(name)
        if (type(row.get("bytes")) is not int or row["bytes"] < 0 or
                not isinstance(row.get("sha256"), str) or len(row["sha256"]) != 64 or
                any(c not in "0123456789abcdef" for c in row["sha256"])):
            raise ValueError("Invalid resource manifest size/hash")
    return rows


def missing_resources(root, rows):
    missing = []
    for row in rows:
        file = destination(root, row["destination"])
        if not file.exists():
            missing.append(row)
            continue
        if not file.is_file():
            raise ValueError("Conflicting existing resource: " + row["destination"])
        with file.open("rb") as stream:
            actual = digest(stream)
        if actual != (row["bytes"], row["sha256"]):
            raise ValueError("Conflicting existing resource; refusing overwrite: " + row["destination"])
    return missing


def verify_archive(file, pin):
    with file.open("rb") as stream:
        actual = digest(stream)
    if actual != (pin.size, pin.sha256):
        raise ValueError("Pinned resource bundle size/SHA256 mismatch")


def download_bundle(cache, pin):
    if cache.exists():
        verify_archive(cache, pin)
        return cache
    cache.parent.mkdir(parents=True, exist_ok=True)
    partial = cache.with_name(cache.name + ".part")
    # An unfinished older download is retained for diagnosis, never reused.
    if partial.exists():
        raise ValueError("Partial resource download exists; choose another cache path or move the .part file")
    created_partial = False
    try:
        with urllib.request.urlopen(pin.url, timeout=60) as response, partial.open("xb") as output:
            created_partial = True
            length = response.headers.get("Content-Length")
            if length is not None and int(length) != pin.size:
                raise ValueError("Resource download Content-Length differs from pin")
            size, checksum = 0, hashlib.sha256()
            while block := response.read(CHUNK):
                size += len(block)
                if size > pin.size:
                    raise ValueError("Resource download exceeds pinned size")
                checksum.update(block)
                output.write(block)
            output.flush()
            os.fsync(output.fileno())
        if (size, checksum.hexdigest()) != (pin.size, pin.sha256):
            raise ValueError("Resource download incomplete or SHA256 mismatch")
        if cache.exists():
            verify_archive(cache, pin)
            partial.unlink()
        else:
            os.rename(partial, cache)
        return cache
    except BaseException:
        if created_partial and partial.exists():
            partial.unlink()
        raise


def import_bundle(root, archive, rows, pin):
    verify_archive(archive, pin)
    missing_resources(root, rows)  # Refuse every existing conflict before writes.
    with zipfile.ZipFile(archive) as zipped:
        names = zipped.namelist()
        for name in names:
            destination(root, name)
        if len(names) != len(rows) or set(names) != {r["destination"] for r in rows}:
            raise ValueError("Bundle contents differ from pinned manifest (including duplicate entries)")
        # Validate ALL payloads before installing even the first missing file.
        for row in rows:
            info = zipped.getinfo(row["destination"])
            if info.file_size != row["bytes"]:
                raise ValueError("Bundle resource length mismatch: " + row["destination"])
            with zipped.open(info) as stream:
                actual = digest(stream)
            if actual != (row["bytes"], row["sha256"]):
                raise ValueError("Bundle resource hash mismatch: " + row["destination"])
        for row in rows:
            file = destination(root, row["destination"])
            if file.exists():
                continue
            file.parent.mkdir(parents=True, exist_ok=True)
            # Same-filesystem staging plus exclusive hard-link publication:
            # a failed write leaves no partial destination, and another writer's
            # destination can never be replaced (on Windows or POSIX).
            fd, staged_name = tempfile.mkstemp(prefix="." + file.name + ".setup-", dir=file.parent)
            staged = Path(staged_name)
            try:
                with os.fdopen(fd, "wb") as output, zipped.open(row["destination"]) as source:
                    size, checksum = 0, hashlib.sha256()
                    while block := source.read(CHUNK):
                        output.write(block)
                        size += len(block)
                        checksum.update(block)
                    output.flush()
                    os.fsync(output.fileno())
                if (size, checksum.hexdigest()) != (row["bytes"], row["sha256"]):
                    raise ValueError("Staged resource hash mismatch: " + row["destination"])
                try:
                    os.link(staged, file)
                except FileExistsError:
                    with file.open("rb") as existing:
                        if digest(existing) != (row["bytes"], row["sha256"]):
                            raise ValueError("Conflicting concurrent resource; refusing overwrite: " + row["destination"])
            finally:
                staged.unlink()
    if missing_resources(root, rows):
        raise ValueError("Resource installation incomplete")


def setup_resources(root=ROOT, bundle=None, pin=PUBLIC_RELEASE):
    root = Path(root)
    rows = manifest_rows(root)
    if not missing_resources(root, rows):
        return f"Resources ready: {len(rows)} files verified; no download needed."
    archive = Path(bundle) if bundle is not None else download_bundle(root / "local/bundles" / pin.name, pin)
    import_bundle(root, archive, rows, pin)
    return f"Resources ready: {len(rows)} files verified from pinned public bundle."


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bundle", type=Path, help="Offline copy of the same pinned public release ZIP")
    args = parser.parse_args()
    try:
        print(setup_resources(bundle=args.bundle))
    except (OSError, ValueError, zipfile.BadZipFile) as error:
        parser.exit(1, f"Resource setup failed: {error}\n")


if __name__ == "__main__":
    main()
