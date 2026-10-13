/** Explicit supplier-owned GetItem definitions, not resource-derived fish IDs.
 * Native use_type17 is recovered; original other metadata/art remains missing.
 * This metadata publication never creates inventory or acquisition. */
export interface FishingItemReference {
  id: string; name: string; desc: string; thumbnail_id: string; effect: string;
  rank: number; use_type: number; sell_price: number; collect_qty: number;
}
export function configuredFishingItems(raw: unknown, reservedIds: ReadonlySet<string>): readonly Readonly<FishingItemReference>[] {
  if (!Array.isArray(raw)) throw new TypeError("Fishing items require an explicit array");
  const seen = new Set<string>();
  const rows = raw.map(value => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected fishing item object");
    const row = value as Record<string, unknown>, item = {} as FishingItemReference;
    for (const key of ["id", "name", "desc", "thumbnail_id", "effect"] as const) {
      if (typeof row[key] !== "string" || (key === "id" && !row[key]) ||
        Buffer.from(row[key],"utf8").toString("utf8")!==row[key]) throw new TypeError(`Invalid fishing item ${key}`);
      item[key] = row[key];
    }
    if (reservedIds.has(item.id) || seen.has(item.id)) throw new TypeError("Duplicate or unrelated reserved fishing item identity");
    seen.add(item.id);
    for (const key of ["rank", "use_type", "sell_price", "collect_qty"] as const) {
      const number = row[key];
      if (typeof number !== "number" || !Number.isInteger(number) || number < 0 || number > 0xffff_ffff)
        throw new TypeError(`Fishing item ${key} must be explicit uint32`);
      item[key] = number;
    }
    // Native fish metadata type17: AddInven Gb2e780 and ShopSell G10471bc.
    // Type0 remains the prior neutral local read fixture, with no fish behavior.
    // Types1/3 participate in unrelated fuel/Hunter trace postprocessing.
    if(item.use_type!==17 && (item.use_type!==0 || item.effect!=="" || item.collect_qty!==0))
      throw new TypeError("Fishing items require native use_type17 or neutral local use_type0/empty effect/collect_qty0");
    return Object.freeze(item);
  });
  return Object.freeze(rows);
}
