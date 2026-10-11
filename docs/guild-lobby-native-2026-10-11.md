# Guild lobby/member contract — 2026-10-11

The first safe Guild seam is a truthful authenticated no-guild lobby plus exact
projection of already-established guild/member records. It is implemented in
src/guild-lobby.ts; creation/join/admin/fuel/chat transactions remain unavailable.
No original Guild instances, membership IDs, fees or rewards were recovered,
created or imported. No local account was assigned to a Guild.

## Corrected native ownership and field assignments

Original read-only ARM source: DataDump local/inputs/extracted/lib/armeabi-v7a/
libnative_core.so SHA256 c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded Capstone5.0.7 Thumb reads; G addresses equal file/ELF position+10000 in
these regions. No Ghidra, device, private-save or DataDump writes.

Old findings/systems/guild.md inferred that my_guild was a Guild INFO object.
That conclusion is wrong. CSRInstanceSync.ReqGuildInstCB Gae61dc checks native
success1, selects ret_data at Gae6200, tests my_guild at Gae622c and passes the
selected ret_data.my_guild to ParseMyInfo Ga685f0 at Gae6284.

ParseMyInfo exact fields: guild_id ADD Ga685fc; status Ga6864c; newbie Ga6869c;
role Ga686f0; contribution Ga68760. PLAY_DATA.parse Ga823b0 independently uses
the same five fields. Thus the safe local no-affiliation response subtree is
my_guild:{guild_id:0,status:0,newbie:0,role:0,contribution:0}, not an invented
INFO object and not null that leaves the old cache uninitialized.
RequestMyInfo Ga6ced0 sends auth fields only to /lobby/GetGuildInfo (Ga6d124).
This proof establishes that one exact subtree; old adjacent-string inference
about six sibling sections is not promoted into an unverified full lobby.

Guild INFO is separate: ParseGuild Ga6a384 reads id/name/type/fc_point_limit/
contribution/region/emblem_id/member_cnt/desc/rank/gvg_win_cnt/gvg_inf_win_cnt.
It optionally reads members/banished/rejected/exited/invited_guests. Its member
helper Ga6b4b0, called by ParseMembers Ga6b1f4 at Ga6b288, reads row pvid
(Ga6b4d0), contribution (Ga6b524), newbie (Ga6b56e), role (Ga6b5be) and fc_point
(Ga6b60c). Internal C++ member maps do not justify wire maps: use actual row
collections and explicit pvid fields. Ban/invite histories are omitted by this
projection because the local model does not represent them; no fake empty
history is asserted.

JoinTypeToText Ga82730 compares1/2/3 and resolves original localized keys:
1 at ADD Ga8274a -> guild join public;2 at Ga82762 -> permission;
3 at Ga82756 -> private. RoleTypeToText Ga8278c subtracts1 and uses its four-byte
TBB table at Ga8279c: [2,15,21,27]. Targets Ga827a0/Ga827ba/Ga827c6/Ga827d2 bind
role1 leader,2 supervisor,3 member,4 newcomer. Exact original key literals are
at G1d78fe6/G1d79002/G1d79021/G1d7903d. IsInvitable Ga67eb8 requires nonzero
guild_id, status3 at Ga67ec2, and role1 or2 at Ga67eca..Ga67ed6. Joined status3
is therefore concrete; mutation/transition and pending status semantics remain
unrecovered.

Guild action prices are a separate original table: ParsePriceByActionRef
Ga801ac reads action/price_type/price at ADD Ga80246/Ga8024c/Ga80252.
Actual action assignments, currency mapping and numeric rows remain missing.
Never derive free creation from an absent FindPrice result or borrow ordinary
Gym prices. guildCreationUnavailable preserves an explicit missing-fee/gate
boundary. Creation admission/rank limits, rejoin clocks and permission checks
still need original consumer/transaction evidence before enabling Found/Apply.

## Resources and practical native next step

Server's imported original resources/runtime/assets/GUILD.jet exists in its
pinned import manifest:2258272bytes,
SHA2569a2964fa1137b4ed6d09570103397ab3a221f31c97ed462c03a94fbe01c5fe66.
Other recovered GvG resources exist, but resource ownership is not evidence of
Guild fees, participant identities or a ready enemy Guild. GUILD.jet is not in
the active139-package E6 selection. No package profile or runtime was changed.
Native entry may require a separately verified original Guild resource profile
and consumer gate before root can safely inspect the panel.

Root integration proposal: authenticated /lobby/GetGuildInfo returns envelope
of guildLobby(account.pvid) while no membership store exists; no gameFor energy
regeneration or state writes are needed for this read. Exact already-established
records can later be projected with known local account IDs and original emblem
IDs. Missing establishment fails rather than generate player/Guild identities.
Refuse unsupported /guild/Found/Apply/admin/fuel/chat mutations explicitly;
generic successful mocks must not imply new membership or free creation.

Focused tests/guild-lobby.ts uses authored identities/AUTHORED_FLAG only. It
proves native flat PLAY_DATA versus separate INFO, personal versus total
contribution, row identity/cardinality, nonmember behavior, duplicate/conflicting
membership refusal, missing emblem/account refusal, original join/role ordinals,
unchanged inputs and explicit no-free-creation gate. npx tsx tests/guild-lobby.ts
and npm run build passed. No shared state/routes/bootstrap edits or activation.
This is Guild contract/lobby groundwork, not complete playable Guild/GvG.

Root integrated authenticated flat no-affiliation boot data and empty
notifications without state writes. Guild/GvG operations refuse2001 until
establishment/fees/participants/rewards are reconstructed. Actual read/refusal
route tests preserve all owned fields; encrypted compiled lobby/Found refusal
checks pass. This is not a joined Guild or a playable GvG claim.
