import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ARENA_HONOR_COUNTER_RESOURCE, ARENA_HONOR_DISPLAY_REFERENCE, ARENA_HONOR_ID } from "../src/arena-honor-reference.js";
import { itemReference } from "../src/hunter-traces.js";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

// Compare the proposed local display choice with separately recovered original
// image graph evidence. An item identity is not automatically a resource name.
const evidence = JSON.parse(readFileSync(new URL("../docs/arena-honor-art-2026-10-11.json", import.meta.url), "utf8"));
assert.equal(ARENA_HONOR_ID, "FC1");
assert.equal(evidence.ui.button, "BT_MY_CHIP");
assert.equal(evidence.ui.child_resource, ARENA_HONOR_COUNTER_RESOURCE);
assert.equal(evidence.package, "UI_ITEM.jet");
assert.equal(evidence.sha256, "4b4350559330947254764f795902b2f66ea48826290316b9eb2bd295bd446eda");
assert.equal(evidence.exact_eof, true);
const selected = evidence.art.find((row: { resource: string }) => row.resource === ARENA_HONOR_DISPLAY_REFERENCE.thumbnail_id);
assert.ok(selected, "local full-size choice must exist in the original recovered family");
assert.equal(selected.width, 150);
assert.equal(selected.height, 150);
assert.equal(selected.pixel_format, 4);
assert.ok(selected.positive_alpha_pixels > 0);
assert.ok(evidence.art.some((row: { resource: string; positive_alpha_pixels: number }) =>
  row.resource === ARENA_HONOR_COUNTER_RESOURCE && row.positive_alpha_pixels > 0));
assert.notEqual(ARENA_HONOR_DISPLAY_REFERENCE.thumbnail_id, ARENA_HONOR_ID);
assert.equal(ARENA_HONOR_DISPLAY_REFERENCE.use_type, 0);
assert.equal(ARENA_HONOR_DISPLAY_REFERENCE.effect, "");
assert.equal(ARENA_HONOR_DISPLAY_REFERENCE.sell_price, 0);
assert.equal(ARENA_HONOR_DISPLAY_REFERENCE.collect_qty, 0);
assert.equal(Object.isFrozen(ARENA_HONOR_DISPLAY_REFERENCE), true);
assert.equal("qty" in ARENA_HONOR_DISPLAY_REFERENCE, false, "display reference is not an inventory receipt");
const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "honor-display-only" }, {}).ret_data as { otp: string };
const game = state.gameFor(state.accountFor(auth, {}));
const before = JSON.stringify(game);
const reference = (gameResponse(state, "/reference/GetItem", auth) as any).ret_data;
assert.deepEqual(reference.item.filter((row: any) => row.id === ARENA_HONOR_ID), [ARENA_HONOR_DISPLAY_REFERENCE]);
assert.equal(reference.trace.some((row: any) => row.item_id === ARENA_HONOR_ID), false);
assert.equal(reference.global_item.some((row: any) => row.item_id === ARENA_HONOR_ID || row.id === ARENA_HONOR_ID), false);
assert.equal(JSON.stringify(game), before, "display publication does not credit honor or an inventory stack");
reference.item.find((row: any) => row.id === ARENA_HONOR_ID).thumbnail_id = "TEST_ONLY_MUTATION";
assert.equal(itemReference().item.find(row => row.id === ARENA_HONOR_ID)!.thumbnail_id, "IT_BT");
console.log("Arena honor display: recovered FC1/header crosswalk and original nonempty 150x150 IT_BT family candidate passed; thumbnail assignment is local policy, native display remains pending.");
