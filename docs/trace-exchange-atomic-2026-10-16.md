# Trace recruitment persistence atomicity (2026-10-16)

`/shop/PieceExchange` and guided `/tuto/Clear` type37/step1 now restore their
original in-memory state when the state-file write or final rename throws.
This is a local persistence correction, without a new recruitment price, grant,
request nonce, or original-server economic claim.

The shared `exchangeHunterTraces` handler validates the existing owned unlocked
trace instance, configured threshold, hunter reference, capacity and allocator
before applying changes. It prepares the new card book before mutation. Its
persistence failure path restores the original trace row quantity, truncates
only appended recruited cards, restores the exact previous card-book reference
and allocator, then rethrows. The recruited array and all existing card/item
objects retain their identities.

The guided caller still validates its earned Search completion and tutorial
prerequisite. It passes a real transaction callback to that shared handler:
replace the tutorial rows with their merged37/1 acknowledgement, then persist
once. If that callback throws, the shared handler restores recruitment and the
caller restores the exact previous tutorial-array reference. There is no
intermediate write, successful acknowledgement, or silent grant after failure.

## Native response boundaries

The existing wire shapes remain distinct. Original
`CSRSyncShop::ReqPieceExchangeCB Gf8af68` parses `ret_data.card` as an array,
calls `CSRAchieve::ParseLobbyEnter`, then passes
`ret_data.consumed_inst_list` to `CSRInventory::UseItem` atGf8b254. The native
request supplies an owned full64 item instance and uint32 hunter count; no
nonce was recovered. A funded second ordinary exchange remains another paid
exchange, not a replay of the first.

Original tutorial `ReqClearCB Gf9ac40` reads numeric `ret_data.type/step`,
optionally consumes the card collection and forwards
`ret_data.consume_result.item` to `UseItem` atGf9b222. Guided success retains
`{type,step,card,consume_result:{item}}`; its already-cleared retry returns only
`{type,step}` and neither writes nor recruits again. PieceExchange retains its
`card`, `consumed_inst_list` and neutral daily/linear quest fields. Both
consumption forms report the actual quantity decrement, not absolute remain.

Published immutable evidence:

- DataDump `findings/economy/trace-recruitment-contract.md` and
  `sources/native/hunters/ghidra-trace-exchange-contract.txt`, with literal keys
  in `ghidra-trace-exchange-keys.txt`.
- DataDump `findings/revival/tutorial-clear-contract.md` describes the separate
  tutorial callback's keys and optional side effects.
- Original `libnative_core.so` SHA256:
  `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.

## Verification and limits

`tests/trace-exchange-atomic-state.ts` uses disposable production accounts and
actually earns each account's ten traces through ordinary stage completion and
guided Search. It forces both a real `.tmp` write failure and a real rename
failure for both entry points. It verifies unchanged persisted bytes, all
accounts/games, nested object/array references, trace quantity, card ownership,
allocator, card book and tutorial rows. Successful retries each persist once
and recruit exactly one hunter. It checks both distinct native response forms,
already-cleared/no-funds retries without writes, and restored state/retries
after restart. The focused test and TypeScript build pass.

The transaction boundary is recruitment plus the guided acknowledgement.
Independent pre-handler account loading, lazy clocks in other routes, and
transport exactly-once delivery are not changed. Historical threshold profile
selection remains separate: default Sylvester10/Gerard20, optional historical
20/40, with fixed local guided10 payout and existing receipt preservation.
