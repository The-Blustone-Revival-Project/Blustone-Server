# Original LEVELING resource inventory

Read-only inventory of the already mirrored original
`resources/runtime/assets/LEVELING.jet`,18524bytes, SHA256
`ba73fff17002cc94f7f1a98bf657be1bef042283051a5b92c395347006d3c57e`.
Names come from the native base38 header field, not guessed filenames.

The21 assembled resources all carry RW data:

ADJUST, ANVILHEATED, COMMON, COMMON_DESC, CONTENTCTRL, ENVIRONMENTS,
EXPLORE, FISHING, GACHA_THROW, LEVELING_B, LEVELING_C, LEVELING_E,
LEVELING_G, LEVELING_M, LEVELING_R, LEVELING_S, LEVELING_T, LEVELING_TE,
LEVELING_TM, MONSTER_RANK, NAMINGBOX.

A bounded decoded-text audit found no Mirage floor/stair catalogue, encounter
rows, rotating Hunter list or floor reward table in these resources. This
does not exhaust other original assets, server captures or image evidence.
In particular, the name LEVELING_M alone does not establish a Mirage mapping.
Its60-second combat setting and neutral bonuses must not be adopted without
closing the native selecting consumer.

Useful positive original data:

- COMMON: exact battle-layer suffix values D/C/B/A/E, now consumed by the
  pinned background dependency checker; COMMON_DESC is a different example.
- ANVILHEATED:14 destination rows2..15, consumed by Gem polishing's anvil
  display. Its decimal third column is converted to a byte by the native
  loader; using the raw decimals as server compensation would be incorrect.
- MONSTER_RANK:54 power-to-rank/hyper/level classifier rows. These are not
  monster HP/ATK/DEF and must not substitute for combat stat references.
- FISHING: control/timing settings. No fish reference IDs, catch pool or sale
  prices were recovered from this resource.
- NAMINGBOX: death-box/groggy geometry, including C036/C051 special records.

The inventory introduces no runtime tables, stat changes, catches, owned
Hunters or grants. See the Gem anvil and Mirage COMMON consumer notes for
the narrower implemented projections and original loader ownership.
