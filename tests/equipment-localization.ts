import assert from "node:assert/strict";
import { equipmentLocale, equipmentTextField, nativeEquipmentTextQuery, originalEquipmentText } from "../src/equipment-localization.js";

assert.deepEqual([0, 1, 2].map((type) => [equipmentTextField(type, "name"), equipmentTextField(type, "description")]),
  [["WEAPON", "WEAPON_DESC"], ["ARMOR", "ARMOR_DESC"], ["ACCESSORY", "ACCE_DESC"]]);
assert.equal(nativeEquipmentTextQuery("001", 0, 0, "name"), "001|WEAPON");
assert.equal(nativeEquipmentTextQuery("004", 1, 2, "description"), "004_1|ACCE_DESC");
assert.equal(nativeEquipmentTextQuery("004", 0xffff_ffff, 1, "name"), "004_4294967295|ARMOR");
assert.deepEqual([0, 1, 2, 3, 4].map(equipmentLocale), ["KO", "EN", "JA", "SC", "TC"]);
// Small independently authored source-shape fixture: no original text import
// or live catalog integration is hidden in these pure helpers.
const table = { "001|WEAPON": { EN: "fixture rifle", KO: "fixture-ko" }, "001|ACCE_DESC": { EN: "literal\\nline" },
  "004_1|WEAPON": { EN: "fixture awake weapon" } };
assert.equal(originalEquipmentText(table, "001", 0, "name", "EN"), "fixture rifle");
assert.equal(originalEquipmentText(table, "001", 2, "description", "EN"), "literal\\nline");
assert.equal(originalEquipmentText(table, "001", 1, "name", "EN"), undefined);
assert.equal(originalEquipmentText(table, "002", 0, "name", "EN"), undefined);
assert.equal(originalEquipmentText(table, "001", 0, "name", "JA"), undefined, "No guessed locale fallback");
assert.equal(originalEquipmentText(table, "004", 0, "name", "EN", 1), "fixture awake weapon");
assert.equal(originalEquipmentText(table, "004", 0, "name", "EN", 0), undefined, "Awake text is not a default-text substitution");
for (const type of [-1, 3, 0.5, NaN]) assert.throws(() => equipmentTextField(type, "name"), TypeError);
for (const selector of [-1, 2 ** 32, 0.5, NaN]) assert.throws(() => nativeEquipmentTextQuery("001", selector, 0, "name"), TypeError);
for (const language of [-1, 5, 0.5]) assert.throws(() => equipmentLocale(language), TypeError);
assert.equal(originalEquipmentText(table, "C001", 0, "name", "EN"), undefined, "No resource-prefix-to-Hunter-ID rewrite");
assert.throws(() => originalEquipmentText(table, "001|WEAPON", 0, "name", "EN"), TypeError);
assert.throws(() => originalEquipmentText(table, "001", 0, "name", "XX" as any), TypeError);
assert.throws(() => equipmentTextField(0, "DESC" as any), TypeError);
console.log("Equipment localization: original TYPE strings/locale indices, exact Hunter-ID copy plus unsigned Awake query, source lookup, absent-data behavior and invalid enum guards passed; no equipment references/grants enabled.");
