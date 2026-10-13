# Guild Update: management roles and mandatory wallet receipt quantities

This original-byte audit found a material receipt hazard: a successful Guild
response that includes user but omits its paid/free Manda quantity scalars
zeros those native wallets. This affects both Found and Update because their
callbacks invoke the same generic SyncUser parser. The pure receipt helper
now emits explicit coherent wallet snapshots. It computes no spending, grants
or original paid/free priority.

## Actual Update callback and response branches

Immutable final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses subtract0x10000 for ELF; writable RTTI/vtable metadata
is mapped through PT_LOAD, not by applying that code delta.

CSRGuild.RequestModify Ga7a408 is bound to `/guild/Update`. Its original
RequestModify `$_28` TASK_READY E0 RTTI name resolves to object VA214f658 and
vtable VA214f62c. The callable entry is ELFa7fb89 / Ghidra Ga8fb88.
That actual callback tests result_code1 at Ga8fbc2, selects ret_data at
Ga8fc28–2e, and independently handles my_guild, guilds, user and achievement.
The selected user subtree is passed to CSRPlayData.SyncUser Gb7047c at
Ga8fe02–0c. Failed status skips these success parsing branches.

Full Guild INFO and requesting-account my_guild remain separate, exactly as
in earlier read/create contracts. A metadata update must not take another
Guild ID, add/remove members or replace unknown histories from request fields.
The original form still identifies the actor through auth; no permission,
wallet amount or successful debit is established by a client-supplied field.

## Scalar reset hazard: quantities must always be explicit

SyncUser receives JUST the user object, not the full response envelope.
It recognizes optional wallet delta objects:

- free_iap at Gb70734/Gb70736, then prev and cur children. Cur writes the
  free wallet CPVDataMgr+a0 at Gb70858–5c.
- iap at Gb70868/Gb7086a, then prev and cur children. Cur writes the paid
  wallet CPVDataMgr+9c at Gb70938–3c.

These objects do not eliminate the later quantity requirements:

- iap_qty key Gb70948/Gb7094a. The parser initializes r4 to0 at Gb70954,
  handles numeric/string conversions, and calls CPVDataMgr.get at Gb70992.
  It UNCONDITIONALLY writes r4 to+9c at Gb70996. Missing/null leaves0.
- free_iap_qty key Gb7099e/Gb709a0. It initializes r4 to0 at Gb709aa,
  converts and calls the same getter at Gb709e8, then UNCONDITIONALLY
  writes r4 to+a0 at Gb709ec. Missing/null leaves0.

Thus a gold-only `{user:{gold:{prev,cur}}}` receipt preserves neither native
paid nor free Manda, even if the server leaves both stored wallets unchanged.
Likewise an Update receipt containing only iap/free_iap delta objects has those
quantities overwritten by the later missing scalars. This is direct native
assignment evidence, not a hypothetical double-debit or inferred schema.

Always include authoritative user.iap_qty and user.free_iap_qty in successful
Guild user receipts, including gold-only creation, free metadata changes and
state-derived no-op retries. If delta objects are included, their cur values
must agree with those scalars. Gold's existing prev/cur contract remains.

`guildWalletReceipt(before,after)` emits the user subtree:

```text
gold:{prev,cur}, iap:{prev,cur}, free_iap:{prev,cur},
iap_qty:after-paid, free_iap_qty:after-free
```

Every input quantity must be explicitly supplied uint32; missing values refuse
instead of defaulting0. Snapshots are copied into detached output. This helper
does not choose which wallet pays or decide whether an action may proceed.
Atomic persistence and previous-wallet restoration remain the caller's work.

## Management UI roles and fee limits

CSRTabGuildInfo.SetGuildRole Gfb7970 subtracts1 from role and checks<=1 at
Gfb798a–8e. Roles1/2 hide PA_BUTTON1 at Gfb79ac–ae and show PA_BUTTON2 at
Gfb7a06–0a; other roles show the first and hide the second. The called function
is CMUpdatable.SetVisible G7882a0, so this is actual visibility rather than
an unproved opacity flag.

Original UI_XML_RO record KO/GUILD/G_T_INFO positively binds PA_BUTTON1 to
donate-only BT_GIVE. PA_BUTTON2 contains BT_GIVE plus BT_SET, whose original
textbox says Guild management. Therefore leader1/supervisor2 can reach the
management UI. This establishes UI access, not the full original server's
field-by-field authorization. A local mode may admit those actual joined roles
as explicit local policy; it must derive them from authenticated persisted
membership, never from request role or a returned public INFO lookup.

Name/country change flags alone feed cached action2/action3 quotes and the
total-Manda affordability comparison, as proved in the action-reference note.
Type, FC threshold, description and stock emblem do not feed that recovered
two-flag fee sum. No-fee UI presentation for those edits is not proof of
original zero-cost server settlement or unrestricted uploaded images. Any
enabled local metadata update must retain its explicit policy qualification,
native text/FC bounds and original stock-picker gate.

FindPrice Ga80160 supplies a further missing-quote hazard: when the action
map lookup misses, Ga80192–Ga80198 writes zero to all three returned PRICE
words (amount/action/payment). Consequently the original UI can display0 for
an unavailable action2/3 quote. A changed paid field with no explicit supplied
row must stay refused. That native zero fallback is not an original free price;
an explicitly supplied zero quote is a separate declared fixture choice.

## BADWORD_RO existence correction

The retained original thirteen-table export contains BADWORD_RO, not just its
name. Five locale records have string mappings with these entry counts:
EN502, JA31, KO4159, SC4082, TC85. Source:
DataDump sources/client-tables/recovered-data/leveldb-tables/all-tables.json.
No words need publishing to establish availability. The separate
[native dictionary follow-up](badword-source-native-2026-10-13.md) now closes
loader ownership, all-five union and exact byte matching without casefold.
A printable-ASCII local subset alone does not recreate that check; optional
server integration must use the proven source-backed matcher. Font support
and broader original server admission remain incomplete.

## Verification

`tests/guild-wallet-receipt.ts`, isolated strict TypeScript and diff checks pass.
Tests cover gold-only settlement retaining both Manda quantities, changed and
unchanged coherent snapshots, missing/type/uint32 refusal and detached outputs.
No live state, native inputs, resources or APK changed. Root owns Found/Update
integration and its end-to-end fixture checks; native UI remains unverified.
