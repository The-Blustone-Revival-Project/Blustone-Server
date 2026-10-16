# Historical High-quality Bait shop

The optional offer restores a bait purchase independently of unrecovered fish
catches. Before starting a disposable or intended local profile, set:

```powershell
$env:BLUSTONE_BAIT_SHOP_MODE = "archive-2018-projection"
$env:BLUSTONE_BAIT_SHOP_DAILY_LIMIT = "2" # Explicit LOCAL example policy
npm run build
npm start
```

The mode defaults disabled. Enabled mode requires an explicit integer limit
from1 to1000. The limit, UTC day reset, rollback-clock handling, free-first
Manda spending and neutral item metadata are local policies. The historical
screenshot's ambiguous12/12 is not used as a recovered cap.

## Evidence and native behavior

DataDump manual-scrapes-2026-10-14/batch-56.tsv line46, idx2795, records a
High-quality Bait popup with x10 and Purchase with Manda6. Its filename dates
to2018-07-02; capture metadata and final-version economic applicability are
unproved. The copied raw row and source hashes are pinned in
resources/reference/fishing-bait-offer-2018.json. Current Amount9 is observed
owned stock, never a starting grant. Descriptive text does not establish odds.

Native GetBait(1) supplies exact item ID LU003. The purchase popup sends one
purchase: target_ref_id LU003, price_type1, item_inst_id0, qty1, auth fields.
It sends no price field. Global item provide_qty10 supplies the bundle amount.
The historical price6 is projected uniformly across the supplied local limit;
original tier changes are unknown. No gold or Average Bait offer is added.

Success includes native item[] with exact instance ID and added10, scalar
user.iap balances, target_inst purchase-counter prev/cur, neutral jackpot1/1
and consumed_inst_list[]. item[].qty10 is LOCAL nominal goods quantity:
original backend meaning remains unknown, and actual bait callbacks ignore it.
The popup refreshes amount from inventory and pack size from provide_qty.
See fishing-bait-purchase-native-2026-10-16.md for exact addresses.

## Ownership, counters and failure recovery

Each accepted funded request buys another pack. No native transaction nonce
was recovered. RefreshInven with item_ref_list JSON text ["LU003"] repairs
absolute inventory after a lost response; repeating an accepted purchase can
charge again. Returned AddItem deltas are not represented as absolute stock.

A single canonical unlocked LU003 stack is reused, or a safe fresh owned item
ID is allocated. Multiple matching stacks are refused, including zero rows:
the native quantity getter reads the first match rather than summing them.
No existing stack is silently merged. Locked stock and uint32 overflow refuse.

Pure planning validates before mutation. Stock, allocator, wallet and account
counter commit in one persistence operation. Write/rename exceptions restore
the exact prior items array, scalar values and counter reference/absence.
The purchase path uses the loaded snapshot and does not regenerate AP/BP.

The account counter is only created after a real purchase. This promotes the
save to schema6, with mandatory quest and dispatch arrays, preserving Arena
messages and existing linear journals. Older readers reject6 rather than
silently dropping counters. Accounts without bait history retain schemas1..5.
Disabling the offer preserves existing stock and history; it does not erase
ownership or reset a cap. Use a reader that supports schema6 after purchase.

## Verification and remaining gaps

Pure/state tests cover quote/reference identity, independent native stock and
counter fields, safe IDs, ambiguity, shortage/forgery, real write/rename failure,
clock rollback/day rollover, schema6 restart, old versions, corrupted snapshots
and coexistence with actual enrolled linear quests, dispatch history and Arena
messages. The compiled disposable encrypted verifier also exercises purchases,
cap, absolute inventory repair and process restart:

```powershell
node scripts/verify-independent.mjs --fixture --exercise-bait-shop
```

No live profile was activated. Native UI validation is pending. Fishing Begin,
EndWithSell, fish IDs, catch selection/grade/length, bait consumption and pools
remain unreconstructed; buying bait does not claim a working catch loop.
