# Expedition Entrust quote and timed-job boundary

Expedition `/mission/Entrust` and Search `/explore/Entrust` are separate native
features. Search sends owner/type/ref_id/inst_id and parses sibling begin/end
objects as an immediate compound outcome. Its fee, eligibility, reward and
replay laws are not recovered. Do not assign Expedition's price/time to Search.

Expedition's RequestEntrust sends auth5 plus stage_id string, deck_type signed
selector, cnt unsigned count and is_tuto encoded0/1. Its normal UI uses deck2
and tutorial0; the general requester supports its supplied selector. The pure
parseExpeditionEntrustRequest helper retains those domains without authenticating
an account, authorizing a stage/deck or inventing a count/slot limit. Required
fields must be own enumerable data values, with a lossless nonempty stage name.
Canonical numeric form strings or exact in-range numbers are a local subset.

The native base literal150 is **seconds per run**, not gold. SetCharList applies
Guild TYPE4 intrust once to that base, then Calculate multiplies the adjusted
per-run time by count and sends it to the hours/minutes/seconds formatter.
Calculate independently multiplies a stage-derived fuel value by count; the
Play Auto button compares fuel total against AP. There is no150gold debit in
these consumers.

expeditionEntrustQuote provides the original150-second base, existing native
mode1 float32 multiplier/truncation, per-run multiplication placement and a
separate supplied stage-fuel total. A local no-overflow subset refuses totals
outside uint32 instead of wrapping. It reports arithmetic words without
emulating signed HMS formatting for bit31 totals. Zero-count preview and
present-zero benefit are arithmetic cases, not job eligibility or free rewards.
No server completion timestamp, elapsed model or settlement is derived from
the preview alone. Benefit magnitude and stage fuel must be independently
supplied; the helper does not infer them from a wallet or target card.

The real route now refuses with authenticated result2001 instead of the generic
result1 mock. ReqAutoCombatCB positively checks result1 BEFORE parsing the
timed-job body; a refusal skips ParseAutoCombatStart. Successful restoration
needs authoritative entrust_id/stage_id/cnt/complete_second/skip_price/
entrust_second_per_cost/list data and its complete timed-job lifecycle. There
is no fabricated success, empty job, AP debit, reward, gold charge or stage win.
The pure quote/request helpers are not used to synthesize a response.

Focused tests cover the distinct request grammar, original150seconds, multiplier
placement (authored333 gives49seconds/run then147 for3 runs), independent fuel,
zero/absent cases, exact domains, getter refusal and overflow limits. The real
HTTP integration test verifies unauthenticated refusal, authenticated/spoofed
requests and byte-identical saved state. No native inputs, live flags/profile,
private evidence or APK were changed.

Source: entrust-search-expedition-unit-split-native-2026-10-13.md and
hunter-search-reward-entrust-native-2026-10-13.md. The latter also closes Search
Reward as item-only settlement with effective32 item instance IDs, while actual
ownership, quantities and duplicate/replay rules remain missing. Neither route
is declared restored to successful gameplay by this boundary checkpoint.

Complete offline Start/Refresh components and lifecycle refusal guards are now
documented in expedition-entrust-snapshot-workflow-2026-10-13.md. Refresh, End
and IAP also refuse before their guarded native parsers. Skip specifically
requires null data even for authentication errors; a generic failure object
would still enter its native mutation path.
