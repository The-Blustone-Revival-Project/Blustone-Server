# Automatic-combat snapshot decoding and lifecycle refusal shapes

The dispatcher now has complete offline job-component Start and Refresh DTOs
in expedition-entrust-snapshot.ts. Inputs are the known job fields, not a whole
HTTP envelope: outer user/AP/achievement/pass branches require their own
parsers. Strict complete-field admission refuses partial/unknown sections;
it does not emulate native missing numeric values turning into zero.

Start retains full64 entrust_id and begin/end timestamps, stage string,
signed cnt/complete_second and signed preview serial/card_exp/user_exp/gold,
plus unsigned skip_price/entrust_second_per_cost. Refresh uses the same exact
timestamp storage and signed serial but unsigned EXP/gold previews. Capture
JSON helpers preserve unsafe integer tokens before JavaScript rounds them.
Canonical nonnegative decimal-string model storage is a local supported subset;
it does not emulate native string/float coercions or serialize a response.

Item previews are a JSON STRING containing reference-ID strings. Occurrences
count duplicates; grouped counts use native lexical UTF8 byte ordering rather
than first occurrence or locale sorting. The raw JSON string and row order
remain unchanged. These counts are preview metadata, not inventory receipts.

The offline reducers follow source cache behavior over complete supported
components. Start ignores null and any incoming data while a nonzero job
already exists; it does not replace that job with a foreign/partial snapshot.
Refresh serial addresses an ARRAY INDEX, not an owned Hunter identity or a
match against the old row's serial. Rows outside bounds are ignored, none
are appended, omitted/empty-list rows remain intact, and repeated indexes
replace in iteration order. Supplied values replace previews rather than add.
All returned snapshots are detached. Reducers never join to owned cards,
debit AP/Manda, settle EXP/gold/items, or authorize a producer.

Original timestamps belong to server-time seconds. The native derived
completion/countdown uses only the low32 end word and remaining-row duration;
full64 parsed values must still be preserved. No clock calculation, job
creation, elapsed completion or original reward production is enabled by
the DTOs. Native AutoCombatClear also leaves some quote/derived scalar fields
behind; absence of a job ID must not be reinterpreted as an authoritative job.

The Start/Refresh/End/IAP routes now authenticate and return result2001 before
generic mock success. Their actual callbacks check result1 before parsing
timed jobs or rewards. Skip is different: its normal callback can parse a
failure body's data and overwrite cached skip/Manda values. It now returns
ret_data:null and data:null for both authenticated refusal and NativeAuthError.
That source-proven null branch bypasses job and wallet mutation. A plain
failure object is not interchangeable with null for this route.

Real loopback HTTP tests cover every lifecycle route, absent/wrong credentials,
forged receipt fields and failed secure decoding with an unknown fixture
transport key. Refusals preserve the complete saved state byte for byte.
Offline tests cover exact64 capture, signed/unsigned distinctions, encoded
item grouping, active-job protection, indexed replacement/retention/no append,
duplicate ordering, detached values and strict JSON admission.

Successful dispatch still requires independently established stage/deck
eligibility, slots/commitments, persisted timers/results, authoritative AP
and completion receipts, replay policy and reward production. No local timed
job or reward law was fabricated here. No live input/profile/flags/save/APK
changed; both snapshot helpers remain disconnected from ServerState.

Source evidence: expedition-entrust-start-refresh-native-2026-10-13.md and
expedition-dispatch-skip-end-pass-native-2026-10-13.md. The pass reader is a
lobby expiry consumer; EntrustByIAP is an independent compound Start/Skip/End
outcome and must not be mistaken for a generic pass endpoint.
