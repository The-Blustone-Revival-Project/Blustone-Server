import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { normalizeSearch } from "../src/search-battle.js";

const dir = mkdtempSync(path.join(os.tmpdir(), "blustone-guided-recruit-"));
const file = path.join(dir, "state.json"), realNow = Date.now;
try {
  let now = 1_800_000_000_000; Date.now = () => now;
  let state = new ServerState("http://localhost", file);
  const auth = state.registerGuest({ device_id: "guided-recruit" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const req = (route: string, fields: Record<string, unknown>) => gameResponse(state, route, { ...auth, ...fields }) as any;
  const clear = () => req("/tuto/Clear", { type: "37", step: "1" });
  const empty = JSON.stringify(game);
  assert.notEqual(clear().result_code, 1); assert.equal(JSON.stringify(game), empty, "no silent initial guide clear or grant");
  for (let i = 0; i < 10; i++) {
    state.startMission({ ...auth, stage_id: "n_01_01" }, {});
    state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1}' }, {});
    const begin = req("/explore/Begin", { owner: 0, type: 1, ref_id: "017", inst_id: 0,
      friend_pvid: 0, friend_leader_id: 0, vfid: "", wave_info: 1 });
    assert.equal(begin.result_code, 1);
    assert.equal(req("/explore/End", { log_id: begin.ret_data.log_id, cleared_wave: 2,
      play_info: '{"clear":1,"item_use":[]}' }).result_code, 1);
    if (i === 0) { const before = JSON.stringify(game); assert.notEqual(clear().result_code, 1); assert.equal(JSON.stringify(game), before); }
    now += 86_400_000;
  }
  const beforeAck = JSON.stringify(game); assert.notEqual(clear().result_code, 1); assert.equal(JSON.stringify(game), beforeAck);
  assert.equal(req("/tuto/Clear", { type: 37, step: 0 }).result_code, 1);
  const trace = game.items.find((row) => row.ref_id === "local_sylvester_trace")!;
  assert.equal(trace.qty, 10, "all traces earned through capsule-backed Search, no prefill");
  const balance = [game.gold, game.exp, game.ap, game.bp, game.gacha_free_qty, game.gacha_iap_qty];
  const original = JSON.stringify([game.starter_cards, game.decks, game.stage_achievements]);
  trace.lock = 1; const locked = JSON.stringify(game); assert.notEqual(clear().result_code, 1); assert.equal(JSON.stringify(game), locked);
  trace.lock = 0;
  const result = clear(); assert.equal(result.result_code, 1);
  assert.equal(result.ret_data.type, 37); assert.equal(result.ret_data.step, 1);
  assert.equal(result.ret_data.card.length, 1, "native collection feeds the single tutorial result marker");
  assert.equal(result.ret_data.card[0].ref_id, "006");
  assert.deepEqual(result.ret_data.consume_result.item, [{ inst_id: trace.inst_id, qty: 10 }]);
  assert.equal(trace.qty, 0);
  assert.equal(game.recruited_cards.length, 1);
  assert.ok(game.tutorial.some((row) => row.type === 37 && row.step === 1 && row.is_cleared === 1));
  assert.equal(JSON.stringify([game.starter_cards, game.decks, game.stage_achievements]), original);
  assert.deepEqual([game.gold, game.exp, game.ap, game.bp, game.gacha_free_qty, game.gacha_iap_qty], balance);
  const settled = JSON.stringify(game);
  assert.deepEqual(clear().ret_data, { type: 37, step: 1 }, "duplicate ack omits card/consumption delta");
  assert.equal(JSON.stringify(game), settled);
  state = new ServerState("http://localhost", file); game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.recruited_cards.length, 1); assert.equal(game.items.find((row) => row.inst_id === trace.inst_id)!.qty, 0);
  assert.deepEqual(clear().ret_data, { type: 37, step: 1 }); assert.equal(game.recruited_cards.length, 1);
  const other = state.registerGuest({ device_id: "other-guide" }, {}).ret_data as { otp: string };
  assert.notEqual(gameResponse(state, "/tuto/Clear", { ...other, type: 37, step: 1 }).result_code, 1);
  // Complete the local initial guide without a trace-prefill shortcut. Paid
  // versus waived capsule cost must not change the next Recruit requirement.
  const fresh = state.registerGuest({ device_id: "initial-guide-flow" }, {}).ret_data as { otp: string };
  const freshGame = state.gameFor(state.accountFor(fresh, {}));
  const freshReq = (route: string, fields: Record<string, unknown>) => gameResponse(state, route, { ...fresh, ...fields }) as any;
  for (let stage = 1; stage <= 8; stage++) {
    const stage_id = `n_01_${String(stage).padStart(2, "0")}`;
    assert.equal(state.startMission({ ...fresh, stage_id }, {}).result_code, 1);
    assert.equal(state.completeMission({ ...fresh, stage_id, play_info: '{"clear":1}' }, {}).result_code, 1);
  }
  assert.equal(freshReq("/tuto/Clear", { type: 37, step: 0 }).result_code, 1);
  const initial = freshReq("/explore/Begin", { owner: 0, type: 1, ref_id: "017", inst_id: 0,
    friend_pvid: 0, friend_leader_id: 0, vfid: "local_lantern_helper", wave_info: 1 });
  assert.equal(initial.result_code, 1);
  assert.equal(freshGame.search.active!.guided, true);
  assert.equal(freshGame.search.active!.onboarding, false, "earned capsule still pays normally");
  const initialWin = freshReq("/explore/End", { log_id: initial.ret_data.log_id, cleared_wave: 2,
    play_info: '{"clear":1,"item_use":[]}' });
  assert.equal(initialWin.ret_data.item[0].added, 10);
  const snapshot = JSON.stringify(freshGame);
  freshReq("/explore/End", { log_id: initial.ret_data.log_id, cleared_wave: 2 });
  assert.equal(JSON.stringify(freshGame), snapshot, "initial payout replay cannot pay twice");
  const old = structuredClone(freshGame.search);
  old.last!.receipt.item[0].added = 1; old.last!.receipt.reward_item[0].qty = 1;
  assert.equal(normalizeSearch(old).last!.receipt.item[0].added, 1, "old settled guided receipt remains unchanged, no backfill");
  const recruited = freshReq("/tuto/Clear", { type: 37, step: 1 });
  assert.equal(recruited.result_code, 1, "initial guide win enables its required recruitment transaction");
  assert.equal(freshGame.items.find((row) => row.ref_id === "local_sylvester_trace")!.qty, 0);
  assert.equal(freshGame.recruited_cards.length, 1);
  assert.equal(freshGame.items.find((row) => row.ref_id === "AIRSHIP_TICKET")!.qty, 7, "no capsule waiver when stock exists");
  console.log("Guided Search recruitment: earned ten traces, prerequisite/lock checks, card collection+consumption, atomic tutorial/ownership persistence and duplicate isolation passed; native guided UI pending.");
} finally { Date.now = realNow; rmSync(dir, { recursive: true, force: true }); }
