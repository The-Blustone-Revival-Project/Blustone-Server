/** Reconstructed local fixtures. Field names come from native parsers;
 * balance values are provisional and are NOT recovered production data. */
import { LOCAL_CAMPAIGN_FIRST_CLEAR_TEAM_EXP } from "./campaign-reward-policy.js";

import {
  CAMPAIGN_STAGE_ROWS,
  FIXTURE_AREA_LEVEL_LIMIT,
  LEGACY_PAD_NODE_IDS,
  LEGACY_RECOVERED_STAGE_ID,
  RECOVERED_CAMPAIGN_AREA_IDS,
  RECOVERED_CAMPAIGN_STAGE_COUNT,
  RECOVERED_CAMPAIGN_STAGE_IDS,
  RECOVERED_CRUISE_AREA_TYPE,
  assertAreaLinksResolve,
  assertAreaSerials,
  campaignMode,
} from "./campaign.js";
import { skillLevelRows } from "./skill-training.js";
import { ordinaryHunterLevels } from "./hunter-levels.js";
import { fixtureSkillSlots } from "./skills.js";
import { projectOrdinaryStats } from "./ordinary-stat-projection.js";
import { additionalMaterialReferences } from "./character-materials.js";
import { RECOVERED_MONSTER_NAMESPACES, requireSelectedMonsterArt } from "./monster-art.js";
import { projectMaterialStats } from "./material-stat-projection.js";
import { configuredEquipmentReferences } from "./equipment-reference-profile.js";

/**
 * `BLUSTONE_CAMPAIGN=full|minimal`, resolved once at import. **`full`** is the
 * recovered five-area / fifty-stage campaign; `minimal` is the pre-2026-10-03
 * two-area fixture, kept so a regression in the wide table is recoverable in
 * one environment variable.
 */
const CAMPAIGN_MODE = campaignMode();

export { CAMPAIGN_MODE };
export { RECOVERED_CAMPAIGN_AREA_IDS, RECOVERED_CAMPAIGN_STAGE_COUNT, RECOVERED_CAMPAIGN_STAGE_IDS };

/**
 * **[FIXTURE]** The one CARD id the replica publishes (`starterReference[0]`
 * `base.id` / `id`, and the `ref_id` of every owned instance, deck slot and
 * card-book row).
 *
 * It is its own constant, declared first, so the card namespace cannot be
 * confused with the monster namespace: `FIXTURE_MONSTER_IDS` feeds
 * `/reference/GetMonster` AND the wave records' `ref_id`, while this feeds
 * `/reference/GetCard`, `/lobby/GetCardInven`, `/lobby/GetCardBook` and
 * `partyProfile`'s `ref_id_*` slots. **The replica has no string that belongs to
 * both namespaces** - see the card-vs-monster conflict note on the wave records
 * and `FIXTURE_WAVE_REF_ID` below.
 */
export const FIXTURE_CARD_ID = "001";

/** Card-info UI calls GetSkillInfo for ALL slots1..5 even when locked. An
 * empty skill table throws map::at before training can open. [RECOVERED]
 * SRSKILL_INFO::parse(0xf219ac) + SetCard(0x87c470) keys the map using the
 * parsed type (SRSKILL_INFO+0x28), NOT target_rank. Strict string fields
 * must exist. [FIXTURE] these are
 * display-only neutral rows, with no reconstructed combat effects, icons,
 * cut-ins, costs or cooldowns. See research/card-stat-panel-crash.md. */

/** Original ordinary stats are missing. Each rank explicitly repeats the same
 * local base; native GetStat selects the rank/awakening row and supplies no
 * implicit rank scaling here. Growth/bonus consumers are separate contracts.
 * See analysis/research/combat-owned-stat-consumer-audit.md. */
function ordinaryRankStats<T extends { rank: number; awk_step: number }>(base: T) {
  return [1, 2, 3, 4, 5].map((rank) => ({ ...base, rank }));
}

/**
 * One card, id `FIXTURE_CARD_ID`, whose art lives in `res_prefix: "C001"`.
 *
 * The art package names in the recovered PAD pack are C001, C001_Q, C001A, ...
 * so the id the client resolves a card by and the prefix the resource manager
 * uses are different namespaces. `base.id` is the lookup key the card container
 * files cards under; `res_prefix` is what the animation slots (`_A*`, `_D*`) are
 * looked up against. Both are needed and they must not be assumed equal.
 *
 * A six-card roster was tried: it removed the missing-art warnings as well, but
 * then produced a bare native fault at the end of the lobby bootstrap with no
 * assertion, so the single card is kept until that fault is understood.
 */
/**
 * The legacy stat base for {@link FIXTURE_CARD_ID}. The ordinary-stat profile
 * may project archived observations onto it; legacy restores these numerals.
 * The previously empty skill array now carries mandatory neutral display
 * slots so card info can resolve GetSkillInfo without throwing map::at.
 */
const cardOneLegacyStat = { rank: 1, awk_step: 0, hp: "1000", atk: "100", def: "50", spd: "100",
  crt_chance: "5", crt_dmg: "150", penetration: "0", block_chance: "0",
  block_dec_dmg: "0", attr_enhance: "0", attr_resist: "0", hp_regen: "0",
  hp_up: "10", atk_up: "1", def_up: "1" };
const cardOneReference = {
  // SetCard reads this from the ROW, not base (87bc1c..20).
  is_main: 1,
  base: { id: FIXTURE_CARD_ID, char_id: FIXTURE_CARD_ID, name: "%user_name%", is_main: 1,
    attr: 1, role: 3, res_prefix: "C001", is_source: 0, source_field: 0,
    cool_time: 1000 },
  // `SetCard` reads `thumb` in addition to the base fields.
  thumb: "C001",
  id: FIXTURE_CARD_ID, ref_id: FIXTURE_CARD_ID,
  equipment: [], skill: fixtureSkillSlots(FIXTURE_CARD_ID), dialog: [],
  stat: ordinaryRankStats(projectOrdinaryStats(FIXTURE_CARD_ID === "001" ? "001" : "", cardOneLegacyStat)),
};

/**
 * The card the gacha can award: **catalogue card `002`, Mowgli.**
 *
 * [RECOVERED] title from CHAR_STR_RO and on-disk art. [COMMUNITY-SOURCED]
 * name Mowgli, rarity2, Lightning/Offense metadata from the catalogue wiki
 * join; role vocabulary is corroborated by local skill tags. Do not attribute
 * the wiki Infobox fields to CHAR_STR_RO.
 * - `res_prefix: "C002"`, because the **base** art package `C002.jet` (739 583
 *   bytes) is on disk in the recovered PAD pack. The awakened `_1` variants
 *   have NO art file and would render as empty animation layers.
 *
 * [RECOVERED] native numeric enums: Lightning3/Offense1. Lantern001 is
 * Fire1/Bomber3. See analysis/research/card-enums.md for text-dispatch proof.
 *
 * **[LOCAL PROJECTION]** Default ordinary stats use archived2019 observations
 * as reference bases despite unknown page level/gear and version drift. This
 * does not recover final-version Lv1/rank growth. Legacy retains invented
 * numerals; overrides receive no archive provenance from their artwork.
 *
 * `BLUSTONE_GACHA_CARD` overrides the id; `0` (or an empty value in a `.env`
 * file) disables the second card entirely and restores the single-card replica
 * byte for byte.
 */
export const FIXTURE_GACHA_CARD = (() => {
  const id = String(process.env.BLUSTONE_GACHA_CARD ?? "002").trim();
  return {
    id,
    /** [COMMUNITY-SOURCED] catalogue display name. */
    name: "Mowgli",
    /** [RECOVERED] CHAR_STR_RO title for 002; not sent, kept for the notes. */
    title: "Forgotten Forest",
    /** [COMMUNITY-SOURCED] catalogue rarity (star count). */
    rank: 2,
    /** [COMMUNITY-SOURCED] Lightning, with recovered native enum3. */
    element: "Lightning",
    /** [COMMUNITY-SOURCED] Offense, with recovered native enum1. */
    roleName: "Offense",
    /** [RECOVERED native enum] Lightning3, Offense1; catalogue metadata below. */
    attr: 3,
    role: 1,
    /** [RECOVERED] base art package `C002.jet` exists on disk. */
    res_prefix: "C002",
  };
})();

/** True when the second card is published at all. */
export const FIXTURE_GACHA_CARD_ENABLED =
  /^\d{3}$/.test(FIXTURE_GACHA_CARD.id) && FIXTURE_GACHA_CARD.id !== FIXTURE_CARD_ID;

/** [FIXTURE] stat row for the gacha card - see {@link FIXTURE_GACHA_CARD}. */
const gachaCardStat = ordinaryRankStats(projectOrdinaryStats(FIXTURE_GACHA_CARD.id === "002" ? "002" : "", { rank: 1, awk_step: 0, hp: "1000", atk: "120", def: "40", spd: "110",
  crt_chance: "5", crt_dmg: "150", penetration: "0", block_chance: "0",
  block_dec_dmg: "0", attr_enhance: "0", attr_resist: "0", hp_regen: "0",
  hp_up: "10", atk_up: "1", def_up: "1" }));

const gachaCardReference = [{
  is_main: 0,
  base: { id: FIXTURE_GACHA_CARD.id, char_id: FIXTURE_GACHA_CARD.id, name: FIXTURE_GACHA_CARD.name,
    is_main: 0, attr: FIXTURE_GACHA_CARD.attr, role: FIXTURE_GACHA_CARD.role,
    res_prefix: FIXTURE_GACHA_CARD.res_prefix, is_source: 0, source_field: 0,
    cool_time: 1000 },
  thumb: FIXTURE_GACHA_CARD.res_prefix,
  id: FIXTURE_GACHA_CARD.id, ref_id: FIXTURE_GACHA_CARD.id,
  equipment: [], skill: fixtureSkillSlots(FIXTURE_GACHA_CARD.id), dialog: [],
  stat: gachaCardStat,
}];

/**
 * `/reference/GetCard` - **a bare array**, because
 * `CSRCardInfoContainer::SetCard` reads `ret_data[n]["base"]["id"]` and the
 * lookup logs `[Load] Cannot find Ref Data: ID:<id>` on a miss. An object form
 * leaves the container empty (§6 of AGENTS.md).
 *
 * **Card `002` must be here for the gacha to show anything.** The result popup
 * resolves the award through `CSRInventory::GetCardRefID(inst_id)` →
 * `CSRCardInfoContainer::GetCardData(ref_id)` (`0x86ce64`), so a `card[]`
 * element naming `002` with no `002` row here renders nothing and logs a
 * missing-art error instead. That is the same shape of bug as the `ST001`
 * `resource_id` gap (AGENTS.md §16.6 item 3).
 *
 * The multi-card risk is real and was seen: a six-card roster produced a bare
 * native fault at the end of the lobby bootstrap with no assertion. One extra
 * card with a real art package is a much smaller experiment, and
 * `BLUSTONE_GACHA_CARD=0` reverts to the single-card replica in one variable.
 * (Use `0`, not `""` - PowerShell's `$env:X = ""` DELETES the variable, which
 * silently restores the default instead of disabling the card.)
 */
/** Additive role coverage: exact identities/art and native enums, community
 * attributes/birth ranks, local stat/skill fixtures. CUT bindings unknown.
 * Existing starter instances are not changed by publishing these references. */
const additionalReferences = [
  { id: "003", name: "Nene", attr: 2, role: 2, minRank: 1 },
  { id: "004", name: "Tyltyl", attr: 1, role: 4, minRank: 1 },
  // Native SearchStuff whitelists005 at minimum stat rank2,006 at1.
  // Identities/enums/art are recovered/catalogued; stats and inert skills are
  // local fixtures. Existing001..004 references and ownership stay unchanged.
  { id: "005", name: "Gerard", attr: 2, role: 2, minRank: 2 },
  { id: "006", name: "Sylvester", attr: 1, role: 1, minRank: 1 },
].map((card) => ({
  ...cardOneReference,
  is_main: 0,
  base: { ...cardOneReference.base, id: card.id, char_id: card.id, name: card.name,
    is_main: 0, attr: card.attr, role: card.role, res_prefix: `C${card.id}` },
  id: card.id, ref_id: card.id, thumb: `C${card.id}`,
  skill: fixtureSkillSlots(card.id), stat: ordinaryRankStats(projectOrdinaryStats(card.id, cardOneLegacyStat))
    .filter((row) => row.rank >= card.minRank),
}));

const originalStarterReference = [...new Map([
  cardOneReference, ...(FIXTURE_GACHA_CARD_ENABLED ? gachaCardReference : []), ...additionalReferences,
].map((card) => [card.base.id, card])).values()];

/** Opt-in reference coverage only. Original six references, owned cards and
 * recruitment pools remain unchanged. New material-backed rows deliberately
 * retain explicit local stats and neutral skill slots; historical projection
 * requires its separate opt-in. Their original
 * ordinary combat magnitudes are unknown, not inferred from Episode artwork. */
export const CARD_REFERENCE_PROFILE = process.env.BLUSTONE_CARD_REFERENCE_PROFILE ?? "starter";
if (!["starter", "materials"].includes(CARD_REFERENCE_PROFILE))
  throw new Error("Unknown ordinary card reference profile");
export const starterReference = configuredEquipmentReferences([...originalStarterReference,
  ...(CARD_REFERENCE_PROFILE === "materials" ? additionalMaterialReferences({
    packageNames: (process.env.BLUSTONE_PACKAGE_NAMES ?? "").split(","),
    publishedIds: originalStarterReference.map((card) => card.base.id),
    fixtureStats: ordinaryRankStats(cardOneLegacyStat),
    neutralSkillSlots: fixtureSkillSlots,
    projectStats: projectMaterialStats,
  }) : []),
]);

/** Community birth grades apply to NEW grants only; preserve old rank1 saves. */
export const recruitBirthRanks: Record<string, number> = { "002": 2, "003": 3, "004": 1, "005": 2, "006": 1 };

/**
 * Card instances.
 *
 * `MakeStageInst` builds a battle participant per deck slot and calls
 * `CSRCard::SetRefID` with the instance's ref_id, so every slot needs an
 * instance that resolves to a real card.
 *
 * `BLUSTONE_PARTY_SIZE` (see `partyDeck` in state.ts) clones this instance that
 * many times. Every clone uses the same `ref_id`, so the experiment stays about
 * party size rather than about art. Default 1: exactly the previous single
 * instance.
 *
 * **The gacha card's instance is appended AFTER the party clones, not inside
 * them**, so `BLUSTONE_PARTY_SIZE` keeps its exact previous meaning and the
 * battle participants are still all card `001`. `partyDeck`/`partyProfile` are
 * deliberately NOT changed to seat it: the deck is the battle-critical path
 * (AGENTS.md §16) and the gacha card does not need to be in it to appear in
 * *Build Team*, which lists the inventory.
 */
const PARTY_SIZE = Math.max(1, Math.min(5, Number(process.env.BLUSTONE_PARTY_SIZE) || 1));

/**
 * One card-instance row.
 *
 * **[RECOVERED]** the key set is exactly what `CSRCard::parse` reads
 * (`CSRCard::parse` Ghidra `0x8680a4`: `inst_id` `0x8680be`, `ref_id` `0x86810c`,
 * `lock` `0x86815c`, `skin_ref_id`/`skin_id`/`skin_total_count`,
 * `weapon_rank`/`weapon_level`, `armor_rank`/`armor_level`,
 * `accessory_rank`/`accessory_level`, `skill_1_level`..`skill_5_level`,
 * `mirage_remain_hp`) plus the progression columns this fixture has always
 * sent. `ref_id` must be non-empty: `CSRCard::SetRefID` asserts
 * `sRefID.length() > 0` at `SRCard.cpp:731`.
 *
 * **[FIXTURE]** every value except `ref_id`/`inst_id`. Nothing recovered
 * publishes a starter instance's rank, exp or gear levels.
 */
export function cardInstance(instId: number, refId: string, rank = 1) {
  return {
    inst_id: instId, ref_id: refId, rank, rank_up_cnt: 0,
    overcome_cnt: 0, exp: 0, lock: 1, regdate: 0, mirage_remain_hp: 1000,
    equipment_exp: 0, awk_step: 0, awk_overcome: 0,
    weapon_rank: 1, weapon_level: 1, armor_rank: 1, armor_level: 1,
    accessory_rank: 1, accessory_level: 1, skill_1_level: 1, skill_2_level: rank >= 2 ? 1 : 0,
    skill_3_level: rank >= 3 ? 1 : 0, skill_4_level: rank >= 4 ? 1 : 0, skill_5_level: rank >= 5 ? 1 : 0,
    skin_ref_id: "", skin_id: "", skin_total_count: 0,
  };
}

/** The published roster. Instances 1..PARTY_SIZE are card 001's clones. */
export const starterInventory = [
  ...Array.from({ length: PARTY_SIZE }, (_, n) => cardInstance(n + 1, FIXTURE_CARD_ID)),
  ...(FIXTURE_GACHA_CARD_ENABLED ? [cardInstance(PARTY_SIZE + 1, FIXTURE_GACHA_CARD.id)] : []),
];

/**
 * The first `inst_id` the gacha hands out: **one past the whole roster**, so a
 * granted serial can never collide with an instance `/lobby/GetCardInven` has
 * already published. It is a module constant rather than a stored counter
 * because the roster is fixed; the persistent counter starts here and only
 * moves forward.
 */
export const FIXTURE_GACHA_FIRST_INST_ID = starterInventory.length + 1;

/**
 * The party profile, as a flat key/value map.
 *
 * **[RECOVERED]** field set, verbatim from the Thumb pc-relative string
 * references resolved inside `CSRSyncGlobal::ParseUserDatailInfo` (0xf6e240);
 * see `analysis/ghidra-userdetail.txt`. The parser reads these off `ret_data`
 * of whatever response it is dispatched with:
 *
 *   pvid group_exp vip_exp league_level rating_point awake
 *   inst_id_leader ref_id_leader rank_leader rank_up_cnt_leader
 *   awk_step_leader overcome_cnt_leader awk_overcome_leader exp_leader
 *   skin_ref_id_leader skill_1_level_leader .. skill_5_level_leader
 *   inst_id_<n> ref_id_<n> rank_<n> rank_up_cnt_<n> awk_step_<n>
 *   overcome_cnt_<n> awk_overcome_<n> exp_<n> skin_ref_id_<n>
 *   skill_1_level_<n> .. skill_5_level_<n>          (n built by concatenation)
 *   stage_id prev_rank win_message lose_message
 *
 * `ref_id_*` is fed straight into `CSRCard::SetRefID` (call sites 0xf6e62e for
 * the numbered loop and 0xf6eda2 for `_leader`, listed in
 * `analysis/ghidra-setrefid-callers.txt`). `SetRefID` asserts
 * `sRefID.length() > 0` at `SRCard.cpp:731`, so an absent `ref_id_<n>` becomes
 * an empty string and one assertion per slot.
 *
 * The parser has exactly TWO `SetRefID` call sites and the numbered keys are
 * built by appending an index, so `_leader` plus four numbered slots is the
 * five-slot shape that matches the observed assertion count.
 *
 * **[FIXTURE]** values: card `001` is the only card the replica publishes
 * (`starterReference`), and one instance is the only instance it owns
 * (`starterInventory`). Rank/exp/skill numbers are placeholders, not recovered
 * progression.
 */
export function partyProfile(pvid: number, refId = FIXTURE_CARD_ID): Record<string, number | string> {
  const profile: Record<string, number | string> = {
    pvid,
    group_exp: 0,
    vip_exp: 0,
    league_level: 1,
    rating_point: 0,
    awake: 0,
    stage_id: "N003",
    prev_rank: 0,
    win_message: "",
    lose_message: "",
  };
  const card = (suffix: string) => {
    profile[`inst_id_${suffix}`] = 1;
    profile[`ref_id_${suffix}`] = refId;
    profile[`rank_${suffix}`] = 1;
    profile[`rank_up_cnt_${suffix}`] = 0;
    profile[`awk_step_${suffix}`] = 0;
    profile[`overcome_cnt_${suffix}`] = 0;
    profile[`awk_overcome_${suffix}`] = 0;
    profile[`exp_${suffix}`] = 0;
    profile[`skin_ref_id_${suffix}`] = "";
    profile[`skill_1_level_${suffix}`] = 1;
    for (let level = 2; level <= 5; level += 1) profile[`skill_${level}_level_${suffix}`] = 0;
  };
  card("leader");
  for (let slot = 1; slot <= 4; slot += 1) card(String(slot));
  return profile;
}

/** Neutral local collection bonuses. SetCardBook parses effect as JSON TEXT.
 * FindCardBook dereferences a role's table without guarding a missing role.
 * Roles/count thresholds are provisional coverage for bootstrap, not balance. */
export const starterBookReference = [0, 1, 2, 3, 4].flatMap((card_role) =>
  [0, 1].map((target_cnt) => ({ card_role, target_cnt,
    effect: JSON.stringify({ atk: 0, def: 0, hp: 0, crt_chance: 0, crt_dmg: 0 }),
  })),
);

/** CSRUserLV::SetLevel consumes named arrays, not a flat list. Numbers are
 * provisional progression thresholds. Empty VIP benefits mean no paid bonus. */
export const starterLevels = {
  user: [{ min_exp: 0 }, { min_exp: 100 }],
  vip: [{ min_exp: 0, title: "Local", benefit: [] }, { min_exp: 1000, title: "Local", benefit: [] }],
  vip_group: [],
  card: ordinaryHunterLevels,
  skill: skillLevelRows, card_awk: [],
};

/**
 * The STAGE-NODE THUMBNAIL art name (`thumb`), deliberately a DIFFERENT
 * namespace from {@link FIXTURE_STAGE_ENVIRONMENT_IDS} and from
 * {@link FIXTURE_AREA_BACKDROP_ART}.
 *
 * **[RECOVERED]** `thumb` is read by `CSRGameStage::SetStage` (0xa274d0,
 * literal `0x1d6fce7`) and it is an ART name, not a selector: `SetStage`'s
 * 22-key field set contains no environment field, and the only field
 * `CSRGameBase::InitBackground` (0x9cbe8c) reads as the
 * `std::map<string,ENV_INFO>` key is `res_prefix` (`stage+0x70`).
 *
 * **[UNRESOLVED]** the value. `"ST001"` is the stage/episode art family and it
 * does resolve nowhere in `analysis/r015/logcat-all.txt`, but the thumbnail
 * consumer has never been isolated on device, so a miss here is unproven.
 * Override with `BLUSTONE_STAGE_THUMB_ART` to A/B it.
 */
const FIXTURE_STAGE_THUMB_ART =
  (process.env.BLUSTONE_STAGE_THUMB_ART ?? "ST001").trim() || "ST001";

/**
 * **[RECOVERED] `resource_id` is the MISSION-MAP BACKDROP ART NAME. It is NOT an
 * environment id, and that is the whole point of this constant.**
 *
 * `CSRGameStage::SetArea` (0xa28108, literal `0x1d7770e`) is the only reader of
 * `resource_id`, and `SetArea`'s recovered 27-key field set contains no
 * environment field either. The environment table is reached from exactly three
 * places, and none of them is `SetArea`:
 *
 *  1. `CSRGameBase::InitBackground` (0x9cbe8c) - `GetStageData(this+0x220)`,
 *     then `stage+0x70` (= `res_prefix`), else the stage id;
 *  2. `CSRSceneMEpisode::InitBackground` (0xb23e80) - the episode COMBAT
 *     record, a LOCAL JSON resource and not a server route;
 *  3. `CSRExploreMirage::InitBackground` (0x926778) - the mirage override.
 *
 * All three funnel into `CSRGameBase::OnInitBackground` (0x9cbf34), the single
 * `std::map<string,ENV_INFO>::find(CSRStaticData+0x150, key)` site.
 *
 * **The measurement that settles it.** In `analysis/r015/logcat-all.txt` the
 * `ST001` miss is `23:47:43.294` and the first `SR_SNOW01` registration is
 * `23:47:43.307` - 13 ms later, and inside the same burst.
 * `CSRSceneMStageMap::CreateArea` (0xe91f0c) is the only function that loads
 * `SR_SNOW` (literal `0x01d8afc4`, `ldr@0x00e92490`), and its instruction order
 * is `PA_MAP_RD_%d` (0xe9205e) -> `PA_MAP_SP_%d` (0xe920ca) ->
 * `PA_MAP_EV_%d` (0xe92136) -> `PA_MAP%d` (0xe921d6) -> `PA_BG` (0xe9222c) ->
 * ... -> `SR_SNOW` (0xe92490). `PA_MAP%d`/`PA_BG` are UI NODE names, not art
 * names: the recovered layout record
 * `KO/NEW/SR_MISSION/2_SR_UI_MS_ST/1_MS_ST_MAP` (83 KB, 51 `PA_MAP0..PA_MAP50`
 * panels each wrapping an empty `<panel name="PA_BG">`, plus `RE_MK0..RE_MK9`
 * marker rects, and exactly ONE `res-name="ST_SHADOW"`) proves the backdrop
 * image is filled in by code. So the art load that lands between `PA_BG` and
 * `SR_SNOW` takes the AREA record's only data-driven string, `resource_id`.
 *
 * Two further facts agree:
 *  - the log signature is an ART miss, not an environment miss:
 *    `[ERR] [RES] Can't find 'ST001' in ResMap.` is
 *    `CRMResMap::GetResInfo` (0x01d999cb) followed by
 *    `LoadAnim2 'ST001' failure` and `[ERR] [LoadAnim] Cannot find the
 *    resource(ST001)`. The environment-miss signature is completely different -
 *    PREFIXLESS names (`_A0.._A9`, `_D0.._D9`, `_E0.._E9`) - and those appear
 *    only ~40 s LATER, at the battle, which is the defect fixed by
 *    `res_prefix: "99"` (commit 8dc5bfd);
 *  - ONE miss, not seventeen. `thumb` is per-STAGE and the fixture publishes 17
 *    stages; `resource_id` is per-AREA and one area (`n_01`) is visible.
 *
 * **[FIXTURE] the VALUE: `"MAP_ZONE_1"`.** `MAP_ZONE_1.jet` (6 129 328 bytes) is
 * a real file in the recovered PAD pack
 * (`recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets`) and
 * is the ONLY `MAP*` pack in that 790-file corpus, i.e. the only recovered
 * artifact whose name denotes a mission-map backdrop. `n_00` already published
 * it before this change. **It is NOT proven to resolve** - see
 * {@link assertAreaBackdropArt} for what is enforced and what is not.
 *
 * **`ST001` was the wrong value and is not a valid default.** Measured:
 * `[ERR] [RES] Can't find 'ST001' in ResMap.` in 5 of 5 r015 legs. Publishing an
 * environment id here instead (the obvious "same bug as `res_prefix`" fix) is
 * ALSO wrong and would produce `[ERR] [RES] Can't find '99' in ResMap.`;
 * `assertAreaBackdropArt` refuses both shapes at boot.
 */
// Historical default is unresolved and has no matching original animation.
// Experimental LOCAL_MAP is a local AT wrapper around original MS_MAP2 scenery;
// its original per-area binding is unknown. Select explicitly via the env dial.
// See analysis/testing/map-wrapper-001/report.md; filenames are not art IDs.
const FIXTURE_AREA_BACKDROP_ART_DEFAULT = "MAP_ZONE_1";

/**
 * Boot-time guard for the area backdrop art name. Refuses, loudly, the two
 * namespace confusions this field has actually been subject to:
 *
 *  - an `environments.csv` `#ID` (that is the `res_prefix` namespace; the
 *    environment table is never consulted for an area);
 *  - an `ST<n>` stage/episode prefix (measured to miss, and the `thumb`
 *    namespace).
 *
 * The authoritative cross-check against `analysis/recovered-data/environments.csv`
 * lives in `tests/area-backdrop.ts`, which reads the CSV; this function only
 * applies the shape rules so `server-ts` needs no `analysis/` access at runtime
 * - the same split the stage guard uses.
 */
export function assertAreaBackdropArt(name: string): string {
  const value = name.trim();
  if (!value) {
    throw new Error("the area `resource_id` must be a non-empty art name; "
      + "CSRSceneMStageMap::CreateArea hands it to CMImageNode::LoadAnim2, and an empty "
      + "name logs '[ERR] [RES] Can't find \\'\\' in ResMap.' and leaves the mission-map "
      + "backdrop panel empty.");
  }
  if (/^\d+$/.test(value)) {
    throw new Error(
      `BLUSTONE_AREA_BACKDROP_ART="${value}" is an environments.csv #ID, not an art name. `
      + `The area's \`resource_id\` is the MISSION-MAP BACKDROP ART: CSRSceneMStageMap::CreateArea `
      + `(0xe91f0c) loads it between FindByName("PA_BG") at 0xe9222c and SR_SNOW at 0xe92490. `
      + `The ENV table (CSRStaticData+0x150) is read only by CSRGameBase::OnInitBackground `
      + `(0x9cbf34), whose callers are CSRGameBase::InitBackground (the STAGE's res_prefix), `
      + `CSRSceneMEpisode::InitBackground and CSRExploreMirage::InitBackground - SetArea is not `
      + `among them. An id here yields "[ERR] [RES] Can't find '${value}' in ResMap."`,
    );
  }
  if (/^ST\d+$/i.test(value)) {
    throw new Error(
      `BLUSTONE_AREA_BACKDROP_ART="${value}" is an ST<n> stage/episode art prefix, which is the `
      + `stage \`thumb\` namespace, not the map backdrop. It is MEASURED to miss: `
      + `analysis/r015/logcat-all.txt logs "[ERR] [RES] Can't find '${value}' in ResMap." + `
      + `"LoadAnim2 '${value}' failure" + "[ERR] [LoadAnim] Cannot find the resource(${value})" `
      + `in all five legs, ~40 s before the battle.`,
    );
  }
  return value;
}

/** The art name every published area record puts in `resource_id`. */
export const FIXTURE_AREA_BACKDROP_ART: string = assertAreaBackdropArt(
  process.env.BLUSTONE_AREA_BACKDROP_ART ?? FIXTURE_AREA_BACKDROP_ART_DEFAULT,
);

// ---------------------------------------------------------------------------
// EXPEDITION-MAP CHESTS  (2026-10-03, `analysis/research/chest-rewards.md`)
// ---------------------------------------------------------------------------

/**
 * **[RECOVERED]** How many chest slots the expedition map draws. Three, always.
 *
 * `CSRSceneMStageMap::ShowReward` (0xe9413c) pushes exactly THREE labels into
 * `this->0x7ec` (`:2539-2572`) and the state loop at `:3207-3231` iterates
 * `i ∈ {0,1,2}`. There is no data-driven count: a fourth chest cannot be
 * published.
 */
export const FIXTURE_CHEST_COUNT = 3;

/**
 * **[FIXTURE]** The item each chest hands out, and its gold.
 *
 * **The item ids are [RECOVERED], the numbers are not.**
 * 912 / 913 / 914 are rows of the recovered `CHAR_STR_RO` string table
 * (`analysis/catalogue/data/card-catalogue.tsv`) whose `TITLE` is
 * "★2 / ★3 / ★4 Transcendence Ticket". They are the project's only *recovered*
 * item-shaped ids: all 113 other rows are hunters, and catalogue §2.1/§7.4
 * records that these three are "item string, not a hunter".
 *
 * [RECOVERED] art availability: `C914.jet` and `C913.jet` exist in the
 * recovered PAD pack; `C912.jet` does **not**. So the LAST chest's thumbnail has
 * no art to draw, which is a second, independent gap stacked on the popup - see
 * `analysis/research/chest-rewards.md` §Q3 ("two independent gaps stack here")
 * and `map-backdrop.md` §5.2 (the `MS_RW_*` owning package is still UNKNOWN).
 *
 * **[FIXTURE]** `gold` is a local placeholder. The RECOVERED part is the
 * mechanism: `achieve_reward[].gold` is the reference amount, and
 * `CSRSyncMStage::ReqRewardCB` applies `ret_data.gold.cur` only when
 * `ret_data.gold.prev != 0` (`ghidra-chest-01-reward-route.txt:629-717`).
 */
export const FIXTURE_CHEST_ITEMS = [
  { id: "914", title: "★4 Transcendence Ticket", qty: 1, gold: 300 },
  { id: "913", title: "★3 Transcendence Ticket", qty: 1, gold: 200 },
  { id: "912", title: "★2 Transcendence Ticket", qty: 1, gold: 100 },
] as const;

/** One area -> stage link. **[RECOVERED]** `CSRGameStage::STAGE_LINK` is 0x1c
 * bytes = `{int32 serial; std::string id;}` (stride proven in
 * `analysis/ghidra-chest-03-getters.txt:60`, `iVar4 = iVar4 + 0x1c`). The JSON
 * key that fills the string is **[UNKNOWN-4]** - both `area_id` and `stage_id`
 * are published, because whichever it is the server ships it. */
export interface AreaStageLink {
  area_id: string;
  stage_id: string;
  serial: number;
}

/**
 * One `achieve_reward` record.
 *
 * **[RECOVERED]** field set, from `CSRGameStage::SetArea` (0xa28108,
 * `analysis/ghidra-setstage-exact.txt` and `ghidra-chest-02-sources.txt:1669-1818`
 * / `:2052-2084`): `area_id, achieve_cnt, gold, free_iap, iap, item_list[].id
 * .qty, card_list[].id .qty`. In memory it is
 * `CSRGameStage::ACHIEVE_REWARD`, 0x34 bytes: `int32 achieve_cnt` at +0x00,
 * `std::string area_id` at +0x04, `vector<pair<string,uint32>> item_list` at
 * +0x1c, `vector<pair<string,uint32>> card_list` at +0x28
 * (`ghidra-chest-03-getters.txt`, stride 0x34).
 */
export interface AreaAchieveReward {
  area_id: string;
  /**
   * **[RECOVERED]** the reference value, and the ONLY thing
   * `CSRSyncMStage::RequestReward` (0xb3bf4c) sends as `target_achieve_cnt`:
   * `std::to_string(GetRewards()[index].achieve_cnt)` (`ghidra-chest-01-reward-route.txt:158-160`,
   * stride 0x34). It is NOT the array index.
   *
   * **[RECOVERED]** the value must equal `GetStageCnt(area) * (index + 1)`:
   * `ShowReward` labels the chests `S`, `(S*6)/3 == 2S`, `S*3` (`:2539-2572`)
   * and gates both the sprite state (`:3218`) and the request itself
   * (`SendRewardRequest` `:1572-1574`) on `have >= S*(i+1)`. So the thresholds
   * and the reward ids are the same arithmetic and cannot be chosen freely.
   */
  achieve_cnt: number;
  gold: number;
  free_iap: number;
  iap: number;
  /** **[RECOVERED]** `vector<pair<string,uint32>>` at `ACHIEVE_REWARD+0x1c`.
   * Non-empty is what stops `PopUpClearReward` (0xe964e0) taking its
   * `RMTrace(2, "ClearRewardInfo Not Found")` early-return at `:3899-3918`. */
  item_list: Array<{ id: string; qty: number }>;
  /**
   * **[RECOVERED]** `vector<pair<string,uint32>>` at `ACHIEVE_REWARD+0x28`,
   * consumed as card instances. Deliberately **empty**: the replica publishes
   * exactly one card (`FIXTURE_CARD_ID`) and its art family, and granting a
   * card the client cannot resolve is the class of defect behind the five
   * `SRCard.cpp(731)` assertions (AGENTS.md §16.6 item 2).
   */
  card_list: Array<{ id: string; qty: number }>;
}

export interface AreaRecord {
  id: string;
  type: number;
  serial: number;
  level_limit: number;
  title: string;
  desc: string;
  dialog_id: string;
  /** The mission-map backdrop ART name. See {@link FIXTURE_AREA_BACKDROP_ART}. */
  resource_id: string;
  explore_id: string;
  stage: AreaStageLink[];
  achieve_reward: AreaAchieveReward[];
}

/**
 * The three chest rows of one area, derived - never written by hand.
 *
 * **[RECOVERED] the arithmetic.** `achieve_cnt = stageCount * (index + 1)`:
 * `ShowReward` draws the labels `S`, `2S`, `3S` where `S = GetStageCnt(area)`
 * (`:2539-2572`), and both the claimable test (`:3218`) and the request gate
 * (`SendRewardRequest`, `:1572-1574`) compare the player's progress against
 * `S * (i+1)`. `GetRewards()` is filtered on `ACHIEVE_REWARD.area_id`
 * (`ghidra-chest-03-getters.txt`), so entry `i` of this list IS
 * `GetRewards()[i]`, and the reward id the client echoes back must be the
 * threshold it is drawn at.
 *
 * `stageCount` is the number of `stage[]` links in the area, which is the
 * reading of `GetStageCnt` that the device supports: area `n_01` publishes three
 * links and the on-screen labels read `3 / 6 / 9`
 * (analysis/testing/report-015.md:358, report-017.md:193).
 *
 * **[RECOVERED]** `GetStageCnt` and `GetStageLinks` both compare the link's
 * single string against their argument, and `OnInit` then feeds that same
 * string to `GetStageAchieveCnt`, which is keyed by STAGE id - so the two
 * readings cannot both be literally true of one field ([UNKNOWN-4]). It does not
 * matter here: `S` is the link COUNT either way, and every area publishes both
 * keys.
 */
export function areaAchieveRewards(areaId: string, stageCount: number): AreaAchieveReward[] {
  // The hidden cruise origin has no playable campaign stages or chest rewards.
  // Do not manufacture three zero-threshold rewards for its empty link list.
  if (areaId === "n_00" && stageCount === 0) return [];
  if (!Number.isSafeInteger(stageCount) || stageCount < 1) {
    throw new Error(`area "${areaId}" needs at least one stage[] link: GetStageCnt(area) is the `
      + `chest multiplier S, so S == 0 would make every label and every achieve_cnt 0 and leave the `
      + `three chests permanently locked and un-claimable.`);
  }
  return Array.from({ length: FIXTURE_CHEST_COUNT }, (_unused, index) => {
    const item = FIXTURE_CHEST_ITEMS[index % FIXTURE_CHEST_ITEMS.length];
    return {
      area_id: areaId,
      achieve_cnt: stageCount * (index + 1),
      gold: item.gold,
      free_iap: 0,
      iap: 0,
      item_list: [{ id: item.id, qty: item.qty }],
      card_list: [],
    };
  });
}

/** The per-area seed. Only the shape is recovered; see `AREA_SEEDS` for which
 * fields are [RECOVERED] and which are [FIXTURE]. */
interface AreaSeed {
  id: string;
  type: number;
  serial: number;
  level_limit: number;
  title: string;
  desc: string;
  dialog_id: string;
  explore_id: string;
  stage_ids: string[];
}

/**
 * The pre-2026-10-03 seeds: `n_00` (Village, one link) and `n_01` (Snowfield,
 * `N001 N002 N003`). Kept byte-for-byte as `BLUSTONE_CAMPAIGN=minimal`.
 */
const LEGACY_AREA_SEEDS: AreaSeed[] = [
  { id: "n_00", type: 1, serial: 0, level_limit: 0, title: "Village",
    desc: "Local origin node", dialog_id: "", explore_id: "", stage_ids: ["n_01_01"] },
  { id: "n_01", type: 1, serial: 1, level_limit: 1, title: "Snowfield",
    desc: "Local expedition test area", dialog_id: "", explore_id: "",
    stage_ids: ["N001", "N002", "N003"] },
];

/**
 * The RECOVERED campaign's areas. **[RECOVERED]** the ids (`n_00`..`n_05`), the
 * `type` (`1` = cruise destination, see `RECOVERED_CRUISE_AREA_TYPE`) and the
 * ten stage links per expedition area (from
 * `analysis/recovered-data/campaign-stages.csv`).
 *
 * **[RECOVERED]** `serial` is the per-type ORDINAL `AREA_INFO+0x3c`
 * (`GetAreaData(type, i)` matches it, `0x00a296f0`), which is why it is dense
 * `0..5` across the six type-1 areas. `n_00` at ordinal 0 is the origin node
 * and `CSRSceneAreaSel::SetMarker` deliberately hides it
 * (`CMUpdatable::SetVisible(button, uVar17 != 0)`, `native-area-index.txt:337`),
 * leaving **five visible cruise destinations** - which is what the airport scene
 * was missing.
 *
 * **[FIXTURE]** `title` / `desc` / `dialog_id` / `explore_id`. No recovered
 * string table supplies an English area title; `n_01` keeps its historical
 * "Snowfield" because that is the label already measured on screen.
 *
 * **[FIXTURE, safety-clamped] `level_limit` is 0 on every area.** `SetAreaState`
 * (0xe75cdc `:962-974`) locks an area whose `level_limit` exceeds
 * `CSRPlayData::GetUserLevel()`, and `/lobby/Enter` publishes no `level` key, so
 * any non-zero ladder would gate content behind a value the server never sends.
 * See `FIXTURE_AREA_LEVEL_LIMIT` in `campaign.ts` for the full reasoning - this
 * is a bounded placeholder, not recovered balance, and it is why the *other*
 * recovered gate (previous area's last stage cleared) is the live one.
 */
const CAMPAIGN_AREA_SEEDS: AreaSeed[] = [
  { id: "n_00", type: RECOVERED_CRUISE_AREA_TYPE, serial: 0, level_limit: 0,
    title: "Village", desc: "Local origin node", dialog_id: "", explore_id: "",
    // SetMarker hides ordinal0; the recovered CSV owns n_01_01 only in n_01.
    // A duplicate origin link misroutes the native return after its victory.
    stage_ids: [] },
  { id: "n_01", type: RECOVERED_CRUISE_AREA_TYPE, serial: 1, level_limit: 0,
    title: "Snowfield", desc: "Local expedition test area", dialog_id: "", explore_id: "",
    stage_ids: RECOVERED_CAMPAIGN_STAGE_IDS.slice(0, 10) },
  { id: "n_02", type: RECOVERED_CRUISE_AREA_TYPE, serial: 2, level_limit: 0,
    title: "Glacier", desc: "Local expedition test area", dialog_id: "", explore_id: "",
    stage_ids: RECOVERED_CAMPAIGN_STAGE_IDS.slice(10, 20) },
  { id: "n_03", type: RECOVERED_CRUISE_AREA_TYPE, serial: 3, level_limit: 0,
    title: "Red Rock", desc: "Local expedition test area", dialog_id: "", explore_id: "",
    stage_ids: RECOVERED_CAMPAIGN_STAGE_IDS.slice(20, 30) },
  { id: "n_04", type: RECOVERED_CRUISE_AREA_TYPE, serial: 4, level_limit: 0,
    title: "Aurora Tundra", desc: "Local expedition test area", dialog_id: "", explore_id: "",
    stage_ids: RECOVERED_CAMPAIGN_STAGE_IDS.slice(30, 40) },
  { id: "n_05", type: RECOVERED_CRUISE_AREA_TYPE, serial: 5, level_limit: 0,
    title: "Deep Cavern", desc: "Local expedition test area", dialog_id: "", explore_id: "",
    stage_ids: RECOVERED_CAMPAIGN_STAGE_IDS.slice(40, 50) },
];

/** The area seeds for the active `BLUSTONE_CAMPAIGN` mode. */
const AREA_SEEDS: AreaSeed[] =
  CAMPAIGN_MODE === "minimal" ? LEGACY_AREA_SEEDS : CAMPAIGN_AREA_SEEDS;

/**
 * Link serials are published **1-based, in position order** (`1..10`), which is
 * what the CSV cannot be trusted to say and what the device is proven to
 * render. See the module header of `campaign.ts` for the `1..9, 0` discrepancy
 * and why `STAGE_LINK`'s serial is an ORDERING key
 * (`std::map<int,int>` insertion in `CSRSceneMStageMap::OnInit`).
 *
 * `chest-rewards.md` §Q2 suggests `serial: 0,1,2` "so `IsOpened`'s
 * `std::map::at` (0x01d694f3, `map::at: key not found`) cannot throw". That was
 * **NOT** applied, deliberately: the device has never crashed on the map with
 * serials `1,2,3`, and `IsOpened`'s key domain is unknown - it early-returns
 * `true` for index 1 and otherwise `map::at`s a key it is not proven to be
 * asked for. Recorded as [UNKNOWN], not changed.
 */
function buildArea(seed: AreaSeed): AreaRecord {
  const stage: AreaStageLink[] = seed.stage_ids.map((stage_id, index) => ({
    area_id: seed.id, stage_id, serial: index + 1,
  }));
  return {
    id: seed.id,
    type: seed.type,
    serial: seed.serial,
    // [FIXTURE, safety-clamped] 0 unless BLUSTONE_AREA_LEVEL_LIMIT says
    // otherwise - see FIXTURE_AREA_LEVEL_LIMIT for why a ladder is unsafe while
    // `/lobby/Enter` publishes no user `level`.
    level_limit: seed.level_limit === 0 ? FIXTURE_AREA_LEVEL_LIMIT : seed.level_limit,
    title: seed.title,
    desc: seed.desc,
    dialog_id: seed.dialog_id,
    // [RECOVERED] the mission-map BACKDROP ART name, not an environment id -
    // see FIXTURE_AREA_BACKDROP_ART for the full chain and the measurement.
    resource_id: FIXTURE_AREA_BACKDROP_ART,
    explore_id: seed.explore_id,
    stage,
    achieve_reward: areaAchieveRewards(seed.id, stage.length),
  };
}

/** First expedition slice. Stage ID n_01_01 is recovered from
 * CSRStaticData::GetStageID; layout/balance values are provisional. */
export const starterAreas = {
  // SetMarker deliberately hides slot 0 (origin); GetAreaData still needs
  // that slot so the first visible destination can be addressed at slot 1.
  //
  // The identity field is `area_id`, not `id`. The SRGameStage.cpp key cluster
  // in the native library is `area, level_limit, resource_id, explore_id,
  // area_id, achieve_reward, achieve_cnt`, and `CSRGameStage::GetAreaData`
  // takes an area_id. Publishing only `id` left the area table unresolvable,
  // so the mission map could not place a node and `CSRSyncMStage::RequestStart`
  // asserted `sStageID.size() > 1` and sent an empty stage_id. `id` is kept as
  // an alias for the fixture/debug contract; `achieve_cnt` gives the progress
  // denominator natively.
  // `SetArea` reads ret_data.area[] and then, PER AREA, `stage[]` - the
  // area->stage link list is nested inside each area record, not a sibling of
  // `area`. Each link is {area_id, stage_id, serial}. That nesting is why the
  // expedition map had no selectable stage: the client never saw a link.
  //
  // Field set recovered from `CSRGameStage::SetArea` (0xa28108) by resolving its
  // Thumb pc-relative string references in Ghidra. Identity is `id`; `area_id`
  // is only used inside the nested link records.
  //
  // Snowfield has three stage links (N001..N003 are the node resources the PAD
  // pack actually ships) because a single link made all three map nodes resolve
  // to the same stage and render "0". Three links also make `S = GetStageCnt`
  // equal 3, which is the value the device's chest labels `3 / 6 / 9` confirm.
  area: AREA_SEEDS.map(buildArea),
  // `SetArea` reads the links as area[i].stage[], which is what the native
  // decompile shows. The top-level `stage` array is kept as well: the chapter
  // shield marker on the map disappears when only the nested form is sent, and
  // an extra key the parser ignores costs nothing. It is kept until the
  // chapter marker is understood, not because it is believed to be read.
  stage: AREA_SEEDS.flatMap((seed) => seed.stage_ids.map((stage_id, index) => ({
    area_id: seed.id, stage_id, serial: index + 1,
  }))),
  // **[RECOVERED]** `achieve_reward` entries are
  // {area_id, achieve_cnt, gold, free_iap, iap, item_list[], card_list[]} and
  // `SetArea` reads them at the `ret_data` level. **`chest-rewards.md` §"SetArea
  // keys" lists them as a PER-AREA member instead** - the two readings are
  // genuinely ambiguous in the recovered notes, so BOTH forms are published
  // (top-level here, nested on each area record). That is the same precedent as
  // `stage[]`, which is also published both ways.
  //
  // **This array was EMPTY until 2026-10-03, and that empty array is the whole
  // "cannot receive the reward" bug.** `CSRSyncMStage::ReqRewardCB` (0xb3c674)
  // answers a claim by scanning `GetRewards()` and matching
  // `ret_data.achieve_cnt` against it (`:526-577`, `:531`/`:566`); with nothing
  // to match, `SetAchieveRewardReceived` never runs, `found` stays false,
  // `cb(-1, 0)` fires and `AchieveRewardCB` (0xe985c4) shows a Toast and nothing
  // else (`ghidra-chest-01-reward-route.txt:1776-1783`). The chest then never
  // reaches the *opened* sprite state either.
  achieve_reward: AREA_SEEDS.flatMap((seed) => areaAchieveRewards(seed.id, seed.stage_ids.length)),
};

// ---------------------------------------------------------------------------
// BOOT GUARD on the area ordinals. This one only needs `starterAreas`, so it
// runs here; the link-resolution guard needs `starterStages` and runs after it.
// ---------------------------------------------------------------------------

/** **[RECOVERED]** dense per-type ordinals - see `assertAreaSerials`. */
assertAreaSerials(starterAreas.area);

/** The published area record for `areaId`, if any. */
export function areaRecord(areaId: string): AreaRecord | undefined {
  return starterAreas.area.find((area) => area.id === areaId);
}

/**
 * **[RECOVERED]** `S = CSRGameStage::GetStageCnt(area_id)` - the number of
 * `stage[]` links the area publishes, and the multiplier behind the chest labels
 * `[S, 2S, 3S]` (`ShowReward` `:2539-2572`). Zero when the area is unknown.
 */
export function areaStageCount(areaId: string): number {
  return areaRecord(areaId)?.stage.length ?? 0;
}

/**
 * **[RECOVERED]** `CSRGameStage::GetRewards(area_id)`: the area's
 * `achieve_reward[]` entries, filtered on `ACHIEVE_REWARD.area_id`
 * (`ghidra-chest-03-getters.txt`, stride 0x34). `ReqRewardCB` iterates exactly
 * this list, so its `achieve_cnt` values are the only legal
 * `target_achieve_cnt` values.
 */
export function areaAchieveRewardList(areaId: string): AreaAchieveReward[] {
  return starterAreas.achieve_reward.filter((reward) => reward.area_id === areaId);
}

/** The one entry of `GetRewards(area)` whose `achieve_cnt` is `achieveCnt`. */
export function areaAchieveRewardEntry(areaId: string, achieveCnt: number): AreaAchieveReward | undefined {
  return areaAchieveRewardList(areaId).find((reward) => reward.achieve_cnt === achieveCnt);
}

/** Every stage id any published area links to. This is the key domain of
 * `CSRPlayData+0x27c` (`std::map<std::string, STAGE_INFO>`, keyed by stage id)
 * that `GetStageAchieveCnt` reads - see `state.ts`. */
export function linkedStageIds(): string[] {
  return [...new Set(starterAreas.stage.map((link) => link.stage_id))];
}

/**
 * Boot-time guard for the chest thresholds.
 *
 * Enforces the one invariant `chest-rewards.md` §3 states as "the whole bug in
 * one sentence": `achieve_reward[i].achieve_cnt == GetStageCnt(area) * (i+1)`,
 * and that the highest threshold is reachable - the player can only ever earn
 * `3` per stage (the star range `SetStageAchieve` is fed by, and the value the
 * client also writes as `bool[order] = 1` on its own stack), so a progress
 * total can reach `3 * S` and no further. A threshold above `3 * S` would be a
 * chest that can never unlock.
 */
export function assertAreaChestThresholds(): void {
  for (const area of starterAreas.area) {
    const stageCount = area.stage.length;
    const rewards = areaAchieveRewardList(area.id);
    if (area.id === "n_00" && stageCount === 0 && rewards.length === 0) continue;
    if (rewards.length !== FIXTURE_CHEST_COUNT) {
      throw new Error(`area "${area.id}" publishes ${rewards.length} achieve_reward entries but `
        + `CSRSceneMStageMap::ShowReward draws exactly ${FIXTURE_CHEST_COUNT} chests.`);
    }
    rewards.forEach((reward, index) => {
      const expected = stageCount * (index + 1);
      if (reward.achieve_cnt !== expected) {
        throw new Error(`area "${area.id}" achieve_reward[${index}].achieve_cnt is `
          + `${reward.achieve_cnt}, but ShowReward labels this chest ${expected} = `
          + `GetStageCnt(area)(${stageCount}) * (${index} + 1) and RequestReward sends the label as `
          + `target_achieve_cnt. A mismatch means the claim response can never match this entry.`);
      }
      if (!reward.item_list.length || !reward.item_list[0].id) {
        throw new Error(`area "${area.id}" achieve_reward[${index}] has no item. `
          + `CSRSceneMStageMap::PopUpClearReward (0xe964e0) returns early - and only logs, at trace `
          + `level 2 - when the reward's item strings are both empty, so the popup stays blank.`);
      }
    });
    if (rewards[FIXTURE_CHEST_COUNT - 1].achieve_cnt > stageCount * FIXTURE_CHEST_COUNT) {
      throw new Error(`area "${area.id}" publishes a chest threshold above the reachable maximum.`);
    }
  }
}

assertAreaChestThresholds();

/**
 * **[RECOVERED]** The valid keys of the client's battle-background environment
 * table, i.e. the `#ID` column of `analysis/recovered-data/environments.csv`
 * (50 rows, recovered byte-exact out of `LEVELING.jet` chunk 5 in the base-APK
 * assets; sha256
 * `0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c`).
 *
 * `CSRStaticData::LoadEnv` (0xf3bab0) reads that file through the two-branch
 * idiom shared with `LoadCommon`/`common.JSON`
 * (`SRLoadRawDataStr` from the local asset tree, or `CMCSVReader::Open` on the
 * CM database) and `__emplace_unique_key_args` inserts each row into the
 * `std::map<string, ENV_INFO>` at `CSRStaticData + 0x150`, keyed on column 0.
 * **The map is already populated on the device** - there is no
 * `File Load failed(ENVIRONMENTS)` / `Load failed %s` line anywhere in the
 * 22.8 MB `analysis/r015/logcat-all.txt`, against 495 other `[ERR]` lines - so
 * this list exists on the client and is reproduced here only so the replica
 * cannot publish a key that is guaranteed to miss.
 *
 * Note the asset namespace: column 2 (`PreFix`) is `STI000`, `STI099`,
 * `STI900`..., i.e. the ST*.jet art family **with an `I` inserted**. `ST001` is
 * a *stage* asset prefix and is not an environment id. That conflation is the
 * defect this constant replaces.
 *
 * Duplicated here on purpose, and cross-checked against the CSV by the
 * environment-key guard in `tests/smoke.ts`, so `server-ts` can reject an
 * invented id at boot without reading `analysis/` at runtime.
 */
export const RECOVERED_ENVIRONMENT_IDS: readonly string[] = [
  ...Array.from({ length: 20 }, (_, index) => String(index)),
  "99", "100", "200",
  "502", "503", "505", "512", "513", "515", "521", "523", "524", "525",
  "527", "528", "529", "530", "531", "533", "537",
  "801",
  ...Array.from({ length: 8 }, (_, index) => String(900 + index)),
  "998",
];

/**
 * **[FIXTURE]** The environment id(s) the stage fixture publishes as
 * `/reference/GetStage`'s `res_prefix`, overridable with
 * `BLUSTONE_STAGE_ENVIRONMENT_ID` as an A/B dial.
 *
 * **[RECOVERED] the mechanism this feeds.** `CSRGameBase::InitBackground`
 * (0x9cbe8c) does `CSRGameStage::GetStageData(this+0x220)`, reads
 * `*(stage+0x70)` (= `res_prefix`) and `*(stage+0x74)` (= its length), and
 * calls `OnInitBackground(this, key, rp)` with `key = res_prefix` when the
 * length is non-zero, else `key = this+0x220` (the stage id).
 * `CSRExploreMirage::InitBackground` (0x926778) is the same computation done
 * with an explicit `end()` check, and it logs
 * `'Cannot find environment Information(ID:%s)'` on a miss - a string that is
 * absent from `analysis/r015/logcat-all.txt`, so the mirage scene's override
 * (the one that would have named the offending key) did not run in r015.
 *
 * **[RECOVERED] why a miss is fatal rather than degraded.**
 * `CSRGameBase::OnInitBackground` (0x9cbf34) does
 * `std::map<string,ENV_INFO>::find(CSRStaticData+0x150, key)` and then reads
 * `node+0x34` (= `ENV_INFO.PreFix`) **without comparing the result against
 * `end()`** (`009bbf62 mov r5,r0` / `009bbf66 ldrb r0,[r5,#52]!`, no `cmp`
 * against the tree sentinel), then `CMFormat(buf, "%s_%s", PreFix, suffix)` for
 * each of the five depth bands (`MakeBackground` at node+0x44/0x50/0x5c/0x68/
 * 0x74). A miss therefore reads the tree's end-node, `PreFix` formats as `""`,
 * and the 30 layer names come out **prefixless**: `_A0.._A9`, `_D0.._D9`,
 * `_E0.._E9`, exactly the set in `analysis/r015/logcat-all.txt`.
 * `CSRGameScrollBGDraw::Load` (0x9c0444) attaches a `CMImageNode` child only in
 * the `else` of `if (CMImageNode::LoadAnim(...) == 0)`, so all 30 misses leave
 * its `vector<shared_ptr<CMImageNode>>` empty, and `OnUpdate` (0x9be8d8)
 * dereferences element [0] at ELF `0x9aebd7` with no emptiness check - the
 * r015 fault.
 *
 * **[FIXTURE] the VALUE: `"99"`.** Row 99 of the recovered CSV is
 * `ë°°í‹€` / *battle*, `PreFix STI099`. It is the right row for this scene on two
 * pieces of recovered evidence, not on taste:
 *
 *  1. It is the only row whose `Name` is the generic mode word "battle"; every
 *     other row is either a named map (`í•˜ì–€ìˆ²`, `ë ˆë¹„`, `ë ˆë² ì¹´`, `í…Œë””ë³´ë¨¸`, the
 *     `ë¬´ì €ê°±` abyss bosses), a named boss (`ëª¨ê¸€ë¦¬`, `ì œë¼ë“œ`, `í—¤ë¥´ë©”ìŠ¤`), or a
 *     named mode (`í˜‘íšŒì „` guild battle, `ë ˆì´ë“œ` raid, `í• ë¡œìœˆ` Halloween). A
 *     stage fixture with no real map identity behind it wants the generic row.
 *  2. Its five `ì†ë„` (scroll-speed) values are `-5, -10, +20, +30, -5`. Those
 *     are the **only positive speeds anywhere in the 50 rows** - every other
 *     row's speeds come from the map template `-5, -20, -40, -60, -20`. A
 *     background that scrolls in *both* directions on two of its five depth
 *     bands is a battle backdrop rather than a map backdrop, which is exactly
 *     what `CSRGameScrollBGDraw` exists for. (Checked by scanning all 50 rows:
 *     exactly one row has a positive speed, and it is 99.)
 *
 * `STI099` maps to `ST099.jet`, which exists in both
 * `analysis/extracted/assets` and the recovered PAD pack, so the row's art
 * family is at least present in this APK.
 *
 * **This is still only a KEY fix and the outcome is not claimed.** Whether
 * entries named `STI099_A0`, `STI099_D0`, ... exist in the PKGI1 name index is
 * **[UNKNOWN]**: entry names are not plaintext in any package in this corpus
 * (`analysis/research/environments-recovery.md` Â§4 row 7 scanned every chunk of
 * all 774 `.jet` files in both trees for `_A0` and got 16 hits, all binary false
 * positives in PNG/ATLAS pixel data; Â§7 records the consequence). A *miss* on
 * `find()` is proven; a *hit* is not. So this may move the failure from
 * "prefixless names" to "prefixed names that also do not resolve", which is a
 * different log signature, not necessarily a rendered frame. The oracle is that
 * the `[WRN] [Load] Cannot find The resource(` names must stop being prefixless.
 *
 * **THE CRASHING PATH IS NOT PROVEN TO READ THIS FIELD.**
 * `CSRSceneMEpisode::InitBackground` (0xb23e80) also calls `OnInitBackground`,
 * with `add.w r1, r6, #0x24` - i.e. `*(std::string*)(X + 0x24)` where `X` is
 * `CSRMEpisode::GetCombat()`'s returned `CSREpisodeData::COMBAT` record
 * (`GetCombat`, 0xb17712, is `*out = *(this+0x24); out[1] = *(this+0x28)`, i.e.
 * a `shared_ptr` getter), **not** the stage's `res_prefix`. If the r015 scene is
 * the episode scene, this fix cannot reach it: the COMBAT graph is built by
 * `CSRMEpisode::ReadJson(const string&)` (0xb1a8b0), which
 * `analysis/research/episode-route-table.md` Â§5 establishes is a **local JSON
 * resource, not a server route**. That is the honest blocker on this path and it
 * is not a `server-ts` defect. See the report for what would be needed.
 *
 * An id outside {@link RECOVERED_ENVIRONMENT_IDS} is refused at boot rather
 * than published, because a miss is silent and fatal - see the `throw` below.
 */
export const FIXTURE_STAGE_ENVIRONMENT_IDS: readonly string[] = (() => {
  const requested = (process.env.BLUSTONE_STAGE_ENVIRONMENT_ID ?? "").trim();
  if (!requested) return ["99"];
  const ids = requested.split(",").map((id) => id.trim()).filter(Boolean);
  for (const id of ids) {
    if (!RECOVERED_ENVIRONMENT_IDS.includes(id)) {
      throw new Error(
        `BLUSTONE_STAGE_ENVIRONMENT_ID="${id}" is not a row of analysis/recovered-data/environments.csv. `
        + `A value outside {${RECOVERED_ENVIRONMENT_IDS.join(",")}} cannot resolve: `
        + `CSRGameBase::OnInitBackground (0x9cbf34) does std::map<string,ENV_INFO>::find without testing end(), `
        + `so a miss reads the tree end-node, PreFix formats as "" and every background layer name becomes `
        + `prefixless - the empty vector<shared_ptr<CMImageNode>> that faults CSRGameScrollBGDraw::OnUpdate.`,
      );
    }
  }
  return ids;
})();

/**
 * One stage record.
 *
 * The native lookup key is `stage_id`; `id` is kept as a compatibility alias
 * for the debug/fixture contract and the two must stay aligned.
 */
function stageRecord(stageId: string, serial: number) {
  // Field set recovered from `CSRGameStage::SetStage` (0xa274d0) by resolving
  // its Thumb pc-relative string references in Ghidra. `id` is the identity the
  // native table is keyed on. `gold`, `order`, `type`, `value` and `item` were
  // all being read and were missing.
  return {
    id: stageId,
    ap_cost: 1,
    gold: 10,
    character_exp: 10,
    group_exp: LOCAL_CAMPAIGN_FIRST_CLEAR_TEAM_EXP,
    enemy_atk_per: 100,
    enemy_hp_per: 100,
    power: 1,
    title: "First Expedition",
    desc: "Local compatibility test encounter",
    // [RECOVERED] this field is the ENVIRONMENT SELECTOR on the battle-scene
    // path, not an art name: `CSRGameBase::InitBackground` (0x9cbe8c) reads
    // `stage+0x70` and hands it to `OnInitBackground`, which uses it as a
    // `std::map<string,ENV_INFO>` key. See
    // {@link FIXTURE_STAGE_ENVIRONMENT_IDS} for the full chain and for why a
    // value that is not a real row is fatal rather than degraded.
    res_prefix: FIXTURE_STAGE_ENVIRONMENT_IDS[0],
    // [RECOVERED] an ART name (the mission-map node thumbnail), not a selector.
    // It shares no namespace with `res_prefix` above or with the area's
    // `resource_id`; all three are separately named constants so one string can
    // never be published into two namespaces again.
    thumb: FIXTURE_STAGE_THUMB_ART,
    story_id: "",
    begin_dialog_id: "",
    end_dialog_id: "",
    achieve_condition: "[]",
    order: serial,
    type: 0,
    value: 0,
    // The stage's participant list. MakeStageInst builds each battle
    // participant and calls CSRCard::SetRefID with the instance's ref_id, so
    // this needs the full instance field set to be usable; it is still empty
    // because the array MakeStageInst actually iterates has not been
    // identified. Populating it changed nothing, so it stays empty rather than
    // carrying data known not to be read.
    item: [],
  };
}

/**
 * Stage identifiers the mission map could be using for its nodes.
 *
 * `n_01_01` was the one recovered from `CSRStaticData::GetStageID` and the only
 * one published until the client proved it did not match the node it was asked
 * to play: `CSRSyncMStage::RequestStart` asserts `sStageID.size() > 1` and the
 * request went out with an empty `stage_id`.
 *
 * **`BLUSTONE_CAMPAIGN=minimal` only.** `full` (the default) publishes the 50
 * RECOVERED `n_XX_YY` ids from `analysis/recovered-data/campaign-stages.csv`,
 * which is the game's real stage identity namespace. The `N0xx` names are
 * **PAD art filenames**, not stage ids, and keeping two namespaces alive at
 * once is what made "the campaign ends at `N003`" hard to see.
 */

/** Node identifiers the recovered PAD resource pack actually ships (art names). */
const PAD_NODE_IDS = [...LEGACY_PAD_NODE_IDS];

/** The one identifier recovered from `CSRStaticData::GetStageID` pre-campaign. */
const RECOVERED_STAGE_ID = LEGACY_RECOVERED_STAGE_ID;

/**
 * The published stage table.
 *
 * **[RECOVERED]** `full` publishes exactly the 50 ids of
 * `analysis/recovered-data/campaign-stages.csv` and nothing else. `minimal`
 * publishes the historical seventeen.
 *
 * ### Why 50 records are a DIFFERENT proposition from the 432-record sweep
 *
 * `AGENTS.md` §11 records that a 432-record, twelve-scheme identifier sweep made
 * the client resolve a node and then throw `std::out_of_range: vector` while
 * indexing. That is not a reason to publish fewer than 50 stages; it is a reason
 * to publish stages **exactly**:
 *
 *  1. **Every published id is the game's real identity.** `n_XX_YY` comes out of
 *     `LEVELING.jet` chunk 0 in the base APK, and `n_01_01` is independently
 *     confirmed by `CSRStaticData::GetStageID`. The sweep's ids were *guesses at
 *     naming schemes*, so every wrong record was an entry the native stage table
 *     had to key on and then fail to interpret.
 *  2. **Every published id is REFERENCED.** Each of the 50 is linked by exactly
 *     one area's `stage[]`, so each has a map node that asks for it. An id no
 *     map node can ask for can only ever be dead weight in a table the client
 *     indexes positionally.
 *  3. **The count is the real count.** 5 areas x 10 stages is what the shipped
 *     data says; the client has no expectation of 17 or 432 and derives its node
 *     count from `GetStageCnt(area)` per area, never from the total.
 *
 * `SetStage` (0xa274d0) walks `ret_data` itself and keys a
 * `std::vector<STAGE_INFO>` (stride `0xac`, `GetStageData` linear scan
 * comparing the string at `+0x1c`); the lookup is BY ID, not by index, so the
 * table's length is not itself a bound. The one index-sensitive reader is
 * `achieve[].order` in the `/mission/Complete` parser, which is clamped 1..3
 * (`AGENTS.md` §16.6 item 5) and is unrelated to this table.
 *
 * `BLUSTONE_CAMPAIGN=minimal` restores the seventeen-record table in one
 * environment variable if the wide table is ever shown to regress the map.
 */
export const starterStages = {
  // CSRGameStage::SetStage indexes the top-level `stage` collection before
  // parsing each record. `ret_data` IS the array - see `game-routes.ts`.
  stage: CAMPAIGN_MODE === "minimal"
    ? [
        ...PAD_NODE_IDS.map((stageId, index) => stageRecord(stageId, index)),
        stageRecord(RECOVERED_STAGE_ID, PAD_NODE_IDS.length),
      ]
    : CAMPAIGN_STAGE_ROWS.map((row) => stageRecord(row.stage, Number(row.stage.slice(-2)))),
};

/**
 * **[RECOVERED]** BOOT GUARD: every area's `stage[]` link must resolve to a
 * published `/reference/GetStage` record.
 *
 * This is the "stages do not load correctly" guard. `CSRSceneMStageMap::OnInit`
 * (0xe912ac `:158-164`) calls `GetStageAchieveCnt(link_string)` per link and
 * inserts the result into the ordered map, so a dangling link contributes 0
 * instead of raising anything: the progress total shrinks silently, and
 * tapping the node cannot produce a `stage_id` the client will accept. No
 * assertion and no log line - which is why it survived every round so far.
 */
assertAreaLinksResolve(starterAreas.area, new Set(starterStages.stage.map((stage) => stage.id)));

/** The published stage ids, for callers and tests. */
export function publishedStageIds(): string[] {
  return starterStages.stage.map((stage) => stage.id);
}

/**
 * THE single source of truth for monster identity in this replica.
 *
 * Three hops in the client have to agree on one string, and every one of them
 * was previously fed a different value. **[RECOVERED]** for each hop:
 *
 *  1. `CSRGameMob::AddStageMonster` (0xa0d194) reads the RECORD-level
 *     `show_thumbnail` (literal `0x01d76bed`, slot `0x00a0d874`, loaded at
 *     `0x00a0d50c`; re-resolved here with
 *     `tools/resolve-literals-offline.py --function a0d194:a0da00`), iterates it
 *     with `iter_impl` and runs `from_json<std::string>` on EACH ELEMENT
 *     (analysis/ghidra-enemycamp-decomp-05.txt:422-451 and :568-596), pushing
 *     each into `vector<std::string>`, which becomes
 *     `STAGE_MONSTER_LINK::ids` - the member at `node + 0x28` handed out by
 *     `CSRGameMob::GetStageMonsterLinkData` (0xa0cf38).
 *
 *     The type matters as much as the name. The type-tag switch at
 *     decomp-05.txt:431-451 only opens an iteration window for tag `0x2`
 *     (array) and `0x1` (object); every other tag - including a number, which is
 *     what the replica used to send - sets `begin == end` and yields ZERO
 *     elements. A JSON number here is not a malformed value, it is an empty
 *     vector.
 *
 *  2. `FUN_00b4a7a8` (0xb4a7a8, the `CSRSyncMStage::RequestMonsterRef`
 *     completion lambda) walks that `ids` vector FIRST and pushes every element
 *     for which `CSRGameMob::HasMonsterData()` is 0 into the `list` of
 *     `GET /reference/GetMonster` (analysis/ghidra-enemycamp-decomp-04.txt:52-92).
 *     So `show_thumbnail` - not the `ret_data` key - is the field that populates
 *     the request.
 *
 *  3. `CSRSyncMStage::ReqMonsterCB` (0xb4514c) iterates that route's `ret_data`
 *     into `CSRGameMob::AddMonster` (0xa0b540), whose FIRST resolved literal read
 *     is `_server` (`0x01d676bb`, loaded at `0x00a0b558`) and which is the string
 *     moved into the inserted `map<std::string, INFO>` pair.
 *     `CSRGameMob::GetMonsterData` (0xa0b43c) is the matching
 *     `std::map::find`, asserting at SRGameMob.cpp:38.
 *
 * **[FIXTURE] the VALUE.** `M001` is this replica's own monster id, chosen
 * because the recovered `M001.jet` resource pack ships it. The original
 * server's monster ids are recovered *content*, not recovered shape.
 *
 * The claim "`_server` (not `id`) is the `m_mMonsters` key" is an INFERENCE
 * from AddMonster taking no id argument, plus the `map<string,INFO>` signature
 * of the lookup. It is not airtight: the same literal slot at `0x00a0b874`
 * yields BOTH `_server` (`0x01d676bb`) and `id` (`0x01d676c3`) - they are
 * tail-merged four bytes apart, exactly like `_id`/`wave_list` in
 * `AddStageMonster`. To stay correct under every reading the decompile leaves
 * open, `starterMonsterFor` forces `_server`, `id`, `ref_id`, `res_prefix` and
 * the published object key to the SAME string.
 */
/**
 * **[RECOVERED]** the monster art namespace shipped by the recovered PAD pack:
 * `M001`..`M063` plus `M100`. Original packs M001.jet..M021.jet
 * each contain three actor namespaces; M008.jet owns M022/M023/M024.
 *
 * **It is published only as far as `BLUSTONE_MONSTER_IDS` asks for, and the
 * default is `M001` alone.** That is deliberate and is NOT an oversight:
 *
 *  - the record-level `show_thumbnail` array is what becomes
 *    `GET /reference/GetMonster`'s `list` (`FUN_00b4a7a8`, see the
 *    `FIXTURE_WAVE_REF_ID` block), so widening the published set widens the
 *    request the client makes on the ONE working battle path;
 *  - `AddMonster` (0xa0b540) emplaces one `std::map<std::string,INFO>` node per
 *    requested id, and twenty-two nodes where one was proven is an unmeasured
 *    change to the path that finally renders a battle (AGENTS.md §16).
 *
 * The namespace is therefore published as a **guarded, opt-in** widening: any id
 * outside this list is refused at boot, so the request can never name something
 * `/reference/GetMonster` will not answer - which is the `SRGameMob.cpp:38`
 * assert.
 */
export const RECOVERED_MONSTER_ART_IDS: readonly string[] = RECOVERED_MONSTER_NAMESPACES;

export const FIXTURE_MONSTER_IDS: readonly string[] = (() => {
  const requested = (process.env.BLUSTONE_MONSTER_IDS ?? "").trim();
  if (!requested) return ["M001"];
  const ids = requested.split(",").map((id) => id.trim()).filter(Boolean);
  for (const id of ids) {
    if (!RECOVERED_MONSTER_ART_IDS.includes(id)) {
      throw new Error(
        `BLUSTONE_MONSTER_IDS="${id}" is not in the recovered monster art namespace `
        + `{${RECOVERED_MONSTER_ART_IDS.join(",")}}. Actor IDs and owner pack basenames are separate, and `
        + `a wave whose \`ref_id\` names an unpublished monster asserts at SRGameMob.cpp:38 `
        + `(CSRGameMob::GetMonsterData is a std::map::find keyed on \`_server\`) and kills the process `
        + `31-45 ms later.`,
      );
    }
    requireSelectedMonsterArt(id);
  }
  return ids;
})();

/**
 * **[RECOVERED]** The wave records' `ref_id`, which is also the monster id.
 *
 * One string drives BOTH ends of the monster round trip, so it is derived from
 * `FIXTURE_MONSTER_IDS[0]` rather than written out again here: the published
 * `/reference/GetMonster` table is built from the same list, which is what makes
 * "requested but not published" impossible to reintroduce by editing one side.
 *
 * See {@link StageWave} for the recovered proof that `ref_id` reaches
 * `GET /reference/GetMonster`'s `list` and must therefore name a monster.
 */
export const FIXTURE_WAVE_REF_ID = FIXTURE_MONSTER_IDS[0];

/**
 * The value the wave `ref_id` had for the whole project history, reachable only
 * through `BLUSTONE_WAVE_REF_ID=card`.
 *
 * **[FIXTURE]** a card id, which is what produced the measured
 * `list=["M001","001"]` and the `SRGameMob.cpp(38)` miss
 * (analysis/testing/report-014.md sections 2.2, 2.3). Kept because it is the
 * control leg of the regression guard in `tests/smoke.ts`, and because it is
 * the exact string the native `list` is predicted to contain.
 */
export const LEGACY_WAVE_REF_ID = FIXTURE_CARD_ID;

/** One neutral encounter. Field vocabulary recovered from
 * `CSRGameMob::AddMonster`; numerical balance is a local fixture until a battle
 * capture validates it. Every identity field is forced to `monsterId` - see
 * {@link FIXTURE_MONSTER_IDS} for why. */
export function starterMonsterFor(monsterId: string) {
  return {
    // [RECOVERED] `_server` is the first literal `AddMonster` reads and is the
    // only candidate left by elimination for the `m_mMonsters` key. [INFERRED]
    // that it is the key rather than merely a field.
    _server: monsterId,
    // `id` is read too (tail-merged at 0x01d676c3). Kept equal to `_server`.
    id: monsterId,
    // `ref_id` is not among AddMonster's 63 resolved literals; harmless, kept
    // equal so no reader can see a conflicting identity.
    ref_id: monsterId,
    // [FIXTURE] the display name. `M001` keeps its historical title so the
    // default response is byte-identical to the pre-fix one.
    title: monsterId === "M001" ? "Snowfield Beast" : `${monsterId} Beast`,
    attr: 1,
    role: 1,
    // [RECOVERED] `res_prefix` is the actor namespace. Its owner package is
    // separate: M022_* animation records reside in M008.jet, not M022.jet.
    res_prefix: monsterId,
    rank: 1,
    level: 1,
    overcome: 0,
    // [FIXTURE] balance numbers. Provisional placeholders, not recovered data.
    hp: "100",
    atk: "10",
    def: "5",
    crt_chance: "0",
    crt_dmg: "100",
    penetration: "0",
    block_chance: "0",
    block_dec_dmg: "0",
    attr_enhance: "0",
    attr_resist: "0",
    hp_page: "100",
    skill_start_time: 0,
    skill_list: [],
    battle_skill_effect: [],
  };
}

export type MonsterRecord = ReturnType<typeof starterMonsterFor>;

/** The default monster, kept as a named export for readers of the old fixture. */
export const starterMonster = starterMonsterFor("M001");

/**
 * What `/reference/GetMonster` publishes, keyed by exactly the ids that
 * `/reference/GetTargetStageMonster` asks for in `show_thumbnail`.
 *
 * **[RECOVERED]** the published object key is read by NOTHING.
 * `CSRSyncMStage::ReqMonsterCB` (0xb4514c) iterates `ret_data` and passes each
 * ITERATED VALUE to `AddMonster`, which takes one parameter and no key
 * (mangled `_ZN10CSRGameMob10AddMonsterERKN8nlohmann10basic_json...`); the key of
 * the map is built inside `AddMonster` from `_server`. In nlohmann, iterating an
 * object yields its values, so an object with three keys and an array with one
 * element are indistinguishable to that parser.
 *
 * **This is why the old `{M001, "001", ""}` triple was inert.** All three
 * pointed at the SAME object, whose `_server` was `"M001"`, so
 * `__emplace_unique_key_args` (`analysis/ghidra-enemycamp-decomp-03.txt:9396`)
 * inserted one node and dropped the other two. Publishing under `001` or `""`
 * could never create `m_mMonsters["001"]` or `m_mMonsters[""]`; it only ever
 * cost two wasted `AddMonster` calls. It is replaced here by the published set
 * being derived from the same `FIXTURE_MONSTER_IDS` list that fills
 * `show_thumbnail`, so hop 2 and hop 3 cannot drift apart again.
 *
 * The pre-fix table is kept below as `starterMonsterTableLegacy`.
 */
export const starterMonsterTable: Record<string, MonsterRecord> = Object.fromEntries(
  FIXTURE_MONSTER_IDS.map((id) => [id, starterMonsterFor(id)]),
);

/**
 * The pre-2026-10-02-2 monster table, kept as evidence per project convention:
 * the known-good monster published under three keys, all sharing one `_server`.
 *
 * Behaviourally IDENTICAL to {@link starterMonsterTable} - see the note above -
 * which is why replacing it cannot confound the `show_thumbnail` A/B. The `""`
 * key existed only because the client once asked for `""`
 * (`game-values /reference/GetMonster {"list":"[\"\",\"\",\"\",\"\",\"\"]"}`,
 * byte-identical across report-001..report-011); report-011 shows it no longer
 * does. The `"001"` key was added for the wave `ref_id`, which is a CARD id and
 * was never a monster key.
 */
export const starterMonsterTableLegacy: Record<string, MonsterRecord> = {
  M001: starterMonster,
  "001": starterMonster,
  "": starterMonster,
};

/**
 * Stage -> wave monsters.
 *
 * **[RECOVERED]** `CSRSyncMStage::ReqTargetStageMonsterCB` (0xb4606c) reads
 * `ret_data`, iterates it, and passes `iteration_proxy_value::key()` plus the
 * iterated value to `CSRGameMob::AddStageMonster(stageId, json)`. So `ret_data`
 * is an OBJECT keyed by stage id - see `analysis/native-target-stage-cb.txt`.
 * Confirmed already correct in the fixture below.
 *
 * **[RECOVERED] `AddStageMonster` (0xa0d194) reads the RECORD-LEVEL array under
 * the literal `wave_list` (0x1d76bd5), and it is an array of WAVES, each of
 * which is an array of monster records.** Read off the instruction listing
 * `analysis/ghidra-hasmonster-08-asm-addstagemonster-emplace.txt`:
 *
 * ```
 * 00a0d1b0  ldr r1,[0x00a0d4f4]   ; add r1,pc @0xa0d1b8  -> 0x1d76bd5 'wave_list'
 * 00a0d1ce  bl 0x007930f8          ; operator[](param_2, "wave_list")
 * 00a0d1de  ldrb r1,[r0,#0x0]      ; type tag of wave_list
 * 00a0d256  add r1,sp,#0x70 ; mov r0,r9(sp+0x9c) ; bl 0x0072af38   ; OUTER loop  ==
 * 00a0d266  bl 0x0072aff0                                 ; OUTER deref -> a WAVE
 * 00a0d2a6  strd r0,r5,[sp,#0x44]  ; second window ON THE WAVE ITSELF
 * 00a0d2d8  mov r0,r4(sp+0x54) ; mov r1,r8(sp+0x44) ; bl 0x0072af38   ; INNER loop  ==
 * 00a0d2e8  bl 0x0072aff0                                 ; INNER deref -> a MONSTER
 * 00a0d304  bl 0x007930f8          ; operator[](monster, "ref_id")
 * 00a0d34a  bl 0x007930f8          ; operator[](monster, "group")
 * 00a0d398  bl 0x007930f8          ; operator[](monster, "next_spawn_ms")
 * 00a0d42c  ldr r0,[sp,#0x54] ; ldrb r0,[r0,#0x0] ; cmp #0x2 ; beq 0x00a0d2d2
 *                                     ; INNER increment over the WAVE (stride 0x10)
 * 00a0d4b6  ldr r0,[sp,#0x9c] ; ldrb r0,[r0,#0x0] ; cmp #0x2 ; beq 0x00a0d250
 *                                     ; OUTER increment over wave_list
 * 00a0d480  bl 0x00a0e4ac          ; __push_back_slow_path<vector<STAGE_MONSTER>>
 *                                     ;  ONE PUSH PER ELEMENT OF wave_list
 * ```
 *
 * The OUTER dereference (`0xa0d266`) is itself iterated by the INNER loop
 * (`0xa0d2d8`), which is what makes `wave_list` two-deep. One
 * `vector<STAGE_MONSTER>` is pushed per outer element (`0xa0d480`), matching
 * `STAGE_MONSTER_LINK::waves` being `vector<vector<STAGE_MONSTER>>`.
 *
 * **`_id` IS NOT READ BY `AddStageMonster`.** RETRACTION of the earlier claim in
 * this comment: the offline resolver reports
 * `ldr@0x00a0d1b0 slot=0x00a0d4f4 add_pc=0x00a0d1b8 -> '_id'`, but that pairing
 * is an artefact of the resolver's window swallowing
 * `00a0d1aa ldr r0,[0x00a0d4f0]` / `00a0d1b4 add r0,pc`, which is the
 * `__stack_chk_guard` canary load - a DIFFERENT slot. The load at `0xa0d1b0`
 * is consumed only by `00a0d1b8 add r1,pc`, giving `wave_list`. The decisive
 * evidence is the call census over the whole function body: there are exactly
 * **five** `bl 0x007930f8` (`basic_json::operator[]`) sites, at `0xa0d1ce`,
 * `0xa0d304`, `0xa0d34a`, `0xa0d398`, `0xa0d512` - `wave_list`, `ref_id`,
 * `group`, `next_spawn_ms`, `show_thumbnail` - and no sixth. `_id` is kept as an
 * inert alias of `wave_list` because dropping it could only be a regression,
 * never a gain.
 *
 * **DEFECT FOUND + FIXED 2026-10-02-2 (fix agent): the flat shape shipped until
 * today is what leaves `waves` empty.** The record used to publish
 * `wave_list: [monster]`. Under the loop above that makes the INNER loop
 * iterate the five MEMBERS of the monster object (`_id`, `ref_id`, `group`,
 * `next_spawn_ms`, `show_thumbnail`) instead of the monsters of a wave, and then
 * call `operator[](<a string or a number>, "ref_id")` at `0xa0d304`.
 * nlohmann's `operator[](const char*)` on a non-object throws
 * `type_error.305` ("cannot use operator[] with a string argument"), and
 * `AddStageMonster` has no handler: the unwind skips `0xa0d480`
 * (`__push_back_slow_path`) and `0xa0d69c` (`__emplace_unique_key_args`), so
 * `STAGE_MONSTER_LINK` is never even constructed. The shape is now
 * `wave_list: [[monster]]`.
 *
 * **[RECOVERED] per-monster field types** (the switches at `0xa0d34e` /
 * `0xa0d39c` are `subs r1,#0x3 ; cmp r1,#0x4 ; bhi <default>` with
 * `00a0d38e movs r0,#0x0`, i.e. a TOTAL `get<int>()`-style read that cannot
 * throw):
 *
 * | field | read as | required JSON type | throwing? |
 * |---|---|---|---|
 * | `ref_id` | `from_json<std::string>` (`bl 0x00728b08` @ `0xa0d310`) | **string**, non-empty | yes, `type_error.302` |
 * | `group` | `tbb` switch, default `0` (`0xa0d34e`..`0xa0d38e`) | number (string/bool also parse) | no |
 * | `next_spawn_ms` | `tbb` switch, default `0`, then `vmul.f32` by the constant at `0xa0d4f8` (`0xa0d3ec`) | number | no |
 * | `show_thumbnail` (record level only) | iterated, `from_json<std::string>` per element (`0xa0d5ac`) | **array of strings** | yes, `type_error.302` |
 *
 * **`show_thumbnail` is read at RECORD level, after the wave loop** (`0xa0d512`
 * is reached only from `0xa0d260 bne.w 0x00a0d50c`, the outer loop's exit). The
 * per-wave copy carried below is therefore inert; it is kept because
 * `AddStageMonster` is the only reader of this record.
 *
 * ## THE WAVE `ref_id` MUST BE A MONSTER ID - fixed 2026-10-02-3
 *
 * **[RECOVERED] WHY.** `ref_id` is the first 12 bytes of the 20-byte
 * `STAGE_MONSTER` (`AddStageMonster` 0xa0d194: stores at `0xa0d3fc str
 * r1,[r0,#0x8]` / `0xa0d3fe vstr.64 d16,[r0]`, stride `0x14` set at
 * `0xa0d410`). `FUN_00b4a7a8` (0xb4a7a8) - the builder of
 * `GET /reference/GetMonster`'s `list` - walks BOTH vectors out of
 * `GetStageMonsterLinkData` and appends to the SAME list head (`sp+0x24`) and
 * the SAME counter (`sp+0x2c`). The second loop's inner stride is `0x14`:
 *
 * ```
 *  54: 00b4a830  ldrd r8,r9,[sp,#0xc]    ; waves.begin / waves.end   (sp+0x0c)
 *  60: 00b4a842  add.w r8,r8,#0xc        ; 12 bytes == vector<STAGE_MONSTER>
 *  63: 00b4a84a  ldrd r5,r10,[r8,#0x0]   ; r5 = this wave's STAGE_MONSTER
 *  74: 00b4a864  adds r5,#0x14           ; *** 20 bytes == STAGE_MONSTER ***
 *  79: 00b4a870  bl 0x00a0b428           ; HasMonsterData(r5)  ON THE WAVE RECORD
 *  87: 00b4a886  bl 0x006d7efc           ; basic_string copy ctor from r5 (ref_id!)
 *  77: 00b4a85c  str r4,[sp,#0x24]       ; *** the SAME list head ***
 *  80: 00b4a862  str r0,[sp,#0x2c]       ; *** the SAME counter ***
 * ```
 *
 * (Evidence: `analysis/research/ids-second-element.md` sections 4-5, quoting
 * `analysis/ghidra-ids-01-asm-fun-b4a7a8.txt`; the first loop, over `ids`,
 * stride `0x0c`, is the `show_thumbnail` array.)
 *
 * **=> `list` = `ids` UNION {every wave record's `ref_id`}.**
 * With `ids = ["M001"]` and `ref_id = "001"` the replica shipped exactly the
 * two-element request measured in `analysis/testing/report-014.md` section 2.2,
 * `{"list":"[\"M001\",\"001\"]","pvid":"1000001"}`, and `"001"` is a CARD id with
 * no node in `m_mMonsters`; `CSRGameMob::GetMonsterData` (0xa0b43c) therefore
 * missed at `SRGameMob.cpp(38)` and the process died 31-45 ms later. One entry
 * from each loop, nothing left over.
 *
 * **So `ref_id` is set from `FIXTURE_MONSTER_IDS[0]`, below, and must never be
 * set back to a card id.** Two consequences, both deliberate:
 *
 *  1. `GetMonsterData` is a `std::map<string, INFO>::find` keyed on `_server`,
 *    so a wave `ref_id` that is not a published monster id asserts. The monster
 *    id is the only class of string that resolves.
 *  2. The set of DISTINCT ids the client asks for collapses to one. Stated
 *    honestly: the recovered builder has NO de-duplication - it pushes every
 *    element whose `HasMonsterData` is 0 - so the request itself most likely
 *    carries `["M001","M001"]`. Two identical ids are harmless
 *    (`/reference/GetMonster` publishes one node, `AddMonster` emplaces once).
 *    What matters, and what this fix delivers, is that no UNRESOLVABLE id is
 *    requested any more.
 *
 * **DO NOT "fix" this by adding a card id to `show_thumbnail`, and DO NOT
 * publish a monster under `_server: "001"`.** Both were considered and both are
 * wrong, for one reason: loop 2 still requests the wave `ref_id` itself, so an
 * unresolvable id is asked for regardless of what the other two tables contain.
 * The assert would MOVE rather than clear. That is the shape of every failed
 * round in this project.
 *
 * **THE CARD-vs-MONSTER CONFLICT IS NOT SOLVED - IT IS SCOPED.** `ref_id` has
 * two consumers with conflicting wants:
 *
 * - `CSRCard::SetRefID` wants a CARD id (a `CSRCard::INFO` lookup). Rounds that
 *   pointed `ref_id` at `M001` saw one `sRefID.length() > 0` assertion
 *   (SRCard.cpp:731) per enemy.
 * - `CSRGameMob::GetMonsterData` wants a MONSTER id. **This is the one MEASURED
 *   to be the live blocker** (report-014: `list=["M001","001"]`, the
 *   `SRGameMob.cpp(38)` assert, the fault 31-45 ms later). It is what this fix
 *   targets.
 *
 * The five `SRCard.cpp(731)` assertions carried in AGENTS.md section 11 live in
 * a DIFFERENT camp map - `this+0x250`, the player deck built from
 * `CSRUserDB::GetDeck()` - whereas the crash site of this investigation is
 * `this+0x264`, the enemy camp. **So this fix must not be expected to clear
 * the `SetRefID` assertions; it is scoped to the enemy camp.** In the original
 * data both wants are satisfied at once because the server published an id that
 * is simultaneously a card id and a monster id - one string, two tables. The
 * replica does not have that overlap, and it must not be invented here: the
 * overlap is recovered CONTENT, not recovered SHAPE. Which real id has both
 * meanings is UNKNOWN and stays open.
 *
 * The wave's own `_id` remains `${stageId}_${monsterId}`: a separate field on a
 * separate JSON object, unique per stage. It is a DIFFERENT field from the
 * record-level `_id` array above; they do not collide.
 */
export type StageWave = {
  _id: string;
  ref_id: string;
  group: number;
  next_spawn_ms: number;
  /**
   * **[RECOVERED] an ARRAY OF MONSTER-ID STRINGS.**
   *
   * `AddStageMonster` (0xa0d194) reads exactly three keys off a monster record -
   * `ref_id`, `group`, `next_spawn_ms` - and calls `operator[]` on the monster
   * itself for each. `show_thumbnail` is read at RECORD level only (`0xa0d512`,
   * reached from the outer loop's exit at `0xa0d260`), so this per-monster copy
   * is **inert**. It is kept because `AddStageMonster` is the only reader of this
   * record, and the existing `show_thumbnail` round-trip guard checks both.
   */
  show_thumbnail: string[];
};

export type StageMonsterRecord = {
  /**
   * **[RECOVERED] `wave_list` is `vector<vector<STAGE_MONSTER>>` in JSON form:
   * an array of waves, each wave an array of monster records.**
   *
   * Read off the loop nest in
   * `analysis/ghidra-hasmonster-08-asm-addstagemonster-emplace.txt` - the OUTER
   * dereference of `wave_list` (`0xa0d266`) is what the INNER loop iterates
   * (`0xa0d2d8`), and one `vector<STAGE_MONSTER>` is pushed per outer element
   * (`0xa0d480`, `bl 0x00a0e4ac`). A FLAT `StageWave[]` makes the inner loop
   * walk the monster object's own members and call `operator[](<scalar>,
   * "ref_id")`, which nlohmann answers with a throwing `type_error.305`.
   * See the block comment above for the full instruction trace.
   */
  wave_list: StageWave[][];
  /**
   * Inert alias of {@link StageMonsterRecord.wave_list}.
   *
   * `_id` exists in `.rodata` tail-merged four bytes before `wave_list`
   * (0x1d76bd1 / 0x1d76bd5) and `tools/resolve-literals-offline.py` reports it,
   * but that is a pairing artefact: the only `add pc` consuming the
   * `0x00a0d4f4` load at `0xa0d1b0` is the one at `0xa0d1b8`, which yields
   * `wave_list`. The five-`operator[]`-call census over the whole body
   * (0xa0d1ce, 0xa0d304, 0xa0d34a, 0xa0d398, 0xa0d512) has no sixth site.
   * Kept as an alias so no future reader can mistake its absence for a removal.
   */
  _id: StageWave[][];
  /**
   * **[RECOVERED] THE FIELD THAT FEEDS `GET /reference/GetMonster`.**
   *
   * `AddStageMonster` (0xa0d194) iterates this with `iter_impl` and applies
   * `from_json<std::string>` to each element
   * (analysis/ghidra-enemycamp-decomp-05.txt:422-451, :568-596), building the
   * `vector<std::string>` that becomes `STAGE_MONSTER_LINK::ids`. `FUN_00b4a7a8`
   * walks exactly that vector (decomp-04.txt:52-92, first loop, stride 0x0c) and
   * pushes every element for which `HasMonsterData()` is 0 into the request
   * `list`.
   *
   * So the elements must be non-empty JSON STRINGS naming monsters the
   * monster table can resolve, and they must match the ids published by
   * `/reference/GetMonster` (`starterMonsterTable`, built from the same
   * `FIXTURE_MONSTER_IDS`).
   */
  show_thumbnail: string[];
};

/**
 * One monster record: an element of a WAVE, not of `wave_list`.
 *
 * **[RECOVERED]** the `operator[]` targets at `0xa0d304` / `0xa0d34a` /
 * `0xa0d398` are the value produced by the INNER dereference `0xa0d2e8`, i.e.
 * a monster inside a wave. Field types are fixed by the reads:
 * `ref_id` goes through `from_json<std::string>` (`bl 0x00728b08` at `0xa0d310`)
 * and therefore **must be a JSON string**; `group` and `next_spawn_ms` go
 * through the total `tbb` switch at `0xa0d34e` / `0xa0d39c`
 * (`subs r1,#0x3 ; cmp r1,#0x4 ; bhi` -> `movs r0,#0`), which accepts a number,
 * a numeric string or a bool and **cannot throw**.
 *
 * **[RECOVERED] `ref_id` is ALSO a monster id - see the block comment on
 * {@link FIXTURE_WAVE_REF_ID} above.** The 12 bytes this string occupies in the
 * 20-byte `STAGE_MONSTER` are what `FUN_00b4a7a8`'s second loop (`0xb4a864`,
 * stride `0x14`) appends to `GET /reference/GetMonster`'s `list`, so a value
 * that is not a published monster id asserts at `SRGameMob.cpp(38)`.
 */
function wave(stageId: string, monsterId: string): StageWave {
  // [FIXTURE] the monster record's own `_id`. [RECOVERED] shape is a string (it
  // is copied through `basic_string`); the value is a fixture composition of
  // stage and monster ids, not recovered content. NOTE: this per-monster `_id`
  // is a DIFFERENT field from the record-level `_id` alias above and from the
  // `wave_list` key; nothing reads any of the three.
  return {
    _id: `${stageId}_${monsterId}`,
    // **[FIXTURE] the value; [RECOVERED] the ROLE, which is the whole point of
    // this line.** `ref_id` is the first 12 bytes of `STAGE_MONSTER`, so the
    // native wave loop in `FUN_00b4a7a8` (`0xb4a870 bl 0x00a0b428
    // HasMonsterData`, stride `0x14`) puts it into the `GetMonster` request
    // `list` verbatim, and `CSRGameMob::GetMonsterData` (0xa0b43c) then resolves
    // it against `m_mMonsters` with `std::map<string,INFO>::find` on `_server`.
    // It MUST therefore be a MONSTER id from `FIXTURE_MONSTER_IDS`, not the
    // card id - shipping `"001"` produced the measured two-id request
    // `["M001","001"]` and the `SRGameMob.cpp(38)` miss
    // (analysis/testing/report-014.md). Do not "repair" a missing monster by
    // editing `show_thumbnail` or the published monster table; the wave loop
    // requests THIS field.
    //
    // The competing `CSRCard::SetRefID` consumer wants a card id here and is
    // NOT satisfied by this value. That conflict is unresolved and scoped: see
    // the block comment above `FIXTURE_WAVE_REF_ID`.
    ref_id: monsterId,
    // [FIXTURE] value; [RECOVERED] type (number, read by the `tbb` switch).
    group: 1,
    // [FIXTURE] value; [RECOVERED] type (number, scaled by the float constant
    // loaded from slot 0x00a0d4f8 at `0xa0d3ec`).
    next_spawn_ms: 0,
    // [RECOVERED] array (see above); [FIXTURE] contents.
    show_thumbnail: [...FIXTURE_MONSTER_IDS],
  };
}

/** One stage's record: a single wave holding a single monster. */
function stageMonsterRecord(stageId: string): StageMonsterRecord {
  // [FIXTURE] one wave of one monster. The NESTING is [RECOVERED] (see
  // `StageMonsterRecord.wave_list`); the counts are fixture content. The wave's
  // `ref_id` is `FIXTURE_WAVE_REF_ID` - the MONSTER id - because the native
  // wave loop in `FUN_00b4a7a8` requests it verbatim and
  // `CSRGameMob::GetMonsterData` can only resolve a monster id.
  const waves: StageWave[][] = [[wave(stageId, FIXTURE_WAVE_REF_ID)]];
  return { _id: waves, wave_list: waves, show_thumbnail: [...FIXTURE_MONSTER_IDS] };
}

/**
 * Every stage id any published area links to, which is exactly the set of ids
 * `/reference/GetTargetStageMonster` can be asked for.
 *
 * **[RECOVERED]** before this change the three tables below were keyed by a
 * hard-coded `["N001","N002","N003","n_01_01"]`. `n_01_02`..`n_05_10` therefore
 * had **no entry at all**, and `game-routes.ts` fell back to borrowing
 * `n_01_01`'s waves. The fallback preserves the shape so nothing crashes, but
 * "the server has no wave record for the stage you tapped" is precisely the
 * "stages do not load correctly" symptom, and it was invisible: the fallback
 * answers 200 with a perfectly well-formed nested wave array.
 *
 * Every linked stage now has a REAL entry, so a request for any published
 * stage is a table hit rather than a fallback.
 */
const STAGE_IDS_WITH_WAVES = linkedStageIds();

export const starterStageMonsters: Record<string, StageMonsterRecord> =
  Object.fromEntries(
    STAGE_IDS_WITH_WAVES.map((id) => [id, stageMonsterRecord(id)]),
  );

/**
 * Stage -> wave records keyed by MONSTER id, flat, with no `wave_list` wrapper.
 *
 * **[RECOVERED]** `BLUSTONE_STAGE_MONSTER_KEY=monster_id` (the default).
 * The key of each top-level `ret_data` entry is load-bearing and is read here
 * straight off `iteration_proxy_value::key()` in
 * `CSRSyncMStage::ReqTargetStageMonsterCB` (0xb4606c, decompiled at
 * analysis/ghidra-enemycamp-decomp-04.txt:1153-1168):
 *
 *     while (iter(...) != end) {
 *         pbVar3 = iteration_proxy_value::key(&local_58);   // the KEY
 *         pbVar4 = iter_impl::operator*(&local_58);        // the VALUE
 *         CSRGameMob::AddStageMonster(this, pbVar3, pbVar4);   // (key, value)
 *     }
 *
 * and `AddStageMonster` (0xa0d194) consumes that key argument as the map key:
 * it builds `std::map<string, STAGE_MONSTER_LINK>` and calls
 * `__emplace_unique_key_args<string, pair<string, STAGE_MONSTER_LINK>>`
 * (analysis/ghidra-enemycamp-decomp-05.txt:470-473) with a `basic_string`
 * copy-constructed from `param_1` - the key argument, decomp-05.txt:458-460.
 *
 * RETRACTED 2026-10-02 (this block previously asserted the opposite, on the
 * authority of `FUN_00b4a7a8`): the map KEY is NOT what the client pushes into
 * `GET /reference/GetMonster`'s `list`. `FUN_00b4a7a8`
 * (analysis/ghidra-enemycamp-decomp-04.txt:52-92; full listing
 * `analysis/ghidra-ids-01-asm-fun-b4a7a8.txt`) calls
 * `CSRGameMob::GetStageMonsterLinkData` and walks TWO out-vectors into the SAME
 * list head: first the stride-`0x0c` `vector<std::string>` -
 * `STAGE_MONSTER_LINK::ids`, which `AddStageMonster` built from the record-level
 * `show_thumbnail` array - and then the `vector<vector<STAGE_MONSTER>>` of
 * waves at an inner stride of `0x14`, i.e. **each wave record's `ref_id`**
 * (`0xb4a870 bl 0x00a0b428 HasMonsterData`, `0xb4a886` string copy,
 * `0xb4a85c str r4,[sp,#0x24]`). So `list` = `ids` UNION {wave `ref_id`s}. See
 * the block comment above {@link FIXTURE_WAVE_REF_ID} and
 * `analysis/research/ids-second-element.md` sections 4-5. The map key merely
 * selects which entry is read out (`GetStageMonsterLinkData`, 0xa0cf38,
 * decomp-05.txt:6-62), and when the requested key is absent the client silently
 * substitutes the WHOLE aggregate table instead.
 *
 * The on-device A/B (analysis/testing/report-011.md) is consistent with this and
 * cannot separate the two: `BLUSTONE_STAGE_MONSTER_KEY=monster_id` moved the
 * crash and the assertion count, `=stage_id` reproduced the old bytes, but both
 * runs still sent a scalar `show_thumbnail`, so `ids` was empty in both and the
 * only strings available to the second loop were the wave `ref_id`s.
 *
 * The key mode is therefore kept as an A/B axis (it is the one variable
 * report-011 proved to be causally live) but it is no longer believed to be the
 * source of the requested ids.
 *
 * **[RECOVERED] AND THIS KEY IS ALSO THE ONLY WAY THE LINK MAP CAN BE FOUND -
 * the second half of the empty-`waves` defect (fix agent, 2026-10-02-2).**
 * `CSRMStage::MakeStageInst` (0xb33f84) calls
 * `CSRGameMob::GetStageMonsterLinkData(this+0x220)` (`0xb34b18`), and
 * `this+0x220` is the scene's own **stage-id string**
 * (`analysis/ghidra-camp-02-insn-full-makestageinst.txt`: `0xb34026 add.w
 * r10,r9,#0x220` -> `0xb34198 str.w r10,[sp,#0x1c]` -> `0xb34686 ldr.w
 * r11,[sp,#0x1c]` -> `0xb34b16 mov r2,r11`). `GetStageMonsterLinkData` (0xa0cf38)
 * then does
 *
 * ```
 * 00a0cfxx  __count_unique(map@CSRGameMob+0xc, stageId)  -> uVar1
 *           if (uVar1 == 0)  { return CSRGameMob+0x18 / +0x24 }    // FALLBACK
 *           else              { __find_equal(...); if (!node) "map::at:  key not found";
 *                                return node+0x1c / node+0x28; }  // waves / ids
 * ```
 * (analysis/ghidra-enemycamp-decomp-05.txt:20-56; the `map::at:  key not found`
 * literal `0x01d694f3` is resolved in `ghidra-camp-07-literals-getlink.txt`).
 * The `else` branch throws if the key is missing, which is what proves
 * `uVar1 != 0` means "key present" - so `uVar1 == 0` means **absent**, and the
 * accessor silently returns the two FALLBACK vectors at `CSRGameMob+0x18` /
 * `+0x24`, for which `analysis/research/enemy-camp-writer.md` Q3 found **no
 * writer anywhere**. A miss is therefore indistinguishable from "no waves":
 * `waves` is empty, `MakeStageInst` takes `beq.w 0x00b34e88` at `0xb34b28`,
 * never creates the `"enemy"` key, and faults at `0xb3507a str r0,[r1,#0x4c]`.
 *
 * The map is keyed by the `ret_data` OBJECT key (`AddStageMonster` param_1, see
 * above) and the lookup key is the STAGE ID. So the response **must** publish
 * the record under the requested stage id or the lookup can never hit. That is
 * why `BLUSTONE_STAGE_MONSTER_KEY` gained the value `both` (now the default):
 * the monster-id key that `5acb45e` proved is causally live is still published
 * first, and the stage id is published alongside it. The pre-fix bytes remain
 * reachable as `BLUSTONE_STAGE_MONSTER_KEY=monster_id`.
 *
 * `wave_list` IS a real key, and it is the ONLY wave-array key: `_id` is a
 * resolver pairing artefact (five `operator[]` calls in the body, none of them
 * `_id`). See `StageMonsterRecord.wave_list`.
 *
 * Honesty note: the SHAPE is recovered. The choice of key `M001` is a FIXTURE
 * decision - it is our own monster id, chosen because `M001` is already in the
 * monster table and is the id the recovered `M001.jet` resource pack ships. The
 * original server's key set is recovered *content*, not recovered shape.
 */
export const starterStageMonstersByMonsterId: Record<string, StageMonsterRecord> =
  Object.fromEntries(
    STAGE_IDS_WITH_WAVES.map((id) => [id, stageMonsterRecord(id)]),
  );

/**
 * The pre-2026-10-02 shape, kept as evidence: `ret_data` keyed by STAGE id,
 * each value wrapping the wave array under `wave_list` (and `_id`).
 *
 * Reachable with `BLUSTONE_STAGE_MONSTER_KEY=stage_id`. Superseded because the
 * report-011 A/B showed the monster-keyed shape is the live one. Retained per
 * project convention: reverted experiments stay as evidence.
 */
export const starterStageMonstersByStageId: Record<string, StageMonsterRecord> =
  Object.fromEntries(
    STAGE_IDS_WITH_WAVES.map((id) => [id, stageMonsterRecord(id)]),
  );
