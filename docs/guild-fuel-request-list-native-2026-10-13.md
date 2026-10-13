# Guild fuel request list: named rows, upsert cache and no amount recovery

Source evidence only. No fuel request/support, AP grant, contribution reward,
claim schedule or original amount was invented. No live client/save/input/APK
or DataDump changes. Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code plus10000; data VA maps to file minus1000.
This is the Guild help subsystem, separate from ordinary Shop fuel.

## Exact authenticated list response

`CSRGuild.RequestFuelList` **Ga7bcdc** sends the five authentication fields
only, route **`/guild/GetFuelRequests`** Ga7bf64/66. No Guild ID, requested
AP amount, page/filter, type or owner is serialized.

Exact inner `$_30` E0 wrapper name string ELF1dfb93d binds RTTI VA214f758,
vtable VA214f72c, callable ELFa80d91/**Ga90d90**. It checks result1
Ga90db8 before selecting ret_data Ga90dbe/c2. The selected named child is
**`fuel_requests`** Ga90dea/ee and Ga90ee0/ee2. It iterates numerically:
child selection Ga90f28/2a, index i Ga90f2e/30, then ParseFuel Ga90f38 and
UpdateFuel Ga90f42 for every row. Thus supported wire is
**`ret_data:{fuel_requests:[row,...]}`**, not a bare ret_data array or a
PVID-keyed wire map. `fuel_requests:[]` is the correct no-record child.

The callback does **not clear the manager's fuel map**. Empty arrays skip
upserts and the captured caller receives a copy of the currently cached map.
This differs from notification cache replacement. Returning[] must not be
advertised as clearing stale native requests, invalidating old requests or
proving a realtime deletion policy. Guild departure cache clearing is a
separate known lifecycle.

## FUEL_INFO row and map identity

`ParseFuel` **Ga6c4d0** constructs a fresh FUEL_INFO value from one row:

- `pvid`: first key resolves Ga6c4fc; integer branch LDRD Ga6c51a,
  stored full64 at Ga6c54a, struct+0/+4.
- `id`: request identity, full64 stored Ga6c59a, struct+8/+c.
- `expdate`: low32 stored Ga6c5e4, struct+24.
- `regdate`: low32 stored Ga6c62a, struct+20.
- `supports`: uint32 conversion Ga6c66e, stored Ga6c678, struct+14.
- `supported`: low byte, stored Ga6c6c2, struct+18.
- `type`: signed32 conversion Ga6c706, stored Ga6c70e, struct+1c.

Default construction includes type−1; that is not a recovered production
request type. No row `guild_id`, amount, donor list, AP field or reward is read.
Known owner membership, real request IDs/timestamps, type semantics and
actor-specific supported eligibility must precede an imported request model.
Do not turn parser defaults into supplied actual request records.

UpdateFuel Ga6dec4 passes the newly built record to AddFuel Ga6c734.
AddFuel keys the native map at manager+15c/+160 by **full64 row.pvid**:
LDRD Ga6c74e, unsigned two-word compares Ga6c75e..792, key store
Ga6c872. Existing keys update the record; absent keys insert. Request owner
PVID is not the request ID. The replica's supported Guild member domain may
remain uint32 as local admission, but the fuel cache itself does not truncate
the owner key. Do not infer wire map shape from this internal map.

## Support route and callback boundary

`RequestSupportFuel` **Ga7c898** sends auth5 plus scalar **request_id**
(Ga7c9f8/fa), route **`/guild/SupportFuel`** Ga7cb44/46. Its public argument
is uint32 despite the row's wider stored id. No requested AP amount, target
PVID or payment selector is submitted. Full producer meaning of zero/request
creation versus support, retry and recipient payout remain unclosed.

Inner `$_31` E0 string ELF1dfc095 binds RTTI VA214f7d8, vtable VA214f7ac,
callable ELFa81699/**Ga91698**. It checks result1 Ga916c0 and selects
ret_data. Optional my_guild parses Ga91754 and guilds Ga917da.
`fuel_requests` is still an **array**, but this callback takes **only index0**
Ga9188e/90, calls ParseFuel Ga91898 and UpdateFuel Ga918a2, then returns that
record to the caller. An absent/empty child gives a null pointer. Achievement
ParseLobbyEnter receives ret_data at Ga918b0. No direct SyncUser call appears
in this complete callback body; this is not proof of a complete AP receipt or
permission to omit an eventual recipient synchronization mechanism.

The bounded direct caller found at Gba4a26 is a Chat consumer, rather than
Shop fuel. Chat/render/realtime message semantics and permission/claim law are
separate producer work; no support transaction is enabled by knowing its DTO.

## Fuel settings are unavailable, not zero

GetMaxSupportCount Ga80154 reads manager+b0; GetSupportFuelCount Ga8015a
reads manager+b4. They are stored settings, not literal original amounts.
No original numeric values or complete initialization producer was recovered
in this bounded audit.

The exact RequestMyInfo callback Ga86408 resolves my_guild, guilds, user,
achievement and chat_option, not `fuel_max` or `support_qty`. ParseMyInfo
Ga685f0 resolves only guild_id/status/newbie/role/contribution in its bounded
body. Those proposed setting names are not positively bound here and must not
be fabricated on GetGuildInfo. Missing original settings stay missing.

## Safe current read seam and next substantive blocker

The local replica has no request producer or persisted owned fuel requests.
Authenticated GetFuelRequests can therefore publish **`{fuel_requests:[]}`**
as the truthful no-record response without changing any save, Guild, wallet,
clock, permission or gameplay. This is a named-child read correction, not a
full fuel revival or stale-cache clearing mechanism.

Nonempty publication should wait for an explicit owned request model with
same-Guild owner admission, provenance for request/type/time fields and
viewer-specific supported state. Request/support mutations additionally need
original stored amounts/max-count initialization, duplicate/retry semantics,
expiry/request creation and actual recipient AP/claim receipt. Parser-shaped
zero/default records or invented cooldowns are not substitutes.
