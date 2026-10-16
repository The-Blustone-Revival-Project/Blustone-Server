import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { repositoryPath } from "../src/paths.js";
import { characterIdentities, characterMaterialCoverage, additionalMaterialReferences } from "../src/character-materials.js";
import { starterReference } from "../src/bootstrap.js";
import { fixtureSkillSlots } from "../src/skills.js";

const profile = JSON.parse(fs.readFileSync(repositoryPath("config/profiles/current-e6.json"), "utf8"));
const names: string[] = profile.env.BLUSTONE_PACKAGE_NAMES.split(",");
const published = starterReference.map((row) => row.id);
const coverage = characterMaterialCoverage(names, published);
const candidates = coverage.filter((row) => row.referenceCandidate);
assert.equal(characterIdentities.length, 113);
assert.equal(new Set(characterIdentities.map((row) => row.id)).size, 113);
assert.equal(coverage.find((row) => row.id === "007")!.name, "Metis", "Episode C007 actor artwork cannot rename ordinary Metis to Karl");
assert.equal(coverage.find((row) => row.id === "012")!.name, "Karl Steiner");
assert.equal(coverage.find((row) => row.id === "036")!.name, "Bear");
assert.ok(candidates.length >= 8, "Prepared Episode art already permits a broader ordinary catalogue");
assert.ok(candidates.every((row) => /^\d{3}$/.test(row.id) && row.required.every((name) => names.includes(name))));
assert.ok(!characterMaterialCoverage(names.filter((name) => name !== "C036_Q.jet"), published).find((row) => row.id === "036")!.referenceCandidate,
  "missing exact original portrait refuses candidate; costume/episode portraits cannot substitute");
assert.ok(!characterMaterialCoverage(["C036.jet"], published).find((row) => row.id === "036")!.materialComplete);
assert.ok(!characterMaterialCoverage(names, [...published, "036"]).find((row) => row.id === "036")!.referenceCandidate);
assert.ok(!coverage.some((row) => /_/.test(row.id) && row.referenceCandidate), "awakened variants require separate resource bindings");
const recovered = JSON.parse(fs.readFileSync(repositoryPath("resources/reference/episodes/CHAR_STR.json"), "utf8"));
for (const row of characterIdentities) {
  for (const claim of Object.values(row.claims)) {
    assert.match(claim!.provenance.sha256, /^[a-f0-9]{64}$/);
    if (claim!.provenance.label === "RECOVERED") {
      const [key, locale] = claim!.provenance.locator.split("/");
      assert.equal(claim!.value, recovered[key][locale], `${row.id}/${key} original bytes`);
    }
  }
}
const stats = [{ rank: 1, awk_step: 0, hp: "1000", atk: "100", def: "50", spd: "100" }];
const before = structuredClone({ stats, published, names });
const references = additionalMaterialReferences({ packageNames: names, publishedIds: published,
  fixtureStats: stats, skillSlots: fixtureSkillSlots });
assert.deepEqual(references.map((row) => row.id), candidates.map((row) => row.id));
assert.ok(references.every((row) => row.is_main === 0 && row.base.id === row.id && row.base.res_prefix === `C${row.id}`));
assert.deepEqual({ stats, published, names }, before, "building additional references never mutates fixture inputs or existing references");
references[0].stat[0].hp = "caller-only";
assert.equal(stats[0].hp, "1000");
assert.equal(references[1].stat[0].hp, "1000", "rows independently own local fixture stats");
assert.throws(() => additionalMaterialReferences({ packageNames: names, publishedIds: published,
  fixtureStats: [], skillSlots: fixtureSkillSlots }), /Explicit local fixture/);

// Bootstrap selects an immutable profile at module import. Test every profile
// in a fresh process rather than allowing cached imports to fake isolation.
function bootstrapProfile(value: string | undefined, packages = names) {
  const env = { ...process.env, ...profile.env, BLUSTONE_GACHA_CARD: "002", BLUSTONE_PARTY_SIZE: "1",
    BLUSTONE_PACKAGE_NAMES: packages.join(","), BLUSTONE_CARD_REFERENCE_PROFILE: value };
  if (value === undefined) delete env.BLUSTONE_CARD_REFERENCE_PROFILE;
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval",
    "import * as b from './src/bootstrap.ts'; console.log(JSON.stringify({refs:b.starterReference,inventory:b.starterInventory,birth:b.recruitBirthRanks,gacha:b.FIXTURE_GACHA_CARD}));"],
    { cwd: repositoryPath(), env, encoding: "utf8", timeout: 20_000 });
}
const defaultProcess = bootstrapProfile(undefined);
const starterProcess = bootstrapProfile("starter");
const expandedProcess = bootstrapProfile("materials");
for (const child of [defaultProcess, starterProcess, expandedProcess]) assert.equal(child.status, 0, child.stderr);
assert.equal(defaultProcess.stdout, starterProcess.stdout, "default starter output is byte-identical to explicit starter");
const original = JSON.parse(starterProcess.stdout);
const expanded = JSON.parse(expandedProcess.stdout);
assert.equal(original.refs.length, 6);
assert.equal(expanded.refs.length, 14);
assert.equal(JSON.stringify(expanded.refs.slice(0, 6)), JSON.stringify(original.refs),
  "original references including current projected stats/actives remain byte-exact");
assert.deepEqual(expanded.inventory, original.inventory, "additional references never add owned Hunters");
assert.deepEqual(expanded.birth, original.birth, "birth/recruitment rules unchanged");
assert.deepEqual(expanded.gacha, original.gacha, "gacha selection unchanged");
for (const row of expanded.refs.slice(6)) {
  assert.equal(row.is_main, 0, "main flag is explicit local policy");
  assert.deepEqual(row.stat.map((stat: any) => stat.rank), [1, 2, 3, 4, 5]);
  assert.ok(row.stat.every((stat: any) => stat.hp === "1000" && stat.atk === "100" && stat.def === "50"),
    "new rows retain documented legacy fixture numerals, not historical observations or stronger Episode stats");
  assert.deepEqual(row.skill, fixtureSkillSlots(row.id), "new ordinary skill slots remain neutral fixtures");
}
const partialProcess = bootstrapProfile("materials", names.filter((name) => name !== "C036_Q.jet"));
assert.equal(partialProcess.status, 0, partialProcess.stderr);
assert.equal(JSON.parse(partialProcess.stdout).refs.length, 13, "partial material list cannot publish missing-portrait Hunter");
const noMaterialProcess = bootstrapProfile("materials", []);
assert.equal(noMaterialProcess.status, 0, noMaterialProcess.stderr);
assert.equal(JSON.parse(noMaterialProcess.stdout).refs.length, 6, "explicit opt-in still requires selected original materials");
const invalidProcess = bootstrapProfile("guess-everything");
assert.notEqual(invalidProcess.status, 0);
assert.match(invalidProcess.stderr, /Unknown ordinary card reference profile/);
console.log(`Character registry: 113 exact identities, ${candidates.length} additional material-backed ordinary candidates; original claims preserved, no balance or ownership grants.`);
console.log(candidates.map((row) => `${row.id} ${row.name}`).join(", "));
