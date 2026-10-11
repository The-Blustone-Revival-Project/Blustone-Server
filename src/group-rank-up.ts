import type { LocalCardInstance } from "./game.js";
import { rankUpPrice, trainingPrices } from "./training.js";

/** Final native bulk UI: group size srcRank+3 (Gc5da58), destination srcRank+1
 * (Gc5f06a), and price = 2*RaisePrice + srcRank*RankUpPrice (Gc5ebaa).
 * Price vectors are the SAME explicitly local fixtures used by ordinary Gym.
 * This is not ordinary RankUp and intentionally has no max-level requirement.
 */
export function groupRankUpTerms(sourceRank: number, targetCount: number) {
  if (![1, 2].includes(sourceRank) || !Number.isSafeInteger(targetCount) || targetCount < 1) return null;
  const sourceCount = (sourceRank + 3) * targetCount;
  const levelPrice = trainingPrices.level[Math.min(sourceRank - 1, trainingPrices.level.length - 1)];
  const price = (2 * levelPrice + sourceRank * rankUpPrice(sourceRank)) * targetCount;
  if (![sourceCount, price].every((value) => Number.isSafeInteger(value) && value > 0 && value <= 0xffff_ffff)) return null;
  return { sourceRank, sourceCount, targetRank: sourceRank + 1, targetCount, price };
}

function unsigned(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isInteger(raw) && raw >= 0 && raw <= 0xffff_ffff ? raw : null;
  if (typeof raw !== "string" || !/^(0|[1-9][0-9]*)$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isInteger(value) && value <= 0xffff_ffff ? value : null;
}

export function planGroupRankUp(inventory: readonly LocalCardInstance[], payload: Record<string, unknown>, context: {
  gold: number;
  protectedIds: ReadonlySet<number>;
  // Native MakeCardStreamWithoutSource excludes training-source references;
  // caller must resolve this from published reference metadata, not names.
  ordinaryReference: (refId: string) => boolean;
  destinationSupported: (refId: string, rank: number) => boolean;
}) {
  const fields = ["src_rank", "src_cnt", "target_rank", "target_cnt", "price"] as const;
  const parsed = fields.map((key) => unsigned(payload[key]));
  if (parsed.some((value) => value === null)) return { error: "Invalid native group rank-up fields" };
  const [sourceRank, sourceCount, targetRank, targetCount, price] = parsed as number[];
  const terms = groupRankUpTerms(sourceRank, targetCount);
  if (!terms || terms.sourceCount !== sourceCount || terms.targetRank !== targetRank || terms.price !== price)
    return { error: "Group rank-up counts or price disagree with published terms" };
  if (!Number.isSafeInteger(context.gold) || context.gold < terms.price || context.gold > 0xffff_ffff)
    return { error: "Insufficient or invalid group rank-up gold" };
  if (new Set(inventory.map((card) => card.inst_id)).size !== inventory.length)
    return { error: "Duplicate owned instance identity" };
  const candidates = inventory.filter((card) => Number.isSafeInteger(card.inst_id) && card.inst_id > 0 &&
    card.rank === sourceRank && card.rank_up_cnt === 0 && card.lock === 0 && card.awk_step === 0 &&
    card.awk_overcome === 0 && card.overcome_cnt === 0 && !context.protectedIds.has(card.inst_id) &&
    context.ordinaryReference(card.ref_id)).sort((a, b) => a.inst_id - b.inst_id);
  if (candidates.length < sourceCount) return { error: "Not enough unprotected eligible ordinary hunters" };
  // Original server selection order is absent. Replica policy is stable serial
  // ordering, with first targetCount surviving; reject unknown destination data
  // instead of silently selecting different/stronger hunters.
  const selected = candidates.slice(0, sourceCount);
  const targets = selected.slice(0, targetCount);
  if (targets.some((card) => !context.destinationSupported(card.ref_id, targetRank)))
    return { error: "Destination hunter reference is not reconstructed" };
  const updates = targets.map((card) => ({ inst_id: card.inst_id, rank: targetRank, rank_up_cnt: 0, exp: 0 }));
  const removedIds = selected.slice(targetCount).map((card) => card.inst_id);
  const gold = context.gold - terms.price;
  return { terms, updates, removedIds, gold,
    data: { user: { gold: { cur: gold } }, card: {
      target_list: updates.map((card) => ({ inst_id: card.inst_id, rank: { cur: card.rank },
        rank_up_cnt: { cur: card.rank_up_cnt }, exp: { cur: card.exp } })),
      removed_inst_id_list: removedIds,
    } },
  };
}
