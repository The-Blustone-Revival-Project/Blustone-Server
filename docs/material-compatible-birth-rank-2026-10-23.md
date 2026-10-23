# Compatible material-only birth-grade projection

2026-10-23. New explicit LOCAL minimum-rank policy:
`BLUSTONE_HUNTER_MIN_RANK_PROFILE=material-catalogue-birth-rank-projection`.
This uses COMMUNITY-SOURCED catalogue birth grades, not recovered original
ordinary rank rules. Legacy and the existing global
catalogue-birth-rank-projection policies retain their prior behavior.

## Why a separate policy is needed

The existing full progression profile globally removes below-birth ordinary
stat rows. That excludes an already-owned legacy rank1 Mowgli002 because the
catalogue birth grade is2. The constructor correctly refuses incompatible
ownership before overwriting it, rather than promoting/deleting the Hunter,
but the global profile is therefore not a drop-in activation for that roster.

The new mode filters ONLY the existing eight material-backed identities:
009 Captain1,010 Vincent4,012 Karl3,013 Denali2,017 Lapis1,036 Bear3,
040 Bibi3 and049 Bright3. Its allowlist snapshots/freezes the shared
MATERIAL_ARCHIVE_IDS from material-stat-projection.ts. That module depends
only on filesystem/crypto/paths and does not introduce a bootstrap import cycle.
The new mode does not become a general catalogue filter.

All first-six001/002/003/004/005/006 reference objects are returned unchanged:
current stat rank coverage/numbers/growth, base/equipment/skill/dialogue data
remain the same as the materials baseline. Main001 remains exempt. Unselected
and awakened/costume IDs are not inferred from these eight base identities.
Selected material rows retain their existing source-backed numeric fields and
rank order; only rows below their own known catalogue birth grade are omitted.
Missing selected birth data or incomplete/reordered birth-through5 coverage
refuses instead of fabricating a row.

## Profile, ownership and grants

New INACTIVE current-e6-materials-compatible-progression.json is derived from
the existing full current-e6-materials-progression profile. Only name/source
and the minimum-rank mode differ. It retains139 exact selected original package
names/order, all resource paths and stamp1634683, indexed Episode skills and
the separately documented2019 material-stat projection. The older profile file
was not edited. Original final-version balance/growth/native execution remain
unverified; this does not convert those projections into original server data.

No saved rank, awakening, level/EXP, skill key, deck, wallet or inventory is
rewritten by selecting this mode. Existing supported rank1 Mowgli owners can
load, while a preexisting material Denali013rank1 is intentionally incompatible
and refuses before persistence. No automatic migration or compensation is
performed. The existing constructor still validates every owned rank/awakening
against published coverage in a nonlegacy mode; unsupported legacy rows
outside even unchanged reference coverage can still refuse. Check the actual
saved roster before activation; do not erase ownership to fit a profile.

Existing paid GachaPremium uses the selected reference's first stat grade for
these material Hunters, so a new paid013 is rank2 and a new paid049 is rank3.
Existing recruitBirthRanks for002..006 remain unchanged. Launcher's explicit
--recruit-card option selects the existing LOCAL paid target; it is not a new
pool/rate table or a grant by itself. Returning to legacy preserves compatible
earned higher-grade ownership rather than downgrading it.

Quick advancement remains gated to the exact existing GLOBAL
catalogue-birth-rank-projection string. This partial mode does not enable owned
ticket settlement or relax its separate eligibility requirements.

## Verification and limits

New tests/material-compatible-birth-rank.ts PASS in isolated TSX source imports:
three real production accounts created under the legacy materials profile keep
main001/Mowgli002rank1 and reload under the new mode with complete save bytes
unchanged. The first-six reference definitions remain exact; all eight selected
material references match the existing full profile's numeric/skill/grade data.
Actual paid013 recruitment costs30 Manda and grants rank2 without changing
starters, peer games or decks. Legacy return retains the earned save exactly.
Unknown target/mode, malformed selected coverage, frozen-allowlist mutation,
incompatible prior013rank1 and quick-ticket enable attempts are covered.

This lane did not build dist, activate a profile, load live private saves,
control a native client or grant a live Hunter. Compiled/full regression and
private-copy compatibility validation are owned by root before any activation.

## Root integration and activation

Full230-program npm test, TypeScript build, compiled new test, resource
preflight and independent review PASS. Root separately loaded a disposable
copy of the actual three-game save and verified complete game values and
file bytes unchanged. The live idle save then remained byte-exact when
listener57224 selected this named profile with --recruit-card049.

Existing +15 instrumented client restarted normally, fetched GetCard200 and
reached Village with zero package downloads. All three saved games were exact
before the draw. One native30-green-Manda draw granted Bright049/rank3/EXP0
as owned1000018, initial skills[1,1,1,0,0], lock1; roster10->11. Only normal
clocks, new roster/book/allocator and free Manda changed; existing owners and
other two games retained exact values. Native original reveal/name/art/rank/
role/element and detailStrength7367 verified. See the dedicated acquisition
note; full original ordinary balance and native skill execution are separate.
