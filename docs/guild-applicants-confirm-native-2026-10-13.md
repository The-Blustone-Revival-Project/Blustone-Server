# Guild applicants and confirmation: producer, widths and cache settlement

The approval lifecycle now has exact native request/receipt contracts. A
distinct durable pending model can publish applicants and settle an approved
or rejected batch without treating applicants as joined members. Original
initial role/newbie/contribution, backend capacity, history/cooldown and clock
units remain separate policy. This unit documents source only and enables no
membership mutation.

## Original source and exact GetApplicants request

Immutable final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code offsets subtract0x10000 for ELF. RTTI/vtable metadata is mapped
through actual PT_LOAD segments. Native symbol locator is DataDump
sources/native/symbols/native-evidence.tsv; bounded original Thumb bytes and
dynamic/type metadata were read without writes or live inputs.

CSRGuild.RequestAppicants Ga763fc (original spelling) posts exactly auth5 to
`/guild/GetApplicants`, literal Ga76676/Ga76678. It sends no Guild ID,
applicant ID, page, limit or collection filter. The actor's own affiliation
therefore supplies request context; do not expose another Guild's private
applications from a client-selected guild_id.

The method itself gates dispatch, before HTTP:

- Ga76412 loads personal PLAY_DATA.status at manager+a0; Ga76416/Ga76418
  requires status3.
- Ga7641c loads personal role at+a4. Supported roles1/2 pass; roles0/3/4
  return before dispatch through the bitmask0x19 check at Ga76424–Ga76432.

The out-of-domain native branch for roles>4 is not permission for invented
roles. Strict replica admission should use the recovered supported role domain.
The trailing byte argument is forwarded into generic request/task construction
at Ga7667e; it is not serialized as a body field. Its full transport meaning
has not been assigned here and must not be named a force/cache flag by guess.

## Actual applicants callback and named collection

RequestAppicants `$_23` TASK_READY E0 RTTI name ELF1df8850 links to RTTI
VA214f3d8, vtable VA214f3ac and callable ELFa7ca59 / Ghidra Ga8ca58.
Its success1 branch first clears the existing applicant list at manager+f4
(Ga8ca86–Ga8cac2), before selecting any row collection.

It selects full response.ret_data at Ga8cac4/Ga8cac8, then exact named child
**applicants** at Ga8cb46/Ga8cb4a, and calls ParseApplicants Ga6b680 at
Ga8cb56. The canonical response is:

```text
{result_code:1,ret_data:{applicants:[{pvid,desc,fc_point,applied},...]}}
```

It is not a bare ret_data array or ret_data.guilds. Missing applicants still
follows the preceding successful cache clear, but an explicit applicants[]
states the supported complete empty collection clearly. Failed response skips
this success clear/update. The callback copies the resulting cached APPLY
list into its output and passes status/list to the UI.

ParseApplicants also clears its target list before iterating the selected
collection, then inserts each parsed row. Arrays and object collections have
native iterator branches; canonical array publication is replica policy.

## Exact APPLY row fields and the narrowed PVID hazard

ParseApplicants resolves four exact keys:

- pvid: Ga6b73e/Ga6b742.
- desc: Ga6b746/Ga6b748.
- fc_point: Ga6b74c/Ga6b74e.
- applied: Ga6b752/Ga6b754.

Although APPLY stores its identity in an eight-byte field, this parser reads
only the numeric low32word at Ga6b78e. String/double conversions narrow with
vcvt.u32.f64 at Ga6b7b0. Ga6b882 stores that low word with a ZERO high word.
Publishing applicant PVIDs above uint32 would therefore alias a different
identity; the full uint64 ConfirmApplication request does not fix this row
consumer. Support only positive uint32 applicant IDs or refuse the unsupported
publication. Never truncate an owned account identity to fit.

desc uses strict string conversion at Ga6b7d6. fc_point reads one uint32
word at Ga6b7fc or uses vcvt.u32.f64 at Ga6b81e; it is stored at list-node+20
by Ga6b8ee. applied reads a numeric low32word at Ga6b850; string/double branches
convert through the uint64 conversion thunk but retain onlyr0 at Ga6b876.
Ga6b8ee stores applied at node+1c. Payload positions after eight-byte list links
are pvid+0, desc+8, applied+14 and fc_point+18.

Thus both fc_point and applied have only32 stored bits in this consumer.
Applied is a raw server-supplied value here; this pass does not prove Unix
seconds versus milliseconds or a clock/default policy. A generated local
timestamp must be explicitly declared and fit the supported width, rather
than claim Date.now() milliseconds are original data. The normal Apply popup
sends empty application desc; that does not establish all nonempty desc rules.

## ConfirmApplication form: target_pvid is a JSON-array string

CSRGuild.RequestConfirmApply Ga76f94 takes list<uint64>, a byte decision and
status-only callback. It initializes a JSON array at Ga76fba/Ga76fbc, calls
the original unsigned list-to-JSON builder Ga834cc at Ga76fce, and dumps it
at Ga77128. It stores the resulting text under singular **target_pvid**
at Ga7712c/Ga77130. Both ID halves are preserved by that same list builder.

The exact form is `target_pvid=[123,124]`, a STRING containing an array.
It is not target_pvid_list, scalar target_pvid, Guild IDs, or a consumed-ID
receipt field. Empty input constructs[] natively; whether to refuse an empty
transaction is explicit replica admission, not an original server rule.

The second field is **granted**, Ga7713a/Ga77146. The native constructor
compares the byte to exactly1 at Ga7715e and chooses literal STRING"1" at
Ga77162/Ga77166; all other byte values choose literal STRING"0" at
Ga7715c/Ga77164. Ordinary UI sends only1/0: manager approval call Gfb0eba
passes1 at Gfb0eb6, rejection call Gfb0fb0 passes0 at Gfb0fac.
Strict 0/1 admission is safer than interpreting arbitrary truthy flags.
The route is `/guild/ConfirmApplication`, Ga77332/Ga77334, auth5 plus these
two fields. No role, newbie, Guild capacity or wallet allocation is supplied.

## Confirmation updates authoritative collections and removes request IDs

RequestConfirmApply `$_24` TASK_READY E0 RTTI ELF1df8f6c links to RTTI
VA214f458/vtable VA214f42c and callable ELFa7d345 / Ghidra Ga8d344.
Its success branch selects ret_data at Ga8d37a/Ga8d37c, then independently:

- my_guild → ParseMyInfo at Ga8d406.
- guilds → ParseGuilds at Ga8d490.
- applicants → ParseApplicants at Ga8d552.
- user → generic SyncUser at Ga8d61c.
- achievement → existing achievement consumers.

After success parsing, the callback ALSO copies its captured ORIGINAL target
list from closure+30 at Ga8d6f6–Ga8d72c. It scans the manager applicant cache
at+f4, compares each cached pvid with those IDs at Ga8d782–Ga8d790 and removes
matching entries through the subsequent list-filter/splice path. This occurs
for accepted and rejected requests; there is no successful-subset selection
from a server-returned consumed-ID field.

Therefore result_code1 must settle the entire requested batch atomically.
An unknown or mismatched pending target cannot be silently skipped while the
client deletes it. Return the full remaining applicants array to refresh that
cache, plus full affected Guild INFO/member rows after approval. Personal
my_guild in this ADMIN response belongs to the administrator, not an applicant.
The applicant's future personal read must derive its own newly authoritative
joined/pending state from durable server state.

No confirmation wallet fee is proved. Wallet-neutral success may omit user or
use user:null. Any nonnull user must include authoritative paid/free scalars
because generic SyncUser otherwise zeros them. No applicant currency or reward
grant, notification producer or original history is manufactured by this schema.

## Management and projected-member capacity UI gates

GetApplicants itself requires joined supported role1/2. Independently the
management UI access for leader1/supervisor2 is bound to BT_SET in the original
Guild INFO XML and documented in the wallet/management note. That supports a
strict local approval authorization policy, not unproved server-side privileges
for arbitrary roles or private/public searches.

CSRTabGuildApplyMgr.CheckApply Gfb0838 obtains own cached INFO and copies it
at stack+28. Gfb0876 reads its joined member-list count at INFO+68; the loop
at Gfb087c–84 adds one for each checked applicant. Gfb08ae compares the
projected count to literal41: >=41 takes the disabled-approval presentation,
while <=40 takes the enabled path. This is an actual batch-approval UI cap,
stronger than the previously identified display /40. Member-list completeness
matters; a fabricated zero-length list with member_cnt40 would not represent
this consumer honestly.

The original BACKEND capacity remains unproved. An explicit local capacity
no greater than40 now has direct UI admission evidence; a lower configured
capacity is still local policy. Immediate-public Apply capacity and approval
capacity must be enforced atomically from actual joined records, never from
client-provided member_cnt. No automatic leader succession/dissolution or
unknown source rank/level cap follows from this count gate.

## Remaining defaults and implementable local boundary

A declared local pending/approval lifecycle can now use actor-owned pending
records, exact named applicants rows and complete authoritative joined member
receipts. It must preserve requester/target ownership, same-server policy,
one joined affiliation, batch integrity, width bounds and restart/rollback.
Acceptance adds joined members and removes corresponding pending entries;
rejection removes pending entries without adding members. Contradictory/stale
requests need a separately declared retry policy; no nonce is recovered.

Neither requester nor callback initializes an approved member's original
role, newbie or contribution. Those values and applicant timestamp units must
be REQUIRED explicit local configuration if originals remain absent. The
independent limits audit also found native ParseMyInfo/ParseMember rewrites
newbie1 with any nonleader role to effective newcomer4; new local policy must
remain coherent with that consumer rather than publish contradictory role3/
newbie1 while claiming a native role3 display. Unknown invite, ban, cooldown,
rejoin, priority and notification rules remain disabled unless separately
reconstructed. This evidence note enables no state mutations itself.
