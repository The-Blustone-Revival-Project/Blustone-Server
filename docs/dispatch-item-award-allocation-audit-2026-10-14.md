# Configured dispatch item awards: allocator, registry and retry boundary

2026-10-14. Server source/ref audit plus original immutable ARM
SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses = ELF+0x10000. Evidence/documentation only; no awards,
new item identities, live inputs or DataDump changes.

## Native End adds a delta by full64 instance identity

EndEntrust's actual result.item[] rows are `{inst_id,ref_id,added}`. The
callback preserves full64 inst_id and calls CSRInventory.AddItem Gaec508.
This differs from deferred Search Reward's caller which zeros the highword.

The complete AddItem function Gaec508..5d4 resolves an existing item by
**full64 instance key**, comparing both words Gaec534..564. Existing-row
branch Gaec5be..5c2 changes **only qty += added**, with ordinary word addition.
It does not verify the supplied ref_id against that existing row, replace
its reference, or reset its lock. New-row branch constructs qty=added and
lock0 at Gaec59a..5a2, stores the full64 ID, and passes the supplied reference
string to SetItem at Gaec5aa.

Thus a server must independently validate unique item instance IDs and
reference coherence. A colliding ID would increment the wrong client item
despite a different receipt ref_id. Native qty arithmetic can wrap; refusing
overflow is explicit safer local admission. Existing lock must survive a
join; declaring lock0 on the server while the client keeps its old lock
would desynchronize state. Item and Hunter native maps are separate: no
blanket global cross-type ID uniqueness is inferred.

## Existing numeric local model and allocation choices

LocalGameState.items contains numeric inst_id, string ref_id, numeric qty and
lock. next_item_inst_id is numeric. `normalizeLocalGameState` currently
retains the items array via a type assertion, not a complete item validator;
a new award planner must validate the entire touched inventory itself.

The strongest existing allocation checks are in `hunter-sale.ts`:
all IDs positive safe integers and unique, qty uint32, next_item_inst_id
positive safe integer and greater than every existing item ID; allocation
refuses next>=Number.MAX_SAFE_INTEGER so its increment remains safe. It
aggregates rewards by reference, then joins the first matching reference
stack, preserving that row's lock. Search settlement and capsule earning
instead choose an unlocked matching stack. Some older fixture paths merely
increment the allocator and do not prove a generally safe reusable allocator.
Do not copy those weaker branches as the new transaction standard.

A safe configured dispatcher can use a detached inventory, validate every
owned row/allocator before changes, aggregate explicitly supplied per-run
rewards, join a deterministic unlocked matching stack or allocate a new one,
and preserve every locked/other-reference row exactly. Choosing unlocked
joins is a declared local policy, not a native AddItem requirement. Existing
matching stacks may be multiple: resolve deterministically, never merge or
delete unrelated stacks. Validate supported lock words rather than silently
normalizing an unsupported imported value. For each reference, both
configured quantity*runCount and resulting stack quantity must fit uint32.
No quantity0 allocation should create a phantom stack.

The local numeric model can use IDs above uint32 through MAX_SAFE_INTEGER−1
without rounding, while the wire receipt encoder preserves exact64 numeric
tokens. It cannot represent the whole uint64 namespace: do not widen the
persisted model by passing rounded JavaScript numbers or string IDs to its
existing numeric lookups. Refuse exhausted/invalid successors and collisions
before mutating wallets, EXP, job journal or items.

## Published references are not an acquisition allowlist

`state.itemReferenceRows()` combines `hunter-traces.ts:itemReference()` with
configured fishing definitions. That broad GetItem registry includes rows
which explicitly do **not** establish ordinary item awards:

- RP1, VIP1 and arena honor display references are currency/preview metadata,
  with no inventory-stack acquisition/settlement implied;
- `local_library_trace_*` rows are navigation-only fixtures whose authored
  documentation explicitly leaves acquisition/exchange unimplemented;
- configured fishing use_type17 metadata has a separate owned_fish count
  model. Its ordinary-item↔grade-count producer remains unproved. Granting
  only game.items would not truthfully create the separate owned catch counts.

An explicit supported-award registry should therefore be narrower than all
GetItem rows. Existing ordinary local fuel items, AIRSHIP_TICKET capsule and
published actual HUNTER_TRACE_ITEMS are concrete candidates with existing
local inventory/consumer workflows. Each amount and dispatch acquisition
relationship must remain explicitly configured local policy; even the capsule's
recovered identity is not proof of an original dispatcher drop/rate. References
must be published in the selected profile and supported by its consumer.
Never guess ticket/fish/drop IDs to make a configured reward valid.

Start/Refresh preview item is a JSON STRING containing repeated item-reference
STRINGS. Configured per-run quantities require that many occurrences, unlike
End's consolidated added-delta rows. Validate a bounded local preview budget
before materializing occurrences: uint32 alone permits impractically large
allocations. A chosen budget is local resource admission, not original count
or slot law.

## Lost End response cannot use additive replay as an absolute snapshot

Hunter EXP replay is safely absolute prev=current,cur=current; item added is
fundamentally different. Repeating a positive added delta duplicates the
client quantity when it already parsed the first response. Replaying item:[]
prevents duplicate addition but cannot repair client inventory when the first
successful End response was lost. An added0 row also cannot supply absolute
quantity, and can create a zero-quantity missing client row.

Keep replay non-additive and require the existing owner-scoped
`/lobby/GetItemInven` absolute refresh as an explicitly bounded recovery path.
Test that path and state the limitation; do not claim universal End-retry
inventory repair without a positively recovered absolute inventory consumer
in that callback or an actual acknowledgement/nonce protocol. No such new
protocol is invented here.

## Meaningful acceptance probes for a future atomic producer

Use disposable authored fixtures to exercise:

- existing unlocked stack join, locked-only reference causing a distinct new
  stack, duplicate configured references aggregated once, unrelated stacks
  and lock words preserved;
- unique safe ID above uint32 encoded exactly, duplicate IDs/ref mismatch,
  stale allocator, next-ID collision/exhaustion, per-run/batch/stack overflow
  and unsupported/unpublished/display-only/fishing references refused;
- new and existing-stack End updates committed with all wallet/EXP/journal
  fields together; actual write and rename failure restore all original
  references/quantities/allocator and durable pending bytes;
- restart after Start retains the original configured reward snapshot despite
  later policy changes; restart after End preserves item totals/allocator;
- peer accounts and other namespaces unchanged, consumed-after-collection
  stacks not recreated by End retry, no duplicate awards on replay;
- lost-response replay emits no additive awards, followed by authenticated
  GetItemInven exposing the authoritative absolute quantity without another
  write or reward, including a reward stack later partly consumed;
- Start/Refresh occurrence previews match configured per-run quantities and
  End added rows match accepted run totals, with no random drop law claimed.

These are proposed checks and producer requirements, not tests run by this
audit. The current no-item dispatcher remains coherent; item awards require
separately reviewed implementation and explicit policy rather than native
preview arithmetic being mistaken for original reward data.
