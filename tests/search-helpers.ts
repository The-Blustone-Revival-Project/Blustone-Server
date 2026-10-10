import assert from "node:assert/strict";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { searchHelperReference, searchUsedHelpers, SEARCH_HELPER_SERIAL } from "../src/search-helpers.js";
import { starterReference } from "../src/bootstrap.js";

const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "helper-reference" }, {}).ret_data as { otp: string };
const game = state.gameFor(state.accountFor(auth, {}));
const before = JSON.stringify(game);
const reference = gameResponse(state, "/reference/GetAbyss", auth).ret_data as ReturnType<typeof searchHelperReference>;
assert.deepEqual(reference.list, [], "Abyss content itself remains unreconstructed");
assert.deepEqual(reference.reset_price, []);
assert.ok(reference.virtual_friend.length > 0);
for (const helper of reference.virtual_friend) {
  assert.equal(typeof helper.id, "string");
  assert.equal(typeof helper.nick_name, "string");
  assert.ok(helper.id && helper.nick_name);
  assert.equal(helper.card_ref_id, helper.ref_id);
  assert.ok(starterReference.some((row) => row.base.id === helper.card_ref_id));
  assert.equal(helper.rank, 1);
  assert.equal(helper.inst_id, SEARCH_HELPER_SERIAL, "template uses a separate stable nonowned NPC serial");
  assert.ok(![...game.starter_cards, ...game.recruited_cards].some((row) => row.inst_id === helper.inst_id));
  assert.equal(helper.card_exp, helper.exp);
  assert.equal("card" in helper, false, "native card parser receives the whole flat row");
}
assert.deepEqual(gameResponse(state, "/abyss/GetHelperList", auth).ret_data, searchUsedHelpers());
assert.deepEqual(searchUsedHelpers(), { friend: [], virtual: [] }, "empty used lists keep templates available");
assert.equal(JSON.stringify(game), before, "reading helpers cannot grant hunters, mark usage or change wallet/progress");
console.log("Search helpers: correct Abyss reference parent, flat known-art template, empty used-ID lists and no owned grants passed; UI unverified.");
