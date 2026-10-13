/**
 * Small persistent local-game model used by the compatibility handlers.
 *
 * This is intentionally separate from the recovered account/transport model:
 * account identity is real local server state, while these starter balances,
 * item IDs and mission rewards are community-replica fixtures. They provide
 * deterministic client-visible behavior without pretending to be recovered
 * production economy data.
 */

// Bootstrap supplies the initial owned snapshot and monotone allocator start.
// It does not import this game model, so this edge cannot close a cycle.
import { FIXTURE_GACHA_FIRST_INST_ID, starterInventory, starterReference } from "./bootstrap.js";
import { normalizeFuelShop, type FuelShopState } from "./shop-fuel.js";
import { emptyArena, normalizeArena, type ArenaState } from "./arena.js";
import { emptySearch, normalizeSearch, type SearchState } from "./search-battle.js";
import { emptyLoginBonus, normalizeLoginBonus, type LoginBonusState } from "./login-bonus.js";
import { emptyMail, normalizeMail, type MailState } from "./mail.js";
import { emptySpecialSupply, normalizeSpecialSupply, type SpecialSupplyState } from "./special-supply.js";
import { emptyEpisodeProgress, normalizeEpisodeProgress, type EpisodeProgress } from "./episode-progress.js";
import {ownedFishingInventory} from "./fishing-inventory.js";
import type {FishingInventoryReplacement} from "./fishing-reference.js";

export interface LocalItemInstance {
  inst_id: number;
  ref_id: string;
  qty: number;
  lock: number;
}

/** Persisted CSRCard::parse instance fields; reference stats remain fixtures. */
export interface LocalCardInstance {
  inst_id: number;
  ref_id: string;
  [key: string]: string | number;
}

export interface LocalCardBookEntry { ref_id: string; rank: number }
export function mergeCardBook(...groups: Array<Array<{ ref_id: string; rank?: string | number }>>): LocalCardBookEntry[] {
  const ranks = new Map<string, number>();
  for (const rows of groups) for (const row of rows) {
    const rank = Number(row.rank ?? 1);
    if (typeof row.ref_id !== "string" || !row.ref_id || !Number.isSafeInteger(rank) || rank < 1) {
      throw new Error("Malformed card-book history; refusing to overwrite it");
    }
    ranks.set(row.ref_id, Math.max(ranks.get(row.ref_id) ?? 0, rank));
  }
  return [...ranks].sort(([a], [b]) => a.localeCompare(b)).map(([ref_id, rank]) => ({ ref_id, rank }));
}

/** Native SetDeck request uses ordered list; lobby expands it to five fields. */
export interface LocalDeckSetting { type: number; list: number[] }

export interface LocalMissionInstance {
  id: string;
  stage_id: string;
  state: number;
  progress: number;
  target: number;
  reward_gold: number;
}

/**
 * One expedition-map chest the account has already opened.
 *
 * Keyed by `(area_id, achieve_cnt)`, never by array index: the client sends
 * `target_achieve_cnt = to_string(GetRewards()[index].achieve_cnt)`
 * (`CSRSyncMStage::RequestReward`, 0xb3bf4c,
 * `analysis/ghidra-chest-01-reward-route.txt:158-160`) and
 * `CSRSyncMStage::ReqRewardCB` (0xb3c674) re-matches the RESPONSE against the
 * same `achieve_cnt` values (`:531`, `:566`). So the reward's reference value is
 * the claim's identity, and an index would silently disagree with it.
 *
 * **This is what makes the claim idempotent.** `AchieveRewardCB` only flips the
 * chest to the *opened* sprite because `SetAchieveRewardReceived` ran; the
 * client flag is also carried per (area, index) in `CSRPlayData+0x288`, which
 * the replica cannot authoritatively repopulate yet (see
 * `analysis/research/chest-rewards.md` §"IsReceivedAchieveReward").
 */
export interface LocalAreaRewardClaim {
  area_id: string;
  achieve_cnt: number;
}

export interface LocalBattleState {
  battle_id: string;
  stage_id: string;
  state: "active" | "completed";
  started_at: number;
  completed_at: number;
  deck_inst_ids: number[];
  enemy_count: number;
  result: number;
  stars: number;
  /** Actual fuel charged at Start; absent legacy attempts are not inferred. */
  ap_spent?: number;
  /** Refund ceiling preserves fuel that already exceeded the normal cap. */
  ap_refund_cap?: number;
}

export interface LocalGameState {
  /** Versioned local card-ID namespace; original production numbering unknown. */
  card_instance_namespace?: 1;
  ap: number;
  bp: number;
  /** Local regeneration anchors in epoch milliseconds; not protocol fields.
   * Legacy saves start counting on migration, without invented offline credit. */
  ap_updated_at: number;
  bp_updated_at: number;
  max_ap: number;
  max_bp: number;
  gold: number;
  /**
   * User exp. **[FIXTURE]** - the replica has no exp curve, level table or quest
   * flow; this exists only because `CSRSyncMStage::ReqCompleteCB` writes
   * `ret_data.user.exp.cur` into the client's exp readout (playdata+0x14c) and a
   * response that omits the pair leaves the counter wherever the lobby left it.
   * See `FIXTURE_STAGE_CLEAR_EXP` in `state.ts`.
   */
  exp: number;
  /** Veteran EXP; original login-claim builder awards 20. No historical backfill. */
  vip_exp: number;
  honor: number;
  gem: number;
  /** Explicit imported/seeded wire rows, never the legacy scalar gem counter. */
  owned_gems?: Record<string, unknown>[];
  /** Explicit owned fish counts; never created from a catalogue or bait pool. */
  owned_fish?: FishingInventoryReplacement[];
  leader_inst_id: number;
  items: LocalItemInstance[];
  /** Cards awarded after the bootstrap inventory. Never gacha popup metadata. */
  recruited_cards: LocalCardInstance[];
  /** Account-owned bootstrap instances, snapshotted once so training changes
   * and consumption survive reload instead of recreating the starter roster. */
  starter_cards: LocalCardInstance[];
  /** Maximum grade ever owned; consuming a hunter must not erase discovery. */
  card_book: LocalCardBookEntry[];
  decks: LocalDeckSetting[];
  missions: LocalMissionInstance[];
  active_battle: LocalBattleState | null;
  arena: ArenaState;
  search: SearchState;
  active_stage_id: string;
  cleared_stage_ids: string[];
  /**
   * Legacy/current count mirror: stage_id -> number of earned flags.
   *
   * **[RECOVERED]** `CSRSyncMStage::ReqCompleteCB` writes each
   * `ret_data.achieve[].order` through `CSRPlayData::SetStageAchieve(stage_id,
   * order)` (L1808-1897), and `CSRPlayData+0x27c`
   * (`std::map<std::string, STAGE_INFO>`) is what
   * `GetStageAchieveCnt(stage_id)` reads - and `GetStageAchieveCnt` is summed
   * over the area's stage links into `CSRSceneMStageMap`'s progress total
   * (`OnInit` 0xe912ac `:328-337`). That sum is the numerator the chest
   * thresholds are compared against.
   *
   * Native getter sums exactly THREE bytes, not order values. Legal flag
   * indices0..2; detailed identity is preserved in stage_achievements below.
   */
  stage_stars: Record<string, number>;
  /** Actual earned condition indices, preserving noncontiguous stars. */
  stage_achievements: Record<string, number[]>;
  /** Chests already opened, keyed by `(area_id, achieve_cnt)`. */
  claimed_area_rewards: LocalAreaRewardClaim[];
  /** UTC day of last local fuel claim; -1 means never. Original schedule unknown. */
  supply_fuel_claim_day: number;
  login_bonus: LoginBonusState;
  mail: MailState;
  special_supply: SpecialSupplyState;
  episode_progress: EpisodeProgress;
  fuel_shop: FuelShopState;
  bp_shop: FuelShopState;
  /** Next item instance id to hand out. Items have no recovered id allocator, so
   * the replica keeps a monotone local one. **[FIXTURE]** */
  next_item_inst_id: number;
  /**
   * The two gacha currencies, as reported back on
   * `/shop/GachaPremium` as `ret_data.user.iap_qty` / `.free_iap_qty`.
   *
   * **[RECOVERED]** that those are the two names: `CSRSyncLottery::ReqGachaPremiumCB`
   * (Ghidra `0xf74fb0`) reads `ret_data.user.iap_qty` (`ldr 0xf750c6`) and
   * `ret_data.user.free_iap_qty` (`ldr 0xf75112`) through `strtod`, i.e. both are
   * JSON NUMBERS, and writes them to `CPVDataMgr+0x9c` / `+0xa0`.
   *
   * Starting balances are preserved local fixtures. Native price/display
   * evidence proves30 for one,300 for eleven, with no scale100. Affordability
   * sums both pools and the total is charged once. Native confirmation says
   * green/free Manda first; earlier30000-from-EACH interpretation is retracted.
   * See recruitment-price-currency.md. Never rescale/refund old research saves.
   */
  gacha_iap_qty: number;
  gacha_free_qty: number;
  /**
   * Next card `inst_id` the gacha hands out. **[FIXTURE]** - no recovered card
   * serial allocator exists; the replica keeps a monotone local one starting
   * after the roster instances so a granted `inst_id` can never collide with an
   * instance `/lobby/GetCardInven` already published.
   */
  next_card_inst_id: number;
  tutorial: Array<{ type: number; step: number; is_cleared: number }>;
}

export interface LocalTutorialState {
  type: number;
  step: number;
  is_cleared: number;
}

/**
 * Tutorial gates the client refuses to advance past without server state.
 *
 * Evidence (native + community private-server notes):
 *   - `CSRSyncTutorial::Parse` calls `SetState(type, step, 3)` for every record
 *     with `is_cleared` true, so "cleared" is a numeric state, not a boolean.
 *   - `CSRPopUpTitle::ProcessTutorial` skips the title tutorial when
 *     `GetState(0, 5) > 1`.
 *   - `CSRSceneAreaSel::OnReset` skips the area-selection tutorial when
 *     `GetState(1, 3) > 1`.
 *
 * A replica that does not implement the tutorial battles cannot make the client
 * clear these naturally, so it sits on the title scene (blue sky, white clouds,
 * `TITLE_ANI.mp4`) and never reaches stage selection. Advertising them as
 * cleared is the documented workaround used by the community private server.
 *
 * `type`/`step` pairs below the four named gates are a deliberate superset: the
 * full tutorial enum is not yet named from the native binary, so the replica
 * clears a range of types/steps rather than pretending to know the exact table.
 * Extra cleared entries are harmless - `SetState` only raises the stored state -
 * but the four named gates are the ones with confirmed call sites.
 */
export const tutorialGates: LocalTutorialState[] = [
  // CSRPopUpTitle::ProcessTutorial - skip the opening title tutorial.
  { type: 0, step: 5, is_cleared: 1 },
  // CSRSceneAreaSel::OnReset - skip the area-selection tutorial.
  { type: 1, step: 3, is_cleared: 1 },
  // Area-selection completion and the mission-map Recruit finger guide, both
  // consulted by CSRTutorialMStageMap / CSRPopUpVillage.
  { type: 2, step: 0, is_cleared: 1 },
  { type: 3, step: 0, is_cleared: 1 },
];

/** Tutorial steps per type to sweep in addition to the named gates. */
const TUTORIAL_SWEEP_TYPES = 8;
const TUTORIAL_SWEEP_STEPS = 6;

/**
 * The full "tutorial complete" list the client is told about. Returned in
 * `GetBaseInfo` so the decision is available before the client has an account,
 * and again in `/lobby/Enter` for the same session.
 */
export function completeTutorialList(): LocalTutorialState[] {
  const seen = new Set<string>();
  const list: LocalTutorialState[] = [];
  const add = (type: number, step: number) => {
    const key = `${type}:${step}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ type, step, is_cleared: 1 });
  };
  for (const gate of tutorialGates) add(gate.type, gate.step);
  for (let type = 0; type < TUTORIAL_SWEEP_TYPES; type += 1) {
    for (let step = 0; step < TUTORIAL_SWEEP_STEPS; step += 1) add(type, step);
  }
  return list;
}

export function createLocalGameState(): LocalGameState {
  const frontliner = starterInventory.find((card) =>
    [1, 2].includes(starterReference.find((ref) => ref.base.id === card.ref_id)?.base.role ?? 0));
  const initialMembers = frontliner && frontliner.inst_id !== 1 ? [frontliner.inst_id, 1] : [1];
  return {
    ap: 50,
    bp: 10,
    ap_updated_at: Date.now(),
    bp_updated_at: Date.now(),
    max_ap: 50,
    max_bp: 10,
    gold: 10_000,
    exp: 0,
    vip_exp: 0,
    honor: 0,
    gem: 0,
    leader_inst_id: 1,
    items: [],
    recruited_cards: [],
    starter_cards: starterInventory.map((card) => ({ ...card })),
    card_book: mergeCardBook(starterInventory),
    // [FIXTURE starter formation] Offense/Defense first, captain support next.
    // Explicitly saved player formations are never rewritten by this default.
    decks: [{ type: 1, list: Array.from({ length: 5 }, (_, index) => initialMembers[index] ?? 0) }],
    missions: [],
    active_battle: null,
    arena: emptyArena(),
    search: emptySearch(),
    active_stage_id: "",
    cleared_stage_ids: [],
    stage_stars: {},
    stage_achievements: {},
    claimed_area_rewards: [],
    supply_fuel_claim_day: -1,
    login_bonus: emptyLoginBonus(),
    mail: emptyMail(),
    special_supply: emptySpecialSupply(),
    episode_progress: emptyEpisodeProgress(),
    fuel_shop: normalizeFuelShop(undefined),
    bp_shop: normalizeFuelShop(undefined),
    next_item_inst_id: 1,
    gacha_iap_qty: GACHA_STARTING_BALANCE,
    gacha_free_qty: GACHA_STARTING_BALANCE,
    next_card_inst_id: FIXTURE_GACHA_FIRST_INST_ID,
    tutorial: [{ type: 0, step: 5, is_cleared: 1 }],
  };
}

/**
 * **[FIXTURE]** starting gacha balance, per currency.
 *
 * Preserved research allowance, NOT an original balance. Do not rescale old
 * saves when correcting future prices. Native affordability sums both pools.
 */
export const GACHA_STARTING_BALANCE = 300_000;

/** Native standard prices/counts:30/1 and300/11, direct units, no x100.
 * Overrides are explicit local controls; original banners/nonstandard counts
 * remain unknown. See analysis/research/recruitment-price-currency.md. */
function recruitPriceSetting(value: string | undefined, fallback: number) {
  if (value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0) throw new Error("Invalid local recruitment price");
  return number;
}
export const GACHA_COST = recruitPriceSetting(process.env.BLUSTONE_GACHA_COST, 300);
export const GACHA_SINGLE_COST = recruitPriceSetting(process.env.BLUSTONE_GACHA_SINGLE_COST, 30);

export function normalizeLocalGameState(raw: unknown): LocalGameState {
  const fallback = createLocalGameState();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fallback;
  const value = raw as Record<string, unknown>;
  if (value.card_instance_namespace !== undefined && value.card_instance_namespace !== 1)
    throw new Error("Unsupported card instance namespace; refusing to overwrite ownership");
  if (value.supply_fuel_claim_day !== undefined &&
      (!Number.isSafeInteger(value.supply_fuel_claim_day) || Number(value.supply_fuel_claim_day) < -1)) {
    throw new Error("Malformed persisted Supply claim; refusing to reopen it");
  }
  const integer = (name: keyof LocalGameState, defaultValue: number) =>
    Number.isSafeInteger(value[name]) ? Number(value[name]) : defaultValue;
  const string = (name: keyof LocalGameState, defaultValue: string) =>
    typeof value[name] === "string" ? String(value[name]) : defaultValue;
  const battleValue = value.active_battle;
  const activeBattle: LocalBattleState | null = battleValue && typeof battleValue === "object" && !Array.isArray(battleValue)
    ? normalizeBattleState(battleValue)
    : null;
  const normalized: LocalGameState = {
    ...(value.card_instance_namespace === 1 ? { card_instance_namespace: 1 as const } : {}),
    ap: integer("ap", fallback.ap),
    bp: integer("bp", fallback.bp),
    ap_updated_at: Math.max(0, integer("ap_updated_at", fallback.ap_updated_at)),
    bp_updated_at: Math.max(0, integer("bp_updated_at", fallback.bp_updated_at)),
    max_ap: Math.max(1, integer("max_ap", fallback.max_ap)),
    max_bp: Math.max(1, integer("max_bp", fallback.max_bp)),
    gold: Math.max(0, integer("gold", fallback.gold)),
    exp: Math.max(0, integer("exp", fallback.exp)),
    vip_exp: (() => {
      const value = (raw as Record<string, unknown>).vip_exp ?? 0;
      if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffffffff)
        throw new Error("Malformed Veteran EXP");
      return value as number;
    })(),
    honor: Math.max(0, integer("honor", fallback.honor)),
    gem: Math.max(0, integer("gem", fallback.gem)),
    ...(value.owned_gems===undefined?{}:{owned_gems:(()=>{
      if(!Array.isArray(value.owned_gems)) throw new Error("Malformed owned Gem inventory; refusing to erase it");
      return structuredClone(value.owned_gems) as Record<string,unknown>[];
    })()}),
    ...(value.owned_fish===undefined?{}:{owned_fish:ownedFishingInventory(value.owned_fish)}),
    leader_inst_id: integer("leader_inst_id", fallback.leader_inst_id),
    items: Array.isArray(value.items) ? value.items as LocalItemInstance[] : [],
    recruited_cards: Array.isArray(value.recruited_cards)
      ? value.recruited_cards.filter((entry): entry is LocalCardInstance =>
        isRecord(entry) && Number.isSafeInteger(entry.inst_id) && Number(entry.inst_id) > 0 &&
        typeof entry.ref_id === "string" && entry.ref_id.length > 0)
      : [],
    starter_cards: Array.isArray(value.starter_cards)
      ? value.starter_cards.filter((entry): entry is LocalCardInstance =>
        isRecord(entry) && Number.isSafeInteger(entry.inst_id) && Number(entry.inst_id) > 0 &&
        typeof entry.ref_id === "string" && entry.ref_id.length > 0)
      : fallback.starter_cards,
    card_book: value.card_book === undefined ? [] : (() => {
      if (!Array.isArray(value.card_book) || value.card_book.some((row) => !isRecord(row) || typeof row.ref_id !== "string" ||
          !Number.isSafeInteger(row.rank) || Number(row.rank) < 1)) {
        throw new Error("Malformed card-book history; refusing to overwrite it");
      }
      return mergeCardBook(value.card_book as LocalCardBookEntry[]);
    })(),
    decks: Array.isArray(value.decks) ? value.decks.map((entry) => {
      if (!isRecord(entry) || !Number.isSafeInteger(entry.type) || Number(entry.type) < 1 ||
          !Array.isArray(entry.list) || entry.list.length !== 5 ||
          !entry.list.every((id) => Number.isSafeInteger(id) && Number(id) >= 0)) {
        throw new Error("Malformed persisted deck; refusing to overwrite it");
      }
      return { type: Number(entry.type), list: entry.list.map(Number) };
    }) : fallback.decks,
    missions: Array.isArray(value.missions) ? value.missions as LocalMissionInstance[] : [],
    active_battle: activeBattle,
    arena: normalizeArena(value.arena),
    search: normalizeSearch(value.search),
    active_stage_id: string("active_stage_id", ""),
    cleared_stage_ids: Array.isArray(value.cleared_stage_ids) ? value.cleared_stage_ids.filter((x): x is string => typeof x === "string") : [],
    stage_stars: isRecord(value.stage_stars)
      ? Object.fromEntries(Object.entries(value.stage_stars)
        .filter((entry): entry is [string, number] => typeof entry[0] === "string" && Number.isSafeInteger(entry[1]))
        .map(([stageId, stars]) => [stageId, Math.max(0, Number(stars))]))
      : {},
    stage_achievements: isRecord(value.stage_achievements)
      ? Object.fromEntries(Object.entries(value.stage_achievements).map(([id, orders]) => {
        if (!Array.isArray(orders) || !orders.every((order) => Number.isInteger(order) && order >= 0 && order <= 2)) {
          throw new Error("Malformed persisted stage achievements; refusing unsafe indices");
        }
        return [id, [...new Set(orders)].sort((a, b) => a - b)];
      })) : {},
    claimed_area_rewards: Array.isArray(value.claimed_area_rewards)
      ? value.claimed_area_rewards
        .filter((entry): entry is Record<string, unknown> => isRecord(entry))
        .filter((entry) => typeof entry.area_id === "string" && Number.isSafeInteger(entry.achieve_cnt))
        .map((entry) => ({ area_id: String(entry.area_id), achieve_cnt: Number(entry.achieve_cnt) }))
      : [],
    next_item_inst_id: Math.max(1, integer("next_item_inst_id", fallback.next_item_inst_id)),
    supply_fuel_claim_day: integer("supply_fuel_claim_day", -1),
    login_bonus: normalizeLoginBonus(value.login_bonus),
    mail: normalizeMail(value.mail),
    special_supply: normalizeSpecialSupply(value.special_supply),
    episode_progress: normalizeEpisodeProgress(value.episode_progress),
    fuel_shop: normalizeFuelShop(value.fuel_shop),
    bp_shop: normalizeFuelShop(value.bp_shop),
    gacha_iap_qty: Math.max(0, integer("gacha_iap_qty", fallback.gacha_iap_qty)),
    gacha_free_qty: Math.max(0, integer("gacha_free_qty", fallback.gacha_free_qty)),
    next_card_inst_id: Math.max(1, integer("next_card_inst_id", fallback.next_card_inst_id)),
    tutorial: Array.isArray(value.tutorial) ? value.tutorial.map((row) => {
      if (!isRecord(row) || !Number.isInteger(row.type) || !Number.isInteger(row.step) ||
          Number(row.type) < 0 || Number(row.step) < 0 || Number(row.type) > 0xffff_ffff || Number(row.step) > 0xffff_ffff) {
        throw new Error("Malformed persisted tutorial keys; refusing to overwrite them");
      }
      if (![0, 1, false, true].includes(row.is_cleared as number | boolean)) {
        throw new Error("Malformed persisted tutorial completion; refusing to overwrite it");
      }
      return { type: Number(row.type), step: Number(row.step), is_cleared: row.is_cleared === 1 || row.is_cleared === true ? 1 : 0 };
    }) : fallback.tutorial,
  };
  if (!Array.isArray(value.decks)) {
    const owned = new Set([...normalized.starter_cards, ...normalized.recruited_cards].map((card) => card.inst_id));
    normalized.decks = normalized.decks.map((deck) => {
      const members = deck.list.filter((id) => id > 0 && owned.has(id));
      return { ...deck, list: Array.from({ length: 5 }, (_, index) => members[index] ?? 0) };
    });
  }
  normalized.card_book = mergeCardBook(normalized.card_book, normalized.starter_cards, normalized.recruited_cards);
  return normalized;
}

/** [FIXTURE] rates already advertised by GetExtra, not recovered balance data. */
export const RESOURCE_REFRESH_SECONDS = { ap: 300, bp: 1800 } as const;

/** [RECOVERED] SyncAP/SyncBP store a NEXT-charge deadline in server seconds.
 * CalcAddtionalAP/BP computes trunc((now + interval - deadline) / interval).
 * See analysis/research/revival-systems-next.md. Internal anchors stay in ms. */
export function resourceChargeTime(game: LocalGameState, resource: "ap" | "bp"): number {
  // One-variable runtime control for the pre-recovery wire format.
  if (process.env.BLUSTONE_RESOURCE_CLOCK_MODE === "legacy-zero") return 0;
  const anchor = resource === "ap" ? game.ap_updated_at : game.bp_updated_at;
  return Math.floor(anchor / 1000) + RESOURCE_REFRESH_SECONDS[resource];
}

/** Settle elapsed resource recovery lazily on account access. Whole intervals
 * survive restarts; partial intervals survive reads. At/above cap there is no
 * banked recovery and overflow balances are preserved. A backwards host clock
 * reanchors without granting or removing points. Returns whether persistence
 * is needed. No client timestamp semantics are inferred from these anchors. */
export function regenerateResources(game: LocalGameState, now = Date.now()): boolean {
  let changed = false;
  for (const resource of ["ap", "bp"] as const) {
    const anchor = resource === "ap" ? "ap_updated_at" : "bp_updated_at";
    const maximum = resource === "ap" ? game.max_ap : game.max_bp;
    const previous = game[anchor];
    if (now < previous) {
      game[anchor] = now;
      changed = true;
    } else if (game[resource] >= maximum) {
      // A fresh spend resets this anchor in startMission. Advancing it here
      // also handles other future resource spenders without banking at cap.
      game[anchor] = now;
    } else {
      const interval = RESOURCE_REFRESH_SECONDS[resource] * 1000;
      const points = Math.floor((now - previous) / interval);
      if (points > 0) {
        game[resource] = Math.min(maximum, game[resource] + points);
        game[anchor] = game[resource] === maximum ? now : previous + points * interval;
        changed = true;
      }
    }
  }
  return changed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeBattleState(raw: object): LocalBattleState {
  const value = raw as Record<string, unknown>;
  const state = value.state === "completed" ? "completed" : "active";
  return {
    battle_id: typeof value.battle_id === "string" ? value.battle_id : "",
    stage_id: typeof value.stage_id === "string" ? value.stage_id : "",
    state,
    started_at: Number.isSafeInteger(value.started_at) ? Number(value.started_at) : 0,
    completed_at: Number.isSafeInteger(value.completed_at) ? Number(value.completed_at) : 0,
    deck_inst_ids: Array.isArray(value.deck_inst_ids)
      ? value.deck_inst_ids.filter((item): item is number => Number.isSafeInteger(item)).map(Number)
      : [],
    enemy_count: Number.isSafeInteger(value.enemy_count) ? Math.max(0, Number(value.enemy_count)) : 0,
    result: Number.isSafeInteger(value.result) ? Number(value.result) : 0,
    stars: Number.isSafeInteger(value.stars) ? Number(value.stars) : 0,
    ap_spent: Number.isSafeInteger(value.ap_spent) && Number(value.ap_spent) >= 0
      ? Number(value.ap_spent) : 0,
    ap_refund_cap: Number.isSafeInteger(value.ap_refund_cap) && Number(value.ap_refund_cap) >= 0
      ? Number(value.ap_refund_cap) : 0,
  };
}
