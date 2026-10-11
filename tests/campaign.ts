import { repositoryPath } from "../src/paths.js";
/**
 * THE RECOVERED CAMPAIGN  (added 2026-10-03, progression implementation agent)
 * ===========================================================================
 *
 * ## The two user-visible bugs this pins
 *
 *  - **"stages do not load correctly"**
 *  - **"you cannot progress in the cruise at the airport at all"**
 *
 * Neither was a response-shape bug. `/reference/GetStage` and
 * `/reference/GetArea` were shaped correctly and the client read them; what they
 * said was **a campaign that ends.** Two areas, four stages, no fifth
 * destination and no stage after the last one. The second is the cruise:
 * `CSRSceneAreaSel::SetData` (0xe7360c `:267-269`) sets
 * `this->0x65c = GetAreaCnt(type)` and `OnButtonClick` (0xe741dc `:553-555`)
 * always enters with `type == 1`, so **the cruise offers exactly one button per
 * published area of type 1**, minus the ordinal-0 origin node
 * (`SetMarker`, `native-area-index.txt:337`, `SetVisible(button, i != 0)`).
 * Two type-1 areas = **one** destination.
 *
 * ## How to see these tests FAIL against the old fixture
 *
 * `BLUSTONE_CAMPAIGN=minimal npm test` reproduces the pre-2026-10-03 tables
 * byte-for-byte (`n_00` + `n_01` with `N001 N002 N003`, seventeen stage
 * records) and this file then fails on sections 1, 2 and 6. That is the
 * demonstration: no code has to be reverted to prove the tests bite.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  CAMPAIGN_MODE,
  FIXTURE_AREA_BACKDROP_ART,
  RECOVERED_CAMPAIGN_AREA_IDS,
  RECOVERED_CAMPAIGN_STAGE_COUNT,
  RECOVERED_CAMPAIGN_STAGE_IDS,
  RECOVERED_ENVIRONMENT_IDS,
  RECOVERED_MONSTER_ART_IDS,
  FIXTURE_MONSTER_IDS,
  areaStageCount,
  areaAchieveRewards,
  assertAreaBackdropArt,
  publishedStageIds,
  starterAreas,
  starterMonsterTable,
  starterStageMonstersByMonsterId,
  starterStageMonstersByStageId,
  starterStages,
} from "../src/bootstrap.js";
import {
  assertAreaLinksResolve,
  assertAreaSerials,
  campaignMode,
} from "../src/campaign.js";
import { gameResponse } from "../src/game-routes.js";
import { ServerState, isAreaUnlocked, EXPEDITION_CRUISE_AREAS, EXPEDITION_CRUISE_DESTINATIONS } from "./legacy-state-fixture.js";

// ---------------------------------------------------------------------------
// 0. THE EVIDENCE. Re-read the recovered CSV rather than trusting the table in
//    `src/campaign.ts`, so the two cannot drift apart silently.
// ---------------------------------------------------------------------------
const workspace = path.resolve(process.cwd(), "..");
const csvText = readFileSync(
  repositoryPath("resources", "reference", "recovered-data", "campaign-stages.csv"), "utf8");
const csvRows = csvText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .slice(1)
  .map((line) => {
    const [stage, area, serial, global, cmge, pv] = line.split(",");
    return {
      stage: stage.trim(), area: area.trim(), serial: Number(serial.trim()),
      global: global.trim(), cmge: cmge.trim(), pv: Number(pv.trim()),
    };
  });

assert.equal(csvRows.length, 50,
  "analysis/recovered-data/campaign-stages.csv must still hold 50 data rows");
assert.deepEqual([...RECOVERED_CAMPAIGN_STAGE_IDS], csvRows.map((row) => row.stage),
  "RECOVERED_CAMPAIGN_STAGE_IDS must be exactly the `stage` column of campaign-stages.csv");
assert.deepEqual([...RECOVERED_CAMPAIGN_AREA_IDS],
  [...new Set(csvRows.map((row) => row.area))],
  "the five recovered expedition area ids must be exactly the `area` column's distinct values");

// ===========================================================================
// 1. EVERY PUBLISHED STAGE ID IS IN THE RECOVERED CSV.
//    `full` publishes the 50 recovered ids and nothing else.
// ===========================================================================
// ===========================================================================
// 1. EVERY PUBLISHED STAGE ID IS IN THE RECOVERED CSV.
//    `full` publishes the 50 recovered ids and nothing else.
//    (The mode assertion itself is deliberately LAST, at section 10, so that
//    running this file under BLUSTONE_CAMPAIGN=minimal fails on the SUBSTANTIVE
//    assertions below rather than on a label.)
// ===========================================================================
{
  const csvIds = new Set(csvRows.map((row) => row.stage));
  const published = publishedStageIds();
  assert.equal(published.length, 50,
    `/reference/GetStage must publish exactly the 50 recovered campaign records; it publishes `
    + `${published.length}. Every id in it must be a row of campaign-stages.csv - an invented id is `
    + `a node the native stage table keys on and cannot interpret.`);
  assert.equal(new Set(published).size, published.length,
    "the published stage ids must be unique; SetStage keys a std::vector<STAGE_INFO> on `id`");
  for (const id of published) {
    assert.ok(csvIds.has(id),
      `published stage "${id}" is not a row of analysis/recovered-data/campaign-stages.csv. `
      + `Only the \`n_XX_YY\` namespace is the game's real stage identity: N001..N013/N500..N502 are `
      + `PAD ART FILENAMES, and publishing them as stage RECORDS is what made the campaign end at `
      + `N003.`);
  }
  // The pre-2026-10-03 fiction must be GONE from the default table.
  for (const legacy of ["N001", "N002", "N003", "N500"]) {
    assert.ok(!published.includes(legacy),
      `published stage "${legacy}" is a PAD art filename, not a recovered stage id. It is only `
      + `published in BLUSTONE_CAMPAIGN=minimal.`);
  }
}

// ===========================================================================
// 2. EVERY AREA'S stage[] HAS EXACTLY TEN LINKS WITH serial 1..10.
// ===========================================================================
assert.equal(RECOVERED_CAMPAIGN_STAGE_COUNT, 10,
  "[RECOVERED] the campaign has exactly ten stages per expedition area");
for (const area of starterAreas.area) {
  const isVillage = area.id === "n_00";
  const expected = isVillage ? 0 : RECOVERED_CAMPAIGN_STAGE_COUNT;
  assert.equal(area.stage.length, expected,
    `area "${area.id}" publishes ${area.stage.length} stage[] links; the recovered campaign gives `
    + `every expedition area exactly ten. GetStageCnt(area) is the node count AND the chest `
    + `multiplier S, so a wrong link count silently moves every chest threshold.`
    + (isVillage ? " n_00 is the hidden origin and owns no playable stage." : ""));
  if (isVillage) continue;
  // serial must be dense and 1-based: STAGE_LINK's serial is the ORDERING key of
  // the ordered std::map<int,int> that CSRSceneMStageMap::OnInsert fills.
  assert.deepEqual(area.stage.map((link) => link.serial),
    Array.from({ length: expected }, (_unused, index) => index + 1),
    `area "${area.id}" links must carry serial 1..${expected} in order. The CSV's own serial column `
    + `is 1..9,0 and is NOT what the client needs: STAGE_LINK is {int32 serial; std::string id} and `
    + `OnInit inserts (serial -> GetStageAchieveCnt(id)) into an ORDERED std::map<int,int>, so a 0 `
    + `would sort before 1 and move the final node to the left of the map.`);
  for (const link of area.stage) {
    assert.equal(link.area_id, area.id,
      `link ${link.stage_id} in area "${area.id}" must carry that area's own area_id`);
  }
}

// Native return routing must have one campaign area owner per stage. The
// historical origin duplicate let a Snowfield victory return to Village.
{
  const origin = starterAreas.area.find((area) => area.id === "n_00")!;
  assert.equal(origin.serial, 0);
  assert.deepEqual(origin.stage, [], "the hidden origin must not steal a playable stage");
  assert.deepEqual(origin.achieve_reward, [], "the hidden origin has no zero-threshold chests");
  assert.deepEqual(areaAchieveRewards("n_00", 0), []);
  assert.throws(() => areaAchieveRewards("n_01", 0), /at least one stage/,
    "a visible destination still requires stages for meaningful chest thresholds");
  assert.ok(!starterAreas.achieve_reward.some((row) => row.area_id === "n_00"));
  const nested = starterAreas.area.flatMap((area) => area.stage);
  assert.equal(nested.length, 50, "exactly the recovered50 playable links, with no origin duplicate");
  assert.equal(new Set(nested.map((link) => link.stage_id)).size, 50);
  assert.deepEqual(starterAreas.stage, nested, "both published link forms must preserve the same unique ownership");
  for (const row of csvRows) {
    const owners = nested.filter((link) => link.stage_id === row.stage);
    assert.equal(owners.length, 1, `${row.stage} must have exactly one native return destination`);
    assert.equal(owners[0].area_id, row.area, `${row.stage} belongs to its recovered CSV area`);
  }
}

// The specific row the brief called out, asserted explicitly so it is documented.
{
  const n05 = starterAreas.area.find((area) => area.id === "n_05");
  assert.ok(n05, "n_05 must be published");
  assert.equal(n05.stage.length, 10);
  assert.equal(n05.stage[9].stage_id, "n_05_10",
    "n_05's tenth link is the recovered n_05_10");
  const csvRow = csvRows.find((row) => row.stage === "n_05_10");
  assert.ok(csvRow, "campaign-stages.csv must still carry n_05_10");
  assert.equal(csvRow.serial, 0,
    "[RECOVERED] campaign-stages.csv gives n_05_10 serial 0 - the brief's \"probably a boss node\" "
    + "reading. It is [UNRESOLVED]: the SAME 0 appears in the tenth row of ALL FIVE areas, and "
    + "STAGE_LINK's serial is an ordering key, so the replica publishes 10. See campaign.ts.");
  assert.equal(n05.stage[9].serial, 10,
    "...and the replica publishes serial 10 for it, not the CSV's 0.");
  // And the same holds for the other four areas' tenth rows.
  for (const areaId of RECOVERED_CAMPAIGN_AREA_IDS) {
    const area = starterAreas.area.find((candidate) => candidate.id === areaId)!;
    const row = csvRows.find((candidate) => candidate.stage === area.stage[9].stage_id)!;
    assert.equal(row.serial, 0,
      `campaign-stages.csv's tenth row for ${areaId} is also serial 0 - which is what makes the `
      + `"n_05_10 is special" reading unlikely and the column's role [UNRESOLVED].`);
    assert.equal(area.stage[9].serial, 10);
  }
}

// ===========================================================================
// 3. EVERY res_prefix IS A REAL environments.csv ROW.  (invariants that must
//    NOT regress: commit 8dc5bfd.)
// ===========================================================================
{
  const prefixes = new Set(starterStages.stage.map((stage) => String(stage.res_prefix)));
  for (const prefix of prefixes) {
    assert.ok(RECOVERED_ENVIRONMENT_IDS.includes(prefix),
      `stage res_prefix "${prefix}" is not an environments.csv #ID. `
      + `CSRGameBase::OnInitBackground (0x9cbf34) does std::map<string,ENV_INFO>::find WITHOUT `
      + `testing end(), so a miss reads the tree end-node, PreFix formats as "" and all 30 `
      + `background layer names come out prefixless (_A0.._A9) - the empty `
      + `vector<shared_ptr<CMImageNode>> that faults CSRGameScrollBGDraw::OnUpdate.`);
    assert.ok(!/^ST\d+$/i.test(prefix),
      `stage res_prefix "${prefix}" is an ST<n> ART prefix, not an environment id. That is the `
      + `exact confusion commit 8dc5bfd fixed (we shipped "ST001" here).`);
  }
  assert.equal(prefixes.size, 1,
    "one environment id is published for every stage (99, the generic `battle` row) - varying it "
    + "per stage would be an unmeasured change to the one path that renders a backdrop");
}

// ===========================================================================
// 4. Resource identities are shared reference policy, not package filenames.
// ===========================================================================
{
  const packDir = repositoryPath("resources", "runtime", "assets");
  assert.ok(existsSync(packDir),
    `the recovered PAD pack must be present to check area art (${packDir}); without it the area `
    + `backdrop guard cannot prove the art is servable`);
  for (const area of starterAreas.area) {
    const art = String(area.resource_id);
    assert.equal(art, FIXTURE_AREA_BACKDROP_ART,
      `every area publishes the same mission-map backdrop art`);
    // An animation can live in a differently named owner package or a local
    // wrapper. Filename existence never proved native ResMap membership.
    assert.doesNotThrow(() => assertAreaBackdropArt(art));
  }
  // Control legs: the two namespace confusions stay refused at boot.
  assert.throws(() => assertAreaBackdropArt("ST001"), /ST<n> stage\/episode art prefix/);
  assert.throws(() => assertAreaBackdropArt("99"), /environments.csv #ID/);
}

// ===========================================================================
// 5. THE DUAL-KEY STAGE-MONSTER SHAPE STILL HOLDS, AND EVERY LINKED STAGE HAS
//    A REAL WAVE RECORD.  (invariants that must NOT regress: commits
//    5acb45e / bf2fee5 / 5d3e487.)
// ===========================================================================
{
  for (const table of [starterStageMonstersByMonsterId, starterStageMonstersByStageId]) {
    for (const [stageId, record] of Object.entries(table)) {
      assert.ok(Array.isArray(record.wave_list) && record.wave_list.length > 0,
        `stage "${stageId}" publishes no waves`);
      for (const waveList of record.wave_list) {
        assert.ok(Array.isArray(waveList),
          `stage "${stageId}": wave_list must be NESTED (vector<vector<STAGE_MONSTER>>), not a flat `
          + `array. A flat shape makes the inner loop call operator[] on a scalar and throw `
          + `type_error.305, which AddStageMonster has no handler for - commits bf2fee5.`);
        for (const monster of waveList) {
          assert.equal(typeof monster.ref_id, "string",
            `stage "${stageId}": wave ref_id must be a JSON STRING - AddStageMonster runs `
            + `from_json<std::string> on it at 0xa0d310.`);
          assert.ok(RECOVERED_MONSTER_ART_IDS.includes(monster.ref_id),
            `stage "${stageId}": wave ref_id "${monster.ref_id}" is outside the recovered monster `
            + `art namespace. It is put into GET /reference/GetMonster's \`list\` verbatim by `
            + `FUN_00b4a7a8 and CSRGameMob::GetMonsterData can only resolve a published monster - `
            + `commit 5d3e487.`);
          assert.ok(Object.prototype.hasOwnProperty.call(starterMonsterTable, monster.ref_id),
            `stage "${stageId}" requests monster "${monster.ref_id}" but /reference/GetMonster `
            + `publishes no such key. GetMonsterData is a std::map::find on \`_server\` and asserts `
            + `at SRGameMob.cpp:38, killing the process 31-45 ms later.`);
          assert.ok(!("001".length > 0 && monster.ref_id === "001"),
            `stage "${stageId}": ref_id "${monster.ref_id}" is the CARD id, not a monster id - that `
            + `is precisely the commit-5d3e487 bug (the measured request was ["M001","001"]).`);
        }
      }
      assert.ok(Array.isArray(record.show_thumbnail) && record.show_thumbnail.length > 0,
        `stage "${stageId}": show_thumbnail must be a non-empty ARRAY OF STRINGS - it is iterated `
        + `and each element becomes STAGE_MONSTER_LINK::ids, which is what populates the GetMonster `
        + `request list.`);
      for (const id of record.show_thumbnail) {
        assert.equal(typeof id, "string");
        assert.ok(Object.prototype.hasOwnProperty.call(starterMonsterTable, id),
          `stage "${stageId}": show_thumbnail names "${id}", which /reference/GetMonster does not `
          + `publish`);
      }
    }
  }
  // The set difference that WAS the bug: every linked stage has an entry.
  const linked = new Set(starterAreas.stage.map((link) => link.stage_id));
  for (const stageId of linked) {
    assert.ok(Object.prototype.hasOwnProperty.call(starterStageMonstersByMonsterId, stageId),
      `stage "${stageId}" is linked by an area but /reference/GetTargetStageMonster has NO record `
      + `for it. The route falls back to borrowing another stage's waves, which answers 200 with a `
      + `well-formed nested array and therefore looks fine - this is the silent form of "stages do `
      + `not load correctly".`);
  }
  assert.equal(FIXTURE_MONSTER_IDS.length, 1,
    "the published monster set stays M001 alone by default: show_thumbnail IS the GetMonster "
    + "`list`, so widening it is an unmeasured change to the one working battle path. "
    + "BLUSTONE_MONSTER_IDS widens it inside the recovered M001..M021/M100 namespace.");

  // The route seam answers for a REAL stage id with BOTH keys.
  const state = new ServerState("http://127.0.0.1:8080");
  for (const stageId of ["n_01_01", "n_03_07", "n_05_10"]) {
    const routed = gameResponse(state, "/reference/GetTargetStageMonster",
      { stage_id: stageId }, {}) as { result_code: number; ret_data: Record<string, unknown> };
    assert.equal(routed.result_code, 1, "result_code is 1 on every path");
    assert.ok(Object.prototype.hasOwnProperty.call(routed.ret_data, stageId),
      `/reference/GetTargetStageMonster must publish the requested STAGE id "${stageId}" under its `
      + `own key: CSRMStage::MakeStageInst reads the link map with GetStageMonsterLinkData(this+0x220) `
      + `and this+0x220 is the scene's stage id. A miss silently returns two fallback vectors with `
      + `no writer (commit 5acb45e).`);
    assert.ok(Object.prototype.hasOwnProperty.call(routed.ret_data, "M001"),
      "...and the MONSTER id alongside it - the leg report-011 proved causally live (assertions "
      + "6 -> 0)");
  }
}

// ===========================================================================
// 6. THE CRUISE HAS DESTINATIONS.  This is the airport bug.
// ===========================================================================
{
  assert.deepEqual([...EXPEDITION_CRUISE_AREAS], ["n_00", "n_01", "n_02", "n_03", "n_04", "n_05"],
    "every published area must have type 1 - the cruise's AREA_INFO::TYPE (OnButtonClick enters the "
    + "cruise with SetData(this, 1), 0xe741dc:553-555). An area of another type is invisible to the "
    + "airport.");
  assert.deepEqual([...EXPEDITION_CRUISE_DESTINATIONS],
    ["n_01", "n_02", "n_03", "n_04", "n_05"],
    "the cruise must offer FIVE destinations. SetMarker hides ordinal 0 "
    + "(SetVisible(button, i != 0), native-area-index.txt:337), so type-1 areas minus the origin "
    + "node IS the destination list. Before the campaign table shipped there were two type-1 areas "
    + "and therefore exactly ONE destination - which is the whole \"cannot progress in the cruise\" "
    + "report.");
  for (const area of starterAreas.area) {
    assert.equal(area.type, 1,
      `area "${area.id}" has type ${area.type}; only type 1 reaches the cruise scene`);
    assert.ok(Number.isSafeInteger(area.serial) && area.serial >= 0);
  }
  // Dense per-type ordinals: GetAreaData(type, i) matches AREA_INFO+0x3c == i.
  assert.doesNotThrow(() => assertAreaSerials(starterAreas.area));
}

// ===========================================================================
// 7. WHAT GATES PROGRESSION.  There is no server-side gate; this mirrors the
//    recovered client arithmetic in CSRSceneAreaSel::SetAreaState (0xe75cdc).
// ===========================================================================
{
  const state = new ServerState("http://127.0.0.1:8080");
  const guest = state.registerGuest({ device_id: "campaign-gate" }, {}).ret_data as Record<string, unknown>;
  const otp = String(guest.otp);
  const game = () => state.gameFor(state.accountFor({ otp }, {}));

  assert.ok(isAreaUnlocked(game(), "n_01"),
    "[RECOVERED] cruise ordinal 1 is unconditionally unlocked (`if (param_3 < 2)`), so n_01 - the "
    + "first expedition area - is always reachable");
  assert.ok(isAreaUnlocked(game(), "n_00"), "ordinal 0 is the origin node");

  // The star floor decides whether the whole campaign is open on arrival. It is
  // a [FIXTURE] dial, so both states are asserted against the same arithmetic.
  const seededFloor = Number(process.env.BLUSTONE_SEED_STAGE_STARS ?? 0) > 0;
  assert.equal(isAreaUnlocked(game(), "n_05"), seededFloor,
    "with the default BLUSTONE_SEED_STAGE_STARS=1 floor, n_04's last link already carries a star, so "
    + "the fifth destination is open on arrival; with the floor at 0 it must be locked until n_04_10 "
    + "is actually cleared. This is the [FIXTURE]/recovered split, and the test reads the dial "
    + "rather than assuming one of them.");

  // `stage[]` in /lobby/Enter is the ONLY progression input, and it must cover
  // every recovered stage id - that is the key domain of CSRPlayData+0x27c.
  const enter = state.lobbyEnter({ otp }, {}).ret_data as Record<string, unknown>;
  const stageMap = new Map(
    (enter.stage as Array<{ stage_id: string; achieve: string }>).map((row) => [row.stage_id, JSON.parse(row.achieve).length]));
  for (const stageId of RECOVERED_CAMPAIGN_STAGE_IDS) {
    assert.ok(stageMap.has(stageId),
      `/lobby/Enter's \`stage\` must carry an entry for "${stageId}". GetStageAchieveCnt reads a `
      + `std::map keyed by stage id at CSRPlayData+0x27c; an absent key contributes 0 to the `
      + `expedition progress total and is what SetAreaState's unlock test reads.`);
    assert.ok(Number.isSafeInteger(stageMap.get(stageId)));
  }

  // Clearing the previous area's LAST stage is the recovered gate. Prove the
  // chain end to end through /mission/Complete rather than by poking state.
  const honest = new ServerState("http://127.0.0.1:8080");
  const honestGuest = honest.registerGuest({ device_id: "campaign-gate-0" }, {}).ret_data as Record<string, unknown>;
  const honestOtp = String(honestGuest.otp);
  const honestGame = () => honest.gameFor(honest.accountFor({ otp: honestOtp }, {}));
  if (seededFloor) {
    console.log(
      "Note: BLUSTONE_SEED_STAGE_STARS is not 0, so every area is unlocked on arrival by the "
      + "[FIXTURE] star floor. Run BLUSTONE_SEED_STAGE_STARS=0 to exercise the recovered gate.",
    );
  } else {
    assert.equal(isAreaUnlocked(honestGame(), "n_02"), false,
      "with no seeded stars, n_02 must be LOCKED: SetAreaState reads the previous area's last "
      + "stage[] link (n_01_10) and asks GetStageAchieveCnt, which is 0");
    honest.startMission({ otp: honestOtp, stage_id: "n_01_10", deck_inst_id_1: 1 }, {});
    honest.completeMission({ otp: honestOtp, stage_id: "n_01_10", play_info: JSON.stringify({ clear: 1 }) }, {});
    assert.equal(isAreaUnlocked(honestGame(), "n_02"), true,
      "clearing n_01_10 through /mission/Complete must open n_02 - that is the recovered gate, and "
      + "it is what makes the campaign progressable");
    assert.equal(isAreaUnlocked(honestGame(), "n_03"), false,
      "n_03 still needs n_02's last stage, n_02_10, so one clear must not skip an area");
  }
}

// ===========================================================================
// 8. THE BOOT GUARDS BITE.  Control legs: each must refuse the defect it
//    catches, and must be SILENT on the shipped table.
// ===========================================================================
{
  const published = new Set(publishedStageIds());
  // (a) a link with no stage record - the "stages do not load" case.
  assert.throws(
    () => assertAreaLinksResolve([{ id: "n_09", stage: [{ stage_id: "n_09_01", serial: 1 }] }], published),
    /links stage "n_09_01" but \/reference\/GetStage publishes no record/,
    "a dangling area->stage link must be refused at boot, not served");
  // (b) an area with no links at all - GetStageCnt == 0 and every chest is dead.
  assert.throws(
    () => assertAreaLinksResolve([{ id: "n_09", stage: [] }], published),
    /publishes no stage\[\] link/,
    "an area with zero stage[] links must be refused: S == 0 makes all three chests "
    + "permanently locked and the map empty");
  assert.doesNotThrow(() => assertAreaLinksResolve([{ id: "n_00", stage: [] }], published),
    "the hidden origin alone may be empty; it is not a playable map destination");
  // (c) a gap in the per-type ordinals - GetAreaData returns the EMPTY record.
  assert.throws(
    () => assertAreaSerials([
      { id: "n_00", type: 1, serial: 0 },
      { id: "n_01", type: 1, serial: 1 },
      { id: "n_03", type: 1, serial: 3 },
    ]),
    /GetAreaData\(type, i\)/,
    "a gap in the cruise area ordinals must be refused at boot");
  // (d) a duplicate ordinal - same failure, same silence.
  assert.throws(
    () => assertAreaSerials([
      { id: "n_00", type: 1, serial: 0 },
      { id: "n_01", type: 1, serial: 1 },
      { id: "n_02", type: 1, serial: 1 },
      { id: "n_03", type: 1, serial: 2 },
    ]),
    /both publish ordinal 1 within type 1/,
    "two cruise areas sharing an ordinal must be refused at boot");
  // (e) the shipped table passes both guards.
  assert.doesNotThrow(() => assertAreaSerials(starterAreas.area));
  assert.doesNotThrow(() => assertAreaLinksResolve(starterAreas.area, published));
}

// ===========================================================================
// 9. mode resolution
// ===========================================================================
assert.equal(campaignMode(), CAMPAIGN_MODE);
assert.ok(["full", "minimal"].includes(CAMPAIGN_MODE));
assert.equal(CAMPAIGN_MODE, "full",
  "the DEFAULT campaign mode must be `full` - the recovered 5-area/50-stage campaign. "
  + "`minimal` exists only as a one-variable rollback and must not be the default.");
for (const areaId of RECOVERED_CAMPAIGN_AREA_IDS) {
  assert.ok(areaStageCount(areaId) === RECOVERED_CAMPAIGN_STAGE_COUNT,
    `area "${areaId}" must publish ${RECOVERED_CAMPAIGN_STAGE_COUNT} links`);
}

console.log(
  `Recovered campaign tests passed (mode=${CAMPAIGN_MODE}): `
  + `${publishedStageIds().length} stage records, ${starterAreas.area.length} areas, `
  + `${EXPEDITION_CRUISE_DESTINATIONS.length} cruise destinations `
  + `(${EXPEDITION_CRUISE_DESTINATIONS.join(", ")}); `
  + `every published id is a campaign-stages.csv row, every link serial is 1..10, `
  + `every res_prefix is an environments.csv #ID, every resource_id has an art pack, `
  + `and the dual-key stage-monster shape holds.`,
);
