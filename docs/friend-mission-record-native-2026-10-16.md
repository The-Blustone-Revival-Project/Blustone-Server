# Friend mission records: original wire/cache contract

Read-only bounded Thumb inspection of the original ARM library SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses below are ELF/file code offsets plus0x10000. Exported
owners are independently named in DataDump
sources/native/symbols/native-evidence.tsv:14588,15073–15075. No original
binary, DataDump source, client, private state or live UI was modified.

## Request and successful callback

CSRSyncMStage.GetFriendMissionRecord Gb46468 builds only the five standard
auth fields app_code/app_ver/market/pvid/otp. Their literal sites are
Gb464fa/Gb46524/Gb46542/Gb46570/Gb4659c. The route literal is
/world/GetFriendMissionRecord at Gb4671a..71c. No stage selector, page,
friend ID, count, reward or stage progress is supplied by this request.

The matched second TASK_READY callable for GetFriendMissionRecord's $_8 is
Gb4b300. Its RTTI name is retained in native-all-strings.tsv at the
GetFriendMissionRecord $_8 E0 chain, with vtable ELF2154bfc and RTTI
ELF2154c28. The operator is ELFb3b300. It calls GetResultCode at Gb4b31e,
requires1 at Gb4b324..326, selects exact ret_data at Gb4b328..332 and invokes
CSRPlayData.SetFriendMissionRecordList at Gb4b33e. Non-success skips cache
replacement and invokes the continuation with the result code.

Successful canonical wire shape is a BARE collection under ret_data:

```json
{"result_code":1,"ret_data":[{"pvid":123,"profile_url":"...","stage":"n_01_01"}]}
```

An empty success array is a real cache clear, not a generic unsupported
object. No neighboring route shape is inferred by this audit.

## Entire cache replacement and exact row fields

SetFriendMissionRecordList Gb7172c first destroys its map at PlayData+270
and resets the tree/count at Gb71744..760. It then iterates the supplied
collection. The native JSON iterator supports array and object values;
the canonical producer can deliberately use arrays.

- pvid literal: Gb717e0..7e4. Integer conversion loads BOTH words at
  Gb7182c. Map ordering/key comparisons retain both halves at Gb7196e..990.
  Therefore this is uint64 identity, not the narrower effective32 ID used
  in some unrelated quest/item receipts.
- profile_url literal: Gb717e6..7ea. Its strict string conversion is
  Gb71866; missing/null/object must not substitute for a string.
- stage literal: Gb71874..87a. Its strict string conversion is Gb7188a.
  It is one stage string, not a stage array, stars/count, nickname or level.

The stored tree node keeps stage at+20 and profile_url at+2c. Insertion
searches the existing full64 key; an existing pvid bypasses insertion through
Gb719a8..9aa to Gb71a18 and reaches cleanup. Thus duplicate pvid input retains the FIRST
row; it is not a last-write-wins update. A canonical producer should emit
unique identities rather than depend on this incidental duplicate handling.

GetFriendMissionRecordList Gb71578 exposes the cache. The separate
GetStageFriendMissionRecordList Gb71580 compares the caller's stage string
against stored stage using exact lengths/bytes at Gb715d0..b71626, then
copies matching pairs at Gb71628..632. It does not compare counts or compute
a furthest/highest stage. A specific avatar-rendering caller has not been
closed by this bounded audit; stage-specific record filtering is established.

## Declared local progression/social policy

The server implementation now places each eligible friend at their
furthest actually earned ordinary published stage. This ordering/placement
law is LOCAL: the native parser does not establish original backend ranking.
Diagnostic seeded stars must not be promoted into earned battle progress.
No actually earned stage means omit that friend's row.

Eligibility is likewise explicit local policy: same-server accepted friends,
with either direction's block excluding the pair. Do not expose arbitrary
accounts or treat pending relation requests as accepted friends. A100x100
original PNG fallback avatar is a local presentation choice, not recovered
original avatar selection or proof of native map pixels. The response is
read-only progress projection and creates no friendship, stage clear, wallet
change, reward or Hunter grant.

## Implementation and checks

friend-mission-records.ts uses earnedStageOrders, including explicit empty
flags over historical fallback counts, and takes only actual published n_
stage order from the current area links. Unknown/unpublished stages, active
attempts, losses and BLUSTONE_SEED_STAGE_STARS do not become friend records.
ServerState establishes accepted edges and localSocialProfile visibility,
then reads gameByPvid directly. gameFor is deliberately not called because
it can regenerate AP/BP and persist. No new state schema or journal is needed.

The production-namespace disposable state test executes native-shaped
FriendRequest/Accept, mission Start/Complete and noncontiguous earned flags;
then checks pending/unfriend/both block directions/cross-server/auth/forged
selectors, missing peer game, elapsed energy clocks and restart. Reads retain
exact game object references, values and durable file bytes. Pure projection
tests cover published ordering, legacy fallback, explicit empty precedence,
unknown-stage exclusion and detached output.

verify-independent.mjs --fixture --exercise-social additionally verifies
the empty bare-array response through compiled ECDH/HMAC/AES transport,
unchanged disposable-save bytes and process restart. That encrypted check
does not create an earned friend stage; the state test covers that producer.
No live profile activation, native UI input, account save or APK changed.
