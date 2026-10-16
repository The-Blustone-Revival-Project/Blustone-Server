# Atomic Search persistence

2026-10-17. The existing Missing Hunter Search loop already supports local
capsule consumption, helpers, guided recovery, trace rewards and paid Retry/
Reset. This change preserves its costs, reward quantities and native receipts.

Previously searchBattleRequest mutated the live account game before invoking
the persistence callback. A failed write/rename could therefore leave a spent
capsule/helper, advanced log, granted trace or Manda debit in memory while the
saved game retained the old state. Repeating within that process and restarting
would see different authoritative histories.

ServerState.searchAction now plans against a detached game. The callback marks
that a write is required; invalid requests and acknowledged replays do not
publish anything or touch disk. The synchronous writer temporarily stages the
complete candidate in the account map and always restores the original map
entry in finally. Only after atomic file replacement succeeds does it publish
the five Search mutation fields: search, items, next_item_inst_id,
gacha_free_qty and gacha_iap_qty. Existing nested item/array identities are
preserved during successful publication, including a retained capsule row.

A write or rename exception leaves every live object, original nested reference,
optional field, account and prior save unchanged. No failed Begin reserves a
helper/log/waiver or spends a capsule; no failed End exposes a trace/allocator
advance; no failed Retry/Reset spends Manda or rewrites period/history state.
The same valid operation remains retryable after persistence becomes available.
No elapsed-time scheduler, new discovery, deferred Reward or Search Entrust
behavior is introduced.

`tests/search-atomic-state.ts` checks both real .tmp-write and target-rename
failure for Begin, End with new/existing trace stock, Retry, Reset and initial
guided zero-capsule waiver. Its ordinary capsules are earned through actual
local campaign Start/Complete handlers. It verifies complete game/account
values, nested reference identities, helper/log/waiver/reward/Manda counters,
refusal/replay no-write behavior and successful restoration. Existing Search
battle/repeat/guided-recruitment tests also pass. Device execution and original
Search economy remain outside these host persistence checks.
