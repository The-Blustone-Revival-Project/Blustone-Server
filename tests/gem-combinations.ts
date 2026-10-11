import assert from "node:assert/strict";
import { GEM_STAT_KEYS, gemFamilyName, parseGemCombinations, calculateGemSets } from "../src/gem-combinations.js";
// Authored wire rows test parser arithmetic; these are NOT recovered balances.
const row = { id: 3, count: 2, rank: 0, awk_step: 0,
  ...Object.fromEntries(GEM_STAT_KEYS.map((key) => [key, "100"])) };
const envelope = { result_code: 1, ret_data: [row] };
const before = JSON.stringify(envelope);
const refs = parseGemCombinations(envelope);
for (const key of ["hp", "atk", "def", "crt_dmg", "block_dec_dmg", "attr_enhance", "attr_resist", "hp_regen"] as const)
  assert.equal(refs[0].stats[key], 1, key);
for (const key of ["spd", "crt_chance", "penetration", "block_chance", "hp_up", "atk_up", "def_up"] as const)
  assert.equal(refs[0].stats[key], 100, key);
assert.equal(gemFamilyName(3), "DEF"); assert.equal(gemFamilyName(10), "speed");
assert.equal(gemFamilyName(0), undefined); assert.equal(gemFamilyName(13), undefined);
assert.deepEqual(calculateGemSets([3], refs).applied, []);
const totals = calculateGemSets([3, 3, 3, 3, 3, 999], refs);
assert.deepEqual(totals.applied, [{ id: 3, sets: 2 }]);
assert.equal(totals.stats.def, 2); assert.equal(totals.stats.spd, 200);
assert.deepEqual(calculateGemSets([], refs).applied, []);
assert.equal(JSON.stringify(envelope), before);
for (const patch of [{ count: 0 }, { count: 1.5 }, { id: -1 }, { def: 100 }, { hp: "NaN" }, { spd: "Infinity" }, { atk: "" }])
  assert.throws(() => parseGemCombinations({ result_code: 1, ret_data: [{ ...row, ...patch }] }), TypeError);
assert.throws(() => parseGemCombinations({ result_code: 1, ret_data: [row, row] }), /Duplicate/);
assert.throws(() => parseGemCombinations({ result_code: 1, ret_data: [] }), TypeError);
assert.throws(() => calculateGemSets([3], [{ ...refs[0], count: 0 }]), TypeError);
assert.throws(() => calculateGemSets([3.5], refs), TypeError);
assert.throws(() => calculateGemSets([3], [refs[0], refs[0]]), /Duplicate/);
console.log("Gem native combinations: stat units, family selectors, repeated complete sets, missing references and strict admission passed; no balances or instances configured.");
