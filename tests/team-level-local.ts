import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { teamLevelProfile, teamLevelReference } from "../src/team-level-reference.js";

assert.deepEqual(teamLevelReference("legacy"), [{ min_exp: 0 }, { min_exp: 100 }]);
const rows = teamLevelReference("local-linear-100");
assert.equal(rows.length, 100); assert.equal(rows[4].min_exp, 400); assert.equal(rows[99].min_exp, 9900);
rows[0].min_exp = -1; assert.equal(teamLevelReference("local-linear-100")[0].min_exp, 0);
for (const raw of ["", "original", "local", "LOCAL-LINEAR-100", 1, null, {}, []]) assert.throws(() => teamLevelProfile(raw));
assert.equal(teamLevelProfile("legacy"), "legacy");
assert.equal(teamLevelProfile("local-linear-100"), "local-linear-100");

// Compiled child processes keep import-time profiles isolated and use only a
// disposable authored account. No live state, credentials or gameplay inputs.
const directory = mkdtempSync(path.join(tmpdir(), "blustone-team-level-local-"));
const filename = path.join(directory, "state.json");
const source = pathToFileURL(path.resolve("dist/src/state.js")).href;
const levels = pathToFileURL(path.resolve("dist/src/team-level.js")).href;
const bootstrap = pathToFileURL(path.resolve("dist/src/bootstrap.js")).href;
const routes = pathToFileURL(path.resolve("dist/src/game-routes.js")).href;
const run = (mode: string, body: string) => spawnSync(process.execPath, ["--input-type=module", "--eval", `
  import assert from 'node:assert/strict';
  import {readFileSync} from 'node:fs';
  import {ServerState} from ${JSON.stringify(source)};
  import {teamLevel} from ${JSON.stringify(levels)};
  import {starterLevels} from ${JSON.stringify(bootstrap)};
  import {gameResponse} from ${JSON.stringify(routes)};
  const state=new ServerState('http://localhost',process.env.BLUSTONE_STATE_FILE);
  ${body}
`], { env: { ...process.env, BLUSTONE_STATE_FILE: filename, BLUSTONE_TEAM_LEVEL_PROFILE: mode }, encoding: "utf8" });
try {
  const seed = run("legacy", `
    const auth=state.registerGuest({device_id:'authored-team-level'},{}).ret_data;
    const game=state.gameFor(state.accountFor(auth,{}));game.exp=1500;state.persist();
    assert.equal(teamLevel(game.exp),2);assert.equal(starterLevels.user.length,2);
  `);
  assert.equal(seed.status, 0, seed.stderr);
  const saved = readFileSync(filename);
  const loaded = run("local-linear-100", `
    const game=[...state.gameByPvid.values()][0];
    assert.equal(game.exp,1500);assert.equal(teamLevel(game.exp),16);
    assert.deepEqual([0,99,100,399,400,9900,100000].map(teamLevel),[1,1,2,4,5,100,100]);
    assert.equal(starterLevels.user.length,100);
    assert.deepEqual(gameResponse(state,'/reference/GetLevel',{}).ret_data.user,starterLevels.user);
    assert.deepEqual([...state.gameByPvid.entries()],JSON.parse(readFileSync(process.env.BLUSTONE_STATE_FILE,'utf8')).gameStates);
  `);
  assert.equal(loaded.status, 0, loaded.stderr);
  assert.deepEqual(readFileSync(filename), saved, "Selecting a curve grants nothing and preserves the entire save");
  const invalid = run("guessed-original", "throw new Error('must not reach state construction')");
  assert.notEqual(invalid.status, 0); assert.match(invalid.stderr, /TEAM_LEVEL_PROFILE/);
  assert.deepEqual(readFileSync(filename), saved, "Unknown curve refuses without overwriting the save");
  const reverted = run("legacy", "assert.equal(teamLevel([...state.gameByPvid.values()][0].exp),2);");
  assert.equal(reverted.status, 0, reverted.stderr); assert.deepEqual(readFileSync(filename), saved);
  const earned = run("local-linear-100", `
    const auth=state.registerGuest({device_id:'authored-team-boundary'},{}).ret_data;
    const game=state.gameFor(state.accountFor(auth,{}));game.exp=380;state.persist();
    assert.equal(state.startMission({...auth,stage_id:'n_01_01'},{}).result_code,1);
    const result=state.completeMission({...auth,stage_id:'n_01_01',play_info:JSON.stringify({clear:1,clear_time:10,dead_cnt:0})},{});
    assert.equal(result.result_code,1);assert.equal(game.exp,410);
    assert.deepEqual(result.ret_data.user.exp.level,{prev:4,cur:5});
    assert.equal(result.ret_data.user.exp.prev,380);assert.equal(result.ret_data.user.exp.cur,410);
    assert.equal(teamLevel(game.exp),5);
  `);
  assert.equal(earned.status, 0, earned.stderr);
  console.log("Local team curve: explicit100-step/100-level policy, exact legacy default, native count boundaries, save-preserving load/revert and unknown-profile refusal passed; original thresholds unknown.");
} finally { rmSync(directory, { recursive: true, force: true }); }
