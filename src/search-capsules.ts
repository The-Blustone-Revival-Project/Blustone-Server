import type { LocalGameState } from "./game.js";

/** Recovered literal used directly by Search's GetInstItemCnt. Original
 * metadata/drop rates are missing. Local policy: one capsule per accepted
 * normal campaign victory, including a new replay attempt; no retroactive grant. */
export const SEARCH_CAPSULE_ID = "AIRSHIP_TICKET";
export const searchCapsuleReference = {
  id: SEARCH_CAPSULE_ID, name: "Helium Capsule", rank: 1, use_type: 0,
  // Original Search uses IT_TK_SE_S for AIRSHIP_TICKET; original UI_ITEM has
  // this150x150 member of the same family. Full-size selection is a local
  // display choice, not a recovered original GetItem metadata assignment.
  sell_price: 0, thumbnail_id: "IT_TK_SE", effect: "", collect_qty: 0,
  desc: "Earned from normal campaign victories. One per victory is a local revival rule; original drop rates are unknown.",
};

export function explicitSearchCapsuleVictory(raw: unknown): boolean {
  if (typeof raw === "string") { try { raw = JSON.parse(raw); } catch { return false; } }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const clear = (raw as Record<string, unknown>).clear;
  return clear === 1 || clear === "1" || clear === true;
}

/** Caller establishes a live matching battle and native clear before calling.
 * Returned added is the delta consumed by native CSRInventory::AddItem. */
export function earnSearchCapsule(game: LocalGameState) {
  let item = game.items.find((row) => row.ref_id === SEARCH_CAPSULE_ID && row.lock === 0);
  if (item) {
    if (!Number.isSafeInteger(item.qty) || item.qty < 0 || item.qty >= 0xffffffff) return [];
    item.qty += 1;
  } else {
    if (!Number.isSafeInteger(game.next_item_inst_id) || game.next_item_inst_id >= Number.MAX_SAFE_INTEGER) return [];
    item = { inst_id: game.next_item_inst_id++, ref_id: SEARCH_CAPSULE_ID, qty: 1, lock: 0 };
    game.items.push(item);
  }
  return [{ inst_id: item.inst_id, ref_id: item.ref_id, added: 1 }];
}
