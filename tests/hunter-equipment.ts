import assert from "node:assert/strict";
import { GEM_STAT_KEYS } from "../src/gem-combinations.js";
import { parseHunterEquipment, calculateHunterEquipment } from "../src/hunter-equipment.js";
// Authored references, not recovered/equipped original items.
const row = { id: "AUTHORED_WEAPON", type: 1, rank: 1, awk_step: 0,
  ...Object.fromEntries(GEM_STAT_KEYS.map(key => [key, "100"])), hp: "1000", hp_up: "200", atk_up: "300", def_up: "400" };
const wire = [row, { ...row, id: "AUTHORED_RANK2", rank: 2 }, { ...row, id: "AUTHORED_ARMOR", type: 2 }];
const before = JSON.stringify(wire), refs = parseHunterEquipment(wire);
assert.equal(refs[0].slot, 0);
for (const field of ["spd", "crt_chance", "penetration", "block_chance"] as const) assert.equal(refs[0].stats[field], 100);
for (const field of ["crt_dmg", "block_dec_dmg", "attr_enhance", "attr_resist", "hp_regen"] as const) assert.equal(refs[0].stats[field], 1);
assert.equal(calculateHunterEquipment(refs, 0, 1, 1).stats.hp, 10);
assert.equal(calculateHunterEquipment(refs, 0, 1, 10).growthSteps, 9);
assert.equal(calculateHunterEquipment(refs, 0, 1, 11).growthSteps, 10, "Exact adjusted rank*10 override");
assert.equal(calculateHunterEquipment(refs, 0, 2, 10).growthSteps, 0);
assert.equal(calculateHunterEquipment(refs, 0, 2, 11).growthSteps, 1);
const cap = calculateHunterEquipment(refs, 0, 2, 20);
assert.equal(cap.growthSteps, 10); assert.equal(cap.stats.hp, 30); assert.equal(cap.stats.atk, 31); assert.equal(cap.stats.def, 41);
assert.equal(cap.stats.spd, 100, "Only HP/ATK/DEF grow");
assert.equal(calculateHunterEquipment(refs, 1, 1, 1).id, "AUTHORED_ARMOR");
assert.throws(() => calculateHunterEquipment(refs, 2, 1, 1), /Missing original/);
assert.throws(() => calculateHunterEquipment(refs, 0, 3, 1), /Missing original/);
assert.throws(() => calculateHunterEquipment(refs, 0, 1, 0), TypeError);
assert.throws(() => calculateHunterEquipment([...refs, refs[0]], 0, 1, 1), /Duplicate/);
for (const patch of [{ id: "" }, { type: 0 }, { type: 4 }, { rank: 0 }, { atk: 100 }, { hp: "NaN" }, { hp_up: "" }])
  assert.throws(() => parseHunterEquipment([{ ...row, ...patch }]), TypeError);
assert.throws(() => parseHunterEquipment([row, row]), /Duplicate/);
assert.equal(JSON.stringify(wire), before);
console.log("Hunter equipment pure contracts: mode100 normalization, exact slot/rank, first-rank offset, ten-level boundaries and missing-data refusal passed; no original rows configured.");
