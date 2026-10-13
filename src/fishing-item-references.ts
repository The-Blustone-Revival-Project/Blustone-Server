/** Explicit supplier-owned GetItem definitions, not resource-derived fish IDs.
 * Original metadata/use_type/art assignments remain missing. These references
 * enable catalogue reads only; they never create inventory or acquisition. */
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
      if (typeof row[key] !== "string" || (key === "id" && !row[key])) throw new TypeError(`Invalid fishing item ${key}`);
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
    // Local read-only admission. Types1/3 participate in fuel/Hunter trace
    // postprocessing even without inventory grants; original fish type unknown.
    if(item.use_type!==0 || item.effect!=="" || item.collect_qty!==0)
      throw new TypeError("Fishing catalogue items require neutral use_type0, empty effect and collect_qty0");
    return Object.freeze(item);
  });
  return Object.freeze(rows);
}
