# Native first-stat rank and an optional catalogue projection

`BLUSTONE_HUNTER_MIN_RANK_PROFILE=catalogue-birth-rank-projection` removes
ordinary stat rows below a known community birth grade for non-main ordinary
references. Default `legacy` preserves the current reference arrays. This
corrects one reference-level obstacle to native character discovery and the
automatic quick-advancement popup. It does **not** enable ticket consumption or
prove the remaining original entitlement rules. Android validation is pending.

## Native evidence and scope

GetMinRankG87b302 loads the stat-vector begin/end at CardInfo+a0/a4, returns0
when empty, and reads the rank word from the FIRST pointed stat entry at
G87b30e/G87b32e orG87b34c. It is not a min-scan or a separate rarity field.
The same vector supplies GetStat(rank,awakening). Original ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.

QuickRankUp.IsAvailableConditionGcb45d8..45e4 admits current ranks3/4, then
compares the reference's GetMinRank against that current rank atGcb45f4..4600.
The [bounded native audit](quick-advancement-use-item-native-2026-10-16.md)
also records same-reference competitor exclusion, preview rank+1/level1 and
pending timer/entitlement gaps. The [presentation audit](quick-advancement-presentation-evidence-2026-10-16.md)
independently shows level1 before and after in the preserved package preview.

The revival's ordinary references generally repeat a numeric fixture across
rank1..5. Consequently Mowgli/Nene and many material-backed characters expose
first rank1 even when the existing community catalogue claims a different
birth grade. This affects native reference selectors; changing only a server
ticket handler would leave the popup gate unreachable for those references.

This optional projection uses already accepted `characterIdentities` rarity
claims, including their COMMUNITY-SOURCED labels and per-field source paths,
hashes and locators in `src/character-materials.ts`. It is not a recovered
original server rarity table. Only canonical three-digit ordinary IDs with
known grades1..4 are considered. Unknown/awakened identities remain unchanged.
The current main-character row is explicitly exempt: its user-name fixture
is not an authoritative join to catalogue Lantern, whose rarity claim is3.
The fixed Search helper using main001/rank1 therefore remains coherent.

No stat values are scaled or replaced. Projection retains row order and every
numeric/growth field at each retained grade, removing only ordinary rows below
the selected grade. The resulting first row must be the birth grade with
ordinary coverage through5; an incompatible reference fails startup. Examples
under the current starter profile: main001 first1, Mowgli002 first2, Nene003
first3, Tyltyl004 first1, Gerard005 first2 and Sylvester006 first1.

## Ownership and factory consistency

Restoring a save under this mode verifies every owned card's exact rank and
awakening row exists in the projected reference. Failure occurs before saving
or namespace-migration persistence. A legacy Mowgli1 or Nene1 therefore blocks
activation; the implementation does not promote, remove or renumber it. Use
legacy mode for that account until a separate evidence-backed plan exists.

Compatible saves load without rewriting bytes, clocks, ranks, EXP, skills,
equipment, decks, books or journals. No ownership migration, grants or new state
schema is introduced. Returning to legacy retains earned higher-grade cards;
the old reference rows still include those grades.

For NEW cards in the opt-in mode, default instance factories select the first
published grade. This covers the fresh Mowgli starter and transient Arena rival.
Main001 and the fixed Search helper retain rank1. Gacha retains the existing
known birth-grade map; previously unmapped material-backed references use their
projected first row instead of falling back to an unsupported rank1. Bundle
guarantee selection uses the same helper. Explicit trace grants005/006 remain
rank2/1 and match their references. Recruitment pools, prices and dorm admission
are unchanged. Fresh factory ranks initialize eligible skill slots through the
existing cardInstance implementation; existing owned skill fields are untouched.

Native rank-keyed consumers such as sale-profit lookup now see the projected
first rank. Operators must review separately configured rank-keyed price tables
when testing this profile; the projection does not invent original sale prices.
Episode, battle and Android UI integration remain unverified under this mode.
It is not selected in the retained live profile by this checkpoint.

## Checks and continuation

`npm test` includes source policy/state tests. `npm run test:hunter-min-rank`
builds and runs compiled policy/state plus encrypted HTTP checks. These cover:

- Legacy reference equivalence and exact retained-row values/order.
- Main alias and Search helper preservation; new factory stat coverage.
- Fresh starter, default Mowgli and override Nene recruitment.
- Material-backed unmapped recruitment using supported birth grades.
- Real compatible/incompatible legacy saves in separate processes, with exact
  byte preservation and no ownership rewrite.
- Compiled HTTP P384/HMAC/AES reference/inventory/gacha/restart behavior on an
  ephemeral loopback child, including rejected legacy startup before listening.

SU1/SU2 metadata, pending purchase lifecycle, actual result rank-up counter and
original award/entitlement policy remain incomplete. `/world/UseItem` keeps its
non-success guard. Source research and projection work use read-only DataDump
evidence; no physical device, private save, client build, original asset, Docker,
Collector or inference endpoint changed. See AGENTS.md for actual check results.
