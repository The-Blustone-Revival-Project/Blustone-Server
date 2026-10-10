import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-hunter-exp-"));
const filename = path.join(directory, "state.json");
const originalNow = Date.now;
try {
  let now = 1_800_000_000_000;
  Date.now = () => now;
  let state = new ServerState("http://localhost", filename);
  const auth = state.registerGuest({ device_id: "battle-hunter-exp" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  game.starter_cards[0].exp = 95;
  game.starter_cards[1].exp = 2895;
  const start = (stage = "n_01_01") => state.startMission({ ...auth, stage_id: stage, deck_inst_id_1: 1, deck_inst_id_2: 2 }, {});
  const finish = (clear: number, stage = "n_01_01") => state.completeMission({ ...auth, stage_id: stage,
    play_info: JSON.stringify({ clear, clear_time: 10, dead_cnt: 0 }) }, {}) as any;
  start();
  game.decks[0].list = [2, 0, 0, 0, 0]; // selected formation can change; battle snapshot remains authoritative
  const first = finish(1).ret_data;
  assert.deepEqual(first.card, { "1": { prev: 95, cur: 105 }, "2": { prev: 2895, cur: 2900 } });
  assert.equal(first.card["1"].exp, undefined, "EXP pair is direct, never nested");
  assert.equal(game.starter_cards[0].exp, 105);
  assert.equal(game.starter_cards[1].exp, 2900);
  const afterFirst = game.gold;
  assert.deepEqual(finish(1).ret_data.card, {}, "duplicate completion cannot pay hunter EXP again");
  assert.equal(game.starter_cards[0].exp, 105);
  start();
  const replay = finish(1).ret_data;
  assert.deepEqual(replay.card["1"], { prev: 105, cur: 115 }, "fresh replay win progresses hunters");
  assert.equal(game.gold, afterFirst, "hunter replay reward does not reopen first-clear gold");
  start();
  assert.deepEqual(finish(0).ret_data.card, {}, "defeat has no local hunter EXP reward");
  assert.equal(game.starter_cards[0].exp, 115);
  start("n_01_02");
  const battleId = game.active_battle!.battle_id;
  const beforeWrong = JSON.stringify(game);
  const stale = finish(1);
  assert.equal(stale.ret_data.accepted, false);
  assert.equal(stale.ret_data.error_code, "ACTIVE_STAGE_MISMATCH");
  assert.deepEqual(stale.ret_data.card, {});
  assert.equal(JSON.stringify(game), beforeWrong, "stale stage cannot discard another active battle or reward its hunters");
  assert.equal(game.active_battle!.battle_id, battleId);
  finish(1, "n_01_02");
  state = new ServerState("http://localhost", filename);
  game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.starter_cards[0].exp, 125, "reward survives restart");
  assert.equal(game.starter_cards[1].exp, 2900);
  // Preserve pre-existing EXP beyond our fixture cap rather than claw it back.
  game.starter_cards[1].exp = 9999;
  game.starter_cards[0].awk_step = 1; // no reconstructed awake curve
  now += 1000;
  start("n_01_03");
  const preserved = finish(1, "n_01_03").ret_data.card;
  assert.equal(preserved["1"], undefined);
  assert.deepEqual(preserved["2"], { prev: 9999, cur: 9999 });
  assert.equal(game.starter_cards[0].exp, 125);
  console.log("Hunter battle EXP: absolute native pairs, snapshot ownership, caps, replays, duplicate/defeat/stale isolation and restart passed; UI unverified.");
} finally {
  Date.now = originalNow;
  rmSync(directory, { recursive: true, force: true });
}
