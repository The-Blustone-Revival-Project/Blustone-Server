# Fishing bait purchase native contract (2026-10-16)

Read-only final-client ARM inspection plus published historical image
transcriptions. This establishes a bounded LU003 shop offer seam without
restoring fishing catches or authenticating unknown original bait metadata.
Original `libnative_core.so` SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are code ELF offsets plus0x10000.

## Positive identity, quantity and request

`CSRMFishing::GetBait Gb2efd0` returns LU001 for selector0 and LU003 for
nonzero. `CSRPopUpMFishingBuyItem::SetLure Gcfc760` calls it atGcfc962 and
passes the exact result to `GetItemData Gaf109c` atGcfc96c. The same string
selects global buy limit atGcfcc2c, global offer atGcfcfee and price at
Gcfd190/Gcfd28e. Existing `fishing-reference-2026-10-11.md` pins those
literal identities and LU003's High-quality Bait main-scene label.

Original popup `OnButtonClick Gcfdad4` has these actual purchase calls:

- Gold path Gcfe1a4 loads popup+664 selector, Gcfe1aa calls GetBait,
  Gcfe1d4..1de stores item_inst_id full64 zero and qty1 on the stack,
  Gcfe1e4 selects price_type2, Gcfe1e6 calls RequestBuyGlobalItem Gf89ca8.
- Manda confirmation continuation Gcff026 loads the same popup+664 selector,
  Gcff02c calls GetBait, Gcff05a..064 stores item_inst_id full64 zero and
  qty1, Gcff06a selects price_type1, Gcff06c calls that same requester.

The exact packet is auth5 (`app_code/app_ver/market/pvid/otp`) plus
`target_ref_id`, `price_type`, `item_inst_id`, `qty`, sent to
`/shop/BuyGlobalItem`. There is no price, desired remaining stock, or nonce
field. An LU003 Manda purchase requests qty1, not qty10.

The displayed bundle amount comes from `global_item.provide_qty`. SetItem
resolves that key atGaf09ee/09f4, converts its numeric value to uint32 and
stores it at global mapnode+24 atGaf0a40. GetGlobalItemInfo Gaf14c8 returns
mapnode+1c (Gaf14dc), so this is GLOBAL_ITEM+8. Fishing SetLure loads
that exact offer+8 atGcfd09a, stores popup+660 atGcfd09e, and formats it
for the bundle label atGcfd0b0..0da. This positively separates one purchase
from its provided item quantity.

`GetGlobalItemPrice Gaf155c` requires the exact requested buy count;
missing tiers return0, not the last known price. Fishing SetLure computes a
next-count value atGcfd182..188, then queries gold atGcfd190 and Manda at
Gcfd28e. Original daily reset, tier schedule and limit values remain unknown.
Do not interpret screenshot12/12 alone as a recovered daily cap.

## Ordinary stock receipt versus global purchase counter

`ReqBuyGlobalItemCB Gf8b4a8` guards native success before settlement.
For an ordinary bait purchase the relevant receipt children are:

```
ret_data = {
  jackpot_level: 1, jackpot_multiply: 1,
  user: {iap: {iap_qty: CURRENT_PAID, free_iap_qty: CURRENT_FREE}},
  item: [{ref_id: "LU003", inst_id: FULL64, qty: DISPLAY_QUANTITY, added: 10}],
  target_inst: {item_id: "LU003", price_type: 1, buy_cnt: {prev: PREV, cur: CUR}},
  consumed_inst_list: []
}
```

Numbers other than the historical bundle10 are illustrative local receipt
positions. Neutral jackpot1/1 is local compatibility policy, not a recovered
original reward. Use authoritative scalar current wallet balances; AP/BP or
other resource branches are unnecessary. Item rows are an array even for one
stack, with strict ref_id and full64 inst_id, uint32 qty/added.

The native AddItem argument is **added**, not qty: Gf8bc5c loads added and
inst_id low/high from stack+5c/+60/+64, Gf8bc60 stores reference pointer and
added as stack arguments, then Gf8bc64 calls `AddItem Gaec508`. Qty is retained
in the GOODS_INFO result for presentation, not an absolute quantity assignment
on this path. Its original backend presentation convention is not established
by the storage operation alone. AddItem creates the new instance via SetItem atGaec5aa or
increments an existing exact64-ID quantity atGaec5be..5c2. Native does not
make repeated additive purchase receipts idempotent.

### Actual fishing continuation ignores the goods quantity

The fishing-specific result consumers are now positively identified through
their constructed function vtables, rather than inferred from ShopFuel:

- Manda continuation: literal LDR Gcff048 / ADD Gcff04e resolves ELF VA
  `0x2163708` (file `0x2162708`). The stored vptr is that vtable+8;
  its invoke slot points ELF `0xcef235`, Thumb body **Gcff234**.
  RTTI at ELF VA `0x2163734` names the nested
  `CSRPopUpMFishingBuyItem::OnButtonClick::$_4::operator()` purchase callback
  taking GOODS_INFO const&; its string is ELF `0x1e32a53`.
- Gold continuation: literal LDR Gcfe1c4 / ADD Gcfe1ca resolves ELF VA
  `0x2163650` (file `0x2162650`), with invoke ELF `0xceeb11`, Thumb body
  **Gcfeb10**. RTTI ELF VA `0x216367c`, name ELF `0x1e327fd`, explicitly
  identifies `CSRPopUpMFishingBuyItem::OnButtonClick::$_2` with GOODS_INFO.

Both bounded invoke bodies ignore the incoming GOODS_INFO argument: no read
of its register or members occurs. They restore the popup owner, re-run
SetLure with popup+664 (Manda Gcff296/29a; gold Gcfeb72/76), then use
GetResultCode and a localized success toast. No goods-result popup or
receipt item.qty formatter is called on these paths. The refreshed Current
Amount comes from ordinary inventory, while the bundle label comes from
provide_qty as closed above. Therefore a receipt qty equal to post-purchase
stock would not directly display that stock as the bundle in this popup.

This does not recover the original backend's meaning of item.qty or all
other GOODS_INFO consumers. A bounded local offer can explicitly choose
qty10 as nominal purchased goods, with added10 as the actual stock delta;
describe that choice as LOCAL rather than a recovered absolute-stock field.

`target_inst` is a separate **global buy counter**. It reads strict item_id,
price_type and buy_cnt.cur; SetGlobalItem is called atGf8be2a and
SetItemBuyCnt atGf8be7e. It does not create bait stock. The optional
`target_item_inst:{inst_id,qty}` instead sets a payment item's quantity
absolutely atGf8bfac; omit it for the Manda-only offer. GetItemInven restores
ordinary stock rows and separate `global_item` rows with scalar buy_cnt;
see `findings/economy/shop-fuel-price-and-inventory.md` in DataDump.

## Bounded metadata admission and first-stack behavior

The inspected SetLure body uses the selected item INFO strings at+20/name
(Gcfcb6c),+2c/description (Gcfce18),+38/thumbnail (Gcfce70). It does not read
INFO+4/use_type or INFO+44/effect. AddItem Gaec508 does not consult GetItemData
or use_type before its ordinary item-map insertion/increment. UpdateBait
Ge6ea88/8a selects GetBait(1), then Ge6ea92 calls GetInstItemCnt Gaeca80.
No use_type/effect condition was found in these bounded purchase, stock and
counter paths. Therefore a clearly LOCAL neutral use_type0/empty-effect
metadata row can support this seam. This does not recover the original bait
classification, thumbnail_id, effect, rank or downstream cast/catch behavior.
Do not infer those fields from this absence of a condition.

Important: GetInstItemCnt's generic LU branch does **not aggregate** matching
stacks. It compares exact ref strings atGaeced2..cf14 and returns the FIRST
matching item's quantity atGaecf42/44; it does not filter lock there. A local
purchase should preserve one unambiguous existing stock identity or create
one fresh identity, and refuse ambiguous duplicate LU003 stacks. Summing them
on the server would misrepresent this native popup/counter.

## Historical image and remaining limits

DataDump
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-56.tsv`,
line46, idx2795, filename
`Screenshot_20180702-221639-0c934c2cf44bad3d.png`, records High-quality Bait,
Current Amount9, bundlex10, Purchase with Manda6 and Daily Purchase12/12
marked OCR. Source TSV SHA256:
`6b8acb8ebfe1c1bd0d3f6ef82e233308b1c81dd67d827d92fd3269b7966bded6`.
This supports an optional HISTORICAL10-for6 offer. It does not prove current
2.8.0.1 pricing, all purchase tiers, a12-per-day limit, reset timing, or a
LU001 offer. Any daily cap/schedule and free-first wallet policy must remain
explicit LOCAL choices. Default purchase behavior should stay disabled.

Published native sources include DataDump
`sources/native/economy/ghidra-shop-fuel-contract.txt`,
`sources/native/strings/ghidra-shop-fuel-strings.txt`, and
`sources/native/symbols/native-evidence.tsv`. Fresh bounded Thumb inspection
closes the fishing-specific popup calls and generic first-stack quantity path
above. No original library, DataDump, runtime, UI or save was modified.

Catches remain a different boundary: positive fish_id invokes additive
AddInven/UpdateRecord in ParseEnd; no original fish item identities, pool
membership weights, catch grade/length distributions or End grant economics
are recovered by this bait purchase. A bait stock offer can be substantive
without claiming ordinary fishing settlement or a native successful catch.
