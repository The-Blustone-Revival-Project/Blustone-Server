import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { gameResponse } from "../src/game-routes.js";
import { rankUpRows, rankUpTransition } from "../src/training.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-rank-up-"));
const filename = path.join(directory, "state.json");
const oldRecruit = process.env.BLUSTONE_RECRUIT_CARD;
const realNow = Date.now;
try {
  Date.now = () => 1_800_000_000_000;
  process.env.BLUSTONE_RECRUIT_CARD = "003";
  let state = new ServerState("http://localhost", filename);
  const auth = state.registerGuest({ device_id: "rank-up" }, {}).ret_data as { otp: string };
  state.gachaPremium({ ...auth, cnt: "11" }, {});
  let game = state.gameFor(state.accountFor(auth, {}));
  game.recruited_cards.forEach((card) => { card.lock = 0; });
  const original = JSON.stringify(game.starter_cards);
  const [target, first, second, third, wrongGrade, locked] = game.recruited_cards;
  assert.deepEqual(gameResponse(state, "/reference/GetCardRankUp", {}).ret_data, rankUpRows);
  assert.deepEqual(rankUpRows.map((row) => row.src_cnt), [1, 2, 3, 4, 0]);
  const request = (ids: number[], extras = {}) => state.rankUpCard({ ...auth, target_inst_id: target.inst_id,
    source_inst_list: JSON.stringify(ids), is_tuto: "0", ...extras }, {});
  const unchangedRefusal = (ids: number[], extras = {}) => {
    const before = JSON.stringify(game);
    assert.notEqual(request(ids, extras).result_code, 1);
    assert.equal(JSON.stringify(game), before, "refusal must not charge or consume any material");
  };
  unchangedRefusal([first.inst_id]); // below required target level
  target.exp = 2900;
  target.lock = 1; // locked target can improve; locked materials cannot be destroyed
  target.skill_1_level = 7;
  target.skill_2_level = 3;
  wrongGrade.rank = 2;
  locked.lock = 1;
  unchangedRefusal([wrongGrade.inst_id]);
  unchangedRefusal([locked.inst_id]);
  unchangedRefusal([first.inst_id, first.inst_id]);
  unchangedRefusal([target.inst_id]);
  unchangedRefusal([first.inst_id], { is_tuto: "bad" });
  game.active_battle = { battle_id: "fixture-active", stage_id: "n_01_01", state: "active", started_at: Date.now(),
    completed_at: 0, deck_inst_ids: [target.inst_id], enemy_count: 1, result: 0, stars: 0 };
  unchangedRefusal([first.inst_id]);
  game.active_battle = null;
  const richGold = game.gold;
  game.gold = 0;
  unchangedRefusal([first.inst_id]);
  game.gold = richGold;
  game.decks.push({ type: 2, list: [first.inst_id, 0, 0, 0, 0] });
  unchangedRefusal([first.inst_id]);
  game.decks = game.decks.filter((deck) => deck.type !== 2);
  // Case3 can use a material; its consumed membership must be cleared.
  game.decks.push({ type: 3, list: [first.inst_id, second.inst_id, 0, 0, 0] });
  const gold = game.gold;
  const partial = request([first.inst_id]).ret_data as any;
  assert.deepEqual(partial.card.target_inst.rank, { prev: 3, cur: 3 });
  assert.deepEqual(partial.card.target_inst.rank_up_cnt, { prev: 0, cur: 1 });
  assert.deepEqual(partial.card.target_inst.exp, { prev: 2900, cur: 2900 });
  assert.deepEqual(partial.card.removed_inst_list, [first.inst_id], "RankUp removals are bare IDs, unlike Raise");
  assert.deepEqual(partial.user.gold, { prev: gold, cur: gold - 1000 });
  assert.equal(partial.user.deck.find((row: any) => row.type === 3).inst_id_1, 0);
  unchangedRefusal([first.inst_id]); // consumed-source retry cannot spend again
  unchangedRefusal([second.inst_id, third.inst_id, locked.inst_id]); // capacity overrun
  state = new ServerState("http://localhost", filename);
  game = state.gameFor(state.accountFor(auth, {}));
  const persisted = game.recruited_cards.find((card) => card.inst_id === target.inst_id)!;
  assert.equal(persisted.rank_up_cnt, 1);
  assert.equal(persisted.exp, 2900);
  assert.equal(persisted.skill_1_level, 7);
  const other = state.registerGuest({ device_id: "other-rank-up" }, {}).ret_data as { otp: string };
  assert.notEqual(state.rankUpCard({ ...other, target_inst_id: target.inst_id, source_inst_list: `[${second.inst_id}]` }, {}).result_code, 1);
  const partial2 = request([second.inst_id]).ret_data as any;
  assert.deepEqual(partial2.card.target_inst.rank_up_cnt, { prev: 1, cur: 2 });
  const promotion = request([third.inst_id]).ret_data as any;
  assert.deepEqual(promotion.card.target_inst.rank, { prev: 3, cur: 4 });
  assert.deepEqual(promotion.card.target_inst.rank_up_cnt, { prev: 2, cur: 0 });
  assert.deepEqual(promotion.card.target_inst.exp, { prev: 2900, cur: 0 });
  assert.equal(game.gold, gold - 3000);
  assert.equal(persisted.skill_1_level, 7);
  assert.equal(persisted.skill_2_level, 3);
  assert.equal(persisted.skill_4_level, 0, "do not invent a skill unlock mutation ignored by native callback");
  assert.equal(game.card_book.find((row) => row.ref_id === "003")!.rank, 4);
  assert.equal(JSON.stringify(game.starter_cards), original, "original sandbox starter instances unchanged");
  assert.equal(rankUpTransition({ ...persisted, rank: 5, exp: 2900 }, 1), null, "ordinary terminal rank has no awakening promotion");
  assert.equal(rankUpTransition({ ...persisted, rank: 3, rank_up_cnt: 3, exp: 2900 }, 1), null);
  // Low legacy IDs collide with native synthetic credits and would skip price.
  persisted.rank = 3; persisted.rank_up_cnt = 0; persisted.exp = 2900;
  game.starter_cards[1].rank = 3; game.starter_cards[1].lock = 0;
  const refusal = request([2]);
  assert.notEqual(refusal.result_code, 1);
  assert.match(JSON.stringify(refusal), /legacy source ID/);
  const wholeBatch = game.recruited_cards.slice(-3).map((card) => card.inst_id);
  const beforeBatch = game.gold;
  const batch = request(wholeBatch).ret_data as any;
  assert.deepEqual(batch.card.removed_inst_list, wholeBatch);
  assert.deepEqual(batch.card.target_inst.rank, { prev: 3, cur: 4 });
  assert.equal(game.gold, beforeBatch - 3000, "whole batch charges each real source exactly once");
  const reload = new ServerState("http://localhost", filename);
  const final = reload.gameFor(reload.accountFor(auth, {}));
  assert.equal(final.recruited_cards.find((card) => card.inst_id === target.inst_id)!.rank, 4);
  assert.ok(wholeBatch.every((id) => !final.recruited_cards.some((card) => card.inst_id === id)));
  console.log("RankUp: recovered pairs/numeric removals, partial carry, promotion, price, source protection and restart passed; native UI unverified.");
} finally {
  Date.now = realNow;
  if (oldRecruit === undefined) delete process.env.BLUSTONE_RECRUIT_CARD; else process.env.BLUSTONE_RECRUIT_CARD = oldRecruit;
  rmSync(directory, { recursive: true, force: true });
}
