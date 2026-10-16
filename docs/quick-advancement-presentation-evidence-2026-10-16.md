# Immediate Advancement package presentation evidence

This bounded read-only DataDump pass closes one historical preview's level
labels and identifies original package UI text/layout. It does not establish
an entitlement, purchase verification rule, eligible target set, final-rank5
outcome or a free advancement operation. No runtime/client was changed.

## Historical image: before Lv.1 and after Lv.1

Published transcription:
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-59.tsv`,
line43, idx2942, `Screenshot_20181101-173744-e9f52e46e103decd.jpg`.
File SHA256:
`c028688ddc4c3bcecb2543546dd49ab2f3ddfe5289dc010e50724263f26eddc4`.
The high-confidence row identifies Immediate Advancement Package LIMITED,
a pumpkin Hunter preview2603->5093 with4-star green badge, deactivation
timer00:57:24 and localized paid price. Filename date2018-11-01 is not
independently verified capture metadata. It is a package offer, not a recorded
completed transaction or resulting persisted owned card.

The existing DataDump-mirrored crop was directly viewed:
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/z59_2942_promo.png`.
SHA256:
`d102093cfbe8afa62ef28150a8d9a688d02d17fb2d8205839951e38a763b4919`.
It explicitly shows **before Lv.1,2603** and **after Lv.1,5093**, with the
same pumpkin portrait and gold-to-green ring. Thus the observed destination
preview is Lv.1. This does not establish that every package target resets
to1, that its source must be Lv.1, or that the pictured Hunter's identity
can be promoted from artwork alone. The crop's top edge does not fully retain
the star badges, so the4-star assignment remains the published full-view
transcription claim, separate from the newly verified Lv.1 labels.

## Original recovered client text and layout

Source: `sources/client-tables/recovered-data/leveldb-tables/all-tables.json`.
Complete file SHA256:
`f166f857d45c6dd68e97bd4b8f055be795796400fa10ba9f040aaa1b1d8f0a78`.
JSON pointers refer to the actual recovered table exports, not original
server reference IDs.

- `/tables/UI_TEXT_RO/1262`, key `즉시 고급 헌터로 승급`, line55549:
  English dynamic presentation is `Advance your hunter instantly to %s★!`
  followed by a stronger-Hunter sentence. The `%s` rank argument must be
  traced to its native producer before binding a package ID to a rank.
- `/tables/UI_TEXT_RO/1263`, key `즉시승급_미완료_알림_팝업_설명`, line55560:
  English says `Press confirm for an immediate advancement.`
- `/tables/UI_TEXT_RO/1264`, key `즉시승급_미완료_알림_팝업_타이틀`, line55571:
  English says the package was purchased but advancement has not been applied.
  These are positive presentation evidence for recovery of an unapplied
  purchase, not proof of what durable entitlement authorizes that recovery.
- `/tables/UI_JSON_RO/9866`, key
  `지금 즉시 ★4 고급 헌터로 승급하세요!|TX_SUB|EN`, line217004:
  static English text says `Advance your hunter instantly to 4★!`.
  This is an original4-star presentation record, not a proof that SU1 maps
  to4 or SU2 maps to5.
- `/tables/UI_XML_RO/161`, key `KO/PACKAGE/PACK_POP03`, line257571:
  the original layout places sprite `SPR_BG` with resource `PACKPOP_02`,
  a `PA_THUMB` panel containing before/after rectangles `RE_BEFORE` and
  `RE_AFTER`, each with `TX_EXP`, and a `TX_SUB` textbox2 bound through the
  dynamic text-global key above. Its title uses the immediate-package2 key;
  purchase, deactivation timer, terms and price controls are also present.

The recovered layout therefore uses a dynamic rank text owner despite the
separate static4-star text record. Neither file establishes the format
argument, a final5-star outcome, supported starting ranks or card eligibility.
Target portrait/stat construction and server settlement are separate owners.

Hashes of the exact UTF8 `raw` member values, after JSON decoding:

```text
UI_TEXT_RO/1262 c72c2e3b63ce823f907462b46db301fb7f5a6277aa0da95bcf1709aab42729d6
UI_TEXT_RO/1263 197847cc4b4e40ecc4fefca9474c5e89167bd0e6c84c0e3b82e712ed42a1a77e
UI_TEXT_RO/1264 2e918eb86d462b9612c22662a589f921b38a68a32c7c3fd79c8f31de54311acf
UI_JSON_RO/9866 3b36aef491eda13069695a1e7d031faf5ad86dd0d90360890c44a0cde584d041
UI_XML_RO/161 fd4eac9b0552c18abc60ccb9a92929db2cf6945d81dbb6c94eb52c12715fde00
```

## Native string vocabulary: locators, not outcome mapping

`sources/native/strings/native-all-strings.tsv` contains:

- line443878, original string ELF01d7a80a: `immediatly_rankup` (sic).
- lines445839/445840: `PACKPOP_04`/`PACKPOP_02`.
- lines445841/445842: `SU1`/`SU2`.

Its SHA256 is
`4fff32f5218ed6104200b8236a8c439248747366cca82056c6200081338269b7`.
`sources/native/hunters/ghidra-card-keys.txt` lines223/225 also resolves
`immediatly_rankup` at exported instruction locators `ldr@00ce029c` and
`ldr@00ce03aa`. String presence does not make
QUICKRANKUP, a package name or an image resource into a usable owned item or
receipt. No QUICKRANKUP/SU1/SU2 numeric policy table was found in the bounded
published client-table export lookup. Native companion analysis must close
the actual branch/rank/target/entitlement consumer before implementation.
