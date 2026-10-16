# Optional local friend-defense preparation

`BLUSTONE_FRIENDLY_BATTLE_MODE=local-owned-defense` reconstructs
`/world/GetFriendlyBattleInfo` from a real local friend's owned defense team.
Default remains guarded2001. The handler prepares the native opponent cache;
direct Android scene/battle validation remains pending. This checkpoint does
not alter the retained live profile or any private save.

## Native flow and selected local policy

The [native audit](friendly-battle-preparation-native-2026-10-16.md) binds auth5
plus `target_pvid` to `ret_data.rival`, then ParseFreindlyBattleRival and the
complete ParseDefender grammar. The user-info continuation sets `rival_pvid`
and pushes scene0x54; failure10177 selects ONLY_FRIENDS. That scene bypasses the
normal BP gate, and OnFinish takes a local FCFriendlyResult branch instead of
normal network Complete. Neither this handler nor a new completion route
debits BP or awards honor, rating, EXP, gold or items.

Native own attack selection is deck4. The request contains no target formation
selector, so using explicit saved defense deck5 is **LOCAL policy**, not a
recovered original backend rule. Both formations must exist with exactly five
dense slots, unique owned nonzero IDs and at least one selected Hunter. Missing
formations refuse; no deck is copied, inferred or persisted. Users can configure
their Fight Club formations through the existing game flow before testing.

Admission requires an authenticated real account and an accepted, unblocked
friend on the same local server. Both block directions are checked. Unaccepted
or blocked peers return10177; invalid/self/unknown/cross-server targets refuse.
Synthetic Arena/mail identities cannot become friend opponents. Target IDs
are canonical positive uint32 values as a local model bound; the original wire
builder itself carries full64. Client-supplied teams, fees and rewards are not
accepted. An active ordinary/Arena/Search attempt blocks the attacker's entry.
The friend's ongoing activity does not modify its saved defense snapshot.

## Collision-free transient participants

Owned card allocation is local to each account below900000001. Thus two users
can own exactly the same instance IDs. Native global actor lookup compares
the full serial without a camp key; simply copying those IDs across camps is
ambiguous. The reply instead assigns selected defender slots the reserved
response-only serials9100000001..9100000005. Zero slots remain `{inst_id:0}`.
Slot order and every current public native card field are preserved, including
grade/EXP, skill levels, gear, skin, lock and registration data. Unknown private
per-card fields are omitted, not spread into another user's response.

The source save and local attack IDs are never renumbered. Aliases are checked
against both users' card and Gem identities. Any collision refuses instead of
silently changing a stored identity. Repeated preparations are detached reads;
no persistent mirror roster or admission token is allocated.

Mounted Gems need the same care: MakeStageInst joins rival Gem target_inst_id
against the full card serial, including both words. Gem target links therefore
map to the corresponding card alias, and Gem instance IDs also receive distinct
response-only aliases beginning9200000001. All source Gem records are validated
against configured references, owned targets, native slot/position limits and
equipment ranks before projection. Only mounted Gems affecting selected
defenders are returned; unmounted and other-team Gems contribute no effects to
this defense and remain private. Missing/invalid Gem references refuse rather
than producing an empty approximation.

Gem `ability` text and known raw ability/stat fields preserve their native
units. Parsed normalized numbers are not serialized back as raw inputs.
Tests independently parse the source and mirrored rows and compare projected
effects, while confirming the new target linkage. No original Gem magnitudes
or set-effect laws are invented. The existing configured Gem reference/combination
tables still determine client effects.

## Readiness and public profile

Selected cards require published ordinary rank/awakening rows. Baseline gear1/1
can retain the existing neutral empty equipment fixtures; nonbaseline gear
requires matching configured slot/rank/awakening references. Actor attack cards
and their mounted Gems are validated too. Skills and gear are copied as owned,
not upgraded. Original skill/stat balance and broad native UI completeness
remain separate reconstruction work.

The response includes actual nickname, profile message, leader-or-first-defender
thumbnail, user/VIP EXP, arena counters and saved battle comments. Country stays
unknown/empty. Friendly rank0, current neutral collection effects and empty
chain effects are explicit local presentation policies, not global standings or
original aggregate buff calculations. The actual collection reference is checked
to remain neutral; introducing nonzero collection effects requires a proper
friendly projection first. No account tokens, extra_data, unrelated owned cards
or unmounted Gem inventory are exposed.

## Read-only behavior and verification

The handler reads loaded accounts/games directly. It does not create a game,
settle expired energy clocks, write friendship/deck state, allocate IDs, start
an authoritative match or settle rewards. The callback itself triggers native
scene entry, so preparation remains opt-in until device validation is possible.
No new save schema or client APK is needed for this server-side work.

`npm test` includes pure and state checks. `npm run test:friendly-battle` builds
and runs compiled model/state and independent P384/HMAC/AES HTTP proofs. Tests
cover overlapping real owned IDs, explicit teams, both friendship directions,
pending/blocked/cross-server/self/auth refusal, private-field filtering,
detachment, unchanged expired clocks and exact save bytes, successful reads with
a blocked temporary-write path, collision refusals, configured gear and mounted
Gem preservation, same-key/OTP process restart and disabled mode. The HTTP child
uses an ephemeral loopback port and disposable accounts, with no live native
battle claim. Source originals, physical devices, Collector, Docker and
inference remain untouched.
