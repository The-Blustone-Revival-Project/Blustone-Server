# Guild level references, benefit selection and exact fee arithmetic

Source evidence only. No numeric Guild rows, membership, fees or rewards were
invented; no live input/save/client/APK or DataDump change. Immutable original
ARM SHA256 is `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G coordinates are ELF code offsets plus10000. The original paths are
`/reference/GetGuildLevelBenefits` and `/reference/GetGuildLevelBenefitsStr`
(native string coordinates G01d901d2/G01d901f3).

## Exact reference envelopes and fields

`CSRSyncRef.ReqGuildLevelBenefitsCB` Gf85008 obtains Guild singleton at
Gf8501c, selects `ret_data` at Gf85026/028 and tail-calls ParseLevelBenefits
Ga81030 at Gf85034. String callback Gf8503c similarly selects ret_data
Gf8505a/05c and tail-calls ParseLevelBenefitsString Ga818bc at Gf85068.
These callbacks check native HTTP result1 when a response object is present.
Numeric response is a **bare ret_data collection of level rows**. String
response is a **ret_data object**, not level rows or locale-keyed arrays.

Numeric rows consume uint32 `level` (Ga810f8/fc; store Ga8117e) and uint32
`contribution` (Ga81100/102; store Ga811ca). Presence of each optional key
adds one typed uint32 benefit:

- `equipment_level_up`: key Ga811f2/f8, value lookup Ga81248, map type1/value
  insertion Ga812c6..cd2; hardcoded mode1.
- `gem_level_up`: key Ga81314/31a, value lookup Ga8136a, type2/value insertion
  Ga8140c..41a; hardcoded mode1.
- Exact misspelling **`traning`**: key Ga8145c/462, value Ga814b2,
  type3/value insertion Ga81530..53e; hardcoded mode1.
- Exact spelling **`intrust`**: key Ga81580/586, value Ga815d6,
  type4/value insertion Ga81654..662; hardcoded mode1.
- `ap`: key Ga816a4/6aa, value Ga816fa, type5/value/mode insertion
  Ga81780..786; mode0. `sl` is zero throughout this row construction.

No nested `benefits`, `type`, `value`, `mode` or percent object is consumed.
Zero present values remain present benefits. Missing keys omit benefits;
they must not silently become zero multipliers. Loose JSON numeric conversions
exist in the native parser; a configured server can admit exact integer
uint32 values only and avoid truncation/string aliases.

String parser independently checks the same optional keys and extracts a
string using native JSON string conversion (equipment Ga81958..96c). Its
type1..5 map stores text, not numeric benefit data. Equipment/Gem/training/
entrust/AP key resolution sites are Ga81904, Ga81a60, Ga81bb6, Ga81d2a,
Ga81e80 respectively. Missing strings need not be fabricated; empty native
reference representation is `{}`. The parser inserts entries into its existing
type map (equipment insertion Ga819d2..a20); it does not perform the full
cache clear used by numeric rows. No current-locale selection is established
inside this parser. Publication cannot turn description strings into prices.

## Level ordering and contribution source

ParseLevelBenefits first clears its existing list at manager+dc/e0/count+e4
(Ga8104c..086). Each parsed row is inserted at the FRONT (Ga817da..7f0), so
native storage reverses wire order. The numeric table must have a supported
explicit ordering; sorting input silently changes what the parser receives.

`CalcLevel` Ga7f9e8 returns0 when contribution==0 (Ga7f9f4/Ga7fae8), or when
the level-list count is zero (Ga7fa04..0a). For positive contribution it
examines the head/highest row first: contribution>=head threshold returns
head level (Ga7fa10..18/Ga7faec). Otherwise it walks from tail toward head,
selecting the row whose threshold<=contribution<next threshold
(Ga7fa90..ab8). Below the first threshold returns0. A strict ascending wire
table with increasing levels and contribution thresholds makes these
intervals deterministic; exact originals are still absent.

`FindBonusBenefit` Ga7fb80 checks **personal Guild ID!=0 only**, at
Ga7fbd2..bd8. It does not test status3, leader/member role or newbie here.
It resolves that ID against the Guild INFO cache. On a matching record it
loads **INFO.contribution** from INFO+8 (Ga7fcf8), calls CalcLevel Ga7fcfc,
then GetGuildLevelRef Ga7fd06. Personal MEMBER/PLAY_DATA.contribution does
not supply this level. The selected level's map is searched by exact
benefit type (Ga7fd1c..3a); absent benefit returns null Ga7fd3c. Missing
Guild INFO returns null Ga7fcf6/Ga7fd4e. No Guild ID returns null
Ga7fcb6..bc. Pending status1 is not a separate exclusion in this function:
if its personal ID and matching INFO exist, this lookup still runs.

`GetGuildLevelRef` Ga7fe00 caps requested levels above the head level to
that head row (Ga7fe4c..84); otherwise scans for exact level
(Ga7fe50..62), returning an empty LEVEL when absent (Ga7fe64..78).
The function **unconditionally loads and copies the list-head LEVEL before
checking anything resembling empty-list state** (Ga7fe2a..46). A zero
numeric-table count makes that head the sentinel, rather than a real LEVEL.
Therefore joined Guild + empty numeric references is NOT positively proven
as a native-safe null-benefit/base-price case. Do not enable a fee path from
that assumption. A nonempty strict configured table provides real LEVEL
storage; an absent type within such a selected/missing-level result can
truthfully take the null-benefit arithmetic branch. Original minimum level,
thresholds and benefits still must not be guessed.

## Fee consumers and modes

CalcBonusSaleValue Ga7ff08 calls FindBonusBenefit Ga7ff16. Null selection
returns the input uint32 price without float conversion (Ga7ff1c/7ff4e).
Mode1 reads uint32 value, converts it to float32, divides by original
1000.0, converts price to float32, multiplies, then converts back with
truncation/saturation (Ga7ff26..46). It is a per-thousand **multiplier**,
not percent discount subtraction. Other modes add value modulo2^32
(Ga7ff4c). `equipment-fee.ts` and the pinned original-body Unicorn cases
already verify this arithmetic; see `equipment-fee-guild-native-2026-10-11.md`.

A bounded halfword-aligned original Thumb BL scan of ELF610000..1c00000
found five direct consumers targeting ELF a6ff08; their local argument
windows independently establish:

- Equipment next-level quote: benefit1 Gbd6952/954. Material quantities
  copied separately; benefit does not reduce item consumption.
- Gem next-level polishing quote: benefit2 Gbce90a/90c. This does not
  recover success probabilities, roll assignment or complete polishing.
- Hunter raise/training: benefit3 G101ccf0/cf2, supplied price from
  CSRCardInfoContainer.GetCardRaisePrice G87f2fc (call G101cce8).
- Hunter rank-up: also benefit3 G1039cf4/cf6, supplied price from
  GetCardRankUpPrice G87f322 (call G1039cec).
- Expedition entrust: benefit4 Ge7999e/9a2, literal150 at Ge799a0 in
  CSRSceneMStageEntrust.SetCharList Ge794fc. **Later consumer closure proves
  this is150seconds per run, NOT gold**: Calculate formats its adjusted
  result times run count as TX_TIME. Stage-derived fuel is separate. See
  entrust-search-expedition-unit-split-native-2026-10-13.md. This is not
  a recovered benefit magnitude or permission to enable settlement.

AP type5 is additive in the level parser; no fee call above uses it. AP cap/
refresh interaction requires its actual consumer and must not be inferred.

## Available data and configured boundary

The preserved `all-tables.json` has 13 stock tables: skill reference/tag/effect/
description, tag reference, character strings, ingame talk, admin IDs, episode
UI, UI text/JSON/XML and bad words. A bounded scan of every raw row in these
13 tables found no `equipment_level_up`, `gem_level_up`, quoted `traning` or
quoted `intrust` key. These network numeric Guild references are not present
in that preserved static extraction. This is a corpus result, not a claim
that the original service had no benefits. No original numeric thresholds,
benefit magnitudes or description response rows were recovered in this audit.

An explicit configured contract can publish authenticated numeric row arrays
and independent description objects with exact five spellings. Admit detached
uint32 scalars, reject unknown nested fields/duplicate levels/non-increasing
threshold order, retain absent versus zero values, and refuse unsupported
empty-table affiliation fee selection. Derive selection from authoritative
personal Guild ID plus current matching INFO contribution, never request
affiliation or personal contribution. Root owns implementation/integration.

## Implemented configured scope and independent review

`guild-progression-reference.ts` now admits detached explicitly supplied
numeric rows with required base level0/threshold0 and strictly increasing wire
levels/thresholds. That base requirement is a conservative **local admission
policy**, not a recovered original first row. Optional fields retain missing
versus present zero. Its selector handles contribution0, exact boundaries and
the final-row cap, returning type1..4 mode1 or type5 mode0. Benefit description
objects are independently configured using the original spellings.

ServerState snapshots these options/environment tables and clones publication
responses. Unconfigured references preserve the unaffiliated boot's canonical
empty numeric arrays/description-and-points objects; a nonzero personal Guild
ID (including pending) instead receives failure2001 before unsafe native cache
replacement. Explicit empty configured numeric tables still refuse. Empty
defaults do not establish safe affiliated progression UI or zero mileage
divisors: supply valid numeric tables before entering that UI.
Equipment **level** fees can use the validated published table and matching
authoritative INFO aggregate contribution. A selected row without type1 yields
null/base-price arithmetic; that is distinct from an absent table. Pending
personal status1 is not given an invented native eligibility exclusion.
Affiliated equipment rank/source-Hunter operation remains refused; Hunter
raise/rank, Gem polishing, entrust, AP, donation and reward settlement are not
enabled by reference publication.

Independent review re-ran `tests/guild-progression-reference.ts` and
`tests/guild-progression-state.ts`; both passed. Selector/float32 modes,
aggregate versus personal contribution, immutable reference publication,
missing-reference refusal and unchanged Guild/peer state match the recovered
boundary. No live native benefit or original numeric row is claimed verified.

This closes the native Guild benefit mechanism and a configured equipment-level
consumer. Original producer tables, donation/level-up progression, rewards and
AP consumer policy remain missing.
