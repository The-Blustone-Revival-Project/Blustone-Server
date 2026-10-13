# Guild Update: implicit affiliation, complete settings and populated INFO callback

`guild-update-request.ts` supports only the recovered request shape. Its shared
text/enum/count checks with Found are local admission policy. Root owns any
explicit configured local modification mode; parse success does not authorize
Guild ownership, payments or membership changes. No original fee magnitudes,
server permission rules or setting eligibility are invented. No live save,
server/device input, APK or DataDump changes occurred.

Evidence: immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`, read-only
DataDump `sources/native/symbols/native-evidence.tsv`, bounded original Thumb
bytes and ELF RTTI/vtable pointers. Coordinates are Ghidra; subtract0x10000
for ELF offsets.

## Request replaces six settings, carries no Guild ID or charge

CSRGuild.RequestModify Ga7a408 takes name, desc, USER.JOIN enum,
fc_point_limit uint32, region, emblem_id and callback(status,INFO const&).
The six exact action keys resolve at name Ga7a56c, desc Ga7a584,
type Ga7a5a6, fc_point_limit Ga7a5d4, region Ga7a5ea and emblem_id Ga7a60e.
Strings are copied directly; enum/count are emitted as decimal strings.
Route **/guild/Update** resolves at Ga7a6e8. As with Found, its map contains
auth5 plus six settings.

No id/guild_id, owner pvid, member list, role, price/price_type, change mask,
rank or reward field is serialized. This is a full supplied settings request,
not an omitted-field patch or instruction to allocate a second Guild.
The remote target is implicit through authenticated account context; the
replica must derive the actor's already established affiliation and apply
independent supported-role admission. A client-added Guild ID, fee or role
must not grant target/currency/permission authority.

The helper reuses structural parser admission: required plain strings,
nonempty name, known original emblem, supported enum1..3 and existing local
signed32 count subset. These are intentionally stricter than native loose
conversion and do not prove every production server text/role/region rule.
Caller-side native text/slider checks and a conservative local permission
policy remain separate; no original server authorization follows from these
six field names.

## Actual callback differs from Found's temporary-list quirk

RequestModify `$_28` outer RTTI name ELF1dfa714 links through RTTI214f618 /
vtable214f5ec to callable ELF a7f85d (Thumb), Ghidra Ga8f85c. Inner RTTI
ELF1dfaab3 links through RTTI214f658/vtable214f62c to callable ELF a7fb89,
Ghidra Ga8fb88. This positively identifies the real Update response consumer.

Ga8fbc2 requires status1; Ga8fc2a selects **ret_data**. Optional
**my_guild** at Ga8fc64/Ga8fcaa goes to ParseMyInfo Ga685f0 at Ga8fcb6.
Optional **guilds** at Ga8fce2/Ga8fd2c goes to ParseGuilds Ga6b340 at
Ga8fd3a. That parser updates the INFO cache and returns a complete list.

Unlike Found, this callback explicitly moves the parsed list from stack+18
into output list+6c through Ga83ffc at **Ga8fd4a**. It then sees the populated
count at stack+74 at Ga8fea4 and copies the FIRST INFO to output+78 at
**Ga8feb0**. Callback invocation Ga8fef8 receives status and that INFO.
Thus a single full updated Guild row under guilds[] actually populates the
Update callback's INFO. Do not incorrectly propagate Found's default-INFO
quirk to this neighboring method.

Supported response structure:

```text
ret_data: {
  my_guild: <authoritative unchanged flat actor affiliation>,
  guilds: [<full updated existing Guild INFO>],
  user: <actual changed-wallet previous/current pairs>
}
```

my_guild remains flat PLAY_DATA, never a queried/new INFO object. Unchanged
membership fields should be preserved; publishing settings does not prove a
new joined event, role transfer or counter reset. Complete full INFO avoids
stale cached fields, but absent unknown history fields must stay absent, not
invented empty replacement lists. Supplied guilds[0] must be the actual actor's
updated Guild; a wrong first row would be the callback's displayed result.

## Generic user settlement requires both wallet endpoints

Optional **user** at Ga8fdae/Ga8fdfe is passed into CSRPlayData.SyncUser
Gb7047c at **Ga8fe0c**. Optional achievement has its own guarded consumers.
Therefore Update uses generic SyncUser, unlike explicit cur-only equipment
and Gem callbacks.

Gold branch requires both gold.prev and gold.cur at Gb70674/Gb70684 and
writes cur at Gb7072a. free_iap similarly checks its paired prev/cur at
Gb7074a/Gb7075c; iap checks prev/cur at Gb7087c/Gb7088c. A configured local
Manda setting-change receipt must include actual previous/current values for
both supported free/paid channels that it exposes; cur-only would skip the
native update. Other independent wallet/item branches must not be filled
with guessed zeros merely to make a larger receipt.

The original settings UI caches action2/action3 for name/country changes and
checks total Manda, as recovered in `guild-prices.ts`. RequestModify sends no
payment selection or submitted total. Mapping explicitly supplied action2/3
quotes to a local free-first Manda settlement, supported permissions, free
description-only updates or same-operation retry behavior are authored
transaction policies unless separately proven. Missing quotes cannot become
invented zero fees. This unit reconstructs the request/receipt mechanics,
not original numeric fees, mixed-currency policy or original server debit order.

Existing Guild ID must remain positive uint32 because native INFO.id narrows
to that width. Update allocates no new ID and should preserve all unrelated
members, contribution/rank/history, actor Hunter/item/progress and other
accounts. A future local transaction must verify the existing role/affiliation,
changed settings, known art, authoritative quotes and funds before atomic
mutation; persistence failure requires whole metadata/wallet rollback.

`npx tsx tests/guild-update-request.ts` and TypeScript build pass. Checks cover
the exact six fields, ignored client-added ID/fee/role authority, required
types, known-art admission and detached inputs. No native Update UI validation
or original production permission/fee reconstruction is claimed.
