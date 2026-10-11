import assert from "node:assert/strict";
import { guildActionPrices, guildCreationPrice } from "../src/guild-prices.js";

// Authored numbers test DTOs, not original Guild economics.
const envelope = { result_code: 1, ret_data: [
  { action: 1, price_type: 2, price: 777 }, { action: 2, price_type: 2, price: 111 },
] };
const before = JSON.stringify(envelope);
const rows = guildActionPrices(envelope);
assert.deepEqual(rows, envelope.ret_data);
assert.deepEqual(guildCreationPrice(rows), { action: 1, price_type: 2, price: 777,
  client_gold_gate: 777, settlement_wallet: "unrecovered" });
assert.equal(guildCreationPrice(guildActionPrices({ result_code: 1, ret_data: [] })), undefined,
  "Missing original action1 row must not become free Guild creation");
assert.equal(guildCreationPrice(rows.slice(1)), undefined);
for (const bad of [null, [], { result_code: 2001, ret_data: envelope.ret_data }, { result_code: 1, ret_data: { list: rows } },
  { result_code: 1, ret_data: [rows[0], rows[0]] }, { result_code: 1, ret_data: [{ ...rows[0], price: "777" }] },
  { result_code: 1, ret_data: [{ ...rows[0], price: -1 }] }, { result_code: 1, ret_data: [{ ...rows[0], price_type: true }] },
  { result_code: 1, ret_data: [{ ...rows[0], action: 0x80000000 }] }])
  assert.throws(() => guildActionPrices(bad), TypeError);
assert.equal(JSON.stringify(envelope), before);
console.log("Guild prices: selected native rows/action keys, exact creation-action1 client gold gate, duplicate/unsafe payload refusal and no missing-row free creation passed; original economics absent.");
