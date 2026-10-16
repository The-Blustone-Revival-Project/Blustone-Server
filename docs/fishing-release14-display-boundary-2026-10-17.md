# Fishing release14 display evidence and remaining executable-data boundary

Bounded read-only follow-up, 2026-10-17, after persisted configured casts.
DataDump checkout `0aff320` (2026-10-14 published snapshot). Server documentation
only; no runtime/configuration, original assets, private data or UI changed.

## New historical display leads

The release14 screenshot-transcription lane adds useful named fishing/economy
observations beyond the earlier community-wiki names. These are **published
human TSV transcriptions**, not freshly verified source pixels. Their original
manifest locators point outside the allowed checkouts to Desktop screenshots;
this audit did not follow those paths or claim independent image verification.
The published stat-hit crops inspected by filename inventory do not supply
these particular fishing source frames.

- **2018-05-23 filename**, batch55 idx2706: inventory reports Calcium Smelt
  stacks x18/x2/x2 with prices50/250/500; White Barbels Catfish x14/x1 with
  prices200/1000; Metron Ayu x9 with300. Marsh Snail and Seaweed each10.
  This is a plausible grade-price ladder lead, **not** a proven ordered
  bronze/silver/gold assignment or complete GetPriceRef table.
- **2021-10-16 filenames**, batch69 idx3425/3426: paired Azure Dragon
  Snakehead catch246.16cm/sold40000 and item detail sale range40000~100000.
  The detail describes a very rare fish appearing during a certain period.
  The range supplies endpoints only; silver price, length thresholds,
  probability, seasonal dates and final-version validity remain unknown.
- Batch69 idx3427 provides the same-session encyclopedia-name context:
  Azure Dragon Snakehead, King Cyprinus and Emerald Crystal Clam silhouettes,
  Gold Cyprinus, Crystal Clam, Deep Water Blade Sharp Eel, Black-backed Crab.
  Silhouettes and names do not prove their pool membership or catchability.
- **Undated filename**, batch18 idx863: Crystal Clam112.55cm, new record,
  sold1300. **Undated IMG_2514.png**, batch32 idx1598: White Barbels Black
  Catfish54.93cm, new record, sold10000. Do not silently merge the latter
  display name with White Barbels Catfish or infer a version/date from index.
- **2021-04-05 filename**, batch68 idx3355: Sell Fish tab lists several
  species/bait and prices, including Calcium Smelt/White Barbels Catfish at
 5000 and Seaweed/High-quality Bait at1500. This panel may use a different
  sale/value context from2018; quantities, grade badges and per-unit semantics
  need original-frame review before numeric interpretation.
- Batch73 idx3626 corroborates the transcribed Azure Dragon Snakehead
  success display233.09cm/sold40000, but its Reddit-style filename provides
  no established date or independence from the other captures.

These are display-level historical values, not original internal fish IDs.
No native/static table join from any name to fish_id/GetItem.id, thumbnail,
effect or resource ordinal was found. No reference row or runtime quote was
created, and current LOCAL authored casting/sale policy is unchanged.

## Reproduction pins

All paths below are relative to DataDump directory
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`.

- `batch-18.tsv:14`, idx863: file SHA256 `ff6ea11434bd131e07d3704ad901cf887ec5380bc8493e66b6635f9bd984485c`; exact TSV row (UTF-8, without line ending) SHA256 `922c48e06d746ecc66307450c14a0aac97fd25804902b1c263c87265d00f1d1f`.
- `batch-32.tsv:49`, idx1598: file SHA256 `1e5e1d74f7acfca9b479e7df5063f4ca936327652cb8178d4778caac4cd25bc9`; exact TSV row (UTF-8, without line ending) SHA256 `e0b3eed083bc3ee1561779977f881b78b75ee739fd6c09cd4c1fc3426675c8f8`.
- `batch-55.tsv:7`, idx2706: file SHA256 `26fa03d8effdf419dd597522ffb3b538a3574a933beec80887fa5daabeb1a556`; exact TSV row (UTF-8, without line ending) SHA256 `c1ed3c7940a70a84aab628bc2553a4d21ea94107d6164c3f1367af18b7c6698e`.
- `batch-68.tsv:6`, idx3355: file SHA256 `b2e7006ce6b8fb706b6b2997c8a5932926c91dfe460a04ae46c67bc9c55aca69`; exact TSV row (UTF-8, without line ending) SHA256 `97cc87c25c3dba237dd0e381e7b0e73e15c8b8ceaccc6042d98b09e1b111e658`.
- `batch-69.tsv:26`, idx3425: file SHA256 `6f5c4761dad7d9999fb6eaef1f346d970e1395f290376d722b0fb44d97760eb9`; exact TSV row (UTF-8, without line ending) SHA256 `1b5b5a6cd18179d734868608fb374f1621947043b4d4f6520b14b0c513903d5d`.
- `batch-69.tsv:27`, idx3426: file SHA256 `6f5c4761dad7d9999fb6eaef1f346d970e1395f290376d722b0fb44d97760eb9`; exact TSV row (UTF-8, without line ending) SHA256 `d1358827553d0e93c25022d3e4960643a45a940cc10b31ee4073f2e07339c1bb`.
- `batch-69.tsv:28`, idx3427: file SHA256 `6f5c4761dad7d9999fb6eaef1f346d970e1395f290376d722b0fb44d97760eb9`; exact TSV row (UTF-8, without line ending) SHA256 `f0d11cef8671db7b289550523daa8dae060d9697a48481053957218c7380675e`.
- `batch-73.tsv:27`, idx3626: file SHA256 `f1f1e398da48a813cdf8301b8736f4494ec533e0a70531e33ee497e4f4bcd06c`; exact TSV row (UTF-8, without line ending) SHA256 `9102ecccfbb846074562fa2f508e23084bf363548dacca8009013ae01b7da0b6`.

Release note SHA256: `a132da6467ea1021ede1db0c635241163ac73120eda65434053636cd99b4c8f8`.
Its coverage explicitly describes the3626-screenshot lane while the normalized
release datasets remain hunter/monster/campaign/episode/gear domains. This
snapshot adds no normalized fishing ID/pool/tuning table.

## Validated stopping boundary

Existing `findings/economy/fishing-item-identity-candidates.md` already records
negative exported-table/native-ID joins, and `findings/systems/fishing-materials-evidence.md`
records original local FISHING_SETTINGS timing/NPC data. Repeating the old
FS001/FISH_01 ordinal search would not turn either into GetItem metadata.
The release14 rows above provide no server Begin gauge/burn tuning or numeric
pool weights. Old local timing values must not be relabelled as recovered
Begin response values merely because some key names overlap.

Two small web passes targeting the original publisher domains and exact fish
names returned no relevant usable primary page; unrelated real-world fishing
results were discarded. No fresh web claim, video measurement or archive
availability conclusion is adopted from those misses.

The next decisive evidence remains an original fish item row joined to an
original GetFishingPool/EndWithSell fish_id, or a source frame paired with a
separate wire/reference identity. The new price/name observations are retained
as finite future frame-review targets. Original IDs, item definitions, full
price tiers, odds, grade/length thresholds, minigame tuning and pool membership
remain unrecovered. No further exhaustive scan is warranted on the same inputs.
