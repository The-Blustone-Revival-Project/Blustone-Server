# Guild ranking: original array receipt and explicit known-record subset

`/guild/GetRanking` has a different response shape from Guild detail queries:
its actual callback parses ret_data directly as an INFO collection. The new
pure helpers preserve explicit stored ranks and support a read-only subset of
known records. They do not reconstruct original global ranking completeness,
ranking scores, tie rules, rewards or season rollover.

## Original request grammar and pagination

Immutable final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses subtract0x10000 for ELF. Bounded original Thumb bytes,
ELF vtable/RTTI references and retained original localization were read without
changing DataDump or using a device.

CSRGuild.RequestRank Ga7b03c takes two signed integers plus a callback returning
status/list<INFO>. It saves inputr1 inr11/fp at Ga7b04e and inputr2 on stack+18
at Ga7b048. First argument is converted to decimal text at Ga7b1a6–aa and put
under exact key`page` at Ga7b1ae/Ga7b1b0; the second is converted at Ga7b1d2–d6
and put under exact key`size` at Ga7b1da/Ga7b1dc. The form map constructor has
literal7 entries at Ga7b1fe: auth5 plus page/size. Route literal at
Ga7b354/Ga7b356 resolves to ELF1d68e9e, `/guild/GetRanking`.

CSRTabGuildRank.Init sets tab+834 to0 at Gfd2bd8–da, passes that page inr1
at Gfd2be6, literal size10 inr2 at Gfd2bf4, and calls RequestRank at Gfd2bf8.
OnOccureOverPullEvent increments tab+834 by1 at Gfd3cf4–fa, then issues the
same size10 at Gfd3d14/Gfd3d18. Native first page is therefore0, next page1;
page is not an absolute displayed rank or a Guild ID.

`parseGuildRankingQuery` accepts canonical nonnegative signed32 page and
positive signed32 size. These strict sign/shape limits and admission of explicit
numeric values are replica policy; negative original API behavior is not
reconstructed. No missing-field defaults or arbitrary response IDs are created.

## Actual ranking callback consumes a bare INFO array

Original RTTI names identify RequestRank `$_29` TASK_READY wrappers. The outer
vtable VA214f66c references RTTI214f698 and callable ELFa8028d; it obtains and
stores decoded JSON. The inner E0 vtable VA214f6ac references RTTI214f6d8;
its callable entry is ELFa805b9 / Ghidra Ga905b8. Writable metadata addresses
are mapped through PT_LOAD (in this segment, file offset=VA−0x1000).

Ga905b8 reads GetResultCode, requires1 at Ga905e6, selects exact`ret_data` at
Ga905f2–f8, and calls ParseGuilds Ga6b340 directly at Ga90606 with that selected
JSON. It does not select a nested`guilds` property. The compatible read is:

```text
{result_code:1,ret_data:[full explicit Guild INFO rows]}
```

The parsed INFO list is copied into output and supplied to the callback at
Ga90668–74. No personal my_guild assignment or reward parser occurs in this
bounded callback; do not add queried membership or invented ranking rewards.
The INFO parser/cache semantics are the same ones documented for detail reads:
keep complete member rows, omit unknown histories, never replace them with[]
as a claim of known absence.

## INFO.rank is retained; it is not computed from members

ParseGuild's exact`rank` key loads are Ga6a926/Ga6a92a and
Ga6a934/Ga6a938; the resulting unsigned word is stored at map node+20 at
Ga6a980. Guild INFO begins at that map node+10, so rank is INFO+10.
CSRCellGuildRank.Init addresses each0x9c-byte INFO row at G8940b6–b8 and
loads INFO+10 at G89415c, formats it and writes it to TX_GD_TX15 at G894166–6c.
The original exported localization key is
`랭킹순위|TX_GD_TX15|EN` in DataDump
`sources/client-tables/recovered-data/leveldb-tables/all-tables.json`.
This is direct rank presentation from the explicit INFO field, not list-index
renumbering or a derived contribution/member-count score.

## Supported local subset policy

`guildRankingRows` projects complete existing INFO through the established
same-server detail helper, omits rank0, sorts by stored rank then Guild ID,
and slices the KNOWN subset by page/size. Stored sparse/tied ranks stay exact:
for example ranks4/4/9 remain4/4/9, never1/2/3. Same-server visibility,
rank0 omission, deterministic tie ordering and pagination over known rows
are explicit local policy. The native request alone does not prove original
server scope, global ordering/tie rules, complete populations or original
member-search privacy. Existing same-server Guild search is likewise local
policy, not evidence that the original search was limited to one server.

Pagination multiplies page*size with BigInt. An offset beyond the known list
returns[] before conversion to Number; large valid signed32 arguments cannot
round into a different page. Every projected member row is detached and
personal affiliation/history remains untouched. Existing imported uint32 Guild
identity admission prevents response IDs aliasing through the original parser.

Known-record read support must not be reported as restored original global
rankings. A faithful global ranking needs an independently sourced complete
ranking snapshot/order or the original score/season policy, not incidental
membership imports. This helper assigns no new rank, reward, ownership or fee.

## Verification

Focused `guild-ranking-query.ts` and `guild-ranking.ts` tests pass, as does
isolated strict TypeScript checking and `git diff --check`. Tests cover native
page0/size10 shape, invalid/missing/signed-width requests, sparse/tied explicit
ranks, both server partitions, rank0 omission, full detached member rows,
unknown-account refusal and BigInt product safety. All test records are
authored fixtures. No shared state/routes, live saves, game inputs, resources
or APK were changed by this unit.
