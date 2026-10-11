import assert from "node:assert/strict";
import { ServerState } from "../src/state.js";
import { gameResponse } from "../src/game-routes.js";
import { cardSellProfitRows, planHunterSale } from "../src/hunter-sale.js";
import { cardInstance } from "../src/bootstrap.js";
import type { LocalCardInstance } from "../src/game.js";

// Authored economic fixtures verify contracts only: none of these quantities or
// AUTHORED_COIN identity is a claim about original Blustone profit rows.
const cards = [
  { ...cardInstance(1000100, "002", 5), lock: 0 },
  { ...cardInstance(1000101, "002", 1), lock: 0 },
  { ...cardInstance(1000102, "004", 1), lock: 0 },
] as LocalCardInstance[];
const profits = cardSellProfitRows([
  { rank: 1, profit_type: 2, profit_target: "", profit_qty: 10 },
  { rank: 2, profit_type: 5, profit_target: "AUTHORED_COIN", profit_qty: 3 },
]);
const context = { gold: 100, items: [{ inst_id: 7, ref_id: "AUTHORED_COIN", qty: 2, lock: 1 }], nextItemId: 8,
  protectedIds: new Set<number>(), profits,
  referenceMinRank: (id: string) => id === "002" ? 1 : 2,
  knownItemIds: new Set(["AUTHORED_COIN"]) };
const before = JSON.stringify({ cards, context });
const result = planHunterSale(cards, { inst_id_list: "[1000100,1000101,1000102]" }, context);
assert.ok(!("error" in result));
assert.equal(result.gold, 120, "Profit selects reference minimum, not owned rank5 or GetLevel sell_price");
assert.deepEqual(result.removedIds, [1000100, 1000101, 1000102]);
assert.deepEqual(result.data, { user: { gold: { cur: 120 } }, item: [
  { inst_id: 7, ref_id: "AUTHORED_COIN", added: 3 },
] });
assert.deepEqual(result.items, [{ inst_id: 7, ref_id: "AUTHORED_COIN", qty: 5, lock: 1 }]);
assert.equal(result.nextItemId, 8);
assert.equal(JSON.stringify({ cards, context }), before, "Planning does not remove hunters or credit rewards in place");
const fresh = planHunterSale(cards, { inst_id_list: [1000102] }, { ...context, items: [], nextItemId: 9 });
assert.ok(!("error" in fresh));
assert.deepEqual(fresh.data.item, [{ inst_id: 9, ref_id: "AUTHORED_COIN", added: 3 }]);
assert.equal(fresh.nextItemId, 10);
const selected = { inst_id_list: [1000100, 1000102] };
assert.ok("error" in planHunterSale(cards, selected, { ...context, profits: [] }), "Missing data never means zero-reward disposal");
assert.ok("error" in planHunterSale(cards, selected, { ...context, knownItemIds: new Set() }), "Unknown reward refuses the whole mixed sale");
assert.ok("error" in planHunterSale(cards, selected, { ...context, protectedIds: new Set([1000102]) }));
assert.ok("error" in planHunterSale(cards.map((card, index) => index === 2 ? { ...card, lock: 1 } : card), selected, context));
assert.ok("error" in planHunterSale(cards.map((card, index) => index === 2 ? { ...card, mirage_remain_hp: 0 } : card), selected, context));
assert.ok("error" in planHunterSale(cards, selected, { ...context, gold: 0xffff_ffff }));
assert.ok("error" in planHunterSale(cards, selected, { ...context, items: [{ ...context.items[0], qty: 0xffff_ffff }] }));
assert.ok("error" in planHunterSale(cards, selected, { ...context, nextItemId: 7 }));
for (const list of [[], [1000100, 1000100], [1000100, 99999], "1000100,1000102", ["1000100"], [true], [1.5]])
  assert.ok("error" in planHunterSale(cards, { inst_id_list: list }, context));
for (const bad of [null, {}, [profits[0], profits[0]], [{ ...profits[0], profit_qty: -1 }],
  [{ ...profits[0], profit_type: 9 }], [{ ...profits[1], profit_target: "" }]])
  assert.throws(() => cardSellProfitRows(bad), TypeError);
assert.equal(JSON.stringify({ cards, context }), before);
const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "sale-refusal-only" }, {}).ret_data as any;
const game = state.gameFor(state.accountFor(auth, {}));
const beforeRefusal = JSON.stringify(game);
assert.throws(() => gameResponse(state, "/shop/SellCard", { inst_id_list: "[1000001]" }), /authenticated account required/);
const refused = gameResponse(state, "/shop/SellCard", { ...auth, inst_id_list: JSON.stringify([game.starter_cards[0].inst_id]) }) as any;
assert.equal(refused.result_code, 2001, "missing profit data must not return mock success that deletes native request targets");
assert.equal(JSON.stringify(game), beforeRefusal, "no source, wallet, book or inventory mutation on missing-data refusal");
console.log("Hunter sale: native min-rank profit grammar, evidence-gated rewards, explicit source IDs, atomic pure planning and overflow/protection refusals passed; no original profit data enabled.");
