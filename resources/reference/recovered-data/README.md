# `analysis/recovered-data/` — data recovered out of native/binary sources

Everything in this directory is **[RECOVERED]** content, extracted from sources
that already exist in this workspace. Nothing here is authored or invented. Each
subdirectory must carry its own provenance; see
`analysis/research/environments-recovery.md` for the file this README was written
for.

## Layout

| path | what | provenance note |
|---|---|---|
| `environments.csv` | The client's `environments.csv` — the battle-background / environment table read by `CSRStaticData::LoadEnv()`. | **[RECOVERED]** from `LEVELING.jet` chunk 5 in the base APK assets. Details below. |
| `campaign-stages.csv` / `.json` | The **50 expedition stage ids** `n_01_01`..`n_05_10`, with their area grouping and their order in the shipped enumeration. | **[RECOVERED]** from `LEVELING.jet` chunk 0. Details below. |
| `campaign-stages.raw-LEVELING-chunk0.txt` | The raw inflated chunk 0 body, verbatim. | **[RECOVERED]** byte-for-byte, sha256-pinned. |
| `campaign-stages.raw-LEVELING-chunk9.txt` | The raw inflated chunk 9 body (`bonus.role`, `bonus.rank_*`, `bonus.stage`, `play_time`). | **[RECOVERED]** byte-for-byte, sha256-pinned. |
| `cdn-manifest/` | CDN package / pack group manifests mined from the recovered CDN traffic. | see its own TSV headers |
| `leveldb-tables/` | Tables dumped out of the phone's `*_RO.db` LevelDBs (`char-str`, `ingame-talk`, `skill-ref`, `skill-tag`, `tag-ref`, `ui-episode`). | see its own TSV headers |
| `native-key-vocabulary/` | JSON key / route vocabularies mined from the native string and symbol tables. | see its own TSV headers |

Checked while recovering `environments.csv`: **no `environments` string and no
`.csv` reference anywhere in `leveldb-tables/`** (0 hits, case-insensitive). The
CM LevelDBs are not the source of this file.

---

## `campaign-stages.csv` / `.json`

Added 2026-10-03 by the progression-diagnosis agent.

| | |
|---|---|
| sha256 of chunk 0 body | `11f902a20b4beed58359da5ae9486ac4246424255fd41041f8e578cb29f2a65d` |
| source | `LEVELING.jet` **chunk 0**, file offset `0x000000`, `usize=20825 csize=3095` |
| shape | JSON array of 224 `{key, global, cmge, pv}` records |
| yields | exactly **50** expedition stage ids, `n_01_01`..`n_05_10`, contiguous, in ascending order |

### What chunk 0 actually is — the brief's premise was wrong

**It is the CMGE analytics event-key table, not campaign metadata.** Every
record is `{key, global, cmge, pv}` where `pv` is an analytics event id
(`1000100`-style for UI/tutorial events, **`1100001`-`1100050` for the
expedition stages**, `2000000`-style for title-scene events, `5000000`-style
for main-scene events) and `global`/`cmge` are obfuscation salts.

It therefore contains **no** stage titles, **no** `ap_cost`, **no**
recommended level, **no** monster groups, **no** `order`, and **no** area
records. The correct claim is narrow:

> **[RECOVERED]** the shipped client enumerates **exactly 50** expedition
> stage ids, named `n_AA_SS` with a 2-digit area part `01`..`05` and a 2-digit
> stage part `01`..`10`, contiguous, in ascending `pv` order.

Anything beyond that (titles, cost, waves, rewards) is server-authoritative
and unrecoverable — same conclusion `analysis/research/catalogue-report.md` §5
reached for monsters, for the same structural reason.

### The related namespaces, kept distinct

| namespace | where | what it is |
|---|---|---|
| `n_01_01`..`n_05_10` | chunk 0 keys, `pv` `1100001`-`1100050` | **[RECOVERED]** the 50 expedition stages |
| `n_00_01`..`n_00_03` | `analysis/recovered-data/leveldb-tables/ingame-talk.tsv:24-26` | **[RECOVERED]** three *tutorial* stages, card `009`. A separate 4th area, `n_00`, area serial 0 |
| `Tuto_n0002_00`..`_10` | chunk 0 keys, `pv` `1000200`-`1000210` | **[RECOVERED]** tutorial **events**. Note the underscore-free scheme — a third, unrelated naming |
| `b_00_01` | chunk 9 `bonus.stage` | **[RECOVERED]** a *second* stage namespace with per-stage stat multipliers and a `cards` whitelist (`["051"]` = Beckhen). Boss/bonus stages, not expedition stages |

So `n_00` **is** a real area and it is **not** the village — it is the
tutorial area, three stages, card `009`. `server-ts/src/bootstrap.ts` currently
publishes `n_00` titled "Village" linking a single stage `n_01_01`; the correct
shape is three links `n_00_01`, `n_00_02`, `n_00_03`.

### Reproduce

```powershell
python tools/extract-campaign-stage-ids.py analysis/extracted/assets/LEVELING.jet --list
python tools/extract-campaign-stage-ids.py analysis/extracted/assets/LEVELING.jet `
    --csv  analysis/recovered-data/campaign-stages.csv `
    --json analysis/recovered-data/campaign-stages.json
```

The tool asserts `50` ids and that each `n_AA` carries serials `1..10`, and
exits non-zero otherwise. The raw bodies were extracted with:

```powershell
python tools/extract-jet-chunk.py --index 0 `
    --expect-sha256 11f902a20b4beed58359da5ae9486ac4246424255fd41041f8e578cb29f2a65d `
    --out analysis/recovered-data/campaign-stages.raw-LEVELING-chunk0.txt `
    analysis/extracted/assets/LEVELING.jet
python tools/extract-jet-chunk.py --index 9 `
    --expect-sha256 c9f9c1bbd99e76e6c486928bad4a8c4cc4a0cf98dea121efbd1eed9cb57bf010 `
    --out analysis/recovered-data/campaign-stages.raw-LEVELING-chunk9.txt `
    analysis/extracted/assets/LEVELING.jet
```

The full diagnosis that consumes this data is
`analysis/systems/progression.md`.

---

## `environments.csv`

| | |
|---|---|
| sha256 | `0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c` |
| size | 4381 bytes, UTF-8, `\r\n`, no BOM |
| shape | 18 columns, 50 data rows, 19 distinct `PreFix` values |

### Provenance

Extracted from **`LEVELING.jet`, chunk index 5** (file offset `0x1880`,
`usize=4387 csize=900`), which ships in the **base APK assets**:

```
analysis/extracted/assets/LEVELING.jet                                              18524 bytes
recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets/LEVELING.jet   18524 bytes
```

Both copies are byte-identical (sha256
`ba73fff17002cc94f7f1a98bf657be1bef042283051a5b92c395347006d3c57e`).

Reproduce with:

```powershell
python tools/extract-jet-chunk.py --list analysis/extracted/assets/LEVELING.jet
python tools/extract-jet-chunk.py --index 5 `
    --expect-sha256 0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c `
    --out analysis/recovered-data/environments.csv `
    analysis/extracted/assets/LEVELING.jet
```

`tools/jet-viewer/jet_decoder.py` is **not** usable for this — it is a display
decoder, not a byte-faithful extractor, and it was reported to emit identical
output for several `PK_*` packages. Use `tools/extract-jet-chunk.py`, which
checks every chunk's declared uncompressed size against the inflated length
(all 21 `LEVELING.jet` chunks match) and can pin the output by sha256.

### Format — 18 columns, positional **[RECOVERED]**

Plain CSV, first line a `#`-comment header. Columns are read positionally by
`CMCSVReader::GetString(col, row)` in `CSRStaticData::LoadEnv`
(`libnative_core.so`, Ghidra `0xf3bab0`):

| col | `LoadEnv` reader | header text | meaning |
|---|---|---|---|
| 0 | string → **map key** | `#ID` | environment id (`0`,`1`,… ,`99`,`900`,…) |
| 1 | string | `Name` | Korean display name |
| 2 | string → **resource prefix** | `PreFix` | e.g. `STI000`; becomes the first `%s` of `CMFormat("%s_%s", …)` |
| 3,6,9,12,15 | `std::stol` | `원거리/중거리/근거리/초근거리/비행선 구성` | per-band row index (long range → fighter) |
| 4,7,10,13,16 | `std::stof` | `… 속도` (speed) | per-band scroll speed |
| 5,8,11,14,17 | `std::stof` | `… 높이` (height) | per-band height |

The five numeric triples are the five battlefield depth bands. `PreFix` is the
field the r015 crash depends on: a working row makes
`CSRGameBase::OnInitBackground` build resource names like `STI000_A0`.

`PreFix` minus the `I` names a real art package for 18 of the 19 values —
`STI000…STI007` ↔ `ST001.jet`…`ST007.jet`, `STI099` ↔ `ST099.jet`,
`STI100` ↔ `ST100.jet`, `STI900…STI907` ↔ `ST900.jet`…`ST907.jet`. Only
`STI801` (row 801, Halloween) has no package in this APK.

Rows most likely to matter to the expedition goal: `99 배틀` (*battle*,
`STI099`), `100 협회전` (*guild battle*, `STI100`), `200 레이드` (*raid*,
`STI007`), and the boss-stage rows `900…907`.

### Placement — does this need to be served over CDN?

**No. **[RECOVERED]** `CSRStaticData::LoadEnv` reads the file through the same
two-branch idiom as its sibling `CSRStaticData::LoadCommon`, which reads
`common.JSON`:

* data root empty (`CGMDataMgr+0x5814 == 0`) → `SRLoadRawDataStr("environments.csv")`
  → the **local asset/resource tree** (base-APK packages);
* data root set → `CMCSVReader::Open(dataRoot + "environments" + ".csv")`
  → the CM database.

`analysis/research/leveldata-id-source.md:304-324` ran the control experiment:
`common.JSON` and the ten `leveling_*.JSON` files are present **only** in
`LEVELING.jet` and in **none** of the 11 CDN packages the replica serves, yet
`common.JSON` demonstrably loads at runtime (village / Supply / Mail work).
`environments.csv` sits in the same chunk container in the same package, so the
live resolution path already reaches it, and `analysis/r015/logcat-all.txt`
contains no `File Load failed(ENVIRONMENTS)` / `Load failed %s` line while
carrying 495 other `[ERR]` lines.

Adding `LEVELING` to `BLUSTONE_PACKAGE_NAMES` is still worth doing for fidelity,
but it is **not** the fix for the r015 crash — see
`analysis/research/environments-recovery.md` §3.

### Rules

* Do not hand-edit anything in this directory. If a value has to change, that is
  a change to `server-ts/src` fixtures, not to recovered data.
* Anything derived from these files must be labelled `[INFERRED]` in code
  comments and in `analysis/research/*.md` (`AGENTS.md` §15).