> Update2026-10-23: optional [sequential current-row skips](dispatch-row-skips-native-2026-10-23.md) now use schema19 receipts and replayed compressed schedules under local-manda-sequential. The older local-manda-all mode still refuses individual rows and uses compressed history for mixed whole-job finish. Native UI validation remains pending.

# Dispatch future rows and whole-job paid finish

Native per-row Skip cannot safely be enabled against the old local projection
that published every future row's begin/end timestamp as nonzero. That exposed
future-row buttons and allowed a skipped final row to collapse the native
Finish Now forecast while earlier rows remained unfinished. The supported
LOCAL path therefore projects unstarted rows as zero/zero, admits only whole-job
serial-1 paid finish, and captures acceleration separately from the immutable
original schedule. Arbitrary per-row paid acceleration remains refused.

Original ARM ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses use retained Ghidra/code coordinates, ELF code offset plus0x10000.
All original/DataDump investigation was read only. This document and disposable
HTTP checks do not establish a native paid Skip, displayed quote or settlement.

## Why future rows really were exposed

CSRPopUpEntrust.SetAutoCombatList Gb7d340 clears its UI row list and requests
RefreshEntrust at Gb7d4f0. The success closure Gb82ee8 walks the model RESULT
vector. It copies row begin/end UTC at Gb830d8/Gb830e6, then **requires both
to be nonzero** at Gb8311a–Gb83124 before adding the row through virtual+0x74
at Gb83142/Gb83146. There is no begin<=now predicate. It computes done from
now>=end at Gb83126–Gb8313a; only those rows subsequently call SetResult.

AddList Gb7f2cc always copies the DOING template at popup+0x68c
(Gb7f314/Gb7f31c), including its BT_CLEAR button. OnInit selects original
SR_COMMON/0_UI_CM_LI/6_UI_CM_L_LV at Gb7cc2c and LI_AUTO_DOING at Gb7cd12.
Recovered UI_XML_RO row265 has raw SHA256
`74dfa4eeec39861e9402bda905eab6107c26009811a5a04e5c8a8a2ac1d9a6b3`.
LI_AUTO_DOING/UI_CM_LI_CT/BT_CLEAR has no hidden/disabled attribute; the
row root also has no hidden attribute. An ordinary future nonzero row is
therefore eligible for the same button handler as the current row in this
source path. This is source qualification, not a new screenshot observation.

BT_CLEAR handling Gb7dd5c scans the popup's row nodes and matches the clicked
button pointer at node+0x54 (Gb7dda0/Gb7dda4), then captures node+8 row data
at Gb7dde8/Gb7ddee. Its confirmation closure obtains that row's exact serial
at Gb82ad6 and sends it with literal use_iap_qty1 at Gb82aee/Gb82af6.
It does not infer the first unfinished row or check its begin/end time.

## Skip parsing and callbacks do not immediately repair the forecast

ParseAutoCombatSkip G9b9a48 selects list.serial and directly indexes the
existing vector by serial*0x38 at G9b9b92–G9b9b9e, with no bounds check there.
Only returned rows are updated. Each receives the current server time as its
end_utc at G9b9c9c–G9b9cb0; supplied begin/end fields do not replace that
native timestamp operation. Their begin fields and all omitted rows remain.
The tail G9b9fb0–G9ba00c recomputes the derived completion from the contiguous
nonzero-end prefix plus remaining_count*complete_second. A nonzero final-row
end changed to now can consequently dominate an all-nonzero local forecast.

The per-row success callback Gb82bae marks the clicked row done at Gb82bd8,
calls SetResult at Gb82bea, NextAutoCombat(true) at Gb82bf2, and
EndAutoCombat at Gb82c00. It does not request Refresh. NextAutoCombat(true)
uses current server time as the next local UI row begin at Gb80604/Gb80608,
assigns last displayed serial+1 at Gb8065a–Gb80662, and computes end as begin
plus duration at Gb80672–Gb80684 before AddList at Gb806ae. It does not
repair future model RESULT timestamps. Natural row expiry separately issues
Refresh at Gb7d7f4.

Independent ELF vtable resolution confirms CSRPopUpEntrust's primary slot0x70
is SetTextValue Gb7e754 and slot0x74 is AddList Gb7f2cc. The callback's
virtual calls are label/UI updates, not an unseen synchronization operation.
EndAutoCombat Gb80800 checks local displayed-row completion before RequestEnd;
this is not authority to award every server run merely because one was skipped.

## Supported projection and paid boundary

Normal Start, Refresh and mission hydration project rows whose original begin
is later than now to **begin_utc0/end_utc0**, preserving order, serials,
previews and the complete count. Completed rows and the current row retain
their times. The first current end plus remaining-row duration still gives the
same native completion forecast; no stored schedule is rewritten by the read.
This is a supported LOCAL projection justified by the source reader and
sequential UI append behavior. It is not proof that every original server
response always used zero future timestamps.

dispatchSkipMode:'local-manda-all' requires configured local-timed dispatch and
an exact owned active job. Only auth5 plus entrust_id, serial-1, use_iap_qty,
is_tuto0 and is_iap_pass0 are admitted. The captured pass must be expired;
an unexpired supplied pass is not charged through this path. Default mode,
individual serials, client outcome fields and stale/mismatched quotes refuse.

The server recomputes GetSkipPrice's original float32 remaining/rate+1 and
truncation from the **original immutable schedule**, using an explicitly
supplied positive rate. It does not use cached skip_price as the bill or trust
the requested amount. Overflow/sign-domain ambiguity is refused. Free-first
Manda debit, strict quote equality and the supported eligibility horizon are
LOCAL policy; no original spending priority or rate is asserted.

A successful transaction adds DispatchJob.paid_finish containing completed_at
and charged_fee and debits the authoritative wallet once. Schema18 protects
that active captured sidecar from older writers. The original snapshot remains
byte-for-byte equivalent. It grants no gold, EXP, items or AP restoration.
Normal End becomes collectable at completed_at and uses the existing award
planner; settlement and collected-job repair remain separate operations.

Native Skip success itself stamps returned rows at its receipt-time server
clock. Later Refresh/mission hydration uses the captured completed_at as an
absolute end projection for all paid rows, including rows whose original begin
is later. Such an end may precede an original begin; this projection is never
persisted in place of the coherent original schedule. Refresh repairs cache
times but is not an invented wallet synchronization callback.

Every Skip refusal, including auth/default/malformed/duplicate and persistence
failure, must carry **ret_data:null**. ReqAutoCombatSkipCB Gb41328 does not
guard all nonnull failure data by result1; null takes the no-wallet/no-ParseSkip
branch at Gb413e4/Gb41446. Duplicate success is deliberately not replayed:
it would enter native timestamp mutation again. Reconcile current wallet and
cache through their existing reads or cold bootstrap; hot lost-reply wallet
recovery is not claimed automatic.

## Verification boundary

The encrypted HTTP regression uses a disposable three-run job and supplied
rate60: its original450-second forecast quotes8 while cached skip_price is1.
It checks zero future-row projection with preserved derived deadline; default,
auth, per-row, malformed and duplicate null refusals; injected write failure;
one free-first wallet debit/schema18; immutable original schedule and no early
AP/gold/EXP/item changes; captured-time Refresh and modeoff cold hydration;
then ordinary End-only awards and no-additive End repair. P384/HMAC/AES and
exact numeric64 job tokens are exercised. No live policy activation, pass
purchase, native interaction, original-rate recovery or APK change is claimed.

The minimal dispatch-only schema18 fixture also pins its required quests[]
alongside dispatches. Its cold-reload check caught and now guards the missing
higher-cohort array case; a successful Skip that cannot reload is not durable.
