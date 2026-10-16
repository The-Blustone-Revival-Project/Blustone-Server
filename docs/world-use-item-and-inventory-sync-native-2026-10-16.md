# World UseItem and RefreshInven: distinct native contracts

Bounded read-only native research2026-10-16. Immutable DataDump library
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below use Ghidra coordinates=ELF code+0x10000. No runtime code,
DataDump/original bytes, private saves or live UI changed by this lane.

Published supporting sources are
`sources/native/symbols/native-evidence.tsv`,
`sources/native/strings/native-all-strings.tsv`,
`sources/native/economy/ghidra-inventory-remove-item.txt`, and
`sources/native/hunters/native-card-inventory.txt`.
Fresh bounded Thumb establishes the exact request/callback paths below;
unrelated neighboring response shapes are not substituted.

## /world/UseItem is a consuming mutation, not a refresh

CSRSyncGlobal.ReqUseItem Gf6ab8c signature takes two uint64 IDs, uint32 quantity
and a result callback. Builder literals:

- Gf6abc0..ac62: app_code/app_ver/market/pvid/otp.
- Gf6acec: inst_id; Gf6ad16: target_id; Gf6ad3e: qty.
- Gf6aeb8: exact route /world/UseItem.

CSRSyncGlobal.ReqUseItemCB Gf6b2f4 checks response result_code and on accepted
result1 reads ret_data Gf6b3cc. Its mutations include:

- CSRAchieve.ParseLobbyEnter(ret_data) Gf6b3e2.
- CSRAchieve.ParseAchievementsElement(ret_data.achievement) Gf6b3fe.
- Iterate **consumed_item_list**, literal Gf6b402, with full64 inst_id and
  quantity keys Gf6b474/480; call CSRInventory.RemoveItem Gf6b564.
- Read card.target_inst, literals Gf6b5a2/b4, target inst_id Gf6b5c6, and
  rank.cur Gf6b61a/624, rank_up_cnt.cur Gf6b69a/6a4, exp.cur Gf6b6ee/6f8;
  call CSRInventory.SetCardRank Gf6b76c.

RemoveItem Gaec5f4 is a quantity **subtraction** against the full instance ID,
not an absolute-quantity upsert. Existing source export shows node quantity
minus supplied count without a clamping operation. Replaying a positive
consumed delta can debit twice. These fields are not the unrelated single
skill route's consumed_inst_list nor the multi-skill route's remain setter.

The item-type/effect admission, original costs, applicable target cards and
backend settlement law are not recovered here. A source-shaped non-success
refusal is appropriate until those inputs are established; a generic
result1 mock is not a successful reconstructed item operation. The existence
of this endpoint supplies no gem refresh selector or generic inventory read.

## RefreshInven has three specific request builders

All three builders send the same five auth fields and exact route
/world/RefreshInven, but their selectors differ:

- ReqSyncCardInstance Gf6b8bc: vector<uint64> supplied card IDs under
  **card_inst_list**, literal Gf6ba92; route Gf6bc00.
- ReqSyncItemInstance Gf6c604: vector<string> supplied item reference IDs
  under **item_ref_list**, literal Gf6c7e0; route Gf6c94e.
- ReqSyncCardItemInstance Gf6d354: item_ref_list Gf6d5a4 and card_inst_list
  Gf6d61e; route Gf6d7ce.

Their public callback argument is a function receiving shared Request and
Response pointers. The internal request chain also parses JSON, so that
signature alone does not prove an absence of native inventory mutations.
No gem-selector field was found in these exact builders. Do not add one by
analogy with lobby GetGemInven.

## Card-only response owner is positively tied to its builder

ReqSyncCardInstance first installs the default whole-response JSON decoder
G85001c through the function-pointer GOT binding at G21bc1f4, loaded by
Gf6bc16..22. One TASK_READY wrapper Gf709a8 invokes that decoder and stores
the whole JSON. It is not the inventory-mutating step.

The next wrapper is proven, not merely selected from adjacent code:
native vtable fileoffset0x217be24 (G218ce24), invoke wordELF0xf60ccd,
resolves to Thumb function **Gf70ccc**. Its typeinfo explicitly names
CSRSyncGlobal.ReqSyncCardInstance::$_1 and the TASK_READY E0 continuation.
ELF data segment mapping accounts for its0x1000 file/VA difference before
the Ghidra0x10000 image-base adjustment.

That continuation:

- Calls Response.GetResultCode Gf70cee, compares1 Gf70cf2 and skips mutation
  on mismatch Gf70cf4→Gf70fd8.
- Selects wholeJSON.ret_data.card via literal loads Gf70cf8/Gf70d02 and
  JSON operator[] Gf70cfe/Gf70d06; iterates returned entries.
- Calls CSRPlayData.ParseCardInst for each supplied full instance row
  Gf70dc0.
- Reads its full64 instance ID Gf70de4..de6 and calls
  CSRInventory.RemoveCard Gf70dee.
- Passes the newly parsed card to CSRInventory.AddCard Gf70e60.

This is **per-returned-card replacement**, not an additive EXP delta and not
a wholesale inventory reset. A server candidate should use actual complete
owned card-instance rows, authorize the requesting account and selected IDs,
and avoid granting unknown cards or interpreting reference rows as ownership.
The callback does not establish removal of a requested ID omitted from the
response; omission must not be advertised as authoritative deletion repair.
Related deck/book/animation behavior remains a separate consumer concern.

## Remaining boundary and concrete next owner

The bounded next step closed the card-only continuation. It did **not** close
the item-only or combined TASK_READY continuations, their precise response
subtrees, replacement-versus-delta law or handling of missing inventory.
Their RTTI names in native-evidence.tsv explicitly identify
ReqSyncItemInstance::$_2 and ReqSyncCardItemInstance continuations, making
those exact callback vtables the next owners to follow. A guessed
ret_data.user/item/card/gem envelope is not justified by the card-only result.

Existing lobby inventory reads have independently recovered contracts;
their schemas and automatic invocation cannot be assumed here. This note
does not claim a native UI refresh, retry-safe item repair, new owned data,
or a complete server RefreshInven implementation.

## Initial card-only sync checkpoint and guarded unsupported actions

/world/RefreshInven now accepts card_inst_list only. Exact numeric uint64
JSON tokens are decoded before ownership lookup; unsafe already-rounded
JavaScript numbers refuse. The existing local owned-card model uses positive
safe numeric instance IDs. Duplicate request IDs coalesce in first-request
order; a local1024-input quota bounds work. Every ID must resolve in the
requester's existing owned snapshot or the entire batch refuses. Success
ret_data.card contains detached full absolute card DTOs. Empty list yields
card:[]; this does not clear the entire native inventory. Unknown-ID deletion
repair is not invented.

Any item_ref_list presence, including an empty or null list, explicitly
refuses item-only/combined modes. No Gem selector, item zeroing or adjacent
callback shape is guessed. Sync uses gameByPvid directly; no game creation,
energy regeneration, save writes, target mutation or cross-account grants.
/world/UseItem and /world/GetFriendlyBattleInfo now return authenticated
non-success2001 instead of generic success mocks. The recovered callbacks
guard result1 before consuming their successful bodies. This prevents false
acknowledgment; it does not implement item effects or friendly combat.

Pure and production-namespace state checks cover exact/wide selectors,
actual lock/skill changes, full DTO replacement, detachment, unknown/foreign
batches, unsupported modes, auth, elapsed resource clocks, missing loaded
game, unchanged object references/file bytes and restart. The independent
compiled verifier additionally exercises encrypted exact owned-card sync,
empty sync, unsupported-action failures and selector continuity after
restart against a disposable state. No private/live account or client changed.

## Subsequent item/combined closure

The item-only and combined callback boundaries above are now closed in
world-item-combined-sync-native-2026-10-16.md. Current RefreshInven supports
all three selector modes with exact absolute per-instance updates. The old
item_ref_list refusals describe the initial checkpoint only. UseItem and
friendly-battle success paths remain unsupported; their refusals remain.
