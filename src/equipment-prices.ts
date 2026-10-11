/** Native CSRRefData.SetEquipLevelUpPrice Gddc584 and SetEquipRankUpPrice
 * Gddcc20 iterate an envelope's ret_data collection (array is supported; the
 * native iterator also has object branches). Canonical array admission here is
 * replica policy, not proof of a captured production container. Independent tables,
 * not ordinary Gym100/1000 prices. No original numeric records are recovered.
 */
export interface EquipmentLevelPrice {
  level: number; price_type: number; price: number;
  item1_qty: number; item1_ref_id: string; item2_qty: number; item2_ref_id: string;
  item3_qty: number; item3_ref_id: string; item4_qty: number; item4_ref_id: string;
}
export interface EquipmentRankPrice {
  rank: number; attr: number; price_type: number; price: number;
  item_qty: number; item_ref_id: string; card_qty: number;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected equipment price object");
  return value as Record<string, unknown>;
}
function integer(row: Record<string, unknown>, key: string, positive = false): number {
  const value = row[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value < (positive ? 1 : 0) || value > 0x7fff_ffff)
    throw new TypeError(`Invalid signed32 equipment ${key}`);
  return value;
}
function item(row: Record<string, unknown>, qtyKey: string, refKey: string, knownItems: ReadonlySet<string>) {
  const qty = integer(row, qtyKey), ref = row[refKey];
  if (typeof ref !== "string" || (qty > 0 && (!ref || !knownItems.has(ref))))
    throw new TypeError(`Equipment ${refKey} has missing or unknown required item identity`);
  // Empty+zero slots are deliberate no-source slots; unknown positive materials
  // never become guessed prices or disappear from the validated record.
  return { qty, ref };
}
function rows(envelope: unknown): Record<string, unknown>[] {
  const response = record(envelope);
  if (response.result_code !== 1 || !Array.isArray(response.ret_data) || response.ret_data.length === 0)
    throw new TypeError("Original equipment prices require successful nonempty ret_data rows");
  return response.ret_data.map(record);
}

export function equipmentLevelPrices(envelope: unknown, knownItems: ReadonlySet<string>): EquipmentLevelPrice[] {
  const seen = new Set<number>();
  return rows(envelope).map((row) => {
    const level = integer(row, "level", true);
    if (seen.has(level)) throw new TypeError("Duplicate equipment level would leave a first-row native price ambiguity");
    seen.add(level);
    const slots = [1, 2, 3, 4].map((n) => item(row, `item${n}_qty`, `item${n}_ref_id`, knownItems));
    return { level, price_type: integer(row, "price_type"), price: integer(row, "price"),
      item1_qty: slots[0].qty, item1_ref_id: slots[0].ref,
      item2_qty: slots[1].qty, item2_ref_id: slots[1].ref,
      item3_qty: slots[2].qty, item3_ref_id: slots[2].ref,
      item4_qty: slots[3].qty, item4_ref_id: slots[3].ref };
  });
}

export function equipmentRankPrices(envelope: unknown, knownItems: ReadonlySet<string>): EquipmentRankPrice[] {
  const seen = new Set<string>();
  return rows(envelope).map((row) => {
    const rank = integer(row, "rank", true), attr = integer(row, "attr");
    const key = `${rank}:${attr}`;
    if (seen.has(key)) throw new TypeError("Duplicate rank/attribute equipment price");
    seen.add(key);
    const source = item(row, "item_qty", "item_ref_id", knownItems);
    return { rank, attr, price_type: integer(row, "price_type"), price: integer(row, "price"),
      item_qty: source.qty, item_ref_id: source.ref, card_qty: integer(row, "card_qty") };
  });
}

/** Missing lookup stays unavailable: native level lookup asserts on a miss,
 * and native rank lookup returns an empty record. Neither permits fallback
 * gold prices or an inferred payment-type/wallet mapping.
 */
export const equipmentLevelPriceAt = (table: readonly EquipmentLevelPrice[], level: number) =>
  table.find((row) => row.level === level);
export const equipmentRankPriceAt = (table: readonly EquipmentRankPrice[], rank: number, attr: number) =>
  table.find((row) => row.rank === rank && row.attr === attr);
