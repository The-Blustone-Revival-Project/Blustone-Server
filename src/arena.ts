import { cardInstance, starterReference } from "./bootstrap.js";
import {ARENA_COMMENT_DEFAULTS,type ArenaComments} from "./arena-comments.js";

/** Fight Club schemas are native-derived. Opponent, seasons and economy below
 * are local revival fixtures, not recovered matchmaking or original rewards. */
export const ARENA_RIVAL_PVID = 9_000_001;
export const ARENA_DECK_TYPE = 4;
// CSRPopUpFCDefense.UpdateDeckInfo Gc10398 requests5; attacking result uses4.
export const ARENA_DEFENSE_DECK_TYPE = 5;
export const ARENA_BP_COST = 1;
export const ARENA_STAGE_ID = "b_00_01";
/** Native stage identity and INFO schema are recovered. Original GetStage row
 * is missing. Cost follows the existing LOCAL BP1 policy; environment99 is a
 * local binding to the recovered Battle/STI099 scenery, not a recovered
 * b_00_01-to-environment association. No expedition row or reward is borrowed. */
export function arenaStageReference() {
  return { id: ARENA_STAGE_ID, ap_cost: ARENA_BP_COST, gold: 0, character_exp: 0,
    group_exp: 0, enemy_atk_per: 100, enemy_hp_per: 100, power: 0,
    title: "Fight Club", desc: "", res_prefix: "99", thumb: "", story_id: "",
    begin_dialog_id: "", end_dialog_id: "", achieve_condition: "[]",
    order: 0, type: 0, value: 0, item: [] };
}
export interface ArenaAttempt {
  target_pvid: number;
  bid: number;
  started_at: number;
  deck_inst_ids: number[];
}
export interface ArenaState {
  league_level: number;
  win: number;
  lose: number;
  league_win: number;
  rating_point: number;
  active: ArenaAttempt | null;
  last_result: { signature: string; receipt: ArenaReceipt } | null;
}
export interface ArenaPair { prev: number; cur: number }
export interface ArenaReceipt { user: { battle: Record<string, ArenaPair>; honor: ArenaPair }; card: Record<string, ArenaPair> }
export function emptyArena(): ArenaState {
  return { league_level: 1, win: 0, lose: 0, league_win: 0, rating_point: 0, active: null, last_result: null };
}
export function normalizeArena(raw: unknown): ArenaState {
  if (raw === undefined) return emptyArena();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Malformed arena state");
  const value = raw as ArenaState;
  for (const key of ["league_level", "win", "lose", "league_win", "rating_point"] as const)
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) throw new Error("Malformed arena counters");
  if (value.league_level < 1 || value.league_level > 6 || value.league_win > 6) throw new Error("Malformed arena league");
  let active: ArenaAttempt | null = null;
  if (value.active !== null) {
    const row = value.active;
    if (!row || row.target_pvid !== ARENA_RIVAL_PVID || !Number.isSafeInteger(row.bid) || row.bid < 0 ||
        !Number.isSafeInteger(row.started_at) || row.started_at < 0 || !Array.isArray(row.deck_inst_ids) ||
        !row.deck_inst_ids.length || row.deck_inst_ids.length > 5 ||
        row.deck_inst_ids.some((id) => !Number.isSafeInteger(id) || id < 1) ||
        new Set(row.deck_inst_ids).size !== row.deck_inst_ids.length) throw new Error("Malformed arena attempt");
    active = { target_pvid: row.target_pvid, bid: row.bid, started_at: row.started_at, deck_inst_ids: [...row.deck_inst_ids] };
  }
  let last: ArenaState["last_result"] = null;
  if (value.last_result != null) {
    const row = value.last_result;
    const copyPair = (pair: ArenaPair): ArenaPair => {
      if (!pair || !Number.isSafeInteger(pair.prev) || pair.prev < 0 || !Number.isSafeInteger(pair.cur) || pair.cur < 0)
        throw new Error("Malformed arena result pair");
      return { prev: pair.prev, cur: pair.cur };
    };
    if (!/^[a-f0-9]{64}$/.test(row.signature) || !row.receipt?.user?.battle || !row.receipt.card || Array.isArray(row.receipt.card))
      throw new Error("Malformed arena result receipt");
    const battle = Object.fromEntries(["league_level", "win", "lose", "league_win", "rating_point"]
      .map((key) => [key, copyPair(row.receipt.user.battle[key])]));
    const cards = Object.entries(row.receipt.card);
    if (cards.length > 5 || cards.some(([id]) => !/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))))
      throw new Error("Malformed arena receipt card IDs");
    last = { signature: row.signature, receipt: { user: { battle, honor: copyPair(row.receipt.user.honor) },
      card: Object.fromEntries(cards.map(([id, pair]) => [id, copyPair(pair)])) } };
  }
  return { league_level: value.league_level, win: value.win, lose: value.lose,
    league_win: value.league_win, rating_point: value.rating_point, active, last_result: last };
}
export function arenaProfile(pvid: number, arena: ArenaState,comments?:ArenaComments) {
  return { pvid, rank: 1, season_no: 1, weekly_no: 1, league_level: arena.league_level,
    rating_point: arena.rating_point, league_win: arena.league_win,
    win: arena.win, lose: arena.lose, refresh_datetime: 0,
    ...(comments??ARENA_COMMENT_DEFAULTS) };
}
/** Native end_datetime subtracts GetCurServerTime seconds and divides by86400.
 * Units are recovered; weekly alignment and season schedule remain fixtures.
 * See arena-season-time-units.md. Native lobby countdown verified2026-10-10
 * in analysis/testing/arena-entry-001/countdown-proof.json (0..1s capture lag). */
export function arenaSeason(now = Date.now()) {
  const start = Math.floor(now / 1000 / 604800) * 604800;
  return { season_no: 1, weekly_no: 1, start_datetime: start,
    end_datetime: start + 604800, next_datetime: start + 604800,
    weekly_start_datetime: start, weekly_end_datetime: start + 604800,
    weekly_next_datetime: start + 604800 };
}
export function arenaRival() {
  const ref = starterReference.some((row) => row.base.id === "002") ? "002" : "001";
  return { nickname: "Local sparring hunter", thumbnail: ref, profile_status: "", country_code: "",
    status: 1, user_exp: 0, vip_exp: 0, chain_bonus: [],
    card_book: { atk: 0, def: 0, hp: 0, crt_dmg: 0, crt_chance: 0 },
    battle: arenaProfile(ARENA_RIVAL_PVID, emptyArena()),
    // ParseDefender iterates exactly inst_1..inst_N by container size.
    // Full instances use already published/downloaded reference002; no grants
    // to the account and no new client art are involved.
    deck: { inst_1: cardInstance(9_000_001_001, ref),
      inst_2: { inst_id: 0 }, inst_3: { inst_id: 0 }, inst_4: { inst_id: 0 }, inst_5: { inst_id: 0 } }, gem: [] };
}
export function arenaReference() {
  return { league: Array.from({ length: 6 }, (_, index) => ({ league_level: index + 1,
    max_win: 6, user_exp: 0, gold: 0, free_iap: 0, iap: 0, honor: 0, item_list: [] })),
    weekly_reward: [{ min_ranking: 1, max_ranking: 999999, user_exp: 0, gold: 0,
      honor: 0, free_iap: 0, item_list: [] }] };
}
