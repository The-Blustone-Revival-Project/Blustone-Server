# Local Guild role management, successor transfer and persistent bans

Implemented behind default-disabled `guildManagementMode` /
`BLUSTONE_GUILD_MANAGEMENT_MODE=local-management`. Enabling requires selected/
hash-pinned original GUILD art and explicit `guildRolePolicy` /
`BLUSTONE_GUILD_ROLE_POLICY_JSON` with formerLeaderRole2|3 and
maxSupervisors0..39. Those are local configuration, not original producer
defaults. Current native evidence is in the Appoint and Banish/history notes.
Native UI remains unverified; no live source/profile/save/input/APK was changed.

## Actual authority and full-state receipts

The original member-management UI provides Appoint only to leaders and Banish
to leaders/supervisors. Supervisor menus support subordinate role3/4 only;
leader targets and self rows do not offer removal. The replica implements that
hierarchy independently of requested Guild IDs or client-assigned roles.

Appoint takes scalar target_pvid and picker role1/2/3. Actual mutation requires
current leader and an owned same-server member. Role1 transfers leadership,
demoting the previous leader to the required configured role in the same atomic
Guild replacement. Role2 appoints supervisor, role3 demotes a nonleader. Direct
demotion of a leader without a successor refuses. Newbie flags, contribution
and FC snapshots are preserved; any role transition incompatible with native
newbie1→effective4 refuses. No guessed newcomer expiry or flag-reset occurs.

Configured supervisor capacity blocks increases above its limit. Supplied
over-limit existing records may still be repaired by reductions or changes
that do not increase their supervisor count; this is explicit local policy.
An already true target role in the actor's current Guild is a no-write receipt,
including a transferred leader's retry after it becomes a member. That echo
permits no role mutation or restored management privilege.

All success receipts provide actor's current flat my_guild, full affected INFO
and user:null. Core Appoint/Banish callbacks do not apply a captured target
mutation themselves, so full members/history are essential. Actor/target games
must be established and idle for actual mutation. State is validated before
persisting and a write failure restores the original Guild array. Hunters,
wallets, progression, Arena records, clocks, rank, contribution totals, GvG
counters, pending applications and unrelated Guilds remain unchanged.

## Ban history completeness and lasting local restrictions

Native INFO.banished is a collection of scalar uint64 player IDs, not member
rows or `{pvid,time,reason}` records. Supplying the field replaces the complete
native list. Missing/null preserves prior cache; it is not evidence of empty
history. The local model therefore supports explicit optional banished arrays,
validates unique known same-server uint32 IDs and refuses ambiguous overlap
with current members/pending applicants. Unsupported other histories remain
refused. Legacy absent fields stay absent across reads, writes and restart.

Banish requires a known-complete existing array. It removes only an eligible
current owned nonleader, appends its ID while preserving every prior ban, and
publishes the complete list. Already-banned exact targets return current INFO
without a write. Unknown/unowned/self/leader targets refuse. The implementation
does not create [] to overwrite an unknown older Guild's history.

Newly authored Found genesis explicitly establishes banished:[] because that
fresh local Guild has never existed before. This is known local history, not an
assertion that an imported original Guild had none. Banish notifications and
realtime target-device reset remain unreconstructed; authoritative later lobby
reads report removal. Native own-Guild target classification5 is source-backed,
but fresh Apply enforcement and ban lifetime are original producer unknowns.
This mode explicitly chooses indefinite bans and refuses future Apply/approval
into that Guild. No unban, expiry or invitation exception is invented.

## Identity correction and validation

Although services serialize uint64 targets, MEMBER.parse stores only PVID's
low32 with zero high word, and the ordinary role UI caller likewise passes
only low32. All supported Guild member/ban IDs now refuse values above uint32,
preventing aliases instead of truncating persisted account identities.
Explicit scalar histories use numeric exact IDs within this supported domain.

Focused state tests cover source-backed hierarchy, supervisor-cap refusal,
newcomer coherence, other-Guild/foreign/leader/self targets, idle gates, both
rollback paths, complete history/rejoin refusal/replay/restart, leadership
transfer retry after lost authority, former-leader departure and every
unrelated gameplay field. Wide-member publication, row-shaped ban entries and
foreign history imports refuse without overwriting saved evidence.

Compiled encrypted --fixture --profile current-e6-guild
--exercise-guild-management proves joining/approval, supervisor appointment,
subordinate ban/history replacement, successor transfer, no-write retries,
former-leader departure and exact records through process restart. Fixture
roles/settings/identities are authored; none are recovered player instances.
Only normal registration/lobby AP/BP clock anchors are excluded from the
gameplay equality check; all other four fixture games remain unchanged.

Full original Guild/GvG functionality is not claimed. Original supervisor cap,
former-leader default, newcomer lifecycle, ban duration/expiry/unban, invitation
and event delivery policies remain unknown or incomplete.
