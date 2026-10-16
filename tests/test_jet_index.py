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

if __name__ == "__main__":
    unittest.main()
