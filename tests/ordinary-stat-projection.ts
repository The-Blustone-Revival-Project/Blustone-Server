import { repositoryPath } from "../src/paths.js";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
process.env.BLUSTONE_CARD_STAT_PROFILE = "archive-2019-projection";
const { starterReference } = await import("../src/bootstrap.js");
const { ServerState } = await import("../src/state.js");
const { gameResponse } = await import("../src/game-routes.js");

// Compare the published wire values to the actual curated source observation,
// rather than duplicating the new projection's constants in the assertions.
const lines = fs.readFileSync(repositoryPath("resources", "reference", "archived-hunter-database-2019.tsv"), "utf8").trim().split(/\r?\n/);
const columns = lines[0].split("\t").map((s) => s.replace(/^"|"$/g, ""));
const observed = lines.slice(1).map((line) => Object.fromEntries(line.split("\t").map((value, index) =>
  [columns[index], value.replace(/^"|"$/g, "")])));
const fields = { hp: "hp", atk: "atk", def: "def", spd: "speed", crt_chance: "crit", crt_dmg: "crit_damage",
  penetration: "penetration", block_chance: "block", block_dec_dmg: "block_damage_reduction",
  attr_enhance: "element_enhance", attr_resist: "element_resistance", hp_regen: "hp_regen" } as const;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blustone-stat-projection-"));
try {
  const file = path.join(dir, "state.json");
  const seed = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    `const {ServerState}=await import('./src/state.ts'); const state=new ServerState('http://localhost',${JSON.stringify(file)});
    const guest=state.registerGuest({device_id:'stat-projection-preservation'},{}).ret_data;
    const auth={otp:guest.otp}; const game=state.gameFor(state.accountFor(auth,{}));
    game.starter_cards[0].exp=840; game.starter_cards[0].rank=2;
    game.gold=11580; game.group_exp=840; game.stage_achievements.n_01_01=[0,2];
    state.setDeck({...auth,deck_info:[{type:1,list:[game.starter_cards[0].inst_id,0,0,0]}]},{});`],
    { env: { ...process.env, BLUSTONE_CARD_STAT_PROFILE: "legacy" }, encoding: "utf8" });
  assert.equal(seed.status, 0, seed.stderr);
  const before = fs.readFileSync(file);
  const state = new ServerState("http://localhost", file);
  assert.deepEqual(fs.readFileSync(file), before, "profile switch must preserve the whole progressed legacy save");
  const response = gameResponse(state, "/reference/GetCard", {})!;
  assert.deepEqual(response.ret_data, starterReference);
  for (const id of ["001", "002", "003", "004"]) {
    const source = observed.find((row) => row.catalog_id === id)!;
    assert.equal(source.level, "not shown");
    assert.equal(source.gear_state, "not established");
    const reference = starterReference.find((row) => row.base.id === id)!;
    assert.equal(reference.base.res_prefix, `C${id}`);
    assert.deepEqual(reference.stat.map((row) => [row.rank, row.awk_step]), [1,2,3,4,5].map((rank) => [rank,0]));
    for (const stat of reference.stat) {
      for (const [field, column] of Object.entries(fields)) assert.equal(stat[field as keyof typeof fields], source[column]);
      assert.deepEqual([stat.hp_up, stat.atk_up, stat.def_up], ["10", "1", "1"]);
    }
  }
  for (const id of ["005", "006"]) for (const stat of starterReference.find((row) => row.base.id === id)!.stat)
    assert.deepEqual([stat.hp, stat.atk, stat.def, stat.spd], ["1000", "100", "50", "100"], "unobserved refs must not inherit projected Lantern");
  assert.deepEqual(fs.readFileSync(file), before, "reference publication cannot rewrite ownership, EXP, ranks or progress");
  new ServerState("http://localhost", file);
  assert.deepEqual(fs.readFileSync(file), before, "restart must preserve the whole persisted save");
  const run = (profile: string | undefined, override = "002") => {
    const env: NodeJS.ProcessEnv = { ...process.env, BLUSTONE_GACHA_CARD: override };
    if (profile === undefined) delete env.BLUSTONE_CARD_STAT_PROFILE;
    else env.BLUSTONE_CARD_STAT_PROFILE = profile;
    return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e",
    "const {starterReference}=await import('./src/bootstrap.ts');console.log(JSON.stringify(starterReference.map(r=>({id:r.base.id,stat:r.stat[0]}))));"],
    { env, encoding: "utf8" });
  };
  const defaults = run(undefined); assert.equal(defaults.status, 0, defaults.stderr);
  assert.equal(JSON.parse(defaults.stdout).find((row: any) => row.id === "003").stat.def, "864");
  const legacy = run("legacy"); assert.equal(legacy.status, 0, legacy.stderr);
  for (const row of JSON.parse(legacy.stdout)) {
    const expected = { hp: "1000", atk: row.id === "002" ? "120" : "100", def: row.id === "002" ? "40" : "50",
      spd: row.id === "002" ? "110" : "100", crt_chance: "5", crt_dmg: "150", penetration: "0", block_chance: "0",
      block_dec_dmg: "0", attr_enhance: "0", attr_resist: "0", hp_regen: "0", hp_up: "10", atk_up: "1", def_up: "1" };
    for (const [field,value] of Object.entries(expected)) assert.equal(row.stat[field], value);
  }
  const override = run("archive-2019-projection", "099"); assert.equal(override.status, 0, override.stderr);
  const alternative = JSON.parse(override.stdout).find((row: any) => row.id === "099");
  assert.deepEqual([alternative.stat.atk, alternative.stat.def, alternative.stat.spd], ["120", "40", "110"]);
  const invalid = run("unknown"); assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /Unknown ordinary Hunter stat profile/);
} finally { fs.rmSync(dir, { recursive: true, force: true }); }
console.log("Ordinary stat projection: curated source parity, exact wire rows, isolated overrides, legacy rollback and full-save preservation passed.");
