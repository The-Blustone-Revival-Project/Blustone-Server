/** CSRUserLV::SetLevel skill rows are role-keyed dense vectors. The schema
 * and getters are native-recovered. Caps10/20/30/40/50 are inferred from the
 * community10-per-grade rule; original network price rows remain missing.
 * Gold100*destinationLevel and zero materials are explicit local economy fixtures.
 * Empty material slots are guarded by CSRPopUpSkillUp before item lookup.
 * Evidence: analysis/research/skill-level-reference.md. */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {repositoryPath} from "./paths.js";
export type SkillGoldProfile="legacy"|"screenshot-2018-gold-projection";
export const SKILL_GOLD_PROFILE=process.env.BLUSTONE_SKILL_GOLD_PROFILE??"legacy";
export const SKILL_GOLD_EVIDENCE={path:"resources/reference/skill-training-screen-quotes-2018.json",
  sha256:"957aed737408514c3c7ded38c97580a8a19c2516ca3fbb39f040b5221ee3ee78"} as const;
export function skillGoldEvidence() {
  const bytes=readFileSync(repositoryPath(SKILL_GOLD_EVIDENCE.path));
  if(createHash("sha256").update(bytes).digest("hex")!==SKILL_GOLD_EVIDENCE.sha256)throw new TypeError("Skill screenshot quote evidence pin changed");
  return JSON.parse(bytes.toString("utf8")) as {release:string;quotes:{idx:number;previous_level:number;destination_level:number;displayed_fee:number;source:string;source_sha256:string;line:number;raw_tsv:string}[]};
}
export interface SkillLevelRow {
  role: number;
  level: number;
  rank: number;
  gold: number;
  source_1_ref_id: string; source_1_qty: number;
  source_2_ref_id: string; source_2_qty: number;
  source_3_ref_id: string; source_3_qty: number;
  source_4_ref_id: string; source_4_qty: number;
}

export function createSkillLevelRows(profile:string):SkillLevelRow[] {
  if(profile!=="legacy"&&profile!=="screenshot-2018-gold-projection")throw new TypeError("Unknown skill gold profile");
  if(profile!=="legacy") {
    const evidence=skillGoldEvidence();
    if(evidence.quotes.length!==5||evidence.quotes.some(row=>row.destination_level!==row.previous_level+1||
      row.displayed_fee!==100*Math.ceil(row.destination_level/5)))throw new TypeError("Skill gold projection conflicts with pinned quotes");
  }
  // Only the five pinned destinations are observed. All other levels and
  // role-wide application interpolate an explicit LOCAL gold-only model.
  return [1, 2, 3, 4].flatMap((role) =>
  Array.from({ length: 50 }, (_, index) => ({
    role, level: index + 1, rank: Math.ceil((index + 1) / 10), gold: profile==="legacy"?100*(index+1):100*Math.ceil((index+1)/5),
    source_1_ref_id: "", source_1_qty: 0, source_2_ref_id: "", source_2_qty: 0,
    source_3_ref_id: "", source_3_qty: 0, source_4_ref_id: "", source_4_qty: 0,
  })));
}
export const skillLevelRows=createSkillLevelRows(SKILL_GOLD_PROFILE);
/** Material identities/consumption are not reconstructed. Refuse future
 * nonzero/unknown slots rather than silently charging only their gold. */
export function goldOnlySkillPrice(row:SkillLevelRow):boolean {
  return ([1,2,3,4] as const).every(index=>row[`source_${index}_ref_id`]===""&&row[`source_${index}_qty`]===0);
}

export function skillLevelLimit(role: number, rank: number): number {
  return skillLevelRows.reduce((maximum, row) => row.role === role && row.rank <= rank
    ? Math.max(maximum, row.level) : maximum, 0);
}

/** Native getter indexes destinationLevel-1; UI passes ownedLevel+1. */
export function skillUpPrice(role: number, destinationLevel: number): SkillLevelRow | undefined {
  if (!Number.isSafeInteger(destinationLevel) || destinationLevel < 1) return undefined;
  return skillLevelRows.filter((row) => row.role === role)[destinationLevel - 1];
}
