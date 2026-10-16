import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { arenaReference, arenaStageReference, ARENA_STAGE_ID, ARENA_BP_COST, ARENA_RIVAL_PVID } from "../src/arena.js";
import { starterAreas, starterStages } from "../src/bootstrap.js";
import { gameResponse } from "../src/game-routes.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-arena-"));
const filename = path.join(directory, "state.json"), realNow = Date.now;
try {
  Date.now = () => Date.parse("2026-10-04T12:00:00Z");
  let state = new ServerState("http://localhost", filename);
  const auth = state.registerGuest({ device_id: "arena-test" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const action = (route: string, values = {}) => state.arenaAction(`/arena/${route}`, { ...auth, ...values }, {});
  const ownPvid = state.accountFor(auth, {}).pvid;
  const beforeProfiles = readFileSync(filename, "utf8");
  const profiles = (route: string, list: unknown) => gameResponse(state, route, { ...auth, list }) as any;
  for (const ids of [[ownPvid, ARENA_RIVAL_PVID], [ARENA_RIVAL_PVID, ownPvid], [ownPvid]]) {
    const brief = profiles("/relation/GetTargetUserInfo", JSON.stringify(ids));
    assert.deepEqual(brief.ret_data.list.map((row: any) => row.pvid), ids);
    assert.ok(brief.ret_data.list.every((row: any) => row.profile_url === "http://localhost/local-profile/replica-100.png"));
    const details = profiles("/world/GetUserDetail", JSON.stringify(ids));
    assert.deepEqual(details.ret_data.map((row: any) => row.pvid), ids);
    const own = details.ret_data.find((row: any) => row.pvid === ownPvid);
    if (own) {
      assert.equal(own.group_exp,game.exp);assert.equal(own.vip_exp,game.vip_exp);
      assert.equal(own.inst_id_leader,game.leader_inst_id);
      for(let slot=1;slot<=5;slot++)assert.equal(own[`inst_id_${slot}`],game.decks.find(row=>row.type===1)!.list[slot-1]??0,
        "Detailed profile preserves actual empty/fifth slots rather than the legacy leader fallback");
    }
    const rival = details.ret_data.find((row: any) => row.pvid === ARENA_RIVAL_PVID);
    if (rival) assert.equal(rival.ref_id_leader, "002");
  }
  for (const route of ["/world/GetUserDetail", "/relation/GetTargetUserInfo", "/relation/GetTargetUserInfo.WithAI"]) {
    assert.equal(profiles(route, `[${ownPvid},999]`).result_code, 2001);
    assert.equal(profiles(route, "[]").result_code, 2001);
    assert.throws(() => gameResponse(state, route, { list: `[${ownPvid}]` }), /authenticated account required/);
  }
  assert.equal(readFileSync(filename, "utf8"), beforeProfiles, "profile cache replies do not write gameplay state");
  const campaignDeck = JSON.stringify(game.decks);
  const stageRows = gameResponse(state, "/reference/GetStage", {})?.ret_data as any[];
  assert.deepEqual(stageRows.find((row) => row.id === ARENA_STAGE_ID), arenaStageReference());
  assert.equal(stageRows.filter((row) => row.id === ARENA_STAGE_ID).length, 1);
  assert.equal(arenaStageReference().ap_cost, ARENA_BP_COST, "local fee readout and charge use the same policy");
  assert.equal(arenaStageReference().res_prefix, "99");
  assert.equal(arenaStageReference().gold + arenaStageReference().character_exp + arenaStageReference().group_exp, 0);
  assert.equal(starterStages.stage.some((row) => row.id === ARENA_STAGE_ID), false);
  assert.equal(starterAreas.area.some((row) => row.stage.some((link) => link.stage_id === ARENA_STAGE_ID)), false,
    "arena reference must not become an expedition node or change campaign stars");
  const beforeRank = JSON.stringify(game);
  assert.deepEqual(action("GetMyRank").ret_data, { rank: 1 });
  assert.equal(JSON.stringify(game), beforeRank, "automatic rank lookup must not seed a deck or spend BP");
  const entry = action("Enter").ret_data as any;
  assert.equal(entry.arena.status, 1);
  assert.equal(entry.user.battle.pvid, state.accountFor(auth, {}).pvid);
  assert.equal(typeof entry.user.battle.start_message, "string");
  assert.equal(entry.deck.find((row: any) => row.type === 4).inst_id_1, game.decks[0].list[0]);
  assert.equal(JSON.stringify(game.decks.filter((row) => row.type !== 4 && row.type !== 5)), campaignDeck);
  assert.equal(entry.deck.find((row: any) => row.type === 5).inst_id_1, game.decks[0].list[0],
    "native defense must receive GetDeckInfo(5), independently from attacking4");
  assert.notEqual(game.decks.find((row) => row.type === 5)!.list, game.decks.find((row) => row.type === 4)!.list);
  state = new ServerState("http://localhost", filename); game = state.gameFor(state.accountFor(auth, {}));
  assert.deepEqual(game.decks.find((row) => row.type === 5)?.list, game.decks.find((row) => row.type === 4)?.list,
    "initial defense formation survives restart");
  assert.equal(state.setDeck({ ...auth, deck_info: [{ type: 5, list: [1, 0, 0, 0, 0] }] }, {}).result_code, 1);
  const configuredDefense = JSON.stringify(game.decks.find((row) => row.type === 5));
  action("Enter");
  assert.equal(JSON.stringify(game.decks.find((row) => row.type === 5)), configuredDefense,
    "repeat Enter preserves independently configured defense");
  const inventoryBefore = JSON.stringify([game.starter_cards, game.recruited_cards]);
  const rival = (action("FindRival").ret_data as any).arena.rival_list[0];
  assert.equal(rival.battle.pvid, ARENA_RIVAL_PVID);
  assert.equal(rival.deck.inst_1.ref_id, "002");
  assert.equal(Object.keys(rival.deck).length, 5);
  assert.equal(JSON.stringify([game.starter_cards, game.recruited_cards]), inventoryBefore, "rival is not an owned grant");
  assert.equal(arenaReference().league.length, 6);
  assert.equal(state.setDeck({ ...auth, deck_info: [{ type: 4, list: [2, 0, 0, 0, 0] }] }, {}).result_code, 1);
  const start = { target_pvid: ARENA_RIVAL_PVID, bid: "0", is_revenge: "0", is_friendship: "0" };
  for (const invalid of [{ target_pvid: 999 }, { bid: 1 }, { is_friendship: 1 }, { is_revenge: 1 }, { bid: true }]) {
    const before = JSON.stringify(game);
    assert.notEqual(action("BattleStart", { ...start, ...invalid }).result_code, 1);
    assert.equal(JSON.stringify(game), before);
  }
  const ap = game.ap, bp = game.bp, progress = JSON.stringify(game.stage_achievements);
  const first = action("BattleStart", start).ret_data as any;
  assert.equal(first.user.ap, ap);
  assert.equal(first.user.bp, bp - 1);
  assert.equal(typeof first.user.bp_charge_time, "number");
  assert.equal(first.user.bp.cur, undefined, "native Start consumes scalar resources");
  assert.equal(first.arena.combat_info.battle.pvid, ARENA_RIVAL_PVID);
  assert.deepEqual(game.arena.active?.deck_inst_ids, [2]);
  assert.equal(action("BattleStart", start).result_code, 1);
  assert.equal(game.bp, bp - 1, "active start replay costs once");
  assert.notEqual(state.startMission({ ...auth, stage_id: "n_01_01" }, {}).result_code, 1);
  assert.equal(game.ap, ap);
  state = new ServerState("http://localhost", filename); game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.bp, bp - 1);
  assert.deepEqual(game.arena.active?.deck_inst_ids, [2]);
  assert.equal(action("BattleStart", start).result_code, 1);
  assert.equal(game.bp, bp - 1, "restarted attempt costs once");
  const originalDecks = game.decks.map((row) => ({ type: row.type, list: [...row.list] }));
  assert.notEqual(state.setDeck({ ...auth, deck_info: [{ type: 4, list: [1] }] }, {}).result_code, 1,
    "native current CASE4 must stay aligned with the battle snapshot");
  state.setDeck({ ...auth, deck_info: [{ type: 1, list: [1] }] }, {});
  state.toggleCardLock({ ...auth, target_inst_id: 2 }, {});
  const protectedSnapshot = JSON.stringify(game);
  assert.notEqual(state.trainCard({ ...auth, target_inst_id: 1, source_inst_list: [2] }, {}).result_code, 1);
  assert.equal(JSON.stringify(game), protectedSnapshot, "active arena participant stays protected after deck changes");
  state.setDeck({ ...auth, deck_info: originalDecks }, {});
  state.toggleCardLock({ ...auth, target_inst_id: 2 }, {});
  const metrics = { is_win: 1, clear_time: 2, dead_cnt: 0, player_total_hp: 100,
    player_total_hp_max: 100, enemy_total_hp: 0, enemy_total_hp_max: 300, atk_max: 181, atk_total: 300, atk_cnt: 2 };
  const complete = { target_pvid: ARENA_RIVAL_PVID, is_revenge: 0, play_info: JSON.stringify(metrics) };
  const beforeBad = JSON.stringify(game);
  assert.notEqual(action("BattleComplete", { ...complete, play_info: { ...metrics, is_win: 2 } }).result_code, 1);
  assert.equal(JSON.stringify(game), beforeBad);
  const honor = game.honor, xp = Number(game.starter_cards.find((row) => row.inst_id === 2)!.exp);
  const receipt = action("BattleComplete", complete).ret_data as any;
  assert.deepEqual(receipt.user.battle.win, { prev: 0, cur: 1 });
  assert.deepEqual(receipt.user.honor, { prev: honor, cur: honor + 10 });
  assert.deepEqual(receipt.card, { "2": { prev: xp, cur: xp } }, "case4 snapshot, no invented XP reward");
  assert.equal(receipt.user.ap, undefined); assert.equal(receipt.user.bp, undefined);
  assert.equal(game.arena.active, null); assert.equal(game.ap, ap);
  assert.equal(JSON.stringify(game.stage_achievements), progress, "FC must not clear expedition stages");
  const settled = JSON.stringify(game);
  assert.deepEqual(action("BattleComplete", complete).ret_data, receipt, "lost response retry retains original deltas");
  assert.equal(JSON.stringify(game), settled, "repeated settled Complete has no reward");
  state = new ServerState("http://localhost", filename); game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.arena.win, 1); assert.equal(game.honor, honor + 10);
  assert.deepEqual(action("BattleComplete", complete).ret_data, receipt, "receipt survives restart");
  const lobby = state.lobbyEnter(auth, {}).ret_data as any;
  assert.equal(lobby.battle.win, 1); assert.equal(lobby.battle.rating_point, game.arena.rating_point);
  const profile = state.partyProfileSnapshot(state.accountFor(auth, {}).pvid);
  assert.equal(profile.rating_point, game.arena.rating_point);
  assert.equal(action("BattleStart", start).result_code, 1);
  const loss = action("BattleComplete", { ...complete, play_info: { ...metrics, is_win: 0, enemy_total_hp: 200 } }).ret_data as any;
  assert.deepEqual(loss.user.battle.lose, { prev: 0, cur: 1 });
  assert.deepEqual(loss.user.honor, { prev: honor + 10, cur: honor + 10 });
  assert.equal(game.arena.win, 1);
  assert.equal(action("BattleStart", start).result_code, 1);
  for (let i = 0; i < 5; i++) {
    assert.equal(action("BattleComplete", complete).result_code, 1);
    if (i < 4) assert.equal(action("BattleStart", start).result_code, 1);
  }
  assert.equal(game.arena.league_level, 2); assert.equal(game.arena.league_win, 0);
  game.bp = 0; game.bp_updated_at = Date.now();
  const noFuel = JSON.stringify(game);
  assert.notEqual(action("BattleStart", start).result_code, 1);
  assert.equal(JSON.stringify(game), noFuel);
  const other = state.registerGuest({ device_id: "arena-other" }, {}).ret_data as { otp: string };
  const otherEntry = state.arenaAction("/arena/Enter", other, {}).ret_data as any;
  assert.equal(otherEntry.user.battle.win, 0);
  // An old save without Arena migrates without wins/rewards/owned grants.
  const saved = JSON.parse(readFileSync(filename, "utf8"));
  const old = saved.gameStates.find((row: any[]) => row[0] === state.accountFor(auth, {}).pvid);
  delete old[1].arena; writeFileSync(filename, JSON.stringify(saved));
  const legacy = new ServerState("http://localhost", filename).gameFor(state.accountFor(auth, {}));
  assert.equal(legacy.arena.win, 0); assert.equal(legacy.honor, game.honor);
  console.log("Arena: native envelopes, separate attack4/defense5 teams, BP/AP isolation, restart, settlement, league policy and legacy migration passed; native combat evidence documented separately.");
} finally { Date.now = realNow; rmSync(directory, { recursive: true, force: true }); }
