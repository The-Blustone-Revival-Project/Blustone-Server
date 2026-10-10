import assert from "node:assert/strict";
import crypto from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-state-test-"));
const filename = path.join(directory, "state.json");
try {
  const initial = new ServerState("http://127.0.0.1:8080", filename);
  const guest = initial.registerGuest({ device_id: "persistence-test" }, {});
  const account = guest.ret_data as Record<string, unknown>;
  assert.equal(typeof account.vs_token, "string");
  assert.ok(String(account.vs_token).length > 0);
  initial.confirmNickname({ otp: account.otp, nick_name: "LocalCaptain" }, {});
  assert.equal(initial.summary().accounts, 1, "native OTP must resolve the existing account");
  const { publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "secp384r1" });
  const exchange = initial.exchangeSecret({ publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64url") });
  const body = Buffer.from("persisted transport test");
  const secured = initial.encryptSecureBody(exchange.accessToken, body);

  const restarted = new ServerState("http://10.0.2.2:8080", filename);
  const restored = restarted.login({ otp: account.otp }, {}).ret_data as Record<string, unknown>;
  assert.equal(restored.pvid, account.pvid);
  assert.equal(restored.nick_name, "LocalCaptain");
  assert.equal(restored.server_url, "http://10.0.2.2:8080");
  assert.equal(typeof restored.otp, "string");
  assert.equal(restored.vs_token, account.vs_token);
  assert.equal(restarted.login({ otp: "not-a-real-otp" }, {}).result_code, 2001);
  assert.deepEqual(restarted.decryptSecureBody(exchange.accessToken, secured.body), body);
  assert.equal(restarted.encryptSecureBody(exchange.accessToken, body).signature, secured.signature);
  const next = restarted.registerGuest({ device_id: "second-device" }, {}).ret_data as Record<string, unknown>;
  assert.ok(Number(next.pvid) > Number(account.pvid));

  // A corrupt state must fail closed rather than reset accounts and overwrite it.
  writeFileSync(filename, '{"version":99}');
  assert.throws(() => new ServerState("http://localhost", filename), /refusing to overwrite/);
  assert.equal(readFileSync(filename, "utf8"), '{"version":99}');
  console.log("Account, native OTP, nickname and transport-key persistence tests passed.");
} finally {
  // Exact mkdtemp result owned by this test; contains only generated fixtures.
  rmSync(directory, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// `/mission/Start` idempotency window.
//
// Regression test for the six-report confound (analysis/testing/report-010.md
// .. report-015.md §3.3): the guard used to have NO age test, so an
// `active_battle` persisted by one early run was replayed for every later
// start of the same stage, and `/mission/Start` answered `idempotent: true`
// with that one battle_id for six consecutive device runs. Because
// `/mission/Complete` is never reached in a device run, nothing ever cleared
// it, and no amount of restarting the server helped - the state file carries
// it across the restart.
//
// These cases cover both halves of the intended semantics:
//   - inside the window  -> the same attempt (idempotent, AP charged once)
//   - outside the window -> a new attempt (fresh battle_id, AP charged again)
// plus the `forever` escape hatch that keeps the old behaviour reproducible.
// ---------------------------------------------------------------------------

interface StartData {
  accepted: boolean;
  idempotent?: boolean;
  stage_id: string;
  battle_id: string;
  ap: number;
  battle: { battle_id: string; started_at: number; state: string };
}

interface CompleteData {
  accepted: boolean;
  stage_id: string;
  reward: { gold: number; items: unknown[] };
  /** [RECOVERED] ARRAY of {order} -> CSRPlayData::SetStageAchieve. */
  achieve: unknown;
  /** [RECOVERED] object of {prev,cur} pairs read by the client's counters. */
  user: { gold: { prev: number; cur: number }; [key: string]: unknown };
}

/** Run `body` with the idempotency env var set (or unset, when undefined). */
function withWindow<T>(value: string | undefined, body: () => T): T {
  const key = "BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS";
  const previous = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try {
    return body();
  } finally {
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
}

/** A throwaway state file plus the OTP needed to call the mission routes. */
function newMissionFixture(label: string): { directory: string; filename: string; state: ServerState; otp: string } {
  const directory = mkdtempSync(path.join(tmpdir(), `blustone-mission-${label}-`));
  const filename = path.join(directory, "state.json");
  const state = new ServerState("http://127.0.0.1:8080", filename);
  const guest = state.registerGuest({ device_id: `mission-${label}` }, {}).ret_data as Record<string, unknown>;
  return { directory, filename, state, otp: String(guest.otp) };
}

/**
 * Move the persisted battle's clock backwards in the throwaway state file.
 *
 * This is how the test reproduces the real situation - a battle written by an
 * earlier run and reloaded from disk by a later process - without waiting six
 * hours, and without touching the live `server-ts/data/state.json`.
 */
function agePersistedBattle(filename: string, byMs: number): void {
  const saved = JSON.parse(readFileSync(filename, "utf8")) as {
    gameStates: Array<[number, { active_battle: { started_at: number } | null }]>;
  };
  let aged = 0;
  for (const [, game] of saved.gameStates) {
    if (game.active_battle) {
      game.active_battle.started_at -= byMs;
      aged += 1;
    }
  }
  assert.equal(aged, 1, "the fixture must have exactly one persisted active battle to age");
  writeFileSync(filename, JSON.stringify(saved));
}

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const missionDirectories: string[] = [];
try {
  // --- inside the window: a duplicate tap is the same attempt ---------------
  {
    const fixture = newMissionFixture("in-window");
    missionDirectories.push(fixture.directory);
    withWindow("600", () => {
      const first = fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData;
      assert.equal(first.accepted, true);
      assert.equal(first.idempotent, undefined, "a first start is a fresh battle, never idempotent");
      assert.equal(first.ap, 49, "a fresh start charges exactly one AP");
      const second = fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData;
      assert.equal(second.idempotent, true, "a repeat inside the window must replay the same battle");
      assert.equal(second.battle_id, first.battle_id);
      assert.equal(second.ap, 49, "an idempotent replay must not charge AP a second time");
    });
  }

  // --- outside the window: a new attempt is a new battle -------------------
  {
    const fixture = newMissionFixture("no-window");
    missionDirectories.push(fixture.directory);
    withWindow("0", () => {
      const first = fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData;
      const second = fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData;
      assert.equal(second.idempotent, undefined, "with the window disabled every start is fresh");
      assert.notEqual(second.battle_id, first.battle_id, "a fresh start must not reuse the previous battle_id");
      assert.equal(second.ap, 48, "each fresh start charges its own AP");
    });
  }

  // --- THE REGRESSION: a stale persisted battle must not be replayed --------
  // The live `server-ts/data/state.json` holds
  //   battle_id local-1000001-1790954627165, stage N002, started_at
  //   2026-10-02T15:23:47Z, state "active"
  // which `/mission/Start` replayed verbatim for report-010..report-015. Age it
  // in a throwaway copy, reload it from disk exactly as a server restart does,
  // and the next start of the same stage must be a NEW battle.
  {
    const fixture = newMissionFixture("stale");
    missionDirectories.push(fixture.directory);
    const stale = withWindow("600", () =>
      fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData);
    agePersistedBattle(fixture.filename, SIX_HOURS_MS);

    // Default window (env var unset) - a six-hour-old battle is not the same attempt.
    withWindow(undefined, () => {
      const reloaded = new ServerState("http://127.0.0.1:8080", fixture.filename);
      const resumed = reloaded.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData;
      assert.equal(resumed.accepted, true);
      assert.equal(resumed.idempotent, undefined, "a persisted battle older than the window must NOT be replayed");
      assert.notEqual(resumed.battle_id, stale.battle_id, "the stale battle_id must not come back");
      assert.ok(resumed.battle.started_at > stale.battle.started_at, "the fresh battle records a new started_at");
      assert.equal(resumed.ap, 48, "the fresh start charges its own AP; the abandoned one is not refunded");
    });
  }

  // --- the pre-2026-10-02 behaviour stays reachable as evidence -------------
  {
    const fixture = newMissionFixture("forever");
    missionDirectories.push(fixture.directory);
    const original = withWindow("forever", () =>
      fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData);
    agePersistedBattle(fixture.filename, SIX_HOURS_MS);
    withWindow("forever", () => {
      const reloaded = new ServerState("http://127.0.0.1:8080", fixture.filename);
      const replayed = reloaded.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData;
      assert.equal(replayed.idempotent, true, "'forever' reproduces the unbounded guard");
      assert.equal(replayed.battle_id, original.battle_id);
      assert.equal(replayed.ap, 49, "an idempotent replay never charges AP");
    });
  }

  // --- battle_id is unique per fresh start ----------------------------------
  {
    const fixture = newMissionFixture("unique");
    missionDirectories.push(fixture.directory);
    withWindow("0", () => {
      const ids = new Set<string>();
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const start = fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as StartData;
        assert.equal(start.accepted, true);
        ids.add(start.battle_id);
      }
      assert.equal(ids.size, 25, "every fresh start must mint a distinct battle_id");
    });
  }

  // --- `/mission/Complete` is exactly-once per stage clear ------------------
  // The reward used to be suppressed only when the stage was already cleared
  // AND no battle was active, so an active battle for a DIFFERENT stage
  // re-opened the reward for an already-cleared one.
  {
    const fixture = newMissionFixture("reward");
    missionDirectories.push(fixture.directory);
    withWindow("0", () => {
      fixture.state.startMission({ otp: fixture.otp, stage_id: "N002" }, {});
      const first = fixture.state.completeMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as CompleteData;
      assert.equal(first.reward.gold, 10, "the first clear pays");
      assert.deepEqual((first.achieve as Array<{ order: number }>).map((entry) => entry.order), [0, 1, 2],
        "a first clear grants every achieve order, the client's only stage progression write");
      assert.equal(first.user.gold.cur - first.user.gold.prev, 10, "user.gold carries the same delta as reward.gold");
      const repeated = fixture.state.completeMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as CompleteData;
      assert.equal(repeated.reward.gold, 0, "a repeat clear pays nothing");
      assert.deepEqual(repeated.achieve, [], "a repeat clear grants no achieve order");
      assert.equal(repeated.user.gold.prev, repeated.user.gold.cur, "and reports prev == cur, so no delta is applied");
      // Now make another stage's battle active and replay the cleared stage.
      fixture.state.startMission({ otp: fixture.otp, stage_id: "N003" }, {});
      const withOtherBattle = fixture.state.completeMission({ otp: fixture.otp, stage_id: "N002" }, {}).ret_data as CompleteData;
      assert.equal(withOtherBattle.reward.gold, 0, "an active battle must not re-open a cleared stage's reward");
      assert.deepEqual(withOtherBattle.achieve, [], "nor re-grant a star");
    });
  }

  console.log("Mission-start idempotency window and exactly-once completion tests passed.");
} finally {
  for (const owned of missionDirectories) rmSync(owned, { recursive: true, force: true });
}
