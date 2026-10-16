# Quick advancement tickets and UseItem: bounded native evidence

Read-only native investigation, 2026-10-16. Original DataDump input:
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Published symbol index: `sources/native/symbols/native-evidence.tsv`.
Addresses use Ghidra coordinates, ELF code address plus `0x10000`.
This note records bounded Thumb inspection of the immutable original, not
an implemented server operation or a live-client validation.

## Proven activation and ticket selection

`CSRPopUpIAPQuickRankUp::OnButtonClick` starts at Gcb33c0. Its owned-item
path checks the cached ticket reference at popup offset `+0xdc` through
`GetInstItemCnt` at Gcb34c0 and checks a positive quantity at Gcb34f0.
It then calls `CSRInventory::GetItemInst` at Gcb3524. The returned item is
dereferenced at Gcb352c without a separate null guard in this branch.
An absent-ticket path must not be represented as an owned zero-ID ticket.

The same handler calls `CSRSyncGlobal::ReqUseItem` at Gcb3844:

- Gcb37ce loads the selected card from popup `+0x100`;
  Gcb37d4 loads its full 64-bit owned instance ID from card `+0x10`.
- Gcb37ca loads the copied source ticket instance ID.
- Gcb3834 selects quantity **1**; Gcb3836 places the full target-card ID
  into the request arguments before the call.

Additional calls to this same requester occur at Gcb7296 and Gcb7c7c
inside the quick-rank popup continuation region. Their existence does not
establish a wider target domain.

The genuine reference names **SU1** and **SU2** are hardcoded by this UI:

- `IsIncompletionImmediatlyAdvanced` Gcb4e24 calls `FindCard` Gaeb5b0
  at Gcb4e74 and `CSRCard::GetRank` G86ac1c at Gcb4e7a.
- Its comparison at Gcb4e80 is rank **3**. The equality branch selects
  **SU1** (literal load Gcb4e82); the other branch selects **SU2**
  (literal load Gcb4e7e, conditional selection Gcb4e8a).
- `InCompletionImmediatlyAdvancedPopup` Gcb4978 repeats that selection:
  SU2 literal Gcb4a4a, comparison against 3 at Gcb4a4c, SU1 literal
  Gcb4a50, conditional move Gcb4a58. It calls `GetItemInst` at Gcb4a64
  and dereferences the result at Gcb4a6c.

**The non-3 branch is not proof that ranks 1, 2, 4, 5, or every other
rank are eligible for SU2.** A caller can constrain the domain before
this selection. Only the rank-3 selection itself is closed here.

## Request and callback contract

`CSRSyncGlobal::ReqUseItem` Gf6ab8c takes source instance ID uint64,
target instance ID uint64, quantity uint32, and a result callback.
The request uses the normal five auth fields (`app_code`, `app_ver`,
`market`, `pvid`, `otp`), with `inst_id` at Gf6acec, `target_id` at
Gf6ad16, `qty` at Gf6ad3e, and route `/world/UseItem` at Gf6aeb8.

`ReqUseItemCB` Gf6b2f4 checks result code 1 at Gf6b312. The accepted
response reads `ret_data` at Gf6b3cc, passes that object to achievement
lobby parsing at Gf6b3e2, and handles achievement data at Gf6b3fe.
Its relevant inventory/card mutations are:

- `consumed_item_list` (Gf6b402/40a): per-row full64 `inst_id`
  (Gf6b474), uint32 `qty` (Gf6b480), then `RemoveItem` Gaec5f4
  called at Gf6b564. This is a **consumed delta**, not absolute stock.
- `card.target_inst` (Gf6b5a2/b4): target `inst_id` Gf6b5c6,
  `rank.cur` Gf6b61a/624, `rank_up_cnt.cur` Gf6b69a/6a4, and
  `exp.cur` Gf6b6ee/6f8, then `SetCardRank` Gae9c78 at Gf6b76c.

The callback accepts server-supplied resulting rank and EXP; this does
not determine what the original server awarded. No AP/BP, gold, or
Veteran EXP setter was identified in this bounded callback call list.
It therefore does not establish owned consumption of the revival's
virtual `local_ap`, `local_bp`, or `local_rupee_pack` shop references.
GC6 gifting has a separate `/world/UseVIPTicket` contract.

See [the shared UseItem and inventory-sync contract](world-use-item-and-inventory-sync-native-2026-10-16.md)
for the distinction from absolute RefreshInven receipts.

## Pending-state gate and unresolved transition

`IsAvailableCondition` Gcb43e0 reads the cached extra-data key with the
original spelling **`immediatly_rankup`** (literal references Gcb4400
and Gcb448c), through `GetValue` Gb72798. It parses a pending instance
ID, calls Gb726c0 with that key at Gcb449e, and searches the owned-card
map for the pending ID. Thus availability includes a pending cached
state, not merely a rank comparison against every owned hunter.

`SetData(uint64)` Gcb3fac finds the selected card at Gcb4092, gets its
rank at Gcb4098, and compares against rank 4 at Gcb409e. The nearby
`PACKPOP_02` / `PACKPOP_04` selection is popup presentation evidence;
it is not proof of the awarded rank or level. Another overload,
`SetData(int,uint64)` Gcb5330, is called by the continuation at
Gcb7afc. Its integer argument has not been closed as an award value.

The following remain **unresolved** and block enabling a successful
SU1/SU2 settlement from this note alone:

- Exact target rank domain, maximum-level requirement, and other
  eligibility conditions before the popup/cached-state path.
- Whether the award is exactly rank +1, the resulting level/EXP
  (level 1 versus maximum), and rank-up-count semantics.
- The producer and complete lifecycle of `immediatly_rankup`, including
  whether the original operation requires an account/package entitlement.
- Original ticket metadata, acquisition/issuance, and any purchase law.

No original ticket amount, entitlement, generic item-use effect,
currency debit, or grant is inferred. There is no UseItem implementation
change in this checkpoint. The separate historical advancement gold
display projection does not close these ticket transition rules.
