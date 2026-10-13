# Blustone TypeScript/Express server

2026-10-14 correction: historical achievement omission comments below do not
identify a daily quest refresh mechanism. ParseAchievementsElement parses
separate achievement rows; RequestDailyQuest is the separate request builder.
Mission Complete directly invokes ParseLobbyEnter on ret_data, now containing
the compatible minimum-stage and daily/linear overlays. See
quest-native-refresh-paths-2026-10-14.md and local-fixed-daily-quests-2026-10-14.md.

This is the canonical local compatibility-server scaffold. It is generated from the recovered native endpoint vocabulary and exposes a heavily documented Swagger/OpenAPI contract.

## Install and run

```powershell
cd server-ts
npm install
npm run openapi:export
npm run dev
```

Then open:

- Swagger UI: `http://127.0.0.1:8080/docs`
- OpenAPI JSON: `http://127.0.0.1:8080/openapi.json`
- OpenAPI YAML: `http://127.0.0.1:8080/openapi.yaml`

For an Android device on the same LAN, advertise the laptop address explicitly:

```powershell
$env:BLUSTONE_BIND_HOST = '0.0.0.0'
$env:BLUSTONE_BASE_URL = 'http://192.168.1.10:8080'
npm run dev
```

For the current BlueStacks 5 instrumented workflow, the host must listen on all
interfaces and the advertised URL must be `10.0.2.2`, not `127.0.0.1`:

```powershell
$env:BLUSTONE_BIND_HOST = '0.0.0.0'
$env:BLUSTONE_BASE_URL = 'http://10.0.2.2:8080'
npm run dev
```

## What the spec documents

- Recovered launcher/base-info structure: `pv_url`, `country_code`, `url_list`, `client_option`, `app_srv_list`, `app_srv_name_list`, `state`, and `recommend_server`.
- Native guest registration, email WebView login, strict pvid/email/vs_token verification, OTP issuance, auto-login resume, and observed header names.
- Implemented P-384/SHA-384 key exchange, AES-256-CBC request/response encryption, and HMAC-SHA384 response signing; native encrypted login/reference/lobby requests have reached this server.
- Required nonempty account `otp`, stable `vs_token`, native `nick_name` spelling, `sns_list`, `begin_utc`, and `server_url` initialization dependency.
- Reconstructed card/inventory/stage/block-list/episode/session shapes, with provisional values and missing functionality explicitly identified.
- `POST /shop/GachaPremium`: the recruitment pull, shaped from all three of its native parsers, awarding a real catalogue card and owning it in `/lobby/GetCardInven`.
- Every discovered game route, grouped by service family, with evidence and confidence extensions.
- Mock response envelopes and the fields that are safe to replace after live capture.

## Verification

```powershell
npm test
npm run build
```

Most of the 285 route handlers remain compatibility fixtures. BlueStacks 5 verification reaches village, Airport, campaign map, battle, native enemy defeat and `/mission/Complete`, then victory and return to the map. Native stage2 completion reported one attack, enemy HP0 and three earned condition flags; fresh lobby/map reload preserved progress and locked later areas. Training Raise and saved mixed-role formations also survive reload. See `analysis/testing/revival-002.md` through `revival-004.md`. Stage3 currently exposes an unresolved tutorial/input gate, and original balance, skill effects and many systems remain incomplete. Passing tests establishes local contracts and crypto, not production parity.

The current persistent local-game slice includes lobby entry, item/mission/gem inventory reads, neutral weather/notification responses, and deterministic `/mission/Start` → `/mission/Complete` transitions. A local expedition consumes one AP and awards provisional gold; this is a compatibility fixture, not recovered production combat or economy behavior.

AP/BP now regenerate on authenticated game-state access, including offline time
across server restarts. The existing replica intervals remain **fixtures**: one
AP per 300 seconds and one BP per 1800 seconds. Whole and partial intervals are
preserved, normal caps stop recovery, and reward overflow is retained. Old saves
without clocks begin counting at migration; they receive no invented backlog.
The wire `ap_charge_time` / `bp_charge_time` values are next recovery deadlines
in server seconds, derived from native SyncAP/SyncBP and CalcAddtionalAP/BP
(see `analysis/research/revival-systems-next.md`). Internal persisted clocks use
milliseconds and are not sent as protocol fields.
`/reference/GetExtra.server_utc` synchronizes the native clock to those
deadlines. `BLUSTONE_RESOURCE_CLOCK_MODE=legacy-zero` is a diagnostic control
for the previous zero timestamps; normal runs should leave it unset.
The BlueStacks launcher defaults both tutorial-bypass flags to `1`, matching
the established battle profile; set either to `0` for a deliberate experiment.

`/tuto/Clear` now acknowledges and persists the exact requested unsigned
`type`/`step` pair. Login and lobby emit unique tutorial rows; persisted cleared
truth takes precedence over stale false fixtures because the native parser can
overwrite a completed state. Repeated clears grant no extra rewards. Optional
reward, inventory and deck branches remain omitted pending recovered tables.
The contract and persistence are tested; this alone has not established that
the stage3 tutorial or every village guide is playable. Native type8 is GYM,
24 is GYM_FIRST_ENTER and45 is FIRST_STAGE; the old types0..7 bypass sweep does
not cover those gates. See `analysis/research/tutorial-clear-contract.md`.

Recruitment grants now persist as account-owned card instances and are included
in the bare-array `/lobby/GetCardInven` response after relaunch. Popup-only
reward metadata is excluded from stored instances; IDs remain unique across
bootstrap cards, restored grants and new pulls. This fixes lost recruitment
results, but does not establish faithful costs, balance, skills, or recruit art.
Once recruits are owned, changing `BLUSTONE_PARTY_SIZE` or disabling/changing
`BLUSTONE_GACHA_CARD` may invalidate saved IDs/references. The server refuses
such incompatible restores without overwriting ownership; restore the previous
profile rather than deleting or renumbering owned instances.

### Hunter locks and Training Raise

`/card_handler/ToggleLock` persists the native toggle request's `target_inst_id`
and returns flat numeric `inst_id`/`lock`. `/gym/LevelUp` accepts
`target_inst_id` and `source_inst_list` (JSON array text), consumes unlocked
owned sources and updates target XP/gold in one saved mutation. Leader, deck,
active-battle participants, duplicate/self sources, missing ownership, level
caps and insufficient gold are checked before consumption.

Starter instances are now account snapshots, so a consumed starter is not
recreated at boot. Lobby and pre-battle profile XP agrees with inventory.
Ordinary character rows now cover ranks1..5, levels1..30. Historical community
evidence supports character cap30 regardless of grade; final-build and awake
caps remain unverified. The local curve is100XP per level and source XP100*level;
100 gold/source is a fixture. Existing rank1 thresholds0/100 and source yields
100/200 are preserved, so current owned XP100 still resolves to level2.
Original XP, stats and prices remain unknown. See `analysis/research/hunter-level-caps.md`.
Native refusal callbacks skip mutation parsing; local code2001 is a provisional
refusal mapping. Tests prove persistence/atomicity, not original balance.

Card-info rendering requires reference skill slots1..5, including locked
slots. The replica now supplies parser-compatible neutral display rows;
names/costs/cooldowns are fixtures and `effect:[]` deliberately carries no
invented combat effects. This corrects a concrete missing-map dependency;
native visual validation is recorded in `analysis/testing/revival-002.md`.
The earlier optional constant-formula effect control has been retired:
live ApplyBuff uses a separately stored scalar, not `value_calc` alone.
Its zero coefficients therefore never established a working damage effect.
Stage3's real victory used basic attacks, without activating that control.
`BLUSTONE_ACTIVE_SKILLS=fixture` now opts into active slot1 for the four
published hunters: Lantern direct damage (cost4), Mowgli bleeding (cost3),
Nene direct damage (cost3), and Tyltyl frontline healing from DEF (cost4).
Default `neutral` retains empty effects. The nested effect fields, runtime
coefficient path and units follow native evidence; magnitudes and growth are
local fixtures. Bleeding uses an immediate application plus four nominal
one-second ticks. Missing original penetration, follow-up/passive effects,
original bindings and cinematics remain unreconstructed. The opt-in profile
now assigns genuine Q-pack AT icons C00x_SI1..5 to matching slots; this is a
reconstructed binding, not captured original JSON. Tests check schema and nonzero
runtime coefficients; native activation, targeting and Rage spending still
need live validation. See `analysis/research/starter-skill-combat-mechanics.md`
and `analysis/research/active-skill-gesture-rage.md`. Restart only at a safe
point to change this profile; never treat the display formula as runtime damage.
See `analysis/research/tutorial-open-input-conditions.md` and
`analysis/research/starter-active-skills.md` for recovered versus missing fields.
`BLUSTONE_ACTIVE_SKILLS=episode-followups` retains that fixture slot1 and adds
selected original Episode type2 effects: Lantern STAT49/CB0003_C001,
Nene STAT47/CB0003_C003, Tyltyl STAT18/EVCB0201_004. Their raw coefficients,
selectors and durations are original encounter data. Applying these variants
to ordinary hunters, serial1 and zero growth are local policy; final ordinary
balance is unknown. Mowgli has no matching original row and gains no follow-up.
All five slots remain present; types3..5 remain empty. The native rank2 gate
still applies, and an existing skill2 level0 retains base effects when admitted.
This profile does not grant levels/ranks or change saves. Type2 joins the active
skill's result list under one cost; native targeting, expiry and debit must be
validated separately from schema tests. See `starter-original-skill-coverage.md`
and `skill-followup-construction-contract.md` in `analysis/research/`.
Native Nene activation rendered Stun/stars on a bear with this profile and saved
skill2 level0. Exact counter/duration/debit remain separately unmeasured; rank1
Lantern/Tyltyl follow-ups have not been exercised. Evidence:
`analysis/testing/episode-followups-001/report.md`.
`BLUSTONE_ACTIVE_SKILLS=episode-actives` additionally adopts the complete
type1 metadata/effect vectors from those same three Episode rows: Lantern's
damage plus stat16 effect, Nene's damage, and Tyltyl's DEF-based healing.
Original cooldown5000ms and critical metadata100/100/50 are retained. These
are encounter-derived ordinary policy with zero growth, not recovered final
ordinary balance. Mowgli keeps its existing fixture; types3..5 remain empty.
Native damage first uses the actual actor attack and target defense; a wire
coefficient must not be treated as flat HP loss. Critical metadata alone does
not establish an admitted type4 effect or a guaranteed critical hit. Earlier
profiles remain available with unchanged behavior.
`BLUSTONE_ACTIVE_SKILLS=episode-complete` extends that same selected-source
adapter to every present slot: Lantern3/4/5, Nene4 and Tyltyl4/5. Full effect
vectors and Nene's1000ms periodic interval are retained; absent source slots
remain empty. Rank metadata and saved zero/nonzero skill levels are preserved.
This is opt-in encounter-derived ordinary policy, with source-pinned publication
and save-preservation tests; native activation of these added ordinary slots is
unverified. Current earned party ranks admit none of them. The live profile is
now episode-complete; normal Village and Episode6 entry passed after reload.
Live HTTP publication and bounded native main-effect prefix reads are verified.
The parser converts Nene's periodic positive-HP row to kind3/stat31; Tyltyl's
kind5/stat19 remains unchanged in the observed reference. Nested/secondary
payloads and added-slot combat activation remain pending. See
`analysis/testing/ordinary-skill-reference-001/report.md`.
Tyltyl's kind5/stat19 downstream admission, global debuff-immunity counter and
inverse removal sign are source-verified; the loaded raw integer is10. Actual
trigger, recipient application, purge and expiry remain unmeasured. See
`analysis/research/type5-stat19-admission-contract.md`.
The corrected `type`1..5 rows open the previously crashing hunter panel. Native
Raise consumed disposable instance3, retained original instances1/2, charged100
gold and produced final LV2/Strength57. The result popup's273 reading disagreed
with preview/final57 and remains unresolved; native ToggleLock UI is untested.

`/gym/SkillUp` now persists one selected skill level and its gold charge, with
the callback's direct `target_inst.skill_N_level:{prev,cur}` shape. Ownership,
slot/type, unlock rank, role/rank cap and affordability are validated before
mutation. Locked inventory cards may improve skills. GetLevel supplies dense
role1..4 level1..50 rows; the cap schedule10/20/30/40/50 is inferred from
community10-per-grade evidence, not original captured rows. Prices100*current
level and zero material costs are explicit fixtures; native zero-material
popup and consumption guards are recovered. Native popup validation is pending.
Each accepted request increments1. There is no recovered nonce/expected level,
so a lost response and identical retry can cause another upgrade; no transport
exactly-once guarantee is claimed. `/gym/MultiSkillUp` accepts the original
`mulit_skill_up_count` typo as five numeric counts, validates the entire batch
and sums intermediate prices before changing anything. Its direct target
fields carry `cur` only; unselected slots are omitted. Native batch-caller
validation remains pending, and original skills/economy remain incomplete. Evidence:
`analysis/research/skill-up-contract.md` and `skill-level-reference.md`.

### Party save and character types

Native Build Team saves `/world/SetDeck` with JSON-text `deck_info` rows of
`{type,list}`. Its mission UI sends four ordered IDs; lobby `ParseDeckSetting`
reads five named slot fields. The replica pads input to five, persists
account-owned formations, projects actual IDs/reference/progression into
profiles, and protects saved cases1/2/4/5 from training consumption. Invalid
batches cannot partially replace a party. Existing saved formations survive
restart. New accounts default to Mowgli first and captain support next; old
saves missing decks migrate without recreating consumed cards. Explicitly
saved Bomber-only formations are preserved, but combat for those is unverified.

Lantern is now native role3 Bomber/attr1 Fire; Mowgli role1 Offense/attr3
Lightning. Numeric enum values are native-recovered; catalogue character
metadata is partly community sourced, and numeric stats remain fixtures.
The additive roster also publishes003 Nene (Ice/Defense) and004 Tyltyl
(Fire/Support), with ordinary stat coverage for grades1..5. Higher-grade bases
reuse local numbers and let native rank arithmetic scale them. Existing owned
grades/XP/IDs are unchanged. New grants use community birth grades002=2,003=3,
004=1; initial unlocked skill levels follow the explicit local slot-rank
convention. Actual active effects and CUT bindings are still incomplete.
The launcher now serves the four C001..C004 families (30packs,22.29MiB), plus
eight stage assets, at resource stamp1634662; explicit art-glob overrides remain
available. No APK rebuild is involved.
`analysis/testing/revival-003.md` verifies native save/reload, Mowgli fighting
on the ground and Lantern aboard the ship, then enemy disappearance, falling
coins and victory without exit-door input. Enemy defeat is strong inference;
the exact death frame was not sampled. Active skill effects remain incomplete.

### `/mission/Complete` (shaped from the recovered parser)

The response body is shaped from `CSRSyncMStage::ReqCompleteCB` (**0xb426ac**), decompiled in `analysis/native-mission-complete.txt:1013-2851` and independently re-derived offline from the library with `tools/resolve-literals-offline.py --function b426ac:b43e60` (50/50 keys match). `tests/mission-complete.ts` pins the contract.

`[RECOVERED]`

- `result_code` must be `1` for **every** outcome, **including a defeat**. `CSRMStage::OnFinish` (0xb35ce4) has a dedicated lose branch (lambda `$_5`) that calls the same `RequestComplete`, and `ReqCompleteCB` L1133-1151 silently retries any non-1 code up to eight times and then discards the response unparsed. A loss is expressed in the payload — `achieve: []`, `user.gold.prev == user.gold.cur` — never in the code.
- `stage_id` must be a **string**: it is converted by an *unguarded* `from_json<string_t>` (L1332-1338).
- `achieve` is an **array of `{order:int}`** (L1808-1897). Each entry becomes `CSRPlayData::SetStageAchieve(stage_id, order)` — the only stage-progression write in the callback. There is no `SetStageID` here; the current-stage pointer comes from `/lobby/GetMissionInst`. The native `star` / `prev_star` / `is_first_clear` are client-derived from `GetStageAchieveCnt` and are deliberately **not** sent.
- `user.{gold,exp,ap,bp,max_ap}` are `{prev,cur}` pairs (`prev` = before this completion, `cur` = what the client stores), plus `ap_charge_time` / `bp_charge_time` for `SyncAP` / `SyncBP`. `max_ap` and `level` are also published at the top level, because the decompile reads them off a different register than the other `user.*` keys and this module’s register allocation is known-unreliable.
- `card` is an **object keyed by the decimal card serial** (`to_string(uint64)`, L1921), `item` is an **array** of `{inst_id, added, ref_id}`, `consumed_inst_list` is read unconditionally and `[]` is its safe no-op.
- `detect` and `achievement` are **omitted**, and the omission is load-bearing. Their guards are **is-null tests, not emptiness tests** — the byte read is `basic_json::value_t` (`cVar1 == '\x02'` = array, `'\x01'` = object, `'\0'` = null, L1813-1833). So a present `detect` (even `{}`) skips the `user.ap`/`user.bp` resync, and a present `achievement` (even `[]`) calls `CSRAchieve::ParseAchievementsElement` (0x8481c4), which is an independent achievement collection parser (2026-10-14 correction: RequestDailyQuest at G848410 is the separate request builder), from inside a response callback. `scenario` is omitted for the same class of reason: a present string takes the `AddScenario` branch and sets the result flag the result screen reads as "show a cutscene".
- The request is the recovered 8-field form POST; `play_info` is a JSON **string** of `CSRGameBase::MISSIONPLAY_INFO`, and its `clear` member is the client’s own win byte (`CSRMStage::OnFinish` stores `param_1`, which `ProcessFinish` sets to `left.remain != 0`). It is the replica’s only combat telemetry.

`[FIXTURE]`

- First-clear economy remains10 gold/30XP once. Completion flags use recovered indices0..2. Default on-screen conditions are evaluated as completion, clear_time<60, and dead_cnt<=1; this evaluation is local policy. Native sends metrics; missing hand-made metrics retain legacy all-stars fixture behavior. Replays may earn missing conditions without repaying gold/XP. Sparse flag identity persists across reload.
- Native stores exactly three flags. Historical orders1..3 included an out-of-bounds write; legal bounds are0..2, now pinned by parser and getter.
- `level` is published as a fixed equal `prev`/`cur` pair so the level-up result flag is never set; the replica has no user-level model.

Lobby stage rows use `achieve` as **JSON text** (`"[]"` for zero,
`"[{\"order\":0},{\"order\":2}]"` for completion/straggler conditions).
Numbers are unsafe semantically: numeric0 becomes a parsed singleton and grants
flag0, creating the old spurious one-star floor. Native ParseMissionInfo reads
the string then parses its embedded array. `BLUSTONE_SEED_STAGE_STARS` now
defaults0; nonzero diagnostic seeds are opt-in compatibility credit. Existing
count credit is preserved; legacy completed-only stages retain completion flag
without inventing performance conditions. Old chest payouts are not clawed back.
- `accepted`, `clear`, `result`, `win`, `stars`, `reward`, `mission`, `gold`, `ap`, `exp` are inert local diagnostics. `ReqCompleteCB` reads none of them.

### `/shop/GachaPremium` (the recruitment pull)

Before 2026-10-03 this route had no handler and fell through to the generic mock, so the *Recruit Hunters* screen — reachable for free from the defeat screen's **"Recruit New Hunter"** button — issued the request and then granted nothing (`analysis/research/in-game-stats.md` §5.3: a 398-byte response, gems unchanged, no card). The whole derivation, with the disassembly, is in **`analysis/research/gacha-premium-contract.md`**. `tests/smoke.ts` pins it.

`[RECOVERED]`

- The request is the 9-key form POST `app_code, app_ver, bonus_level, cnt, gacha_type, item_inst_id, market, otp, pvid`, with `cnt: "11"` for the 10+1 button. `CSRSyncLottery::RequestGachaPremium` (**0xf74774**, `analysis/native-network-decomp.txt:8544`) builds it and asserts `gacha_type ∈ {1, 11}` (`_RMAssert(..., 0xb3)`).
- **`ret_data` is an object** and `ret_data.card` is an **array** (an object is also iterated). `CSRSyncLottery::ReqGachaPremiumCB` (**0xf74fb0**) reads `ret_data["card"]` at `0xf75204`, runs `CSRPlayData::ParseCardInst` (0xb69598 → `CSRCard::parse`, 0x8680a4) and `CSRInventory::AddCard` (0xad9238) on each element, then hands the *same* json to the app callback as the `vector<basic_json>` in its recovered mangled signature. **The missing key was the whole bug**: the callback branched to `0xf654e0` before building that vector, so `CSRPopUpGachaX10Result::ReqGachaPremiumCB` (0xcd7518) opened empty.
- `cnt` **must be a JSON number.** The read is `ldrb r1,[r0]; subs r1,#3; cmp r1,#4; bhi <reject>` and only value tags 3..7 reach `strtod`, so an object, an array or `null` takes the reject branch.
- Each `card[]` element is the `CSRCard::parse` instance column set — byte-identical to a `/lobby/GetCardInven` row, because it is the same parser — **plus** six keys that `CSRPopUpGachaX10Result::RESULT::parse` (**0xcd36a8**) reads with **no null guard**: `index_id`, `is_duplicate`, `inst_id` (all `strtod`), `reward.ref_id` (`from_json<std::string>`, so a **string**) and `reward.qty` (`strtod`). A missing one walks a JSON `null` and throws `type_error.305`.
- The popup resolves the award through `FindCardInstBySerial(inst_id)` → `GetCardRefID` → `GetCardData(ref_id)`, so the card id must be published by `/reference/GetCard` or nothing is drawn — the same shape of bug as the `ST001` backdrop gap.
- `ret_data.user.{iap_qty, free_iap_qty, gold.cur}` are optional (the whole block is null-guarded) and are published so the currency readout moves after a pull.
- **`achievement`, `consumed_inst_list`, `point`, `mileage_action`, `before_point` and `after_point` are omitted, not emptied.** Every one is reached only after an explicit null test, so an absent key is the smallest safe form — and `achievement` additionally inherits the `/mission/Complete` rule that a present-but-empty `achievement` is worse than none, because it calls `CSRAchieve::ParseAchievementsElement` from inside a response callback.
- `result_code` is **1 on every path**, refusals included. A non-1 code puts `CPVHTTPManager::Enqueue` into the 8× silent retry, so "not enough currency" is expressed as `cnt: 0` + `card: []` plus a non-client `error_code`.

`[FIXTURE]`

- **What is awarded.** Original roll weights are missing, so pulls remain deterministic. `BLUSTONE_RECRUIT_CARD=003` selects published Nene, `004` Tyltyl; default is the established Mowgli002. This selector changes new grants without removing old002 references or replacing starter snapshots. `BLUSTONE_GACHA_CARD` remains the legacy bootstrap-profile control; changing it can invalidate saved ownership, so use the recruit selector for roster experiments. `BLUSTONE_GACHA_CARD=0` disables grants. Unknown recruit selectors return no cards and spend no currency. Duplicate flags follow collection history, including earlier draws in the same request.

`/lobby/GetCardBook` now publishes account-scoped historical `{ref_id,rank}`
rows, keeping maximum acquired grade even after training consumes every owned
instance of a reference. Old saves migrate from known currently owned cards;
unrecorded past discoveries are not invented. Grants and history persist
together. This fixes the old001-only projection; original collection rewards
remain neutral fixtures.

Reference diagnostics: `BLUSTONE_DUMP_CARD_REFERENCE=1` logs only the encrypted
GetCard response's plaintext definition data. `BLUSTONE_DIAGNOSTIC_LOBBY_HOLD_MS`
delays GetCardInven/GetCardBook by at most60seconds for a bounded debugger
snapshot before ownership reaches a missing reference; it does not filter or
alter saved cards. Leave it unset for normal play. `InspectNativeInput 8701
--cards` reads the guarded native reference tree without native calls/writes.
Measure after confirmed native GetCard dispatch, not merely seconds after
launch; an empty pre-reference map says nothing about successful parsing.

Recruit result shape is count-dependent: `cnt:1` carries one `card` OBJECT,
`cnt>1` an array, and `cnt:0` uses `card:null`. The native single branch passes
the whole value to Card.parse; an array produces an empty reference and a null
bundle crash. This was reproduced by Nene's single recruit despite a valid
four-card reference map. The persisted award is retained; no repurchase/reset
is needed to recover it. See `analysis/research/gacha-single-result-contract.md`.
- The **stat row** for the awarded card. Base HP/ATK/DEF are published nowhere in the project (`catalogue/INDEX.md` §7.2), so it follows the `LEVELING.jet` §5.1 guidance the catalogue recommends — an Offense takes no HP penalty — and is invented.
- The **price**: native constants and direct confirmation formatting prove30 for one and300 for eleven, with no scale100. Affordability uses paid+free Manda, and total cost is deducted once. Native confirmation specifies green/free Manda first (native-bundle-guarantee.md). `BLUSTONE_GACHA_COST` overrides the bundle and `BLUSTONE_GACHA_SINGLE_COST` the single price;0 is an explicit free fixture. Other counts/banner prices remain unreconstructed and refuse without mutation. Old research balances/charges are not refunded or rescaled; login now projects the same persisted paid/free balances. The old30000+30000 interpretation is retracted. See `analysis/research/recruitment-price-currency.md`.
- The native10+1 banner guarantees at least one three-star hunter. The local deterministic bundle preserves the selected recruit on ten draws and substitutes a published born-grade3+ hunter on the final draw when needed (currently Nene). Original pool/probabilities remain unknown; unavailable eligible references refuse before charging. Single draws keep their selected birth grade. Existing inventory is untouched.

The source catalog now also publishes Gerard005 (Ice Defense, minimum stat rank2)
and Sylvester006 (Fire Offense, minimum stat rank1), matching the native training
source whitelist and recovered catalogue. Their C005/C006 art families are in
the default device profile at resource stamp1634663. Original001..004 and owned
instances are preserved. New hunters use local stat fixtures and inert unknown
skills; artwork/reference presence does not establish combat readiness.

`GetItem` retains AP/BP definitions and adds explicit local trace-reference IDs.
Normal campaign reference `group_exp` now matches the existing local first-clear
team EXP settlement30 through one shared policy constant. Payouts and saved EXP
are unchanged; this is fixture consistency, not recovered original balance.
Search keeps its separate reward reference. Native cached preview refresh remains
unverified. See `analysis/testing/campaign-continuation-001/report.md`.
`/reference/GetDialog` now returns an explicit empty record collection instead
of generic mock bookkeeping. Native CSRDlgInfo parses records directly from
ret_data. Original dialogue scripts and Story UI are recovered, but the archive
catalog IDs, titles, ordering, artwork and unlock bindings remain unknown; the
Story journal is still empty. It is separate from the working Airport Episodes.
It also publishes display-only `VIP1` for native Veteran EXP receipts, mapped
to the existing original `ICON_VE` Shop glyph. The identity is native-recovered;
neutral metadata and this artwork assignment are local display policy because
the original item-reference row is unknown. Native item-map loading is verified;
actual reward-thumbnail rendering awaits a future eligible login claim. This
adds no inventory stack, redemption action or EXP award.
Native use_type3/effect binds each item to its hunter; trace rows use type3 and
the already-cleared stage7 campaign source. Native activation still requires
actual stars. IDs, collection thresholds and source association are local
navigation fixtures, not recovered drops. Reading them grants nothing; trace
rewards and recruitment are unavailable. Native source-list/navigation validation
is pending. See hunter-trace-item-binding.md and training-source-hunter-whitelist.md.
- The numeric `attr` / `role` enum is **[UNKNOWN]**, so the awarded card reuses card `001`'s `1` / `1` rather than inventing a value that might index a table out of range.

**To see the portrait on device**, the card's art has to be in the CDN package. `tools/start-server.ps1` globs `C001*.jet` by default, which does **not** cover `C002`. Either widen that script's `BLUSTONE_CARD_ART_GLOB` or, starting the server directly, set the in-process dial:

```
BLUSTONE_RESOURCE_ASSET_GLOB=C002.jet       # base art only, 739 583 bytes (cheap)
BLUSTONE_RESOURCE_ASSET_GLOB=C002*.jet      # whole card family, +5.9 MB
BLUSTONE_RESOURCE_ASSET_GLOB=C00*.jet       # the whole roster, ~570 packages / 587 MB
```

Without it the award still lands in the inventory and appears in *Build Team*, but the portrait is empty animation layers and the log shows `[ERR] [RES] Can't find 'C002' in ResMap.`

## Emulator diagnostics

BlueStacks uses the advertised URL `http://10.0.2.2:8080`. The patched APK targets that URL. Keep this research server local; it is not hardened for public exposure.

Configure `BLUSTONE_STATE_FILE` with an absolute path such as `<workspace>/server-ts/data/state.json` to persist accounts, email credential verifiers, OTP/vs_token state, nickname changes, server selection, transport keys, and bound transport sessions. Without this option the server stays in memory. State is written through an atomic rename; older account records remain readable with guest-compatible defaults and are enriched on the next write, while malformed files fail startup rather than silently resetting users. The file contains account/transport secrets, is excluded by `data/` in `.gitignore`, and must remain local. Gameplay balances/collection fixtures are not yet mutable persistent progress. This store supports one server process, not concurrent writers.

Resource options: `BLUSTONE_RESOURCE_VERSION=1634661`, `BLUSTONE_PACKAGE_MODE=pkgi1-tree`, and the 11-package manifest below. Start from the workspace or use absolute paths for package and asset directories.

### The two shipped profiles DISAGREE — read this before choosing a package list

There are two profiles in the repository and they were silently inconsistent
until 2026-10-03.

| | `server-ts/.env.example` | `tools/start-server.ps1` |
|---|---|---|
| packages | **3** (`E_NEW`, `E_MIDAGE`, `UI_XML_RO.db`) | **11** (adds `PK_LM2/4/5`, `PK_MO3/5`, `PK_MT3/5`, `PK_WK1`, `VD_MISSION`) |
| package dir | `analysis/reconstructed-resources` | `analysis/runtime-package-full` |
| stage art | **none** — no `BLUSTONE_RESOURCE_ASSET_DIR` | 8 base art packs + the `C001*` card family, folded into `E_NEW` |
| used by | `npm test`, `tests/resources.ts` | BlueStacks / device runs — **the only profile that has run the game** |

The `.env.example` profile serves no stage art at all, so on it the expedition
map draws nothing whatsoever: no backdrop, no node sprites, no snow. That is not
a client bug; it is the profile. `start-server.ps1` now prints the disagreement
on every start. Do not copy the `.env.example` list into a device run, and do
not use the 11-package list for `npm test` (it points at a different package
directory and forces a 23 MB package build).

```powershell
cd ..
py tools/prepare-reconstructed-resources.py
cd server-ts
$env:BLUSTONE_PACKAGE_DIR = (Resolve-Path ../analysis/reconstructed-resources).Path
$env:BLUSTONE_UI_PACKAGE_TREE_DIR = (Resolve-Path ../analysis/reconstructed-resources).Path
$env:BLUSTONE_PACKAGE_NAMES = 'E_NEW.jet,E_MIDAGE.jet,UI_XML_RO.db.jet'
$env:BLUSTONE_PACKAGE_MODE = 'pkgi1-tree'
npm run dev
```

The generated `UI_XML_RO.db` restores missing EN layout keys from the preserved
KO layout records while excluding `DEFINE_COLOR`, which is unsafe to alias.
It is packaged as a LevelDB delta (new SSTable plus `CURRENT`/`MANIFEST`) so
the native downloader does not try to replace the base `000005.ldb` while the
database is open. This is a native-lookup compatibility layer, not proof that
every inline XML label is genuinely translated; the original English layout
package is still a separate recovery target. Tests check the outer package
MD5, manifest length and record offsets; emulator verification must also
confirm that the delta table is installed and that the missing-key logs stop.

### Full APK asset-pack tree

The preserved 2.8.0.1 APK also contains nine active asset packs that are not
covered by the minimal reconstructed tree: `PK_LM2`, `PK_LM4`, `PK_LM5`,
`PK_MO3`, `PK_MO5`, `PK_MT3`, `PK_MT5`, `PK_WK1`, and `VD_MISSION`. Together
with the separately recovered `E_NEW` and `E_MIDAGE` packages, these are the
11 active CDN items observed during the rooted API-30 capture. They can be
served from a tree prepared from the APK without changing the route code:

```powershell
$env:BLUSTONE_RESOURCE_VERSION = '1634661'
$env:BLUSTONE_RESLIST_STAMP = '1634661'
$env:BLUSTONE_PACKAGE_DIR = (Resolve-Path ../analysis/runtime-package-full).Path
$env:BLUSTONE_PACKAGE_TREE_DIR = $env:BLUSTONE_PACKAGE_DIR
$env:BLUSTONE_PACKAGE_NAMES = 'E_NEW.jet,E_MIDAGE.jet,PK_LM2.jet,PK_LM4.jet,PK_LM5.jet,PK_MO3.jet,PK_MO5.jet,PK_MT3.jet,PK_MT5.jet,PK_WK1.jet,VD_MISSION.jet'
$env:BLUSTONE_PACKAGE_MODE = 'pkgi1-tree'
$env:BLUSTONE_RESOURCE_ASSET_DIR = (Resolve-Path ../analysis/extracted/assets).Path
$env:BLUSTONE_RESOURCE_ASSET_NAMES = 'MAP_ZONE_1.jet,ST001.jet,M001.jet,MAIN_BG01.jet,MAIN_ICON.jet,SNOW.jet,UI_BATTLE.jet,UI_BATTLE2.jet'
```

Prefer `..\tools\start-server.ps1`, which sets all of the above plus the
`C001*` card glob, defaults the asset directory to the recovered PAD pack and
refuses to start when a named asset does not exist. The block above is the
manual equivalent for reference; note that its asset directory
(`analysis/extracted/assets`) is the **APK** copy, while `start-server.ps1`
points at the larger recovered PAD pack.

The asset directory is folded into the `E_NEW` PKGI tree so stage resources
are available after the client download. The current capture validates the
manifest, ranged package transport, and the 23 MB download for all 11 names.
It does not prove historical server parity; keep the APK and extracted
packages local until that comparison is complete.

**Missing asset names are dropped SILENTLY.** `packageTreeEntries`
(`src/server.ts`) skips any name that is not a readable file, so a typo — or a
pack that was never recovered — ships a *shortened* package with no error
anywhere, and the only symptom is missing art on the device. `start-server.ps1`
now refuses to start if any name in `BLUSTONE_RESOURCE_ASSET_NAMES` is absent
from `BLUSTONE_RESOURCE_ASSET_DIR`.

### The expedition map's three art families

| what | served? | name |
|---|---|---|
| map **backdrop** | yes | `resource_id` = `MAP_ZONE_1` (see below) |
| snow particle layer | yes, **proven working** | `SR_SNOW` → registers `SR_SNOW01..03` (`SNOW.jet`) |
| mission node markers / chapter shield | yes | `MS_ST1..3`, `MS_MK_ON/OFF`, `MS_UP`, `MS_DWN`, `PA_SHADOW`, `ST_SHADOW` — all from the UI packages |
| stage-select popup sprite + backdrop | **no** | `N001/N002/N003.jet`, `N003_BG.jet` (real recovered files; opt in via `BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA`) |
| chest / reward sprites | n/a | `MS_RW_B*`, `MS_RW_S*`, `MS_RW_G*` — **data-driven, not fixed here**; see [map-backdrop.md](../analysis/research/map-backdrop.md) §5 |

#### `resource_id` is ART, and that is not the same bug as `res_prefix`

`/reference/GetArea`'s `resource_id` is the **mission-map backdrop art name**.
It is *not* an `environments.csv` id. The two fields are easy to swap and both
mistakes are silent:

- Publishing `"ST001"` (the stage `thumb` family) — what this fixture shipped —
  produced `[ERR] [RES] Can't find 'ST001' in ResMap.` + `LoadAnim2 'ST001'
  failure` + `[WRN] [OnPlay] Cannot play the node,itrdon't have A resource of
  image` in **5 of 5** r015 legs: a black map beneath a working snow layer.
- Publishing `"99"` (an environment id) would produce
  `[ERR] [RES] Can't find '99' in ResMap.` — the same black screen from the
  opposite direction.

**[RECOVERED] why.** `CSRGameStage::SetArea` (0xa28108, literal `0x1d7770e`) is
the field's only reader, and `SetArea`'s 27-key field set has no environment
field. The `std::map<string,ENV_INFO>` at `CSRStaticData+0x150` has exactly one
reader — `CSRGameBase::OnInitBackground` (0x9cbf34) — and its three callers all
take the key from elsewhere: `CSRGameBase::InitBackground` (0x9cbe8c, the
**stage's** `res_prefix`), `CSRSceneMEpisode::InitBackground` (0xb23e80, a local
episode JSON, not a route) and `CSRExploreMirage::InitBackground` (0x926778).
The consumer here is `CSRSceneMStageMap::CreateArea` (0xe91f0c), whose
instruction order is `PA_MAP%d` → `FindByName("PA_BG")` (0xe9222c) → *load this
art* → `SR_SNOW` (0xe92490) — and the measured `ST001` load lands between
those two, 13 ms apart (`23:47:43.294` → `23:47:43.307`).
`PA_BG` is an **empty** `<panel>` in the recovered layout record
`KO/NEW/SR_MISSION/2_SR_UI_MS_ST/1_MS_ST_MAP` (51 `PA_MAP0..50` panels, each
wrapping an empty `PA_BG`, plus `RE_MK0..9` marker rects, and exactly one
`res-name="ST_SHADOW"`), so code has to fill it. Finally: **one** miss per
session, not seventeen — `thumb` is per-stage and the fixture publishes 17
stages, `resource_id` is per-area and one area is visible.

Current live profile uses `BLUSTONE_AREA_BACKDROP_ART=LOCAL_MAP` and a separate
`LOCAL_MAP.jet` owner. `tools/build-local-map-wrapper.py` builds a one-frame
animation referencing untouched original `MS_MAP2` scenery. Native Aurora and
Red Rock stage maps now render that scenery instead of black backgrounds.
The wrapper/shared assignment is local compatibility policy; original per-area
bindings remain unknown. Restore the current private map-render profile before
starting the replica. Tests check namespaces without equating resource IDs to
package filenames. See `analysis/testing/map-render-001/report.md`.

**[HISTORICAL FIXTURE] the value `MAP_ZONE_1`.** `MAP_ZONE_1.jet` (6 129 328 bytes) is a
real file in the recovered PAD pack and is the only `MAP*` pack in that
790-file corpus. **It is not proven to resolve**: entry names inside these
containers are not plaintext, so a pack file existing does not imply a
resolvable entry name inside it. The guard enforces what *is* provable — the art
must exist as `<name>.jet`, and it must not be an environment id or an `ST<n>`
prefix — and refuses to boot otherwise (`assertAreaBackdropArt`), with the full
cross-check against the CSV in `tests/area-backdrop.ts`.

The three namespaces are now three separately named constants
(`FIXTURE_STAGE_ENVIRONMENT_IDS` / `FIXTURE_AREA_BACKDROP_ART` /
`FIXTURE_STAGE_THUMB_ART`) so one string cannot be published into two of them
again — which is exactly what made the r015 log unattributable.

Temporary test controls, unset for normal runs:

- `BLUSTONE_CAMPAIGN=full|minimal` (**default `full`**): which area/stage tables `/reference/GetArea` and `/reference/GetStage` publish. `full` is the **[RECOVERED]** campaign (`analysis/recovered-data/campaign-stages.csv`, extracted from `LEVELING.jet` chunk 0 in the base APK): six areas — the origin node `n_00` plus the five expedition areas `n_01`..`n_05` — and exactly the 50 stage ids `n_01_01`..`n_05_10`, ten links per expedition area with `serial` 1..10. `minimal` is the pre-2026-10-03 fixture byte-for-byte (`n_00` + `n_01` linking `N001 N002 N003`, seventeen stage records); it exists so a regression in the wide table is recoverable in **one environment variable** with no code edit. This is the switch that changed the two user-visible symptoms:
  - *"stages do not load correctly"* — the old table mixed **two** id namespaces: `N001`..`N013`/`N500`..`N502` are PAD **art filenames** used as stage records, while `n_01_01` is the real `CSRStaticData::GetStageID` id used in the area links. Only `n_XX_YY` is the game's stage identity. It also published **no wave record** for any stage other than those four ids, so `/reference/GetTargetStageMonster` silently borrowed another stage's waves (a 200 with a well-formed nested array, which is why it never showed up in a log).
  - *"you cannot progress in the cruise at the airport"* — the cruise **reads `/reference/GetArea`**, not a route of its own: **[RECOVERED]** `CSRSceneAreaSel::SetData(AREA_INFO::TYPE)` (`0xe7360c :267-269`) sets `this->0x65c = GetAreaCnt(type)`, `OnButtonClick` (`0xe741dc :553-555`) always enters with `SetData(this, 1)`, and `SetMarker` (`0xe74804 :433`, `:337`) builds one button per area and hides ordinal 0. **So the destination list is exactly the published areas of `type == 1`, minus the origin.** Two type-1 areas meant one destination, and that destination's three stages led nowhere.
  - **[RECOVERED]** what gates progression: **there is no server-side gate.** `CSRSceneAreaSel::SetAreaState` (`0xe75cdc :952-1011`) computes it client-side — `GetUserLevel() < level_limit` locks; else ordinals 0 and 1 are unconditionally open; else the area opens iff **`GetStageAchieveCnt(<previous area>'s last `stage[]` link) != 0`**. That count is `/lobby/Enter`'s `stage[]` and grows through `/mission/Complete`'s `achieve[].order`, so **`n_0X+1` opens the moment `n_0X_10` has been cleared**. `server-ts/src/state.ts` mirrors that arithmetic in `isAreaUnlocked()` and `tests/campaign.ts` drives it end-to-end through `/mission/Complete`.
  - **[FIXTURE, safety-clamped]** `BLUSTONE_SEED_STAGE_STARS` (default `1`, existing dial) publishes at least one star for every uncleared stage, so with the default **all five destinations are open on arrival** — which is what a tester needs in order to *see* them. Set it to `0` and the recovered gate becomes live: `n_02` then stays locked until `n_01_10` is cleared. `BLUSTONE_AREA_LEVEL_LIMIT=<n>` re-introduces a `level_limit` ladder (published `0` by default, because `/lobby/Enter` publishes no user `level` and any ladder would gate content behind a value the server never sends — the same class of bounded-placeholder decision as the `achieve[].order` 1..3 clamp).
  - **[UNRESOLVED]** the CSV's `serial` column reads `1..9,0` in **every** area, not only `n_05_10`, so "the tenth row is a boss node" does not hold up as stated and the column's role is unknown. The replica publishes `1..10` in position order: **[RECOVERED]** `STAGE_LINK` is `{int32 serial; std::string id}` and `CSRSceneMStageMap::OnInit` inserts `(serial → GetStageAchieveCnt(id))` into an **ordered** `std::map<int,int>`, so a `0` would sort before `1` and move the final node to the left of the map. The CSV's `global`/`cmge` obfuscated tokens and its `pv` column (`1100001..1100050`) are **not published** — their namespace is unknown, and `pv` is deliberately *not* used as `story_id` because a wrong story id is a dialogue load fault rather than a cosmetic error.
  - Run `BLUSTONE_CAMPAIGN=minimal npx tsx tests/campaign.ts` to watch the campaign regression suite fail against the old tables.
- `BLUSTONE_MONSTER_IDS=<ids>`: the monster ids `/reference/GetMonster` publishes **and** that fill each stage-monster record's `show_thumbnail` (which *is* that route's request list, via `FUN_00b4a7a8`). Default `M001` alone — **[RECOVERED]** namespace is `M001`..`M021` plus `M100` (the recovered PAD pack), and any id outside it is refused at boot, but widening the published set widens the request on the one battle path that is proven to render ([AGENTS.md §16](../AGENTS.md)), so that is a deliberate experiment rather than a default.
- `BLUSTONE_STAGE_MONSTER_KEY=stage_id`: key `ret_data` on the stage-monster routes by **stage id** only. `monster_id` publishes the monster id only, and `both` (the [RECOVERED] default since 2026-10-02-2) publishes **both**, because both are required and the reader picks one: the top-level key is what `CSRSyncMStage::ReqTargetStageMonsterCB` (0xb4606c) passes to `CSRGameMob::AddStageMonster` (0xa0d194) and what becomes the `std::map<string, STAGE_MONSTER_LINK>` key at `CSRGameMob+0xc`, while `CSRMStage::MakeStageInst` (0xb33f84) reads that map back with `GetStageMonsterLinkData(this+0x220)` (0xb34b18) using the scene's own **stage id**. A miss makes `GetStageMonsterLinkData` (0xa0cf38) return its two fallback vectors at `CSRGameMob+0x18` / `+0x24` — which have no writer in the library — so `waves` is empty, `MakeStageInst` takes `beq.w 0x00b34e88` at `0xb34b28` and faults at `0xb3507a str r0,[r1,#0x4c]`. Set this only to reproduce superseded behaviour; it is the control leg of the regression test.
- `BLUSTONE_WAVE_SHAPE=flat`: flatten the `wave_list` array on those routes. The default (`nested`) is [RECOVERED]: `wave_list` is `vector<vector<STAGE_MONSTER>>`, an array of waves each holding an array of monster records, because the OUTER dereference of `wave_list` (`0xa0d266`) is what the INNER loop (`0xa0d2d8`) iterates and one `vector<STAGE_MONSTER>` is pushed per outer element (`0xa0d480`). A flat array is **fatal**, not degraded — the inner loop then walks the monster object's own members and calls `operator[]` on a scalar at `0xa0d304`, which throws `type_error.305` out of `AddStageMonster` before `STAGE_MONSTER_LINK` is emplaced at `0xa0d69c`. Also the control leg of the regression test.
- `BLUSTONE_WAVE_REF_ID=card`: put the **card** id back on each wave record's `ref_id`. The default (`monster`, the value from `FIXTURE_WAVE_REF_ID` = `FIXTURE_MONSTER_IDS[0]`) is the [RECOVERED] one. `ref_id` is the first 12 bytes of the 20-byte `STAGE_MONSTER` (`CSRGameMob::AddStageMonster`, 0xa0d194, stride `0x14` at `0xa0d410`), and `FUN_00b4a7a8` (0xb4a7a8) — the function that builds `GET /reference/GetMonster`'s `list` — walks the wave vector in a **second** loop at that same stride (`00b4a864` → `00b4a870 bl 0x00a0b428 HasMonsterData` → `00b4a886` string copy) and appends the `ref_id` to the **same** list head (`sp+0x24`) and counter (`sp+0x2c`) as its first loop over `STAGE_MONSTER_LINK::ids` (stride `0x0c`, our record-level `show_thumbnail`). So `list = ids ∪ {every wave ref_id}`. `CSRGameMob::GetMonsterData` (0xa0b43c) is a `std::map<string,INFO>::find` on `_server` and asserts at `SRGameMob.cpp(38)` otherwise: shipping the card id produced the measured request `list=["M001","001"]` and the fault 31–45 ms later ([report-014](../analysis/testing/report-014.md)). **Do not** repair a miss by adding a card id to `show_thumbnail` or by publishing a monster under `_server: "001"` — the wave loop requests `ref_id` itself, so either only moves the assertion. Set this only to reproduce superseded behaviour; it is the control leg of the regression test and is expected to fail there. **Unresolved:** `ref_id` also reaches `CSRCard::SetRefID`, which wants a *card* id; that conflict is scoped, not solved — the five `SRCard.cpp(731)` assertions live in the player camp (`CSRMStage+0x250`), while this fix targets the enemy camp (`CSRMStage+0x264`).
- `BLUSTONE_STAGE_ENVIRONMENT_ID=<id>`: the environment id `/reference/GetStage` publishes as each stage's **`res_prefix`** — the battle-background selector. Default `99`. This is a namespace trap worth stating plainly: **[RECOVERED]** `CSRGameBase::InitBackground` (0x9cbe8c) reads `stage+0x70` (= `res_prefix`) and hands it to `CSRGameBase::OnInitBackground` (0x9cbf34), which uses it as a `std::map<string,CSRStaticData::ENV_INFO>` key against `CSRStaticData+0x150` — the table `CSRStaticData::LoadEnv` (0xf3bab0) fills from `environments.csv`. The `find()` result is **not** compared against `end()` (`0x9bbf62 mov r5,r0` / `0x9bbf66 ldrb r0,[r5,#52]!`, no `cmp`), so a miss reads the tree's end-node, `ENV_INFO.PreFix` formats as `""` through `CMFormat("%s_%s", …)`, and the 30 scrolling background layers come out **prefixless** — `_A0.._A9`, `_D0.._D9`, `_E0.._E9`, exactly the set in `analysis/r015/logcat-all.txt`. `CSRGameScrollBGDraw::Load` (0x9c0444) attaches a `CMImageNode` child only in the `else` of `if (CMImageNode::LoadAnim(...) == 0)`, so all 30 misses leave its `vector<shared_ptr<CMImageNode>>` empty and `OnUpdate` (0x9be8d8) faults at ELF `0x9aebd7`. Valid keys are the `#ID` column of `analysis/recovered-data/environments.csv` (0–19, 99, 100, 200, 502–537, 801, 900–907, 998); the **asset** namespace is different (that row's `PreFix` is `STI000`/`STI099`/`STI900`, the `ST*.jet` family with an `I` inserted), which is why `"ST001"` — the value this fixture shipped until 2026-10-03 — missed by construction. **[FIXTURE]** the value `99` = row 99, 배틀 / *battle*, `PreFix STI099`: the only row named for the generic battle mode, and the only row whose five `속도` (scroll-speed) values contain a positive number (`-5,-10,+20,+30,-5`; every other row's speeds come from the map template `-5,-20,-40,-60,-20`). A backdrop that scrolls both ways on two of its five depth bands is a battle backdrop. **Which id a given real stage used is recovered content that has not been recovered.** Two honest limits: whether entries named `STI099_A0` exist in the PKGI1 index is **[UNKNOWN]** (entry names are not plaintext in any package, so only a *miss* is proven), and `CSRSceneMEpisode::InitBackground` (0xb23e80) — the other caller of `OnInitBackground` — passes `*(std::string*)(COMBAT+0x24)` from `CSRMEpisode::GetCombat()`'s `CSREpisodeData::COMBAT` graph, which `CSRMEpisode::ReadJson` loads from a **local resource, not a server route**. If r015 died in the episode scene, no field on this route reaches it. Oracle: the `[WRN] [Load] Cannot find The resource(` names must stop being prefixless.
- `BLUSTONE_AREA_BACKDROP_ART=<name>`: the ART name `/reference/GetArea` publishes as each area's **`resource_id`** — the mission-map backdrop. Default `MAP_ZONE_1`. **Not** an environment id: see the section above for why, and for what the guard refuses. `tests/area-backdrop.ts` cross-checks it against `environments.csv` and against the recovered pack.
- `BLUSTONE_STAGE_THUMB_ART=<name>`: the ART name `/reference/GetStage` publishes as each stage's **`thumb`**. Default `ST001`. A third, separate namespace; its consumer has never been isolated on device, so the default is *unproven* rather than known-bad.
- `BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA=<names>`: extra art packages folded into the `E_NEW` PKGI tree. **Empty by default** — widening the set forces a multi-MB re-download and has invalidated experiments before. Real recovered candidates for the stage-select popup: `N001.jet,N002.jet,N003.jet,N003_BG.jet,N001_BG.jet,N008_BG.jet,UI_MAIN.jet`.
- `BLUSTONE_CARD_ART_GLOB=<glob>`: how card art is discovered. `C001*.jet` (default) serves only card 001's family; `C00*.jet` is ~570 packages / 587 MB and forces a full re-download, so it is not the default and must be set deliberately.
- `BLUSTONE_DIAGNOSTIC_EMPTY_INVENTORY=1`: return no starter cards to isolate initialization faults.
- `BLUSTONE_DIAGNOSTIC_RESPONSE_SPACING_MS=500`: dispatch game responses at least 500 ms apart and log UTC dispatch timestamps. This deliberately slows startup and is not a performance setting.

For the current repeatable BlueStacks-only instrumented run, use the explicit
BlueStacks serial and the side-by-side package:

```powershell
$adb = (Resolve-Path ../tools/android-sdk/platform-tools/adb.exe).Path
& $adb -s 127.0.0.1:5555 shell am start -n com.vshower.prd_sr.instrumented/com.vshower.instrumented.InstrumentedActivity
Invoke-WebRequest http://127.0.0.1:8099/healthz
```

The instrumented APK uploads Android/native logs and local-state artifacts to
the Docker collector at `http://127.0.0.1:8099`. Use its UI or event API as the
primary trace source:

```powershell
Invoke-WebRequest http://127.0.0.1:8099/v1/events?limit=200
Invoke-WebRequest http://127.0.0.1:8099/v1/artifacts
```

Do not use `tools/emulator-advance.ps1` for this workflow: it targets the old
`emulator-*` path and the original package. The physical phone remains outside
the test target.

The current `/lobby/Enter` fixture is a deterministic local bootstrap that is sufficient for the observed Midgard/Airport flow. It is not recovered account progress or production balance data. See `analysis/STARTUP-RECONSTRUCTION.md` for native evidence, diagnostic APK provenance, and phone-data preservation constraints.

### Instrumented APK bootstrap and UI seed

The reproducible instrumented build uses `tools/patch-native-ui-animation.py` to
create `analysis/patched/libnative_core-ui-ma-bypass.so` from the extracted ARM
library. It applies two isolated changes to the copy only: the native launcher
literal `pv-prd.vshower.com` is redirected to `10.0.2.2:8080`, and the
BlueStacks-only `UI_MA_L1` video-animation function returns a null animation
instead of dereferencing its invalid video resource. The original APK/native
library is not modified.

`Telemetry.java` installs the native-compatible
`instrumentation/assets/instrumented-seed-complete-ui-delta-v2/UI_XML_RO.db`
tree before the native engine opens LevelDB. It preserves the working
multi-SSTable base and adds the two verified launcher records
`EN/SR_FLOW/7_UI_FL7` and `EN/SR_GLOBAL/0_GL_PROGRESS/0_PROGRESS`; the unsafe
English `DEFINE_COLOR` alias is intentionally excluded because it reproduces
the native `BuildColorTable` assertion.

Supply now has dedicated native routes /reference/V2_GetSupply,
/lobby/V2_GetSupplyInst, /supply/Refresh and /supply/ActivityReward. Reference
activity and instance arrays align by ordinal and string id. Reference
attendance/login_bonus are arrays; instance attendance is omitted through its
native null guard and login_bonus uses cur_value/cycle/cycle_log. The fuel UI
proves statuses0 unavailable,1 claimable,2 received; status3 paid recovery is
unmodeled. The AP-only local_fuel_0 activity offers10 AP once per UTC day,
with a displayed00:00-23:59 window and next-midnight activity_refresh_utc.
Identity, amount, daily/free-only policy and schedule are revival fixtures;
original Supply quantities/timers remain unknown after public-source research.
Claim marker and AP persist together; duplicates and clock rollback cannot
reopen a paid cycle. Reward overflow is preserved. Unknown activities refuse
without reward. Native response carries target_inst{id,status2} and
user.ap{cur,ap_charge_time}, with deadline INSIDE ap. Original attendance,
login rewards, paid recovery, VIP/guild Supply bonus calculations and Supply
UI/relaunch validation remain incomplete. See supply-refresh-contract.md,
supply-public-evidence.md and tests/supply.ts. No reference to AP1 is used as
an activity claim id; that is a reward resource namespace.

`/gym/RankUp` now supports partial credited materials and full advancement.
The inferred local transition requires ordinary max level and same-grade
materials: p+n below capacity keeps rank/EXP and advances rank_up_cnt; equality
promotes one grade and resets EXP/counter to0. Capacity=currentrank follows
historical community guidance;5percent stat bonus per credited source and1000
gold/source are local fixtures. Native response nesting is recovered:
user.gold/deck, card.target_inst rank/rank_up_cnt/exp prev-cur pairs, and BARE
numeric removed_inst_list entries. Ownership, lock/protected deck/battle,
capacity, funds, awakening and future-rank reference checks precede mutation.
Consumed-source retries cannot spend twice. Gold/target/removals/book/decks
persist together. Native synthetic credit IDs below capacity are filtered out
of requests; low legacy real source IDs are refused without renumbering them.
Target skills are preserved; RankUpCB has no automatic skill-unlock field.
New eligible zero-level skills, original partial transition/EXP/guild discounts,
awakening and native advancement UI still need verification. No live ownership
has been promoted by this implementation. See rank-up-implementation-audit.md.

Hunter battle EXP now uses the exact native Complete shape:
`card[decimalOwnedSerial]={prev,cur}` with absolute accumulated EXP. Each new
matching active-battle win grants the published stage character_exp (currently
10, a fixture) to up to four unique snapshotted participating hunters, including
replayed stages. First-clear gold/userEXP remains a separate existing policy.
Defeats, duplicate/no-active completions and unknown stages grant no hunter EXP;
unknown awake curves are untouched. Ordinary caps do not claw back old EXP
above the current fixture cap. Skills/grade/locks/decks remain intact. A stale
stage completion now preserves a different active battle and returns a safe
unchanged native envelope instead of discarding that attempt. Native result
level changes, inventory/Gym and relaunch validation are pending. Reward and
equal-participant/replay policy are revival fixtures, not recovered original
balance or survivor rules. See mission-hunter-exp-contract.md and
tests/mission-hunter-exp.ts.

Eligible zero-level skills now train0→1 through the existing native single or
batch callback. Reference target_rank must already be <=owned rank; locked
zero slots still refuse. Native SkillUp Select passes destinationLevel=owned+1
to GetCardSkillUpPrice, which indexes destinationLevel-1 without clamping.
Batch simulation also uses the next level. The local gold table remains100
per published destination level, so0→1 costs100,1→2 costs200, and a batch
sums its destination rows. Prior current-level pricing was an indexing error;
old stored charges are preserved, not refunded or rescaled. This also lets a
rank-promoted zero slot initialize without inventing a RankUp skill field.
Native UI upgrade validation remains pending. Evidence:
analysis/research/skill-zero-level-eligibility.md.

`/lobby/GetItemInven` now follows native ParseUserItemInven: an object with
item[] and global_item[] arrays. Ordinary persisted item rows are preserved;
global_item restores the independent AP/BP scalar purchase counters.
The previous bare array was not the native parser's shape. This corrects the
bootstrap seam, but does not claim missing item references or ShopFuel
purchases are revived. See shop-fuel-price-and-inventory.md.

AP ShopFuel and BP ShopFCTicket have local transactions: GetItem publishes item/trace/
global_item arrays with local_ap/use_type1/effect STRING"10" and
local_bp/use_type2/effect STRING"5", candidate IT_ST/IT_LT thumbnails,
and exact Manda5/gold100 price tiers1..3. BuyGlobalItem accepts the
native target_ref_id/price_type/item_inst_id0/qty1 request; tickets and other
items/quantities refuse. Local policy grants10 AP or5 BP with overflow, charges total
Manda once free-first or100gold, and allows3 purchases per resource shared across currencies per UTCday.
Those quantities/prices/reset/identity/thumbnail are explicit fixtures.
AP and BP have independent counters. Purchase counter/resource/wallet persist together; GetItemInven restores scalar
 global_item counters. Rollback cannot reopen a paid cycle. Separate accepted
calls are distinct purchases: no recovered nonce supports transport exactly-
once. Response includes neutral jackpot1/1, scalar paid/free balances or gold
pair, AP or BP prev/cur/charge deadline INSIDE its resource object, and target_inst buy-count pair.
Native shop purchase/receipt/relaunch verification remains pending. See
shop-fuel-contract.md, shop-fuel-price-and-inventory.md, shop-bp-contract.md and tests/shop-fuel.ts.

Fight Club now has dedicated Enter/FindRival/BattleStart/BattleComplete handlers
instead of expedition aliases. Native schemas are documented in
analysis/research/arena-lobby-contract.md and arena-battle-contract.md.
CASE4 persists separately from the expedition party. A local known-art Mowgli
opponent is not granted to inventory. Start spends1 BP with AP unchanged,
persists one active attempt, and supplies all four flat AP/BP values/deadlines.
Complete accepts native play_info, settles result pairs/honor, and preserves
CASE4 hunter EXP through direct top-level pairs. Native is_win determines the
outcome; combat/timeout rules and anti-cheat are not reconstructed. Opponent,
BP1, honor10, rating±10, six wins per league and season
values are fixtures; original mechanics remain unknown. Season deadline units
are recovered server-epoch seconds (arena-season-time-units.md); original
calendar alignment and duration remain fixtures. Countdown display and opponent
thumbnail/empty slots still need native validation. Automatic GetMyRank uses
the recovered root ret_data.rank scalar and local single-player rank1 fixture.
Expedition and Fight Club attempts cannot overlap; CASE4 changes are refused
during an active fight. Lobby/flat profiles mirror the persisted arena counters.
Matching duplicate settled Complete replays its persisted original receipt
without a second reward, but the recovered protocol has no completion nonce: a stale
completion after a new same-target Start is indistinguishable. Do not claim
transport exactly-once. Revenge/friendship/nonzero bids and RefreshRival refuse.
Full server suite/build pass; native lobby, battle, receipt and restart remain
unverified. These source changes need deliberate safe promotion before testing.

Team EXP now publishes the persisted earned value in lobby/profile group_exp.
Mission completion level/AP-cap metadata lives inside user.exp (native r5
retains that JSON object), not merely at the response root. Level pairs and
area level gates derive from the same published thresholds/native getter.
The current two-row fixture0/100 caps Team level at2; original Team curves and
AP-cap scaling are missing. No level30 or extra EXP is granted. Native level-up
animation for a threshold crossing remains unverified; raw EXP publication and
preserved restart are separately documented in team-exp-reload-contract.md.

### Hunter Search entry contract (2026-10-05)

`/explore/GetRef` now returns `ret_data:{ref:[INFO],event_ref:[]}`. The native
Normal filter requires type1; its scene dereferences the first reference before
requesting instances. One local Sylvester006/source n_01_07 entry supplies the
recovered strict string/numeric fields. Search id017 is required by the native
tutorial's UI lookup. Its Sylvester/source association, costs, timers and limits
are local fixtures; original Lapis identity remains unconfirmed.

`/explore/GetInst` returns the idle instance object directly in ret_data:
empty inst/retry_log/cleared_explore arrays, completed play_log rows, reset/retry prices,
reset_cnt0, cooltime0 and user:null. Native SyncUser's null branch performs no
player writes. Reads grant nothing; Reward/Retry/Reset/Entrust remain unsupported.
Dedicated Begin/End now use persistent account-bound logs. Full server tests/build pass. Native entry validation
now confirms the Search map and Sylvester portrait render after GetInst.
The required id017 also restores the tutorial focus and Collect Traces popup.
Native Sylvester artwork,0/10 traces and helium-capsule instruction render.
Search now runs two actual waves, settles native End and renders Search Complete
2/2 with Sylvester traces1/10, then returns to the village.
Dispatch and recruitment from traces remain unimplemented.
Evidence: analysis/research/search-entry-reference-contract.md and
analysis/research/native-search-entry.md.

Capsule acquisition now has a local earned policy: each new accepted normal
campaign victory grants one AIRSHIP_TICKET, including a new replay battle.
The native guide confirms general stages as the source; original rates are
unknown. Matching active battle plus explicit clear1 is required. Losses,
duplicates and legacy missing/malformed win telemetry grant none. Stack IDs and
additive native item receipts persist together. No existing account is prefilled.
Reference use_type0 and other metadata are local inert fixtures. Server tests
and persistence checks pass; native earning/display validation remains pending.
See analysis/research/search-capsule-earning.md.

Virtual Search partners now come from the recovered Abyss reference schema:
GetAbyss ret_data.virtual_friend flat rows contain complete card-instance fields
plus id/nick_name/user_exp/card_ref_id/card_exp. One nonowned known-art Lantern
template renders under Hunter Union Support; original guide focus and green-check
selection are verified. GetHelperList friend/virtual arrays identify USED partners
and now follow a persistent local daily-use ledger. A pending attempt keeps its
reserved helper available for resuming the SAME log. The template does not grant
an owned hunter. Original roster/levels remain unknown. See
analysis/research/native-search-helper.md.

Search normally spends one earned capsule per accepted attempt. One initial
guided attempt at capsule0 is an explicit local recovery waiver: earned stage8,
actual37/0 acknowledgement, pending37/1 and a known selected helper are required.
It grants no item and writes no tutorial flag; the waiver persists and cannot
fund another attempt. Original onboarding economics are unknown. Two waves,
100% enemy multipliers and zero skill levels are local battle fixtures.
Completion validates the log/native clear and completed-wave count, returning
one Sylvester trace on victory and none on defeat. Campaign stars/energy/gold/
EXP/ownership/tutorial flags stay unchanged. CASE1 formation and snapshotted
hunters are protected while active; campaign/arena starts are mutually exclusive.
Repeated receipts omit additive consumption/reward deltas. A lost first response
may need an ordinary inventory refresh; no native nonce/exactly-once delivery was
recovered. Native win/result, trace increment and village return are verified.
Ordinary capsule spending, loss results and long-term refresh remain unverified.
See analysis/research/native-search-battle.md and search-attempt-persistence.md.

Search uses unlinked local_search_017, preserving campaign stages and their
single-wave monsters. Native Search automatically shows IG_WAVE1_N; its original
effect table only registers totals2..4. A single-wave Search causes a ShowEffect
assertion. The pending failed one-wave fixture migrates to two waves with its log,
party and accounting unchanged; completed receipts are preserved.

## Owned card IDs and native Episode actors

Production ServerState instances use card_instance_namespace1 by default.
Owned hunter IDs are mapped once into a local reserved range (legacyID +
1,000,000); original production allocation is unknown. This prevents observed
CB0102 generated enemy serial5 from selecting owned C004 serial5. Native
combat uses a global serial map, so low fixture IDs can bind the wrong actor.

The constructor validates supplied raw identities before normalization, maps
all card references and atomically persists the complete save before serving
requests. Starter/recruited hunter fields, EXP, locks, skins, wallets, campaign,
Episode, items, account/session/transport data and allocator gaps are preserved.
A version marker prevents double migration. Malformed/ambiguous namespaces and
duplicate game-state rows refuse startup without replacing the save. Allocation
stops before the nonowned Search helper serial900,000,001. No low-ID aliases
are accepted as ownership after migration. Native reload is required so the
client receives consistent inventory, leader and deck IDs.

For an offline preview, copy into a NEW private destination through:
`npx tsx scripts/preview-card-identity.ts <source-save> <new-private-copy>`.
The command verifies whole-save equality against the explicit identity mapping
and refuses to overwrite its destination or mutate the source. Before live
activation, stop the instrumented app and verified replica writer, retain the
private original save, then restart normally. Immediately before client login,
`npx tsx scripts/verify-card-identity.ts <private-before> <live-after>` proves
only identity changes. Subsequent legitimate gameplay/login changes are outside
that exact equality comparison. Do not publish either save.

Existing historical handler tests explicitly use tests/legacy-state-fixture.ts;
production defaults remain native IDs. npm test also runs the pure namespace
and production persistence/publication/allocation tests, including failed
rename and malformed-save refusal. legacyCardIds:true is an explicit fixture
option on ServerState/createApp, never a rollback or automatic ID downgrade.
Native CB0102 inventory/party reload, self/camp-correct serial lookup and M022
rendering are verified. High-ID ordinary/Search/arena runtime validation and
original combat balance remain separate work; this is not full game recovery.

### Ordinary Hunter stat reconstruction

BLUSTONE_CARD_STAT_PROFILE defaults to archive-2019-projection. Exact references
001..004 use curated JP archive2019 observations as local reference bases,
retaining current fixture growth10/1/1 and repeated rank rows. Page levels and
gear were not recorded; these are not recovered final2.8 Lv1 stats. The policy
changes published references only, never earned EXP/ranks/owned identities or
progress. Native positive integral base-growth term is base+up*level; therefore
Lv1 already adds one increment to the projected observation. Native speed uses
an inverse interval, not milliseconds. See research/hunter-native-stat-growth.md
and ordinary-stat-projection.ts. Refs005/006 and noncanonical ID overrides retain
independent legacy fixtures. BLUSTONE_CARD_STAT_PROFILE=legacy restores previous
wire numbers; unknown profiles fail startup. Existing active-skill profile is
independent and unchanged. Revalidate fresh native references after any switch.
### Campaign receipt diagnostics

Set `BLUSTONE_CAMPAIGN_RECEIPT_TRACE=1` to append local `logs/campaign-receipts.ndjson`
for authenticated normal-campaign Start, Complete and ReqAchieveReward responses.
Disabled by default. Rows carry session UUID/sequence/UTC, account ID, canonical
stage/area, validated local reservation/deck, completion flags, wallet/card EXP
pairs, Start scalar AP, chest threshold/claimed status and area-claim counts.
Credentials, headers, raw bodies/play_info and unknown response fields are excluded.
Keep this ignored log local; it has no automatic rotation. Context reads do not
bind transport sessions, create game state, refresh clocks or persist. Diagnostic
failures preserve gameplay responses. Receipts do not prove visible enemy defeat
or identify who supplied inputs; rejected/duplicate receipts are not new rewards.

Campaign Start admission follows the recovered StageConfirm callback: only
`result_code:1` enters battle. Empty AP and unowned deck IDs use local failure2001;
`accepted:false` alone cannot refuse a native Start. Funded reservation retries
remain successful even after AP reaches zero. Complete has a different contract:
losses and neutral/rejected completion receipts still use code1.
