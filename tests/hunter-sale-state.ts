import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "../src/state.js";
import { gameResponse } from "../src/game-routes.js";
import { cardInstance, starterReference } from "../src/bootstrap.js";
import { SEARCH_CAPSULE_ID } from "../src/search-capsules.js";

// Explicitly authored prices exercise local settlement; none are original prices.
const rank = Math.min(...starterReference.find((row) => row.base.id === "002")!.stat.map((row) => row.rank));
const goldRows = [{ rank, profit_type: 2, profit_target: "", profit_qty: 17 }];
const itemRows = [{ rank, profit_type: 5, profit_target: SEARCH_CAPSULE_ID, profit_qty: 3 }];
const directory = mkdtempSync(path.join(tmpdir(), "blustone-sale-state-"));
const priorEnv = process.env.BLUSTONE_CARD_SELL_PROFIT_JSON;
delete process.env.BLUSTONE_CARD_SELL_PROFIT_JSON;
try {
  const filename = path.join(directory, "game.json");
  const state = new ServerState("http://localhost", filename, { hunterSaleProfits: goldRows });
  const auth = state.registerGuest({ device_id: "sale-owner" }, {}).ret_data as any;
  const other = state.registerGuest({ device_id: "sale-other" }, {}).ret_data as any;
  const game = state.gameFor(state.accountFor(auth, {}));
  const otherGame = state.gameFor(state.accountFor(other, {}));
  const othersBefore = JSON.stringify(otherGame);
  game.recruited_cards.push(...[1000200, 1000201, 1000202].map((id) => ({ ...cardInstance(id, "002", 5), lock: 0 })));
  game.next_card_inst_id = 1000300;
  game.gold = 100;
  (state as any).persist(); // Disposable fixture seed; never a live state file.
  const sell = (ids: unknown, owner = auth) => gameResponse(state, "/shop/SellCard", { ...owner, inst_id_list: ids }) as any;
  assert.throws(() => gameResponse(state, "/shop/SellCard", { inst_id_list: [1000200] }), /authenticated account required/);
  assert.throws(() => sell([1000200], { otp: auth.otp, pvid: other.pvid }), /account|identity|PVID|pvid/i);
  const protectedBefore = JSON.stringify(game);
  const protectedBytes = readFileSync(filename, "utf8");
  for (const ids of [[game.leader_inst_id], [1000200, 9999999], [1000200, 1000200], [], ["1000200"]]) {
    assert.notEqual(sell(ids).result_code, 1);
    assert.equal(JSON.stringify(game), protectedBefore);
    assert.equal(readFileSync(filename, "utf8"), protectedBytes);
  }
  assert.notEqual(sell([1000200], other).result_code, 1, "A different account cannot sell the owner's card");
  const candidate = game.recruited_cards[0];
  candidate.inst_id = 999;
  const lowIdBefore = JSON.stringify(game);
  assert.notEqual(sell([999]).result_code, 1, "Production rejects reserved low hunter IDs");
  assert.equal(JSON.stringify(game), lowIdBefore);
  candidate.inst_id = 1000200;
  game.gold = 0xffff_ffff;
  const overflowBefore = JSON.stringify(game);
  assert.notEqual(sell([1000200]).result_code, 1);
  assert.equal(JSON.stringify(game), overflowBefore);
  game.gold = 100;
  for (const mode of ["lock", "deck", "battle", "arena", "search", "mirage"] as const) {
    if (mode === "lock") candidate.lock = 1;
    if (mode === "deck") game.decks.push({ type: 99, list: [candidate.inst_id] });
    if (mode === "battle") game.active_battle = { state: "active", deck_inst_ids: [candidate.inst_id] } as any;
    if (mode === "arena") game.arena.active = { deck_inst_ids: [candidate.inst_id] } as any;
    if (mode === "search") game.search.active = { deck_inst_ids: [candidate.inst_id] } as any;
    if (mode === "mirage") candidate.mirage_remain_hp = 999;
    const before = JSON.stringify(game);
    assert.notEqual(sell([candidate.inst_id]).result_code, 1, mode);
    assert.equal(JSON.stringify(game), before, "Refusal is read only: " + mode);
    candidate.lock = 0; candidate.mirage_remain_hp = 1000;
    game.decks = game.decks.filter((deck) => deck.type !== 99);
    game.active_battle = null; game.arena.active = null; game.search.active = null;
  }
  const extra = (gameResponse(state, "/reference/GetExtra", {}) as any).ret_data;
  assert.deepEqual(extra.card_sell_profit, goldRows);
  extra.card_sell_profit[0].profit_qty = 999;
  goldRows[0].profit_qty = 999;
  assert.equal(state.cardSaleProfitReference()[0].profit_qty, 17, "Caller cannot mutate snapshotted prices");
  const preserved = JSON.stringify({ book: game.card_book, decks: game.decks, next: game.next_card_inst_id,
    starters: game.starter_cards, progress: game.stage_achievements, episode: game.episode_progress });
  const receipt = sell("[1000200,1000201]");
  assert.equal(receipt.result_code, 1);
  assert.deepEqual(receipt.ret_data, { user: { gold: { cur: 134 } }, item: [] });
  assert.deepEqual(game.recruited_cards.map((card) => card.inst_id), [1000202]);
  assert.equal(JSON.stringify({ book: game.card_book, decks: game.decks, next: game.next_card_inst_id,
    starters: game.starter_cards, progress: game.stage_achievements, episode: game.episode_progress }), preserved);
  assert.equal(JSON.stringify(otherGame), othersBefore);
  const saved = readFileSync(filename, "utf8");
  assert.notEqual(sell([1000200, 1000201]).result_code, 1, "Repeated source IDs cannot credit twice");
  assert.equal(readFileSync(filename, "utf8"), saved);
  const restarted = new ServerState("http://localhost", filename, { hunterSaleProfits: [{ ...goldRows[0], profit_qty: 17 }] });
  const restored = restarted.gameFor(restarted.accountFor(auth, {}));
  assert.equal(restored.gold, 134);
  assert.deepEqual(restored.recruited_cards.map((card) => card.inst_id), [1000202]);
  const beforeRollback = JSON.stringify(restored);
  const originalRoster = restored.recruited_cards, originalItems = restored.items, originalBook = restored.card_book;
  mkdirSync(filename + ".tmp");
  assert.throws(() => restarted.sellCards({ ...auth, inst_id_list: [1000202] }, {}));
  assert.equal(JSON.stringify(restored), beforeRollback);
  assert.equal(restored.recruited_cards, originalRoster); assert.equal(restored.items, originalItems);
  assert.equal(restored.card_book, originalBook);
  assert.equal(readFileSync(filename, "utf8"), saved);
  rmSync(filename + ".tmp", { recursive: true });
  assert.equal(restarted.sellCards({ ...auth, inst_id_list: [1000202] }, {}).result_code, 1);

  const itemFile = path.join(directory, "items.json");
  const itemState = new ServerState("http://localhost", itemFile, { hunterSaleProfits: itemRows });
  const itemAuth = itemState.registerGuest({ device_id: "item-sale-owner" }, {}).ret_data as any;
  const itemGame = itemState.gameFor(itemState.accountFor(itemAuth, {}));
  itemGame.recruited_cards.push(...[1000400, 1000401].map((id) => ({ ...cardInstance(id, "002", 1), lock: 0 })));
  itemGame.next_card_inst_id = 1000500;
  const itemSale = (id: number) => itemState.sellCards({ ...itemAuth, inst_id_list: [id] }, {}) as any;
  const first = itemSale(1000400);
  assert.equal(first.result_code, 1);
  assert.deepEqual(first.ret_data.item, [{ inst_id: 1, ref_id: SEARCH_CAPSULE_ID, added: 3 }]);
  assert.equal(itemGame.next_item_inst_id, 2);
  itemGame.items[0].lock = 1;
  const itemBefore = JSON.stringify(itemGame);
  (itemState as any).persist();
  const itemSaved = readFileSync(itemFile, "utf8");
  mkdirSync(itemFile + ".tmp");
  assert.throws(() => itemSale(1000401));
  assert.equal(JSON.stringify(itemGame), itemBefore, "Item credit/removal/allocator rollback together");
  assert.equal(readFileSync(itemFile, "utf8"), itemSaved);
  rmSync(itemFile + ".tmp", { recursive: true });
  const second = itemSale(1000401);
  assert.deepEqual(second.ret_data.item, [{ inst_id: 1, ref_id: SEARCH_CAPSULE_ID, added: 3 }]);
  assert.deepEqual(itemGame.items, [{ inst_id: 1, ref_id: SEARCH_CAPSULE_ID, qty: 6, lock: 1 }]);
  assert.equal(itemGame.next_item_inst_id, 2);
  const itemRestart = new ServerState("http://localhost", itemFile, { hunterSaleProfits: itemRows });
  assert.deepEqual(itemRestart.gameFor(itemRestart.accountFor(itemAuth, {})).items, itemGame.items);
  for (const rows of [[], [{ ...itemRows[0], profit_target: "UNRECOVERED_COIN" }], [{ ...itemRows[0], rank: rank === 5 ? 1 : 5 }]]) {
    const gated = new ServerState("http://localhost", undefined, { hunterSaleProfits: rows });
    const gatedAuth = gated.registerGuest({ device_id: "gated-sale-" + JSON.stringify(rows) }, {}).ret_data as any;
    const gatedGame = gated.gameFor(gated.accountFor(gatedAuth, {}));
    gatedGame.recruited_cards.push({ ...cardInstance(1000600, "002", 1), lock: 0 });
    gatedGame.next_card_inst_id = 1000601;
    const gatedBefore = JSON.stringify(gatedGame);
    assert.notEqual(gated.sellCards({ ...gatedAuth, inst_id_list: [1000600] }, {}).result_code, 1);
    assert.equal(JSON.stringify(gatedGame), gatedBefore, "Missing rank/item/opt-in refuses atomically");
  }

  process.env.BLUSTONE_CARD_SELL_PROFIT_JSON = JSON.stringify(itemRows);
  assert.deepEqual(new ServerState().cardSaleProfitReference(), itemRows);
  process.env.BLUSTONE_CARD_SELL_PROFIT_JSON = "{}";
  assert.throws(() => new ServerState(), TypeError);
  process.env.BLUSTONE_CARD_SELL_PROFIT_JSON = "bad JSON";
  assert.throws(() => new ServerState(), SyntaxError);
  delete process.env.BLUSTONE_CARD_SELL_PROFIT_JSON;
  assert.deepEqual(new ServerState().cardSaleProfitReference(), []);
  assert.throws(() => new ServerState("http://localhost", undefined, { hunterSaleProfits: null }), TypeError);
} finally {
  if (priorEnv === undefined) delete process.env.BLUSTONE_CARD_SELL_PROFIT_JSON;
  else process.env.BLUSTONE_CARD_SELL_PROFIT_JSON = priorEnv;
  rmSync(directory, { recursive: true, force: true });
}
console.log("Hunter sale state: explicit immutable price publication, authentication, commitments, native absolute gold/item deltas, replay refusal, preserved book/allocator, restart and atomic rollback passed; no original prices or live sale claimed.");
