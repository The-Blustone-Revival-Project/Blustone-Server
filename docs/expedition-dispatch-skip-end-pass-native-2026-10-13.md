# Expedition dispatcher: Skip, End, IAP compound outcome and pass expiry

2026-10-13. Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code coordinates ELF+0x10000. Bounded original Thumb instructions,
literal resolution and retained mangled symbols. Server evidence doc only;
no live inputs, saves, jobs, grants, APK or DataDump changes. Companion:
`entrust-search-expedition-unit-split-native-2026-10-13.md`.

## Skip request and critical failure-body exception

`CSRSyncMStage.RequestSkipEntrust Gb40b94` posts **/mission/SkipEntrust**
(Gb40f32), with auth5 and **entrust_id, serial, use_iap_qty, is_tuto,
is_iap_pass**. Mangled arguments are uint64 job identity, signed int serial,
uint32 supplied IAP quantity, byte tutorial flag, callback. All posted fields
are scalar form strings. Tutorial exact byte1 becomes "1", otherwise "0"
(Gb40bba..bc6). is_iap_pass is derived from the client's actual
IsHavingAutoPassIAP cache (Gb40bce..bdc), not an extra caller argument. These
fields do not recover server authorization, allowable serials, paid/free
currency selection or price law.

**ReqAutoCombatSkipCB Gb41328 is unlike the adjacent Start/End callbacks.**
The normal path parses the HTTP response body directly, without an initial
GetResultCode==1 branch. When ret_data is nonnull (Gb413e4..e6), it optionally
parses achievement, reads body.result_code, and then reads ret_data.user.
A nonnull user overwrites `iap_qty` and `free_iap_qty` directly
(Gb41540/Gb41596); missing scalars convert to0. Regardless of result_code,
nonnull ret_data proceeds to ParseAutoCombatSkip G9b9a48 at Gb415a0.

**Safe non-mutating refusal:** explicitly use JSON **ret_data:null**.
Gb413e4 branches to Gb41446 when tag0, reads only result_code, then invokes
the status callback Gb415e4..f2. It bypasses achievement, quantity writes and
ParseSkip. `result_code:2001,ret_data:{}` is not equivalent: ParseSkip can
zero cached skip_price even with a failure code. Its first data mutation
stores parsed skip_price to manager+70 at G9b9ac8. This proves a route-local
null refusal is required; no HTTP transport override is inferred.

## Skip cache receipt is not a wallet/reward grant

ParseAutoCombatSkip G9b9a48 itself skips all mutation on a null argument
(G9b9a62..66). A nonnull object has **skip_price:uint32** and **list[]**.
The inspected row consumers read **serial, user_exp, gold, card_exp**, and
**item**. item is a **strict JSON STRING**, parsed into a JSON collection
(G9b9dac..dd2); each decoded element is a strict reference-ID string
(G9b9e76..e84), accumulated by occurrence (G9b9eae..ed6). It is not the
End receipt's array of inventory AddItem delta objects.

This parser updates automatic-result cache/preview rows, including server
time for completion (G9b9c9c). It contains no inventory AddItem or generic
SyncUser call. Full serial matching/incremental refresh behavior, producer
allocation and skip price law remain unclosed; do not invent a successful
empty list or promote these cached preview values to settled rewards.

## End request, application guard and actual settlement

`RequestEndAutoCombat Gb4177c` posts **/mission/EndEntrust** (Gb419fe),
auth5 plus **entrust_id:uint64 decimal STRING** (Gb418d2..de). There is no
client reward amount, stage selection, elapsed time or complete count.

`ReqAutoCombatEndCB Gb41dc0` first requires outer request status0
(Gb41dd6) and **GetResultCode1** (Gb41de6..dec). Only then does it parse
body.result_code/ret_data. Non1 failure therefore skips all below mutations.
Successful ret_data has:

- optional **achievement**, plus ordinary achievement/lobby synchronization;
- **user**, passed to **generic SyncUser** Gb41ede (nonnull user must include
  authoritative paid/free quantity scalars; null is that parser's early exit);
- **result**, passed to **ParseAutoCombatEnd G9ba0a8** at Gb41efa;
- result **gold:{prev,cur}**, **user_exp:{prev,cur,...}**, **ap:{...,cur}**
  and **ap_charge_time** have further specialized setter/SyncAP consumers;
- result **card_exp[]** uses instance identities and absolute cur EXP,
  applied via CSRInventory.SetCardExp Gae98a0 at Gb42358;
- result **item[]:{inst_id,ref_id,added}** grants actual inventory deltas
  via CSRInventory.AddItem Gaec508 at Gb4251a.

These parent relationships come from `result` retained in stack+18 and the
subsequent indexes, not a presumed generic reward object. Card EXP amounts,
reward quantities, AP capacity/level-up increases and account ownership are
producer obligations still missing here. Do not replace the actual inventory
item rows with Skip's serialized item-reference occurrence list.

ParseAutoCombatEnd clears the ongoing cache **before** its result null check:
G9ba0f0 clears+68; G9ba114 clears+78/+7c; G9ba11a clears+6c; the cached list
is destroyed G9ba124..132; TotalResultClear runs G9ba13a. Null result only
skips filling the new total result at G9ba140..144. Thus success with
`result:null` is still a completion/cache-clearing mutation, not a safe
empty-job read. The parser then builds total-result display data from
gold/user_exp prev-cur, card_exp prev-cur plus inst_id, and item ref_id/added.
Actual Hunter EXP and inventory settlement is in the HTTP callback above.

## EntrustByIAP is a three-phase compound outcome

`CSRAutoCombatBase.RequestAutoCombatByIAP G9bb0cc` posts
**/mission/EntrustByIAP** at G9bb4be. Exact body is auth5 plus
**deck_type:signed int STRING, stage_id:STRING, cnt:signed int STRING**
(G9bb246/25e/28c). It is not normal Entrust's unsigned-count/tutorial DTO.

Original vtable G214aa78, invoke G214aa98 contains ELF9acd11, binding
callback **G9bcd10**. It checks GetResultCode1 at G9bcd30..34 before parsing.
The success path processes sibling ret_data objects:

1. **entrust.data**: optional achievement, user.ap uint32 scalar and
   ap_charge_time full64 scalar → SyncAP G9bce8c, then ParseAutoCombatStart
   G9bcec8;
2. **skip.data**: optional achievement, user.iap_qty/free_iap_qty scalar
   snapshots, then ParseAutoCombatSkip G9bd02c;
3. **end.data.result**: achievement/lobby synchronization, ParseAutoCombatEnd
   G9bd0ae, specialized gold/user EXP/AP handling, absolute card EXP via
   SetCardExp G9bd4f8, item delta rows via AddItem G9bd68c.

No guessed bare-array receipt or empty success can stand in for this
compound outcome. Its original IAP/pass price, maximum count, atomic
producer transaction and lost-response replay policy are not recovered.

## ParseAutoCombatPass is entitlement expiry, not a Pass transaction route

`ParseAutoCombatPass G9ba8e4` first requires **end_datetime:STRING**
(G9ba900..910), parses format **%Y-%m-%d %H:%M:%S**
(G9ba9b4..9c0), uses native time conversion G9ba9da, and stores expiry+98.
If **end_datetime_utc** is nonnull it overrides that same field using
effective signed32 scalar conversion (G9ba9e8..9baa3c). Missing text is not
a proved safe default merely because an integer override exists.

A positively recovered caller is CSRPlayData.ParseMissionInfo's optional
**entrust** branch Gb69222..3c: it passes entrust to ParseAutoCombatStart,
then **entrust.pass** to ParseAutoCombatPass at Gb69260. A bounded direct-BL
scan found this one direct caller; this is not a global absence claim about
indirect or PLT calls. No standalone /mission/Pass route is established.
Pass expiry is separate from per-run seconds, AP fuel, gold and card EXP.

## Concrete next boundary

Safe refusals can now replace generic successful mocks for exact recovered
routes, with **SkipEntrust's explicit null body** preserved. Start/End/IAP
application guards independently support normal non1 refusal. This evidence
does not enable timed jobs, currency debits, completion or reward grants.
Complete original cache/reference providers, clocks, serial eligibility,
assignment/lock rules and durable producer/replay law remain necessary for
a real automatic-dispatch lifecycle.
