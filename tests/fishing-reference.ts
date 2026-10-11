import assert from "node:assert/strict";
import { FISHING_BAIT_ITEM_IDS, FISHING_HIGH_QUALITY_BAIT_DISPLAY, fishingBaitItemId, fishingInventoryReplacement } from "../src/fishing-reference.js";

assert.deepEqual(FISHING_BAIT_ITEM_IDS, { 0: "LU001", 1: "LU003" });
assert.equal(fishingBaitItemId(0), "LU001");
assert.equal(fishingBaitItemId(1), "LU003");
assert.equal(FISHING_HIGH_QUALITY_BAIT_DISPLAY.item_id, fishingBaitItemId(FISHING_HIGH_QUALITY_BAIT_DISPLAY.selector));
assert.equal(FISHING_HIGH_QUALITY_BAIT_DISPLAY.lure_id, "LU003");
assert.equal("thumbnail_id" in FISHING_HIGH_QUALITY_BAIT_DISPLAY, false, "main badge does not invent item metadata");
assert.equal("price" in FISHING_HIGH_QUALITY_BAIT_DISPLAY, false);
for (const invalid of [-1, 2, NaN, Infinity, "0", null]) {
  assert.throws(() => fishingBaitItemId(invalid as 0), /Unsupported fishing lure/);
}
// This sentinel is test-only, not a recovered item or an enabled catch pool.
const counts = { b_cnt: 3, s_cnt: 2, g_cnt: 1 };
const row = fishingInventoryReplacement("TEST_ONLY_FISH", counts);
assert.deepEqual(row, { fish_id: "TEST_ONLY_FISH", b_cnt: 3, s_cnt: 2, g_cnt: 1 });
assert.equal(Array.isArray(row), false, "sell_result is one replacement object, not item[]");
assert.deepEqual(fishingInventoryReplacement("TEST_ONLY_FISH", counts), row, "retry serialization preserves absolute counts");
assert.deepEqual(counts, { b_cnt: 3, s_cnt: 2, g_cnt: 1 }, "serialization does not spend fish");
assert.deepEqual(fishingInventoryReplacement("TEST_ONLY_FISH", { b_cnt: 0, s_cnt: 0, g_cnt: 0 }),
  { fish_id: "TEST_ONLY_FISH", b_cnt: 0, s_cnt: 0, g_cnt: 0 });
assert.doesNotThrow(() => fishingInventoryReplacement("TEST_ONLY_FISH", { b_cnt: 0x7fffffff, s_cnt: 0x7fffffff, g_cnt: 0xffffffff }));
for (const key of ["b_cnt", "s_cnt", "g_cnt"] as const) {
  for (const invalid of [-1, 0.5, NaN, Infinity, "1", null, 0x100000000]) {
    assert.throws(() => fishingInventoryReplacement("TEST_ONLY_FISH", { ...counts, [key]: invalid } as typeof counts), /Invalid fishing inventory/);
  }
}
for (const key of ["b_cnt", "s_cnt"] as const) {
  assert.throws(() => fishingInventoryReplacement("TEST_ONLY_FISH", { ...counts, [key]: 0x80000000 }), /Invalid fishing inventory/);
}
assert.throws(() => fishingInventoryReplacement("", counts), /fish identity/);
assert.throws(() => fishingInventoryReplacement(123 as unknown as string, counts), /fish identity/);
console.log("Fishing reference: original LU001/LU003 selector and absolute sell_result widths/replay serialization passed; no catalog or settlement enabled.");
