# DataDump release use audit: supplementary game data

Verified GitHub Latest on2026-10-11:
[Blustone DataDump2026-10-11](https://github.com/The-Blustone-Revival-Project/Blustone-DataDump/releases/tag/2026-10-11),
regular release, published2026-10-11T01:53:35Z, source/tag commit
**49a89bcb0bd54f21f7637a9755561724e9de5b6f**. This audit reads tagged files with
`git show 2026-10-11:<path>`, not dirty working-tree estimates. DataDump remains
read-only; only this Server note and a small parity result were written.

The release has **zero changed normalized dataset records** versus2026-10-10.
Its additions are explicitly supplementary derivation findings. Confidence
coverage in its notes does not mean those estimates became original gameplay
tables. Root independently verified all five published asset sizes/SHA256.

## Original Episode monster rows: already present, nothing missing

Tagged `sources/client-tables/reference/EPISODE_STAT_ACTORS.json` and Server
`resources/reference/episodes/EPISODE_STAT_ACTORS.json` are **byte-identical**:
SHA256 **f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56**.
All152 rows are present, including **34 monster actor rows /22 distinct monster
res_ids**. **Zero missing or changed genuine rows**. The correct discriminator
is res_id beginningM; three monster rows also have ref_id, so selecting only
rows without ref_id would miss real data.

Server's original R_EPISODE.jet is38080bytes/SHA256
**7f4362cdf80545a6da937444094837f334c8aae4f9f791d6ff4161948d98a01e**, matching
its source manifest. The configured E6 package list includes that entire pack.
This proves preserved/selected original content, not a new live runtime probe
or that every later Episode encounter has been played. The native client uses
the intact Episode resource; these rows are **not imported as ordinary
/reference/GetMonster base stats**. `datadump-release-monster-parity-2026-10-11.json`
retains the exact comparison and actor IDs.

The release's highest-value correction is identity:22 catalog entries are
**art packages**, hosting **M001..M063 plusM100**, rather than22 monster IDs.
For example M008.jet contains M022/M023/M024. Its34 original tuples are
**encounter-qualified**, not universal monster base stats; M034 has several
different tuples, and even the same thumb level/rank can differ by encounter.
Ten extrapolated package rows are low-confidence15–45% estimates and do not
recover missing ordinary campaign stage→monster mappings. Do not turn a
package's highest-HP quoted example into a universal row.

## Accessories, jewels and skills: what can be used

**Accessories:** the tagged report/table contains100 names, but only **Jack's
observed Lv50 MaxHP260** is recovered. The other99 and the entire Lv1–49 curve
are models transferred from one accessory cap and a Lv49→50 armour pair.
Lv1 HP135, universal Lv50 HP260, slot/rarity invariance and ±20/25% bands are
assumptions, not final equipment reference values.97 names are shipped
CHAR_STR names; three awakened-form extras lack that shipped-name evidence.
Use names/locators and the single panel as evidence; do not activate this as
GetEquipment or equipment growth without consumer/unit validation.

**Jewels:** no new jewel source today. The release carries both historical
1.4.4.1 help and a **final2.8.0.1 locale matrix**. Those must not be merged by
row number: the order changed, and finalSC retains an older numeric/order
profile. FinalEN help gives HP/ATK/DEF6%, critical6%, fatal60%, block5%,
reduction10%, elemental enhancement/resistance35, penetration16, speed1.72 and
regeneration30. These are original **help definitions**, not recovered
GetGemCombinationEffect enums, per-instance stats or mounting receipts. The
often-quoted KO9% versus5% conflict belongs to the older Super Block help;
the final rows have additional locale/version differences. Preserve the
explicit locale/era and recover native family IDs/units before implementation.

**Skills:** the565-row supplementary table classifies379 as derived estimates
and186 as fixtures. The promotion from166→379 changes classifications, **not
numbers**:179 low-confidence analogy-depth1 and34 depth2 rows were relabeled.
Source formulas/tag vocabulary are useful; coefficients/growth/durations based
on unknown-level or cross-era anchors are not original ordinary skill rows.
Healing remains zero-anchor fixture data in this table. Do not replace the
existing validated Episode-derived heal with its estimate. Four fixed2000
text leads are067|4,072|4,083|4,087|4; literal text alone still needs exact
effect/scope/trigger consumers, so these are bounded next probes, not blanket
activation. Most importantly, this table describes only a slot's **primary
effect**; secondary effects cannot be recovered by copying its one coefficient.

## Highest-value next implementation

Correct the **monster art namespace/resource coverage guard** first. Current
`src/bootstrap.ts::RECOVERED_MONSTER_ART_IDS` still listsM001..M021/M100 as
though package filenames were the render identities; it consequently refuses
the genuine M022 namespace. Build an exact owner-pack crosswalk from the tagged
monster table/original record names, validate selected res_ids against their
actual owner package, retain the current M001 default and all stat/placement
policies, then test an opt-in known namespace with its genuine package. This
closes a concrete resource-admission error without importing uncertain balance.

Do **not** duplicate the34 already-served Episode rows or extrapolate them into
expedition base tables. Original ordinary monster placements/stat responses,
equipment reference/growth and gem instance/effect mappings remain missing.
No live stats, rewards, owned data, routes or profiles were changed by this audit.
