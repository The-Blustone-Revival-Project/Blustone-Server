import { repositoryPath } from "../src/paths.js";
/**
 * AREA BACKDROP ART-NAME GUARD  (added 2026-10-03, resource-serving agent)
 * ---------------------------------------------------------------------------
 *
 * The expedition-map **backdrop** was black while the snow particle layer drew
 * fine, and `analysis/r015/logcat-all.txt` logged, once per session, ~40 s before
 * the battle:
 *
 *     [ERR] [RES] Can't find 'ST001' in ResMap.
 *     [ERR] [RES] LoadAnim2 'ST001' failure
 *     [ERR] [LoadAnim] Cannot find the resource(ST001)
 *     [WRN] [OnPlay] Cannot play the node,itrdon't have A resource of image
 *
 * The temptation was to treat this as the SAME namespace confusion that was
 * fixed for the battle stage (`res_prefix` is an `environments.csv` `#ID`, not
 * an asset prefix - commit 8dc5bfd) and to publish `99` here too.
 *
 * **That would have been wrong, and this test is the reason it is refuted.**
 * `resource_id` is an ART name. See `FIXTURE_AREA_BACKDROP_ART` in
 * `src/bootstrap.ts` for the full chain; the short version:
 *
 *  - the `ENV_INFO` map at `CSRStaticData+0x150` has exactly ONE reader,
 *    `CSRGameBase::OnInitBackground` (0x9cbf34), and its three callers all take
 *    the key from somewhere other than `SetArea`:
 *    `CSRGameBase::InitBackground` (the STAGE's `res_prefix`),
 *    `CSRSceneMEpisode::InitBackground` (a local episode JSON, not a route) and
 *    `CSRExploreMirage::InitBackground`;
 *  - the miss is an ART miss - `CRMResMap::GetResInfo` (0x01d999cb) plus
 *    `LoadAnim2`, not the environment-miss signature, which is PREFIXLESS names
 *    (`_A0`/`_D0`/`_E0`) and appears only ~40 s LATER at the battle;
 *  - `CSRSceneMStageMap::CreateArea` (0xe91f0c) loads `PA_BG` at 0xe9222c and
 *    `SR_SNOW` at 0xe92490, and the `ST001` load lands between them in the log
 *    (23:47:43.294 -> 23:47:43.307). `PA_BG` is an empty UI panel in the
 *    recovered layout `KO/NEW/SR_MISSION/2_SR_UI_MS_ST/1_MS_ST_MAP`, so code
 *    fills it - from the AREA record's only data-driven string, `resource_id`;
 *  - ONE miss, not seventeen: `thumb` is per-stage (17 published),
 *    `resource_id` is per-area (one visible).
 *
 * So the guard below enforces the invariant that actually holds, and its
 * **control leg** is the historical value: `assertAreaBackdropArt("ST001")` and
 * `assertAreaBackdropArt("99")` must both be REFUSED. Run with
 * `BLUSTONE_AREA_BACKDROP_ART=ST001 npm test` to watch the module throw at
 * import time - that is the "fails before the change" demonstration.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  FIXTURE_AREA_BACKDROP_ART,
  RECOVERED_ENVIRONMENT_IDS,
  assertAreaBackdropArt,
  starterAreas,
  starterStages,
} from "../src/bootstrap.js";

const workspace = path.resolve(process.cwd(), "..");
const packDir = repositoryPath("resources", "runtime", "assets");

// ---------------------------------------------------------------------------
// 1. The recovered environment table, re-read rather than trusted.
// ---------------------------------------------------------------------------
const csvPath = repositoryPath("resources", "reference", "recovered-data", "environments.csv");
const csvText = readFileSync(csvPath, "utf8");
const environmentRows = csvText
  .split(/\r?\n/)
  .map((line) => line.trim())
  // The `#ID` comment line IS the header; drop it and keep every data row.
  .filter((line) => line.length > 0 && !line.startsWith("#"))
  .map((line) => {
    const [id, name, prefix] = line.split(",");
    return { id: id.trim(), name: name.trim(), prefix: prefix.trim() };
  });
assert.equal(environmentRows.length, 50,
  "environments.csv must still hold its 50 recovered data rows (header excluded)");
const environmentIds = new Set(environmentRows.map((row) => row.id));
assert.deepEqual([...RECOVERED_ENVIRONMENT_IDS].sort(), [...environmentIds].sort(),
  "RECOVERED_ENVIRONMENT_IDS must stay exactly the #ID column of environments.csv");

// ---------------------------------------------------------------------------
// 2. Every published area `resource_id`.
// ---------------------------------------------------------------------------
const areas = starterAreas.area;
assert.ok(Array.isArray(areas) && areas.length > 0, "starterAreas.area must be a non-empty array");

const thumbs = new Set(starterStages.stage.map((stage) => stage.thumb));
const checked = new Set<string>();

for (const area of areas) {
  const resourceId = String(area.resource_id ?? "");
  assert.notEqual(resourceId, "",
    `area "${area.id}" publishes an empty \`resource_id\`; CreateArea (0xe91f0c) hands it to `
    + `CMImageNode::LoadAnim2 and the mission-map backdrop panel stays empty.`);
  checked.add(resourceId);

  // (a) THE REGRESSION GUARD. An environments.csv #ID in this field is the
  //     inverse of the stage bug and is equally fatal, in a different way.
  assert.ok(!environmentIds.has(resourceId),
    `area "${area.id}" resource_id "${resourceId}" is a row id of `
    + `analysis/recovered-data/environments.csv. That is the STAGE \`res_prefix\` namespace. `
    + `An area's resource_id is the MISSION-MAP BACKDROP ART: `
    + `CSRGameBase::OnInitBackground (0x9cbf34) is the only reader of the ENV table and none of `
    + `its three callers is CSRGameStage::SetArea, so this value can never resolve there. `
    + `Published here it logs "[ERR] [RES] Can't find '${resourceId}' in ResMap." and the map `
    + `stays black. Set BLUSTONE_AREA_BACKDROP_ART to an ART name (default MAP_ZONE_1).`);

  // (b) THE MEASURED BAD VALUE. ST<n> is the stage/episode art family, which is
  //     the stage `thumb` namespace, and it is proven to miss on this path.
  assert.ok(!/^ST\d+$/i.test(resourceId),
    `area "${area.id}" resource_id "${resourceId}" is an ST<n> stage/episode art prefix - the `
    + `stage \`thumb\` namespace, and MEASURED to miss here: `
    + `analysis/r015/logcat-all.txt logs "[ERR] [RES] Can't find '${resourceId}' in ResMap." + `
    + `"LoadAnim2 '${resourceId}' failure" + "[ERR] [LoadAnim] Cannot find the `
    + `resource(${resourceId})" in all five legs (lines 20620, 65586, 109593, 157904, 206015), `
    + `immediately followed by "[WRN] [OnPlay] Cannot play the node,itrdon't have A resource of `
    + `image" - the black backdrop. This value shipped until 2026-10-03.`);

  // (c) Not the same string as the stage thumbnail. One constant serving two
  //     namespaces is how the conflation became invisible in the log.
  assert.ok(!thumbs.has(resourceId),
    `area "${area.id}" resource_id "${resourceId}" is byte-identical to a stage \`thumb\`. `
    + `The map backdrop and the node thumbnail are separate namespaces; sharing one string makes `
    + `a ResMap miss unattributable. That is exactly what analysis/r015/logcat-all.txt could not `
    + `distinguish.`);

  // (d) A resource name is NOT a package filename. The old filename-existence
  // assertion accepted MAP_ZONE_1 despite no named animation having that ID,
  // and would reject valid names stored in differently named owner packages.
  // Keep namespace checks; typed owner/animation checks belong to the resource
  // builder and native renderer validation, not `${resourceId}.jet` guessing.
  if (existsSync(packDir)) {
    const prefix = environmentRows.find((row) => row.prefix === resourceId);
    assert.equal(prefix, undefined,
      `area "${area.id}" resource_id "${resourceId}" is an environments.csv PreFix column, i.e. `
      + `an ART family name. PreFix values are ST-prefixed (STI000/STI099/STI900); publishing one `
      + `here is the asset/environment conflation that produced the battle-scene fault.`);
  } else {
    console.log("Recovered PAD pack not present; resource owner/rendering remains unverified.");
  }
}

// ---------------------------------------------------------------------------
// 3. Control legs: the two namespace confusions must be refused at boot.
// ---------------------------------------------------------------------------
assert.throws(() => assertAreaBackdropArt("ST001"), /ST<n> stage\/episode art prefix/,
  "the guard must refuse the historical ST001 value - this is the regression itself");
assert.throws(() => assertAreaBackdropArt("99"), /is a row id of|environments.csv #ID/,
  "the guard must refuse an environments.csv id in the area resource_id");
assert.throws(() => assertAreaBackdropArt("1000"), /environments.csv #ID/,
  "the guard must refuse an id-shaped value that is not even a real row");
assert.throws(() => assertAreaBackdropArt("   "), /non-empty art name/,
  "the guard must refuse an empty art name");
assert.equal(assertAreaBackdropArt(" MAP_ZONE_1 "), "MAP_ZONE_1",
  "the guard trims but otherwise passes an art name through");
assert.equal(assertAreaBackdropArt("LOCAL_MAP"), "LOCAL_MAP", "a local animation identity may have a separately built owner package");

assert.equal(FIXTURE_AREA_BACKDROP_ART, assertAreaBackdropArt(FIXTURE_AREA_BACKDROP_ART),
  "the published area backdrop art must survive its own guard");

console.log(
  `Area backdrop art guard passed: ${checked.size} distinct resource_id value(s) `
  + `(${[...checked].join(", ")}) across ${areas.length} area record(s); `
  + `ST001 and 99 both refused.`,
);
