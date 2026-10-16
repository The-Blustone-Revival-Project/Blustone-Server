import assert from "node:assert/strict";
import { starterReference, starterStages } from "../src/bootstrap.js";
import { HUNTER_TRACE_ITEMS, HUNTER_TRACE_STAGE, itemReference } from "../src/hunter-traces.js";
import { fuelItemReference } from "../src/shop-fuel.js";
import { SEARCH_CAPSULE_ID } from "../src/search-capsules.js";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "source-reference" }, {}).ret_data as { otp: string };
const game = state.gameFor(state.accountFor(auth, {}));
const before = JSON.stringify(game);
const reference = gameResponse(state, "/reference/GetItem", {}).ret_data as ReturnType<typeof itemReference>;
assert.deepEqual(reference.global_item, fuelItemReference().global_item, "trace definitions cannot add shop offers");
assert.deepEqual(reference.item.slice(0, fuelItemReference().item.length), fuelItemReference().item, "existing resource definitions stay unchanged");
assert.equal(JSON.stringify(game), before, "reading trace references cannot grant items, stars or hunters");
const goldDisplay = reference.item.filter((row) => row.id === "RP1");
assert.equal(goldDisplay.length, 1, "native calendar gold preview must classify RP1 as an item, not a card");
assert.equal(goldDisplay[0].use_type, 0);
assert.equal(goldDisplay[0].effect, "", "display fixture cannot impersonate a redemption action");
assert.equal(reference.trace.some((row) => row.item_id === "RP1"), false, "no acquisition/grant link invented");
assert.equal(game.items.some((row) => row.ref_id === "RP1"), false, "currency stays in its wallet, not an item stack");
const veteranDisplay = reference.item.filter((row) => row.id === "VIP1");
assert.equal(veteranDisplay.length, 1, "captured native Veteran reward has one normal item-display lookup");
assert.equal(veteranDisplay[0].thumbnail_id, "ICON_VE", "use original resident glyph through the normal thumbnail field");
assert.equal(veteranDisplay[0].use_type, 0);
assert.equal(veteranDisplay[0].effect, "");
assert.equal(veteranDisplay[0].sell_price, 0);
assert.equal(veteranDisplay[0].collect_qty, 0);
assert.equal(reference.trace.some((row) => row.item_id === "VIP1"), false, "EXP display adds no acquisition or redemption link");
assert.equal(game.items.some((row) => row.ref_id === "VIP1"), false, "Veteran EXP stays in user state, never a synthetic stack");
veteranDisplay[0].thumbnail_id = "caller-only";
assert.equal(itemReference().item.find((row) => row.id === "VIP1")!.thumbnail_id, "ICON_VE", "callers cannot corrupt later display publication");
for (const item of HUNTER_TRACE_ITEMS) {
  const row = reference.item.find((row) => row.id === item.id)!;
  assert.equal(row.use_type, 3);
  assert.equal(row.effect, item.cardId, "PostProcess binds effect to hunter reference, not item ID");
  const card = starterReference.find((card) => card.base.id === item.cardId)!;
  assert.equal(Math.min(...card.stat.map((row) => row.rank)), item.rank, "native source whitelist groups minimum stat rank");
  assert.ok(card.skill.every((slot) => slot.effect.length === 0), "new hunter skills remain explicitly unreconstructed");
}
const stageExists = starterStages.stage.some((stage) => stage.id === HUNTER_TRACE_STAGE);
assert.equal(reference.trace.length, stageExists ? HUNTER_TRACE_ITEMS.length + 1 : 0);
assert.equal(reference.trace.filter((row) => row.item_id === SEARCH_CAPSULE_ID).length, stageExists ? 1 : 0,
  "capsule item details link to a verified earning stage without adding a shop offer");
for (const row of reference.trace) {
  assert.deepEqual(Object.keys(row).sort(), ["item_id", "order", "source_id", "thumb_id", "type"]);
  assert.equal(row.type, 3);
  assert.equal(row.source_id, HUNTER_TRACE_STAGE);
  assert.ok(reference.item.some((item) => item.id === row.item_id));
  assert.equal(row.thumb_id, "", "empty native trace thumbnail is a guarded path");
}
assert.ok(!reference.trace.some((row) => row.source_id === "n_01_08"), "source navigation cannot fake a first-clear prerequisite");
console.log("Hunter trace references: native binding, source-rank groups, campaign links and no grants passed; UI unverified.");
