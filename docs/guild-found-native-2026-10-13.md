# Guild Found: exact request and cache/wallet receipt, local creation gates

`guild-found-request.ts` parses only the recovered request. It does not create
a Guild, allocate an ID, assign membership or debit a wallet. Root owns any
explicit configured local transaction. No original fee amount, original name/
region eligibility or production allocator is supplied by this evidence.
No device input, live save/process, APK or DataDump changes were performed.

Source: immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`, read-only
DataDump `sources/native/symbols/native-evidence.tsv`, and bounded original
Thumb bytes. Addresses are Ghidra; subtract0x10000 for ELF. ELF RTTI/vtable
links bind the actual RequestBuild callback.

## Six exact action fields, no client-supplied charge or ID

CSRGuild.RequestBuild Ga6f8c4 takes name, desc, USER.JOIN enum,
fc_point_limit uint32, region, emblem_id and callback(status,INFO const&).
It resolves form keys name Ga6fa28, desc Ga6fa40, type Ga6fa62,
fc_point_limit Ga6fa90, region Ga6faa6 and emblem_id Ga6faca. Strings are
copied directly; type and point limit are converted to decimal strings. Route
is **/guild/Found** at Ga6fba4. Its form map has eleven entries: auth5 and
these six action fields. There is no guild_id/id, price, price_type, member
list, role, rank, reward or wallet amount in this request.

The helper accepts canonical decimal enum/count values, plain required
strings, nonempty name and known original emblem. Enum types1/2/3 use the
already recovered public/permission/private meanings. Description and region
may be empty because no recovered request-level nonempty gate is asserted.
Existing local Guild INFO uses signed32 count admission, so this helper
supports point limits0..0x7fffffff even though native input is uint32.
Name/region lengths, reserved words, uniqueness and production creation
eligibility remain separate unknown policies; this parser does not recover
server moderation or authorize mutation by mere parse success.

## Actual callback: personal affiliation, Guild cache and generic user delta

RequestBuild `$_14` outer RTTI string ELF1df463a links through RTTI214ef18 /
vtable214eeec to callable ELF a77261 (Thumb), Ghidra Ga87260. Inner RTTI
ELF1df49d7 links through RTTI214ef58/vtable214ef2c to ELF a7758d, Ghidra
Ga8758c. This is the actual Found callback, distinct from discovery reads.

It requires status1 at Ga875c2 and selects **ret_data** at Ga8762c. Optional
**my_guild** is selected at Ga8766e/Ga876ba and passed directly into
ParseMyInfo Ga685f0 at Ga876c6. It checks **guilds** at Ga876f8 and selects
that collection at Ga87744; ParseGuilds Ga6b340 is called at Ga87754,
updating existing/new INFO in the native Guild manager cache. Thus complete
full INFO rows belong under guilds[], while personal my_guild is the flat
PLAY_DATA object (guild_id,status,newbie,role,contribution), not an INFO row.

Optional **user** at Ga877b8/Ga8780e is passed into CSRPlayData.SyncUser
Gb7047c at Ga8781c. Optional achievement follows separate generic consumers.
The compatible configured creation receipt can therefore contain:

```text
ret_data: {
  my_guild: <authoritative flat affiliation>,
  guilds: [<complete created Guild INFO>],
  user: {gold:{prev:<before>,cur:<after>}}
}
```

This schema proves the consumed fields, not original initial status/counters,
member rank/capacity, source fees or server admission. Locally initializing
one founder as joined leader with zero contribution/counters/rank must be
labeled explicit local creation policy; no original production values are
recovered by selecting that initial state.

## Gold must contain BOTH previous and current values

Found uses the generic SyncUser grammar, unlike Gem selling's cur-only parser.
Its gold branch selects gold at Gb70662 and requires non-null prev at
Gb70674 and cur at Gb70684 before doing anything. If either is missing it
jumps to Gb70734 and skips the update. A receipt `{gold:{cur:...}}` alone
would leave the native Found wallet stale.

It parses prev again Gb70694 and cur Gb706e0, with unsigned32 float/string
conversion Gb706d6/Gb70722. At Gb7072a it writes absolute cur to PlayData+154;
Gb7072e/30 records delta cur-prev. A configured gold-only receipt must echo
correct actual prev/cur and preserve other wallet/item branches by omitting
them, rather than publish guessed zero balances. Existing local signed32 gold
admission is a conservative subset; native word-sized conversion is not
permission to wrap/underflow a wallet or silently debit an unknown currency.

The client creation UI affordability gate compares its cached action1 price
with gold, as previously documented. RequestBuild still sends no payment
selector. Mapping explicit configured action1/type2 to local gold debit is
replica policy, not proof of original remote currency or amount. Missing
quote must refuse, never default to free creation; non-gold/unknown quotes
remain unsupported until their settlement is reconstructed.

## Callback INFO quirk and allocator limits

The callback returns `(status,INFO const&)`, but its temporary INFO-list
handling is unusual. Ga87640/46 initializes a separate sp7c list with count
sp84=0. The actual guilds parsing destination at Ga8774e is sp60, whose
returned list is destroyed at Ga87758..88 after native cache side effects.
The separate sp84 count receives no later assignment in this bounded body.
At Ga878c4 it tests that count before copying a first row into output INFO;
the callback at Ga8791a consequently receives its zero-initialized default
INFO on this path. Supplying a guessed singular `guild` receipt field cannot
fix this: no such key is parsed.

This does not negate the parsed my_guild/INFO-cache/user updates. It does
mean host contract validation must not claim native Found UI callback receives
the created INFO or renders correctly. The subsequent scene may read updated
manager data; that behavior needs native validation, not a fabricated response.

No client-side original server ID allocator is present in RequestBuild. The
request has no desired ID. Native returned INFO.id and personal guild_id
parse narrow to uint32; response IDs must be positive<=0xffffffff. An explicit
local monotone unused-ID allocator can preserve that width, but its starting
value/order/namespace is authored policy. Unknown/preserved original server
IDs must not be reused or inferred from member pvids. Exhaustion/collision
must refuse, and allocation plus Guild/wallet changes must persist atomically.

## Required local transaction boundaries

Any configured local creation still requires authenticated same-server actor,
no existing Guild affiliation, known emblem, explicit authoritative quote,
available wallet, supported initialization and uniquely allocated uint32 ID.
One attempt must settle once; a second Found request from an already joined
actor must refuse rather than allocate/charge again. Whole state rollback is
required if persistence fails. Creating imported history/rewards, consuming
other Hunter/item balances or acknowledging unspecified roles is unsupported.

`npx tsx tests/guild-found-request.ts` and TypeScript build pass. Checks cover
the exact six fields, canonical supported enum/counts, known-art admission,
string preservation and absence of price/ID fields. They are host contract
checks; no original numeric fee or native creation success is claimed.
