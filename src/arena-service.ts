import { createHash } from "node:crypto";
import { ARENA_BP_COST, ARENA_DECK_TYPE, ARENA_DEFENSE_DECK_TYPE, ARENA_RIVAL_PVID, arenaProfile, arenaRival, arenaSeason, type ArenaReceipt } from "./arena.js";
import { resourceChargeTime, type LocalGameState } from "./game.js";
import type {ArenaComments} from "./arena-comments.js";

type Result = { data: Record<string, unknown> } | { error: string };
const numeric = (value: unknown) => typeof value === "number" ? value :
  typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
const pair = (prev: number, cur: number) => ({ prev, cur });
const refreshPrice = () => ({ price_type: 2, price: 100 });
const deckRows = (game: LocalGameState) => game.decks.map((deck) => ({ type: deck.type,
  ...Object.fromEntries(Array.from({ length: 5 }, (_, index) => [`inst_id_${index + 1}`, deck.list[index] ?? 0])) }));
function arenaDeck(game: LocalGameState) {
  return game.decks.find((row) => row.type === ARENA_DECK_TYPE) ??
    { type: ARENA_DECK_TYPE, list: [...(game.decks.find((row) => row.type === 1)?.list ?? [game.leader_inst_id, 0, 0, 0, 0])] };
}

/** Auth is supplied by ServerState. No mission handler/transport credential
 * mutation belongs here. BP1, honor10, rating±10 and six wins per league are
 * explicitly local policies; original economics are still unknown. */
export function arenaRequest(route: string, payload: Record<string, unknown>, pvid: number,
    game: LocalGameState, persist: () => void,comments?:ArenaComments,rank=1): Result {
  if (route === "/arena/Enter") {
    let initialized = false;
    if (!game.decks.some((row) => row.type === ARENA_DECK_TYPE)) {
      game.decks.push(arenaDeck(game)); initialized = true;
    }
    // Native defense dereferences GetDeckInfo(5) without a null check. Initial
    // formation copying is local policy; retain any independently configured5.
    if (!game.decks.some((row) => row.type === ARENA_DEFENSE_DECK_TYPE)) {
      game.decks.push({ type: ARENA_DEFENSE_DECK_TYPE, list: [...arenaDeck(game).list] }); initialized = true;
    }
    if (initialized) persist();
    return { data: { arena: { status: 1, season: arenaSeason() },
      user: { battle: arenaProfile(pvid, game.arena,comments,rank), is_weekly_reward: 0 }, deck: deckRows(game) } };
  }
  if (route === "/arena/FindRival") return { data: { arena: { rival_list: [arenaRival()] }, refresh_price: refreshPrice() } };
  // ReqMyRankCB (Gf600d8) reads ret_data.rank directly into PlayData+0x128.
  // ServerState supplies the same local standing used by full own profiles.
  if (route === "/arena/GetMyRank") return { data: { rank } };
  if (route === "/arena/BattleStart") {
    if (numeric(payload.target_pvid) !== ARENA_RIVAL_PVID || numeric(payload.bid) !== 0 ||
        numeric(payload.is_revenge) !== 0 || numeric(payload.is_friendship) !== 0)
      return { error: "arena target/revenge/friendship/bid is not reconstructed" };
    if (game.active_battle?.state === "active") return { error: "an expedition battle is active" };
    if (game.search.active) return { error: "a Search battle is active" };
    if (!game.arena.active) {
      const deck = arenaDeck(game), members = deck.list.filter((id) => id > 0);
      const owned = new Set([...game.starter_cards, ...game.recruited_cards].map((row) => row.inst_id));
      if (!members.length || members.some((id) => !owned.has(id))) return { error: "arena deck is empty or unowned" };
      if (game.bp < ARENA_BP_COST) return { error: "not enough arena BP" };
      const now = Date.now();
      if (game.bp >= game.max_bp) game.bp_updated_at = now;
      game.bp -= ARENA_BP_COST;
      if (!game.decks.some((row) => row.type === ARENA_DECK_TYPE)) game.decks.push(deck);
      game.arena.active = { target_pvid: ARENA_RIVAL_PVID, bid: 0, started_at: now, deck_inst_ids: members };
      persist();
    }
    // ParseApBp unconditionally synchronizes BOTH resources from flat scalars.
    return { data: { user: { ap: game.ap, ap_charge_time: resourceChargeTime(game, "ap"),
      bp: game.bp, bp_charge_time: resourceChargeTime(game, "bp") },
      arena: { combat_info: arenaRival() }, refresh_price: refreshPrice() } };
  }
  if (route !== "/arena/BattleComplete") return { error: "arena operation is not reconstructed" };
  if (numeric(payload.target_pvid) !== ARENA_RIVAL_PVID || numeric(payload.is_revenge) !== 0)
    return { error: "unsupported arena completion target/flags" };
  let info: unknown = payload.play_info;
  if (typeof info === "string") {
    try { info = JSON.parse(info); } catch { return { error: "invalid arena play_info" }; }
  }
  if (!info || typeof info !== "object" || Array.isArray(info)) return { error: "missing arena play_info" };
  const metrics = info as Record<string, unknown>;
  const won = metrics.is_win === true ? 1 : metrics.is_win === false ? 0 : numeric(metrics.is_win);
  if (![0, 1].includes(won)) return { error: "invalid arena win flag" };
  const normalized = [won];
  for (const key of ["clear_time", "dead_cnt", "player_total_hp", "player_total_hp_max", "enemy_total_hp", "enemy_total_hp_max", "atk_max", "atk_total", "atk_cnt"]) {
    const raw = metrics[key], value = typeof raw === "string" && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : raw;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER)
      return { error: "invalid arena play metrics" };
    normalized.push(value);
  }
  const before = { ...game.arena }, honorBefore = game.honor, attempt = game.arena.active;
  const signature = createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  if (!attempt && game.arena.last_result?.signature === signature)
    return { data: game.arena.last_result.receipt as unknown as Record<string, unknown> };
  if (attempt) {
    if (won) {
      if (![game.arena.win + 1, game.arena.rating_point + 10, game.honor + 10].every(Number.isSafeInteger))
        return { error: "arena reward overflow" };
      game.arena.win += 1; game.arena.league_win += 1;
      game.arena.rating_point += 10; game.honor += 10;
      if (game.arena.league_win >= 6 && game.arena.league_level < 6) {
        game.arena.league_level += 1; game.arena.league_win = 0;
      } else game.arena.league_win = Math.min(6, game.arena.league_win);
    } else {
      if (!Number.isSafeInteger(game.arena.lose + 1)) return { error: "arena loss overflow" };
      game.arena.lose += 1; game.arena.rating_point = Math.max(0, game.arena.rating_point - 10);
    }
    game.arena.active = null;
  }
  // No recovered completion nonce: settle one active attempt; repeated Complete
  // while none is active replays the most recent matching saved receipt. A stale completion crossing
  // a later same-target Start cannot be distinguished by this wire contract.
  const receipt: ArenaReceipt = { user: { battle: { league_level: pair(before.league_level, game.arena.league_level),
    win: pair(before.win, game.arena.win), lose: pair(before.lose, game.arena.lose),
    league_win: pair(before.league_win, game.arena.league_win), rating_point: pair(before.rating_point, game.arena.rating_point) },
    honor: pair(honorBefore, game.honor) },
    card: Object.fromEntries((attempt?.deck_inst_ids ?? []).flatMap((id) => {
      const card = [...game.starter_cards, ...game.recruited_cards].find((row) => row.inst_id === id);
      return card ? [[String(id), pair(Number(card.exp), Number(card.exp))]] : [];
    })) };
  if (attempt) { game.arena.last_result = { signature, receipt }; persist(); }
  return { data: receipt as unknown as Record<string, unknown> };
}
