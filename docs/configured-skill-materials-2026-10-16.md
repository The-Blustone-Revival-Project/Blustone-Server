# Configured skill materials

BLUSTONE_SKILL_MATERIAL_PRICES_JSON optionally overlays GetLevel.skill rows
with explicit recipes. Default remains no materials. Each sparse row includes
role1..4, destination level1..50 and all four source_N_ref_id/source_N_qty pairs.
Blank ref iff qty0; positive quantities are uint32. Duplicate role/level rows,
partial fields, accessors, sparse/nonplain arrays and malformed text refuse.
Gold profile, caps and unmentioned rows retain existing behavior.

The constructor validates each row before restore/private writes. Allowed IDs
are AIRSHIP_TICKET and actual HUNTER_TRACE_ITEMS published by the current card
profile. Display currencies, refill metadata, fish and navigation-only traces
are excluded. GetItem presence is not a consumable allowlist. These configured
recipes are LOCAL policy; original screenshot counts5030/4 etc do not establish
item IDs. No metadata, recipe or reference creates inventory or grants items.

Requirements aggregate repeated refs across slots and EVERY intermediate level
of the requested batch. Checked uint32 sums prevent demand/stock overflow.
Global inventory IDs must be unique positive safe integers; emitted IDs retain
both words, including supported values above32 bits. Selected quantities and
locks must be valid. Local allocation consumes lock0 stacks in ascending ID
order, splitting where needed; locked and unrelated stocks remain intact.
Missing refs, malformed identity, shortage and overflow refuse before mutation.

The source-backed receipts are deliberately different:

- Single: `{inst_id:full64,qty:DELTA}` invokes UseItem subtraction, which has
  no native underflow clamp, lock/ref check or erase atzero.
- Multi: `{inst_id:full64,remain:ABSOLUTE}` invokes SetItemQuantity; missing
  IDs are not inserted. A delta here would produce the wrong inventory.

The planner prepares detached item rows and both projections. Gold, selected
skills and items then persist together. Actual write/rename failures restore
exact old item-array/row references, skill presence/value and wallet. Exhausted
stacks retain qty0, matching native behavior and supporting absolute inventory
reads. No allocator, roster, party, progress or other account changes.

No nonce/expected level is sent: funded repeated requests are new upgrades.
After an uncertain response reconcile skills, wallet and GetItemInven before
retrying; removal deltas cannot be transparently replayed. Native automatic
recovery/UI remain unverified. Config changes also require checking that the
client fetched current GetLevel rows; no cache migration/version guard is claimed.

Pure, state and actual encrypted HTTP tests cover strict ingestion, repeated
requirements, locked/split/wide-ID/zero stock, exact single/multi receipts,
aggregate shortages, real disk failure rollback, restart and peer preservation.
All recipes/inventories are authored fixtures. No original material mapping,
live flags/private state/APK/UI inputs or DataDump edits. Source proof:
skill-material-useitem-contract-2026-10-16.md.
