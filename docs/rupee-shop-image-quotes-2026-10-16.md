# Historical Rupee shop quotes (2026-10-16)

`resources/reference/rupee-shop-screen-quotes.json` preserves11 exact published
manual TSV rows from8 files. Each entry includes the DataDump-relative source
path, complete TSV file SHA256, header-inclusive line number, observation index,
image filename, filename-derived date/year, exact raw row and raw-row UTF8
SHA256. Artifact SHA256:
`2b87d9a7576ff81d1b52bdbed7f6c2169c738c8180e61a88d1d46c29c3968bf5`.
DataDump was read only. The observations are published transcriptions, not new
visual rechecks of original screenshots. Filename dates are not verified
capture metadata; idx548 remains undated.

All source paths below share the DataDump prefix
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`.

## Named base-pack observations

- `batch-68.tsv:39`, idx3388,
  `Screenshot_20210619-234357_Blustone-3c4b7c1ef94acf7e.jpg`, filename2021-06-19:
  Rupee purchase x5000, Purchase with Manda5, With a Coupon1 greyed. Current
  Amount125, Veteran Professional1, Daily Purchase5/9; Manda739/coupon0.
  High confidence. This is the **single exact5-Manda observation** in the
  bounded manual lane, not independently repeated current-version pricing.
- `batch-38.tsv:30`, idx1879,
  `Screenshot_20170703-191845-0af883b768e285c4.png`, filename2017-07-03:
  Rupee x5000 for10 Manda, Veteran Expert1, Daily Purchase4/12, current219545.
- `batch-38.tsv:35`, idx1884,
  `Screenshot_20170708-150606-c061afd1a601ed5d.png`, filename2017-07-08:
  Rupee x5000 for10 Manda, Expert1, Daily Purchase12/12, current256642.
  Both2017 price10 rows are high confidence. Their distinct counters do not
  establish an escalation schedule, daily reset time or universal limit.

## Repeated coupon alternative

- `batch-33.tsv:42`, idx1641,
  `Screenshot_20170528-102721-c3aef1c3774905ea.png`, filename2017-05-28:
  named Rupee x5000, With a Coupon1, Expert1, Daily Purchase12/12.
- `batch-34.tsv:26`, idx1675,
  `Screenshot_20170530-210041-c29aecc91db50c07.png`, filename2017-05-30:
  Rupee x5000, With a Coupon1, Professional3, Daily Purchase0/11.
- `batch-05.tsv:48`, idx247,
  `Blustone_2017-08-05-15-09-47-c40523f0892b4f28.png`, filename2017-08-05:
  Rupee x5000, coupon x1, Expert3, Daily Purchase15/15.

The coupon1 alternative is independently repeated. These labels and icons do
not reveal the original coupon or shop target's internal item ID. Inventory
wallet counts shown beside the controls are account observations, not grants.

## Uncertain quote retained, not silently reconciled

`batch-11.tsv:49`, idx548, `image0-0c3183754b9e1699.png`, undated:
Rupee shop x5000, coupon1/Manda7; Current Amount87887, Expert1,
Daily0/12. Confidence is medium-high and the transcription explicitly warns
that icon labels are partly inferred. This row must not be silently promoted
to a universal7-Manda price or discarded to manufacture a clean5/10 ladder.
Differences could reflect version, price tier or transcription uncertainty;
the lane does not resolve which.

## Observed multiplier outcomes

- `batch-58.tsv:51`, idx2900,
  `Screenshot_20180909-211032-8ce2b48281c71d84.png`, filename2018-09-09:
  Very Successful Purchase200%, x10000 coins; received a large amount of Rupee.
- `batch-58.tsv:10`, idx2859,
  `Screenshot_20180816-130805_Blustone-b8b48ff315a54d7e.jpg`, filename2018-08-16:
 1600%, x80000 coins, Extra Bonus Veteran Point Gift Certificate3.
- `batch-58.tsv:31`, idx2880,
  `Screenshot_20180830-152214-316a7bbf7526b91f.png`, filename2018-08-30:
  same1600%/80000/+3 certificate outcome.
- `batch-50.tsv:50`, idx2499,
  `Screenshot_2018-03-31-05-29-32-d060954f8ede5e26.png`, filename2018-03-31:
 1600%/80000/+3 certificates, with zoom rejecting OCR's spurious41600%.

These are individual displayed outcomes. They do not provide RNG weights,
roll procedure, jackpot availability, guarantees or the certificate policy
for other outcomes. No certificate award is inferred from the200% row, where
it was not observed. A base-only local shop must not claim it reproduces
original lottery behavior or automatically award a jackpot/certificates.

## Implementation boundary

The named5000 base pack can support explicitly selected historical price
projections:2017 uses the repeated10-Manda observations;2021 uses the single
5-Manda observation. Both retain the repeated coupon1 alternative as evidence.
Those choices do not recover final2.8 pricing, original dynamic price tiers,
Veteran-dependent limits or reset rules. Any cap/reset/spending-order policy
requires its own explicit LOCAL admission and documentation.

Original native shop selection uses reference metadata, including use_type11;
the original selected shop/coupon reference IDs remain unrecovered. Any
revival references chosen to drive that selector are authored LOCAL IDs.
**RP1 is not established as this shop target by these images.** Named Rupee
appearance and a known reward display identity are insufficient to make that
join. The artifact introduces no ownership, rewards, runtime profile change,
sale operation, RNG or save migration.

## Complete source file pins

```text
batch-05.tsv b1aa93f1c8ff112e3d7165505c2caea09f05d85b91f0ea91e5397b295f56981d
batch-11.tsv aaef87c3375684e25b7e78c6a5ca416f03ed59c1c15ee4cfc91e56c4f4fdae75
batch-33.tsv 8924ecff7c76a8d387a0b1d11e9b7a31a7594f8bd86f446c6f3070f38f0c70a6
batch-34.tsv ccf930946b1e35267ab521d75a331cb3a33577446b87cd97c3f1373a226e9c3e
batch-38.tsv 4425221f2e99304ebf0c11f1aa40f72cf16032932605b1c68654311f0a6466b9
batch-50.tsv c1eabd52424c4d8e5bdca006b5ba80246e1e7d6774e06fcc1074d1d1d9fbc55a
batch-58.tsv 88a72051906dd3dafecbc349aca152bdeac4b50ee1f225de1b11e69bfadb1ec3
batch-68.tsv b2e7006ce6b8fb706b6b2997c8a5932926c91dfe460a04ae46c67bc9c55aca69
```
