# Guild fuel count fields: original constructor initializes 5 and 12

New bounded source evidence; no AP/request/support transaction or settings
response implemented. No live client/save/input/APK or DataDump change.
Immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G coordinates equal code ELF plus10000.

## Positive field initialization

`GetMaxSupportCount` **Ga80154** loads Guild manager+b0 and returns it;
`GetSupportFuelCount` **Ga8015a** loads manager+b4. The earlier fuel-list
audit left their values unclosed because it inspected GetMyInfo, not construction.

`CSRGuild::CSRGuild` **Ga93dec** now positively supplies the initial values:

- Ga93e58: `MOVS r1,#5`.
- Ga93e5c/5e: r0 becomes `this+0xc8`.
- Ga93e62: `MOVS r2,#12`.
- Ga93e7c: `r3=r0-0x18`, therefore `this+0xb0`.
- **Ga93e80: `STM r3!,{r1,r2,r5}`**, with r5 initialized0 Ga93e00.

The stored fields are exactly **b0=5, b4=12, b8=0**. This proves the original
client's constructor defaults: max support count5 and support fuel count12.
These are not authored economy fixtures or inferred from UI art. It does not
prove a recipient is credited12 AP per support, total60 AP, the lifetime of
one request, or that the backend never uses another amount.

## Bounded override audit and its limits

Read-only Thumb inspection of the Guild component Ga67eb4..Ga93dec searched
explicit STR/STRD offsets+b0/+b4. Its matches all used the **stack pointer**,
not the Guild manager: request-builder temporaries are not field overrides.
The constructor's pointer-derived STM above was independently decoded; an
offset-only scan would have missed it. No alternate manager field writer
was recovered in those inspected bodies.

The original `CSRRefData.SetExtra` bounded body **Gdd819c..Gddb944** was also
checked for Guild singleton/getter calls and nonstack+b0/b4 writes. No Guild
singleton call or bound manager override was found. The few same-offset
matches were stack storage. Exact RequestMyInfo/ParseMyInfo producer sites
remain as documented in `guild-fuel-request-list-native-2026-10-13.md`;
they do not supply fuel_max/support_qty. Those hypothetical wire keys remain
unproved and must not be invented.

A full halfword direct-BL-target scan of the original ELF610000..1c00000
found no direct callers of the two out-of-line getters. Manual ELF .dynsym/
.rel.plt inspection found neither getter in the PLT relocation list. This
does not prove the fields unused: inline field reads, data/function-pointer
references and another pointer-derived writer are outside those negative
scan guarantees. It also means there is no new closed GetSupportFuelCount
call chain into wallet/AP credit to promote.

Accordingly5/12 may be exposed as **original client initialization evidence**
or an isolated constants helper. They must not be represented as authoritative
current server settings at all times, a recovered GetExtra response schema,
or an already working support payout. No positive network override was found
in this bounded unit; no global no-override theorem is claimed.

## Next source need before a transaction

The known HTTP route is SupportFuel(request_id:uint32), while request creation
may be a Guild Chat command. `CreateFuelJson` Ga82024 and its Chat producer
must establish command type, own/target identity, zero-ID creation semantics,
time/type fields and actor eligibility before creating owned request records.
Recipient synchronization, AP amount application/overflow, donor contribution,
expiry and retry law remain independently missing. A constructor field named
fuel count does not close those mutations.

The existing authenticated no-request list stays truthful and unchanged:
`ret_data:{fuel_requests:[]}`, native upsert/no-clear semantics. No new default
requests, amounts, grant or claim schedule follows from this note.
