# Optional historical Rupee exchange

```powershell
$env:BLUSTONE_RUPEE_SHOP_MODE = "archive-2021-base-only"
$env:BLUSTONE_RUPEE_SHOP_DAILY_LIMIT = "3" # Explicit LOCAL shared cap
npm run build
npm start
```

Default is disabled. archive-2021-base-only uses a single high-confidence
2021 screenshot quote of5,000 Rupees for5 Manda. archive-2017-base-only uses
repeated2017 quotes of5,000 for10 Manda. Different VIP/era/tier contexts and a
lower-confidence7-Manda observation prevent treating these as universal prices.
No current profile was activated for this work.

## Original selectors and local identities

The native gold popup selects an item by use_type11, then reads its global
item row for coupon ID, need, provide quantity and prices. No original gold
shop/coupon ID is hardcoded in the inspected producer. Their original strings
remain unrecovered; RP1 is an independent currency-display identity.

This mode supplies local_rupee_pack with use_type11/effect5000 and global
provide_qty1, plus local_rupee_coupon with a positive ticket_qty1. The5000x1
decomposition, neutral metadata and IT_CO display association are LOCAL.
Neither identifier is advertised as recovered. No coupons or item stock are
granted when the mode is enabled. There must be one selected type11 item.

An empty coupon ID with required quantity0 is unsafe: the native affordability
check can pass before an unchecked owned-instance lookup. The positive local
coupon requirement keeps the coupon button unfunded until a real owned stack
exists. Multiple matching coupon stacks, including zero rows, are refused for
coupon purchases because native quantity reads select the first match.

## Payment, cap and exact receipt

Both packets use target_ref_id local_rupee_pack and qty1, without a price.
Manda uses price_type1/item_inst_id0. Coupons use price_type4 and the actual
owned full64 coupon instance. Free-first Manda spending is LOCAL policy.
The2017/2021 Manda price is applied uniformly to published local tiers; an
original VIP discount or tier formula is not inferred.

Native remaining quota is buy_limit plus the VIP gold-exchange benefit,
minus counters for types1,2 and4. Both buttons guard that same remainder.
The mode therefore requires an explicit SHARED daily cap, publishes all three
inventory counters including gold-payment0, and supports only the current
neutral VIP benefit tables. It refuses startup if those tables become
non-neutral until the cap calculation is made coherent. UTC reset and
rollback-clock handling are local policy, not recovered original reset rules.

Success updates user.gold.cur absolutely. Manda also synchronizes scalar IAP
balances. target_inst records the chosen currency's buy_cnt prev/cur pair.
Coupon success additionally returns target_item_inst:{inst_id,qty}, where qty
is ABSOLUTE remaining quantity. The native callback uses SetItemQuantity;
consumed_inst_list is empty so the coupon cannot be debited twice. Exact
uint64 numeric receipts use JSON.rawJSON for wide canonical stored identities.
Gold growth is capped conservatively to signed32 as local wallet policy.

Every purchase grants exactly5,000 Rupees with jackpot_level1/multiply1.
The original result popup's level1 selects NORMAL_LOGO; that presentation is
source-proven. Choosing a deterministic base payout is LOCAL, not recovered
RNG. Screens showing200%/10,000 or1600%/80,000 plus3 certificates do not supply
probabilities. No GC6 bonus, random draw or lottery pool is invented.

## Persistence and limits

The purchase uses an already loaded account game. Gold, Manda or selected
coupon quantity, and account counters commit in one write. Failure restores
original scalar values, coupon object contents and counter reference/absence.
AP/BP, other item rows, party, allocators and unrelated accounts stay unchanged.
No native nonce was recovered: another funded request is another purchase.
Absolute RefreshInven can repair coupon inventory after a lost response.

The first recorded purchase uses schema8, with mandatory quest/dispatch arrays.
Profile settings, Arena messages, bait counters and linear/dispatch history
survive later writes and restart. Older readers reject8 rather than dropping
purchase counters. Mode-unused accounts keep prior schemas1..7. Disabling
preserves captured counters and stock. Global counter reads may expose a new
UTC day's zeros without rewriting the stored history; other existing inventory
resource recovery remains separate.

Pure/state tests cover both quotes, native metadata selection, payment shapes,
full64 absolute coupon receipts, shared caps, overflow/lock/ownership/forged
packet refusal, real .tmp/rename failures, exact state references, schema8
coexistence, disabled/legacy preservation and day rollover/clock rollback.
The compiled disposable proof runs:

```powershell
node scripts/verify-independent.mjs --fixture --exercise-rupee-shop
```

It stops its owned child before importing an explicitly authored coupon stack
into only the new actor fixture, restarts with retained transport keys, then
performs actual encrypted Manda/coupon/Manda purchases. It checks complete game
field changes, shared-cap refusal despite funded coupon stock, absolute repair,
all three counters and a final schema8 process restart. The original fixture
game is unchanged. No original coupon producer or identity is claimed.

No live client or private save was changed. Actual instrumented Android gold
popup entry, payment and result presentation remain pending the input hold.
No client was rebuilt, so no instrumented release is owed. See
rupee-shop-native-2026-10-16.md and rupee-shop-image-quotes-2026-10-16.md.
