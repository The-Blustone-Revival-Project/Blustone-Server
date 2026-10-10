import assert from "node:assert/strict";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

// Original ParseInven Gb2d038 and ParseRecod Gb2c5b8 receive the full envelope,
// extract ret_data and iterate numeric rows. Metadata objects are not fish data.
const state = new ServerState("http://localhost");
for (const device_id of ["fishing-owner-a", "fishing-owner-b"]) {
  const auth = state.registerGuest({ device_id }, {}).ret_data as { otp: string };
  const game = state.gameFor(state.accountFor(auth, {}));
  const before = JSON.stringify(game);
  for (const route of ["/fishing/GetInven", "/fishing/GetRecord"]) {
    const response = gameResponse(state, route, auth) as any;
    assert.equal(response.result_code, 1);
    assert.deepEqual(response.ret_data, []);
    assert.throws(() => gameResponse(state, route, {}), /authenticated account required/);
  }
  for (const suffix of ["Begin", "EndWithSell", "SellFish", "GetFishingPool", "GetPriceRef"]) {
    const response = gameResponse(state, `/fishing/${suffix}`, { ...auth, is_win: 1, fish_id: "FS001" }) as any;
    assert.notEqual(response.result_code, 1, "unreconstructed fish data cannot receive mock success");
  }
  assert.equal(JSON.stringify(game), before, "fishing reads/refusals do not spend bait, grant fish or alter progress");
}
console.log("Fishing contracts: authenticated bare-array inventory/records, owner isolation and unsupported catch/settlement refusal passed; native fishing remains unverified.");
