# Explicit owned fishing stack sales

Normal `/fishing/SellFish` now supports a complete local imported-ownership
sale. Default is disabled. This does not implement a catch producer,
EndWithSell, bait consumption, fishing records or original RNG. Native UI sale
validation remains pending; the implementation is tested through server state
and actual encrypted HTTP using authored disposable inventories.

Enable `BLUSTONE_FISHING_SALE_MODE=local-bound` and provide existing explicit
fish metadata, price catalogue and `BLUSTONE_FISHING_SALE_BINDINGS_JSON`.
ServerState/createApp also accept fishingItems, fishingCatalogue,
fishingSaleMode and fishingSaleBindings explicitly. Existing metadata/pool/
price imports remain independent reads; they never grant items or counts.

Bindings are an owner-PVID map of arrays:
`{"123":[{"fish_id":"SUPPLIED_FISH_ID","grade":1,"inst_id":4294967301}]}`.
Each row asserts a supplied relationship to an already owned ordinary stack.
Only supplied native type17 fish metadata participates; neutral type0 display
rows remain read-only. A binding does not create an owned fish row, stack,
quantity or grade. String identities stay exact, instance IDs require the
current game's positive safe-number storage range and are emitted as full64
numeric tokens (including IDs above uint32). No effective32 Search truncation
is used. Owner IDs and stack bindings are validated and detached before restore.
Arrays must contain dense plain data, with at most10000 rows per owner.

The authenticated request reads exact fish_id, grade1/2/3 and positive qty
from numbers or canonical unsigned decimal form strings. No count/price alias
is accepted. Grade1→b_price,2→s_price,3→g_price is original source-backed.
Price values are supplied local policy, not recovered original economy.
Selected fish must have an explicit owned_fish row. Every bound stack must be
present, unlocked and have ref_id equal to the supplied fish identity. Every
positive stack of that fish must be bound. Each grade's bound quantities must
exactly equal the independently imported b_cnt/s_cnt/g_cnt. Missing mappings,
locked/unrelated stacks or disagreement refuse; count-only ownership cannot
silently become ordinary stacks. Duplicate IDs, malformed quantities/locks,
unsupported grade, insufficient count and uint32 profit/wallet overflow refuse.

The local allocation choice consumes lowest instance IDs first within the
selected grade. It preserves all other grades/fishes/items/locks, roster,
decks, clock anchors, item allocator, missions and accounts. No Hunter reward,
achievement, inferred level or Manda write is added. Successful ret_data is
the sale object itself, as recovered from ReqSellCB/ParseSell:

```
{user:{gold:{prev,cur}},
 item:[{inst_id:full64,qty:REMOVAL_DELTA}],
 sell_result:{fish_id,b_cnt:ABSOLUTE,s_cnt:ABSOLUTE,g_cnt:ABSOLUTE}}
```

It is not ret_data.sell (which belongs to EndWithSell), and ordinary result2001
refusals safely skip the native parsing branch. The planner prepares detached
new inventories and receipt before settlement. Gold plus both owned inventory
namespaces persist together. Actual temp-write/rename failure restores prior
values, references and durable bytes. Restart preserves settled state.

The request has no nonce. Identical funded repeats are additional sales; an
unfunded repeat refuses. After an uncertain/lost receipt, inspect authoritative
gold via lobby and both `/fishing/GetInven` and `/lobby/GetItemInven` before
retrying. GetInven inserts missing native fish keys; it does NOT replace existing
cached counts. Its authoritative response alone does not repair a stale native
fish model. A fresh model/cache hydration or separately proved replacement
path is needed before another native sale; automatic recovery is unproved.
Re-delivering item removal receipts could subtract twice, so no synthetic
same-request replay success is offered. Zero-quantity ordinary stack rows
remain as declared LOCAL repair tombstones: native GetItemInven SetItem upserts
listed rows but never clears omitted cached IDs. Thus a separate absolute read
can repair ordinary item quantities even after complete consumption. There is no
proved automatic native sale-failure→inventory-refresh chain.

Original mechanism evidence:
fishing-sell-request-callback-native-2026-10-13.md,
fishing-catalogue-consumers-2026-10-13.md and
expedition-item-award-replay-boundary-native-2026-10-14.md.
Original fish identities, numerical prices, grade-stack mapping and catches
remain unrecovered. Explicit authored imports do not authenticate provenance.
