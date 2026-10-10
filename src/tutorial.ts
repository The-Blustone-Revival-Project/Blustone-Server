import type { LocalTutorialState } from "./game.js";

/** Native Parse writes state0/3 directly, not monotonically. Emit one row per
 * (type,step), preserving completed truth across account and fixture sources. */
export function mergeTutorialRows(...lists: LocalTutorialState[][]): LocalTutorialState[] {
  const rows = new Map<string, LocalTutorialState>();
  for (const list of lists) for (const row of list) {
    const key = `${row.type}:${row.step}`;
    const previous = rows.get(key);
    rows.set(key, { type: row.type, step: row.step, is_cleared: previous?.is_cleared || row.is_cleared ? 1 : 0 });
  }
  return [...rows.values()].sort((a, b) => a.type - b.type || a.step - b.step);
}
