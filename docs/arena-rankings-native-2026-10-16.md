# Fight Club standings: distinct native ranking contracts

Immutable original ARM SHA256
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded original Thumb inspection; G addresses use ELF code+0x10000.
No original/DataDump bytes, private state or native UI were modified.

## Global list requires complete rival DTOs

CSRSyncFC.RequestWorldRank Gf60294 sends auth5, page unsigned32 at Gf603f6
and page_scale unsigned32 at Gf6041e to /arena/GetGlobalRankList Gf6056e.
There is no league, season, owner or relationship filter in this request.
Native CSRTableFCRank.SetTab Gff9d30..3a initializes page1; its actual
RequestWorldRank Gffa458..460 passes the stored page and literal scale10.
These UI values do not recover the original server's maximum batch quota.

ReqWorldRankCB Gf60970 requires transport success and BODY result_code1,
then selects ret_data and calls ParseWorldRanking G945e9c at Gf60a42.
The exact response subtree is ret_data:{season_no:UINT32,list:[...]}, with
season stored at FCPlayData+21c at G945f10. The parser resizes/replaces
its page list at G945f42 and calls ParseDefender G943958 for EACH row at
G945f94. It does not append prior pages or sort by rating itself.

Thus a ranking row is a full ParseDefender object, not a brief pvid/score
summary: strict metadata strings, battle profile, bonus parents and complete
card/Gem grammar for nonempty collections are required. See
friendly-battle-preparation-native-2026-10-16.md for that independently
called shared parser. Row battle.pvid is full64; battle.rank is uint32.
Original seasons, selection, tie order and original server placement rules
are not established by the page/header grammar. Global-list success remains
unsupported until its complete source-compatible projection is available.

## Own rank and friend-row identity limits

GetMyRank's exact callback is retained in DataDump
sources/native/systems/ghidra-arena-myrank-callback.txt. It requires success,
reads ret_data.rank as effective unsigned32 and updates FCPlayData+128.
That rank must agree with any full own-profile replacement (Arena Enter or
SaveComment ParseMe), otherwise a later profile resets it to a stale value.
The former rank1 was an explicit single-player revival fixture.

Friend ranking is a distinct parser, ParseFriendRanking G94616c. Its pvid
consumer narrows identity to effective32, unlike ParseDefender's battle
pvid. The pure friend projection therefore refuses a selected wide identity
instead of aliasing it. A hidden wide participant can still occupy an
established local rank; no narrowed row is emitted for it.

## Explicit local standings and population policy

src/arena-rankings.ts validates positive safe local numeric pvids (a subset
of native uint64), unsigned32 rating/win/lose and unique identities. It
sorts rating descending, then pvid ascending for ties, assigning sequential
one-based uint32 ranks. This deterministic tie order is LOCAL, not an
original shared-rank or production-world rule. Actual win/loss counters are
preserved without inventing another tie-breaker. Returned rows are detached.

The caller's intended LOCAL population includes self always, plus loaded
same-server real accounts with existing Fight Club evidence: stored deck4/5,
a win/loss count or a pending Arena attempt. Blocked participants still
occupy positions for ranking consistency; visible friend rows are selected
separately through the relationship/privacy gates. Friend projection keeps
self and eligible supplied friend IDs in established order with rank gaps,
rather than silently renumbering a private subset. Population authorization
belongs to the state caller; no account, party, stars, score or economy is
created by the pure ranking helper. Seasons, resets and native rendered
leaderboard behavior remain independently unverified.

## Friend request, cache and self row

> The global success blocker described here was resolved by the later
> [actual-owned global page implementation](arena-global-rankings-2026-10-17.md).
> This earlier note retains the original request/parser evidence and historical
> implementation boundary; global pages are no longer universally unsupported.

RequestFriendRank Gf60ae4 sends auth5 only, with route at Gf60d18.
ReqFriendRankCB Gf6109c invokes ParseFriendRanking G94616c; list is
selected at G94618c/194 and replaces FC+22c. Each row consumes exactly
pvid, rating_point, rank, win and lose as effective uint32. PVID lowword
LDR G9462f0 becomes STRD with highword0 at G946322.

The UI compares returned PVID against CPVAccount+58 at Gff4f76..8e:
self uses PushMyRankToData Gff4f60/64, others resolve GetTargetUser
Gff4f9c then PushFriendRank Gff4fc2. CSRTableFCRank repeats this at
Gffaeea..aefe/eda. Thus omitting self is not repaired by the native UI.

Pure/state tests cover actual earned Arena ratings, ties, rank gaps,
accepted friendship and both block directions, current profile consistency,
uint32 refusal, no-write reads, missing snapshots and schema5 restart with
existing quest/dispatch history. Global success remains explicitly refused.

The compiled disposable verifier also exercises separate encrypted owner,
friend and nonfriend connections, actual local Arena settlement, matching
own full profiles, exact friend rows, global refusal and process restart.
Run: node scripts/verify-independent.mjs --fixture --exercise-arena-ranks.
Both encrypted_arena_ranking_fixture and arena_ranking_restart_readonly_fixture
report true. No native rendered UI validation is implied.
