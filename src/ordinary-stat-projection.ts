/** Observed 2019 JP archive values, NOT recovered final-version Lv1 bases.
 * Page level and equipment were not recorded. Treat their use as reference
 * bases, repeated rank rows and retained growth increments as local policy.
 * Provenance: analysis/research/base-stats-visual-hunt/
 * archived-hunter-database-2019.tsv and hunter-native-stat-growth.md. */
export const ORDINARY_STAT_PROFILE = process.env.BLUSTONE_CARD_STAT_PROFILE ?? "archive-2019-projection";
if (!["legacy", "archive-2019-projection"].includes(ORDINARY_STAT_PROFILE))
  throw new Error("Unknown ordinary Hunter stat profile");

const fields = ["hp", "atk", "def", "spd", "crt_chance", "crt_dmg", "penetration",
  "block_chance", "block_dec_dmg", "attr_enhance", "attr_resist", "hp_regen"] as const;
type NumericStats = Record<typeof fields[number], string>;

export const archiveObservations = {
  "001": { captured: "20191209130238", values: [1521, 1058, 653, 7, 14, 180, 0, 14, 42, 0, 0, 38] },
  "002": { captured: "20191208231408", values: [1624, 839, 682, 8, 33, 200, 0, 14, 42, 0, 0, 41] },
  "003": { captured: "20191210193048", values: [1750, 726, 864, 7, 14, 180, 0, 33, 50, 0, 0, 48] },
  "004": { captured: "20191209002103", values: [1467, 679, 679, 7, 14, 180, 0, 14, 42, 0, 0, 37] },
} as const;

/** Only exact catalogue IDs are projected. Overrides and other references
 * retain their independent fixture, even if they reuse C001/C002 artwork.
 * Native expects decimal STRING fields. No instance or EXP mutations. */
export function projectOrdinaryStats<T extends NumericStats>(refId: string, legacy: T,
  profile = ORDINARY_STAT_PROFILE): T {
  if (!["legacy", "archive-2019-projection"].includes(profile))
    throw new Error("Unknown ordinary Hunter stat profile");
  const observed = archiveObservations[refId as keyof typeof archiveObservations];
  if (profile === "legacy" || !observed) return { ...legacy };
  return { ...legacy, ...Object.fromEntries(fields.map((field, index) => [field, String(observed.values[index])])) };
}
