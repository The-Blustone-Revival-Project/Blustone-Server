# Guild invitation visibility: original MSG2 to native Mail conversion

Source recovery only. This lane adds no notification producer, allocator,
invitation/mail record or route implementation. No live save/server, input or
APK changes occurred; DataDump stays read-only. Original record IDs, event
lifetimes and opaque supplement content remain separate producer data.

Immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses are Ghidra; subtract0x10000 for ELF. Bounded original Thumb bytes
and the pinned original UI_TEXT_RO export were inspected. Symbol locator:
DataDump `sources/native/symbols/native-evidence.tsv`. Existing notification
request/MSG parser evidence is in `guild-notifications-native-2026-10-13.md`;
root owns the separate Read/Delete consumer recovery.

## Invitation notification kind is2, not an invented event enum

CSRMail.MailMessageTypeToText Gb4b688 takes CSRGuild.MSG.NOTI_TYPE. It
subtracts2 and dispatches a ten-case table at Gb4b694. The byte table resolves
these concrete recognized values and original localized-key branches:

- **2 → invitation**, branch Gb4b6a2, lookup key
  `[우편]%s님이_%s길드_초대` at Gb4b6aa.
- 3 → joined-Guild notice, branch Gb4b6ae/key Gb4b6b6.
- 4 → rejected application, branch Gb4b6ba/key Gb4b6c2.
- 5 → banished from Guild, branch Gb4b6c6/key Gb4b6ce.
- 6/7 → native `Not Found Message` fallback.
- 8 → role-change notice, branch Gb4b6de/key Gb4b6e6.
- 9 → leader-change notice, branch Gb4b6ea/key Gb4b6f2.
- 10/11 → dissolution warning/notice branches Gb4b6f6/Gb4b702.

The pinned original UI_TEXT_RO retains the exact invitation key in all five
locales. English is `%s has invited you to\\n%s guild.` The two placeholders
are filled from real sender nickname and Guild name through the consumer below.
This is original event-type/display evidence. It does not invent production
MSG IDs, timing, notification policy or the other event producers.

## Guild MSG is converted to local Mail DATA; no ordinary mail grant needed

CSRMail.DATA constructor from CSRGuild.MSG is **Gb4b394**. It sets internal
Mail type **0x47 (71)** at Gb4b3ae/Gb4b3e0. It converts the MSG.id uint64
to decimal text and prefixes character `G` (also0x47) at Gb4b3e6..402,
yielding a distinct local hash identity for the Guild Mail entry.

It then copies the existing MSG values directly:

```text
MSG.id+10 → DATA+20
MSG.sender+8 → DATA+28
MSG.guild_id+18 → DATA+30
MSG.message+0 → DATA+50 (the notification kind)
MSG.supplement+1c string → DATA+44 string
MSG.read+28 → DATA.read+4 boolean
MSG.regdate+2c → DATA+34
```

Read is normalized to a boolean at Gb4b474..47c. Supplement is an unchanged
opaque string copy at Gb4b456..470; this constructor does not parse a JSON
schema or inject popup keys into it. Sender and notification id preserve
both64-bit halves in the MSG parser's integer branch; current local account/
notification identity admission can use a strict uint32 subset without aliases.

Therefore an invitation delivered through the actual
`ret_data.guild_notifications` collection is converted into the native Guild
Mail list. It does not need a fabricated ordinary `/mail/GetList` item or a
Hunter/currency reward. **Server MSG.message must be2; internal Mail type71
must not be confused with the wire notification enum.**

## Sender/Guild resolution and display formatting

CSRCellMailGuild.Init G89bf20 takes that Mail DATA and requests real Guild
INFO asynchronously through CSRGuild.FindAsync Ga68980 at G89c726. Its
callback accesses the supplied Guild name at INFO+24 and displays it in the
Guild Mail entry. Captured message kind is checked against2 at G89d32e..336.

For invitation2 the callback obtains CSRUserPool at G89d33a and looks up
the sender. At G89db8c it obtains the original message format; G89db94..baa
extracts the sender nickname string, and G89dbac..bc extracts the captured
Guild name. **CMFormat G78cac4** is called at G89dbc2 with both values.
Other recognized one-placeholder message kinds use the Guild-name format
path at G89d510/G89d532. Invitation formatting therefore depends on real
sender profile and Guild INFO, not an invented two-field supplement JSON.

The quick sender-profile chain is supported by existing Server reads:
CSRUserPool.RequestUserInfo G10a2b0c calls CPVRelation.RequestUserInfo
G8220c4 at G10a2bf4. This reaches `/relation/GetTargetUserInfo` using its
JSON-array `list` form. Current Server supplies nick_name and profile_url for
real same-server mutually nonblocked account peers. One known unblocked local
manager sender needs no new profile endpoint or synthetic party/card.

Visibility boundaries remain explicit: blocked sender/recipient peers refuse
that profile read, so producing an invitation must not bypass those controls
to expose a blocked profile. The historical Mail/Arena three-profile guard
was subsequently disproven: UserPool.FlushQueueUser sends min(queue.size,5),
while the general request/callback codec serializes and parses its complete
vector. See `userpool-brief-batches-native-2026-10-13.md`. Per-identity privacy
and the exact presentation-fixture corpus remain guarded; inboxes need not be
limited to fit the obsolete three-profile condition.

## Popup keys are internal Mail markers, not supplement requirements

CSRTableMail.OnTableViewButtonClick G10303e0 constructs a marker for opening
the read popup. Exact keys include target_pvid G103056a, guild_id G10305b0,
Nickname G1030614, RecvMsg G1030672, RecvTime G10306ac, ReadIndex G1030714,
**Noti_type G1030750** and Prsent_info G1030788. It stores this object under
**CSRMailScene_Read** at G10307c4. Noti_type comes from the Mail DATA's
notification-kind field, which in turn was copied from MSG.message.

CSRPopUpMailReadGuild.OnInit Gd16d74 retrieves this CSRPlayData marker at
Gd16e4e..62, then reads its target_pvid/guild_id/Noti_type at
Gd16ea6/Gd16ef4/Gd16f46. Those fields are NOT keys that the server must
invent inside MSG.supplement. The preserved opaque supplement string has no
original decoded content schema established by this bounded pass.

The popup's **PA_CONFIRM** group is enabled exactly when Noti_type==2:
Gd16fbe subtracts2, Gd16fc0..c4 tests equality and Gd16fc6 applies visibility.
**PA_OK** instead appears for non-invitation kinds at Gd1701c..22. The
OnButtonClick literals **BT_NO** and **BT_YES** resolve at Gd17490/Gd174d2;
their personal status3 checks are already-joined admission, not a different
notification enum. Core invitation acceptance/decline request behavior belongs
to the independent Invite/ConfirmInvitation lane.

## Producer and scope limits

A future explicitly local notification producer can use the source-proven
invitation message2 and real recipient-owned invitation ledger. Any generated
ID allocator, local epoch clock, read/deletion tombstone policy and opaque empty
supplement must be labeled authored local policy, not recovered original MSG
instance data. Do not publish invented original IDs or another event type
merely to fill a mailbox.

The recipient's GetNotifications response must contain only authorized owned
records under the actual named child. Sender/Guild references must already be
known and compatible, and notification/active-invitation ownership must be
coherent through retry/delete/confirmation. No inferred status2 affiliation,
joined membership, reward or fee follows from rendering an invitation message.
Native read/delete and confirmation transitions must be reconstructed separately
before claiming the full mailbox workflow.

An empty opaque supplement may be a deliberately declared local producer
choice; the source above proves its string type and raw copying, not an
original empty value or a complete arbitrary supplement interpretation.
The following fresh closure proves the invitation read BODY does not depend
on that empty supplement. Native invitation pixels and original producer
visibility/lifetime remain unverified while live inputs are held.

## Read-popup body is rebuilt from the original template and real names

The marker builder does copy raw supplement into RecvMsg:
CSRTableMail._DATA constructor G102f17e/182 maps Mail DATA+44 into _DATA+4c;
OnTableViewButtonClick G1030640/64 copies that string and assigns RecvMsg at
G1030672. This does not mean every popup consumes that generic marker field.

The actual Guild read-popup OnInit `$_0` callback is bound to vtable
VA21648f8, callable ELF d07cad/Ghidra **Gd17cac**. It loads the Guild INFO,
reads Noti_type at Gd18018 and selects invitation2 at Gd18098. That branch
requests the sender through UserPool at Gd1810a. No RecvMsg lookup occurs
in this bounded OnInit/Guild-load callback.

The nested invitation2 sender callback is bound to vtable VA2164970,
RTTI216499c, callable ELF d088c9/Ghidra **Gd188c8**. It obtains the original
MailMessageTypeToText format at Gd188f2. Sender nickname comes from
SRTARGET_USER+28 at Gd188fc/Gd1890e; captured Guild INFO.name comes from
closure+34 at Gd18910/1a. **CMFormat at Gd18920** formats the two real names.
It resolves MAIL_EMPTY/MAIL_INFORMATION at Gd189f6/Gd18a0c and passes the
formatted body into **CSRUITextbox.SetText at Gd18a24**, with the information
group made visible at Gd1897c. Non-invitation recognized kinds use the separate
one-Guild-name format branch at Gd1812a/Gd1814c.

Therefore raw RecvMsg/MSG.supplement is NOT the invitation read body's text
source. A deliberately empty opaque supplement need not produce a blank
invitation letter: the native consumer rebuilds the body from the original
localized invitation template, real Guild name and real sender nickname.
Both reference lookups must still succeed. Missing/blocked sender or missing
Guild metadata is not solved by inventing supplement JSON or server-authored
localized body text. Source closure is not a native rendered-pixel claim.
