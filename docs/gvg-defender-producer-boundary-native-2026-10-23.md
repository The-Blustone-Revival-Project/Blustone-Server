# GvG defender producer contracts and remaining boundary

Read-only original native investigation. No GvG route, season, registration,
deployment, ownership, fee, reward or combat is enabled by this note. Current
Server `gvg-instance.ts`, `gvg-reference.ts`, `gvg-phase.ts` and `gvg-reward.ts`
are offline supplied-data helpers; ServerState does not import them into an
active GvG provider. `/gvg/*` still reaches the authenticated Guild fallback.

Original final ARM source: DataDump
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Bounded original Thumb instructions and PC-relative string literals were
decoded with Capstone. Addresses below are Ghidra code/string coordinates,
file/ELF offsets plus0x10000. Function identity is corroborated by DataDump
`sources/native/symbols/native-evidence.tsv:13360` / `:13361`.

## Reserve is OccupyDefender, with camp/order strings

`CSRGuildBattleMgr.RequestDefenderReserve` **Gaad6d0** builds exactly seven
form entries: native auth5 plus **camp_id** and **order**, both copied strings.
Camp key resolves at Gaad834/Gaad838, string copy Gaad848; order at
Gaad84c/Gaad850, string copy Gaad862. Map construction receives count7
Gaad86c/Gaad870. The route literal Gaad9bc/Gaad9be is
**`/gvg/OccupyDefender`**, G1d794ae.

Auth PVID is the actual CPVDataMgr account identity loaded Gaad6f8/Gaad6fc,
converted Gaad786 and stored under pvid Gaad78a/Gaad78c. No supplied target
PVID, reservation ID, requested lease duration, fee or deployment data is
included among the seven entries. The public native signature has a trailing
uint64 argument; its downstream/callback meaning is **not** established by
these outbound fields. Do not turn it into a guessed request property or
commander authorization rule.

## Deployment sends a JSON string of nonempty reference IDs

`CSRGuildBattleMgr.RequestDeployDefender` **Gaae754** builds a JSON array from
its supplied `list<string>` at Gaae7a0..Gaae800. Gaae7cc..Gaae7da reads each
string's length and skips empty strings. Nonempty strings are copied
Gaae7ee/Gaae7f0 and appended Gaae7f8/Gaae7fc. The array is dumped to a
**JSON string** Gaae802..Gaae812.

Its form has exactly eight entries: auth5, **camp_id**, **order** and
**card_list**. Key sites are Gaae948/Gaae94c, Gaae960/Gaae964 and
Gaae978/Gaae97c. `card_list` receives the dumped string; the count8 map is
built at Gaae9f6. Route Gaaeb98/Gaaeb9a is
**`/gvg/DeployDefender`**, G1d794c2. Auth PVID again comes from the account
singleton Gaae794..Gaae79c/Gaae89c..Gaae8a8.

This is not an array of owned instance IDs, a bare JSON array form value or a
wallet transaction. These are string reference identities from the separate
GvG card domain. The outbound empty-string filtering also means a guessed
hole-preserving four-position request cannot be inferred from GetInst's four
explicit deployment slots. Original maximum selection, uniqueness, legal
orders/camps, replacement/clearing rules and registration commitments need
their own consumer/source closure.

## Combat and preference seams remain separate

`RequestCombatReady` Gaa9894 posts auth5 plus string camp_id/order (key sites
Gaa9a3a/Gaa9a3e and Gaa9a52/Gaa9a56), route `/gvg/CombatReady`
Gaa9bc0/Gaa9bc2. `RequestCombatBegin` Gaa7e34 has auth5 plus card_list
(Gaa8008/Gaa800c), route `/gvg/CombatBegin` Gaa81cc/Gaa81ce. These request
keys alone do not establish enemy selection, battle identity, original point
cost, HP carry, cancellation, settlement, rewards or replay safety.

The smaller `RequestAutoRegister` Gaa0df4 posts **auth5 only**, with keys
Gaa0e56/80/a0/ce/fa, route **`/gvg/ToggleAutoRegister`** Gaa1084/Gaa1086.
It does not submit a desired flag or nonce. A future implementation must close
the success callback and toggle/retry semantics; it must not call this an
idempotent set operation or turn a preference into enrollment.

## Data and concurrency evidence

The newer image extraction has a real deployment-conflict observation:
DataDump `findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-68.tsv:49`,
idx3398, `Screenshot_20210623-203259_Blustone-d817370ef64fb39e.jpg`.
Its transcription records “Currently, another Guild Member is deploying a
Defense Team. Please choose another spot.” with three+150 Guild bonus icons.
This corroborates a concurrent placement boundary, **not** a lease duration,
fee, CP table, original occupancy response, or an AP/contribution award.
No fresh screenshot inspection or private-cache read was performed.

Existing native GetInst card/deployment grammar remains authoritative:
cards are GvG ref_id/stat/skill snapshots without owned inst_id; deployments
are camp/order strings with four explicitly read string slots. Ordinary Guild
membership and ordinary owned Hunter references do not automatically create
these snapshots. See
`gvg-instance-card-deployment-native-2026-10-13.md`.

Likewise original populated season schedules, camp/link graph, point/CP
rules, reward rows, registrations and defender instances were not recovered
by this audit. GetInst's actual callback replaces its whole cache even without
a preceding success guard; a generic failure or invented empty snapshot is
not a safe configured GvG provider. GetRef requires a complete admitted
reference and is not made scene-safe by publishing empty arrays. See
`gvg-entry-instance-cache-native-2026-10-13.md` and
`gvg-reference-read-cache-safety-native-2026-10-13.md`.

## Concrete next implementation gate

The useful next source unit is **OccupyDefender's exact success/failure
callback and reservation record lifecycle**, then DeployDefender's callback:
identify occupied owner/slot, rejection behavior, replacement/cancellation,
expiry source, native cache changes and permission/phase gates. Do not invent
a lease timeout or copied ordinary-card ownership merely to make a request
succeed.

Once those contracts close, a pure deployment transaction over an
**independently supplied complete established** GvG season/reference and
per-player card/instance snapshot can be reviewed. It must preserve original
card strings/stats, actual Guild/server/player scope, uniqueness and
commitments, and refuse unknown camps/orders/phases rather than manufacture
them. Runtime publication still needs a safe complete GetRef/GetInst provider
and native scene validation. This is substantive preparation for a player
workflow; it is not yet a faithful playable deployment or combat revival.
