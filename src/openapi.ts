import type { BaseInfo } from "./state.js";

export interface OpenApiDocument {
  openapi: "3.0.3";
  info: Record<string, unknown>;
  servers: Array<Record<string, unknown>>;
  tags: Array<Record<string, unknown>>;
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, unknown>;
  externalDocs: Record<string, string>;
}

const evidenceExtension = {
  "x-reverse-engineering-status": "recovered-native-route",
  "x-evidence": "analysis/native-all-strings.tsv and analysis/native-network-decomp.txt",
  "x-runtime-confidence": "route literal confirmed; payload/response shape pending ARM-device capture",
};

const jsonRequest = {
  required: false,
  content: {
    "application/json": { schema: { $ref: "#/components/schemas/GenericRequest" } },
    "application/x-www-form-urlencoded": { schema: { type: "object", additionalProperties: { type: "string" } } },
    "application/octet-stream": { schema: { type: "string", format: "binary" } },
  },
};

const commonHeaders = [
  {
    name: "PV-AccessToken",
    in: "header",
    required: false,
    schema: { type: "string" },
    description: "Transport-session token returned by shared_secret/Exchange. Required for native encrypted requests; distinct from the account OTP sent inside the encrypted form body. Keys survive restart when BLUSTONE_STATE_FILE is configured; otherwise they are in memory only. The local state file contains secrets and must never be published.",
  },
  {
    name: "PV-Signature",
    in: "header",
    required: false,
    schema: { type: "string" },
    description: "Observed native request-signature header. Exact canonicalization remains unverified.",
  },
];

function response(description: string, schema: Record<string, unknown> = { $ref: "#/components/schemas/ResultEnvelope" }) {
  return {
    "200": { description, content: { "application/json": { schema } } },
    "404": { description: "Route not present in the recovered catalog." },
    "500": { description: "Local scaffold failure.", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
  };
}

function operation(summary: string, description: string, tag: string, responses = response("Mock-compatible response.")) {
  return {
    summary,
    description,
    tags: [tag],
    parameters: commonHeaders,
    requestBody: jsonRequest,
    responses,
    ...evidenceExtension,
  };
}

function tagFor(path: string): string {
  const prefix = path.split("/")[1] ?? "misc";
  const labels: Record<string, string> = {
    launcher: "Launcher",
    shared_secret: "Security handshake",
    v2: "Account and authentication",
    account: "Account and authentication",
    pv_account: "Account and authentication",
    reference: "Reference data",
    lobby: "Lobby and session",
    shop: "Commerce",
    gacha_period: "Gacha",
    guild: "Guild",
    gvg: "Guild versus guild",
    arena: "Arena",
    relation: "Social and relation",
    message: "Mail and messaging",
    world: "World state",
  };
  return labels[prefix] ?? prefix;
}

function stubDescription(route: string): string {
  return [
    `The route literal **${route}** was recovered from the ARM native library.`,
    "The exact request fields and response model have not yet been confirmed with a live ARM-device capture.",
    "The local scaffold accepts JSON, URL-encoded form data, or opaque octet bodies and returns a success envelope with mock data.",
    "Replace this handler with a persistence-backed implementation once the corresponding request/response pair is captured.",
  ].join("\n\n");
}

export function buildOpenApi(endpoints: string[], baseUrl = "http://127.0.0.1:8080"): OpenApiDocument {
  const paths: Record<string, Record<string, unknown>> = {
    "/reslist_{version}.list": {
      get: {
        summary: "Return the native CDN resource manifest",
        description: [
          "The launcher/CDN layer requests this plain-text manifest before downloading patch packages.",
          "The first three lines are the manifest stamp, package count, and total package bytes. Each following line is `name,stamp,size,step,sign,md5`. Every line must end with a newline.",
          "The client generates `/{name}_{stamp}.pkg` itself. The sixth column is an optional uppercase MD5 of that entire downloaded container, checked by CPVCDN::UnpackAsynTask before unpacking. It is not a URL or filename. The replica emits a separate fifth-column signature for the inner JET; its complete native semantics remain under investigation.",
          "This route is intentionally documented as a compatibility protocol rather than a JSON API.",
        ].join("\n\n"),
        tags: ["CDN and resources"],
        parameters: [{
          name: "version",
          in: "path",
          required: true,
          schema: { type: "integer", minimum: 0, example: 1 },
          description: "Resource-list version requested by the native CDN client.",
        }],
        responses: {
          "200": {
            description: "Newline-delimited resource manifest.",
            content: { "text/plain": { schema: { type: "string", description: "Three scalar header lines followed by CSV resource rows. Hashes must describe the bytes served by the active package mode." } } },
          },
          "404": { description: "The requested resource-list route is unavailable." },
        },
        "x-reverse-engineering-status": "recovered-native-parser",
        "x-runtime-confidence": "header field order recovered from CPVCDN::ParseHeader; exact server-side stamp policy remains configurable",
      },
    },
    "/{package}.jet": {
      get: {
        summary: "Download an allowlisted CDN package",
        description: [
          "Serves a local `.jet` package after the native client accepts the resource manifest.",
          "The replica only serves explicitly configured package names from `BLUSTONE_PACKAGE_DIR`; path traversal and arbitrary filesystem reads are rejected.",
          "The same handler also accepts `/cdn/{package}.jet`, `/resource/{package}.jet`, and `/resources/{package}.jet` for clients whose recovered URL template includes a prefix. The native downloader’s observed URL is `/{name}_{stamp}.pkg`; the local server maps that allowlisted package URL to the recovered `.jet` bytes and honors HTTP Range requests.",
        ].join("\n\n"),
        tags: ["CDN and resources"],
        parameters: [{
          name: "package",
          in: "path",
          required: true,
          schema: { type: "string", pattern: "^[A-Za-z0-9_.-]+$", example: "E_NEW" },
          description: "Allowlisted package basename without the `.jet` suffix.",
        }],
        responses: {
          "200": { description: "Raw JET package bytes.", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
          "404": { description: "Package is not present in the configured local package directory." },
        },
        "x-reverse-engineering-status": "recovered-native-download-path",
        "x-runtime-confidence": "package naming and six-field manifest row are recovered; URL prefix is accepted in several local-compatible forms",
      },
    },
    "/{name}_{stamp}.pkg": {
      get: {
        summary: "Download a native CDN package with Range support",
        description: [
          "This is the URL shape observed after the native client accepts a resource row: `/{name}_{stamp}.pkg`.",
          "The local replica maps the allowlisted package name to the recovered local resource payload and honors the client’s HTTP Range requests.",
          "With BLUSTONE_PACKAGE_MODE=pkgi1, responses contain a reconstructed binary container: a 20-byte header, then records consisting of u8 filename byte length, UTF-8 filename, u32 little-endian payload size, and u32 little-endian absolute payload offset. The header begins with a u64 little-endian stamp and has the item count at offset 16; offsets 8 and 12 remain incompletely understood. Payloads follow the record table. Native unpack completion is not yet verified.",
        ].join("\n\n"),
        tags: ["CDN and resources"],
        parameters: [
          {
            name: "name",
            in: "path",
            required: true,
            schema: { type: "string", pattern: "^[A-Za-z0-9_.-]+$", example: "E_NEW" },
          },
          {
            name: "stamp",
            in: "path",
            required: true,
            schema: { type: "integer", example: 1634659 },
            description: "Per-package resource stamp from the manifest row.",
          },
          {
            name: "Range",
            in: "header",
            required: false,
            schema: { type: "string", example: "bytes=0-" },
            description: "Native downloader range request; the replica returns 206 when valid.",
          },
        ],
        responses: {
          "200": { description: "Complete package payload.", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
          "206": { description: "Partial package payload for a valid Range request.", content: { "application/octet-stream": { schema: { type: "string", format: "binary" } } } },
          "404": { description: "Package name is not allowlisted or present locally." },
          "416": { description: "Range is unsatisfiable." },
        },
        "x-reverse-engineering-status": "recovered-native-url-observation",
        "x-runtime-confidence": "URL shape, Range usage, and 206 response observed from the emulator; payload wrapper format remains under reconstruction",
      },
    },
    "/healthz": {
      get: {
        summary: "Health check",
        description: "Local process health and scaffold state. This is not an original APK route.",
        tags: ["Local diagnostics"],
        responses: response("Process is alive.", { $ref: "#/components/schemas/HealthResponse" }),
        "x-reverse-engineering-status": "local-scaffold",
      },
    },
    "/debug/routes": {
      get: {
        summary: "Recovered route inventory",
        description: "Returns the endpoint catalog extracted from the native string evidence.",
        tags: ["Local diagnostics"],
        responses: response("Recovered route groups.", { $ref: "#/components/schemas/RouteInventory" }),
        "x-reverse-engineering-status": "local-scaffold",
      },
    },
    "/debug/state": {
      get: {
        summary: "Local mock state summary",
        description: "Returns counts and mode flags without returning account tokens.",
        tags: ["Local diagnostics"],
        responses: response("Local state summary.", { $ref: "#/components/schemas/StateSummary" }),
        "x-reverse-engineering-status": "local-scaffold",
      },
    },
    "/maintenance-replica-online": {
      get: {
        summary: "Show the local maintenance handoff page",
        description: "A local HTML handoff used by the native launcher when it resolves a maintenance/community URL. It is deliberately a diagnostic page, not a gameplay API or an assertion that the upstream service is available.",
        tags: ["Launcher"],
        responses: {
          "200": {
            description: "HTML handoff page rendered by the local replica.",
            content: { "text/html": { schema: { type: "string" } } },
          },
        },
        "x-reverse-engineering-status": "local-compatibility-route",
        "x-evidence": "server-ts/src/server.ts; analysis/native-launcher-init.txt",
        "x-runtime-confidence": "Route is implemented locally; the native client normally enters this branch only for maintenance/community flows.",
      },
    },
    "/d_unit_id_1": {
      get: {
        summary: "Accept the native ad-unit compatibility probe",
        description: "The launcher can resolve an ad-unit URL while building its maintenance/community surface. The local replica accepts the probe with no body.",
        tags: ["Launcher"],
        responses: { "204": { description: "Probe accepted with no response body." } },
        "x-reverse-engineering-status": "local-compatibility-route",
        "x-evidence": "analysis/native-all-strings.tsv; server-ts/src/server.ts",
      },
    },
    "/ad_unit_id_1": {
      get: {
        summary: "Accept the corrected native ad-unit URL key",
        description: "Compatibility spelling for the native `ad_unit_id_1` URL key. The route is intentionally side-effect free.",
        tags: ["Launcher"],
        responses: { "204": { description: "Probe accepted with no response body." } },
        "x-reverse-engineering-status": "local-compatibility-route",
        "x-evidence": "analysis/native-all-strings.tsv; server-ts/src/server.ts",
      },
    },
    "/VERSION": {
      post: operation("Return client/resource version state", "The APK stores `/VERSION` as a local/server version state path. The scaffold returns the APK version and resource version.", "Launcher"),
    },
    "/AUTHORIZATION_REQUEST": {
      post: operation("Authorize local replica session", "Local compatibility response for the launcher authorization path. This is not an implementation of the original authorization service.", "Launcher"),
    },
    "/selected_server": {
      post: operation("Select replica server", "Stores the selected server id in local memory. The original APK also persists a selected-server state value.", "Launcher"),
    },
    "/launcher/GetBaseInfo": {
      post: operation(
        "Return launcher/base-info configuration",
        "Recovered native flow: the launcher sends device/app metadata and receives `pv_url`, `country_code`, `url_list`, `client_option`, `app_srv_list`, `app_srv_name_list`, `state`, and `recommend_server`. The local replica advertises `_SR` and its API/CDN addresses, and the current BlueStacks run uses state `2` for the online branch. Set `BLUSTONE_LAUNCHER_STATE=1` to reproduce the maintenance branch; state is intentionally configurable while the native enum mapping is still being documented.",
        "Launcher",
        response("Launcher configuration.", { $ref: "#/components/schemas/BaseInfoResponse" }),
      ),
    },
    "/shared_secret/Exchange": {
      post: operation(
        "Exchange native HTTP shared-secret material",
        "Recovered native flow: the client posts a base64url-encoded P-384 SubjectPublicKeyInfo as `publicKey`. The replica returns a raw P-384 SubjectPublicKeyInfo body, a `PV-AccessToken`, and a Base64 HMAC-SHA384 `PV-Signature` over that body. The derived key is retained for the next secure request layer.",
        "Security handshake",
        response("Raw server public key. The access token and signature are response headers.", { type: "string", format: "binary", description: "DER-encoded P-384 SubjectPublicKeyInfo." }),
      ),
    },
    "/v2/account/RegisterGuest": {
      post: operation("Register or retrieve a local guest account", "Creates or retrieves a guest account by device_id, binds the confirmed pvid to the PV-AccessToken transport session, and returns the native login-shaped payload. Observed native form fields: app_code, app_ver, device_id, extra_data, market, platform, srv_id. Native clients encrypt this form after the P-384 exchange. The response contains nonempty otp, stable vs_token, sns_list, begin_utc, and server_url; CPVDataMgr::ParseLoginResult returns early on empty otp and leaves the gameplay host empty. Subsequent native requests use otp in the encrypted form body. Configure BLUSTONE_STATE_FILE to persist accounts, credentials, and transport-session bindings atomically across restarts. This single-process research store is not a production authentication service.", "Account and authentication", response("Guest account.", { $ref: "#/components/schemas/AccountResponse" })),
    },
    "/v2/account/Login": {
      post: operation("Login to a local account", "Resolves email and pvid independently and requires both identifiers to refer to the same account when both are supplied. Registered accounts require an exact persistent vs_token; guest resume permits pvid-only native auto-login. Successful login rotates otp, binds the confirmed pvid to the PV-AccessToken session, and returns plaintext result_code=2001 on failure so the native decryptor can parse the error.", "Account and authentication", response("Account session.", { $ref: "#/components/schemas/AccountResponse" })),
    },
    "/login": {
      get: operation("Render local email-login form", "Local WebView compatibility page used to create or authenticate an email account before the native /v2/account/Login call.", "Account and authentication"),
      post: operation("Create or authenticate local email account", "Accepts email and password form fields, stores a local scrypt password verifier, issues stable vs_token plus a fresh otp, and returns the native login-shaped account payload.", "Account and authentication", response("Email account session.", { $ref: "#/components/schemas/AccountResponse" })),
    },
    "/account/ConfirmNickname": {
      post: operation("Confirm local nickname", "Resolves the native account OTP in the request body and updates nick_name (nickname is also accepted). Saves the mutation when BLUSTONE_STATE_FILE is configured. Restart persistence is tested; full client nickname-validation/error semantics remain incomplete.", "Account and authentication", response("Updated account.", { $ref: "#/components/schemas/AccountResponse" })),
    },
    "/pv_account/get_token": {
      post: operation("Return local account token", "Returns the token issued by the local guest-account handler.", "Account and authentication"),
    },
    "/pv_account/register_push_token": {
      post: operation("Register a push token", "Stores a push token in local mock state. Firebase delivery is not implemented.", "Account and authentication"),
    },
  };

  const explicitlyDocumented = new Set(Object.keys(paths));
  paths["/tuto/Clear"] = { post: {
    ...operation("Persist the requested tutorial completion",
      "CSRSyncTutorial::RequestClear posts unsigned type and step with account fields. ReqClearCB reads numeric ret_data.type and ret_data.step and marks that exact pair state3. The replica validates uint32 keys, persists account-scoped completion and acknowledges the same pair on retries. Login and lobby merge stored completion with bootstrap bypass rows, emitting one row per pair with completed truth taking precedence: native Parse can overwrite state3 with a later false row. Ordinary pairs omit unknown rewards. Guided37/1 requires completed37/0, a completed winning local Search and enough owned unlocked traces for the current target. It uses the published local trace exchange threshold to award one full card collection and consume_result.item delta, persisting hunter, trace debit and completed pair together. Repeated acknowledgement omits reward/debit. Original guided reward economics remain unknown; no automatic flag clear or live grant occurs. Native guided recruitment display still requires runtime validation.", "Lobby and session"),
    "x-evidence": "analysis/research/tutorial-clear-contract.md; server-ts/tests/tutorial.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
  } };
  explicitlyDocumented.add("/tuto/Clear");
  paths["/gym/SkillUp"] = { post: {
    ...operation("Improve one owned hunter skill",
      "CSRSyncCard::RequestSkillUp posts target_inst_id and skill_idx (type1..5). ReqSkillUpCB reads DIRECT ret_data.target_inst with inst_id and selected skill_N_level:{prev,cur}, plus ret_data.skill_idx, user.gold:{prev,cur} and consumed_inst_list. The replica validates ownership, unlocked slot, reference rank eligibility, role/rank cap and gold before persisting one level and gold together. Inventory lock prevents destruction, not skill improvement. Local policy is +1 per accepted request, gold100*destinationLevel, zero materials; original prices and increment implementation are missing. Each accepted call is a separate upgrade: the native request has no nonce or expected level, so transport exactly-once is not promised. Local refusal code2001 skips native mutation parsing. The separately documented MultiSkillUp route has a different batch response contract.", "Cards and training"),
    "x-evidence": "analysis/research/skill-up-contract.md; analysis/research/skill-level-reference.md; server-ts/tests/skill-training.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Server persistence and response tested; native popup/upgrade validation pending",
  } };
  explicitlyDocumented.add("/gym/SkillUp");
  paths["/gym/MultiSkillUp"] = { post: {
    ...operation("Improve a batch of one hunter's skills",
      "Recovered request uses target_inst_id and the intentional typo mulit_skill_up_count: JSON text for five numeric counts in type1..5 order. The replica validates all slots/caps and sums every intermediate local price before mutating any skill or gold. Response target_inst is direct, with inst_id and selective skill_N_level:{cur}; ReqMultiSkillUpCB null-guards unselected fields and reads only cur. Optional user supplies gold prev/cur; consumed_inst_list is empty for the local gold-only fixture. Original item rows use absolute {inst_id,remain}, distinct from incremental charges. Prices are100*destinationLevel and caps are community-derived fixtures/inference. Native batch callback UI parameters differ from single training. A genuine singleton batch upgrade of Tyltyl5 slot1 from1 to2, gold200, nextprice300 and preserved roster is verified; arbitrary multi-slot/multi-count training remains unverified. Requests have no recovered nonce/expected level; accepted calls are distinct upgrades.", "Cards and training"),
    "x-evidence": "analysis/research/multi-skill-up-refusal.md; server-ts/tests/skill-training.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Server whole-batch validation/persistence tested; native singleton batch upgrade verified, wider batches pending",
  } };
  explicitlyDocumented.add("/gym/MultiSkillUp");
  paths["/gym/RankUp"] = { post: {
    ...operation("Advance a hunter with credited same-grade materials",
      "Recovered request posts target_inst_id, source_inst_list as JSON numeric-ID array, and is_tuto0/1. ReqRankUpCB reads user.gold prev/cur and user.deck, then card.target_inst inst_id/rank/rank_up_cnt/exp prev/cur pairs. card.removed_inst_list contains BARE numeric IDs, unlike LevelUp object rows. The inferred revival policy requires ordinary max level, ranks1..4, same-grade unlocked unused materials and capacity=current rank: partial p+n retains rank/EXP; reaching capacity promotes one grade, resets counter and EXP. Overflow refuses. Counts follow historical community guidance;1000 gold/source and5percent bonus per credited material are fixtures. Native skips real source IDs below capacity as synthetic credits, so the server refuses that legacy compatibility edge without renumbering ownership. Target-in-active-battle, protected leader/deck/battle materials and malformed requests refuse atomically. Source consumption prevents retry duplication. Target skills are preserved because this callback does not read automatic unlock fields; new eligible zero-level slots need further investigation. Gold, target, sources, deck cleanup and book maximum persist together. Awakening, guild discounts and original partial/EXP behavior remain unreconstructed. Native preview/partial/full/relaunch validation is pending.", "Cards and training"),
    "x-evidence": "analysis/research/rank-up-contract.md; analysis/research/rank-up-partial-arithmetic.md; analysis/research/rank-up-implementation-audit.md; server-ts/tests/rank-up.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed-with-inferred-transition",
    "x-runtime-confidence": "Server partial/full persistence tested; native UI pending",
  } };
  explicitlyDocumented.add("/gym/RankUp");
  for (const [route, summary] of [["/reference/GetItem", "Read resource, capsule and hunter trace references"],
    ["/shop/BuyGlobalItem", "Purchase a local AP or BP refill"]]) {
    paths[route] = { post: {
      ...operation(summary,
        "Native item reference is ret_data{item,trace,global_item}; item.effect is a STRING. Hunter trace use_type3/effect005 or006 binds explicit local item IDs to Gerard/Sylvester. Flat trace rows use item_id/order/type3/source_id n_01_07/thumb_id; native activation requires actual stars on that source. Trace IDs, thresholds and association are local navigation fixtures; no rewards, recruitment or grants are implemented. Local local_ap/use_type1 provides10 AP and local_bp/use_type2 provides5 BP; thumbnails IT_ST/IT_LT are reconstructed candidates. Global prices publish exact buy counts1..3 for Manda5/type1 and gold100/type2; missing native tiers return0, never cap-to-last. Buy request requires target_ref_id, price_type, item_inst_id0, qty1. Unsupported tickets/items/quantities refuse with provisional code2001. Local policy allows3 purchases per resource shared across currencies per UTCday; rollback never reopens a capped cycle, overflow is preserved, and Manda total is charged once free-first. Identity, prices, amount, reset and limit policy are fixtures; original values remain unknown. Success supplies neutral jackpot1/1, scalar user.iap balances or user.gold pair, user.ap or user.bp prev/cur/deadline INSIDE its resource object, and target_inst item_id/price_type/buy_cnt prev-cur. GetItemInven restores scalar global_item count rows. Independent AP/BP counters, resource balances and wallet persist together. No native nonce was recovered: separate accepted requests are distinct purchases, transport exactly-once is not promised. Native shop receipt/relaunch validation pending.", "Shop and economy"),
      "x-evidence": "analysis/research/shop-fuel-contract.md; analysis/research/shop-fuel-price-and-inventory.md; analysis/research/shop-bp-contract.md; server-ts/tests/shop-fuel.ts",
      "x-runtime-confidence": "Server transaction/persistence tested; native purchase UI pending",
      "x-search-capsules": "AIRSHIP_TICKET identity and acquisition from general stages are native-derived. Local policy awards one per new matching normal campaign victory, requiring explicit clear1 and an active attempt. No loss/duplicate/standalone/retroactive grants. Additive item[].added receipts and inventory persist together. Capsule use_type0 and other metadata are inert local fixtures, original rate unknown. Native earning/display remains unverified; capsule purchases are unsupported.",
    } };
    explicitlyDocumented.add(route);
  }
  for (const [route, summary] of [
    ["/reference/V2_GetSupply", "Read reconstructed Supply reference"],
    ["/lobby/V2_GetSupplyInst", "Read persisted Supply availability"],
    ["/supply/Refresh", "Refresh Supply availability"],
    ["/supply/ActivityReward", "Claim the local fuel activity"],
  ]) {
    paths[route] = { post: {
      ...operation(summary,
        "Native SetSupply reads reference attend/attend_progress/attend_newbie/activity/login_bonus collections. ParseSupplyInfo uses a different attendance object, omitted in this AP-only reconstruction, and login_bonus {cur_value,cycle,cycle_log}. Activity reference and instance arrays align by ordinal with matching id strings. Native fuel statuses0 unavailable,1 claimable,2 received are recovered. ActivityReward posts id and reads target_inst{id,status} plus optional user.ap{cur,ap_charge_time}; the deadline is INSIDE ap. Local activity local_fuel_0 awards10 AP once per UTC day, preserving overflow. Identity, amount, daily reset and free-only policy are explicit fixtures; original tables and paid recovery/status3 remain unknown. Claim day and AP persist together; duplicate, unknown-id and clock-rollback claims refuse with provisional code2001. Refresh returns activity plus next daily activity_refresh_utc. Native Supply rendering/claim/relaunch validation remains pending.", "Supply"),
      "x-evidence": "analysis/research/supply-refresh-contract.md; analysis/ghidra-supply-fuel-ui.txt; server-ts/tests/supply.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed-with-fixture-economy",
      "x-runtime-confidence": "Server claims and persistence tested; native UI pending",
    } };
    explicitlyDocumented.add(route);
  }
  paths["/world/SetDeck"] = { post: {
    ...operation("Save an owned hunter formation",
      "CSRSyncMStage::RegisterDeck posts deck_info as JSON array text: [{type:1,list:[ordered numeric instance IDs]}]. Native Build Team sends four slots; ParseDeckSetting reads five lobby fields. The replica accepts one-to-five input slots and pads the stored/listed formation to five. Lobby returns deck rows with inst_id_1..5. ReqDeckCB only checks result_code; ret_data is not parsed on save. Ownership, duplicate instances/types, nonempty formation and whole-batch validity are checked before atomic persistence. Duplicate rejection and integrity cleanup of consumed IDs from unprotected presets are local policies; role restrictions beyond the native minimum-one-hunter rule remain unpinned. Native save/reload and mixed Mowgli-frontline/Lantern-airship combat verified in analysis/testing/revival-003.md. Original stats/skills/economy remain fixtures or incomplete.", "Cards and training"),
    "x-evidence": "analysis/research/mission-deck-contract.md; server-ts/tests/decks.ts; analysis/testing/revival-003.md",
    "x-reverse-engineering-status": "native-parser-reconstructed",
  } };
  explicitlyDocumented.add("/world/SetDeck");
  paths["/gym/LevelUp"] = { post: {
    ...operation("Train an owned hunter using source hunters",
      "Recovered CSRSyncCard::RequestLevelUp / ReqLevelUpCB contract. target_inst_id identifies the owned target; source_inst_list is JSON array text of source IDs. Ownership, source uniqueness/locks, leader/deck protection, level cap and gold are checked before consumption/XP persistence. ret_data.user carries gold prev/cur and deck; ret_data.card carries target_inst {inst_id,exp:{prev,cur}} and removed_inst_list OBJECTS {inst_id}. Ordinary ranks1..5 have30 dense levels, supported by historical community cap evidence. Cumulative XP100*(level-1), source XP100*level and100gold/source are local fixtures; old thresholds0/100 and yields100/200 are unchanged. Original XP/stats/prices and awakened caps remain missing. Local refusal2001 skips native mutation parsing.",
      "Cards and training"),
    "x-evidence": "analysis/research/training-raise-followup.md; analysis/research/revival-systems-next.md; server-ts/tests/training.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Native Raise request, consumption, gold and final Lv2 panel verified in analysis/testing/revival-002.md; balance remains fixture and result-popup power discrepancy unresolved",
  } };
  paths["/card_handler/ToggleLock"] = { post: {
    ...operation("Toggle an owned hunter lock",
      "Recovered request sends target_inst_id and account fields, with no desired-state field. ReqCardLockCB consumes flat numeric ret_data.inst_id and ret_data.lock. The replica toggles and persists the account-owned instance lock. Missing/foreign instances are refused without mutation.", "Cards and training"),
    "x-evidence": "analysis/research/training-raise-followup.md; server-ts/tests/training.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
  } };
  paths["/reference/GetCardEnhancePrice"] = { post: {
    ...operation("Read hunter training prices",
      "SetCardEnhancePrice consumes direct numeric ret_data.level and ret_data.rank arrays. GetCardRaisePrice/GetCardRankUpPrice select requested rank minus1, capped to the last row. Nonempty arrays are mandatory to avoid invalid native reads. Current vectors [100] and [1000] are replica fixtures, not recovered economy values.", "Reference data"),
    "x-evidence": "analysis/research/revival-systems-next.md; server-ts/tests/training.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
  } };
  for (const route of ["/gym/LevelUp", "/card_handler/ToggleLock", "/reference/GetCardEnhancePrice"]) explicitlyDocumented.add(route);
  const arrayContracts = [
    { route: "/reference/GetCardBook", tag: "Reference data", schema: "CardBookBonus",
      description: "Collection-bonus thresholds consumed by CSRRefData::SetCardBook and FindCardBook. Each row uses card_role, target_cnt and effect. IMPORTANT: effect is a JSON-encoded STRING, not an embedded object. The ARM crash probe located a fault in FindCardBook when the role table was missing: the lookup assumes the role exists. Current rows cover provisional roles 0 through 4 at counts 0 and 1 with zero bonuses. These neutral bootstrap values are not production balance or a full collection progression table.",
      evidence: "analysis/native-cardbook.txt; tools/arm-crash-probe.c" },
    { route: "/lobby/GetCardBook", tag: "Lobby and session", schema: "CardBookOwned",
      description: "Historical card collection consumed by CSRPlayData::ParseCardBook. ret_data is an array of ref_id/rank records, distinct from owned instances in GetCardInven. The replica persists maximum acquired grade per reference, including consumed hunters; old saves migrate known currently owned references. Original collection reward bonuses remain neutral fixtures. Reference IDs must resolve to GetCard and role-keyed GetCardBook bonuses.",
      evidence: "analysis/native-cardbook-instance.txt" },
    { route: "/reference/GetStage", tag: "Reference data", schema: "StageReference",
      description: "Stage definitions consumed by CSRGameStage::SetStage. ret_data is a BARE ARRAY - the native parser indexes that collection before reading each record; an object wrapper (we used to send {stage:[...]}) is never indexed and leaves the native stage table empty. The native stage lookup reads stage_id; id is retained as a compatibility alias for diagnostics and route-driven tests, and both values must match. IMPORTANT: achieve_condition is JSON-encoded array TEXT, while item is an actual array of item strings. The stage links in GetArea must refer to these IDs. THE PUBLISHED TABLE IS NOW THE RECOVERED CAMPAIGN (added 2026-10-03): [RECOVERED] exactly the 50 stage ids of analysis/recovered-data/campaign-stages.csv (`n_01_01`..`n_05_10`, ten per area across `n_01`..`n_05`, from LEVELING.jet chunk 0 in the base APK) and nothing else. The seventeen records this route used to publish mixed TWO id namespaces - `N001`..`N013`/`N500`..`N502`, which are PAD ART FILENAMES, used as stage records, plus the one real `GetStageID` id `n_01_01` - and only `n_XX_YY` is the game's real stage identity. BLUSTONE_CAMPAIGN=minimal restores the old seventeen-record table in one environment variable. WHY 50 RECORDS ARE A DIFFERENT PROPOSITION FROM THE 432-RECORD SWEEP THAT THREW std::out_of_range (AGENTS.md section 11): every published id here is the game's real identity rather than a guess at a naming scheme; every published id is REFERENCED by exactly one area's stage[] links, so each has a map node that can ask for it; and 5x10 is what the shipped data says, while the client derives its per-area node count from GetStageCnt(area) and never from the table length. SetStage keys a std::vector<STAGE_INFO> (stride 0xac) BY ID via a linear GetStageData scan, so table length is not itself a bound - the one index-sensitive reader is `achieve[].order` in the /mission/Complete parser, which is bounded to native indices0..2 and is unrelated to this table. [RECOVERED] only `id`; the link's `serial` is the 1-based position the replica publishes, NOT the CSV's own column, which is 1..9,0 in every area - STAGE_LINK is {int32 serial; std::string id} and CSRSceneMStageMap::OnInit inserts (serial -> GetStageAchieveCnt(id)) into an ORDERED std::map<int,int>, so a 0 would sort before 1 and move the final node to the left of the map; that CSV column's role is [UNRESOLVED]. [FIXTURE] ap_cost, gold, character_exp, group_exp, enemy_atk_per, enemy_hp_per, power, title, desc, story_id, begin_dialog_id, end_dialog_id, order, type, value and item are all local placeholders - `story_id` is deliberately NOT taken from the CSV's `pv` column (1100001..1100050) because story_id indexes a dialogue table and a wrong id there is a load fault, and the CSV's `global`/`cmge` obfuscated tokens are not published at all because their namespace is unknown. res_prefix IS THE ENVIRONMENT SELECTOR, NOT AN ART NAME, and this is the single most consequential field on the route: [RECOVERED] CSRGameBase::InitBackground (0x9cbe8c) calls CSRGameStage::GetStageData(this+0x220), reads *(stage+0x70) (= res_prefix) and its length, and passes res_prefix to CSRGameBase::OnInitBackground when non-empty, else the stage id. OnInitBackground (0x9cbf34) then does std::map<string,CSRStaticData::ENV_INFO>::find(CSRStaticData+0x150, key) and reads node+0x34 (= ENV_INFO.PreFix) WITHOUT testing end() (0x9bbf62 mov r5,r0 / 0x9bbf66 ldrb r0,[r5,#52]!, no compare), then CMFormat(buf, \"%s_%s\", PreFix, suffix) for each of the five depth bands. A MISS is therefore silent and fatal: it reads the tree end-node, PreFix formats as the empty string, the 30 scrolling background layers are named _A0.._A9/_D0.._D9/_E0.._E9 with no prefix (exactly the analysis/r015/logcat-all.txt set), CSRGameScrollBGDraw::Load (0x9c0444) attaches no CMImageNode child because it only does so in the else branch of if (CMImageNode::LoadAnim(...) == 0), and CSRGameScrollBGDraw::OnUpdate (0x9be8d8) dereferences element [0] of the resulting empty vector<shared_ptr<CMImageNode>> at ELF 0x9aebd7. The valid keys are the #ID column of environments.csv (0-19, 99, 100, 200, 502-537, 801, 900-907, 998), RECOVERED at analysis/recovered-data/environments.csv from LEVELING.jet chunk 5 in the base-APK assets; that table loads on the client from its own asset tree, so NO CDN change is required and none is made. The asset namespace is DIFFERENT: the row's column 2 (PreFix) is STI000/STI099/STI900 - the ST*.jet family with an I inserted - so an ST001-shaped value is never a valid key and misses by construction. [FIXTURE] This replica publishes \"99\" (row 99 = 배틀/battle, PreFix STI099): the only row named for the generic battle mode, and the only row whose five 속도 (scroll-speed) values contain a positive number (-5,-10,+20,+30,-5), every other row drawing from the map template -5,-20,-40,-60,-20. WHICH id a given real stage used is recovered content that has not been recovered; only the mechanism above is. STAY AGNOSTIC ABOUT THE OUTCOME: whether entries named STI099_A0 etc. exist in the PKGI1 index is UNKNOWN (entry names are not plaintext in any package), so a hit is not proven possible and this may move the failure rather than end it. ALSO: the r015 scene may be CSRSceneMEpisode, whose InitBackground (0xb23e80) passes *(std::string*)(COMBAT+0x24) - from CSRMEpisode::GetCombat()'s CSREpisodeData::COMBAT graph, which is loaded by CSRMEpisode::ReadJson from a LOCAL resource, not from any server route - in which case no response field on this route can reach it. thumb and GetArea's resource_id remain ART names and are not environment keys. Costs, rewards and the non-PAD_NODE_IDS stage list are provisional local content, not recovered data. Encounter monsters and completion handling remain under reconstruction; presence in this catalog does not establish playable combat.",
      evidence: "analysis/ghidra-setstage-exact.txt; analysis/ghidra-scrollbg-16-decomp-initbackground.txt; analysis/research/environments-recovery.md; analysis/recovered-data/environments.csv; analysis/research/episode-route-table.md; analysis/recovered-data/campaign-stages.csv; server-ts/src/campaign.ts; server-ts/tests/campaign.ts" },
    { route: "/reference/GetCard", tag: "Reference data", schema: "CardReference",
      description: "Static card definitions consumed by CSRCardInfoContainer::SetCard. ret_data must be an array, not an object containing list/items. Each entry groups base, stat, equipment, skill and dialog. The local starter definition is reconstructed: field names are recovered, balance numbers and resource selection are provisional. It is not production reference data, and successful combat has not been verified.",
      evidence: "analysis/native-card-bootstrap.txt; analysis/native-card-stat.txt" },
    { route: "/lobby/GetCardInven", tag: "Lobby and session", schema: "CardInstance",
      description: "Owned card instances. CSRPlayData::ParseUserCardInven iterates ret_data directly and CSRCard::parse reads each instance. Returning scaffold metadata creates bogus cards with empty ref_id and caused the observed Cannot find Ref Data assertion. Every ref_id must resolve to a loaded card definition; inst_id identifies ownership, not the definition. Authenticated response combines the bootstrap roster with account-owned recruitment grants persisted across server restart. Card stats, costs, skills and bootstrap ownership remain fixtures; training progression is not implemented.",
      evidence: "analysis/native-card-inventory.txt; analysis/native-play-card.txt" },
    { route: "/relation/BlockList", tag: "Social", schema: "BlockedUser",
      description: "Authenticated persistent blocked users consumed by CPVRelation::ReqBlockListCB. ret_data is an array of numeric target_pvid and target_nickname records; the native callback builds its C++ map internally. Legacy accounts read as an empty array without a migration write. Block/Unblock update only the requesting account. Friend discovery and filtering other social features by blocks remain incomplete.",
      evidence: "docs/social-blocks-native-2026-10-11.md" },
  ];
  for (const contract of arrayContracts) {
    paths[contract.route] = { post: {
      ...operation(contract.route.split("/").at(-1)!, contract.description, contract.tag,
        response("Decrypted response contract. Native transport encrypts this JSON into application/octet-stream after shared_secret/Exchange.", {
          allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, {
            type: "object", properties: { ret_data: contract.route === "/reference/GetStage"
              ? { $ref: "#/components/schemas/StageCatalog" }
              : { type: "array", items: { $ref: `#/components/schemas/${contract.schema}` } } },
          }],
        })),
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-evidence": contract.evidence,
      "x-runtime-confidence": "Response shape recovered; end-to-end gameplay not yet verified",
    } };
    explicitlyDocumented.add(contract.route);
  }
  for (const route of endpoints) {
    if (explicitlyDocumented.has(route)) continue;
    paths[route] = {
      post: operation(`Recovered ${route} route`, stubDescription(route), tagFor(route)),
    };
  }

  for (const action of ["GetLikeCnt", "ToggleLike"]) {
    const route = `/relation/${action}`;
    paths[route] = { post: {
      ...operation(action,
        "Authenticated target_pvid operation over actual same-server, mutually nonblocked local accounts. GetLikeCnt returns {target_pvid,cnt:uint32}; ToggleLike returns {target_pvid,is_like:0|1}. Each accepted ToggleLike changes the caller's directed edge and persists atomically; the native request has no desired state or nonce, so repeated requests toggle again. Counts and viewer-specific flags remain coherent across friend, discovery and brief/self profiles. No reward, fuel, original global totals or quota is invented.", "Social"),
      "x-evidence": "docs/social-likes-2026-10-11.md; tests/social-likes-state.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-runtime-confidence": "Encrypted compiled toggle/profile/restart tested; native UI pending",
    } };
    explicitlyDocumented.add(route);
  }
  paths["/gym/RankUpBundle"] = { post: {
    ...operation("Bulk promote low-grade Hunters",
      "Native bulk request fields are src_rank, src_cnt, target_rank, target_cnt and price. Source grades1/2 use groups of grade+3 Hunters per result and destination grade+1. Native quote formula per result is2*RaisePrice(sourceGrade)+sourceGrade*RankUpPrice(sourceGrade); existing replica price fixtures produce1200/2200 gold. No max-level prerequisite applies to this separate shortcut. The replica protects locked Hunters, leader/all decks and active commitments, validates destination references and quote, and persists survivor promotions, removals, collection history and wallet together with rollback on write failure. Stable ascending instance selection is local policy; original selection order/prices are unknown. Native response uses card.target_list[].rank/exp/rank_up_cnt:{cur} and removed_inst_id_list. Native end-to-end validation remains pending; repeated accepted calls are distinct operations without a recovered nonce.", "Cards and training"),
    "x-evidence": "docs/group-rank-up-native-2026-10-11.md; tests/group-rank-up.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Native fields/formula recovered; local economy and survivor policy, native UI pending",
  } };
  explicitlyDocumented.add("/gym/RankUpBundle");
  for (const action of ["Block", "Unblock"]) {
    const route = `/relation/${action}`;
    paths[route] = { post: {
      ...operation(`${action} local accounts`,
        "Authenticated atomic target_list batch. The native form field contains JSON text for an array of positive account IDs. Nicknames are resolved from established local accounts. Self, unknown, repeated-state and malformed requests refuse without a partial write; duplicate IDs within one batch are deduplicated. Block returns blocked-user rows; Unblock's native callback reads only result_code. Accepted changes persist per account; original caps and fees remain unknown, and block-based filtering of other social features is not implemented.", "Social"),
      requestBody: { required: true, content: {
        "application/x-www-form-urlencoded": { schema: { type: "object", required: ["target_list"], additionalProperties: true,
          properties: { target_list: { type: "string", example: "[1000002]", description: "JSON-encoded numeric target array." } } } },
        "application/json": { schema: { type: "object", required: ["target_list"], additionalProperties: true,
          properties: { target_list: { oneOf: [{ type: "string" }, { type: "array", minItems: 1, items: { type: "integer", minimum: 1, maximum: 9007199254740991 } }] } } } },
        "application/octet-stream": { schema: { type: "string", format: "binary" } },
      } },
      "x-evidence": "docs/social-blocks-native-2026-10-11.md; tests/social-blocks.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-runtime-confidence": "Persistent replica lifecycle tested; native UI validation pending",
    } };
    explicitlyDocumented.add(route);
  }
  paths["/mirage/GetFriendInfo"] = { post: {
    ...operation("Read Mirage friend floors", "Authenticated request with no floor selector. Native ParseFriendInfo consumes bare ret_data rows {floor,nick_list:string[]}. Local friendships now exist, but no friend highest-floor records have been reconstructed; the replica returns an empty array rather than inventing floor0 or ranks. This read does not enter or modify a Mirage run.", "Mirage"),
    "x-evidence": "docs/mirage-friend-floors-2026-10-11.md; tests/mirage-contract.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Compiled encrypted response verified; native friend panel pending",
  } };
  explicitlyDocumented.add("/mirage/GetFriendInfo");
  const friendRow = { type: "object", required: ["friend_id", "target_pvid", "type", "nick_name"],
    properties: { friend_id: { type: "integer", minimum: 1 }, target_pvid: { type: "integer", minimum: 1 },
      type: { type: "string", enum: ["friend", "request", "received", "candidate"] }, nick_name: { type: "string" },
      reg_utc: { type: "integer" }, tick: { type: "integer", description: "Neutral0; original tick semantics not reconstructed." },
      received_dtm: { type: "integer", description: "Neutral0; original receipt clock semantics not reconstructed." },
      country_code: { type: "string" }, profile_url: { type: "string" }, profile_status: { type: "string" },
      like_cnt: { type: "integer" }, is_like: { type: "integer" } } };
  for (const [route, description, schema] of [
    ["/relation/GetList", "Authenticated native list selector type1=friends,2=candidates,3=incoming,4=outgoing. ret_data is an OBJECT containing list, not a bare array. Only established local relationships are returned; candidate discovery is empty. Actual peer identity and original fallback portrait are supplied; social clocks/likes remain neutral local fields.", { type: "object", required: ["list"], properties: { list: { type: "array", items: friendRow } } }],
    ["/relation/GetFriendReceivedCount", "Authenticated incoming pending-request count. Native callback consumes ret_data directly as a uint32 scalar, not {cnt}.", { type: "integer", minimum: 0, maximum: 4294967295 }],
    ["/relation/FriendRequest", "Authenticated target_pvid request to an existing local account on the same server. Self, unknown, reverse-pending, accepted and either-party-blocked targets refuse. Receipt is {friend_id,target_pvid}. Same-direction pending repeats retain the same ID without writing; this is explicit local policy.", { type: "object", required: ["friend_id", "target_pvid"], properties: { friend_id: { type: "integer" }, target_pvid: { type: "integer" } } }],
    ["/relation/FriendReqAccept", "Authenticated single target_friend_id acceptance by the original recipient only. Receipt is {friend_id}; the relationship becomes reciprocal and persists atomically. Repeats retain the ID. Cancel, reject and unfriend have separate list contracts; bulk acceptance remains refused because no original list-accept grammar is established.", { type: "object", required: ["friend_id"], properties: { friend_id: { type: "integer" } } }],
  ] as const) {
    paths[route] = { post: {
      ...operation(route.split("/").at(-1)!, description, "Social", response("Decrypted native contract; successful native transport replies are encrypted.", {
        allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: schema } }],
      })),
      "x-evidence": "docs/social-friends-2026-10-11.md; tests/social-friends.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-runtime-confidence": "Local lifecycle and encrypted compiled restart tested; native UI pending",
    } };
    explicitlyDocumented.add(route);
  }
  for (const action of ["FriendReqCancel", "FriendReqReject", "Unfriend"]) {
    const route = `/relation/${action}`;
    paths[route] = { post: {
      ...operation(action,
        "Authenticated atomic target_friend_id_list: JSON text for numeric relation IDs. Cancel belongs to the pending sender, reject to the pending recipient, and unfriend to either accepted participant. The entire batch is validated before persistence. Native receipt is ret_data.friend_id_list, with a different key from the request. Local durable tombstones preserve monotone IDs and owned delete replays; stale IDs never remove a fresh same-peer relationship. No wallet, roster or social reward is changed.", "Social"),
      "x-evidence": "docs/social-friend-removal-2026-10-11.md; tests/social-friend-removal.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-runtime-confidence": "Encrypted compiled lifecycle/restart tested; native UI pending",
    } };
    explicitlyDocumented.add(route);
  }
  for (const route of ["/dailyquest/GetRefList", "/dailyquest/GetInstList", "/dailyquest/RequestReward", "/linearquest/Reward"]) {
    paths[route] = { post: {
      ...operation(route.split("/").at(-1)!,
        "Authenticated CSRAchieve contract, separate from daily expedition/challenge references. The replica publishes canonical empty ret_data collections for reference/instance reads because production quest IDs and conditions are missing. Reward requests refuse with result2001; no synthetic quest or reward is granted. Daily request keys are daily_quest_id/target_val, linear keys serial/id/target_val. Native reference collection iteration supports array/object values; array publication is local policy, not a captured universal container rule.", "Quests"),
      "x-evidence": "docs/quest-contracts-2026-10-11.md; tests/quest-contracts.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-runtime-confidence": "Empty collections and missing-data refusal verified; playable production quest loop absent",
    } };
    explicitlyDocumented.add(route);
  }
  paths["/shop/SellCard"] = { post: {
    ...operation("Hunter sale profit data unavailable", "Authenticated inst_id_list sale request refuses with result_code2001 until original GetExtra.card_sell_profit rows and reward identities are reconstructed. The final native UI uses reference minimum rank, not GetLevel.sell_price. A generic success would remove the native captured request vector even though the server retained ownership, so no mock success or guessed zero-value disposal is returned. The isolated evidence-gated planner is not enabled.", "Cards and training"),
    "x-evidence": "docs/hunter-sale-and-growth-contract-2026-10-11.md; tests/hunter-sale.ts",
    "x-reverse-engineering-status": "native-refusal-contract",
  } };
  explicitlyDocumented.add("/shop/SellCard");
  const webviewEvidenceRoutes = [
    "/webview/evaluation/GetCardList",
    "/webview/evaluation/RecordCardRecommend",
    "/webview/event_battle/PointReward",
    "/webview/event_battle/WinReward",
    "/webview/event_item_collect/ItemExchangeReward",
    "/webview/event_money_spend/Reward",
    "/webview/event_quest/JoinCamp",
    "/webview/event_quest/Reward",
    "/webview/event_quest/RewardLast",
  ];
  for (const route of webviewEvidenceRoutes) {
    paths[route] = { post: {
      summary: `WebView fixture ${route.split("/").at(-1)}`,
      description: [
        `The offline WebView cache observed the form/page contract for **${route}**.`,
        "This is deliberately separate from native lobby/gameplay evidence: cached WebView handlers prove page-level fields and result_code == 1 comparisons, not native response schemas.",
        "The local fixture returns a redacted, idempotent success-shaped response with request key names only; it does not grant production rewards or expose recovered scalar values.",
      ].join("\n\n"),
      tags: ["WebView events"],
      requestBody: { required: false, content: {
        "application/x-www-form-urlencoded": { schema: { type: "object", additionalProperties: { type: "string" } } },
        "application/json": { schema: { $ref: "#/components/schemas/GenericRequest" } },
      } },
      responses: response("Local WebView fixture response.", { $ref: "#/components/schemas/WebViewFixtureResponse" }),
      "x-reverse-engineering-status": "webview-form-evidence",
      "x-evidence": "analysis/recovered-investigation-2026-09-19/outputs/web/web-evidence.json",
      "x-runtime-confidence": "Form path and result markers observed; native gameplay semantics not established",
    } };
  }

  paths["/episode/GetLog"] = { post: {
    ...operation("Read episode progress", "Authenticated persistent regular-S01 progress. read_log contains objects with encoded id: r_-prefixed IDs restore read state, unprefixed IDs restore clear state. reward_log remains separate and initially empty. Fresh accounts have no progress; no automatic clears or grants. Original graph supplies 147 valid IDs. Story scripts/resource loading and reward settlement remain incomplete.", "Episodes", response("Episode progress; encrypted on native transport.", {
      allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/EpisodeProgress" } } }],
    })),
    "x-evidence": "analysis/native-episode-log.txt",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Server read/clear persistence tested; native story gameplay unverified",
  } };
  paths["/reference/GetLevel"] = { post: {
    ...operation("Read progression and VIP level tables", "CSRUserLV::SetLevel expects named user, vip, vip_group, card, skill and card_awk arrays. User/VIP thresholds remain small fixtures. Card rows cover ranks1..5 and dense levels1..30; historical community evidence supports cap30 regardless of grade. XP100*(level-1) and source XP100*level are fixtures preserving existing XP100->Lv2. Skill rows cover roles1..4, dense levels1..50, with role,level,rank,gold and four source_N_ref_id/string plus source_N_qty/number pairs. Native skill cap is max level whose rank<=hunter rank; price is roleVector[destinationLevel-1], with destinationLevel=ownedLevel+1. Skill caps10/20/30/40/50 are community-derived inference, not character caps or captured server rows. Gold100*destinationLevel and zero materials are fixtures. Single/batch SkillUp persistence is implemented; awakening, original balance and VIP commerce remain incomplete.", "Reference data", response("Provisional progression tables; encrypted on native transport.", {
      allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/LevelTables" } } }],
    })),
    "x-evidence": "analysis/native-level-reference.txt; analysis/native-user-level.txt; tools/arm-crash-probe.c",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Parser shape and missing VIP dependency recovered; complete progression unimplemented",
  } };
  paths["/reference/GetExtra"] = { post: {
    ...operation("Read global stamina parameters", "Partial CSRRefData::SetExtra contract. max_ap/max_bp are point caps; ap_refresh_interval/bp_refresh_interval are positive refresh intervals. Omitting the BP interval led to a probe-confirmed arithmetic fault in CalcTotalBP during village refresh. Current values (50/10 caps, 300/1800 intervals) are provisional local rules, not recovered production balance. Server-side spending and persistent lazy regeneration are implemented. Numeric server_utc synchronizes CGMTime::SetTime from SetExtra (0xdd855e), aligning native resource clocks with the next deadlines supplied in lobby/completion responses. Missing server_utc becomes zero on the client. The timezone semantics of local_time/utc_0 and additional commerce/calendar fields remain incomplete.", "Reference data", response("Partial global parameters.", {
      allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/GlobalParameters" } } }],
    })),
    "x-evidence": "analysis/native-extra-fields.txt; analysis/native-additional-points.txt; analysis/research/revival-systems-next.md; server-ts/tests/resource-recovery.ts",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Positive interval fix verified through village rendering; balances provisional",
  } };
  paths["/reference/GetArea"] = { post: {
    ...operation("Read expedition areas and stage links", "CSRGameStage::SetArea expects an OBJECT with area, stage and achieve_reward arrays. area records define destination IDs, type, serial, level_limit and presentation strings. Type 1 is the normal expedition type (confirmed by the BT_NOMAL click handler). stage records link area_id to stage_id with a serial. TWO THINGS ON THIS ROUTE ARE EASY TO GET BACKWARDS. (1) `resource_id` is an ART name - the mission-map backdrop - and NOT an environments.csv id; see the AreaCatalog.resource_id description for the full chain. Publishing `ST001` (the stage `thumb` family) produced `[ERR] [RES] Can't find 'ST001' in ResMap.` in 5/5 r015 legs and a black map backdrop beneath a working snow layer; publishing an environment id instead would produce `Can't find '99' in ResMap.` instead. (2) `area[i].stage[]` must be NESTED inside each area record, not a sibling of `area` - that nesting is why the expedition map had no selectable stage. THE PUBLISHED CAMPAIGN (added 2026-10-03) IS THE RECOVERED ONE. [RECOVERED] Six areas are published: the origin node `n_00` plus the five expedition areas `n_01`..`n_05`, from analysis/recovered-data/campaign-stages.csv (50 stages, `n_01_01`..`n_05_10`, exactly ten per area, extracted from LEVELING.jet chunk 0 in the base APK). Until then the replica published TWO areas with THREE invented stage ids (`N001 N002 N003`, which are PAD ART FILENAMES, not stage ids) and the campaign simply ENDED - and, because of the cruise arithmetic below, the airport offered exactly ONE destination. THE CRUISE READS THIS ROUTE. [RECOVERED] `CSRSceneAreaSel::SetData(AREA_INFO::TYPE)` (0xe7360c :267-269) sets `this->0x65c = GetAreaCnt(type)`, and `CSRSceneAreaSel::OnButtonClick` (0xe741dc :553-555) always enters the cruise with `SetData(this, 1)`; `SetMarker` (0xe74804 :433) then loops `i in [0, GetAreaCnt(1))` building one button per area and calls `SetVisible(button, i != 0)` (:337), so ordinal 0 is the hidden origin node. THEREFORE: the cruise destination list is exactly the areas whose `type` is 1, minus ordinal 0 - one button per area, no route of its own, and no client-side destination table. [RECOVERED] `serial` is the PER-TYPE ORDINAL at AREA_INFO+0x3c: `GetAreaData(AREA_INFO::TYPE, int)` (0x00a296f0) matches `+0x44 == type` and `+0x3c == index` and returns a shared EMPTY record on a miss, so ordinals must be dense `0..N-1` per type - a gap silently blanks every later destination. assertAreaSerials() refuses a gap or a duplicate at boot. [RECOVERED] `level_limit` (AREA_INFO+0x40) IS A GATE - `SetAreaState` (0xe75cdc :962-974) locks an area whose level_limit exceeds `CSRPlayData::GetUserLevel()`. It is published as 0 on every area because /lobby/Enter publishes no user `level`, so a ladder would gate content behind a value the server never sends; BLUSTONE_AREA_LEVEL_LIMIT re-introduces one for A/B. [FIXTURE] Area titles, descriptions, dialog_id and explore_id; the backdrop art value; the serials' meaning beyond the ordinal role. Empty or inconsistent catalogs can leave no map destinations or produce invalid progress counts.", "Reference data", response("Provisional first-area catalog.", {
      allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/AreaCatalog" } } }],
    })),
    "x-evidence": "analysis/ghidra-setstage-exact.txt (SetArea field set, 27 literals incl. resource_id at 0x1d7770e); analysis/ghidra-scrollbg-16-decomp-initbackground.txt (OnInitBackground is the sole ENV-table reader); analysis/research/map-backdrop.md (CreateArea literal order, the layout record, the r015 log lines); analysis/recovered-data/leveldb-tables/all-tables.json (KO/NEW/SR_MISSION/2_SR_UI_MS_ST/1_MS_ST_MAP); analysis/r015/logcat-all.txt:20620; analysis/recovered-data/campaign-stages.csv (the 50 recovered stages); analysis/native-area-index.txt (GetAreaCnt 0x00a295da, GetAreaData 0x00a295f8/0x00a296f0, CSRSceneAreaSel::SetMarker 0xe74804); analysis/native-area-ui.txt (CSRSceneAreaSel::SetData 0xe7360c, OnButtonClick 0xe741dc, SetAreaState 0xe75cdc)",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Parser/normal type recovered; resource_id proven to be art, its VALUE is a fixture and is unproven to resolve",
    "x-campaign": "[RECOVERED] 6 areas (n_00 + n_01..n_05), 51 links, 5 cruise destinations. [FIXTURE] titles/descriptions. Switchable with BLUSTONE_CAMPAIGN=full|minimal (default full).",
    "x-progression-gate": "NO SERVER-SIDE GATE EXISTS. [RECOVERED] CSRSceneAreaSel::SetAreaState (0xe75cdc :952-1011) computes it client-side: index < 2 -> unlocked; else GetStageAchieveCnt(<previous area>'s LAST stage[] link) != 0. That count comes from /lobby/Enter's `stage[]` and grows through /mission/Complete's `achieve[].order`. So n_0X+1 opens when n_0X_10 has been cleared. Mirrored in server-ts/src/state.ts isAreaUnlocked().",
  } };
  for (const route of ["/reference/GetMonster", "/reference/GetStageMonster", "/reference/GetTargetStageMonster"]) {
    const isMonster = route === "/reference/GetMonster";
    paths[route] = { post: {
      ...operation(isMonster ? "Read monster references" : "Read stage monster waves", isMonster
        ? "[RECOVERED] CSRSyncMStage::ReqMonsterCB (0xb4514c) iterates ret_data and calls CSRGameMob::AddMonster (0xa0b540) on each iterated VALUE. AddMonster takes one argument and no key (mangled _ZN10CSRGameMob10AddMonsterERKN8nlohmann10basic_json...), so the published object key is read by nothing and the m_mMonsters map key is built from the record's `_server` string, whose literal 0x01d676bb is the first thing AddMonster reads. One monster was previously published under three keys (M001, 001, \"\"); because all three shared one _server, __emplace_unique_key_args kept a single node and dropped the rest, so that table could never answer a lookup for \"001\" or \"\". The published set is now derived from the same FIXTURE_MONSTER_IDS list that fills show_thumbnail AND the wave records' `ref_id` on /reference/GetTargetStageMonster, because FUN_00b4a7a8 (0xb4a7a8) builds the GetMonster request `list` from both - see that route's description. Every id the client asks for must therefore resolve here. THE PUBLISHED SET IS NOW DERIVED FROM ONE LIST AND COVERS EVERY LINKED STAGE. [RECOVERED] `show_thumbnail` is iterated with `iter_impl` and `from_json<std::string>` runs on EACH element, building `STAGE_MONSTER_LINK::ids`, and FUN_00b4a7a8 walks that vector FIRST and then the wave vector at inner stride 0x14 (0xb4a864 adds #0x14 = 20 bytes = STAGE_MONSTER, and 0xb4a886 copies the string at +0 = `ref_id`), appending both into the SAME list head (0xb4a85c) - so `list` = `show_thumbnail` UNION {every wave `ref_id`}. [RECOVERED] the recovered monster art namespace is M001..M021 plus M100 (server-ts/src/bootstrap.ts RECOVERED_MONSTER_ART_IDS, from the recovered PAD pack). The DEFAULT published set is M001 ALONE and that is deliberate: show_thumbnail IS this route's request list, so widening it widens the request on the one battle path that is proven to render (AGENTS.md section 16). BLUSTONE_MONSTER_IDS=M001,M007,M014 widens it INSIDE the recovered namespace and is refused at boot for any id outside it. [FIXTURE] The local M001 reference covers recovered fields _server, id, title, attr, role, res_prefix, rank, level, overcome, hp, atk, def, critical/block/attribute stats, hp_page, skill_start_time and empty skill lists; all balance values are provisional placeholders and battle skill formulas are not implemented. Every wave a published stage names now has a REAL record here and on /reference/GetTargetStageMonster - before 2026-10-03 that table was keyed by a hard-coded [N001,N002,N003,n_01_01], so 49 of the 50 campaign stages had no wave record at all and the route silently borrowed another stage's waves."
        : "[RECOVERED] CSRSyncMStage::ReqTargetStageMonsterCB (0xb4606c) iterates ret_data and calls CSRGameMob::AddStageMonster (0xa0d194) once per top-level key, passing iteration_proxy_value::key() and the value; that key argument becomes the std::map<string, STAGE_MONSTER_LINK> key at CSRGameMob+0xc. THE KEY MUST BE THE STAGE ID, and the monster id is published alongside it. CSRMStage::MakeStageInst (0xb33f84) reads that map with GetStageMonsterLinkData(this+0x220) (0xb34b18), and this+0x220 is the scene's own stage-id string (0xb34026 -> 0xb34198 -> 0xb34686 -> 0xb34b16). On a miss GetStageMonsterLinkData (0xa0cf38) takes its `if (uVar1 == 0)` branch and returns the two fallback vectors at CSRGameMob+0x18 / +0x24, which have no writer in the library, so waves is empty; MakeStageInst then takes beq.w 0x00b34e88 at 0xb34b28, never creates the \"enemy\" key, and faults at 0xb3507a str r0,[r1,#0x4c] with r1 == 0. THAT is the SIGSEGV. Each value carries its wave array under `wave_list` (literal 0x01d76bd5, the only wave-array key: the load at 0xa0d1b0 is consumed solely by add r1,pc at 0xa0d1b8, and the body has exactly five basic_json::operator[] call sites with no `_id` among them; the earlier `_id` reading of the same literal slot was a resolver pairing artefact). THE WAVE ARRAY IS NESTED: `wave_list` is vector<vector<STAGE_MONSTER>>, an array of waves each holding an array of monster records. Evidence: the OUTER dereference of wave_list (bl 0x0072aff0 at 0xa0d266) is what the INNER loop iterates (bl 0x0072af38 at 0xa0d2d8), and one vector<STAGE_MONSTER> is pushed per outer element (bl 0x00a0e4ac at 0xa0d480). A FLAT array is fatal, not degraded: the inner loop then walks the monster object's own members and calls operator[] on a scalar at 0xa0d304, which nlohmann answers with a throwing type_error.305, and AddStageMonster has no handler, so both the wave push (0xa0d480) and the map emplace (0xa0d69c) are skipped and STAGE_MONSTER_LINK is never built. PER-MONSTER FIELD TYPES: `ref_id` goes through from_json<std::string> (bl 0x00728b08 at 0xa0d310) and must therefore be a non-empty JSON STRING or it throws type_error.302; `group` and `next_spawn_ms` go through a total tbb switch (subs r1,#0x3 ; cmp r1,#0x4 ; bhi -> movs r0,#0 at 0xa0d34e / 0xa0d39c) that cannot throw and returns 0 for any unhandled tag, so they must be JSON NUMBERS (next_spawn_ms is then scaled by the float constant loaded from slot 0x00a0d4f8 at 0xa0d3ec). RETRACTED 2026-10-02: the earlier claim that the ret_data key is what FUN_00b4a7a8 pushes verbatim into GET /reference/GetMonster's `list` was wrong. FUN_00b4a7a8 (0xb4a7a8) walks STAGE_MONSTER_LINK::ids FIRST, and that vector is built by AddStageMonster from the RECORD-LEVEL show_thumbnail array (literal 0x01d76bed, slot 0x00a0d874, reached only from the outer loop's exit at 0xa0d260), each element passed through from_json<std::string> (bl 0x00728b08 at 0xa0d5ac). show_thumbnail must therefore be an ARRAY OF NON-EMPTY MONSTER-ID STRINGS whose elements resolve in /reference/GetMonster. A JSON number there is not a wrong value but a wrong TYPE: the type-tag switch in AddStageMonster only iterates array and object tags, so the previous integer 1 produced an empty ids vector and GetMonster was never asked for anything resolvable. [RECOVERED] AND THERE IS A SECOND SOURCE: FUN_00b4a7a8 has a SECOND loop, over the wave vector, whose inner stride is 0x14 - exactly the 20-byte STAGE_MONSTER whose first 12 bytes are the wave's `ref_id` (00b4a864 `adds r5,#0x14`; 00b4a870 `bl 0x00a0b428 HasMonsterData`; 00b4a886 `bl 0x006d7efc` string copy) - and it appends that ref_id to the SAME list head (sp+0x24) and counter (sp+0x2c) as the ids loop. So `GET /reference/GetMonster`'s `list` is `ids` UNION {every wave record's ref_id}, and EVERY wave `ref_id` must be a published MONSTER id or CSRGameMob::GetMonsterData (0xa0b43c) misses at SRGameMob.cpp(38). This was measured: shipping the card id 001 produced the request list=[\"M001\",\"001\"] and the assertion followed by a fault 31-45 ms later (analysis/testing/report-014.md). The replica now ships the monster id M001 as the wave ref_id. Do NOT repair a miss by editing show_thumbnail or by publishing a monster under _server \"001\": the wave loop requests ref_id itself, so either would move the assertion instead of clearing it. UNRESOLVED: ref_id also reaches CSRCard::SetRefID, which wants a CARD id; that conflict is scoped, not solved, and the five SRCard.cpp(731) assertions of AGENTS.md section 11 live in the player camp (CSRMStage+0x250), not the enemy camp this change targets (CSRMStage+0x264). A/B: BLUSTONE_WAVE_SHAPE=flat restores the superseded flat array, BLUSTONE_STAGE_MONSTER_KEY=monster_id restores the pre-fix monster-id-only keying, BLUSTONE_STAGE_MONSTER_KEY=stage_id restores the superseded stage-keyed shape (the control leg of analysis/testing/report-011.md), BLUSTONE_SHOW_THUMBNAIL=scalar restores the previous integer, and BLUSTONE_WAVE_REF_ID=card restores the card wave ref_id. All five are guarded by assertions in tests/smoke.ts. [FIXTURE] The M001 ids, the card id 001 and every balance number are local fixture choices, not recovered content; enemy AI, turn order, skill execution and rewards remain incomplete.", "Reference data", response("Monster reference map; encrypted on native transport.", {
          allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { type: "object", additionalProperties: { $ref: `#/components/schemas/${isMonster ? "MonsterReference" : "StageMonster"}` } } } }],
        })),
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-evidence": "analysis/native-monster-stage.txt; analysis/research/ids-second-element.md; analysis/research/ROOT-CAUSE-v4-nested-waves.md; server-ts/tests/campaign.ts",
      "x-runtime-confidence": "Parser shape recovered; first encounter fixture not yet battle-verified",
      ...(isMonster ? {} : {
        "x-published-stages": "[RECOVERED] One wave record per LINKED stage id, all 50 of them, keyed by stage id and by monster id (BLUSTONE_STAGE_MONSTER_KEY=both, the default). A request for any published stage is a table hit; before 2026-10-03 the table was keyed by a hard-coded four-element list and the route fell back to borrowing n_01_01's waves, which answers 200 with a well-formed nested array and therefore looks fine on the wire - the SILENT form of 'stages do not load correctly'.",
      }),
    } };
  }
  paths["/lobby/Enter"] = { post: {
    ...operation("Enter the local returning-player session", "Reconstructed bootstrap consumed by CSRPlayData::ParseUserInfo. Supplies persistent local stamina/currency, leader instance 1, empty reward lists, a completed opening tutorial (type 0, step 5, is_cleared 1), and a deck record. CSRSyncTutorial::Parse maps a truthy is_cleared to native state 3. This returning-player fixture avoids the title screen's unchecked tutorial-episode lookup while that content is reconstructed; it is NOT evidence the tutorial is playable. Balances and mission progress are local replica state persisted when BLUSTONE_STATE_FILE is enabled. The native spelling is_newbiew is intentional. The leader must resolve in GetCardInven, whose ref_id must resolve in GetCard. Additional session/deck fields remain incomplete.", "Lobby and session", response("Persistent local-game bootstrap; encrypted on native transport.", {
      allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/SessionBootstrap" } } }],
    })),
    "x-evidence": "analysis/native-card-inventory.txt; analysis/native-tutorial-state.txt; analysis/native-title-start.txt",
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-runtime-confidence": "Village, opening dialogue/choices and airport navigation verified; combat/progression remain incomplete",
  } };
  const localGameArray = (route: string, summary: string, schema: string, description: string) => {
    paths[route] = { post: {
      ...operation(summary, description, "Lobby and session", response("Persistent local-game response; encrypted on native transport.", {
        allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { type: "array", items: { $ref: `#/components/schemas/${schema}` } } } }],
      })),
      "x-reverse-engineering-status": "local-game-contract",
      "x-evidence": "server-ts/src/game.ts; server-ts/src/state.ts",
      "x-runtime-confidence": "Replica behavior implemented; original production semantics incomplete",
    } };
  };
  localGameArray("/lobby/GetItemInven", "Read item inventory", "ItemInstance", "Returns the persistent local account item array. It is empty initially, avoiding fabricated item IDs. Item grant/use handlers and the complete native item schema are not implemented yet.");
  localGameArray("/lobby/GetMissionInst", "Read mission progress", "MissionInstance", "Returns persistent local mission records. The initial array is empty; mission/Start and mission/Complete create/advance stage progress independently. Daily missions and reward claim semantics remain incomplete.");
  localGameArray("/lobby/GetShopInst", "Read shop instances", "OpaqueObject", "Returns an empty shop-instance array. Shop display/purchase references are not reconstructed yet; this explicit array prevents the generic metadata object from being interpreted as a shop record.");
  localGameArray("/achievement/GetInstList", "Read achievement instances", "OpaqueObject", "Returns an empty achievement-instance array. Achievement tracking is not implemented yet.");
  for (const route of ["/relation/GetSuggestedFriendList", "/relation/FriendSearch"]) {
    paths[route] = { post: {
      ...operation(route.split("/").at(-1)!,
        "Authenticated discovery over actual local accounts on the same server. Suggested takes start/length; Search takes target_nick_name/start/end. Both return ret_data:{start,length,list}; length is the actual returned count. Self, pending/accepted peers and either-party blocks are excluded. PVID ordering, max50, NFKC case-insensitive substring matching and exclusive search end are explicit local policy. Candidate friend_id0 is a no-relationship sentinel supported by native zero/type2 parsing, not an allocated original-server ID. Candidate brief profiles expose actual public identity and an original fallback avatar, never credentials or a synthetic party.", "Social"),
      "x-evidence": "docs/social-discovery-2026-10-11.md; tests/social-discovery.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-runtime-confidence": "Encrypted discovery/brief/request flow tested; native UI pending",
    } };
    explicitlyDocumented.add(route);
  }
  for (const route of ["/reference/GetSkinRef", "/lobby/GetSkinInst", "/skin/Seen", "/skin/PutOn", "/skin/Buy", "/skin/Gacha"]) {
    paths[route] = { post: {
      ...operation(route.split("/").at(-1)!,
        "Authenticated Skin contract. Canonical empty reference payload is {skin:[],bonus:[]}; instance payload is {skin:[]}. Original native factories derive Default_<cardRef> references and default instances from actual CardInfo/ownership; this response grants no paid skin. Existing non-default saved style/instance fields refuse reads rather than being cleared. Original paid IDs/prices/bonuses are missing, so mutations refuse2001. Removing a skin also uses native PutOn with target_card_ref/inst_id; a fabricated PutOff route is not exposed. Native Boutique rendering remains pending.", "Skins"),
      "x-evidence": "docs/skin-materials-2026-10-11.md; tests/skin-materials.ts",
      "x-reverse-engineering-status": "native-parser-reconstructed",
    } };
    explicitlyDocumented.add(route);
  }
  for(const route of ["/reference/GetCardEquipmentLevelUpPrice","/reference/GetCardEquipmentRankUpPrice",
    "/card_handler/LevelUpEquipment","/card_handler/RankUpEquipment"]) {
    paths[route] = {post:{
      ...operation(route.split("/").at(-1)!,
        "Authenticated equipment reference/upgrade contract. Price reads return explicit immutable native arrays; absent tables return []. Configured ordinary references and prices permit no-Guild gold2 level-up and exact-cap rank-up with no source Hunters/card_qty0. Rank-up preserves level. Required unlocked material quantities and gold debit atomically; absolute receipts use user.gold.cur, user.card and user.item[{inst_id,qty}]. Active targets, missing data, unsupported Guild/currency/source workflows refuse; persistence failure restores prior arrays/wallet. Prices and stats are supplied local/recovered data, not default original balances. Level requests have no recovered expected-level/intent field: identical successful calls can be separate upgrades. Native fields: inst_id decimal uint64, part1..3, price_type2, rank source_inst_ids null for the normal empty vector or JSON uint64 vector for the broader unreconstructed source workflow.", "Equipment"),
      "x-evidence":"docs/equipment-upgrade-local-workflow-2026-10-11.md; tests/equipment-upgrade-state.ts",
      "x-reverse-engineering-status":"native-parser-reconstructed",
    }};
    explicitlyDocumented.add(route);
  }
  paths["/lobby/GetGuildInfo"] = { post: {
    ...operation("Read Guild boot membership", "Authenticated ret_data.my_guild is flat PLAY_DATA with guild_id/status/newbie/role/contribution. Explicit local-save guilds records validate known same-server accounts, unique membership/leader and hash-pinned original emblem IDs; unsupported history refuses instead of being dropped. Members receive joined status3 and personal role/contribution; outsiders receive five zero fields. Read-only projection and unrelated persistence preserve membership. No membership is generated or assigned by a request; creation/join/GvG/fees/rewards remain gated. Native Guild menus remain unverified.", "Guild"),
    "x-evidence": "docs/guild-records-workflow-2026-10-13.md; tests/guild-records.ts; docs/guild-lobby-native-2026-10-11.md",
    "x-reverse-engineering-status": "native-parser-reconstructed",
  } };
  explicitlyDocumented.add("/lobby/GetGuildInfo");
  paths["/guild/GetDetailInfo"] = {post:{
    ...operation("Read established Guild details","Authenticated guild_id is a JSON-array form STRING of exact uint64 query IDs, even for one Guild. ret_data.guilds contains full established same-server native INFO/member rows, preserving request order and omitting unknown/cross-server IDs. Imported INFO IDs must fit native uint32; no truncation aliases. Personal my_guild is not updated by this public detail response. Reads preserve all saves; no creation/join/fee/participant/history is inferred. Native menus unverified.","Guild"),
    "x-evidence":"docs/guild-detail-native-2026-10-13.md; tests/guild-detail-state.ts",
    "x-reverse-engineering-status":"native-parser-reconstructed"
  }};
  explicitlyDocumented.add("/guild/GetDetailInfo");
  paths["/guild/GetUserGuilds"] = {post:{
    ...operation("Read a user's established Guild association","Authenticated target_pvid_list is a JSON-array form STRING containing one exact uint64 target. Native callback consumes first compact USER row under ret_data.user_guilds: pvid/id/name/type/fc_point_limit/contribution/region/emblem_id. Known joined same-server targets return established Guild summary only; unknown/unjoined/cross-server targets return[]. No Hunter/private account/member role data or personal my_guild mutation. Contribution copies explicit Guild aggregate as local policy; original counter producer lineage remains unproved. Native menus unverified.","Guild"),
    "x-evidence":"docs/guild-user-association-native-2026-10-13.md; tests/guild-association-state.ts"
  }};
  explicitlyDocumented.add("/guild/GetUserGuilds");
  paths["/reference/GetGuildPrices"] = {post:{
    ...operation("Read Guild action prices","Authenticated bare ret_data action/price_type/price rows from immutable explicit guildPrices or BLUSTONE_GUILD_ACTION_PRICES_JSON; default empty. Native action1 creation checks gold; action2 name/action3 country-change UI checks summed Manda. Original amounts, server currency/debit order and permission/settlement remain unknown; supplied quotes do not enable Found/Update mutations. Duplicate/malformed rows refuse startup before saves are restored.","Guild"),
    "x-evidence":"docs/guild-action-reference-native-2026-10-13.md; tests/guild-price-state.ts"
  }};
  explicitlyDocumented.add("/reference/GetGuildPrices");
  for(const route of ["/guild/Search","/guild/GetRecommendations"]) {
    paths[route]={post:{...operation("Discover established local Guilds","Authenticated native ret_data.guilds INFO/member collection. Search sends plain keyword only; recommendations sends auth only, no recovered page/cursor/limit fields. Explicit local policy lists known same-server records with name-only case-insensitive substring matching and stable ID order, without assigning membership or asserting join eligibility. Empty corpus/matches returns[]. Original discovery ranking/scope/limits and native menus remain unknown.","Guild"),
      "x-evidence":"docs/guild-discovery-native-2026-10-13.md; tests/guild-discovery-state.ts"}};
    explicitlyDocumented.add(route);
  }
  paths["/guild/GetRanking"]={post:{...operation("Read supplied Guild ranking records","Authenticated page/size signed32 decimal fields; native tab starts page0,size10. Response ret_data is a BARE full Guild INFO array. Preserve explicit positive stored rank, including sparse/tied values; no rank recomputation or rewards. Same-server known subset, rank0 omission, rank/ID ordering and subset pagination are explicit local policy, not original global ladder completeness. Exact BigInt offset prevents page-product rounding. Reads preserve saves/affiliations; native menus remain unverified.","Guild"),
    "x-evidence":"docs/guild-ranking-native-2026-10-13.md; tests/guild-ranking-state.ts"}};
  explicitlyDocumented.add("/guild/GetRanking");
  paths["/guild/Found"]={post:{...operation("Create an explicitly configured local Guild","Default disabled. Opt-in guildCreationMode or BLUSTONE_GUILD_CREATION_MODE=local-gold requires selected/hash-pinned Guild resources and explicit action1 gold2 quote. Native request name/desc/type/fc_point_limit/region/emblem_id; no client fee/ID authority. Local printable ASCII subset, native text limits, stock picker6, nonempty region, FC slider0..4000/500, existing no-joined account and no active combat required. Atomic gold debit/sole-leader record/monotonic uint32 allocator; malformed/duplicate names, missing fee/funds, replay and exhaustion refuse with complete rollback. Receipt flat my_guild, full guilds and user.gold BOTHprevcur. New counters/rank0 and leader role1 are explicit local initialization; original badword/font/region/min-level/pending/debit policies unknown. Native callback INFO defaults despite cache update, so no playable UI claim.","Guild"),
    "x-evidence":"docs/guild-found-native-2026-10-13.md; docs/guild-creation-admission-native-2026-10-13.md; tests/guild-local-found-state.ts"}};
  explicitlyDocumented.add("/guild/Found");
  localGameArray("/guild/GetNotifications", "Read guild notifications", "OpaqueObject", "Returns an empty notification list. Guild state is not implemented yet.");
  localGameArray("/shop/GetHotDealSummaryList", "Read hot-deal summaries", "OpaqueObject", "Returns an empty commerce list. No purchases or real-money economy are implemented.");
  paths["/lobby/GetGemInven"] = { post: {
    ...operation("Read owned Gem inventory", "Authenticated explicit stored Gem wire rows. Legacy scalar gem is never converted into owned instances. Unknown references/owners/positions refuse; reads do not grant or rewrite data.", "Lobby and session", response("Owned Gem array; encrypted on native transport.", { allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/GemInventory" } } }] })),
    "x-reverse-engineering-status": "local-game-contract", "x-evidence": "server-ts/src/state.ts", "x-runtime-confidence": "Replica behavior implemented; original production semantics incomplete",
  } };
  paths["/lobby/GetWeather"] = { post: {
    ...operation("Read local weather", "Returns neutral weather id 0 and no expiry. Weather events are not implemented.", "Lobby and session", response("Neutral weather; encrypted on native transport.", { allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/WeatherState" } } }] })),
    "x-reverse-engineering-status": "local-game-contract", "x-evidence": "server-ts/src/server.ts", "x-runtime-confidence": "Replica behavior implemented; original production semantics incomplete",
  } };
  paths["/lobby/GetNotiInfo"] = { post: {
    ...operation("Read lobby notifications", "Returns empty notice/popup arrays and a zero defense expiry for the local account.", "Lobby and session", response("Notification state; encrypted on native transport.", { allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/NotificationState" } } }] })),
    "x-reverse-engineering-status": "local-game-contract", "x-evidence": "analysis/native-card-inventory.txt; server-ts/src/server.ts", "x-runtime-confidence": "Replica behavior implemented; original production semantics incomplete",
  } };
  for (const route of ["/fishing/GetInven", "/fishing/GetRecord"]) {
    paths[route] = { post: {
      ...operation("Read local fishing collection", "Authenticated bare ret_data array. The replica has no reconstructed catches or personal fish records and currently returns an empty array. Native ParseInven/ParseRecod iterate numeric rows; metadata wrappers are incompatible. No bait, fish or rewards are granted.", "Fishing", response("Empty fishing collection.", {
        allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { type: "array", maxItems: 0, items: { type: "object" } } } }],
      })),
      "x-evidence": "analysis/ghidra-fishing-owned-parsers.txt; analysis/ghidra-fishing-inven-keys.txt; analysis/ghidra-fishing-record-keys.txt",
      "x-runtime-confidence": "Native parser recovered; server tests pass; device fishing entry unverified",
    } };
  }
  for (const route of ["/fishing/Begin", "/fishing/EndWithSell", "/fishing/SellFish", "/fishing/GetFishingPool", "/fishing/GetPriceRef"]) {
    paths[route] = { post: operation("Unreconstructed fishing operation", "Authenticated operation explicitly refuses with result_code 2001. Original fish identities, catch settings, pools, prices and settlement are not yet reconstructed. It does not return generic mock success or alter inventory/currency.", "Fishing", response("Unsupported fishing contract.")) };
  }
  for (const [route, summary, description, schema] of [
    ["/mission/Start", "Start a local expedition", "Consumes one persistent AP and records the requested stage as an active local battle. The handler accepts stage_id/stage/id plus optional deck_inst_id_1..4 fields and returns a fresh battle_id per fresh attempt. It replays the existing battle only within a short idempotency window (BLUSTONE_MISSION_START_IDEMPOTENCY_SECONDS, default 30, 0 disables it, 'forever' reproduces the pre-2026-10-02 unbounded behaviour), so a duplicate tap or a client transport retry does not charge AP twice while a new attempt minutes later is a genuinely new battle. [POLICY DECISION, NOT RECOVERED] The window length is a local policy: the only recovered fact is that the client can retry a request (CPVHTTPRequest::GetRetryCnt, ELF 0x151773), which is why a window exists at all. Before 2026-10-02 the guard had no age test, so a persisted battle from one early run was replayed for six consecutive device reports (report-010..report-015). Superseded battles are discarded and their AP is not refunded. This is the server-side seam for the future native battle protocol; no turn simulation, skill execution or anti-cheat is implemented.", "MissionStartResponse"],
    ["/mission/Complete", "Complete a local expedition", "Response shaped from CSRSyncMStage::ReqCompleteCB (0xb426ac), analysis/native-mission-complete.txt. The request is the recovered 8-field form POST (app_code, app_ver, market, pvid, otp, stage_id, deck_type, play_info); play_info is a JSON STRING of CSRGameBase::MISSIONPLAY_INFO and its `clear` member is the client's own win byte, filled from CSRGameBase::ProcessFinish's `left.remain != 0`. [RECOVERED, load-bearing] result_code is 1 for EVERY outcome, INCLUDING A DEFEAT: CSRMStage::OnFinish has a dedicated lose branch (0xb36148, lambda $_5) that calls the same RequestComplete, and ReqCompleteCB L1133-1151 retries any non-1 code silently eight times and then discards the response without parsing it. A loss is expressed by the payload - achieve: [] and user.gold.prev == user.gold.cur - never by the code. [RECOVERED] ret_data carries achieve as an ARRAY of {order} (the only stage-progression write in the callback, via SetStageAchieve; there is no SetStageID here), user.{gold,exp,ap,bp,max_ap} as {prev,cur} pairs with ap_charge_time/bp_charge_time, card as an OBJECT keyed by the decimal card serial, item as an ARRAY of {inst_id,added,ref_id}, consumed_inst_list as [], plus level/max_ap at the top level as a hedge for the ambiguous parent register. `detect` and `achievement` are OMITTED and the omission is load-bearing: their guards are IS-NULL tests, not emptiness tests, so a present `detect` ({} included) skips the user.ap/user.bp resync and a present `achievement` ([] included) calls CSRAchieve::ParseAchievementsElement (0x8481c4), which is a /dailyquest/GetInstList REQUEST builder, from inside a response callback. `scenario` is likewise omitted: a present string takes the AddScenario branch and sets the result flag the result screen reads as 'show a cutscene'. The star rating is carried ONLY by achieve[].order; the native star/prev_star/is_first_clear are client-derived from GetStageAchieveCnt and are deliberately not sent. [FIXTURE] First-clear economy is10 gold/30XP once. Legal flags0..2 are persisted separately: completion, under60s, at most1death are local default-condition rules. Replays can earn missing flags without repaying economy; missing hand-made metrics keep legacy full-stars fixture behavior. The economy numbers are local guesses, not recovered production data. accepted/clear/result/win/stars/reward/mission/gold/ap/exp are inert local diagnostics that ReqCompleteCB never reads.", "MissionCompleteResponse"],
  ] as const) {
    paths[route] = { post: {
      ...operation(summary, description, "Missions and combat", response("Local mission action result; encrypted on native transport.", { allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: `#/components/schemas/${schema}` } } }] })),
      "x-reverse-engineering-status": route === "/mission/Complete" ? "native-parser-reconstructed" : "local-game-contract",
      "x-evidence": "server-ts/src/state.ts; server-ts/src/game.ts; analysis/native-mission-complete.txt (CSRSyncMStage::ReqCompleteCB 0xb426ac, RequestComplete 0xb3aba8); analysis/research/battle-lifecycle.md; analysis/research/battle-completion.md; tests/mission-complete.ts",
      "x-runtime-confidence": route === "/mission/Complete"
        ? "Response shaped from the recovered parser and unit-tested; never yet observed on the wire - /mission/Complete has not been requested in any device run"
        : "Replica action implemented; native mission action not yet observed",
    } };
  }
  paths["/mission/ReqAchieveReward"] = { post: {
    ...operation("Claim an expedition-map chest reward",
      "[RECOVERED] The expedition-map chest claim. Tapping a claimable chest calls `CSRSceneMStageMap::SendRewardRequest` (0xe9a168), which hands `CSRUserDB::GetCurAreaID()` and the chest index to `CSRSyncMStage::RequestReward` (0xb3bf4c); that builds a `CPVHTTPRequest::Create<..., CPVHTTPMapToEncodedURLFormTransformer<unordered_map<string,string>>>` - a URL-encoded form POST - with EXACTLY 7 entries (`unordered_map(local_118, local_d0, 7)` at ghidra-chest-01-reward-route.txt:168) and posts it to this path (0xb3c23a). THE FIELD SET IS: app_code, app_ver, market, pvid, otp, area_id, target_achieve_cnt. [RECOVERED] `target_achieve_cnt` is NOT AN INDEX: it is `std::to_string(GetRewards()[index].achieve_cnt)` (:158-160, stride 0x34), i.e. the reference value from the area's `achieve_reward[]` on /reference/GetArea. [RECOVERED] `ret_data` must be a JSON OBJECT - ReqRewardCB (0xb3c674) dispatches on `*rd` (`:586-612`, `== 1` object, `== 2` array, anything else is an error path). [RECOVERED, load-bearing] `ret_data.achieve_cnt` must EQUAL one of the area's published `achieve_reward[].achieve_cnt` values: the callback scans `GetRewards()` for that match (:526-577, :531/:566) and only then calls `SetAchieveRewardReceived(area, i)` (:570), which is what makes `found` true and hands `AchieveRewardCB` an index instead of -1 (`:1256-1263`). With -1 the callback does nothing but `Toast(); return;` (`:1776-1783`) and **the chest never reaches the `opened` sprite state**. [RECOVERED] That state matters because `SetRewardVisible(i, state)` (0xe95eb8) makes TWO of its four slots visible on `state == 1` - the `MS_RW_<L>` animation (slot +0x08) and the `MS_RW_<L>8` still (slot +0x18) - which is literally 'open and closed at the same time'; only `state == 2` clears it, and only a successful claim reaches that. [RECOVERED] `result_code` is 1 on EVERY path, refusals included: ReqRewardCB bails to `cb(-1, 0)` on any non-1 code (`:463-473`) and CPVHTTPManager::Enqueue retries - the 8x silent retry measured for /mission/Complete in analysis/testing/report-017.md. A refusal is therefore expressed by the PAYLOAD (an `achieve_cnt` that matches no published reward), never by the code. [RECOVERED] `achievement` is OMITTED, never `[]` - `:517-520` is an IS-NULL test and the branch calls `CSRAchieve::ParseAchievementsElement` (0x8481c4), a `/dailyquest/GetInstList` REQUEST builder, from inside a response callback. `free_iap`, `iap`, `supply` and `card` are omitted so their gated branches are skipped entirely. [FIXTURE] The gold amounts and the item ids come from the local chest table in src/bootstrap.ts; the item ids 912/913/914 ARE recovered CHAR_STR_RO rows ('Transcendence Ticket'), the amounts are not. Server-side bookkeeping: (area_id, achieve_cnt) is recorded on the account and persisted, so a replay is answered idempotently and pays nothing.",
      "Missions and combat",
      response("Chest claim result; encrypted on native transport.", { allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/MissionAchieveRewardResponse" } } }] })),
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-evidence": "analysis/research/chest-rewards.md; analysis/ghidra-chest-01-reward-route.txt (RequestReward 0xb3bf4c, ReqRewardCB 0xb3c674, AchieveRewardCB 0xe985c4, SetRewardVisible 0xe95eb8, PopUpClearReward 0xe964e0); analysis/ghidra-chest-02-sources.txt (IsReceivedAchieveReward 0xb6d14c, SetAchieveRewardReceived 0xb6d0fc, GetStageAchieveCnt); analysis/ghidra-chest-03-getters.txt (GetStageCnt, GetStageLinks, GetRewards); server-ts/src/state.ts; server-ts/tests/chest-reward.ts",
    "x-runtime-confidence": "Request field set and success criterion recovered from the parser and unit-tested. NOT yet observed on device: no device run has issued this request, so whether the chest-press actually reaches SendRewardRequest (it returns early when the `4_MS_ST_FT` UI-node tree at this+0x678 is empty) is unmeasured.",
  } };
  paths["/shop/GachaPremium"] = { post: {
    ...operation("Recruit hunters (gacha pull)",
      "[RECOVERED] The premium recruitment pull, reachable in game for free from the defeat screen's "
      + "\"Recruit New Hunter\" button (analysis/research/in-game-stats.md §5.3). The client really issues "
      + "`POST /shop/GachaPremium` with the 9-key set `app_code, app_ver, bonus_level, cnt, gacha_type, "
      + "item_inst_id, market, otp, pvid` and `cnt: \"11\"` for the 10+1 button; the request builder is "
      + "`CSRSyncLottery::RequestGachaPremium` (Ghidra 0xf74774, `analysis/native-network-decomp.txt:8544`), "
      + "whose `_RMAssert(param_5 == 1 || param_5 == 0xb, … 0xb3)` pins `gacha_type` to {1, 11}. "
      + "[RECOVERED] `ret_data` MUST be a JSON OBJECT: `CSRSyncLottery::ReqGachaPremiumCB` (0xf74fb0) reads "
      + "`ret_data[\"card\"]` at 0xf75204, iterates it calling `CSRPlayData::ParseCardInst` (0xb69598, which "
      + "delegates to `CSRCard::parse` at 0x8680a4) and `CSRInventory::AddCard` (0xad9238) per element, and "
      + "then hands the SAME json to the app callback as a `vector<basic_json>` - the sink in its recovered "
      + "mangled signature. **The generic mock was the whole bug**: it had no `card` key, so the callback "
      + "branched to 0xf654e0 before building the vector and `CSRPopUpGachaX10Result::ReqGachaPremiumCB` "
      + "(0xcd7518) opened with nothing - the measured 'Response 398 B, gems stayed at 60K, no card' symptom. "
      + "[RECOVERED] `cnt` MUST BE A JSON NUMBER: the read is `ldrb r1,[r0]; subs r1,#3; cmp r1,#4; "
      + "bhi 0xf653d8` and only tags 3..7 reach `strtod`, so an object, an array or null takes the reject "
      + "branch. [RECOVERED] each `card[]` element carries the `CSRCard::parse` instance columns "
      + "(`inst_id` 0x8680be, `ref_id` 0x86810c, `lock`, `skin_*`, `weapon_*`, `armor_*`, `accessory_*`, "
      + "`skill_1..5_level`, `mirage_remain_hp`) PLUS the six keys "
      + "`CSRPopUpGachaX10Result::RESULT::parse` (0xcd36a8) reads with **no null guard**: `index_id`, "
      + "`is_duplicate`, `inst_id` (all `strtod`), `reward.ref_id` (`from_json<std::string>`, so a STRING) "
      + "and `reward.qty` (`strtod`). A missing key walks a JSON null and throws `type_error.305`. "
      + "Afterwards the popup resolves the award through `CSRInventory::FindCardInstBySerial(inst_id)` -> "
      + "`GetCardRefID` -> `CSRCardInfoContainer::GetCardData(ref_id)`, so both the element's `ref_id` and "
      + "`reward.ref_id` must be published by `/reference/GetCard`. "
      + "[RECOVERED] `ret_data.user.{iap_qty, free_iap_qty, gold.cur}` are optional (null-guarded at "
      + "0xf750c0/0xf75118/0xf75168) and are published so the currency readout moves. "
      + "[DELIBERATELY OMITTED] `achievement`, `consumed_inst_list`, `point`, `mileage_action`, "
      + "`before_point`, `after_point` - each is reached only after an explicit null test, so an absent key "
      + "is the safe form; `achievement` additionally violates the standing `/mission/Complete` invariant "
      + "that a present-but-empty `achievement` is worse than none. "
      + "[FIXTURE] The roll table: nothing recovered decides WHICH card a pull yields, so the replica "
      + "awards a selected published card (`BLUSTONE_RECRUIT_CARD`, default002 Mowgli;003 Nene;004 Tyltyl). "
      + "New grants use community birth grades2/3/1; existing starter snapshots keep their saved grades. "
      + "Native10+1 banner guarantees at least one three-star hunter. A bundle substitutes its final "
      + "draw with a published born-grade3+ reference if the selected pool is lower; this deterministic "
      + "choice is local policy, not recovered probabilities. Missing guaranteed candidates refuse before spending. "
      + "Duplicate flags use acquired-reference history, including earlier draws this request. Unknown "
      + "selectors grant nothing and spend nothing. BLUSTONE_GACHA_CARD is the legacy bootstrap dial; "
      + "use the new recruit selector to avoid replacing saved002 references. 0 disables grants. "
      + "[RECOVERED] Standard prices are30/count1 and300/count11, direct units. Affordability sums "
      + "paid+free; cost is charged once. Native confirmation specifies green/free Manda first. Overrides "
      + "BLUSTONE_GACHA_COST/bundle and BLUSTONE_GACHA_SINGLE_COST/single remain explicit fixtures. "
      + "Other counts/banner prices are unreconstructed and refuse without spending. Starting balances are "
      + "invented. `result_code` is 1 on EVERY path, refusals included - a non-1 code puts "
      + "`CPVHTTPManager::Enqueue` into the 8x silent retry, so 'not enough currency' is expressed as "
      + "`cnt: 0`/`card: null` plus a non-client `error_code`, never as a failed envelope. "
      + "[NOT RECOVERED] The rarity/roll weights, whether `reward` can ever be an item rather than a card, "
      + "and the full key set of `ret_data.user`.",
      "Lobby and session",
      response("Recruitment pull result; encrypted on native transport.", { allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { type: "object", properties: { ret_data: { $ref: "#/components/schemas/GachaPremiumResponse" } } }] })),
    "x-reverse-engineering-status": "native-parser-reconstructed",
    "x-evidence": "analysis/research/gacha-premium-contract.md (full disassembly derivation); analysis/research/in-game-stats.md §5.3/§6/§7; analysis/native-network-decomp.txt:8544 (CSRSyncLottery::RequestGachaPremium 0xf74774); analysis/native-all-strings.tsv 0x01d8fd43 RequestGachaPremium / 0x01d8fd70 /shop/GachaPremium / 0x01d8fd57 item_inst_id / 0x01d8fd64 bonus_level; CSRSyncLottery::ReqGachaPremiumCB 0xf74fb0; CSRPopUpGachaX10Result::ReqGachaPremiumCB 0xcd7518; CSRPopUpLotteryShot::ReqGachaPremiumCB 0xcf0bf4; CSRPopUpGachaX10Result::RESULT::parse 0xcd36a8; CSRPlayData::ParseCardInst 0xb69598; CSRCard::parse 0x8680a4; analysis/catalogue/cards/002.md; server-ts/src/state.ts; server-ts/src/bootstrap.ts; server-ts/tests/smoke.ts",
    "x-runtime-confidence": "Request contract recovered from the client and the result contract recovered by disassembling all three native parsers; unit-tested in tests/smoke.ts. NOT yet observed on device: the first pull with a real `card[]` has never been made, so whether the result popup paints is unmeasured.",
  } };
  for (const [route, summary, description] of [
    ["/arena/Enter", "Enter local Fight Club", "Native arena.status1 and arena.season, user.battle scalar profile, user.is_weekly_reward0 and root deck. First entry seeds a separate CASE4 deck from the existing expedition party without changing CASE1 or granting hunters. Native season deadline units are server-epoch seconds; calendar alignment, duration and rank are local fixtures. Rendered timing/display validation is pending."],
    ["/arena/GetMyRank", "Read local Fight Club rank", "ReqMyRankCB reads ret_data.rank directly as a scalar. Returns local rank1 consistently with Enter; this is a single-player ladder fixture, not recovered global ranking. No battle, wallet or deck mutation."],
    ["/arena/FindRival", "Find a local sparring opponent", "Returns arena.rival_list array of full native defender records: strict profile strings, nested battle profile, chain_bonus/card_book, inst_1..inst_5 deck with full known-art card instances, gem[]. Synthetic pvid9000001 is a local opponent, not owned inventory or real matchmaking. Root refresh_price is a fixture; RefreshRival currently refuses rather than claiming a supported transaction."],
    ["/arena/BattleStart", "Start a dedicated Fight Club attempt", "Requires target_pvid9000001, is_revenge0, is_friendship0, bid0. Local BP cost1, AP unchanged. Native ParseApBp requires ALL FOUR flat scalar fields user.ap/ap_charge_time/bp/bp_charge_time; target is arena.combat_info, with root refresh_price. Persists separate arena attempt and CASE4 party; active-start replay spends no extra BP. Expedition/arena active attempts cannot overlap. Revenge/friendship/nonzero bids are unimplemented and refuse. This replaces the incorrect mission alias; native fight rendering remains unverified."],
    ["/arena/BattleComplete", "Settle a dedicated Fight Club attempt", "Requires target_pvid, is_revenge0 and play_info JSON containing is_win and native combat metrics. Native is_win determines the outcome; original combat/timeout rules and anti-cheat are not reconstructed. Returns user.battle prev/cur pairs for league_level/win/lose/league_win/rating_point, user.honor pair, and top-level card map keyed CASE4 snapshot IDs with direct unchanged EXP pairs. Complete does not resync AP/BP. Local honor10/rating+10 win, rating-10 loss and six wins per league are fixtures; original rewards/EXP allowance are unknown. Repeated matching completion without an active attempt replays the original persisted receipt without another reward. No completion nonce was recovered: a stale completion crossing a later same-target Start is indistinguishable; transport exactly-once is not promised. Native fight/result/reload validation pending."],
  ] as const) {
    paths[route] = { post: {
      ...operation(summary, description, "Missions and combat"),
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-evidence": "analysis/research/arena-lobby-contract.md; analysis/research/arena-battle-contract.md; server-ts/src/arena-service.ts; server-ts/tests/arena.ts",
      "x-runtime-confidence": "Dedicated server contract/persistence tested; native Fight Club UI/battle unverified",
    } };
  }

  for (const [route, summary, description] of [
    ["/shop/PieceExchange", "Recruit hunters from owned traces", "Recovered RequestShardExchange sends item_inst_id and cnt (number of hunters). Validates owned unlocked local trace instance, published hunter birth rank/stat support, trace quantity, lobby capacity100 and safe fresh actor IDs. Consumes cnt times the published local threshold10 Sylvester/20 Gerard; returns card ARRAY of complete owned instances and consumed_inst_list inst_id/qty decrement delta. CSRAchieve ParseLobbyEnter requires dailyquest_min_stage empty string plus neutral daily_quest/linear_quest arrays. Persists debit, ownership, allocator and cardbook together, preserving wallets/party/stars/tutorials. No nonce: funded repeats are additional exchanges; reconcile ownership after a lost response. Original thresholds/stats are unknown; native success presentation remains unverified."],
    ["/message/GetReceivedList", "Read account mailbox", "CPVMsg callback consumes ret_data.unread_count plus list of complete message rows. Persistent account-owned local system notice is created only after a newly accepted explicit matching normal-stage first clear; no backfill or attachments/rewards. Content is a plain string; attachment:null skips the native attachment parser. Timestamp uses local uint32 Unix seconds, original unit unverified. Offset/ID-bound paging is local policy. No outbound messages."],
    ["/message/Read", "Mark an owned mailbox message read", "Recovered request target_list is one decimal uint64 ID string. Response target_list is numeric ID ARRAY plus current unread_count. Validates ownership, persists read flag without wallet/inventory/progression changes; repeats acknowledge without another write. Unknown targets refuse."],
    ["/message/Archive", "Archive an owned mailbox message", "Recovered common callback takes target_list numeric ID ARRAY/unread_count. Local archive policy hides row from received list and unread total; flags persist across restart and repeats do not mutate again. No attachment settlement or outbound send is reconstructed."],
    ["/message/RemoveReceived", "Delete owned received messages", "Native target_list request is comma-separated decimal IDs with a trailing comma; response is numeric target_list ARRAY plus unread_count. Local atomic ownership checks and persistent deletion receipts make retries safe across restart. No reward/refund, arbitrary delete-all, or sent-mail deletion. Original deletion restrictions remain unknown; native UI validation pending."],
    ["/supply/RefreshSpecialList", "Read pending Special Supply", "Recovered ret_data.special[] wrapper. Durable account-owned gold-only local first-clear bonuses; no backfill or starter grants. Native portrait prefix C001 and zero unlimited expiry; gold amount is a local fixture, original rewards unknown. Native Supply UI unverified."],
    ["/supply/SpecialListReward", "Claim earned Special Supply", "Request id_list is a JSON-array encoded string of numeric supply IDs. Atomic ownership and gold-capacity checks; receipt target_inst_id is numeric ARRAY with user.gold prev/cur. Pending rewards and claims persist; retries acknowledge settled IDs without another payout. Only local gold rewards implemented; original items/cards/gems/skins and economy remain incomplete."],
    ["/relation/GetTargetUserInfo", "Read a target brief profile", "Native CPVRelation reads ret_data.list rows containing pvid, reg_utc, utc, nick_name, country_code, profile_url, profile_status, like_cnt and is_like. Authenticated bounded list requests admit the requester, documented local notice/Arena fixtures, and actual mutually nonblocked same-server peers, including discovery candidates. Peer names/identity come from local accounts with the original100x100 system icon as a local fallback; no private credentials or synthetic Hunter party is published. Unknown, blocked and different-server peers refuse. Historical full party-profile requests remain separate fixtures."],
    ["/world/GetUserDetail", "Read the local notice sender detail", "The native profile cache requires a second stage: ret_data is a bare ARRAY of detailed party-profile rows. Only authenticated singleton list[1] is implemented as local presentation metadata; other targets refuse2001. No card/account grant or original administrative identity is implied. Native portrait completion requires an image node exactly100x100."],
    ["/episode/Read", "Acknowledge regular story reading or clearing", "Authenticated id must name one of the recovered 147 S01 graph nodes. Native r_ prefix records read state; bare id records clear state. Durable encoded read_log survives restart and deferred retries without grants or tutorial edits. Client-reported clear acknowledgment does not independently verify a story battle. Seasonal events and reward settlement are not enabled."],
    ["/episode/Reward", "Claim supported original chapter rewards", "Original E05 reward is 20 AIRSHIP_TICKET. Original E18 declares RP1x100000; RP1 is a native gold display identity. Replica policy settles E18 through user.gold{prev,cur}, not an RP1 item stack. Original E02 declares FMD1x30; replica policy credits30 through user.free_iap{prev,cur}, preserving paid currency. Currency quantities use direct wallet units without an inferred scale. Original Episode settlement remains unavailable. Authenticated claims require every descendant story recorded cleared (conservative local policy), validate inventory/gold capacity, and persist the reward plus reward_log marker together with rollback on failure. Native item receipts are additive; settled retries return item[]/user:null, never another delta. Other chapter materials remain unsupported and refuse. Native E01 through E05 story clears and both E05 battles are verified. Native E02 reward credited30 free Manda; E05 reward added20 capsules with Search count16 to36. E18 settlement remains unverified. Client-reported logs do not independently prove a battle."],
    ["/lobby/GetGemInven", "Read owned jewel instances", "Authenticated raw explicit owned_gems rows preserve full ability/main/sub data and validated target ownership. Mounted positions1..2 and per-equipment rank3 second-slot gate are checked; duplicate occupancy refuses. Legacy scalar gem remains separate. Unsafe string IDs are emitted as exact integer JSON tokens to avoid native strtod rounding; no gems auto-granted. Native jewel UI unverified."],
    ["/reference/GetGem", "Read jewel definitions", "Authenticated explicitly supplied immutable Gem INFO rows with selected/hash-pinned original artwork. Default empty. Original reference IDs and roll distributions remain unknown; resource namespace never invents a gameplay ID."],
    ["/card_handler/EquipGem", "Install or replace owned Gems", "Authenticated six-cell plural combination, exact uint64 IDs, owned same-target or unmounted Gems only. Matching part, equipment rank3 second slot and active/Mirage protections. Explicit immutable level/price_type/price quotes charge each changed old occupied cell at its OLD level using gold2; absent quotes and unsigned overflow refuse. Cross-Hunter/type4 transfers unsupported. Full owned Gem rows repair lost removal responses on no-write retries. Atomic gold/inventory persistence and rollback; GDP0 lobby policy and legacy scalar remain separate. Original fees and native UI validation missing."],
    ["/reference/GetGemCombinationEffect", "Read jewel set effects", "Authenticated immutable explicit BLUSTONE_GEM_COMBINATIONS_JSON rows, default empty. Exact bare ret_data wire rows retain numeric id/count/rank/awk_step and decimal-string stat fields; native mode1 parser applies percentage normalization. No UI help or estimates are promoted into original tables. Native client applies set bonuses; server does not duplicate their stat effects."],
    ["/reference/GetGemSellPrice", "Read jewel selling prices", "Authenticated immutable explicit BLUSTONE_GEM_SELL_PRICES_JSON rank/level/price_type/price uint32 rows, bare ret_data array; default empty. Exact rank/level/gold2 quotes settle supported no-Guild sales. Original numeric prices remain missing."],
    ["/gem/Sell", "Sell owned unmounted Gems", "Authenticated singleton inst_id or inst_id_list JSON form string of exact uint64 IDs. Requires every ID currently owned and explicit rank/level gold2 quotes; mounted refusal is conservative local policy. Whole-batch atomic deletion and gold credit with rollback; signed32 wallet bounds, duplicate/unknown/sold replay and mixed-batch refusals. Native callback deletes captured request IDs; response user.gold.cur and user.item[] carry absolute quantities, no invented deletion list. Lost-first-response reconciliation needs inventory refresh; no universal successful retry promise. Original economy/native UI unverified."],
    ["/reference/GetGemLevelUpPrice", "Read jewel polishing prices", "Authenticated immutable BLUSTONE_GEM_LEVEL_PRICES_JSON native rows with level/price_type/price uint32, unscaled double possibility/failed_compensation and byte add_sub_ability. Default empty. Native lookup uses level only and the popup queries next level, so duplicate level rows refuse even across currencies. Numeric tables/outcome laws and Guild benefit2 remain missing; configured prices do not enable LevelUp or invented random rolls."],
    ["/reference/GetGemDisassemblePrice", "Read jewel removal prices", "Authenticated bare ret_data level/price_type/price uint32 rows from immutable explicit BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON, default empty. Duplicate level/payment keys refuse startup. Native exact old-level/payment lookup; missing sentinel is unavailable rather than free. Gold2 replacement is supported with supplied quotes; original numeric economy remains missing."],
    ["/supply/LoginBonusReward", "Claim the currently offered Daily Sign In reward", "Native Supply28D RequestLoginReward posts target_cnt, distinct from legacy AttendReward offer_target_cnt. Published local28-entry calendar uses gold100 per observed UTC login day, no missed-day catch-up or repeated cycle. Authenticated V2_GetSupplyInst records one visit per new UTC day and returns login_bonus cur_value/cycle/cycle_log; reading never grants gold. Claim requires positive current offered target, unclaimed and safe gold capacity. Persists gold and claim together. Receipt reward.user.gold.cur and parallel inst cur_value/cycle/cycle_log; neutral dailyquest_min_stage/daily_quest/linear_quest fields satisfy transitive achievement parser. Source item_list/card_list are JSON strings. Duplicate/out-of-range claims refuse without another grant. Original rewards/calendar policy unknown; native claim UI validation pending."],
    ["/explore/Retry", "Reopen one exhausted Search attempt", "Recovered ref_id/price/price_type request with exact authoritative quote validation. Local fee10 Manda, free-first; paid receipt user.iap/free_iap prev/cur. Adds one retry_log string while retaining completed play logs: native GetPlayCnt equals plays minus retries. Local max_retry1 per period; no active combat. Same-operation acknowledgement for same last completed log returns snapshot/user:null without another charge. Capsules/helper use/rewards/ownership remain unchanged. Original price/tier/calendar policy unknown; native repeat UI unverified."],
    ["/explore/Reset", "Reset local Search period limits", "Recovered global price/price_type request, no target ID. Local fee30 Manda, free-first; clears current period play/retry logs, restarts local one-hour deadline and increments reset_cnt, preserving last End receipt and monotone battle IDs. Returns direct GetInst snapshot and actual wallet prev/cur pairs. Rejects active combat/invalid quote/insufficient funds; same-log duplicate acknowledgement carries no charge. Does not restore helpers or grant capsules/traces/hunters. Original price/tier/log-reset policy unknown; native reset UI unverified."],
    ["/explore/GetRef", "Read local Hunter Search catalog", "Native RequestRef callback reads ret_data.ref and ret_data.event_ref. Normal requires type1 and a nonempty catalog before scene initialization. Publishes one local Sylvester006/source n_01_07 entry; identity, limits, cost and period are fixtures, not original search data."],
    ["/explore/GetInst", "Read persistent Hunter Search history", "RequestInst callback passes ret_data directly to ParseInst. inst/retry_log/cleared_explore remain empty; completed play_log rows contain ref_id/log_id/inst_id0/owner0 for the local one-hour period. Pending logs replay through Begin and do not disable their unfinished UI node. Published local Reset30/Retry10 Manda quotes, persistent reset counter and absolute server-second period deadline are returned; idle user:null performs no player writes. No jobs or inventory are granted by this read."],
    ["/explore/Begin", "Start a dedicated Hunter Search attempt", "Validates the recovered normal packet: owner0/type1/ref_id017/inst_id0, friend_pvid0, safe nonnegative friend_leader_id (native reserved NPC serial900000001 for the known virtual helper; zero required without a helper), known virtual helper or empty vfid, wave_info0or1. Authenticated account owns the durable monotone log and CASE1 party snapshot. Normal cost1 AIRSHIP_TICKET is debited once, with consume_result inst_id/qty1 decrement delta. One initial guided attempt at capsule0 is a LOCAL recovery waiver only after earned stage8, actual37/0 acknowledgement and pending37/1; it grants no inventory and writes no tutorial flags. Receipt log_id/reward_cnt array/wave_info array includes ordered waves0/1 for unlinked local_search_017, multipliers100 and skill1..5 zero neutral fixtures. Active replay retains log/waves but omits the decrement delta. Cross-mode combat and active party edits/training-source consumption refuse. Original costs/waiver/rates are unknown."],
    ["/explore/End", "Settle a dedicated Hunter Search log", "Account/log-bound completion consumes serialized play_info with explicit clear and empty item_use. Two-wave victory cleared_wave2; losses retain current zero-based wave index0or1. Native outcome and wave count must agree. Receipt wave{cleared_wave,max_wave2}, consume_result[], item[] additive deltas, gem[],special[],reward_item[] display; detect/achievement omitted. Local ordinary victory awards1 Sylvester trace; a qualifying first guided win awards the published recruitment threshold10 so its next Recruit step can proceed, independently of capsule cost/waiver. Defeat awardsnone. Previously settled one-trace guide receipts remain unchanged without backfill. Campaign stars/AP/BP/gold/EXP/ownership/tutorial flags stay unchanged. Settlement and helper use persist together. Repeated End retains outcome/display but omits additive inventory deltas. Without a native nonce, lost-first-response item display needs inventory refresh; transport exactly-once is not promised. Reward/Entrust remain unsupported; Retry/Reset use the separate instance-snapshot contract."],
  ] as const) {
    paths[route] = { post: {
      ...operation(summary, description, "Missions and combat"),
      "x-reverse-engineering-status": "native-parser-reconstructed",
      "x-evidence": "analysis/research/search-entry-reference-contract.md; server-ts/src/hunter-search.ts; server-ts/tests/hunter-search.ts",
      "x-runtime-confidence": "Server contract/no-mutation checks pass. Native Search map, guide focus, partner selection, two-wave combat, successful End, Search Complete2/2, trace1/10 and village return verified. Original content/economics remain fixtures; normal capsule spending, dispatch and recruitment remain unverified.",
    } };
  }

  for (const [route, summary, description] of [
    ["/reference/GetAbyss", "Read reconstructed virtual partner references", "ReqAbyssCB passes the full envelope to SetAbyss; ret_data.virtual_friend is an array of flat rows with id/nick_name/user_exp/card_ref_id/card_exp plus complete CSRCard instance fields on each row. Native PostProcessVirtualFriends loads their known card references before Arrange builds the partner list. Publishes one nonowned Lantern001 template with local identity/rank/EXP. list/reset_price remain empty: Abyss content is unimplemented. This is not a GetExtra field or an owned hunter award."],
    ["/abyss/GetHelperList", "Read used partner IDs", "ReqSupportersCB reads ret_data.friend[] numeric pvids and virtual[] string reference IDs. These mark helpers USED, not available profiles. Local UTC-day usage persists on accepted Begin. A pending log keeps its reserved helper selectable for resuming that same log; another active identity refuses. Reads perform no inventory/player-state mutation. Original usage/reset policy is unknown."],
  ] as const) {
    paths[route] = { post: {
      ...operation(summary, description, "Missions and combat"),
      "x-evidence": "analysis/research/search-partner-entry-contract.md; server-ts/src/search-helpers.ts; server-ts/tests/search-helpers.ts",
      "x-runtime-confidence": "Server schema/no-grant checks pass. Native Hunter Union Support Lantern row, original tutorial focus and green-check selection verified in BlueStacks. Begin, two-wave combat, successful End, trace1/10 result and village return verified; ordinary capsule spending and long-term usage refresh pending.",
    } };
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Blustone Replica HTTP API",
      version: "0.1.0",
      description: [
        "# Purpose",
        "Local compatibility-server contract generated from the recovered Blustone 2.8.0.1 ARM native library.",
        "",
        "# Evidence status",
        "Route literals are recovered evidence. Most payload/response shapes remain hypotheses until captured from an ARM-capable runtime. Every recovered operation carries `x-reverse-engineering-status` and `x-runtime-confidence` extensions.",
        "",
        "# Security status",
        "The APK contains a native shared-secret exchange and request protection layer. The local server implements the recovered P-384/AES-256-CBC/HMAC-SHA384 exchange for emulator compatibility, but it remains a local research server and must not be exposed to the public internet.",
        "",
        "# Local workflow",
        "Start locally, point the APK or an ARM test device at the advertised base URL, capture the first request/response pair, then replace the corresponding mock operation with a schema-backed handler.",
      ].join("\n"),
      contact: { name: "Blustone community replica" },
      license: { name: "Private local research scaffold" },
    },
    servers: [{ url: baseUrl, description: "Local-only compatibility server" }],
    tags: [
      { name: "Launcher", description: "Base URL, server selection, version, and launcher metadata." },
      { name: "Security handshake", description: "Native P-384 shared-secret negotiation and protected request/response transport." },
      { name: "CDN and resources", description: "Plain-text resource manifests and allowlisted local JET package downloads." },
      { name: "Account and authentication", description: "Guest, login, nickname, token, SNS, and push-token flows." },
      { name: "Reference data", description: "Static game/reference data required before gameplay." },
      { name: "Lobby and session", description: "Persistent local account session, inventory, notifications, gems and neutral weather." },
      { name: "Cards and training", description: "Owned hunter lock and training operations; numeric balance remains provisional." },
      { name: "Episodes", description: "Episode read/reward progress records." },
      { name: "Missions and combat", description: "Local expedition start/complete compatibility actions; battle simulation remains incomplete." },
      { name: "WebView events", description: "Redacted event/evaluation form fixtures recovered from cached WebView pages; separate from native gameplay schemas." },
      { name: "Social", description: "Friend, relation and guild list compatibility responses." },
      { name: "Local diagnostics", description: "Scaffold-only health and route introspection." },
    ],
    paths,
    components: {
      schemas: {
        GlobalParameters: { type: "object", additionalProperties: true, required: ["max_ap", "max_bp", "ap_refresh_interval", "bp_refresh_interval"], properties: {
          server_utc: { type: "integer", description: "Current server epoch seconds, consumed by SetExtra to synchronize native energy time." },
          max_ap: { type: "integer", minimum: 1, example: 50 }, max_bp: { type: "integer", minimum: 1, example: 10 },
          ap_refresh_interval: { type: "number", minimum: 1, example: 300, description: "Client regeneration interval; must remain positive after integer conversion." },
          bp_refresh_interval: { type: "number", minimum: 1, example: 1800, description: "Client regeneration interval; zero caused a village-screen arithmetic fault." },
        } },
        OpaqueObject: { type: "object", additionalProperties: true, description: "Placeholder-safe object for a route whose native record schema is not reconstructed. The response is an array of these objects, usually empty." },
        ItemInstance: { type: "object", required: ["inst_id", "ref_id", "qty", "lock"], properties: { inst_id: { type: "integer" }, ref_id: { type: "string" }, qty: { type: "integer", minimum: 0 }, lock: { type: "integer", enum: [0, 1] } } },
        MissionInstance: { type: "object", required: ["id", "stage_id", "state", "progress", "target", "reward_gold"], properties: { id: { type: "string" }, stage_id: { type: "string" }, state: { type: "integer", description: "Local state: 0 pending, 1 active, 2 complete." }, progress: { type: "integer", minimum: 0 }, target: { type: "integer", minimum: 1 }, reward_gold: { type: "integer", minimum: 0 } } },
        GemInventory: {type:"array",items:{type:"object",required:["ref_id","inst_id","rank","level","position","target_inst_id","ability","abilities"],
          properties:{ref_id:{type:"string"},inst_id:{oneOf:[{type:"integer",minimum:1},{type:"string"}]},target_inst_id:{oneOf:[{type:"integer",minimum:0},{type:"string"}]},
            rank:{type:"integer"},level:{type:"integer"},position:{type:"integer"},ability:{type:"string"},abilities:{nullable:true,type:"object",additionalProperties:true}}}},
        WeatherState: { type: "object", required: ["weather", "weather_id", "end_time"], properties: { weather: { type: "integer" }, weather_id: { type: "string" }, end_time: { type: "integer", minimum: 0 } } },
        NotificationState: { type: "object", required: ["notice", "popup", "defense_endtime"], properties: { notice: { type: "array", items: { $ref: "#/components/schemas/OpaqueObject" } }, popup: { type: "array", items: { $ref: "#/components/schemas/OpaqueObject" } }, defense_endtime: { type: "integer", minimum: 0 } } },
        LocalBattle: { type: "object", required: ["battle_id", "stage_id", "state", "started_at", "completed_at", "deck_inst_ids", "enemy_count", "result", "stars"], properties: {
          battle_id: { type: "string", example: "local-1000001-1720000000000" }, stage_id: { type: "string", example: "n_01_01" },
          state: { type: "string", enum: ["active", "completed"] }, started_at: { type: "integer", format: "int64" }, completed_at: { type: "integer", format: "int64" },
          deck_inst_ids: { type: "array", items: { type: "integer" }, description: "Owned card instance IDs supplied to mission/Start; the local default is the leader instance." },
          enemy_count: { type: "integer", minimum: 0, example: 1 }, result: { type: "integer", example: 0, description: "0 while active; 1 for the local win result." }, stars: { type: "integer", minimum: 0, maximum: 3, example: 0 },
        } },
        MissionStartResponse: { type: "object", required: ["accepted", "stage_id", "battle_id", "ap", "battle"], properties: { accepted: { type: "boolean" }, idempotent: { type: "boolean" }, stage_id: { type: "string" }, battle_id: { type: "string" }, ap: { type: "integer" }, mission_id: { type: "string" }, battle: { $ref: "#/components/schemas/LocalBattle" }, error_code: { type: "string", enum: ["AP_EMPTY", "BATTLE_ALREADY_ACTIVE"] } } },
        /**
         * `/mission/Complete` ret_data, shaped from `CSRSyncMStage::ReqCompleteCB`
         * (0xb426ac). Every field marked [RECOVERED] names the decompile line in
         * `analysis/native-mission-complete.txt` that reads it; the [FIXTURE] values
         * are local economy guesses (AGENTS.md §15), never recovered production data.
         *
         * Two omissions are load-bearing and are enforced by
         * `tests/mission-complete.ts`:
         *   - `detect`: a present value skips the `user.ap`/`user.bp` resync
         *     (L2603-2817), so AP spent at `/mission/Start` never comes back.
         *   - `achievement`: a present value calls
         *     `CSRAchieve::ParseAchievementsElement` (0x8481c4), a
         *     `/dailyquest/GetInstList` REQUEST builder, from inside a response
         *     callback (L2823-2828).
         * Both guards are IS-NULL tests, not emptiness tests, so `{}` and `[]`
         * are NOT safe substitutes for omitting them.
         */
        MissionCompleteResponse: { type: "object", description: "result_code is 1 for EVERY outcome including a defeat: ReqCompleteCB L1133-1151 silently retries any non-1 code up to eight times and then discards the response unparsed. A loss is expressed by the payload, never by the code.", required: ["accepted", "stage_id", "achieve", "user", "level", "max_ap", "item", "card", "consumed_inst_list", "clear", "result", "win", "stars", "reward", "mission", "gold", "ap", "exp"], properties: {
          // [RECOVERED] L1332-1338, unguarded from_json<string_t>: must be a string.
          stage_id: { type: "string" },
          // [RECOVERED] L1808-1897: ARRAY of {order} -> SetStageAchieve. The ONLY
          // progression write in the callback; there is no SetStageID here.
          achieve: { type: "array", description: "[RECOVERED] Newly granted flags0..2. Empty for defeat or a replay with no improvement; replays may earn missing performance conditions. Distinct from lobby stage.achieve, which is JSON-encoded array TEXT.", items: { type: "object", required: ["order"], properties: { order: { type: "integer", minimum: 0, maximum: 2, description: "[RECOVERED] Three-byte flag bound from ParseMissionInfo/GetStageAchieveCnt. Index3 is out of bounds." } } } },
          // [RECOVERED] L1351-1796 and again L2606-2767: prev is the pre-clear
          // snapshot, cur the post-clear value. The client only stores `cur`.
          user: { type: "object", required: ["gold", "exp", "max_ap", "ap", "ap_charge_time", "bp", "bp_charge_time"], properties: {
            gold: { $ref: "#/components/schemas/PreviousCur" },
            exp: { type: "object", required: ["prev", "cur", "level", "max_ap"], properties: {
              prev: { type: "integer" }, cur: { type: "integer" },
              level: { $ref: "#/components/schemas/PreviousCur" },
              max_ap: { $ref: "#/components/schemas/PreviousCur" },
            }, description: "Native r5 retains the EXP object: level/AP-cap pairs are nested INSIDE user.exp. Level follows the published threshold count; current fixture0/100 caps Team level at2. Native level-up popup validation remains pending." },
            max_ap: { $ref: "#/components/schemas/PreviousCur" },
            ap: { $ref: "#/components/schemas/PreviousCur" },
            ap_charge_time: { type: "integer", description: "[RECOVERED] SyncAP arg 3 (L1702-1704)." },
            bp: { $ref: "#/components/schemas/PreviousCur" },
            bp_charge_time: { type: "integer", description: "[RECOVERED] SyncBP arg 3 (L1767-1769)." },
          } },
          // Legacy aliases. Native reads these pairs from user.exp, confirmed
          // by the r5 register flow; root aliases alone do not set its flags.
          level: { $ref: "#/components/schemas/PreviousCur" },
          max_ap: { $ref: "#/components/schemas/PreviousCur" },
          // [RECOVERED] L2249-2415: ARRAY of drop records -> AddItem. Argument
          // order still unpinned (battle-lifecycle.md [UNKNOWN-3]); empty here.
          item: { type: "array", items: { type: "object", properties: { inst_id: { type: "integer", format: "int64" }, added: { type: "integer" }, ref_id: { type: "string" } } } },
          // [RECOVERED] L1909/L1921: OBJECT keyed by to_string(card serial),
          // values {prev,cur} -> SetCardExp. An array here is wrong.
          card: { type: "object", additionalProperties: { $ref: "#/components/schemas/PreviousCur" }, description: "[RECOVERED] Decimal owned serial keys with direct absolute EXP prev/cur pairs. Local policy grants published character_exp10 to up to four snapshotted participants per new matching win, including replays; no defeat/duplicate reward. Ordinary EXP caps preserve old over-cap values; unknown awakening curves stay untouched. Native EXP/result UI validation pending." },
          // [RECOVERED key, shape UNKNOWN] Read unconditionally by
          // CSRInventory::UseItem (L1313-1316). An empty ARRAY is the no-op.
          consumed_inst_list: { type: "array", items: { type: "object" } },
          // ---- inert local diagnostics; ReqCompleteCB reads none of these ----
          accepted: { type: "boolean" },
          clear: { type: "integer", enum: [0, 1], description: "[FIXTURE] Local echo of play_info.clear, the client's own win byte from MISSIONPLAY_INFO+0x28." },
          battle_id: { type: "string" },
          result: { type: "integer", enum: [0, 1], description: "[FIXTURE, inert] Not read by ReqCompleteCB." },
          win: { type: "integer", enum: [0, 1], description: "[FIXTURE, inert] Not read by ReqCompleteCB." },
          stars: { type: "integer", minimum: 0, maximum: 3, description: "[FIXTURE, inert] The wire carries stars in achieve[].order; this is a local mirror. The native `star`/`prev_star`/`is_first_clear` are client-derived and are deliberately NOT sent." },
          reward: { type: "object", required: ["gold", "items"], properties: { gold: { type: "integer", minimum: 0 }, items: { type: "array", items: { $ref: "#/components/schemas/ItemInstance" } } } },
          mission: { allOf: [{ $ref: "#/components/schemas/MissionInstance" }, { type: "object", nullable: true }] },
          gold: { type: "integer", minimum: 0 }, ap: { type: "integer", minimum: 0 }, exp: { type: "integer", minimum: 0 },
          error_code: { type: "string", enum: ["BATTLE_NOT_FOUND"] },
        } },
        PreviousCur: { type: "object", required: ["cur"], properties: { prev: { type: "integer" }, cur: { type: "integer" } }, description: "[RECOVERED] {prev,cur} integer pair. prev is the value before this completion; cur is what the client stores. prev == cur means no change was applied." },
        /**
         * `/mission/ReqAchieveReward` ret_data, shaped from
         * `CSRSyncMStage::ReqRewardCB` (0xb3c674). Only `achieve_cnt` is
         * load-bearing; everything else below `claimed` is an inert local
         * diagnostic that the native callback never reads.
         */
        MissionAchieveRewardResponse: { type: "object",
          description: "result_code is 1 on EVERY path, refusals included. ReqRewardCB bails to cb(-1,0) on any non-1 code (:463-473) and the transport retries, which is the 8x silent retry storm measured for /mission/Complete. A refusal is expressed by the PAYLOAD: an `achieve_cnt` that matches no published achieve_reward entry.",
          required: ["achieve_cnt", "gold", "item", "area_id", "claimed"],
          properties: {
            // [RECOVERED] THE field. ReqRewardCB scans GetRewards() for an entry
            // whose achieve_cnt equals this (:531/:566); only a match runs
            // SetAchieveRewardReceived (:570) and makes `found` true. Echo the
            // request's target_achieve_cnt verbatim. A number, not a string:
            // the comparison at :531 is against an int.
            achieve_cnt: { type: "integer", example: 3, description: "[RECOVERED] Must equal one of this area's /reference/GetArea `achieve_reward[].achieve_cnt` values. That value is what `CSRSyncMStage::RequestReward` sent as `target_achieve_cnt`, so echoing it is what flips the chest to the `opened` sprite state - the only state in which the double-sprite artifact stops drawing." },
            // [RECOVERED] {prev,cur}: the credit is applied only when prev != 0
            // (ghidra-chest-01-reward-route.txt:629-717). Equal means nothing paid.
            gold: { $ref: "#/components/schemas/PreviousCur" },
            // [RECOVERED] ARRAY of {inst_id, ref_id, qty}; both loops in
            // ReqRewardCB iterate it (:880-1020, :1085-1235). Empty for a
            // refusal or a replay.
            item: { type: "array", items: { type: "object", required: ["inst_id", "ref_id", "qty"], properties: { inst_id: { type: "integer", format: "int64" }, ref_id: { type: "string" }, qty: { type: "integer" } } } },
            // MUST be absent or JSON null. ReqRewardCB :517-520 is an IS-NULL
            // test; a present value (even []) calls
            // CSRAchieve::ParseAchievementsElement (0x8481c4), a
            // /dailyquest/GetInstList REQUEST builder, from inside a response
            // callback. Enforced by tests/chest-reward.ts.
            achievement: { type: "object", nullable: true, description: "OMIT or null. NEVER []." },
            // ---- inert local diagnostics; ReqRewardCB reads none of these ----
            area_id: { type: "string" },
            requested_target_achieve_cnt: { type: "string", description: "The raw form field, verbatim - it is a string on the wire." },
            claimed: { type: "boolean", description: "false for a refusal and for an already-opened chest." },
            authenticated: { type: "boolean", description: "false when the credential could not be resolved; the response is still result_code 1 and pays nothing." },
            area_achieve_cnt: { type: "integer", description: "The replica's own progress total for this area (sum of per-stage achieve over the area's links)." },
            required_achieve_cnt: { type: "integer", description: "The threshold this chest is drawn at: GetStageCnt(area) * (index + 1)." },
            error_code: { type: "string", enum: ["MALFORMED_TARGET_ACHIEVE_CNT", "UNKNOWN_ACHIEVE_CNT", "UNKNOWN_AREA", "ALREADY_CLAIMED"] },
            reward: { allOf: [{ type: "object", properties: { gold: { type: "integer" }, items: { type: "array" } } }, { type: "object", nullable: true }] },
            gold_balance: { type: "integer" },
          } },
        },
        /**
         * One `achieve_reward` record on `/reference/GetArea`.
         *
         * **[RECOVERED]** field set from `CSRGameStage::SetArea` (0xa28108): in
         * memory it is `CSRGameStage::ACHIEVE_REWARD`, 0x34 bytes, stride 0x34 in
         * `GetRewards` (0xa29c34) - `int32 achieve_cnt` at +0x00, `std::string
         * area_id` at +0x04 (the key `GetRewards` filters on),
         * `vector<pair<string,uint32>> item_list` at +0x1c and
         * `vector<pair<string,uint32>> card_list` at +0x28.
         *
         * **`achieve_cnt` MUST equal `GetStageCnt(area) * (index + 1)`.**
         * `ShowReward` (0xe9413c) labels the three chests `S`, `(S*6)/3` and
         * `S*3` where `S = GetStageCnt(area)` (`:2539-2572`), and both the
         * sprite state (`:3218`) and the REQUEST GATE (`SendRewardRequest`,
         * `:1572-1574`) compare the player's progress against `S * (i+1)`.
         * `RequestReward` then sends this very value as `target_achieve_cnt`.
         * An empty catalog is not a degraded experience - it is unrecoverable:
         * with nothing to match, `ReqRewardCB` can never call
         * `SetAchieveRewardReceived`, `cb(-1, 0)` fires and the chest never
         * opens. That array was empty in this replica until 2026-10-03.
         *
         * **[RECOVERED]** `item_list` must be non-empty. `PopUpClearReward`
         * (0xe964e0) returns early - logging only `RMTrace(2, "ClearRewardInfo
         * Not Found")`, which is invisible at default trace levels - when the
         * reward's item strings are both empty, so the reward popup stays blank.
         *
         * **[FIXTURE]** the ids (`914`, `913`, `912` - real recovered
         * `CHAR_STR_RO` item strings, "Transcendence Ticket") and every gold
         * amount. `card_list` is empty by design: the replica publishes one
         * card and cannot resolve a granted one.
         */
        AreaAchieveReward: { type: "object", required: ["area_id", "achieve_cnt", "gold", "free_iap", "iap", "item_list", "card_list"], properties: {
          area_id: { type: "string", example: "n_01" },
          achieve_cnt: { type: "integer", minimum: 1, example: 3, description: "[RECOVERED] GetStageCnt(area) * (index + 1). Also the exact value /mission/ReqAchieveReward must echo back." },
          gold: { type: "integer", minimum: 0, description: "[FIXTURE] 300/200/100. The mechanism is recovered - ReqRewardCB applies ret_data.gold.cur only when prev != 0." },
          free_iap: { type: "integer", minimum: 0, description: "[RECOVERED] key. Gated on CPVDataMgr+0x58; the replica leaves it 0 and omits the response-side twin." },
          iap: { type: "integer", minimum: 0, description: "[RECOVERED] key. Gated on CPVDataMgr+0x5c; the replica leaves it 0." },
          item_list: { type: "array", minItems: 1, items: { type: "object", required: ["id", "qty"], properties: { id: { type: "string", minLength: 1, example: "914" }, qty: { type: "integer", minimum: 1 } } } },
          card_list: { type: "array", items: { type: "object", required: ["id", "qty"], properties: { id: { type: "string" }, qty: { type: "integer" } } }, description: "[RECOVERED] vector<pair<string,uint32>> at ACHIEVE_REWARD+0x28. EMPTY on purpose." },
        } },
        AreaCatalog: { type: "object", required: ["area", "stage", "achieve_reward"], properties: {
          area: { type: "array", items: { type: "object", required: ["id", "type", "serial", "level_limit"], additionalProperties: true, properties: {
            id: { type: "string", example: "n_01", description: "[RECOVERED] The area identity. `CSRGameStage::GetAreaData` takes an area_id and `CSRUserDB::GetCurAreaID()` supplies it as `area_id` on /mission/ReqAchieveReward, so this is the value the chest claim is filed under. `area_id` is NOT published on the record itself: the recovered note that 'the identity field is area_id, not id' refers to the SRGameStage.cpp key cluster, and every link/reward record carries its own `area_id`." },
            type: { type: "integer", example: 1, description: "1 is normal expedition; other types pending reconstruction." },
            serial: { type: "integer", description: "[RECOVERED] The PER-TYPE ORDINAL at AREA_INFO+0x3c. `GetAreaData(AREA_INFO::TYPE, int)` (0x00a296f0) matches `+0x44 == type` AND `+0x3c == index` for `index in [0, GetAreaCnt(type))` and returns a shared EMPTY record on a miss, so the ordinals of one type must be a dense 0..N-1 run; `SetAreaState` then indexes the button array with it (`*(this+0x768) + area->0x3c * 8`). Ordinal 0 is the hidden origin node - `SetMarker` calls `SetVisible(button, i != 0)` (0xe74804 :337). [INFERRED key] that it is the JSON key `serial`; it is the only per-area integer in SetArea's key set that is not `level_limit` (+0x40, compared against GetUserLevel). assertAreaSerials() refuses a gap or a duplicate at boot, because either is a SILENT content loss rather than a crash." }, level_limit: { type: "integer", minimum: 0, description: "[RECOVERED] AREA_INFO+0x40 and a REAL GATE: `CSRSceneAreaSel::SetAreaState` (0xe75cdc :962-974) writes the locked sprite when `CSRPlayData::GetUserLevel() < area.level_limit`. [FIXTURE, safety-clamped to 0] the replica publishes 0 on every area because /lobby/Enter publishes no user `level`, so any ladder would gate content behind a value the server never sends - the same class of bounded-placeholder decision as the `achieve[].order` 1..3 clamp. BLUSTONE_AREA_LEVEL_LIMIT re-introduces a ladder for A/B." },
            resource_id: { type: "string", example: "MAP_ZONE_1", description: "[RECOVERED] THE MISSION-MAP BACKDROP ART NAME. NOT AN ENVIRONMENTS.CSV ID - this is the opposite of the stage `res_prefix` trap and getting it wrong in either direction is fatal-but-silent. Evidence: `CSRGameStage::SetArea` (0xa28108, literal 0x1d7770e) is the field's only reader and SetArea's recovered 27-key set contains no environment field; the `std::map<string,ENV_INFO>` at CSRStaticData+0x150 has exactly one reader, `CSRGameBase::OnInitBackground` (0x9cbf34), and its three callers all take the key from elsewhere (`CSRGameBase::InitBackground` 0x9cbe8c reads the STAGE's `res_prefix` at stage+0x70; `CSRSceneMEpisode::InitBackground` 0xb23e80 reads a LOCAL episode COMBAT JSON, not a route; `CSRExploreMirage::InitBackground` 0x926778 is the mirage override). The consumer is `CSRSceneMStageMap::CreateArea` (0xe91f0c), whose instruction order is PA_MAP_RD_%d (0xe9205e) -> PA_MAP_SP_%d (0xe920ca) -> PA_MAP_EV_%d (0xe92136) -> PA_MAP%d (0xe921d6) -> FindByName(\"PA_BG\") (0xe9222c) -> [load this art] -> SR_SNOW (0xe92490); PA_MAP%d and PA_BG are UI NODE names, because the recovered layout record KO/NEW/SR_MISSION/2_SR_UI_MS_ST/1_MS_ST_MAP defines 51 PA_MAP0..PA_MAP50 panels each wrapping an EMPTY <panel name=\"PA_BG\"> plus RE_MK0..RE_MK9 marker rects and exactly one res-name (ST_SHADOW), so code fills the backdrop. The miss is an ART miss - `[ERR] [RES] Can't find 'X' in ResMap.` is CRMResMap::GetResInfo (0x01d999cb) followed by `LoadAnim2 'X' failure` and `[ERR] [LoadAnim] Cannot find the resource(X)`, then `[WRN] [OnPlay] Cannot play the node,itrdon't have A resource of image` - NOT the environment signature, which is PREFIXLESS names (_A0.._A9/_D0.._D9/_E0.._E9) and appears only at the battle. Measured in analysis/r015/logcat-all.txt: exactly ONE miss per session, ~40 s before the battle, at lines 20620/65586/109593/157904/206015, for the value \"ST001\" - one per AREA, not one per STAGE (the fixture publishes 17 stages), which is what identifies it as the area field rather than the stage `thumb`. [FIXTURE] the value MAP_ZONE_1 is the only MAP* pack in the recovered corpus (6129328 bytes) and is NOT proven to resolve: entry names inside these containers are not plaintext, so pack existence does not imply a resolvable entry. A value that is an environments.csv #ID or an ST<n> prefix is REFUSED AT BOOT by assertAreaBackdropArt (src/bootstrap.ts) and by tests/area-backdrop.ts." },
            achieve_reward: { type: "array", minItems: 3, items: { $ref: "#/components/schemas/AreaAchieveReward" }, description: "The area's own three chest rewards, nested - the form analysis/research/chest-rewards.md §Q2 reads from SetArea. The identical records are ALSO published at the top level; see AreaCatalog.achieve_reward for why both are sent." },
            stage: { type: "array", items: { type: "object", required: ["area_id", "stage_id", "serial"] }, description: "The area's own stage links, NESTED - this is the form SetArea reads. Their COUNT is S = GetStageCnt(area), the chest-label multiplier. See the top-level `stage` for the field list and the [UNKNOWN-4] note." },
          } } },
          stage: { type: "array", items: { type: "object", required: ["area_id", "stage_id", "serial"], properties: {
            area_id: { type: "string", example: "n_01" }, stage_id: { type: "string", example: "n_01_07", description: "[RECOVERED] A stage id from /reference/GetStage. Every link resolves to a published record; assertAreaLinksResolve() refuses the replica at boot otherwise, because a dangling link only costs GetStageAchieveCnt 0 - the progress total shrinks SILENTLY and the node cannot be played." }, serial: { type: "integer", example: 7, minimum: 1, description: "[RECOVERED shape, [FIXTURE] values] `CSRGameStage::STAGE_LINK` is 0x1c bytes = {int32 serial; std::string id} - serial FIRST, then the id (CSRSceneMStageMap::OnInit reads `*piVar8` as the serial and `piVar8+4` as the string, and advances `piVar8 += 7`), and OnInit inserts `(serial -> GetStageAchieveCnt(id))` into an ORDERED std::map<int,int>, so the serial is an ORDERING KEY, not a flag. The replica therefore publishes 1..10 in position order - the only shape ever MEASURED to render a correct map. The recovered CSV's own serial column is 1..9,0 in EVERY area (not only n_05_10), so it is either a boss flag or an extractor artefact: [UNRESOLVED], and deliberately not published. `chest-rewards.md` Q2's 0,1,2 suggestion was NOT adopted either - IsOpened's key domain is unknown and the device has never faulted." },
          }, description: "[RECOVERED] The area->stage links, NESTED per area (this is what the decompile shows; the sibling top-level array is kept as evidence because the chapter shield marker depends on it). Their COUNT is `S = CSRGameStage::GetStageCnt(area)`, the multiplier behind the three chest labels `S / 2S / 3S`. [UNKNOWN-4] `GetStageCnt` and `GetStageLinks` both compare the link's single string against their argument while `OnInit` feeds that same string to `GetStageAchieveCnt`, which is keyed by STAGE id - both readings cannot be true of one field, so both keys are published." },
          achieve_reward: { type: "array", minItems: 3, items: { $ref: "#/components/schemas/AreaAchieveReward" }, description: "[RECOVERED] One entry per DRAWN CHEST. `CSRSceneMStageMap::ShowReward` (0xe9413c) draws exactly three (`:2539-2572`, `:3207-3231`) - there is no data-driven count - so this array has three entries per published area and `achieve_reward[i].achieve_cnt` MUST equal `GetStageCnt(area) * (i+1)`. AN EMPTY ARRAY IS THE 'CANNOT RECEIVE THE REWARD' BUG: `CSRSyncMStage::ReqRewardCB` (0xb3c674) answers a claim by matching `ret_data.achieve_cnt` against this catalog (`:531`/`:566`) and only a match calls `SetAchieveRewardReceived` (`:570`), so with nothing to match `cb(-1, 0)` fires, `AchieveRewardCB` toasts and returns, and the chest never flips to its `opened` sprite. This array was `[]` in this replica until 2026-10-03. [RECOVERED notes are ambiguous on the nesting] AGENTS.md §11 lists achieve_reward[] at the `ret_data` level with an `area_id` field; analysis/research/chest-rewards.md §Q2 lists it as a PER-AREA member of `SetArea`. Both are published, for the same reason `stage[]` is: an extra key the parser ignores is inert, a missing key is not." },
        } },
        MonsterReference: { type: "object", required: ["_server", "id", "title", "attr", "role", "res_prefix", "rank", "level", "hp", "atk", "def", "skill_list"], additionalProperties: true, properties: {
          _server: { type: "string", minLength: 1, example: "M001", description: "[RECOVERED, inferred] the key AddMonster builds m_mMonsters on. Its literal 0x01d676bb is the FIRST thing AddMonster (0xa0b540) reads, and AddMonster takes no id argument, so this string - not the published object key - is what CSRGameMob::GetMonsterData looks up. Must be non-empty and must equal the ids published in the show_thumbnail array of /reference/GetTargetStageMonster." },
          id: { type: "string", example: "M001" }, ref_id: { type: "string", example: "M001" },
          title: { type: "string" }, attr: { type: "integer" }, role: { type: "integer" }, res_prefix: { type: "string", example: "M001" },
          rank: { type: "integer" }, level: { type: "integer" }, overcome: { type: "integer" },
          hp: { type: "string", example: "100" }, atk: { type: "string", example: "10" }, def: { type: "string", example: "5" },
          crt_chance: { type: "string" }, crt_dmg: { type: "string" }, penetration: { type: "string" }, block_chance: { type: "string" }, block_dec_dmg: { type: "string" },
          attr_enhance: { type: "string" }, attr_resist: { type: "string" }, hp_page: { type: "string" }, skill_start_time: { type: "integer" },
          skill_list: { type: "array", items: { $ref: "#/components/schemas/OpaqueObject" } }, battle_skill_effect: { type: "array", items: { $ref: "#/components/schemas/OpaqueObject" } },
        } },
        StageMonster: { type: "object", required: ["wave_list", "show_thumbnail"], properties: {
          wave_list: { type: "array", minItems: 1, items: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/StageMonsterWave" } }, description: "[RECOVERED] THE WAVE ARRAY, and it is TWO DEEP. `wave_list` is the only wave-array key AddStageMonster (0xa0d194) reads (literal 0x01d76bd5; the OUTER dereference at 0xa0d266 is what the INNER loop at 0xa0d2d8 iterates, and one vector<STAGE_MONSTER> is pushed per outer element at 0xa0d480). Each outer element is one WAVE and each inner element is one MONSTER RECORD. MUST BE NON-EMPTY at both levels: an empty outer array makes MakeStageInst skip the writer at 0xb34b28 and fault at 0xb3507a; an empty wave pushes no ACTOR_INFO. A FLAT array is fatal - the inner loop would walk the monster object's own members and call operator[] on a scalar at 0xa0d304, which throws type_error.305. Control leg: BLUSTONE_WAVE_SHAPE=flat." },
          _id: { type: "array", minItems: 1, items: { type: "array", minItems: 1, items: { $ref: "#/components/schemas/StageMonsterWave" } }, description: "Inert alias of `wave_list`. `_id` exists in .rodata tail-merged four bytes earlier (0x1d76bd1) and tools/resolve-literals-offline.py reports it, but that is a pairing artefact: the load at 0xa0d1b0 is consumed only by add r1,pc at 0xa0d1b8 (yielding `wave_list`), and the body has exactly five basic_json::operator[] call sites (0xa0d1ce, 0xa0d304, 0xa0d34a, 0xa0d398, 0xa0d512) with no `_id` among them. Published as an alias so the unused key cannot drift." },
          show_thumbnail: { type: "array", minItems: 1, items: { type: "string", minLength: 1 }, description: "[RECOVERED] array of monster-id strings, read at RECORD level after the wave loop (operator[] at 0xa0d512, reached only from the outer loop's exit at 0xa0d260) with from_json<std::string> per element (0xa0d5ac). The resulting vector is STAGE_MONSTER_LINK::ids, which FUN_00b4a7a8 walks to build GET /reference/GetMonster's `list` - it is ONE of the two sources of that list; the other is every wave record's `ref_id`. Every element must resolve against /reference/GetMonster's published `_server` values. A non-array value yields an EMPTY ids vector (the type-tag switch only opens an iteration window for array and object tags). Control leg: BLUSTONE_SHOW_THUMBNAIL=scalar." },
          ref_id: { type: "string", minLength: 1, example: "M001", description: "[RECOVERED] INERT at record level: all four wave-keyed operator[] sites in AddStageMonster target the INNER dereference at 0xa0d2e8, so nothing reads this one. It mirrors the first wave record's ref_id so the response cannot be self-contradictory; asserted equal in tests/smoke.ts." },
        } },
        StageMonsterWave: { type: "object", required: ["ref_id", "group", "next_spawn_ms"], properties: {
          ref_id: { type: "string", minLength: 1, example: "M001", description: "[RECOVERED] read by operator[] at 0xa0d304 and converted with from_json<std::string> (bl 0x00728b08 at 0xa0d310), which THROWS type_error.302 on any other JSON type. Non-empty string: it becomes the 12-byte ref_id of the 20-byte STAGE_MONSTER (stride 0x14 at 0xa0d410). [RECOVERED] IT MUST NAME A MONSTER, NOT A CARD. FUN_00b4a7a8 (0xb4a7a8) builds GET /reference/GetMonster's `list` in two loops that share one list head (sp+0x24): over STAGE_MONSTER_LINK::ids at stride 0x0c, and over the wave vector at inner stride 0x14 - which lands exactly on this string (00b4a870 HasMonsterData, 00b4a886 string copy). `list` is therefore `ids` UNION {every wave ref_id}, and CSRGameMob::GetMonsterData (0xa0b43c) resolves it with std::map<string,INFO>::find on `_server`, asserting at SRGameMob.cpp(38) when it is not published by /reference/GetMonster. Shipping the card id produced the measured list=[\"M001\",\"001\"] and that assertion (analysis/testing/report-014.md). [FIXTURE] the value M001, from FIXTURE_WAVE_REF_ID = FIXTURE_MONSTER_IDS[0]. [UNRESOLVED] this same string also reaches CSRCard::SetRefID, which wants a CARD id; that conflict is scoped, not solved (AGENTS.md section 11), and the player-camp SRCard.cpp(731) assertions are a separate defect. Control leg: BLUSTONE_WAVE_REF_ID=card." },
          group: { type: "integer", example: 1, description: "[RECOVERED] read by a total tbb switch at 0xa0d34e (subs r1,#0x3 ; cmp r1,#0x4 ; bhi -> movs r0,#0) which accepts number, numeric string and bool and returns 0 for every other tag. Cannot throw." },
          next_spawn_ms: { type: "integer", minimum: 0, description: "[RECOVERED] read by the same total switch at 0xa0d39c, then scaled by the float constant loaded from slot 0x00a0d4f8 at 0xa0d3ec (vmul.f32). Cannot throw." },
          _id: { type: "string", example: "N002_M001", description: "[FIXTURE] per-monster identifier. Not read by AddStageMonster; carried so no reader can mistake its absence for a removal." },
          show_thumbnail: { type: "array", items: { type: "string", minLength: 1 }, description: "[RECOVERED] INERT on a monster record: AddStageMonster reads show_thumbnail at RECORD level only (0xa0d512), never per monster. Carried because AddStageMonster is the only reader of this record." },
        } },
        LevelTables: { type: "object", required: ["user", "vip", "vip_group", "card", "skill", "card_awk"], properties: {
          user: { type: "array", items: { type: "object", required: ["min_exp"], properties: { min_exp: { type: "integer" } } } },
          vip: { type: "array", items: { type: "object", required: ["min_exp", "title", "benefit"], properties: {
            min_exp: { type: "integer" }, title: { type: "string" }, benefit: { type: "array", items: { type: "object", additionalProperties: true }, description: "Empty means no paid bonuses. Native fields include benefit_id, title, desc, type, param." },
          } } },
          card: { type: "array", items: { type: "object", required: ["rank", "level", "min_exp", "upgrade_exp", "sell_price"], properties: Object.fromEntries(["rank", "level", "min_exp", "upgrade_exp", "sell_price"].map((field) => [field, { type: "integer" }])) } },
          vip_group: { type: "array", items: { type: "object", additionalProperties: true } },
          skill: { type: "array", items: { type: "object", additionalProperties: true } },
          card_awk: { type: "array", items: { type: "object", additionalProperties: true } },
        } },
        CardBookOwned: { type: "object", required: ["ref_id", "rank"], properties: {
          ref_id: { type: "string", example: "001" }, rank: { type: "integer", example: 1 },
        } },
        CardBookBonus: { type: "object", required: ["card_role", "target_cnt", "effect"], properties: {
          card_role: { type: "integer", description: "Native CHAR_ROLE key. Provisional local coverage is 0..4." },
          target_cnt: { type: "integer", description: "Collection-count threshold used by the native lower-bound lookup." },
          effect: { type: "string", description: "Serialized JSON object, decoded again by the native parser. Fields: atk, def, hp, crt_chance, crt_dmg.", example: '{"atk":0,"def":0,"hp":0,"crt_chance":0,"crt_dmg":0}' },
        } },
        EpisodeProgress: {
          type: "object", required: ["read_log", "reward_log"],
          properties: Object.fromEntries(["read_log", "reward_log"].map((key) => [key, {
            type: "array", description: key === "read_log" ? "Episode IDs already read." : "Episode IDs with rewards already claimed.",
            items: { type: "object", required: ["id"], properties: { id: { type: "string" } } },
          }])),
        },
        SessionBootstrap: {
          type: "object", required: ["user", "battle", "tuto"], additionalProperties: true,
          properties: {
            user: { type: "object", additionalProperties: true, properties: {
              leader_inst_id: { type: "integer", example: 1, description: "Owned card instance selected as leader; not a reference ID." },
              ap: { type: "integer", example: 50, description: "Provisional action-point balance." },
              bp: { type: "integer", example: 10, description: "Provisional battle-point balance." },
              gold: { type: "integer", example: 10000, description: "Provisional soft currency; no spending persistence yet." },
              is_newbiew: { type: "integer", enum: [0, 1], description: "Literal native field spelling; 0 for this returning-player fixture." },
            } },
            battle: { type: "object", additionalProperties: true, description: "Provisional league_level, rating_point, rank and league_win." },
            tuto: { type: "array", items: { type: "object", required: ["type", "step", "is_cleared"], properties: {
              type: { type: "integer", example: 0 }, step: { type: "integer", example: 5 },
              is_cleared: { type: "integer", enum: [0, 1], description: "1 maps to native tutorial state 3; 0 maps to state 0." },
            } } },
          },
        },
        StageReference: {
          type: "object", additionalProperties: true,
          description: "Partial native-parser reconstruction; no production stage records recovered. Other observed keys include ap_cost, gold, character_exp, group_exp, enemy_atk_per, enemy_hp_per, power, title, desc, thumb, story_id, begin_dialog_id, end_dialog_id and achieve_condition. Types and relationships beyond the fields below remain to be validated.",
          properties: { id: { type: "string", description: "Compatibility/debug stage identifier; must equal stage_id." }, stage_id: { type: "string", description: "Native CSRGameStage lookup key and the identifier sent to mission-start APIs." }, res_prefix: { type: "string", example: "99", description: "[RECOVERED] THE ENVIRONMENT SELECTOR, not an art name. CSRGameBase::InitBackground (0x9cbe8c) reads this field (stage+0x70) and hands it to OnInitBackground (0x9cbf34), which uses it as a std::map<string,CSRStaticData::ENV_INFO> key against CSRStaticData+0x150 - populated by CSRStaticData::LoadEnv (0xf3bab0) from environments.csv. The lookup does NOT test end(), so an unresolvable value reads the tree end-node, ENV_INFO.PreFix formats as \"\" and every scrolling background layer name becomes prefixless, leaving CSRGameScrollBGDraw::Load with no attached children and faulting CSRGameScrollBGDraw::OnUpdate at ELF 0x9aebd7. Valid values are the #ID column of analysis/recovered-data/environments.csv: 0-19, 99, 100, 200, 502-537, 801, 900-907, 998. The asset namespace is different (the row's PreFix is STI000/STI099/STI900, the ST*.jet family with an I inserted), so an ST001-shaped value is never valid here. [FIXTURE] this replica publishes \"99\"." }, achieve_condition: { type: "string", example: "[]", description: "JSON-encoded array of achievement-condition records, NOT an embedded array." }, item: { type: "array", items: { type: "string" } } },
        },
        StageCatalog: {
          type: "object", required: ["stage"], additionalProperties: false,
          description: "The native CSRGameStage::SetStage response wrapper. The stage array is required; returning a bare array leaves the local stage table empty and prevents mission start.",
          properties: { stage: { type: "array", items: { $ref: "#/components/schemas/StageReference" } } },
        },
        BlockedUser: {
          type: "object", required: ["target_pvid", "target_nickname"],
          properties: { target_pvid: { type: "integer", minimum: 1, maximum: 9007199254740991, description: "Blocked account identifier; replica accepts positive safe integers." }, target_nickname: { type: "string", description: "Display name resolved from the established local account." } },
        },
        CardInstance: {
          type: "object", required: ["inst_id", "ref_id", "rank"], additionalProperties: true,
          description: "Partial recovered instance schema. Additional equipment, skill, awakening and skin fields are supplied by the provisional fixture in src/bootstrap.ts; their full semantics remain under reconstruction.",
          properties: {
            inst_id: { type: "integer", description: "Owned instance identifier; used by decks and leader selection." },
            ref_id: { type: "string", description: "Exact base.id of a loaded CardReference; never empty." },
            rank: { type: "integer", description: "Must have a corresponding reference stat row." },
            exp: { type: "integer", description: "Accumulated experience; level tables still need reconstruction." },
          },
        },
        CardReference: {
          type: "object", required: ["base", "stat", "equipment", "skill", "dialog"],
          properties: {
            base: { type: "object", required: ["id", "char_id", "res_prefix"], additionalProperties: true,
              properties: { id: { type: "string" }, char_id: { type: "string" }, res_prefix: { type: "string", description: "Client asset prefix; provisional fixture value not yet validated in-game." } } },
            stat: { type: "array", items: { type: "object", additionalProperties: true,
              description: "Rank-specific stats. Native floating_point parser expects hp/atk/def/spd and related numeric stats encoded as strings, not JSON numbers.",
              properties: { rank: { type: "integer" }, hp: { type: "string", example: "1000" }, atk: { type: "string", example: "100" }, def: { type: "string", example: "50" } } } },
            equipment: { type: "array", items: { type: "object", additionalProperties: true } },
            skill: { type: "array", items: { type: "object", additionalProperties: true } },
            dialog: { type: "array", items: { type: "object", additionalProperties: true } },
          },
        },
        GachaPullAward: {
          type: "object", additionalProperties: true,
          required: ["inst_id", "ref_id", "index_id", "is_duplicate", "reward"],
          description: "[RECOVERED] One `ret_data.card[]` element. The first block is the "
            + "`CSRCard::parse` instance column set (Ghidra 0x8680a4) - byte-identical to a "
            + "`/lobby/GetCardInven` row, because `CSRPlayData::ParseCardInst` (0xb69598) is the same "
            + "parser both routes feed. The second block is the six keys "
            + "`CSRPopUpGachaX10Result::RESULT::parse` (0xcd36a8) reads WITHOUT a null guard, so every "
            + "one is mandatory; omitting any of them walks a JSON null and throws `type_error.305`. "
            + "[FIXTURE] `rank`/`exp`/gear levels and `is_duplicate`.",
          properties: {
            inst_id: { type: "integer", minimum: 1, description: "[RECOVERED] Number. Read with strtod, then used by `CSRInventory::FindCardInstBySerial` - so it must be a serial the client actually holds, which it does because the sync callback has just added this same element." },
            ref_id: { type: "string", minLength: 1, description: "[RECOVERED] The card id. Must be non-empty (`CSRCard::SetRefID` asserts `sRefID.length() > 0`, SRCard.cpp:731) and must resolve in `/reference/GetCard`." },
            rank: { type: "integer", description: "[FIXTURE] 1." },
            index_id: { type: "integer", minimum: 0, description: "[RECOVERED] Number (strtod at 0xcd36d2). Position of this draw in the result grid." },
            is_duplicate: { type: "integer", enum: [0, 1], description: "[RECOVERED] Number (strtod at 0xcd3724). [LOCAL POLICY] 1 if that reference was previously acquired, including earlier draws in this request; collection history survives consumption." },
            reward: { type: "object", required: ["ref_id", "qty"],
              description: "[RECOVERED] Object. `ref_id` is read with `from_json<std::string>` (0x718b08) so it MUST be a JSON string, not a number.",
              properties: {
                ref_id: { type: "string", minLength: 1 },
                qty: { type: "integer", minimum: 1 },
              } },
          },
        },
        GachaPremiumResponse: {
          type: "object", additionalProperties: true,
          required: ["cnt", "card", "user"],
          description: "[RECOVERED] `ret_data` of `POST /shop/GachaPremium`. "
            + "`achievement`, `consumed_inst_list`, `point`, `mileage_action`, `before_point` and "
            + "`after_point` are deliberately ABSENT, not empty: every one of them is reached only after "
            + "an explicit null test in `CSRSyncLottery::ReqGachaPremiumCB` (0xf74fb0), so an omitted key "
            + "is the smallest safe form and an empty `[]` is not.",
          properties: {
            cnt: { type: "integer", minimum: 0, description: "[RECOVERED] Number of awards. MUST be a JSON number: the read is `ldrb; subs #3; cmp #4; bhi <reject>` and only value tags 3..7 reach `strtod`. 0 means the pull was refused for currency." },
            card: { oneOf: [{ $ref: "#/components/schemas/GachaPullAward" },
              { type: "array", items: { $ref: "#/components/schemas/GachaPullAward" } },
              { type: "object", nullable: true, enum: [null] }],
              description: "[RECOVERED] cnt1 requires ONE OBJECT: native parses whole card, not array[0]. cnt>1 requires an array. cnt0 uses null to skip the cnt<=1 parser. Sending an array for single/zero results parses an empty ref_id and crashes IsTrainingCard despite a valid reference map. Callback always receives a vector assembled by the requester." },
            user: { type: "object", additionalProperties: true,
              description: "[RECOVERED] Optional; the whole block is null-guarded at 0xf750c0. Published only so the currency readout moves after a pull.",
              properties: {
                iap_qty: { type: "integer", minimum: 0, description: "[RECOVERED] Number (strtod, 0xf750c6) -> `CPVDataMgr+0x9c`." },
                free_iap_qty: { type: "integer", minimum: 0, description: "[RECOVERED] Number (strtod, 0xf75112) -> `CPVDataMgr+0xa0`." },
                gold: { type: "object", properties: { cur: { type: "integer", minimum: 0, description: "[RECOVERED] Number (strtod) -> `CSRPlayData+0x154`." } } },
              } },
            error_code: { type: "string", description: "[FIXTURE] Local-only breadcrumb (`GACHA_FUND_SHORT`). NOT read by any client parser - it exists so a tester reading the wire can tell a refusal from a success. It is why a refusal still answers `result_code: 1`." },
          },
        },
        GenericRequest: {
          type: "object",
          additionalProperties: true,
          description: "Opaque request object. Exact fields are route-specific and generally not yet confirmed.",
          example: { device_id: "test-device", app_ver: "28010" },
        },
        WebViewFixtureResponse: {
          type: "object",
          required: ["result_code", "success", "ret_data", "data", "replica", "evidence_route", "request_keys"],
          properties: {
            result_code: { type: "integer", enum: [1], description: "Observed WebView handler success marker." },
            success: { type: "boolean", example: true },
            message: { type: "string", example: "accepted" },
            ret_data: { type: "object", additionalProperties: true, description: "Redacted local fixture data; no recovered scalar reward values." },
            data: { type: "object", additionalProperties: true },
            replica: { type: "boolean", enum: [true] },
            evidence_route: { type: "string" },
            request_keys: { type: "array", items: { type: "string" }, description: "Non-sensitive submitted field names only." },
          },
        },
        ResultEnvelope: {
          type: "object",
          required: ["result_code", "protocol_code", "code", "ret_data", "data"],
          properties: {
            result_code: { type: "integer", example: 1, description: "Application result code. Native ParseLauncherResp maps 1 to success; 0 is not the launcher success value." },
            protocol_code: { type: "integer", example: 0, description: "Compatibility protocol code." },
            code: { type: "integer", example: 0, description: "Generic compatibility code." },
            ret_data: { description: "Route-specific JSON payload: an object for account replies, an array for many reference/inventory replies. See each operation's narrowed schema." },
            data: { description: "Compatibility alias of ret_data; has the same JSON value and type." },
          },
        },
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: { error: { type: "string" }, path: { type: "string" } },
        },
        UrlRecord: {
          type: "object",
          required: ["url_key", "address", "param_format"],
          properties: {
            url_key: { type: "string", example: "_SR", description: "Application reference used by the native launcher; `_SR` is the recovered Blustone app code." },
            address: { type: "string", format: "uri", example: "http://127.0.0.1:8080" },
            param_format: { type: "string", example: "" },
          },
        },
        ServerRecord: {
          type: "object",
          required: ["server_id", "server_url", "state"],
          description: "Native app-server record. In the local replica, state 2 is the tested online path and state 1 reproduces the maintenance-WebView branch; the value is controlled by BLUSTONE_LAUNCHER_STATE.",
          properties: {
            server_id: { type: "integer", example: 1 },
            server_name: { type: "string", example: "Blustone Replica" },
            server_url: { type: "string", format: "uri" },
            address: { type: "string", format: "uri" },
            state: { type: "integer", example: 2, description: "Launcher/server state: 2 is the current online compatibility value; 1 is the maintenance branch used for reproduction." },
            population: { type: "integer", example: 0 },
          },
        },
        AppServerName: {
          type: "object",
          required: ["srv_id", "lang", "name", "desc"],
          description: "Native app-server display record parsed from app_srv_name_list.",
          properties: {
            srv_id: { type: "integer", example: 1 },
            lang: { type: "string", example: "en" },
            name: { type: "string", example: "Blustone Replica" },
            desc: { type: "string", example: "Blustone Replica" },
          },
        },
        BaseInfo: {
          type: "object",
          required: ["pv_url", "url_list", "app_srv_list", "state", "recommend_server"],
          description: "Launcher configuration returned both as ret_data/data and as top-level compatibility fields by the local server.",
          properties: {
            pv_url: { type: "string", format: "uri" },
            country_code: { type: "string", example: "US" },
            url_list: { type: "array", items: { $ref: "#/components/schemas/UrlRecord" } },
            auto_login: { type: "integer", example: 1, description: "Native resume path is enabled by default; set BLUSTONE_AUTO_LOGIN=0 to force the manual title/login UI." },
            client_option: { type: "object", additionalProperties: true },
            hash_tag: { type: "object", additionalProperties: true },
            app_srv_list: { type: "array", items: { $ref: "#/components/schemas/ServerRecord" } },
            app_srv_name_list: { type: "array", items: { $ref: "#/components/schemas/AppServerName" } },
            state: { type: "integer", example: 2, description: "Launcher state: 2 is the tested online path; 1 is the maintenance branch." },
            recommend_server: { type: "integer", example: 1 },
            server_url: { type: "string", format: "uri" },
            res_ver: { type: "integer", example: 0 },
            new_res_ver: { type: "integer", example: 0 },
          },
        },
        BaseInfoResponse: {
          allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { $ref: "#/components/schemas/BaseInfo" }],
        },
        Account: {
          type: "object",
           required: ["pvid", "otp", "nick_name", "nickname_confirm", "server_id", "server_url", "token", "web_token", "vs_token", "sns_list", "begin_utc"],
          properties: {
            pvid: { type: "integer", example: 1000001 },
            nickname: { type: "string", example: "Captain1000001" },
            nick_name: { type: "string", description: "Native login-parser nickname key." },
            otp: { type: "string", minLength: 1, description: "Account session token required before the client accepts server_url. Subsequent native reference/lobby forms carry this field. Different from PV-AccessToken." },
            vs_token: { type: "string", minLength: 1, description: "Persistent account credential returned by the WebView/SNS login and checked by /v2/account/Login. Guest resume may omit it." },
            sns_list: { type: "object", additionalProperties: { type: "string" }, description: "Native auto-login identity map; key 0 is the email identity when present." },
            nickname_confirm: { type: "integer", example: 1, description: "Native login parser flag; 1 means the generated local nickname is already confirmed." },
            profile_status: { type: "integer", example: 0 },
            login_day_count: { type: "integer", example: 0 },
            iap_quantity: { type: "integer", example: 0 },
            action_benefit_quantity: { type: "integer", example: 0 },
            iap_buy_cnt: { type: "integer", example: 0 },
            iap_code: { type: "string", example: "" },
            begin_utc: { type: "integer", example: 1789980000, description: "Account registration time in Unix seconds." },
            server_id: { type: "integer", example: 1 },
            server_url: { type: "string", format: "uri" },
            token: { type: "string", example: "guest-local-token" },
            web_token: { type: "string" },
            sns_id: { type: "string" },
            extra_data: { type: "object", additionalProperties: true },
          },
        },
        AccountResponse: {
          allOf: [{ $ref: "#/components/schemas/ResultEnvelope" }, { $ref: "#/components/schemas/Account" }],
        },
        HealthResponse: {
          type: "object",
          required: ["ok", "service"],
          properties: { ok: { type: "boolean" }, service: { type: "string" }, accounts: { type: "integer" }, crypto_mode: { type: "string" } },
        },
        StateSummary: {
          type: "object",
          properties: { accounts: { type: "integer" }, selected_server: { type: "integer" }, resource_version: { type: "integer" }, crypto_mode: { type: "string" } },
        },
        RouteInventory: {
          type: "object",
          required: ["count", "groups"],
          properties: { count: { type: "integer" }, groups: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } } },
        },
      },
    },
    externalDocs: {
      description: "Local reverse-engineering evidence and implementation notes",
      url: "../analysis/README.md",
    },
  };
}
