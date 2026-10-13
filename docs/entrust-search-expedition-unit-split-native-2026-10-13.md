# Entrust: Hunter Search outcome versus Expedition duration/fuel

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code coordinates ELF+0x10000. Bounded original Thumb instructions,
resolved literals, symbols and concrete callback RTTI. Server documentation
only; no code, live input/save, APK or original/DataDump changes.

## Hunter Search /explore/Entrust is a compound outcome

CSRFindShardStage.EntrustMission G913f08 constructs exactly nine form rows:
auth5 app_code/app_ver/market/otp/pvid plus owner,type,ref_id,inst_id.
Route literal G91431c is /explore/Entrust; form row count9 G914162.
owner comes from full64 current target PLAY_DATA+18 G914068..4070, type
from target INFO+0 G9140aa..40b6, ref_id from INFO+8 string G9140fa..410e,
and inst_id from target PLAY_DATA+8 full64 G91412e..4134. Resolved field
literals occur G914076, G9140bc, G9140fe and G91413e. All are serialized
as scalar form strings, preserving decimal identities. No selected gold
price, Guild ID, deck, stage ID, count, elapsed time or slot is sent here.

Concrete $_17 inner callable G91da24 comes from vtable VA2146b48, RTTI
VA2146b6c pointing to the EntrustMission $_17 inner function wrapper.
It calls CPVHTTPResponse.GetResultCode G91daee and branches before parsing
unless result1 G91daf4..daf6. Only success selects ret_data G91dafa/dafe,
then begin G91db06 passed to the existing ParseBegin G915d6c at G91db10,
and end G91db16 passed to existing ParseEnd G9167b4 at G91db22. Finally it
returns status plus CSRGameBase.RESULT G91db26..db34.

Successful response shape is therefore:

```text
ret_data: {begin:<normal Search Begin receipt>,end:<normal Search End receipt>}
```

This is not a proved timed expedition job or slot allocator. The callback
reuses inventory/reward/cache settlement parsers; empty acknowledged objects
must not substitute for complete Begin/End outcomes. Current replica's Begin/
End guided-search policy does not prove original automatic battle outcome,
entrust admission, cost, rewards or retry/idempotency. Keep Search Entrust
unavailable until an explicitly supplied complete producer policy exists.

## Ordinary Expedition request is a different route

CSRSyncMStage.EntrustMission Gb3f9dc takes stage string, DECK_CASE enum,
unsigned32 count, byte tutorial flag and status callback. It constructs
auth5 plus stage_id Gb3fb56 (string copy Gb3fb66), deck_type Gb3fb74
(integer-to-decimal Gb3fb6e), cnt Gb3fb9e (unsigned-to-decimal Gb3fb96),
is_tuto Gb3fbb4. Tutorial argument is compared to1 at Gb3f9f4; only exact1
selects string "1", all other byte values select "0" Gb3f9fe..fa08.
The route literal Gb3fcd2 is /mission/Entrust. No client fee, duration,
job ID, reward or slot is sent. Do not merge this with /explore/Entrust.

CSRSceneMStageEntrust.OnButtonClick Ge7b37c loads selected run count scene+680;
Ge7b398 supplies deck_type literal2, and stack argument is_tuto0 is prepared
Ge7b38e..392; Ge7b39a calls this ordinary request. Exact deck2 is proved for
this normal UI caller, not a universal backend deck-enum registry.

## Critical correction: TYPE4 literal150 is seconds, not gold

CSRSceneMStageEntrust.SetCharList Ge794fc finishes its character loop, then
gets Guild singleton Ge7999a, supplies BENEFIT TYPE4 Ge7999e and literal150
Ge799a0 to CalcBonusSaleValue Ga7ff08 at Ge799a2. It stores the adjusted
result at scene+688 Ge799a6. The shared function name alone does not
establish currency. Its downstream actual consumer proves **duration**.

UpdateSlideBar Ge7b6a8 gets current slider count and stores scene+680
Ge7b6c0. Ge7b710..716 forwards r1=scene+688, r2=scene+68c, r3=count to
Calculate through virtual dispatch Ge7b718..726. Calculate's signature is
unsigned32,unsigned32,unsigned32 (G e7b7f4). It:

- multiplies count*r2 Ge7b80e and stores fuel total scene+690 Ge7b81c;
- multiplies count*r1 Ge7b83c, formats with CMTimeToStrOnlyHMS G78d2cc
  at Ge7b844 using "%H:%M:%S", and puts that result in TX_TIME
  Ge7b81a/Ge7b848..84e;
- puts total scene+690 into TX_ST Ge7b8ae..8d0.

CMTimeToStrOnlyHMS itself divides its signed-long input by3600 for the hour
component at G78d2f0..2fe, confirming second units rather than milliseconds.
Thus the source-compatible offline quote is adjusted per-run seconds
CalcBonusSaleValue(TYPE4,150), multiplied by count; separate fuel per run
multiplied by count. Apply the Guild float32/truncation to150 BEFORE count
multiplication. Do not debit150gold or treat this as per-Hunter pricing.

Fuel source is positively selected STAGE data: SetStageInfo calls
CSRGameStage.GetStageData Ga27f60 at Ge78dc6 with the current selected-stage
string, retains that returned pointer in r5 Ge78dca, reads its first word
Ge78e56 and stores scene+68c Ge78e5a. This is separate from the duration.
BT_PLAY_AUTO checks the total+690 against CSRPlayData.CalcTotalAP Gb6c848
at Ge7af04..af2c. Neither duration multiplier nor deck count changes this
fuel-per-run word. No original fuel magnitude is introduced by this audit.

Count ceilings are dynamic: SetSlideView uses GetUserVIPLevel Gb6cc2c at
Ge79cae and supplied perk rows, then available AP/fuel arithmetic around
Ge79eee..9f0e. The inspected slider initialization uses step1 Ge79fae.
No universal run cap or fixed slot count is recovered. A pure offline helper
can preserve unsigned counts while marking positive count/overflow refusal
as local admission; do not invent production count/age/VIP restrictions.

## Ordinary receipt and unresolved timed-job producer

Actual callback is CSRSyncMStage.ReqAutoCombatCB Gb40088. It requires the
outer request status0 and GetResultCode==1 Gb4009e..400aa before decoding.
It reads result_code and ret_data from the body. Optional achievement is
parsed at Gb40186..4019c. It updates local auto_5_days metadata
Gb401ac..401f4, then passes the complete ret_data to
CSRAutoCombatBase.ParseAutoCombatStart G9b896c at Gb4020c.

It reads user.ap as an absolute unsigned32 scalar Gb4021e..402a0 and
user.ap_charge_time as a full64 scalar Gb402a2..402ee, then calls specialized
CSRPlayData.SyncAP Gb6c95c at Gb402fc. This is **not generic SyncUser**;
do not replace these scalars with prev/cur currency objects or infer a gold
debit. Success callback status is passed after the parser/AP mutations.

Bounded initial ParseAutoCombatStart literals already show entrust_id,
stage_id,cnt,complete_second,skip_price,entrust_second_per_cost,list and
list row serial/card_exp (G9b89a4..9b8cda). This note deliberately does not
claim its remaining full row, timing/UTC, ongoing cache, reward/claim or
assignment grammar closed. A timed job cannot be invented from UI duration.
Refresh/Skip/End callbacks are separate native routes and need independent
receipt/admission recovery before a coherent persistent dispatcher.

The concrete available unit is a pure ordinary request/quote helper with
known stage fuel input, Guild TYPE4 duration arithmetic and explicit local
overflow admission. No route activation, AP debit, job creation or rewards
follow merely from that helper. Original server duration production may be
returned separately and is not proven equal to the preview in all cases.
