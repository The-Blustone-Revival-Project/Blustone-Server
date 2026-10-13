# Correct End receipts and native display clocks

expedition-entrust-end.ts decodes the complete nonnull result component of
EndEntrust, independently of generic ret_data.user or achievement. Gold and
user EXP are absolute prev/cur snapshots. Capacity and AP are nested inside
result.user_exp: max_ap prev/cur and ap cur/ap_charge_time. Root result.ap or
root ap_charge_time is the wrong parent. Charge time is effective uint32 for
this callback, despite the wider SyncAP signature and Start clock path.

Card EXP rows retain full64 inst_id with unsigned prev/cur words. The native
SetCardExp setter interprets cur as signed32; the decoder preserves raw word
values, but any future producer must separately admit safe EXP/ownership.
Item rows retain full64 inst_id/ref_id/added inventory deltas. They are not
Start/Refresh/Skip string-encoded occurrence previews. The detached decoder
does not add currency/EXP/items, clear jobs, or create Hunter ownership.
Capture text retains unsafe integer tokens before JS rounding; canonical
nonnegative decimal-string model identities are local storage, not native
wire-string coercion. Missing/null result and incomplete AP parents refuse
rather than silently zeroing current wallet/capacity values.

expedition-entrust-clock.ts follows independently closed display consumers.
Derived completion scans only the initial nonzero end_utc prefix, retaining
the last low32 timestamp, then adds remaining VECTOR LENGTH times signed
complete_second with native word wrap. It does not use cnt as vector length.
Empty lists derive0; all-zero lists derive N*complete_second from origin0,
not from a fabricated now timestamp. Full64 source timestamps remain intact.

Countdown returns -1 when the job ID is0. Otherwise it wraps low32 due-now
subtraction and clamps a signed-negative result to0. ClearCount is separate:
it scans ALL rows, skips end0, compares signed64 end against zero-extended
server-clock word and includes equality. If its count is0 it returns the
entire vector length, including future/zero rows. This surprising fallback
is native preview behavior and must NEVER be used as backend reward eligibility.

The integration/hydration source also identifies /lobby/GetMissionInst as
the separate mission-instance callback chain. Do not invent user.entrust in
/lobby/Enter as its location. Inside the mission parser argument, absence of
entrust skips and preserves job/pass caches. Presence calls Start and then
unconditionally parses entrust.pass; missing/null pass is unsafe. Pass needs
strict end_datetime text and may carry a signed32 UTC override. Original pass
ownership, timezone/producer rules and expiry data remain missing, so no job
or default paid/pass entitlement is published by these helpers.

Tests distinguish correct AP parents/widths, exact64 card/item capture,
absolute versus additive data, non-aliasing and malformed JSON. Clock probes
cover equality, future/all-zero fallback, prefix versus all-row scans, empty
vectors, lowword truncation and wrapped subtraction, plus signed64−1 behavior.
All data is authored offline test input. Helpers are disconnected from live
ServerState/routes and produce no timed job or rewards. Live profiles, inputs,
private state and APK are unchanged.

The full persistent dispatcher remains the next objective. It needs separately
declared or independently recovered stage/deck/slot commitments, pass metadata,
timers, reward amounts and an atomic collection/replay ledger. Correct native
DTOs and display counts do not supply those producer obligations.

Source: expedition-end-result-parents-native-2026-10-13.md and
expedition-entrust-clock-hydration-native-2026-10-13.md.
