/** Original CSRGem reference/owned join and CalcSetEffect; no configured jewels
 * or balance records. See docs/gem-combinations-native.md for evidence/limits. */
export const GEM_STAT_KEYS = ["hp", "atk", "def", "spd", "crt_chance", "crt_dmg", "penetration",
  "block_chance", "block_dec_dmg", "attr_enhance", "attr_resist", "hp_regen", "hp_up", "atk_up", "def_up"] as const;
export type GemStatKey = typeof GEM_STAT_KEYS[number];
export type GemSetStats = Record<GemStatKey, number>;
export const GEM_FAMILY_NAMES = ["HP", "ATK", "DEF", "critical chance", "critical damage", "block chance",
  "block damage reduction", "attribute enhancement", "attribute resistance", "speed", "HP regeneration", "penetration"] as const;
const divided = new Set<GemStatKey>(["hp", "atk", "def", "crt_dmg", "block_dec_dmg", "attr_enhance", "attr_resist", "hp_regen"]);
export interface GemCombination { id: number; count: number; stats: GemSetStats }
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected gem reference object");
  return value as Record<string, unknown>;
}
function uint(value: unknown, label: string, positive = false): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < (positive ? 1 : 0) || value > 0xffff_ffff)
    throw new TypeError(`Invalid gem ${label}`);
  return value;
}
export function gemFamilyName(id: number): typeof GEM_FAMILY_NAMES[number] | undefined {
  return Number.isInteger(id) && id >= 1 && id <= 12 ? GEM_FAMILY_NAMES[id - 1] : undefined;
}
/** Canonical strict admission is replica policy: native coercions/duplicate
 * first-match behavior are not safe sources of original economic data. */
export function parseGemCombinations(envelope: unknown): GemCombination[] {
  const response = object(envelope);
  if (response.result_code !== 1 || !Array.isArray(response.ret_data) || !response.ret_data.length)
    throw new TypeError("Recovered gem combinations require successful nonempty ret_data");
  const seen = new Set<number>();
  return response.ret_data.map((raw) => {
    const row = object(raw), id = uint(row.id, "id", true), count = uint(row.count, "count", true);
    if (seen.has(id)) throw new TypeError("Duplicate gem combination id has ambiguous native first-match behavior");
    seen.add(id);
    uint(row.rank, "rank"); uint(row.awk_step, "awk_step");
    const stats = {} as GemSetStats;
    for (const key of GEM_STAT_KEYS) {
      const value = row[key];
      if (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value)))
        throw new TypeError(`Gem combination ${key} requires finite numeric string`);
      stats[key] = Number(value) / (divided.has(key) ? 100 : 1);
    }
    return { id, count, stats };
  });
}
/** Caller supplies only this hunter's equipped instances. IDs here are the
 * resolved GemRef.set_effect_id, NOT instance IDs or UI help line ordinals.
 * Missing references skip, like native. Returned order is replica canonical
 * ascending ID; native post-sort comparator has not been recovered. */
export function calculateGemSets(equippedFamilyIds: readonly number[], combinations: readonly GemCombination[]) {
  const occurrences = new Map<number, number>(), refs = new Map<number, GemCombination>();
  for (const ref of combinations) {
    uint(ref.id, "id", true); uint(ref.count, "count", true);
    if (refs.has(ref.id)) throw new TypeError("Duplicate gem combination id");
    for (const key of GEM_STAT_KEYS) if (!Number.isFinite(ref.stats[key])) throw new TypeError(`Invalid normalized gem ${key}`);
    refs.set(ref.id, ref);
  }
  for (const id of equippedFamilyIds) {
    uint(id, "equipped family");
    occurrences.set(id, (occurrences.get(id) ?? 0) + 1);
  }
  const applied: { id: number; sets: number }[] = [];
  const stats = Object.fromEntries(GEM_STAT_KEYS.map((key) => [key, 0])) as GemSetStats;
  for (const [id, pieces] of [...occurrences].sort((a, b) => a[0] - b[0])) {
    const ref = refs.get(id);
    if (!ref) continue;
    const sets = Math.floor(pieces / ref.count);
    if (!sets) continue;
    applied.push({ id, sets });
    for (const key of GEM_STAT_KEYS) {
      stats[key] += ref.stats[key] * sets;
      if (!Number.isFinite(stats[key])) throw new TypeError("Gem set total overflow");
    }
  }
  return { applied, stats };
}
