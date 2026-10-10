import assert from "node:assert/strict";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "gem-contract" }, {}).ret_data as { otp: string };
const game = state.gameFor(state.accountFor(auth, {}));
game.gem = 12; // Legacy scalar scaffold counter; not twelve owned jewels.
const before = JSON.stringify(game);
const request = (route: string) => gameResponse(state, route, auth) as any;
assert.deepEqual(request("/lobby/GetGemInven").ret_data, []);
assert.throws(() => gameResponse(state, "/lobby/GetGemInven", {}), /authenticated account required/);
for (const suffix of ["GetGem", "GetGemCombinationEffect", "GetGemSellPrice", "GetGemLevelUpPrice", "GetGemDisassemblePrice"])
  assert.deepEqual(request(`/reference/${suffix}`).ret_data, []);
for (const action of ["Sell", "LevelUp", "PaidGacha", "MileageGacha", "DailyFreeGacha"])
  assert.notEqual(request(`/gem/${action}`).result_code, 1, "unreconstructed mutation cannot return mock success");
assert.notEqual(request("/card_handler/EquipGem").result_code, 1, "native EquipGem uses the card_handler family");
assert.equal(JSON.stringify(game), before, "reads/refusals preserve resources, counter, hunters, items and progress");
console.log("Gem contracts: native empty instance/reference arrays, legacy counter preservation, authentication and explicit unsupported-action refusal passed; gems/gameplay data remain unreconstructed.");
