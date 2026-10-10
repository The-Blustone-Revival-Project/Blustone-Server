import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createLocalGameState, normalizeLocalGameState, regenerateResources, resourceChargeTime } from "../src/game.js";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";

const epoch = 1_800_000_000_000;
const game = createLocalGameState();
Object.assign(game, { ap: 40, bp: 2, ap_updated_at: epoch, bp_updated_at: epoch });
const deadline = resourceChargeTime(game, "ap");
assert.equal(deadline, epoch / 1000 + 300);
assert.equal(Math.trunc((epoch / 1000 + 300 - deadline) / 300), 0, "native client cannot grant early point");
assert.equal(Math.trunc((epoch / 1000 + 600 - deadline) / 300), 1, "native client agrees at deadline");
assert.equal(regenerateResources(game, epoch + 299_999), false);
assert.equal(game.ap, 40);
assert.equal(regenerateResources(game, epoch + 300_000), true);
assert.equal(game.ap, 41);
regenerateResources(game, epoch + 750_000);
assert.equal(game.ap, 42);
assert.equal(game.ap_updated_at, epoch + 600_000, "keep partial interval");
regenerateResources(game, epoch + 1_800_000);
assert.equal(game.ap, 46);
assert.equal(game.bp, 3, "BP uses its own 30-minute clock");
regenerateResources(game, epoch + 100_000_000);
assert.equal(game.ap, 50);
assert.equal(game.bp, 10);
game.ap = 55;
regenerateResources(game, epoch + 101_000_000);
assert.equal(game.ap, 55, "preserve reward overflow");
assert.equal(regenerateResources(game, epoch), true);
assert.equal(game.ap_updated_at, epoch, "backwards clock reanchors");
assert.equal(game.ap, 55);
const migrated = normalizeLocalGameState({ ap: 36, bp: 4 });
assert.equal(migrated.ap, 36, "migration grants no fabricated offline credit");
assert.ok(migrated.ap_updated_at > 0);

const directory = mkdtempSync(path.join(tmpdir(), "blustone-resource-recovery-"));
const filename = path.join(directory, "state.json");
const realNow = Date.now;
try {
  let now = epoch;
  Date.now = () => now;
  const initial = new ServerState("http://localhost", filename);
  const extra = gameResponse(initial, "/reference/GetExtra", {}).ret_data as { server_utc: number };
  assert.equal(extra.server_utc, epoch / 1000, "GetExtra synchronizes the native server clock");
  const guest = initial.registerGuest({ device_id: "resource-recovery" }, {}).ret_data as { otp: string };
  const payload = { otp: guest.otp, stage_id: "n_01_01" };
  initial.lobbyEnter(payload, {});
  // Long idle time at cap must not buy instant recovery after a fresh spend.
  now += 10_000_000;
  initial.startMission(payload, {});
  now += 299_999;
  let restored = new ServerState("http://localhost", filename);
  assert.equal(restored.gameFor(restored.accountFor(payload, {})).ap, 49);
  now += 1;
  restored = new ServerState("http://localhost", filename);
  assert.equal(restored.gameFor(restored.accountFor(payload, {})).ap, 50);
  restored = new ServerState("http://localhost", filename);
  assert.equal(restored.gameFor(restored.accountFor(payload, {})).ap, 50, "recovery persists");

  const snapshot = JSON.parse(readFileSync(filename, "utf8"));
  snapshot.gameStates[0][1].ap = 36;
  delete snapshot.gameStates[0][1].ap_updated_at;
  delete snapshot.gameStates[0][1].bp_updated_at;
  writeFileSync(filename, JSON.stringify(snapshot));
  restored = new ServerState("http://localhost", filename);
  assert.equal(restored.gameFor(restored.accountFor(payload, {})).ap, 36);
  now += 300_000;
  restored = new ServerState("http://localhost", filename);
  assert.equal(restored.gameFor(restored.accountFor(payload, {})).ap, 37, "legacy migration anchor survives restart");
  assert.equal(restored.accountFor(payload, {}).otp, guest.otp, "session identity preserved");
  console.log("Resource recovery: intervals, caps, overflow, clock rollback, migration and restart passed.");
} finally {
  Date.now = realNow;
  rmSync(directory, { recursive: true, force: true });
}
