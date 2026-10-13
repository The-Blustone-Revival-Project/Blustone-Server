import crypto from "node:crypto";
import { guildLobby,type GuildRecord } from "./guild-lobby.js";
import { establishedGuildRecords } from "./guild-records.js";
import {parseGuildInfoQuery} from "./guild-info-query.js";
import {guildDetailRows} from "./guild-detail-rows.js";
import {parseGuildUserQuery,guildUserRows} from "./guild-user-query.js";
import {parseGuildDiscoveryRequest,guildDiscoveryRows} from "./guild-discovery.js";
import {guildRankingRows} from "./guild-ranking.js";
import {guildActionPrices,type GuildActionPrice} from "./guild-prices.js";
import {planLocalGuildFound} from "./guild-local-found.js";
import {planLocalGuildUpdate} from "./guild-local-update.js";
import {planLocalGuildDonate} from "./guild-local-donate.js";
import {nativeGuildSaleValue} from "./equipment-fee.js";
import {parseExpeditionEntrustRequest} from "./expedition-entrust.js";
import {dispatchPolicy,normalizeDispatch,planDispatchStart,dispatchId,dispatchStartWire,dispatchEndResult,dispatchEndWire,applyDispatchItems,
  type DispatchPolicy,type DispatchJournal} from "./local-dispatch.js";
import {guildWalletReceipt} from "./guild-wallet-receipt.js";
import {guildMembershipPolicy,type GuildMembershipPolicy} from "./guild-membership-policy.js";
import {guildApplications,guildPendingLobby,guildApplicantRows,type GuildApplication} from "./guild-applications.js";
import {planLocalGuildMembership} from "./guild-local-membership.js";
import {guildRolePolicy,type GuildRolePolicy,planLocalGuildAppoint} from "./guild-local-roles.js";
import {planLocalGuildBanish} from "./guild-local-banish.js";
import {guildNotificationState,guildNotificationRows,planGuildNotificationChange,type GuildNotification} from "./guild-notification-state.js";
import {guildInvitationState,planLocalGuildInvitation,reconcileGuildInvitationJoins,type GuildInvitation} from "./guild-invitations.js";
import {guildLevelBenefits,guildBenefitStrings,guildContributionPoints,guildContributionRewards,selectedGuildBenefit,
  type GuildLevelBenefit,type GuildBenefitStrings,type GuildContributionReward} from "./guild-progression-reference.js";
import {BADWORD_SOURCE,originalBadwordMatcher} from "./badword-source.js";
import { GUILD_SPRITE_EMBLEMS,GUILD_EMBLEM_SOURCE,verifyGuildEmblemSource } from "./guild-emblems.js";
import {repositoryPath} from "./paths.js";
import { LOCAL_CAMPAIGN_FIRST_CLEAR_TEAM_EXP } from "./campaign-reward-policy.js";
import type { CampaignTraceContext } from "./campaign-receipt-trace.js";
import { mirageLobby, mirageFriendFloors } from "./mirage.js";
import {configuredFishingItems,type FishingItemReference} from "./fishing-item-references.js";
import {configuredFishingCatalogue,fishingPoolRows,fishingPriceRows,type FishingCatalogue} from "./fishing-catalogue.js";
import {ownedFishingInventory} from "./fishing-inventory.js";
import {fishingSaleBindings,planFishingSale,type FishingSaleBindings} from "./fishing-sale.js";
import { changeSocialBlocks, socialBlockRows, type SocialBlocks } from "./social-blocks.js";
import { emptySocialFriends, normalizeSocialFriends, planSocialFriend, planSocialFriendRemoval, receivedSocialFriendCount, socialFriendList, type SocialFriends } from "./social-friends.js";
import { socialDiscovery } from "./social-discovery.js";
import { emptySocialLikes, normalizeSocialLikes, planSocialLikeToggle, readSocialLikeCount, socialLikeProjection, type SocialLikes } from "./social-likes.js";
import { planGroupRankUp } from "./group-rank-up.js";
import { cardSellProfitRows, planHunterSale, type CardSellProfit } from "./hunter-sale.js";
import {equipmentLevelPrices as parseEquipmentLevelPrices, equipmentRankPrices as parseEquipmentRankPrices,
  type EquipmentLevelPrice, type EquipmentRankPrice} from "./equipment-prices.js";
import {planEquipmentUpgrade} from "./equipment-upgrade.js";
import {configuredGemReferences} from "./gem-reference-profile.js";
import {parseGemInstances,type GemReference} from "./gem-instances.js";
import {planPaidGemMount} from "./gem-paid-mount.js";
import {gemRemovalPrices,type GemRemovalPrice} from "./gem-removal-prices.js";
import {gemSalePrices,planGemSale,type GemSalePrice} from "./gem-sale.js";
import {gemLevelPrices as parseGemLevelPrices,type GemLevelPrice} from "./gem-level-prices.js";
import {configuredGemCombinations} from "./gem-combination-reference.js";
import {gemWireRows,parseStateWithGemIds} from "./gem-wire.js";
import { episodeChapters, episodeLog, episodeStoryIds, recordEpisodeProgress } from "./episode-progress.js";
import { SEARCH_CAPSULE_ID } from "./search-capsules.js";
import { earnSpecialSupply, specialSupplyIds, specialSupplyList } from "./special-supply.js";
import { exchangeHunterTraces } from "./trace-exchange.js";
import { hunterSearchReference } from "./hunter-search.js";
import { HUNTER_TRACE_ITEMS, itemReference } from "./hunter-traces.js";
import { LOCAL_MAIL_PORTRAIT_PATH, mailboxRequest, recordVictoryNotice } from "./mail.js";
import { LOGIN_BONUS_GOLD, LOGIN_BONUS_VIP_EXP, loginBonusInstance, observeLoginBonus } from "./login-bonus.js";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { raisePrice, rankUpPrice, rankUpRows, rankUpTransition, trainingCurve } from "./training.js";
import { completionOrders, earnedStageOrders } from "./progression.js";
import { mergeTutorialRows } from "./tutorial.js";
import { arenaRequest } from "./arena-service.js";
import { searchBattleRequest, usedSearchHelpers } from "./search-battle.js";
import { teamLevel } from "./team-level.js";
import { earnSearchCapsule, explicitSearchCapsuleVictory } from "./search-capsules.js";
import { skillLevelLimit, skillUpPrice } from "./skill-training.js";
import { FIXTURE_FUEL_AP, FIXTURE_FUEL_ID, fuelCycle, fuelStatus, supplyActivities, supplyInstances } from "./supply.js";
import { BP_SHOP_AMOUNT, BP_SHOP_ID, FUEL_SHOP_AP, FUEL_SHOP_ID, FUEL_SHOP_LIMIT, FUEL_SHOP_PRICES, fuelPurchaseInventory, settleFuelShop } from "./shop-fuel.js";
import { completeTutorialList, createLocalGameState, GACHA_COST, GACHA_SINGLE_COST, mergeCardBook, normalizeLocalGameState, regenerateResources, resourceChargeTime, type LocalGameState, type LocalTutorialState } from "./game.js";
import { CARD_INSTANCE_BASE, CARD_INSTANCE_LIMIT, migrateCardInstanceNamespace, validateRawCardInstanceRoster } from "./card-instance-namespace.js";
import {
  FIXTURE_CHEST_COUNT,
  FIXTURE_GACHA_CARD,
  FIXTURE_GACHA_CARD_ENABLED,
  areaAchieveRewardEntry,
  areaAchieveRewardList,
  areaRecord,
  areaStageCount,
  cardInstance,
  starterLevels,
  linkedStageIds,
  partyProfile,
  recruitBirthRanks,
  starterAreas,
  starterInventory,
  starterReference,
  starterStages,
} from "./bootstrap.js";

/**
 * Draw-count bounds for `/shop/GachaPremium`.
 *
 * **[RECOVERED]** `cnt` is the only draw-count field on the request: the
 * observed 10+1 button posts `cnt: "11"`
 * (`analysis/research/in-game-stats.md` §5.3). **[FIXTURE]** the defaults for a
 * request that omits or mangles it, and the 11 ceiling - the result grid draws
 * ten cards plus one bonus, so anything above 11 has nowhere to go.
 */
const DEFAULT_GACHA_DRAWS = 1;
const MAX_GACHA_DRAWS = 11;

/** Refuse a roster dial that would invalidate existing ownership. Never
 * renumber recruits or erase them to make a changed fixture profile fit. */
function assertOwnedCardCompatibility(game: LocalGameState): void {
  const ids = new Set(starterInventory.map((entry) => entry.inst_id + (game.card_instance_namespace === 1 ? CARD_INSTANCE_BASE : 0)));
  const refs = new Set(starterReference.map((entry) => entry.base.id));
  for (const card of game.recruited_cards) {
    if (ids.has(card.inst_id)) {
      throw new Error("Bootstrap roster conflicts with a persisted recruited card ID; restore the prior BLUSTONE_PARTY_SIZE. Refusing to overwrite ownership.");
    }
    if (!refs.has(card.ref_id)) {
      throw new Error("Persisted recruited card has no published reference; restore the prior BLUSTONE_GACHA_CARD. Refusing to overwrite ownership.");
    }
    ids.add(card.inst_id);
  }
  const ownedIds = new Set<number>();
  for (const card of [...game.starter_cards, ...game.recruited_cards]) {
    if (ownedIds.has(card.inst_id) || !refs.has(card.ref_id)) {
      throw new Error("Invalid persisted owned card IDs/references. Refusing to overwrite ownership.");
    }
    ownedIds.add(card.inst_id);
  }
  const deckTypes = new Set<number>();
  for (const deck of game.decks) {
    const members = deck.list.filter((id) => id !== 0);
    if (deckTypes.has(deck.type) || new Set(members).size !== members.length || members.some((id) => !ownedIds.has(id))) {
      throw new Error("Persisted deck contains duplicate or unowned cards; refusing to overwrite ownership.");
    }
    deckTypes.add(deck.type);
  }
}

/** Keep flat profile EXP synchronized with the owned instance the existing
 * fixture profile names. Otherwise lobby reload would publish trained exp100
 * in inventory alongside exp0 in its leader/numbered profile fields. */
function ownedPartyProfile(pvid: number, game: LocalGameState) {
  const profile = partyProfile(pvid);
  profile.group_exp = game.exp;
  profile.league_level = game.arena.league_level;
  profile.rating_point = game.arena.rating_point;
  profile.inst_id_leader = game.leader_inst_id;
  const inventory = [...game.starter_cards, ...game.recruited_cards];
  for (const suffix of ["leader", "1", "2", "3", "4"]) {
    if (suffix !== "leader") {
      const id = game.decks.find((deck) => deck.type === 1)?.list[Number(suffix) - 1] ?? 0;
      // Empty numbered profile slots remain the existing compatibility leader
      // fallback; the actual deck five-field array carries authoritative zeros.
      profile[`inst_id_${suffix}`] = id > 0 ? id : game.leader_inst_id;
    }
    const card = inventory.find((entry) => entry.inst_id === Number(profile[`inst_id_${suffix}`]));
    if (card) {
      profile[`ref_id_${suffix}`] = card.ref_id;
      for (const key of ["exp", "rank", "rank_up_cnt", "awk_step", "overcome_cnt", "awk_overcome", "skin_ref_id",
        "skill_1_level", "skill_2_level", "skill_3_level", "skill_4_level", "skill_5_level"]) {
        if (card[key] !== undefined) profile[`${key}_${suffix}`] = card[key];
      }
    }
  }
  return profile;
}

/** The per-pull price, overridable for A/B. See `GACHA_COST` in game.ts. */
function gachaCost(draws: number): number | null {
  return draws === 1 ? GACHA_SINGLE_COST : draws === MAX_GACHA_DRAWS ? GACHA_COST : null;
}

export interface Account {
  pvid: number;
  deviceId: string;
  nickname: string;
  token: string;
  webToken: string;
  serverId: number;
  snsId: string;
  pushToken: string;
  extraData: Record<string, unknown>;
  email: string;
  isGuest: boolean;
  vsToken: string;
  otp: string;
  snsList: Record<string, string>;
  beginUtc: number;
  lastLoginAt: number;
  passwordHash: string;
  socialBlocks?: SocialBlocks;
}

export class NativeAuthError extends Error {
  constructor(public readonly code: number, message: string) {
    super(message);
    this.name = "NativeAuthError";
  }
}

export interface BaseInfo {
  pv_url: string;
  country_code: string;
  url_list: Array<{ url_key: string; address: string; param_format: string }>;
  auto_login: number;
  client_option: Record<string, unknown>;
  hash_tag: Record<string, unknown>;
  app_srv_list: Array<Record<string, unknown>>;
  app_srv_name_list: Array<{ srv_id: number; lang: string; name: string; desc: string }>;
  state: number;
  recommend_server: number;
  server_url: string;
  res_ver: number;
  new_res_ver: number;
  /**
   * Tutorial completion list. Advertised by the launcher so the title scene
   * and the area-selection scene are not gated on tutorial battles the
   * replica does not implement. See `completeTutorialList`.
   */
  tuto: LocalTutorialState[];
}

/**
 * The five-slot deck.
 *
 * `CSRSyncMStage` builds five battle participants and `MakeStageInst` calls
 * `CSRCard::SetRefID` with each instance's ref_id, so a slot that cannot be
 * resolved to a card asserts. `BLUSTONE_PARTY_SIZE` fills the remaining slots
 * with extra instances of the same card, so the experiment does not also
 * depend on art that the replica is not serving.
 *
 * Default 1: leader only, exactly as before this switch existed.
 */
function partyDeck(game: LocalGameState): Array<Record<string, number>> {
  return game.decks.map((deck) => Object.fromEntries([
    ["type", deck.type], ...deck.list.map((id, index) => [`inst_id_${index + 1}`, id]),
  ]));
}

/**
 * Default idempotency window for `/mission/Start`, in seconds.
 *
 * **[POLICY DECISION - NOT RECOVERED BEHAVIOUR.]** Nothing in the native
 * binary, and nothing in the community Go private server
 * (`recovered-assets/community-notes-2026-09-30/`), states how long the
 * original server considered a started battle "the same attempt". The only
 * recovered fact is that the CLIENT can re-issue a request:
 * `CPVHTTPRequest::GetRetryCnt()` (ELF 0x151773) and
 * `CPVHTTPRequest::IsEqual(std::string const&)` (ELF 0x1517c3) show the
 * transport keeps a per-request retry count and compares requests, so a
 * dropped response is retried by the client. That justifies having a window
 * at all; it does not fix its length.
 *
 * 30 s is chosen to cover a human double tap on Begin Battle (well under 1 s)
 * plus a transport-level retry, with a wide margin, while being short enough
 * that any deliberate new attempt is treated as a new battle. Override with
 * `BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS`:
 *   - `0`      - no idempotency at all; every start is a fresh battle. This
 *                is what a device run wants for a guaranteed-fresh response.
 *   - `forever` - the pre-2026-10-02 behaviour: an active battle for the stage
 *                is replayed regardless of age, including across a process
 *                restart. Kept so the r010-r015 confound stays reproducible.
 */
const DEFAULT_MISSION_START_IDEMPOTENCY_SECONDS = 30;

/**
 * Resolve the `/mission/Start` idempotency window in milliseconds.
 *
 * Returns `Infinity` for the documented "forever" modes. An unparseable or
 * negative value falls back to the default rather than silently disabling the
 * guard, so a typo cannot quietly reintroduce the double-charge the window
 * exists to prevent.
 */
function missionStartIdempotencyMs(): number {
  const raw = process.env.BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS;
  if (raw === undefined) return DEFAULT_MISSION_START_IDEMPOTENCY_SECONDS * 1000;
  const trimmed = raw.trim();
  if (trimmed === "") return DEFAULT_MISSION_START_IDEMPOTENCY_SECONDS * 1000;
  if (/^(forever|persistent|infinite|never)$/i.test(trimmed)) return Infinity;
  const seconds = Number(trimmed);
  if (!Number.isFinite(seconds) || seconds < 0) return DEFAULT_MISSION_START_IDEMPOTENCY_SECONDS * 1000;
  return seconds * 1000;
}

/**
 * Is the persisted battle the SAME attempt as the request being handled now?
 *
 * Under the `forever` window this is unconditionally true for any existing
 * battle, which reproduces the pre-2026-10-02 behaviour exactly. Under a
 * finite window a battle with no usable `started_at` (a legacy or hand-written
 * state row) is never "fresh enough": it cannot be shown to be recent, so it
 * is treated as stale.
 */
function battleIsWithinWindow(battle: { started_at: number } | null | undefined, windowMs: number, now: number): boolean {
  if (!battle) return false;
  if (!Number.isFinite(windowMs)) return true;
  if (!Number.isFinite(battle.started_at) || battle.started_at <= 0) return false;
  return now - battle.started_at < windowMs;
}

/**
 * **[FIXTURE]** economy and progression values published by `/mission/Complete`.
 *
 * None of these is recovered production data (AGENTS.md §15). What IS recovered is
 * the mechanism each one travels through:
 *   - `FIXTURE_STAGE_CLEAR_STARS` -> the length of `ret_data.achieve[]`, whose
 *     entries become `CSRPlayData::SetStageAchieve(stage_id, order)`. Native has THREE flags
 *     at indices0..2. Historical1..3 included an out-of-bounds write.
 *   - level follows the published EXP thresholds using the native getter.
 *     Native reads level and max_ap INSIDE user.exp; old root aliases were
 *     ignored. Original thresholds/AP-cap scaling remain unreconstructed.
 */
const FIXTURE_STAGE_CLEAR_GOLD = 10;
const FIXTURE_STAGE_CLEAR_EXP = LOCAL_CAMPAIGN_FIRST_CLEAR_TEAM_EXP;
const FIXTURE_STAGE_CLEAR_STARS = 3;

/** Diagnostic seeded flags are opt-in, default0. Nonzero values grant
 * compatibility credit, not recovered earned achievements. */
const FIXTURE_SEED_STAGE_STARS = resolveSeedStageStars();

function resolveSeedStageStars(): number {
  const raw = process.env.BLUSTONE_SEED_STAGE_STARS;
  if (raw === undefined) return 0;
  const trimmed = raw.trim();
  if (trimmed === "") return 0;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`BLUSTONE_SEED_STAGE_STARS="${raw}" must be a non-negative integer `
      + `(0..${FIXTURE_STAGE_CLEAR_STARS}). It is the star floor published for an uncleared stage.`);
  }
  return Math.min(parsed, FIXTURE_STAGE_CLEAR_STARS);
}

/** ParseMissionInfo reads achieve as STRING then parses embedded JSON.
 * {order:0..2} sets one of THREE flags; empty array text gives zero. Numeric
 * counts become singleton primitives and falsely set flag0. Native proof:
 * analysis/research/stage-achievement-contract.md. */
function stageAchieveList(game: LocalGameState): Array<{ stage_id: string; achieve: string }> {
  return starterStages.stage.map((stage) => {
    const earned = earnedStageOrders(game, stage.id);
    const orders = [...new Set([...earned, ...Array.from({ length: FIXTURE_SEED_STAGE_STARS }, (_, order) => order)])].sort();
    // ParseMissionInfo reads STRING, parses embedded JSON, then writes flags.
    // Numeric counts become primitive singleton loops and falsely grantflag0.
    return { stage_id: stage.id, achieve: JSON.stringify(orders.map((order) => ({ order }))) };
  });
}

/**
 * The expedition-map progress TOTAL for one area, in the replica's own terms.
 *
 * **[RECOVERED]** it is `Σ GetStageAchieveCnt(link)` over the area's links.
 * The client computes it from its own copy of `stage[]`, so this is the value
 * the server *believes* it is, not one it can observe; it exists so the claim
 * handler and the tests can reason about reachability and so a mismatch is
 * obvious.
 */
export function areaAchieveTotal(game: LocalGameState, areaId: string): number {
  const area = areaRecord(areaId);
  if (!area) return 0;
  const byStage = new Map(stageAchieveList(game).map((entry) => [entry.stage_id, JSON.parse(entry.achieve).length as number]));
  return area.stage.reduce((total, link) => total + (byStage.get(link.stage_id) ?? 0), 0);
}

/** Has this account already opened the chest identified by this reward value? */
export function isAreaRewardClaimed(game: LocalGameState, areaId: string, achieveCnt: number): boolean {
  return game.claimed_area_rewards.some((claim) => claim.area_id === areaId && claim.achieve_cnt === achieveCnt);
}

/**
 * The `stage[]` ids every area links to, for diagnostics and tests.
 * Re-exported so callers do not have to reach into bootstrap for one list.
 */
export const EXPEDITION_LINKED_STAGE_IDS = linkedStageIds();

/**
 * The chest count and per-area thresholds, for diagnostics and tests.
 * `Map<area_id, [S, 2S, 3S]>`.
 */
export const EXPEDITION_CHEST_THRESHOLDS: Record<string, number[]> = Object.fromEntries(
  starterAreas.area.map((area) => [area.id, areaAchieveRewardList(area.id).map((reward) => reward.achieve_cnt)]),
);

/**
 * **[RECOVERED] THE CRUISE DESTINATION LIST.**
 *
 * `CSRSceneAreaSel::SetData(AREA_INFO::TYPE type)` (0xe7360c) does
 *
 * ```
 * *(int *)(this + 0x658) = type;                       // :221
 * uVar5 = GetAreaCnt(type);                             // :268
 * *(uint *)(this + 0x65c) = uVar5;                      // :269
 * ```
 *
 * and `CSRSceneAreaSel::OnButtonClick` (0xe741dc `:553-555`) always enters the
 * cruise with `SetData(this, 1)`. `SetMarker` (0xe74804 `:433`) then loops
 * `i in [0, this->0x65c)` calling `GetAreaData(type, i)` and
 * `CMUpdatable::SetVisible(button, i != 0)` (`:337`) - **ordinal 0 is the
 * origin node and is deliberately hidden.**
 *
 * **=> The cruise offers exactly one button per published area of `type == 1`,
 * minus the ordinal-0 origin.** Before 2026-10-03 the replica published TWO
 * type-1 areas, so the airport offered exactly ONE destination, and that
 * destination's three stages led nowhere. This is the whole "cannot progress in
 * the cruise" report, and it is CONTENT, not shape: no response shape change
 * could fix it.
 */
export const EXPEDITION_CRUISE_AREAS = starterAreas.area
  .filter((area) => area.type === 1)
  .sort((left, right) => left.serial - right.serial)
  .map((area) => area.id);

/** The cruise buttons the client will actually draw: ordinals `1..N-1`. */
export const EXPEDITION_CRUISE_DESTINATIONS = EXPEDITION_CRUISE_AREAS.slice(1);

/**
 * **[RECOVERED] WHAT GATES PROGRESSION - the answer is "no server-side route".**
 *
 * `CSRSceneAreaSel::SetAreaState(const AREA_INFO& area, uint index)`
 * (0xe75cdc `:952-1011`) is the ONLY gate, and it is computed entirely on the
 * client from reference data plus the player's own star counts:
 *
 * ```
 * if (area.id.empty())                    -> RMTrace warn, skip;      // :928-950
 * if (CSRPlayData::GetUserLevel() < area.level_limit)                 // :965
 *      unlocked[area.serial] = false;                                 // LOCKED
 * else if (index < 2)
 *      unlocked[area.serial] = true;                                  // first two always open
 * else {
 *      prev   = GetAreaData(this->0x658 (the type), index - 1);       // :986
 *      links  = GetStageLinks(prev);                                  // :989
 *      last   = *(string*)(links.end() - 0xc);   // the LAST link's id  :992
 *      count  = CSRPlayData::GetStageAchieveCnt(last);                 // :995
 *      unlocked[area.serial] = (count != 0);                            // :1011
 * }
 * ```
 *
 * **There is no route to add, and nothing in `/lobby/Enter` is consulted as an
 * unlock flag.** The chain is:
 *
 *  1. `GetStageAchieveCnt(stage_id)` reads `CSRPlayData+0x27c`, a
 *     `std::map<std::string,STAGE_INFO>` keyed by stage id, which
 *     `/lobby/Enter`'s `stage: [{stage_id, achieve}]` fills and
 *     `/mission/Complete`'s `achieve[].order` grows (see `completeMission`);
 *  2. the "previous area" is `GetAreaData(type, index - 1)` - the previous
 *     AREA's last `stage[]` link, i.e. `n_0X_10`;
 *  3. so **area `n_0X+1` opens the moment the player has at least one star on
 *     `n_0X_10`.**
 *
 * `level_limit` is the second recovered gate and is neutralised by publishing
 * `0` (see `FIXTURE_AREA_LEVEL_LIMIT`), because `/lobby/Enter` publishes no
 * `level` key and `GetUserLevel()` is therefore unmodelled.
 *
 * `index < 2` is what makes this reachable at all: ordinals 0 and 1 - the
 * origin node and the FIRST expedition area - are unconditionally unlocked, so
 * `n_01` is always open and `n_02` is the first one that has to be earned.
 *
 * ## The star floor, and why it is a fixture
 *
 * `BLUSTONE_SEED_STAGE_STARS` defaults0. Nonzero diagnostic values grant
 * compatibility flags and may open areas prematurely. Normal progression: `n_02` then
 * stays locked until `n_01_10` is cleared through `/mission/Complete`.
 *
 * ## Why this mirrors the client rather than replacing it
 *
 * The client computes the gate itself; the server cannot refuse a locked area
 * because it never sees the request. This function therefore exists so the
 * tests can assert the SAME arithmetic the client performs, and so a divergence
 * between "what the server thinks is cleared" and "what `/lobby/Enter` publishes
 *" is caught immediately - `stageAchieveList` is the single source for both.
 */
export function isAreaUnlocked(game: LocalGameState, areaId: string): boolean {
  const cruise = EXPEDITION_CRUISE_AREAS;
  const index = cruise.indexOf(areaId);
  if (index < 0) return false;
  const current = areaRecord(areaId);
  if (!current || current.level_limit > teamLevel(game.exp)) return false;
  // Native checks the CURRENT area's level gate before ordinal0/1 shortcut.
  if (index < 2) return true;
  const previous = areaRecord(cruise[index - 1]);
  if (!previous) return false;
  // [RECOVERED] the previous area's LAST stage link must carry a star.
  const lastLink = previous.stage[previous.stage.length - 1];
  if (!lastLink) return false;
  const earned = stageAchieveList(game).find((entry) => entry.stage_id === lastLink.stage_id);
  return earned ? JSON.parse(earned.achieve).length > 0 : false;
}

/**
 * Read the client's own win byte out of `play_info.clear`.
 *
 * **[RECOVERED]** `play_info` is one of the eight form fields of
 * `CSRSyncMStage::RequestComplete` (0xb3aba8) and is a JSON *string* of
 * `CSRGameBase::MISSIONPLAY_INFO` (`nlohmann::json::dump()`, not a nested form
 * field). `clear` sits at struct offset `+0x28` and is filled from
 * `CSRMStage::OnFinish`'s `param_1`, which `CSRGameBase::ProcessFinish` sets to
 * `left.remain != 0` - the player camp still has a living actor
 * (analysis/research/battle-completion.md §3.3-§3.4). It is therefore the client's
 * own win/loss verdict, and the replica has no better source for one.
 *
 * The field is a byte, so the client may serialise it as `true`/`false` or as
 * `1`/`0`; both are accepted. An already-decoded object is accepted too, because
 * the replica's own JSON callers send one.
 *
 * **[FIXTURE]** An absent or unreadable `play_info` is treated as a WIN. The
 * native client always sends the field, so this default only affects hand-made
 * calls, and defaulting to a loss would silently make them reward-free.
 */
function playInfoClearFlag(raw: unknown): number {
  let info: unknown = raw;
  if (typeof raw === "string") {
    try {
      info = JSON.parse(raw);
    } catch {
      return 1;
    }
  }
  if (!info || typeof info !== "object" || Array.isArray(info)) return 1;
  const value = (info as Record<string, unknown>).clear;
  if (value === false || value === 0 || value === "0") return 0;
  return 1;
}

export class ServerState {
  private nextPvid = 1_000_001;
  private readonly accountsByDevice = new Map<string, Account>();
  private readonly accountsByToken = new Map<string, Account>();
  private readonly accountsByPvid = new Map<number, Account>();
  private readonly accountsByEmail = new Map<string, Account>();
  private readonly gameByPvid = new Map<number, LocalGameState>();
  private readonly pendingGameMigrations = new Set<number>();
  private readonly sharedSecretsByAccessToken = new Map<string, Buffer>();
  private readonly sessionPvidByAccessToken = new Map<string, number>();
  private selectedServer = 1;
  private socialFriends?: SocialFriends;
  private socialLikes?: SocialLikes;
  private guilds?: GuildRecord[];
  private nextGuildId?:number;
  private guildPending?:GuildApplication[];
  private guildNotifications?:GuildNotification[];
  private guildInvitations?:GuildInvitation[];
  private nextGuildNotificationId?:number;
  private readonly hunterSaleProfits: readonly CardSellProfit[];
  private readonly equipmentLevelPrices: readonly EquipmentLevelPrice[];
  private readonly equipmentRankPrices: readonly EquipmentRankPrice[];
  private readonly gemReferences: readonly GemReference[];
  private readonly gemCombinations: readonly Readonly<Record<string,string|number>>[];
  private readonly gemDisassemblePrices: readonly GemRemovalPrice[];
  private readonly gemSellPrices: readonly GemSalePrice[];
  private readonly gemLevelPrices: readonly GemLevelPrice[];
  private readonly fishingItems: readonly Readonly<FishingItemReference>[];
  private readonly fishingCatalogue?: FishingCatalogue;
  private readonly fishingSaleMode:"disabled"|"local-bound";
  private readonly fishingBindings?:FishingSaleBindings;
  private readonly guildChatMode:"disabled"|"local-memory";
  private readonly publicChatMode:"disabled"|"local-memory";
  private readonly dispatchMode:"disabled"|"local-timed";
  private readonly dispatchPolicy?:DispatchPolicy;
  private dispatches=new Map<number,DispatchJournal>();
  private readonly guildPrices: readonly GuildActionPrice[];
  private readonly guildCreationMode:"disabled"|"local-gold";
  private readonly guildUpdateMode:"disabled"|"local-manda-free-first";
  private readonly guildDonationMode:"disabled"|"local-gold";
  private readonly guildBadwordCheck?: (text:string)=>boolean;
  private readonly guildMembershipMode:"disabled"|"local-public-approval";
  private readonly guildMembershipPolicy?:Readonly<GuildMembershipPolicy>;
  private readonly guildManagementMode:"disabled"|"local-management";
  private readonly guildRolePolicy?:Readonly<GuildRolePolicy>;
  private readonly guildInvitationMode:"disabled"|"local-invitations";
  private readonly guildLevels?:readonly GuildLevelBenefit[];
  private readonly guildBenefitText?:GuildBenefitStrings;
  private readonly guildPoints?:Readonly<Record<string,number>>;
  private readonly guildRewards?:readonly GuildContributionReward[];

  constructor(public baseUrl = "http://127.0.0.1:8080", private readonly stateFile?: string,
    private readonly options: { legacyCardIds?: boolean; hunterSaleProfits?: unknown;
      equipmentLevelPrices?: unknown; equipmentRankPrices?: unknown; gemReferences?:unknown; gemCombinations?:unknown;
      gemDisassemblePrices?:unknown; gemSellPrices?:unknown; gemLevelPrices?:unknown; guildPrices?:unknown;
      guildCreationMode?:"disabled"|"local-gold";guildUpdateMode?:"disabled"|"local-manda-free-first";
      guildDonationMode?:"disabled"|"local-gold";
      guildMembershipMode?:"disabled"|"local-public-approval";guildMembershipPolicy?:unknown;
      guildManagementMode?:"disabled"|"local-management";guildRolePolicy?:unknown;
      guildInvitationMode?:"disabled"|"local-invitations";guildLevelBenefits?:unknown;guildBenefitStrings?:unknown;
      guildContributionPoints?:unknown;guildContributionRewards?:unknown;
      fishingItems?:unknown;fishingCatalogue?:unknown;fishingSaleMode?:"disabled"|"local-bound";fishingSaleBindings?:unknown;guildChatMode?:"disabled"|"local-memory";publicChatMode?:"disabled"|"local-memory";
      dispatchMode?:"disabled"|"local-timed";dispatchPolicy?:unknown } = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    const dispatchMode=Object.hasOwn(options,"dispatchMode")?options.dispatchMode:process.env.BLUSTONE_DISPATCH_MODE??"disabled";
    if(dispatchMode!=="disabled"&&dispatchMode!=="local-timed")throw new TypeError("Unknown dispatch mode");
    this.dispatchMode=dispatchMode;
    const policy=Object.hasOwn(options,"dispatchPolicy")?options.dispatchPolicy:process.env.BLUSTONE_DISPATCH_POLICY_JSON===undefined?undefined:JSON.parse(process.env.BLUSTONE_DISPATCH_POLICY_JSON);
    if(policy!==undefined)this.dispatchPolicy=dispatchPolicy(policy);
    if(dispatchMode!=="disabled"&&!this.dispatchPolicy)throw new TypeError("Local timed dispatch requires explicit reward/pass policy");
    const chatMode=options.guildChatMode??process.env.BLUSTONE_GUILD_CHAT_MODE??"disabled";
    if(chatMode!=="disabled"&&chatMode!=="local-memory") throw new TypeError("Unknown Guild Chat mode");
    this.guildChatMode=chatMode;
    const publicMode=options.publicChatMode??process.env.BLUSTONE_PUBLIC_CHAT_MODE??"disabled";
    if(publicMode!=="disabled"&&publicMode!=="local-memory") throw new TypeError("Unknown public Chat mode");
    this.publicChatMode=publicMode;
    const donationMode=Object.hasOwn(options,"guildDonationMode")?options.guildDonationMode:process.env.BLUSTONE_GUILD_DONATION_MODE??"disabled";
    if(donationMode!=="disabled"&&donationMode!=="local-gold")throw new TypeError("Unknown Guild donation mode");
    if(donationMode!=="disabled") {
      if(!["pkgi1","pkgi1-tree"].includes(process.env.BLUSTONE_PACKAGE_MODE??"")||!(process.env.BLUSTONE_PACKAGE_NAMES??"").split(",").includes("GUILD.jet"))
        throw new TypeError("Local Guild donation requires selected original Guild resource profile");
      verifyGuildEmblemSource(readFileSync(repositoryPath(GUILD_EMBLEM_SOURCE.path)));
    }
    this.guildDonationMode=donationMode;
    this.chatUrls(); // Validate enabled URLs before account/save operations.
    // Explicit local economy opt-in; no original profit rows are recovered.
    // Snapshot once so GetExtra and settlement cannot disagree after env edits.
    const configured = Object.hasOwn(options, "hunterSaleProfits") ? options.hunterSaleProfits : (process.env.BLUSTONE_CARD_SELL_PROFIT_JSON === undefined
      ? [] : JSON.parse(process.env.BLUSTONE_CARD_SELL_PROFIT_JSON));
    this.hunterSaleProfits = Object.freeze(cardSellProfitRows(configured).map((row) => Object.freeze(row)));
    const readPrices = (key: "equipmentLevelPrices" | "equipmentRankPrices", envName: string): unknown =>
      Object.hasOwn(options,key) ? options[key] : process.env[envName]===undefined ? [] : JSON.parse(process.env[envName]!);
    const knownItems = new Set(itemReference().item.map(item=>item.id));
    const fishItems=Object.hasOwn(options,"fishingItems")?options.fishingItems:
      process.env.BLUSTONE_FISHING_ITEMS_JSON===undefined?[]:JSON.parse(process.env.BLUSTONE_FISHING_ITEMS_JSON);
    this.fishingItems=configuredFishingItems(fishItems,new Set([...knownItems,"LU001","LU003",...starterReference.map(row=>row.base.id)]));
    const fishCatalogue=Object.hasOwn(options,"fishingCatalogue")?options.fishingCatalogue:
      process.env.BLUSTONE_FISHING_CATALOGUE_JSON===undefined?undefined:JSON.parse(process.env.BLUSTONE_FISHING_CATALOGUE_JSON);
    if(fishCatalogue!==undefined) this.fishingCatalogue=configuredFishingCatalogue(fishCatalogue,new Set(this.fishingItems.map(row=>row.id)));
    const fishSaleMode=Object.hasOwn(options,"fishingSaleMode")?options.fishingSaleMode:process.env.BLUSTONE_FISHING_SALE_MODE??"disabled";
    if(fishSaleMode!=="disabled"&&fishSaleMode!=="local-bound")throw new TypeError("Unknown fishing sale mode");this.fishingSaleMode=fishSaleMode;
    const fishBindings=Object.hasOwn(options,"fishingSaleBindings")?options.fishingSaleBindings:
      process.env.BLUSTONE_FISHING_SALE_BINDINGS_JSON===undefined?undefined:JSON.parse(process.env.BLUSTONE_FISHING_SALE_BINDINGS_JSON);
    if(fishBindings!==undefined)this.fishingBindings=fishingSaleBindings(fishBindings,new Set(this.fishingItems.filter(row=>row.use_type===17).map(row=>row.id)));
    if(fishSaleMode!=="disabled"&&(!this.fishingBindings||!this.fishingCatalogue))throw new TypeError("Local fishing sale requires explicit stack bindings and prices");
    const levelPrices = readPrices("equipmentLevelPrices","BLUSTONE_EQUIPMENT_LEVEL_PRICES_JSON");
    const rankPrices = readPrices("equipmentRankPrices","BLUSTONE_EQUIPMENT_RANK_PRICES_JSON");
    this.equipmentLevelPrices = Object.freeze((Array.isArray(levelPrices) && levelPrices.length===0 ? [] :
      parseEquipmentLevelPrices({result_code:1,ret_data:levelPrices},knownItems)).map(row=>Object.freeze(row)));
    this.equipmentRankPrices = Object.freeze((Array.isArray(rankPrices) && rankPrices.length===0 ? [] :
      parseEquipmentRankPrices({result_code:1,ret_data:rankPrices},knownItems)).map(row=>Object.freeze(row)));
    const gemRows=Object.hasOwn(options,"gemReferences")?options.gemReferences:
      process.env.BLUSTONE_GEM_REFERENCE_JSON===undefined?[]:JSON.parse(process.env.BLUSTONE_GEM_REFERENCE_JSON);
    this.gemReferences=Object.freeze(configuredGemReferences(gemRows).map(row=>Object.freeze(row)));
    const combinations=Object.hasOwn(options,"gemCombinations")?options.gemCombinations:
      process.env.BLUSTONE_GEM_COMBINATIONS_JSON===undefined?[]:JSON.parse(process.env.BLUSTONE_GEM_COMBINATIONS_JSON);
    this.gemCombinations=configuredGemCombinations(combinations);
    const removalPrices=Object.hasOwn(options,"gemDisassemblePrices")?options.gemDisassemblePrices:
      process.env.BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON===undefined?[]:JSON.parse(process.env.BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON);
    this.gemDisassemblePrices=Object.freeze(gemRemovalPrices({result_code:1,ret_data:removalPrices}).map(row=>Object.freeze(row)));
    const sellPrices=Object.hasOwn(options,"gemSellPrices")?options.gemSellPrices:
      process.env.BLUSTONE_GEM_SELL_PRICES_JSON===undefined?[]:JSON.parse(process.env.BLUSTONE_GEM_SELL_PRICES_JSON);
    this.gemSellPrices=Object.freeze(gemSalePrices({result_code:1,ret_data:sellPrices}).map(row=>Object.freeze(row)));
    const gemLevelPrices=Object.hasOwn(options,"gemLevelPrices")?options.gemLevelPrices:
      process.env.BLUSTONE_GEM_LEVEL_PRICES_JSON===undefined?[]:JSON.parse(process.env.BLUSTONE_GEM_LEVEL_PRICES_JSON);
    this.gemLevelPrices=Object.freeze(parseGemLevelPrices({result_code:1,ret_data:gemLevelPrices}).map(row=>Object.freeze(row)));
    const guildPrices=Object.hasOwn(options,"guildPrices")?options.guildPrices:
      process.env.BLUSTONE_GUILD_ACTION_PRICES_JSON===undefined?[]:JSON.parse(process.env.BLUSTONE_GUILD_ACTION_PRICES_JSON);
    this.guildPrices=Object.freeze(guildActionPrices({result_code:1,ret_data:guildPrices}).map(row=>Object.freeze(row)));
    const creationMode=Object.hasOwn(options,"guildCreationMode")?options.guildCreationMode:process.env.BLUSTONE_GUILD_CREATION_MODE??"disabled";
    if(creationMode!=="disabled"&&creationMode!=="local-gold") throw new TypeError("Unknown Guild creation mode");
    this.guildCreationMode=creationMode;
    if(creationMode==="local-gold"&&(!["pkgi1","pkgi1-tree"].includes(process.env.BLUSTONE_PACKAGE_MODE??"")||
      !(process.env.BLUSTONE_PACKAGE_NAMES??"").split(",").includes("GUILD.jet")))
      throw new TypeError("Local Guild creation requires selected original Guild resource profile");
    if(creationMode==="local-gold") verifyGuildEmblemSource(readFileSync(repositoryPath(GUILD_EMBLEM_SOURCE.path)));
    const updateMode=Object.hasOwn(options,"guildUpdateMode")?options.guildUpdateMode:process.env.BLUSTONE_GUILD_UPDATE_MODE??"disabled";
    if(updateMode!=="disabled"&&updateMode!=="local-manda-free-first") throw new TypeError("Unknown Guild update mode");
    this.guildUpdateMode=updateMode;
    if(updateMode!=="disabled") {
      if(!["pkgi1","pkgi1-tree"].includes(process.env.BLUSTONE_PACKAGE_MODE??"")||!(process.env.BLUSTONE_PACKAGE_NAMES??"").split(",").includes("GUILD.jet"))
        throw new TypeError("Local Guild update requires selected original Guild resource profile");
      verifyGuildEmblemSource(readFileSync(repositoryPath(GUILD_EMBLEM_SOURCE.path)));
    }
    if(creationMode!=="disabled"||updateMode!=="disabled")
      this.guildBadwordCheck=originalBadwordMatcher(readFileSync(repositoryPath(BADWORD_SOURCE.path)));
    const membershipMode=Object.hasOwn(options,"guildMembershipMode")?options.guildMembershipMode:process.env.BLUSTONE_GUILD_MEMBERSHIP_MODE??"disabled";
    if(membershipMode!=="disabled"&&membershipMode!=="local-public-approval") throw new TypeError("Unknown Guild membership mode");
    this.guildMembershipMode=membershipMode;
    const membershipPolicy=Object.hasOwn(options,"guildMembershipPolicy")?options.guildMembershipPolicy:
      process.env.BLUSTONE_GUILD_MEMBERSHIP_POLICY_JSON===undefined?undefined:JSON.parse(process.env.BLUSTONE_GUILD_MEMBERSHIP_POLICY_JSON);
    if(membershipPolicy!==undefined||membershipMode!=="disabled") this.guildMembershipPolicy=guildMembershipPolicy(membershipPolicy);
    if(membershipMode!=="disabled") {
      if(!["pkgi1","pkgi1-tree"].includes(process.env.BLUSTONE_PACKAGE_MODE??"")||!(process.env.BLUSTONE_PACKAGE_NAMES??"").split(",").includes("GUILD.jet"))
        throw new TypeError("Local Guild membership requires selected original Guild resource profile");
      verifyGuildEmblemSource(readFileSync(repositoryPath(GUILD_EMBLEM_SOURCE.path)));
    }
    const managementMode=Object.hasOwn(options,"guildManagementMode")?options.guildManagementMode:process.env.BLUSTONE_GUILD_MANAGEMENT_MODE??"disabled";
    if(managementMode!=="disabled"&&managementMode!=="local-management") throw new TypeError("Unknown Guild management mode");
    this.guildManagementMode=managementMode;
    const rolePolicy=Object.hasOwn(options,"guildRolePolicy")?options.guildRolePolicy:
      process.env.BLUSTONE_GUILD_ROLE_POLICY_JSON===undefined?undefined:JSON.parse(process.env.BLUSTONE_GUILD_ROLE_POLICY_JSON);
    if(rolePolicy!==undefined||managementMode!=="disabled") this.guildRolePolicy=guildRolePolicy(rolePolicy);
    if(managementMode!=="disabled") {
      if(!["pkgi1","pkgi1-tree"].includes(process.env.BLUSTONE_PACKAGE_MODE??"")||!(process.env.BLUSTONE_PACKAGE_NAMES??"").split(",").includes("GUILD.jet"))
        throw new TypeError("Local Guild management requires selected original Guild resource profile");
      verifyGuildEmblemSource(readFileSync(repositoryPath(GUILD_EMBLEM_SOURCE.path)));
    }
    const invitationMode=Object.hasOwn(options,"guildInvitationMode")?options.guildInvitationMode:process.env.BLUSTONE_GUILD_INVITATION_MODE??"disabled";
    if(invitationMode!=="disabled"&&invitationMode!=="local-invitations") throw new TypeError("Unknown Guild invitation mode");
    if(invitationMode!=="disabled"&&membershipMode!=="local-public-approval") throw new TypeError("Local Guild invitations require the complete membership mode/policy");
    this.guildInvitationMode=invitationMode;
    const progression=(key:"guildLevelBenefits"|"guildBenefitStrings"|"guildContributionPoints"|"guildContributionRewards",env:string)=>
      Object.hasOwn(options,key)?options[key]:process.env[env]===undefined?undefined:JSON.parse(process.env[env]!);
    const levels=progression("guildLevelBenefits","BLUSTONE_GUILD_LEVEL_BENEFITS_JSON"),text=progression("guildBenefitStrings","BLUSTONE_GUILD_BENEFIT_STRINGS_JSON"),
      points=progression("guildContributionPoints","BLUSTONE_GUILD_CONTRIBUTION_POINTS_JSON"),rewards=progression("guildContributionRewards","BLUSTONE_GUILD_CONTRIBUTION_REWARDS_JSON");
    if(levels!==undefined) this.guildLevels=Object.freeze(guildLevelBenefits(levels).map(row=>Object.freeze(row)));
    if(text!==undefined) this.guildBenefitText=Object.freeze(guildBenefitStrings(text));
    if(points!==undefined) this.guildPoints=Object.freeze(guildContributionPoints(points));
    if(rewards!==undefined) this.guildRewards=Object.freeze(guildContributionRewards(rewards,knownItems));
    if (stateFile && existsSync(stateFile)) {
      const migrated = this.restore(readFileSync(stateFile, "utf8"));
      // Validate every account/session first; atomically save identities before
      // any request can receive them. Constructor failure exposes no live state.
      if (migrated) this.persist();
    }
  }

  private restore(serialized: string) {
    let namespaceMigrated = false;
    const saved: unknown = parseStateWithGemIds(serialized);
    if (!isRecord(saved) || (saved.version!==1&&saved.version!==2) || !Array.isArray(saved.accounts) || !Array.isArray(saved.transportKeys)||
      saved.version===2&&!Array.isArray(saved.dispatches)||saved.version===1&&saved.dispatches!==undefined) {
      throw new Error("Unsupported or malformed local state; refusing to overwrite it");
    }
    const ids = new Set<number>();
    for (const raw of saved.accounts) {
      if (!isRecord(raw) || !Number.isSafeInteger(raw.pvid) || Number(raw.pvid) < 1 ||
        !["deviceId", "nickname", "token", "webToken", "snsId", "pushToken"].every((key) => typeof raw[key] === "string") ||
        !raw.token || !Number.isSafeInteger(raw.serverId) || !isRecord(raw.extraData)) {
        throw new Error("Malformed account in local state; refusing to overwrite it");
      }
      const account = normalizeStoredAccount(raw);
      if (ids.has(account.pvid) || this.accountsByDevice.has(account.deviceId) || this.accountsByPvid.has(account.pvid)) {
        throw new Error("Duplicate account in local state");
      }
      ids.add(account.pvid);
      this.indexAccount(account);
      this.nextPvid = Math.max(this.nextPvid, account.pvid + 1);
    }
    if (saved.socialLikes !== undefined)
      this.socialLikes = normalizeSocialLikes(saved.socialLikes, (pvid) => this.socialAccountProfile(pvid));
    if(saved.guilds!==undefined) this.guilds=establishedGuildRecords(saved.guilds,this.accountsByPvid);
    if(saved.guildPending!==undefined) this.guildPending=guildApplications(saved.guildPending,this.guilds??[],this.accountsByPvid);
    if(saved.guildNotifications!==undefined) this.guildNotifications=guildNotificationState(saved.guildNotifications,this.accountsByPvid,this.guildServerScopes());
    if(saved.guildInvitations!==undefined) this.guildInvitations=guildInvitationState(saved.guildInvitations,this.guilds??[],this.accountsByPvid,this.guildNotifications??[]);
    if(saved.nextGuildNotificationId!==undefined) {
      const maximum=Math.max(0,...(this.guildNotifications??[]).map(row=>row.id));
      if(typeof saved.nextGuildNotificationId!=="number"||!Number.isInteger(saved.nextGuildNotificationId)||saved.nextGuildNotificationId<=maximum||saved.nextGuildNotificationId>0x1_0000_0000)
        throw new TypeError("Malformed/colliding Guild notification allocator");
      this.nextGuildNotificationId=saved.nextGuildNotificationId;
    }
    if(saved.nextGuildId!==undefined) {
      const maximum=Math.max(0,...(this.guilds??[]).map(record=>record.id));
      if(typeof saved.nextGuildId!=="number"||!Number.isInteger(saved.nextGuildId)||saved.nextGuildId<=maximum||saved.nextGuildId>0x1_0000_0000)
        throw new TypeError("Malformed/colliding local Guild allocator; refusing to overwrite state");
      this.nextGuildId=saved.nextGuildId;
    }
    if (saved.socialFriends !== undefined) {
      this.socialFriends = normalizeSocialFriends(saved.socialFriends);
      for (const relation of this.socialFriends.relations) {
        const from = this.accountsByPvid.get(relation.from_pvid), to = this.accountsByPvid.get(relation.to_pvid);
        if (!from || !to || from.serverId !== to.serverId)
          throw new Error("Local friend relationship references unknown or different-server accounts");
      }
    }
    if (Array.isArray(saved.gameStates)) {
      const gamePvids = new Set<number>();
      for (const row of saved.gameStates) {
        if (!Array.isArray(row) || row.length !== 2 || !Number.isSafeInteger(row[0])) throw new Error("Malformed game state in local state");
        if (gamePvids.has(Number(row[0]))) throw new Error("Duplicate game state in local state; refusing to overwrite ownership");
        gamePvids.add(Number(row[0]));
        if (![...this.accountsByToken.values()].some((account) => account.pvid === row[0])) throw new Error("Game state references unknown account");
        if (!this.options.legacyCardIds || (isRecord(row[1]) && row[1].card_instance_namespace === 1))
          validateRawCardInstanceRoster(row[1]);
        const normalized = normalizeLocalGameState(row[1]);
        const game = !this.options.legacyCardIds || normalized.card_instance_namespace === 1
          ? migrateCardInstanceNamespace(normalized) : normalized;
        namespaceMigrated ||= game.card_instance_namespace === 1 && normalized.card_instance_namespace !== 1;
        assertOwnedCardCompatibility(game);
        this.validateOwnedGems(game);
        this.gameByPvid.set(Number(row[0]), game);
        if (!isRecord(row[1]) || !Number.isSafeInteger(row[1].ap_updated_at) || !Number.isSafeInteger(row[1].bp_updated_at) || !Array.isArray(row[1].recruited_cards) || !Array.isArray(row[1].starter_cards) || !Array.isArray(row[1].decks) || !isRecord(row[1].stage_achievements)) {
          this.pendingGameMigrations.add(Number(row[0]));
        }
      }
    }
    if(saved.dispatches!==undefined) {
      if(!Array.isArray(saved.dispatches))throw new TypeError("Malformed dispatch journal collection");
      for(const row of saved.dispatches) {
        if(!Array.isArray(row)||row.length!==2||!Number.isSafeInteger(row[0])||!this.accountsByPvid.has(row[0])||this.dispatches.has(row[0]))throw new TypeError("Invalid dispatch journal owner");
        const journal=normalizeDispatch(row[1]),game=this.gameByPvid.get(row[0]);
        if(!game||journal.active&&journal.active.deck.some(id=>![...game.starter_cards,...game.recruited_cards].some(card=>card.inst_id===id)))throw new TypeError("Dispatch owned Hunter commitment unavailable");
        this.dispatches.set(row[0],journal);
      }
    }
    for (const row of saved.transportKeys) {
      if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== "string" || typeof row[1] !== "string") throw new Error("Malformed transport state");
      const key = Buffer.from(row[1], "base64");
      if (key.length !== 48 || this.sharedSecretsByAccessToken.has(row[0])) throw new Error("Invalid transport key in local state");
      this.sharedSecretsByAccessToken.set(row[0], key);
    }
    if (Array.isArray(saved.sessionBindings)) {
      for (const row of saved.sessionBindings) {
        if (!Array.isArray(row) || row.length !== 2 || typeof row[0] !== "string" || !Number.isSafeInteger(row[1]) || Number(row[1]) < 0) {
          throw new Error("Malformed session binding in local state");
        }
        if (!this.sharedSecretsByAccessToken.has(row[0]) || (Number(row[1]) > 0 && !this.accountsByPvid.has(Number(row[1])))) {
          throw new Error("Session binding references unknown state");
        }
        this.sessionPvidByAccessToken.set(row[0], Number(row[1]));
      }
    }
    if (Number.isSafeInteger(saved.selectedServer)) this.selectedServer = Number(saved.selectedServer);
    return namespaceMigrated;
  }

  private persist() {
    if (!this.stateFile) return;
    mkdirSync(path.dirname(this.stateFile), { recursive: true });
    // Older version1 writers must refuse a journal they cannot preserve.
    const snapshot = { version: this.dispatches.size?2:1, selectedServer: this.selectedServer,
      ...(this.dispatches.size?{dispatches:[...this.dispatches]}:{}),
      ...(this.socialFriends === undefined ? {} : { socialFriends: this.socialFriends }),
      ...(this.socialLikes === undefined ? {} : { socialLikes: this.socialLikes }),
      ...(this.guilds === undefined ? {} : { guilds: this.guilds }),
      ...(this.nextGuildId === undefined ? {} : { nextGuildId: this.nextGuildId }),
      ...(this.guildPending === undefined ? {} : { guildPending: this.guildPending }),
      ...(this.guildNotifications===undefined?{}:{guildNotifications:this.guildNotifications}),
      ...(this.guildInvitations===undefined?{}:{guildInvitations:this.guildInvitations}),
      ...(this.nextGuildNotificationId===undefined?{}:{nextGuildNotificationId:this.nextGuildNotificationId}),
      accounts: [...this.accountsByDevice.values()],
      gameStates: [...this.gameByPvid].map(([pvid, game]) => [pvid, game]),
      transportKeys: [...this.sharedSecretsByAccessToken].map(([token, key]) => [token, key.toString("base64")]),
      sessionBindings: [...this.sessionPvidByAccessToken].map(([token, pvid]) => [token, pvid]),
    };
    // Single-process local store. Contains secrets; never publish or expose it.
    const temporary = `${this.stateFile}.tmp`;
    writeFileSync(temporary, JSON.stringify(snapshot), { mode: 0o600 });
    renameSync(temporary, this.stateFile);
  }

  resourceVersion = Number(process.env.BLUSTONE_RESOURCE_VERSION ?? 0);

  envelope<T>(data: T, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      // Native CPVDataMgr::ParseLauncherResp maps JSON result_code=1 to success.
      // Keep transport/protocol fields at zero; they are distinct from the
      // application result code.
      result_code: 1,
      protocol_code: 0,
      code: 0,
      // The recovered account callbacks parse the response payload from
      // `ret_data`; the launcher flow in this build consumes `data`. Emit
      // both names so the replica matches both native response families.
      ret_data: data,
      data,
      ...extra,
    };
  }

  failure(code = 2001, reason = "authentication failed"): Record<string, unknown> {
    const data = {
      pvid: 0,
      vs_token: "",
      nick_name: "",
      otp: "",
      sns_list: {},
      server_url: this.baseUrl,
      error: reason,
    };
    return {
      result_code: code,
      protocol_code: 0,
      code,
      ret_data: data,
      data,
    };
  }

  private indexAccount(account: Account): void {
    this.accountsByDevice.set(account.deviceId, account);
    this.accountsByPvid.set(account.pvid, account);
    if (account.email) this.accountsByEmail.set(account.email, account);
    for (const credential of [account.token, account.vsToken, account.otp]) {
      if (credential) this.accountsByToken.set(credential, account);
    }
  }

  private replaceOtp(account: Account): void {
    for (const [credential, candidate] of this.accountsByToken) {
      if (candidate === account && credential !== account.token && credential !== account.vsToken) {
        this.accountsByToken.delete(credential);
      }
    }
    account.otp = generateOTP();
    this.accountsByToken.set(account.otp, account);
  }

  private createAccount(deviceId: string, payload: Record<string, unknown>, isGuest = true): Account {
    const email = normalizeEmail(String(payload.email ?? payload.email_address ?? ""));
    const vsToken = randomCredential();
    const account: Account = {
      pvid: this.nextPvid++,
      deviceId,
      nickname: String(payload.nickname ?? payload.nick_name ?? (email ? email.split("@")[0] : `Captain${this.nextPvid - 1}`)),
      token: vsToken,
      webToken: `web-${crypto.randomBytes(14).toString("base64url")}`,
      serverId: 1,
      snsId: String(payload.sns_id ?? ""),
      pushToken: "",
      extraData: isRecord(payload.extra_data) ? payload.extra_data : {},
      email,
      isGuest,
      vsToken,
      otp: generateOTP(),
      snsList: email ? { "0": email } : { "0": "" },
      beginUtc: Math.floor(Date.now() / 1000),
      lastLoginAt: 0,
      passwordHash: "",
    };
    this.indexAccount(account);
    this.persist();
    return account;
  }

  private accessTokenFromHeaders(headers: Record<string, string>): string {
    return String(headers["pv-accesstoken"] ?? headers["pv-access-token"] ?? "");
  }

  private bindTransportSession(headers: Record<string, string>, pvid: number): void {
    const accessToken = this.accessTokenFromHeaders(headers);
    if (!accessToken) return;
    if (!this.sharedSecretsByAccessToken.has(accessToken)) throw new NativeAuthError(2001, "unknown transport session");
    const current = this.sessionPvidByAccessToken.get(accessToken) ?? 0;
    if (current !== 0 && current !== pvid) throw new NativeAuthError(2001, "transport session identity mismatch");
    this.sessionPvidByAccessToken.set(accessToken, pvid);
  }

  private sessionPvid(headers: Record<string, string>): number {
    const accessToken = this.accessTokenFromHeaders(headers);
    return accessToken ? this.sessionPvidByAccessToken.get(accessToken) ?? 0 : 0;
  }

  private pvidFromPayload(payload: Record<string, unknown>): number {
    const value = Number(payload.pvid ?? 0);
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  }

  accountFor(payload: Record<string, unknown>, headers: Record<string, string>): Account {
    const account = this.resolveAccount(payload, headers);
    this.bindTransportSession(headers, account.pvid);
    return account;
  }

  private resolveAccount(payload: Record<string, unknown>, headers: Record<string, string>): Account {
    const credential = String(payload.otp ?? payload.token ?? "");
    const vsToken = String(payload.vs_token ?? payload.vsToken ?? "");
    const requestPvid = this.pvidFromPayload(payload);
    const boundPvid = this.sessionPvid(headers);
    let account = this.accountsByToken.get(credential) ?? this.accountsByToken.get(vsToken);

    if (boundPvid > 0) {
      if (account && account.pvid !== boundPvid) throw new NativeAuthError(2001, "request identity does not match transport session");
      account = this.accountsByPvid.get(boundPvid);
      if (!account) throw new NativeAuthError(2001, "account does not exist");
    } else if (account && requestPvid > 0 && account.pvid !== requestPvid) {
      throw new NativeAuthError(2001, "pvid does not match credential");
    }

    if (!account) throw new NativeAuthError(2001, "authenticated account required");
    return account;
  }

  private accountResponse(account: Account): Record<string, unknown> {
    const data = { ...this.accountSnapshot(account), ...this.baseInfo(), tuto: this.tutorialState(this.gameFor(account)) };
    return this.envelope(data, { ...data });
  }

  /**
   * Tutorial completion list sent to the client.
   *
   * On by default because a replica cannot run the tutorial battles, and the
   * client will not leave the title scene or reach stage selection while the
   * tutorial state says otherwise. `BLUSTONE_TUTORIAL_COMPLETE=0` falls back to
   * the single-entry fixture, which is the honest "new player" state and is
   * what the newbiew flow should use once the tutorial battles are implemented.
   */
  private tutorialState(game?: LocalGameState): LocalTutorialState[] {
    const base = process.env.BLUSTONE_TUTORIAL_COMPLETE === "0"
      ? createLocalGameState().tutorial : completeTutorialList();
    return mergeTutorialRows(base, game?.tutorial ?? []);
  }

  /** The persistent local-game model for one account, created on first use.
   * Public because the expedition-map helpers (`areaAchieveTotal`,
   * `isAreaRewardClaimed`) and `tests/chest-reward.ts` need to reason about the
   * same state the handlers mutate. */
  gameFor(account: Account): LocalGameState {
    let game = this.gameByPvid.get(account.pvid);
    if (!game) {
      const fresh = createLocalGameState();
      game = this.options.legacyCardIds ? fresh : migrateCardInstanceNamespace(fresh);
      this.gameByPvid.set(account.pvid, game);
      try { this.persist(); } catch (error) { this.gameByPvid.delete(account.pvid); throw error; }
    }
    const regenerated = regenerateResources(game);
    if (this.pendingGameMigrations.has(account.pvid) || regenerated) {
      this.persist();
      this.pendingGameMigrations.delete(account.pvid);
    }
    return game;
  }

  lobbyEnter(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameFor(account);
    const skipMissionTutorial = process.env.BLUSTONE_SKIP_MISSION_TUTORIAL === "1";
    const skipAllTutorials = process.env.BLUSTONE_SKIP_ALL_TUTORIALS === "1";
    const baseTutorial = skipAllTutorials
      ? completeTutorialList()
      : skipMissionTutorial
      ? [
          ...this.tutorialState(),
          { type: 1, step: 3, is_cleared: 1 },
          // CSRTutorialMStageMap/CSRPopUpVillage consults the native
          // CSRSyncTutorial state for TU_TYPE 3, TU_STEP 0 before presenting
          // the guided Recruit building.  This is a diagnostic-only escape
          // hatch; normal smoke tests keep the fixture tutorial unchanged.
          { type: 3, step: 0, is_cleared: 1 },
        ]
      : this.tutorialState();
    const tutorial = mergeTutorialRows(baseTutorial, game.tutorial);
    // Native claim rows and local progress diagnostics are distinct. Historical
    // area-keyed received[] guesses were not read by ParseMissionInfo.
    const areaProgress = this.areaProgressSnapshot(game);
    const areaAchieve = this.areaRewardClaims(game);
    const stageAchieve = stageAchieveList(game);
    if (skipMissionTutorial) {
      for (const tutorialArea of ["tutorial", "TUTORIAL"]) {
        areaProgress[tutorialArea] = { achieve_cnt: FIXTURE_SEED_STAGE_STARS, received: [] };
      }
    }
    return this.envelope({
      // **[RECOVERED]** `CSRSyncGlobal::ParseUserDatailInfo` (0xf6e240) reads
      // `ret_data` and then this exact flat key set off it, including the
      // `inst_id_<n>` / `ref_id_<n>` / `rank_<n>` / `exp_<n>` /
      // `skill_<k>_level_<n>` numbered slots whose suffixes are built by string
      // concatenation, and the `_leader` equivalents
      // (analysis/ghidra-userdetail.txt). `ref_id_*` is passed straight into
      // `CSRCard::SetRefID` at 0xf6e62e (numbered loop) and 0xf6eda2
      // (`_leader`), and `SetRefID` asserts `sRefID.length() > 0` at
      // SRCard.cpp:731 - one assertion per slot.
      //
      // Until 2026-10-02 these keys were only sent on
      // `/relation/GetTargetUserInfo`, and that route provably had no effect on
      // the wire target (analysis/testing/report-009.md: the five empty ref ids
      // were byte-identical with the keys present). `/lobby/Enter` is the global
      // sync payload, so it is the more likely dispatch site for the same
      // `CSRSyncGlobal` parser, and it was measured to be missing every one of
      // them. They are published here at the TOP level of `ret_data`, which is
      // where the parser looks, alongside the existing `user`/`deck` objects.
      //
      // Purely additive: a parser that is not dispatched with this response
      // ignores the keys, and the parser tolerates missing keys (an absent
      // `ref_id_<n>` currently yields an empty string rather than throwing).
      ...ownedPartyProfile(account.pvid, game),
      nick_name: account.nickname,
      nickname: account.nickname,
      tuto: tutorial,
      // **[RECOVERED container, [INFERRED] key] `area_achieve` populates
      // `CSRPlayData+0x288` (`std::map<std::string, AREA_ACHIEVE_INFO>`), which
      // `IsReceivedAchieveReward` (0xb6d14c) reads to decide whether a chest is
      // *opened*, *claimable* or *locked*. `stage` is the sibling map at +0x27c,
      // keyed by stage id, that `GetStageAchieveCnt` reads - the sum of which
      // over an area's links IS the expedition-map progress total. Both are
      // published here AND inside `user`, because the dispatch site of the
      // parser that owns them is not proven.
      area_achieve: areaAchieve,
      area_progress: areaProgress,
      stage: stageAchieve,
      user: {
        ap: game.ap, bp: game.bp, gdp: 0, max_ap: game.max_ap, max_bp: game.max_bp, max_gdp: 100,
        gold: game.gold, honor: game.honor, group_exp: game.exp, vip_exp: game.vip_exp, card_inven_max: 100,
        ap_charge_time: resourceChargeTime(game, "ap"), bp_charge_time: resourceChargeTime(game, "bp"), leader_inst_id: game.leader_inst_id,
        is_newbiew: 0, is_dailyquest_newbie: 0, is_shared: 0, pm_key: "", tuto: tutorial,
        area_achieve: areaAchieve,
        area_progress: areaProgress,
        stage: stageAchieve,
      },
      battle: {
        league_level: game.arena.league_level, rating_point: game.arena.rating_point, rank: 1,
        league_win: game.arena.league_win, win: game.arena.win, lose: game.arena.lose,
        maintenance: 0, battle_server_maintenance: 0, server_maintenance: 0,
        state: 1,
      },
      // Authoritative persisted formation, including allfive lobby fields.
      deck: partyDeck(game),
      iap_bonus: [], iap_achieve_reward: [], special: specialSupplyList(game.special_supply), nickname_list: [],
    });
  }

  /** Native lobby uses rows {area_id,achieve_cnt}, one per CLAIMED chest.
   * Parsed into an internal map; the map's shape is not the wire shape.
   * Multiple claims repeat area_id. received[] is not read by the client.
   * Evidence: analysis/research/area-reward-flags.md. */
  private areaRewardClaims(game: LocalGameState) {
    // ParseMissionInfo consumes row VALUES with area_id and claimed threshold.
    // Multiple claimed chests need multiple rows; object keys/received ignored.
    return game.claimed_area_rewards.map((claim) => ({ ...claim }));
  }

  private areaProgressSnapshot(game: LocalGameState): Record<string, { achieve_cnt: number; received: number[] }> {
    const published: Record<string, { achieve_cnt: number; received: number[] }> = {};
    for (const area of starterAreas.area) {
      const rewards = areaAchieveRewardList(area.id);
      published[area.id] = {
        achieve_cnt: areaAchieveTotal(game, area.id),
        received: rewards.map((reward) => (isAreaRewardClaimed(game, area.id, reward.achieve_cnt) ? 1 : 0)),
      };
    }
    return published;
  }

  /**
   * `POST /mission/ReqAchieveReward` - the expedition-map chest claim.
   *
   * **[RECOVERED] request.** URL-encoded form, **exactly 7 keys**:
   * `app_code, app_ver, market, pvid, otp, area_id, target_achieve_cnt`
   * (`CSRSyncMStage::RequestReward`, 0xb3bf4c; `unordered_map(local_118,
   * local_d0, 7)` at `ghidra-chest-01-reward-route.txt:168`, and
   * `CPVHTTPMapToEncodedURLFormTransformer`). `target_achieve_cnt` is **not** an
   * index - it is `to_string(GetRewards()[index].achieve_cnt)` (`:158-160`).
   *
   * **[RECOVERED] response.** `ret_data` must be a JSON **object** (`ReqRewardCB`
   * dispatches on `*rd`: `== 1` object, `== 2` array, anything else is an error
   * path at `:586-612`), and `ret_data.achieve_cnt` must equal one of the
   * published `achieve_reward[].achieve_cnt` values. That match is the ONLY
   * thing that runs `SetAchieveRewardReceived` (`:570`), and it is also what
   * makes `found` true, so `cb(found ? i : -1, ...)` (`:1256-1263`) hands
   * `AchieveRewardCB` an index instead of `-1`. With `-1` the callback does
   * nothing but `Toast()` and return (`ghidra-chest-01-reward-route.txt:1776-1783`),
   * and **the chest never reaches the `opened` sprite state** - which is the
   * reported "cannot receive".
   *
   * **[RECOVERED] `result_code` is 1 on every path, including the refusals.**
   * `ReqRewardCB` bails to `cb(-1, 0)` on any non-1 code (`:463-473`), and
   * `CPVHTTPManager::Enqueue` retries a request whose response was not
   * `result_code == 1` - the same 8x silent retry `/mission/Complete` measured
   * (analysis/testing/report-017.md §1). A refusal is therefore expressed by
   * the PAYLOAD: an `achieve_cnt` that matches nothing, which makes the client's
   * own `found` false and raises the same toast, without ever leaving a
   * non-1 code on the wire.
   *
   * **[RECOVERED] `achievement` is OMITTED**, never `[]`. `ReqRewardCB :517-520`
   * guards it with `if (rd["achievement"] != null)`, an IS-NULL test on
   * nlohmann's `value_t`, and the branch calls
   * `CSRAchieve::ParseAchievementsElement` (0x8481c4) - a
   * `/dailyquest/GetInstList` REQUEST builder - from inside a response callback.
   * `free_iap` and `iap` are omitted for the same reason: they are gated on
   * `CPVDataMgr+0x58/0x5c`, which the replica cannot know, and omitting them
   * skips the branch entirely.
   */
  requireAchieveReward(payload: Record<string, unknown>, headers: Record<string, string>) {
    const areaId = String(payload.area_id ?? "");
    // Form values arrive as strings. An unparseable target is refused, never
    // coerced to 0 - and `0` is not a legal `achieve_cnt` for any published area.
    const rawTarget = String(payload.target_achieve_cnt ?? "");
    const target = Number(rawTarget.trim());
    const targetIsInteger = rawTarget.trim() !== "" && Number.isSafeInteger(target);
    const echo = targetIsInteger ? target : 0;

    // A claim must never answer with a non-1 code, and an unauthenticated
    // request cannot be answered with a failure envelope either - so the
    // credential is resolved defensively. `accountFor` throws NativeAuthError,
    // which `stateCall` in server.ts would turn into `result_code: 2001`.
    let game: LocalGameState | null = null;
    let authenticated = true;
    try {
      game = this.gameFor(this.accountFor(payload, headers));
    } catch {
      authenticated = false;
    }

    const entry = targetIsInteger ? areaAchieveRewardEntry(areaId, target) : undefined;
    // The one invariant that must hold: no entry is ever awarded twice, and no
    // award happens for a value that is not a published reward.
    if (!game || !entry) {
      return this.envelope({
        // **[RECOVERED]** echoed verbatim. For an unknown value this is exactly
        // why the client refuses it: `ReqRewardCB` scans `GetRewards()` for a
        // match and finds none.
        achieve_cnt: echo,
        // **[RECOVERED]** {prev,cur}: applied only when `prev != 0`
        // (`ghidra-chest-01-reward-route.txt:629-717`). Equal here - nothing paid.
        gold: { prev: game?.gold ?? 0, cur: game?.gold ?? 0 },
        // **[RECOVERED]** ARRAY of {ref_id, inst_id, qty}; both loops in
        // `ReqRewardCB` (`:880-1020`, `:1085-1235`) iterate it, so it is
        // present and empty rather than absent.
        item: [],
        // ---- inert local diagnostics; `ReqRewardCB` reads none of these ----
        area_id: areaId,
        requested_target_achieve_cnt: rawTarget,
        claimed: false,
        authenticated,
        error_code: !targetIsInteger ? "MALFORMED_TARGET_ACHIEVE_CNT"
          : areaRecord(areaId) ? "UNKNOWN_ACHIEVE_CNT" : "UNKNOWN_AREA",
        reward: null,
      });
    }

    const alreadyClaimed = isAreaRewardClaimed(game, areaId, entry.achieve_cnt);
    // **[DEFECT D1 FIX, report-018 §5]** The payout is gated on the area actually
    // having reached the threshold this chest is drawn at.
    //
    // report-018 measured 3/3 across n_01, n_02 and n_05: the response carried
    // "area_achieve_cnt":0, "required_achieve_cnt":10, "claimed":true and PAID
    // 300 gold + a 4-star ticket anyway - +600 gold and 3 items for ZERO stages
    // cleared. The whole chest economy rested on one client-side inequality, and
    // the device run showed that inequality is not doing the gating.
    //
    // **[RECOVERED]** the threshold is the reward's own `achieve_cnt`
    // (`achieve_reward[].achieve_cnt`, the same value echoed back as
    // `target_achieve_cnt`), and the progress total is
    // `sum GetStageAchieveCnt(link)` over the area's links - the same two
    // quantities `chest-rewards.md` §Q2 reconstructs as `N` and `S*(i+1)`.
    //
    // A claim below the threshold is refused through the PAYLOAD, never through
    // `result_code`: `ReqRewardCB` bails to `cb(-1,0)` on any non-1 code and the
    // transport retries 8x silently.
    const areaTotal = areaAchieveTotal(game, areaId);
    const thresholdMet = areaTotal >= entry.achieve_cnt;
    const goldBefore = game.gold;
    const itemList: Array<{ inst_id: number; ref_id: string; qty: number }> = [];
    if (!alreadyClaimed && thresholdMet) {
      game.claimed_area_rewards.push({ area_id: areaId, achieve_cnt: entry.achieve_cnt });
      game.gold = Math.max(0, game.gold + entry.gold);
      for (const item of entry.item_list) {
        const instId = game.next_item_inst_id;
        game.next_item_inst_id += 1;
        game.items.push({ inst_id: instId, ref_id: item.id, qty: item.qty, lock: 0 });
        itemList.push({ inst_id: instId, ref_id: item.id, qty: item.qty });
      }
      this.persist();
    }
    return this.envelope({
      // **[RECOVERED]** THE field. It equals `GetRewards()[i].achieve_cnt`
      // because the request's `target_achieve_cnt` is that value, so echoing is
      // what makes `SetAchieveRewardReceived` run and flips the chest to
      // `opened` - the only state in which the "open and closed at once"
      // double sprite stops drawing.
      achieve_cnt: entry.achieve_cnt,
      // **[RECOVERED]** {prev,cur} integer pair. `prev != 0` is what arms the
      // credit in `ReqRewardCB`'s `switch(*prev)`; the replica's gold balance
      // starts at 10000, so this is satisfied in practice.
      gold: { prev: goldBefore, cur: game.gold },
      // **[RECOVERED]** ARRAY of {inst_id, ref_id, qty} (three adjacent literal
      // slots at 0xb3d0a4/0xa8/0xac resolve to 0x01d6edf2 / 0x01d6eec9 /
      // 0x01d6edf9, `ghidra-chest-01-reward-route.txt:1081-1149`).
      item: itemList,
      // `card`, `free_iap`, `iap`, `supply` and `achievement` are all OMITTED -
      // see the header. `achievement` is the load-bearing one: `[]` is not a
      // safe substitute for absent.
      //
      // ---- inert local diagnostics ----
      area_id: areaId,
      // **[D1]** `claimed` is true only when the claim was actually HONOURED -
      // not merely when the client asked. report-018 saw `claimed:true` beside a
      // payout for a chest whose threshold had not been reached.
      claimed: !alreadyClaimed && thresholdMet,
      authenticated: true,
      // **[RECOVERED]** the client's own progress total for this area, as the
      // replica understands it. Not read by `ReqRewardCB`.
      area_achieve_cnt: areaTotal,
      required_achieve_cnt: entry.achieve_cnt,
      error_code: alreadyClaimed ? "ALREADY_CLAIMED" : thresholdMet ? undefined : "THRESHOLD_NOT_MET",
      reward: { gold: !alreadyClaimed && thresholdMet ? entry.gold : 0, items: itemList },
      gold_balance: game.gold,
    });
  }

  itemInventory(payload: Record<string, unknown>, headers: Record<string, string>) {
    // ParseUserItemInven consumes envelope.ret_data.item and .global_item.
    // Ordinary item rows remain unchanged; purchase counts are separate
    // scalar rows, not prev/cur receipts or a bare inventory array.
    const game = this.gameFor(this.accountFor(payload, headers));
    const apChanged = settleFuelShop(game.fuel_shop, Date.now()), bpChanged = settleFuelShop(game.bp_shop, Date.now());
    if (apChanged || bpChanged) this.persist();
    return this.envelope({ item: game.items, global_item: [...fuelPurchaseInventory(game.fuel_shop), ...fuelPurchaseInventory(game.bp_shop, BP_SHOP_ID)] });
  }

  buyFuel(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    const parse = (value: unknown) => typeof value === "number" ? value :
      typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
    const priceType = parse(payload.price_type);
    const resource = payload.target_ref_id === FUEL_SHOP_ID ? "ap" : payload.target_ref_id === BP_SHOP_ID ? "bp" : null;
    if (!resource || ![1, 2].includes(priceType) ||
        parse(payload.qty) !== 1 || parse(payload.item_inst_id) !== 0)
      return this.failure(2001, "unsupported fuel item/payment/quantity");
    const shop = resource === "ap" ? game.fuel_shop : game.bp_shop;
    const amount = resource === "ap" ? FUEL_SHOP_AP : BP_SHOP_AMOUNT;
    if (settleFuelShop(shop, Date.now())) this.persist();
    const key = priceType === 1 ? "manda" : "gold";
    const previousCount = shop[key], price = FUEL_SHOP_PRICES[priceType as 1 | 2];
    if (shop.manda + shop.gold >= FUEL_SHOP_LIMIT || !Number.isSafeInteger(game[resource] + amount))
      return this.failure(2001, "fuel purchase limit/balance invalid");
    if (priceType === 1 ? game.gacha_iap_qty + game.gacha_free_qty < price : game.gold < price)
      return this.failure(2001, "not enough fuel purchase currency");
    const previousResource = game[resource], previousGold = game.gold;
    if (priceType === 1) {
      const free = Math.min(game.gacha_free_qty, price); // local free-first policy
      game.gacha_free_qty -= free; game.gacha_iap_qty -= price - free;
    } else game.gold -= price;
    game[resource] += amount; // preserve reward overflow
    shop[key] = previousCount + 1;
    this.persist();
    return this.envelope({ jackpot_level: 1, jackpot_multiply: 1,
      user: { [resource]: { prev: previousResource, cur: game[resource], [`${resource}_charge_time`]: resourceChargeTime(game, resource) },
        ...(priceType === 1 ? { iap: { iap_qty: game.gacha_iap_qty, free_iap_qty: game.gacha_free_qty } }
          : { gold: { prev: previousGold, cur: game.gold } }) },
      target_inst: { item_id: payload.target_ref_id, price_type: priceType, buy_cnt: { prev: previousCount, cur: previousCount + 1 } },
      consumed_inst_list: [] });
  }

  /** Bootstrap instances plus persistently awarded cards, in native array shape. */
  cardBook(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    const book = mergeCardBook(game.card_book, game.starter_cards, game.recruited_cards);
    if (JSON.stringify(book) !== JSON.stringify(game.card_book)) { game.card_book = book; this.persist(); }
    return this.envelope(book);
  }

  mailAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    const result = mailboxRequest(route, payload, game.mail, account.pvid, account.nickname, () => this.persist());
    return "error" in result ? this.failure(2001, result.error) : this.envelope(result.data);
  }

  skinAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    if (route === "/reference/GetSkinRef" || route === "/lobby/GetSkinInst") {
      const game = this.gameByPvid.get(account.pvid);
      const cards = game ? [...game.starter_cards, ...game.recruited_cards] : [];
      if (cards.some(card => (card.skin_ref_id && card.skin_ref_id !== `Default_${card.ref_id}`) || Number(card.skin_inst_id ?? 0) !== 0))
        return this.failure(2001, "Existing non-default skin ownership is not reconstructed");
      // Native factories derive default references/instances from actual cards.
      // Empty server collections do not mint paid skins or guessed bonuses.
      if (route === "/reference/GetSkinRef") return this.envelope({ skin: [], bonus: [] });
      return this.envelope({ skin: [] });
    }
    return this.failure(2001, "Paid skin references, prices and ownership are not reconstructed");
  }

  guildAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    if(route==="/guild/Found") return this.foundLocalGuild(account,payload);
    if(route==="/guild/Update") return this.updateLocalGuild(account,payload);
    if(route==="/guild/Donate") return this.donateLocalGuild(account,payload);
    if(route==="/guild/Appoint"||route==="/guild/Banish") return this.localGuildManagement(account,route,payload);
    if(route==="/guild/Invite"||route==="/guild/ConfirmInvitation") return this.localGuildInvitation(account,route,payload);
    if(route==="/guild/ReadNotifications"||route==="/guild/DeleteNotifications") return this.changeGuildNotifications(account,route,payload);
    if(["/guild/Apply","/guild/CancelApplication","/guild/Leave","/guild/ConfirmApplication"].includes(route))
      return this.localGuildMembership(account,route,payload);
    if(route==="/reference/GetGuildPrices") return this.envelope(this.guildPrices.map(row=>({...row})));
    const progression:Record<string,unknown>={"/reference/GetGuildLevelBenefits":this.guildLevels,
      "/reference/GetGuildLevelBenefitsStr":this.guildBenefitText,"/reference/GetGuildContributionPoints":this.guildPoints,
      "/reference/GetGuildContributionReward":this.guildRewards};
    if(Object.hasOwn(progression,route)) {
      if(progression[route]!==undefined) return this.envelope(structuredClone(progression[route]));
      // Preserve the unaffiliated bootstrap's successful empty reference shape.
      // Affiliated/pending IDs must not clear a native table whose empty lookup
      // can dereference its sentinel or divide by a zero mileage maximum.
      if(this.guildPersonal(account.pvid).my_guild.guild_id!==0)
        return this.failure(2001,"Original Guild progression reference unavailable; explicit configured table required for affiliation");
      return this.envelope(route==="/reference/GetGuildLevelBenefitsStr"||route==="/reference/GetGuildContributionPoints"?{}:[]);
    }
    // Imported joined records are explicit local state, never inferred from
    // requests. my_guild is flat PLAY_DATA, distinct from full Guild INFO.
    if (route === "/lobby/GetGuildInfo") {
      const personal=this.guildPersonal(account.pvid),id=personal.my_guild.guild_id;
      return this.envelope({...personal,...(id===0?{}:{guilds:guildDetailRows([String(id)],this.guilds??[],account.serverId,this.accountsByPvid)})});
    }
    if(route==="/guild/GetApplicants") {
      const own=this.guilds?.find(record=>record.members.some(member=>member.pvid===account.pvid));
      if(!own||![1,2].includes(own.members.find(member=>member.pvid===account.pvid)!.role))
        return this.failure(2001,"Guild applicants require existing management role1or2");
      return this.envelope({applicants:guildApplicantRows(own.id,this.guildPending??[])});
    }
    if(route==="/guild/GetDetailInfo") {
      let ids:string[];
      try{ids=parseGuildInfoQuery(payload);}catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid Guild query");}
      return this.envelope({guilds:guildDetailRows(ids,this.guilds??[],account.serverId,this.accountsByPvid)});
    }
    if(route==="/guild/GetUserGuilds") {
      let target:string;
      try{target=parseGuildUserQuery(payload);}catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid Guild association query");}
      return this.envelope({user_guilds:guildUserRows(target,this.guilds??[],account.serverId,this.accountsByPvid)});
    }
    if(route==="/guild/Search"||route==="/guild/GetRecommendations") {
      let query:{keyword:string|null};
      try{query=parseGuildDiscoveryRequest(route,payload);}catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid Guild discovery query");}
      return this.envelope({guilds:guildDiscoveryRows(query,this.guilds??[],account.serverId,this.accountsByPvid)});
    }
    if(route==="/guild/GetRanking") {
      try{return this.envelope(guildRankingRows(payload,this.guilds??[],account.serverId,this.accountsByPvid));}
      catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid Guild ranking query");}
    }
    // RequestMsgList's exact callback selects this child before ParseNoties;
    // a bare empty array skips the cache replacement rather than clearing it.
    if (route === "/guild/GetNotifications") return this.envelope({guild_notifications:this.guildVisibleNotifications(account.pvid)});
    // RequestFuelList Ga7bcdc/innerGa90d90 selects this named row array,
    // upserts each entry and returns its cached map. Empty is NOT a cache clear.
    // No local fuel request producer, support amount or ownership exists yet.
    if(route==="/guild/GetFuelRequests") return this.envelope({fuel_requests:[]});
    // Explicit ephemeral Chat mode has no persisted archive. ParseChatLog takes
    // ret_data directly and clears only its archive, not the live socket log.
    if(route==="/guild/GetChattingLog"&&this.guildChatEnabled()) return this.envelope([]);
    return this.failure(2001, "Guild establishment, fees, references and participation are not reconstructed");
  }

  private guildPersonal(pvid:number) {
    return guildPendingLobby(pvid,this.guildPending??[])??guildLobby(pvid,this.guilds??[],
      new Set(this.accountsByPvid.keys()),new Set<string>(GUILD_SPRITE_EMBLEMS));
  }
  private guildServerScopes(records:readonly GuildRecord[]=this.guilds??[]) {
    return new Map(records.map(record=>[record.id,{serverId:this.accountsByPvid.get(record.members[0].pvid)!.serverId}]));
  }
  private guildVisibleNotifications(pvid:number) {
    return guildNotificationRows(pvid,this.guildNotifications??[]).filter(row=>!!this.localSocialProfile(pvid,row.sender));
  }
  private changeGuildNotifications(account:Account,route:string,payload:Record<string,unknown>) {
    let plan;
    try{plan=planGuildNotificationChange(route,account.pvid,payload,this.guildNotifications??[]);}
    catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid Guild notification request");}
    if(plan.changed) {
      const before=this.guildNotifications;this.guildNotifications=plan.next;
      try{this.persist();}catch(error){this.guildNotifications=before;throw error;}
    }
    return this.envelope({guild_notifications:this.guildVisibleNotifications(account.pvid)});
  }
  private localGuildInvitation(account:Account,route:string,payload:Record<string,unknown>) {
    if(this.guildInvitationMode!=="local-invitations") return this.failure(2001,"Local Guild invitation mode is disabled");
    const game=this.gameByPvid.get(account.pvid);
    if(!game||game.active_battle?.state==="active"||game.arena.active||game.search.active) return this.failure(2001,"Guild invitations require established idle actor gameplay");
    let plan;
    try {
      if(route==="/guild/Invite"&&!this.localSocialProfile(account.pvid,Number(payload.target_pvid))) throw new TypeError("Invitation recipient profile is unavailable or blocked");
      if(route==="/guild/ConfirmInvitation"&&["1",1].includes(payload.agreed as string|number)) {
        const invitation=[...(this.guildInvitations??[])].reverse().find(row=>row.pvid===account.pvid&&String(row.guild_id)===payload.guild_id);
        if(invitation&&!this.localSocialProfile(account.pvid,invitation.sender)) throw new TypeError("Invitation sender profile is unavailable or blocked");
      }
      const games=new Map([...this.gameByPvid].map(([pvid,game])=>[pvid,{fc_point:game.arena.rating_point,active:game.active_battle?.state==="active"||!!game.arena.active||!!game.search.active}]));
      plan=planLocalGuildInvitation(route,payload,this.guilds??[],this.guildPending??[],this.guildInvitations??[],this.guildNotifications??[],
        account,this.accountsByPvid,games,this.guildMembershipPolicy!,this.nextGuildNotificationId??Math.max(0,...(this.guildNotifications??[]).map(row=>row.id))+1,Math.floor(Date.now()/1000));
      plan.guilds=establishedGuildRecords(plan.guilds,this.accountsByPvid);
      plan.notifications=guildNotificationState(plan.notifications,this.accountsByPvid,this.guildServerScopes(plan.guilds));
      plan.invitations=guildInvitationState(plan.invitations,plan.guilds,this.accountsByPvid,plan.notifications);
    } catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid local Guild invitation");}
    if(plan.changed) {
      const before={guilds:this.guilds,invites:this.guildInvitations,messages:this.guildNotifications,nextId:this.nextGuildNotificationId};
      this.guilds=plan.guilds;this.guildInvitations=plan.invitations;this.guildNotifications=plan.notifications;this.nextGuildNotificationId=plan.nextId;
      try{this.persist();}catch(error){this.guilds=before.guilds;this.guildInvitations=before.invites;this.guildNotifications=before.messages;this.nextGuildNotificationId=before.nextId;throw error;}
    }
    return this.envelope({...this.guildPersonal(account.pvid),user:null,
      guilds:guildDetailRows([String(plan.affectedId)],this.guilds??[],account.serverId,this.accountsByPvid)});
  }

  private localGuildManagement(account:Account,route:string,payload:Record<string,unknown>) {
    if(this.guildManagementMode!=="local-management") return this.failure(2001,"Local Guild management mode is disabled");
    const game=this.gameByPvid.get(account.pvid);
    if(!game||game.active_battle?.state==="active"||game.arena.active||game.search.active)
      return this.failure(2001,"Guild management requires established idle actor gameplay");
    let plan;
    try {
      const games=new Map([...this.gameByPvid].map(([pvid,game])=>[pvid,{active:game.active_battle?.state==="active"||!!game.arena.active||!!game.search.active}]));
      plan=route==="/guild/Appoint"?planLocalGuildAppoint(payload,this.guilds??[],account,this.accountsByPvid,games,this.guildRolePolicy!):
        planLocalGuildBanish(payload,this.guilds??[],account,this.accountsByPvid,games);
      plan.guilds=establishedGuildRecords(plan.guilds,this.accountsByPvid);
      guildApplications(this.guildPending??[],plan.guilds,this.accountsByPvid);
    } catch(error) {return this.failure(2001,error instanceof Error?error.message:"Invalid local Guild management");}
    if(plan.changed) {
      const before=this.guilds;this.guilds=plan.guilds;
      try{this.persist();}catch(error){this.guilds=before;throw error;}
    }
    return this.envelope({...this.guildPersonal(account.pvid),user:null,
      guilds:guildDetailRows([String(plan.id)],this.guilds??[],account.serverId,this.accountsByPvid)});
  }

  private localGuildMembership(account:Account,route:string,payload:Record<string,unknown>) {
    if(this.guildMembershipMode!=="local-public-approval") return this.failure(2001,"Local Guild membership mode is disabled");
    const game=this.gameByPvid.get(account.pvid);
    if(!game||game.active_battle?.state==="active"||game.arena.active||game.search.active)
      return this.failure(2001,"Guild membership requires established idle actor gameplay");
    let plan,nextInvitations:GuildInvitation[]|undefined;
    try {
      const games=new Map([...this.gameByPvid].map(([pvid,game])=>[pvid,{fc_point:game.arena.rating_point,
        active:game.active_battle?.state==="active"||!!game.arena.active||!!game.search.active}]));
      plan=planLocalGuildMembership(route,payload,this.guilds??[],this.guildPending??[],this.accountsByPvid,account,games,
        this.guildMembershipPolicy!,Math.floor(Date.now()/1000));
      const reconciled=reconcileGuildInvitationJoins(plan.guilds,this.guildInvitations??[]);
      const next=establishedGuildRecords(reconciled.guilds,this.accountsByPvid);
      plan.guilds=next;
      nextInvitations=guildInvitationState(reconciled.invitations,next,this.accountsByPvid,this.guildNotifications??[]);
    } catch(error) {return this.failure(2001,error instanceof Error?error.message:"Invalid local Guild membership");}
    if(plan.changed) {
      const beforeGuilds=this.guilds,beforePending=this.guildPending,beforeInvites=this.guildInvitations;
      this.guilds=plan.guilds;this.guildPending=plan.applications;
      if(this.guildInvitations!==undefined) this.guildInvitations=nextInvitations;
      try{this.persist();}catch(error){this.guilds=beforeGuilds;this.guildPending=beforePending;this.guildInvitations=beforeInvites;throw error;}
    }
    // These native callbacks clear personal state themselves; publishing a
    // fabricated Guild object cannot replace a persisted ownership transition.
    if(route==="/guild/CancelApplication"||route==="/guild/Leave") return this.envelope({user:null});
    return this.envelope({...this.guildPersonal(account.pvid),user:null,
      guilds:plan.affectedId?guildDetailRows([String(plan.affectedId)],this.guilds??[],account.serverId,this.accountsByPvid):[],
      ...(route==="/guild/ConfirmApplication"?{applicants:guildApplicantRows(plan.affectedId!,this.guildPending??[])}:{})});
  }

  private donateLocalGuild(account:Account,payload:Record<string,unknown>) {
    if(this.guildDonationMode!=="local-gold")return this.failure(2001,"Local Guild donation mode is disabled");
    const game=this.gameByPvid.get(account.pvid);
    if(!game||game.active_battle?.state==="active"||game.arena.active||game.search.active)
      return this.failure(2001,"Guild donation requires established idle actor gameplay");
    let plan,user,personal,details;
    try {
      plan=planLocalGuildDonate(payload,this.guilds??[],this.accountsByPvid,account,game.gold);
      plan.guilds=establishedGuildRecords(plan.guilds,this.accountsByPvid);
      user=guildWalletReceipt({gold:game.gold,iap_qty:game.gacha_iap_qty,free_iap_qty:game.gacha_free_qty},
        {gold:plan.gold,iap_qty:game.gacha_iap_qty,free_iap_qty:game.gacha_free_qty});
      personal=guildLobby(account.pvid,plan.guilds,new Set(this.accountsByPvid.keys()),new Set<string>(GUILD_SPRITE_EMBLEMS));
      details=guildDetailRows([String(plan.id)],plan.guilds,account.serverId,this.accountsByPvid);
    }catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid local donation");}
    const beforeGuilds=this.guilds,beforeGold=game.gold;
    this.guilds=plan.guilds;game.gold=plan.gold;
    try{this.persist();}catch(error){this.guilds=beforeGuilds;game.gold=beforeGold;throw error;}
    return this.envelope({...personal,guilds:details,user});
  }

  private foundLocalGuild(account:Account,payload:Record<string,unknown>) {
    if(this.guildCreationMode!=="local-gold") return this.failure(2001,"Local Guild creation mode is disabled");
    const game=this.gameByPvid.get(account.pvid);
    if(!game) return this.failure(2001,"Founder has no established game state");
    if(this.guildPending?.some(row=>row.pvid===account.pvid)) return this.failure(2001,"Founder must cancel its pending Guild application first");
    if(game.active_battle?.state==="active"||game.arena.active||game.search.active)
      return this.failure(2001,"Local Guild creation refuses active combat commitments");
    const id=this.nextGuildId??(Math.max(0,...(this.guilds??[]).map(record=>record.id))+1);
    const plan=planLocalGuildFound(payload,this.guilds??[],this.accountsByPvid,account,game.gold,game.arena.rating_point,id,this.guildPrices);
    if("error" in plan) return this.failure(2001,plan.error!);
    if(this.guildBadwordCheck?.(plan.created!.name)||this.guildBadwordCheck?.(plan.created!.desc))
      return this.failure(2001,"Guild text rejected by original stock word filter");
    let user;
    try{user=guildWalletReceipt({gold:game.gold,iap_qty:game.gacha_iap_qty,free_iap_qty:game.gacha_free_qty},
      {gold:plan.gold!,iap_qty:game.gacha_iap_qty,free_iap_qty:game.gacha_free_qty});}
    catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid Guild wallet snapshot");}
    const next=establishedGuildRecords([...(this.guilds??[]),plan.created!],this.accountsByPvid);
    const beforeGuilds=this.guilds,beforeId=this.nextGuildId,beforeGold=game.gold;
    this.guilds=next;this.nextGuildId=plan.nextId!;game.gold=plan.gold!;
    try{this.persist();}catch(error){this.guilds=beforeGuilds;this.nextGuildId=beforeId;game.gold=beforeGold;throw error;}
    const created=this.guilds.find(record=>record.id===id)!;
    return this.envelope({...guildLobby(account.pvid,this.guilds,new Set(this.accountsByPvid.keys()),new Set<string>(GUILD_SPRITE_EMBLEMS)),
      guilds:guildDetailRows([String(created.id)],this.guilds,account.serverId,this.accountsByPvid),
      user});
  }

  private updateLocalGuild(account:Account,payload:Record<string,unknown>) {
    if(this.guildUpdateMode!=="local-manda-free-first") return this.failure(2001,"Local Guild update mode is disabled");
    const game=this.gameByPvid.get(account.pvid);
    if(!game) return this.failure(2001,"Guild manager has no established game state");
    if(game.active_battle?.state==="active"||game.arena.active||game.search.active) return this.failure(2001,"Local Guild update refuses active combat commitments");
    const plan=planLocalGuildUpdate(payload,this.guilds??[],this.accountsByPvid,account,game.gacha_iap_qty,game.gacha_free_qty,this.guildPrices);
    if("error" in plan) return this.failure(2001,plan.error!);
    const oldGuild=this.guilds!.find(record=>record.id===plan.id)!,newGuild=plan.next!.find(record=>record.id===plan.id)!;
    if((oldGuild.name!==newGuild.name&&this.guildBadwordCheck?.(newGuild.name))||
      (oldGuild.desc!==newGuild.desc&&this.guildBadwordCheck?.(newGuild.desc)))
      return this.failure(2001,"Changed Guild text rejected by original stock word filter");
    const beforeWallet={gold:game.gold,iap_qty:game.gacha_iap_qty,free_iap_qty:game.gacha_free_qty};
    let user;
    try{user=guildWalletReceipt(beforeWallet,{gold:game.gold,iap_qty:plan.paid!,free_iap_qty:plan.free!});}
    catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid Guild wallet snapshot");}
    const next=establishedGuildRecords(plan.next,this.accountsByPvid),beforeGuilds=this.guilds;
    if(plan.changed) {
      this.guilds=next;game.gacha_iap_qty=plan.paid!;game.gacha_free_qty=plan.free!;
      try{this.persist();}catch(error){this.guilds=beforeGuilds;game.gacha_iap_qty=beforeWallet.iap_qty;game.gacha_free_qty=beforeWallet.free_iap_qty;throw error;}
    }
    return this.envelope({...guildLobby(account.pvid,this.guilds??[],new Set(this.accountsByPvid.keys()),new Set<string>(GUILD_SPRITE_EMBLEMS)),
      guilds:guildDetailRows([String(plan.id!)],this.guilds??[],account.serverId,this.accountsByPvid),user});
  }

  questAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    this.accountFor(payload, headers);
    // CSRAchieve consumes ret_data itself, not generic mock metadata or a
    // list child. No original production quest IDs/conditions are imported.
    if (route === "/dailyquest/GetRefList" || route === "/dailyquest/GetInstList")
      return this.envelope([]);
    return this.failure(2001, "Production quest conditions and reward references are not reconstructed");
  }

  fishingAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account=this.accountFor(payload, headers);
    if(route==="/fishing/SellFish") {
      const game=this.gameByPvid.get(account.pvid);
      if(this.fishingSaleMode!=="local-bound"||!this.fishingBindings||!this.fishingCatalogue||!game)return this.failure(2001,"Bound fishing sale is unavailable");
      let plan;try{plan=planFishingSale(game,account.pvid,this.fishingBindings,this.fishingCatalogue,
        new Set(this.fishingItems.filter(row=>row.use_type===17).map(row=>row.id)),payload);}
      catch(error){if(error instanceof TypeError)return this.failure(2001,error.message);throw error;}
      const before={items:game.items,owned_fish:game.owned_fish,gold:game.gold};
      Object.assign(game,{items:plan.items,owned_fish:plan.owned_fish,gold:plan.gold});
      try{this.persist();}catch(error){Object.assign(game,before);if(before.owned_fish===undefined)delete game.owned_fish;throw error;}
      return this.envelope(plan.receipt);
    }
    if(route==="/fishing/GetFishingPool"||route==="/fishing/GetPriceRef") {
      if(!this.fishingCatalogue) return this.failure(2001,"Fishing catalogue unavailable; explicit fish item definitions and catalogue required");
      try {
        return this.envelope(route==="/fishing/GetFishingPool"?fishingPoolRows(this.fishingCatalogue):
          fishingPriceRows(this.fishingCatalogue,payload.fish_id));
      } catch(error) {return this.failure(2001,error instanceof Error?error.message:"Invalid fishing reference request");}
    }
    // CSRMFishing ParseInven/ParseRecod index ret_data numerically. Inventory
    // reads publish only explicit stored ownership; catalogue rows never grant
    // counts. No catch producer or personal record history is reconstructed.
    if(route==="/fishing/GetInven") {
      try {return this.envelope(ownedFishingInventory(this.gameByPvid.get(account.pvid)?.owned_fish??[],new Set(this.fishingItems.map(row=>row.id))));}
      catch(error){return this.failure(2001,error instanceof Error?error.message:"Invalid owned fishing inventory");}
    }
    if(route==="/fishing/GetRecord") return this.envelope([]);
    return this.failure(2001, "Fishing catches, pools, prices and settlement are not reconstructed");
  }

  itemReferenceRows() {
    const base=itemReference();
    return {...base,item:[...base.item,...this.fishingItems.map(row=>({...row}))]};
  }

  mirageAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account=this.accountFor(payload, headers);
    // Original callback replaces its complete friend-floor cache with this
    // bare array. Local friendship alone is not a reconstructed highest-floor
    // record; Arena fixture rivals are not substitutes for genuine friend data.
    if (route === "/mirage/GetFriendInfo") return this.envelope(mirageFriendFloors());
    if (route === "/mirage/GetInfo") {
      // Native renew: a refused GetNextFloor delegates zero, which can match
      // Floor0 and request GetInfo(reset:"t", stay:"t"). Gbfdeec/Gbfd250.
      // Do not acknowledge a run reset by returning the read-only empty lobby.
      if (["t", "true", "1", true, 1].includes(payload.reset as string | boolean | number))
        return this.failure(2001, "Mirage run reset is not reconstructed");
      // Parse_Entry G933aec resets ALL native owned HP to -1 before rows;
      // entry[] would erase carried evidence while the server kept it. Do not
      // invent entry/deck membership from HP1000 or ordinary account parties.
      const game=this.gameByPvid.get(account.pvid);
      if(game && [...game.starter_cards,...game.recruited_cards].some(card=>
        card.mirage_remain_hp!==undefined && Number(card.mirage_remain_hp)!==1000))
        return this.failure(2001,"Mirage lobby would clear unrepresented carried Hunter commitments");
      return this.envelope(mirageLobby());
    }
    return this.failure(2001, "Mirage runs, weekly hunters, stairs and settlement are not reconstructed");
  }

  socialBlockAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const before = account.socialBlocks;
    if (route === "/relation/BlockList") return this.envelope(socialBlockRows(before ?? {}));
    if (route !== "/relation/Block" && route !== "/relation/Unblock")
      return this.failure(2001, "Social action is not reconstructed");
    let next: SocialBlocks;
    try {
      next = changeSocialBlocks(before ?? {}, account.pvid, payload.target_list,
        route === "/relation/Block" ? "block" : "unblock",
        (pvid) => this.accountsByPvid.get(pvid)?.nickname);
    } catch (error) {
      return this.failure(2001, error instanceof Error ? error.message : "Invalid social block batch");
    }
    account.socialBlocks = next;
    try { this.persist(); }
    catch (error) {
      if (before === undefined) delete account.socialBlocks;
      else account.socialBlocks = before;
      throw error;
    }
    return this.envelope(route === "/relation/Block" ? socialBlockRows(next) : []);
  }

  episodeAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>): Record<string, unknown> {
    const neutral = { dailyquest_min_stage: "", daily_quest: [], linear_quest: [] };
    const refuse = (reason: string) => ({ ...this.failure(2001, reason), ret_data: { ...neutral, error: reason }, data: { ...neutral, error: reason } });
    let account: Account;
    try { account = this.accountFor(payload, headers); }
    catch (error) {
      if (route !== "/episode/GetLog" && error instanceof NativeAuthError)
        return refuse(error.message);
      throw error;
    }
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    if (route === "/episode/GetLog") return this.envelope(episodeLog(game.episode_progress));
    if (route === "/episode/Reward") {
      const chapter = typeof payload.id === "string" ? episodeChapters.get(payload.id) : undefined;
      if (!chapter || !chapter.reward) return refuse("Unknown Episode reward");
      const rewards = chapter.reward.item ?? [];
      // Original display IDs/quantities: E18 RP1x100000, E02 FMD1x30.
      // Replica policy credits the known wallet through SyncUser pairs rather
      // than inert item stacks. Original Episode server settlement is unknown.
      const currencyReward = rewards.length === 1 && !chapter.reward.free_iap && !chapter.reward.iap
        ? chapter.id === "E18" && rewards[0].ref_id === "RP1" && rewards[0].qty === 100000
          ? { wallet: "gold" as const, receipt: "gold" }
          : chapter.id === "E02" && rewards[0].ref_id === "FMD1" && rewards[0].qty === 30
            ? { wallet: "gacha_free_qty" as const, receipt: "free_iap" } : null
        : null;
      if (currencyReward) {
        const required = episodeStoryIds(chapter);
        if (!required.length || required.some((id) => !game.episode_progress.cleared_ids.includes(id)))
          return refuse("Episode stories are not all cleared");
        if (game.episode_progress.reward_ids.includes(chapter.id)) return this.envelope({ ...neutral, item: [], user: null });
        const previous = game[currencyReward.wallet];
        const current = previous + rewards[0].qty;
        if (!Number.isSafeInteger(previous) || previous < 0 || !Number.isSafeInteger(current) || current > 0xffffffff)
          return refuse("Episode currency capacity exceeded");
        const freeQty=currencyReward.wallet==="gacha_free_qty"?current:game.gacha_free_qty;
        if(![game.gacha_iap_qty,freeQty].every(value=>Number.isInteger(value)&&value>=0&&value<=0xffff_ffff))
          return refuse("Episode native Manda wallet capacity exceeded");
        const user={ [currencyReward.receipt]:{prev:previous,cur:current},iap_qty:game.gacha_iap_qty,free_iap_qty:freeQty };
        game[currencyReward.wallet] = current;
        game.episode_progress.reward_ids.push(chapter.id);
        try { this.persist(); }
        catch {
          game[currencyReward.wallet] = previous;
          game.episode_progress.reward_ids.pop();
          return refuse("Episode reward could not be saved");
        }
        return this.envelope({ ...neutral, item: [], user });
      }
      if (!rewards.length || chapter.reward.free_iap || chapter.reward.iap || rewards.some((row) =>
          row.ref_id !== SEARCH_CAPSULE_ID || !Number.isSafeInteger(row.qty) || row.qty <= 0))
        return refuse("Episode reward material references are not reconstructed");
      const required = episodeStoryIds(chapter);
      if (!required.length || required.some((id) => !game.episode_progress.cleared_ids.includes(id)))
        return refuse("Episode stories are not all cleared");
      // Never repeat an additive native receipt after a settled claim.
      if (game.episode_progress.reward_ids.includes(chapter.id)) return this.envelope({ ...neutral, item: [], user: null });
      const qty = rewards.reduce((sum, row) => sum + row.qty, 0);
      let item = game.items.find((row) => row.ref_id === SEARCH_CAPSULE_ID && row.lock === 0);
      if (!Number.isSafeInteger(qty) || qty > 0x7fffffff || (item && (!Number.isSafeInteger(item.qty) || item.qty < 0 || item.qty + qty > 0xffffffff)) ||
          (!item && (!Number.isSafeInteger(game.next_item_inst_id) || game.next_item_inst_id < 1 || game.next_item_inst_id >= Number.MAX_SAFE_INTEGER ||
            game.items.some((row) => row.inst_id === game.next_item_inst_id))))
        return refuse("Episode inventory capacity exceeded");
      const previousItem = item;
      const previousQty = item?.qty ?? 0;
      const previousNext = game.next_item_inst_id;
      if (!item) {
        item = { inst_id: game.next_item_inst_id++, ref_id: SEARCH_CAPSULE_ID, qty: 0, lock: 0 };
        game.items.push(item);
      }
      item.qty += qty;
      game.episode_progress.reward_ids.push(chapter.id);
      try { this.persist(); }
      catch {
        game.episode_progress.reward_ids.pop();
        game.next_item_inst_id = previousNext;
        if (previousItem) previousItem.qty = previousQty;
        else game.items.splice(game.items.indexOf(item), 1);
        return refuse("Episode reward could not be saved");
      }
      return this.envelope({ ...neutral, item: [{ inst_id: item.inst_id, ref_id: item.ref_id, added: qty }], user: null });
    }
    if (route !== "/episode/Read") return refuse("Episode reward settlement is not reconstructed");
    // Native client reports reading/clearing, including deferred offline retries.
    // This acknowledgment does not prove a story battle was played or won.
    const changed = recordEpisodeProgress(game.episode_progress, payload.id);
    if (changed === null) return refuse("Unknown recovered Episode ID");
    if (changed) {
      try { this.persist(); }
      catch {
        const ids = String(payload.id).startsWith("r_") ? game.episode_progress.read_ids : game.episode_progress.cleared_ids;
        ids.pop();
        return refuse("Episode progress could not be saved");
      }
    }
    return this.envelope(neutral);
  }

  claimSpecialSupply(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    const ids = specialSupplyIds(payload.id_list);
    if (!ids) return this.failure(2001, "Special Supply requires a JSON array of numeric IDs");
    const rows = ids.map((id) => game.special_supply.rows.find((row) => row.id === id));
    if (rows.some((row) => !row)) return this.failure(2001, "Owned Special Supply not found");
    const fresh = rows.filter((row) => row && !row.claimed);
    const amount = fresh.reduce((sum, row) => sum + row!.gold, 0);
    if (!Number.isSafeInteger(game.gold) || game.gold < 0 || !Number.isSafeInteger(game.gold + amount) || game.gold + amount > 0xffffffff)
      return this.failure(2001, "Special Supply gold capacity exceeded");
    const prev = game.gold;
    if (fresh.length) {
      game.gold += amount;
      fresh.forEach((row) => { row!.claimed = true; });
      this.persist();
    }
    // Absolute native balances; repeats settle IDs without another award.
    return this.envelope({ target_inst_id: ids, ...(amount ? { user: { gold: { prev, cur: game.gold } } } : {}) });
  }

  specialSupplyInventory(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    return this.envelope({ special: specialSupplyList(game.special_supply) });
  }

  supplyInventory(payload: Record<string, unknown>, headers: Record<string, string>, refresh = false) {
    const game = this.gameFor(this.accountFor(payload, headers));
    if (!refresh && observeLoginBonus(game.login_bonus, Date.now())) this.persist();
    const data = refresh ? supplyActivities(game.supply_fuel_claim_day, Date.now())
      : supplyInstances(game.supply_fuel_claim_day, Date.now(), game.login_bonus);
    return this.envelope({ ...data, special: specialSupplyList(game.special_supply) });
  }

  claimLoginBonus(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    const count = typeof payload.target_cnt === "number" ? payload.target_cnt :
      typeof payload.target_cnt === "string" && /^\d+$/.test(payload.target_cnt) ? Number(payload.target_cnt) : NaN;
    if (!Number.isSafeInteger(count) || count < 1 || count !== game.login_bonus.eligible)
      return this.failure(2001, "Login bonus day is not currently offered");
    if (game.login_bonus.claimed.includes(count)) return this.failure(2001, "Login bonus already received");
    if (!Number.isSafeInteger(game.gold + LOGIN_BONUS_GOLD)) return this.failure(2001, "Invalid gold balance");
    if (!Number.isSafeInteger(game.vip_exp) || game.vip_exp < 0 || game.vip_exp + LOGIN_BONUS_VIP_EXP > 0xffffffff)
      return this.failure(2001, "Veteran EXP capacity exceeded");
    const prevVipExp = game.vip_exp;
    const prevGold = game.gold;
    const prevClaims = [...game.login_bonus.claimed];
    game.gold += LOGIN_BONUS_GOLD;
    game.vip_exp += LOGIN_BONUS_VIP_EXP;
    game.login_bonus.claimed.push(count);
    try { this.persist(); }
    catch (error) {
      game.gold = prevGold;
      game.vip_exp = prevVipExp;
      game.login_bonus.claimed = prevClaims;
      throw error;
    }
    return this.envelope({ reward: { user: { gold: { cur: game.gold }, vip_exp: { prev: prevVipExp, cur: game.vip_exp } } }, inst: loginBonusInstance(game.login_bonus),
      dailyquest_min_stage: "", daily_quest: [], linear_quest: [] });
  }

  /** Native reward CB indexes target_inst.id/status and user.ap.cur/charge time.
   * Claim marker and AP persist together before success. Duplicate requests
   * refuse without a second reward, including after a restart. */
  claimActivitySupply(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    const now = Date.now();
    if (payload.id !== FIXTURE_FUEL_ID) return this.failure(2001, "unknown Supply activity");
    if (fuelStatus(game.supply_fuel_claim_day, now) !== 1) return this.failure(2001, "Supply already received");
    if (!Number.isSafeInteger(game.ap + FIXTURE_FUEL_AP)) return this.failure(2001, "invalid AP balance");
    game.supply_fuel_claim_day = fuelCycle(now).day;
    game.ap += FIXTURE_FUEL_AP; // reward overflow is preserved, as with other AP rewards
    this.persist();
    return this.envelope({ target_inst: { id: FIXTURE_FUEL_ID, status: 2 },
      user: { ap: { cur: game.ap, ap_charge_time: resourceChargeTime(game, "ap") } } });
  }

  cardInventory(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    assertOwnedCardCompatibility(game);
    return this.envelope([...game.starter_cards, ...game.recruited_cards]);
  }

  /** ReqClearCB requires numeric type/step; the guided37/1 recruitment consumes
   * earned traces and supplies its native optional card/result-marker branch. */
  clearTutorial(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    const parseKey = (value: unknown) => typeof value === "number" ? value
      : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
    const type = parseKey(payload.type);
    const step = parseKey(payload.step);
    if (payload.type === undefined || payload.step === undefined ||
        !Number.isSafeInteger(type) || !Number.isSafeInteger(step) ||
        type < 0 || step < 0 || type > 0xffff_ffff || step > 0xffff_ffff) {
      return this.failure(2001, "invalid tutorial type/step");
    }
    const previous = game.tutorial.find((row) => row.type === type && row.step === step);
    if (type === 37 && step === 1 && !previous?.is_cleared) {
      const target = hunterSearchReference().ref[0];
      const trace = HUNTER_TRACE_ITEMS.find((row) => row.cardId === target.target_card_id);
      const ownedTrace = game.items.find((row) => row.ref_id === trace?.id && row.lock === 0);
      const completed = game.search.last;
      if (!game.tutorial.some((row) => row.type === 37 && row.step === 0 && row.is_cleared === 1) ||
          !completed || completed.attempt.ref_id !== target.id ||
          completed.receipt.wave.cleared_wave !== completed.attempt.wave_count || !ownedTrace)
        return this.failure(2001, "Complete Search and collect the required traces before guided recruitment");
      assertOwnedCardCompatibility(game);
      // One persist includes ownership, trace debit and the tutorial ACK.
      // No direct live grant or automatic flag clear; actual native UI requests it.
      const exchanged = exchangeHunterTraces({ item_inst_id: ownedTrace.inst_id, cnt: 1 }, game, () => {});
      if ("error" in exchanged) return this.failure(exchanged.code ?? 2001, exchanged.error);
      game.tutorial = mergeTutorialRows(game.tutorial, [{ type, step, is_cleared: 1 }]);
      this.persist();
      return this.envelope({ type, step, card: exchanged.data.card,
        consume_result: { item: exchanged.data.consumed_inst_list } });
    }
    if (!previous?.is_cleared) {
      game.tutorial = mergeTutorialRows(game.tutorial, [{ type, step, is_cleared: 1 }]);
      this.persist();
    }
    return this.envelope({ type, step });
  }

  /** ReqSkillUpCB reads target_inst directly, with one selected prev/cur field.
   * Increment1 and gold-only prices are local policies; no native retry nonce
   * was recovered, so separate accepted requests are separate upgrades. */
  trainSkill(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    assertOwnedCardCompatibility(game);
    const parseKey = (value: unknown) => typeof value === "number" ? value
      : typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
    const targetId = parseKey(payload.target_inst_id);
    const index = parseKey(payload.skill_idx);
    if (!Number.isSafeInteger(targetId) || targetId < 1 || !Number.isSafeInteger(index) || index < 1 || index > 5) {
      return this.failure(2001, "invalid skill training target/type");
    }
    const target = [...game.starter_cards, ...game.recruited_cards].find((card) => card.inst_id === targetId);
    if (!target) return this.failure(2001, "skill target is not owned");
    const reference = starterReference.find((card) => card.base.id === target.ref_id);
    const skill = reference?.skill.find((row) => row.type === index);
    const rank = Number(target.rank);
    const field = `skill_${index}_level`;
    const previousLevel = Number(target[field] ?? 0);
    if (!reference || !skill || !Number.isSafeInteger(rank) || rank < skill.target_rank ||
        !Number.isSafeInteger(previousLevel) || previousLevel < 0) {
      return this.failure(2001, "skill is locked or its progression is invalid");
    }
    const role = Number(reference.base.role);
    if (previousLevel >= skillLevelLimit(role, rank)) return this.failure(2001, "skill level cap reached");
    const price = skillUpPrice(role, previousLevel + 1);
    if (!price || !Number.isSafeInteger(price.gold) || price.gold < 0 || game.gold < price.gold) {
      return this.failure(2001, "skill training price unavailable or insufficient gold");
    }
    const previousGold = game.gold;
    target[field] = previousLevel + 1;
    game.gold -= price.gold;
    this.persist();
    return this.envelope({
      skill_idx: index,
      target_inst: { inst_id: targetId, [field]: { prev: previousLevel, cur: previousLevel + 1 } },
      user: { gold: { prev: previousGold, cur: game.gold } },
      consumed_inst_list: [],
    });
  }

  /** Native typo and five-count order are intentional. Validate the whole
   * batch, including every intermediate local price, before any mutation. */
  trainSkills(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    assertOwnedCardCompatibility(game);
    const rawId = payload.target_inst_id;
    const targetId = typeof rawId === "number" ? rawId
      : typeof rawId === "string" && /^\d+$/.test(rawId.trim()) ? Number(rawId) : NaN;
    let counts: unknown = payload.mulit_skill_up_count;
    if (typeof counts === "string") {
      try { counts = JSON.parse(counts); } catch { return this.failure(2001, "invalid batch skill counts"); }
    }
    if (!Number.isSafeInteger(targetId) || targetId < 1 || !Array.isArray(counts) || counts.length !== 5 ||
        !counts.every((count) => typeof count === "number" && Number.isSafeInteger(count) && count >= 0) ||
        !counts.some((count) => count > 0)) return this.failure(2001, "invalid batch skill target/counts");
    const target = [...game.starter_cards, ...game.recruited_cards].find((card) => card.inst_id === targetId);
    if (!target) return this.failure(2001, "skill target is not owned");
    const reference = starterReference.find((card) => card.base.id === target.ref_id);
    const rank = Number(target.rank);
    if (!reference || !Number.isSafeInteger(rank) || rank < 1) return this.failure(2001, "skill progression is invalid");
    const role = Number(reference.base.role);
    const cap = skillLevelLimit(role, rank);
    const changes: Array<{ field: string; current: number }> = [];
    let total = 0;
    for (let slot = 0; slot < 5; slot++) {
      const count = counts[slot] as number;
      if (count === 0) continue;
      const type = slot + 1;
      const skill = reference.skill.find((row) => row.type === type);
      const field = `skill_${type}_level`;
      const previous = Number(target[field] ?? 0);
      if (!skill || rank < skill.target_rank || !Number.isSafeInteger(previous) || previous < 0 || count > cap - previous) {
        return this.failure(2001, "batch skill slot is locked or exceeds cap");
      }
      for (let level = previous + 1; level <= previous + count; level++) {
        const price = skillUpPrice(role, level);
        if (!price || !Number.isSafeInteger(price.gold) || price.gold < 0) return this.failure(2001, "skill price unavailable");
        total += price.gold;
      }
      changes.push({ field, current: previous + count });
    }
    if (!Number.isSafeInteger(total) || game.gold < total) return this.failure(2001, "insufficient gold for batch skill training");
    const previousGold = game.gold;
    for (const change of changes) target[change.field] = change.current;
    game.gold -= total;
    this.persist();
    return this.envelope({
      target_inst: { inst_id: targetId, ...Object.fromEntries(changes.map((change) => [change.field, { cur: change.current }])) },
      user: { gold: { prev: previousGold, cur: game.gold } }, consumed_inst_list: [],
    });
  }

  partyProfileSnapshot(pvid: number) {
    const account = this.accountsByPvid.get(pvid);
    return account ? ownedPartyProfile(pvid, this.gameFor(account)) : partyProfile(pvid);
  }

  /** Native RegisterDeck posts deck_info=[{type,list:[five ordered IDs]}].
   * ReqDeckCB checks only result_code. See mission-deck-contract.md. */
  setDeck(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    let value: unknown = payload.deck_info;
    if (typeof value === "string") {
      try { value = JSON.parse(value); } catch { return this.failure(2001, "invalid deck_info"); }
    }
    if (!Array.isArray(value) || !value.length) return this.failure(2001, "missing deck_info");
    const owned = new Set([...game.starter_cards, ...game.recruited_cards].map((card) => card.inst_id));
    const updates: LocalGameState["decks"] = [];
    for (const row of value) {
      if (!isRecord(row) || !Number.isSafeInteger(row.type) || Number(row.type) < 1 ||
          !Array.isArray(row.list) || row.list.length < 1 || row.list.length > 5 ||
          !row.list.every((id) => Number.isSafeInteger(id) && Number(id) >= 0 && (id === 0 || owned.has(Number(id))))) {
        return this.failure(2001, "deck contains invalid or unowned slots");
      }
      const members = row.list.filter((id) => id !== 0);
      const incomingList = row.list;
      if (row.type === 1 && game.search.active && JSON.stringify(Array.from({ length: 5 }, (_, index) => Number(incomingList[index] ?? 0))) !==
          JSON.stringify(game.decks.find((deck) => deck.type === 1)?.list)) {
        return this.failure(2001, "Search party cannot change during an active attempt");
      }
      if (row.type === 4 && game.arena.active && JSON.stringify(Array.from({ length: 5 }, (_, index) => Number(incomingList[index] ?? 0))) !==
          JSON.stringify(game.decks.find((deck) => deck.type === 4)?.list)) {
        return this.failure(2001, "Fight Club deck cannot change during an active attempt");
      }
      if (!members.length || new Set(members).size !== members.length || updates.some((deck) => deck.type === row.type)) {
        return this.failure(2001, "duplicate deck type or instance");
      }
      updates.push({ type: Number(row.type), list: Array.from({ length: 5 }, (_, index) => Number(incomingList[index] ?? 0)) });
    }
    const updatedTypes = new Set(updates.map((deck) => deck.type));
    game.decks = [...game.decks.filter((deck) => !updatedTypes.has(deck.type)), ...updates];
    this.persist();
    return this.envelope({ deck: partyDeck(game) });
  }

  /** Recovered ReqCardLockCB (0xf65c8c): flat numeric inst_id/lock fields.
   * The request only names target_inst_id; native sends no desired state. */
  toggleCardLock(payload: Record<string, unknown>, headers: Record<string, string>) {
    const game = this.gameFor(this.accountFor(payload, headers));
    const id = Number(payload.target_inst_id);
    const card = [...game.starter_cards, ...game.recruited_cards].find((entry) => entry.inst_id === id);
    if (!Number.isSafeInteger(id) || !card) return this.failure(2001, "card is not owned");
    card.lock = Number(card.lock) === 0 ? 1 : 0;
    this.persist();
    return this.envelope({ inst_id: id, lock: card.lock });
  }

  /** Shared source-backed TYPE3 per-source fee; numeric quotes/benefits are
   * independently supplied fixtures. Missing affiliated references refuse. */
  private hunterTrainingGold(account:Account,prices:readonly number[]):number {
    const id=this.guildPersonal(account.pvid).my_guild.guild_id;
    let selected:null|{mode:number;value:number}=null;
    if(id!==0) {
      const guild=this.guilds?.find(record=>record.id===id);
      if(!guild||!this.guildLevels)throw new TypeError("Guild Hunter training requires complete configured level references and current INFO");
      selected=selectedGuildBenefit(this.guildLevels,guild.contribution,"traning");
    }
    // Both native Hunter popups transform EACH source price before addition.
    // Applying the multiplier to an aggregate would change truncation results.
    const cost=prices.reduce((sum,price)=>sum+nativeGuildSaleValue(price,selected),0);
    if(!Number.isInteger(cost)||cost<0||cost>0xffff_ffff)throw new TypeError("Hunter training total exceeds wallet range");
    return cost;
  }

  /** Training Raise consumes sources for target EXP and gold atomically.
   * ReqLevelUpCB nesting/object removals are recovered; prices/curves remain
   * fixtures. Non-success callbacks skip mutation parsing; 2001 is local. */
  trainCard(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account=this.accountFor(payload,headers);
    const game=this.gameByPvid.get(account.pvid)??this.gameFor(account);
    assertOwnedCardCompatibility(game);
    const inventory = [...game.starter_cards, ...game.recruited_cards];
    const targetId = Number(payload.target_inst_id);
    const target = inventory.find((card) => card.inst_id === targetId);
    const refuse = (reason: string) => this.failure(2001, reason);
    if (!Number.isSafeInteger(targetId) || !target) return refuse("training target is not owned");
    let sources: unknown = payload.source_inst_list;
    if (typeof sources === "string") {
      try { sources = JSON.parse(sources); } catch { return refuse("invalid training sources"); }
    }
    // Native TableLevelUp permits five selected partners (G101de2e..3c).
    if (!Array.isArray(sources) || sources.length === 0 || sources.length > 5 ||
        !sources.every((id) => Number.isSafeInteger(id) && id > 0) ||
        new Set(sources).size !== sources.length || sources.includes(targetId)) {
      return refuse("invalid training sources");
    }
    const protectedIds = new Set([game.leader_inst_id, ...this.gemProtectedCardIds(game), ...(this.dispatches.get(account.pvid)?.active?.deck??[]),
      ...game.decks.filter((deck) => [1, 2, 4, 5].includes(deck.type)).flatMap((deck) => deck.list),
      ...(game.active_battle?.state === "active" ? game.active_battle.deck_inst_ids : []),
      ...(game.arena.active?.deck_inst_ids ?? []), ...(game.search.active?.deck_inst_ids ?? [])]);
    const sourceCards = sources.map((id) => inventory.find((card) => card.inst_id === id));
    if (sourceCards.some((card) => !card || Number(card.lock) !== 0 || protectedIds.has(card.inst_id))) {
      return refuse("training source is missing, locked or in use");
    }
    const targetCurve = trainingCurve(target);
    const sourceCurves = sourceCards.map((card) => trainingCurve(card!));
    if (!targetCurve || sourceCurves.some((curve) => !curve)) return refuse("training curve is not reconstructed for this rank/awakening");
    if (Number(target.exp) >= targetCurve.maxExp) return refuse("training target is at its published level cap");
    // Native UpdateTraningInfo charges GetCardRaisePrice(SOURCE.rank) per card;
    // the one-row price fixture covers every supported positive rank.
    let cost:number;
    try{cost=this.hunterTrainingGold(account,sourceCards.map(card=>raisePrice(Number(card!.rank))));}
    catch(error){return refuse(error instanceof Error?error.message:"Guild training fee unavailable");}
    if (!Number.isInteger(game.gold)||game.gold<cost||game.gold>0xffff_ffff) return refuse("not enough or invalid training gold");
    const prevGold = game.gold;
    const prevExp = Number(target.exp);
    const gained = sourceCurves.reduce((sum, curve) => sum + curve!.sourceExp, 0);
    const curExp = Math.min(targetCurve.maxExp, prevExp + gained);
    const removed = new Set(sources);
    const before={exp:target.exp,starters:game.starter_cards,recruits:game.recruited_cards,decks:game.decks};
    target.exp = curExp;
    game.gold -= cost;
    game.starter_cards = game.starter_cards.filter((card) => !removed.has(card.inst_id));
    game.recruited_cards = game.recruited_cards.filter((card) => !removed.has(card.inst_id));
    // Case3 is not in native source protection. Remove any consumed source
    // from that unprotected preset rather than leaving dangling saved IDs.
    game.decks = game.decks.map((deck) => ({ ...deck, list: deck.list.map((id) => removed.has(id) ? 0 : id) }));
    try{this.persist();}catch(error){target.exp=before.exp;game.gold=prevGold;game.starter_cards=before.starters;
      game.recruited_cards=before.recruits;game.decks=before.decks;throw error;}
    return this.envelope({
      user: { gold: { prev: prevGold, cur: game.gold }, deck: partyDeck(game) },
      card: { target_inst: { inst_id: targetId, exp: { prev: prevExp, cur: curExp } },
        removed_inst_list: sources.map((inst_id) => ({ inst_id })) },
    });
  }

  /** Recovered ReqRankUpCB uses rank/counter/EXP pairs and bare removed IDs.
   * Partial arithmetic, prices/bonus and EXP reset are documented local policy.
   * Preserve owned skills: callback does not parse new skill-level fields. */
  rankUpCard(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account=this.accountFor(payload,headers);
    const game=this.gameByPvid.get(account.pvid)??this.gameFor(account);
    assertOwnedCardCompatibility(game);
    const inventory = [...game.starter_cards, ...game.recruited_cards];
    const targetId = Number(payload.target_inst_id);
    const target = inventory.find((card) => card.inst_id === targetId);
    const refuse = (reason: string) => this.failure(2001, reason);
    if (!Number.isSafeInteger(targetId) || !target) return refuse("advancement target is not owned");
    if (game.active_battle?.state === "active" && game.active_battle.deck_inst_ids.includes(targetId))
      return refuse("advancement target is in an active battle");
    if (payload.is_tuto !== undefined && ![0, 1, "0", "1"].includes(payload.is_tuto as number | string))
      return refuse("invalid advancement tutorial flag");
    let sources: unknown = payload.source_inst_list;
    if (typeof sources === "string") {
      try { sources = JSON.parse(sources); } catch { return refuse("invalid advancement sources"); }
    }
    if (!Array.isArray(sources) || sources.length < 1 ||
        !sources.every((id) => Number.isSafeInteger(id) && id > 0) ||
        new Set(sources).size !== sources.length || sources.includes(targetId)) return refuse("invalid advancement sources");
    const transition = rankUpTransition(target, sources.length);
    if (!transition) return refuse("target needs max level, supported rank and bounded credited materials");
    const capacity = rankUpRows.find((row) => row.rank === Number(target.rank))!.src_cnt;
    // Native synthetic credited entries have IDs below capacity and skip price.
    // Do not renumber legacy cards or accept a price-disagreeing real material.
    if (sources.some((id) => id < capacity)) return refuse("legacy source ID collides with native credited-material placeholders");
    const protectedIds = new Set([game.leader_inst_id, ...this.gemProtectedCardIds(game), ...(this.dispatches.get(account.pvid)?.active?.deck??[]),
      ...game.decks.filter((deck) => [1, 2, 4, 5].includes(deck.type)).flatMap((deck) => deck.list),
      ...(game.active_battle?.state === "active" ? game.active_battle.deck_inst_ids : []),
      ...(game.arena.active?.deck_inst_ids ?? []), ...(game.search.active?.deck_inst_ids ?? [])]);
    const materials = sources.map((id) => inventory.find((card) => card.inst_id === id));
    if (materials.some((card) => !card || Number(card.lock) !== 0 || protectedIds.has(card.inst_id) ||
        Number(card.awk_step) !== 0 || Number(card.rank) !== Number(target.rank)))
      return refuse("advancement source is missing, locked, in use, awake or wrong grade");
    const reference = starterReference.find((row) => row.base.id === target.ref_id);
    if (!reference?.stat.some((row) => row.rank === transition.rank && row.awk_step === 0) ||
        !starterLevels.card.some((row) => row.rank === transition.rank && row.level === 1))
      return refuse("next-rank reference is not reconstructed");
    let cost:number;
    try{cost=this.hunterTrainingGold(account,materials.map(card=>rankUpPrice(Number(card!.rank))));}
    catch(error){return refuse(error instanceof Error?error.message:"Guild advancement fee unavailable");}
    if (!Number.isInteger(game.gold)||game.gold<cost||game.gold>0xffff_ffff) return refuse("not enough or invalid advancement gold");
    let nextBook:LocalGameState["card_book"];
    try{nextBook=mergeCardBook(game.card_book,[{...target,...transition}]);}
    catch(error){return refuse(error instanceof Error?error.message:"Invalid Hunter book history");}
    const previous = { rank: Number(target.rank), rank_up_cnt: Number(target.rank_up_cnt), exp: Number(target.exp) };
    const previousGold = game.gold;
    const before={target:{rank:target.rank,rank_up_cnt:target.rank_up_cnt,exp:target.exp},
      starters:game.starter_cards,recruits:game.recruited_cards,decks:game.decks,book:game.card_book};
    Object.assign(target, transition);
    game.gold -= cost;
    const removed = new Set(sources);
    game.starter_cards = game.starter_cards.filter((card) => !removed.has(card.inst_id));
    game.recruited_cards = game.recruited_cards.filter((card) => !removed.has(card.inst_id));
    game.decks = game.decks.map((deck) => ({ ...deck, list: deck.list.map((id) => removed.has(id) ? 0 : id) }));
    game.card_book = nextBook;
    try{this.persist();}catch(error){Object.assign(target,before.target);game.gold=previousGold;game.starter_cards=before.starters;
      game.recruited_cards=before.recruits;game.decks=before.decks;game.card_book=before.book;throw error;}
    return this.envelope({ user: { gold: { prev: previousGold, cur: game.gold }, deck: partyDeck(game) },
      card: { target_inst: { inst_id: targetId,
        rank: { prev: previous.rank, cur: transition.rank },
        rank_up_cnt: { prev: previous.rank_up_cnt, cur: transition.rank_up_cnt },
        exp: { prev: previous.exp, cur: transition.exp } }, removed_inst_list: sources } });
  }

  socialFriendAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const before = this.socialFriends;
    const current = before ?? emptySocialFriends();
    const profile = (pvid: number) => this.socialAccountProfile(pvid, account.pvid);
    try {
      if (route === "/relation/GetList") return this.envelope(socialFriendList(current, account.pvid, payload.type, profile));
      if (route === "/relation/GetFriendReceivedCount") return this.envelope(receivedSocialFriendCount(current, account.pvid));
      if (!["/relation/FriendRequest", "/relation/FriendReqAccept", "/relation/FriendReqCancel", "/relation/FriendReqReject", "/relation/Unfriend"].includes(route))
        return this.failure(2001, "This friend lifecycle receiver is not reconstructed");
      const isRemoval = ["/relation/FriendReqCancel", "/relation/FriendReqReject", "/relation/Unfriend"].includes(route);
      if (!isRemoval && payload.target_friend_id_list !== undefined)
        return this.failure(2001, "Friend request/accept uses a scalar identity, not a removal list");
      const blocked = (a: number, b: number) => Object.hasOwn(this.accountsByPvid.get(a)?.socialBlocks ?? {}, String(b));
      const plan = isRemoval ? planSocialFriendRemoval(current, account.pvid,
        route === "/relation/FriendReqCancel" ? "cancel" : route === "/relation/FriendReqReject" ? "reject" : "unfriend",
        payload.target_friend_id_list, profile) : planSocialFriend(current, account.pvid,
        route === "/relation/FriendRequest" ? "request" : "accept",
        route === "/relation/FriendRequest" ? payload.target_pvid : payload.target_friend_id,
        profile, blocked, Date.now());
      if (JSON.stringify(plan.next) !== JSON.stringify(current)) {
        this.socialFriends = plan.next;
        try { this.persist(); }
        catch { this.socialFriends = before; return this.failure(2001, "Unable to persist local friend operation"); }
      }
      return this.envelope(plan.receipt);
    } catch (error) {
      // Validation refuses without mutation; persistence failures already
      // restored the complete graph covering both relationship participants.
      return this.failure(2001, error instanceof Error ? error.message : "Invalid local friend operation");
    }
  }

  socialDiscoveryAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    if (!["/relation/GetSuggestedFriendList", "/relation/FriendSearch"].includes(route))
      return this.failure(2001, "Unknown social discovery operation");
    try {
      const profiles = [...this.accountsByPvid.keys()].map((pvid) => this.socialAccountProfile(pvid, account.pvid)!);
      const blocked = (a: number, b: number) => Object.hasOwn(this.accountsByPvid.get(a)?.socialBlocks ?? {}, String(b));
      return this.envelope(socialDiscovery(this.socialFriends ?? emptySocialFriends(), account.pvid,
        route === "/relation/FriendSearch" ? "search" : "suggested", payload, profiles, blocked));
    } catch (error) {
      return this.failure(2001, error instanceof Error ? error.message : "Invalid local discovery request");
    }
  }

  private socialAccountProfile(pvid: number, viewerPvid?: number) {
    const peer = this.accountsByPvid.get(pvid);
    return peer ? { pvid: peer.pvid, nickname: peer.nickname, serverId: peer.serverId,
      beginUtc: peer.beginUtc, lastLoginAt: peer.lastLoginAt,
      profile_url: this.baseUrl + LOCAL_MAIL_PORTRAIT_PATH,
      ...(viewerPvid === undefined ? {} : this.socialLikeMetadata(viewerPvid, pvid)) } : undefined;
  }

  /** Shared public projection; presentation-only IDs never acquire real edges. */
  socialLikeMetadata(viewerPvid: number, targetPvid: number) {
    const viewer = this.accountsByPvid.get(viewerPvid), peer = this.accountsByPvid.get(targetPvid);
    if (!viewer || !peer || viewer.serverId !== peer.serverId) return { like_cnt: 0, is_like: 0 };
    return socialLikeProjection(this.socialLikes ?? emptySocialLikes(), viewerPvid, targetPvid);
  }

  socialLikeAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const before = this.socialLikes;
    const current = before ?? emptySocialLikes();
    const context = { profile: (pvid: number) => this.socialAccountProfile(pvid),
      blocked: (a: number, b: number) => Object.hasOwn(this.accountsByPvid.get(a)?.socialBlocks ?? {}, String(b)) };
    try {
      if (route === "/relation/GetLikeCnt")
        return this.envelope(readSocialLikeCount(current, account.pvid, payload.target_pvid, context));
      if (route !== "/relation/ToggleLike") return this.failure(2001, "Unknown like operation");
      const plan = planSocialLikeToggle(current, account.pvid, payload.target_pvid, context);
      this.socialLikes = plan.next;
      try { this.persist(); }
      catch { this.socialLikes = before; return this.failure(2001, "Unable to persist local like operation"); }
      return this.envelope(plan.receipt);
    } catch (error) {
      return this.failure(2001, error instanceof Error ? error.message : "Invalid local like operation");
    }
  }

  /** Public brief profiles for actual same-server, mutually nonblocked accounts.
   * This includes discovery candidates before a friendship is established.
   * Reuse the existing original100x100 system icon as LOCAL fallback avatar.
   * No opponent fixture, account secrets or synthetic party/card is returned.
   */
  localSocialProfile(viewerPvid: number, targetPvid: number) {
    const viewer = this.accountsByPvid.get(viewerPvid), peer = this.accountsByPvid.get(targetPvid);
    if (!viewer || !peer || viewerPvid === targetPvid || viewer.serverId !== peer.serverId ||
      Object.hasOwn(viewer.socialBlocks ?? {}, String(targetPvid)) ||
      Object.hasOwn(peer.socialBlocks ?? {}, String(viewerPvid))) return undefined;
    return { pvid: peer.pvid, reg_utc: peer.beginUtc, utc: Math.floor(Date.now() / 1000),
      nick_name: peer.nickname, country_code: "", profile_status: "", ...this.socialLikeMetadata(viewerPvid, targetPvid),
      profile_url: this.baseUrl + LOCAL_MAIL_PORTRAIT_PATH };
  }

  cardSaleProfitReference(): CardSellProfit[] {
    return this.hunterSaleProfits.map((row) => ({ ...row }));
  }

  equipmentReferenceAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account=this.accountFor(payload,headers);
    if(route==="/reference/GetCardEquipmentLevelUpPrice")
      return this.envelope(this.equipmentLevelPrices.map(row=>({...row})));
    if(route==="/reference/GetCardEquipmentRankUpPrice")
      return this.envelope(this.equipmentRankPrices.map(row=>({...row})));
    const action=route==="/card_handler/LevelUpEquipment"?"level":route==="/card_handler/RankUpEquipment"?"rank":undefined;
    if(!action) return this.failure(2001,"Unknown equipment operation");
    const game=this.gameByPvid.get(account.pvid)??this.gameFor(account);
    assertOwnedCardCompatibility(game);
    const cards=[...game.starter_cards,...game.recruited_cards];
    if(!this.options.legacyCardIds && (game.card_instance_namespace!==1 || cards.some(card=>
      !Number.isSafeInteger(card.inst_id)||card.inst_id<=CARD_INSTANCE_BASE||card.inst_id>=CARD_INSTANCE_LIMIT)))
      return this.failure(2001,"Equipment upgrades require production owned identities");
    const busyIds=new Set([...(game.active_battle?.state==="active"?game.active_battle.deck_inst_ids:[]),
      ...(game.arena.active?.deck_inst_ids??[]),...(game.search.active?.deck_inst_ids??[])]);
    const guild=(this.guildAction("/lobby/GetGuildInfo",payload,headers).ret_data as {my_guild:{guild_id:number}}).my_guild.guild_id;
    const guildRecord=this.guilds?.find(record=>record.id===guild);
    const guildLevelBenefit=action==="level"&&guild&&guildRecord&&this.guildLevels?selectedGuildBenefit(this.guildLevels,guildRecord.contribution,"equipment_level_up"):undefined;
    const plan=planEquipmentUpgrade(action,payload,{cards,items:game.items,gold:game.gold,
      guildId:guild,guildLevelBenefit,busyIds,levelPrices:this.equipmentLevelPrices,rankPrices:this.equipmentRankPrices,
      reference:id=>{const row=starterReference.find(row=>row.base.id===id&&row.base.is_source===0);
        return row?{attr:row.base.attr,equipment:row.equipment}:undefined;}});
    if("error" in plan) return this.failure(2001,plan.error!);
    const before={gold:game.gold,items:game.items,starters:game.starter_cards,recruits:game.recruited_cards};
    game.gold=plan.gold!;game.items=plan.items!;
    game.starter_cards=game.starter_cards.map(card=>card.inst_id===plan.id?plan.card!:card);
    game.recruited_cards=game.recruited_cards.map(card=>card.inst_id===plan.id?plan.card!:card);
    try {this.persist();}
    catch(error){game.gold=before.gold;game.items=before.items;game.starter_cards=before.starters;game.recruited_cards=before.recruits;throw error;}
    return this.envelope(plan.data);
  }

  sellCards(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    if (this.hunterSaleProfits.length === 0) return this.failure(2001, "Hunter sale profit references are not reconstructed or explicitly configured");
    assertOwnedCardCompatibility(game);
    const inventory = [...game.starter_cards, ...game.recruited_cards];
    if (!this.options.legacyCardIds && (game.card_instance_namespace !== 1 || inventory.some((card) =>
      !Number.isSafeInteger(card.inst_id) || card.inst_id <= CARD_INSTANCE_BASE || card.inst_id >= CARD_INSTANCE_LIMIT)))
      return this.failure(2001, "Hunter sale requires production owned instance identities");
    // Unrepresented historical Mirage commitments must not become disposable.
    if (inventory.some((card) => card.mirage_remain_hp !== undefined && Number(card.mirage_remain_hp) !== 1000))
      return this.failure(2001, "Carried Mirage hunter commitments are not reconstructed");
    const protectedIds = new Set([game.leader_inst_id, ...this.gemProtectedCardIds(game), ...(this.dispatches.get(account.pvid)?.active?.deck??[]), ...game.decks.flatMap((deck) => deck.list),
      ...(game.active_battle?.state === "active" ? game.active_battle.deck_inst_ids : []),
      ...(game.arena.active?.deck_inst_ids ?? []), ...(game.search.active?.deck_inst_ids ?? [])]);
    const plan = planHunterSale(inventory, payload, { gold: game.gold, items: game.items,
      nextItemId: game.next_item_inst_id, protectedIds, profits: this.hunterSaleProfits,
      referenceMinRank: (refId) => {
        const ref = starterReference.find((entry) => entry.base.id === refId && entry.base.is_source === 0);
        return ref && ref.stat.length ? Math.min(...ref.stat.map((row) => row.rank)) : undefined;
      },
      knownItemIds: new Set(itemReference().item.map((item) => item.id)),
    });
    if ("error" in plan) return this.failure(2001, plan.error!);
    const before = { gold: game.gold, items: game.items, nextItemId: game.next_item_inst_id,
      starters: game.starter_cards, recruits: game.recruited_cards };
    const removed = new Set(plan.removedIds);
    game.gold = plan.gold!; game.items = plan.items!; game.next_item_inst_id = plan.nextItemId!;
    game.starter_cards = game.starter_cards.filter((card) => !removed.has(card.inst_id));
    game.recruited_cards = game.recruited_cards.filter((card) => !removed.has(card.inst_id));
    // Preserve earned book history and monotone hunter allocator. All decks
    // were protected, so no formation repair or replacement grant is needed.
    try { this.persist(); }
    catch (error) {
      game.gold = before.gold; game.items = before.items; game.next_item_inst_id = before.nextItemId;
      game.starter_cards = before.starters; game.recruited_cards = before.recruits;
      throw error;
    }
    return this.envelope(plan.data);
  }

  groupRankUpCards(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    assertOwnedCardCompatibility(game);
    const inventory = [...game.starter_cards, ...game.recruited_cards];
    // Mirage runs/entry are currently refused. Preserve any carried HP from
    // older evidence rather than treat an unrepresented sortie as disposable.
    if (inventory.some((card) => card.mirage_remain_hp !== undefined && Number(card.mirage_remain_hp) !== 1000))
      return this.failure(2001, "Carried Mirage hunter commitments are not reconstructed");
    const protectedIds = new Set([game.leader_inst_id, ...this.gemProtectedCardIds(game), ...(this.dispatches.get(account.pvid)?.active?.deck??[]), ...game.decks.flatMap((deck) => deck.list),
      ...(game.active_battle?.state === "active" ? game.active_battle.deck_inst_ids : []),
      ...(game.arena.active?.deck_inst_ids ?? []), ...(game.search.active?.deck_inst_ids ?? [])]);
    const plan = planGroupRankUp(inventory, payload, { gold: game.gold, protectedIds,
      ordinaryReference: (refId) => starterReference.some((ref) => ref.base.id === refId && ref.base.is_source === 0),
      destinationSupported: (refId, rank) => starterReference.some((ref) => ref.base.id === refId &&
        ref.stat.some((row) => row.rank === rank && row.awk_step === 0)) &&
        starterLevels.card.some((row) => row.rank === rank && row.level === 1 && row.min_exp === 0),
    });
    if ("error" in plan) return this.failure(2001, plan.error!);
    const targets = plan.updates.map((update) => inventory.find((card) => card.inst_id === update.inst_id)!);
    // Validate potentially malformed historical book data before touching any
    // hunter or wallet. A thrown projection must not leave destructive edits.
    const nextBook = mergeCardBook(game.card_book, targets.map((card, index) => ({ ...card, ...plan.updates[index] })));
    const targetBefore = targets.map((card) => ({ card, rank: card.rank, rank_up_cnt: card.rank_up_cnt, exp: card.exp }));
    const before = { gold: game.gold, starters: game.starter_cards, recruits: game.recruited_cards, book: game.card_book };
    const removed = new Set(plan.removedIds);
    for (let i = 0; i < targets.length; i++) Object.assign(targets[i], plan.updates[i]);
    game.gold = plan.gold!;
    game.starter_cards = game.starter_cards.filter((card) => !removed.has(card.inst_id));
    game.recruited_cards = game.recruited_cards.filter((card) => !removed.has(card.inst_id));
    game.card_book = nextBook;
    try { this.persist(); }
    catch (error) {
      for (const { card, rank, rank_up_cnt, exp } of targetBefore) Object.assign(card, { rank, rank_up_cnt, exp });
      game.gold = before.gold;
      game.starter_cards = before.starters;
      game.recruited_cards = before.recruits;
      game.card_book = before.book;
      throw error;
    }
    return this.envelope(plan.data);
  }

  missionInventory(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameFor(account);
    const dispatch=this.dispatches.get(account.pvid)?.active;
    if(dispatch)return this.envelope({area_achieve:this.areaRewardClaims(game),area_progress:this.areaProgressSnapshot(game),stage:stageAchieveList(game),
      mission:game.missions,missions:game.missions,entrust:{...dispatchStartWire(dispatch.snapshot),pass:{...dispatch.pass}}});
    if (process.env.BLUSTONE_SKIP_MISSION_TUTORIAL === "1") {
      // The stage map's markers and the progress counter are driven from here.
      // An experiment that published these catalogs as JSON objects (on the
      // theory that CSRPlayData's maps are std::map) changed nothing in the
      // 0/0 counter and removed the map's chapter shield marker, so the array
      // form is kept until a parser actually proves otherwise.
      //
      // 2026-10-03: `area_achieve` IS now the object form, because its one
      // recovered reader (`IsReceivedAchieveReward`, 0xb6d14c) indexes a
      // `std::map<std::string, AREA_ACHIEVE_INFO>` and an array cannot produce
      // a key for it - see `areaAchieveMap`. `stage[]` stays an array of
      // records but its `achieve` values are now REAL progression instead of the
      // constant 3 they used to carry.
      return this.envelope({
        area_achieve: this.areaRewardClaims(game),
        area_progress: this.areaProgressSnapshot(game),
        stage: stageAchieveList(game),
        mission: game.missions,
        missions: game.missions,
      });
    }
    return this.envelope(game.missions);
  }

  dispatchBlocks(route:string,payload:Record<string,unknown>,headers:Record<string,string>):boolean {
    if(!this.dispatches.size)return false;
    if(!(/^\/(gym|card_handler|gem)\//.test(route)||["/world/SetDeck","/shop/SellCard","/mission/Start","/arena/BattleStart","/explore/Begin"].includes(route)))return false;
    const actor=this.accountFor(payload,headers);
    return !!this.dispatches.get(actor.pvid)?.active;
  }

  dispatchAction(route:string,payload:Record<string,unknown>,headers:Record<string,string>) {
    const account=this.accountFor(payload,headers),game=this.gameByPvid.get(account.pvid);
    if(this.dispatchMode!=="local-timed"||!game)return this.failure(2001,"Local timed dispatch is unavailable");
    const prior=this.dispatches.get(account.pvid),journal=prior??{active:null,last_id:"0",last_deck:[]},now=Math.floor(Date.now()/1000);
    if(route==="/mission/Entrust") {
      if(journal.active) {
        const job=journal.active.snapshot;
        let request;try{request=parseExpeditionEntrustRequest(payload);}catch{return this.failure(2001,"Invalid duplicate dispatch request");}
        if(request.stage_id!==job.stage_id||request.deck_type!==2||request.cnt!==job.cnt||request.is_tuto!==0)return this.failure(2001,"Another dispatch is pending");
        const next=structuredClone(game),recovered=regenerateResources(next);
        const data={...dispatchStartWire(job),user:{ap:next.ap,ap_charge_time:resourceChargeTime(next,"ap")}};
        if(recovered)this.commitDispatch(account.pvid,game,next,journal,prior);
        return this.envelope(data);
      }
      const stage=starterStages.stage.find(row=>row.id===payload.stage_id&&/^n_/.test(row.id));
      if(!stage)return this.failure(2001,"Dispatch stage is not published ordinary content");
      const next=structuredClone(game);regenerateResources(next);
      let job;
      try {
        const guildId=this.guildPersonal(account.pvid).my_guild.guild_id;
        const guild=this.guilds?.find(row=>row.id===guildId);
        if(guildId&&(!guild||!this.guildLevels))throw new TypeError("Dispatch Guild duration requires complete supplied benefits");
        const benefit=guildId?selectedGuildBenefit(this.guildLevels!,guild!.contribution,"intrust"):null;
        let id:string;do{id=crypto.randomBytes(8).readBigUInt64LE().toString();}while(id==="0"||id===journal.last_id);
        job=planDispatchStart(next,account.pvid,this.dispatchPolicy!,payload,id,now,stage,benefit);
        if(next.ap>=next.max_ap)next.ap_updated_at=Date.now();next.ap-=job.snapshot.cnt*stage.ap_cost;
        const data={...dispatchStartWire(job.snapshot),user:{ap:next.ap,ap_charge_time:resourceChargeTime(next,"ap")}};
        this.commitDispatch(account.pvid,game,next,{active:job,last_id:journal.last_id,last_deck:journal.last_deck},prior);return this.envelope(data);
      }catch(error){if(error instanceof TypeError)return this.failure(2001,error.message);throw error;}
    }
    let id:string;try{id=dispatchId(payload.entrust_id);}catch(error){return this.failure(2001,"Invalid dispatch identity");}
    if(route==="/mission/RefreshEntrust") {
      if(!journal.active||journal.active.snapshot.entrust_id!==id)return this.failure(2001,"Dispatch identity is not owned");
      const wire=dispatchStartWire(journal.active.snapshot);
      return this.envelope({skip_price:wire.skip_price,entrust_second_per_cost:wire.entrust_second_per_cost,list:wire.list});
    }
    if(route!=="/mission/EndEntrust")return this.failure(2001,"Paid dispatch operation is not reconstructed");
    if(!journal.active) {
      if(journal.last_id!==id||id==="0")return this.failure(2001,"Dispatch identity is not collectable");
      const next=structuredClone(game),recovered=regenerateResources(next),owned=[...next.starter_cards,...next.recruited_cards];
      const rows=journal.last_deck.flatMap(id=>{const card=owned.find(row=>row.inst_id===id);return card?[{inst_id:String(id),prev:Number(card.exp),cur:Number(card.exp)}]:[];});
      if(rows.some(row=>row.cur>0x7fff_ffff))return this.failure(2001,"Dispatch replay Hunter EXP exceeds safe setter range");
      const data={user:null,result:dispatchEndWire(dispatchEndResult(next,rows))};
      if(recovered)this.commitDispatch(account.pvid,game,next,journal,prior);
      return this.envelope(data);
    }
    const job=journal.active;
    if(job.snapshot.entrust_id!==id||BigInt(job.snapshot.list.at(-1)!.end_utc)>BigInt(now))return this.failure(2001,"Dispatch is not complete or not owned");
    const next=structuredClone(game);regenerateResources(next);let result;
    try {
      const rows=job.deck.map(id=>{
        const card=[...next.starter_cards,...next.recruited_cards].find(row=>row.inst_id===id);if(!card)throw new TypeError("Dispatch Hunter ownership changed");
        const curve=trainingCurve(card);if(!curve)throw new TypeError("Dispatch Hunter curve unavailable");
        const prev=Number(card.exp),cur=Math.max(prev,Math.min(curve.maxExp,prev+job.card_exp*job.snapshot.cnt));if(cur>0x7fff_ffff)throw new TypeError("Dispatch Hunter EXP exceeds safe setter range");
        card.exp=cur;return {inst_id:String(id),prev,cur};
      });
      const items=applyDispatchItems(next,job);
      result=dispatchEndResult(next,rows,next.gold+job.gold*job.snapshot.cnt,next.exp+job.user_exp*job.snapshot.cnt,items);
      next.gold=result.gold.cur;next.exp=result.user_exp.cur;
      const data={user:null,result:dispatchEndWire(result)};
      this.commitDispatch(account.pvid,game,next,{active:null,last_id:id,last_deck:[...job.deck]},prior);return this.envelope(data);
    }catch(error){if(error instanceof TypeError)return this.failure(2001,error.message);throw error;}
  }

  private commitDispatch(pvid:number,game:LocalGameState,next:LocalGameState,journal:DispatchJournal,prior:DispatchJournal|undefined) {
    const before={...game};Object.assign(game,next);this.dispatches.set(pvid,journal);
    try{this.persist();}catch(error){Object.assign(game,before);if(prior)this.dispatches.set(pvid,prior);else this.dispatches.delete(pvid);throw error;}
  }

  gemInventory(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account=this.accountFor(payload, headers);
    // CSRGem::ParseGemInsts consumes ret_data directly as owned instance rows.
    // The legacy scalar game.gem is not an owned jewel and must not masquerade
    // as one. Only explicitly stored, validated wire rows are exposed.
    const game=this.gameByPvid.get(account.pvid)??this.gameFor(account);
    this.validateOwnedGems(game);
    return this.envelope(gemWireRows(game.owned_gems??[]));
  }

  gemReferenceInventory(payload:Record<string,unknown>,headers:Record<string,string>) {
    this.accountFor(payload,headers);
    return this.envelope(this.gemReferences.map(row=>({...row})));
  }

  gemCombinationReference(payload:Record<string,unknown>,headers:Record<string,string>) {
    this.accountFor(payload,headers);
    return this.envelope(this.gemCombinations.map(row=>({...row})));
  }

  gemDisassembleReference(payload:Record<string,unknown>,headers:Record<string,string>) {
    this.accountFor(payload,headers);
    return this.envelope(this.gemDisassemblePrices.map(row=>({...row})));
  }

  gemSellReference(payload:Record<string,unknown>,headers:Record<string,string>) {
    this.accountFor(payload,headers);
    return this.envelope(this.gemSellPrices.map(row=>({...row})));
  }

  gemLevelReference(payload:Record<string,unknown>,headers:Record<string,string>) {
    this.accountFor(payload,headers);
    return this.envelope(this.gemLevelPrices.map(row=>({...row})));
  }

  sellGems(payload:Record<string,unknown>,headers:Record<string,string>) {
    const account=this.accountFor(payload,headers),game=this.gameByPvid.get(account.pvid)??this.gameFor(account);
    assertOwnedCardCompatibility(game);
    this.validateOwnedGems(game);
    // Single/batch sale UI copies raw quotes; Guild polish benefits do not
    // modify proceeds or establish a separate affiliation restriction.
    const hunters=new Set([...game.starter_cards,...game.recruited_cards].map(card=>String(card.inst_id)));
    const plan=planGemSale(payload,game.owned_gems??[],this.gemReferences,hunters,this.gemSellPrices,game.gold);
    if("error" in plan) return this.failure(2001,plan.error!);
    const before=game.owned_gems,beforeGold=game.gold;
    game.owned_gems=plan.next!;game.gold=plan.gold!;
    try{this.persist();}catch(error){game.owned_gems=before;game.gold=beforeGold;throw error;}
    // Native callback deletes its captured original request IDs. It consumes
    // absolute gold/item quantities, not a guessed returned Gem deletion list.
    return this.envelope({user:{gold:{cur:game.gold},item:[]}});
  }

  equipGems(payload:Record<string,unknown>,headers:Record<string,string>) {
    const account=this.accountFor(payload,headers),game=this.gameByPvid.get(account.pvid)??this.gameFor(account);
    assertOwnedCardCompatibility(game);
    this.validateOwnedGems(game);
    const cards=[...game.starter_cards,...game.recruited_cards];
    if(!this.options.legacyCardIds&&(game.card_instance_namespace!==1||cards.some(card=>
      !Number.isSafeInteger(card.inst_id)||card.inst_id<=CARD_INSTANCE_BASE||card.inst_id>=CARD_INSTANCE_LIMIT)))
      return this.failure(2001,"Gem mounting requires production owned Hunter identities");
    const target=cards.find(card=>String(card.inst_id)===String(payload.target_inst_id));
    if(!target||!starterReference.some(ref=>ref.base.id===target.ref_id&&ref.base.is_source===0))
      return this.failure(2001,"Gem target ordinary reference is missing");
    const busy=new Set([...(game.active_battle?.state==="active"?game.active_battle.deck_inst_ids:[]),
      ...(game.arena.active?.deck_inst_ids??[]),...(game.search.active?.deck_inst_ids??[])]);
    // Confirmation accumulates raw OLD-level removal quotes, including swaps.
    // Guild TYPE2 belongs to polishing, not this cached disassembly total.
    const plan=planPaidGemMount(payload,cards,game.owned_gems??[],this.gemReferences,busy,this.gemDisassemblePrices,game.gold);
    if("error" in plan) return this.failure(2001,plan.error!);
    const before=game.owned_gems,beforeGold=game.gold;
    if(plan.changed) {
      game.owned_gems=plan.next!;
      game.gold=plan.gold!;
      try{this.persist();}catch(error){game.owned_gems=before;game.gold=beforeGold;throw error;}
    }
    // GDP remains the same explicit0 policy used by lobby; legacy game.gem is
    // not silently reinterpreted as a wallet or owned jewel count.
    return this.envelope({user:{gold:{cur:game.gold},gdp:{cur:0},iap_qty:game.gacha_iap_qty,
      free_iap_qty:game.gacha_free_qty,item:[]},gems:gemWireRows(plan.receipt!)});
  }

  private validateOwnedGems(game:LocalGameState) {
    if(game.owned_gems===undefined) return;
    parseGemInstances({result_code:1,ret_data:game.owned_gems},this.gemReferences,
      new Set([...game.starter_cards,...game.recruited_cards].map(card=>String(card.inst_id))),
      (id,slot)=>{const card=[...game.starter_cards,...game.recruited_cards].find(card=>String(card.inst_id)===id);
        return card?Number(card[`${["weapon","armor","accessory"][slot]}_rank`]):undefined;});
  }

  private gemProtectedCardIds(game:LocalGameState):number[] {
    this.validateOwnedGems(game);
    return (game.owned_gems??[]).map(row=>Number(row.target_inst_id)).filter(id=>id>0);
  }

  unavailableGemAction(payload: Record<string, unknown>, headers: Record<string, string>) {
    this.accountFor(payload, headers);
    return this.failure(2001, "Gem ownership/mutation is not reconstructed");
  }

  /**
   * `POST /shop/GachaPremium` - the recruitment pull.
   *
   * Before this handler the route fell through to the generic mock, whose
   * `ret_data` has no `card` key at all. `CSRSyncLottery::ReqGachaPremiumCB`
   * (Ghidra `0xf74fb0`) reads `ret_data["card"]`, finds `null`, and jumps to
   * `0xf654e0` **before** it ever builds the `vector<basic_json>` it hands to
   * `CSRPopUpGachaX10Result::ReqGachaPremiumCB` (`0xcd7518`) - so the popup
   * opened with nothing in it. That is exactly the measured symptom
   * (`analysis/research/in-game-stats.md` §5.3: 398 B response, gems unchanged,
   * no card).
   *
   * ## The contract, and where each key comes from
   *
   * Full derivation, with the disassembly, in
   * `analysis/research/gacha-premium-contract.md`.
   *
   * - `ret_data.cnt` - **[RECOVERED]** `ldr 0xf751dc`. Type-checked before use
   *   (`ldrb; subs #3; cmp #4; bhi 0xf653d8` then `strtod`), so it **must** be a
   *   JSON number. An object, an array or a null sends the callback down the
   *   reject branch.
   * - `ret_data.card` - **[RECOVERED]** `ldr 0xf75204`, used twice: iterated at
   *   0xf75290 into `CSRPlayData::ParseCardInst` + `CSRInventory::AddCard`, then
   *   handed to the app callback as `vector<basic_json>`.
   * - `ret_data.user.{iap_qty, free_iap_qty, gold.cur}` - **[RECOVERED]**
   *   `ldr 0xf750c6` / `0xf75112` / `0xf7515e`+`0xf75176`. All three are behind
   *   an explicit null test on `ret_data.user` (`cmp r0,#0; beq 0xf651dc`), and
   *   each read is individually type-guarded, so this minimal object is safe.
   * - `achievement`, `consumed_inst_list`, `point`, `mileage_action`,
   *   `before_point`, `after_point` - **deliberately omitted.** Every one is
   *   reached only after a null test, so an absent key is the safe form; and
   *   `achievement` additionally violates the standing `/mission/Complete`
   *   invariant (a present-but-empty `achievement` is worse than none).
   *
   * Each `card[]` element carries **[RECOVERED]** the `CSRCard::parse` instance
   * columns (`inst_id` `0x8680be`, `ref_id` `0x86810c`, `lock`, the gear/skin/skill
   * columns) **plus** the six keys `CSRPopUpGachaX10Result::RESULT::parse`
   * (`0xcd36a8`) reads and does NOT null-guard: `index_id`, `is_duplicate`,
   * `inst_id`, `reward.ref_id` (string), `reward.qty` (number). All six must be
   * present or `from_json` walks a `null` and throws `type_error.305`.
   *
   * `result_code` is **1 on every path**, including "not enough currency": a
   * non-1 code puts `CPVHTTPManager::Enqueue` into the 8x silent retry that
   * AGENTS.md §16.5 measured, so a refusal has to be expressed inside
   * `ret_data` instead.
   */
  gachaPremium(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameFor(account);
    // Coupon LotteryShot uses this same route with an owned item instance.
    // Its reference/pool/debit contract is not yet reconstructed: never turn
    // that request into a paid Manda draw by silently ignoring item_inst_id.
    const couponInstance = payload.item_inst_id;
    if (couponInstance !== undefined && couponInstance !== 0 && couponInstance !== "0") return this.envelope({
      cnt: 0, card: null,
      user: { iap_qty: game.gacha_iap_qty, free_iap_qty: game.gacha_free_qty, gold: { cur: game.gold } },
      error_code: "GACHA_COUPON_UNRECONSTRUCTED", cost: 0, granted: 0,
    });
    assertOwnedCardCompatibility(game);
    // Select a published recruit without replacing the old002 reference or
    // starter snapshot. The pool/prices remain deterministic local fixtures.
    const recruitId = (process.env.BLUSTONE_RECRUIT_CARD ?? FIXTURE_GACHA_CARD.id).trim();
    const recruitReference = starterReference.find((card) => card.base.id === recruitId && card.base.is_main === 0);
    // Only standard native single1/bundle11 counts/prices are reconstructed.
    const requested = Number(payload.cnt ?? DEFAULT_GACHA_DRAWS);
    const price = gachaCost(requested);
    const cost = price ?? 0;
    // Native recruitment banner promises at least one three-star in10+1.
    // Deterministic local pool: preserve the selected recruit on other draws,
    // substitute one already published born-rank>=3 hunter when needed.
    // Original probabilities/featured pool remain unknown; never fabricate an
    // unpublished reference or debit a bundle unable to honor the guarantee.
    const guaranteedReference = requested === 11 ? starterReference.find((card) =>
      card.base.is_main === 0 && (recruitBirthRanks[card.base.id] ?? 1) >= 3) : undefined;
    const needsGuarantee = requested === 11 && (recruitBirthRanks[recruitId] ?? 1) < 3;
    const draws = FIXTURE_GACHA_CARD_ENABLED && recruitReference && price !== null &&
      (!needsGuarantee || guaranteedReference) ? requested : 0;

    const affordable = draws > 0 && cost <= game.gacha_iap_qty + game.gacha_free_qty;
    const granted = affordable ? draws : 0;
    const nextCardId = Math.max(game.next_card_inst_id,
      ...[...game.starter_cards, ...game.recruited_cards].map((entry) => entry.inst_id + 1));
    const endCardId = nextCardId + granted;
    if (granted > 0 && (!Number.isSafeInteger(nextCardId) || nextCardId < 1 ||
      !Number.isSafeInteger(endCardId) || endCardId > CARD_INSTANCE_LIMIT)) return this.envelope({
        cnt: 0, card: null,
        user: { iap_qty: game.gacha_iap_qty, free_iap_qty: game.gacha_free_qty, gold: { cur: game.gold } },
        error_code: "GACHA_INSTANCE_CAPACITY", cost: 0, granted: 0,
      });
    if (affordable && cost > 0) {
      // Native confirmation says green Manda is used first (screenshot94).
      // Free/paid displayed values match these pools; charge TOTAL once.
      const freeSpent = Math.min(cost, game.gacha_free_qty);
      game.gacha_free_qty -= freeSpent;
      game.gacha_iap_qty -= cost - freeSpent;
    }

    // Keep allocator above all restored/bootstrap instances, even after a
    // roster-size change or migration from a save with an obsolete counter.
    game.next_card_inst_id = nextCardId;
    const instances = Array.from({ length: granted }, (_, index) => {
      const id = needsGuarantee && index === 10 ? guaranteedReference!.base.id : recruitId;
      return cardInstance(game.next_card_inst_id + index, id, recruitBirthRanks[id] ?? 1);
    });
    const previousRefs = new Set(game.card_book.map((card) => card.ref_id));
    const card = instances.map((instance, index) => {
      const instId = instance.inst_id;
      const duplicate = previousRefs.has(instance.ref_id);
      previousRefs.add(instance.ref_id);
      return {
        ...instance,
        // [RECOVERED] RESULT::parse (0xcd36a8): index_id / is_duplicate /
        // inst_id are read with strtod (numbers), reward.ref_id with
        // from_json<std::string>, reward.qty with strtod.
        index_id: index,
        // Local owned-reference projection, including earlier draws this call.
        is_duplicate: duplicate ? 1 : 0,
        inst_id: instId,
        reward: { ref_id: instance.ref_id, qty: 1 },
      };
    });
    if (granted > 0) {
      game.recruited_cards.push(...instances);
      game.card_book = mergeCardBook(game.card_book, instances);
      game.next_card_inst_id += granted;
      this.persist();
    }

    return this.envelope({
      cnt: card.length,
      // ReqGachaPremiumCB branches on cnt: single parses WHOLE card JSON;
      // multi iterates an array; zero must be null to skip the single parser.
      card: card.length === 0 ? null : card.length === 1 ? card[0] : card,
      user: {
        iap_qty: game.gacha_iap_qty,
        free_iap_qty: game.gacha_free_qty,
        gold: { cur: game.gold },
      },
      // Not read by the client: a purely local breadcrumb so a tester reading
      // the wire can tell a refusal from a success without counting the array.
      ...(affordable ? {} : { error_code: price === null ? "GACHA_COUNT_UNRECONSTRUCTED"
        : !recruitReference ? "GACHA_REFERENCE_UNKNOWN" : "GACHA_FUND_SHORT", cost, granted: 0 }),
    });
  }

  pieceExchange(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    assertOwnedCardCompatibility(game);
    const result = exchangeHunterTraces(payload, game, () => this.persist());
    return "error" in result ? this.failure(result.code ?? 2001, result.error) : this.envelope(result.data);
  }

  arenaAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers), game = this.gameFor(account);
    const result = arenaRequest(route, payload, account.pvid, game, () => this.persist());
    return "error" in result ? this.failure(2001, result.error) : this.envelope(result.data);
  }

  searchAction(route: string, payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    // Search consumes its own capsule currency. Its idle reads and receipts
    // do not refresh AP/BP clocks or emit energy updates.
    const game = this.gameByPvid.get(account.pvid) ?? this.gameFor(account);
    if (route === "/abyss/GetHelperList") return this.envelope(usedSearchHelpers(game));
    const result = searchBattleRequest(route, payload, game, () => this.persist());
    return "error" in result ? this.failure(2001, result.error) : this.envelope(result.data);
  }

  startMission(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameFor(account);
    const requestedStageId = String(payload.stage_id ?? payload.stage ?? payload.id ?? "");
    if (game.arena.active) return this.failure(2001, "a Fight Club battle is active");
    if (game.search.active) return this.failure(2001, "a Search battle is active");
    // The instrumented client currently sends an empty stage_id after the
    // reconstructed stage-map tap. Keep the local lifecycle deterministic
    // while the native request seam is still being repaired.
    const stageId = requestedStageId.length > 1 ? requestedStageId : "n_01_01";
    if (game.card_instance_namespace === 1) {
      const ownedIds = new Set([...game.starter_cards, ...game.recruited_cards].map((card) => card.inst_id));
      const provided = [1, 2, 3, 4].map((slot) => Number(payload[`deck_inst_id_${slot}`] ?? 0));
      if (provided.some((id) => !Number.isSafeInteger(id) || id < 0 || (id !== 0 && !ownedIds.has(id))))
        return this.envelope({ accepted: false, stage_id: stageId, error_code: "DECK_NOT_OWNED" }, { result_code: 2001, code: 2001 });
    }
    const existingBattle = game.active_battle;
    const now = Date.now();
    const windowMs = missionStartIdempotencyMs();
    // Replay the existing battle only if it is BOTH for THIS stage AND recent
    // enough to plausibly be the same attempt.
    //
    // History, both stages of the bug this replaced:
    //  1. The original guard had no age test at all. Because `/mission/Complete`
    //     is never reached in a device run (the client dies in the battle
    //     scene first), an `active_battle` persisted by one early run stayed
    //     `active` forever, and every later start of the same stage replayed
    //     it. `/mission/Start` therefore answered `idempotent: true` with one
    //     battle_id for six consecutive device reports (report-010 through
    //     report-015), so every comparison in that stretch was measured
    //     against a stale, replayed response rather than a fresh one.
    //  2. An earlier revision rejected instead of replaying any active battle
    //     for a DIFFERENT stage. A stored battle with an empty stage_id - a
    //     leftover from runs where the client could not resolve a node and
    //     sent `stage_id: ""` - took that branch on every later request, so
    //     the battle could never start at all.
    //
    // So: a fresh attempt minutes later is a new battle (new battle_id, one
    // AP charged, the stale battle discarded - abandoned attempts are not
    // refunded without a matching loss completion), while a
    // duplicate tap or a transport retry within the window replays the same
    // battle and does not charge AP twice.
    if (existingBattle?.state === "active" && existingBattle.stage_id === stageId &&
        battleIsWithinWindow(existingBattle, windowMs, now)) {
      return this.envelope({
        accepted: true,
        idempotent: true,
        stage_id: stageId,
        battle_id: existingBattle.battle_id,
        ap: game.ap,
        battle: existingBattle,
      });
    }
    // Native StageConfirm callback e8e670 gates admission ONLY on result_code.
    // accepted:false with code1 still writes MissionAutoPlayResult and enters scene4.
    // Failure2001 is local policy; Complete retains its distinct success-code refusals.
    if (game.ap < 1) return this.envelope({ accepted: false, stage_id: stageId, error_code: "AP_EMPTY" }, { result_code: 2001, code: 2001 });
    const apRefundCap = Math.max(game.max_ap, game.ap);
    if (game.ap >= game.max_ap) game.ap_updated_at = now;
    game.ap -= 1;
    game.active_stage_id = stageId;
    // Random suffix as well as the timestamp: two fresh starts for one account
    // can land in the same millisecond (a fast test, or a client that retries
    // after the window has already elapsed), and the timestamp alone would
    // then hand out a duplicate battle_id.
    const battleId = `local-${account.pvid}-${now}-${crypto.randomBytes(4).toString("hex")}`;
    const deckInstIds = [1, 2, 3, 4]
      .map((slot) => Number(payload[`deck_inst_id_${slot}`] ?? 0))
      .filter((id) => Number.isSafeInteger(id) && id > 0);
    game.active_battle = {
      battle_id: battleId,
      stage_id: stageId,
      state: "active",
      started_at: now,
      completed_at: 0,
      deck_inst_ids: deckInstIds.length > 0 ? deckInstIds : (game.decks.find((deck) => deck.type === 1)?.list.filter((id) => id > 0) ?? [game.leader_inst_id]),
      enemy_count: 1,
      result: 0,
      stars: 0,
      ap_spent: 1,
      ap_refund_cap: apRefundCap,
    };
    const missionId = `local-${stageId}`;
    const mission = game.missions.find((item) => item.id === missionId);
    if (mission) {
      mission.state = 1;
      mission.progress = Math.min(mission.progress, mission.target);
    } else {
      game.missions.push({ id: missionId, stage_id: stageId, state: 1, progress: 0, target: 1, reward_gold: 10 });
    }
    this.persist();
    return this.envelope({
      accepted: true,
      stage_id: stageId,
      battle_id: battleId,
      ap: game.ap,
      battle: game.active_battle,
      mission_id: missionId,
    });
  }

  /** Diagnostic-only immutable projection; no gameFor/refresh/lazy creation. */
  campaignTraceContext(payload: Record<string, unknown>, headers: Record<string, string>): CampaignTraceContext {
    const account = this.resolveAccount(payload, headers);
    const game = this.gameByPvid.get(account.pvid);
    const battle = game?.active_battle;
    return { pvid: account.pvid, areaClaimCount: game?.claimed_area_rewards.length ?? 0,
      reservation: battle ? { battle_id: battle.battle_id, stage_id: battle.stage_id, state: battle.state,
        deck_inst_ids: [...battle.deck_inst_ids] } : undefined };
  }

  /**
   * `/mission/Complete` - shaped from `CSRSyncMStage::ReqCompleteCB` (0xb426ac).
   *
   * **[RECOVERED]** envelope: `result_code` MUST be 1 for every outcome, including
   * a defeat. `native-mission-complete.txt:1133-1151` is
   *
   *   if (CPVHTTPResponse::GetResultCode() != 1) {
   *       if (CSRSceneMgr::VertifyResultCode(code) != 0) goto fail;
   *       if (CPVHTTPRequest::GetRetryCnt() > 8) { invoke cb(code); return; }
   *       re-issue the request; return;
   *   }
   *
   * so any other code makes the client retry SILENTLY eight times and then invoke
   * the completion callback with a failure, parsing nothing. `CSRMStage::OnFinish`
   * (0xb35ce4) has a dedicated LOSE branch (lambda `$_5`, `local_34 = '\0'`) that
   * calls the same `RequestComplete`, so a loss arrives here too
   * (analysis/research/battle-completion.md §3.4, §5.2). `envelope()` is therefore
   * used unconditionally here and never `failure()`; a loss is expressed by the
   * payload (`achieve: []`, `user.gold.prev == user.gold.cur`), never by the code.
   *
   * **[RECOVERED]** `stage_id` is converted with an UNGUARDED `from_json<string_t>`
   * (L1332-1338), so it must be present as a string. It is the key every
   * progression write is made against: `GetStageAchieveCnt`, `SetStageAchieve`,
   * `IsMainStreamPopup` and the `star_action` marker.
   *
   * **[RECOVERED]** `achieve` is an ARRAY of `{order:int}` (L1808-1897); each entry
   * becomes `SetStageAchieve(stage_id, order)` plus a local `bool[order] = 1`
   * (L1873). It is the ONLY progression write in the callback - no `SetStageID`
   * exists here, the current-stage pointer comes from `/lobby/GetMissionInst`.
   *
   * **[RECOVERED]** `card` is an OBJECT keyed by `to_string(<uint64 card serial>)`
   * (L1909/L1921) with `{prev,cur}` values feeding `CSRInventory::SetCardExp`;
   * `item` is an ARRAY of `{inst_id, added, ref_id}` feeding
   * `CSRInventory::AddItem` (L2249-2415).
   *
   * `detect` and `achievement` are OMITTED, and that omission is load-bearing:
   * every optional-key guard in this callback is an IS-NULL test, not an
   * emptiness test (see the `isNullish` note in `tests/mission-complete.ts`).
   *   - a present `detect` (`{}` included) skips the `user.ap`/`user.bp` resync
   *     entirely (L2603-2817), so the AP spent at `/mission/Start` would never
   *     come back;
   *   - a present `achievement` (`[]` included) calls
   *     `CSRAchieve::ParseAchievementsElement` (0x8481c4), which is a
   *     `/dailyquest/GetInstList` REQUEST builder, from inside a response callback.
   *
   * **[FIXTURE]** economy: 10 gold and 30 exp for a first clear, and a 3-star
   * clear (safe indices0..2). None of these numbers is recovered; the star *mechanism*
   * is recovered, the star *count* is a guess. `order` is deliberately clamped to
   * the recovered0..2 flag range because the client writes `bool[order] = 1` on its own
   * stack, so a large value would be an out-of-bounds write rather than just wrong
   * data. user.exp.level follows the native getter's threshold count; the
   * result level-up flag can now reflect an actual published threshold crossing.
   */
  completeMission(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    const game = this.gameFor(account);
    const requestedStageId = String(payload.stage_id ?? payload.stage ?? game.active_stage_id ?? "");
    const stageId = requestedStageId.length > 1 ? requestedStageId : (game.active_stage_id || "n_01_01");
    const battleId = String(payload.battle_id ?? game.active_battle?.battle_id ?? "");
    // A rejected completion is still answered 1 - see the envelope note above.
    // Native requests have no battle_id; their identity falls back to the
    // server snapshot. Still reject a late completion for another stage.
    const active = game.active_battle?.state === "active" ? game.active_battle : null;
    const wrongStage = active && active.stage_id !== stageId;
    if (!active || wrongStage || (battleId && battleId !== active.battle_id)) {
      return this.envelope({
        clear: playInfoClearFlag(payload.play_info),
        accepted: false, stage_id: stageId, battle_id: battleId,
        error_code: wrongStage ? "ACTIVE_STAGE_MISMATCH" : "BATTLE_NOT_FOUND",
        achieve: [], item: [], card: {}, consumed_inst_list: [],
        user: { gold: { prev: game.gold, cur: game.gold }, exp: { prev: game.exp, cur: game.exp,
          level: { prev: teamLevel(game.exp), cur: teamLevel(game.exp) }, max_ap: { prev: game.max_ap, cur: game.max_ap } },
          max_ap: { prev: game.max_ap, cur: game.max_ap }, ap: { prev: game.ap, cur: game.ap },
          ap_charge_time: resourceChargeTime(game, "ap"), bp: { prev: game.bp, cur: game.bp },
          bp_charge_time: resourceChargeTime(game, "bp") },
        max_ap: { prev: game.max_ap, cur: game.max_ap }, level: { prev: teamLevel(game.exp), cur: teamLevel(game.exp) },
        reward: { gold: 0, items: [] }, gold: game.gold, ap: game.ap, exp: game.exp,
        stars: 0, win: 0, result: 0, mission: null,
      });
    }
    // **[RECOVERED]** `play_info` is one of the 8 form fields of `RequestComplete`
    // (0xb3aba8) and carries a JSON STRING of `CSRGameBase::MISSIONPLAY_INFO`.
    // `clear` (struct +0x28) is the client's own win byte: `CSRMStage::OnFinish`
    // stores `param_1` into it, and `param_1` is `left.remain != 0`
    // (battle-completion.md §3.3). It is the first real combat telemetry the
    // replica receives.
    const cleared = playInfoClearFlag(payload.play_info) === 1;
    // Original final HELP_DATA CONTENTS2_3: defeat/forfeit consumes no fuel.
    // Refund only the charge recorded by this matching active attempt. Removing
    // active_battle below makes repeated Complete incapable of refunding twice.
    // Legacy saves without a known charge receive no inferred credit.
    const apBeforeCompletion = game.ap;
    if (!cleared && active && (active.ap_spent ?? 0) > 0) {
      game.ap = Math.min(Math.max(game.max_ap, game.ap, active.ap_refund_cap ?? 0), game.ap + active.ap_spent!);
      if (game.ap >= game.max_ap) game.ap_updated_at = Date.now();
    }
    // Recovered map of absolute EXP pairs, not nested card records. Local
    // policy grants advertised character_exp on each new matching battle win.
    // Bind to snapshotted participants, never an edited lobby formation.
    const cardExp: Record<string, { prev: number; cur: number }> = {};
    const hunterReward = starterStages.stage.find((stage) => stage.id === stageId)?.character_exp ?? 0;
    if (cleared && active && Number.isSafeInteger(hunterReward) && hunterReward > 0) {
      const owned = [...game.starter_cards, ...game.recruited_cards];
      for (const id of [...new Set(active.deck_inst_ids.filter((id) => id > 0))].slice(0, 4)) {
        const card = owned.find((entry) => entry.inst_id === id);
        if (!card || Number(card.awk_step) !== 0) continue;
        const curve = trainingCurve(card);
        if (!curve) continue; // unknown curves stay untouched
        const previous = Number(card.exp);
        const current = Math.max(previous, Math.min(curve.maxExp, previous + hunterReward));
        card.exp = current;
        cardExp[String(id)] = { prev: previous, cur: current };
      }
    }
    const alreadyCleared = game.cleared_stage_ids.includes(stageId);
    // **[POLICY DECISION]** Exactly once per stage clear, as documented on the
    // route. The previous expression (`alreadyCleared && !game.active_battle`)
    // also paid out whenever an active battle existed for ANY stage, so
    // clearing N002 and then posting a completion for N002 while N003 was
    // active paid the 10 gold a second time. `alreadyCleared` alone is the
    // invariant; the presence of a battle must not re-open it.
    //
    // Extended 2026-10-03 with `cleared`: a defeat pays nothing and does NOT
    // consume the stage's first clear, so losing and then winning the same stage
    // still pays exactly once. Before this, a defeat was indistinguishable from a
    // win and paid out.
    const firstClear = cleared && !alreadyCleared;
    // Native guide confirms capsules come from general stages. Amount/rate is
    // local policy; require a real matching attempt, never a bootstrap or
    // standalone/repeated Complete. Search does not award campaign drops.
    const acceptedNormalVictory = explicitSearchCapsuleVictory(payload.play_info) && !!active && /^n_\d+_\d+$/.test(stageId) &&
      starterStages.stage.some((row) => row.id === stageId);
    const itemDrops = acceptedNormalVictory ? earnSearchCapsule(game) : [];
    const rewardGold = firstClear ? FIXTURE_STAGE_CLEAR_GOLD : 0;
    const rewardExp = firstClear ? FIXTURE_STAGE_CLEAR_EXP : 0;
    const now = Date.now();
    const previousOrders = earnedStageOrders(game, stageId);
    if (firstClear && itemDrops.length) recordVictoryNotice(game.mail, stageId, now);
    if (firstClear && acceptedNormalVictory) earnSpecialSupply(game.special_supply, stageId);
    if (firstClear) game.cleared_stage_ids.push(stageId);
    // **[RECOVERED]** `achieve[].order` is written through
    // `CSRPlayData::SetStageAchieve(stage_id, order)` (L1808-1897) into the
    // `std::map<std::string, STAGE_INFO>` at `CSRPlayData+0x27c`, which
    // `GetStageAchieveCnt(stage_id)` reads - and the SUM of that over an area's
    // stage links is the expedition-map progress total the chest thresholds are
    // compared against (`CSRSceneMStageMap::OnInit` 0xe912ac `:328-337`,
    // `ShowReward` `:3218`). So the server has to keep the same count the
    // client keeps, or the chests can never move: that is the difference between
    // `N` reaching `2S` and `3S` and being frozen forever.
    const achievedOrders = cleared ? completionOrders(payload.play_info) : [];
    const newOrders = achievedOrders.filter((order) => !previousOrders.includes(order));
    if (cleared) {
      game.stage_achievements[stageId] = [...new Set([...previousOrders, ...achievedOrders])].sort();
      game.stage_stars[stageId] = game.stage_achievements[stageId].length;
    }
    game.active_stage_id = "";
    const goldBefore = game.gold;
    const expBefore = game.exp;
    game.gold += rewardGold;
    game.exp += rewardExp;
    const mission = game.missions.find((item) => item.stage_id === stageId);
    if (mission && cleared) {
      mission.state = 2;
      mission.progress = mission.target;
    }
    if (game.active_battle && game.active_battle.stage_id === stageId) {
      game.active_battle.state = "completed";
      game.active_battle.completed_at = now;
      game.active_battle.result = cleared ? 1 : 0;
      game.active_battle.stars = newOrders.length;
    }
    const completedBattle = game.active_battle?.stage_id === stageId ? game.active_battle : null;
    game.active_battle = null;
    this.persist();
    // `achieve` carries the stars this completion granted: a first clear grants
    // indices0..2; replays may earn previously missing flags (battle-lifecycle.md
    // §5.4: answer 1 and report `prev == cur` so the second run's map state is
    // identical to the first).
    const achieve = newOrders.map((order) => ({ order }));
    return this.envelope({
      // [RECOVERED] string, unguarded `from_json<string_t>` (L1332-1338).
      stage_id: stageId,
      // [RECOVERED] ARRAY of {order} -> CSRPlayData::SetStageAchieve (L1808-1897).
      achieve,
      // [RECOVERED] object of {prev,cur} pairs (L1351-1796 and again L2606-2767).
      // `prev` is the pre-clear snapshot and `cur` the post-clear value; the
      // client only ever stores `cur`, so prev == cur - delta is exact.
      user: {
        gold: { prev: goldBefore, cur: game.gold },
        exp: { prev: expBefore, cur: game.exp, level: { prev: teamLevel(expBefore), cur: teamLevel(game.exp) },
          max_ap: { prev: game.max_ap, cur: game.max_ap } },
        max_ap: { prev: game.max_ap, cur: game.max_ap },
        ap: { prev: apBeforeCompletion, cur: game.ap },
        ap_charge_time: resourceChargeTime(game, "ap"),
        bp: { prev: game.bp, cur: game.bp },
        bp_charge_time: resourceChargeTime(game, "bp"),
      },
      // Legacy root aliases retained, using actual derived values. Correct
      // native parents are user.exp.level and user.exp.max_ap (r5 retains the
      // EXP JSON at b429c0, reused at b42aae/b42bfe).
      max_ap: { prev: game.max_ap, cur: game.max_ap },
      level: { prev: teamLevel(expBefore), cur: teamLevel(game.exp) },
      // [RECOVERED] ARRAY of {inst_id, added, ref_id} -> CSRInventory::AddItem.
      // AddItem(inst_id, ref_id, added) increments the native quantity. Its
      // original ELF signature and helper confirm the additive final argument.
      item: itemDrops,
      // [RECOVERED] OBJECT keyed by the decimal card serial -> SetCardExp.
      // Each value is DIRECT {prev,cur}; SetCardExp recalculates native level.
      card: cardExp,
      // [RECOVERED key, shape UNKNOWN] Read unconditionally by
      // `CSRInventory::UseItem` (L1313-1316); `[]` is the no-op that cannot crash.
      consumed_inst_list: [],
      // `detect`, `achievement` and `scenario` are OMITTED on purpose - see the
      // method note. `scenario` in particular: a present (even empty) string
      // takes the `AddScenario` branch and sets result flag bit 1 (L2450-2472),
      // which is the bit the result screen reads as "show a cutscene/level-up".
      //
      // The block below is INERT LOCAL DIAGNOSTIC DATA. `ReqCompleteCB` never
      // reads `result`, `win`, `stars`, `reward`, `mission`, `gold` or `ap`; the
      // client derives the star rating from `achieve[].order` and reads the
      // counters from `user.*`. They are kept because the local model, the
      // OpenAPI contract and the tests speak them - do not read them as the
      // native contract.
      accepted: true,
      clear: cleared ? 1 : 0,
      battle_id: completedBattle?.battle_id ?? battleId,
      result: cleared ? 1 : 0,
      win: cleared ? 1 : 0,
      stars: completedBattle?.stars ?? newOrders.length,
      reward: { gold: rewardGold, items: itemDrops },
      mission: mission ?? null,
      gold: game.gold,
      ap: game.ap,
      exp: game.exp,
    });
  }

  accountSnapshot(account: Account): Record<string, unknown> {
    const game = this.gameFor(account);
    return {
      pvid: account.pvid,
      nickname: account.nickname,
      nick_name: account.nickname,
      // ParseLoginResult returns immediately on an empty OTP, before it
      // assigns server_url to the host used for all game/reference requests.
      otp: account.otp,
      nickname_confirm: 1,
      profile_status: 0,
      login_day_count: 0,
      level: 30,
      iap_quantity: game.gacha_iap_qty,
      action_benefit_quantity: game.gacha_free_qty,
      iap_buy_cnt: 0,
      iap_code: "",
      begin_utc: account.beginUtc,
      server_id: account.serverId,
      srv_id: account.serverId,
      server_url: this.baseUrl,
      vs_token: account.vsToken,
      sns_list: account.snsList,
      url_list: [
        { url_key: "Main", address: this.baseUrl, param_format: "" },
        { url_key: "auth", address: this.baseUrl, param_format: "" },
        { url_key: "sns_list", address: this.baseUrl, param_format: "" },
        { url_key: "cdn", address: this.baseUrl, param_format: "" },
        { url_key: "resource", address: this.baseUrl, param_format: "" },
        ...this.chatUrls(),
      ],
      // Compatibility aliases retained for the launcher/account wrappers.
      token: account.vsToken,
      web_token: account.webToken,
      sns_id: account.snsId,
      extra_data: account.extraData,
      email: account.email,
    };
  }

  baseInfo(): BaseInfo {
    // The native launcher maps the server state into PV_LAUNCHER_RESULT;
    // state=1 selects its maintenance-WebView branch, while state=2 is the
    // normal online server path. Keep this configurable for reproduction.
    const launcherState = Number(process.env.BLUSTONE_LAUNCHER_STATE ?? 2);
    const server = {
      // Native CPVDataMgr::ParseAppServerList reads srv_id/state.
      srv_id: 1,
      server_id: 1,
      id: 1,
      name: "Blustone Replica",
      server_name: "Blustone Replica",
      desc: "Blustone Replica",
      address: this.baseUrl,
      server_url: this.baseUrl,
      state: launcherState,
      population: 0,
    };
    return {
      pv_url: process.env.BLUSTONE_PV_URL ?? this.baseUrl,
      country_code: "US",
      url_list: [
        // The native launcher passes app_code="_SR" to GetBaseInfo and
        // ReqLaunchResCB rejects the response if this reference is absent.
        { url_key: "_SR", address: this.baseUrl, param_format: "" },
        // ReqLaunchResCB also resolves these built-in launcher destinations;
        // omitting them makes the client fall back to the retired production
        // maintenance page after lobby bootstrap.
        //
        // The ad keys must point at a BODYLESS endpoint, not at the HTML
        // handoff page. The launcher hands `ad_unit_id_1` to the Google Ads SDK
        // as the ad unit; pointing it at an HTML document makes the SDK fail
        // ("Error building request URL") and leaves the launch sequence waiting
        // on an ad result that never arrives, so the client stalls on the title
        // screen before it ever issues /v2/account/RegisterGuest. A 204 lets the
        // SDK fail fast and the launcher continue. The human-readable handoff
        // page stays reachable under its own `maintenance` key.
        { url_key: "ad_unit_id_1", address: this.baseUrl + "/ad_unit_id_1", param_format: "" },
        { url_key: "d_unit_id_1", address: this.baseUrl + "/d_unit_id_1", param_format: "" },
        { url_key: "maintenance", address: this.baseUrl + "/maintenance-replica-online", param_format: "" },
        { url_key: "api", address: this.baseUrl, param_format: "" },
        { url_key: "cdn", address: this.baseUrl, param_format: "" },
        // The working community private server (see
        // recovered-assets/community-notes-2026-09-30) advertises exactly these
        // five keys in both the launcher and the login response. CPVDataMgr
        // resolves a URL by url_key, and the binary carries the failure string
        // "cannot find cdn url" - so a key the client looks up but we do not
        // advertise leaves it with no address and no request.
        //
        // We were advertising only `api` and `cdn`, so `Main`, `auth`,
        // `sns_list` and especially `resource` were all missing. `resource` is
        // the CDN base used to build /<name>_<stamp>.pkg URLs. Add all five;
        // the original keys stay so nothing already working regresses.
        { url_key: "Main", address: this.baseUrl, param_format: "" },
        { url_key: "auth", address: this.baseUrl, param_format: "" },
        { url_key: "sns_list", address: this.baseUrl, param_format: "" },
        { url_key: "resource", address: this.baseUrl, param_format: "" },
        ...this.chatUrls(),
      ],
      // The native client persists pvid, sns_list and vs_token in cloud/v2pv.acct
      // and calls /v2/account/Login on relaunch. The local server now supports
      // that path; set BLUSTONE_AUTO_LOGIN=0 only when explicitly testing the
      // manual title/login UI.
      auto_login: process.env.BLUSTONE_AUTO_LOGIN === "0" ? 0 : 1,
      client_option: {},
      hash_tag: {},
      app_srv_list: [server],
      app_srv_name_list: [
        { srv_id: 1, lang: "en", name: "Blustone Replica", desc: "Blustone Replica" },
      ],
      state: launcherState,
      recommend_server: 1,
      server_url: this.baseUrl,
      res_ver: this.resourceVersion,
      new_res_ver: this.resourceVersion,
      // Tutorial completion is advertised here, before the client has an
      // account, because the title scene and the area-selection scene are both
      // gated on it: CSRPopUpTitle::ProcessTutorial reads GetState(0,5) and
      // CSRSceneAreaSel::OnReset reads GetState(1,3), and a replica that does
      // not implement the tutorial battles can never make the client clear them
      // itself. Without this the client parks on the title scene (blue sky,
      // white clouds, TITLE_ANI.mp4) and never reaches stage selection.
      // Set BLUSTONE_TUTORIAL_COMPLETE=0 to send the raw fixture instead.
      tuto: this.tutorialState(),
    };
  }

  registerGuest(payload: Record<string, unknown>, headers: Record<string, string>) {
    const boundPvid = this.sessionPvid(headers);
    let account = boundPvid > 0 ? this.accountsByPvid.get(boundPvid) : undefined;
    if (account && !account.isGuest) return this.failure(2001, "transport session already belongs to a registered account");

    const requestedDeviceId = String(
      payload.device_id ?? payload.deviceId ?? headers["x-device-id"] ?? (isRecord(payload.extra_data) ? payload.extra_data.device_id : "") ?? "",
    ).trim();
    const deviceId = requestedDeviceId || `guest-${crypto.randomBytes(10).toString("hex")}`;
    if (!account) account = this.accountsByDevice.get(deviceId);
    if (!account) account = this.createAccount(deviceId, payload, true);
    if (!account.isGuest) return this.failure(2001, "device is already linked to a registered account");

    this.replaceOtp(account);
    account.lastLoginAt = Math.floor(Date.now() / 1000);
    this.bindTransportSession(headers, account.pvid);
    this.persist();
    return this.accountResponse(account);
  }

  login(payload: Record<string, unknown>, headers: Record<string, string>) {
    const requestedEmail = normalizeEmail(String(payload.email ?? payload.email_address ?? ""));
    const requestedPvid = this.pvidFromPayload(payload);
    const requestedOtp = String(payload.otp ?? "");
    const emailAccount = requestedEmail ? this.accountsByEmail.get(requestedEmail) : undefined;
    const pvidAccount = requestedPvid ? this.accountsByPvid.get(requestedPvid) : undefined;
    const otpAccount = requestedOtp ? this.accountsByToken.get(requestedOtp) : undefined;

    if (requestedEmail && requestedPvid && (!emailAccount || !pvidAccount || emailAccount.pvid !== pvidAccount.pvid)) {
      return this.failure(2001, "pvid and email do not identify the same account");
    }
    const account = emailAccount ?? pvidAccount ?? otpAccount;
    if (!account) return this.failure(2001, "account does not exist");
    if (otpAccount && otpAccount.pvid !== account.pvid) return this.failure(2001, "otp does not match account");

    const boundPvid = this.sessionPvid(headers);
    if (boundPvid > 0 && boundPvid !== account.pvid) return this.failure(2001, "transport session identity mismatch");

    const requestedVSToken = String(payload.vs_token ?? payload.vsToken ?? "");
    // Guests have no recoverable identity credential in the official client;
    // pvid-only guest resume is valid. Registered accounts always require the
    // exact persistent token returned by the WebView/SNS login.
    if (!account.isGuest && (!requestedVSToken || !constantTimeEqual(account.vsToken, requestedVSToken))) {
      return this.failure(2001, requestedVSToken ? "vs_token mismatch" : "missing vs_token");
    }

    this.replaceOtp(account);
    account.lastLoginAt = Math.floor(Date.now() / 1000);
    if (payload.sns_id) account.snsId = String(payload.sns_id);
    if (requestedEmail && !account.email) {
      account.email = requestedEmail;
      account.isGuest = false;
      account.snsList = { "0": requestedEmail };
      this.accountsByEmail.set(requestedEmail, account);
    }
    this.bindTransportSession(headers, account.pvid);
    this.persist();
    return this.accountResponse(account);
  }

  webLogin(payload: Record<string, unknown>, headers: Record<string, string>) {
    const email = normalizeEmail(String(payload.email ?? payload.email_address ?? ""));
    const password = String(payload.password ?? payload.passwd ?? payload.pw ?? "");
    if (!email || !password) return this.failure(2001, "email and password are required");

    let account = this.accountsByEmail.get(email);
    if (!account) {
      account = this.createAccount(`email:${email}`, { ...payload, email }, false);
      account.passwordHash = hashPassword(password);
      account.email = email;
      account.isGuest = false;
      account.snsList = { "0": email };
      this.accountsByEmail.set(email, account);
    } else if (account.passwordHash && !verifyPassword(password, account.passwordHash)) {
      return this.failure(2001, "invalid email or password");
    } else if (!account.passwordHash) {
      account.passwordHash = hashPassword(password);
    }

    this.replaceOtp(account);
    account.lastLoginAt = Math.floor(Date.now() / 1000);
    this.bindTransportSession(headers, account.pvid);
    this.persist();
    return this.accountResponse(account);
  }

  confirmNickname(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    if (payload.nick_name || payload.nickname) account.nickname = String(payload.nick_name ?? payload.nickname);
    this.persist();
    return this.envelope(this.accountSnapshot(account), { nickname: account.nickname });
  }

  registerPushToken(payload: Record<string, unknown>, headers: Record<string, string>) {
    const account = this.accountFor(payload, headers);
    account.pushToken = String(payload.push_token ?? payload.token ?? "");
    this.persist();
    return this.envelope({ registered: true, pvid: account.pvid });
  }

  exchangeSecret(payload: Record<string, unknown>) {
    const encodedClientKey = String(payload.publicKey ?? payload.public_key ?? "");
    if (!encodedClientKey) throw new Error("shared-secret exchange requires publicKey");

    const clientPublicKey = crypto.createPublicKey({
      key: Buffer.from(encodedClientKey, "base64url"),
      format: "der",
      type: "spki",
    });
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "secp384r1" });
    const sharedSecret = crypto.diffieHellman({ privateKey, publicKey: clientPublicKey });
    const derivedKey = crypto.createHash("sha384").update(sharedSecret).digest();
    const responseBody = Buffer.from(publicKey.export({ format: "der", type: "spki" }));
    const accessToken = `local-${crypto.randomBytes(24).toString("base64url")}`;
    const signature = crypto.createHmac("sha384", derivedKey).update(responseBody).digest("base64");
    this.sharedSecretsByAccessToken.set(accessToken, derivedKey);
    this.sessionPvidByAccessToken.set(accessToken, 0);
    this.persist();
    return { body: responseBody, accessToken, signature };
  }

  decryptSecureBody(accessToken: string, body: Buffer): Buffer {
    const derivedKey = this.sharedSecretsByAccessToken.get(accessToken);
    if (!derivedKey) throw new Error("unknown shared-secret access token");
    const decipher = crypto.createDecipheriv("aes-256-cbc", derivedKey.subarray(0, 32), derivedKey.subarray(32, 48));
    return Buffer.concat([decipher.update(body), decipher.final()]);
  }

  /** Native Chat upgrades use X-PV-AccessToken from the HTTP exchange. Only an
   * already authenticated/bound account may obtain its crypto context. This is
   * read-only local admission; it creates no key, account, room or Guild claim.
   * The caller must perform room/membership authorization separately. */
  chatCryptoFor(headers:Record<string,string>) {
    const accessToken=headers["x-pv-accesstoken"];
    const pvid=accessToken?this.sessionPvidByAccessToken.get(accessToken):undefined;
    const account=pvid?this.accountsByPvid.get(pvid):undefined;
    if(!accessToken || !this.sharedSecretsByAccessToken.has(accessToken) || !account)
      throw new NativeAuthError(2001,"Chat requires an existing bound transport account");
    const owner=account.pvid,serverId=account.serverId;
    const verify=()=>{
      if(!this.sharedSecretsByAccessToken.has(accessToken) || this.sessionPvidByAccessToken.get(accessToken)!==owner ||
        this.accountsByPvid.get(owner)?.serverId!==serverId)
        throw new NativeAuthError(2001,"Chat transport account is no longer established");
    };
    return Object.freeze({pvid:owner,serverId,
      encrypt:(body:Buffer)=>{verify();return this.encryptSecureBody(accessToken,body).body;},
      decrypt:(body:Buffer)=>{verify();return this.decryptSecureBody(accessToken,body);}});
  }

  guildChatEnabled() {return this.guildChatMode==="local-memory";}
  publicChatEnabled() {return this.publicChatMode==="local-memory";}

  chatPublicFor(headers:Record<string,string>) {
    if(!this.publicChatEnabled()) throw new NativeAuthError(2001,"Local public Chat is disabled");
    const crypto=this.chatCryptoFor(headers),account=this.accountsByPvid.get(crypto.pvid)!;
    if(typeof account.nickname!=="string" || Buffer.from(account.nickname,"utf8").toString("utf8")!==account.nickname)
      throw new NativeAuthError(2001,"Public Chat nickname is not valid UTF8");
    return Object.freeze({...crypto,nickname:account.nickname});
  }

  /** Read current joined membership at upgrade AND delivery time. Pending
   * applications/invitations and old socket subscriptions grant no Guild room. */
  chatGuildFor(headers:Record<string,string>) {
    if(!this.guildChatEnabled()) throw new NativeAuthError(2001,"Local Guild Chat is disabled");
    const crypto=this.chatCryptoFor(headers),account=this.accountsByPvid.get(crypto.pvid)!;
    const personal=this.guildPersonal(crypto.pvid).my_guild;
    if(personal.status!==3||personal.guild_id===0)
      throw new NativeAuthError(2001,"Guild Chat requires current joined membership");
    if(typeof account.nickname!=="string" || Buffer.from(account.nickname,"utf8").toString("utf8")!==account.nickname)
      throw new NativeAuthError(2001,"Guild Chat nickname is not valid UTF8");
    return Object.freeze({...crypto,guildId:personal.guild_id,nickname:account.nickname});
  }

  private chatUrls() {
    const endpoints=[...(this.guildChatEnabled()?[["guild_chat","/chat/guild"]]:[]),
      ...(this.publicChatEnabled()?[["new_chat","/chat/public"]]:[])];
    return endpoints.map(([url_key,pathname])=>{
      const address=new URL(pathname,this.baseUrl);
      if(address.protocol==="http:") address.protocol="ws:";
      else if(address.protocol==="https:") address.protocol="wss:";
      else throw new TypeError("Chat requires an HTTP(S) replica base URL");
      return {url_key,address:address.toString(),param_format:""};
    });
  }

  encryptSecureBody(accessToken: string, body: Buffer): { body: Buffer; signature: string } {
    const derivedKey = this.sharedSecretsByAccessToken.get(accessToken);
    if (!derivedKey) throw new Error("unknown shared-secret access token");
    const cipher = crypto.createCipheriv("aes-256-cbc", derivedKey.subarray(0, 32), derivedKey.subarray(32, 48));
    const encrypted = Buffer.concat([cipher.update(body), cipher.final()]);
    const signature = crypto.createHmac("sha384", derivedKey).update(body).digest("base64");
    return { body: encrypted, signature };
  }

  selectServer(payload: Record<string, unknown>) {
    if (payload.server_id !== undefined) this.selectedServer = Number(payload.server_id);
    this.persist();
    return this.envelope({}, { server_id: this.selectedServer });
  }

  summary() {
    return {
      accounts: this.accountsByDevice.size,
      game_states: this.gameByPvid.size,
      selected_server: this.selectedServer,
      resource_version: this.resourceVersion,
      crypto_mode: "p384-sha384-hmac",
      persistence: this.stateFile ? "local-file" : "memory",
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function randomCredential(): string {
  return `vs-${crypto.randomBytes(32).toString("base64")}`;
}

function generateOTP(): string {
  return `otp-${crypto.randomBytes(24).toString("base64url")}`;
}

function constantTimeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, String(item ?? "")]));
}

function normalizeStoredAccount(raw: Record<string, unknown>): Account {
  if (raw.socialBlocks !== undefined) {
    if (!isRecord(raw.socialBlocks)) throw new Error("Malformed social blocks; refusing to overwrite local state");
    socialBlockRows(raw.socialBlocks as SocialBlocks);
    if (Object.hasOwn(raw.socialBlocks, String(raw.pvid)))
      throw new Error("Persisted self block; refusing to overwrite local state");
  }
  const token = String(raw.token ?? "");
  const email = normalizeEmail(String(raw.email ?? ""));
  const vsToken = String(raw.vsToken ?? raw.vs_token ?? token);
  const otp = String(raw.otp ?? token);
  const rawSnsList = raw.snsList ?? raw.sns_list;
  const snsList = Object.keys(stringRecord(rawSnsList)).length > 0
    ? stringRecord(rawSnsList)
    : email ? { "0": email } : { "0": "" };
  return {
    pvid: Number(raw.pvid),
    deviceId: String(raw.deviceId),
    nickname: String(raw.nickname),
    token,
    webToken: String(raw.webToken),
    serverId: Number(raw.serverId),
    snsId: String(raw.snsId ?? ""),
    pushToken: String(raw.pushToken ?? ""),
    extraData: raw.extraData as Record<string, unknown>,
    email,
    isGuest: typeof raw.isGuest === "boolean" ? raw.isGuest : !email,
    vsToken,
    otp,
    snsList,
    beginUtc: Number.isSafeInteger(raw.beginUtc) ? Number(raw.beginUtc) : 0,
    lastLoginAt: Number.isSafeInteger(raw.lastLoginAt) ? Number(raw.lastLoginAt) : 0,
    passwordHash: String(raw.passwordHash ?? ""),
    ...(raw.socialBlocks === undefined ? {} : { socialBlocks: { ...raw.socialBlocks as SocialBlocks } }),
  };
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${digest}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [, salt, expected] = encoded.split("$");
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 32).toString("hex");
  return constantTimeEqual(actual, expected);
}
