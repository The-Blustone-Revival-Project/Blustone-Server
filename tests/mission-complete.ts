import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { starterStages } from "../src/bootstrap.js";

/**
 * `/mission/Complete` response contract.
 *
 * Every assertion here is derived from `CSRSyncMStage::ReqCompleteCB` (0xb426ac),
 * decompiled in `analysis/native-mission-complete.txt:1013-2851`, and independently
 * re-derived offline from the library with
 * `tools/resolve-literals-offline.py --function b426ac:b43e60` (50/50 keys match)
 * plus manual resolution of the two non-adjacent pairs
 * `0xb43bd8+0xb439c8 -> "card_ref_id"` and `0xb43158+0xb42f64 -> "order"`.
 *
 * THE LOAD-BEARING FACT, and the reason this file exists:
 * `native-mission-complete.txt:1133-1151` is
 *
 *   if (CPVHTTPResponse::GetResultCode() != 1) {
 *       if (CSRSceneMgr::VertifyResultCode(code) != 0) goto fail;
 *       if (CPVHTTPRequest::GetRetryCnt() > 8) { invoke cb(code); return; }
 *       re-issue the request; return;
 *   }
 *
 * so any non-1 `result_code` makes the client retry SILENTLY eight times and then
 * invoke the completion callback with a failure code, parsing nothing at all.
 * `CSRMStage::OnFinish` (0xb35ce4) has a dedicated LOSE branch (lambda `$_5`)
 * that calls the same `RequestComplete`, so a defeat must still be answered 1.
 */

interface CompleteData {
  stage_id: unknown;
  achieve: unknown;
  user: { gold: { prev: number; cur: number }; [key: string]: unknown };
  level: Record<string, unknown>;
  max_ap: Record<string, unknown>;
  item: unknown;
  card: unknown;
  consumed_inst_list: unknown;
  gold: number;
  ap: number;
  reward: { gold: number; items: unknown[] };
  clear?: number;
  /** Must be absent/JSON null; declared so its absence is an explicit assertion. */
  detect?: unknown;
  /** Must be absent/JSON null; declared so its absence is an explicit assertion. */
  achievement?: unknown;
  /** For the "must not be sent" assertions; CompleteData is not an index signature. */
  [key: string]: unknown;
}

/**
 * The `if (*pcVar12 == '\0')` guard that every optional-key read in this callback
 * uses is an IS-NULL test, not an emptiness test.
 *
 * `native-mission-complete.txt:1813-1833` types the same byte the guard reads:
 *
 *   cVar1 = (char)*puStack_178;
 *   if (cVar1 == '\x02') { ...array... }
 *   else if (cVar1 == '\x01') { ...object... }
 *   else { uStack_14c = (uint)(cVar1 == '\0'); }
 *
 * i.e. the first byte of the `nlohmann::basic_json` object is `value_t`
 * (null=0, object=1, array=2, string=3, boolean=4, integer=5, unsigned=6,
 * float=7 - the `switch` at L1843-1868 reads 3 as a string via `strtod`,
 * 4 as a byte, 5/6 as a word, 7 as a double). The guard therefore fires ONLY for
 * an absent key or an explicit JSON `null`.
 *
 * Consequence: a present-but-"empty" value is NOT skipped. `"detect": {}` is an
 * object and `"achievement": []` is an array; both are non-null and both take the
 * branch the replica must avoid.
 */
function isNullish(value: unknown): boolean {
  return value === undefined || value === null;
}

const directories: string[] = [];
function fixture(label: string): { state: ServerState; otp: string } {
  const directory = mkdtempSync(path.join(tmpdir(), `blustone-complete-${label}-`));
  directories.push(directory);
  const state = new ServerState("http://127.0.0.1:8080", path.join(directory, "state.json"));
  const guest = state.registerGuest({ device_id: `complete-${label}` }, {}).ret_data as Record<string, unknown>;
  return { state, otp: String(guest.otp) };
}

/** The 8-field form body `RequestComplete` (0xb3aba8) actually posts. */
function completeForm(stageId: string, otp: string, playInfo: Record<string, unknown>) {
  return {
    otp,
    stage_id: stageId,
    deck_type: "1",
    play_info: JSON.stringify(playInfo),
  };
}

function complete(state: ServerState, body: Record<string, unknown>) {
  const envelope = state.completeMission(body, {}) as { result_code: number; ret_data: CompleteData };
  return envelope;
}

try {
  // =========================================================================
  // 1. A DEFEAT must answer result_code 1 and grant nothing.
  // =========================================================================
  {
    const { state, otp } = fixture("defeat");
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    // `CSRMStage::OnFinish`'s lose branch passes the win byte 0 as
    // `play_info.clear` (battle-completion.md §3.4, lambda `$_5`).
    const loss = complete(state, completeForm("N003", otp, { clear: 0, clear_time: 37, dead_cnt: 1 }));

    assert.equal(loss.result_code, 1,
      "a DEFEAT must still answer result_code 1 (ReqCompleteCB L1133-1151 retries silently 8x otherwise)");
    assert.equal(loss.ret_data.clear, 0, "the replica must report the loss to its own trace");
    assert.deepEqual(loss.ret_data.achieve, [],
      "a loss grants no achieve order, so SetStageAchieve never runs and the map does not advance");
    assert.equal(loss.ret_data.user.gold.prev, loss.ret_data.user.gold.cur,
      "a loss pays no gold: prev == cur is the whole signal (battle-completion.md §6)");
    assert.equal(loss.ret_data.reward.gold, 0, "no reward object gold on a loss");
    assert.ok(loss.ret_data.stage_id, "stage_id is echoed so the client can key SetStageAchieve");
  }

  // =========================================================================
  // 2. A DEFEAT must not consume the stage's first clear, and the later win
  //    must still pay exactly once.
  // =========================================================================
  {
    const { state, otp } = fixture("defeat-then-win");
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    complete(state, completeForm("N003", otp, { clear: 0 }));
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    const win = complete(state, completeForm("N003", otp, { clear: 1 }));
    assert.equal(win.result_code, 1);
    assert.equal(win.ret_data.reward.gold, 10, "the first WIN of the stage pays exactly once");
    const teamExp = win.ret_data.user.exp as { prev: number; cur: number };
    for (const stage of starterStages.stage) {
      assert.equal(stage.group_exp, teamExp.cur - teamExp.prev,
        "published first-clear team EXP matches actual settlement; this remains local reward policy");
    }
    assert.deepEqual((win.ret_data.achieve as Array<{ order: number }>).map((entry) => entry.order), [0, 1, 2]);
  }

  // =========================================================================
  // 3. `detect` must be absent (or JSON null).
  //    native-mission-complete.txt:2603-2605 -> `if (is_null(detect)) { resync
  //    user.ap / user.bp } else { flag |= 8 }`. A present `detect` SKIPS the
  //    AP/BP resync, so AP spent at `/mission/Start` would never come back.
  // =========================================================================
  {
    const { state, otp } = fixture("detect");
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    const win = complete(state, completeForm("N003", otp, { clear: 1 }));
    assert.ok(isNullish(win.ret_data.detect),
      "detect must be absent or JSON null: a present value (even {}) skips the user.ap/user.bp resync");
    assert.equal(typeof win.ret_data.user.ap, "object");
    assert.equal(typeof win.ret_data.user.ap_charge_time, "number",
      "SyncAP needs ap_charge_time alongside user.ap.cur (L2701)");
    assert.equal(typeof win.ret_data.user.bp_charge_time, "number", "SyncBP needs bp_charge_time (L2767)");
  }

  // =========================================================================
  // 4. `achievement` must be absent (or JSON null).
  //    native-mission-complete.txt:2823-2828 -> `if (!is_null(achievement))
  //    CSRAchieve::ParseAchievementsElement(achievement)`, and that function
  //    (0x8481c4) builds a request: app_code/app_ver/market/pvid +
  //    "/dailyquest/GetInstList" (verified by offline literal scan of
  //    0x8481c4..0x848a40). Because the guard is is-null and not
  //    is-empty, the `achievement: []` that analysis/research/battle-lifecycle.md
  //    §5.2 recommends would STILL fire the stray request.
  // =========================================================================
  {
    const { state, otp } = fixture("achievement");
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    const win = complete(state, completeForm("N003", otp, { clear: 1 }));
    assert.ok(isNullish(win.ret_data.achievement),
      "achievement must be absent or JSON null; [] is a non-null array and still calls ParseAchievementsElement");
  }

  // =========================================================================
  // 5. `achieve` is an ARRAY of `{order:int}` - the only progression write.
  //    `SetStageAchieve(stage_id, order)` at L1871 and a local `bool[order] = 1`
  //    at L1873, which is why `order` must stay a SMALL index: a large value is
  //    an out-of-bounds stack write, not just wrong data.
  // =========================================================================
  {
    const { state, otp } = fixture("achieve");
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    const win = complete(state, completeForm("N003", otp, { clear: 1 }));
    assert.ok(Array.isArray(win.ret_data.achieve), "achieve must be an ARRAY (iterated with iter_impl at L1836-1897)");
    const orders = (win.ret_data.achieve as Array<{ order: number }>).map((entry) => entry.order);
    assert.deepEqual(orders, [0, 1, 2], "a first 3-star clear grants safe flag indices0..2");
    for (const entry of win.ret_data.achieve as Array<Record<string, unknown>>) {
      assert.ok(Number.isSafeInteger(entry.order), "each achieve element is an object carrying an integer `order`");
      assert.ok(Number(entry.order) >= 0 && Number(entry.order) <= 2,
        "order indexes a local bool[] on the client stack; keep it inside the star range");
    }
    // A replay of an already-cleared stage grants no NEW order (battle-lifecycle.md §5.4).
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    const replay = complete(state, completeForm("N003", otp, { clear: 1 }));
    assert.deepEqual(replay.ret_data.achieve, [], "a replay must not re-grant achieve orders");
  }

  // =========================================================================
  // 6. `card` is an OBJECT keyed by the decimal card serial (L1909/L1921) and
  //    `item` is an ARRAY of {inst_id, added, ref_id} (L2249-2415).
  // =========================================================================
  {
    const { state, otp } = fixture("containers");
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    const win = complete(state, completeForm("N003", otp, { clear: 1 }));
    assert.ok(win.ret_data.card !== null && typeof win.ret_data.card === "object" && !Array.isArray(win.ret_data.card),
      "card must be an OBJECT keyed by to_string(card serial), never an array");
    assert.ok(Array.isArray(win.ret_data.item), "item must be an ARRAY of drop records");
    assert.ok(Array.isArray(win.ret_data.consumed_inst_list),
      "consumed_inst_list is read unconditionally by CSRInventory::UseItem; [] is the no-op");
    // stage_id is converted with an UNGUARDED from_json<string_t> (L1332-1338),
    // so it must be present as a string or the client throws mid-callback.
    assert.equal(typeof win.ret_data.stage_id, "string");
    assert.equal(typeof win.ret_data.level.prev, "number");
    assert.equal(typeof win.ret_data.level.cur, "number");
  }

  // =========================================================================
  // 7. Client-derived star fields must not be sent. `prev_star`, `star`,
  //    `is_first_clear` and `star_action` are BUILT by the client from
  //    GetStageAchieveCnt/achieve[] and written to a local marker
  //    (native-mission-complete.txt:2477-2602); `achieve[].order` is the wire.
  // =========================================================================
  {
    const { state, otp } = fixture("no-star-fields");
    state.startMission({ otp, stage_id: "N003", deck_inst_id_1: 1 }, {});
    const win = complete(state, completeForm("N003", otp, { clear: 1 }));
    for (const key of ["star", "prev_star", "is_first_clear", "star_action"]) {
      assert.ok(!(key in win.ret_data),
        `${key} is client-derived and must not be sent as a response field`);
    }
  }

  // =========================================================================
  // 8. A repeated completion of a won stage pays nothing at all.
  // =========================================================================
  {
    const { state, otp } = fixture("idempotent");
    state.startMission({ otp, stage_id: "N004", deck_inst_id_1: 1 }, {});
    const first = complete(state, completeForm("N004", otp, { clear: 1 }));
    assert.equal(first.ret_data.reward.gold, 10, "the first win pays");
    assert.equal(first.ret_data.user.gold.cur - Number(first.ret_data.user.gold.prev), 10,
      "user.gold.cur - prev is the gold actually applied to the village readout");
    const before = first.ret_data.gold;
    const again = complete(state, completeForm("N004", otp, { clear: 1 }));
    assert.equal(again.result_code, 1, "a duplicate clear is still answered 1, never a failure code");
    assert.equal(again.ret_data.reward.gold, 0, "a duplicate clear pays nothing");
    assert.equal(again.ret_data.gold, before, "and does not move the gold balance");
    assert.equal(again.ret_data.user.gold.prev, again.ret_data.user.gold.cur);
  }

  // =========================================================================
  // 9. Every outcome answers result_code 1, including the unknown-battle
  //    rejection. There is no route under /mission/ that reports a failure.
  // =========================================================================
  {
    const { state, otp } = fixture("rejections");
    const unknown = complete(state, { otp, stage_id: "N003", battle_id: "not-a-live-battle", play_info: JSON.stringify({ clear: 1 }) });
    assert.equal(unknown.result_code, 1,
      "even a rejected completion answers 1; a non-1 code costs 8 silent retries and parses nothing");
    assert.equal(unknown.ret_data.accepted, false);
    assert.equal(unknown.ret_data.reward.gold, 0, "standalone completion cannot create a first-clear reward");
    assert.deepEqual(unknown.ret_data.achieve, []);
    const game = state.gameFor(state.accountFor({ otp }, {}));
    assert.equal(game.cleared_stage_ids.includes("N003"), false);
    assert.equal(game.stage_stars.N003 ?? 0, 0);
  }

  // =========================================================================
  // 10. play_info may arrive as a JSON string (the recovered form field) or as
  //     an already-decoded object (the replica's own JSON smoke calls).
  // =========================================================================
  {
    const { state, otp } = fixture("play-info-shapes");
    state.startMission({ otp, stage_id: "N005", deck_inst_id_1: 1 }, {});
    const asObject = complete(state, { otp, stage_id: "N005", play_info: { clear: 0 } });
    assert.equal(asObject.ret_data.clear, 0, "an object play_info is read the same way");
    assert.equal(asObject.result_code, 1);
    state.startMission({ otp, stage_id: "N005", deck_inst_id_1: 1 }, {});
    const noPlayInfo = complete(state, { otp, stage_id: "N005" });
    assert.equal(noPlayInfo.result_code, 1);
    assert.equal(noPlayInfo.ret_data.clear, 1,
      "[FIXTURE] a missing play_info is treated as a win; the native client always sends one");
  }

  // Final bundled help promises no fuel consumption on defeat/forfeit.
  {
    const { state, otp } = fixture("loss-fuel");
    const start = state.startMission({ otp, stage_id: "n_02_01" }, {}).ret_data as { ap: number; battle_id: string };
    const wrong = complete(state, { otp, stage_id: "n_02_02", play_info: { clear: 0 } });
    assert.equal(wrong.ret_data.ap, start.ap, "wrong stage cannot refund the reservation");
    const restored = new ServerState("http://127.0.0.1:8080", path.join(directories.at(-1)!, "state.json"));
    const loss = complete(restored, { otp, stage_id: "n_02_01", battle_id: start.battle_id, play_info: { clear: 0 } });
    assert.equal(loss.ret_data.ap, start.ap + 1);
    assert.deepEqual(loss.ret_data.user.ap, { prev: start.ap, cur: start.ap + 1 });
    assert.equal(loss.ret_data.reward.gold, 0);
    const replay = complete(restored, { otp, stage_id: "n_02_01", battle_id: start.battle_id, play_info: { clear: 0 } });
    assert.equal(replay.ret_data.ap, loss.ret_data.ap, "loss replay cannot credit fuel twice");
    const restart = restored.startMission({ otp, stage_id: "n_02_01" }, {}).ret_data as { ap: number };
    const win = complete(restored, { otp, stage_id: "n_02_01", play_info: { clear: 1 } });
    assert.equal(win.ret_data.ap, restart.ap, "victory retains its fuel charge");
  }

  {
    const { state, otp } = fixture("loss-fuel-cap-and-legacy");
    const game = state.gameFor(state.accountFor({ otp }, {}));
    state.startMission({ otp, stage_id: "n_02_01" }, {});
    game.ap = game.max_ap; // entry fuel has already regenerated
    const capped = complete(state, { otp, stage_id: "n_02_01", play_info: { clear: 0 } });
    assert.equal(capped.ret_data.ap, game.max_ap, "refund cannot turn regeneration into overflow");
    game.ap = 55;
    state.startMission({ otp, stage_id: "n_02_01" }, {});
    const overflow = complete(state, { otp, stage_id: "n_02_01", play_info: { clear: 0 } });
    assert.equal(overflow.ret_data.ap, 55, "loss restores fuel reserved from an existing overflow balance");
    game.ap = 40;
    state.startMission({ otp, stage_id: "n_02_01" }, {});
    delete game.active_battle!.ap_spent;
    const legacy = complete(state, { otp, stage_id: "n_02_01", play_info: { clear: 0 } });
    assert.equal(legacy.ret_data.ap, 39, "unknown legacy charge is not inferred");
  }

  console.log("Mission-complete response contract tests passed.");
} finally {
  for (const owned of directories) rmSync(owned, { recursive: true, force: true });
}
