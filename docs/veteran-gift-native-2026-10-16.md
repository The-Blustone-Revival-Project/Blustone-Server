# Veteran ticket gifting native contract and LOCAL points policy (2026-10-16)

`/world/UseVIPTicket` is a player-to-player gift operation. Its native UI
selects a real owned GC6 ticket and another displayed player's PVID. It is not
an ordinary self-use Veteran EXP item. Original benefit magnitude and delivery
mechanism remain unknown. The optional local-points model below makes its
recipient benefit an explicit supplied LOCAL choice, with no original amount
claim and no stock grant merely from enabling references.

Original final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are code ELF plus0x10000. Source remained immutable; no client,
private save or live game was used or changed.

## Exact requester and actual owned ticket identity

`CSRSyncGlobal::ReqUseVIPTicket Gf6a090` has signature
`(unsigned long long inst_id, unsigned long long target_pvid, unsigned int qty,
 callback(int))`. It posts auth5 app_code/app_ver/market/pvid/otp plus:

- inst_id: full64 owned ordinary item instance. Literal LDRGf6a1f0.
- target_pvid: full64 recipient account. Literal LDRGf6a21a.
- qty: uint32 ticket count. Literal LDRGf6a242.

Route literal LDRGf6a3bc is exactly `/world/UseVIPTicket`. No reward amount,
VIP EXP, item reference alias, nonce or target wallet is supplied in the
request. The function signature is retained in DataDump
`sources/native/symbols/native-evidence.tsv`.

Actual `CSRPopUpUserInfo::OnButtonClick Gd96824` recognizes **BT_YO_GF** at
Gd96928. Its gift availability check loads the literal **GC6** atGd9695c/95e
and calls Inventory.GetInstItemCnt Gaeca80 atGd9696a. With available stock it
opens a target-nickname confirmation. Its continuation loads the same exact
GC6 literal atGd982c6/2c8 and calls **GetItemInst Gaec894 atGd982d4** to obtain
an owned instance, rather than passing GC6 as the instance ID.

The actual call is Gd9838e. Gd98372 supplies the selected full64 item ID;
Gd98368/36e obtains the displayed SRTARGET_USER's full64 recipient PVID through
popup+9c, then stores that PVID as the next aligned argument. Gd98384 sets
literal qty1. This closes genuine identity **GC6** independently of artwork,
rarity or inferred item numbering. It does not recover its original GetItem
use_type, effect, thumbnail, rank, sell price or numeric benefit.

No item use_type/effect selector is used in this bounded gift producer: it
selects hardcoded GC6 and actual ownership. Neutral LOCAL use_type0 and empty
effect metadata therefore do not pretend to recover original classification.
The plan may support positive qty>1, admitted as a LOCAL backend extension to
the native uint32 request grammar; the inspected native button sends1.

## Success callback and removal semantics

`ReqUseVIPTicketCB Gf6a7f8` first requires native GetResultCode1 at
Gf6a814, then body result_code1 after parsing JSON. On success it selects
ret_data (Gf6a8d6/8dc), handles optional achievement (Gf6a8e6..8fc) and
iterates **ret_data.consumed_item_list** (keyGf6a900, lookupGf6a906).
Each row reads **inst_id** atGf6a972 and **qty** atGf6a97c. Integer identity
uses full64; quantity uses a uint32 word. The mutation call is
**Inventory.RemoveItem Gaec5f4 atGf6aa66**, passing the full64 ID and quantity.
This is a removal DELTA, not absolute remaining stock. The existing original
RemoveItem implementation subtracts from the selected item's quantity and
does not erase its record at zero. A supported receipt is:

```
{result_code:1,
 ret_data:{consumed_item_list:[{inst_id:EXACT_NUMERIC_U64,qty:TICKETS_REMOVED}]}}
```

No sender VIP EXP, recipient ticket, mail delivery, wallet or generic SyncUser
branch is parsed by this callback. Recipient benefit is a separate backend
responsibility; its original implementation is not recovered. No mandatory
recipient-stat receipt should be invented for the sender. Optional achievement
is omitted when no legitimate achievement transaction occurs.

Repeating a positive removal receipt subtracts again in the native client.
There is no recovered request nonce; separate funded requests can represent
separate gifts. Do not invent a timed deduplication window or promise transport
exactly-once settlement. Reconcile authoritative inventory after a lost reply.

## Pure optional local model

`src/veteran-gift.ts` exports:

- configuredVeteranGift(mode,rawPoints): default/disabled returns undefined;
  local-points requires explicit positive uint32 pointsPerTicket. There is no
  guessed default original benefit.
- veteranGiftItem(policy): genuine GC6 identity, local Veteran Ticket text,
  neutral rank1/use_type0/empty thumbnail/effect, sell_price0/collect_qty0. Its
  description names the actual configured LOCAL recipient EXP. Publication
  itself neither allocates nor grants stock.
- planVeteranGift(payload,items,recipientVipExp,policy): validates the native
  inst_id/target_pvid/qty selectors, exact selected owned unlocked GC6 stock,
  global instance-ID uniqueness and checked recipient uint32 arithmetic.
  It returns selected array index, remaining quantity, next recipient VIP EXP
  and the exact consumed_item_list delta. It changes no input objects.

Canonical positive uint64 strings preserve stored/request IDs above the safe
number range. Safe numeric adapters are accepted; unsafe rounded numbers,
reference-ID aliases, leading zeroes, fractions and exponent strings refuse.
Wide receipt IDs use JSON.rawJSON to serialize exact numeric tokens; quoted
wide IDs or lossy Number conversion are not substituted. Multiplication and
addition use BigInt before the final uint32 boundary check. Unrelated item
rows remain untouched. Fully consumed selected rows remain quantity0.

Authentication, same-server/other-account admission, mutual block rules,
loaded owned state, reference publication and the real atomic persistence
boundary are root integration responsibilities. Those social gates are LOCAL
policy, not recovered original gifting restrictions. A transaction must
persist sender quantity and recipient VIP EXP together and restore their
exact prior values/references if persistence fails. It must not manufacture
GC6 ownership, award sender VIP EXP, transfer a ticket to the recipient or
invent mail delivery.

`tests/veteran-gift.ts` covers explicit mode/points, neutral detached metadata,
canonical full64 max IDs and exact JSON numeric output, selected quantity0
preservation, removal delta semantics, wrong references, locks, shortage,
number/string ID duplicates, overflow and immutable input snapshots. Focused
test and TypeScript build pass. No native UI validation is claimed.

## Other reward systems remain separate

Random-box list requests use pool_id STRING and `/random_box/RewardList`
(RequestRandomBoxItemList Gf4b9dc); reward requests use special_inst_id uint32
and `/random_box/Reward` (RequestRandomBoxReward Gf4c8fc). They are not this
ordinary-item full64 ticket use. Roulette RequestDraw Gdeb9b0 sends auth5 only
to `/roulette/DrawRoulette`, depending on separately cached references and
play data. Their actual reward weights, quotas, original catalogue and full
callback closures are not established by GC6 gift research. No generic
success on those routes should imply an earned random reward.
