import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { cardInstance } from "../src/bootstrap.js";
import { LOCAL_CARD_CAPACITY } from "../src/trace-exchange.js";
import { SEARCH_HELPER_SERIAL } from "../src/search-helpers.js";

const dir = mkdtempSync(path.join(os.tmpdir(), "blustone-trace-exchange-"));
const file = path.join(dir, "state.json");
const realNow = Date.now;
try {
  let now = 1_800_000_000_000;
  Date.now = () => now;
  let state = new ServerState("http://localhost", file);
  const auth = state.registerGuest({ device_id: "trace-earner" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const req = (route: string, fields: Record<string, unknown>) => gameResponse(state, route, { ...auth, ...fields }) as any;
  const exchange = (fields: Record<string, unknown>) => req("/shop/PieceExchange", fields);
  // Earn every trace through the real campaign/costed Search service in this
  // disposable account; no live account changes or trace-prefill shortcuts.
  for (let i = 0; i < 20; i++) {
    state.startMission({ ...auth, stage_id: "n_01_01" }, {});
    state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1}' }, {});
    const begin = req("/explore/Begin", { owner: "0", type: "1", ref_id: "017", inst_id: "0",
      friend_pvid: "0", friend_leader_id: "0", vfid: "", wave_info: "1" });
    assert.equal(begin.result_code, 1);
    assert.equal(req("/explore/End", { log_id: begin.ret_data.log_id, cleared_wave: 2,
      play_info: '{"clear":1,"item_use":[]}' }).result_code, 1);
    now += 86_400_000;
  }
  const trace = game.items.find((row) => row.ref_id === "local_sylvester_trace")!;
  assert.equal(trace.qty, 20);
  assert.equal(state.startMission({ ...auth, stage_id: "n_01_01" }, {}).result_code, 1);
  const duringCombat = JSON.stringify(game);
  assert.notEqual(exchange({ item_inst_id: trace.inst_id, cnt: 1 }).result_code, 1);
  assert.equal(JSON.stringify(game), duringCombat, "new owned actor cannot collide with a running combat actor");
  state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1}' }, {});
  const before = JSON.stringify(game);
  for (const fields of [{}, { item_inst_id: trace.inst_id, cnt: 0 }, { item_inst_id: trace.inst_id, cnt: 3 },
    { item_inst_id: trace.inst_id, cnt: 1.1 }, { item_inst_id: "006", cnt: 1 },
    { item_inst_id: trace.inst_id, cnt: Number.MAX_SAFE_INTEGER }, { item_inst_id: 999, cnt: 1 }]) {
    assert.notEqual(exchange(fields).result_code, 1);
    assert.equal(JSON.stringify(game), before, "invalid identity/count/quantity refuses atomically");
  }
  trace.lock = 1;
  assert.notEqual(exchange({ item_inst_id: trace.inst_id, cnt: 1 }).result_code, 1);
  trace.lock = 0;
  const oldAllocator = game.next_card_inst_id;
  for (const next of [Number.MAX_SAFE_INTEGER, SEARCH_HELPER_SERIAL]) {
    game.next_card_inst_id = next;
    const snapshot = JSON.stringify(game);
    assert.notEqual(exchange({ item_inst_id: trace.inst_id, cnt: 1 }).result_code, 1);
    assert.equal(JSON.stringify(game), snapshot);
  }
  game.next_card_inst_id = oldAllocator;
  const balance = [game.gold, game.exp, game.ap, game.bp, game.gacha_free_qty, game.gacha_iap_qty];
  const party = JSON.stringify([game.decks, game.tutorial, game.stage_achievements, game.starter_cards]);
  const previous = game.recruited_cards.length;
  const success = exchange({ item_inst_id: String(trace.inst_id), cnt: "2" });
  assert.equal(success.result_code, 1);
  assert.equal(success.ret_data.card.length, 2, "cnt means hunters, not spent traces");
  assert.deepEqual(success.ret_data.consumed_inst_list, [{ inst_id: trace.inst_id, qty: 20 }]);
  assert.equal(success.ret_data.dailyquest_min_stage, "");
  assert.deepEqual(success.ret_data.daily_quest, []);
  assert.deepEqual(success.ret_data.linear_quest, []);
  assert.equal(trace.qty, 0);
  assert.equal(game.recruited_cards.length, previous + 2);
  for (const card of success.ret_data.card) {
    assert.equal(card.ref_id, "006"); assert.equal(card.rank, 1);
    assert.deepEqual(card, cardInstance(card.inst_id, "006", 1));
    assert.equal("index_id" in card, false, "native builds the result marker itself");
  }
  assert.notEqual(success.ret_data.card[0].inst_id, success.ret_data.card[1].inst_id);
  assert.ok(game.card_book.some((row) => row.ref_id === "006" && row.rank === 1));
  assert.deepEqual([game.gold, game.exp, game.ap, game.bp, game.gacha_free_qty, game.gacha_iap_qty], balance);
  assert.equal(JSON.stringify([game.decks, game.tutorial, game.stage_achievements, game.starter_cards]), party);
  state = new ServerState("http://localhost", file);
  game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.items.find((row) => row.inst_id === trace.inst_id)!.qty, 0);
  assert.deepEqual(game.recruited_cards.slice(-2), success.ret_data.card);
  assert.notEqual(exchange({ item_inst_id: trace.inst_id, cnt: 1 }).result_code, 1, "unfunded response retry cannot grant twice");
  const other = state.registerGuest({ device_id: "other-trace-owner" }, {}).ret_data as { otp: string };
  assert.notEqual(gameResponse(state, "/shop/PieceExchange", { ...other, item_inst_id: trace.inst_id, cnt: 1 }).result_code, 1);
  // Capacity refusal exercises a separate disposable synthetic fixture.
  const otherGame = state.gameFor(state.accountFor(other, {}));
  otherGame.items.push({ inst_id: 100, ref_id: "local_sylvester_trace", qty: 10, lock: 0 });
  while (otherGame.starter_cards.length + otherGame.recruited_cards.length < LOCAL_CARD_CAPACITY)
    otherGame.recruited_cards.push(cardInstance(1000 + otherGame.recruited_cards.length, "006", 1));
  const full = JSON.stringify(otherGame);
  assert.equal(gameResponse(state, "/shop/PieceExchange", { ...other, item_inst_id: 100, cnt: 1 }).result_code, 10027);
  assert.equal(JSON.stringify(otherGame), full);
  console.log("Trace exchange: earned costed Search traces, hunter count/debit, atomic refusal, capacity, identity/book and durable ownership passed; native success UI pending.");
} finally { Date.now = realNow; rmSync(dir, { recursive: true, force: true }); }
