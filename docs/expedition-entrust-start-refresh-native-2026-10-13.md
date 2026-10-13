# Expedition Entrust start/refresh: exact snapshot and cache contract

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra coordinates ELF+0x10000. Direct bounded original Thumb instructions,
resolved literals and exported symbols. Follow
entrust-search-expedition-unit-split-native-2026-10-13.md for the separate
Search route and150-second duration correction. No routes/jobs/rewards/live
inputs/save/client/original/DataDump changes are introduced by this note.

## Complete Start field grammar

CSRAutoCombatBase.ParseAutoCombatStart G9b896c receives the ordinary
/mission/Entrust callback's **complete ret_data object**. Canonical grammar:

```text
{
  entrust_id: <exact64-bit integer word>,
  stage_id: <string>,
  cnt: <int32>, complete_second: <int32>,
  skip_price: <uint32>, entrust_second_per_cost: <uint32>,
  list: [{
    serial: <int32>, card_exp: <int32>, user_exp: <int32>, gold: <int32>,
    begin_utc: <exact64-bit integer word>, end_utc: <exact64-bit integer word>,
    item: <JSON STRING encoding an array of item-ID STRINGS>
  }, ...]
}
```

This is typed shape, not original populated data. Preserve full64 tokens
without JavaScript rounding; canonical nonnegative uint64 admission would be
explicit local policy beyond native legacy integer/string/double coercions.
The native integer paths copy full64 bits for id and UTC values, not uint32.
An unsigned request cnt does not change the **signed response cnt** conversion.

Exact key and conversion evidence:

- entrust_id G9b89a4: integer LDRD G9b89c6, STRD manager+78 G9b89ee.
- stage_id G9b89f4, strict string conversion G9b8a04; stored manager+80.
- cnt G9b8a40, signed conversion G9b8a80, store manager+68 G9b8a92.
- complete_second G9b8a98, signed G9b8ad0, store+6c G9b8ae2.
- skip_price G9b8ae8, unsigned G9b8b20, store+70 G9b8b32.
- entrust_second_per_cost G9b8b38, unsigned G9b8b70, store+74 G9b8b8e.
- list G9b8bb0: indexed iteration G9b8bfc..8c38. Each RESULT is0x38bytes.
- serial G9b8bea, signed conversion G9b8cbe; card_exp G9b8cda/G9b8d12;
  user_exp G9b8d2e/G9b8d66; gold G9b8d82/G9b8dba, all signed32.
- begin_utc G9b8dd6: LDRD G9b8df6, stack pair G9b8e1c; end_utc G9b8e2a:
  LDRD G9b8e4a, pair G9b8e74. Row offsets are+10/+18 respectively.

Native row iteration also counts object collections, but indexes them with
numeric JSON array subscript. A supported canonical array avoids pretending
object field names are row indices. No source sorting/dense-serial correction
is performed: RESULT vector push/copy preserves supplied wire order
G9b9088..90ce. Strict complete fields, arrays, nonnegative counters, sensible
serials/clock order or supported identities are local admission conditions;
they are not recovered original producer rules.

## Item previews count repeated IDs, not inventory grants

Start selects row.item G9b8e86, **strict string conversion G9b8e98**, then
JSON.parse G9b8eae. Decoded entries are each strictly converted to string
G9b8f58. A per-row string-keyed map counts repeated IDs: lookup G9b8f60,
existing quantity+1 G9b8f84..88, first quantity1 G9b8f8c, store G9b8faa.
The map is copied into RESULT's item vector G9b900c..905c.

Canonical wire item is therefore a JSON string such as an encoded string
array; it is NOT a direct array, not a JSON string of {id,qty} records, and
not generic SyncItem's instance receipts. Encoded empty array "[]" parses
as empty preview; empty string still reaches JSON.parse and is not a proved
empty-list shortcut. Decoded generic object values are also iterable, but
array-only admission is a supported local subset. No reward magnitude or
owned inventory debit/grant is derived merely from these previews.

## Start preservation versus explicit reset

Start returns immediately when its input is JSON null G9b898c..8990. It
also returns **without parsing any supplied fields** when cached full64
entrust_id+78 is already nonzero G9b8996..899c. This is not a replacement
snapshot parser over an existing active job. A new id cannot overwrite an
old job through this function alone.

When input is nonnull and existing id is zero, Start writes selected scalars
then destroys previous RESULT objects and sets vector end back to begin
G9b8b86..8bb2, before reading list. Consequently an empty/missing/null list
at that branch leaves zero result rows; missing stage_id remains unsafe for
strict string conversion. Do not claim a partial Start object preserves an
inactive historical result cache.

CSRAutoCombatBase.AutoCombatClear G9b8840 explicitly zeros cnt+68,
complete_second+6c, full64 id+78, empties stage+80 and clears RESULT vector
G9b8850..8894. This bounded function does **not** zero skip_price+70,
entrust_second_per_cost+74 or derived completion+9c. Remaining stale scalars
must not be called a fresh authoritative job after id is cleared. The public
completion getter checks id before using them.

## Refresh producer, callback and complete delta grammar

CSRSyncMStage.RequestRefreshAutoCombat Gb403b0 takes unsigned64 entrust_id
and status callback. It serializes auth5 plus scalar decimal entrust_id
Gb4050c; route /mission/RefreshEntrust is literal Gb40632. No stage, count,
row selector, price, duration, clock or reward fields are in this request.

ReqAutoCombatRefreshCB Gb409f4 guards outer request status0 Gb40a0a and
CPVHTTPResponse.GetResultCode==1 Gb40a10..16 before decoding. It selects
ret_data Gb40ad6, checks nonnull Gb40ade..ae2, then calls
ParseAutoCombatRefresh G9b9354 at Gb40aea. This callback does not call
generic SyncUser, SyncItem or settle Hunter EXP/gold. Returning successful
reward previews alone is not a completed collection transaction.

Canonical Refresh object:

```text
{
  skip_price: <uint32>, entrust_second_per_cost: <uint32>,
  list: [{serial:<int32>, begin_utc:<exact64>, end_utc:<exact64>,
          user_exp:<uint32>, gold:<uint32>, card_exp:<uint32>,
          item:<same JSON STRING string-ID array>}, ...]
}
```

Note the positive source difference: refresh's EXP/gold conversions are
unsigned, while Start uses signed conversions. Refresh quote keys
G9b937c/G9b93bc and G9b93c8/G9b9414 overwrite+70/+74 without optional
existence checks. Missing values take native conversion zero. Input null
returns without updating G9b936e..9372.

Each selected serial is signed32 G9b9440/G9b94ee, but bounds comparison is
**unsigned** G9b94f6..9502 against existing RESULT vector length. A serial
outside the existing vector, including a negative word, is skipped before
reading that row's remaining fields. Accepted serial indexes vector[serial]
directly; it does not search for a matching stored serial. It writes that
serial at the indexed row's+0 G9b950c. No append or resize occurs.

begin_utc/end_utc copy full64 into indexed RESULT+10/+18
G9b951a..956c/G9b957a..95d2. user_exp G9b95da/G9b961a stores+8;
gold G9b9638/G9b969c stores+c; card_exp G9b96ba/G9b96fa stores+4.
That selected row's prior item vector is cleared G9b970c..9734 before
strict item string conversion G9b9748..975a and JSON.parse G9b9774.
Repeated IDs are counted again G9b9826..9878; the grouped vector is rebuilt.

An empty/missing/null Refresh list does **not clear the existing RESULT
vector**. Rows absent from the refresh remain intact. Matching rows' supplied
previews/times are replacements, not additive amounts; duplicate serials
would overwrite the same row in iteration order. A strict local decoder
may refuse duplicate/out-of-range serials and require expected job identity,
but no captured server nonce/idempotency or correlation rule is inferred.

## Clock interpretation and bootstrap/cache readers

After Start, derived completion word manager+9c is calculated
G9b9146..91a6. It scans RESULTs until the first end_utc==0, remembering the
last prior nonzero end_utc LOW WORD, counts those completed/scheduled rows,
and adds max(0,totalRows-count)*complete_second with native32-bit MLA.
CalculateAutoCombatUTC G9b92f8 repeats the same operation; Refresh tail
G9b9958..99ac also recomputes it from retained/updated rows.

GetTotalCompleteTimeUTC G9badd4 checks full64 job id; zero id returns−1
G9bae38. With a job it reads+9c G9badf0, obtains
CGMTime.GetCurServerTime G797628 at G9bae2a and returns
max(0,derivedCompletion-currentServerTime) G9bae2e..32. These UTC words
therefore belong to the absolute server-time domain, not milliseconds since
receipt or per-row relative duration. Seconds align with the earlier HMS
duration consumer. **Only the low32 end_utc word participates in this
particular countdown calculation**; preserve full64 wire values rather than
silently narrowing stored snapshots. This does not recover original server
timestamp production, clock jump, start-row zero rules or actual duration.

A bounded direct BL scan found another snapshot hydration consumer:
CSRPlayData.ParseMissionInfo Gb68934 optionally checks its argument's
entrust key Gb6922a..234, selects it Gb6923a/3c, and calls Start Gb69248.
It separately passes nested entrust.pass to ParseAutoCombatPass Gb69256..260.
Missing entrust skips this hydration. The precise enclosing lobby/reference
producer and pass schema are separate contracts, not invented in this note.

## Actionable boundary

Pure offline complete Start and indexed Refresh DTO decoders are possible,
including exact64 capture and detached string-encoded previews. They should
state canonical/local admissions and keep original wire ordering. They do
not authorize dispatch or settlement. A real producer still needs stage/deck
eligibility, available slots/ongoing commitments, authoritative timer/rows,
AP debit/time receipt, collect/end/skip behavior and persistent replay policy.
Keep /mission/Entrust non-success until those commitments are represented;
do not publish guessed jobs, empty active arrays or automatic reward grants.
