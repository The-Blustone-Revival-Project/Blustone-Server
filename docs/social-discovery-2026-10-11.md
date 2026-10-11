# Genuine local friend suggestions and nickname search

Read-only original ELF audit and local implementation, 2026-10-11. No ADB/UI,
Ghidra, live save/profile change, external messages or DataDump writes. This
adds discovery of actual local accounts, rather than fictitious friend rows.
Native device rendering/interaction remains unverified.

## Exact native request/receipt boundary

**RequestSuggestedList G81df8c** sends `/relation/GetSuggestedFriendList`, with
**start** at G81e118 and **length** at G81e140. Its callback **G81e6f0** reads
**ret_data** G81e900, **start** G81e90c, **length** G81e958 and **list** G81e9a4.
The body is an object, not the prior replica bare array:

```text
ret_data:{start:uint32,length:uint32,list:[PV_FRIEND_INFO rows...]}
```

**RequestSearchFriend G81f078** sends `/relation/FriendSearch`, with exact
**target_nick_name** G81f200, **start** G81f21e and **end** G81f246. Search
does **not** send length. **ReqSearchFriendCB G81f6a4** nevertheless reads
response **ret_data.start/length/list** at G81f8b0/G81f8fc/G81f94e. Request end
must not be echoed as a response field in place of length. Both callbacks read
uint32 pagination values and call **GetFriendInfo G81ec20** for each list row
(Suggested G81ea74; Search uses the same helper).

Native game manager default requests are also closed: **RequestSuggest** calls
the SDK with start0/length10 at G96a656/G96a658/G96a65c. **RequestSearch** passes
start0/end10 at G96a362/G96a364/G96a36c/G96a36e. This proves the actual game's
initial ten-row boundary, not original maximum quota or server range semantics.

Candidate rows use **type:"candidate"**, mapped by GetFriendInfo to enum2.
Their identity is **target_pvid**, distinct from friend_id. GetFriendInfo reads
friend_id as uint64 and unconditionally stores it at **INFO+0x60 G81ec88**;
target_pvid is stored at INFO+0 G81ecd8. The inspected friend-ID conversion has
no nonzero admission gate. Suggested initializes numeric row storage to0 before
that helper. **CSRFriendMgr.OnPredSuggest G96a154** tests only the cached user's
type at+0x68 against2; it does not require a positive friend_id. RequestAsk
G96b158 forwards its input uint64 to **RequestFriend G81a184** at G96b21e,
whose proved wire field is target_pvid, not friend_id.

The replica emits **friend_id0** as an explicit **LOCAL no-relationship
sentinel** for these read-only candidates. Native parser/predicate compatibility
is proved as above; no original live candidate row was recovered, so zero is
not claimed as an original server metadata assignment. No relationship ID is
allocated or invented during discovery. Actual requesting creates a separate
positive monotone relationship ID through the existing owned lifecycle.

Exact keys: `social-discovery-native-keys-2026-10-11.txt`. Bounded instructions:
`social-discovery-native-2026-10-11.txt`. Source original ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`; ELF listing
addresses add0x10000 for the G addresses above. Original source stayed read-only.

## Explicit local discovery policy

`social-discovery.ts` sorts actual registered accounts by ascending PVID and
filters self, different-server accounts, either-direction blocks and all active
pending/accepted relationship partners before pagination. No account is created,
no Arena/mail presentation identity is inserted, and candidates do not become
friends or Mirage records. Historical deleted partners can be ordinary eligible
candidates again; this never resurrects their prior relationship IDs.

Paging requires canonical uint32 numbers or decimal form strings. The LOCAL
maximum is50 rows per page. Search interprets start/end as a **half-open range**;
the original server's exact end inclusivity remains unknown. Response length
is actual returned row count (local policy); response start echoes the requested
offset. Out-of-range pages return a successful empty list. Search is trimmed,
NFKC-normalized, case-insensitive nickname substring matching with a LOCAL
64-codepoint query limit; original matching/quotas are unknown. Invalid paging,
reversed/overlarge ranges, missing/wrong query field or control-character query
refuse without writes. No randomness, score, reward or hidden fixture is added.

Rows contain only actual peer PVID/name/registration mapping and public display
fields. They use the existing original100x100 system icon as a **LOCAL fallback
avatar**, blank country/status and neutral like/tick values. Original tick
semantics are unproved, so tick and the shared DTO's received_dtm stay0;
login times are not copied into either. GetFriendInfo itself does not read
received_dtm in the inspected boundary; retaining neutral0 also satisfies the
complete union field set used by ParseFriendInfo on the separate GetList path.
No token/device/email/private data or synthetic hunter party is returned.

The existing brief **GetTargetUserInfo.list** boundary now admits real
same-server mutually-nonblocked accounts, including candidates before a
relationship. Self and separately documented notice/Arena presentation fixtures
retain their existing behavior. Unknown/different-server/blocked peer profiles
refuse. Discovery/profile reads do not add a graph, advance its allocator,
regenerate energy or persist/change private state.

## Verification

`tests/social-discovery.ts` passes pure and real-route tests for both exact
request grammars/object receipts; original neutral candidate fields; deterministic
paging and multilingual substring search; self/server/relationship/block
exclusions; candidate→public brief→request; auth/spoof refusal; unknown and
different-server profile refusal; no private/party fields; blocked restart
behavior; exact save-byte preservation on reads and unchanged gameStates after
the legitimate request/block mutations. Both existing friend lifecycle suites
also pass. Root owns final combined checks, API docs, commits and activation.

Original suggestions ranking, original search range/matching/quotas, friend
limits, likes, invitation/recommendation rewards and device validation remain
open. This is a working local discovery policy over genuine accounts, not a
claim to have recovered the original global social service.

Root compiled encrypted verification passed suggestions, actual candidate brief,
nickname search, request and accepted-peer exclusion, followed by cleanup and
restart. No live relationship or account data was changed in these fixtures.
