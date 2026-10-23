> Update2026-10-23: optional [sequential current-row skips](dispatch-row-skips-native-2026-10-23.md) now use schema19 receipts and replayed compressed schedules under local-manda-sequential. The older local-manda-all mode still refuses individual rows and uses compressed history for mixed whole-job finish. Native UI validation remains pending.

# Optional paid Finish Now for local timed dispatch

Paid Finish Now immediately spends Manda to finish an owned local dispatch;
it does **not** award its captured rewards until normal `/mission/EndEntrust`.
This is deliberate optional LOCAL gameplay. It requires the existing
`BLUSTONE_DISPATCH_MODE=local-timed` and complete explicit dispatch policy,
plus `BLUSTONE_DISPATCH_SKIP_MODE=local-manda-all` (constructor
`dispatchSkipMode:"local-manda-all"`). Default is disabled. Nothing in this
checkpoint activates a launch profile, purchases a pass, grants items or edits
native/private state. No native gameplay validation is claimed.

The original client quote arithmetic is recovered, but the numeric
`entrust_second_per_cost` rate and dispatch rewards remain **supplied LOCAL
data**. The older captured `skip_price` field is a separate native preview
cache value; it is not the authoritative Manda fee. No original rate or reward
table is inferred. See `expedition-skip-price-native-2026-10-23.md` for exact
float32 division/+1 and the important difference from ordinary ceiling.

## Supported request and payment

Only authenticated `/mission/SkipEntrust` with native auth5 and exact
`entrust_id`, `serial:-1`, `use_iap_qty`, `is_tuto:0`, `is_iap_pass:0` is
supported. Context values may use canonical native form strings. The current
account must own the exact ongoing job. Unknown producer fields, noncanonical
values, per-row serials, tutorial/pass flags, a wrong or stale quote, a prior
paid finish and unavailable mode/job refuse. Client pass flags never grant
entitlement. An unexpired captured server-supplied Auto Pass also refuses this
Manda path; expiry equality counts as expired, matching native strict `>`.

The completion time must be within the original active interval
`start <= now < original last end`. Naturally completed work cannot be charged,
even though native zero-remaining quote arithmetic yields1. Admission requires
a coherent supported signed32 schedule/clock and signed32 fee. Both paid and
free Manda components and their sum must fit uint32; wrapping the native funds
sum is refused. Insufficient funds refuses before mutation. **Free-first debit
is explicit LOCAL policy**, not recovery of original server debit order.

Success returns exact current post-debit scalar
`user:{iap_qty,free_iap_qty}`, projected preview `list`, and the original
captured `skip_price`. Skip changes only those actual paid/free balances and
the paid-finish capture. It does not regenerate/debit AP, grant rewards, modify
EXP/roster/stars/equipment, or release committed Hunters. Gold and capsule
collection still run through ordinary End, once.

## Immutable capture, projection and durability

`DispatchJob` retains its normalized original snapshot byte-for-byte. The only
new nested field is `paid_finish:{completed_at,charged_fee}`. Restore recomputes
the quote at that captured timestamp against the **original** schedule/rate
and checks original horizon and pass expiry. It does not compare the timestamp
to the new wall clock or reset the capture during a cold load. Changing a future
configured policy does not retune an existing captured job.

Wire projection replaces every row's `end_utc` with the paid timestamp while
preserving original `begin_utc`, serial, item string and all reward previews.
Future rows can therefore have projected end before original begin. This is
intentional wire behavior consistent with ParseSkip; the projected schedule
must never be written over, or fed into normal schedule restoration in place
of, the original snapshot. Start/Refresh/lobby hydration reconstruct the same
projection after restart.

Ordinary unpaid wire presentation separately zeros future queued row begin/end
to0/0. The native progress builder displays rows only when both are nonzero;
this avoids exposing Skip buttons for future rows. The stored schedule remains
complete. This is an explicit LOCAL supported presentation, not a recovered
claim about the original backend's exact schedule-fill law. See native source
boundary below.

Schema18 is used while any active dispatch contains a paid finish. Header
downgrade, a captured rate/fee mismatch, invalid timestamp/fee or contradictory pass
expiry refuses restoration without rewriting the file. Mode-off cold reads
retain the record, projected completed preview and Hunter commitments. Reenable
ordinary timed dispatch to collect through End; re-enabling paid Skip is not
required. Successful End clears the active paid capture, retains ordinary
last-ID/participant history and chooses the highest schema still required by
other journals (e.g.2 with only dispatch history,17 with a tutorial journal).

Wallet and paid capture persist as one transaction. Real temporary-write or
rename failure restores the entire game and original journal, including nested
inventory references. Skip never has an additive success replay: duplicate
request returns non-success with **ret_data:null** and no further debit or
timestamp movement. Native ParseSkip internally stamps current server time, so
replaying success would not be an inert cache repair. After a lost reply,
reconcile via Refresh and an absolute wallet/lobby read or reconnect before
retrying. Normal End replay repairs current absolute values with an empty
additive item array; it does not grant the captured items twice.

## Native boundaries behind this restricted scope

Final original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra addresses are ELF offsets plus0x10000. Exact requester and unsafe failure
callback are documented in
`expedition-dispatch-skip-end-pass-native-2026-10-13.md`:
ReqAutoCombatSkipCB does not guard application success before reading nonnull
data. Therefore **every Skip refusal, including authentication errors, uses
ret_data:null**. State persistence exceptions propagate; HTTP middleware must
also use explicit null for this route's failure body.

The source UI audit closes the unsupported per-row risk: the progress builder
Gb82ee8 loops all RESULT rows and excludes only those lacking either begin/end
(Gb8311a..124), without a future-begin check. DOING templates expose BT_CLEAR.
Per-row click captures that row's serial and sends literal `use_iap_qty:1`
(Gb82aee/Gb82af6). ParseSkip indexes the supplied serial directly and stamps
that row's end to current server time G9b9cb0, then recomputes the derived
forecast. In a fully future-scheduled local snapshot, skipping the last future
row can collapse the whole-job forecast while earlier rows are unfinished.
No price or authority is inferred from that cache quirk: per-row paid Skip
remains refused. Whole-job serial-1 is the bounded supported operation.

Per-row success also performs clicked-row completion, SetResult,
NextAutoCombat(true) and EndAutoCombat (Gb82bae..Gb82c00), with no Refresh.
NextAutoCombat changes local UI scheduling rather than model RESULT rows.
The restricted whole-job operation does not claim to restore this broader
per-row progression or its original backend fill law.

`EntrustByIAP` is distinct: the native pre-start Auto button chooses that
compound instant path only for an existing unexpired Auto Pass; without one it
requests ordinary timed Entrust. It is not billed with this paid Finish Now
formula. Its separately opt-in pass authorization creates no original pass
acquisition or purchase identity.

## Verification

`npx tsx tests/dispatch-paid-finish-state.ts` uses three disposable accounts,
authored earned-stage/owned-party fixtures and explicit policy. It checks default
disabled mode, auth/context/quote/ownership/payment gates, real write/rename
rollback, wallet-only Skip changes, unchanged original snapshot, schema18,
duplicate null refusal, corrupted/header-downgraded restore, cold mode-off
projection, immediate ordinary End once and schema fallback2. A separate actual
LOCAL tutorial settlement creates schema17 before dispatch; Skip uses18 and End
returns17 with the tutorial journal and peer games exact. No private save or
native account is used. Pure tests separately cover f32 boundaries, U64 IDs,
uint32 funds sums and malformed producers.
