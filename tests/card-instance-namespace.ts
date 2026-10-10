import assert from "node:assert/strict";
import { createLocalGameState, type LocalGameState } from "../src/game.js";
import { CARD_INSTANCE_BASE as BASE, CARD_INSTANCE_LIMIT as LIMIT,
  migrateCardInstanceNamespace as migrate, validateRawCardInstanceRoster } from "../src/card-instance-namespace.js";

function legacy(): LocalGameState {
  const game = createLocalGameState();
  delete (game as LocalGameState & { card_instance_namespace?: number }).card_instance_namespace;
  game.starter_cards = [{ inst_id: 1, ref_id: "001", exp: 400, rank: 3, lock: 1 }, { inst_id: 5, ref_id: "004", exp: 91 }];
  game.recruited_cards = [{ inst_id: 17, ref_id: "017", exp: 15, skill1: 4 }];
  game.leader_inst_id = 1;
  game.next_card_inst_id = 80; // Preserve consumed IDs and allocator gaps.
  game.decks = [{ type: 1, list: [5, 1, 17, 0, 0] }, { type: 4, list: [17, 0, 1, 0, 0] }];
  game.items = [{ inst_id: 5, ref_id: "RP1", qty: 7, lock: 0 }];
  game.next_item_inst_id = 80;
  game.active_battle = { battle_id: "preserved", stage_id: "N001", state: "completed", started_at: 100,
    completed_at: 200, deck_inst_ids: [1, 7, 0], enemy_count: 3, result: 1, stars: 2, ap_spent: 1, ap_refund_cap: 70 };
  game.arena.active = { target_pvid: 9_000_001, bid: 1, started_at: 300, deck_inst_ids: [5, 17] };
  game.arena.last_result = { signature: "a".repeat(64), receipt: { user: { battle: {}, honor: { prev: 0, cur: 1 } },
    card: { "7": { prev: 3, cur: 8 }, "17": { prev: 10, cur: 12 } } } };
  const attempt = { log_id: 1, ref_id: "017", stage_id: "NS002", helper_id: "original-helper",
    started_at: 400, deck_inst_ids: [1, 7], capsule_inst_id: 5, onboarding: false, guided: false, wave_count: 2 };
  game.search.active = structuredClone(attempt);
  game.search.active.deck_inst_ids = [1, 17];
  game.search.last = { attempt: structuredClone(attempt), receipt: { wave: { cleared_wave: 2, max_wave: 2 },
    consume_result: [], item: [{ inst_id: 5, ref_id: "local_sylvester_trace", added: 1 }], gem: [], special: [],
    reward_item: [{ ref_id: "local_sylvester_trace", qty: 1 }] } };
  return game;
}

const original = legacy(), before = structuredClone(original), mapped = migrate(original);
assert.deepEqual(original, before, "input is never mutated");
const expected = structuredClone(before) as LocalGameState & { card_instance_namespace?: number };
for (const row of [...expected.starter_cards, ...expected.recruited_cards]) row.inst_id += BASE;
expected.leader_inst_id += BASE;
for (const deck of expected.decks) deck.list = deck.list.map((id) => id ? id + BASE : 0);
expected.active_battle!.deck_inst_ids = [BASE + 1, BASE + 7, 0];
expected.arena.active!.deck_inst_ids = [BASE + 5, BASE + 17];
expected.arena.last_result!.receipt.card = { [BASE + 7]: { prev: 3, cur: 8 }, [BASE + 17]: { prev: 10, cur: 12 } };
expected.search.active!.deck_inst_ids = [BASE + 1, BASE + 17];
expected.search.last!.attempt.deck_inst_ids = [BASE + 1, BASE + 7];
expected.next_card_inst_id += BASE;
expected.card_instance_namespace = 1;
assert.deepEqual(mapped, expected, "only explicit card identities change; item/capsule/helper identities and all other data survive");
assert.deepEqual(migrate(mapped), mapped, "marker1 is idempotent");
assert.notEqual(migrate(mapped), mapped, "idempotent result remains independently cloned");
mapped.starter_cards[0].exp = 0;
assert.equal(original.starter_cards[0].exp, 400);

function rejects(change: (game: LocalGameState) => void) {
  const game = legacy(); change(game);
  const snapshot = structuredClone(game);
  assert.throws(() => migrate(game), /Invalid card instance namespace/);
  assert.deepEqual(game, snapshot, "refusal is atomic");
}
rejects((game) => { game.recruited_cards[0].inst_id += BASE; });
rejects((game) => { game.leader_inst_id = 7; });
rejects((game) => { game.decks[1].list[0] = 7; });
rejects((game) => { game.next_card_inst_id = 17; });
rejects((game) => { game.next_card_inst_id = BASE; });
rejects((game) => { game.starter_cards[1].inst_id = 1; });
rejects((game) => { game.search.last!.attempt.deck_inst_ids = [80]; });
rejects((game) => { game.search.active!.deck_inst_ids = [7]; });
rejects((game) => { game.arena.active!.deck_inst_ids = [7]; });
rejects((game) => { game.active_battle!.state = "active"; });
rejects((game) => { game.arena.last_result!.receipt.card = { "07": { prev: 0, cur: 1 } }; });
rejects((game) => { game.arena.last_result!.receipt.card = { "0": { prev: 0, cur: 1 } }; });
rejects((game) => { game.arena.last_result!.receipt.card = { "9007199254740993": { prev: 0, cur: 1 } }; });
const high = migrate(legacy());
high.next_card_inst_id = LIMIT;
assert.equal(migrate(high).next_card_inst_id, LIMIT, "exhausted counter can be represented without handing out reserved helper ID");
high.recruited_cards[0].inst_id = LIMIT;
assert.throws(() => migrate(high), /Invalid card instance namespace/);
const ambiguous = migrate(legacy());
delete (ambiguous as LocalGameState & { card_instance_namespace?: number }).card_instance_namespace;
assert.throws(() => migrate(ambiguous), /Invalid card instance namespace/, "unmarked high IDs cannot be guessed");
const marker = legacy();
Object.assign(marker, { card_instance_namespace: 2 }); // Deliberately corrupt persisted input.
assert.throws(() => migrate(marker), /unknown version/);

validateRawCardInstanceRoster({});
validateRawCardInstanceRoster({ active_battle: null });
validateRawCardInstanceRoster({ active_battle: {} }); // Missing legacy list may normalize to [].
validateRawCardInstanceRoster({ card_instance_namespace: 1, next_card_inst_id: LIMIT });
for (const raw of [{ starter_cards: null }, { recruited_cards: {} }, { starter_cards: [null] },
  { recruited_cards: [{ inst_id: 0, ref_id: "001" }] }, { starter_cards: [{ inst_id: 1, ref_id: "" }] },
  { starter_cards: [{ inst_id: 1, ref_id: "001" }], recruited_cards: [{ inst_id: 1, ref_id: "004" }] },
  { next_card_inst_id: "99" }, { leader_inst_id: "1" }, { leader_inst_id: 0 }, { leader_inst_id: LIMIT },
  { next_card_inst_id: LIMIT + 1 }, { next_card_inst_id: null }, { card_instance_namespace: 2 },
  { card_instance_namespace: "1" }, { card_instance_namespace: null }, { active_battle: "bad" },
  { active_battle: [] }, { active_battle: { deck_inst_ids: [1, "2"] } },
  { active_battle: { deck_inst_ids: [1, -1] } }, { active_battle: { deck_inst_ids: [LIMIT] } },
  { active_battle: { deck_inst_ids: [NaN] } }, { active_battle: { deck_inst_ids: {} } },
  { decks: [{ type: 1, list: [1, "2", 0, 0, 0] }] }, { decks: null }]) {
  const before = structuredClone(raw);
  assert.throws(() => validateRawCardInstanceRoster(raw), /Invalid card instance namespace/);
  assert.deepEqual(raw, before, "raw refusal does not modify corrupt evidence");
}
console.log("Card namespace: pure migration, complete reference mapping, gaps, idempotence and atomic refusal passed.");
