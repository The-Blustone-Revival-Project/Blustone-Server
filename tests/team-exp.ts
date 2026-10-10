import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { teamLevel } from "../src/team-level.js";
const directory = mkdtempSync(path.join(tmpdir(), "blustone-team-exp-"));
try {
  const filename = path.join(directory, "state.json");
  let state = new ServerState("http://localhost", filename);
  const auth = state.registerGuest({ device_id: "team-exp-reload" }, {}).ret_data as { otp: string };
  const account = state.accountFor(auth, {});
  const game = state.gameFor(account), previousExp = game.exp;
  assert.deepEqual([0, 99, 100, 270].map(teamLevel), [1, 1, 2, 2]);
  let stageIndex = 0;
  for (const stage_id of ["n_01_01", "n_01_02", "n_01_03", "n_01_04"]) {
    assert.equal(state.startMission({ ...auth, stage_id }, {}).result_code, 1);
    const win = state.completeMission({ ...auth, stage_id,
      play_info: JSON.stringify({ clear: 1, clear_time: 10, dead_cnt: 0 }) }, {}).ret_data as any;
    assert.equal(win.user.exp.cur, game.exp);
    assert.deepEqual(win.user.exp.level, stageIndex === 3 ? { prev: 1, cur: 2 } : { prev: 1, cur: 1 });
    assert.deepEqual(win.user.exp.max_ap, { prev: game.max_ap, cur: game.max_ap });
    assert.deepEqual(win.level, win.user.exp.level, "legacy alias must not advertise fictitious level30");
    stageIndex += 1;
  }
  const earned = game.exp;
  assert.equal(earned, previousExp + 120);
  assert.equal(state.partyProfileSnapshot(account.pvid).group_exp, earned);
  const current = state.lobbyEnter(auth, {}).ret_data as any;
  assert.equal(current.group_exp, earned);
  assert.equal(current.user.group_exp, earned);
  assert.notEqual(Number(game.starter_cards[0].exp), earned, "hunter EXP is not team EXP");
  state = new ServerState("http://localhost", filename);
  const reloaded = state.lobbyEnter(auth, {}).ret_data as any;
  assert.equal(reloaded.group_exp, earned);
  assert.equal(reloaded.user.group_exp, earned);
  assert.equal(state.gameFor(state.accountFor(auth, {})).exp, earned, "reload must not award or erase team EXP");
  const other = state.registerGuest({ device_id: "other-team-exp" }, {}).ret_data as { otp: string };
  assert.equal((state.lobbyEnter(other, {}).ret_data as any).user.group_exp, previousExp);
  console.log("Team EXP: earned mission value, profile/lobby coherence, restart and account isolation passed; native level-up UI unverified.");
} finally { rmSync(directory, { recursive: true, force: true }); }
