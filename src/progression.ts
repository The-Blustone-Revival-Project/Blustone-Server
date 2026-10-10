import type { LocalGameState } from "./game.js";

/** Recovered three-byte flags: order0..2. Never emit index3. */
export const STAGE_STAR_COUNT = 3;

export function earnedStageOrders(game: LocalGameState, stageId: string): number[] {
  if (game.stage_achievements[stageId]) return game.stage_achievements[stageId];
  const legacyCount = game.stage_stars[stageId] ?? (game.cleared_stage_ids.includes(stageId) ? 1 : 0);
  return Array.from({ length: Math.min(STAGE_STAR_COUNT, Math.max(0, legacyCount)) }, (_, order) => order);
}

/** On-screen default conditions: Complete, Under60s, <=1 Straggler.
 * Index mapping follows displayed order; condition evaluation is local policy.
 * Native always sends metrics. Missing hand-made metrics retain the previous
 * all-stars fixture, rather than pretending those fallback results are measured. */
export function completionOrders(raw: unknown): number[] {
  let info: any = raw;
  if (typeof raw === "string") { try { info = JSON.parse(raw); } catch { info = {}; } }
  if (!info || typeof info !== "object" || Array.isArray(info)) info = {};
  const orders = [0];
  const metric = (value: unknown) => typeof value === "number" ? value
    : typeof value === "string" && value.trim() ? Number(value) : NaN;
  const time = metric(info.clear_time);
  const dead = metric(info.dead_cnt);
  if (info.clear_time === undefined || (Number.isFinite(time) && time >= 0 && time < 60)) orders.push(1);
  if (info.dead_cnt === undefined || (Number.isSafeInteger(dead) && dead >= 0 && dead <= 1)) orders.push(2);
  return orders;
}
