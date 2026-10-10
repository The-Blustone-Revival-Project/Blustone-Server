import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ServerState, areaAchieveTotal, isAreaUnlocked } from "./legacy-state-fixture.js";
import { normalizeLocalGameState } from "../src/game.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-progression-"));
try {
  const filename = path.join(directory, "state.json");
  let state = new ServerState("http://localhost", filename);
  const guest = state.registerGuest({ device_id: "progression" }, {}).ret_data as { otp: string };
  const auth = { otp: guest.otp };
  const readStage = (id: string) => {
    const lobby = state.lobbyEnter(auth, {}).ret_data as { stage: Array<{ stage_id: string; achieve: string }> };
    const row = lobby.stage.find((entry) => entry.stage_id === id)!;
    assert.equal(typeof row.achieve, "string", "ParseMissionInfo requires embedded JSON TEXT");
    return JSON.parse(row.achieve) as { order: number }[];
  };
  assert.deepEqual(readStage("n_01_01"), [], "fresh stages have zero flags, not singleton numeric0");
  const game = () => state.gameFor(state.accountFor(auth, {}));
  assert.equal(areaAchieveTotal(game(), "n_01"), 0);
  assert.equal(isAreaUnlocked(game(), "n_02"), false);
  const clear = (id: string, clear_time: number, dead_cnt: number) => {
    state.startMission({ ...auth, stage_id: id }, {});
    return state.completeMission({ ...auth, stage_id: id,
      play_info: JSON.stringify({ clear: 1, clear_time, dead_cnt }) }, {}).ret_data as any;
  };
  const first = clear("n_01_01", 60, 0);
  assert.deepEqual(first.achieve, [{ order: 0 }, { order: 2 }], "60 seconds is not Under60; sparse flags retain identity");
  assert.equal(first.reward.gold, 10);
  assert.deepEqual(readStage("n_01_01"), [{ order: 0 }, { order: 2 }]);
  assert.equal(areaAchieveTotal(game(), "n_01"), 2);
  state = new ServerState("http://localhost", filename);
  assert.deepEqual(readStage("n_01_01"), [{ order: 0 }, { order: 2 }], "sparse conditions survive restart");
  const improvement = clear("n_01_01", 59, 0);
  assert.deepEqual(improvement.achieve, [{ order: 1 }], "replay grants only newly earned condition");
  assert.equal(improvement.reward.gold, 0, "improving stars cannot repay first-clear economy");
  assert.deepEqual(clear("n_01_01", 10, 0).achieve, [], "identical success is idempotent");
  assert.equal(game().stage_stars.n_01_01, 3);
  assert.equal(areaAchieveTotal(game(), "n_01"), 3);
  assert.equal(isAreaUnlocked(game(), "n_02"), false, "first node does not unlock next area");
  assert.deepEqual(clear("n_01_10", 90, 2).achieve, [{ order: 0 }]);
  assert.equal(isAreaUnlocked(game(), "n_02"), true, "last-stage completion flag opens next area");
  assert.equal(isAreaUnlocked(game(), "n_03"), false);
  for (let serial = 2; serial <= 9; serial++) clear(`n_01_${String(serial).padStart(2, "0")}`, 1, 0);
  const claim = (count: number) => state.requireAchieveReward({ ...auth, area_id: "n_01", target_achieve_cnt: count }, {}).ret_data as any;
  assert.equal(claim(10).claimed, true);
  assert.equal(claim(20).claimed, true);
  assert.equal(claim(30).claimed, false, "missing conditions keep final chest locked");
  state = new ServerState("http://localhost", filename);
  const claims = (state.lobbyEnter(auth, {}).ret_data as any).area_achieve;
  assert.deepEqual(claims, [{ area_id: "n_01", achieve_cnt: 10 }, { area_id: "n_01", achieve_cnt: 20 }],
    "multiple received chests repeat area_id as native rows, not totals/received arrays");
  clear("n_01_10", 1, 0);
  assert.equal(claim(30).claimed, true);
  assert.equal(claim(20).claimed, false, "restored claim cannot repay");
  assert.throws(() => normalizeLocalGameState({ stage_achievements: { n_01_01: [3] } }), /unsafe indices/);
  const migrated = normalizeLocalGameState({ stage_stars: { n_01_01: 3 }, cleared_stage_ids: ["n_01_02"] });
  // Existing count credits are preserved; a legacy completed-only ledger
  // grants only completion, without inventing performance conditions.
  const { earnedStageOrders } = await import("../src/progression.js");
  assert.deepEqual(earnedStageOrders(migrated, "n_01_01"), [0, 1, 2]);
  assert.deepEqual(earnedStageOrders(migrated, "n_01_02"), [0]);
  for (const seed of [2, 3]) {
    const probe = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      import assert from 'node:assert/strict';
      import { ServerState } from './tests/legacy-state-fixture.ts';
      const s=new ServerState(); const a=s.registerGuest({device_id:'seed-control'},{}).ret_data;
      s.startMission({otp:a.otp,stage_id:'n_01_01'},{});
      s.completeMission({otp:a.otp,stage_id:'n_01_01',play_info:JSON.stringify({clear:1,clear_time:90,dead_cnt:2})},{});
      const row=s.lobbyEnter({otp:a.otp},{}).ret_data.stage.find(r=>r.stage_id==='n_01_01');
      assert.equal(JSON.parse(row.achieve).length, Number(process.env.BLUSTONE_SEED_STAGE_STARS));
    `], { encoding: "utf8", env: { ...process.env, BLUSTONE_SEED_STAGE_STARS: String(seed) } });
    assert.equal(probe.status, 0, probe.stderr);
  }
  console.log("Progression: serialized flags, safe indices, sparse stars, replay improvement, gates and migration passed.");
} finally { rmSync(directory, { recursive: true, force: true }); }
