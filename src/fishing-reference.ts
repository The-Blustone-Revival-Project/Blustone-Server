/** Original final-client identities; these are not complete item definitions.
 * GetBait G b2efd0 selects LU001 for zero, LU003 for nonzero. The purchase
 * popup passes that string directly to GetItemData (G cfc96c) and global-shop
 * lookups. No original name/icon/effect/price/quantity is inferred here.
 */
export const FISHING_BAIT_ITEM_IDS = Object.freeze({ 0: "LU001", 1: "LU003" } as const);

/** Partial main-scene display binding, NOT a GetItem/global-shop row.
 * OnButtonClick's BT_BAIT2 path queries GetBait(1); original FISH_MAIN places
 * TX_FI_BA2 under that button and the exported EN UI text is High-quality Bait.
 * BT_MY_BAIT2 is the selector1 purchase control, whose own badge uses BAIT02_S.
 * Item thumbnail_id, rank, effect, quantity and all prices remain unknown.
 */
export const FISHING_HIGH_QUALITY_BAIT_DISPLAY = Object.freeze({
  item_id: "LU003",
  lure_id: "LU003",
  selector: 1,
  main_button: "BT_BAIT2",
  inventory_button: "BT_MY_BAIT2",
  main_label_en: "High-quality Bait",
  inventory_badge_resource: "BAIT02_S",
} as const);

export function fishingBaitItemId(lure: 0 | 1): "LU001" | "LU003" {
  // The native selector treats every nonzero integer alike. Restrict the server
  // to these two supported selectors; this is local policy, not enum recovery.
  if (lure !== 0 && lure !== 1) throw new Error("Unsupported fishing lure selector");
  return FISHING_BAIT_ITEM_IDS[lure];
}

export interface FishingInventoryReplacement {
  fish_id: string;
  b_cnt: number;
  s_cnt: number;
  g_cnt: number;
}

/** Encode ParseSell.sell_result's *absolute* fish inventory replacement.
 * UpdateInven G b2eb9c consumes one object, upserts by fish_id and replaces the
 * three count words. This differs from sale.item[]'s removal deltas. Keeping
 * identical count receipts identical prevents accidental additive encoding;
 * callers still need authoritative ownership, prices and retry handling.
 * This helper does not create a catch, credit gold or enable settlement.
 */
export function fishingInventoryReplacement(
  fishId: string,
  counts: Readonly<{ b_cnt: number; s_cnt: number; g_cnt: number }>,
): FishingInventoryReplacement {
  if (typeof fishId !== "string" || fishId.length === 0) throw new Error("A fish identity is required");
  for (const key of ["b_cnt", "s_cnt", "g_cnt"] as const) {
    // The native bronze/silver conversion is signed32; gold is unsigned32.
    // Nonnegative counts are server policy, not validation in the receiver.
    const limit = key === "g_cnt" ? 0xffffffff : 0x7fffffff;
    if (!Number.isInteger(counts[key]) || counts[key] < 0 || counts[key] > limit) {
      throw new Error(`Invalid fishing inventory ${key}`);
    }
  }
  return { fish_id: fishId, b_cnt: counts.b_cnt, s_cnt: counts.s_cnt, g_cnt: counts.g_cnt };
}
