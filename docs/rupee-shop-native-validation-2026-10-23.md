# Native Rupee purchase and persistence verified

The optional archive-2021-base-only exchange completed one native Manda-funded
purchase in BlueStacks with the existing +15 APK. The historical quote is
5,000 Rupees for 5 Manda. The item/coupon IDs, shared daily cap of 3, free-first
settlement and base-only/no-jackpot policy remain explicitly LOCAL. This does
not recover the original production identities, jackpot odds or quota rules.

Before activation, pure/state tests and the external compiled encrypted
fixture passed. A private copy of all three actual saved games loaded exactly
under the new mode, with one type11 item, a positive coupon requirement of 1,
no granted coupon stock and all three price tiers set to 5. The original file was unchanged.

Fresh references/inventory were loaded with the same compatible170 resource
profile/stamp1634693, local team curve, resource snapshot and recruit049.
The client fetched 0 packages, reached Village and preserved all three games.
The lower Village gold-plus control opened the original Rupees popup:
current amount 13,700, Manda 479,640, coupon stock 0, Daily Purchase 3/3,
pack quantity 5,000, price 5 Manda and coupon requirement 1. Original coin
artwork and the neutral Veteran title rendered.

One Manda button contact opened the original confirmation. It showed separate
green 239,640/paid 240,000 balances, cost 5 and the green-first notice. One Buy
confirmation sent exactly one authenticated /shop/BuyGlobalItem request. The
accepted native packet/handler selected the configured pack, price_type1,
item_inst_id0 and qty1. No retry was sent.

Native Successful Purchase displayed the ordinary result logo and 5,000 coins.
After Okay, the popup showed current amount 18,700, Manda 479,635, Daily Purchase
2/3 and coupon stock 0. One unfunded coupon-button contact produced the original "Not enough
Rupee Lottery Tickets" message. The request count stayed 1; no coupon purchase
or second Manda purchase occurred.

Persisted audit against the immediate preactivation backup:

- Main gold13700→18700; green Manda239640→239635; paid Manda240000 unchanged.
- Account Rupee journal became day20749/manda1/coupon0; state schema1→8.
- Only those two main wallet fields and normal AP/BP clocks changed in games.
  AP/BP values, all items/coupons, roster, skills, decks, EXP and progress stayed
  exact. Both other game objects and their purchase counters were unchanged.
- No coupon/pack item, jackpot, GC6 reward or allocator change was introduced.

The server and instrumented client were then closed and restarted with the
same options/state file. Schema8 loaded successfully, all three games were
exact to the postpurchase snapshot, and the journal stayed manda1/coupon0.
The next native popup still showed18700/479635/2-of3/coupon0. That boot fetched
0 packages and sent0 purchase requests. The popup was closed; safe lower
Village is the final state, no battle or helper active.

Current runtime: listener54288/session15153, client4192, same+15 APK and170/
1634693 profile. JDWP8701 is stale. The explicit Rupee mode/cap must be retained
for this workflow; disabling it preserves the journal but removes its optional
reference catalogue. Older readers that do not understand schema8 must refuse,
not discard the captured counter. Originals and pre/post snapshots are retained.

Ignored evidence under local/native-validation-20261023: rupee-shop-native-quote,
rupee-shop-native-success, rupee-shop-native-after and rupee-shop-native-reloaded
JPEGs. Logs: native-rupee-shop-20261023-server.log (one purchase),
native-rupee-reload-20261023-server.log (zero purchases). Private backups include
pre-rupee-native-134744.json, post-rupee-native-135642.json and the final reload
snapshot under local/private/native-20261023-20261023T001531493.

No server transaction code or balance values were edited for this validation.
No APK patch/build/install/release, original-folder/phone/DataDump edit, Docker,
collector or inference-service operation occurred. The overall revival remains
incomplete; this proves the specified optional native exchange and persistence.
