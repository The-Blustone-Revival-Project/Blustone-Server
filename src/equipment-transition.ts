/** Conservative admission of the native popup's ordinary reachable transitions.
 * Does not authorize a wallet charge or prove original server validation. */
export function equipmentTransition(action: "level" | "rank", rank: number, level: number) {
  if (!Number.isInteger(rank) || rank < 1 || rank > 5 || !Number.isInteger(level) || level < 1 || level > 50)
    throw new TypeError("Equipment rank/level outside native popup domain");
  // Previous at-cap rank transitions preserve level. Refuse malformed states
  // outside that ordinary reachable band rather than extrapolating UI previews.
  const minimum = rank === 1 ? 1 : (rank - 1) * 10;
  if (level < minimum || level > rank * 10) throw new TypeError("Equipment state outside ordinary reachable rank band");
  if (action === "level") {
    if (level >= rank * 10 || level >= 50) throw new TypeError("Equipment requires rank-up before next level");
    return { rank, level: level + 1 };
  }
  if (action === "rank") {
    if (rank >= 5 || level !== rank * 10) throw new TypeError("Equipment rank-up requires exact uncapped rank boundary");
    return { rank: rank + 1, level };
  }
  throw new TypeError("Unknown equipment upgrade action");
}
