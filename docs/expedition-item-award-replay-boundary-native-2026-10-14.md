# Expedition item awards: delta joins and the separate absolute repair path

Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code addresses ELF+0x10000. Bounded direct original Thumb and named
complete functions, with the preserved search-item-add decompilation used as
a secondary check only. No code, reward policy, live input/save/client or
original/DataDump change. See expedition-end-result-parents-native-
2026-10-13.md for exact End result parents.

## End inventory rows are additive full64-ID deltas

ReqAutoCombatEndCB consumes ret_data.result.item rows with full64 inst_id,
strict ref_id string and uint32 added; AddItem(uint64,string,uint32) Gaec508
is invoked at Gb4251a. Start/Refresh's item field is separately a JSON STRING
of string IDs counted as preview occurrences. Do not substitute those preview
strings, guessed IDs, {id,qty} references or absolute quantities into End.

AddItem searches its inventory map by BOTH inst_id words at Gaec534..568.
On an existing ID, it adds the supplied quantity to the existing count
Gaec5be..5c2 with plain32-bit ADD. This branch does NOT compare or replace
the incoming ref_id. An inconsistent existing-ID/reference join would add
to the preexisting stack instead of validating the intended item reference.
Producer admission must enforce that join and quantity overflow explicitly.

On a missing ID it constructs ITEM_INFO with quantity=added
Gaec59e and full64 ID Gaec5a2, copies the supplied reference string and
calls SetItem Gaec33c at Gaec5aa. Therefore a first positive End delta can
create a missing stack. Repeating that delta increments an existing stack
again; added0 creates only a zero-quantity missing stack and cannot repair
a lost first award quantity. No callback-side receipt nonce or duplicate
identity law is established by this function.

## Generic End user SyncUser provides no absolute item repair

End's independently optional ret_data.user goes through generic SyncUser
Gb7047c. Complete bounded parser body ends at Gb70d0e; its selected fields
are honor/vip_exp/gold/free_iap/iap pairs, mandatory iap_qty/free_iap_qty
scalar snapshots, AP/BP pairs and clocks, and card_inven_max. No item,
item_inven, qty, inst_id or ref_id field is selected, and no SetItem,
SetItemQuantity, ParseUserItemInven or SyncItem call appears in this complete
body. Its next separate function starts at Gb70d88. A proposed End
ret_data.user.item absolute quantity payload has no positive consumer here.

The paid/free scalar-reset hazard still applies to nonnull user: omission
zeros native balances. user:null is the established early-exit path. Do not
invent an item repair field under a generic user object merely because other
specialized callbacks parse user.item independently.

Separate CSRPlayData.SyncItem Gb7108c consumes inst_id/ref_id/added
(resolved literals Gb71128/12e/134), then calls the SAME AddItem at Gb71234.
This is another additive delta contract, not an authoritative absolute stack
snapshot. Adding an unconsumed ret_data.item sibling to End also does not
prove its callback calls SyncItem; the complete End callback's positive item
path is result.item. Do not call either hypothetical wrapper a replay repair.

## Absolute quantity setter alone cannot create a missing stack

CSRInventory.SetItemQuantity(uint64,uint32) Gaec4bc searches existing
full64 IDs Gaec4cc..4fc and stores the supplied count only on a found ID
Gaec502. Missing tree/ID returns Gaec506 with no allocation or insertion.
Thus specialized absolute user.item quantity callbacks elsewhere would still
need their actual route and missing-stack semantics; they cannot be grafted
onto End, and a quantity-only setter cannot repair an absent awarded stack.

## Source-backed separate repair: /lobby/GetItemInven

CSRPlayData.ParseUserItemInven Gb6962c selects FULL response.ret_data
Gb69648 and then its item collection Gb69652. Each row reads:

```text
ret_data: {item:[{inst_id:exact64,ref_id:STRING,qty:uint32,
                 buy_cnt_gold?:uint32,buy_cnt_manda?:uint32}, ...],
           global_item:<independent purchase-count inventory>}
```

Resolved item row literals are inst_id Gb696dc, ref_id Gb696e6, qty
Gb696e8, buy_cnt_gold Gb696ea and buy_cnt_manda Gb69840/84a.
qty uses unsigned conversion Gb697f2 and stores ITEM_INFO quantity
Gb697fa. Missing optional purchase counters retain fresh zero defaults in
that temporary ITEM_INFO; preserve supplied historical metadata rather than
silently resetting it with a qty-only reconstruction. Global purchase-count
rows are a separate parser branch; this note does not replace their grammar.

The row is passed to CSRInventory.SetItem Gaec33c at Gb69874. SetItem
finds the same full64 key Gaec36c..3a0, removes the old matching node through
its map erase helper Gaec3a8, and inserts/copies the complete supplied row
Gaec3ac..47a. It therefore replaces absolute quantity/reference metadata or
creates a previously missing stack, without adding the previous count.

This is an UPSERT collection, not a whole-inventory cache clear: there is no
inventory-map destruction before ParseUserItemInven's selected row loop.
Unlisted owned IDs remain. Empty item collection creates/removes nothing.
Repeated complete reads restore the same supplied quantities instead of
adding the award again. Same-ID reference consistency and owned identity
admission remain the server's duties, even though SetItem can replace them.

Current replica itemInventory already emits this separate read envelope.
The read must continue to supply actual current owned stacks and independent
global purchase-count rows; no guessed award stack should be created by a
read. Existing ordinary item quantities and allocator/reference policies are
separate persisted model evidence.

## Lost-first-End limitation and local policy boundary

An End replay with no result.item deltas avoids double addition but does not
repair a client that never received its first stack grant. Replaying the
original positive added quantity repairs a missing client but doubles an
already-updated one. added0 fails the missing-quantity case. The original
request carries no proven receipt acknowledgement identifying which client
case occurred.

A separate fresh GetItemInven absolute upsert positively repairs either
case. This audit does NOT prove the original End UI automatically requests
that read after every retry, so transparent lost-response item repair remains
unclosed. An implementation must either establish that actual refresh chain,
provide an explicitly local workflow/client refresh, or leave item awards
gated; do not promise End-only exactly-once item delivery from these codecs.

Original item reward pools/quantities and new-stack allocation remain unknown.
Even a local configured award producer must validate existing stack/ref joins,
full64 identity compatibility, current quantity bounds and durable wallet/
inventory/job atomicity, preserve purchase metadata, and keep previews
distinct from actual grants. No item award producer is enabled by this note.
