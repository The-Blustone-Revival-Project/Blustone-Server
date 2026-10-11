import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { repositoryPath } from "../src/paths.js";
import { MATERIAL_SKILL_EVIDENCE, MATERIAL_SKILL_SOURCE_PINS, materialSkillReadiness, selectMaterialEpisodeGraph } from "../src/material-skill-evidence.js";

const episodeBytes = fs.readFileSync(repositoryPath(MATERIAL_SKILL_SOURCE_PINS.episode.path));
assert.equal(createHash("sha256").update(episodeBytes).digest("hex"), MATERIAL_SKILL_SOURCE_PINS.episode.sha256);
const episode = JSON.parse(episodeBytes.toString("utf8"));
const tables = JSON.parse(fs.readFileSync(repositoryPath("resources/reference/recovered-data/leveldb-tables/all-tables.json"), "utf8")).tables;
const source = (table: string, key: string) => tables[table].find((row: any) => row.key === key).json;
let graphHunters = 0;
for (const row of MATERIAL_SKILL_EVIDENCE) {
  const readiness = materialSkillReadiness(row.refId);
  assert.deepEqual(readiness.symbolicSlots, [1, 2, 3, 4, 5]);
  assert.equal(readiness.originalOrdinaryMagnitudes, "UNKNOWN");
  assert.equal(readiness.activeIntegration, false);
  const cost = row.symbolic.filter(record => record.slot === 1 && /^Uses \d+ Rage Gauge when using a skill\.$/.test(record.text));
  assert.equal(cost.length, 1);
  assert.equal(row.rageCost, Number(cost[0].text.match(/\d+/)![0]));
  for (const symbolic of row.symbolic) {
    const original = source("SKILL_REF_RO", symbolic.key);
    assert.deepEqual([symbolic.text, symbolic.formula, symbolic.isFloat, symbolic.subSerial],
      [original.EN, original.FORMULAR, original.IS_FLOAT, original.SUB_SERIAL]);
  }
  for (const tags of row.tags) assert.deepEqual(tags.tags, source("SKILL_TAG_RO", tags.key).TAG_KEY.split(","));
  for (const label of row.labels) {
    const original = source("SKILL_EFFECT_RO", label.key);
    assert.deepEqual([label.normal, label.angry, label.text], [original.NORMAL, original.ANGRY, original.EN]);
  }
  for (const art of row.art) {
    const bytes = fs.readFileSync(repositoryPath("resources/runtime/assets", art.name));
    assert.equal(bytes.length, art.bytes);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), art.sha256);
    const ftyp = bytes.subarray(0, 1024).indexOf(Buffer.from("ftyp"));
    assert.equal(art.hasEmbeddedMp4Header, ftyp >= 4);
    assert.equal(art.mp4BoxOffset, ftyp >= 4 ? ftyp - 4 : null);
  }
  for (const candidate of row.episodeCandidates) {
    const original = episode[candidate.sourceIndex];
    assert.deepEqual([candidate.actorId, candidate.refId, candidate.resId, candidate.role, candidate.attr, candidate.rank, candidate.skill],
      [original.id, original.ref_id, original.res_id, original.role, original.attr, original.stat.rank, original.skill]);
    assert.equal(candidate.compatibleBaseIdentity,
      candidate.resId === `C${row.refId}` && candidate.attr === row.attr && candidate.role === row.role);
    if (!candidate.compatibleBaseIdentity || candidate.skill.length === 0)
      assert.throws(() => selectMaterialEpisodeGraph(row.refId, candidate.sourceIndex), /No compatible/);
    else {
      const selected = selectMaterialEpisodeGraph(row.refId, candidate.sourceIndex);
      assert.deepEqual(selected.source.skill, original.skill, "unchanged original graph, no fabricated growth or missing slots");
      assert.equal(selected.ordinaryAdoptionPolicyRequired, true);
      assert.equal(selected.activeIntegration, false);
      assert.equal(selected.provenance.locator, `/${candidate.sourceIndex}/skill`);
    }
  }
  if (readiness.scriptedGraphRows.length) graphHunters++;
}
assert.equal(MATERIAL_SKILL_EVIDENCE.length, 12);
assert.equal(graphHunters, 11);
assert.equal(materialSkillReadiness("048").scriptedGraphRows.length, 0, "Dumble has symbolic mechanics but no original numeric Episode graph");
assert.equal(materialSkillReadiness("036").rageCost, 4, "Bear's Defense role must not overwrite original cost4 with a general role rule");
assert.throws(() => selectMaterialEpisodeGraph("040", -1), /Explicit/);
assert.throws(() => selectMaterialEpisodeGraph("048", 0), /No compatible/);
assert.throws(() => materialSkillReadiness("004"), /Unknown material/);
const duplicate = MATERIAL_SKILL_EVIDENCE.find(row => row.refId === "012")!.episodeCandidates.filter(row => row.actorId === "CB0601_012_1");
assert.equal(duplicate.length, 2, "duplicate actor IDs must remain distinct indexed sources");
assert.notEqual(duplicate[0].sourceIndex, duplicate[1].sourceIndex);
const karl = selectMaterialEpisodeGraph("012", 142);
assert.equal(karl.ordinaryRageCost, 3);
assert.equal(karl.episodeRageCost, 4);
assert.equal(karl.ordinaryCostAgreement, false, "same-art/role source cannot silently replace original ordinary cost");
const bibi = selectMaterialEpisodeGraph("040", 69);
assert.equal(bibi.ordinaryRageCost, 3);
assert.equal(bibi.episodeRageCost, 4);
assert.equal(bibi.ordinaryCostAgreement, false);
const copy = selectMaterialEpisodeGraph("009", 13);
(copy.source.skill as any)[0].effect[0].base_number = 123456;
assert.notEqual((selectMaterialEpisodeGraph("009", 13).source.skill as any)[0].effect[0].base_number, 123456,
  "caller edits cannot change original retained graphs");
console.log("Material skill evidence:12 original symbolic/cost/tag/art mappings;11 explicit indexed Episode graphs, variant/empty refusal, original source hashes/tuples preserved, no ordinary activation.");
