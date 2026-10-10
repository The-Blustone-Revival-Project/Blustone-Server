/**
 * THE RECOVERED CAMPAIGN  (added 2026-10-03, progression implementation agent)
 * ===========================================================================
 *
 * ## What this replaces, and why
 *
 * Until this module existed, `/reference/GetStage` published seventeen records
 * in TWO INCOMPATIBLE ID NAMESPACES and `/reference/GetArea` published TWO
 * areas:
 *
 *   - `N001`..`N013`, `N500`..`N502` - inferred from PAD **art filenames**
 *     (`N001.jet`...), published as stage RECORDS;
 *   - `n_01_01` - the real `CSRStaticData::GetStageID` id, published in the AREA
 *     LINKS;
 *   - `n_00` (Village, 1 link) and `n_01` (Snowfield, 3 links `N001 N002 N003`).
 *
 * The result is a campaign that **ends**: after `N003` there is no next stage,
 * no next area and nothing to cruise to. That is the user-visible "you cannot
 * progress in the cruise at the airport at all" report, and it is a CONTENT
 * defect, not a shape defect.
 *
 * ## What is recovered here
 *
 * `analysis/recovered-data/campaign-stages.csv`, extracted from `LEVELING.jet`
 * chunk 0 in the base APK: **50 stages, `n_01_01`..`n_05_10`, exactly ten per
 * area across `n_01`..`n_05`**, with sequential `pv` ids `1100001..1100050`.
 * Every row is transcribed verbatim below. This is the game's real stage
 * identity namespace; nothing here is invented.
 *
 * ## THE `serial` COLUMN IS NOT PUBLISHED VERBATIM - and here is why
 *
 * The CSV's `serial` column runs `1,2,3,4,5,6,7,8,9,0` for every one of the
 * five areas - the tenth row is `0` in **all five**, not only `n_05_10`. Two
 * readings are possible and the evidence does not settle it:
 *
 *  - **[UNRESOLVED]** it is a per-stage FLAG and `0` marks the area's boss /
 *    final node (the brief's original reading, drawn from `n_05_10` alone);
 *  - **[UNRESOLVED]** it is the CSV's own 0-based column and the `0` is a
 *    wrap artefact of the extractor.
 *
 * What *is* recovered is that `CSRGameStage::STAGE_LINK` is
 * `{int32 serial; std::string id;}` - **serial first, then the id**
 * (`STAGE_LINK` is 0x1c = 28 bytes = 7 words; `CSRSceneMStageMap::OnInit`
 * (0xe912ac) reads `*piVar8` as the serial and `piVar8 + 4` as the string, and
 * advances `piVar8 += 7`) - and that `OnInit` inserts
 * `(serial -> GetStageAchieveCnt(id))` into an **ordered** `std::map<int,int>`
 * (`native-stage-map-scene.txt:158-194`: `_tree_balance_after_insert`, and the
 * descent `while (piVar11[4] <= iVar9)` compares against the map's key).
 *
 * So the link serial is the map's ORDERING KEY, not a flag. Publishing the CSV
 * value `0` for the tenth stage would sort that node BEFORE serial 1 and move
 * it to the leftmost map position. The replica therefore publishes
 * **`serial = 1..10`, position order**, which is:
 *
 *  - the only shape ever MEASURED to render a correct mission map
 *    (report-011/report-012/report-013/report-015/report-017 all used 1..N);
 *  - consistent with `ShowReward`'s `S = GetStageCnt(area)` and the
 *    `S, 2S, 3S` chest arithmetic, which is index-based;
 *  - and `[FIXTURE]`, honestly labelled, rather than pretending the CSV's `0`
 *    is understood.
 *
 * `CAMPAIGN_STAGE_ROWS` keeps the CSV's own `serial` column so the discrepancy
 * stays visible and a future reader can revisit it.
 *
 * ## The other CSV columns are NOT published on the wire
 *
 * `global` (`aamt1w`, `vuedyb`, ...) and `cmge` (`q1gmu9`, `6lehxa`, ...) are
 * six-character obfuscated tokens from the same chunk. Their namespace is
 * **[UNKNOWN]** - they are not the pad stage ids, not the monster ids and not
 * the `pv` column - so nothing is sent that the client has not asked for.
 * `pv` (`1100001..1100050`) is a plausible server-side row id but is likewise
 * **[UNRESOLVED]**: it is deliberately NOT published as `story_id`, because
 * `story_id` indexes a dialogue table and a wrong id there is a load fault
 * rather than a cosmetic error.
 */

/** One transcribed row of `analysis/recovered-data/campaign-stages.csv`. */
export interface CampaignStageRow {
  /** **[RECOVERED]** The stage id. `n_XX_YY`, the real `GetStageID` identity. */
  readonly stage: string;
  /** **[RECOVERED]** The owning area id. */
  readonly area: string;
  /** **[RECOVERED]** The CSV's own serial column. See the header note: it is
   *  `1..9, 0` for every area and is **not** what the replica publishes. */
  readonly serial: number;
  /** **[RECOVERED, [UNRESOLVED] namespace]** obfuscated token, not published. */
  readonly global: string;
  /** **[RECOVERED, [UNRESOLVED] namespace]** obfuscated token, not published. */
  readonly cmge: string;
  /** **[RECOVERED, [UNRESOLVED] role]** sequential 1100001..1100050, not published. */
  readonly pv: number;
}

/**
 * **[RECOVERED]** all 50 rows of `analysis/recovered-data/campaign-stages.csv`,
 * in file order. The test suite re-reads that CSV and asserts these rows match
 * it exactly, so this table cannot silently drift away from the evidence.
 */
export const CAMPAIGN_STAGE_ROWS: readonly CampaignStageRow[] = [
  { stage: "n_01_01", area: "n_01", serial: 1, global: "aamt1w", cmge: "q1gmu9", pv: 1100001 },
  { stage: "n_01_02", area: "n_01", serial: 2, global: "vuedyb", cmge: "6lehxa", pv: 1100002 },
  { stage: "n_01_03", area: "n_01", serial: 3, global: "v51ol6", cmge: "cn5lqy", pv: 1100003 },
  { stage: "n_01_04", area: "n_01", serial: 4, global: "s8rbeb", cmge: "yq7nga", pv: 1100004 },
  { stage: "n_01_05", area: "n_01", serial: 5, global: "2c3a58", cmge: "4qz3jf", pv: 1100005 },
  { stage: "n_01_06", area: "n_01", serial: 6, global: "j8y9u5", cmge: "uw8a48", pv: 1100006 },
  { stage: "n_01_07", area: "n_01", serial: 7, global: "fnjp79", cmge: "u6149n", pv: 1100007 },
  { stage: "n_01_08", area: "n_01", serial: 8, global: "4sug23", cmge: "waht3h", pv: 1100008 },
  { stage: "n_01_09", area: "n_01", serial: 9, global: "ypb1ec", cmge: "nxhpkz", pv: 1100009 },
  { stage: "n_01_10", area: "n_01", serial: 0, global: "yx5n5y", cmge: "o9mcf1", pv: 1100010 },
  { stage: "n_02_01", area: "n_02", serial: 1, global: "5t7yoy", cmge: "c94eyq", pv: 1100011 },
  { stage: "n_02_02", area: "n_02", serial: 2, global: "xer516", cmge: "g8o597", pv: 1100012 },
  { stage: "n_02_03", area: "n_02", serial: 3, global: "w8hjlh", cmge: "1v28az", pv: 1100013 },
  { stage: "n_02_04", area: "n_02", serial: 4, global: "okdorg", cmge: "pylq3f", pv: 1100014 },
  { stage: "n_02_05", area: "n_02", serial: 5, global: "oaa5pu", cmge: "63awsj", pv: 1100015 },
  { stage: "n_02_06", area: "n_02", serial: 6, global: "qjpiz7", cmge: "si1mvy", pv: 1100016 },
  { stage: "n_02_07", area: "n_02", serial: 7, global: "slemy6", cmge: "55z1d3", pv: 1100017 },
  { stage: "n_02_08", area: "n_02", serial: 8, global: "74aem6", cmge: "c1cnbc", pv: 1100018 },
  { stage: "n_02_09", area: "n_02", serial: 9, global: "5u04ym", cmge: "6dd47o", pv: 1100019 },
  { stage: "n_02_10", area: "n_02", serial: 0, global: "ta6hbq", cmge: "xfhrlp", pv: 1100020 },
  { stage: "n_03_01", area: "n_03", serial: 1, global: "9queip", cmge: "uaq21p", pv: 1100021 },
  { stage: "n_03_02", area: "n_03", serial: 2, global: "3wpokg", cmge: "u4xb22", pv: 1100022 },
  { stage: "n_03_03", area: "n_03", serial: 3, global: "y6jw2s", cmge: "emgr85", pv: 1100023 },
  { stage: "n_03_04", area: "n_03", serial: 4, global: "p8bbtu", cmge: "br4ywn", pv: 1100024 },
  { stage: "n_03_05", area: "n_03", serial: 5, global: "a71pab", cmge: "ur8315", pv: 1100025 },
  { stage: "n_03_06", area: "n_03", serial: 6, global: "fabmzg", cmge: "ekjyw0", pv: 1100026 },
  { stage: "n_03_07", area: "n_03", serial: 7, global: "jvghq1", cmge: "q7glf8", pv: 1100027 },
  { stage: "n_03_08", area: "n_03", serial: 8, global: "fcp4mo", cmge: "rz4qpn", pv: 1100028 },
  { stage: "n_03_09", area: "n_03", serial: 9, global: "f42gqf", cmge: "8qc9ec", pv: 1100029 },
  { stage: "n_03_10", area: "n_03", serial: 0, global: "hv2wiw", cmge: "t93b0f", pv: 1100030 },
  { stage: "n_04_01", area: "n_04", serial: 1, global: "kw1nwn", cmge: "3vqxv1", pv: 1100031 },
  { stage: "n_04_02", area: "n_04", serial: 2, global: "uuu822", cmge: "2phfwb", pv: 1100032 },
  { stage: "n_04_03", area: "n_04", serial: 3, global: "f0lb18", cmge: "ftymt0", pv: 1100033 },
  { stage: "n_04_04", area: "n_04", serial: 4, global: "hx2m1i", cmge: "s9w8i9", pv: 1100034 },
  { stage: "n_04_05", area: "n_04", serial: 5, global: "tuldk6", cmge: "wtu6gh", pv: 1100035 },
  { stage: "n_04_06", area: "n_04", serial: 6, global: "otfttm", cmge: "vg3mj7", pv: 1100036 },
  { stage: "n_04_07", area: "n_04", serial: 7, global: "c01ulo", cmge: "2o30b1", pv: 1100037 },
  { stage: "n_04_08", area: "n_04", serial: 8, global: "ua6mxt", cmge: "a78g9h", pv: 1100038 },
  { stage: "n_04_09", area: "n_04", serial: 9, global: "3zdtox", cmge: "x1kp4t", pv: 1100039 },
  { stage: "n_04_10", area: "n_04", serial: 0, global: "nmwfcl", cmge: "wzdxbq", pv: 1100040 },
  { stage: "n_05_01", area: "n_05", serial: 1, global: "wafp53", cmge: "v20ych", pv: 1100041 },
  { stage: "n_05_02", area: "n_05", serial: 2, global: "vqootg", cmge: "rhcxiq", pv: 1100042 },
  { stage: "n_05_03", area: "n_05", serial: 3, global: "quaket", cmge: "g9hvyp", pv: 1100043 },
  { stage: "n_05_04", area: "n_05", serial: 4, global: "9x6ug0", cmge: "l8hczt", pv: 1100044 },
  { stage: "n_05_05", area: "n_05", serial: 5, global: "ybmlzr", cmge: "35nimc", pv: 1100045 },
  { stage: "n_05_06", area: "n_05", serial: 6, global: "fni2dm", cmge: "x2yeid", pv: 1100046 },
  { stage: "n_05_07", area: "n_05", serial: 7, global: "bcmj1a", cmge: "mskz4y", pv: 1100047 },
  { stage: "n_05_08", area: "n_05", serial: 8, global: "j8jg5h", cmge: "rg3hpe", pv: 1100048 },
  { stage: "n_05_09", area: "n_05", serial: 9, global: "tcn7gy", cmge: "nw8g2b", pv: 1100049 },
  { stage: "n_05_10", area: "n_05", serial: 0, global: "t7lo6k", cmge: "1yvfxa", pv: 1100050 },
];

/** **[RECOVERED]** the five expedition area ids, in campaign order. */
export const RECOVERED_CAMPAIGN_AREA_IDS: readonly string[] =
  ["n_01", "n_02", "n_03", "n_04", "n_05"];

/** **[RECOVERED]** the 50 stage ids, in campaign order. */
export const RECOVERED_CAMPAIGN_STAGE_IDS: readonly string[] =
  CAMPAIGN_STAGE_ROWS.map((row) => row.stage);

/** **[RECOVERED]** ten stages per expedition area, from the CSV's `area` column. */
export const RECOVERED_CAMPAIGN_STAGE_COUNT = 10;

/**
 * **[RECOVERED]** the *cruise scene's* second recovered field: `AREA_INFO+0x44`
 * is the area `type`, and `CSRGameStage::GetAreaCnt(AREA_INFO::TYPE)` is a
 * linear count of it (`0x00a295da`: stride 0x48, `*(piVar1 = iVar3 + 0x44) ==
 * param_2`). `CSRSceneAreaSel::SetData` (0xe7360c `:267-269`) stores
 * `this->0x65c = GetAreaCnt(param_2)` - i.e. **the number of cruise
 * destination buttons IS the number of areas of that type** - and
 * `CSRSceneAreaSel::OnButtonClick` (0xe741dc `:553-555`) always enters the
 * cruise with `SetData(this, 1)`. So **the cruise destination list is exactly
 * the areas whose `type` is `1`.**
 */
export const RECOVERED_CRUISE_AREA_TYPE = 1;

/**
 * **[RECOVERED]** `AREA_INFO+0x3c` is the area's PER-TYPE ORDINAL, and
 * `GetAreaData(AREA_INFO::TYPE, int)` (0x00a296f0) matches on it:
 *
 * ```
 * iVar7 = puVar8[0x11];  bVar9 = iVar7 == param_2;      // +0x44 == type
 * if (bVar9) iVar7 = puVar8[0xf];                       // +0x3c == index
 * if (bVar9 && iVar7 == param_3) break;
 * puVar8 = puVar8 + 0x12;                                // stride 0x48
 * ```
 *
 * `SetAreaState` (0xe75cdc `:952, :977-978, :998`) then indexes
 * `*(this+0x768) + area->0x3c * 8` with it - the button array built by the
 * `0..GetAreaCnt` loop. **A gap in this ordinal makes every area after it
 * unresolvable**, because `GetAreaData(type, i)` returns the shared EMPTY
 * record on a miss rather than throwing. `assertAreaSerials()` enforces it.
 *
 * Which recovered JSON key fills `+0x3c` is **[INFERRED] `serial`**: it is the
 * only per-area integer field in `SetArea`'s recovered key set that is not
 * `level_limit` (which is `+0x40`, compared against `GetUserLevel()` at `:965`),
 * and the ordinal semantics fit it exactly. It is the same inference the
 * existing fixture already made.
 */
export const RECOVERED_AREA_ORDINAL_FIELD = "serial";

/**
 * **[RECOVERED]** `AREA_INFO+0x40` is `level_limit`, and it is a REAL GATE:
 * `CSRSceneAreaSel::SetAreaState` (0xe75cdc `:962-974`) reads
 * `CSRPlayData::GetUserLevel()` and, if `userLevel < area.level_limit`, writes
 * `false` into the cloud/lock map keyed by `area->0x3c` - the "locked" sprite.
 *
 * **Why the replica publishes `level_limit: 0` on every area** - a *safety
 * constraint, not a recovered value*. `/lobby/Enter` publishes no `level` key
 * for the user, so `CSRPlayData::GetUserLevel()` reads an unmodelled value; a
 * non-zero `level_limit` would therefore lock every area at ordinal >= 2 behind
 * a number the server does not publish, and the campaign would be unreachable
 * for a reason that has nothing to do with progression. This is the same class
 * of decision as the `achieve[].order` 1..3 clamp in AGENTS.md §16.6 item 5: a
 * bounded value chosen so an unmodelled input cannot gate content shut.
 * `BLUSTONE_AREA_LEVEL_LIMIT` re-introduces a ladder for A/B.
 */
export const FIXTURE_AREA_LEVEL_LIMIT = Number.parseInt(
  (process.env.BLUSTONE_AREA_LEVEL_LIMIT ?? "0").trim() || "0", 10);

export type CampaignMode = "full" | "minimal";

/**
 * `BLUSTONE_CAMPAIGN=full|minimal`, default **`full`**.
 *
 * - `full` - the recovered campaign: five expedition areas `n_01..n_05`, ten
 *   `n_XX_YY` stage links each, plus the village `n_00`. **Default**, because it
 *   is the only mode in which the cruise has more than one destination and the
 *   campaign has somewhere to go after `N003`.
 * - `minimal` - the pre-2026-10-03 fixture byte-for-byte: areas `n_00` +
 *   `n_01(N001 N002 N003)` and the seventeen published stage records. Kept so
 *   any regression in the 50-record table is recoverable in ONE environment
 *   variable with no code edit.
 */
export function campaignMode(): CampaignMode {
  const raw = (process.env.BLUSTONE_CAMPAIGN ?? "full").trim().toLowerCase();
  if (raw === "minimal") return "minimal";
  if (raw === "full") return "full";
  throw new Error(
    `BLUSTONE_CAMPAIGN="${process.env.BLUSTONE_CAMPAIGN}" is not a known mode. `
    + `Use "full" (the recovered 5-area / 50-stage campaign, the default) or `
    + `"minimal" (the pre-2026-10-03 two-area fixture: n_00 + n_01 with N001..N003).`,
  );
}

/**
 * The **pre-2026-10-03** stage table, kept intact as the `minimal` mode and as
 * evidence per project convention (reverted experiments stay as evidence).
 *
 * **[RECOVERED]** ids only, and only of the sixteen PAD **art filenames**
 * (`N001.jet`..`N013.jet`, `N500.jet`..`N502.jet` in the recovered pack) plus the
 * one real `GetStageID` id. **None of them is the campaign's stage identity**,
 * which is why this mode is a fixture and not content.
 */
export const LEGACY_PAD_NODE_IDS: readonly string[] = [
  ...Array.from({ length: 13 }, (_unused, index) => `N${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 3 }, (_unused, index) => `N${String(500 + index).padStart(3, "0")}`),
];

/** **[RECOVERED]** the single real `CSRStaticData::GetStageID` id that was known
 *  before the campaign CSV existed. Still linked from the village area `n_00`. */
export const LEGACY_RECOVERED_STAGE_ID = "n_01_01";

/**
 * **`minimal` mode's** stage-id list: the sixteen pad art names plus the one
 * recovered `n_01_01`.
 */
export const LEGACY_STAGE_IDS: readonly string[] = [...LEGACY_PAD_NODE_IDS, LEGACY_RECOVERED_STAGE_ID];

/** The stage ids `minimal` mode publishes. */
export function minimalStageIds(): readonly string[] {
  return LEGACY_STAGE_IDS;
}

/**
 * The stage ids `full` mode publishes: the 50 recovered campaign ids.
 *
 * The village area `n_00` links `n_01_01`, which is also `n_01`'s first link.
 * That overlap is inherited from the pre-existing fixture (`n_00` must publish
 * at least one link or `GetStageCnt(n_00) == 0` and its three chests become
 * permanently locked and un-claimable - see `areaAchieveRewards`) and is
 * harmless: the link count that matters for the map and the chest arithmetic is
 * per-area, and `n_01_10` is what actually gates `n_02`.
 */
export function fullStageIds(): readonly string[] {
  return RECOVERED_CAMPAIGN_STAGE_IDS;
}

/** Every stage id a published area links to, per mode. */
export function stageIdsForMode(mode: CampaignMode = campaignMode()): readonly string[] {
  return mode === "minimal" ? minimalStageIds() : fullStageIds();
}

/**
 * Boot-time guard: **every area's `serial` must be a dense `0..N-1` run within
 * its own `type`**.
 *
 * `GetAreaData(type, i)` matches `AREA_INFO+0x3c == i` for
 * `i in [0, GetAreaCnt(type))`, so a duplicate or missing ordinal silently
 * returns the shared EMPTY record (`0x00a296f0:153-189`) rather than throwing -
 * and every consumer of that record (`SetMarker`, `SetAreaState`,
 * `DisappearCloud`) then reads offsets off an empty std::string.
 */
export function assertAreaSerials(
  areas: ReadonlyArray<{ id: string; type: number; serial: number }>,
): void {
  const byType = new Map<number, Map<number, string[]>>();
  for (const area of areas) {
    if (!Number.isSafeInteger(area.serial) || area.serial < 0) {
      throw new Error(`area "${area.id}" publishes serial ${area.serial}; AREA_INFO+0x3c is read `
        + `unsigned and matched against the loop index, so a negative value can never resolve.`);
    }
    let bucket = byType.get(area.type);
    if (!bucket) byType.set(area.type, (bucket = new Map()));
    const owners = bucket.get(area.serial) ?? [];
    owners.push(area.id);
    bucket.set(area.serial, owners);
  }
  for (const [type, bucket] of byType) {
    for (const [ordinal, owners] of bucket) {
      if (owners.length > 1) {
        throw new Error(
          `areas ${owners.map((id) => `"${id}"`).join(" and ")} both publish ordinal ${ordinal} within `
          + `type ${type}. GetAreaData(type, i) (0x00a296f0) returns the FIRST area whose `
          + `AREA_INFO+0x3c == i, so the second one is unreachable from the cruise: its button is `
          + `built but SetAreaState / SetMarker / DisappearCloud all read the first area's record. `
          + `Two areas sharing an ordinal is a silent content loss, not a crash.`,
        );
      }
    }
    const ordinals = [...bucket.keys()].sort((a, b) => a - b);
    for (let index = 0; index < ordinals.length; index += 1) {
      if (ordinals[index] !== index) {
        const gap = ordinals.filter((value) => value > index)[0];
        throw new Error(
          `areas of type ${type} publish ordinals ${ordinals.join(",")} but `
          + `GetAreaData(type, i) is called for i in [0, ${ordinals.length}) and matches `
          + `AREA_INFO+0x3c == i. Ordinal ${index} is held by ${(bucket.get(index) ?? ["<nobody>"]).join(", ")} `
          + `and ordinal ${gap} by ${(bucket.get(gap) ?? []).join(", ")}, so every lookup for `
          + `i in [${index}, ${ordinals.length}) returns the shared EMPTY area record instead of an area. `
          + `CSRSceneAreaSel::SetMarker / SetAreaState / DisappearCloud then read offsets off an empty `
          + `std::string.`,
        );
      }
    }
  }
}

/**
 * Boot-time guard: **every `stage[]` link must resolve to a published stage
 * record.**
 *
 * `CSRSceneMStageMap::OnInit` (0xe912ac `:158-164`) calls
 * `CSRPlayData::GetStageAchieveCnt(link_string)` for every link and inserts the
 * result into the ordered map; a link with no record simply contributes 0, so
 * the progress total and the chest arithmetic silently shrink instead of
 * failing. That is exactly the "stages do not load correctly" class of report,
 * and it is invisible in the log.
 */
export function assertAreaLinksResolve(
  areas: ReadonlyArray<{ id: string; stage: ReadonlyArray<{ stage_id: string; serial: number }> }>,
  publishedStageIds: ReadonlySet<string>,
): void {
  for (const area of areas) {
    if (area.stage.length < 1) {
      throw new Error(`area "${area.id}" publishes no stage[] link. GetStageCnt(area) is the chest `
        + `multiplier S and the mission map's node count, so S == 0 makes all three chests permanently `
        + `locked and the map empty.`);
    }
    for (const link of area.stage) {
      if (!publishedStageIds.has(link.stage_id)) {
        throw new Error(`area "${area.id}" links stage "${link.stage_id}" but /reference/GetStage `
          + `publishes no record with that id. SetStage keys the native stage table on \`id\`, so the `
          + `link resolves to nothing: GetStageAchieveCnt contributes 0, the progress total shrinks `
          + `silently, and tapping the node cannot start a mission.`);
      }
    }
  }
}