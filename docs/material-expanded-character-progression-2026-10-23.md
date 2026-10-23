# Expanded character progression: historical stats and selective birth grades

The inactive `current-e10-expanded-character-progression` profile extends the
previous six-Hunter skill expansion with two explicit policies. It keeps the
same210 original packages, ordering and resource stamp1634695, and changes only
`BLUSTONE_MATERIAL_STAT_PROFILE=archive-2019-expanded-projection` and
`BLUSTONE_HUNTER_MIN_RANK_PROFILE=expanded-material-catalogue-birth-rank-projection`.
The old modes and defaults remain unchanged. No profile is activated here.

## Five numeric archive projections, one explicit unknown

The stat mode preserves all eight earlier material observations and adds five
numeric2019 archive rows, for13 projected identities. Every one of12 numeric
wire fields is copied from the pinned TSV observation, including speed and
secondary percentages; the current fixture growth and selectors remain intact.
Historical HP/ATK/DEF readings and speed are:

- Rebecca021:1624/893/580, speed8.
- Riko024:1624/682/821, speed7.
- Gullveig039:1521/1021/689, speed7.
- Edward041:1821/718/901, speed7.
- Windblade052:1955/992/835, speed8.

These are displayed community archive observations. Their shown level and gear
state are unknown. Applying them as repeated rank bases is an explicit LOCAL
balance policy, not recovery of final ordinary level1 values or rank growth.
The source is `resources/reference/archived-hunter-database-2019.tsv`, SHA256
`778e41835a8c44f21652abcb9c10de021afb2871292af8aba3431e71b9fef54e`.
The source validator checks the pin, selected status, timestamp, URL and all
numeric columns; defensive copies prevent callers changing the cache.

Genovia056 has `non-numeric-core-stats` and question marks in that source.
It remains on the prior explicit HP1000/ATK100/DEF50 fixture. The mode does not
convert missing values into zeros, infer ratios or borrow another Hunter's
stats. Sienna020 is also outside this expansion. Default observation helpers
and the exported old eight-ID list retain their previous behavior.

## Fourteen selective community birth grades

The new birth mode retains the old eight identities and adds021/024/039/041/
052/056 with grades2/2/3/3/4/4 from the provenance-preserving community catalogue.
Genovia's supported rarity claim is separate from its unknown numeric stats.
Native GetMinRank reads the first stat row, so ordinary rows below the selected
grade are filtered while row order, values, growth and awakened rows remain
intact. Main001, legacy001..006, Sienna and every other unselected reference
remain unchanged. This is still community projection, not an original server
birth-rank table or permission to change an already owned Hunter.

Fresh selected-target recruitment follows the first supported rank with the
same existing deterministic target policy and30-Manda single-pull fee. Paid
Windblade and Genovia now start at projected rank4. Their expected eligible skill
keys follow the existing factory; receipt aliases and shape otherwise stay the
same. No free instances, extra claims, probability table or ticket authority is
added. The existing global-only quick-advancement guard still refuses this mode.

An existing owned rank below the newly selected minimum refuses startup without
rewriting the save. No rank, EXP, book or wallet is silently migrated. A user
with an old rank1 Windblade/Genovia can keep the earlier profile; this candidate
is not an automatic save repair. Valid rank4 captures reload normally.

The existing local Library trace metadata derives its displayed grade from the
first stat row, so those six display ranks change. All other fields remain the
same, and the actual acquisition link list is exact. These navigation rows do
not supply a redeemable item, original trace ID, drop or exchange entitlement.

## Verification and pending native work

Pure/source tests compare every independent TSV column and complete reference
snapshots. Stat-only selection changes exactly five numeric bases and keeps
all24 other references exact; birth selection keeps all23 unaffected references
exact while filtering the selected six. All original skill graphs, fixture
growth, starter inventory, fixed recruitment map and acquisition links remain
unchanged. Malformed/pin-changed inputs, missing rank coverage, wrong order and
unknown modes refuse.

The signed P384/AES HTTP test preserves three disposable earned games with an
actual paid Bright rank3, legacy Mowgli rank1 and distinct progression/decks.
It verifies both real paid052/056 rank4 draws, the unchanged fee, receipt shape
and expected rank/skill-key delta, untouched peers, invalid old rank1 refusal
without overwrite and valid cold reload. The earlier modes still pass their
regression programs. `material-expanded-progression-http-2026-10-23.md` records
the evidence distinctions and test details.

Root also copied the CURRENT private save and restored independent copies under
the previous expanded-skill profile and this combined profile. All three actual
schema14 game objects remained exact; neither copy was rewritten and the live
file was byte-identical before and after. None owns an affected new Hunter.
Private evidence remains ignored under Server local/private. Other users' saves
must be checked independently; these are global reference policies.

```text
npm run test:material-expanded-progression
npm run test:profiles
npm test
```

The server build, focused pure/state/encrypted HTTP and previous-mode tests pass.
Full regression status is recorded in AGENTS.md and local/material-progression-
{focused,profile-tests,full-tests}-20261023.log. No schema change is required.
No live profile/server/client activation, game input, claim, save edit, original
or DataDump change, APK patch/build/install/release occurred. Native210 boot,
reference-cache refresh, portraits, stats, skills and combat remain pending.
The six skill graphs are still partial and ordinary final balance remains
unrecovered. E6S04 remains an earned progression gate; the goal remains active.

Full `npm test` passed259 programs (256 prior plus three new), and all11 profile
programs passed. Independent source/minimum-rank review found no concrete issue.
