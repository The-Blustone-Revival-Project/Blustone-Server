import { starterLevels } from "./bootstrap.js";
import type { LocalCardInstance } from "./game.js";
import {ADVANCEMENT_GOLD_PROFILE,createTrainingPrices} from "./advancement-gold.js";

/** Native vector grammar; numeric prices are local fixtures or explicitly
 * selected historical screen-effective fee projections, not original bases. */
export const trainingPrices = createTrainingPrices(ADVANCEMENT_GOLD_PROFILE);

/** Native rank/src_cnt/stat_bonus fields. Counts follow historical community
 * same-grade material rules;5percent per credited material is a local fixture. */
export const rankUpRows = Array.from({ length: 5 }, (_, index) => ({
  rank: index + 1, src_cnt: index < 4 ? index + 1 : 0, stat_bonus: 5,
}));

/** Native rank0 selects the first quote; larger ranks clamp to the last row. */
export function raisePrice(rank:number) {
  return trainingPrices.level[Math.max(0,Math.min(rank-1,trainingPrices.level.length-1))];
}
export function rankUpPrice(rank: number) {
  return trainingPrices.rank[Math.max(0,Math.min(rank - 1, trainingPrices.rank.length - 1))];
}

/** Inferred server policy consistent with native credited placeholders.
 * Partial progress retains EXP; finishing resets EXP and counter at next rank.
 * It is not a captured original partial-promotion response. */
export function rankUpTransition(card: LocalCardInstance, sourceCount: number) {
  const rank = Number(card.rank), credited = Number(card.rank_up_cnt);
  const row = rankUpRows.find((entry) => entry.rank === rank);
  const curve = trainingCurve(card);
  if (!row || !row.src_cnt || Number(card.awk_step) !== 0 || !Number.isInteger(credited) || credited < 0 || credited >= row.src_cnt ||
      !Number.isInteger(sourceCount) || sourceCount < 1 || credited + sourceCount > row.src_cnt ||
      !curve || Number(card.exp) < curve.maxExp) return null;
  return credited + sourceCount === row.src_cnt
    ? { rank: rank + 1, rank_up_cnt: 0, exp: 0 }
    : { rank, rank_up_cnt: credited + sourceCount, exp: Number(card.exp) };
}

/** GetCardLevel/MaxLevel/RaiseExp consume the published network curve.
 * These helpers follow that arithmetic over the current fixture rows, without
 * fabricating a production curve from unrelated LEVELING.jet battle tuning. */
export function trainingCurve(card: LocalCardInstance) {
  if (Number(card.awk_step) > 0) return null; // awake curve not reconstructed
  const rows = starterLevels.card.filter((row) => row.rank === Number(card.rank));
  if (rows.length === 0) return null;
  const exp = Number(card.exp);
  const next = rows.find((row) => row.min_exp > exp);
  const level = next ? Math.max(1, next.level - 1) : rows[rows.length - 1].level;
  const row = rows.find((entry) => entry.level === level);
  if (!row || !Number.isSafeInteger(exp) || exp < 0) return null;
  return { level, sourceExp: row.upgrade_exp, maxExp: rows[rows.length - 1].min_exp };
}
