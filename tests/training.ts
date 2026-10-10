import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { ACTIVE_SKILL_MODE } from "../src/skills.js";
import { rankUpRows } from "../src/training.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-training-"));
try {
  const filename = path.join(directory, "state.json");
  const state = new ServerState("http://localhost", filename);
  const guest = state.registerGuest({ device_id: "training" }, {}).ret_data as { otp: string };
  const auth = { otp: guest.otp };
  const payload = { ...auth, target_inst_id: 1, source_inst_list: "[2]" };
  const game = state.gameFor(state.accountFor(auth, {}));
  state.setDeck({ ...auth, deck_info: [{ type: 1, list: [1, 0, 0, 0] }] }, {});
  const price = gameResponse(state, "/reference/GetCardEnhancePrice", {}).ret_data as { level: number[]; rank: number[] };
  assert.ok(price.level.length && price.rank.length);
  assert.ok(price.level.every(Number.isFinite));
  assert.deepEqual(gameResponse(state, "/reference/GetCardRankUp", {}).ret_data, rankUpRows);
  const definitions = gameResponse(state, "/reference/GetCard", {}).ret_data as Array<{ base: { id: string }; skill: Array<Record<string, unknown>> }>;
  for (const card of definitions) {
    assert.deepEqual(card.skill.map((skill) => skill.type), [1, 2, 3, 4, 5], "card panel indexes every reference TYPE slot");
    for (const skill of card.skill) {
      for (const key of ["name", "desc", "cut_in_id", "icon_id"]) assert.equal(typeof skill[key], "string");
      if (ACTIVE_SKILL_MODE === "neutral" || skill.type !== 1 || !["001", "002", "003", "004"].includes(card.base.id)) {
        assert.deepEqual(skill.effect, [], "neutral profile and unimplemented slots remain inert");
      } else assert.equal((skill.effect as unknown[]).length, 1);
    }
  }
  const gold = game.gold;
  assert.notEqual(state.trainCard(payload, {}).result_code, 1, "locked source refused");
  assert.equal(game.gold, gold);
  assert.equal(game.starter_cards.length, 2);
  assert.deepEqual(gameResponse(state, "/card_handler/ToggleLock", { ...auth, target_inst_id: 2 }).ret_data,
    { inst_id: 2, lock: 0 });
  let restart = new ServerState("http://localhost", filename);
  const restoredGame = restart.gameFor(restart.accountFor(auth, {}));
  assert.equal(restoredGame.starter_cards[1].lock, 0, "lock survives restart");
  const outcome = gameResponse(restart, "/gym/LevelUp", payload).ret_data as {
    user: { gold: { prev: number; cur: number }; deck: unknown[] };
    card: { target_inst: { inst_id: number; exp: { prev: number; cur: number } }; removed_inst_list: { inst_id: number }[] };
  };
  assert.deepEqual(outcome.user.gold, { prev: gold, cur: gold - 100 });
  assert.deepEqual(outcome.card.target_inst, { inst_id: 1, exp: { prev: 0, cur: 100 } });
  assert.deepEqual(outcome.card.removed_inst_list, [{ inst_id: 2 }]);
  restart = new ServerState("http://localhost", filename);
  const inventory = restart.cardInventory(auth, {}).ret_data as Array<{ inst_id: number; exp: number }>;
  assert.deepEqual(inventory.map((card) => card.inst_id), [1], "consumed starter is never reseeded");
  assert.equal(inventory[0].exp, 100, "target experience survives restart");
  const lobby = restart.lobbyEnter(auth, {}).ret_data as Record<string, unknown>;
  assert.equal(lobby.exp_leader, 100, "flat profile cannot reset trained experience at boot");
  assert.equal(lobby.exp_1, 100);
  const profile = gameResponse(restart, "/relation/GetTargetUserInfo", auth).ret_data as Record<string, unknown>;
  assert.equal(profile.exp_leader, 100, "pre-battle profile must also retain trained experience");
  assert.notEqual(restart.trainCard(payload, {}).result_code, 1, "retry cannot consume/grant twice");
  assert.equal(restart.gameFor(restart.accountFor(auth, {})).gold, gold - 100);

  // Separate account exercises refusals and protects leader/deck ownership.
  const other = restart.registerGuest({ device_id: "training-invalid" }, {}).ret_data as { otp: string };
  const otherAuth = { otp: other.otp };
  const otherGame = restart.gameFor(restart.accountFor(otherAuth, {}));
  restart.setDeck({ ...otherAuth, deck_info: [{ type: 1, list: [1, 0, 0, 0] }] }, {});
  restart.toggleCardLock({ ...otherAuth, target_inst_id: 1 }, {});
  for (const sources of ["[1]", "[2,2]", "[999]", "[]", "oops", "[\"2\"]"]) {
    assert.notEqual(restart.trainCard({ ...otherAuth, target_inst_id: 2, source_inst_list: sources }, {}).result_code, 1);
  }
  assert.equal(otherGame.gold, 10_000);
  assert.equal(otherGame.starter_cards.length, 2);
  // Match the native five-partner limit; oversized calls cannot consume six
  // owned/unlocked recruits merely because the backend can parse the array.
  const batchAuth = restart.registerGuest({ device_id: "training-batch-limit" }, {}).ret_data as { otp: string };
  const batchGame = restart.gameFor(restart.accountFor(batchAuth, {}));
  const batchGrant = restart.gachaPremium({ ...batchAuth, cnt: 11 }, {}).ret_data as { card: Array<{ inst_id: number }> };
  const batchSources = batchGrant.card.slice(0, 6).map((card) => card.inst_id);
  for (const target_inst_id of batchSources) restart.toggleCardLock({ ...batchAuth, target_inst_id }, {});
  // accountFor/gameFor can refresh capped-energy clock anchors independently
  // of training. Compare inventory, wallets, energy quantities and all other
  // game fields; clock movement is covered by resource-recovery tests.
  const batchSnapshot = () => JSON.stringify({ ...batchGame, ap_updated_at: 0, bp_updated_at: 0 });
  const beforeBatch = batchSnapshot();
  assert.notEqual(restart.trainCard({ ...batchAuth, target_inst_id: 1, source_inst_list: batchSources }, {}).result_code, 1);
  assert.equal(batchSnapshot(), beforeBatch, "six-partner refusal is atomic");
  const five = restart.trainCard({ ...batchAuth, target_inst_id: 1, source_inst_list: batchSources.slice(0, 5) }, {}).ret_data as any;
  assert.deepEqual(five.card.target_inst.exp, { prev: 0, cur: 500 });
  assert.equal(five.card.removed_inst_list.length, 5);
  assert.equal(batchGame.gold, 9500);
  assert.ok(batchGame.recruited_cards.some((card) => card.inst_id === batchSources[5]), "sixth partner stays owned");
  restart.toggleCardLock({ ...otherAuth, target_inst_id: 2 }, {});
  otherGame.gold = 0;
  assert.notEqual(restart.trainCard({ ...otherAuth, target_inst_id: 1, source_inst_list: [2] }, {}).result_code, 1);
  assert.equal(otherGame.starter_cards[0].exp, 0);
  assert.equal(otherGame.starter_cards.length, 2);
  const saved = JSON.parse(readFileSync(filename, "utf8"));
  assert.ok(saved.gameStates.every((row: unknown[]) => (row[1] as Record<string, unknown>).starter_cards));
  console.log("Training: native shapes, lock persistence, atomic consumption, caps, refusal and restart passed.");
} finally {
  rmSync(directory, { recursive: true, force: true });
}
