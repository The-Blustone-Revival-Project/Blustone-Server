# EndEntrust: complete result parents and scalar setter domains

2026-10-13. Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses = ELF+0x10000. Read-only bounded original Thumb,
resolved JSON indexes and native symbol signatures. Server doc only; no
producer, jobs, wallet/reward grants, native input or DataDump edits.

This refines `expedition-dispatch-skip-end-pass-native-2026-10-13.md`.
In particular, its earlier broad "result.ap/ap_charge_time" wording is
superseded: **AP metadata is inside result.user_exp.ap**. Do not implement
the previous tentative parent placement.

## Complete successful receipt shape

ReqAutoCombatEndCB Gb41dc0 guards request status0 and application result1
before parsing. It selects full body.ret_data and keeps it in r4. Successful
ret_data.user is passed to generic SyncUser at Gb41ede, independently of
the result payload. ret_data.result is selected Gb41eea..eee, retained at
stack+18 and sent to ParseAutoCombatEnd G9ba0a8 at Gb41efa.

The following is a typed DTO skeleton, **not original populated values**:

```text
ret_data: {
  user: <null or separately valid generic SyncUser object>,
  achievement?: <separately valid achievement data>,
  result: {
    gold: {prev:uint32,cur:uint32},
    user_exp: {
      prev:uint32,cur:uint32,
      max_ap: {prev:uint32,cur:uint32},
      ap: {cur:uint32,ap_charge_time:effective_uint32}
    },
    card_exp: [{inst_id:exact64,prev:uint32,cur:uint32}, ...],
    item: [{inst_id:exact64,ref_id:STRING,added:uint32}, ...]
  }
}
```

Complete supplied DTO admission may require these fields even where native
null/missing conversion silently produces0. Canonical numeric domains and
nonnegative exact64 identities are an explicitly safer local subset of the
original's integer/string/double coercions. No original producer ownership,
award magnitude, job correlation, clock monotonicity or replay rule follows
from this grammar. No result.level, root max_ap, root ap or root
ap_charge_time index was recovered in this complete callback.

## Gold and user EXP: absolute current snapshots plus display deltas

The callback reads result.gold.cur at Gb41f14..20, converts unsigned32
(VCVT.U32.F64 Gb41f88; integral lowword Gb41f36), and directly stores
CSRPlayData.gold+154 at Gb41f90. This is an **absolute current wallet**,
not a quantity to add. The total-result parser independently reads gold.cur
and gold.prev G9ba16c..1fe and constructs their difference for presentation.
Missing values do not represent "leave unchanged" in this successful path.

The callback reads result.user_exp.cur at Gb41fa0..fac, unsigned32 conversion
Gb41fea and direct store CSRPlayData.EXP+14c at Gb41ff4. The total-result
parser reads user_exp.cur/prev G9ba21c..2ac for the displayed EXP difference.
Do not infer original level growth or fabricate a level-up from the difference.

## Exact nested AP parents and deliberate 32-bit charge-time narrowing

After selecting result.user_exp at Gb41ff8..ffc, **the object is retained in
sb at Gb42002**. result.user_exp.max_ap is selected Gb42004..06, retained
in r5, then its prev/cur are unsigned32 conversions Gb42010/Gb4205c.
max_ap.cur directly sets PlayData+13c at Gb420e8. The callback also stores
max_ap cur/prev as local extra data under increase_ap.cur/prev
(Gb42112/Gb42158); these are local metadata keys, **not extra wire fields**.

The AP selection is **MOV r0,sb Gb4217c**, then JSON index `ap` Gb4217e.
Thus it is **result.user_exp.ap**, retained in r5 at Gb42182. Its cur is
unsigned32 Gb4218c..1ce. The subsequent **MOV r0,r5 Gb421da** indexes
`ap_charge_time` Gb421dc, so the time is nested **inside that AP object**.
The integral path loads only its lowword Gb421f2; string/double conversion
uses VCVT.U32.F64 Gb4221a. Before SyncAP, r2 gets this word Gb4222c and
**r3 is zeroed Gb4222e**, then calls SyncAP Gb6c95c at Gb42230.

Therefore, although SyncAP takes an unsigned AP count and a wider clock
argument, **this End caller's effective charge time is uint32**. This differs
from Start's separate ret_data.user.ap_charge_time full64 snapshot; do not
copy Start's clock width or parent to End. AP.cur is an absolute AP snapshot
and charge time is an AP regeneration clock, distinct from job duration and
item quantities. Original timestamp production/epoch and refill/level-up
policy are not reconstructed by these call sites. Missing/null ap skips
SyncAP after max_ap/EXP processing; it does not undo prior mutations.

## Hunter EXP retains full64 identity but uses a 32-bit EXP word

The callback iterates result.card_exp by numeric array index
(Gb42236..92). Each row's inst_id is full64: LDRD Gb422b8, passed intact
as r2/r3 at Gb42352..54. cur is decoded unsigned32
(Gb42302/Gb4232a), then passed as the stack EXP argument to
CSRInventory.SetCardExp(uint64,int32) Gae98a0 at Gb42358.
The native setter signature interprets that same EXP word as signed int32.
Consequently a safe settlement implementation may require cur<=INT32_MAX
as local admission, rather than falsely treating the setter as unlimited
positive uint32 EXP. A generic source/native distinction must remain clear.

ParseAutoCombatEnd independently iterates the same rows, reads prev/cur as
unsigned32 and constructs per-Hunter presentation deltas
(G9ba316..446); inst_id is full64 there too (G9ba468). These rows are
absolute EXP snapshots with previous values for display, not Hunter grants,
level numbers or EXP to add twice. No skill or rank mutation is parsed here.

## Item grant rows are actual full64 inventory deltas

The callback iterates result.item[], reads inst_id full64 with LDRD
Gb42424, added unsigned32 Gb4249c/Gb424ca, ref_id strict STRING via
Gb424ec, and calls AddItem(uint64,string,uint32) Gaec508 at Gb4251a.
The identity highword is retained in r6 and passed to r3 Gb42512. This is
**not** deferred Hunter Search Reward's narrowed-ID AddItem caller.

The total-result parser additionally reads result.item ref_id/added
G9ba4f6..626 for thumbnails/quantities. Existing GetItem references and actual
owned-stack/allocator policy are required before a supported award can be
emitted. Empty item/card_exp arrays skip those respective settlement loops;
they do not establish a completed job, real reward entitlement or retry safety.

## Cache and generic-user hazards remain

ParseAutoCombatEnd clears its active job/cache before testing result:null,
as established in the preceding note. Do not acknowledge End success with
result:null as a neutral query. Conversely a non1 End response skips the
whole callback's parsing through the independent result guard.

ret_data.user:null takes generic SyncUser's existing early exit. A nonnull
user needs exact authoritative iap_qty/free_iap_qty snapshots because that
parser overwrites them independently of gold/AP; any currency deltas require
its own both-prev-and-cur contract. Result setters subsequently overwrite
their specialized current snapshots. A future producer should prepare all
validated wallet/EXP/AP/inventory and cache DTOs before an atomic durable
commit; this source note deliberately supplies no quantities, ownership,
new stack IDs, automatic level-up or idempotency policy.
