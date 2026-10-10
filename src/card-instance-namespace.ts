import type { LocalGameState } from "./game.js";

/** Local policy, not the original server allocator. Reserve native Episode serials. */
export const CARD_INSTANCE_BASE = 1_000_000;
/** Search's nonowned helper serial; never assign it to an owned hunter. */
export const CARD_INSTANCE_LIMIT = 900_000_001;

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const fail = (detail: string): never => { throw new Error(`Invalid card instance namespace: ${detail}`); };

/** Run before normalization: supplied malformed identities must not be filtered
 * or defaulted away. Absent legacy fields retain documented fallback behavior. */
export function validateRawCardInstanceRoster(raw: unknown): void {
  if (!record(raw)) return;
  if (raw.card_instance_namespace !== undefined && raw.card_instance_namespace !== 1)
    fail("unknown version marker");
  for (const name of ["leader_inst_id", "next_card_inst_id"] as const) {
    const id = raw[name];
    if (id !== undefined && (!Number.isSafeInteger(id) || Number(id) < 1 ||
        (name === "next_card_inst_id" ? Number(id) > CARD_INSTANCE_LIMIT : Number(id) >= CARD_INSTANCE_LIMIT)))
      fail(`malformed ${name}`);
  }
  const checkRawList = (list: unknown): void => {
    if (!Array.isArray(list) || list.some((id) => !Number.isSafeInteger(id) || id < 0 || id >= CARD_INSTANCE_LIMIT))
      fail("malformed raw card snapshot IDs");
  };
  if (raw.active_battle !== undefined && raw.active_battle !== null) {
    if (!record(raw.active_battle)) return fail("malformed active_battle");
    if (raw.active_battle.deck_inst_ids !== undefined) checkRawList(raw.active_battle.deck_inst_ids);
  }
  if (raw.decks !== undefined) {
    if (!Array.isArray(raw.decks)) return fail("malformed decks");
    for (const deck of raw.decks) {
      if (!record(deck)) return fail("malformed deck");
      checkRawList(deck.list);
    }
  }
  const ids = new Set<number>();
  for (const name of ["starter_cards", "recruited_cards"] as const) {
    const rows = raw[name];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) return fail(`${name} is not an array`);
    for (const row of rows) {
      if (!record(row) || !Number.isSafeInteger(row.inst_id) || Number(row.inst_id) < 1 ||
          Number(row.inst_id) >= CARD_INSTANCE_LIMIT || typeof row.ref_id !== "string" || !row.ref_id.length)
        fail(`malformed ${name} row`);
      const id = Number(row.inst_id);
      if (ids.has(id)) fail(`duplicate owned ID ${id}`);
      ids.add(id);
    }
  }
}

/** Pure, atomic identity migration. All non-card identities and values survive.
 * Historical battle snapshots may name consumed hunters below the allocator. */
export function migrateCardInstanceNamespace(game: LocalGameState): LocalGameState {
  validateRawCardInstanceRoster(game);
  const marker = (game as LocalGameState & { card_instance_namespace?: number }).card_instance_namespace;
  if (marker !== undefined && marker !== 1) fail("unknown version marker");
  const migrated = marker === 1;
  const next = game.next_card_inst_id;
  const minimum = migrated ? CARD_INSTANCE_BASE + 1 : 1;
  const maximum = migrated ? CARD_INSTANCE_LIMIT : CARD_INSTANCE_BASE;
  if (!Number.isSafeInteger(next) || next < minimum || next > maximum || (!migrated && next === maximum))
    fail("allocator outside namespace");
  const checkId = (id: number, zero = false): void => {
    if (zero && id === 0) return;
    if (!Number.isSafeInteger(id) || id < minimum || id >= maximum || id >= next)
      fail(`ID ${id} outside allocated namespace`);
  };
  const owned = new Set<number>();
  for (const row of [...game.starter_cards, ...game.recruited_cards]) {
    checkId(row.inst_id);
    owned.add(row.inst_id);
  }
  checkId(game.leader_inst_id);
  if (!owned.has(game.leader_inst_id)) fail("unowned leader");
  const checkList = (list: number[], requireOwned: boolean, zero: boolean): void => {
    if (!Array.isArray(list)) fail("card snapshot is not an array");
    for (const id of list) {
      checkId(id, zero);
      if (id !== 0 && requireOwned && !owned.has(id)) fail(`unowned deck ID ${id}`);
    }
  };
  if (!Array.isArray(game.decks)) fail("decks is not an array");
  for (const deck of game.decks) {
    if (!record(deck) || !Array.isArray(deck.list) || deck.list.length !== 5) fail("malformed deck");
    checkList(deck.list, true, true);
  }
  if (game.active_battle) checkList(game.active_battle.deck_inst_ids, game.active_battle.state === "active", true);
  if (game.arena.active) checkList(game.arena.active.deck_inst_ids, true, true);
  if (game.search.active) checkList(game.search.active.deck_inst_ids, true, true);
  if (game.search.last) checkList(game.search.last.attempt.deck_inst_ids, false, true);
  if (game.arena.last_result) {
    const cards = game.arena.last_result.receipt.card;
    if (!record(cards)) fail("malformed arena card receipt");
    for (const key of Object.keys(cards)) {
      if (!/^[1-9]\d*$/.test(key)) fail(`noncanonical arena card key ${key}`);
      checkId(Number(key));
    }
  }
  const copy = structuredClone(game) as LocalGameState & { card_instance_namespace?: number };
  const map = (id: number): number => migrated || id === 0 ? id : CARD_INSTANCE_BASE + id;
  for (const row of [...copy.starter_cards, ...copy.recruited_cards]) row.inst_id = map(row.inst_id);
  copy.leader_inst_id = map(copy.leader_inst_id);
  for (const deck of copy.decks) deck.list = deck.list.map(map);
  if (copy.active_battle) copy.active_battle.deck_inst_ids = copy.active_battle.deck_inst_ids.map(map);
  if (copy.arena.active) copy.arena.active.deck_inst_ids = copy.arena.active.deck_inst_ids.map(map);
  if (copy.search.active) copy.search.active.deck_inst_ids = copy.search.active.deck_inst_ids.map(map);
  if (copy.search.last) copy.search.last.attempt.deck_inst_ids = copy.search.last.attempt.deck_inst_ids.map(map);
  if (copy.arena.last_result) copy.arena.last_result.receipt.card = Object.fromEntries(
    Object.entries(copy.arena.last_result.receipt.card).map(([id, pair]) => [String(map(Number(id))), pair]));
  copy.next_card_inst_id = map(next);
  copy.card_instance_namespace = 1;
  return copy;
}
