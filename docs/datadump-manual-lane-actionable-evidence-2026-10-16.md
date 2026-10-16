# Actionable manual-image evidence, 2026-10-16

Read-only audit of DataDump release 2026-10-14 and its manual image lane.
No runtime/profile/save, DataDump or client changes. DataDump-relative lane:
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`.
There is no lane README; `scrape-consolidation-2026-10-14.md` describes its
73 batches, 3,626 images and strict stat-panel hit criterion.

Release notes report zero normalized dataset/estimate changes from10-11.2.
The useful addition is detailed transcription, including economically useful
screens whose `hit=no` merely means they fail the complete stat-panel bar.

## 1. Skill-training gold quotes: immediate supported gameplay improvement

Current `src/skill-training.ts` charges100 times destinationLevel. The new
transcriptions provide several contrary original screenshot quotes:

- `batch-46.tsv:28-32`, idx2277..2281: Sunny five-skill sweep, Lv1/20,
  next-level preview, Begin Training100, shared wallet4186.
- `batch-09.tsv:45-46`, idx444/445: Bomb Party/Persistent Damage Lv5/40,
  next-level preview, Begin Training200, same material quantities1+1.
- `batch-52.tsv:42`, idx2591: Attack Speed Increase Lv20/40,18.00%->18.40%,
  Begin Training500; materials174/3,3/4(red shortage),27/1.
- `batch-13.tsv:6`, idx605: Beckhen Lv33/50,19.79%->20.40%, Begin Training700;
  materials5030/4,2/3,56/1. Named defense identity051.
- `batch-51.tsv:6-9`, idx2505..2508: four-skill Lv40/40 sweep,
  Begin Training900, materials1/5,76/5,37/3, wallet114156.

All quotes support100*ceil(destinationLevel/5), with native destination
indexing established independently. Only the listed levels are observations;
other brackets and role-wide application remain declared interpolation/policy.
Version-era differences remain possible. Several notes misuse currency words
(manda/silver); prefer explicit quote and original icon verification before
claiming recovered currency. Sunny notes explicitly identify gold.
Screens show nonzero materials but do not establish item referenceIDs. Adding
nonzero reference rows requires actual atomic stack consumption; current
single-skill settlement only debits gold and reports consumed_inst_list[].
Do not silently present material-free behavior as original reconstruction.

Source SHA256 pins:

- batch-46.tsv ef0adb864a6b2f896db3c6fed30c55ea3fb9d9d52a9ce3fa58b0fa253272633e
- batch-09.tsv 2e65a698e709e6607d38d4643e8a46af77931baf492e5b3ec8bfd3445e6738da
- batch-52.tsv e70c241598f64e277541004726eba93f1bbe7683ff91428769a57e93141e2787
- batch-13.tsv 6200aec8418e90c23645014fba5c67b6d349516ab4d11eb824fed02de8ca2e8a
- batch-51.tsv 0dc2344f3f15982c377d84168e3af6970fc0c293b6ddc8c2221909aa0950fdb7

## 2. Fishing prices: strong display data, missing original ID join

`batch-55.tsv:7`, idx2706, filename
`Screenshot_2018-05-23-00-45-46-a82e0a47dc84415a.png`:
Seaweed10; Calcium Smelt normal50/silver-badge250/gold-badge500;
Marsh Snail10; Mysterious note300; White Barbels Catfish normal200/silver1000;
Metron Ayu300. Displayed inventory names/art/badges/prices are useful for
joining original item image keys, then supplying existing fishing references
and sale mechanisms. Neither rank enum, original item IDs nor catch law is
proved by this frame. Do not average same-name tiers into one price.

## 3. Mirage: distinguish the actual Ruins from Forest event

`batch-58.tsv:47`, idx2896, filename
`Screenshot_20180906-135313_Blustone-c7f4fcdffb37390b.jpg` is actual Mirage
Ruins Floor122, Current Tips/Retry/Trade, LAST STAGE then STAGE8/7/6 complete
and partly visible5. It supports the existing multi-stair UI direction but
does not expose original resource bindings, enemy tuples or rewards.

`batch-50.tsv:18,23`, idx2467/2472 instead explicitly says Mirage Forest
timed event: Area1/Stage5 Lapis/Bruce Bang, Stage10 Captain/Locke and native
ordinary-looking Victory Area5,+67rupees,green gemx2. Do not graft that
event's stage/reward law onto the distinct Ruins run.

`batch-52.tsv:36,46`, idx2585/2595 Mirage Shop lists Harley tracesx3=300,
other hunter tracesx3=150, Special Requestx1=3000, Metron Crystalx1=500,
four material bundlesx10=500. Conflict: hits.md calls third row Gullveig on
both screens, while TSV2595 calls it Joy. Rotating shop is plausible but
neither same-list assertion nor named identity should be promoted unresolved.
These are shop prices, not Mirage battle payouts.

## Stat promotion remains unsupported

The consolidation reports gear/skill/star-state spreads up to35-40%, and
Lv1 draws do not share archive estimate units. Hermes3031+3033 decomposes
gear cleanly, but this validates that observed build, not all final base stats.
Clara/Teresa conflicts and provisional labels remain open. Do not promote
the back-calculated estimates or low-confidence gear tuples automatically.
