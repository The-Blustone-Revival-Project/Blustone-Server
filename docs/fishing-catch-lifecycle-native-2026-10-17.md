> Correction2026-10-23: fishing item additions belong to ret_data.item. See [original ARM parent proof](fishing-end-item-parent-correction-2026-10-23.md).

# Fishing catch lifecycle: native producer and settlement boundary

Read-only source closure, 2026-10-17. Original DataDump ELF
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code offsets plus `0x10000`. No runtime, original files,
private save, game UI, account or stock was changed.

Primary DataDump evidence: `sources/native/systems/ghidra-fishing-pool-begin.txt`
(ParseBegin starts line586); `ghidra-fishing-begin-keys.txt`;
`ghidra-fishing-end-settlement.txt` (ReqEndCB line1, ParseEnd line177);
`ghidra-fishing-end-settlement-keys.txt`; `ghidra-fishing-request-event.txt`;
and `sources/native/symbols/native-evidence.tsv`. Fresh bounded original Thumb
inspection closes the request builders and local consume-log owner below.
Existing [bait identity proof](fishing-reference-2026-10-11.md),
[fish classification and inventory distinction](fishing-owned-inventory-sale-boundary-native-2026-10-13.md),
and [standalone sale receipt](fishing-sell-request-callback-native-2026-10-13.md)
remain authoritative for those separate systems.

## Begin sends casting context, not a chosen fish

`CSRMFishing::RequestBegin` **Gb26cbc** constructs exactly auth5
(app_code, app_ver, market, pvid, otp), plus:

- `place_id`: current Fishing+0x50 string, copied Gb26e58..60;
  key Gb26e4a/4e.
- `cast_dist`: decimal serialization of current Fishing+0x74 DISTANCE enum,
  Gb26e64..7a; no physical length/float proof follows from the field name.
- `lure_id`: current Fishing+0x5c string, copied Gb26ea4/ea8;
  key load Gb26e7e with its actual ADD **Gb26e8a**.

The form has eight entries at Gb26eb2. Route literal **Gb27044** is
`/fishing/Begin`. No source item instance, qty, fish ID, grade, length, desired
reward or client price is sent. The real bait selector chain resolves lure0
to genuine item ID LU001 and nonzero to LU003; supported server admission need
not accept every integer as a valid UI selector. Current High-quality Bait
purchase support does not itself authorize fishing consumption.

`ReqBeginCB` **Gb27b38** calls GetResultCode at Gb27b72 and requires result1
at Gb27b76/78 before its decode/ParseBegin path. It parses body.result_code,
then calls **ParseBegin Gb27d34 at Gb27c66**, and forwards status to the scene
callback at Gb27c92. A malformed successful body is not safe: the following
fields are consumed as tuning, not an arbitrary empty success object.

```text
ret_data = {
  achievement: optional native achievement element,
  log_id: numeric32,
  init_val: number, max_val: number, dec_val: number, inc_val: number,
  dec_val_on_burn: number,
  first_burn: {min:number,max:number},
  burn_cool: {min:number,max:number},
  burn_dur: {min:number,max:number},
  wait_time: {min:number,max:number}
}
```

`log_id` integral branches take low32; float/string conversion is unsigned32
(VCVT.U32.F64 Gb27daa), stored into shared INFO+0x44 at Gb27db2/b6.
Other listed tuning values convert to float32. The parser copies further
local reference tuning into INFO+0x68..0x74 at its end; these copied local
values are not additional server response keys. Native null/conversion fallback
branches should not be treated as appropriate server validation or defaults.

There is **no wallet or general-item debit parser in ParseBegin**. That does
not prove the original backend charged no bait at Begin; it proves that a
client-visible stock change is not applied by this callback. There is no
fish_id/grade/length selection in this response parser.

## The log is persisted locally before ordinary settlement

`CSRSceneMFishingWait::RequestEvent` **Ge71a14** resets the fishing model and
calls RequestBegin at **Ge71b28**. Wait.OnRefresh **Ge70f88**, at the relevant
state transition, gets the shared loaded INFO and copies **INFO+0x44** into
`CSRUserDB::PutConsume(int)` at **Ge71442/Ge71446**.

Ordinary `RequestEnd` **Gb29624** obtains the user DB and calls
`GetConsume()` **G109c9a4** at **Gb2964a**. Its signed int result is preserved
in r8 Gb29652, and serialized as the request log ID at Gb297be..c4. If it is
zero, Gb2974c..62 invokes the caller with status1 locally and performs no HTTP
settlement. This cached consume marker is the recovery owner; the End builder
is not simply copying whichever INFO log happens to be in memory.

Begin's unsigned32 storage and UserDB's signed-int API are distinct boundaries.
An explicitly configured implementation should use positive signed32 log IDs
for the supported common subset. Do not promote the observed tutorial
`log_id:"-1"` into an ordinary generated ID, full64 ID or server identity law.
The separate `RequestTutorialEnd` Gb28864 remains a separate request builder;
its old tutorial observation does not prove the ordinary positive-log grammar.

## EndWithSell submits only the result

`RequestEnd` sends seven form entries: auth5 plus **log_id** and **is_win**.
Log key Gb297c8/cc; result key Gb297d6/e2. It selects literal form `"1"` only
when its first BYTE argument equals1 at Gb29802, otherwise `"0"`, and copies
the selected literal at Gb29808/0c. Route literal at **Gb2998a/8c** resolves
`/fishing/EndWithSell`.

There is **no fish_id, grade, length, bait instance, sale qty/grade, price or
keep/sell choice in this builder**. Hook.UpdateMode Gd03a60 calls RequestEnd
with result0 at **Gd03f9c..fa2**, and result1 at **Gd04034..3a**. Other bounded
ordinary recovery callers pass result0, including main-village Init at
Gea3eee..ef4. The minigame reports a local win/loss; the backend must produce
the actual catch identity, grade, length and authoritative economic result.
This proves a producer seam, not original RNG or anti-cheat authority.

## End guard, recovery and receipt order

`ReqEndCB` **Gb2a308** checks GetResultCode **Gb2a32a**, cmp1 **Gb2a32e/330**.
Non-success skips ParseEnd/ParseSell. On ordinary success it gets the current
consume ID and removes it at **Gb2a33a..34a**, before reparsing the body. The
error branch additionally removes consume for codes **10203/10204** when the
VerifyResultCode branch permits local handling; other ordinary failures retain
it. Therefore a generic result2001 does not require an invented zero fish
receipt or clearing a real pending catch. The retry/recovery distinction must
be retained in any future producer implementation.

For success, it calls ParseEnd at **Gb2a468** and then looks up
**ret_data.sell** at **Gb2a478..47e**. ParseSell runs only if that child is
nonnull. This differs from standalone SellFish, whose ret_data itself is the
sale object. The name EndWithSell does **not** establish that every fish is
always automatically sold: the native receiver supports an absent/null sale
child. Original conditions for including that sale remain unknown.

ParseEnd first handles optional `ret_data.user` updates:

- `iap:{iap_qty,free_iap_qty}` are absolute scalar wallet setters.
- `gold:{cur,...}` and `exp:{cur,...}` update the corresponding values when
  present. Native branches also handle max_ap, increase_ap, ap/bp prev/cur and
  ap_charge_time/bp_charge_time; an initial configured catch must not fabricate
  energy or EXP changes merely because those optional receipt branches exist.

Separate ROOT ret_data collections (outside user):

- `item:[{inst_id:full64 numeric,added:uint32,ref_id:string},...]`
  calls **AddItem Gaec508 at Gb2ab20**: positive addition quantity, not an
  absolute resulting stock count.
- `card` has a separate card-addition branch at Gb2ac38; no fish catch
  requires a guessed Hunter reward.

At the ROOT of ret_data, **fish_id:string**, **grade:numeric32** and
**length:numeric32** are read at **Gb2accc**, **Gb2ad2a**, **Gb2ad80** and
stored in Fishing+0x68/+0x78/+0x7c. fish_id passes through the native string converter; its null fallback does not establish a meaningful catch.
The integer fields take low32 (signed/unsigned interpretation follows consumer);
unsupported grade values do not become valid because parsing accepts a word.
The native grade1/2/3 pricing/count mapping is separately closed in the
catalogue consumer document.

A source sentinel comparison precedes **AddInven Gb2e758 at Gb2ae3a** and
**UpdateRecord Gb2e980 at Gb2ae46**. A non-sentinel fish resolves GetItem data
and requires **use_type17** before incrementing its grade count. This separate
fish-keyed count map creates no general item instance by itself. UpdateRecord
changes grade+length only for a strictly longer catch, as previously closed.
The exact no-catch sentinel value was not freshly source-closed in this bounded
audit; do not infer that omitting fish_id is valid because conversion is strict.

Optional root achievement follows; root **consumed_inst_list** is handed to
**CSRInventory::UseItem Gaea5f8 at Gb2ae90**. Its positive qty rows are removal
DELTAS, not post-debit stock. This is a receipt channel capable of removing
bait, but source alone does not establish original per-cast amount, debit phase,
stack preference or whether failure refunds it.

When present, the subsequent **sell** child applies its own wallet result,
general-instance removal deltas and `sell_result` absolute b_cnt/s_cnt/g_cnt
replacement. Thus it can replace the count just incremented by ParseEnd. If
sale is absent, ParseEnd's fishing count increment persists. Neither path alone
proves how the original server represented the caught fish in general inventory
or linked its grade to one or more instances. Current local-bound sale uses
explicit bindings rather than deriving that missing law.

## Concrete next restoration and missing original data

The substantive missing operation is a persisted cast transaction: authenticated
Begin captures real owned bait/context and an explicit minigame tuning profile;
a positive signed32 server log binds one pending cast; End accepts only its
win/loss and atomically settles a server-selected configured outcome once.
A LOCAL authored deterministic outcome or explicit weighted table could supply
that producer only when separately supplied use_type17 fish metadata, grade,
length and stock representation are all explicit. The policy must separately
specify bait debit phase/amount, keep/sale behavior, prices and response-loss
repair. No original pool weights, fish IDs, grade/length distribution, tuning
numbers, cast economics or complete first-catch prize are recovered here.

The existing read-only catalogue, imported grade counts, local-bound sale and
historical LU003 purchase remain useful prerequisites, not a catch producer.
Adding successful Begin alone would leave the real catch and durable recovery
unimplemented. No runtime implementation or native successful catch is claimed.
