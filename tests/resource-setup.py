"""Small offline/loopback fixtures; never downloads the public 1.1GB bundle."""
import hashlib
import http.client
import importlib.util
import io
import json
from pathlib import Path
import socket
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch
import zipfile
import sys

spec = importlib.util.spec_from_file_location("resource_setup", Path(__file__).resolve().parents[1] / "scripts/resources/setup.py")
setup = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = setup
spec.loader.exec_module(setup)


class ResourceSetupTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="blustone-resource-setup-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.contents = {"resources/runtime/assets/A.jet": b"fixture original A", "resources/runtime/packages/B.jet": b"fixture original B"}
        self.rows = [{"destination": name, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
                     for name, data in self.contents.items()]
        manifest = self.root / "resources/manifests/imported-files.json"
        manifest.parent.mkdir(parents=True)
        manifest.write_text(json.dumps(self.rows), encoding="utf-8")
        self.archive = self.root / "offline.zip"
        self.zip_bytes = self.make_zip(list(self.contents.items()))
        self.archive.write_bytes(self.zip_bytes)
        self.pin = self.pin_for(self.zip_bytes)
        self.protected = {"var/state.json": b"private existing save", "config/custom.json": b"existing configuration"}
        for name, data in self.protected.items():
            file = self.root / name
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_bytes(data)

    @staticmethod
    def make_zip(entries):
        result = io.BytesIO()
        with zipfile.ZipFile(result, "w") as archive:
            for name, data in entries:
                archive.writestr(name, data)
        return result.getvalue()

    @staticmethod
    def pin_for(data, url="http://127.0.0.1:1/unreachable"):
        return setup.ReleasePin("fixture.zip", len(data), hashlib.sha256(data).hexdigest(), url)

    def assert_protected(self):
        for name, data in self.protected.items():
            self.assertEqual((self.root / name).read_bytes(), data)

    def assert_missing(self):
        self.assertTrue(all(not (self.root / name).exists() for name in self.contents))
        self.assert_protected()

    def server(self, body, interrupt=False):
        hits = []

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                hits.append(self.path)
                self.send_response(200)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body[:10] if interrupt else body)
                self.wfile.flush()
                if interrupt:
                    self.connection.shutdown(socket.SHUT_RDWR)
                    self.connection.close()

            def log_message(self, *_):
                pass

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        worker = threading.Thread(target=server.serve_forever, daemon=True)
        worker.start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        return self.pin_for(body, f"http://127.0.0.1:{server.server_port}/fixture.zip"), hits

    def test_offline_install_then_ready_without_http(self):
        self.assertIn("Resources ready", setup.setup_resources(self.root, self.archive, self.pin))
        for name, data in self.contents.items():
            self.assertEqual((self.root / name).read_bytes(), data)
        before = {p: p.stat().st_mtime_ns for p in (self.root / n for n in self.contents)}
        with patch.object(setup.urllib.request, "urlopen", side_effect=AssertionError("Warm setup must not use network")):
            self.assertIn("no download", setup.setup_resources(self.root, pin=self.pin))
        self.assertEqual(before, {p: p.stat().st_mtime_ns for p in before})
        self.assert_protected()

    def test_real_loopback_download_verified_cache_and_warm_no_http(self):
        pin, hits = self.server(self.zip_bytes)
        self.assertIn("Resources ready", setup.setup_resources(self.root, pin=pin))
        cache = self.root / "local/bundles/fixture.zip"
        self.assertEqual(cache.read_bytes(), self.zip_bytes)
        self.assertFalse(cache.with_suffix(".zip.part").exists())
        self.assertEqual(hits, ["/fixture.zip"])
        self.assertIn("no download", setup.setup_resources(self.root, pin=pin))
        self.assertEqual(hits, ["/fixture.zip"])
        self.assert_protected()

    def test_conflicting_existing_resource_refuses_before_network_or_any_import(self):
        file = self.root / next(iter(self.contents))
        file.parent.mkdir(parents=True)
        file.write_bytes(b"different evidence")
        with patch.object(setup.urllib.request, "urlopen", side_effect=AssertionError("Conflict must precede download")):
            with self.assertRaisesRegex(ValueError, "Conflicting"):
                setup.setup_resources(self.root, pin=self.pin)
        self.assertEqual(file.read_bytes(), b"different evidence")
        self.assertFalse((self.root / list(self.contents)[1]).exists())
        self.assert_protected()

    def test_wrong_bundle_pin_refuses_all_writes(self):
        bad = setup.ReleasePin(self.pin.name, self.pin.size, "0" * 64, self.pin.url)
        with self.assertRaisesRegex(ValueError, "size/SHA256"):
            setup.setup_resources(self.root, self.archive, bad)
        self.assert_missing()

    def test_bad_payload_prevalidated_before_first_file_written(self):
        entries = list(self.contents.items())
        bad = self.make_zip([entries[0], (entries[1][0], b"x" * len(entries[1][1]))])
        self.archive.write_bytes(bad)
        with self.assertRaisesRegex(ValueError, "hash mismatch"):
            setup.setup_resources(self.root, self.archive, self.pin_for(bad))
        self.assert_missing()

    def test_duplicate_and_traversal_zip_entries_refuse(self):
        for extra in [list(self.contents.items())[0], ("../escaped", b"bad"), ("/absolute", b"bad"), ("x\\escape", b"bad")]:
            with self.subTest(extra=extra[0]):
                with patch("warnings.warn"):
                    data = self.make_zip([*self.contents.items(), extra])
                self.archive.write_bytes(data)
                with self.assertRaisesRegex(ValueError, "contents|Unsafe"):
                    setup.setup_resources(self.root, self.archive, self.pin_for(data))
                self.assert_missing()

    def test_manifest_traversal_and_duplicate_refuse(self):
        manifest = self.root / "resources/manifests/imported-files.json"
        for rows in [[{**self.rows[0], "destination": "../escape"}], [self.rows[0], self.rows[0]]]:
            manifest.write_text(json.dumps(rows), encoding="utf-8")
            with self.assertRaisesRegex(ValueError, "Unsafe|Duplicate"):
                setup.setup_resources(self.root, self.archive, self.pin)
            self.assert_missing()

    def test_interrupted_download_never_commits_cache_or_resources(self):
        pin, hits = self.server(self.zip_bytes, interrupt=True)
        with self.assertRaises((ValueError, OSError, http.client.IncompleteRead)):
            setup.setup_resources(self.root, pin=pin)
        self.assertEqual(hits, ["/fixture.zip"])
        self.assertFalse((self.root / "local/bundles/fixture.zip").exists())
        self.assertFalse((self.root / "local/bundles/fixture.zip.part").exists())
        self.assert_missing()

    def test_download_wrong_hash_and_size_refuse(self):
        for bad_hash, bad_size in [(True, False), (False, True)]:
            pin, _ = self.server(self.zip_bytes)
            pin = setup.ReleasePin(pin.name, pin.size + int(bad_size), "0" * 64 if bad_hash else pin.sha256, pin.url)
            with self.assertRaises(ValueError):
                setup.setup_resources(self.root, pin=pin)
            self.assertFalse((self.root / "local/bundles/fixture.zip").exists())
            self.assertFalse((self.root / "local/bundles/fixture.zip.part").exists())
            self.assert_missing()

    def test_existing_bad_cache_not_overwritten(self):
        cache = self.root / "local/bundles/fixture.zip"
        cache.parent.mkdir(parents=True)
        cache.write_bytes(b"previous evidence")
        with patch.object(setup.urllib.request, "urlopen", side_effect=AssertionError("Never replace cache")):
            with self.assertRaisesRegex(ValueError, "size/SHA256"):
                setup.setup_resources(self.root, pin=self.pin)
        self.assertEqual(cache.read_bytes(), b"previous evidence")
        self.assert_missing()

    def test_concurrent_partial_creator_is_not_deleted(self):
        pin, _ = self.server(self.zip_bytes)
        original_open = Path.open
        partial = self.root / "local/bundles/fixture.zip.part"

        def competing_open(file, mode="r", *args, **kwargs):
            if file == partial and mode == "xb":
                with original_open(file, "wb") as owner:
                    owner.write(b"another downloader's partial")
                raise FileExistsError("Concurrent creator won")
            return original_open(file, mode, *args, **kwargs)

        with patch.object(Path, "open", competing_open):
            with self.assertRaisesRegex(FileExistsError, "Concurrent"):
                setup.setup_resources(self.root, pin=pin)
        self.assertEqual(partial.read_bytes(), b"another downloader's partial")
        self.assertFalse((self.root / "local/bundles/fixture.zip").exists())
        self.assert_missing()

    def test_failed_resource_write_leaves_no_destination_and_retry_succeeds(self):
        with patch.object(setup.os, "fsync", side_effect=OSError("Interrupted staged write")):
            with self.assertRaisesRegex(OSError, "Interrupted"):
                setup.setup_resources(self.root, self.archive, self.pin)
        self.assert_missing()
        self.assertFalse(list(self.root.glob("resources/runtime/**/.*.setup-*")))
        self.assertIn("Resources ready", setup.setup_resources(self.root, self.archive, self.pin))
        for name, data in self.contents.items():
            self.assertEqual((self.root / name).read_bytes(), data)
        self.assert_protected()

    def test_concurrent_destination_is_never_replaced(self):
        original_link = setup.os.link
        target = self.root / next(iter(self.contents))

        def competing_link(source, destination):
            if Path(destination) == target:
                target.write_bytes(b"concurrent conflicting evidence")
            return original_link(source, destination)

        with patch.object(setup.os, "link", competing_link):
            with self.assertRaisesRegex(ValueError, "Conflicting concurrent"):
                setup.setup_resources(self.root, self.archive, self.pin)
        self.assertEqual(target.read_bytes(), b"concurrent conflicting evidence")
        self.assertFalse((self.root / list(self.contents)[1]).exists())
        self.assertFalse(list(self.root.glob("resources/runtime/**/.*.setup-*")))
        self.assert_protected()


if __name__ == "__main__":
    unittest.main()
