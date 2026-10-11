# Social blocking native contract — 2026-10-11

The previous BlockList wire-map conclusion was incorrect: a C++ callback map
is an internal result container, not the JSON grammar. Original ARM disassembly
proves `ret_data` is indexed numerically and each row has `target_pvid` and
`target_nickname`. Nonempty wire maps keyed by PVID would not satisfy this
consumer. Empty `{}` happened to skip its row loop, masking the error.

Read-only evidence: DataDump `local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`,
SHA-256 c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec;
bounded Capstone5.0.7 Thumb inspection. G addresses in this region equal file
position plus0x10000. No Ghidra/device/evidence writes were used.

* RequestBlock G817888 reads a vector of uint64 targets. Helper G817f34
  constructs JSON type2 at G817f52..G817f58, copies vector contents and dumps
  at G817f84. ADD G8179ee binds target_list; ADD G817b66 binds /relation/Block.
  The ordinary auth keys are app_code, app_ver, market, pvid, otp.
* RequestUnBlock G818420 also uses target_list (ADD G8185aa) and
  /relation/Unblock (ADD G818720), not target_pvid or target_nickname request
  fields inferred from nearby literal strings in the old mail-social note.
* ReqBlockCB G817fcc accepts result_code1, parses the response JSON, selects
  ret_data (ADD G8180d8), indexes rows numerically (G818150) and reads
  target_pvid (G81815a) / target_nickname (G8181aa) to add native blocked users.
  Successful Block must return actual row data, not generic mock metadata.
* ReqUnBlockCB G818af0 reads result_code (ADD G818bfc); it does not consume a
  returned row DTO. The request vector supplies removed identities.
* ReqBlockListCB G8194c0 selects ret_data (ADD G8196b8), clears its internal
  blocked-user map (G8196c2..G8196ec), numerically indexes selected rows at
  G819750 and reads target_pvid (ADD G819758) / target_nickname (G8197a8).
  It inserts those parsed identities into its internal C++ map. Wire shape:
  `ret_data:[{target_pvid:integer,target_nickname:string},...]`.

Implemented pure module src/social-blocks.ts and tests/social-blocks.ts:
JSON target_list parsing, positive safe integer IDs, deduplication, actual
server identity nickname resolution, self/unknown/repeated-target refusals,
atomic immutable batch transitions, and native row projection. Missing block
limits, numeric error codes and prices are not invented. Safe-integer/input
validation and duplicate refusal are explicit replica policy, not claimed
native coercion behavior. No reputation, reward, hunter or wallet changes.

Root integration seam: persist one socialBlocks map per authenticated account;
hydrate absent legacy value to empty. Block resolves all requested IDs against
established local accounts, commits the new map only if the entire batch passes,
and returns socialBlockRows(newMap). Unblock commits only after valid batch
admission and can return empty ret_data. BlockList returns socialBlockRows(map),
replacing the current {} response. Do not accept target_nickname from clients.
Reject generic mock success for other unsupported relation mutations. Filtering
search/mail/friend requests by blocks requires separate explicit integration.

Validation: npx tsx tests/social-blocks.ts; npm run build passed. Tests prove
mixed valid/unknown batches cannot partly mutate, same-target repeats are
normalized, unblocking remains possible if a target account disappears, and
invalid persisted rows cannot enter the native DTO. Root must add route-level
persistence/ownership tests before activation. Native validation can block a
known established local profile, inspect BlockList, reload and then unblock;
no fabricated multiplayer targets or unsolicited messages are needed.

Integration now implemented in ServerState.socialBlockAction and game-routes.ts.
The optional Account.socialBlocks field preserves legacy account bytes on reads;
only accepted block/unblock writes persist it. Restore validates every present
map and refuses malformed/self entries without overwriting the state file.
Persistence failure rolls back the in-memory map. Auth is required for all three
routes. The route test creates only throwaway accounts/saves and proves restart,
account isolation, wallet/progression preservation, forged-nickname rejection,
atomic mixed-batch refusals, legacy no-write reads and filesystem-failure rollback.
The obsolete BlockList wire-map assertion in tests/smoke.ts is corrected too.
