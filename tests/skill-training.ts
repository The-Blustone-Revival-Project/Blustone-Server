import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { skillLevelLimit, skillUpPrice } from "../src/skill-training.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-skill-training-"));
try {
  const filename = path.join(directory, "state.json");
  const state = new ServerState("http://localhost", filename);
  const guest = state.registerGuest({ device_id: "skill-persistence" }, {}).ret_data as { otp: string; pvid: number };
  const auth = { otp: guest.otp };
  const account = state.accountFor(auth, {});
  const game = state.gameFor(account);
  const target = game.starter_cards.find((card) => card.inst_id === 2)!;
  const initialGold = game.gold;
  const items = JSON.stringify(game.items);
  const count = game.starter_cards.length;
  const request = { ...auth, target_inst_id: "2", skill_idx: "1" };
  const result = gameResponse(state, "/gym/SkillUp", request).ret_data as Record<string, unknown>;
  assert.deepEqual(result, { skill_idx: 1, target_inst: { inst_id: 2, skill_1_level: { prev: 1, cur: 2 } },
    user: { gold: { prev: initialGold, cur: initialGold - 200 } }, consumed_inst_list: [] });
  assert.equal(target.skill_1_level, 2, "inventory lock must not forbid improvement");
  // Native request has no expected-level/nonce; repeated accepted calls remain
  // distinct intended upgrades. This does not promise transport exactly-once.
  assert.equal(gameResponse(state, "/gym/SkillUp", request).result_code, 1);
  assert.equal(target.skill_1_level, 3);
  assert.equal(game.gold, initialGold - 500);
  assert.equal(game.starter_cards.length, count);
  assert.equal(JSON.stringify(game.items), items);
  assert.equal(target.skill_2_level, 0);
  assert.notEqual(gameResponse(state, "/gym/MultiSkillUp", { ...auth, target_inst_id: 2,
    mulit_skill_up_count: "[2,1,0,0,0]" }).result_code, 1, "a locked slot refuses the WHOLE batch");
  assert.equal(target.skill_1_level, 3);
  assert.equal(game.gold, initialGold - 500);
  const restored = new ServerState("http://localhost", filename);
  const restoredGame = restored.gameFor(restored.accountFor(auth, {}));
  const restoredTarget = restoredGame.starter_cards.find((card) => card.inst_id === 2)!;
  assert.equal(restoredTarget.skill_1_level, 3);
  assert.equal(restoredGame.gold, initialGold - 500);
  assert.equal(restored.partyProfileSnapshot(account.pvid).skill_1_level_1, 3);
  const other = restored.registerGuest({ device_id: "skill-other" }, {}).ret_data as { otp: string };
  assert.equal(restored.gameFor(restored.accountFor({ otp: other.otp }, {})).starter_cards[1].skill_1_level, 1);
  for (const bad of [{ target_inst_id: 999, skill_idx: 1 }, { target_inst_id: 2, skill_idx: 0 },
    { target_inst_id: 2, skill_idx: 6 }, { target_inst_id: 2, skill_idx: 2 },
    { target_inst_id: true, skill_idx: 1 }, { target_inst_id: 2, skill_idx: 1.5 }]) {
    const cards = JSON.stringify(restoredGame.starter_cards);
    const gold = restoredGame.gold;
    assert.notEqual(restored.trainSkill({ ...auth, ...bad }, {}).result_code, 1);
    assert.equal(JSON.stringify(restoredGame.starter_cards), cards);
    assert.equal(restoredGame.gold, gold);
  }
  restoredTarget.skill_1_level = 10;
  assert.notEqual(restored.trainSkill(request, {}).result_code, 1, "rank1 skill cap refuses level11");
  restoredTarget.skill_1_level = 3;
  restoredGame.gold = 0;
  assert.notEqual(restored.trainSkill(request, {}).result_code, 1);
  assert.equal(restoredTarget.skill_1_level, 3);
  assert.equal(restoredGame.gold, 0);
  for (const role of [1, 2, 3, 4]) {
    assert.equal(skillLevelLimit(role, 1), 10);
    assert.equal(skillLevelLimit(role, 5), 50);
    assert.equal(skillUpPrice(role, 0), undefined, "never index native level-minus1 with0");
  }
  assert.equal(skillLevelLimit(0, 5), 0);
  restoredGame.gold = 2000;
  const batch = { ...auth, target_inst_id: 2, mulit_skill_up_count: "[2,0,0,0,0]" };
  assert.deepEqual(gameResponse(restored, "/gym/MultiSkillUp", batch).ret_data, {
    target_inst: { inst_id: 2, skill_1_level: { cur: 5 } },
    user: { gold: { prev: 2000, cur: 1100 } }, consumed_inst_list: [],
  });
  const batchRestart = new ServerState("http://localhost", filename);
  const batchGame = batchRestart.gameFor(batchRestart.accountFor(auth, {}));
  assert.equal(batchGame.starter_cards.find((card) => card.inst_id === 2)?.skill_1_level, 5);
  assert.equal(batchGame.gold, 1100);
  for (const invalid of ["[0,0,0,0,0]", "[1,0]", "[1,-1,0,0,0]", "[1,true,0,0,0]", "[100,0,0,0,0]", "no-json"]) {
    assert.notEqual(batchRestart.trainSkills({ ...batch, mulit_skill_up_count: invalid }, {}).result_code, 1);
    assert.equal(batchGame.gold, 1100);
    assert.equal(batchGame.starter_cards.find((card) => card.inst_id === 2)?.skill_1_level, 5);
  }
  assert.notEqual(batchRestart.trainSkills({ ...auth, target_inst_id: 2, multi_skill_up_count: "[1,0,0,0,0]" }, {}).result_code, 1,
    "do not substitute corrected spelling for the recovered wire typo");
  const promoted = batchGame.starter_cards.find((card) => card.inst_id === 2)!;
  promoted.rank = 2; // isolated fixture: RankUp preserves this newly eligible slot at0
  assert.equal(promoted.skill_2_level, 0);
  const initialization = batchRestart.trainSkill({ ...auth, target_inst_id: 2, skill_idx: 2 }, {}).ret_data as any;
  assert.deepEqual(initialization.target_inst.skill_2_level, { prev: 0, cur: 1 });
  assert.deepEqual(initialization.user.gold, { prev: 1100, cur: 1000 }, "zero→one uses destination row1");
  promoted.skill_2_level = 0;
  const batchZero = batchRestart.trainSkills({ ...auth, target_inst_id: 2, mulit_skill_up_count: "[0,2,0,0,0]" }, {}).ret_data as any;
  assert.deepEqual(batchZero.target_inst.skill_2_level, { cur: 2 });
  assert.deepEqual(batchZero.user.gold, { prev: 1000, cur: 700 }, "batch prices destination rows1+2");
  const beforeLocked = JSON.stringify(promoted);
  assert.notEqual(batchRestart.trainSkill({ ...auth, target_inst_id: 2, skill_idx: 3 }, {}).result_code, 1);
  assert.equal(JSON.stringify(promoted), beforeLocked, "rank-locked zero stays refused");
  const zeroReload = new ServerState("http://localhost", filename);
  assert.equal(zeroReload.gameFor(zeroReload.accountFor(auth, {})).starter_cards.find((card) => card.inst_id === 2)!.skill_2_level, 2);
  console.log("Skill training: native mutation shape, repeated upgrades, ownership, caps, refusal and persistence passed.");
} finally { rmSync(directory, { recursive: true, force: true }); }
