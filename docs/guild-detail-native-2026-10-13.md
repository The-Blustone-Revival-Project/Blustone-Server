# Guild detail query: exact array form and cached INFO receipt

`guild-info-query.ts` parses the native detail request without creating Guilds
or memberships. Authenticated state integration must use already established
records and same-server account filtering. No original Guild instance, quota,
fee, activity or reward value is invented. No live save/process/device/APK was
changed; DataDump remains read-only.

Evidence uses immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses are Ghidra; ELF offsets subtract0x10000. Symbol locator: DataDump
`sources/native/symbols/native-evidence.tsv`, RequestInfo Ga68e94,
ParseGuilds Ga6b340 and ParseGuild Ga6a384. Bounded original Thumb bytes and
ELF section/RTTI pointers were inspected directly.

## Request is a JSON array STRING under singular guild_id

CSRGuild.RequestInfo takes `list<uint64> const&` plus a callback returning
`(int status,list<INFO> const&)`. It constructs a JSON array tag2 at Ga68fe2,
then invokes list-to-JSON vector construction Ga68ff8→Ga834cc. The latter
loads BOTH64-bit words from each list node at Ga83518, stores them at
Ga8351c and assigns JSON unsigned integer tag6 at Ga83520. List order is
preserved, including an empty vector when no IDs were supplied.

Request dumps this array at Ga6901a and puts its text into the form map under
**guild_id** at Ga69020. There is no singleton scalar branch and no
guild_id_list field. Native form examples are `guild_id=[42]` or
`guild_id=[42,43]`, both strings containing a JSON array. At Ga6917a the route
is **/guild/GetDetailInfo**. The six initialized form rows comprise five auth
fields and this one payload field; literal6 is a map entry count, not an ID.

The helper preserves unsafe numeric token text before JavaScript rounding,
admits exact positive uint64 IDs and refuses malformed/zero/duplicate IDs.
It also accepts quoted canonical decimal IDs as explicit replica admission;
native-generated arrays use integer tokens. Native empty query sends[] and
is supported as an empty read. The native request does not establish whether
unknown/cross-server IDs should fail or be omitted; omission and same-server
restriction are replica policy, never authority to fabricate a missing Guild.

## Response wrapper and exact callback chain

ELF RTTI name at ELF1df24e8 identifies the RequestInfo `$_6` TASK_READY outer
wrapper. RTTI object214ebe0 is referenced by vtable214ebb4, whose callable
entry is ELF a73805 (Thumb bit; Ghidra Ga83804). It invokes the stored inner
callback, whose body is Ga83b30. This binds the following parser to the actual
RequestInfo operation rather than extrapolating from neighboring Guild routes.

Inner callback tests status1 at Ga83b5e and selects **ret_data** at Ga83b6e.
It checks optional my_guild at Ga83ba0/Ga83be6; when present it passes the
subtree into ParseMyInfo Ga83bf2. It checks **guilds** at Ga83c1e, selects
the collection at Ga83c68, calls ParseGuilds at Ga83c76 and transfers the
parsed INFO list into callback output at Ga83c88. At Ga83df6 the caller
receives status and that list. A success with no guilds field yields an empty
output list; a direct ret_data array does not satisfy the proven wrapper.

Therefore this read response is:

```text
{result_code:1, ret_data:{guilds:[full established INFO rows]}}
```

my_guild, user and achievement are optional independent update branches;
they need not be supplied by a read-only detail response. Detail rows do not
grant the requesting account membership. Returning an existing other Guild
does not mean updating its personal PLAY_DATA. If the server does supply
my_guild, it must be the requesting account's authoritative flat PLAY_DATA,
not the queried Guild's INFO or a guessed affiliation.

## Public INFO widths and partial-cache behavior

ParseGuilds Ga6b340 consumes the already selected guilds collection directly;
at Ga6b3de it calls ParseGuild Ga6a384 for every row. ParseGuild first parses
id: integer branch Ga6a3be reads only its low32word, string/float branch
Ga6a3ec converts to uint32. It stores a zero highword and caches the INFO in
CSRGuild+118. Thus request uint64 width does NOT imply response IDs support
the entire uint64 range. Supported published/imported Guild IDs must be
positive uint32; accepting a larger response ID would alias its lowword.

ParseGuild searches this cache and either creates a zero-initialized INFO or
updates the existing object. Cached hit comparison Ga6a650..5a checks the
requested narrowed ID then jumps to the shared update path Ga6a5b0. Fields
are updated only when their JSON subtree is non-null: name/type, region,
emblem_id, counts, description and other supported fields. Missing fields
retain cached values; absent fields are not a verified empty/reset event.

For members, Ga6aa84..92 checks non-null members; if absent/null it skips the
replacement. If present, Ga6aaa6 parses the supplied member collection and
Ga6aaae..ab56 replaces the cached member list, including clearing on[] and
updating membership detail. Other optional histories banished/rejected/exited/
invited_guests use separate consumers. Omitting unknown histories preserves
their unknown status; returning[] would instead assert an empty replacement.

The supported server read should project the complete already established
INFO and joined member rows, retaining native pvid/contribution/newbie/role/
fc_point fields. Same-server visibility and public projection of established
member data are explicit replica policy. This source pass does not recover
production privacy rules or permission to publish account secrets, pending
applications, invitations or activity histories. Unknown records remain absent.

`npx tsx tests/guild-info-query.ts` and TypeScript build pass: exact singleton/
batch/empty array-form parsing, uint64 precision and malformed/duplicate/zero/
overflow refusal. These are host/contract checks; native Guild detail pixels
and original remote server behavior remain unverified.
