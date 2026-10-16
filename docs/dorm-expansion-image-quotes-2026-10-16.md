# Historical dorm expansion offers and observed capacities

`resources/reference/dorm-expansion-screen-quotes.json` preserves8 exact rows
from6 published manual TSV files. Each row includes its DataDump-relative path,
complete source SHA256, header-inclusive line number, observation index, image
filename, filename-derived date/year, raw TSV text and raw-row UTF8 SHA256.
Artifact SHA256:
`5b463282280450b47dca1edc375a23fe8b68773b1cde99f89b37a1b9c2306104`.
This checkpoint reads the published transcriptions; it is not a fresh visual
recheck of original images. Both explicit priced offers have undated filenames.
Dates derived from other filenames are not verified capture metadata.

All locators below share the DataDump-relative prefix
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`.

## Explicit offers

`batch-19.tsv:22`, idx921, `image0-e8eaa27517b930b4.png`, high confidence:

```text
Dorm is full; expand 51->54; cost=12800 rupees OR 3 Manda; wallet: rupees=70916 / manda=26 / gems=0
```

`batch-21.tsv:43`, idx1042, `image-2b00b753c3810938.png`, high confidence:

```text
Dorm-full dialog; [You cannot recruit new hunters because your dorm is full.]; Expand dorm? 60->63; Purchase with Rupees 50000 / with Manda 3; wallets 76884 + 272
```

Both offer3 additional slots and a3-Manda alternative at their specific
observed capacities. The Rupee prices differ:12800 at51 and50000 at60.
The rows do not establish a universal3-Manda price, an interpolation formula,
the price of any unobserved step, a shared era, or a final-version schedule.
They show an offered confirmation, not proof that either purchase completed.
Wallet amounts are account observations, not reward grants or fee deductions.

## Historical version notice

`batch-38.tsv:47`, idx1896,
`Screenshot_20170712-115628-e66b6a3949ea8223.png`, filename2017-07-12,
high confidence: publisher v1.0.7.0 patch notes explicitly list **dorm maximum
57->72** among the new features. This is a version-specific maximum change,
not evidence that an individual account bought15 slots, nor a final2.8 cap.
The same notice mentions inventory/manage-hunter features; it does not supply
a separate storage-expansion price or protocol contract.

## Representative observed roster capacities

- `batch-04.tsv:2`, idx151,
  `Blustone_2017-06-06-19-17-28-edd8f988a00284c3.png`,
  filename2017-06-06: Hunter List **41/45**, high confidence.
- `batch-04.tsv:33`, idx182,
  `Blustone_2017-06-19-12-29-33-f4526a1643691b90.png`,
  filename2017-06-19: Hunter List **45/51**, medium confidence.
- `batch-05.tsv:15`, idx214,
  `Blustone_2017-07-10-21-05-28-cd20859fbad71865.png`,
  filename2017-07-10: Hunter List **57/57**, high confidence.
- `batch-05.tsv:20`, idx219,
  `Blustone_2017-07-17-07-46-39-dae0c49c2600010d.png`,
  filename2017-07-17: Hunter List **58/69**, high confidence.
- `batch-11.tsv:25`, idx524,
  `CD572BA4-FB33-43DD-88D8-BD6B3B8E78B7-4bd1bc25798284dc.png`,
  undated: Hunter List **18/39**, medium-high confidence.

The denominators demonstrate differing observed capacities. They do not
establish a universal starting capacity, a hard maximum, purchases between
frames, a shared owner/account timeline or a rule based on the number owned.
In particular, a count snapshot is not an expansion offer and does not provide
a price. Publication dates for the transcription do not date the game state.

## Revival boundary

The existing revival advertises capacity100. **No price at100->103 is recovered
by these rows.** A server must not reduce existing capacity100 to51 or60 merely
to make a historical offer applicable. Grandfathering, new-account admission,
local override prices or refusing unquoted steps are implementation choices
that need explicit local policy, not invented original provenance.

The screenshots supply neither original internal item/reference IDs nor a
native expansion request/callback grammar. Native contracts, durable capacity
fields and consistent recruitment admission must be established separately.
This artifact adds no references, stock, capacity mutation, paid transaction,
runtime activation or save migration.

## Complete source file pins

```text
batch-04.tsv 668d0cde87ff9dce5e550124c67945d1cd840125eebd06a81ed588d9d9d82e5b
batch-05.tsv b1aa93f1c8ff112e3d7165505c2caea09f05d85b91f0ea91e5397b295f56981d
batch-11.tsv aaef87c3375684e25b7e78c6a5ca416f03ed59c1c15ee4cfc91e56c4f4fdae75
batch-19.tsv 9f1697974b118bf95e5370fa19df8f4e4bdfb3c58cd209f83a599680b4501b3d
batch-21.tsv d2d5d2baa974d11f69a37f1b6645d90f2e616bbdafc07e66a17299c2e5dfe50d
batch-38.tsv 4425221f2e99304ebf0c11f1aa40f72cf16032932605b1c68654311f0a6466b9
```
