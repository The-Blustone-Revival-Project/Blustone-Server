import assert from "node:assert/strict";
import { ServerState } from "./legacy-state-fixture.js";
import { GACHA_COST, GACHA_SINGLE_COST } from "../src/game.js";

const state = new ServerState("http://localhost");
const guest = state.registerGuest({ device_id: "recruit-pricing" }, {}).ret_data as { otp: string };
const auth = { otp: guest.otp };
const game = state.gameFor(state.accountFor(auth, {}));
assert.equal(GACHA_SINGLE_COST, 30);
assert.equal(GACHA_COST, 300);
for (const [cnt, paid, free, expectedPaid, expectedFree] of [
  [1, 0, 30, 0, 0], [1, 30, 0, 0, 0], [1, 20, 10, 0, 0],
  [1, 100, 50, 100, 20], [11, 250, 50, 0, 0],
] as const) {
  game.gacha_iap_qty = paid; game.gacha_free_qty = free;
  const result = state.gachaPremium({ ...auth, cnt }, {}).ret_data as { cnt: number; card: any };
  assert.equal(result.cnt, cnt, "either currency or their combined sum can pay native price");
  assert.deepEqual([game.gacha_iap_qty, game.gacha_free_qty], [expectedPaid, expectedFree]);
  assert.equal(paid + free - game.gacha_iap_qty - game.gacha_free_qty, cnt === 1 ? 30 : 300,
    "deduct total price once, not from both pools");
  assert.equal(Array.isArray(result.card), cnt > 1);
  if (cnt === 11) assert.ok(result.card.some((card: { rank: number }) => card.rank >= 3),
    "native10+1 offer guarantees at least one three-star hunter");
}
game.gacha_iap_qty = 100; game.gacha_free_qty = 100;
for (const item_inst_id of [1, "1", -1, "invalid", "", "   ", false, [], [0], {}, null, "0.0"]) {
  const snapshot = () => JSON.stringify({ paid: game.gacha_iap_qty, free: game.gacha_free_qty,
    items: game.items, cards: game.recruited_cards, book: game.card_book,
    nextCard: game.next_card_inst_id, nextItem: game.next_item_inst_id });
  const before = snapshot();
  const result = state.gachaPremium({ ...auth, cnt: 1, item_inst_id }, {}).ret_data as any;
  assert.equal(result.cnt, 0); assert.equal(result.card, null);
  assert.equal(result.error_code, "GACHA_COUPON_UNRECONSTRUCTED");
  assert.equal(snapshot(), before, "unsupported coupon cannot debit Manda, consume items or grant hunters");
}
for (const item_inst_id of [0, "0"]) {
  game.gacha_free_qty = 100;
  const result = state.gachaPremium({ ...auth, cnt: 1, item_inst_id }, {}).ret_data as any;
  assert.equal(result.cnt, 1, "documented zero ticket forms retain paid recruitment");
  assert.equal(game.gacha_free_qty, 70);
}
game.gacha_iap_qty = 10; game.gacha_free_qty = 19;
const cards = JSON.stringify(game.recruited_cards);
for (const cnt of [1, 11, 2, 0, -1, 12, 1.5]) {
  const result = state.gachaPremium({ ...auth, cnt }, {}).ret_data as { cnt: number; card: unknown };
  assert.equal(result.cnt, 0);
  assert.equal(result.card, null);
  assert.deepEqual([game.gacha_iap_qty, game.gacha_free_qty], [10, 19]);
  assert.equal(JSON.stringify(game.recruited_cards), cards);
}
console.log("Recruit pricing: native30/300 units, combined wallet, free-first policy and atomic refusal passed.");
