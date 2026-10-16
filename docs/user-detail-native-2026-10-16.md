# Detailed user profiles: native flat contract and owned projection

Immutable original ARM SHA256
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Read-only original source/Thumb audit; G code addresses are ELF code+0x10000.
No original/DataDump bytes, private saves or native UI were modified.

AsyncRequestUserDetail Gf66944 iterates the complete vector<uint64>, LDRD
Gf6698e and8-byte stepping Gf669ae. Each element becomes an unsigned numeric
JSON token; the array is dumped at Gf669c4, then sent as list (Gf66af6) to
/world/GetUserDetail (Gf66c78/cce), with standard auth5. No original
three-profile batch quota was found. Request bool selects a transport setup
branch at Gf66c52 rather than a target-list cap. The replica chooses a LOCAL
50-input bound and first-occurrence deduplication. The pure parser admits
an empty array, while the authenticated route retains its existing LOCAL
nonempty-target requirement.

ReqUserDetailCB Gf671c0, published in
sources/native/economy/ghidra-mail-world-detail.txt, requires transport success
and application result1 before ParseUserDatailInfo Gf6e240. That parser
selects wholeJSON.ret_data as the row collection, not a list child. It creates
temporary profile/Card objects for its result map, not owned inventory grants.

Critical width distinction: request IDs are uint64, but row pvid is converted
to effective unsigned32. Published sources/native/revival/native-pucinven.txt
lines209–236 and direct Thumb Gf6e388(single-word load)/Gf6e3b0(unsigned32
float conversion)/Gf6e3b8(single-word store) establish this narrowing. A
producer must not publish account IDs aboveUINT32 and silently alias them.
The exact-token request parser applies that response limit before Number
rounding can lose identity.

The parser's complete flat field vocabulary is independently retained in
sources/native/revival/ghidra-userdetail.txt. Root numeric fields are pvid,
group_exp, vip_exp, league_level, rating_point, awake and prev_rank. Tail
stage_id/win_message/lose_message are strict strings. For leader and numbered
positions1..5, fields are inst_id/ref_id/rank/rank_up_cnt/awk_step/overcome_cnt/
awk_overcome/exp/skin_ref_id and skill_1_level through skill_5_level, suffixed
_leader or _N. Card instance IDs preserve full64; progression words are U32;
reference and skin IDs are strict strings when that card's ID is nonzero.

Leader zero guard uses both identity words at Gf6e58c..592. Numbered slots
loop through5 at Gf6ec5e, read both words at Gf6ec9e and skip card allocation
and further field parsing when zero at Gf6ecd6..da. Nonzero rows parse the
full instance ID at Gf6ed3e/64 and ref string at Gf6ed9a. Zero numbered slots
are omitted from the native temporary card list; they do not clone the
leader. The prior presentation fixture's leader fallback was LOCAL behavior.
No equipment or Gem detail fields are consumed by this profile parser.

src/user-details.ts projects actual saved leader and ordinary deck1, with all
five numbered IDs and only inst_id_N:0 for empty positions. It refuses
missing/unowned/duplicated participants, unpublished references and malformed
selected progression rather than grant a replacement or use fixture fallback.
The existing local stored-card numeric identity model is a safe-integer subset
of native uint64. Neutral awake0/prev_rank0/empty battle messages are LOCAL
display choices, not recovered account history. Display stage uses the last
actually earned published ordinary stage, or the first published ordinary
stage if none was earned; that fallback does not grant a clear or new stars.
Profile visibility and batch authorization belong to the calling state route.
Native profile pixels and complete original backend placement remain pending.

## Runtime scope and checks

The route now returns actual saved self and mutually nonblocked same-server
peer profiles, including discovery candidates before friendship. Real local
account identity takes precedence over presentation fixtures; unknown targets
or unavailable/incomplete owned snapshots fail the complete batch. Notice
and local Arena fixtures retain their documented presentation-only rows.
No account credentials, item inventory, equipment or Gem data is projected.

Real rows use gameByPvid directly and never partyProfileSnapshot/gameFor,
which can regenerate resources. The old flat lobby compatibility helper is
not silently converted into battle or owned-card inventory. DTOs are detached
primitives; no saved profile, party, energy clock or progression field changes.

The disposable production-namespace test earns VIP20 through actual supply
visit/claim, trains a skill, wins a mission, recruits enough owned Hunters
and changes deck1 including empty positions and the fifth slot. It verifies
those actual values plus auth/visibility/mixed-batch/uint32/ref/leader/clock/
missing-game failures, exact nested references/file bytes and restart.
The compiled --fixture --exercise-social verifier additionally reads a real
candidate before friendship over ECDH/HMAC/AES and compares its detailed
profile after process restart. Native profile rendering remains pending.
