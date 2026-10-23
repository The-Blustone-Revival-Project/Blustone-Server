# Sparse observed gold and Manda jewel removal quotes

`config/policies/gem-removal-observed-gold-manda.json` is a separate optional
eight-row input to the existing `BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON` /
constructor `gemDisassemblePrices` seam. It leaves the earlier gold-only
dataset unchanged. At levels1/6/7/15, payment1 Manda is respectively
**2/15/17/40** and payment2 gold **2500/15000/17500/40000**.
No new mode, default, launch profile, activation or owned Gem is introduced.

The companion provenance JSON hashes and references the existing five exact
manual TSV anchors rather than presenting them as new observations. All raw
row and source-file pins, screenshot names/dimensions and unavailable original
screenshot-byte hashes remain in the original gold-only provenance. Level1 is
corroborated by two different named/ranked jewel screens. Other levels and
payment4 remain unavailable. No interpolation, ratio, price escalation or
original full-table completeness is inferred. The observed level7 Manda17
must not become17.5 by dividing gold by1000; level15 remains40000/40.

## Type1 is the Manda button and paid-plus-benefit balance

Read-only bounded original Thumb source, final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra addresses are original ELF offsets plus0x10000.

The detail-display closure in `gem-removal-observed-gold-2026-10-23.md`
already proves type1 raw price goes to `UI_EV_ST_MD`; type2 goes to
`UI_EV_ST_CO`. The independent confirmation path closes currency and funds:

- `CSRPopUpEquipGemConfirm.OnButtonClick` Gbc80e8 compares the clicked
  button against literal **BT_BUY_MD** at Gbc8594/Gbc859a, resolving
  G1d7e833. The next branch's literal is **BT_BUY_RP**, G1d7e83d.
- Manda calls `CPVDataMgr.get` Gbc85ac and loads words+9c/+a0 Gbc85b0.
  It adds the two balances Gbc85b8, compares the cached type1 total at
  popup+a0 Gbc85b4/Gbc85ba, and enters the sufficient-funds path Gbc8638.
  Insufficient funds instead invokes the deficit popup Gd23cd4 at Gbc85d6.
- Paid/benefit identities are independently explicit in
  `CPVDataMgr.ParseLoginResult` G7e2784: literal `iap_quantity`
  G7e2ae6/G7e2aea resolves G1d69b05 and its parsed amount stores at+9c
  G7e2b7a; `action_benefit_quantity` G7e2b74/G7e2b78 resolves
  G1d69b12 and stores at+a0 G7e2bcc. Thus the Manda button admits against
  their sum. It does not use GDP, gold, item quantity or the legacy gem scalar.
- The sufficient path reloads exactly popup+a0 into the event amount r2
  Gbc8640, sets **PRICE_TYPE1** in r1 Gbc8658, and enters the same typed
  confirmation event at Gbc88d6. The gold path separately sets type2
  Gbc86c8. `CSRGem.RequestGemEquip` Ga557cc serializes `price_type` with
  target Hunter and the complete desired six-cell combination; it does not
  authorize an arbitrary client-supplied debit amount.

This proves currency selection, total funds admission and typed outbound
selection. It **does not prove original server debit order** between the two
Manda balances. Any free-first server implementation remains explicit LOCAL
policy, matching the project's other paid systems. Signed32 total/fee admission
and overflow refusal are server policy, not inferred historical prices.
The source button itself uses a signed comparison after adding the words;
the server must reject unsupported sums rather than reproduce wrapped funds.

The shared old-level lookup and direct display/confirmation amount have no
Guild price adjustment. Polishing's separate benefit must not modify these
quotes. Full refreshed Gem rows and absolute paid/free Manda receipt channels
remain required by `ParseGemEquip`; no additive refund/replay is implied.

## Limits and verification

These are undated historical manual transcriptions, not recovered original
server rows or a proven final-version coherent table. No fresh screenshot
inspection occurred. The detail panel formats missing native price sentinels
as zero: even this two-currency input leaves missing levels misleadingly
displaying0. The server must still refuse unavailable fees; a zero label
does not authorize a free removal. Type4 remains unsupported.

Run `npx tsx tests/gem-removal-observed-gold-manda.ts` for exact ingestion,
reused provenance/hash/pair checks, original gold-row equality, missing-level
and alternate-payment absence, duplicate refusal and input preservation.
Transaction support and its wallet/persistence tests are separately owned
work; this dataset alone neither enables payment1 nor claims native gameplay.
