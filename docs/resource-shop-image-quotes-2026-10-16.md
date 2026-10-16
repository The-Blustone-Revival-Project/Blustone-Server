# Fuel and Challenge Invitation shop image quotes (2026-10-16)

`resources/reference/resource-shop-screen-quotes.json` preserves14 exact rows
from14 published manual TSV files. Every entry carries its DataDump-relative
path, complete source SHA256, header-inclusive line number, observation index,
image filename, filename-derived date/year, original raw TSV row and raw-row
UTF8 SHA256. Artifact SHA256:
`5c82b482ace33c9333e3aa4b970bf1e09836f33a48812c5c9b28ab2b7ae1a94b`.
This is a read-only transcription audit, not a new visual recheck of the
original images. Filename dates are not independently verified capture dates;
undated filenames retain null date/year.

All TSV locators below are relative to DataDump:
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`.

## Complete dated2018 base quotes

**Fuel:** `batch-57.tsv:41`, idx2840,
`Screenshot_20180801-144709-8fbfa404c53daebc.jpg`, filename2018-08-01:
Ornithopter fuel popup explicitly shows **x60 fuel for5000 Rupees, coupon1,
or Manda5**. Veteran Professional2, Daily Purchase8/8; wallet224192 coins,
257 Manda,0 coupons. The anomalous Current Amount82/0 is explicitly recorded
by the transcription. It does not prove a natural AP maximum0 or authorize
changing current resource caps. This is one high-confidence complete quote.

**Challenge Invitations:** `batch-50.tsv:29`, idx2478,
`Screenshot_20180325-032924-bd60c3858b6b9f24.png`, filename2018-03-25:
the standalone purchase popup explicitly shows **x2 invitations for5000
Rupees, coupon1 or Manda5**. Veteran Expert1, Daily Purchase6/10, held2/10;
wallet42677 Rupees,57 Manda,0 coupons and coupon option greyed. The text says
that a lucky purchase might receive a bonus; no odds or bonus guarantee is
stated. This is one high-confidence complete quote.

These direct input quotes establish quantities independently of jackpot
arithmetic. A local base-only profile may project these observed amounts and
prices; it must not describe them as the original final-version economy.

## Repeated earlier base observations

- `batch-04.tsv:43`, idx192,
  `Blustone_2017-06-25-23-33-38-1eac3baceb3dfb04.png`, filename2017-06-25:
  fuel60 for5000 Rupees or coupon1, Veteran Expert2, Daily11/11, held3/60.
- `batch-45.tsv:24`, idx2223,
  `Screenshot_20170908-152547-53b7e13d69658b42.png`, filename2017-09-08:
  fuel60 for5000 Rupees or coupon1, Expert2, Daily7/11, held13/60.
- `batch-36.tsv:36`, idx1785,
  `Screenshot_20170607-183809-d20a6e611c3a6ba9.png`, filename2017-06-07:
  invitations2 for4000 Rupees or coupon1, Expert1, Daily10/10, held0/6.
- `batch-42.tsv:15`, idx2064,
  `Screenshot_20170820-085134-ed3197c1b7d8d9b0.png`, filename2017-08-20:
  invitations2 for4000 Rupees or coupon1, Expert2, Daily8/11, held1/6.

Thus fuel's60/5000/coupon1 is independently repeated. Invitations'2017
4000-Rupee quote differs from the complete2018 5000-Rupee observation. The
earlier invitation rows do not establish a Manda price; the2018 Manda5 quote
must not be silently attached to an original2017 package.

## Conflicting undated quotes

- `batch-14.tsv:38`, idx687, `image0-5ac851cd14121049.png`:
  fuel60 for**10000 Rupees/coupon1/Manda5**, Expert1, Daily7/10, held7/97.
- `batch-25.tsv:51`, idx1250, `image-79af477f141e03be.png`:
  invitations2 for**8000 Rupees/coupon1**, Guru3, Daily11/19, held0/6.
- `batch-32.tsv:48`, idx1597, `IMG_2497.png`:
  invitations2 for**10000 Rupees/coupon1/Manda5**, Guru2, Daily11/17,
  held666/6. Large held stock does not establish how that stock was earned.
- `batch-12.tsv:2`, idx551, `image0-0d24f90ce53cb2a8.png`:
  invitations2 with **10000 Rupees/coupon1/Manda12**, Expert2, Daily4/11,
  held0/6. The row transcribes the three options with plus separators; it is
  preserved verbatim without turning them into a simultaneous combined fee.

The differences could reflect version, purchase tier, other policy or
transcription uncertainty. The lane does not resolve which. VIP labels,
Daily Purchase numerators/denominators, resource maxima and wallet holdings
are observations, not recovered cap, bonus, tier-escalation or reset rules.

## Jackpot receipts excluded from base-only behavior

- `batch-48.tsv:30`, idx2379,
  `Screenshot_20171125-211514-32326008349570b7.png`, filename2017-11-25:
  **1600%,fuel960,+3 Veteran Point Gift Certificates**.
- `batch-67.tsv:30`, idx3329,
  `Screenshot_20201011-121806_Blustone-a7393f7318acac7d.jpg`,
  filename2020-10-11: **1600%,fuel960,+3 certificates**.
- `batch-16.tsv:44`, idx793, `image0-9f7660e2fba6093f.png`, undated:
  **1600%,Challenge Invitations32,+3 certificates**.
- `batch-23.tsv:13`, idx1112, `image-453fe0d9cdce7f49.png`, undated:
  **Challenge Invitations32,+3 certificates**. This row does not itself state
  the1600% multiplier; that label must not be invented from the quantity.

These are individual observed outcomes, not original probabilities or a
license to implement guaranteed jackpots. No explicit normal100% fuel or
invitation receipt was found in the bounded audit. The base60/2 quantities
come from the purchase screens above, not960/16 or32/16 division. A base-only
local shop should grant neither jackpot multiples nor certificate bonuses.

## Identity and implementation boundary

The images name fuel and Challenge Invitations and label a coupon1 option.
They do not expose the selected shop/coupon internal item IDs. Art, generic
currency display identities and similar numbering cannot supply that join.
Native selector/callback evidence must be tracked separately. Any authored
reference IDs used by a revival profile remain LOCAL identities.

The strongest complete optional quotes are the two2018 screens above. Their
limits, resets, spending order and retry policy require explicit local
choices and independent native compatibility checks. The evidence artifact
does not publish runtime references, grant stock, alter AP/BP caps, enable
sales, sample RNG or migrate any saved data. It does not merge ordinary Market
stock, limited-time deals or paid monthly-package supplies into these native
resource-shop quotes.
