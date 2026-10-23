"""Bounded original-art proof for the eight opt-in LOCAL skill-icon bindings."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("jet_index", ROOT / "scripts/resources/jet-index.py")
jet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jet)
rows = [json.loads(line.strip().removesuffix(","))
        for line in (ROOT / "src/material-skill-evidence.ts").read_text(encoding="utf-8").splitlines()
        if line.strip().startswith('{"refId"')]
ids = ["009", "010", "012", "013", "017", "036", "040", "049"]
for ref in ids:
    evidence = next(row for row in rows if row["refId"] == ref)
    pin = next(row for row in evidence["art"] if row["name"] == f"C{ref}_Q.jet")
    file = ROOT / "resources/runtime/assets" / pin["name"]
    assert file.stat().st_size == pin["bytes"] and file.stat().st_size <= jet.MAX_FILE
    data = file.read_bytes()
    index = jet.index_jet(data)
    assert index["sha256"] == pin["sha256"]
    assert index["exact_eof"] == index["bytes"] == len(data)
    def unique_resource(name):
        matches = [row for row in index["resources"] if row["name"] == name]
        assert len(matches) == 1, f"Missing or ambiguous original resource: {name}"
        return matches[0]
    for slot in range(1, 6):
        animation = unique_resource(f"C{ref}_SI{slot}")
        assert animation["payload_prefix_hex"] == b"AT".hex()
        projection = animation["atprojection"]
        assert projection["supported"] and projection["frame_count"] == 1
        frame = projection["frames"][0]
        assert frame["sprite_name"] == f"C{ref}_SI{slot:02}"
        sprite = unique_resource(frame["sprite_name"])
        assert sprite["payload_prefix_hex"] == b"S2".hex()
        atlas = sprite["s2projection"]
        assert atlas["supported"] and atlas["image_count"] == 1
        image = unique_resource(atlas["image_name"])
        assert image["payload_prefix_hex"] == b"I2".hex()
        assert image["sha256"] == atlas["image_sha256"]
print("Eight pinned original Q packs:40 exact AT/S2/I2 icon joins, bounded complete records and EOF passed; slot mapping is LOCAL.")
