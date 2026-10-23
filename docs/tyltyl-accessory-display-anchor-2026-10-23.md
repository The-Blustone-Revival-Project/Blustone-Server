# Tyltyl accessory: a retained low-level equipment observation

The image-extracted text corpus contains a useful low-level accessory preview:
**Leather Crossbody Bag, Lv.1/10; Max HP0→7; displayed upgrade cost487**.
This provides a concrete future equipment-validation anchor. It does not supply
a complete original equipment reference, price record or usable upgrade policy.
No equipment, stats, price, ownership, progression or live setting is changed.

## Exact source and evidence class

Read-only DataDump path:
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-12.tsv`,
physical line49, primary `idx=598`, filename
`image0-2633dd84f1d6b79c.png`, dimensions1242×2208, screen_type `equipment`.
The retained TSV bytes have SHA256
`71f91a76f0d19d9b95a25b4e9ebb20c0bf2f1f73d088227122df5152e3ea2bb5`.

The row's `numbers_verbatim` records:

> screen=Upgrade Equipment; item=Leather Crossbody Bag Lv.1/10

It separately records the cooking-bag flavor text, ladle/apron/bag all Lv.1,
Strength4982→4996, Max HP0→7, Rupee wallet45231 and upgrade cost487.
`gear_state` says weapon/armor/accessory Lv.1 with accessory selected. Its
notes identify Tyltyl's accessory and the +14 Strength/+7 HP preview. Batch
confidence is `high`; `hit=no` means it was not a qualifying Hunter stat-panel
hit, not that the equipment observation was rejected.

This is a retained community screenshot transcription, not original GetCard
or price-table bytes. The current audit read only the text row; it did not
reinspect or copy raw media. The2026-10-14 path dates the extraction lane,
not the original screenshot, game version or balance era.

Original `CHAR_STR.json` corroborates the name under **both**
`004|ACCESSORY/EN` and `004_1|ACCESSORY/EN`: Leather Crossbody Bag. Its SHA256 is
`79537f24a5e4ce9fbf34cb58d5d3cb6a6d4abb8f26e19071c395946c081c64a1`.
Thus the name supports Tyltyl-family/slot identity; it does not uniquely select
ordinary004 versus awakened004_1. The row leaves `catalog_id` blank and does
not expose the actual equipment row `id`, owned Hunter rank or awakening.

## Relevance to the recovered level arithmetic

The original native `CSRCardInfoContainer::CalcStatByEquip` G87de28 selects
an exact slot/rank row. For equipment rank1 it decrements level before deriving
growth steps: level1 gives0 steps; level2 gives1. It then adds
`hp_up * steps` to the selected HP base, analogously for ATK and DEF.
`src/hunter-equipment.ts` preserves this arithmetic. Source details and addresses
are in `hunter-equipment-growth-native-2026-10-11.md`.

The observed0→7 HP preview is therefore compatible with a zero HP base and
seven HP per step **if** this screen uses that rank1 row/output. The source's
Lv.1/10 display alone does not recover its wire rank or prove that entire join.
It does not recover the raw `hp`/`hp_up` tuple: the native mode100 parser also
normalizes equipment stat/growth strings, and the display consumer must be
qualified before turning this numerical constraint into serialized fields.
Do not infer every unprinted stat is zero, or extrapolate to all ten levels,
other slots, Tyltyl variants or other Hunters. Likewise +14 Strength for this
preview does not independently prove a universal power formula.

## Boundaries before any activation

Keep487 as the observed displayed cost. Guild selection/benefits and other
discount context are unknown; do not normalize it to500 or call it the base
price. The displayed wallet is not the upgrade charge. Material quantities,
material IDs, all remaining price-row fields and the exact reference-table
level key remain unrecorded. Unmentioned materials are not proven zero.

`equipment-prices.ts` requires complete known item/quantity slots; the equipment
reference parser requires the exact ID, slot/rank/awakening and all stat strings.
Neither contract can be satisfied by this observation alone. The next useful
artifact is the matching complete equipment/price reference or a qualified
source join that supplies those missing fields. Until then this is a bounded
display/arithmetic anchor, with no server reference publication, paid transition,
zero-filled row, balance retune or native gameplay claim.
