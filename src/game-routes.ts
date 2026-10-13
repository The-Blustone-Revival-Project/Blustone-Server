import { FIXTURE_CARD_ID, LEGACY_WAVE_REF_ID, partyProfile, starterAreas, starterBookReference, starterLevels, starterMonsterTable, starterReference, starterStageMonstersByMonsterId, starterStageMonstersByStageId, starterStages, type StageMonsterRecord } from "./bootstrap.js";
import { ServerState } from "./state.js";
import { campaignReceiptProjection, recordCampaignReceipt } from "./campaign-receipt-trace.js";
import { RESOURCE_REFRESH_SECONDS } from "./game.js";
import { rankUpRows, trainingPrices } from "./training.js";
import { supplyReference } from "./supply.js";
import { itemReference } from "./hunter-traces.js";
import { arenaReference, arenaStageReference, arenaRival, ARENA_RIVAL_PVID } from "./arena.js";
import { hunterSearchReference } from "./hunter-search.js";
import { searchHelperReference } from "./search-helpers.js";
import { SEARCH_STAGE_ID, searchStageReference, searchStageMonsters } from "./search-stage.js";
import { LOCAL_MAIL_PORTRAIT_PATH, LOCAL_MAIL_SENDER } from "./mail.js";

/**
 * Requesting pvid, preferring the request payload.
 *
 * `ParseUserDatailInfo` reads `pvid` off the same object it reads the card
 * slots from, so the response must echo the pvid that was asked about. Falls
 * back to the authenticated account when the payload omits it.
 */
function profilePvid(state: ServerState, payload: Record<string, unknown>, headers: Record<string, string>): number {
  const fromPayload = Number(payload.pvid ?? 0);
  if (Number.isSafeInteger(fromPayload) && fromPayload > 0) return fromPayload;
  try {
    return state.accountFor(payload, headers).pvid;
  } catch {
    return 0;
  }
}

/**
 * The account nickname, for the profile routes.
 *
 * `nick_name`/`nickname` were previously the unsubstituted template
 * `"%user_name%"`. That token is a UI placeholder resolved by the localisation
 * layer, so shipping it as a stored name hands the client a literal percent
 * string. Falls back to the historical fixture when the request is not
 * authenticated, so an unauthenticated probe still gets a usable answer.
 */
function profileNickname(state: ServerState, payload: Record<string, unknown>, headers: Record<string, string>): string {
  try {
    return state.accountFor(payload, headers).nickname;
  } catch {
    return "Local";
  }
}

/**
 * One wave record for the stage-monster routes.
 *
 * **[RECOVERED]** the keys `CSRGameMob::AddStageMonster` (0xa0d194) reads, and -
 * the correction that matters - their NESTING. Instruction listing:
 * `analysis/ghidra-hasmonster-08-asm-addstagemonster-emplace.txt`.
 *
 *     00a0d1b0  ldr r1,[0x00a0d4f4] ; 00a0d1b8 add r1,pc -> 0x1d76bd5 'wave_list'
 *     00a0d1ce  bl 0x007930f8                       operator[](param_2, "wave_list")
 *     00a0d256  ... bl 0x0072af38                   OUTER loop  ==  (over wave_list)
 *     00a0d266  bl 0x0072aff0                       OUTER deref -> a WAVE
 *     00a0d2d8  ... bl 0x0072af38                   INNER loop  ==  (over the WAVE)
 *     00a0d2e8  bl 0x0072aff0                       INNER deref -> a MONSTER record
 *     00a0d304  bl 0x007930f8                       operator[](monster, "ref_id")
 *     00a0d310  bl 0x00728b08                       from_json<std::string>(ref_id)
 *     00a0d34a  bl 0x007930f8                       operator[](monster, "group")
 *     00a0d398  bl 0x007930f8                       operator[](monster,"next_spawn_ms")
 *     00a0d40c  strd r1,r2,[r0,#0xc]                -> the 20-byte STAGE_MONSTER
 *     00a0d410  adds r0,#0x14                       -> STAGE_MONSTER stride 0x14
 *     00a0d42c  ldr r0,[sp,#0x54] ; cmp #0x2 ; beq   INNER increment over the WAVE
 *     00a0d480  bl 0x00a0e4ac                       __push_back_slow_path<wave>
 *     00a0d4b6  ldr r0,[sp,#0x9c] ; cmp #0x2 ; beq   OUTER increment over wave_list
 *     00a0d512  bl 0x007930f8                       operator[](param_2,"show_thumbnail")
 *
 * The OUTER dereference (`0xa0d266`) is what the INNER loop iterates
 * (`0xa0d2d8`), and one `vector<STAGE_MONSTER>` is pushed per OUTER element
 * (`0xa0d480`) - so `wave_list` is **`vector<vector<STAGE_MONSTER>>` in JSON**:
 * an array of waves, each wave an array of monster records. This matches
 * `STAGE_MONSTER_LINK { vector<vector<STAGE_MONSTER>> waves; vector<string> ids }`
 * (node +0x1c / +0x28 in `GetStageMonsterLinkData`, 0xa0cf38).
 *
 * `BLUSTONE_WAVE_SHAPE=flat` restores the superseded flat array so the previous
 * behaviour stays reachable as a one-variable A/B (default `nested`).
 *
 * **`_id` is NOT read by `AddStageMonster`.** RETRACTION: the offline resolver
 * reports `ldr@0x00a0d1b0 slot=0x00a0d4f4 add_pc=0x00a0d1b8 -> '_id'`, but that
 * pairing is an artefact - the resolver's window swallowed `00a0d1aa ldr
 * r0,[0x00a0d4f0]` / `00a0d1b4 add r0,pc`, the `__stack_chk_guard` canary load,
 * which is a DIFFERENT slot. The load at `0xa0d1b0` is consumed only by
 * `00a0d1b8 add r1,pc`, giving `wave_list`. Decisive check: the body contains
 * exactly FIVE `bl 0x007930f8` (`basic_json::operator[]`) sites - 0xa0d1ce,
 * 0xa0d304, 0xa0d34a, 0xa0d398, 0xa0d512 - and no sixth. `_id` is published as
 * an inert alias of `wave_list`.
 *
 * **[RECOVERED] `show_thumbnail` is an array of non-empty monster-id STRINGS, at
 * RECORD level only.** `0xa0d512` is reached solely from the OUTER loop's exit
 * (`00a0d260 bne.w 0x00a0d50c`), i.e. after every wave has been consumed. The
 * type-tag switch at 0xa0d524/0xa0d52a opens an iteration window only for tag
 * `0x2` (array) and `0x1` (object); every other tag - including a number, which
 * is what the replica used to send - yields ZERO elements. Each element then goes
 * through `from_json<std::string>` (`bl 0x00728b08` at `0xa0d5ac`) into the
 * `vector<std::string>` that becomes `STAGE_MONSTER_LINK::ids`.
 *
 * `FUN_00b4a7a8` (0xb4a7a8, `CSRSyncMStage::RequestMonsterRef`'s completion
 * lambda) walks that `ids` vector FIRST and pushes every element with
 * `HasMonsterData() == 0` into the `list` of `GET /reference/GetMonster`
 * (analysis/ghidra-enemycamp-decomp-04.txt:52-92). **That `list` is the request.
 * `show_thumbnail` is where its elements come from.**
 *
 * `BLUSTONE_SHOW_THUMBNAIL=scalar` restores the old integer so the previous
 * behaviour stays reachable as a one-variable A/B (default `array`).
 *
 * **[RECOVERED] `ref_id` is a MONSTER id here, and that is load-bearing.**
 * `ref_id` is the first 12 bytes of the 20-byte `STAGE_MONSTER`
 * (`AddStageMonster` 0xa0d194, stride `0x14` at `0xa0d410`), and
 * `FUN_00b4a7a8` - the builder of `GET /reference/GetMonster`'s `list` - has a
 * SECOND loop over the wave vector, at inner stride `0x14`
 * (`00b4a864 adds r5,#0x14` ; `00b4a870 bl 0x00a0b428 HasMonsterData(r5)` ;
 * `00b4a886 bl 0x006d7efc` string copy), which appends that `ref_id` to the
 * SAME list head (`sp+0x24`) and counter (`sp+0x2c`) that its first loop - over
 * `STAGE_MONSTER_LINK::ids`, stride `0x0c`, i.e. our `show_thumbnail` - fills.
 * **`list` is therefore `ids` UNION {every wave `ref_id`}**
 * (analysis/research/ids-second-element.md sections 4-5, quoting
 * `analysis/ghidra-ids-01-asm-fun-b4a7a8.txt`).
 *
 * With `show_thumbnail: ["M001"]` and a card `ref_id`, the replica shipped the
 * exact request measured in analysis/testing/report-014.md section 2.2 -
 * `{"list":"[\"M001\",\"001\"]","pvid":"1000001"}` - and `"001"` is a card id
 * with no node in `m_mMonsters`, so `CSRGameMob::GetMonsterData` (0xa0b43c)
 * missed at `SRGameMob.cpp(38)` and the process faulted 31-45 ms later. The wave
 * `ref_id` is now the monster id, so no unresolvable id is requested and the
 * DISTINCT ids collapse to one.
 *
 * **Do NOT repair this by editing `show_thumbnail` or by publishing a monster
 * under `_server: "001"`.** The wave loop requests `ref_id` itself, so either
 * would leave the unresolvable id in the request and merely MOVE the assertion.
 *
 * **THE CARD-vs-MONSTER CONFLICT IS NOT SOLVED, only scoped.** `ref_id` also
 * reaches `CSRCard::SetRefID`, which wants a CARD id. The five
 * `SRCard.cpp(731)` assertions of AGENTS.md section 11 live in a different camp
 * map (`this+0x250`, the player deck from `CSRUserDB::GetDeck()`); the crash
 * site of this investigation is `this+0x264`, the enemy camp. This change
 * targets the enemy camp and must not be expected to clear `SetRefID`.
 *
 * `BLUSTONE_WAVE_REF_ID=card` restores the card `ref_id` and is the control leg
 * of the regression guard in `tests/smoke.ts`; it is expected to FAIL there.
 */
function stageMonsterEntry(record: StageMonsterRecord) {
  // **[RECOVERED] the nesting.** `record.wave_list` is already
  // `StageWave[][]`; it is passed through verbatim. Record-level `ref_id` /
  // `group` / `next_spawn_ms` are carried for continuity only: the four
  // `operator[]` sites in `AddStageMonster` all target a MONSTER record
  // (`r6` = the INNER deref at `0xa0d2e8`) except `show_thumbnail`, so nothing
  // reads them at record level.
  const first = record.wave_list[0]?.[0];
  return {
    _id: record.wave_list,
    wave_list: record.wave_list,
    ref_id: first?.ref_id ?? "",
    group: 1,
    next_spawn_ms: 0,
    show_thumbnail: record.show_thumbnail,
  };
}

/**
 * A/B shim for the WAVE ARRAY'S NESTING - the single variable this change
 * introduces on the element-shape axis.
 *
 * `BLUSTONE_WAVE_SHAPE=flat` collapses `[[monster], ...]` back to
 * `[monster, ...]`, which is byte-identical to the shape the replica served up to
 * 2026-10-02-2 and is the control leg for the regression test in
 * `tests/smoke.ts`. Default (`nested`, anything else) keeps the recovered shape.
 *
 * Applied through a `JSON.stringify` replacer for the same reason as
 * `applyThumbnailMode`: it rewrites `_id` and `wave_list` together and cannot
 * drift from them, and every value involved is already JSON-safe fixture data.
 * `show_thumbnail` is left alone because its elements are strings, so it can
 * never match the "array of arrays" test.
 */
function applyWaveShape<T>(record: T): T {
  if (process.env.BLUSTONE_WAVE_SHAPE !== "flat") return record;
  return JSON.parse(JSON.stringify(record, (_key, value) => {
    if (!Array.isArray(value) || value.length === 0) return value;
    if (!value.every((entry) => Array.isArray(entry))) return value;
    return value.flat();
  })) as T;
}

/**
 * A/B shim for `show_thumbnail`'s JSON **TYPE** - the single variable this change
 * introduces.
 *
 * `BLUSTONE_SHOW_THUMBNAIL=scalar` rewrites every `show_thumbnail` array in the
 * stage-monster response back to the historical integer `1`, which is exactly
 * the shape the replica served for report-001 .. report-011. Default (`array`,
 * anything else) leaves the recovered arrays alone.
 *
 * Applied to the whole response rather than per-branch so the `stage_id` control
 * leg and the `monster_id` leg are both reverted by the same flag, and so a
 * negative result can be attributed to this one field. Applied through a
 * `JSON.stringify` replacer because every value here is already JSON-safe
 * fixture data; the alternative is threading a `legacyScalar` flag through both
 * shaping functions and hoping every future branch remembers.
 */
function applyThumbnailMode<T>(record: T): T {
  if (process.env.BLUSTONE_SHOW_THUMBNAIL !== "scalar") return record;
  return JSON.parse(JSON.stringify(record, (_key, value) =>
    (Array.isArray(value) && _key === "show_thumbnail" ? 1 : value))) as T;
}

/**
 * A/B shim for the WAVE RECORD'S `ref_id` - the string `FUN_00b4a7a8`'s second
 * loop puts into `GET /reference/GetMonster`'s `list`.
 *
 * `BLUSTONE_WAVE_REF_ID=card` rewrites every `ref_id` on those two routes back
 * to `FIXTURE_CARD_ID` (`"001"`), which is byte-identical to what the replica
 * served from the wave_list fix until 2026-10-02-3 and is the value that
 * produced the measured `list=["M001","001"]`
 * (analysis/testing/report-014.md sections 2.2-2.3). Default (`monster`, any
 * other value) leaves `FIXTURE_WAVE_REF_ID`, the published monster id.
 *
 * Both the per-wave and the record-level `ref_id` are rewritten together, for
 * the same reason `applyWaveShape` rewrites `_id` and `wave_list` together: they
 * must not be able to drift, and one `JSON.stringify` replacer cannot miss one
 * of them. The record-level `ref_id` is [RECOVERED] inert (no `operator[]` site
 * in `AddStageMonster` targets it), so rewriting it is harmless - but leaving it
 * behind would be a lie about the response's internal consistency.
 *
 * This flag exists for ATTRIBUTION ONLY. `ref_id` must name a monster for the
 * enemy camp to resolve; `card` is the superseded behaviour and the regression
 * test in `tests/smoke.ts` is written to fail under it.
 */
function applyWaveRefIdMode<T>(record: T): T {
  if (process.env.BLUSTONE_WAVE_REF_ID !== "card") return record;
  return JSON.parse(JSON.stringify(record, (_key, value) =>
    (_key === "ref_id" ? LEGACY_WAVE_REF_ID : value))) as T;
}

/**
 * Response policy for recovered game routes.
 *
 * This module is intentionally the seam between the route registry and the
 * evolving compatibility model. A newly reconstructed native parser should
 * get a named branch here (or a dedicated handler), a schema/test, and an
 * evidence note before it replaces the generic fallback.
 */
export function gameResponse(state: ServerState, route: string, payload: Record<string, unknown>, headers: Record<string, string> = {}) {
  // Persistent local-game routes.
  if (route === "/lobby/Enter") return state.lobbyEnter(payload, headers);
  if (route === "/lobby/GetItemInven") return state.itemInventory(payload, headers);
  if (route === "/lobby/GetMissionInst") return state.missionInventory(payload, headers);
  if (route === "/lobby/GetGemInven") return state.gemInventory(payload, headers);
  if(route==="/reference/GetGem") return state.gemReferenceInventory(payload,headers);
  if (route === "/reference/GetGemCombinationEffect") return state.gemCombinationReference(payload,headers);
  if (route === "/reference/GetGemDisassemblePrice") return state.gemDisassembleReference(payload,headers);
  if (route === "/reference/GetGemSellPrice") return state.gemSellReference(payload,headers);
  if (route === "/reference/GetGemLevelUpPrice")
    return state.gemLevelReference(payload,headers);
  if(route==="/card_handler/EquipGem") return state.equipGems(payload,headers);
  if(route==="/gem/Sell") return state.sellGems(payload,headers);
  if (route.startsWith("/gem/")) return state.unavailableGemAction(payload, headers);
  if (["/reference/GetCardEquipmentLevelUpPrice","/reference/GetCardEquipmentRankUpPrice",
    "/card_handler/LevelUpEquipment","/card_handler/RankUpEquipment"].includes(route))
    return state.equipmentReferenceAction(route,payload,headers);
  if (route.startsWith("/fishing/")) return state.fishingAction(route, payload, headers);
  if (route === "/reference/GetSkinRef" || route === "/lobby/GetSkinInst" || route.startsWith("/skin/"))
    return state.skinAction(route, payload, headers);
  if (["/dailyquest/GetRefList", "/dailyquest/GetInstList", "/dailyquest/RequestReward", "/linearquest/Reward"].includes(route))
    return state.questAction(route, payload, headers);
  if (route.startsWith("/mirage/")) return state.mirageAction(route, payload, headers);
  // **[RECOVERED]** The expedition-map chest claim. `CSRSyncMStage::
  // RequestReward` (0xb3bf4c) builds a 7-entry
  // `CPVHTTPMapToEncodedURLFormTransformer<unordered_map<string,string>>` and
  // posts it to this path (0xb3c23a); `ReqRewardCB` (0xb3c674) is its callback.
  // Before this branch the route fell through to the generic mock below, whose
  // `ret_data` has no `achieve_cnt` - so `found` stayed false, `cb(-1, 0)` fired
  // and the client toasted. See `ServerState.requireAchieveReward`.
  if (route === "/mission/Start" || route === "/mission/Complete" || route === "/mission/ReqAchieveReward") {
    const trace = process.env.BLUSTONE_CAMPAIGN_RECEIPT_TRACE === "1";
    let before: ReturnType<ServerState["campaignTraceContext"]> | undefined;
    if (trace) { try { before = state.campaignTraceContext(payload, headers); } catch { /* diagnostic only */ } }
    const response = route === "/mission/Start" ? state.startMission(payload, headers)
      : route === "/mission/Complete" ? state.completeMission(payload, headers) : state.requireAchieveReward(payload, headers);
    if (before) {
      try { recordCampaignReceipt(campaignReceiptProjection(route, payload, response, before, state.campaignTraceContext(payload, headers))); }
      catch { /* A diagnostic failure cannot alter an already settled response. */ }
    }
    return response;
  }
  // Fight Club has dedicated profile, BP and result state. Its automatic
  // GetMyRank callback consumes a root rank scalar, separate from Enter.
  if (["/arena/Enter", "/arena/GetMyRank", "/arena/FindRival", "/arena/BattleStart", "/arena/BattleComplete", "/arena/RefreshRival"].includes(route))
    return state.arenaAction(route, payload, headers);
  // **[RECOVERED]** The recruitment pull. `CSRSyncLottery::ReqGachaPremiumCB`
  // (0xf74fb0) reads `ret_data.cnt` (MUST be a JSON number - it is type-checked
  // before use) and `ret_data.card` (OBJECT for1, ARRAY for>1, NULL for0), calls
  // `CSRPlayData::ParseCardInst` + `CSRInventory::AddCard` on every element and
  // then hands the SAME vector to `CSRPopUpGachaX10Result::ReqGachaPremiumCB`
  // (0xcd7518). Before this branch the generic mock answered, `ret_data.card`
  // was `null`, the callback jumped straight to 0xf654e0 and the result popup
  // opened empty - measured in analysis/research/in-game-stats.md §5.3.
  // Every element carries the `CSRCard::parse` instance columns plus the six
  // keys `CSRPopUpGachaX10Result::RESULT::parse` (0xcd36a8) reads WITHOUT a null
  // guard: `index_id`, `is_duplicate`, `inst_id`, `reward.ref_id`,
  // `reward.qty`. See analysis/research/gacha-premium-contract.md.
  if (route === "/shop/GachaPremium") return state.gachaPremium(payload, headers);
  if (route === "/shop/PieceExchange") return state.pieceExchange(payload, headers);
  if (route === "/shop/BuyGlobalItem") return state.buyFuel(payload, headers);
  if (route === "/reference/GetItem") return state.envelope(itemReference());
  // RequestRef callback91abb8 indexes ret_data.ref/event_ref; RequestInst
  // callback91b22c passes ret_data directly to ParseInst. Entry reads only.
  if (route === "/explore/GetRef") return state.envelope(hunterSearchReference());
  if (["/explore/GetInst", "/explore/Begin", "/explore/End", "/explore/Retry", "/explore/Reset", "/abyss/GetHelperList"].includes(route))
    return state.searchAction(route, payload, headers);
  if (route === "/reference/GetAbyss") return state.envelope(searchHelperReference());
  if (route.startsWith("/explore/")) return state.failure(2001, "Hunter search transaction is not reconstructed");
  if (route === "/card_handler/ToggleLock") return state.toggleCardLock(payload, headers);
  if (route === "/gym/LevelUp") return state.trainCard(payload, headers);
  if (route === "/gym/RankUp") return state.rankUpCard(payload, headers);
  if (route === "/shop/SellCard") return state.sellCards(payload, headers);
  if (route === "/gym/RankUpBundle") return state.groupRankUpCards(payload, headers);
  if (route === "/gym/SkillUp") return state.trainSkill(payload, headers);
  if (route === "/gym/MultiSkillUp") return state.trainSkills(payload, headers);
  if (route === "/world/SetDeck") return state.setDeck(payload, headers);
  if (route === "/tuto/Clear") return state.clearTutorial(payload, headers);
  if (route === "/reference/V2_GetSupply") return state.envelope(supplyReference());
  if (route === "/lobby/V2_GetSupplyInst") return state.supplyInventory(payload, headers);
  if (route === "/supply/LoginBonusReward") return state.claimLoginBonus(payload, headers);
  if (route === "/supply/SpecialListReward") return state.claimSpecialSupply(payload, headers);
  if (route === "/supply/RefreshSpecialList") return state.specialSupplyInventory(payload, headers);
  if (route === "/supply/Refresh") return state.supplyInventory(payload, headers, true);
  if (route === "/supply/ActivityReward") return state.claimActivitySupply(payload, headers);
  if (route === "/lobby/GetWeather") return state.envelope({ weather: 0, weather_id: "", end_time: 0 });
  if (route === "/lobby/GetNotiInfo") return state.envelope({ notice: [], popup: [], defense_endtime: 0 });
  if (route === "/lobby/GetShopInst") return state.envelope([]);
  if (route === "/achievement/GetInstList") return state.envelope([]);
  // --- mail and social, implemented from analysis/research/mail-social.md ---

  if (route.startsWith("/message/")) return state.mailAction(route, payload, headers);

  if (["/relation/GetList", "/relation/FriendRequest", "/relation/FriendReqAccept",
    "/relation/GetFriendReceivedCount", "/relation/FriendReqCancel", "/relation/FriendReqReject", "/relation/Unfriend"].includes(route))
    return state.socialFriendAction(route, payload, headers);

  if (["/relation/GetSuggestedFriendList", "/relation/FriendSearch"].includes(route))
    return state.socialDiscoveryAction(route, payload, headers);
  if (["/relation/GetLikeCnt", "/relation/ToggleLike"].includes(route))
    return state.socialLikeAction(route, payload, headers);
  if (route === "/lobby/GetGuildInfo" || route === "/reference/GetGuildPrices" || route.startsWith("/guild/") || route.startsWith("/gvg/"))
    return state.guildAction(route, payload, headers);
  if (route === "/shop/GetHotDealSummaryList") return state.envelope([]);

  // Native parser-shaped static/reference responses.
  if (route === "/reference/GetDialog") {
    // CSRDlgInfo::SetDialog G8c4e40 iterates ret_data records, not mock/list
    // bookkeeping. Original archive metadata is unrecovered; script resources
    // alone do not establish IDs, types, gates, ordering or artwork bindings.
    return state.envelope([]);
  }
  if (route === "/lobby/GetCardInven") return process.env.BLUSTONE_DIAGNOSTIC_EMPTY_INVENTORY === "1"
    ? state.envelope([]) : state.cardInventory(payload, headers);
  if (route === "/reference/GetCard") {
    // An ARRAY, and the map key is `base.id`.
    // `CSRCardInfoContainer::SetCard` reads ret_data[n]["base"]["id"], and the
    // lookup logs "[Load] Cannot find Ref Data: ID:<id>" when it misses. The
    // object form leaves the container empty because iterating an object yields
    // key/value pairs that have no `base`; the array form registers the card.
    return state.envelope(starterReference);
  }
  if (route === "/reference/GetCardBook") return state.envelope(starterBookReference);
  // --- card reference tables whose container type is recovered -------------
  //
  // Chain parsing remains unproven. The old generated-key explanation for
  // RankUp and EnhancePrice was disproved by exact PC/register inspection;
  // see analysis/research/revival-systems-next.md.
  //
  // [RECOVERED] /reference/GetCardChain ->
  //   CSRSyncRef::ReqCardChainCB (0x00f84ce4) -> CSRCardInfoContainer::SetCardChain
  //   (0x0087e110). Keys resolved in analysis/ghidra-card-keys.txt:
  //     ret_data["r" + <generated>] -> target_rank, title, desc, related_list[]
  //     related_list[n] -> effect -> atk, def, hp
  if (route === "/reference/GetCardChain") return state.envelope({});
  // [RECOVERED] /reference/GetCardRankUp ->
  //   CSRSyncRef::ReqCardRankUpCB (0x00f84ca0) -> CSRCardInfoContainer::SetCardRankUp
  //   (0x0087ec9c). Direct ret_data rows -> rank, src_cnt, stat_bonus.
  if (route === "/reference/GetCardRankUp") return state.envelope(rankUpRows);
  // [RECOVERED] /reference/GetCardEnhancePrice ->
  //   CSRSyncRef::ReqCardEnhancePriceCB (0x00f84cc2) ->
  //   CSRCardInfoContainer::SetCardEnhancePrice (0x0087f048).
  //   Direct ret_data.level/rank numeric vectors. Empty vectors make native
  //   price getters read invalid memory. Values100/1000 are replica fixtures.
  if (route === "/reference/GetCardEnhancePrice") return state.envelope(trainingPrices);
  if (route === "/lobby/GetCardBook") return state.cardBook(payload, headers);
  if (route === "/reference/GetLevel") return state.envelope(starterLevels);
  if (route === "/reference/GetExtra") return state.envelope({
    max_ap: 50, max_bp: 10, ap_refresh_interval: RESOURCE_REFRESH_SECONDS.ap, bp_refresh_interval: RESOURCE_REFRESH_SECONDS.bp,
    // SetExtra (0xdd819c) reads numeric server_utc and calls CGMTime::SetTime
    // at 0xdd855e. Without this, energy deadlines use an unsynchronized clock.
    // Original local timezone/day anchors remain unresolved; the local clock
    // below uses the explicit UTC replica policy required by Mirage timing.
    server_utc: Math.floor(Date.now() / 1000),
    // SetExtra passes this to CGMTime+0x28. Mirage end_ltime uses that clock.
    // UTC is explicit replica policy; original local timezone is unrecovered.
    local_time: Math.floor(Date.now() / 1000),
    iap_bonus: [], client_option: [], card_sell_profit: state.cardSaleProfitReference(),
    maintenance: 0, battle_server_maintenance: 0, server_maintenance: 0,
  });
  if (route === "/reference/GetBattle") return state.envelope({
    ...arenaReference(),
    maintenance: 0,
    battle_server_maintenance: 0,
    server_maintenance: 0,
    on_tutorial: 0,
    state: 0,
    battle: [],
    battle_info: [],
  });
  if (route === "/reference/GetStage") {
    // `SetStage` indexes `ret_data` itself and type-dispatches on it, so
    // ret_data must be the stage array directly. An object here (we used to
    // wrap it as {stage:[...]}) is never indexed, leaving the native stage
    // table empty and every stage lookup empty.
    return state.envelope([...starterStages.stage, searchStageReference(), arenaStageReference()]);
  }
  if (route === "/reference/GetArea") {
    // Object form: `SetArea` reads ret_data.area[]. The stage links are nested
    // per area, at starterAreas.area[i].stage[].
    return state.envelope(starterAreas);
  }
  if (route === "/reference/GetMonster") {
    // **[RECOVERED]** hop 3 of the monster round trip. `CSRSyncMStage::
    // ReqMonsterCB` (0xb4514c) iterates `ret_data` and calls
    // `CSRGameMob::AddMonster` (0xa0b540) on each ITERATED VALUE. `AddMonster`
    // takes one parameter and no key - the mangled name in the string table is
    // `_ZN10CSRGameMob10AddMonsterERKN8nlohmann10basic_json...` - and the
    // `std::map<std::string, INFO>` node it inserts is keyed by the value's
    // `_server` string, whose literal (`0x01d676bb`, loaded at `0x00a0b558`) is
    // the FIRST thing `AddMonster` reads.
    //
    // **Consequence, and it is the reason this route changed:** the published
    // object key is read by NOTHING. In nlohmann, iterating an object yields its
    // values, so publishing one monster under three keys called `AddMonster`
    // three times with the SAME `_server`, and
    // `__emplace_unique_key_args`
    // (analysis/ghidra-enemycamp-decomp-03.txt:9396) kept the first node and
    // dropped the rest. The pre-2026-10-02-2 table
    // `{M001, "001", ""}` therefore NEVER produced `m_mMonsters["001"]` or
    // `m_mMonsters[""]`; it produced exactly one monster keyed `"M001"` and two
    // wasted calls. analysis/testing/report-011.md §3.3 and §9.4 both flag the
    // `""` key as dead weight; this is the proof of why.
    //
    // The published set is now derived from `FIXTURE_MONSTER_IDS`, the SAME list
    // that fills the record-level `show_thumbnail` array on
    // `/reference/GetTargetStageMonster` (see `stageMonsterEntry`). That array is
    // what becomes this route's `list` request field, so deriving both ends from
    // one constant is what makes "an id that is requested but not published" -
    // the same bug one hop later - impossible to reintroduce by editing only one
    // side.
    //
    // LEGACY, kept reachable as evidence: `starterMonsterTableLegacy` is the
    // `{M001, "001", ""}` table and is behaviourally identical (see above).
    return state.envelope(starterMonsterTable);
  }
  if (route === "/reference/GetStageMonster" || route === "/reference/GetTargetStageMonster") {
    const requestedStageId = String(payload.stage_id ?? payload.stage ?? payload.id ?? "");
    // Answer ONLY the stage that was asked for. Returning the whole table made
    // the client iterate every stage's waves and build its enemy team from the
    // union. Honoured on BOTH key modes below.
    //
    // **[RECOVERED]** the record carries its wave array under `wave_list`
    // (CSRGameMob::AddStageMonster, 0xa0d194, literal 0x1d76bd5), and it is
    // NESTED: an array of waves, each wave an array of monster records. See the
    // header of `stageMonsterEntry` above and of `starterStageMonstersByMonsterId`
    // in bootstrap.ts for the full instruction trace.
    //
    // `BLUSTONE_STAGE_MONSTER_KEY` selects how `ret_data` is keyed:
    //   both (DEFAULT) - publish the record under the MONSTER id **and** under
    //     the requested STAGE id.
    //     **[RECOVERED]** both keys are necessary and neither is optional.
    //     `CSRSyncMStage::ReqTargetStageMonsterCB` (0xb4606c) hands the top-level
    //     object key to `AddStageMonster`, which uses it as the
    //     `std::map<string, STAGE_MONSTER_LINK>` key at `CSRGameMob+0xc`
    //     (`00a0d690 ldr r0,[sp,#0x4] ; add r1,r0,#0xc ; bl 0x00a0e618`, and
    //     `00a0d672..0xa0d678` copy-constructing `param_1` into the pair). But
    //     `CSRMStage::MakeStageInst` reads that map with
    //     `GetStageMonsterLinkData(this+0x220)` and `this+0x220` is the scene's
    //     STAGE ID (`0xb34026 add.w r10,r9,#0x220` -> `0xb34686 ldr.w
    //     r11,[sp,#0x1c]` -> `0xb34b16 mov r2,r11`). On a miss
    //     `GetStageMonsterLinkData` (0xa0cf38, decomp-05.txt:20-56) takes
    //     `if (uVar1 == 0)` and returns the two FALLBACK vectors at
    //     `CSRGameMob+0x18` / `+0x24`, which have NO WRITER
    //     (analysis/research/enemy-camp-writer.md Q3) - so a miss is
    //     indistinguishable from "no waves", `0xb34b28 beq.w 0x00b34e88` skips
    //     the whole writer, and `0xb3507a str r0,[r1,#0x4c]` faults. The
    //     monster-id leg is the one analysis/testing/report-011.md proved
    //     causally live (assertions 6 -> 0); the stage-id leg is the one the
    //     lookup provably needs. `both` is a strict superset of `monster_id`.
    //   monster_id - the pre-fix bytes: monster id only. Kept as the control leg
    //     of the new regression test and as evidence per project convention.
    //   stage_id - the superseded pre-5acb45e shape, stage-keyed. Retained as
    //     evidence, and it is the control leg of the report-011 A/B.
    //
    // CORRECTION 2026-10-02 (this comment previously said the key "is what
    // `FUN_00b4a7a8` pushes verbatim into `GET /reference/GetMonster`'s `list`").
    // That is retracted: `FUN_00b4a7a8` walks `STAGE_MONSTER_LINK::ids`, which
    // `AddStageMonster` built from the record-level `show_thumbnail` array
    // (analysis/ghidra-enemycamp-decomp-05.txt:422-451, :568-596), and only then
    // the wave vector. The key selects which map entry is read out.
    const keyMode = (["both", "stage_id", "monster_id"] as const)
      .find((mode) => mode === (process.env.BLUSTONE_STAGE_MONSTER_KEY ?? "both"))
      ?? "both";
    const table = keyMode === "stage_id"
      ? starterStageMonstersByStageId
      : starterStageMonstersByMonsterId;
    const wavesFor = (stageId: string): StageMonsterRecord => {
      if (stageId === SEARCH_STAGE_ID) return searchStageMonsters();
      const known = table[stageId];
      if (known) return known;
      // Unknown stage: borrow the recovered entry's waves but give them a
      // stage-specific `_id`, so nothing claims another stage's identity. The
      // nesting (`wave_list: [[monster]]`) is preserved exactly - flattening it
      // here would reintroduce the throwing `operator[]` call.
      // The record-level `show_thumbnail` is carried over verbatim - it names
      // MONSTER ids, not stage ids, so it is stage-independent by construction.
      const fallback = table.n_01_01;
      const waves = fallback.wave_list.map((wave) => wave.map((monster) => ({
        ...monster,
        _id: `${stageId}_${monster._id}`,
      })));
      return { ...fallback, _id: waves, wave_list: waves };
    };
    // All three A/B shims (shape, thumbnail type, wave ref_id) are applied to the
    // finished record, after the key has been chosen, so every leg is reverted
    // by the same flag and a negative result is attributable to exactly one
    // variable.
    const respond = (ret: Record<string, unknown>) =>
      state.envelope(applyWaveShape(applyThumbnailMode(applyWaveRefIdMode(ret))));
    if (requestedStageId.length <= 1) {
      // `stage_id=""` - seen when the client had not yet resolved a node. Give
      // it the recovered entry so the stage builder can still find a wave. The
      // empty string is never published as a key: it is neither a resolvable
      // monster id nor a stage id, and `GetStageMonsterLinkData("")` would miss
      // the same way a monster id does. Falls back to the monster-id leg.
      if (keyMode === "stage_id") return respond({ "": wavesFor("n_01_01") });
      return respond({ M001: stageMonsterEntry(wavesFor("n_01_01")) });
    }
    if (keyMode === "stage_id") {
      return respond({ [requestedStageId]: wavesFor(requestedStageId) });
    }
    if (keyMode === "monster_id") {
      return respond({ M001: stageMonsterEntry(wavesFor(requestedStageId)) });
    }
    // Default `both`: monster id first (byte-identical to the `monster_id` leg,
    // so report-011's measured effect is preserved), then the requested stage id
    // so `GetStageMonsterLinkData(CSRMStage+0x220)` can find the entry.
    return respond({
      M001: stageMonsterEntry(wavesFor(requestedStageId)),
      [requestedStageId]: stageMonsterEntry(wavesFor(requestedStageId)),
    });
  }
  if (route === "/world/GetUserDetail") {
    const account = state.accountFor(payload, headers);
    let detailTargets: unknown;
    try { detailTargets = typeof payload.list === "string" ? JSON.parse(payload.list) : payload.list; }
    catch { detailTargets = null; }
    if (Array.isArray(detailTargets) && detailTargets.length >= 1 && detailTargets.length <= 3 &&
        detailTargets.every((id) => id === LOCAL_MAIL_SENDER.pvid || id === account.pvid || id === ARENA_RIVAL_PVID)) {
      // ParseUserDatailInfo Gf6e278/f6e300 consumes ret_data directly as rows.
      // Rival detail uses the same LOCAL compatibility leader fallback as the
      // notice profile; numbered slots are not a defense roster or owned cards.
      return state.envelope([...new Set(detailTargets)].map((id) => id === account.pvid
        ? state.partyProfileSnapshot(account.pvid)
        : partyProfile(id, id === ARENA_RIVAL_PVID ? arenaRival().thumbnail : FIXTURE_CARD_ID)));
    }
    return state.failure(2001, "Detailed target profiles are only reconstructed for self and local presentation identities");
  }
  if (route === "/relation/GetTargetUserInfo" || route === "/relation/GetTargetUserInfo.WithAI") {
    // Native Mail asks for its selected sender through a JSON list. This
    // reserved LOCAL presentation profile grants no account/cards/currency.
    let requestedProfiles: unknown;
    try { requestedProfiles = typeof payload.list === "string" ? JSON.parse(payload.list) : payload.list; }
    catch { requestedProfiles = null; }
    if (Array.isArray(requestedProfiles)) {
      const account = state.accountFor(payload, headers);
      if (!requestedProfiles.length || requestedProfiles.length > 3 ||
          requestedProfiles.some((id) => id !== LOCAL_MAIL_SENDER.pvid && id !== account.pvid && id !== ARENA_RIVAL_PVID &&
            (typeof id !== "number" || !state.localSocialProfile(account.pvid, id))))
        return state.failure(2001, "Brief target profiles require self, a local presentation identity or an eligible same-server local account");
      // CPVRelation.ReqUserInfoCB G8227f0 indexes ret_data.list, not the
      // detailed hunter-party grammar used by CSRSyncGlobal elsewhere.
      // Victory requests both participants in one list. CSRUserProfileDraw uses
      // profile_url, independently of the fight's hunter thumbnail. The shared
      // original system icon is a LOCAL fallback avatar, not a player upload or
      // recovered hunter avatar assignment. Same native100x100 gate as Mail.
      return state.envelope({ list: [...new Set(requestedProfiles)].map((id) =>
        state.localSocialProfile(account.pvid, id) ?? ({ pvid: id,
        reg_utc: id === account.pvid ? account.beginUtc : 0, utc: Math.floor(Date.now() / 1000),
        nick_name: id === account.pvid ? account.nickname : id === ARENA_RIVAL_PVID
          ? arenaRival().nickname : LOCAL_MAIL_SENDER.nickname,
        country_code: "", profile_status: "", ...state.socialLikeMetadata(account.pvid, id),
        profile_url: state.baseUrl + LOCAL_MAIL_PORTRAIT_PATH })) });
    }
    // **[RECOVERED]** the profile field set is
    // `CSRSyncGlobal::ParseUserDatailInfo` (0xf6e240), resolved in
    // analysis/ghidra-userdetail.txt; see `partyProfile` in bootstrap.ts.
    // `ref_id_*` is fed straight into `CSRCard::SetRefID` (0xf6e62e numbered,
    // 0xf6eda2 leader), which asserts `sRefID.length() > 0` at SRCard.cpp:731.
    //
    // Two defects fixed here on 2026-10-02 (analysis/testing/report-009.md
    // section 7):
    //  - `pvid` was hard-coded `0` while the request carries the real pvid.
    //    `ParseUserDatailInfo` reads `pvid` from the same object, so a zero
    //    could let the parser treat the whole record as "not about me" and
    //    discard it. It now echoes the requesting pvid.
    //  - `nick_name`/`nickname` were the literal template `"%user_name%"`,
    //    which is a UI substitution token, not a name. They now carry the
    //    account nickname.
    // NOTE: this route carrying the keys is not sufficient on its own -
    // report-009 measured the five empty ref ids byte-identical with these keys
    // present on the wire. The same key set is therefore also published at the
    // top level of `/lobby/Enter`, which is the global sync payload and the
    // more likely dispatch site. See state.ts `lobbyEnter`.
    const requestingPvid = Number(payload.pvid ?? 0) || profilePvid(state, payload, headers);
    const nickname = profileNickname(state, payload, headers);
    return state.envelope({
      ...state.partyProfileSnapshot(requestingPvid),
      nick_name: nickname,
      nickname,
    });
  }
  if (["/relation/BlockList", "/relation/Block", "/relation/Unblock"].includes(route))
    // ReqBlockListCB G8194c0 indexes ret_data numerically, reads target_pvid /
    // target_nickname, THEN builds its internal C++ map. Wire data is an array;
    // the historical signature-based wire-map conclusion was incorrect.
    return state.socialBlockAction(route, payload, headers);
  if (route.startsWith("/episode/")) return state.episodeAction(route, payload, headers);

  // Deliberately observable fallback. It keeps the recovered route callable
  // while making incomplete coverage obvious in logs and Swagger.
  const data: Record<string, unknown> = {
    mock: true,
    route,
    request_keys: Object.keys(payload).filter((key) => !/(token|secret|password|otp|vs_token)/i.test(key)).sort(),
  };
  if (route.startsWith("/reference/")) Object.assign(data, { list: [], items: [] });
  if (route.startsWith("/lobby/")) Object.assign(data, { card_list: [], item_list: [], gem_list: [], mission_list: [] });
  if (/^\/(gacha|shop|supply)\//.test(route)) Object.assign(data, { result: [], items: [] });
  if (/^\/(guild|gvg|arena|relation)\//.test(route)) Object.assign(data, { list: [], users: [] });
  return state.envelope(data);
}
