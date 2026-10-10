/** CSRUserLV::SetLevel skill rows are role-keyed dense vectors. The schema
 * and getters are native-recovered. Caps10/20/30/40/50 are inferred from the
 * community10-per-grade rule; original network price rows remain missing.
 * Gold100*destinationLevel and zero materials are explicit local economy fixtures.
 * Empty material slots are guarded by CSRPopUpSkillUp before item lookup.
 * Evidence: analysis/research/skill-level-reference.md. */
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

export const skillLevelRows: SkillLevelRow[] = [1, 2, 3, 4].flatMap((role) =>
  Array.from({ length: 50 }, (_, index) => ({
    role, level: index + 1, rank: Math.ceil((index + 1) / 10), gold: 100 * (index + 1),
    source_1_ref_id: "", source_1_qty: 0, source_2_ref_id: "", source_2_qty: 0,
    source_3_ref_id: "", source_3_qty: 0, source_4_ref_id: "", source_4_qty: 0,
  })));

export function skillLevelLimit(role: number, rank: number): number {
  return skillLevelRows.reduce((maximum, row) => row.role === role && row.rank <= rank
    ? Math.max(maximum, row.level) : maximum, 0);
}

/** Native getter indexes destinationLevel-1; UI passes ownedLevel+1. */
export function skillUpPrice(role: number, destinationLevel: number): SkillLevelRow | undefined {
  if (!Number.isSafeInteger(destinationLevel) || destinationLevel < 1) return undefined;
  return skillLevelRows.filter((row) => row.role === role)[destinationLevel - 1];
}
