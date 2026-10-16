# Fuel and Challenge Invitation shops (2026-10-16)

Optional `archive-2018-base-only` restores the complete historical quotes:
60 fuel or2 Challenge Invitations for5 Manda,5000 Rupees, or one coupon.
The default remains AP10/BP5 for5 Manda/100gold. This is server reconstruction;
Android popup and live purchases remain unverified. No live deployment, save
change, coupon issuance, client rebuild or APK release was performed.

## Evidence and native contract

The [image notes](resource-shop-image-quotes-2026-10-16.md) retain14 exact rows
from14 DataDump source files, with raw row and source hashes. The runtime pins
`resources/reference/resource-shop-screen-quotes.json` SHA256
`5c82b482ace33c9333e3aa4b970bf1e09836f33a48812c5c9b28ab2b7ae1a94b`.
Fuel2018idx2840 and invitations2018idx2478 have complete base quotes. Other
prices and jackpot receipts are preserved as separate observations, without
inferring a universal version, rank formula, probability or bonus award.

Immutable native ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below are Ghidra addresses. AP InitGd49bfa selects use_type1;
BP InitGd46da4 selects use_type2. Both call GetItemRefID and retain the selected
reference string; original item/coupon ID strings remain unknown. Stable LOCAL
`local_ap`/`local_bp` replace existing rows rather than adding duplicate native
selectors. Amount is atoi(item.effect)*provide_qty: APGd4a2b6/c6/d2 and
BPGd474b4/c4/c0. Effect60/2 with provide1 is a LOCAL decomposition.
Original IT_ST/IT_LT remain local display bindings; coupon thumbnails are blank.

Both popups share each resource's allowance across payment types2,1,4:
APGd4a102/15a/1b2 adds counts then subtracts them Gd4a1fe..212;
BPGd47294/2ec/344 and Gd473ea..404 do the same. Native VIP type5 benefits
UPGRADE_NUMBER_AP_CHARGE (Gd4a084) and UPGRADE_NUMBER_BP_CHARGE (Gd4738e)
can expand allowances. Historical mode currently requires neutral VIP benefits.
Neither the original cap nor rank formula/reset timezone is established.

All native buys request qty1. Manda1 and gold2 use instance0; coupon4 uses
the full owned uint64 instance ID. AP handlers Gd4b20c/Gd4b916/Gd4c4b4;
BP Gd48572/Gd48a56/Gd49588. Coupon references and positive quantity1
must be supplied even in default fixtures: missing/zero affordability could
reach unchecked APGetItemInstGd4b160 then VLDRGd4b168, or BPGetItemInst
Gd484c6 then VLDRGd484ce. Neutral LOCAL coupon references prevent the empty-ID
path. Default coupon purchases still refuse; enabling historical mode grants
no stock. Original coupon producers remain unknown.

ReqBuyGlobalItemCB reads only the changed resource branch:
APGf8b776/77a reads user.ap.cur, Gf8b82a..838 nested ap_charge_time;
BPGf8b886/88a reads user.bp.cur, Gf8b8dc/e0 nested bp_charge_time.
SyncAPGf8b862/SyncBPGf8b934. The server supplies truthful prev/cur pairs and
the existing resourceChargeTime deadline. Manda updates scalar user.iap;
gold updates user.gold.cur. Coupon receipt target_item_inst has exact numeric
uint64 inst_id and ABSOLUTE remaining qty, never a prev/cur pair or negative
delta. consumed_inst_list remains empty to avoid double debit.
target_inst carries item_id,price_type,buy_cnt:{prev,cur}; GetItemInven publishes
scalar counts for1/2/4 including zero resets. Normal jackpot1/1 selects shared
NORMAL_LOGO (Gd50ee4→Gd50fd8); deterministic base-only payout is LOCAL.

## Transaction and compatibility policy

Daily caps are explicit independent AP/BP settings, shared across all three
currencies. UTC rollover, monotone day handling, free-first Manda debit, local
IDs, cap values and no jackpot are LOCAL policies. Existing fuel_shop/bp_shop
manda/gold counts remain canonical. Enabling the mode, disabling it, or changing
quote/cap never resets paid history. Captured coupon counts continue to count
against default shared caps when historical mode is disabled.

The pure purchase plan validates funds, qty, ownership, coupon lock and unique
instance/ref stack, signed resource capacity and client override fields before
changing anything. It preserves overflow. Wallet, resource, counter and selected
coupon quantity commit in one write. Failed writes restore scalar fields and
the exact prior counter/coupon references. Inventory UTC resets also roll back
their counters on failed persistence. Existing lazy AP/BP regeneration remains
an independent preceding boundary; clock changes due to that boundary are not
claimed as purchase mutations. There is no recovered nonce or exactly-once
transport guarantee: another funded accepted call is another purchase.

The first real resource coupon payment adds optional coupon history to its
existing shop counter and promotes the state to schema9. This field survives
zero-stock/UTC rollover and disabled mode. Schemas1..8 with captured resource
coupon history refuse before normalization;9 requires captured history and
quest/dispatch arrays. Rupee8/profile7/bait6/comments5/linear4 data survive9.
Manda/gold-only accounts retain their earlier schema. Startup never creates a
coupon count or changes ownership.

## Use and verification

Set all three variables on a disposable replica first:

```text
BLUSTONE_RESOURCE_SHOP_MODE=archive-2018-base-only
BLUSTONE_RESOURCE_AP_DAILY_LIMIT=3
BLUSTONE_RESOURCE_BP_DAILY_LIMIT=3
```

The limits3 are examples, not historical defaults. Both must explicitly be
integers1..1000. Unknown/incomplete/cap-only configurations refuse startup.
Use the documented launcher/profile workflow; do not start a second writer
against a live state file. Turning the mode on cannot create coupon stock.

`npm run test:resource-shop` builds and runs the compiled state and encrypted
HTTP proof. `npm test` includes the source policy and state checks.

Focused policy/state checks cover pinned quotes, unique resource selectors,
legacy-history carry, all payments, shared caps, UTC rollback/reset, exact wide
coupon identities, resource isolation, overflow, schema downgrade refusal,
restart and failed persistence. A separate compiled HTTP test owns only its
temporary replica, encryption session and authored coupon fixture. Native
Android validation, original coupon IDs/producers, VIP rules and jackpots remain
pending. See the current AGENTS continuation for actual check results.
