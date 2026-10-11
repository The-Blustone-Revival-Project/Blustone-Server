import assert from "node:assert/strict";
import { equipmentLevelPrices, equipmentRankPrices, equipmentLevelPriceAt, equipmentRankPriceAt } from "../src/equipment-prices.js";

// Authored values and identities exercise schema admission; they are not
// configured/recovered Blustone prices or item records.
const knownItems = new Set(["AUTHORED_CRYSTAL"]);
const level = { level: 2, price_type: 0, price: 123, item1_qty: 2, item1_ref_id: "AUTHORED_CRYSTAL",
  item2_qty: 0, item2_ref_id: "", item3_qty: 0, item3_ref_id: "", item4_qty: 0, item4_ref_id: "" };
const envelope = { result_code: 1, ret_data: [level] };
const before = JSON.stringify(envelope);
const levels = equipmentLevelPrices(envelope, knownItems);
assert.deepEqual(levels, [level]);
assert.equal(equipmentLevelPriceAt(levels, 1), undefined, "Missing level is not a zero/generic-Gym price");
assert.deepEqual(equipmentLevelPriceAt(levels, 2), level);
assert.equal(JSON.stringify(envelope), before);
const rank = { rank: 2, attr: 1, price_type: 1, price: 456, item_qty: 3, item_ref_id: "AUTHORED_CRYSTAL", card_qty: 2 };
const ranks = equipmentRankPrices({ result_code: 1, ret_data: [rank, { ...rank, attr: 2, price: 789 }] }, knownItems);
assert.equal(equipmentRankPriceAt(ranks, 2, 1)?.price, 456);
assert.equal(equipmentRankPriceAt(ranks, 2, 2)?.price, 789);
assert.equal(equipmentRankPriceAt(ranks, 3, 1), undefined);
for (const bad of [undefined, {}, { result_code: 2001, ret_data: [level] }, { result_code: 1, ret_data: [] },
  { result_code: 1, ret_data: { list: [level] } }, [level]])
  assert.throws(() => equipmentLevelPrices(bad, knownItems), TypeError);
assert.throws(() => equipmentLevelPrices({ result_code: 1, ret_data: [level, { ...level, price_type: 1 }] }, knownItems), /Duplicate equipment level/);
assert.throws(() => equipmentRankPrices({ result_code: 1, ret_data: [rank, rank] }, knownItems), /Duplicate/);
for (const change of [{ price: "123" }, { price: -1 }, { price: true }, { price: 0x80000000 }, { level: 0 },
  { item1_qty: 1.5 }, { item1_ref_id: "UNKNOWN" }, { item1_ref_id: "" }, { item4_ref_id: null }])
  assert.throws(() => equipmentLevelPrices({ result_code: 1, ret_data: [{ ...level, ...change }] }, knownItems), TypeError);
for (const change of [{ rank: 0 }, { attr: -1 }, { card_qty: -1 }, { item_ref_id: "UNKNOWN" }, { price_type: null }])
  assert.throws(() => equipmentRankPrices({ result_code: 1, ret_data: [{ ...rank, ...change }] }, knownItems), TypeError);
assert.throws(() => equipmentLevelPrices(envelope, new Set()), /unknown/);
const wrongAlias: Record<string, unknown> = { ...level, source_1_ref_id: level.item1_ref_id };
delete wrongAlias.item1_ref_id;
assert.throws(() => equipmentLevelPrices({ result_code: 1, ret_data: [wrongAlias] }, knownItems), /item1_ref_id/);
assert.equal(JSON.stringify(envelope), before);
console.log("Equipment prices: independent native envelopes, exact four/single item slots, rank/attribute identity, no unknown-material fallback or empty-table admission passed; original rows remain absent.");
