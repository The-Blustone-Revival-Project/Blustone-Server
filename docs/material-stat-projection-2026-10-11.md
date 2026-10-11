# Optional historical stats for material-backed Hunters

`BLUSTONE_MATERIAL_STAT_PROFILE=archive-2019-projection` applies the audited 2019 archive observations to the eight material-backed references: Captain009, Vincent010, Karl012, Denali013, Lapis017, Bear036, Bibi040 and Bright049. The default is `neutral`; the six existing ordinary references retain their existing independent policy.

The inactive `current-e6-materials-archive` profile selects this option with exactly the same 139 packages, resource bytes and stamp1634683 as `current-e6-materials`. No APK or CDN resource changes are involved. It improves per-character historical differentiation in reference/detail displays and eventual local combat experiments without granting a Hunter or activating inferred skills.

## Source and policy

The helper reads the existing curated `resources/reference/archived-hunter-database-2019.tsv`, pinned to SHA-256 `778e41835a8c44f21652abcb9c10de021afb2871292af8aba3431e71b9fef54e`. Each admitted identity must have one successful archived row, a2019 capture locator, numeric observations and the retained `level:not shown` / `gear_state:not established` qualifiers. Missing, ambiguous or changed sources refuse projection; unaudited identities retain neutral values.

Twelve numeric display fields are carried as native decimal strings: HP, ATK, DEF, speed, critical chance/damage, penetration, block chance/reduction, elemental enhancement/resistance and regeneration. These are COMMUNITY-SOURCED historical observations, **not recovered final2.8.0.1 level-one bases**. Reusing them as the base value for every existing rank row is explicit local policy. Original rank/awakening selectors and the existing fixture growth increments remain unchanged. No new growth curve, per-rank scaling, skill coefficient or equipment magnitude is inferred.

The [release character audit](datadump-character-stat-audit-2026-10-11.md) explains why newer estimate confidence labels do not close archive level/equipment uncertainty. This option implements historical projection directly from audited observations rather than adopting the release's extrapolated numbers.

## Verification and activation boundary

The focused test compares all projected fields against pinned observations, confirms the six existing references are exact, preserves skill/equipment/dialog/base metadata and growth increments, rejects unknown profiles and checks whole progressed-save bytes across reference reads/restarts. Default neutral output is byte-equivalent. All69 configured server checks and build pass.

Compiled encrypted disposable verification of `current-e6-materials-archive` passes14 reference rows, source-field parity, identical reference receipts after restart, exact139-package manifest and save preservation. Native Hunter detail rendering and balance remain unverified; the archive profile is prepared only and was not activated.

The tested server source was separately reloaded under live `current-e6-materials` with **neutral material stats**, after a fresh read-only Village/render guard and no active battle in any of three saves. Wrapper24936/listener52540 serves139/stamp1634683; client27165 and the+15 APK were not restarted or given game inputs. Authenticated live Like-count read and reference read succeed, with14 references and CaptainHP1000. The entire private save remains byte-identical to its pre-reload backup. No live stat, roster, reward, relationship or progress write occurred.
