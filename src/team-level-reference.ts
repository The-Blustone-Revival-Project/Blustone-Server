/** Team/account EXP thresholds, separate from Hunter EXP. Neither table is a
 * recovered production curve. The wider curve is an explicit local policy. */
export type TeamLevelProfile = "legacy" | "local-linear-100";

export function teamLevelProfile(raw: unknown = process.env.BLUSTONE_TEAM_LEVEL_PROFILE): TeamLevelProfile {
  if (raw === undefined || raw === "legacy") return "legacy";
  if (raw === "local-linear-100") return raw;
  throw new TypeError("BLUSTONE_TEAM_LEVEL_PROFILE requires legacy or local-linear-100");
}

export function teamLevelReference(profile: TeamLevelProfile = teamLevelProfile()): { min_exp: number }[] {
  if (profile !== "legacy" && profile !== "local-linear-100") throw new TypeError("Unknown team level profile");
  return Array.from({ length: profile === "legacy" ? 2 : 100 }, (_, index) => ({ min_exp: index * 100 }));
}
