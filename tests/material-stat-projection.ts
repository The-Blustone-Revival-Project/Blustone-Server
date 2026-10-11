import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { repositoryPath } from "../src/paths.js";
import { MATERIAL_ARCHIVE_IDS, materialArchiveObservations, projectMaterialStats } from "../src/material-stat-projection.js";
import { ServerState } from "../src/state.js";

const source = materialArchiveObservations();
const rawLines = readFileSync(repositoryPath("resources/reference/archived-hunter-database-2019.tsv"), "utf8").trim().split(/\r?\n/);
const rawColumns = rawLines.shift()!.split("\t").map(value => value.replace(/^"|"$/g, ""));
const rawRows = rawLines.map(line => Object.fromEntries(line.split("\t").map((value, index) =>
  [rawColumns[index], value.replace(/^"|"$/g, "")])));
const wireOrder = ["hp", "atk", "def", "spd", "crt_chance", "crt_dmg", "penetration", "block_chance", "block_dec_dmg", "attr_enhance", "attr_resist", "hp_regen"];
const archiveOrder = ["hp", "atk", "def", "speed", "crit", "crit_damage", "penetration", "block", "block_damage_reduction", "element_enhance", "element_resistance", "hp_regen"];
for (const id of MATERIAL_ARCHIVE_IDS) {
  const original = rawRows.find(row => row.catalog_id === id)!;
  assert.deepEqual(wireOrder.map(key => source[id].values[key]), archiveOrder.map(key => original[key]),
    "wire fields must match independently read original columns rather than a copied numerical fixture");
  assert.equal(source[id].captured, original.capture_timestamp);
  assert.equal(source[id].url, original.source_url);
}
const neutral = { rank: 2, awk_step: 0, hp: "1000", atk: "100", def: "50", spd: "100", hp_up: "10", atk_up: "1", def_up: "1" };
assert.deepEqual(projectMaterialStats("009", neutral, "neutral"), neutral);
assert.deepEqual(projectMaterialStats("001", neutral, "archive-2019-projection"), neutral, "existing starter refs excluded");
assert.deepEqual(projectMaterialStats("014", neutral, "archive-2019-projection"), neutral, "no automatic extension to unaudited refs");
assert.throws(() => projectMaterialStats("009", neutral, "unknown"), /Unknown/);
const beforeNeutral = JSON.stringify(neutral);
for (const id of MATERIAL_ARCHIVE_IDS) {
  assert.equal(source[id].level, "not shown");
  assert.equal(source[id].gearState, "not established");
  const row = projectMaterialStats(id, neutral, "archive-2019-projection");
  for (const [key, value] of Object.entries(source[id].values)) assert.equal(row[key as keyof typeof row], value);
  assert.deepEqual([row.rank, row.awk_step, row.hp_up, row.atk_up, row.def_up], [2, 0, "10", "1", "1"]);
}
assert.equal(JSON.stringify(neutral), beforeNeutral);
source["009"].values.hp = "0";
assert.equal(materialArchiveObservations()["009"].values.hp, "1624", "callers cannot mutate cached provenance");

const profile = JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"), "utf8"));
const candidate = JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials-archive.json"), "utf8"));
assert.equal(candidate.preparedOnly, true);
assert.equal(candidate.resourceStamp, profile.resourceStamp);
const otherEnv = { ...candidate.env }; delete otherEnv.BLUSTONE_MATERIAL_STAT_PROFILE;
assert.deepEqual(otherEnv, profile.env, "no asset, active skill, recruitment or existing starter policy change");
const folder = mkdtempSync(path.join(tmpdir(), "blustone-material-projection-"));
try {
  const file = path.join(folder, "state.json");
  const state = new ServerState("http://localhost", file);
  const auth = state.registerGuest({ device_id: "material-projection-isolated" }, {}).ret_data as Record<string, unknown>;
  const game = state.gameFor(state.accountFor(auth, {}));
  game.starter_cards[0].exp = 610; game.gold = 13600;
  state.setDeck({ otp: auth.otp, deck_info: [{ type: 1, list: [game.starter_cards[0].inst_id, 0, 0, 0] }] }, {});
  const originalBytes = readFileSync(file);
  const run = (statProfile: string | undefined) => {
    const env = { ...process.env, ...profile.env, BLUSTONE_MATERIAL_STAT_PROFILE: statProfile };
    if (statProfile === undefined) delete env.BLUSTONE_MATERIAL_STAT_PROFILE;
    return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
      import {ServerState} from './src/state.ts'; import {gameResponse} from './src/game-routes.ts';
      const state=new ServerState('http://localhost',${JSON.stringify(file)});
      console.log(JSON.stringify(gameResponse(state,'/reference/GetCard',{}).ret_data));
      new ServerState('http://localhost',${JSON.stringify(file)});`],
      { cwd: repositoryPath(), env, encoding: "utf8", timeout: 20_000 });
  };
  const defaults = run(undefined), explicit = run("neutral"), archival = run("archive-2019-projection");
  for (const output of [defaults, explicit, archival]) assert.equal(output.status, 0, output.stderr);
  assert.equal(defaults.stdout, explicit.stdout, "default catalogue remains byte-equivalent");
  const oldRefs = JSON.parse(defaults.stdout), newRefs = JSON.parse(archival.stdout);
  assert.equal(newRefs.length, 14);
  assert.deepEqual(newRefs.slice(0, 6), oldRefs.slice(0, 6), "all six existing references remain exact");
  for (const ref of newRefs.slice(6)) {
    const prior = oldRefs.find((row: any) => row.base.id === ref.base.id);
    const { stat: oldStats, ...oldOther } = prior, { stat: newStats, ...newOther } = ref;
    assert.deepEqual(newOther, oldOther, "skills, identity, equipment, dialog and source flags remain exact");
    for (let i = 0; i < newStats.length; i++) {
      const expected = { ...oldStats[i], ...materialArchiveObservations()[ref.base.id].values };
      assert.deepEqual(newStats[i], expected, "only source-backed historical numeric fields change");
    }
  }
  assert.deepEqual(readFileSync(file), originalBytes, "all progressed game/account/keys/save bytes remain exact across reads/restarts");
  const invalid = run("unknown"); assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /Unknown material/);
} finally { rmSync(folder, { recursive: true, force: true }); }
console.log("Material historical projection: eight pinned observations, opt-in source parity, unchanged starter refs/skills/growth and entire progressed save bytes passed; final-version bases unknown.");
