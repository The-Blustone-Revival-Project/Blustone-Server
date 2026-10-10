import assert from "node:assert/strict";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "dialogue-reference-contract" }, {}).ret_data as { otp: string };
const game = state.gameFor(state.accountFor(auth, {}));
const before = JSON.stringify(game);
for (const payload of [{}, auth, { ...auth, list: ["DI00301"], type: 4 }]) {
  const response = gameResponse(state, "/reference/GetDialog", payload) as any;
  assert.equal(response.result_code, 1);
  assert.deepEqual(response.ret_data, [], "unrecovered archive cannot publish generic mock fields or derive rows from caller resource names");
  response.ret_data.push({ id: "caller-only" });
  assert.deepEqual((gameResponse(state, "/reference/GetDialog", payload) as any).ret_data, [], "read responses are independent");
}
assert.equal(JSON.stringify(game), before, "reference reads do not unlock stories, grant hunters or alter earned progress");
console.log("Dialogue reference: explicit empty record collection, no mock/resource-derived catalogue and progress preservation passed; journal content remains unrecovered.");
