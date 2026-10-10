/** Native card rows are dense, ordered, rank-keyed cumulative XP tables.
 * Historical community evidence supports ordinary cap30 regardless of grade.
 * XP/source-XP/sale values remain local fixtures; awake curves are unknown.
 * Preserve old rank1 thresholds0/100 and source yields100/200 so existing
 * XP100 stays LV2. See analysis/research/hunter-level-caps.md. */
export const ordinaryHunterLevels = [1, 2, 3, 4, 5].flatMap((rank) =>
  Array.from({ length: 30 }, (_, index) => ({
    rank, level: index + 1, min_exp: 100 * index,
    upgrade_exp: 100 * (index + 1), sell_price: 0,
  })));
