# Guild Apply: exact payload, pending status and joined response

The original client supports a single Apply operation that receives authoritative
personal Guild state from the server. Pending application status1 and joined
status3 are now positively identified in the Guild popup. The client does not
manufacture the type→status transition or a new member's role/newbie defaults.
This pass writes evidence only; no route, pending store, membership, live state
or APK is changed.

## Source and request

Immutable final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses subtract0x10000 for ELF. Read-only symbols:
DataDump sources/native/symbols/native-evidence.tsv. Request, callback, popup
branches and RTTI/vtables were inspected from bounded original Thumb bytes.

CSRGuild.RequestApply Ga704f8 takes one uint64 Guild ID, one string and a
callback `(status, PLAY_DATA const&)`. It constructs auth5 plus:

- `guild_id`, literal Ga7065e/Ga70662, a scalar decimal uint64 string.
- **`desc`**, literal Ga7066c/Ga70678, an ordinary string.

The route literal at Ga707ec/Ga707ee resolves `/guild/Apply`. This is not a
guild_id JSON-array form, guild_id_list, target_pvid list or public INFO object.
The requester sends no desired status, member role, newbie flag, invitation
token, payment choice or reward. Auth determines the applying account.

The ordinary popup OnRequestApplyGuild Gc93eac obtains the selected INFO's ID
at Gc93f8a and constructs an EMPTY desc string at Gc93f8e–9a. It calls
RequestApply at Gc93ffe with zero high Guild-ID word. This agrees with the
existing uint32 INFO ID boundary. A general nonempty desc is permitted by the
request API signature, but no original text-entry/default policy is recovered
for that application description; do not silently reuse Guild profile desc.

## Exact Apply callback updates

RequestApply `$_15` TASK_READY E0 RTTI name is ELF1df50ed. Its RTTI object
VA214efd8/vtable VA214efac bind the callable ELFa77fb1 / Ghidra Ga87fb0.
Writable metadata uses its actual PT_LOAD mapping, not the code offset rule.

The callback reads GetResultCode and requires1 at Ga87fda, then selects
ret_data at Ga87fe0–e6. Its success branches are independent:

- selected `my_guild` at Ga88054–5a → ParseMyInfo Ga685f0 at Ga88062.
- selected `guilds` at Ga880d4–dc → ParseGuilds Ga6b340 at Ga880e6.
- selected `user` at Ga88196–a2 → generic SyncUser Gb7047c at Ga881aa.
- optional `achievement` through existing achievement consumers.

The callback eventually supplies status and the current manager PLAY_DATA
at manager+9c at Ga88244–52. Failed status skips success updates; it does not
automatically convert an unsuccessful request into an empty affiliation.
Missing my_guild likewise retains the old personal cache.

An acknowledgement must therefore return the authoritative personal subtree
when an affiliation/application changes:

```text
{result_code:1,ret_data:{
  my_guild:{guild_id,status,newbie,role,contribution},
  guilds:[full affected established INFO rows]
}}
```

guilds is optional for this callback but useful when an immediate join changes
the joined member list. It must never list pending applicants as joined members.
The querying/applying account's my_guild is separate from public Guild INFO.
No wallet change is proved by Apply. Omitting user or supplying user:null
avoids generic SyncUser entirely. If a nonnull user subtree is supplied, its
mandatory iap_qty/free_iap_qty must be authoritative even when no fee exists;
see the wallet audit. No original Apply fee or reward is inferred here.

## Pending status1 and joined status3 are concrete

Popup SetData Gc91fcc checks the enabled join-view flag, obtains personal
PLAY_DATA at Gc92914–18, reads status+4 at Gc9291c and compares it to1 at
Gc9291e. If the personal Guild ID matches the displayed Guild at
Gc92924–2c, it selects BT_APPLIED at Gc92930/Gc92932 and changes the Apply
button presentation. The OnButtonClick BT_APPLIED path contains the original
cancel-application confirmation text. Thus status1 is a pending application
to that exact Guild, not an already joined member.

The Apply UI callback `OnRequestApplyGuild $_5` vtable VA215fb00, RTTI215fb2c,
callable ELFc85769 / Ghidra Gc95768 requires successful status at Gc9579a.
It reads returned PLAY_DATA.status at Gc957a0 and compares3 at Gc957a2.
Status3 switches to the member scene (Gc957b2 and following scene events).
Other successful status refreshes the popup using its captured target INFO
at Gc95816–1a; pending1 then renders BT_APPLIED through the SetData branch.

Join-type labels are independently known:1 public,2 permission,3 private.
However no inspected client branch writes status3 solely because type==1 or
status1 solely because type==2. The server supplies those values. A local
public→joined / permission→pending implementation is plausible explicit
policy, not a recovered original server transition. Private/invitation and
status2 meanings remain unclosed. Do not rename status2 from intuition.

## Admission checks before the Apply confirmation

OnButtonClick first refreshes personal state through RequestMyInfo. Its
`$_3` callback, callable Gc949c4, requires request success. At Gc94a06–0a,
personal status3 follows an already-member error/member-scene path and does
not proceed to a fresh Apply. This is stronger than checking only the target
Guild: another joined affiliation blocks this popup flow.

For nonjoined personal state, Gc94aa8 loads the selected Guild threshold
from popup+a4. Gc94aac calls CSRFCPlayData.get G942608; Gc94ab0 reads its
score at+134. Gc94ab4 compares score to threshold, and Gc94ab6 continues
only when score>=threshold. Otherwise the original insufficient-victory-point
message is selected at Gc94abe/Gc94ac0. This is the Apply FC-threshold check;
it must not be promoted into a founder-minimum FC rule.

The confirmation chooses a different reapplication description when personal
status1 is associated with a DIFFERENT Guild (Gc94b5c–Gc94b7c). A same-target
pending Apply is identified separately by OnButtonClick Gc9345c–6a and the
BT_APPLIED presentation. This provides evidence of a pending-conflict/cancel
workflow, but not permission to silently replace another pending application
or ignore its history. The neighboring CancelApplication lifecycle is being
documented independently; it targets the actor's current pending state.

Original same-server scope, member cap, rejoin cooldown, bans/invites, blacklist
and account-level requirements remain server-policy gates. The inspected
ordinary Apply request sends no admission setting or current FC-point amount;
server implementation must derive any supported local eligibility from the
authenticated account, not a submitted score/status.

## Implementable boundary and remaining blockers

An exact codec plus authoritative pending/joined personal receipt is now
implementable. A durable pending store must be distinct from joined Guild
members and preserve target/actor/application information across restart.
Pending cancellation cannot leave my_guild falsely joined. Concurrent duplicate
applications, another joined affiliation and unknown targets must refuse or
follow a separately declared atomic local transition; do not double-add members.

Original initial joined role/newbie/contribution and approval decisions were
not initialized anywhere in these inspected callers. Role1/2/3/4 display
semantics do not prove a newly joined member defaults to3 or4; newbie boolean
is also server-supplied. Pending role/newbie zeros could be explicit local
policy derived from no prior joined state, not asserted original values.
Full approval support still needs GetApplicants/ConfirmApplication producers
and cache consumers plus declared local initialization rules if originals
remain missing. No membership transaction is enabled by this evidence note.

## Independent adjacent read correction

Root's GetNotifications fix was independently checked in the original bytes:
RequestMsgList actual callback Ga91fdc selects ret_data, optional my_guild and
guilds, then **guild_notifications** at Ga921d6 and ParseNoties Ga6bf08 at
Ga921e4. `{ret_data:{guild_notifications:[]}}` is the native empty-cache shape;
a bare ret_data array skips that named child. This note makes no duplicate
implementation or claim of recovered original notification histories.
