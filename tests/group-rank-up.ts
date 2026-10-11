import assert from "node:assert/strict";
import { groupRankUpTerms, planGroupRankUp } from "../src/group-rank-up.js";
import { cardInstance } from "../src/bootstrap.js";
import type { LocalCardInstance } from "../src/game.js";
import { mkdtempSync, readFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { ServerState as ProductionServerState } from "../src/state.js";
import { gameResponse } from "../src/game-routes.js";

const hunters = Array.from({ length: 9 }, (_, i) => ({ ...cardInstance(1000001 + i, "002", 1),
  rank: 1, rank_up_cnt: 0, exp: 0, lock: 0, awk_step: 0, awk_overcome: 0, overcome_cnt: 0 })) as LocalCardInstance[];
const request = { src_rank: "1", src_cnt: "8", target_rank: "2", target_cnt: "2", price: "2400" };
const context = { gold: 5000, protectedIds: new Set([1000009]),
  ordinaryReference: (id: string) => id === "002", destinationSupported: (id: string, rank: number) => id === "002" && rank === 2 };
const before = JSON.stringify(hunters);
const plan = planGroupRankUp([...hunters].reverse(), request, context);
assert.ok(!("error" in plan));
assert.deepEqual(plan.updates, [
  { inst_id: 1000001, rank: 2, rank_up_cnt: 0, exp: 0 },
  { inst_id: 1000002, rank: 2, rank_up_cnt: 0, exp: 0 },
]);
assert.deepEqual(plan.removedIds, [1000003, 1000004, 1000005, 1000006, 1000007, 1000008]);
assert.equal(plan.gold, 2600);
assert.equal(plan.updates.length + plan.removedIds.length, 8, "No created hunters or lost selected instances");
assert.deepEqual(plan.data.user, { gold: { cur: 2600 } });
assert.deepEqual(plan.data.card.target_list[0], { inst_id: 1000001, rank: { cur: 2 }, rank_up_cnt: { cur: 0 }, exp: { cur: 0 } });
assert.equal(JSON.stringify(hunters), before, "Planning must not destroy or alter an owned hunter");
assert.deepEqual(groupRankUpTerms(2, 1), { sourceRank: 2, sourceCount: 5, targetRank: 3, targetCount: 1, price: 2200 });
for (const bad of [{ price: "0" }, { src_cnt: "7" }, { target_rank: "3" }, { src_rank: "3" },
  { target_cnt: "0" }, { price: true }, { src_cnt: "8.0" }, { src_cnt: 0x100000000 }])
  assert.ok("error" in planGroupRankUp(hunters, { ...request, ...bad }, context));
assert.ok("error" in planGroupRankUp(hunters, request, { ...context, gold: 2399 }));
assert.ok("error" in planGroupRankUp(hunters, request, { ...context, ordinaryReference: () => false }));
assert.ok("error" in planGroupRankUp(hunters, request, { ...context, destinationSupported: () => false }));
assert.ok("error" in planGroupRankUp([...hunters, hunters[0]], request, context));
for (const field of ["lock", "rank_up_cnt", "awk_step", "awk_overcome", "overcome_cnt"] as const) {
  const changed = hunters.map((card, index) => index === 0 ? { ...card, [field]: 1 } : card);
  assert.ok("error" in planGroupRankUp(changed, request, context), `${field} hunter must not enter an automatic destructive batch`);
}
assert.ok("error" in planGroupRankUp(hunters, request, { ...context, protectedIds: new Set([1000008, 1000009]) }));
assert.equal(JSON.stringify(hunters), before);

const directory = mkdtempSync(path.join(tmpdir(), "blustone-group-rank-up-"));
const filename = path.join(directory, "state.json");
try {
  const state = new ServerState("http://localhost", filename);
  const auth = state.registerGuest({ device_id: "group-owner" }, {}).ret_data as any;
  const other = state.registerGuest({ device_id: "group-other" }, {}).ret_data as any;
  const game = state.gameFor(state.accountFor(auth, {}));
  const otherGame = state.gameFor(state.accountFor(other, {}));
  const otherBefore = JSON.stringify(otherGame);
  const copies = hunters.map((card, i) => ({ ...card, inst_id: 100 + i, skill_1_level: 3 }));
  game.recruited_cards.push(...copies);
  game.next_card_inst_id = 200;
  game.gold = 5000;
  const defense = game.decks.find((deck) => deck.type === 5);
  if (defense) defense.list = [108, 0, 0, 0, 0];
  else game.decks.push({ type: 5, list: [108, 0, 0, 0, 0] });
  const unrelated = JSON.stringify({ starter: game.starter_cards, decks: game.decks, items: game.items,
    stages: game.stage_achievements, leader: game.leader_inst_id, next: game.next_card_inst_id });
  assert.throws(() => gameResponse(state, "/gym/RankUpBundle", request), /authenticated account required/);
  assert.throws(() => gameResponse(state, "/gym/RankUpBundle", { ...request, otp: auth.otp, pvid: other.pvid }), /account|identity|PVID|pvid/i);
  const result = gameResponse(state, "/gym/RankUpBundle", { ...auth, ...request }) as any;
  assert.equal(result.result_code, 1);
  assert.deepEqual(result.ret_data.card.removed_inst_id_list, [102, 103, 104, 105, 106, 107]);
  assert.deepEqual(result.ret_data.card.target_list.map((card: any) => card.inst_id), [100, 101]);
  assert.equal(game.gold, 2600);
  assert.ok(game.recruited_cards.filter((card) => [100, 101].includes(card.inst_id)).every((card) => card.rank === 2 && card.skill_1_level === 3));
  assert.equal(game.recruited_cards.find((card) => card.inst_id === 108)!.rank, 1, "Defense roster hunter remains intact");
  assert.equal(JSON.stringify({ starter: game.starter_cards, decks: game.decks, items: game.items,
    stages: game.stage_achievements, leader: game.leader_inst_id, next: game.next_card_inst_id }), unrelated);
  assert.equal(JSON.stringify(otherGame), otherBefore);
  const restarted = new ServerState("http://localhost", filename);
  const savedGame = restarted.gameFor(restarted.accountFor(auth, {}));
  assert.equal(savedGame.gold, 2600);
  assert.deepEqual(savedGame.recruited_cards.map((card) => [card.inst_id, card.rank]), [[100, 2], [101, 2], [108, 1]]);
  const savedBytes = readFileSync(filename, "utf8");
  assert.notEqual((gameResponse(restarted, "/gym/RankUpBundle", { ...auth, ...request }) as any).result_code, 1,
    "A transport repeat cannot create hunters or consume protected leftovers without sufficient owned sources");
  assert.equal(readFileSync(filename, "utf8"), savedBytes);
  savedGame.recruited_cards.push(...copies.slice(0, 4).map((card, i) => ({ ...card, inst_id: 200 + i, rank: 1, rank_up_cnt: 0, exp: 0 })));
  savedGame.next_card_inst_id = 300;
  const one = { src_rank: "1", src_cnt: "4", target_rank: "2", target_cnt: "1", price: "1200" };
  const candidate = savedGame.recruited_cards.find((card) => card.inst_id === 200)!;
  candidate.mirage_remain_hp = 999;
  const carriedBefore = JSON.stringify(savedGame);
  assert.notEqual(restarted.groupRankUpCards({ ...auth, ...one }, {}).result_code, 1);
  assert.equal(JSON.stringify(savedGame), carriedBefore);
  candidate.mirage_remain_hp = 1000;
  const validBook = savedGame.card_book;
  savedGame.card_book = [...validBook, { ref_id: "", rank: 1 }];
  const malformedBookBefore = JSON.stringify(savedGame);
  assert.throws(() => restarted.groupRankUpCards({ ...auth, ...one }, {}), /Malformed card-book history/);
  assert.equal(JSON.stringify(savedGame), malformedBookBefore, "History projection failure precedes destructive changes");
  savedGame.card_book = validBook;
  for (const mode of ["battle", "search", "arena", "leader"] as const) {
    const originalLeader = savedGame.leader_inst_id;
    if (mode === "battle") savedGame.active_battle = { state: "active", deck_inst_ids: [200] } as any;
    if (mode === "search") savedGame.search.active = { deck_inst_ids: [200] } as any;
    if (mode === "arena") savedGame.arena.active = { deck_inst_ids: [200] } as any;
    if (mode === "leader") savedGame.leader_inst_id = 200;
    const protectedBefore = JSON.stringify(savedGame);
    assert.notEqual(restarted.groupRankUpCards({ ...auth, ...one }, {}).result_code, 1, mode + " commitment must be protected");
    assert.equal(JSON.stringify(savedGame), protectedBefore);
    savedGame.active_battle = null; savedGame.search.active = null; savedGame.arena.active = null;
    savedGame.leader_inst_id = originalLeader;
  }
  const rollbackBefore = JSON.stringify(savedGame);
  mkdirSync(`${filename}.tmp`);
  assert.throws(() => restarted.groupRankUpCards({ ...auth, ...one }, {}));
  assert.equal(JSON.stringify(savedGame), rollbackBefore, "Persistence failure restores every hunter, book and gold atomically");
  assert.equal(readFileSync(filename, "utf8"), savedBytes);
  rmSync(`${filename}.tmp`, { recursive: true });
  assert.equal(restarted.groupRankUpCards({ ...auth, ...one }, {}).result_code, 1);
  const secondRestart = new ServerState("http://localhost", filename);
  const final = secondRestart.gameFor(secondRestart.accountFor(auth, {}));
  assert.equal(final.gold, 1400);
  assert.equal(final.recruited_cards.find((card) => card.inst_id === 200)?.rank, 2);
  assert.ok([201, 202, 203].every((id) => !final.recruited_cards.some((card) => card.inst_id === id)));
} finally { rmSync(directory, { recursive: true, force: true }); }

const productionDirectory = mkdtempSync(path.join(tmpdir(), "blustone-group-production-"));
const productionFilename = path.join(productionDirectory, "state.json");
const realClock = Date.now;
try {
  const frozenNow = realClock(); Date.now = () => frozenNow;
  const state = new ProductionServerState("http://localhost", productionFilename);
  const auth = state.registerGuest({ device_id: "production-group-owner" }, {}).ret_data as any;
  const game = state.gameFor(state.accountFor(auth, {}));
  assert.equal(game.card_instance_namespace, 1);
  assert.ok(game.starter_cards.every((card) => card.inst_id >= 1000000));
  const sourceIds = [1000200, 1000201, 1000202, 1000203];
  game.recruited_cards.push(...sourceIds.map((id) => ({ ...cardInstance(id, "002", 1),
    lock: 0, skill_1_level: 3 })) as LocalCardInstance[]);
  game.next_card_inst_id = 1000300; game.gold = 5000;
  const starterBefore = JSON.stringify(game.starter_cards);
  const decksBefore = JSON.stringify(game.decks);
  const result = gameResponse(state, "/gym/RankUpBundle", { ...auth,
    src_rank: "1", src_cnt: "4", target_rank: "2", target_cnt: "1", price: "1200" }) as any;
  assert.equal(result.result_code, 1);
  assert.deepEqual(result.ret_data.card.removed_inst_id_list, sourceIds.slice(1));
  assert.deepEqual(result.ret_data.card.target_list[0], { inst_id: sourceIds[0], rank: { cur: 2 },
    rank_up_cnt: { cur: 0 }, exp: { cur: 0 } });
  const restarted = new ProductionServerState("http://localhost", productionFilename);
  const restored = restarted.gameFor(restarted.accountFor(auth, {}));
  assert.equal(restored.card_instance_namespace, 1);
  assert.deepEqual(restored.recruited_cards.map((card) => [card.inst_id, card.rank, card.skill_1_level]), [[1000200, 2, 3]]);
  assert.equal(restored.gold, 3800);
  assert.equal(restored.next_card_inst_id, 1000300, "Removed namespace IDs must never be reused");
  assert.equal(JSON.stringify(restored.starter_cards), starterBefore);
  assert.equal(JSON.stringify(restored.decks), decksBefore);
} finally {
  Date.now = realClock;
  rmSync(productionDirectory, { recursive: true, force: true });
}
console.log("Group rank-up: native UI counts/pricing, underlevel batches, identity conservation, original receipt, protection and atomic planning passed.");
