import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { normalizeSearch } from "../src/search-battle.js";

const dir = mkdtempSync(path.join(os.tmpdir(), "blustone-search-repeat-"));
const file = path.join(dir, "state.json"), realNow = Date.now;
try {
  let now = 1_800_000_000_000;
  Date.now = () => now;
  let state = new ServerState("http://localhost", file);
  const auth = state.registerGuest({ device_id: "repeat" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const req = (route: string, fields: Record<string, unknown> = {}) => gameResponse(state, route, { ...auth, ...fields }) as any;
  const inst = () => req("/explore/GetInst").ret_data;
  const start = () => req("/explore/Begin", { type: 1, ref_id: "017", owner: 0, inst_id: 0, friend_pvid: 0,
    friend_leader_id: 0, vfid: "", wave_info: 1 });
  const end = (id: number) => req("/explore/End", { log_id: id, cleared_wave: 2, play_info: '{"clear":1,"item_use":[]}' });
  const retry = () => req("/explore/Retry", { ref_id: "017", price: 10, price_type: 1 });
  const reset = () => req("/explore/Reset", { price: 30, price_type: 1 });
  assert.notEqual(retry().result_code, 1, "no purchase without an exhausted actual play");
  for (let i = 0; i < 3; i++) {
    state.startMission({ ...auth, stage_id: "n_01_01" }, {});
    state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1}' }, {});
  }
  const original = JSON.stringify([game.starter_cards, game.recruited_cards, game.decks, game.tutorial, game.stage_achievements]);
  const first = start(); assert.equal(first.result_code, 1); assert.equal(end(first.ret_data.log_id).result_code, 1);
  assert.equal(inst().cooltime, now / 1000 + 3600, "absolute server seconds, not duration or milliseconds");
  assert.notEqual(start().result_code, 1);
  const before = JSON.stringify(game);
  for (const bad of [{ price: 0, price_type: 1 }, { price: 10, price_type: 2 }, { price: 10, price_type: 1, ref_id: "bad" }]) {
    assert.notEqual(req("/explore/Retry", { ref_id: "017", ...bad }).result_code, 1);
    assert.equal(JSON.stringify(game), before, "stale/manipulated quote refuses atomically");
  }
  const oldFree = game.gacha_free_qty, oldPaid = game.gacha_iap_qty;
  game.gacha_free_qty = 5; game.gacha_iap_qty = 4;
  const short = JSON.stringify(game);
  assert.notEqual(retry().result_code, 1); assert.equal(JSON.stringify(game), short);
  game.gacha_free_qty = 5; game.gacha_iap_qty = 20;
  const paid = retry(); assert.equal(paid.result_code, 1);
  assert.deepEqual(paid.ret_data.user, { free_iap: { prev: 5, cur: 0 }, iap: { prev: 20, cur: 15 } });
  assert.deepEqual(paid.ret_data.retry_log, ["017"]);
  assert.equal(paid.ret_data.play_log.length, 1, "native subtracts retry count from retained completed plays");
  const charged = JSON.stringify(game);
  assert.equal(retry().result_code, 1); assert.equal(JSON.stringify(game), charged, "same-log retry acknowledgement cannot charge twice");
  assert.equal(retry().ret_data.user, null, "replayed response carries no wallet delta");
  const legacy = structuredClone(game.search) as any; delete legacy.repeat;
  const upgraded = normalizeSearch(legacy);
  assert.equal(upgraded.repeat.play_log[0].log_id, first.ret_data.log_id, "legacy completion migrates, not a new grant");
  state = new ServerState("http://localhost", file); game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.gacha_iap_qty, 15); assert.deepEqual(inst().retry_log, ["017"]);
  const second = start(); assert.equal(second.result_code, 1);
  const active = JSON.stringify(game); assert.notEqual(reset().result_code, 1); assert.equal(JSON.stringify(game), active);
  assert.equal(end(second.ret_data.log_id).result_code, 1);
  assert.equal(inst().play_log.length, 2); assert.notEqual(retry().result_code, 1, "one local retry per period");
  game.gacha_iap_qty = oldPaid; game.gacha_free_qty = oldFree;
  const resetBefore = game.gacha_free_qty;
  const reopened = reset(); assert.equal(reopened.result_code, 1);
  assert.equal(game.gacha_free_qty, resetBefore - 30);
  assert.deepEqual(reopened.ret_data.play_log, []); assert.deepEqual(reopened.ret_data.retry_log, []);
  assert.equal(reopened.ret_data.reset_cnt, 1);
  const afterReset = JSON.stringify(game);
  assert.equal(reset().result_code, 1); assert.equal(JSON.stringify(game), afterReset);
  assert.equal(end(second.ret_data.log_id).result_code, 1, "old End receipt survives reset without restoring play history");
  assert.deepEqual(inst().play_log, []);
  const third = start(); assert.equal(third.result_code, 1); assert.equal(end(third.ret_data.log_id).result_code, 1);
  assert.equal(game.items.find((row) => row.ref_id === "local_sylvester_trace")!.qty, 3);
  assert.equal(JSON.stringify([game.starter_cards, game.recruited_cards, game.decks, game.tutorial, game.stage_achievements]), original);
  const helperFlags = [...game.search.used_virtual]; reset(); assert.deepEqual(game.search.used_virtual, helperFlags);
  now += 3_600_000;
  assert.equal(inst().cooltime, 0); assert.deepEqual(inst().play_log, []);
  const noReset = JSON.stringify(game); assert.notEqual(retry().result_code, 1); assert.equal(JSON.stringify(game), noReset);
  console.log("Search repeat: native counter semantics, quote/fee pairs, restart/replays, capsule-backed resumed plays, reset isolation and absolute deadline passed; native UI pending.");
} finally { Date.now = realNow; rmSync(dir, { recursive: true, force: true }); }
