import { starterLevels } from "./bootstrap.js";

/** Mirror CSRUserLV::GetUserLevel (G10a0916): count the ordered threshold
 * prefix not exceeding EXP, minimum1. Threshold values remain local fixtures. */
export function teamLevel(exp: number): number {
  if (!Number.isSafeInteger(exp) || exp < 0) throw new Error("Invalid team EXP");
  let count = 0;
  for (const row of starterLevels.user) {
    if (exp < row.min_exp) break;
    count += 1;
  }
  return Math.max(1, count);
}
