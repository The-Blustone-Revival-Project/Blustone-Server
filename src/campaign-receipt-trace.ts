/** Opt-in local diagnostic projection. Never serialize requests/headers wholesale. */
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface CampaignTraceContext {
  pvid: number;
  reservation?: { battle_id: string; stage_id: string; state: string; deck_inst_ids: number[] };
  areaClaimCount: number;
}
const session = randomUUID();
let sequence = 0;
let warned = false;
const object = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const pair = (value: unknown) => { const row = object(value); return { prev: number(row.prev), cur: number(row.cur) }; };

const stageIdPattern = /^n_0[1-5]_(0[1-9]|10)$/;
const battleId = (value: unknown) => typeof value === "string" && /^local-\d{1,10}-\d{1,16}-[a-f0-9]{8}$/.test(value) ? value : undefined;
const reservation = (row: CampaignTraceContext["reservation"]) => row ? {
  battle_id: battleId(row.battle_id),
  stage_id: stageIdPattern.test(row.stage_id) ? row.stage_id : undefined,
  state: row.state === "active" || row.state === "completed" ? row.state : undefined,
  deck_inst_ids: row.deck_inst_ids.filter(id => Number.isSafeInteger(id) && id > 0).slice(0, 5),
} : undefined;

export function campaignReceiptProjection(route: string, payload: Record<string, unknown>, envelope: unknown,
  before: CampaignTraceContext, after: CampaignTraceContext) {
  const reply = object(envelope), data = object(reply.ret_data), user = object(data.user);
  const cards = object(data.card);
  let playInfo = object(payload.play_info);
  if (typeof payload.play_info === "string" && payload.play_info.length <= 16384) {
    try { playInfo = object(JSON.parse(payload.play_info)); } catch { playInfo = {}; }
  }
  const stage = typeof payload.stage_id === "string" ? payload.stage_id : data.stage_id;
  const stageId = typeof stage === "string" && stageIdPattern.test(stage) ? stage : undefined;
  const area = typeof payload.area_id === "string" && /^n_0[1-5]$/.test(payload.area_id) ? payload.area_id : undefined;
  if (!stageId && !area) return undefined;
  // The contexts come from a separate read-only state projection, not payload.
  return {
    route, pvid: before.pvid, stage_id: stageId, area_id: area,
    requested_achieve_cnt: typeof payload.target_achieve_cnt === "string" && /^\d{1,3}$/.test(payload.target_achieve_cnt) ? Number(payload.target_achieve_cnt) : number(payload.target_achieve_cnt),
    returned_battle_id: battleId(data.battle_id), returned_ap: number(data.ap),
    returned_achieve_cnt: number(data.achieve_cnt), returned_claimed: typeof data.claimed === "boolean" ? data.claimed : undefined,
    result_code: number(reply.result_code), returned_clear: number(data.clear),
    returned_accepted: typeof data.accepted === "boolean" ? data.accepted : undefined,
    play_info: { clear: typeof playInfo.clear === "boolean" ? playInfo.clear : number(playInfo.clear),
      clear_time: number(playInfo.clear_time), dead_cnt: number(playInfo.dead_cnt) },
    reservation_before: reservation(before.reservation), reservation_after: reservation(after.reservation),
    area_claim_count_before: before.areaClaimCount, area_claim_count_after: after.areaClaimCount,
    wallet: { gold: pair(route === "/mission/ReqAchieveReward" ? data.gold : user.gold), exp: pair(user.exp), ap: pair(user.ap), bp: pair(user.bp) },
    cards: Object.fromEntries(Object.entries(cards).filter(([id]) => /^\d{1,10}$/.test(id)).slice(0, 64).map(([id, value]) => [id, pair(value)])),
  };
}

export function recordCampaignReceipt(row: ReturnType<typeof campaignReceiptProjection>, sink?: (text: string) => void) {
  if (process.env.BLUSTONE_CAMPAIGN_RECEIPT_TRACE !== "1" || !row) return;
  try {
    const text = JSON.stringify({ session, sequence: ++sequence, utc: new Date().toISOString(), ...row }) + "\n";
    if (sink) sink(text);
    else {
      const directory = path.resolve(process.cwd(), "logs");
      mkdirSync(directory, { recursive: true });
      appendFileSync(path.join(directory, "campaign-receipts.ndjson"), text, { encoding: "utf8", mode: 0o600 });
    }
  } catch {
    // Settlement has already persisted. Diagnostic failures must not turn its
    // successful response into an HTTP error/retry or disclose filesystem data.
    if (!warned) { warned = true; console.warn("Campaign receipt trace unavailable; gameplay response preserved."); }
  }
}
