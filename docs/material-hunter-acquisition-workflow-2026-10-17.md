# Paid material-Hunter acquisition and progression workflow

The existing `/shop/GachaPremium` implementation can recruit all eight
material Hunters covered by the indexed skill projection. Publishing a
reference alone does not grant ownership, and this workflow introduces no new
pool, trace drops, free Hunter grant or original probability claim.

This is a host workflow for an explicit LOCAL replica policy. No profile is
activated, saved account changed, APK installed or native battle/rendering
validated by this note. Device input hold remains in force.

## Existing acquisition route and explicit selection

`ServerState.gachaPremium` authenticates the account and selects the already
published nonmain reference named by `BLUSTONE_RECRUIT_CARD`. A single native
`cnt:1` draw awards that Hunter through the normal paid recruitment handler,
allocator, card-book update, response grammar and persistence. No directly
authored inventory row is necessary. The single result is one card object;
the11-draw result is an array. Popup-only index/duplicate/reward metadata must
not become persisted card-instance fields.

The default selection is not a14-Hunter pool: omitted configuration selects
the existing002 fixture, while the prepared E6 materials profile selects004.
The existing11-draw policy may substitute a published birth-grade3-or-higher
Hunter for one slot. All other draws use the explicitly selected reference;
this is deterministic LOCAL selection, not reconstructed original RNG,
production pool membership, featured rates or a rotation schedule.

The launcher merges profile settings over inherited environment values, so a
profile's004 setting otherwise takes precedence over an outer shell value.
`scripts/start-local.mjs` now implements an explicit `--recruit-card` override
after that merge. It checks canonical three-digit syntax and excludes000/001;
the server's published-reference gate still determines whether a draw can
award the selected ID. Unknown999 is not made publishable by this option.
Code review confirms the positive override precedence; invalid CLI arguments
were actually invoked and refused before state creation/server spawn. A
positive launcher-process run with this option has not been validated by the
paid-progression proof. No new draw policy follows from the usability change.

## Prices and historical scope

The existing normal prices are30 Manda for one draw and300 for11, charged
once using free Manda first. Unsupported coupon instances remain refused;
an item request must not silently become a paid draw. Capacity, owned-ID
allocation and durable ownership checks still apply. These existing price,
guarantee, allocation and ordering rules are LOCAL replica policy even where
historical screenshots corroborate individual displayed prices.

DataDump's published manual lane
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`
has repeated30/300 price banners, for example `batch-22.tsv:12`/idx1061,
`batch-15.tsv:37`/idx736 and `batch-31.tsv:17`/idx1516. The guaranteed grade
varies across historical banners: idx399 (`batch-08.tsv:50`) and idx791
(`batch-16.tsv:42`) say at least one3-star, whereas1061/736/1516 say2-star
or above. Do not infer a universal final-server guarantee or original
probabilities from these different, often undated promotions. The source
images do not recover an eight-Hunter original pool.

## Birth grade and required reference readiness

The full prepared package/reference selection is required. Setting only
`BLUSTONE_CARD_REFERENCE_PROFILE=materials` without the complete selected
art kits does not make all these references publishable. Unknown/unpublished
recruit IDs cannot justify allocating a new owned card.

Under `BLUSTONE_HUNTER_MIN_RANK_PROFILE=catalogue-birth-rank-projection`,
the existing reference/recruitment path yields these first/recruit grades:

- 009 Captain1;010 Vincent4;012 Karl Steiner3;013 Denali2.
- 017 Lapis1;036 Bear3;040 Bibi3;049 Bright3.

Those grades derive from **COMMUNITY-SOURCED catalogue rarity claims**, not
original server recruitment responses or the113 derived at-draw estimates.
The profile filters unsupported lower ordinary stat rows without inventing
new stat values. Legacy mode intentionally retains the older rank1 fallback
for these eight references; do not describe that fallback as original birth
grade evidence.

The inactive `current-e6-materials-progression` profile is prepared from the
skills profile plus the existing historical material-stat and catalogue
birth-rank flags. It retains139 package groups and stamp1634683; no art or
default active profile changed. Its use is fresh or already compatible disposable
saves. An old owned002/rank1 row is incompatible with a projected minimum2;
startup must refuse before writing rather than promote/delete ownership or
silently rewrite the save. See `hunter-minimum-rank-projection-2026-10-16.md`.
This note does not activate that candidate or authorize migration of a live
legacy save.

## Earned ownership through ordinary operations

The substantive validation path is paid single recruitment, followed by
ordinary owned-card operations: restore the exact allocated instance, train
an eligible skill with `/gym/SkillUp`, select it with the real deck/leader
routes, start/complete an ordinary mission protocol and verify earned EXP
and durable card-book/ownership state after restart. The factory initially
publishes all five skill-level keys, including0 for locked tiers, and newly
recruited cards remain locked. Deck/leader selection of a locked owned Hunter
does not imply permission to consume it as training material.

Only the eight audited indexed skill graphs are projected. Ordinary final
skill magnitudes/growth remain unknown; encounter graphs are LOCAL ordinary
adoption. Historical material stat rows likewise retain their explicit scope
and unresolved gear/level conditions. Neither reference policy changes owned
skill/rank fields merely to make a new effect eligible.

The trace route is separate: actual exchange remains whitelisted to005/006.
Library navigation rows and historical denominators for009/012/013/017/036/040
do not create trace stock, drops or exchange eligibility. Vincent010 and
Bright049 retain unresolved threshold holds. An acquisition workflow must not
fund or enable those exchanges from display-only evidence.

## Completed host proof and remaining scope

Root reports TypeScript build and compiled
`tests/material-hunter-progression-http.ts` PASS. The disposable proof obtains
all eight through real30-Manda draws: **240 Manda total**, with no authored
material ownership or wallet top-up. It uses the existing large LOCAL startup
wallet fixture; that balance is not an original starting-economy claim.

The P384/HMAC/AES HTTP checks verify the native single-card result object,
community-projected birth grades, unique real allocated IDs, initial lock,
all five skill-level keys, card-book entries and no popup metadata in persisted
inventory. Each acquired Hunter trains skill1 from1 to2, becomes actual leader
and deck participant, and receives EXP from a protocol-reported ordinary
mission win. Previously acquired nonparticipants receive no extra EXP. Total
Manda/gold behavior, unrelated peer state, existing starters and Episode
progress are preserved as asserted by the test. Unknown recruit999 awards
nothing and does not rewrite the save.

A fresh ServerState restored from the durable file preserves acquired rows
and complete save bytes. The strengthened compiled proof then closes the old
HTTP listener, constructs a replacement createApp from that file, binds a new
ephemeral port and reuses the original secure client/token for targeted
encrypted `/world/RefreshInven`. It verifies absolute owned rows, persisted
transport/auth continuity and unchanged save bytes. This is app/server-state/
transport restoration in the **same OS process**, not an OS process restart.
Root reports the strengthened compiled build and test PASS. Original source-
graph/reference checks and incompatible birth-profile save refusal are covered
separately by the existing indexed skill and minimum-rank tests.

The new proof does not exercise a capacity-full recruitment refusal, original
draw probabilities, coupon acquisition or native gameplay. Its mission outcome
is supplied through the normal protocol settlement path, not measured combat.
HP/Rage effects, portrait/cut-in rendering, actual skill use, native battle
victory and live profile activation remain unverified.

Reproduce the compiled protocol proof with `npm run test:material-progression`.
For separate host experimentation, this explicit isolated launch selects the
existing paid Denali target while preserving the prepared profile and live save:

```powershell
node scripts/start-local.mjs --profile current-e6-materials-progression --recruit-card 013 --state-file local/manual-material-test.json --host 127.0.0.1 --port 18081 --base-url http://127.0.0.1:18081
```

The example is a host-only disposable setup, not a native activation instruction
or a verified positive launcher-process run. It creates no material Hunter until
a real funded recruitment request is accepted. Default/live configuration is
unchanged. Unknown well-formed IDs still depend on the server's published-reference
check and cannot award an absent Hunter.
