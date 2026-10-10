import { starterStages, starterStageMonstersByStageId, type StageMonsterRecord } from "./bootstrap.js";

export const SEARCH_STAGE_ID = "local_search_017";
export const SEARCH_WAVE_COUNT = 2;
/** Search auto-shows IG_WAVE1_N; native InitEffect only registers N=2,3,4.
 * Use a distinct unlinked reference so ordinary campaign waves remain intact. */
export function searchStageReference() {
  const base = starterStages.stage.find((row) => row.id === "n_01_07") ?? starterStages.stage[0];
  if (!base) throw new Error("Search stage requires a published base reference");
  return { ...base, id: SEARCH_STAGE_ID, title: "Hunter Search", gold: 0, character_exp: 0, group_exp: 0 };
}
export function searchStageMonsters(): StageMonsterRecord {
  const base = starterStageMonstersByStageId.n_01_01;
  const waves = Array.from({ length: SEARCH_WAVE_COUNT }, (_, index) => base.wave_list[0].map((monster) => ({
    ...monster, _id: `${SEARCH_STAGE_ID}_${index}_${monster.ref_id}`,
  })));
  return { ...base, _id: waves, wave_list: waves };
}
