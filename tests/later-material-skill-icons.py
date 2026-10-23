"""Thirty-six original later-donor packs and forty-five AT/S2/I2 icon chains.

Normal regression uses pinned Server inputs. Optional --datadump-assets also
requires exact equality with a supplied read-only original asset directory.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IDS = ["008", "019", "023", "028", "043", "046", "057", "064", "068"]
MANIFEST_SHA256 = "02ea93743191ed14e9c84cd7b4bb7c2acafe9e61160a0ca6dc4262567d9521ce"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--datadump-assets", type=Path)
args = parser.parse_args()
if args.datadump_assets is not None:
    assert args.datadump_assets.is_dir(), "Explicit original asset directory is unavailable"
spec = importlib.util.spec_from_file_location("jet_index", ROOT / "scripts/resources/jet-index.py")
jet = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jet)
manifest_bytes = (ROOT / "resources/reference/later-material-skill-art.json").read_bytes().replace(b"\r\n", b"\n")
assert hashlib.sha256(manifest_bytes).hexdigest() == MANIFEST_SHA256, "Reviewed original art manifest changed"
manifest = json.loads(manifest_bytes)
assert manifest["refIds"] == IDS
names = [f"C{ref}{suffix}.jet" for ref in IDS for suffix in ("", "_Q", "_EFT", "_SND")]
assert [row["name"] for row in manifest["packs"]] == names and len(set(names)) == 36
ledger = json.loads((ROOT / "resources/manifests/imported-files.json").read_text(encoding="utf-8"))
profile = json.loads((ROOT / "config/profiles/current-later-episodes.json").read_text(encoding="utf-8"))
selected = profile["env"]["BLUSTONE_PACKAGE_NAMES"].split(",")
assert len(selected) == len(set(selected)) == profile["expectedPackages"] == 280
assert all(name in selected for name in names)
joins = 0
for pin in manifest["packs"]:
    destination = "resources/runtime/assets/" + pin["name"]
    assert pin["destination"] == destination
    assert pin["source"] == "recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets/" + pin["name"]
    ledger_rows = [row for row in ledger if row["destination"] == destination]
    assert len(ledger_rows) == 1
    assert ledger_rows[0] == {key: pin[key] for key in ("source", "destination", "bytes", "sha256")}
    file = ROOT / destination
    assert file.stat().st_size == pin["bytes"] <= jet.MAX_FILE
    data = file.read_bytes()
    if args.datadump_assets is not None:
        assert (args.datadump_assets / pin["name"]).read_bytes() == data, "Retained original differs from published Server copy"
    assert hashlib.sha256(data).hexdigest() == pin["sha256"]
    index = jet.index_jet(data)
    assert index["sha256"] == pin["sha256"] and index["exact_eof"] == index["bytes"] == len(data)
    assert len(index["resources"]) == pin["recordCount"]
    if "icons" not in pin:
        continue
    assert [icon["slot"] for icon in pin["icons"]] == list(range(1, 6))
    ref = pin["name"][1:4]

    def unique_resource(name):
        matches = [row for row in index["resources"] if row["name"] == name]
        assert len(matches) == 1, f"Missing or ambiguous original resource: {name}"
        return matches[0]

    for icon in pin["icons"]:
        slot = icon["slot"]
        animation = unique_resource(f"C{ref}_SI{slot}")
        assert icon["animation"] == {key: animation[key] for key in ("name", "offset", "sha256")}
        assert animation["payload_prefix_hex"] == b"AT".hex()
        at = animation["atprojection"]
        assert at["supported"] and at["frame_count"] == len(at["frames"]) == 1
        assert at["frames"][0]["sprite_name"] == f"C{ref}_SI{slot:02}"
        sprite = unique_resource(at["frames"][0]["sprite_name"])
        assert icon["sprite"] == {key: sprite[key] for key in ("name", "sha256")}
        assert sprite["payload_prefix_hex"] == b"S2".hex()
        s2 = sprite["s2projection"]
        assert s2["supported"] and s2["image_count"] == 1
        image = unique_resource(s2["image_name"])
        assert icon["image"] == {key: image[key] for key in ("name", "sha256")}
        assert image["payload_prefix_hex"] == b"I2".hex() and image["sha256"] == s2["image_sha256"]
        joins += 1
    # Strict parser must reject a valid package followed by a partial extra header.
    try:
        jet.index_jet(data + b"\x00")
    except ValueError:
        pass
    else:
        raise AssertionError("Trailing partial record accepted")
assert joins == 45
originals = " and exact supplied DataDump originals" if args.datadump_assets is not None else " (external original comparison not requested)"
print("Nine later Hunters:36 original package/ledger/280-profile pins, exact EOF and45 AT/S2/I2 icon joins PASS" + originals + "; ordinary bindings remain LOCAL.")
