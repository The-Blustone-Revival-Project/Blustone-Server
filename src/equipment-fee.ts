/** Recovered popup payment choice, not a global PRICE_TYPE enum registry. */
export const EQUIPMENT_POPUP_GOLD_PRICE_TYPE = 2;
const UINT_MAX = 0xffff_ffff;
function uint(value: number, name: string): number {
  if (!Number.isInteger(value) || value < 0 || value > UINT_MAX) throw new TypeError("Invalid native uint32 " + name);
  return value;
}

/** Pure original CalcBonusSaleValue arithmetic after benefit selection.
 * mode1 is a per-thousand multiplier, not percent discount subtraction.
 * Native VCVT.U32.F32 truncates and saturates. Other modes ADD modulo2^32.
 * This does not reconstruct Guild eligibility or supply benefit magnitudes. */
export function nativeGuildSaleValue(price: number, selected: { mode: number; value: number } | null): number {
  uint(price, "price");
  if (selected === null) return price; // No FP conversion in native null path.
  uint(selected.value, "benefit value");
  if (!Number.isInteger(selected.mode) || selected.mode < 0 || selected.mode > 255) throw new TypeError("Invalid native benefit mode byte");
  if (selected.mode !== 1) return (price + selected.value) >>> 0;
  const ratio = Math.fround(Math.fround(selected.value) / Math.fround(1000));
  const result = Math.fround(ratio * Math.fround(price));
  return Math.min(UINT_MAX, Math.max(0, Math.trunc(result)));
}

/** Safe no-affiliation branch for a supplied quote. No default price, Guild
 * creation, benefit lookup or alternate currency settlement is fabricated. */
export function noGuildEquipmentLevelFee(quote: { price_type: number; price: number }, guildId: number): number {
  if (guildId !== 0) throw new TypeError("Guild equipment fee qualification is outside the no-Guild workflow");
  if (quote.price_type !== EQUIPMENT_POPUP_GOLD_PRICE_TYPE) throw new TypeError("Equipment popup payment requires recovered price_type2 gold");
  return nativeGuildSaleValue(quote.price, null);
}
