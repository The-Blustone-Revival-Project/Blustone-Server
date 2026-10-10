import type { LocalGameState } from "./game.js";
import { hunterSearchInstances, hunterSearchReference } from "./hunter-search.js";
import { searchHelperReference, SEARCH_HELPER_SERIAL } from "./search-helpers.js";
import { SEARCH_CAPSULE_ID, explicitSearchCapsuleVictory } from "./search-capsules.js";
import { SEARCH_STAGE_ID, SEARCH_WAVE_COUNT } from "./search-stage.js";
import { HUNTER_TRACE_ITEMS } from "./hunter-traces.js";

const GUIDE_TRACE_QTY = HUNTER_TRACE_ITEMS.find((row) => row.cardId === "006")!.collect_qty;

export interface SearchAttempt {
  log_id: number; ref_id: string; stage_id: string; helper_id: string;
  started_at: number; deck_inst_ids: number[]; capsule_inst_id: number; onboarding: boolean; guided: boolean; wave_count: number;
}
export interface SearchEndReceipt {
  wave: { cleared_wave: number; max_wave: number };
  consume_result: []; item: Array<{ inst_id: number; ref_id: string; added: number }>;
  gem: []; special: []; reward_item: Array<{ ref_id: string; qty: number }>;
}
export interface SearchState {
  next_log_id: number; active: SearchAttempt | null;
  last: { attempt: SearchAttempt; receipt: SearchEndReceipt } | null;
  used_day: number; used_virtual: string[]; onboarding_used: boolean;
  repeat: { period_started_at: number; play_log: Array<{ ref_id: string; log_id: number; inst_id: number; owner: number }>;
    retry_log: string[]; reset_cnt: number; last_action: { kind: "Retry" | "Reset"; log_id: number } | null };
}
export const emptySearch = (): SearchState => ({ next_log_id: 1, active: null, last: null, used_day: -1, used_virtual: [], onboarding_used: false,
  repeat: { period_started_at: 0, play_log: [], retry_log: [], reset_cnt: 0, last_action: null } });
export function normalizeSearch(raw: unknown): SearchState {
  if (raw === undefined) return emptySearch();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Malformed Search state");
  const value = raw as SearchState;
  if (value.onboarding_used === undefined) value.onboarding_used = false;
  if (!Number.isSafeInteger(value.next_log_id) || value.next_log_id < 1 || !Number.isSafeInteger(value.used_day) ||
      value.used_day < -1 || typeof value.onboarding_used !== "boolean" || !Array.isArray(value.used_virtual) || value.used_virtual.some((id) => typeof id !== "string" || !id))
    throw new Error("Malformed Search counters");
  const check = (row: SearchAttempt, pending = false) => {
    // Upgrade the uncompleted, previously unrenderable one-wave fixture only.
    // Keep log, ownership, costs and any completed receipt unchanged.
    if (pending && row?.ref_id === "017" && row.stage_id === "n_01_07") row.stage_id = SEARCH_STAGE_ID;
    if (row && row.wave_count === undefined) row.wave_count = pending ? SEARCH_WAVE_COUNT : value.last?.receipt?.wave?.max_wave ?? 0;
    if (row && row.onboarding === undefined) row.onboarding = false;
    if (row && row.guided === undefined) row.guided = row.onboarding;
    if (!row || !Number.isSafeInteger(row.log_id) || row.log_id < 1 || row.log_id >= value.next_log_id ||
        ![row.ref_id, row.stage_id].every((id) => typeof id === "string" && id.length > 0) ||
        typeof row.helper_id !== "string" || !Number.isSafeInteger(row.started_at) || row.started_at < 0 ||
        typeof row.onboarding !== "boolean" || typeof row.guided !== "boolean" || (row.onboarding && !row.guided) ||
        ![1, 2, 3, 4].includes(row.wave_count) || !Number.isSafeInteger(row.capsule_inst_id) ||
        (row.onboarding ? row.capsule_inst_id !== 0 : row.capsule_inst_id < 1) || !Array.isArray(row.deck_inst_ids) ||
        !row.deck_inst_ids.length || row.deck_inst_ids.length > 5 || new Set(row.deck_inst_ids).size !== row.deck_inst_ids.length ||
        row.deck_inst_ids.some((id) => !Number.isSafeInteger(id) || id < 1)) throw new Error("Malformed Search attempt");
  };
  if (value.active !== null) check(value.active, true);
  if (value.last !== null) {
    check(value.last.attempt);
    const receipt = value.last.receipt;
    // Preserve already settled old one-trace guided receipts exactly.
    const quantities = value.last.attempt.guided ? [1, GUIDE_TRACE_QTY] : [1];
    if (!receipt || !Number.isSafeInteger(receipt.wave?.cleared_wave) || receipt.wave.cleared_wave < 0 ||
        receipt.wave.cleared_wave > value.last.attempt.wave_count || receipt.wave.max_wave !== value.last.attempt.wave_count ||
        ![receipt.item, receipt.gem, receipt.special, receipt.consume_result, receipt.reward_item].every(Array.isArray))
      throw new Error("Malformed Search receipt");
    if (receipt.consume_result.length || receipt.gem.length || receipt.special.length || receipt.item.length > 1 ||
        receipt.item.some((row) => !row || !Number.isSafeInteger(row.inst_id) || row.inst_id < 1 ||
          row.ref_id !== "local_sylvester_trace" || !quantities.includes(row.added)) ||
        receipt.reward_item.length !== (receipt.wave.cleared_wave === receipt.wave.max_wave ? 1 : 0) ||
        receipt.reward_item.some((row) => !row || row.ref_id !== "local_sylvester_trace" || !quantities.includes(row.qty)) ||
        receipt.item.length !== receipt.reward_item.length ||
        receipt.item.some((row, index) => row.added !== receipt.reward_item[index].qty)) throw new Error("Malformed Search reward");
  }
  if (value.repeat === undefined) value.repeat = { ...emptySearch().repeat,
    period_started_at: value.last?.attempt.started_at ?? value.active?.started_at ?? 0,
    play_log: value.last ? [{ ref_id: value.last.attempt.ref_id, log_id: value.last.attempt.log_id, inst_id: 0, owner: 0 }] : [] };
  const repeat = value.repeat;
  if (!repeat || !Number.isSafeInteger(repeat.period_started_at) || repeat.period_started_at < 0 ||
      !Number.isSafeInteger(repeat.reset_cnt) || repeat.reset_cnt < 0 || !Array.isArray(repeat.play_log) ||
      repeat.play_log.some((row) => !row || row.ref_id !== "017" || !Number.isSafeInteger(row.log_id) || row.log_id < 1 ||
        row.log_id >= value.next_log_id || row.inst_id !== 0 || row.owner !== 0) ||
      new Set(repeat.play_log.map((row) => row.log_id)).size !== repeat.play_log.length ||
      !Array.isArray(repeat.retry_log) || repeat.retry_log.some((id) => id !== "017") ||
      repeat.retry_log.length > repeat.play_log.length ||
      (repeat.last_action !== null && (!["Retry", "Reset"].includes(repeat.last_action.kind) ||
        !Number.isSafeInteger(repeat.last_action.log_id) || repeat.last_action.log_id < 1 || repeat.last_action.log_id >= value.next_log_id)))
    throw new Error("Malformed Search repeat state");
  return structuredClone(value);
}
const integer = (raw: unknown) => typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
const today = () => Math.floor(Date.now() / 86_400_000);
const periodLive = (game: LocalGameState) => game.search.repeat.period_started_at > 0 &&
  Date.now() < game.search.repeat.period_started_at + hunterSearchReference().ref[0].period * 1000;
const usedPlays = (game: LocalGameState) => periodLive(game) ?
  game.search.repeat.play_log.length - game.search.repeat.retry_log.length : 0;
function instanceReceipt(game: LocalGameState, user: unknown = null) {
  const live = periodLive(game), repeat = game.search.repeat;
  return { ...hunterSearchInstances(), play_log: live ? repeat.play_log : [], retry_log: live ? repeat.retry_log : [],
    reset_cnt: repeat.reset_cnt, cooltime: live ? Math.ceil((repeat.period_started_at + hunterSearchReference().ref[0].period * 1000) / 1000) : 0, user };
}
export function usedSearchHelpers(game: LocalGameState) {
  // The pending log already reserves this helper. Keep it selectable for a
  // native replay of THAT log; active identity checks reject another attempt.
  return { friend: [], virtual: today() > game.search.used_day ? [] :
    game.search.used_virtual.filter((id) => id !== game.search.active?.helper_id) };
}
function beginReceipt(attempt: SearchAttempt, consume = true) {
  return { log_id: attempt.log_id, reward_cnt: [1], wave_info: Array.from({ length: attempt.wave_count }, (_, wave) => ({ stage_id: attempt.stage_id, wave,
    enemy_hp_per: 100, enemy_atk_per: 100, skill1: 0, skill2: 0, skill3: 0, skill4: 0, skill5: 0 })),
    consume_result: consume && !attempt.onboarding ? [{ inst_id: attempt.capsule_inst_id, qty: 1 }] : [] };
}
/** Native DTOs; capsule1/trace1 and two reference waves are local policy.
 * No campaign stars, AP/BP, gold, hunter EXP/ownership or tutorial writes. */
export function searchBattleRequest(route: string, payload: Record<string, unknown>, game: LocalGameState,
    persist: () => void): { data: Record<string, unknown> } | { error: string } {
  const ref = hunterSearchReference().ref[0];
  if (route === "/explore/GetInst") {
    // Only finished plays enter history. Pending logs replay through Begin,
    // avoiding a fabricated instance or prematurely disabling their UI node.
    return { data: instanceReceipt(game) };
  }
  if (route === "/explore/Retry" || route === "/explore/Reset") {
    const kind = route.endsWith("Retry") ? "Retry" : "Reset";
    const quote = kind === "Retry" ? hunterSearchInstances().retry_price : hunterSearchInstances().reset_price;
    if (integer(payload.price) !== quote.price || integer(payload.price_type) !== quote.price_type ||
        (kind === "Retry" && payload.ref_id !== ref.id)) return { error: "Search quote or reference mismatch" };
    if (game.search.active || game.active_battle || game.arena.active) return { error: "Finish active combat before repeating Search" };
    const repeat = game.search.repeat, log = game.search.last?.attempt.log_id;
    // Same last completed log + same operation before another battle is a
    // duplicate acknowledgement, not another paid purchase. No native nonce.
    if (log && repeat.last_action?.kind === kind && repeat.last_action.log_id === log)
      return { data: instanceReceipt(game) };
    if (!log || !periodLive(game) || usedPlays(game) < ref.max_play_cnt)
      return { error: "No exhausted Search limit to reopen" };
    if (kind === "Retry" && repeat.retry_log.length >= ref.max_retry_cnt) return { error: "Local retry limit reached" };
    if (kind === "Reset" && repeat.reset_cnt >= 0xffffffff) return { error: "Search reset capacity reached" };
    if (game.gacha_free_qty + game.gacha_iap_qty < quote.price) return { error: "Insufficient Manda" };
    const paidBefore = game.gacha_iap_qty, freeBefore = game.gacha_free_qty;
    const freeSpent = Math.min(freeBefore, quote.price); // LOCAL free-first policy.
    game.gacha_free_qty -= freeSpent; game.gacha_iap_qty -= quote.price - freeSpent;
    if (kind === "Retry") repeat.retry_log.push(ref.id);
    else { repeat.play_log = []; repeat.retry_log = []; repeat.reset_cnt++; repeat.period_started_at = Date.now(); }
    repeat.last_action = { kind, log_id: log };
    persist();
    return { data: instanceReceipt(game, { iap: { prev: paidBefore, cur: game.gacha_iap_qty },
      free_iap: { prev: freeBefore, cur: game.gacha_free_qty } }) };
  }
  if (route === "/explore/Begin") {
    const helper = payload.vfid === undefined ? "" : String(payload.vfid);
    const helperLeader = integer(payload.friend_leader_id);
    if (integer(payload.type) !== 1 || payload.ref_id !== ref.id || integer(payload.owner) !== 0 ||
        integer(payload.inst_id) !== 0 || integer(payload.friend_pvid) !== 0 ||
        !Number.isSafeInteger(helperLeader) || helperLeader < 0 || (!helper && helperLeader !== 0) ||
        !["0", "1", 0, 1].includes(payload.wave_info as string | number) ||
        (helper && !searchHelperReference().virtual_friend.some((row) => row.id === helper)))
      return { error: "Unsupported Search owner, target or helper" };
    if (game.search.active) return game.search.active.ref_id === ref.id && game.search.active.helper_id === helper
      ? { data: beginReceipt(game.search.active, false) } : { error: "Another Search attempt is active" };
    if (game.active_battle || game.arena.active) return { error: "Another combat attempt is active" };
    if (usedPlays(game) >= ref.max_play_cnt)
      return { error: "Local Search period limit reached" };
    if (helper && usedSearchHelpers(game).virtual.includes(helper)) return { error: "Partner already used today" };
    const capsule = game.items.find((row) => row.ref_id === SEARCH_CAPSULE_ID && row.lock === 0 && row.qty >= ref.cost);
    // Native first guide proceeds at capsule0 and blocks Airport until finished.
    // Original economics are missing: one free INITIAL guided attempt is local
    // recovery policy, no capsule grant or tutorial flag write. Normal starts pay.
    const guided = !game.search.last && ref.id === "017" && !!helper &&
      game.stage_achievements.n_01_08?.includes(0) &&
      game.tutorial.some((row) => row.type === 37 && row.step === 0 && row.is_cleared === 1) &&
      !game.tutorial.some((row) => row.type === 37 && row.step === 1 && row.is_cleared === 1);
    const onboarding = !capsule && !game.search.onboarding_used && guided;
    if (!capsule && !onboarding) return { error: "Earn a Helium Capsule by clearing a normal stage" };
    if (game.search.next_log_id >= Number.MAX_SAFE_INTEGER) return { error: "Search log capacity reached" };
    const owned = [...game.starter_cards, ...game.recruited_cards];
    const maxOwned = Math.max(0, ...owned.map((card) => card.inst_id));
    if (helper && (owned.some((card) => card.inst_id === SEARCH_HELPER_SERIAL) ||
        (SEARCH_HELPER_SERIAL > maxOwned && SEARCH_HELPER_SERIAL <= maxOwned + SEARCH_WAVE_COUNT)))
      return { error: "Virtual helper serial overlaps the generated actor range" };
    const deck = game.decks.find((row) => row.type === 1)?.list.filter((id) => id > 0) ?? [];
    if (!deck.length || deck.some((id) => !owned.some((card) => card.inst_id === id))) return { error: "Invalid Search party" };
    const attempt: SearchAttempt = { log_id: game.search.next_log_id++, ref_id: ref.id, stage_id: ref.target_stage_id,
      helper_id: helper, started_at: Date.now(), deck_inst_ids: [...deck], capsule_inst_id: capsule?.inst_id ?? 0, onboarding: !!onboarding, guided: !!guided,
      wave_count: SEARCH_WAVE_COUNT };
    if (!periodLive(game)) {
      game.search.repeat.period_started_at = attempt.started_at;
      game.search.repeat.play_log = []; game.search.repeat.retry_log = []; game.search.repeat.last_action = null;
    }
    if (capsule) capsule.qty -= ref.cost;
    if (onboarding) game.search.onboarding_used = true;
    game.search.active = attempt;
    if (today() > game.search.used_day) { game.search.used_day = today(); game.search.used_virtual = []; }
    if (helper) game.search.used_virtual.push(helper);
    persist();
    return { data: beginReceipt(attempt) };
  }
  if (route === "/explore/End") {
    const logId = integer(payload.log_id), clearedWave = integer(payload.cleared_wave);
    if (!game.search.active) return game.search.last?.attempt.log_id === logId
      ? { data: { ...game.search.last.receipt, item: [] } } : { error: "Search log not found" };
    const attempt = game.search.active;
    let info: unknown = payload.play_info;
    if (typeof info === "string") { try { info = JSON.parse(info); } catch { return { error: "Malformed Search metrics" }; } }
    if (logId !== attempt.log_id || !Number.isSafeInteger(clearedWave) || clearedWave < 0 || clearedWave > attempt.wave_count ||
        !info || typeof info !== "object" || Array.isArray(info))
      return { error: "Search log or wave mismatch" };
    const metrics = info as Record<string, unknown>;
    if (![0, 1, "0", "1", false, true].includes(metrics.clear as number) ||
        !Array.isArray(metrics.item_use) || metrics.item_use.length)
      return { error: "Unsupported Search outcome or item use" };
    const won = explicitSearchCapsuleVictory(info);
    if (won !== (clearedWave === attempt.wave_count)) return { error: "Search outcome and completed wave disagree" };
    const receipt: SearchEndReceipt = { wave: { cleared_wave: clearedWave, max_wave: attempt.wave_count },
      consume_result: [], item: [], gem: [], special: [], reward_item: [] };
    if (won) {
      const refId = "local_sylvester_trace";
      // LOCAL initial guide payout must enable its next Recruit step. This is
      // independent of a paid capsule versus the one-time cost waiver.
      const quantity = attempt.guided ? GUIDE_TRACE_QTY : 1;
      let item = game.items.find((row) => row.ref_id === refId && row.lock === 0);
      if (item && item.qty > 0xffffffff - quantity) return { error: "Trace inventory is full" };
      if (!item && (!Number.isSafeInteger(game.next_item_inst_id) || game.next_item_inst_id >= Number.MAX_SAFE_INTEGER))
        return { error: "Trace instance capacity reached" };
      if (item) item.qty += quantity;
      else { item = { inst_id: game.next_item_inst_id++, ref_id: refId, qty: quantity, lock: 0 }; game.items.push(item); }
      receipt.item.push({ inst_id: item.inst_id, ref_id: refId, added: quantity });
      receipt.reward_item.push({ ref_id: refId, qty: quantity });
    }
    game.search.last = { attempt, receipt };
    game.search.repeat.play_log.push({ ref_id: attempt.ref_id, log_id: attempt.log_id, inst_id: 0, owner: 0 });
    game.search.active = null;
    persist();
    return { data: receipt as unknown as Record<string, unknown> };
  }
  return { error: "Search action is not reconstructed" };
}
