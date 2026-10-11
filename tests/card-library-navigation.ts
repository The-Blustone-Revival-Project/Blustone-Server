import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { repositoryPath } from "../src/paths.js";

const profile = JSON.parse(fs.readFileSync(repositoryPath("config/profiles/current-e6.json"), "utf8"));
function inspect(value: string) {
  const child = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "--eval", `
    import {starterReference,starterInventory,recruitBirthRanks} from './src/bootstrap.ts';
    import {itemReference,HUNTER_TRACE_ITEMS,libraryNavigationTraceItems} from './src/hunter-traces.ts';
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,birth:recruitBirthRanks,
      reference:itemReference(),existing:HUNTER_TRACE_ITEMS,navigation:libraryNavigationTraceItems()}));`],
    { cwd: repositoryPath(), encoding: "utf8", timeout: 20_000,
      env: { ...process.env, ...profile.env, BLUSTONE_GACHA_CARD: "002", BLUSTONE_PARTY_SIZE: "1",
        BLUSTONE_CARD_REFERENCE_PROFILE: value } });
  assert.equal(child.status, 0, child.stderr);
  return JSON.parse(child.stdout);
}
const original = inspect("starter");
const expanded = inspect("materials");
assert.equal(original.navigation.length, 0, "default legacy profile has no added navigation metadata");
assert.equal(expanded.navigation.length, 12, "14 published Hunters minus2 prior trace bindings");
assert.deepEqual(expanded.existing, original.existing, "existing005/006 IDs, thresholds and reward semantics unchanged");
assert.deepEqual(expanded.reference.item.slice(0, original.reference.item.length), original.reference.item,
  "all prior item references remain unchanged and in the same order");
assert.deepEqual(expanded.reference.trace, original.reference.trace,
  "no new acquisition sources, drops, stage links or capsule links");
assert.deepEqual(expanded.reference.global_item, original.reference.global_item, "no new shop offer");
assert.deepEqual(expanded.inventory, original.inventory, "no owned Hunter grant");
assert.deepEqual(expanded.birth, original.birth, "no recruitment change");
assert.equal(new Set(expanded.reference.item.map((item: any) => item.id)).size, expanded.reference.item.length);
for (const card of expanded.refs) {
  const bindings = expanded.reference.item.filter((item: any) => item.use_type === 3 && item.effect === card.base.id);
  assert.equal(bindings.length, 1, "one item PostProcess binding per exact Hunter reference");
  assert.ok(bindings[0].collect_qty > 0, "native Library collect_qty filter admits each published Hunter");
}
for (const role of [1, 2, 3, 4]) {
  const browsable = expanded.refs.filter((card: any) => card.base.role === role && card.base.is_source === 0 &&
    expanded.reference.item.some((item: any) => item.use_type === 3 && item.effect === card.base.id && item.collect_qty > 0));
  assert.ok(browsable.length > 0, `native Library role${role} cannot have an empty catalogue`);
}
for (const item of expanded.navigation) {
  assert.equal(item.collect_qty, 1, "minimal positive gate is explicit local navigation policy");
  assert.equal(item.thumbnail_id, "");
  assert.equal(item.sell_price, 0);
  assert.ok(!expanded.existing.some((existing: any) => existing.id === item.id), "exchange whitelist stays independent");
  assert.ok(!expanded.reference.trace.some((trace: any) => trace.item_id === item.id), "no acquisition link");
}
console.log("Library navigation:14 positive item bindings/four role lists; legacy items, exchange whitelist, acquisition links, inventory and recruitment preserved.");
