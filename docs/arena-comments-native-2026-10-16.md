# Fight Club messages: native SaveComment request and cache replacement

Immutable original ARM SHA256
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded read-only Thumb research; G addresses are ELF code+0x10000. No
original/DataDump bytes, client, live UI or private state were modified.

CSRSyncFC.RequestUpdateMe Gf6193c accepts three nullable C-string pointers
for start/win/lose and a result callback. Non-null pointers insert native
JSON STRING values; null pointers omit their key. Exact keys are
start_message Gf6198a, win_message Gf619fe and lose_message Gf61a72.
The resulting object is JSON-dumped at Gf61c2c and sent as form STRING
comment_info Gf61c36 plus auth5 to /arena/SaveComment Gf61d5a. It is ordinary
JSON text/UTF8 form content, not Base64 or a numeric comment-type selector.

The numeric type is LOCAL TO THE NATIVE POPUP, not the request grammar.
CSRPopUpFCMsgInput.SetMessageType Gc1dc3c stores its enum word at popup+f0.
ResultCB Gc1d8f0 copies current cached messages from FCPlayData+164/+170/+17c,
then Gc1d9c0..da2c replaces one: type0 start,1 win,2 lose. It submits all
three strings through RequestUpdateMe. Empty input is rejected before that
request at Gc1d916..918. This UI path does not establish original server
clearing rules, an original character limit or a backend profanity policy.

ReqUpdateMeCB Gf62154 first rejects nonzero transport status Gf62160..16a.
It parses BODY result_code as signed32 at Gf621ba..62210, admitting ONLY1.
Success selects ret_data and invokes CSRFCPlayData.ParseMe G946994 at
Gf62212..226. ParseMe selects user at G9469aa..b2, then battle at
G9469b6..ba, calls ParseUser G9430f8 at G9469c4 and REPLACES its own cached
BATTLE_USER at+118, G9469c8..ce. This is not generic SyncUser.

Therefore success needs ret_data:{user:{battle:FULL_CURRENT_BATTLE_USER}},
not direct message fields or an empty acknowledgement. The independent
ParseUser contract requires full64 pvid, unsigned32 rank/season_no/weekly_no/
league_level/rating_point/league_win/win/lose, numeric full64 refresh_datetime,
and strict start_message/win_message/lose_message strings. Supplying only the
changed message could reset unrelated native counters or fail string parsing.
No wallet, item, purchase or reward parsing occurs in this callback.

src/arena-comments.ts is a pure local message-state planner. It accepts only
the three source-backed patch keys, preserves omitted current values and
rejects malformed retained state rather than repair it by default. LOCAL
admission requires nonempty lossless UTF8 strings, at most128 Unicode
codepoints each and no C0 controls. This is NOT a recovered original128-char
quota. It does not trim, normalize Unicode, derive Guild restrictions or
invent a profanity filter. Empty object is a valid no-op patch; first
explicit nonempty patch captures all three existing local default strings,
even if the selected value matches the default. The defaults themselves
remain local revival presentation text, not recovered player messages.

Persistence/versioning, authorization and full-current-cache receipt
projection belong to the state handler. This planner changes no Fight Club
rating, attempt, fee, season, roster or wallet. Native input/result pixels
remain unverified independently of the recovered wire/parser contract.

## Persisted implementation and validation

SaveComment now uses a server-owned Account.arenaComments object rather
than client-supplied extra_data. First explicit settings capture all three
current local defaults plus the patch. Complete own battle-profile receipts
preserve current pvid/rank/season/league/rating/win/lose/refresh values. Arena
Enter publishes the saved three messages, and real detailed profiles publish
their supported win/lose fields. Presentation-only rival defaults remain.

Settings-bearing saves use version5 with dispatches/quests arrays, even
when empty. Restore validates exact stored preferences, rejects preference
fields under versions1..4, rejects malformed version5, and permits existing
linear journals under4 or5. Versions1..4 without preferences retain their
existing format. Older writers' explicit version guards reject5 instead
of silently dropping settings. Unrelated extra_data remains opaque and
registration metadata cannot seed the server-owned setting.

The action uses the loaded game directly, plans/validates the full native
profile before changing account metadata, restores absent or prior settings
on write/rename failure, and acknowledges empty/equal patches without a
write. No ownership, energy clock, wallet, rating or battle attempt changes.
Tests cover patches, Unicode/local bounds, isolated accounts, metadata
injection, full receipts/profile propagation, exact-reference/durable-byte
rollback, corrupt/downgraded saves, old versions and captured journals.
The compiled --fixture --exercise-arena-comments check verifies encrypted
full-profile replacement, preference-only persistence, no-write repeats,
detailed-profile propagation and schema5 process restart. Its explicit
disposable-only guard excludes private/preserved targets and other exercises.
A baseline flush accounts for earlier inventory/Arena lazy resource reads;
the measured SaveComment game snapshot is exact. Native UI editing remains
unverified; no original text-length/clearing/economy law was inferred.
