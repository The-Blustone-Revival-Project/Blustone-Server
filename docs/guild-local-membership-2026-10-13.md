# Explicit local Guild joining, applications and approval lifecycle

The Server now implements wallet-neutral local membership transactions behind
`guildMembershipMode` / `BLUSTONE_GUILD_MEMBERSHIP_MODE=local-public-approval`.
Default is disabled. Enabling requires selected/hash-pinned original GUILD art
and an explicit `guildMembershipPolicy` or
`BLUSTONE_GUILD_MEMBERSHIP_POLICY_JSON` containing maxMembers, memberRole and
newbie. No production server defaults, invitation, cooldown or history rules
are claimed. No live server/profile/save/input/APK was changed.

Native wire and consumer evidence is in the Apply, cancel/leave,
applicant/approval and membership-limits notes. Capacity40 is supported by both
the native count display and approval UI projected-count gate; local configured
capacity must be1..40. Initial role3/newbie0, role4/newbie0 or role4/newbie1 are
supported explicit choices. Nonleader newbie1 forces native role4, so role3/
newbie1 policy and inconsistent imported supervisor/member rows are refused,
preventing server/native authorization disagreement. Imported rows are never
silently rewritten. Member initial contribution0 remains declared local policy.

## Separate durable pending state and coherent reads

Optional root `guildPending` rows hold pvid/guild_id/desc/fc_point/applied.
They validate known same-server actors, existing Guild targets, unique ownership,
uint32 applicant IDs and scalar values, lossless UTF8, no simultaneous joined
membership, and no unsupported history fields. Invalid imports fail without
overwriting the save. Existing saves without the optional root are unchanged.

Pending personal lobby returns status1 with its target Guild and local neutral
role/newbie/contribution0. Joined lobby remains status3 with actual member data.
Pending rows never appear in members, member_cnt or joined-user associations.
Authenticated GetApplicants derives the manager's Guild implicitly, requires
joined role1/2, and returns `{applicants:[{pvid,desc,fc_point,applied}]}`.
Other Guilds' applications and private account data are not exposed.

Local applied uses epoch seconds constrained to uint32; the original parser
consumes only a low32 value, and its original clock unit/expiry is unknown.
FC point at application is an explicit snapshot of the local Arena rating;
acceptance rechecks the current authoritative rating and active commitments.
Neither a client-submitted score nor an application snapshot grants eligibility.

## Supported transactions

- Apply accepts scalar decimal Guild ID and plain desc. Public1 joins
  immediately; permission2 creates a pending record; private3 invitation entry
  refuses. These type transitions are declared local policy. Target must be
  same-server and FC rating must meet its current threshold. An existing joined
  or pending affiliation to another target refuses. Exact same-target pending
  retry requires identical desc and returns current state without writing;
  already joined same-target retry likewise returns current authoritative state.
- ConfirmApplication takes JSON-array form STRING target_pvid plus granted0/1.
  Manager role1/2, target ownership, current eligibility and entire accepted
  batch capacity are checked before committing. Approval appends configured
  members and removes pending rows; rejection only removes those pending rows.
  Full current INFO and remaining applicants repair native caches. Repeated
  accepted IDs already joined this Guild are no-write success; repeated rejection
  of known unjoined/nonpending actors is neutral success. Contradictory outcomes,
  foreign/unknown IDs, other Guild applications and duplicate lists refuse.
- CancelApplication removes only the actor's pending record. Joined actors
  refuse even when no pending row exists: native success unconditionally clears
  personal Guild state. Truly unjoined/nonpending repeats are no-write success.
- Leave removes only an existing nonleader. Leaders refuse until succession/
  dissolution rules are reconstructed. Pending actors refuse and must Cancel;
  neutral absent-affiliation repeats are safe no-write success.

All mutations require an established idle actor game. Accepting pending actors
also requires their idle games. Membership has no fees/rewards in this declared
local mode; every success uses user:null, preserving generic native wallets.
Hunters, progression, Arena records, wallets, clocks, other Guilds, stored ranks,
contribution totals and GvG counters remain untouched. No invented exited/
rejected/banished/invitation histories are produced. All Guild/pending changes
persist together before success; write failure restores both original arrays.

Previously owned applications remain explicit records if Guild settings later
change its type. Local managers may approve/reject those existing applications
irrespective of current type; this grandfather policy does not enable new
private invitations. A pending actor cannot Found a Guild until it cancels.

## Validation and remaining work

Focused lifecycle tests cover public/pending ownership, manager authorization,
foreign/private/malformed requests, FC refusal, whole-batch capacity refusal,
native-clear-safe operations, exact retries, independent pending restart,
write rollback, imported history refusal and every unrelated game field.
The compiled encrypted verifier's distinct --fixture --profile current-e6-guild
--exercise-guild-membership run proves public join/departure, apply/cancel,
manager rejection/reapply/approval, no-write retries and exact final records
across process restart. Disposable authored IDs/settings are not original Guild
instances. Registration/lobby legitimately refresh AP/BP clock anchors; all
other gameplay stays exact. No APK install or live profile activation occurred.

Full native menus and these receipt/cache transitions still need visible client
validation after the input hold is lifted. Original initialization/expiry,
approval restrictions, rejoin clocks, bans, invites, notifications and leader
succession remain incomplete. Do not claim complete Guild/GvG functionality.
