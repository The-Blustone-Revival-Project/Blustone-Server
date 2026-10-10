import assert from "node:assert/strict";
import { mirageLobby } from "../src/mirage.js";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

// Test rollover and native seconds bounds, not just a mirror of each DTO key.
const monday = Date.UTC(2026, 9, 5);
const beforeBoundary = mirageLobby(monday - 1000).ref_hero.end_ltime;
const afterBoundary = mirageLobby(monday).ref_hero.end_ltime;
assert.equal(beforeBoundary, monday / 1000);
assert.equal(afterBoundary - beforeBoundary, 7 * 86400);
assert.equal(mirageLobby(monday + 123456).ref_hero.end_ltime, afterBoundary);
assert.throws(() => mirageLobby(0x8000_0000 * 1000), RangeError);

const state = new ServerState("http://localhost");
const auth = state.registerGuest({ device_id: "mirage-contract" }, {}).ret_data as { otp: string };
const game = state.gameFor(state.accountFor(auth, {}));
const snapshot = JSON.stringify(game);
const info = gameResponse(state, "/mirage/GetInfo", auth) as any;
assert.equal(info.result_code, 1);
assert.ok(info.ret_data.ref_hero.end_ltime > Date.now() / 1000);
assert.deepEqual(info.ret_data.ref_hero.cur, []);
assert.deepEqual(info.ret_data.inst_base.deck, []);
for (const route of ["Start", "End", "RegisterDeck", "HealHunter"]) {
  assert.notEqual((gameResponse(state, `/mirage/${route}`, auth) as any).result_code, 1);
}
// Original renewal sequence: GetNextFloor refusal delegates scalar0; with
// current Floor0, the caller follows with reset/stay and all section flags.
const nextFloor = gameResponse(state, "/mirage/GetNextFloor", auth) as any;
assert.notEqual(nextFloor.result_code, 1);
const reset = gameResponse(state, "/mirage/GetInfo", {
  ...auth, reset: "t", stay: "t", entry: "t",
  inst_base: "t", inst_enemy: "t", ref_stair_list: "t", ref_hero: "t",
}) as any;
assert.notEqual(reset.result_code, 1, "An unreconstructed reset must not be acknowledged as a lobby read");
assert.equal(reset.ret_data?.inst_base, undefined, "Reset refusal does not install a fake floor");
const read = gameResponse(state, "/mirage/GetInfo", { ...auth, reset: "0", stay: "0" }) as any;
assert.equal(read.result_code, 1, "Ordinary native lobby read remains available");
assert.throws(() => gameResponse(state, "/mirage/GetInfo", { reset: "t" }), /authenticated account required/);
assert.throws(() => gameResponse(state, "/mirage/GetInfo", {}), /authenticated account required/);
assert.equal(JSON.stringify(game), snapshot, "Mirage reads/refusals do not debit, reset or grant progress");
const extra = (gameResponse(state, "/reference/GetExtra", {}) as any).ret_data;
assert.ok(Math.abs(extra.local_time - extra.server_utc) <= 1);
assert.ok(Math.abs(extra.local_time - Date.now() / 1000) < 2);
console.log("Mirage read-only contract: UTC clock/week rollover, authentication and no unsupported mutations passed.");
