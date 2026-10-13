# Gem equip confirmation: raw removal totals independent of Guild affiliation

Original bounded Thumb evidence only; no numerical price rows or Gem instances
were invented. No live inputs/save/client/APK or DataDump changes. Original
ARM SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses are Ghidra, code ELF offsets subtract10000.

This closes the qualification gap in `gem-configured-removal-2026-10-13.md`:
the ordinary gold2 removal/replacement confirmation uses raw old-level prices
for affiliated actors too. It does not use polishing's Guild benefit2.

## Exact quote-to-total-to-funds chain

`CSRPopUpEquipGemConfirm.SetGemInfo` Gbc8b70 captures BEFORE and AFTER grids
at Gbc8b82. Its local pointer r6 becomes popup+b0 at Gbc8b96. It initializes
both cached currency totals to zero with STRD at **Gbc8baa**, addressing
r6−14 = popup+9c/+a0. This is an actual zero-cost empty-before initialization,
not a missing-price sentinel interpreted as a free quote.

The three equipment groups/two columns and old-cell changed gate are already
closed in `gem-mount-position-replacement-native-2026-10-11.md`. Gate
Gbc906a..072 requires nonnull BEFORE and changed. On each qualifying cell:

- Read OLD Gem level Gbc9076.
- `FindGemDisassemblePrice(level,type2)` call Gbc9084.
- Load raw returned price at Gbc908a; ADD to cached gold Gbc9090;
  STR to popup+9c Gbc9092.
- Separate type1 quote at Gbc90a2; raw ADD/STR to popup+a0 at Gbc90ae/0b0.
- Increment changed-old counter+a4 at Gbc90b4..0ba.

`FindGemDisassemblePrice` Ga54f5a reads 12-byte records, matches exact OLD
level Ga54f66..6a and payment type Ga54f6e..72. Match copies the raw
price+8 directly at **Ga54f8e..94**; it performs no fee transformation.
Miss returns type9/level0/price0 at Ga54f7e..88. That remains unavailable
quote data, not permission for free occupied-cell removal.

The gold button in `OnButtonClick` Gbc80e8 then loads the **same cached total
popup+9c** at Gbc8606. It reads actual PlayData gold+154 Gbc8612 and compares
at Gbc8616; success branches Gbc8618 to Gbc86a8. At Gbc86b0 it loads that
same cached total again, sets **price_type2** Gbc86c8, and dispatches the
confirmation event at Gbc88d6. The target is
`CMEventPool<PRICE_TYPE,int,const map<EquipType,list<uint64>>&>.Call` GbcBc14;
its arguments are selected payment, cached amount and AFTER combination map.
The requester serializes payment/grid, not a trusted arbitrary requested fee.

Full bounded SetGemInfo Gbc8b70..GbcAe68 inspection finds the two accumulator
stores above and later display reads Gbc9286/Gbc93d4/Gbc944a; no subsequent
cached-total rewriting. The outbound gold funds and callback amount use these
raw totals. This is positive data-flow proof, stronger than merely finding
no direct Guild call in one fragment.

## Affiliation and free mounts

The source chain does not consult personal Guild ID/status/role/newbie,
Guild INFO/contribution or Guild numeric benefit tables to produce, check or
forward this gold2 fee. Gem polishing separately calls
`CalcBonusSaleValue(BENEFIT2,price)` at Gbce90c; that adjustment must not be
transferred to Gem equip/disassembly/removal.

An empty BEFORE grid initializes total0 and never enters the changed-OLD fee
gate, so mounting into empty eligible positions is free regardless of Guild
affiliation. Unchanged old cells also charge nothing. Clearing or replacing
one occupied position adds its old-level raw fee. Moving/swapping within the
same target can charge multiple changed old positions; no global old-ID fee
deduplication occurs. None of these cases needs Guild level references.

Native ADD totals wrap modulo2^32. The existing local helper refuses totals
above uint32 rather than reproducing an undercharged wrapped quote. It retains
all prior exact identity, ownership, unique occupancy, equipment second-slot
rank3, active/Mirage, complete-instance receipt and persistence checks.
Cross-Hunter transfer and type4/GDP payment remain refused; raw gold2 evidence
does not establish those currencies or source-target settlement. An actual
old-cell fee still requires an explicit matching type2 price row. No original
numeric amount has been recovered here.

## Actionable boundary

The blanket nonzero-Guild gate can be removed for the existing supported free
empty mount and configured gold2 same-target removal/replacement/swap planner.
Do not supply a Guild multiplier or require numeric Guild level tables for
this operation. Preserve the wallet-neutral/free or raw-gold receipt, full
Gem-instance echo and atomic rollback; Guild membership/history/counters must
remain unchanged. Live rendered confirmation and full original economy remain
unverified.
