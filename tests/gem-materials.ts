import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { repositoryPath } from "../src/paths.js";
import { gemArtworkOwner } from "../src/gem-materials.js";
import { parseGemReferences } from "../src/gem-instances.js";

const catalog = JSON.parse(readFileSync(repositoryPath("resources/reference/gem-materials.json"), "utf8"));
assert.equal(catalog.packs.length, 7);
assert.equal(catalog.packs.flatMap((pack: any) => pack.records).filter((record: any) => record.gemArtwork).length, 75);
const refs = parseGemReferences({ result_code: 1, ret_data: [
  { id: "AUTHORED_GEM", name: "Fixture", desc: "Fixture", res_id: "G_1_001_R1", set_effect_id: 2, rank: 1, target: 1 },
] });
assert.equal(gemArtworkOwner(refs[0], catalog.packs), "GEM.jet");
assert.equal(gemArtworkOwner(refs[0], catalog.packs, new Set(["GEM.jet"])), "GEM.jet");
assert.throws(() => gemArtworkOwner(refs[0], catalog.packs, new Set()), TypeError);
assert.throws(() => gemArtworkOwner({ ...refs[0], res_id: "G_1_999_R1" }, catalog.packs), TypeError);
assert.throws(() => gemArtworkOwner({ ...refs[0], res_id: "G_1_001" }, catalog.packs), TypeError, "No invented rank suffix append");
assert.throws(() => gemArtworkOwner(refs[0], [...catalog.packs, catalog.packs.find((pack: any) => pack.package === "GEM.jet")]), TypeError);
assert.notEqual(refs[0].id, refs[0].res_id, "Positive artwork does not recover a gameplay reference ID");
for (const pack of catalog.packs) {
  assert.equal(pack.records.length, pack.recordCount);
  assert.match(pack.sha256, /^[0-9a-f]{64}$/);
  const ranked = pack.records.filter((record: any) => record.gemArtwork);
  assert.equal(new Set(ranked.map((record: any) => record.name)).size, ranked.length);
}
console.log("Gem materials: seven pinned original owner packs,75 ranked Gem art records, exact owner/selection lookup and unknown/ambiguous refusal passed; artwork does not invent reference IDs or rolls.");
