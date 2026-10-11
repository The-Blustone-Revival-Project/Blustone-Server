import assert from "node:assert/strict";
import { nativeGuildSaleValue, noGuildEquipmentLevelFee } from "../src/equipment-fee.js";

// Authored arithmetic cases; no actual Guild benefit/price table supplied.
for (const price of [0, 1, 17, 16777217, 0xffff_ffff]) {
  assert.equal(nativeGuildSaleValue(price, null), price, "Null benefit preserves even non-f32-exact UInt32 values");
  assert.equal(noGuildEquipmentLevelFee({ price_type: 2, price }, 0), price);
}
assert.equal(nativeGuildSaleValue(101, { mode: 1, value: 950 }), 95);
assert.equal(nativeGuildSaleValue(101, { mode: 1, value: 500 }), 50);
assert.equal(nativeGuildSaleValue(100, { mode: 1, value: 0 }), 0);
assert.equal(nativeGuildSaleValue(16777217, { mode: 1, value: 1000 }), 16777216, "Native positive path rounds to binary32 before truncation");
assert.equal(nativeGuildSaleValue(0xffff_ffff, { mode: 1, value: 1000 }), 0xffff_ffff, "UInt conversion saturates a rounded2^32");
assert.equal(nativeGuildSaleValue(0xffff_ffff, { mode: 0, value: 2 }), 1, "Native additive path wraps uint32");
assert.equal(nativeGuildSaleValue(17, { mode: 255, value: 3 }), 20);
for (const guildId of [1, -1, NaN, Infinity]) assert.throws(() => noGuildEquipmentLevelFee({ price_type: 2, price: 17 }, guildId), TypeError);
for (const price_type of [0, 1, 3, 5]) assert.throws(() => noGuildEquipmentLevelFee({ price_type, price: 17 }, 0), TypeError);
for (const price of [-1, 2 ** 32, 0.5, NaN]) assert.throws(() => nativeGuildSaleValue(price, null), TypeError);
assert.throws(() => nativeGuildSaleValue(1, { mode: 256, value: 1 }), TypeError);
console.log("Equipment fee: no-Guild exact identity, popup price_type2 gold gate, binary32 per-thousand/truncation/saturation and additive wrap cases passed; no original prices or Guild benefits invented.");
