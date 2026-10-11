/** Optional historical display/balance policy, never final-version base evidence.
 * Only eight previously audited, material-backed identities are admitted. */
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { repositoryPath } from "./paths.js";

export const MATERIAL_STAT_PROFILE = process.env.BLUSTONE_MATERIAL_STAT_PROFILE ?? "neutral";
const supported = ["neutral", "archive-2019-projection"];
if (!supported.includes(MATERIAL_STAT_PROFILE)) throw new Error("Unknown material Hunter stat profile");
export const MATERIAL_ARCHIVE_IDS = ["009", "010", "012", "013", "017", "036", "040", "049"] as const;
export const MATERIAL_ARCHIVE_SOURCE = {
  path: "resources/reference/archived-hunter-database-2019.tsv",
  sha256: "778e41835a8c44f21652abcb9c10de021afb2871292af8aba3431e71b9fef54e",
  label: "COMMUNITY-SOURCED", level: "not shown", gearState: "not established",
} as const;
const columns = {
  hp: "hp", atk: "atk", def: "def", spd: "speed", crt_chance: "crit", crt_dmg: "crit_damage",
  penetration: "penetration", block_chance: "block", block_dec_dmg: "block_damage_reduction",
  attr_enhance: "element_enhance", attr_resist: "element_resistance", hp_regen: "hp_regen",
} as const;
type Observation = { values: Record<string, string>; captured: string; url: string; level: string; gearState: string };
let observations: Record<string, Observation> | undefined;
export function materialArchiveObservations(): Readonly<Record<string, Observation>> {
  if (observations) return structuredClone(observations);
  const bytes = readFileSync(repositoryPath(MATERIAL_ARCHIVE_SOURCE.path));
  if (createHash("sha256").update(bytes).digest("hex") !== MATERIAL_ARCHIVE_SOURCE.sha256)
    throw new Error("Historical material archive source pin changed");
  const lines = bytes.toString("utf8").trim().split(/\r?\n/);
  const unquote = (value: string) => value.replace(/^"|"$/g, "");
  const header = lines.shift()!.split("\t").map(unquote);
  const result: Record<string, Observation> = {};
  for (const line of lines) {
    const cells = line.split("\t").map(unquote);
    if (cells.length !== header.length) throw new Error("Malformed historical archive row");
    const row = Object.fromEntries(header.map((name, index) => [name, cells[index]]));
    if (!(MATERIAL_ARCHIVE_IDS as readonly string[]).includes(row.catalog_id)) continue;
    if (result[row.catalog_id] || row.fetch_status !== "ok" || row.level !== MATERIAL_ARCHIVE_SOURCE.level ||
        row.gear_state !== MATERIAL_ARCHIVE_SOURCE.gearState || !/^2019\d{10}$/.test(row.capture_timestamp) ||
        !row.source_url.startsWith("https://web.archive.org/")) throw new Error("Ambiguous historical material observation");
    const values = Object.fromEntries(Object.entries(columns).map(([wire, column]) => {
      const value = row[column];
      if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value)))
        throw new Error("Missing historical numeric material observation");
      return [wire, value];
    }));
    result[row.catalog_id] = { values, captured: row.capture_timestamp, url: row.source_url,
      level: row.level, gearState: row.gear_state };
  }
  if (Object.keys(result).length !== MATERIAL_ARCHIVE_IDS.length) throw new Error("Incomplete historical material observations");
  observations = result;
  return structuredClone(result);
}

/** Original rank/awakening selectors and fixture growth remain intact. Using
 * archive readings as repeated rank bases is an explicit local policy. */
export function projectMaterialStats<T extends Record<string, unknown>>(id: string, neutral: T,
  profile = MATERIAL_STAT_PROFILE): T {
  if (!supported.includes(profile)) throw new Error("Unknown material Hunter stat profile");
  if (profile === "neutral" || !(MATERIAL_ARCHIVE_IDS as readonly string[]).includes(id)) return { ...neutral };
  const observation = materialArchiveObservations()[id];
  return { ...neutral, ...observation.values };
}
