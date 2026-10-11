import { GEM_STAT_KEYS, type GemSetStats } from "./gem-combinations.js";

/** Pure original equipment grammar/arithmetic, not configured original rows. */
export interface HunterEquipmentReference { id: string; slot: 0 | 1 | 2; rank: number; awk_step: number; stats: GemSetStats }
const unchanged = new Set(["spd", "crt_chance", "penetration", "block_chance"]);
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("Expected equipment reference row");
  return value as Record<string, unknown>;
}
function integer(value: unknown, key: string, min: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > 0x7fff_ffff)
    throw new TypeError(`Invalid equipment ${key}`);
  return value;
}
/** Pass one Hunter's equipment array from GetCard, not the full envelope.
 * Strict types/unique slot-rank are local admission policy. */
export function parseHunterEquipment(value: unknown): HunterEquipmentReference[] {
  if (!Array.isArray(value) || !value.length) throw new TypeError("Original equipment requires nonempty rows");
  const seen = new Set<string>();
  return value.map(raw => {
    const row = object(raw), type = integer(row.type, "type", 1), rank = integer(row.rank, "rank", 1);
    if (type > 3) throw new TypeError("Unknown equipment slot");
    if (typeof row.id !== "string" || !row.id.length) throw new TypeError("Missing original equipment id");
    const key = `${type}:${rank}`;
    if (seen.has(key)) throw new TypeError("Duplicate equipment slot/rank would overwrite native result");
    seen.add(key);
    const stats = {} as GemSetStats;
    for (const field of GEM_STAT_KEYS) {
      const rawValue = row[field];
      if (typeof rawValue !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(rawValue) || !Number.isFinite(Number(rawValue)))
        throw new TypeError(`Equipment ${field} requires finite numeric string`);
      // CSRCardStat.parse(mode100): special fields divide100 then multiply100.
      stats[field] = Number(rawValue) / (unchanged.has(field) ? 1 : 100);
    }
    return { id: row.id, slot: (type - 1) as 0 | 1 | 2, rank,
      awk_step: integer(row.awk_step, "awk_step", 0), stats };
  });
}
/** Native CalcStatByEquip selects exact slot/rank, with no neighbouring fallback.
 * Missing rows explicitly refuse here, rather than fabricating zero equipment.
 * JS number projection does not reproduce native decimal storage bit-for-bit. */
export function calculateHunterEquipment(rows: readonly HunterEquipmentReference[], slot: 0 | 1 | 2, rank: number, level: number) {
  integer(slot, "slot", 0); if (slot > 2) throw new TypeError("Unknown equipment slot");
  integer(rank, "rank", 1); integer(level, "level", 1);
  if (rank > Math.floor(0x7fff_ffff / 10)) throw new TypeError("Equipment rank-band overflow");
  const matches = rows.filter(row => row.slot === slot && row.rank === rank);
  if (matches.length !== 1) throw new TypeError(matches.length ? "Duplicate equipment slot/rank" : "Missing original equipment slot/rank row");
  const ref = matches[0];
  const adjustedLevel = rank === 1 ? level - 1 : level;
  const growthSteps = adjustedLevel === rank * 10 ? 10 : adjustedLevel % 10;
  const stats = { ...ref.stats };
  for (const field of GEM_STAT_KEYS) if (!Number.isFinite(stats[field])) throw new TypeError(`Invalid equipment ${field}`);
  for (const field of ["hp", "atk", "def"] as const) {
    stats[field] += stats[`${field}_up`] * growthSteps;
    if (!Number.isFinite(stats[field])) throw new TypeError("Equipment growth overflow");
  }
  return { id: ref.id, slot, rank, level, growthSteps, stats };
}
