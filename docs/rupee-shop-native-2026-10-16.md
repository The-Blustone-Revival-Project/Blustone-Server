# Rupee shop native contract and historical base-only projections (2026-10-16)

The native gold shop can be restored through explicitly LOCAL item identities,
a named historical base quote, an explicit shared daily cap and a no-jackpot
policy. Neither the original shop/coupon IDs nor the original jackpot odds or
quota policy are recovered. RP1 remains a separate currency display reference;
it is not proved to be the native shop item.

Original final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are code ELF plus0x10000. Bounded code/literal inspection reads
immutable DataDump originals; no UI, private save or client was changed.

## Identity and value consumers

`CSRPopUpShopGold::Init Gd4cd38` calls
`CSRItemInfo::GetItemRefID(use_type11)` atGd4cde4/6 and stores the selected
reference at popup+d4. GetItemRefID Gaf1374 traverses the item map, tests
INFO.use_type at node+20 (Gaf1388/8a), and returns that matching INFO's own ID
string at node+30 (Gaf13be). This is positive native classification11, but
not an original ID spelling. Multiple matching type11 records create an
ambiguous native first-record selection and must not be silently published.

The popup calls GetGlobalItemTicketRefID Gaf1518 atGd4ce0e and retains its
result at popup+e0. The required coupon quantity comes from
GetGlobalItemTicketNeedQuantity Gaf1540 atGd4ce36, stored popup+f0 atGd4ce3a.
Those values come from the chosen global_item row's ticket_ref_id/ticket_qty;
no fixed original coupon ID is embedded in this path.

Display base amount is **atoi(selected item.effect) multiplied by
GetGlobalItemProvideCnt(selected ID)**. Gold UpdateText Gd4d488..4a2 and
BuyGlobalItemCB Gd4d6b4..6d6 positively read that string effect and global
provide count. The historical screenshot amount5000 therefore does not
recover whether the original decomposition was5000×1,1000×5 or another
combination. The module deliberately authors LOCAL effect5000/provide_qty1.

## Purchase packets

Both paths call `CSRSyncShop::RequestBuyGlobalItem Gf89ca8`, posting
app_code/app_ver/market/pvid/otp plus target_ref_id, price_type,
item_inst_id:uint64 and qty:uint32 to `/shop/BuyGlobalItem`. No price,
jackpot selection, desired balance or nonce is sent.

Manda confirmation Gd4ee06..ee18 passes selected popup+d4 target_ref_id,
price_type1, full64 item_inst_id0 and qty1. Coupon purchase Gd4df94..dfb0
passes the same target reference, price_type4, the ACTUAL owned coupon
instance and qty1. The coupon stock is looked up using the global ticket
reference, not the gold pack's reference.

Coupon safety matters even when only Manda is configured. The native button
compares required coupon quantity to GetInstItemCnt atGd4dbbe/c0. On the
accepted path GetItemInst Gd4def6 is dereferenced without a null guard at
Gd4defe/e02. Publishing empty coupon identity with requirement0 can admit
an invalid native lookup. This module publishes a nonempty LOCAL coupon
identity with positive requirement1 and never grants any stock from metadata.

GetInstItemCnt's generic branch returns the first matching stack, not an
aggregate (Gaecef0..Gaecf44; details in fishing-bait-purchase-native-2026-10-16).
For coupon purchases the local planner requires exactly one matching coupon
reference row, rejecting ambiguous duplicates including zero rows. A selected
owned locked or empty coupon also refuses. This admission is LOCAL policy.

## Shared limit and per-payment price/counter

Gold UpdateText obtains Manda count1 atGd4d28e/290, gold count2 atGd4d2e2/2e4
and coupon count4 atGd4d33a/33c. Gd4d374/376/37a subtracts ALL THREE from the
limit, clamps negative results to0 atGd4d37e and stores remaining at popup+ec
Gd4d384. Both coupon (Gd4db52..58) and Manda (Gd4dc3c..46) buttons require
positive remaining. A Manda-only cap with unlimited coupons conflicts with
this original UI: the supported LOCAL cap must be shared.

The native display limit also adds a VIP benefit: matching type5 and exact
name UPGRADE_NUMBER_GOLD_EXCHANGE is selected atGd4d214..23c, its value is
atoi-parsed Gd4d24c and added to the global buy_limit Gd4d252. Root integration
must preserve a neutral matching VIP-benefit catalogue or otherwise prove its
server cap agrees with the displayed bonus. Current starterLevels.vip_group
is empty; no unknown original bonus amount is inferred by this module.

Manda price lookup still uses the Manda-only count+1 atGd4dcb2..cbc, regardless
of coupon uses. GetGlobalItemPrice Gaf155c requires an exact buy-count tier;
missing tiers yield0. Publish every LOCAL cap tier at the chosen fixed Manda
quote and enforce the shared cap server-side. No gold-payment tier is
published. Inventory restoration supplies global_item scalar counters for
price types1,2,4, including explicit zeroes on reset; target purchase receipts
instead use the matching payment's buy_cnt prev/cur pair.

## Exact success receipt and neutral presentation

`ReqBuyGlobalItemCB Gf8b4a8` handles user.gold.cur and assigns the absolute
PlayData gold balance atGf8b750. A truthful user.gold prev/cur pair is suitable;
this callback reads cur. On Manda payment user.iap.iap_qty/free_iap_qty are
SCALAR current balances, not pairs. Omit that branch for a coupon purchase.

For both payments, root ret_data.target_inst is:
`{item_id:PACK_ID,price_type:1_OR_4,buy_cnt:{prev:OLD_TYPE_COUNT,cur:NEW_TYPE_COUNT}}`.
The callback calls SetGlobalItem Gaea864 atGf8be2a and SetItemBuyCnt Gaec9c2
atGf8be7e. These are global purchase counts, not a new owned gold-pack stack.

Coupon payment also supplies root
`target_item_inst:{inst_id:EXACT_NUMERIC_U64,qty:ABSOLUTE_REMAINING}`.
Its identity key is Gf8bee0/e2 and scalar qty Gf8bf3c/3e; callGf8bfac invokes
SetItemQuantity Gaec4bc. That setter searches the full64 ID and writes its
quantity absolutely atGaec502. It does not add, subtract, delete on zero, or
insert a missing ID. Do not encode qty as a pair. Keep consumed_inst_list[]
empty to avoid additionally subtracting that same coupon. No ret_data.item
award is necessary for a wallet gold grant, and no GC6 bonus is inferred.

Neutral ret_data.jackpot_level1/jackpot_multiply1 is deliberately LOCAL
no-jackpot policy. Source proves this level has the normal presentation:
Gold callback Gd4d6f0..6f6 carries GOODS_INFO jackpot fields into the result
parameter; CSRPopupShopResult.Init Gd50bd0 stores those fields and reads
jackpot level at popup+b4 Gd50ee4. Level1 branches atGd50ee8/eea toGd50fd8,
which selects the **NORMAL_LOGO** resource atGd50fe8/fea. Levels2/3 follow
separate branches. This closes the level1 presentation choice, not original
probabilities or a claim that original purchases could not jackpot. A numeric
multiply1 preserves the authored base5000 amount. An empty bonus list avoids
manufacturing original special-ticket jackpot extras.

## Pure model and evidence pin

`src/rupee-shop.ts` exports the requested policy/counter/reference/inventory
and planner helpers. Modes archive-2017-base-only and archive-2021-base-only
publish base5000 for Manda10 and5 respectively. Both require an explicit LOCAL
shared cap1..1000; disabled is the default. UTC reset, monotone backward-clock
handling, free-first spending and signed32 gold ceiling are LOCAL choices.
Stored counter fields are day/manda/coupon and their sum must be positive.
The planner validates stock/identities/wallet before returning detached values
and an optional selected coupon index/remaining plan. It mutates no input.
Root authenticates and atomically persists wallet, counter and selected coupon
quantity together, preserving zero rows and rollback on persistence failure.

The source artifact is
resources/reference/rupee-shop-screen-quotes.json, SHA256
`2b87d9a7576ff81d1b52bdbed7f6c2169c738c8180e61a88d1d46c29c3968bf5`.
The module verifies that pin lazily through repositoryPath, all raw TSV row
hashes, and distinct dated2017-price10 /2021-price5 plus coupon1 anchors.
It has no runtime DataDump dependency. Dates come from filenames, not verified
capture metadata. Historical price drift is kept explicit rather than silently
choosing the newer figure as final-version truth.

Tests cover both quotes and pins, reference detachment, shared counter
arithmetic/reset/rollback clock, wrong packet/payment/aliases, Manda free-first,
full uint64 coupon numeric emission via JSON.rawJSON, absolute zero remainder,
locked/ambiguous/short coupon stock, U32 quantities, signed gold boundary and
input immutability. Focused tests and TypeScript build pass. References create
no coupon, balance, jackpot, history receipt or original identity. No native
UI purchase or live activation is claimed.

Primary retained DataDump sources:
sources/native/economy/ghidra-shop-fuel-contract.txt,
sources/native/strings/ghidra-shop-fuel-strings.txt,
sources/native/economy/ghidra-shop-fuel-price.txt and native symbol index.
Fresh bounded Thumb slices above close the separate Gold popup, rather than
assuming it shares ShopFuel's limit semantics.

