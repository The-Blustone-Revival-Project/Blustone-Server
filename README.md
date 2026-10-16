# Blustone Server

A local TypeScript/Express compatibility server for the preserved BLUSTONE client. The current E6 resource profile is pinned to 139 packages and stamp 1634683. Many original systems remain compatibility fixtures or explicitly unsupported; this is not a claim of complete game functionality.

## Run on Windows

```powershell
npm ci
npm run resources:verify
npm run build
npm start
```

The default profile serves the Android/BlueStacks host address `http://10.0.2.2:8080`, binds port 8080, and persists state in ignored `var/state.json`. Existing migration state is preserved separately at `local/private/preserved-state.json`; the working migrated save is copied into `var/state.json` during setup. Do not replace it with a fresh account fixture.

For local HTTP verification or another port:

```powershell
npm start -- --host 127.0.0.1 --port 18081 --base-url http://127.0.0.1:18081 --state-file local/manual-test-state.json
```

Historical Hunter trace requirements are available with
`BLUSTONE_TRACE_THRESHOLD_PROFILE=archive-images-2017-2018`: Sylvester20 and
Gerard40, corroborated by extracted screenshots, plus nine library-only
requirements in the materials profile. Lantern/Vincent conflicts and Bright
uncertainty retain the existing local fallback; recruitment eligibility stays unchanged. The default retains the local
10/20 fixture. Item IDs, drops and the fixed10 guided reward remain local;
selecting historical requirements does not backfill traces or alter receipts.
See the [image projection evidence](docs/trace-threshold-image-projection-2026-10-16.md).

Optional `BLUSTONE_MATERIAL_SKILL_PROFILE=episode-indexed-projection`, with
`BLUSTONE_CARD_REFERENCE_PROFILE=materials`, publishes exact selected Episode
skill graphs for Captain, Vincent, Karl, Denali, Lapis, Bear, Bibi and Bright.
Using these encounter graphs for ordinary Hunters is explicit local policy;
original ordinary growth and native execution remain unverified. The prepared
`current-e6-materials-skills` profile keeps all139 resources/stamps unchanged.
See the [indexed skill profile](docs/material-skill-indexed-projection-2026-10-17.md).

A historical High-quality Bait offer is available with
`BLUSTONE_BAIT_SHOP_MODE=archive-2018-projection` and an explicit local cap,
for example `BLUSTONE_BAIT_SHOP_DAILY_LIMIT=2`. Each purchase spends6 Manda
for10 LU003 bait. It defaults disabled; the cap and UTC reset are local policy.
See the [bait shop workflow](docs/fishing-bait-shop-workflow-2026-10-16.md)
for save-version compatibility and the remaining catch-data gaps.

Optional `BLUSTONE_FISHING_CAST_MODE=local-configured` adds persisted casts,
owned bait consumption, catches, longest-catch records and keep/sale settlement.
It requires a complete supplied policy, fish metadata and lure catalogue;
outcomes, tuning, bait economics and grade/stack bindings remain explicitly local.
No original fish identities or RNG are guessed. Captured journals use schema15.
See the [configured fishing workflow](docs/fishing-configured-casts-2026-10-17.md)
for setup, rollback/replay behavior and unresolved native cache repair.

The reconstructed profile editor is available with
`BLUSTONE_PROFILE_MODE=archive-profile-projection`. It restores the native
`my_info` WebView entry and saves nickname/status changes. Its undated historical
policy gives one free rename, then100 Manda; status accepts50 characters.
The first edit uses save schema7 to preserve rename history. See the
[profile workflow](docs/profile-editor-workflow-2026-10-16.md) for setup,
source limits and the remaining Android validation.

Owned Veteran tickets can be gifted with
`BLUSTONE_VETERAN_GIFT_MODE=local-points` and an explicit
`BLUSTONE_VETERAN_POINTS_PER_TICKET` value. Native GC6 identity and sender
consumption are recovered; recipient points are a local policy, not a recovered
original amount. Enabling the mode grants no tickets. See the
[Veteran gift workflow](docs/veteran-gift-workflow-2026-10-16.md).

An optional Rupee exchange uses `BLUSTONE_RUPEE_SHOP_MODE=archive-2021-base-only`
(5 Manda) or `archive-2017-base-only` (10 Manda), plus an explicit
`BLUSTONE_RUPEE_SHOP_DAILY_LIMIT`. It provides5,000 Rupees per purchase, with
owned local coupons as another payment. IDs, daily policy and base-only payouts
are local; original jackpots and item identities remain missing. First purchase
captures schema8 counters. See the [Rupee workflow](docs/rupee-shop-workflow-2026-10-16.md).

Optional `BLUSTONE_RESOURCE_SHOP_MODE=archive-2018-base-only` supplies60 fuel
or2 Challenge Invitations for5 Manda,5,000 Rupees or one owned local coupon.
Both `BLUSTONE_RESOURCE_AP_DAILY_LIMIT` and `BLUSTONE_RESOURCE_BP_DAILY_LIMIT`
must explicitly define local caps. Existing paid counts survive mode changes;
coupon purchases capture schema9 history. No coupons or jackpots are issued.
See the [resource shop contract and setup](docs/resource-shop-native-2026-10-16.md).

Optional `BLUSTONE_DORM_EXPANSION_MODE=local-priced` restores paid dorm expansion
through the native shop API. It requires an explicit local price ladder in
`BLUSTONE_DORM_EXPANSION_PRICES_JSON`; historical images do not establish prices
at the current100-slot fixture. Capacity persists, survives disabling purchases,
and governs both premium and trace recruitment. See the [dorm setup and native
contract](docs/dorm-expansion-native-2026-10-16.md).

Optional `BLUSTONE_ADVANCEMENT_GOLD_PROFILE=screenshot-effective-quote-projection`
uses historical screen-effective advancement fees for three- and four-star
materials, shared by native price previews and server settlement. Historical
Guild discounts and undiscounted base prices remain unknown. See the
[advancement price projection](docs/advancement-gold-projection-2026-10-16.md).

Optional `BLUSTONE_HUNTER_MIN_RANK_PROFILE=catalogue-birth-rank-projection`
aligns non-main references and new-card factories with accepted community birth
grades. It preserves retained stat values and refuses incompatible old saves
without changing ownership. See the [minimum-rank profile](docs/hunter-minimum-rank-projection-2026-10-16.md).

New gacha and trace recruits record their [native registration time](docs/hunter-registration-time-2026-10-16.md)
in epoch seconds. Existing acquisition history and transient templates retain
their dates; this does not enable quick-advancement ticket consumption.

Optional `BLUSTONE_QUICK_ADVANCEMENT_MODE=local-owned-tickets` consumes already
owned SU1/SU2 to advance eligible natural three/four-star Hunters. It requires
the compatible minimum-rank profile, uses an explicit local counter-reset rule,
and grants no tickets or purchase rights. See the [owned-ticket policy](docs/quick-advancement-local-ticket-2026-10-16.md).

Optional `BLUSTONE_FRIENDLY_BATTLE_MODE=local-owned-defense` prepares an accepted
local friend's explicit Fight Club defense team, with collision-free response
IDs and mounted Gem links. It preserves both saves and charges no resources.
Native battle validation is pending; see the [friendly preparation policy](docs/friendly-battle-local-defense-2026-10-16.md).

## Resource bundle

Guild text Chat is available in explicit local memory mode:
`BLUSTONE_GUILD_CHAT_MODE=local-memory`. It requires existing joined Guild
records and authenticated exchange sessions; ordinary encrypted text is
supported, while fuel requests and persistent history remain incomplete.
The default stays disabled. See the [Guild Chat workflow](docs/guild-chat-local-workflow-2026-10-13.md)
for setup and the remaining native validation requirements.

Public channel Chat has its own opt-in flag,
`BLUSTONE_PUBLIC_CHAT_MODE=local-memory`. It supports explicit channel entry
and encrypted ordinary text. See the [public Chat workflow](docs/public-chat-local-workflow-2026-10-13.md).
Neither flag enables the whole-chat announcement service or grants rewards.

Guild gold donations are available with `BLUSTONE_GUILD_DONATION_MODE=local-gold`
and the selected original Guild resource profile. This defaults disabled; counter
increments and eligibility are declared local policy. See the
[donation workflow](docs/guild-local-donation-workflow-2026-10-13.md).

Normal timed Expedition dispatch is available with
`BLUSTONE_DISPATCH_MODE=local-timed` and an explicit reward/pass policy. It
persists AP-funded jobs, supports refresh and collection, and repairs lost
responses without duplicate rewards. See the
[local dispatch workflow](docs/local-timed-dispatch-workflow-2026-10-14.md).
The default is disabled; paid Skip/IAP and native UI verification remain pending.

Resources are repo-local and pinned by `resources/manifests/imported-files.json`. Proprietary binary trees are ignored; a fresh checkout requires the locally retained bundle or an authorized distributed copy. Download the pinned resource bundle from the [server releases](https://github.com/The-Blustone-Revival-Project/Blustone-Server/releases). The migration also retained `local/bundles/resources-e6.zip`. Import it with:

```powershell
python scripts/resources/bundle.py import PATH_TO_resources-e6.zip
npm run resources:verify
```

The importer verifies exact contents, lengths and SHA-256, and refuses to replace differing inputs. No sibling DataDump checkout, phone snapshot, junction or original Blustone folder is needed to run. Required textual Episode/catalogue evidence is included under `resources/reference/`. Bundle redistribution rights must be reviewed separately from this code's LICENSE.

## Verification

```powershell
npm test
node scripts/verify-independent.mjs
```

The second command runs the compiled server from an unrelated working directory against a disposable private state copy. It verifies encrypted ECDH/HMAC/AES traffic, authenticated lobby/reference/Episode routes, 139 resource rows, ranged package delivery, the portrait asset, and credential/transport persistence across restart. It preserves the three existing games and does not operate the Android app.

## Prepared Episode 7 resources

The default remains `current-e6`. An inactive `current-e7` profile includes the
17 additional hash-pinned original packs (156 total, coherent stamp1634684).
It expands available art; it does not grant story progress or resolve the unknown
CERUM01 reward metadata. Native E7 validation remains pending the earned E6 gate.

```powershell
node scripts/profiles/prepare-e7.mjs --inspect-only
npm run test:profiles
npm run resources:verify -- --profile current-e7
```

Preparation verifies originals and leaves the live server, save and E6 profile
unchanged. The historical Episode7 PowerShell helper now delegates to this named
profile preparation; sourcing it does not mutate environment selections. When
earned progression and native validation are ready, the launcher explicitly
selects a named profile with `--profile` or PowerShell `-Profile`. See
[readiness evidence](docs/e7-readiness-2026-10-11.md).

## Container option

GvG snapshot validation and native reward lookup are available as offline tools;
see [supplied snapshot workflow and remaining gates](docs/gvg-snapshot-workflow-2026-10-13.md).
No season, enrollment, reward claim or GvG route is enabled by these helpers.

`docker compose up --build -d` mounts the local imported runtime resources read-only and persists `var/`. The Node launch and tests are verified in this migration; container build/runtime validation is recorded separately in the migration report. Run one writer per state file.

[Migration plan and report](docs/migration/) · [Legacy server implementation notes](docs/legacy-server-README.md)

Release versions follow semver starting at 1.0.0; see [release policy](docs/RELEASING.md) and [changelog](CHANGELOG.md).
