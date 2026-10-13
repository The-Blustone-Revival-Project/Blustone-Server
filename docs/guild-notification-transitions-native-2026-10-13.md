# Guild notification read/delete request and full-cache receipts

Bounded original Thumb and RTTI/vtable evidence from immutable ARM SHA256
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
G coordinates subtract10000 for code ELF offsets; data metadata uses its actual
PT_LOAD mapping. DataDump was read only, with no device/input/APK changes.

RequestMsgRead Ga7e004 uses unsigned-list JSON builder Ga834cc at Ga7e16a,
serializes it through Ga71f754 at Ga7e18c and assigns singular notification_id
at Ga7e192/194. Route /guild/ReadNotifications resolves Ga7e2ea. It sends
auth5 plus a STRING containing a JSON array of uint64 message IDs.
RequestMsgRemove Ga7ec54 uses the same builder/dump pattern, serializes at
Ga7ee08, assigns notification_id Ga7ee0e/14 and resolves
/guild/DeleteNotifications at Ga7ef66. Neither selects an arbitrary recipient,
Guild, sender, desired ownership or wallet.

Read $_33 inner wrapper ELF1dfcef2 binds RTTI VA214f8d8/vtable214f8ac,
callable ELFa82945/Ga92944. Success1 selects ret_data Ga92978, optional
my_guild/guilds, then guild_notifications Ga92b3e/40 -> ParseNoties Ga6bf08
at Ga92b4c. Callback receives manager+100 MSG list Ga92ba0. It forwards
ret_data to achievement ParseLobbyEnter Ga844918 at Ga92b90.

Delete $_34 inner wrapper ELF1dfd664 binds RTTI VA214f958/vtable214f92c,
callable ELFa831c9/Ga931c8. Success1 selects ret_data Ga931fe, optional
my_guild/guilds, then guild_notifications Ga933ce/d0 -> ParseNoties
at Ga933dc. Callback receives manager+100 MSG list Ga93432.
Neither bounded core callback calls generic wallet SyncUser or implements
captured-ID read/delete settlement in place of the authoritative collection.
Full current rows under the named child are therefore the supported cache
replacement receipt; do not send bare [] or a guessed scalar count.

Replica stores source-backed invitation MSG2 fields plus private recipient and
deleted flags. Message ID fits native MSG parser low32 domain. Imported rows
validate recipient/sender/Guild same-server scope, supported fields, exact IDs,
UTF8 and scalar limits. Read changes only read; Delete sets a tombstone and
excludes the row from publication. Tombstones preserve exact ownership and
allocator nonreuse for lost-response retries; they never revive a deleted row.
All requested IDs must be owned before any batch flag mutation. Unknown or
foreign IDs refuse the entire batch; writes persist atomically with rollback.
Empty/duplicate/noncanonical/unsupported ID lists are explicit local admission.

Read/Delete does not accept or revoke an invitation. Native special Mail
YES/NO decision first calls ConfirmInvitation and only after success removes
the mail through CSRMail.RequestRemove, which dispatches Guild notification
removal. Decision ownership remains a separate durable ledger; deleting the
letter merely changes inbox visibility in this declared local policy.

Full lifecycle state tests and compiled encrypted invitation proof cover
private acceptance, decision/cache separation, scoped reads/deletes, tombstone
retries and restart. Original IDs, expiry and other notification producer rules
remain unknown. Native rendered inbox behavior is not yet observed.
