# Guild user association read: actual GetUserGuilds consumer

The native method RequestUserInfo is an association query, not a Hunter or
account profile-detail response. `guild-user-query.ts` parses its exact
singleton-array form and projects only compact metadata from already established
same-server Guild records. No joined history, invitations, role transition,
Hunter stat, reward or private account data is invented. No live process/save,
device input, APK or DataDump content was changed.

Immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
All coordinates below are Ghidra; subtract0x10000 for ELF offsets. Read-only
symbol source is DataDump `sources/native/symbols/native-evidence.tsv`.
Request, parser and callback were read from bounded original Thumb bytes;
ELF RTTI/vtable links independently bind the callback to this method.

## Request targets one user's Guild association

CSRGuild.RequestUserInfo Ga6ec10 takes one uint64 plus callback
`(int status, USER const&)`. It captures its target halves in sl/r8 at
Ga6ec1c/Ga6ec20. It creates a singleton list, then invokes the same unsigned
list-to-JSON constructor Ga6ed9c→Ga834cc used by Guild detail queries.
The constructor emits JSON integer tag6 with both uint64 halves; it does not
encode a floating string converted via strtod.

The JSON array is dumped at Ga6edbe into a FORM STRING under
**target_pvid_list** (literal resolution Ga6edc4). Route is
**/guild/GetUserGuilds** at Ga6ef66. Actual native shape is
`target_pvid_list=[123]`, a JSON-array string containing exactly one ID.
There is no target_pvid scalar or Guild-ID target field on this path.

The parser retains integer token text before JavaScript rounding. It requires
one positive exact uint64 target, rejecting empty/arbitrary batches because
the native RequestUserInfo interface requests one user and its callback
consumes only the first returned USER. Canonical quoted decimal IDs are also
accepted as explicit replica policy. Authentication and same-server/blocked
visibility remain caller policy; knowing a pvid alone creates no affiliation.

## Exact response wrapper and callback

RequestUserInfo `$_13` outer RTTI string ELF1df3f66 links through RTTI214ee98
and vtable214ee6c to callable ELF a76a55 (Thumb), Ghidra Ga86a54. Inner
RTTI string ELF1df42cf links through RTTI214eed8 and vtable214eeac to callable
ELF a76d81, Ghidra Ga86d80. Thus the parsed receipt belongs to this actual
request rather than another neighboring Guild operation.

Ga86db4 tests status1. Ga86ddc selects ret_data; Ga86e0e/56 selects
**user_guilds**; Ga86e62 invokes ParseUserGuild Ga6ba78. If rows are present,
Ga86e6c..ee8 copies only the FIRST parsed USER into the callback argument.
Ga86f12 invokes the callback with status and that USER. Empty/missing rows
leave its default zero USER. The server read wrapper is therefore:

```text
{result_code:1,ret_data:{user_guilds:[compact existing association row]}}
```

A direct ret_data array or ret_data.guilds (the Guild-detail wrapper) would
not satisfy this consumer. No user wallet, achievement, joined flag or
personal my_guild update is required by this read. Native popup SetGuildCB
Gd96120 copies the supplied USER; that is display data, not a membership
grant/acceptance operation. Unknown/unjoined/cross-server queries return[]
under conservative local policy; no zero-affiliation metadata row or cache
clear/unjoin operation is invented from the callback's default behavior.

## Compact USER fields and supported projection

ParseUserGuild Ga6ba78 iterates the selected collection and builds fresh USER
rows. It reads exactly:

```text
pvid uint64; id uint32; name string; type uint32
fc_point_limit uint32; contribution uint32
region string; emblem_id string
```

pvid integer branch at Ga6bb82 loads both words, stored Ga6bba8. Its string
branch uses strtod and is unsafe for arbitrary large IDs; current Server's
account namespace uses exact safe numeric pvids. Guild id at Ga6bbc6 reads
only the low32word, string/float conversion Ga6bbee uses uint32 and
Ga6bbf8 stores zero highword. Supported established Guild IDs therefore remain
positive uint32, as already enforced by Guild detail publication.

The name/type and other fields resolve at Ga6bbfc/Ga6bc44/Ga6bc98/Ga6bce6/
Ga6bd34/Ga6bd7e. There is no parsed account nickname, Hunter leader/deck,
login time, joined date, member role/newbie flag, fc_point or reward receipt in
this USER. Those belong to other contracts and must not be inferred here.

The helper selects a known local target account, confirms same-server access,
and requires exactly one already established joined Guild record. It projects
the supplied Guild summary's known name/type/point-limit/region/emblem and id;
pvid is the target account. It reuses full established-record validation and
refuses conflicting affiliations or corrupt unknown member ownership.

`contribution` is numerically parsed, but the original producer's counter
lineage (Guild aggregate versus member amount) remains unproved. This helper
copies explicitly supplied **Guild aggregate contribution** as stated LOCAL
projection policy. Sharing a field name with member.contribution does not
prove they are interchangeable or justify a hidden recomputation. The test
deliberately uses different aggregate123/member7 values to pin this decision.
No reward/economy effect follows from the display-only projection.

`npx tsx tests/guild-user-query.ts` and TypeScript build pass. Tests cover
exact singleton-array parsing, uint64 preservation, compact public fields,
same-server filtering, unknown/unjoined omission, corrupt/conflicting records
and detached response data. Native popup pixels and original server visibility/
counter rules remain unverified.
