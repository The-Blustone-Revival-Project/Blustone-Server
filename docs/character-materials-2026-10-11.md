# Ordinary Hunter catalogue expansion

`src/character-materials.ts` preserves 113 playable-reference identities from
DataDump `datasets/hunters/identities.json` (source snapshot SHA-256
`b3fd3db855913d41b45c2e2309c9562eb064564238f541909d1f296309a2bbe2`).
It includes exact original title, summary, named gear and victory text alongside
separately labelled community name, role, element and birth rarity. Every claim
retains its source path, hash and locator. Unknown values remain null.

The current ordinary GetCard roster has six references (001–006). Eight more
ordinary identities already have every required original base body, portrait,
effect and voice package selected in unchanged `current-e6.json`: Captain009,
Vincent010, Karl Steiner012, Denali013, Lapis017, Bear036, Bibi040 and Bright049.
No resource-profile edit or APK rebuild is needed to prepare their references.

These ordinary identities are not Episode actor identities. For example,
ordinary007 is Metis, not the Episode Karl rendered with C007; ordinary012 is
Karl Steiner. Similarly009 is Captain and036 is Bear. Artwork reuse does not
recover a shared name, role, element, or balance table.

`characterMaterialCoverage(packageNames, publishedIds)` provides strict
metadata/material readiness. It requires exact Cxxx, Cxxx_Q, Cxxx_EFT and
Cxxx_SND package names; absent Q art is not replaced with a costume or Episode
portrait. Awakened and costume catalogue rows stay visible in the identity
registry but cannot become automatically prepared ordinary reference rows.

`additionalMaterialReferences` builds additive rows for the eight candidates.
The GetCard bootstrap seam now selects it only when
`BLUSTONE_CARD_REFERENCE_PROFILE=materials`. Omission or `starter` keeps the
original six rows byte-identical. Unknown profile values refuse startup. The
seam supplies separately documented local legacy stat rows (all ranks1–5,
HP1000/ATK100/DEF50, retained local growth) and existing neutral
`fixtureSkillSlots` function. It does not extend archive projections or adopt
Episode actor stat/skill magnitudes. The new `is_main:0` is explicit local
metadata, not an original recovered main-character claim.
It never changes published references or generates owned instances. All ordinary
references still require native registration/UI validation before claiming
playability. CardBook has existing neutral role0–4 coverage; its neutral bonuses
remain local policy and adding reference rows does not award collection entries.

All eight candidates have numeric 2019 archive observations in the already
imported `archived-hunter-database-2019.tsv`. Their page level and gear state are
unknown. This patch deliberately does not use those as new balance bases or
extend `ordinary-stat-projection.ts`; doing so requires a separately explicit
local projection policy. Original final-version base stats and ordinary skill
magnitudes remain unknown. Empty equipment/dialogue lists and neutral skill
slots remain fixtures; named gear and symbolic original text cannot manufacture
combat equipment or journal records. No recruitment pool or ownership changes
are proposed by this patch.

Validation: `npx tsx tests/character-materials.ts` and `npm run build` pass. The
test checks all original claims against imported CHAR_STR bytes, exact candidate
identity mappings, missing-portrait refusal, costume refusal, independent new
row copies and input preservation. Fresh subprocess imports prove default vs
explicit starter byte equality, materials14 references, all original references
unchanged, partial/no-material refusal, invalid profile refusal and identical
inventory/birth/gacha output. This patch performs no ADB/UI input, live
activation, save changes, DataDump edits, commit or publication.
