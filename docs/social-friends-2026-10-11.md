# Local account friendship lifecycle and native list correction

Original final-client Thumb analysis and local server implementation,
2026-10-11. No ADB/UI, Ghidra, live state/profile change or external message.
DataDump is read-only. Native device validation remains pending.

## Recovered protocol

Original ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`, retained
under DataDump `local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`.
G addresses add0x10000 to ELF virtual addresses. Bounded register-matched
LDR/ADD-PC extraction, with ELF PT_LOAD mapping, is retained in
`social-friend-native-keys-2026-10-11.txt`. The source was not modified.
`social-friend-native-receivers-2026-10-11.txt` retains the bounded actual
wrapper, enum comparison, paired clock conversion and success receipt code.

- **RequestFriendList G8168d8** sends `/relation/GetList` with scalar `type`.
  Existing native captures observed selector1 then3. **ReqFriendListCB G816fa4**
  reads full-response **ret_data.list** at G817082/G81708e and feeds that array
  to **ParseFriendInfo G817198**. The earlier server's bare ret_data array was
  incompatible; an empty list is **{list:[]}**, not `[]`.
- ParseFriendInfo consumes row keys `type,friend_id,target_pvid,reg_utc,tick,
  received_dtm,nick_name,country_code,profile_url,profile_status,like_cnt,is_like`.
  Type is a strict string, not the numeric request selector. Independent
  GetFriendInfo G81ec20 resolves **friend→1** (G81efac), **candidate→2**
  (G81eff4), **received→3** (G81efdc), **request→4** (G81efc4). Its same exact
  strings and paired64-bit IDs corroborate ParseFriendInfo.
- **RequestFriend G81a184** sends scalar **target_pvid** at G81a308 to
  `/relation/FriendRequest` G81a454. Success **ReqFriendCB G81a84c** reads
  **ret_data.friend_id** at G81a9ec and **ret_data.target_pvid** at G81aa38.
  These are uint64 IDs; the local server limits them to positive safe integers.
- **RequestAcceptFriend G81abd0** sends scalar **target_friend_id** at
  G81ad54 to `/relation/FriendReqAccept` G81aea0. Success **ReqAcceptFriendCB
  G81b298** reads **ret_data.friend_id** at G81b420. Accept operates on an
  existing relationship ID, not a target account ID.
- **ReqReceivedFriendCountCB G81dc8c** converts full-response **ret_data itself**
  to uint32 (G81de0c/G81de26), so `/relation/GetFriendReceivedCount` returns
  a scalar count. No `{cnt:...}` or list wrapper belongs on this endpoint.

Original tick handling uses paired64-bit reads (G81745c), passes divisor1000
at G817482 and stores its result. received_dtm likewise loads paired64 words
at G8174b6 and stores them at G817514. These fields are not proved32-bit
timestamps; their actual meanings remain unclosed. The implementation emits
**tick0/received_dtm0** as explicit neutral local fields, rather than assuming
they mean last login or copying an epoch-millisecond clock into an unknown
semantic slot. `reg_utc` uses the same local-account beginUtc mapping already
used by brief profiles; this is local policy. Internal relation created_at
milliseconds are solely persistence metadata.

## Local implementation policy

`social-friends.ts` owns a pure whole-graph planner and serializer. Optional
private persisted `socialFriends` contains a monotone safe-integer next_id and
relationships {friend_id,from_pvid,to_pvid,state,created_at}. One relationship
has two account perspectives: pending appears as sender's type4/request and
recipient's type3/received; acceptance appears as type1/friend to both parties.
The peer PVID/name/profile are always resolved from the actual other local
account. The relationship graph's candidate2 bucket remains empty; dedicated
suggestions/search now return eligible real local candidates without creating
friendships, Mirage floor records or invitation rewards. See
`social-discovery-2026-10-11.md`.

Authentication resolves the actor independently from payload target IDs.
Requests reject self, unknown accounts, reserved Arena/mail presentation IDs,
different-server accounts, established friends and reverse pending requests.
Only the recipient can accept its existing incoming ID. Either-party blocking
rejects new requests and acceptance; the separate block graph is not rewritten
and does not silently delete existing relationships. Original quotas,
expiration, search/recommendation/like/reward rules remain unknown. No
artificial friends or account creation occurs.

Same-direction pending request replay returns the same IDs; recipient accept
replay returns its original ID without allocating or rewriting. These are
explicit local idempotency choices, not captured original retry behavior.
Creation/acceptance publishes one whole graph, then atomically persists it.
Failure restores the previous entire graph, covering both account views and
the allocator. Invalid batches/ownership have no partial mutations. Restore
rejects malformed IDs/states/pairs/allocator, unknown participants or server
mismatch before exposing the server; corrupt source bytes remain untouched.

Legacy saves omit socialFriends until a genuine successful relationship change.
Reads do not add an empty field, regenerate energy or rewrite unrelated game
state. Native friend list profile_url reuses the existing original100x100
system image as a **LOCAL fallback avatar**, not an original uploaded user
avatar. Real relationship participants are also admitted to the existing
brief `GetTargetUserInfo.list` boundary, using their own account identity/name.
Eligible mutually-nonblocked same-server discovery candidates are also admitted
before friendship; unknown, blocked or different-server peers refuse. No private token/device/email fields
are exposed and no synthetic hunter party is assigned to a peer.

Cancel/reject/unfriend are now implemented through their recovered
`target_friend_id_list` request / `friend_id_list` receipt boundary, with owned
atomic batches and retained tombstone history. See
`social-friend-removal-2026-10-11.md`. The similarly named list field is **not**
a proved bulk-accept grammar; the original exported accept receiver is scalar.
Passing a removal list to FriendReqAccept remains an explicit refusal.
GetSuggestedFriendList/FriendSearch now use their separate recovered paginated
candidate-object responses. Actual native
request/list/accept/removal rendering is not yet verified.

Mirage's friend-floor response remains `[]`: real friendship does not recover
an earned highest floor or justify inventing floor0. The Mirage documentation
now distinguishes missing floor records from missing friendship itself.

## Verification

`npx tsx tests/social-friends.ts` passes pure/route tests for exact wrappers and
enum strings; source/recipient views; authenticated ownership and spoof refusal;
no fixture rivals; local peer brief profiles/fallback avatar; blocked admission;
pending and accepted replay; restart; failed persistence restoring both views
and allocator; malformed graph refusal preserving bytes; and exact unrelated
gameStates preservation (wallet, roster, decks, progression, energy clocks).
`npm run build` passed. Root runs final combined tests and owns any activation.

The separately requested **/shop/SellCard** safety guard authenticates first,
then refuses2001 because original hunter-sale profit references are absent.
Native sale success would otherwise remove client cards while a generic mock
left server ownership unchanged. This guard does not implement a sale or grant.

Compiled encrypted fixture verification passes request, incomingcount1, recipient
accept, reciprocal acceptedlists, incomingcount0 and both views after restart
with separate persisted transport tokens. --exercise-social requires --fixture.
No live accounts, game inputs or external service messages were involved.
