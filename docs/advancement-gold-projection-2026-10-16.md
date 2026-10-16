# Optional historical advancement fee projection

`BLUSTONE_ADVANCEMENT_GOLD_PROFILE=screenshot-effective-quote-projection`
publishes rank-up price vector `[1000,1000,4000,15000]` through
`/reference/GetCardEnhancePrice` and uses that same vector for settlement.
Default `legacy` retains `[1000]`, clamped across ranks. Level training stays
`[100]` in both modes. Rank1/2 prices remain existing local fixtures; they have
not been recovered from the images.

These are **effective historical screen fees projected into local raw price
inputs**, not recovered original undiscounted server prices. Guild membership
and discounts in the historical images are unknown. Existing configured Guild
adjustments still apply per source in the current replica; that composition is
local policy and does not establish a historical Guild discount.

The [curated image notes](advancement-image-quotes-2026-10-16.md) preserve9 exact
rows from7 source files. Portable evidence is
`resources/reference/advancement-screen-quotes.json`, SHA256
`05778a93c35d63b2bfd02200e79c445c3c56850ed1e4f9c744f946fcfd40c424`.
Runtime selection checks that exact file and derives the two changed unit fees
from independently identified count/total anchors:

- idx1995, dated2017-08-12: three selected real materials, no PASS, rank3→4,
  total12000. Source count comes from the mirrored `z1995_mat.png` crop;
  the crop omits the fee, which comes from the same-index manual transcription.
  This yields screen-effective4000 per real source.
- idx1426 and1535, undated: three PASS placeholders and one real material,
  rank4→5, total15000. Two independent high-confidence transcriptions agree.
  idx1365 separately corroborates at medium confidence.
- idx1818, dated2017-06-19: four selected materials with total60000 corroborate
  four times15000. The source distinguishes selected materials from candidates;
  the original image was not freshly inspected for this checkpoint.

Later1440/3840/43650 observations remain explicitly unresolved. No era, account
timeline, undiscounted curve, or discount percentage is inferred from them.
The projection does not cover every historical screen or claim final2.8 parity.

## Native integration and partial advancement

The existing [per-source fee audit](hunter-training-guild-per-source-fee-native-2026-10-13.md)
closes the arithmetic. Rank-up UpdateRankupInfoG1039c40 loops selected real
source IDs, skips credited placeholders, obtains each source's rank atG1039cea,
calls GetCardRankUpPriceG87f322 atG1039cec, then applies Guild TYPE3 before
adding that source's adjusted amount. The vector getter uses rank−1, rank0's
first element, and last-element clamping. Total UI fees must not be inserted
directly as per-source prices.

Existing `/gym/RankUp` uses the same rankUpPrice helper and Guild fee path.
Thus three real grade3 sources cost12000 under neutral local Guild settings;
one actual grade4 source with three credited slots costs15000; four real grade4
sources cost60000. Prior credited slots are not charged again. The inferred
partial-rank transition policy, EXP reset on completed promotion, caps, source
ownership/lock/deck/battle protections and book persistence are unchanged.

Bulk rank-up also imports the shared price vector. Its currently admitted
source ranks1/2 retain their prior fixture prices and level-training prices.
There is no quote override in a request, no currency/EXP/material grant and no
new schema or owned-state field. Selection happens at server process import;
changing an environment variable inside an already running process does not
hot-reload its price table. Native Android training pixels remain unverified.

## Verification and next work

The new state check uses disposable production-namespace Hunters and confirms
the published price vector equals the settlement vector. It exercises partial
and completed grade3/4 promotions, exact gold debits, shortage, source ownership,
book/allocator preservation, actual write and blocked-rename failure rollback,
peer isolation and process-independent restore. A compiled HTTP proof uses an
owned ephemeral replica and signed P384/HMAC/AES requests, then restarts with
the persisted transport key and OTP. `npm run test:advancement-gold` builds and
runs those two checks. See AGENTS.md for completed verification results.

The separate [quick-advancement audit](quick-advancement-use-item-native-2026-10-16.md)
identifies original SU1/SU2 references and their `/world/UseItem` caller. It does
not yet close target restrictions, resulting EXP, or cached entitlement state.
UseItem remains guarded. This fee projection must not be treated as permission
to consume those tickets or invent their awards. No live profile, save, client,
APK, DataDump source or original resource was changed by this checkpoint.
