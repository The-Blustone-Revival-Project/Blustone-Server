# Historical Mirage image transcriptions: bounded positive observations

Evidence review2026-10-16. Read-only DataDump tracked manual-transcription
lane `findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`.
The2026-10-14 release describes this3,626-image lane, but its release manifest
does not separately fingerprint these batch TSVs. The exact file pins below
make this bounded source selection reproducible. These are published image
transcriptions, not newly captured gameplay or fresh independent image review.
No Desktop originals, private/live values or device UI were opened in this lane.

## Source pins

SHA256 for the exact DataDump-relative files under the lane above:

- batch-16.tsv:4ad92eab9c39b607a86edfb8890050ff479bfa49904bb26aacd1be2a1678cbfb
- batch-27.tsv:9afcf585bd699f7c20c3233b16684a383a64d956f09f5f666501a2bacb4f6c0d
- batch-52.tsv:e70c241598f64e277541004726eba93f1bbe7683ff91428769a57e93141e2787
- batch-58.tsv:88a72051906dd3dafecbc349aca152bdeac4b50ee1f225de1b11e69bfadb1ec3
- batch-70.tsv:08b79c5d66a7cfef3d34fdbd9a72a122731724891b9960753f0a0a5a3d78520e
- batch-72.tsv:0455090d24478bae47ad1339e8f1bb808e1f564adf88cc129e35fcd58492c2d5

Line numbers include each TSV header. Dates below come from preserved image
filenames; they are historical source labels, not independently verified EXIF
times or a current server schedule.

## Stair-count and completed-board observations

- `batch-16.tsv:51`, idx800,
  `image0-a4fad52a576fef1b.png` (source date unknown): Mirage Ruins Floor13,
  LAST STAGE COMPLETE plus STAGE2 and STAGE1 COMPLETE, timer07:03:15, Trade.
  Direct three-stair board example; timer owner/meaning is not established.
- `batch-52.tsv:38`, idx2587,
  `Screenshot_20180412-152733-2d61cf125bed959d.png` (2018-04-12):
  Underground Ruins Lvl83, Current Tips/Trade/Re-enter, STAGE9/8/7/6 COMPLETE,
  partly visible5. Direct Stage9 display on a deeper floor.
- `batch-58.tsv:47`, idx2896,
  `Screenshot_20180906-135313_Blustone-c7f4fcdffb37390b.jpg` (2018-09-06):
  Mirage Ruins Floor122, Current Tips/Retry, LAST STAGE COMPLETE,
  STAGE8/7/6 COMPLETE, partly visible5, Trade.
- `batch-70.tsv:36`, idx3485,
  `unknown-1904be4656c68056.png` (source date unknown): Underground Ruins
  Lvl121, Current Tips/Trade/Re-enter, STAGE9 COMPLETE chest.

These corroborate the separately recovered final-client help's3/6/9 stair
bands; they do not establish all intermediate floors, original grade order,
balance scale values, payouts, floor-assignment or retry transaction policy.
Neither chest appearance nor floor artwork supplies enemy/reference data.

## One historical current-to-next boosted Hunter cohort

`batch-52.tsv:40`, idx2589,
`Screenshot_20180412-153504-b1a97feab501c253.png` (2018-04-12) transcribes
Current Tips/Fully-Active Hunter tab:

- Current: Lantern, Nene, Mowgli, Tyltyl.
- Next: Akasha, Gerard, Rebecca, Sylvester.
- Left Until Rotation:2 Days.

Exact-name catalogue joins are current[001,003,002,004] and
next[008,005,021,006]. This supplies one historical named cohort pair, not a
rotation algorithm. `batch-72.tsv:18`, idx3567,
`unknown-a590ce616e505be8.png` (date unknown) independently transcribes the
same current four, with Mowgli greyed, under Mirage Ruins127 Level and the
same2Days wording. Greyed appearance is not proof of ownership or eligibility.

No multiplier, activation epoch, timezone, full cycle length or current
calendar assignment follows. Do not assign these cohorts to today's runtime
or infer an original fixed two-day rotation period from a countdown reading.

## Current floor, highest floor and percentile are separate display values

- `batch-52.tsv:39`, idx2588,
  `Screenshot_20180412-152917-3d680d6b47e11363.png` (2018-04-12): Current Tips
  Team Tips reports Playing Level83, Highest Reached83 and upper55.56%;
  friend rows display130/119/115/108/101/84.
- `batch-27.tsv:30`, idx1329,
  `image-96e87bf7d2f58c23.png` (date unknown): Playing Level174,
  Highest Reached174, High Rank0.03%.

This supports distinct cache/UI concepts. Equal current/highest in an example
does not prove those fields always agree; no percentile or initial-floor
formula is recovered.

## Boundaries

No inspected Ruins row provides exact battle enemies, per-stair gold/fragments,
boost multiplier, registered-party eligibility or server settlement law.
Forest of Mirage event rows2467/2472/3528 belong to a separate timed event;
their two-opponent staging and +67rupees/green-gemx2 result must not be imported
as Ruins rules. Player chat row3602's rough daily-fragment arithmetic is an
anecdote, not an authoritative floor reward table. Existing shop price rows
likewise describe purchases, not battle payouts.

This note introduces no runtime catalogue, floor, rewards or owned Hunters.
