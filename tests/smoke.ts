import { repositoryPath } from "../src/paths.js";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { createApp } from "../src/server.js";
import { CAMPAIGN_MODE, FIXTURE_STAGE_ENVIRONMENT_IDS, RECOVERED_ENVIRONMENT_IDS } from "../src/bootstrap.js";

process.env.BLUSTONE_RESOURCE_VERSION = "1";
process.env.BLUSTONE_RESLIST_STAMP = "1634659";
process.env.BLUSTONE_PACKAGE_DIR = repositoryPath("resources", "test-fixtures", "base-packages");
process.env.BLUSTONE_PACKAGE_NAMES = "E_NEW.jet";

const context = createApp({ baseUrl: "http://127.0.0.1", legacyCardIds: true });
const server = createServer(context.app);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
const address = server.address();
if (!address || typeof address === "string") throw new Error("server did not bind to a TCP port");
const base = `http://127.0.0.1:${address.port}`;
context.state.baseUrl = base;

async function json(path: string, init: RequestInit = {}) {
  const response = await fetch(base + path, init);
  const body = await response.json() as Record<string, unknown>;
  return { response, body };
}

try {
  const health = await json("/healthz");
  const portrait = await fetch(base + "/local-profile/replica-100.png");
  assert.equal(portrait.status, 200);
  assert.match(portrait.headers.get("content-type") ?? "", /image\/png/);
  const portraitBytes = Buffer.from(await portrait.arrayBuffer());
  assert.equal(portraitBytes.readUInt32BE(16), 100);
  assert.equal(portraitBytes.readUInt32BE(20), 100);
  assert.equal(crypto.createHash("sha256").update(portraitBytes).digest("hex"),
    "b4c9f5f1d81170b115a35bc455a2bf230a805385f9a6ad23b04a6cb43b501de5", "portrait serves the unchanged original100x100 icon");
  assert.equal(health.response.status, 200);
  assert.equal(health.body.ok, true);
  assert.ok(health.response.headers.get("x-request-id"));
  const routeInfo = await json("/debug/routes");
  assert.ok(Number(routeInfo.body.count) >= 285);
  const registered = routeInfo.body.registered as Array<{ method: string; path: string }>;
  assert.ok(registered.some((route) => route.method === "post" && route.path === "/mission/Start"));
  assert.ok(registered.some((route) => route.method === "post" && route.path === "/webview/event_quest/JoinCamp"));
  const webviewFixture = await json("/webview/event_quest/JoinCamp", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ event_id: "fixture-event", camp_1_agg: "redacted" }),
  });
  assert.equal(webviewFixture.response.status, 200);
  assert.equal(webviewFixture.body.result_code, 1);
  assert.equal(webviewFixture.body.success, true);
  assert.equal((webviewFixture.body.ret_data as { accepted: boolean }).accepted, true);
  assert.deepEqual(webviewFixture.body.request_keys, ["camp_1_agg", "event_id"]);

  const baseInfo = await json("/launcher/GetBaseInfo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_ver: "28010" }),
  });
  assert.equal(baseInfo.response.status, 200);
  assert.equal(baseInfo.body.result_code, 1);
  assert.deepEqual(baseInfo.body.ret_data, baseInfo.body.data);
  assert.ok(Array.isArray(baseInfo.body.url_list));
  assert.ok((baseInfo.body.url_list as Array<Record<string, unknown>>).some((record) => record.url_key === "_SR"));
  assert.ok(Array.isArray(baseInfo.body.app_srv_list));
  assert.ok(Array.isArray(baseInfo.body.app_srv_name_list));
  assert.deepEqual((baseInfo.body.app_srv_name_list as Array<Record<string, unknown>>)[0], {
    srv_id: 1,
    lang: "en",
    name: "Blustone Replica",
    desc: "Blustone Replica",
  });

  const clientKeys = crypto.generateKeyPairSync("ec", { namedCurve: "secp384r1" });
  const clientPublicKey = clientKeys.publicKey.export({ format: "der", type: "spki" }).toString("base64url");
  const exchangeResponse = await fetch(base + "/shared_secret/Exchange", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ publicKey: clientPublicKey }),
  });
  const exchangeBody = Buffer.from(await exchangeResponse.arrayBuffer());
  assert.equal(exchangeResponse.status, 200);
  assert.equal(exchangeResponse.headers.get("content-type"), "application/octet-stream");
  assert.ok(exchangeResponse.headers.get("pv-accesstoken"));
  assert.ok(exchangeResponse.headers.get("pv-signature"));
  const serverPublicKey = crypto.createPublicKey({ key: exchangeBody, format: "der", type: "spki" });
  const sharedSecret = crypto.diffieHellman({ privateKey: clientKeys.privateKey, publicKey: serverPublicKey });
  const derivedKey = crypto.createHash("sha384").update(sharedSecret).digest();
  const expectedSignature = crypto.createHmac("sha384", derivedKey).update(exchangeBody).digest("base64");
  assert.equal(exchangeResponse.headers.get("pv-signature"), expectedSignature);
  const accessToken = exchangeResponse.headers.get("pv-accesstoken") ?? "";
  if (!accessToken) throw new Error("shared-secret exchange did not return PV-AccessToken");

  function encryptNativeForm(values: Record<string, string>): { body: Buffer; signature: string } {
    const plaintext = Buffer.from(String(new URLSearchParams(values)), "utf8");
    const cipher = crypto.createCipheriv("aes-256-cbc", derivedKey.subarray(0, 32), derivedKey.subarray(32, 48));
    const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const signature = crypto.createHmac("sha384", derivedKey).update(plaintext).digest("base64");
    return { body, signature };
  }

  async function secureJson(path: string, values: Record<string, string>) {
    const encrypted = encryptNativeForm(values);
    const response = await fetch(base + path, {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        "pv-accesstoken": accessToken,
        "pv-signature": encrypted.signature,
      },
      body: new Uint8Array(encrypted.body),
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("application/octet-stream")) return { response, body: await response.json() as Record<string, unknown> };
    const encryptedResponse = Buffer.from(await response.arrayBuffer());
    const decipher = crypto.createDecipheriv("aes-256-cbc", derivedKey.subarray(0, 32), derivedKey.subarray(32, 48));
    const plaintext = Buffer.concat([decipher.update(encryptedResponse), decipher.final()]);
    const responseSignature = response.headers.get("pv-signature");
    assert.equal(responseSignature, crypto.createHmac("sha384", derivedKey).update(plaintext).digest("base64"));
    return { response, body: JSON.parse(plaintext.toString("utf8")) as Record<string, unknown> };
  }

  const guest = await secureJson("/v2/account/RegisterGuest", { device_id: "typescript-smoke" });
  assert.equal(guest.response.status, 200);
  assert.ok(Number(guest.body.pvid) > 0);
  const nativeGuest = guest.body.ret_data as Record<string, unknown>;
  assert.equal(typeof nativeGuest.otp, "string");
  assert.ok(String(nativeGuest.otp).length > 0);
  assert.equal(typeof nativeGuest.vs_token, "string");
  assert.ok(String(nativeGuest.vs_token).length > 0);
  assert.ok(Number(nativeGuest.begin_utc) > 0);
  assert.ok(String(nativeGuest.server_url).startsWith("http://"));
  const guestAuth = JSON.stringify({ otp: nativeGuest.otp, pvid: guest.body.pvid });
  const secureLobby = await secureJson("/lobby/Enter", { otp: String(nativeGuest.otp), pvid: String(guest.body.pvid) });
  assert.equal(secureLobby.body.result_code, 1);
  const otherGuest = await json("/v2/account/RegisterGuest", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ device_id: "other-device" }),
  });
  const boundSessionReject = await secureJson("/lobby/Enter", { otp: String((otherGuest.body.ret_data as Record<string, unknown>).otp), pvid: String(otherGuest.body.pvid) });
  assert.equal(boundSessionReject.body.result_code, 2001, "transport session cannot switch account identities");
  for (const endpoint of ["/relation/BlockList", "/reference/GetStage", "/reference/GetCard", "/lobby/GetCardInven", "/reference/GetCardBook", "/lobby/GetCardBook"]) {
    const result = await json(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: guestAuth });
    // GetArea contains a collection. GetStage and BlockList are wire arrays;
    // ReqBlockListCB builds its C++ map only after parsing indexed JSON rows.
    if (endpoint === "/reference/GetArea") {
      assert.ok(result.body.ret_data && typeof result.body.ret_data === "object" && !Array.isArray(result.body.ret_data),
        `${endpoint} requires an object with a collection`);
    } else {
      assert.ok(Array.isArray(result.body.ret_data), `${endpoint} requires an array`);
    }
  }

  const route = await json("/lobby/Enter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: guestAuth,
  });
  assert.equal(route.response.status, 200);
  const sessionData = route.body.ret_data as Record<string, unknown>;
  const lobbyTuto = sessionData.tuto as Array<{ type: number; step: number; is_cleared: number }>;
  // The launcher advertises tutorial completion so the title scene and the
  // area-selection scene are not gated on tutorial battles the replica does
  // not implement (CSRPopUpTitle::ProcessTutorial reads GetState(0,5),
  // CSRSceneAreaSel::OnReset reads GetState(1,3)). Every advertised step must
  // be cleared, and the two responses must agree with each other.
  const launcherResponse = await json("/launcher/GetBaseInfo", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ app_code: "_SR", lang: "en" }),
  });
  const launcherTuto = (launcherResponse.body.ret_data as Record<string, unknown>).tuto as typeof lobbyTuto;
  assert.ok(lobbyTuto.length > 1, "tutorial completion list must cover more than the single title step");
  for (const entry of lobbyTuto) {
    assert.equal(entry.is_cleared, 1, `tutorial ${entry.type}:${entry.step} must be advertised as cleared`);
  }
  for (const [type, step] of [[0, 5], [1, 3], [2, 0], [3, 0]]) {
    assert.ok(
      lobbyTuto.some((entry) => entry.type === type && entry.step === step && entry.is_cleared === 1),
      `tutorial gate ${type}:${step} must be cleared so the client can leave the title/area-select scenes`,
    );
  }
  assert.deepEqual(launcherTuto, lobbyTuto, "GetBaseInfo and /lobby/Enter must advertise the same tutorial state");
  assert.equal((sessionData.user as Record<string, unknown>).leader_inst_id, 1);
  const episode = await json("/episode/GetLog", { method: "POST", headers: { "content-type": "application/json" }, body: guestAuth });
  assert.deepEqual(episode.body.ret_data, { read_log: [], reward_log: [] });
  const book = await json("/reference/GetCardBook", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
  const bonuses = book.body.ret_data as Array<{ card_role: number; target_cnt: number; effect: string }>;
  assert.ok(bonuses.some((row) => row.card_role === 1 && row.target_cnt === 1));
  for (const row of bonuses) {
    assert.equal(typeof row.effect, "string");
    assert.deepEqual(JSON.parse(row.effect), { atk: 0, def: 0, hp: 0, crt_chance: 0, crt_dmg: 0 });
  }
  const postFixture = async (endpoint: string, payload: Record<string, unknown> = {}) => (await json(endpoint, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })).body.ret_data;
  const extra = await postFixture("/reference/GetExtra") as Record<string, number>;
  assert.ok(Math.trunc(extra.ap_refresh_interval) > 0);
  assert.ok(Math.trunc(extra.bp_refresh_interval) > 0);
  const levels = await postFixture("/reference/GetLevel") as { vip: unknown[]; card: unknown[] };
  assert.ok(levels.vip.length > 0, "VIP lookup must not dereference a missing record");
  assert.ok(levels.card.length > 0);
  // SetStage indexes ret_data itself, so GetStage is a bare array keyed on `id`.
  const stages = await postFixture("/reference/GetStage") as Array<{ id: string; achieve_condition: string; ap_cost: number; res_prefix: string }>;
  // SetArea reads ret_data.area[], and the area->stage links are nested per area.
  const areaCatalog = await postFixture("/reference/GetArea") as { area: Array<{ id: string; serial: number; stage: Array<{ area_id: string; stage_id: string }> }> };
  const areas = areaCatalog.area;
  const areaLinks = areas.flatMap((area) => area.stage);
  assert.deepEqual(areas.map((area) => area.serial).sort((a, b) => a - b), areas.map((_, index) => index), "area serials must include hidden origin 0 and be contiguous");

  // The area->stage link table is a bootstrap construct, not part of the bare
  // area array. What the client needs is that each area is addressable by
  // area_id and that a stage exists for the areas the replica links.
  for (const link of areaLinks) {
    assert.ok(areas.some((area) => area.id === link.area_id),
      `linked area ${link.area_id} must exist`);
    assert.ok(stages.some((stage) => stage.id === link.stage_id),
      `linked stage ${link.stage_id} must exist in the stage table`);
  }
  if (CAMPAIGN_MODE === "full") {
    assert.equal(areaLinks.filter((link) => link.stage_id === "n_01_01").length, 1,
      "the first expedition stage must have one return-map owner");
    assert.ok(areaLinks.some((link) => link.area_id === "n_01" && link.stage_id === "n_01_01"),
      "the first expedition stage belongs to Snowfield");
    assert.ok(!areaLinks.some((link) => link.area_id === "n_00"),
      "the hidden origin must not expose playable stages");
  } else {
    assert.ok(areaLinks.some((link) => link.area_id === "n_00" && link.stage_id === "n_01_01"),
      "minimal mode retains its historical origin link");
  }
  for (const stage of stages) {
    assert.ok(Array.isArray(JSON.parse(stage.achieve_condition)));
    assert.ok(typeof stage.id === "string" && stage.id.length > 1, "native stage identity field is `id` and must be non-empty");
  }

  // --- THE ENVIRONMENT-KEY GUARD (added 2026-10-03, fix agent) --------------
  // The battle scene died on its first presented frame with
  // `CSRGameScrollBGDraw::OnUpdate` (ELF 0x9aebd7) dereferencing element [0] of
  // an EMPTY `vector<shared_ptr<CMImageNode>>`, because
  // `CSRGameScrollBGDraw::Load` attaches a child only in the `else` of
  // `if (CMImageNode::LoadAnim(...) == 0)` and all 30 layers missed. The 30
  // names were `_A0.._A9`, `_D0.._D9`, `_E0.._E9` - PREFIXLESS.
  //
  // **[RECOVERED]** `CSRGameBase::OnInitBackground` (0x9cbf34) does
  //   `std::map<string,ENV_INFO>::find(CSRStaticData+0x150, key)` and then
  //   reads `node+0x34` (= `ENV_INFO.PreFix`) WITHOUT testing `end()`
  //   (`009bbf62 mov r5,r0` / `009bbf66 ldrb r0,[r5,#52]!`, no compare), then
  //   `CMFormat(buf, "%s_%s", PreFix, CSRStaticData.<suffix>)` x5. A miss reads
  //   the tree's end-node, so `PreFix` formats as `""` and every layer name
  //   loses its prefix. That is exactly the observed prefixless set - so the
  //   defect is a MISSING KEY, not a missing file.
  //
  // **[RECOVERED]** the key on the generic path is the stage's `res_prefix`
  //   (`/reference/GetStage` `ret_data[].res_prefix`), falling back to the stage
  //   `id` when it is empty - `CSRGameBase::InitBackground` (0x9cbe8c):
  //   `GetStageData(this+0x220)` -> `*(stage+0x70)` / `*(stage+0x74)` and
  //   `if (len != 0) key = stage+0x70 else key = this+0x220`. The table is
  //   `CSRStaticData::LoadEnv` (0xf3bab0) reading `environments.csv`, RECOVERED
  //   at `analysis/recovered-data/environments.csv` out of `LEVELING.jet`
  //   chunk 5 in the base-APK assets (sha256
  //   0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c).
  //
  // The regression that this guard exists for: the stage fixture published
  // `res_prefix: "ST001"`, which is a STAGE ASSET prefix and is NOT a row of
  // `environments.csv`. `find()` therefore missed by construction and the whole
  // 30-layer stack was built from `""`. The two are different namespaces -
  // `environments.csv` col 2 (`PreFix`) is `STI000`, `STI099`, `STI900`..., i.e.
  // the resource prefix with an `I`, never `ST001`.
  //
  // So this asserts, against the recovered CSV itself:
  //   1. every environment key the fixture publishes is a real row;
  //   2. the stage fixture's environment selector is an id, not an asset prefix;
  //   3. the selector's row carries a `PreFix` that names a real ST* art family
  //      (the value the `%s` in `CMFormat("%s_%s", ...)` would supply).
  const environmentsCsv = repositoryPath("resources", "reference", "recovered-data", "environments.csv");
  const environmentRows = readFileSync(environmentsCsv, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0 && !line.startsWith("#"))
    .map((line) => {
      const fields = line.split(",");
      return { id: fields[0].trim(), name: (fields[1] ?? "").trim(), prefix: (fields[2] ?? "").trim(), fields: fields.map((field) => field.trim()) };
    });
  assert.equal(environmentRows.length, 50,
    "environments.csv must still hold its 50 recovered data rows (header excluded)");
  const environmentById = new Map(environmentRows.map((row) => [row.id, row]));
  // Sanity-check the parse against two rows the recovery note names explicitly.
  assert.equal(environmentById.get("99")?.prefix, "STI099", "row 99 (배틀 / battle) must carry PreFix STI099");
  assert.equal(environmentById.get("0")?.prefix, "STI000", "row 0 (하얀숲 / white forest) must carry PreFix STI000");

  // `RECOVERED_ENVIRONMENT_IDS` in bootstrap.ts exists so the server can refuse
  // an unresolvable id at boot without reading analysis/ at runtime. It is a
  // copy of the CSV's #ID column, so it must match EXACTLY - otherwise it is
  // either missing a real key or has grown an invented one, and both are the
  // failure this guard exists to prevent.
  const csvIds = environmentRows.map((row) => row.id).sort();
  assert.deepEqual([...RECOVERED_ENVIRONMENT_IDS].sort(), csvIds,
    "RECOVERED_ENVIRONMENT_IDS must be exactly the #ID column of analysis/recovered-data/environments.csv - no missing row, no invented id");
  for (const id of csvIds) assert.match(id, /^\d+$/, `environments.csv id "${id}" must be a bare decimal string`);

  // The default choice is a [FIXTURE] decision, so pin the reasoning to the CSV
  // rather than to a comment: row 99 is the only row in the file whose five
  // 속도 (scroll-speed) columns contain a POSITIVE number. Every other row draws
  // its speeds from the map template -5,-20,-40,-60,-20. A backdrop that
  // scrolls in both directions on two of its five depth bands is a battle
  // backdrop, not a map backdrop - which is what CSRGameScrollBGDraw is.
  const positiveSpeedRows = environmentRows.filter((row) =>
    [4, 7, 10, 13, 16].some((column) => Number(row.fields[column]) > 0));
  assert.deepEqual(positiveSpeedRows.map((row) => row.id), ["99"],
    "row 99 must remain the only environments.csv row with a positive scroll speed - the property the default environment id is chosen on");

  assert.ok(FIXTURE_STAGE_ENVIRONMENT_IDS.length > 0, "the stage fixture must publish at least one environment id");
  for (const environmentId of FIXTURE_STAGE_ENVIRONMENT_IDS) {
    const row = environmentById.get(environmentId);
    assert.ok(row,
      `environment key "${environmentId}" is not a row of analysis/recovered-data/environments.csv, so CSRStaticData::LoadEnv's std::map<string,ENV_INFO>::find MISSES. OnInitBackground (0x9cbf34) does not test end(), reads the tree end-node, formats PreFix as "" and every background layer name becomes prefixless (_A0/_D0/_E0) - the empty vector<shared_ptr<CMImageNode>> that faults CSRGameScrollBGDraw::OnUpdate at ELF 0x9aebd7.`);
    assert.ok(row!.prefix.length > 0,
      `environment row "${environmentId}" has an empty PreFix, which produces the same prefixless layer names`);
    // The asset-prefix namespace is `STI*` (-> ST*.jet); an `ST001`-shaped
    // value is a stage asset prefix and is never an environment id.
    assert.match(row!.prefix, /^STI\d+$/,
      `environment row "${environmentId}" PreFix must be an STI* resource prefix, got "${row!.prefix}"`);
  }
  const stageEnvironmentSelectors = [...new Set(stages.map((stage) => stage.res_prefix))];
  for (const selector of stageEnvironmentSelectors) {
    assert.ok(environmentById.has(selector),
      `stage res_prefix "${selector}" must be an environments.csv row id. It is the key CSRGameBase::InitBackground (0x9cbe8c) passes to OnInitBackground. An ST*-shaped asset prefix is a DIFFERENT namespace and misses by construction.`);
    assert.doesNotMatch(selector, /^ST\d+$/,
      `stage res_prefix "${selector}" looks like a stage ASSET prefix, not an environment id. environments.csv keys are 0-19, 99, 100, 200, 502-537, 801, 900-907, 998.`);
  }
  // Control leg: the pre-fix value must fail the guard above, so the guard is
  // known to be load-bearing rather than vacuously true.
  assert.ok(!environmentById.has("ST001"),
    "the guard's control leg is invalid: \"ST001\" unexpectedly became a real environments.csv row");

  const monsters = await postFixture("/reference/GetMonster") as Record<string, { id: string; hp: string; _server: string }>;
  assert.equal(monsters.M001.id, "M001");
  assert.equal(monsters.M001.hp, "100");
  type Monster = { ref_id: unknown; group: unknown; next_spawn_ms: unknown; show_thumbnail: unknown };
  type Wave = Monster[];
  // **[RECOVERED]** `ret_data` for the stage-monster routes is an OBJECT whose
  // keys become the `std::map<string, STAGE_MONSTER_LINK>` key
  // (`CSRSyncMStage::ReqTargetStageMonsterCB` 0xb4606c hands
  // `iteration_proxy_value::key()` to `CSRGameMob::AddStageMonster`, which
  // copy-constructs `param_1` into the pair and emplaces at `CSRGameMob+0xc` -
  // `00a0d672..0xa0d678` and `00a0d690 ldr r0,[sp,#0x4] ; add r1,r0,#0xc ;
  // bl 0x00a0e618`).
  //
  // It must carry BOTH the monster id and the requested stage id, because the
  // consumer looks the map up with the STAGE ID: `CSRMStage::MakeStageInst`
  // calls `GetStageMonsterLinkData(this+0x220)` at `0xb34b18`, and `this+0x220`
  // is the scene's stage id (`0xb34026` -> `0xb34198` -> `0xb34686` ->
  // `0xb34b16`). A miss makes `GetStageMonsterLinkData` (0xa0cf38,
  // decomp-05.txt:20-56) return the two fallback vectors at `CSRGameMob+0x18` /
  // `+0x24`, which have no writer, so `waves` is empty, `0xb34b28 beq.w
  // 0x00b34e88` skips the whole writer, and `0xb3507a str r0,[r1,#0x4c]` faults.
  //
  // CORRECTION (2026-10-02): an earlier version of this comment claimed
  // `wave_list` had zero code references. That was a false negative from a
  // pairing-window bug in `tools/resolve-literals-offline.py`, not a fact about
  // the binary. `wave_list` IS the wave-array key, at 0x1d76bd5. The `_id`
  // reading of the same slot is a pairing artefact - the load at 0xa0d1b0 is
  // consumed only by `add r1,pc` at 0xa0d1b8, and the body has exactly five
  // `basic_json::operator[]` call sites with no `_id` among them.
  const stageMonsters = await postFixture("/reference/GetStageMonster", { stage_id: "n_01_01" }) as Record<string, { _id: Wave[]; wave_list: Wave[]; ref_id: string; group: number; next_spawn_ms: number; show_thumbnail: unknown }>;
  assert.deepEqual(Object.keys(stageMonsters), ["M001", "n_01_01"],
    "ret_data must be keyed by the monster id AND the requested stage id, or GetStageMonsterLinkData(this+0x220) misses and returns the unwritten fallbacks");
  // **[RECOVERED]** the wave `ref_id` must be a MONSTER id. It is the first 12
  // bytes of the 20-byte `STAGE_MONSTER` (`AddStageMonster` 0xa0d194, stride
  // 0x14 at 0xa0d410), and `FUN_00b4a7a8` - which builds
  // `GET /reference/GetMonster`'s `list` - walks a SECOND loop over the wave
  // vector at that same inner stride (00b4a864 `adds r5,#0x14` ; 00b4a870
  // `bl 0x00a0b428 HasMonsterData` ; 00b4a886 `bl 0x006d7efc` string copy) and
  // appends the `ref_id` to the SAME list head (sp+0x24) and counter (sp+0x2c)
  // as its first loop over `STAGE_MONSTER_LINK::ids`. `list` is therefore
  // `ids` UNION {every wave ref_id}
  // (analysis/research/ids-second-element.md section 4, quoting
  // analysis/ghidra-ids-01-asm-fun-b4a7a8.txt).
  //
  // Shipping the card id produced the request measured in
  // analysis/testing/report-014.md section 2.2 -
  // {"list":"[\"M001\",\"001\"]","pvid":"1000001"} - and "001" has no node in
  // `m_mMonsters`, so `CSRGameMob::GetMonsterData` (0xa0b43c) missed at
  // SRGameMob.cpp(38) and the process faulted 31-45 ms later.
  //
  // DO NOT "fix" a miss here by adding a card id to `show_thumbnail` or by
  // publishing a monster under `_server: "001"`: the wave loop requests THIS
  // field, so either would move the assertion instead of clearing it.
  // Control leg: BLUSTONE_WAVE_REF_ID=card must make the per-wave guard below
  // fail (asserted after it, so the deep guard is the one that reports).
  //
  // The key must be an id the monster table can actually resolve, otherwise
  // `CSRGameMob::GetMonsterData` misses at SRGameMob.cpp(38).
  assert.ok(Object.hasOwn(monsters, "M001"), "the stage-monster key must exist in the monster table");
  assert.equal(monsters.M001._server, "M001", "AddMonster keys m_mMonsters on `_server`, so it must match the published key");

  // --- THE EMPTY-WAVES GUARD (added 2026-10-02-2) -------------------------
  // This is the assertion that would have caught the crash. It exists because
  // `CSRMStage::MakeStageInst` has NO check that the wave array is usable: an
  // empty `waves` makes it take `beq.w 0x00b34e88` at `0xb34b28`, never create
  // the `"enemy"` key in `this+0x264`, and then unconditionally
  // `str r0,[r1,#0x4c]` at `0xb3507a` with `r1 == 0` -> SIGSEGV.
  //
  // The shape is [RECOVERED] from the loop nest in
  // `analysis/ghidra-hasmonster-08-asm-addstagemonster-emplace.txt`: the OUTER
  // dereference of `wave_list` (`bl 0x0072aff0` at `0xa0d266`) is what the INNER
  // loop iterates (`bl 0x0072af38` at `0xa0d2d8`), and one
  // `vector<STAGE_MONSTER>` is pushed per OUTER element (`bl 0x00a0e4ac` at
  // `0xa0d480`) - so `wave_list` is `vector<vector<STAGE_MONSTER>>`, an array of
  // waves each holding an array of monsters.
  //
  // A FLAT array is not merely degraded, it is fatal: the inner loop would walk
  // the monster object's own members and call `operator[](<a string or a number>,
  // "ref_id")` at `0xa0d304`, which nlohmann answers with a throwing
  // `type_error.305`. `AddStageMonster` has no handler, so the unwind skips both
  // `0xa0d480` and `0xa0d69c` and `STAGE_MONSTER_LINK` is never built at all.
  // Control leg: `BLUSTONE_WAVE_SHAPE=flat` reproduces the pre-fix bytes and
  // MUST make the next assertion fail.
  for (const [stageKey, entry] of Object.entries(stageMonsters)) {
    for (const arrayKey of ["wave_list", "_id"] as const) {
      const waves = entry[arrayKey];
      assert.ok(Array.isArray(waves), `${stageKey}.${arrayKey} must be an array (operator[] at 0xa0d1ce iterates it)`);
      assert.ok(waves.length > 0,
        `${stageKey}.${arrayKey} must be NON-EMPTY: an empty waves vector makes MakeStageInst skip the writer at 0xb34b28 and fault at 0xb3507a`);
      for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
        const wave = waves[waveIndex];
        assert.ok(Array.isArray(wave),
          `${stageKey}.${arrayKey}[${waveIndex}] must itself be an ARRAY of monsters: the OUTER dereference at 0xa0d266 is what the INNER loop at 0xa0d2d8 iterates, and a flat record makes operator[] at 0xa0d304 throw on a non-object`);
        assert.ok(wave.length > 0,
          `${stageKey}.${arrayKey}[${waveIndex}] must be non-empty: an empty wave pushes no ACTOR_INFO, so 0xb35078 ldr r1,[r1,#0x8] still dereferences a null list size`);
        for (let monsterIndex = 0; monsterIndex < wave.length; monsterIndex++) {
          const monster = wave[monsterIndex];
          const at = `${stageKey}.${arrayKey}[${waveIndex}][${monsterIndex}]`;
          // Per-monster field TYPES, asserted as typeof and not just presence,
          // because the reads are type-dispatched:
          //  - `ref_id` -> `from_json<std::string>` (`bl 0x00728b08` at 0xa0d310).
          //    THROWS type_error.302 on a non-string.
          assert.equal(typeof monster.ref_id, "string", `${at}.ref_id must be a JSON string (from_json<std::string> at 0xa0d310 throws on any other type)`);
          assert.ok((monster.ref_id as string).length > 0, `${at}.ref_id must be non-empty: it is the 20-byte STAGE_MONSTER handed to CSRCard::SetRefID at 0xb34c50`);
          // --- THE WAVE-REF-ID GUARD (added 2026-10-02-3) --------------------
          // `ref_id` is the first 12 bytes of the 20-byte STAGE_MONSTER
          // (`AddStageMonster` 0xa0d194; stride `adds r0,#0x14` at 0xa0d410),
          // and `FUN_00b4a7a8` (0xb4a7a8) - the builder of
          // `GET /reference/GetMonster`'s `list` - walks the wave vector in a
          // SECOND loop at that exact stride
          // (`00b4a864 adds r5,#0x14` ; `00b4a870 bl 0x00a0b428
          // HasMonsterData` ; `00b4a886 bl 0x006d7efc` string copy) and appends
          // the `ref_id` to the SAME list head (`sp+0x24`) and counter
          // (`sp+0x2c`) that its first loop, over `STAGE_MONSTER_LINK::ids`
          // (stride `0x0c`, i.e. our record-level `show_thumbnail`), fills.
          // `list` is therefore `ids` UNION {every wave ref_id}.
          //
          // `CSRGameMob::GetMonsterData` (0xa0b43c) resolves it with
          // `std::map<string,INFO>::find` on `_server`, asserting at
          // SRGameMob.cpp(38). So every wave `ref_id` MUST be published by
          // `/reference/GetMonster`. The card id `"001"` was measured to fail
          // here: report-014 saw `list=["M001","001"]` and the assertion.
          //
          // Control leg: BLUSTONE_WAVE_REF_ID=card must make this fail.
          const refId = monster.ref_id as string;
          assert.ok(Object.hasOwn(monsters, refId),
            `${at}.ref_id "${refId}" is requested by FUN_00b4a7a8's wave loop (stride 0x14) but is not published by /reference/GetMonster, so CSRGameMob::GetMonsterData misses at SRGameMob.cpp(38). Use a MONSTER id (FIXTURE_WAVE_REF_ID), never a card id.`);
          assert.equal(monsters[refId]._server, refId,
            `${at}.ref_id "_server must equal the requested id or m_mMonsters lookup misses"`);
          //  - `group` / `next_spawn_ms` -> the `tbb` switch at 0xa0d34e /
          //    0xa0d39c (`subs r1,#0x3 ; cmp r1,#0x4 ; bhi` -> `movs r0,#0`). A
          //    number is the intended type; a string parses via strtod and
          //    anything else silently becomes 0. Asserted so the scale factor
          //    applied at 0xa0d3ec is applied to a real number.
          assert.equal(typeof monster.group, "number", `${at}.group must be a JSON number (tbb switch at 0xa0d34e)`);
          assert.equal(typeof monster.next_spawn_ms, "number", `${at}.next_spawn_ms must be a JSON number (tbb switch at 0xa0d39c)`);
        }
      }
      // `_id` is never read by AddStageMonster, but publishing it as an alias
      // is only safe while it is the same array, so assert that explicitly.
      if (arrayKey === "wave_list") {
        assert.deepEqual(entry._id, waves, `${stageKey}._id must alias wave_list so the inert key cannot drift`);
        // The record-level `ref_id` mirrors the first wave record's. It is
        // [RECOVERED] inert - no `operator[]` site in `AddStageMonster` targets
        // it, since all four wave-keyed sites take the INNER deref at 0xa0d2e8 -
        // so it cannot crash anything, but publishing a card id there while the
        // wave carries a monster id would make the response self-contradictory
        // and is exactly the drift this project has been paying for.
        assert.equal(entry.ref_id, waves[0][0].ref_id,
          `${stageKey}.ref_id must mirror the first wave record's ref_id; the wave ref_id is the MONSTER id`);
      }
    }
  }

  // Only the requested stage's waves are returned, on either key mode.
  const targetStage = await postFixture("/reference/GetTargetStageMonster", { stage_id: "N003" }) as Record<string, unknown>;
  assert.equal(targetStage.M001 !== undefined, true,
    "an unknown stage still resolves to the monster-keyed record");
  assert.ok(Object.hasOwn(targetStage, "N003"),
    "the requested stage id must be a key of ret_data: AddStageMonster files the link map under the top-level key, and MakeStageInst reads it back with the stage id in CSRMStage+0x220. Control leg: BLUSTONE_STAGE_MONSTER_KEY=monster_id must make this fail.");
  // `stage_id=""` must not publish the empty string as a key - that is the miss.
  const emptyStage = await postFixture("/reference/GetTargetStageMonster", { stage_id: "" }) as Record<string, unknown>;
  assert.ok(!Object.hasOwn(emptyStage, ""), "an empty stage_id must not become a top-level key");

  // --- show_thumbnail round-trip guard -----------------------------------
  // `CSRGameMob::AddStageMonster` (0xa0d194) builds `STAGE_MONSTER_LINK::ids` by
  // ITERATING `param_2["show_thumbnail"]` and running `from_json<std::string>`
  // on each element (`bl 0x00728b08` at 0xa0d5ac, reached only from the outer
  // loop's exit at 0xa0d260). `FUN_00b4a7a8` then walks that vector and pushes
  // every element into `GET /reference/GetMonster`'s `list` (decomp-04.txt:52-92).
  // So this field is the entire source of the requested ids, and its JSON TYPE is
  // load-bearing: a number or a string iterates to nothing, the vector stays
  // empty, the fetch is skipped, and `m_mMonsters` is never populated.
  //
  // The replica shipped `show_thumbnail: 1` (an integer) for the whole project
  // history, which is why seven runs of fixture-tuning could not move the
  // number. This assertion is the guard that would have caught it.
  // Control leg: BLUSTONE_SHOW_THUMBNAIL=scalar must make it fail.
  type StageEntry = { show_thumbnail: unknown; _id: Wave[]; wave_list?: Wave[] };
  const stageEntry = stageMonsters.M001;
  const thumbnailSites: Array<readonly [string, unknown]> = [["record", stageEntry.show_thumbnail]];
  for (let waveIndex = 0; waveIndex < stageEntry._id.length; waveIndex++) {
    const waveMonsters = stageEntry._id[waveIndex];
    for (let monsterIndex = 0; monsterIndex < waveMonsters.length; monsterIndex++) {
      thumbnailSites.push([`wave[${waveIndex}][${monsterIndex}]`, waveMonsters[monsterIndex].show_thumbnail]);
    }
  }
  for (const [where, value] of thumbnailSites) {
    assert.ok(Array.isArray(value), `show_thumbnail (${where}) must be an ARRAY; a scalar iterates to nothing and empties the id list`);
    assert.ok((value as unknown[]).length > 0, `show_thumbnail (${where}) must be non-empty, or the client requests no monsters at all`);
    for (const id of value as unknown[]) {
      assert.equal(typeof id, "string", `show_thumbnail (${where}) elements must be strings (from_json<std::string> at 0xa0d5ac throws otherwise)`);
      assert.ok((id as string).length > 0, `show_thumbnail (${where}) elements must be non-empty ids`);
      // End-to-end: an id that is requested but not published misses at
      // `CSRGameMob::GetMonsterData` (SRGameMob.cpp:38), which is
      // `std::map<string,INFO>::find` keyed on `_server`.
      assert.ok(Object.hasOwn(monsters, id as string), `show_thumbnail (${where}) id "${id as string}" is requested but not published by /reference/GetMonster`);
      assert.equal(monsters[id as string]._server, id, `_server must equal the requested id or m_mMonsters lookup misses`);
    }
  }
  // ===========================================================================
  // /shop/GachaPremium - the recruitment pull must actually GRANT a card.
  // ===========================================================================
  //
  // The symptom this pins (analysis/research/in-game-stats.md §5.3 / §7): the
  // defeat screen's "Recruit New Hunter" reaches *Recruit Hunters* for free,
  // `Recruit 300` confirms, the client really issues
  // `POST /shop/GachaPremium {"pvid":"1000001","cnt":"11"}`, and the response is
  // 398 bytes with no card in it.
  //
  // The cause is structural, not a missing field.
  // `CSRSyncLottery::ReqGachaPremiumCB` (Ghidra 0xf74fb0) reads
  // `ret_data["card"]` at 0xf75204, sees the generic mock's absent key (`null`),
  // and branches straight to 0xf654e0 - BEFORE it ever builds the
  // `vector<basic_json>` it hands to `CSRPopUpGachaX10Result::ReqGachaPremiumCB`
  // (0xcd7518). The popup therefore opens with an empty vector. The whole
  // derivation is in analysis/research/gacha-premium-contract.md.
  {
    const gachaForm = new URLSearchParams({
      app_code: "_SR", app_ver: "2801", market: "1",
      pvid: String(guest.body.pvid), otp: String(nativeGuest.otp),
      cnt: "11", gacha_type: "1", bonus_level: "0", item_inst_id: "0",
    });
    const pulled = await json("/shop/GachaPremium", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: gachaForm,
    });
    // [RECOVERED] result_code is 1 on EVERY path. A non-1 code puts
    // CPVHTTPManager::Enqueue into the 8x silent retry measured in report-017.
    assert.equal(pulled.body.result_code, 1,
      "`/shop/GachaPremium` must answer result_code 1 even to refuse; a non-1 code triggers the client's "
      + "8x silent retry (AGENTS.md §16.5)");
    const pulledData = pulled.body.ret_data as {
      cnt: unknown;
      card: Array<Record<string, unknown>>;
      user?: { iap_qty: unknown; free_iap_qty: unknown };
    };

    // [RECOVERED] `cnt` is type-checked before use (ldrb; subs #3; cmp #4;
    // bhi 0xf653d8, then strtod), so it must be a JSON NUMBER.
    assert.equal(typeof pulledData.cnt, "number",
      "`ret_data.cnt` must be a JSON number: ReqGachaPremiumCB rejects every tag outside 3..7");
    assert.ok(Array.isArray(pulledData.card) && pulledData.card.length > 0,
      "`ret_data.card` must be a NON-EMPTY array. It is the only thing "
      + "CSRInventory::AddCard and the result popup ever see; the generic mock's "
      + "absent key is what made the gacha screen award nothing.");
    assert.equal(pulledData.cnt, pulledData.card.length,
      "`ret_data.cnt` counts the published awards; the popup indexes `card` by position");

    // [RECOVERED] the published reference table, so we can prove the award is a
    // card the client can actually resolve (GetCardRefID -> GetCardData).
    const cardDefs = (await json("/reference/GetCard", {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    })).body.ret_data as Array<{
      base: { id: string; res_prefix: string; name: string };
      stat: Array<{ rank: number; awk_step: number }>;
    }>;
    const publishedCardIds = new Set(cardDefs.map((entry) => entry.base.id));

    const awardedIds = pulledData.card.map((entry) => String(entry.reward && (entry.reward as { ref_id: unknown }).ref_id));
    const firstAward = pulledData.card[0];
    const awardedId = awardedIds[0];
    assert.equal(firstAward.ref_id, awardedId,
      "the element's own `ref_id` and `reward.ref_id` must agree: the popup resolves the card through "
      + "`FindCardInstBySerial(inst_id)` -> `GetCardRefID` -> `GetCardData`, i.e. through the INSTANCE, "
      + "while `reward.ref_id` is what it reads straight off the JSON");
    assert.ok(publishedCardIds.has(awardedId),
      `the awarded card "${awardedId}" must be published by /reference/GetCard, or CSRCardInfoContainer::`
      + `GetCardData misses and the result popup draws nothing`);
    assert.ok(cardDefs.some((entry) => entry.base.id === awardedId && entry.base.name.length > 0),
      "the awarded card must carry a non-empty `base.name` - the popup prints it under the portrait");

    // [RECOVERED] CSRPopUpGachaX10Result::RESULT::parse (0xcd36a8) reads these
    // six keys with NO null guard: index_id / is_duplicate / inst_id / reward.qty
    // through strtod, reward.ref_id through from_json<std::string>. A missing key
    // walks a JSON null and throws type_error.305 - the project's recurring crash.
    const seenInstIds = new Set<number>();
    for (const [index, entry] of pulledData.card.entries()) {
      assert.equal(typeof entry.index_id, "number", `card[${index}].index_id must be a number`);
      assert.equal(typeof entry.is_duplicate, "number", `card[${index}].is_duplicate must be a number`);
      assert.equal(typeof entry.inst_id, "number", `card[${index}].inst_id must be a number`);
      assert.ok(Number.isSafeInteger(entry.inst_id as number) && (entry.inst_id as number) > 0,
        `card[${index}].inst_id must be a positive serial: the popup looks it up with FindCardInstBySerial`);
      assert.ok(!seenInstIds.has(entry.inst_id as number),
        `card[${index}].inst_id duplicates an earlier award; every award is a distinct instance`);
      seenInstIds.add(entry.inst_id as number);
      const reward = entry.reward as { ref_id: unknown; qty: unknown };
      assert.equal(typeof reward.ref_id, "string", `card[${index}].reward.ref_id must be a STRING`);
      assert.equal(typeof reward.qty, "number", `card[${index}].reward.qty must be a number`);
      // CSRCard::SetRefID asserts sRefID.length() > 0 at SRCard.cpp:731.
      assert.ok(String(entry.ref_id ?? "").length > 0,
        `card[${index}].ref_id must be non-empty or CSRCard::SetRefID asserts`);
      assert.ok(Number.isSafeInteger(entry.rank) && Number(entry.rank) > 0);
      assert.ok(cardDefs.find((definition) => definition.base.id === entry.ref_id)?.stat.
        some((row) => row.rank === entry.rank && row.awk_step === 0),
        `card[${index}] must have reference stat coverage for its awarded grade`);
    }

    // The award must be OWNED, not merely announced: `ret_data.card` populates
    // the client's local inventory, but `/lobby/GetCardInven` is what a relaunch
    // and *Build Team* read, so the card has to be there too.
    const inventory = (await json("/lobby/GetCardInven", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ otp: nativeGuest.otp }),
    })).body.ret_data as Array<{ inst_id: number; ref_id: string }>;
    assert.ok(Array.isArray(inventory),
      "`/lobby/GetCardInven` ret_data must be a BARE ARRAY - CSRPlayData::ParseUserCardInven iterates it directly");
    assert.ok(inventory.some((entry) => entry.ref_id === awardedId),
      `the awarded card "${awardedId}" must appear in /lobby/GetCardInven, otherwise *Build Team` +
      ` cannot show it and a relaunch loses it`);
    const rosterInstIds = inventory.map((entry) => entry.inst_id);
    for (const granted of seenInstIds) {
      assert.equal(rosterInstIds.filter((id) => id === granted).length, 1,
        `granted inst_id ${granted} must be owned exactly once in the persistent inventory`);
    }

    // The ART. A card whose res_prefix has no package in the recovered pack
    // renders as empty animation layers - the same shape of bug as the `ST001`
    // `resource_id` gap (AGENTS.md §16.6 item 3). Assert the package exists on
    // disk; serving it is `BLUSTONE_RESOURCE_ASSET_GLOB` / the CARD_ART_GLOB in
    // tools/start-server.ps1.
    const padAssets = repositoryPath("resources", "runtime", "assets");
    const awardedDef = cardDefs.find((entry) => entry.base.id === awardedId)!;
    assert.ok(existsSync(path.join(padAssets, `${awardedDef.base.res_prefix}.jet`)),
      `the awarded card's res_prefix "${awardedDef.base.res_prefix}" must name a package that exists `
      + `under the recovered PAD pack at ${padAssets}; otherwise the portrait is empty layers. `
      + `Widen the CDN asset set with BLUSTONE_RESOURCE_ASSET_GLOB='${awardedDef.base.res_prefix}.jet'.`);
  }

  const actionPayload = { otp: nativeGuest.otp, stage_id: "n_01_01", deck_inst_id_1: 1 };
  const actionBody = JSON.stringify(actionPayload);
  const items = await json("/lobby/GetItemInven", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otp: nativeGuest.otp }) });
  const itemInventory = items.body.ret_data as { item: unknown; global_item: unknown };
  assert.ok(Array.isArray(itemInventory.item));
  assert.ok(Array.isArray(itemInventory.global_item));
  const missions = await json("/lobby/GetMissionInst", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otp: nativeGuest.otp }) });
  assert.ok(Array.isArray(missions.body.ret_data));
  const gems = await json("/lobby/GetGemInven", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otp: nativeGuest.otp }) });
  assert.deepEqual(gems.body.ret_data, [], "native gem inventory is an instance array, not a currency counter");
  const started = await json("/mission/Start", { method: "POST", headers: { "content-type": "application/json" }, body: actionBody });
  const startData = started.body.ret_data as { accepted: boolean; stage_id: string; battle_id: string; ap: number; battle: { state: string; deck_inst_ids: number[] } };
  assert.equal(startData.accepted, true);
  assert.equal(startData.stage_id, "n_01_01");
  assert.equal(startData.ap, 49);
  assert.match(startData.battle_id, /^local-/);
  assert.equal(startData.battle.state, "active");
  assert.deepEqual(startData.battle.deck_inst_ids, [1]);
  const repeatedStart = await json("/mission/Start", { method: "POST", headers: { "content-type": "application/json" }, body: actionBody });
  assert.equal((repeatedStart.body.ret_data as { idempotent: boolean; ap: number }).idempotent, true);
  assert.equal((repeatedStart.body.ret_data as { ap: number }).ap, 49);
  const activeMissions = await json("/lobby/GetMissionInst", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otp: nativeGuest.otp }) });
  assert.equal((activeMissions.body.ret_data as Array<{ state: number }>)[0].state, 1);
  const completed = await json("/mission/Complete", { method: "POST", headers: { "content-type": "application/json" }, body: actionBody });
  const completeData = completed.body.ret_data as { accepted: boolean; result: number; win: number; stars: number; reward: { gold: number; items: unknown[] }; achieve: unknown[]; user: { gold: { prev: number; cur: number } } };
  assert.equal(completed.body.result_code, 1, "ReqCompleteCB retries silently 8x on any non-1 code (native-mission-complete.txt:1133-1151)");
  assert.equal(completeData.accepted, true);
  assert.equal(completeData.result, 1);
  assert.equal(completeData.win, 1);
  assert.equal(completeData.stars, 3);
  assert.equal(completeData.reward.gold, 10);
  assert.deepEqual(completeData.reward.items, []);
  // [RECOVERED] ret_data shape as CSRSyncMStage::ReqCompleteCB reads it.
  assert.deepEqual(completeData.achieve.map((entry) => (entry as { order: number }).order), [0, 1, 2],
    "achieve[] is the client's only stage progression write (SetStageAchieve)");
  assert.equal(completeData.user.gold.cur - completeData.user.gold.prev, 10);
  assert.equal((completed.body.ret_data as Record<string, unknown>).detect, undefined,
    "a present `detect` skips the user.ap/user.bp resync, so it must be absent");
  assert.equal((completed.body.ret_data as Record<string, unknown>).achievement, undefined,
    "a present `achievement` fires CSRAchieve::ParseAchievementsElement, a /dailyquest/GetInstList request builder");
  const repeatedComplete = await json("/mission/Complete", { method: "POST", headers: { "content-type": "application/json" }, body: actionBody });
  assert.equal(repeatedComplete.body.result_code, 1, "a duplicate clear is answered 1, never a failure code");
  assert.equal((repeatedComplete.body.ret_data as { accepted: boolean; reward: { gold: number } }).accepted, false,
    "a settled attempt has no active reservation; replay receives a neutral native-success receipt");
  assert.equal((repeatedComplete.body.ret_data as { reward: { gold: number } }).reward.gold, 0);
  assert.deepEqual((repeatedComplete.body.ret_data as { achieve: unknown[] }).achieve, []);
  const completedMissions = await json("/lobby/GetMissionInst", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ otp: nativeGuest.otp }) });
  assert.equal((completedMissions.body.ret_data as Array<{ state: number; progress: number }>)[0].state, 2);
  assert.equal((completedMissions.body.ret_data as Array<{ state: number; progress: number }>)[0].progress, 1);

  const loggedIn = await json("/v2/account/Login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pvid: guest.body.pvid, vs_token: nativeGuest.vs_token }),
  });
  assert.equal(loggedIn.body.result_code, 1);
  const refreshedGuest = loggedIn.body.ret_data as Record<string, unknown>;
  assert.equal(refreshedGuest.pvid, guest.body.pvid);
  assert.notEqual(refreshedGuest.otp, nativeGuest.otp, "successful login rotates the native account OTP");

  const wrongLogin = await json("/v2/account/Login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pvid: guest.body.pvid, vs_token: "wrong-vs-token" }),
  });
  assert.equal(wrongLogin.response.status, 200);
  assert.equal(wrongLogin.body.result_code, 1, "guest auto-login permits pvid-only guest resume");
  const resumedGuest = wrongLogin.body.ret_data as Record<string, unknown>;

  const emailRegistration = await json("/login", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email: "native@example.test", password: "native-password" }),
  });
  assert.equal(emailRegistration.body.result_code, 1);
  const nativeEmail = emailRegistration.body.ret_data as Record<string, unknown>;
  assert.equal(nativeEmail.sns_list && typeof nativeEmail.sns_list, "object");
  const webLogin = await fetch(base + "/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "text/html" },
    body: new URLSearchParams({ email: "native@example.test", password: "native-password" }),
  });
  assert.equal(webLogin.status, 200);
  assert.match(await webLogin.text(), /VSWebViewBridge\.SetData/);
  const emailLogin = await json("/v2/account/Login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "native@example.test", pvid: nativeEmail.pvid, vs_token: nativeEmail.vs_token }),
  });
  assert.equal(emailLogin.body.result_code, 1);
  const wrongEmailToken = await json("/v2/account/Login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "native@example.test", pvid: nativeEmail.pvid, vs_token: "wrong-vs-token" }),
  });
  assert.equal(wrongEmailToken.body.result_code, 2001);
  const mismatch = await json("/v2/account/Login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "native@example.test", pvid: guest.body.pvid, vs_token: nativeEmail.vs_token }),
  });
  assert.equal(mismatch.body.result_code, 2001);

  const refreshedActionPayload = { ...actionPayload, otp: resumedGuest.otp };
  const arenaRank = await json("/arena/GetMyRank", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(refreshedActionPayload) });
  assert.equal(arenaRank.body.result_code, 1);
  assert.deepEqual(arenaRank.body.ret_data, { rank: 1 }, "rank route must bypass generic fallback");
  const arenaStart = await json("/arena/BattleStart", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...refreshedActionPayload, target_pvid: 9000001, is_revenge: 0, is_friendship: 0, bid: 0 }) });
  const arenaStartData = arenaStart.body.ret_data as { user: { ap: number; bp: number }; arena: { combat_info: { battle: { pvid: number } } } };
  assert.equal(arenaStart.body.result_code, 1);
  assert.equal(typeof arenaStartData.user.bp, "number");
  assert.equal(arenaStartData.arena.combat_info.battle.pvid, 9000001);
  const arenaComplete = await json("/arena/BattleComplete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...refreshedActionPayload, target_pvid: 9000001, is_revenge: 0,
    play_info: JSON.stringify({ is_win: 1, clear_time: 1, dead_cnt: 0, player_total_hp: 100, player_total_hp_max: 100, enemy_total_hp: 0, enemy_total_hp_max: 100, atk_max: 100, atk_total: 100, atk_cnt: 1 }) }) });
  assert.equal(arenaComplete.body.result_code, 1);
  assert.deepEqual((arenaComplete.body.ret_data as { user: { battle: { win: { prev: number; cur: number } } } }).user.battle.win, { prev: 0, cur: 1 });

  const manifestResponse = await fetch(base + "/reslist_1.list");
  const manifest = await manifestResponse.text();
  assert.equal(manifestResponse.status, 200);
  assert.equal(manifest, "1634659\n1\n495933\nE_NEW,1634659,495933,0,F1E4E6B44C452D7C6AA91ACFD40C5B67,F1E4E6B44C452D7C6AA91ACFD40C5B67\n");

  const packageResponse = await fetch(base + "/E_NEW_1634659.pkg", { headers: { range: "bytes=0-15" } });
  const packageBytes = Buffer.from(await packageResponse.arrayBuffer());
  assert.equal(packageResponse.status, 206);
  assert.equal(packageResponse.headers.get("content-range"), "bytes 0-15/495933");
  assert.equal(packageBytes.length, 16);

  process.env.BLUSTONE_PACKAGE_MODE = "pkgi1";
  const container = Buffer.from(await (await fetch(base + "/E_NEW_1634659.pkg")).arrayBuffer());
  const row = (await (await fetch(base + "/reslist_1.list")).text()).trim().split("\n")[3].split(",");
  assert.equal(Number(row[2]), container.length);
  assert.equal(row[5], crypto.createHash("md5").update(container).digest("hex").toUpperCase());
  assert.equal(container.readBigUInt64LE(0), 1634659n);
  assert.equal(container.readUInt32LE(16), 1);
  const filenameLength = container[20];
  assert.equal(container.subarray(21, 21 + filenameLength).toString(), "E_NEW.jet");
  const size = container.readUInt32LE(21 + filenameLength);
  const offset = container.readUInt32LE(25 + filenameLength);
  assert.equal(offset + size, container.length);
  assert.equal(row[4], crypto.createHash("md5").update(container.subarray(offset)).digest("hex").toUpperCase());
  const ranged = await fetch(base + "/E_NEW_1634659.pkg", { headers: { range: `bytes=${offset}-` } });
  assert.equal(ranged.status, 206);
  assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), container.subarray(offset));
  delete process.env.BLUSTONE_PACKAGE_MODE;

  const docs = await json("/openapi.json");
  assert.equal(docs.response.status, 200);
  assert.equal(docs.body.openapi, "3.0.3");
  assert.ok(Object.keys(docs.body.paths as Record<string, unknown>).length >= context.endpoints.length);
  const documentedPaths = docs.body.paths as Record<string, { post?: Record<string, unknown>; get?: Record<string, unknown> }>;
  for (const route of ["/reference/GetStage", "/reference/GetCard", "/lobby/GetCardInven", "/relation/BlockList"]) {
    assert.equal(documentedPaths[route].post?.["x-reverse-engineering-status"], "native-parser-reconstructed");
    assert.ok(String(documentedPaths[route].post?.description).length > 200);
  }
  assert.ok(documentedPaths["/maintenance-replica-online"].get);
  assert.ok(documentedPaths["/ad_unit_id_1"].get);
  assert.equal((documentedPaths["/maintenance-replica-online"].get.responses as Record<string, unknown>)["200"] !== undefined, true);
  const handoff = await fetch(base + "/maintenance-replica-online");
  assert.equal(handoff.status, 200);
  assert.match(await handoff.text(), /Blustone Replica/);

  console.log(`TypeScript smoke test passed with ${context.endpoints.length} recovered routes.`);
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
