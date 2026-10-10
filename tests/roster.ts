import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ServerState } from "./legacy-state-fixture.js";
import { starterReference } from "../src/bootstrap.js";
import { trainingCurve } from "../src/training.js";

const directory = mkdtempSync(path.join(tmpdir(), "blustone-roster-"));
const priorRecruit = process.env.BLUSTONE_RECRUIT_CARD;
try {
  const filename = path.join(directory, "state.json");
  const state = new ServerState("http://localhost", filename);
  const guest = state.registerGuest({ device_id: "additive-roster" }, {}).ret_data as { otp: string };
  const auth = { otp: guest.otp };
  const game = state.gameFor(state.accountFor(auth, {}));
  const originals = JSON.stringify(game.starter_cards);
  const nene = starterReference.find((card) => card.base.id === "003")!;
  const tyltyl = starterReference.find((card) => card.base.id === "004")!;
  assert.deepEqual(starterReference.map((card) => [card.base.id, card.is_main]),
    [["001", 1], ["002", 0], ["003", 0], ["004", 0], ["005", 0], ["006", 0]], "native main flag is top-level row metadata");
  assert.deepEqual([nene.base.attr, nene.base.role], [2, 2]);
  assert.deepEqual([tyltyl.base.attr, tyltyl.base.role], [1, 4]);
  const gerard = starterReference.find((card) => card.base.id === "005")!;
  const sylvester = starterReference.find((card) => card.base.id === "006")!;
  assert.deepEqual([gerard.base.name, gerard.base.attr, gerard.base.role], ["Gerard", 2, 2]);
  assert.deepEqual([sylvester.base.name, sylvester.base.attr, sylvester.base.role], ["Sylvester", 1, 1]);
  assert.deepEqual(gerard.stat.map((row) => row.rank), [2, 3, 4, 5], "native rank2 source group uses minimum STAT rank");
  assert.equal(Math.min(...sylvester.stat.map((row) => row.rank)), 1);
  for (const reference of starterReference) for (const rank of (reference.base.id === "005" ? [2, 3, 4, 5] : [1, 2, 3, 4, 5])) {
    assert.ok(reference.stat.some((row) => row.rank === rank && row.awk_step === 0));
    assert.equal(trainingCurve({ ...game.starter_cards[0], rank, exp: 99 })?.level, 1);
    assert.equal(trainingCurve({ ...game.starter_cards[0], rank, exp: 100 })?.level, 2);
    assert.equal(trainingCurve({ ...game.starter_cards[0], rank, exp: 2900 })?.level, 30);
  }
  process.env.BLUSTONE_RECRUIT_CARD = "003";
  type Draw = { card: { inst_id: number; ref_id: string; rank: number; is_duplicate: number } };
  const first = state.gachaPremium({ ...auth, cnt: 1 }, {}).ret_data as Draw;
  const second = state.gachaPremium({ ...auth, cnt: 1 }, {}).ret_data as Draw;
  assert.deepEqual([first.card.ref_id, first.card.rank, first.card.is_duplicate], ["003", 3, 0]);
  assert.equal(second.card.is_duplicate, 1);
  process.env.BLUSTONE_RECRUIT_CARD = "004";
  const healer = state.gachaPremium({ ...auth, cnt: 1 }, {}).ret_data as Draw;
  assert.equal(healer.card.rank, 1);
  assert.equal(JSON.stringify(game.starter_cards), originals, "new references/grants must not alter original instances");
  assert.equal(state.setDeck({ ...auth, deck_info: [{ type: 1,
    list: [2, first.card.inst_id, 1, healer.card.inst_id] }] }, {}).result_code, 1);
  const restored = new ServerState("http://localhost", filename);
  const restoredGame = restored.gameFor(restored.accountFor(auth, {}));
  assert.equal(restored.partyProfileSnapshot(restored.accountFor(auth, {}).pvid).rank_2, 3);
  assert.ok(restoredGame.card_book.some((row) => row.ref_id === "003" && row.rank === 3));
  const other = restored.registerGuest({ device_id: "roster-other" }, {}).ret_data as { otp: string };
  const otherAuth = { otp: other.otp };
  assert.equal((restored.cardBook(otherAuth, {}).ret_data as Array<{ ref_id: string }>).
    some((row) => row.ref_id === "003"), false, "collection history belongs only to its account");
  const otherGame = restored.gameFor(restored.accountFor(otherAuth, {}));
  restored.setDeck({ ...otherAuth, deck_info: [{ type: 1, list: [1] }] }, {});
  restored.toggleCardLock({ ...otherAuth, target_inst_id: 2 }, {});
  otherGame.starter_cards[0].exp = 2900;
  const cappedGold = otherGame.gold;
  assert.notEqual(restored.trainCard({ ...otherAuth, target_inst_id: 1, source_inst_list: [2] }, {}).result_code, 1);
  assert.equal(otherGame.starter_cards.length, 2, "level30 refusal must not consume the offered source");
  assert.equal(otherGame.gold, cappedGold);
  // Consume all Nene instances through real training, not a ledger-only edit.
  restored.setDeck({ ...auth, deck_info: [{ type: 1, list: [2, 1] }] }, {});
  for (const card of [first.card, second.card]) restored.toggleCardLock({ ...auth, target_inst_id: card.inst_id }, {});
  assert.equal(restored.trainCard({ ...auth, target_inst_id: 2,
    source_inst_list: [first.card.inst_id, second.card.inst_id] }, {}).result_code, 1);
  const afterTraining = new ServerState("http://localhost", filename);
  const afterGame = afterTraining.gameFor(afterTraining.accountFor(auth, {}));
  assert.equal(afterGame.recruited_cards.some((card) => card.ref_id === "003"), false);
  assert.ok((afterTraining.cardBook(auth, {}).ret_data as Array<{ ref_id: string; rank: number }>).
    some((row) => row.ref_id === "003" && row.rank === 3), "consumption must not erase collection discovery");
  process.env.BLUSTONE_RECRUIT_CARD = "999";
  const before = [afterGame.gacha_iap_qty, afterGame.gacha_free_qty, afterGame.recruited_cards.length];
  assert.equal((afterTraining.gachaPremium({ ...auth, cnt: 1 }, {}).ret_data as { card: unknown }).card, null);
  assert.deepEqual([afterGame.gacha_iap_qty, afterGame.gacha_free_qty, afterGame.recruited_cards.length], before);
  console.log("Roster: additive roles, rank/level coverage, grant persistence, formations and durable collection history passed.");
} finally {
  if (priorRecruit === undefined) delete process.env.BLUSTONE_RECRUIT_CARD;
  else process.env.BLUSTONE_RECRUIT_CARD = priorRecruit;
  rmSync(directory, { recursive: true, force: true });
}
