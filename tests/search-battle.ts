import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { SEARCH_CAPSULE_ID } from "../src/search-capsules.js";
import { normalizeSearch } from "../src/search-battle.js";
import { SEARCH_STAGE_ID, SEARCH_WAVE_COUNT, searchStageMonsters, searchStageReference } from "../src/search-stage.js";
import { starterAreas, starterStageMonstersByStageId } from "../src/bootstrap.js";
import { SEARCH_HELPER_SERIAL } from "../src/search-helpers.js";

const folder = mkdtempSync(path.join(tmpdir(), "blustone-search-battle-"));
const saved = path.join(folder, "state.json");
const realNow = Date.now;
try {
  let now = 1_800_000_000_000;
  Date.now = () => now;
  let state = new ServerState("http://localhost", saved);
  const auth = state.registerGuest({ device_id: "search-battle" }, {}).ret_data as { otp: string };
  let game = state.gameFor(state.accountFor(auth, {}));
  const request = (route: string, fields: Record<string, unknown> = {}) => gameResponse(state, route, { ...auth, ...fields }) as any;
  const start = { owner: "0", type: "1", ref_id: "017", inst_id: "0", friend_pvid: "0", friend_leader_id: "0",
    vfid: "local_lantern_helper", wave_info: "1" };
  const begin = (fields = start) => request("/explore/Begin", fields);
  const finish = (log_id: number, clear: number, extra: Record<string, unknown> = {}) => request("/explore/End",
    { log_id, cleared_wave: clear ? 2 : 0, play_info: JSON.stringify({ clear, item_use: [], clear_time: 10, ...extra }) });
  assert.notEqual(begin().result_code, 1, "empty capsule inventory refuses, no free tutorial grant");
  assert.equal(searchStageReference().id, SEARCH_STAGE_ID);
  assert.equal(searchStageMonsters().wave_list.length, SEARCH_WAVE_COUNT, "actual link waves must match the supported native banner total");
  assert.equal(new Set(searchStageMonsters().wave_list.flat().map((row) => row._id)).size, SEARCH_WAVE_COUNT);
  assert.equal(starterStageMonstersByStageId.n_01_07.wave_list.length, 1, "campaign waves stay unchanged");
  assert.ok(starterAreas.area.every((area) => !area.stage.some((row) => row.stage_id === SEARCH_STAGE_ID)), "hidden Search reference adds no campaign nodes");
  assert.equal(game.search.active, null);
  state.startMission({ ...auth, stage_id: "n_01_01" }, {});
  state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1}' }, {});
  const capsule = game.items.find((row) => row.ref_id === SEARCH_CAPSULE_ID)!;
  assert.equal(capsule.qty, 1, "capsule earned through real local campaign handler");
  const balances = [game.ap, game.bp, game.gold, game.exp, game.gacha_iap_qty, game.gacha_free_qty];
  const ownership = JSON.stringify([game.starter_cards, game.recruited_cards, game.stage_achievements, game.tutorial]);
  const before = JSON.stringify(game);
  for (const bad of [{ ...start, owner: "42" }, { ...start, friend_pvid: "42" }, { ...start, type: "2" },
    { ...start, vfid: "unknown" }, { ...start, ref_id: "unknown" }]) assert.notEqual(begin(bad).result_code, 1);
  assert.equal(JSON.stringify(game), before, "unsupported identity/helper refuses atomically");
  const originalId = game.recruited_cards[0]?.inst_id ?? game.starter_cards[0].inst_id;
  const collisionCard = game.recruited_cards[0] ?? game.starter_cards[0];
  for (const serial of [SEARCH_HELPER_SERIAL, SEARCH_HELPER_SERIAL - 1]) {
    collisionCard.inst_id = serial;
    const collisionBefore = JSON.stringify(game);
    assert.notEqual(begin().result_code, 1, "owned or generated enemy serial cannot overlap the helper");
    assert.equal(JSON.stringify(game), collisionBefore, "serial collision refuses before charging or reserving a log");
  }
  collisionCard.inst_id = originalId;
  const first = begin();
  assert.equal(first.result_code, 1);
  assert.equal(capsule.qty, 0);
  const currentDeck = game.decks.find((row) => row.type === 1)!;
  assert.equal(state.setDeck({ ...auth, deck_info: [{ type: 1, list: currentDeck.list }] }, {}).result_code, 1,
    "identical deck registration is safe while Search is active");
  const changedDeck = currentDeck.list.filter((id) => id > 0).reverse();
  assert.notEqual(state.setDeck({ ...auth, deck_info: [{ type: 1, list: changedDeck }] }, {}).result_code, 1,
    "Search party cannot be changed to expose active hunters as training sources");
  const sourceId = game.search.active!.deck_inst_ids.find((id) => id !== game.leader_inst_id)!;
  const sourceCard = [...game.starter_cards, ...game.recruited_cards].find((card) => card.inst_id === sourceId)!;
  sourceCard.lock = 0;
  const savedDeckList = [...currentDeck.list];
  currentDeck.list = [game.leader_inst_id, 0, 0, 0, 0]; // independent snapshot protection even if a legacy deck was changed
  const protectedSnapshot = JSON.stringify(game);
  assert.notEqual(state.trainCard({ ...auth, target_inst_id: game.leader_inst_id, source_inst_list: JSON.stringify([sourceId]) }, {}).result_code, 1);
  assert.notEqual(state.rankUpCard({ ...auth, target_inst_id: game.leader_inst_id, source_inst_list: JSON.stringify([sourceId]) }, {}).result_code, 1);
  assert.equal(JSON.stringify(game), protectedSnapshot, "active Search sources refuse atomically");
  currentDeck.list = savedDeckList;
  sourceCard.lock = 1;
  assert.deepEqual(first.ret_data.consume_result, [{ inst_id: capsule.inst_id, qty: 1 }]);
  assert.equal(first.ret_data.wave_info[0].wave, 0);
  assert.deepEqual(first.ret_data.wave_info.map((row: any) => row.wave), [0, 1]);
  const oldPending = structuredClone(game.search) as any;
  oldPending.active.stage_id = "n_01_07";
  delete oldPending.active.wave_count;
  const migrated = normalizeSearch(oldPending);
  assert.equal(migrated.active!.stage_id, SEARCH_STAGE_ID);
  assert.equal(migrated.active!.wave_count, 2);
  assert.equal(migrated.active!.log_id, game.search.active!.log_id, "pending fixture migration preserves the log/cost/party");
  assert.deepEqual(begin().ret_data, { ...first.ret_data, consume_result: [] },
    "active retry retains log/waves without repeating the native decrement delta");
  assert.equal(capsule.qty, 0);
  assert.notEqual(state.startMission({ ...auth, stage_id: "n_01_02" }, {}).result_code, 1);
  assert.notEqual(state.arenaAction("/arena/BattleStart", { ...auth, target_pvid: "9000001", is_revenge: "0",
    is_friendship: "0", bid: "0" }, {}).result_code, 1);
  assert.deepEqual(request("/abyss/GetHelperList").ret_data.virtual, [], "reserved helper remains selectable to resume the same log");
  const log = first.ret_data.log_id;
  assert.deepEqual(request("/explore/GetInst").ret_data.play_log, [], "pending log must not disable its uncompleted UI node");
  state = new ServerState("http://localhost", saved);
  game = state.gameFor(state.accountFor(auth, {}));
  assert.deepEqual(begin().ret_data, { ...first.ret_data, consume_result: [] }, "active log survives restart without another decrement");
  assert.notEqual(finish(log + 1, 1).result_code, 1);
  assert.notEqual(finish(log, 1, { item_use: [{}] }).result_code, 1);
  assert.equal(game.search.active!.log_id, log);
  const nextItem = game.next_item_inst_id;
  game.next_item_inst_id = Number.MAX_SAFE_INTEGER;
  const capacityBefore = JSON.stringify(game);
  assert.notEqual(finish(log, 1).result_code, 1);
  assert.equal(JSON.stringify(game), capacityBefore, "trace allocator exhaustion refuses before settlement mutation");
  game.next_item_inst_id = nextItem;
  const win = finish(log, 1);
  assert.equal(win.result_code, 1);
  assert.deepEqual(win.ret_data.wave, { cleared_wave: 2, max_wave: 2 });
  assert.equal(win.ret_data.item[0].added, 1);
  assert.equal(win.ret_data.item[0].ref_id, "local_sylvester_trace");
  assert.equal(win.ret_data.detect, undefined);
  assert.equal(win.ret_data.achievement, undefined);
  assert.deepEqual(request("/abyss/GetHelperList").ret_data.virtual, [start.vfid]);
  assert.deepEqual(request("/explore/GetInst").ret_data.play_log, [{ ref_id: "017", log_id: log, inst_id: 0, owner: 0 }]);
  const replayReceipt = { ...win.ret_data, item: [] };
  assert.deepEqual(finish(log, 1).ret_data, replayReceipt, "End retry retains outcome/display without repeating additive inventory delta");
  assert.equal(game.items.find((row) => row.ref_id === "local_sylvester_trace")!.qty, 1);
  assert.equal(JSON.stringify([game.starter_cards, game.recruited_cards, game.stage_achievements, game.tutorial]), ownership);
  assert.deepEqual([game.ap, game.bp, game.gold, game.exp, game.gacha_iap_qty, game.gacha_free_qty], balances);
  state = new ServerState("http://localhost", saved);
  game = state.gameFor(state.accountFor(auth, {}));
  assert.deepEqual(finish(log, 1).ret_data, replayReceipt, "settlement survives restart without repeating additive inventory delta");
  const other = state.registerGuest({ device_id: "search-other" }, {}).ret_data as { otp: string };
  assert.notEqual(gameResponse(state, "/explore/End", { ...other, log_id: log, cleared_wave: 1,
    play_info: '{"clear":1,"item_use":[]}' }).result_code, 1, "logs are account-bound");
  now += 86_400_000;
  state.startMission({ ...auth, stage_id: "n_01_01" }, {});
  state.completeMission({ ...auth, stage_id: "n_01_01", play_info: '{"clear":1}' }, {});
  assert.notEqual(begin({ ...start, vfid: "", friend_leader_id: "18" }).result_code, 1,
    "a temporary serial without a known virtual helper is not a supported friend identity");
  const second = begin({ ...start, friend_leader_id: String(SEARCH_HELPER_SERIAL) });
  assert.equal(second.result_code, 1);
  assert.ok(second.ret_data.log_id > log);
  assert.notEqual(finish(log, 1).result_code, 1, "stale log cannot settle another active attempt");
  const defeat = finish(second.ret_data.log_id, 0);
  assert.equal(defeat.result_code, 1);
  assert.deepEqual(defeat.ret_data.item, []);
  assert.equal(game.items.find((row) => row.ref_id === "local_sylvester_trace")!.qty, 1);
  assert.throws(() => normalizeSearch({ ...game.search, next_log_id: 0 }), /Malformed/);
  const introAuth = state.registerGuest({ device_id: "search-onboarding" }, {}).ret_data as { otp: string };
  const introGame = state.gameFor(state.accountFor(introAuth, {}));
  introGame.stage_achievements.n_01_08 = [0]; // disposable fixture for native guide eligibility
  introGame.tutorial.push({ type: 37, step: 0, is_cleared: 1 });
  const flags = JSON.stringify(introGame.tutorial);
  const intro = gameResponse(state, "/explore/Begin", { ...introAuth, ...start }) as any;
  assert.equal(intro.result_code, 1);
  assert.deepEqual(intro.ret_data.consume_result, []);
  assert.equal(introGame.items.length, 0, "initial guided attempt grants no capsule inventory");
  assert.equal(JSON.stringify(introGame.tutorial), flags, "only native acknowledgements may clear tutorial flags");
  gameResponse(state, "/explore/End", { ...introAuth, log_id: intro.ret_data.log_id,
    cleared_wave: 0, play_info: '{"clear":0,"item_use":[]}' });
  now += 86_400_000;
  assert.notEqual(gameResponse(state, "/explore/Begin", { ...introAuth, ...start }).result_code, 1,
    "onboarding waiver is one attempt, never a free replay or daily grant");
  console.log("Search battle: earned capsule, authenticated normal packet, durable log, restart/replay, combat isolation, wave outcome and trace delta passed; native battle unverified.");
} finally { Date.now = realNow; rmSync(folder, { recursive: true, force: true }); }
