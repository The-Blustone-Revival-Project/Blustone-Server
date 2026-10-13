import assert from "node:assert/strict";
import { GEM_STAT_KEYS } from "../src/gem-combinations.js";
import { parseGemInstances, parseGemReferences } from "../src/gem-instances.js";
import { parseGemPolishOutcome } from "../src/gem-polish-outcome.js";
import { parseStateWithGemIds } from "../src/gem-wire.js";

// Authored contract probes only; these are not original polish rolls or grants.
const refs = parseGemReferences({ result_code: 1, ret_data: [{ id: "AUTHORED_GEM", name: "", desc: "",
  res_id: "AUTHORED_ART", set_effect_id: 3, rank: 1, target: 2 }] });
const stat = { rank: 0, awk_step: 0, ...Object.fromEntries(GEM_STAT_KEYS.map(key => [key, "100"])) };
const hunters = new Set(["1000001"]);
const before = { ref_id: "AUTHORED_GEM", inst_id: "18446744073709551615", rank: 1, level: 2,
  position: 1, target_inst_id: "1000001", ability: "authored", abilities: { level_up_failed: 1, main: stat, sub: [stat] } };
const owned = parseGemInstances({ result_code: 1, ret_data: [before] }, refs, hunters)[0];
const receipt = { result_code: 1, ret_data: { tries: 3, gem: { ...before,
  abilities: { ...before.abilities, level_up_failed: 4 } } } };
const snapshot = JSON.stringify(receipt), ownedSnapshot = JSON.stringify(owned);
const failed = parseGemPolishOutcome(receipt, 10, owned, refs, hunters);
assert.deepEqual(failed.animation, { priorFailures: 2, final: "failure" });
assert.equal(failed.gem.level, 2); // Accepted result1 alone is not success.
assert.equal(failed.gem.inst_id, "18446744073709551615");
const successful = { result_code: 1, ret_data: { tries: 7, gem: { ...before, level: 3,
  abilities: { level_up_failed: 0, main: { ...stat, hp: "345" }, sub: [] } } } };
const decoded = parseGemPolishOutcome(successful, 10, owned, refs, hunters);
assert.deepEqual(decoded.animation, { priorFailures: 6, final: "success" });
assert.equal(decoded.gem.abilities?.main.stats.hp, 3.45);
assert.deepEqual(decoded.gem.abilities?.sub, []); // Preserve supplied rolls, never copy old rolls.
const exactNumeric = parseStateWithGemIds(JSON.stringify(receipt).replace('"18446744073709551615"', "18446744073709551615"));
assert.equal(parseGemPolishOutcome(exactNumeric, 10, owned, refs, hunters).gem.inst_id, before.inst_id);
for (const tries of [0, -1, 1.5, 11, 0x8000_0000, "3"])
  assert.throws(() => parseGemPolishOutcome({ ...receipt, ret_data: { ...receipt.ret_data, tries } }, 10, owned, refs, hunters));
for (const maximum of [0, -1, 1.5, 0x8000_0000])
  assert.throws(() => parseGemPolishOutcome(receipt, maximum, owned, refs, hunters));
for (const patch of [{ inst_id: "9007199254740993" }, { ref_id: "MISSING" }, { rank: 2 },
  { target_inst_id: "0" }, { position: 2 }, { abilities: null }, { abilities: { ...before.abilities, level_up_failed: -1 } }])
  assert.throws(() => parseGemPolishOutcome({ ...receipt, ret_data: { tries: 1, gem: { ...before, ...patch } } }, 10, owned, refs, hunters));
assert.throws(() => parseGemPolishOutcome({ ...receipt, result_code: 2001 }, 10, owned, refs, hunters));
assert.throws(() => parseGemPolishOutcome({ result_code: 1, ret_data: { tries: 1, gem: { inst_id: before.inst_id, level: 3 } } }, 10, owned, refs, hunters));
failed.gem.abilities!.main.stats.hp = 999;
assert.equal(JSON.stringify(receipt), snapshot);
assert.equal(JSON.stringify(owned), ownedSnapshot);
console.log("Gem polish outcome: accepted failures, batched final animation, full supplied stats, exact64 identity and malformed/partial bounds passed; no settlement or generated outcomes.");
