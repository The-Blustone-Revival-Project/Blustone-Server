# Guild invitation requests, authoritative receipts and the mailbox confirmation path

Evidence only: no state, routes, live client/save, APK or DataDump changes. The
original ARM library is DataDump `local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`,
SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code offsets plus `10000`; writable data virtual addresses
map to file offsets minus `1000`. Bounded Thumb bytes and original RTTI/vtable
bindings establish the contracts below. Do not infer backend producer policy
from client enums or a successful-looking fixture.

## Request and callback contracts

`CSRGuild.RequestInvite` Ga79804 serializes auth5 plus scalar `target_pvid`
(key Ga7996e), route `/guild/Invite` Ga79ac0. Its public parameter is uint64;
this is a decimal scalar, not an array. `IsInvitable` Ga67eb8 requires actor
nonzero Guild ID, personal status3 and role1 or2. This is a manager predicate,
not proof of backend target eligibility, invitation lifetime or recipient state.

`RequestConfirmInvite` Ga71cf8 serializes auth5 plus scalar `guild_id` (key
Ga71e64), scalar `agreed` (Ga71e7a) and `/guild/ConfirmInvitation` (Ga72000).
Ga71e9a..a4 writes string `1` only for incoming byte exactly1, otherwise `0`.
No inviter, recipient PVID, message ID, role, newbie or payment is submitted.

Exact Invite inner `$_27` E0 wrapper string ELF1dfa3c5 binds RTTI VA214f5d8,
vtable VA214f5ac, callable ELFa7f2cd/ Ga8f2cc. Confirm inner `$_17` E0 string
ELF1df5e6f binds RTTI VA214f0d8, vtable VA214f0ac, callable ELFa79025/Ga89024.
Both callbacks gate their parse branches on successful result1 and select
`ret_data`. Both accept optional named `my_guild`, `guilds`, `user` and
achievement data. The exact sites are:

- Invite ret_data Ga8f2fc/300; my_guild Ga8f370/374 -> ParseMyInfo Ga8f37e;
  guilds Ga8f3ec/3f0 -> ParseGuilds Ga8f400; user Ga8f4aa/4b0 -> SyncUser
  Ga8f4be; achievement Ga8f534/53a.
- Confirm ret_data Ga89054/058; my_guild Ga890c8/0cc -> ParseMyInfo Ga890d6;
  guilds Ga89144/148 -> ParseGuilds Ga89158; user Ga89202/208 -> SyncUser
  Ga89216; achievement Ga8928c/292.

There is no unconditional joined-state patch, no agreed-dependent personal
clear and no submitted-ID fallback in these core callbacks. Actual personal
and INFO state must come from authoritative snapshots. A wallet-neutral local
operation can use `user:null`; a nonnull generic SyncUser receipt requires
coherent mandatory `iap_qty`/`free_iap_qty` scalars, as documented in
`guild-update-wallet-native-2026-10-13.md`.

## INFO invited_guests is a collection of objects

`ParseGuild` Ga6a384 checks `invited_guests` Ga6afda/afde. Absent/null branches
past replacement at Ga6afe4..afe8. Nonnull first clears the complete previous
list (Ga6afec..Ga6b01a) then selects the collection Ga6b01c/020 and iterates.
Each entry must be an object: row dereference Ga6b0b6/b8 and `row.pvid` lookup
Ga6b0bc/be. Thus wire shape is **`invited_guests:[{pvid:123},...]`**, unlike
the scalar `banished` history. `[]` authoritatively clears; omission preserves.

Integer PVID branch LDRD Ga6b0d8 preserves both words. String-number conversion
uses strtod Ga6b0ec and uint64 conversion Ga6b0fa, not safe exact identity
above the double integer range. The resulting internal list stores scalar
uint64 IDs (Ga6b102..10a), not the original row objects. Extra source fields
have not been recovered; do not discard unknown imported fields to make an
unsupported history look admissible. The replica's established known-account
uint32 domain avoids client member/mail identity narrowing.

`CheckUserStatus` Ga67ede looks in the actor's current cached Guild. The
invited-list match returns classifier2 at Ga68070..Ga68092. This is a
**relationship result for a target PVID**, not a personal `my_guild.status`
assignment. No positive producer/consumer proof binds personal status2 to
invitation pending state in this audit. Personal status1 is already established
as application pending and status3 as joined; keep those enums separate.

## Invitations are Guild notification kind2 presented through Mail

`CSRMail.DATA(const CSRGuild.MSG&)` Gb4b394 creates a Guild mail record tagged
`0x47` (`G`, Gb4b3ae/3e0). It copies MSG.id to mail+20 (Gb4b43e/442), sender
to+28 (Gb4b446/44a), guild_id to+30 (Gb4b44e/450), message kind to+50
(Gb4b452/454), supplement raw string to+44 (Gb4b456..470), read to+4
(Gb4b474..47c), regdate to+34 (Gb4b47e/480). Notification rows are distinct
from ordinary account message rows. See `guild-notifications-native-2026-10-13.md`
for the named `ret_data.guild_notifications` collection and MSG parser fields.

`CSRMail.MailMessageTypeToText` Gb4b688 subtracts2 and branches through its
jump table. Kind2 goes to Gb4b6a2 and resolves the original invitation text
key at Gb4b6a6/6aa. Independently, `CSRPopUpMailReadGuild.OnInit` Gd16d74
loads the `CSRMailScene_Read` marker through GetMarker Gb72798 at Gd16e5a.
It reads case-sensitive `target_pvid` (Gd16ea2/ea6), `guild_id`
(Gd16eec/ef4) and **`Noti_type`** (Gd16f3e/f46). `PA_CONFIRM` is visible
iff Noti_type==2 (Gd16fbe..fc6); `PA_OK` iff it differs (Gd1701c..022).
The popup consumes Guild ID as uint32 and passes highword0 to confirmation;
target_pvid is read as uint64. Invitations do not need an inferred personal
status2 to expose YES/NO.

`CSRTableMail.OnTableViewButtonClick` G10303e0 builds this marker from its
mail row: sender becomes `target_pvid` (G103055e..0592), guild ID becomes
`guild_id` (G10305a6..05d0), supplement becomes string `RecvMsg`
(G103063e..0698), then `RecvTime`, `ReadIndex`, `Noti_type` and misspelled
`Prsent_info` (keys G10306a8, G103070a, G1030748, G1030780). It commits
`CSRMailScene_Read` via SetMarker Gb67bbc at G10307d4. Guild type2 row
dispatch fetches Guild info at G1030828..083e before the read popup.
`RecvMsg` is the supplement string, **not automatically an arbitrary text
body or an already decoded JSON object**. Exact kind2 rendering fields,
sender-name construction and complete supplement producer schema remain
unclosed; do not synthesize an empty supplement and claim native UI parity.

## Recipient controls and result behavior

`CSRPopUpMailReadGuild.OnButtonClick` Gd173a8 implements:

- NO: personal status3 check Gd174aa/ac refuses already joined; otherwise
  popup Guild ID lowword and highword0, agreed0, RequestConfirmInvite Gd1758a.
- YES: status3 check Gd174ec/ee also refuses. Status1 check Gd175a4/a6 calls
  `CreateRegistCancelPopup` Gd1769c at Gd175ac, rather than directly joining.
  Other personal states directly submit agreed1 at Gd175ec, highword0.
- There is no FC threshold comparison in this bounded mailbox button consumer.
  That does not establish a backend exemption from FC/capacity/type/history
  admission. Ordinary Apply's FC gate is separate source evidence.

The NO local callback binds vtable VA21649b8, callable ELFd08da9/Gd18da8;
YES binds VA21649f8, callable ELFd08ff9/Gd18ff8. NO compares result1 at
Gd18dc0 and on success calls OnRemoveMail Gd17834 at Gd18dd8. YES compares
result1 at Gd19024, shows the join-success localized message and calls
OnRemoveMail at Gd19052; failure follows its failure message path and does
not remove the invitation. These UI callbacks do not independently verify
the resulting personal membership. **Returning result1 for an absent,
revoked or ineligible acceptance can falsely tell the native user they joined.**

OnRemoveMail builds the current message's CMHashID/string plus uint64
ReadIndex (Gd1793e..94c) and dispatches `CSRMail.RequestRemove` Gb4bc80 at
Gd17998. Notification deletion is a separate subsequent request, not a core
ConfirmInvitation callback mutation. A truthful implementation needs durable
invitation state and a coherent read/delete path; retries after accepted
membership must repair the full snapshots without granting membership twice.

## Implementation boundary

Source admits scalar Invite/Confirm requests, manager UI predicate, object
invited-ID history, authoritative optional receipts, invitation notification
kind2 and joined/pending recipient controls. It does not recover production
expiration, duplicate-invite behavior, fees, receiver FC/capacity/type rules,
ban exceptions, recipient personalstatus2 producer, initial member/newbie
defaults, notification ID/time units, or the complete supplement producer.
Any local policy must be explicitly enabled and labelled; unknown existing
history must not be replaced with invented empty genesis. Distinct invitation
ownership, application pending state and joined membership are required.

Do not publish a successful stub Invite that changes no recipient-visible
state, or ConfirmInvitation result1 that only parses a request. Native UI
validation is pending while live input remains held.
