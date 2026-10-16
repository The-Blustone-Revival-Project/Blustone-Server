import {hunterCapacity} from "./dorm-expansion.js";
import { cardInstance, recruitBirthRanks, starterReference } from "./bootstrap.js";
import { mergeCardBook, type LocalGameState } from "./game.js";
import { HUNTER_TRACE_ITEMS } from "./hunter-traces.js";
import { SEARCH_HELPER_SERIAL } from "./search-helpers.js";
import { CARD_INSTANCE_LIMIT } from "./card-instance-namespace.js";

// Compatibility export for the unchanged LOCAL initial capacity.
export const LOCAL_CARD_CAPACITY = 100;
const integer = (raw: unknown) => typeof raw === "number" ? raw :
  typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;

/** RequestShardExchange: cnt is HUNTERS; UseItem consumes trace qty deltas.
 * Thresholds use the published local fixture or selected historical image
 * projection; birth stats and original final economics remain incomplete.
 * No request nonce exists: a repeated valid request is another paid exchange. */
export function exchangeHunterTraces(payload: Record<string, unknown>, game: LocalGameState,
    persist: () => void): { data: Record<string, unknown> } | { error: string; code?: number } {
  const id = integer(payload.item_inst_id), count = integer(payload.cnt);
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(count) || count < 1 || count > 0xffffffff)
    return { error: "Invalid trace instance or hunter count" };
  if (game.active_battle || game.arena.active || game.search.active)
    return { error: "Finish the active combat before recruiting a hunter" };
  const item = game.items.find((row) => row.inst_id === id);
  const trace = HUNTER_TRACE_ITEMS.find((row) => row.id === item?.ref_id);
  if (!item || item.lock !== 0 || !trace) return { error: "Owned unlocked hunter traces required" };
  const reference = starterReference.find((row) => row.base.id === trace.cardId && row.base.is_main === 0);
  const rank = recruitBirthRanks[trace.cardId];
  if (!reference || !Number.isSafeInteger(rank) || !reference.stat.some((row) => row.rank === rank) ||
      !Number.isSafeInteger(trace.collect_qty) || trace.collect_qty < 1)
    return { error: "Trace hunter reference is unavailable" };
  const debit = count * trace.collect_qty;
  if (!Number.isSafeInteger(debit) || !Number.isSafeInteger(item.qty) || item.qty < debit)
    return { error: "Insufficient traces for the requested hunters" };
  const owned = [...game.starter_cards, ...game.recruited_cards];
  if (owned.length + count > hunterCapacity(game)) return { error: "Hunter inventory is full", code: 10027 };
  const next = Math.max(game.next_card_inst_id, ...owned.map((row) => row.inst_id + 1));
  const end = next + count;
  if (!Number.isSafeInteger(next) || next < 1 || !Number.isSafeInteger(end) ||
      end > Math.min(CARD_INSTANCE_LIMIT, SEARCH_HELPER_SERIAL))
    return { error: "Hunter instance capacity reached" };
  const cards = Array.from({ length: count }, (_, index) => cardInstance(next + index, trace.cardId, rank));
  // Prepare the replacement book before touching earned inventory. Preserve
  // existing row/array identities when the durable write or rename fails.
  const book = mergeCardBook(game.card_book, cards), previousBook = game.card_book;
  const previousQuantity = item.qty, previousCount = game.recruited_cards.length;
  const previousAllocator = game.next_card_inst_id;
  try {
    item.qty -= debit;
    game.recruited_cards.push(...cards);
    game.card_book = book;
    game.next_card_inst_id = end;
    persist();
  } catch (error) {
    item.qty = previousQuantity;
    game.recruited_cards.splice(previousCount);
    game.card_book = previousBook;
    game.next_card_inst_id = previousAllocator;
    throw error;
  }
  // CSRAchieve::ParseLobbyEnter G844918 always reads the first as a string;
  // an empty string leaves its prior gate unchanged, empty lists iterate no rows.
  return { data: { card: cards, consumed_inst_list: [{ inst_id: item.inst_id, qty: debit }],
    dailyquest_min_stage: "", daily_quest: [], linear_quest: [] } };
}
