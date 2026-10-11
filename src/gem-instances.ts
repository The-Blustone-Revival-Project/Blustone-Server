import { GEM_STAT_KEYS, type GemSetStats } from "./gem-combinations.js";
export interface GemReference { id: string; name: string; desc: string; res_id: string; set_effect_id: number; rank: number; target: 1 | 2 | 3 }
export interface GemInstance {
  ref_id: string; inst_id: string; rank: number; level: number; position: number; target_inst_id: string; ability: string;
  abilities: null | { level_up_failed: number; main: GemStatRecord; sub: GemStatRecord[] };
}
export interface GemStatRecord { rank: number; awk_step: number; stats: GemSetStats }
function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new TypeError("Expected Gem object");
  return raw as Record<string, unknown>;
}
function uint(raw: unknown, key: string) {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 0xffff_ffff) throw new TypeError(`Invalid Gem ${key}`);
  return raw;
}
function text(row: Record<string, unknown>, key: string, nonempty = false) {
  if (typeof row[key] !== "string" || (nonempty && !row[key])) throw new TypeError(`Invalid Gem ${key} string`);
  return row[key] as string;
}
function serial(raw: unknown, zero = false): string {
  const value = typeof raw === "number" && Number.isSafeInteger(raw) ? String(raw) : raw;
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)$/.test(value) || (!zero && value === "0") || BigInt(value) > 0xffff_ffff_ffff_ffffn)
    throw new TypeError("Invalid uint64 Gem identity");
  return value;
}
function rows(raw: unknown) {
  const envelope = object(raw);
  if (envelope.result_code !== 1 || !Array.isArray(envelope.ret_data)) throw new TypeError("Gem reference/inventory requires successful ret_data array");
  return envelope.ret_data;
}
export function parseGemReferences(raw: unknown): GemReference[] {
  const seen = new Set<string>();
  return rows(raw).map(value => {
    const row = object(value), id = text(row, "id", true), target = uint(row.target, "target");
    if (seen.has(id)) throw new TypeError("Duplicate Gem reference identity");
    if (target < 1 || target > 3) throw new TypeError("Gem reference has no supported equipment slot");
    seen.add(id);
    return { id, name: text(row, "name"), desc: text(row, "desc"), res_id: text(row, "res_id", true),
      set_effect_id: uint(row.set_effect_id, "set_effect_id"), rank: uint(row.rank, "rank"), target: target as 1 | 2 | 3 };
  });
}
const retained = new Set(["spd", "crt_chance", "penetration", "block_chance"]);
export function parseGemStat(raw: unknown): GemStatRecord {
  const row = object(raw), stats = {} as GemSetStats;
  for (const key of GEM_STAT_KEYS) {
    const value = row[key];
    if (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value)))
      throw new TypeError(`Gem ${key} requires finite numeric string`);
    stats[key] = Number(value) / (retained.has(key) ? 1 : 100);
  }
  return { rank: uint(row.rank, "rank"), awk_step: uint(row.awk_step, "awk_step"), stats };
}
/** Full native inventory parsing; target-owner validation is explicit caller
 * policy. Position numbering/slot capacity is NOT inferred by this helper. */
export function parseGemInstances(raw: unknown, references: readonly GemReference[], knownHunters: ReadonlySet<string>,
  equipmentRank?: (hunter:string,slot:number)=>number|undefined): GemInstance[] {
  const refs = new Set(references.map(ref => ref.id));
  if (refs.size !== references.length) throw new TypeError("Duplicate Gem reference identity");
  const seen = new Set<string>();
  const occupied = new Set<string>();
  return rows(raw).map(value => {
    const row = object(value), ref_id = text(row, "ref_id", true), inst_id = serial(row.inst_id), target_inst_id = serial(row.target_inst_id, true);
    if (!refs.has(ref_id)) throw new TypeError("Missing original Gem reference");
    if (seen.has(inst_id)) throw new TypeError("Duplicate owned Gem identity");
    if (target_inst_id !== "0" && !knownHunters.has(target_inst_id)) throw new TypeError("Gem target is not owned Hunter");
    const position=uint(row.position,"position");
    if(target_inst_id!=="0") {
      if(position<1||position>2) throw new TypeError("Mounted Gem position must be native1..2");
      const ref=references.find(ref=>ref.id===ref_id)!;
      const occupancy=`${target_inst_id}:${ref.target}:${position}`;
      if(occupied.has(occupancy)) throw new TypeError("Duplicate mounted Gem position");
      occupied.add(occupancy);
      if(equipmentRank) {
        const rank=equipmentRank(target_inst_id,ref.target-1);
        if(!Number.isInteger(rank)||rank!<1 || (position===2&&rank!<3)) throw new TypeError("Mounted Gem equipment slot is unavailable");
      }
    }
    seen.add(inst_id);
    let abilities: GemInstance["abilities"] = null;
    if (row.abilities !== null) {
      const data = object(row.abilities);
      if (!Array.isArray(data.sub)) throw new TypeError("Gem sub abilities require canonical array");
      abilities = { level_up_failed: uint(data.level_up_failed, "level_up_failed"), main: parseGemStat(data.main), sub: data.sub.map(parseGemStat) };
    }
    return { ref_id, inst_id, target_inst_id, rank: uint(row.rank, "rank"), level: uint(row.level, "level"),
      position, ability: text(row, "ability"), abilities };
  });
}
/** Uses resolved original GemRef slot/family, not UI names or owned position. */
export function projectGemStats(instance: GemInstance, references: readonly GemReference[]) {
  const matches = references.filter(ref => ref.id === instance.ref_id);
  if (matches.length !== 1) throw new TypeError("Missing or duplicate Gem reference");
  const stats = Object.fromEntries(GEM_STAT_KEYS.map(key => [key, 0])) as GemSetStats;
  if (instance.abilities) for (const record of [instance.abilities.main, ...instance.abilities.sub])
    for (const key of GEM_STAT_KEYS) {
      if (!Number.isFinite(record.stats[key])) throw new TypeError("Invalid Gem normalized ability");
      stats[key] += record.stats[key];
      if (!Number.isFinite(stats[key])) throw new TypeError("Gem ability total overflow");
    }
  return { slot: matches[0].target - 1, familyId: matches[0].set_effect_id, stats };
}
