import assert from "node:assert/strict";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { starterReference, starterStages } from "../src/bootstrap.js";
import { hunterSearchInstances, hunterSearchReference } from "../src/hunter-search.js";
import { searchStageReference } from "../src/search-stage.js";

const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "hunter-search-entry" }, {}).ret_data as { otp: string };
const game = state.gameFor(state.accountFor(auth, {}));
const before = JSON.stringify(game);
const ref = gameResponse(state, "/explore/GetRef", auth).ret_data as ReturnType<typeof hunterSearchReference>;
assert.ok(ref.ref.length > 0, "native SetData dereferences the first Normal record");
assert.deepEqual(ref.event_ref, []);
assert.ok(ref.ref.some((row) => row.id === "017"),
  "native Search guide requires generated child017 before its unguarded focus callback");
for (const row of ref.ref) {
  assert.equal(row.type, 1, "Normal filters exact type1");
  assert.ok(row.id.length > 0);
  assert.ok(starterReference.some((card) => card.base.id === row.target_card_id));
  assert.ok([...starterStages.stage, searchStageReference()].some((stage) => stage.id === row.target_stage_id));
  for (const key of ["serial", "max_join_cnt", "max_play_cnt", "max_retry_cnt", "period", "cost"] as const)
    assert.ok(Number.isSafeInteger(row[key]) && row[key] > 0);
}
const inst = gameResponse(state, "/explore/GetInst", auth).ret_data as ReturnType<typeof hunterSearchInstances>;
assert.deepEqual(inst, { inst: [], play_log: [], retry_log: [],
  reset_price: { price: 30, price_type: 1 }, retry_price: { price: 10, price_type: 1 },
  reset_cnt: 0, cooltime: 0, cleared_explore: [], user: null });
for (const route of ["Begin", "End", "Reward", "Retry", "Reset", "Entrust"]) {
  assert.notEqual(gameResponse(state, `/explore/${route}`, auth).result_code, 1,
    "unsupported actions must not appear to award or create a job");
}
assert.equal(JSON.stringify(game), before, "entry reads and refused actions preserve player state");
console.log("Hunter search entry: nonempty native Normal catalog, wrapper, idle instances and no grants passed; UI unverified.");
