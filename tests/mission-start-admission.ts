import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { ServerState } from "../src/state.js";
const directory = mkdtempSync(path.join(tmpdir(), "blustone-start-admission-"));
const now = Date.now, priorWindow = process.env.BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS;
try {
  Date.now = () => 1800000000000;
  process.env.BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS = "30";
  const filename = path.join(directory, "state.json");
  const state = new ServerState("http://localhost", filename);
  const auth = state.registerGuest({device_id:"start-admission"}, {}).ret_data as any;
  const game = state.gameFor(state.accountFor(auth, {}));
  const id = game.starter_cards[0].inst_id;
  const payload = {...auth,stage_id:"n_01_01",deck_inst_id_1:id};
  game.ap = 0;
  const before = JSON.stringify(game);
  const refused = state.startMission(payload, {}) as any;
  assert.equal(refused.result_code, 2001);
  assert.equal(refused.ret_data.error_code, "AP_EMPTY");
  assert.equal(JSON.stringify(game), before, "unfunded Start creates no battle or progress");
  game.ap = 1;
  const funded = state.startMission(payload, {}) as any;
  assert.equal(funded.result_code, 1);
  assert.equal(game.ap, 0);
  const fundedSnapshot = JSON.stringify(game);
  const retry = state.startMission(payload, {}) as any;
  assert.equal(retry.result_code, 1, "funded reservation retries still work with AP0");
  assert.equal(retry.ret_data.idempotent, true);
  assert.equal(retry.ret_data.battle_id, funded.ret_data.battle_id);
  assert.equal(JSON.stringify(game), fundedSnapshot);
  for (const invalid of [1,-1,1.5,"NaN",999999999]) {
    const rejection = state.startMission({...payload,deck_inst_id_1:invalid}, {}) as any;
    assert.equal(rejection.result_code, 2001);
    assert.equal(rejection.ret_data.error_code, "DECK_NOT_OWNED");
    assert.equal(JSON.stringify(game), fundedSnapshot, "bad deck cannot replace/refund active reservation");
  }
  const restored = new ServerState("http://localhost", filename);
  assert.equal((restored.startMission(payload, {}) as any).ret_data.battle_id, funded.ret_data.battle_id);
  Date.now = () => 1800000031000;
  game.ap_updated_at = Date.now();
  const expired = state.startMission(payload, {}) as any;
  assert.equal(expired.result_code, 2001);
  assert.equal(game.active_battle!.battle_id, funded.ret_data.battle_id);
  assert.equal(game.ap, 0);
  console.log("Mission Start admission: non-success refusals, funded AP0 retries, deck isolation, restart and expired reservation passed.");
} finally {
  Date.now = now;
  if (priorWindow === undefined) delete process.env.BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS;
  else process.env.BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS = priorWindow;
  rmSync(directory, {recursive:true,force:true});
}
