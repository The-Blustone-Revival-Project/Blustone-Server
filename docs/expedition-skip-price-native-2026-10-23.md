# Native Expedition skip quote producer

`src/expedition-skip-quote.ts` closes the actual final-client quote arithmetic
without supplying an original rate, pass or paid transaction. No runtime,
profile, save, wallet, reward or native UI was changed. The existing dispatch
workflow remains separately configured LOCAL content.

Read-only original ARM library in DataDump
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra addresses below are file/ELF offsets plus0x10000. Bounded original
Thumb/NEON-VFP instructions were inspected with Capstone.
`sources/native/symbols/native-evidence.tsv:11308` identifies
`CSRAutoCombatBase.GetSkipPrice` **G9bacc8**.

## What GetSkipPrice actually computes

This routine is **not** a getter of the cached server `skip_price` at+70.
It does not read+70 in the inspected complete body G9bacc8..9badcc.

1. Read the RESULT vector+8c/+90 and derive its count (row stride0x38).
   Iterate the initial contiguous prefix whose full64 `end_utc` at row+18 is
   nonzero (G9bad02..9bad1e), retaining the latest prefix end's low32 word.
2. Compute remaining rows as `max(count-prefix,0)` using a signed clamp
   G9bad26/G9bad32. Add remaining rows times signed `complete_second`+6c
   to the retained low32 end using native wraparound multiply-add
   G9bad36. Store this **derived end word** at manager+9c G9bad3a.
3. If unsigned `entrust_second_per_cost`+74 is zero, return0
   G9bad3e/G9bad96. This is native preview behavior, not a free entitlement.
4. With a nonzero full64 current job identity+78, subtract server time's
   low32 word G9bad7e/G9bad82, then clamp negative signed32 differences
   to0 G9bad84. Convert this nonnegative signed32 dividend to float32
   G9bad88/G9bad8c. With **no job**, use float32 **-1** instead G9bad9a.
5. Convert the unsigned denominator to float32 G9bad9e/G9bada2; divide
   float32 G9bada6; add float32 **1** G9badaa/G9badae; convert to uint32
   toward zero G9badb2/G9badb6. The pure projection preserves ARM unsigned
   saturation, though valid bounded snapshots keep this computation finite.

For an active job in a safe horizon, the operational formula is
`uint32(f32(f32(f32(remainingSeconds) / f32(rate)) + 1))`.
It is **not generally ceil(remainingSeconds/rate)**: zero remaining yields1,
and exactly100 seconds at rate100 yields2. At large integer boundaries the
float32 rounding of both conversion and addition matters. No-job -1 normally
converts to0 after division/+1; for a sufficiently large denominator the
addition rounds to1. That placeholder is not paid authorization.

`entrustNativeSkipPrice(job,serverWord)` returns `{price,derivedEndWord}`.
It represents initialized native state with the existing canonical complete
`EntrustStart` structure; missing/malformed input refuses rather than inventing
state. Zero-rate, empty-list, no-job and wraparound states are projected for
source comparison. It does not mutate the input or write manager+9c.

`admitEntrustSkipQuote(job,serverWord)` is a separate conservative LOCAL paid
subset: actual nonzero job; positive duration/rate; a nonempty fully scheduled
list with increasing nonzero signed32 ends and begin<=end; current clock in
signed32 UTC horizon; derived end equal to last scheduled end; fee1..INT32MAX.
This deliberately refuses native wrap/clamp placeholders as paid authority.
Ownership, exact serial admission, configured rate, quoted request amount,
funding, pass entitlement, reward capture and atomic persistence belong to the
transactional caller. No pass is granted or inferred by either helper.

## Rate and pass evidence still missing

Start's parser stores `complete_second`+6c, server `skip_price`+70 and
`entrust_second_per_cost`+74 independently: G9b8ae2/G9b8b32/G9b8b8e.
Thus the numeric rate is a supplied server field, not a recovered hardcoded
constant. Current local timed dispatch already captures an explicitly authored
rate; that may be projected, but may not be renamed an original price law.

Image-extracted evidence under DataDump
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`
includes actual Auto-combat Progress quotes:

- `batch-21.tsv:44`, idx1043: remaining01:04:31, per-row Skip1,
  Finish Now16.
- `batch-26.tsv:21`, idx1270: remaining00:14:27, Skip1, Finish Now15
  (medium transcription confidence).
- `batch-37.tsv:17`, idx1816: remaining00:12:12, Finish Now3;
  `batch-37.tsv:44`, idx1843: remaining00:08:46, Finish Now6.
- `batch-42.tsv:34`, idx2083, filename2017-08-23: remaining03:07:54,
  per-row03:54/Skip1, Finish Now47.
- Other captures contain implausible long clocks or zero Finish Now labels;
  those are not permission for free paid completion.

These observations do not establish one exact denominator or a coherent
cross-version/stage rate. Do not derive a universal rate by rounding a single
time/price pair. `batch-17.tsv:26/27` idx825/826's10-Manda wait skip explicitly
concerns joining another Captain's **Search** and must not price
`/mission/SkipEntrust` or `/mission/EntrustByIAP`.

Pass source is a distinct expiry entitlement: `IsHavingAutoPassIAP` G9b86e0
compares manager+98 against server time. `SetLimitAutoPassIAP` G9b87c4
computes now plus manager+a0 times86400 (G9b8814..9b8822). This identifies a
duration-in-days use, **not** its original item ID, offer price, purchased day
quantity or ownership. Original pass acquisition input remains unknown.

Targeted web searches for Blustone paid/instant dispatch yielded no reliable
original rate/table/clip timestamp. The strongest next closure is the native
per-row/Finish-Now caller and pre-start `CSRSceneMStageEntrust.Calculate`
G e7b7f4 plus `CSRPopUpEntrust.SetManda` G b7ea50: determine whether their
quotes use this manager rate and how their selected serial/count is captured.
Do not borrow Search wait prices or invent a pass item in the meantime.

## Verification

`npx tsx tests/expedition-skip-quote.ts` covers exact divisibility/zero,
float32 boundaries, unsigned denominator conversion, no-job rounding,
zero-rate, contiguous-prefix reconstruction, native lowword overflow/signed
clamping, unused cached skip_price, strict paid refusal of unsupported states
and exact input preservation. These are arithmetic/contract checks, not a
native paid-dispatch or reward claim. Earlier request/compound receipt and
safe-null refusal boundaries remain in
`expedition-dispatch-skip-end-pass-native-2026-10-13.md`.
