# Native friend cancellation, rejection and removal

Read-only original ELF instruction/key audit and local server implementation,
2026-10-11. No UI, ADB, Ghidra, live save/profile change, external messages or
DataDump write. This completes the locally implemented request→accept→unfriend
cycle, with cancellation and rejection of pending requests. Native UI remains
unverified.

## Original request and receiver shapes

All three requests receive `vector<uint64>` (original symbols) and invoke
**CPVRelation.CreatePVIDList G817f34**. The helper constructs JSON type2/array,
builds a `vector<json>` from the numeric uint64 iterator range at G817f6c, and
calls JSON.dump at G817f84. Thus the form value is **JSON-serialized numeric
array text**, e.g. `target_friend_id_list:"[1,2]"`, not comma-separated text,
account-PVID fields or an array of strings.

Exact register-matched original LDR/ADD-PC keys:

```text
Cancel:   RequestCancelFriendList G81b5a4
          G81b732 target_friend_id_list; G81b8d4 /relation/FriendReqCancel
          ReqCancelFriendListCB G81bce0: G81be58 ret_data; G81be62 friend_id_list
Reject:   RequestRejectFriendList G81c0d4
          G81c262 target_friend_id_list; G81c404 /relation/FriendReqReject
          ReqRejectFriendListCB G81c810: G81c944 ret_data; G81c94e friend_id_list
Unfriend: RequestUnfriendList G81cb90
          G81cd1e target_friend_id_list; G81cec0 /relation/Unfriend
          ReqUnfriendListCB G81d2cc: G81d400 ret_data; G81d40a friend_id_list
```

Each successful receiver reads **ret_data.friend_id_list**, iterates the
numeric IDs into its callback vector, and passes those IDs onward. Cancel's
uint64 paired read is G81bf02; its stored pair is G81bf2e. Reject and Unfriend
have the same iterator/conversion structure. Canonical successful body is
**ret_data:{friend_id_list:[relationshipID,...]}**. This is a relationship-ID
list, not a target-user PVID list and not a bare root array.

This corrects the old adjacency-based social report that attributed
`friend_id_list` to cancellation/rejection **requests**: that spelling belongs
to their **receipts**. `target_friend_id_list` belongs to all three delete
requests. Keys are retained in `social-friend-delete-keys-2026-10-11.txt`, raw
bounded instructions in `social-friend-delete-native-2026-10-11.txt`.
Original ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses add0x10000 to ELF listing addresses.

The proved **FriendReqAccept** remains the separate scalar
target_friend_id→ret_data.friend_id contract. No bulk accept request/receiver
was established in the inspected export/field boundary. Do not borrow a delete
list spelling to invent one. If native UI performs multiple individual accept
requests, those use the already implemented scalar handler; that UI loop itself
has not been verified by this audit.

## Local lifecycle and retry policy

- Cancellation is owned by the **sender** of a pending request.
- Rejection is owned by its **recipient**.
- Unfriend requires an **accepted** relationship and either participant.
- Every ID in a batch is validated before any cloned state changes. Unknown,
  unrelated, wrong-direction or wrong-state IDs refuse the entire batch.
- The existing block graph does not prevent cleanup; blocking admission applies
  to new requests/acceptance, while either participant can remove a friendship.

Deletion retains explicit cancelled/rejected/removed tombstones, including
original participants and relationship ID, rather than reuse IDs or lose retry
ownership. This is local policy; original storage/retention semantics are
unknown. Only pending/accepted rows count as active pairs and appear in friend
lists. Historical rows do not authorize friendship profiles; independently
eligible public discovery candidates can still have brief identity/avatar
profiles before friendship. A later request to the same peer receives a fresh
monotone ID. Replaying an old deletion cannot delete that fresh relationship.
The removed history cannot be resurrected through stale acceptance.

Same-operation authorized retries return their original canonical
friend_id_list without rewriting. Duplicate IDs in one incoming numeric array
are canonicalized once in first-occurrence order. Empty/malformed arrays refuse.
These are explicit local idempotency/admission policies. Invalid batches and
failed persistence restore the entire prior graph/allocator and both account
views. No account/game/wallet/card/deck/progression values are modified.

## Verification

`npx tsx tests/social-friend-removal.ts` passes pure and routed tests covering
sender/recipient/accepted ownership, numeric JSON list grammar, asymmetric
request/receipt names, whole-batch refusal, duplicate IDs, mutual removal,
restart history, stale deletion versus fresh requests, stale accept refusal,
removed-peer public candidate behavior without friendship resurrection, persistence-failure rollback of all participants,
monotone allocation and unchanged persisted gameStates. Existing
`tests/social-friends.ts` and TypeScript build also pass. Root owns final
combined tests, OpenAPI and live activation.

Original friend quotas/expiration, global suggestions/search algorithms,
invitation/recommendation rewards, like quotas/cooldowns and Mirage friend-floor
records remain unreconstructed. Local discovery and actual local-peer likes
are implemented separately in their corresponding Server documents.

Root compiled encrypted fixture check passed accepted unfriend, recipient
rejection, sender cancellation, fresh same-peer requests with monotone IDs,
stale-delete replay preserving the fresh relation, wrong-role refusal, and
final accepted relationship after restart. No live relationships were created
or removed. Functional server activation preserved all three existing games
and account/transport/session records exactly. Native UI remains pending.
