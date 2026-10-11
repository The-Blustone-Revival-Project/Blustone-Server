import type { LocalCardInstance, LocalItemInstance } from "./game.js";

/** GetExtra.card_sell_profit rows consumed by CSRRefData.SetExtra Gdda744..
 * Gdda9fc. Final CardSell uses reference GetMinRank, NOT GetLevel.sell_price.
 * No original profit rows are currently recovered; absence never means free
 * disposal. Supplied rows/known item identities are mandatory evidence gates.
 */
export interface CardSellProfit { rank: number; profit_type: 2 | 5; profit_target: string; profit_qty: number }

export function cardSellProfitRows(raw: unknown): CardSellProfit[] {
  if (!Array.isArray(raw)) throw new TypeError("card_sell_profit must be an array");
  const ranks = new Set<number>();
  return raw.map((row) => {
    if (!row || typeof row !== "object" || !Number.isInteger(row.rank) || row.rank < 1 || row.rank > 5 ||
        ![2, 5].includes(row.profit_type) || typeof row.profit_target !== "string" ||
        !Number.isSafeInteger(row.profit_qty) || row.profit_qty < 0 || row.profit_qty > 0xffff_ffff ||
        (row.profit_type === 5 && row.profit_target.length === 0) || ranks.has(row.rank))
      throw new TypeError("Invalid or duplicate card_sell_profit row");
    ranks.add(row.rank);
    return { rank: row.rank, profit_type: row.profit_type, profit_target: row.profit_target, profit_qty: row.profit_qty };
  });
}

function soldIds(raw: unknown): number[] | null {
  let value: unknown = raw;
  if (typeof value === "string") { try { value = JSON.parse(value); } catch { return null; } }
  return Array.isArray(value) && value.length > 0 && value.every((id) => typeof id === "number" &&
    Number.isSafeInteger(id) && id > 0) && new Set(value).size === value.length ? value : null;
}

export function planHunterSale(cards: readonly LocalCardInstance[], payload: Record<string, unknown>, context: {
  gold: number; items: readonly LocalItemInstance[]; nextItemId: number;
  protectedIds: ReadonlySet<number>; profits: readonly CardSellProfit[];
  referenceMinRank: (refId: string) => number | undefined;
  knownItemIds: ReadonlySet<string>;
}) {
  const ids = soldIds(payload.inst_id_list);
  if (!ids) return { error: "Invalid native inst_id_list" };
  if (new Set(cards.map((card) => card.inst_id)).size !== cards.length) return { error: "Duplicate owned hunter identity" };
  let profits: CardSellProfit[];
  try { profits = cardSellProfitRows(context.profits); } catch { return { error: "Invalid published hunter sale profits" }; }
  if (!Number.isSafeInteger(context.gold) || context.gold < 0 || context.gold > 0xffff_ffff)
    return { error: "Invalid hunter sale wallet" };
  const rewards = new Map<string, number>();
  let gold = context.gold;
  for (const id of ids) {
    const card = cards.find((entry) => entry.inst_id === id);
    if (!card || Number(card.lock) !== 0 || context.protectedIds.has(id) ||
        (card.mirage_remain_hp !== undefined && Number(card.mirage_remain_hp) !== 1000))
      return { error: "Sale hunter is not owned, unlocked or free of commitments" };
    const minRank = context.referenceMinRank(card.ref_id);
    const row = profits.find((entry) => entry.rank === minRank);
    if (!row) return { error: "Original hunter sale profit is not reconstructed" };
    if (row.profit_type === 2) gold += row.profit_qty;
    else {
      if (!context.knownItemIds.has(row.profit_target)) return { error: "Hunter sale reward item identity is not reconstructed" };
      rewards.set(row.profit_target, (rewards.get(row.profit_target) ?? 0) + row.profit_qty);
    }
  }
  if (!Number.isSafeInteger(gold) || gold > 0xffff_ffff) return { error: "Hunter sale wallet overflow" };
  const items = context.items.map((item) => ({ ...item }));
  if (new Set(items.map((item) => item.inst_id)).size !== items.length || items.some((item) =>
    !Number.isSafeInteger(item.inst_id) || item.inst_id < 1 || typeof item.ref_id !== "string" ||
    !Number.isSafeInteger(item.qty) || item.qty < 0 || item.qty > 0xffff_ffff))
    return { error: "Invalid owned sale reward inventory" };
  let nextItemId = context.nextItemId;
  if (!Number.isSafeInteger(nextItemId) || nextItemId < 1 || items.some((item) => item.inst_id >= nextItemId))
    return { error: "Invalid next sale reward item identity" };
  const added: Array<{ inst_id: number; ref_id: string; added: number }> = [];
  for (const [refId, quantity] of rewards) {
    if (!Number.isSafeInteger(quantity) || quantity > 0xffff_ffff) return { error: "Hunter sale item delta overflow" };
    if (quantity === 0) continue;
    let item = items.find((entry) => entry.ref_id === refId);
    if (!item) {
      if (nextItemId >= Number.MAX_SAFE_INTEGER) return { error: "Hunter sale item identity overflow" };
      item = { inst_id: nextItemId++, ref_id: refId, qty: 0, lock: 0 }; items.push(item);
    }
    if (!Number.isSafeInteger(item.qty + quantity) || item.qty + quantity > 0xffff_ffff)
      return { error: "Hunter sale item quantity overflow" };
    item.qty += quantity;
    added.push({ inst_id: item.inst_id, ref_id: refId, added: quantity });
  }
  return { removedIds: ids, gold, items, nextItemId,
    // ParseSellCard removes its captured REQUEST vector after crediting rewards.
    // No invented removed list is needed in the response.
    data: { user: { gold: { cur: gold } }, item: added },
  };
}
