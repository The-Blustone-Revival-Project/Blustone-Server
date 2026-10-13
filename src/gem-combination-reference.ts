import { GEM_STAT_KEYS, parseGemCombinations } from "./gem-combinations.js";

/** Explicit wire tables only. UI help text and estimated magnitudes do not
 * constitute original server rows. Keep decimal strings unscaled on the wire:
 * the native parser performs its own mode1/percentage normalization. */
export function configuredGemCombinations(raw: unknown): readonly Readonly<Record<string, string | number>>[] {
  if (!Array.isArray(raw)) throw new TypeError("Gem combinations require a reference array");
  if (!raw.length) return Object.freeze([]);
  parseGemCombinations({ result_code: 1, ret_data: raw });
  const keys = ["id", "count", "rank", "awk_step", ...GEM_STAT_KEYS];
  return Object.freeze(raw.map(row => Object.freeze(Object.fromEntries(keys.map(key => [key, row[key]])))));
}
