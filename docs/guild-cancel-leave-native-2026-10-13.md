# Guild cancellation and leaving: personal reset and cache-clear contracts

Evidence only. No Server mutation helper, save/process, game input or APK was
changed. DataDump remains read-only. The actual routes are
**/guild/CancelApplication** and **/guild/Leave**, not guessed Withdraw/Cancel
aliases. Original permission, application producer state, cooldown, history,
leader succession or dissolution policy remains unreconstructed.

Source: immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec` and
read-only DataDump `sources/native/symbols/native-evidence.tsv`. Bounded
original Thumb bytes and ELF RTTI/vtable links were inspected. Addresses
below are Ghidra; subtract0x10000 for ELF offsets.

## Requests are auth-only, actor affiliation is implicit

CSRGuild.RequestCancelApply Ga71184 takes only callback(int status).
Its form contains app_code, app_ver, market, pvid, otp and no action field.
The exact route resolves at Ga713de: /guild/CancelApplication.

CSRGuild.RequestLeave Ga7352c takes callback(int status,PLAY_DATA const&).
It likewise sends the same five auth fields only; route resolves at Ga73786:
/guild/Leave. Neither request carries Guild ID, target member, desired status,
role, price/payment, membership list or reason. A server must derive any
affected affiliation from its authenticated account state, never trust a
client-added target ID to remove another user or unrelated Guild.

These request functions do not gate role/member count or send an original
fee. That is not proof that original server authorization, leader disbanding,
penalty or cooldown rules were absent. No original backend producer/allocator
policy can be reconstructed merely from an auth-only form.

## Cancel success resets personal PLAY_DATA directly

RequestCancelApply `$_16` inner RTTI string ELF1df57bb links through
RTTI214f058 and vtable214f02c to callable ELF a78879 (Thumb), Ghidra
Ga88878. It reads result code and requires1 at Ga8889e; failures skip reset.
It selects ret_data Ga888a8 and then directly clears manager PLAY_DATA:

- Ga888b4 addresses CSRGuild+9c.
- Ga888bc writes sixteen zero bytes (guild_id/status/role/contribution).
- Ga888c2 writes zero to the newbie byte+ac.

It does **not** select or reparse my_guild, guilds or a returned application
status. The cancellation's success itself triggers the personal reset. Its
callback at Ga889e8 returns status only. It does not clear the full Guild INFO
cache, delete all other memberships or prove the original persisted pending
application record shape.

Optional ret_data.user is passed to generic CSRPlayData.SyncUser at Ga88946;
optional achievement follows independent branches. A wallet-neutral confirmed
local operation should omit user or use user:null. SyncUser's tag0/null early
return at Gb704ae..b2→Gb70d0a preserves wallets. A non-null object requires
authoritative paid/free quantity scalars and appropriate previous/current
pairs; empty user:{} would wrongly reset native paid/free quantities to zero.

## Leave success clears personal data and native caches

RequestLeave `$_19` inner RTTI string ELF1df6c73 links through RTTI214f1d8 /
vtable214f1ac to callable ELF a7a289, Ghidra Ga8a288. Result1 is required
at Ga8a2ae before any settlement. ret_data is selected at Ga8a2b8.
Ga8a2c4/ca/d6 zero the same personal PLAY_DATA words/newbie byte; Ga8a2d2
also resets two auxiliary manager words+b8/+bc.

The callback then clears native manager state rather than publishing a new
Guild/member layout from the response:

- INFO cache entries are destructed at Ga8a2dc..314, hash table+118 is
  cleared and its size+124 becomes0. This is the client cache of queried
  Guild INFO, not an instruction to destroy all server Guild records.
- Auxiliary lists+100 and+e8 are cleared at Ga8a318..3c4. Their exact entire
  producer meanings are not assigned by this note.
- FUEL_INFO map+15c is destroyed through Ga857aa at Ga8a3ce and reset.
- Auxiliary message-string list+f4 is cleared at Ga8a3e2..41c.
- SRTARGET_USER detail map+150 is destroyed through Ga844a0 at Ga8a424
  and reset at Ga8a428..430.
- CSRChat.ClearGuildChatLog G8a8cf8 is invoked at Ga8a438.

There is no my_guild/guilds receipt parse after those clears. At Ga8a580
the callback's second argument is the resulting personal PLAY_DATA at+9c,
which is zero following success. Optional user invokes generic SyncUser at
Ga8a4d6; same wallet-null/scalar precautions apply as cancellation.
Achievements are optional separate consumers, not proof of a reward/penalty.

A minimally wallet-neutral compatible success can use ret_data:{} or
ret_data:{user:null}. Source acceptance of that shape does not justify
acknowledging an unsupported server operation: success would clear the
client's affiliation/cache even if the server had failed to persist removal.
Backend admission and atomic persistence must precede any success reply.

## Visible callers and permission limits

Cancel's direct callers include management CreateRegistCancelPopup (request
at Gfd239c) and mail/invitation popup paths (Gc9450a/Gc9512a/Gd199e4/Gd20ecc).
Their request target still comes from personal authenticated context. This
note does not infer one pending-state enum from every caller; the independent
Apply/status lane owns producer/approval-state reconstruction.

A comprehensive direct Thumb-BL scan of the bounded native code corpus found
one RequestLeave caller, **Gfc250a**, in nested CSRTabGuildInfo.OnButtonClick
`$_6` callback code. Nearby outer `$_6` flow invokes RequestDonate Ga75808
at Gfc1d90. Its response handler compares status10232 at Gfc1f04 and handles
confirmation/error UI in nested callbacks. The Leave call in this context
is a stale-affiliation/donation-error cleanup lead, **not proof of a normal
visible Leave button, last-leader admission or leader-dissolution policy**.
The exact semantic interpretation of that error/confirmation chain remains
an inference; no invented meaning is assigned to status10232.

The direct-call scan does not exclude every indirect function-pointer caller.
No native role/member-count gate was recovered inside RequestLeave or its
response callback. This must not be generalized into server permission to
remove a last leader, dissolve a Guild, choose a successor or grant history.
Current established-record validation requires one known leader; a future
conservative local mode can refuse departures that would leave an orphaned
record, but that restriction would be explicit local policy until original
producer rules are closed.

## Implementation boundary

Pending applications are not established joined records. Cancellation needs
an independently modeled, owned pending state; joined-member Leave needs an
owned current affiliation and supported remaining record. A local transaction
must preserve unrelated Guilds, role assignments, wallets, Hunters, progress,
ranking and rewards and persist before triggering the native clear. No current
field grammar authorizes guessed exited/banished history entries, refunds,
cooldowns or last-leader deletion. Replay success policy also needs explicit
design because the native success branch repeats a cache clear.

This unit performs source/consumer recovery only. No mutation is enabled and
no native UI behavior, original server permissions or numerical fee is claimed.
