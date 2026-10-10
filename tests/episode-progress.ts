import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { episodeChapters, episodeIds, episodeStoryIds, normalizeEpisodeProgress } from "../src/episode-progress.js";

const dir = mkdtempSync(path.join(os.tmpdir(), "blustone-episode-"));
try {
  const file = path.join(dir, "state.json");
  let state = new ServerState("http://localhost", file);
  const auth = state.registerGuest({ device_id: "episode" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const call = (verb: string, id?: unknown) => gameResponse(state, `/episode/${verb}`, { ...auth, ...(id === undefined ? {} : { id }) }) as any;
  assert.equal(episodeIds.size, 147);
  assert.throws(() => gameResponse(state, "/episode/GetLog", {}), /authenticated account required/);
  const unauthorized = gameResponse(state, "/episode/Read", { id: "r_E01_S01" }) as any;
  assert.notEqual(unauthorized.result_code, 1); assert.equal(unauthorized.ret_data.dailyquest_min_stage, "");
  assert.deepEqual(call("GetLog").ret_data, { read_log: [], reward_log: [] });
  const privateState = state as any;
  const persistNormally = privateState.persist.bind(state);
  privateState.persist = () => { throw new Error("Simulated Episode save failure"); };
  const emptyGame = JSON.stringify(game);
  for (const id of ["r_E01_S01", "E01_S01"]) {
    assert.notEqual(call("Read", id).result_code, 1);
    assert.equal(call("Read", id).ret_data.dailyquest_min_stage, "");
    assert.equal(JSON.stringify(game), emptyGame, "save refusal cannot leave a flag that makes deferred retry skip persistence");
  }
  privateState.persist = persistNormally;
  const gameplay = JSON.stringify({ ...game, episode_progress: null });
  for (const id of ["r_E01_S01", "E01_S01", "r_E01_S02", "E01_S02", "E01"]) {
    assert.deepEqual(call("Read", id).ret_data, { dailyquest_min_stage: "", daily_quest: [], linear_quest: [] });
  }
  assert.equal(JSON.stringify({ ...game, episode_progress: null }), gameplay, "acknowledgment cannot grant rewards or alter other progression");
  const log = { read_log: ["E01", "E01_S01", "E01_S02", "r_E01_S01", "r_E01_S02"].map((id) => ({ id })), reward_log: [] };
  assert.deepEqual(call("GetLog").ret_data, log);
  const saved = JSON.stringify(game);
  call("Read", "r_E01_S01"); call("Read", "E01_S01");
  assert.equal(JSON.stringify(game), saved, "native deferred retries are idempotent");
  for (const id of ["", "r_", "r_r_E01_S01", "EV05", "r_EV05", "n_01_01", 1, ["E01"], "E99_S01"]) {
    assert.notEqual(call("Read", id).result_code, 1);
    assert.equal(call("Read", id).ret_data.dailyquest_min_stage, "", "native callback parses quest data even on refusal");
    assert.equal(JSON.stringify(game), saved);
  }
  assert.notEqual(call("Reward", "E01").result_code, 1, "no generic success for unimplemented settlement");
  assert.equal(JSON.stringify(game), saved);
  const other = state.registerGuest({ device_id: "episode-other" }, {}).ret_data as { otp: string };
  assert.deepEqual((gameResponse(state, "/episode/GetLog", other) as any).ret_data, { read_log: [], reward_log: [] });
  for (const id of episodeStoryIds(episodeChapters.get("E05")!))
    assert.equal((gameResponse(state, "/episode/Read", { ...other, id }) as any).result_code, 1);
  const otherLog = () => (gameResponse(state, "/episode/GetLog", other) as any).ret_data.read_log as { id: string }[];
  assert.equal(otherLog().some((row) => row.id === "E05"), false, "all leaf acknowledgments cannot fabricate a parent clear");
  assert.equal((gameResponse(state, "/episode/Read", { ...other, id: "E05" }) as any).result_code, 1);
  assert.equal(otherLog().some((row) => row.id === "E05"), true, "actual parent acknowledgment is persisted separately");
  state = new ServerState("http://localhost", file); game = state.gameFor(state.accountFor(auth, {}));
  assert.deepEqual(call("GetLog").ret_data, log);
  assert.equal(call("Read", "E01_S02").result_code, 1);
  assert.deepEqual(call("GetLog").ret_data, log);
  assert.deepEqual(normalizeEpisodeProgress(undefined), { read_ids: [], cleared_ids: [], reward_ids: [] });
  assert.throws(() => normalizeEpisodeProgress({ read_ids: ["EV05"], cleared_ids: [], reward_ids: [] }), /Malformed/);
  assert.throws(() => normalizeEpisodeProgress({ read_ids: ["E01_S01", "E01_S01"], cleared_ids: [], reward_ids: [] }), /Malformed/);
  console.log("Episode progress: original 147 IDs, native encoded read/clear logs, durable retry, owner isolation, no grants/events and explicit reward refusal passed; story UI/battle unverified.");
} finally { rmSync(dir, { recursive: true, force: true }); }
