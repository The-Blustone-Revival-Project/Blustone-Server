# Gem combination model: original native evidence, explicit tables

`gem-combinations.ts` implements a pure supported reference parser and set
aggregator. Authored test rows are not original balances. As of2026-10-13,
authenticated GetGemCombinationEffect accepts immutable explicit tables via
BLUSTONE_GEM_COMBINATIONS_JSON or constructor gemCombinations. Default remains
empty. Original wire decimal strings are preserved without server normalization;
the native CardAnalyzer applies the effects, avoiding duplicated stat bonuses.
Missing original numerical records are not filled from UI help or estimates.

Evidence is read-only DataDump `sources/native/economy/ghidra-gem-reference.txt`,
`ghidra-gem-reference-keys.txt`, `ghidra-gem-inventory.txt`, plus hunters
`ghidra-stat-parser-{keys,first-insn,growth-insn}.txt`. Addresses are Ghidra
addresses (ELF offsets subtract 0x10000), final library SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.

`ParseGemRefs` Ga535e8 builds 60-byte INFO: four strings id/name/desc/res_id,
then set_effect_id+30, rank+34, target+38. `CSRGem.parse` Ga5d3dc calls
FindGemRef into stack local_64; its INFO+30 is local_34, copied to owned
PLAY_DATA+24. `CalcSetEffect` Ga5f5c0 and scene call Ge0baf2 read that same
PLAY_DATA+24, closing the reference-family/name-selector join. `GetGemEffectName`
Ga600b0 subtracts one and dispatches twelve cases: HP, ATK, DEF, critical
chance, critical damage, block chance, damage reduction, attribute enhancement,
attribute resistance, speed, HP regeneration, penetration. These are family
IDs 1..12, not the final help's reordered line numbers. Unknown IDs have no
recovered display name; a supplied valid combination may still aggregate.

`ParseGemCombineEffects` Ga53a90 reads envelope.ret_data, id/count and calls
CSRCardStat.parse G886fc0 on the same row with mode1. Numeric stat fields
are strings. Mode1 skips ordinary parser scaling. The combination parser
then divides HP, ATK, DEF, critical damage, damage reduction, attribute
enhancement, attribute resistance and HP regeneration by100. Speed,
critical chance, penetration, block chance and growth fields are not divided
there. This is the exact normalized internal representation, not a claim
that all chance or attribute fields have the same combat/display unit.
GetDef G869fd4 multiplies base DEF by the set DEF fraction at G86a100.

CalcSetEffect counts equipped pieces per resolved family, finds the first
matching combination ID, divides piece count by required count at Ga5f6f4,
and repeats the full record floor(pieces/count) times. Missing families skip;
incomplete sets give no effect. CardAnalyzer.SetEquipGem G86efd0 sums those
records and stores the resulting set stats. The helper rejects duplicate
definitions and zero required counts instead of accepting first-match
ambiguity/division by zero. Its ascending-ID result order is local canonical
policy; the native post-sort comparator is not recovered. Selection of a
single hunter's equipped instances must be done by a future authenticated
owner/slot workflow, not by aggregating the entire inventory.

Final 2.8.0.1 original UI_CSV help contains twelve definitions, but simplified
Chinese retains different values. See DataDump
`findings/hunters/base-stats-visual-hunt/jewel-help-locales-2026-10-05.md`.
English HP/ATK/DEF six-percent two-piece descriptions and other help values
are real client text, not captured server combination rows. Do not convert
speed1.72 or bare attribute35/regen30 directly into wire values without
closing their display/combat units. No original GetGem id/res_id/rank/target
catalog, actual combination rows, owned main/sub rolls, prices, gacha pools
or settlement identities have been recovered. Publishing or granting jewels
remains gated on these records; no invented zero-price or help-derived grant.
