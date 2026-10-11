import assert from "node:assert/strict";
import { equipmentLocale, equipmentTextField, nativeEquipmentTextQuery, originalEquipmentText } from "../src/equipment-localization.js";

assert.deepEqual([0, 1, 2].map((type) => [equipmentTextField(type, "name"), equipmentTextField(type, "description")]),
  [["WEAPON", "WEAPON_DESC"], ["ARMOR", "ARMOR_DESC"], ["ACCESSORY", "ACCE_DESC"]]);
assert.equal(nativeEquipmentTextQuery(0, 0, "name"), "|WEAPON");
assert.equal(nativeEquipmentTextQuery(1, 2, "description"), "_1|ACCE_DESC");
assert.equal(nativeEquipmentTextQuery(0xffff_ffff, 1, "name"), "_4294967295|ARMOR");
assert.deepEqual([0, 1, 2, 3, 4].map(equipmentLocale), ["KO", "EN", "JA", "SC", "TC"]);
// Small independently authored source-shape fixture: no original text import
// or live catalog integration is hidden in these pure helpers.
const table = { "001|WEAPON": { EN: "fixture rifle", KO: "fixture-ko" }, "001|ACCE_DESC": { EN: "literal\\nline" } };
assert.equal(originalEquipmentText(table, "001", 0, "name", "EN"), "fixture rifle");
assert.equal(originalEquipmentText(table, "001", 2, "description", "EN"), "literal\\nline");
assert.equal(originalEquipmentText(table, "001", 1, "name", "EN"), undefined);
assert.equal(originalEquipmentText(table, "002", 0, "name", "EN"), undefined);
assert.equal(originalEquipmentText(table, "001", 0, "name", "JA"), undefined, "No guessed locale fallback");
assert.equal((table as Record<string, unknown>)[nativeEquipmentTextQuery(0, 0, "name")], undefined,
  "Native query must not be silently rewritten to a Hunter-prefixed source key");
for (const type of [-1, 3, 0.5, NaN]) assert.throws(() => equipmentTextField(type, "name"), TypeError);
for (const selector of [-1, 2 ** 32, 0.5, NaN]) assert.throws(() => nativeEquipmentTextQuery(selector, 0, "name"), TypeError);
for (const language of [-1, 5, 0.5]) assert.throws(() => equipmentLocale(language), TypeError);
assert.throws(() => originalEquipmentText(table, "C001", 0, "name", "EN"), TypeError);
assert.throws(() => originalEquipmentText(table, "001", 0, "name", "XX" as any), TypeError);
assert.throws(() => equipmentTextField(0, "DESC" as any), TypeError);
console.log("Equipment localization: original TYPE strings and locale indices, exact unsigned Awake query, separate source-key lookup, absent-data behavior and invalid enum guards passed; native Hunter-prefix join remains unproved.");
