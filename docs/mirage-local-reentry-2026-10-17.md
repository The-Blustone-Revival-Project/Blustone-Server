# Configured Mirage re-entry and floor choices

The optional Mirage lifecycle can now continue through explicitly supplied
floors and new attempts. The [native choice audit](mirage-reentry-choice-native-2026-10-17.md)
closes GetNextFloor → accept/Stay → GetInfo reset/stay. It does not recover
original assignment formulas, timezone, payment or quota transactions. The
[help/image audit](mirage-reentry-image-evidence-2026-10-17.md) confirms daily
re-entry and deeper/shallower choices; the shop's three resets are separate.

This extension is LOCAL policy. Keep a complete initial
[Mirage policy](mirage-local-run-2026-10-17.md), optionally including
[first-aid prices](mirage-local-first-aid-2026-10-17.md). Supply an additional
`BLUSTONE_MIRAGE_REENTRY_JSON` object, or constructor option
`mirageReentryPolicy`, with exactly:

- `payment:"free-local"`: this configured re-entry does not charge currency.
- `daily_attempts`: explicit integer1..100; **initial entry counts as one**.
- `day_offset_minutes`: explicit fixed offset−840..840 for day boundaries.
- `on_unavailable:"abandon-local"`: no silent floor/price fallback.
- `floors`: complete **additional** policies, excluding the initial floor.
- `transitions`: one `{floor,cleared,failed}` row for every configured floor;
  both destinations must name supplied floors.

The help describes once-daily availability, but does not establish whether the
initial attempt consumes it or the original timezone. The explicit counting,
offset and free-payment choices above must not be presented as recovered law.
This server supplies no average-power formula, automatic floor increments,
new enemies, rewards or paid reset quotes. Missing/duplicate/recursive/malformed
floor definitions and unknown transition targets refuse.

## Complete authoring example

This JavaScript builds two complete JSON objects without starting a server or
touching a save. All gold, balance, enemy selections, progression and transition
choices are authored fixtures. Floor1/21 use the final-help3/6 battle counts.
The original resources are reused; these are not recovered original floors.

```javascript
const enemy = {
  ref_id:"003", hp_percent:10000, rank:3, rank_up_cnt:0, overcome_cnt:0, exp:0,
  skill_1_level:1, skill_2_level:1, skill_3_level:1,
  skill_4_level:0, skill_5_level:0
};
const initial = {
  enrollment:"rank-exp-id-projection", floor:1,
  bg_res:"MIRAGE_BG_G", dlg_begin:"", dlg_end:"",
  res_prefix:"MRG", res_postfix_list:["002"],
  stairs:Array.from({length:3}, () => ({
    grade:0, balance:10000, enemies:[{...enemy}], gold:7
  })),
  hero:{bonus:0, end_ltime:2147483647, cur:[], next:[]},
  revive_prices:[3,5]
};
const deeper = {
  ...initial, floor:21,
  stairs:Array.from({length:6}, () => ({
    grade:1, balance:10000, enemies:[{...enemy}], gold:11
  }))
};
const reentry = {
  payment:"free-local", daily_attempts:1, day_offset_minutes:0,
  on_unavailable:"abandon-local", floors:[deeper],
  transitions:[
    {floor:1, cleared:21, failed:1},
    {floor:21, cleared:21, failed:1}
  ]
};
console.log(JSON.stringify(initial)); // BLUSTONE_MIRAGE_POLICY_JSON
console.log(JSON.stringify(reentry)); // BLUSTONE_MIRAGE_REENTRY_JSON
```

Use configured mode and the prepared `current-e6-mirage` resource profile.
All floors' enemies, static assets, layered backgrounds and hero references
are checked before capture, not deferred until the first transition. A future
floor with an expired cohort cannot be enrolled. Existing captured one-floor
attempts cannot silently acquire a campaign; changed captured base or re-entry
policy refuses startup. A later [explicit terminal-adoption option](mirage-terminal-adoption-2026-10-23.md)
supports finished, fully released one-attempt records while preserving their
old evidence and requiring the native offer/reset boundary. Without that
additional opt-in, the original refusal remains. This is a new explicit configuration, not activation
of the live profile.

## Offer, choice and response loss

`/mirage/GetNextFloor` sends auth only. In this mode it persists an offer bound
to the exact current run, generation and configured day, then returns native
`ret_data.next_floor`. It does not heal, select a party, spend an attempt, pay a
reward or change a wallet. Repeated identical offers do not write again.

The identified native paths all obtain this offer before resetting:

- First choice sends `GetInfo(reset1,stay0)` and accepts the offered floor.
- Second choice sends `GetInfo(reset1,stay1)` and starts again on the current
  floor. Staying is a new attempt and consumes allowance.
- Equal proposed/current floor takes the stay1 shortcut automatically.
- Closing the dialog sends neither reset choice.

A reset requires that current offer and complete cache hydration. A battle,
heal, claim, new day or other run change can stale it; request a fresh choice.
Actual admission rechecks availability, then captures a new ordinary owned
family selection and full HP under the existing LOCAL enrollment policy.
Unclaimed progress is forfeited; earned gold and spent Manda are retained.
The party starts unregistered. New attempt, actual HP, quota and history save
together, with exact rollback on write/rename failure.

A lost reset reply is repaired by returning the **current** snapshot for the
same consumed choice, without another attempt, heal, payment or save. It does
not rewind a party that has since taken damage. A fresh GetNextFloor offer
distinguishes the next admitted choice. The native form supplies no generation
nonce, so this is local reconciliation, not a complete anti-replay authority.

## Daily availability, exhaustion and native clock

Initial entry counts1; further accepted attempts consume the configured limit.
Midnight renews availability but never wipes or heals an ongoing run. Day is
computed with the captured fixed offset, without assuming Windows timezone or
DST. Proposal creation does not spend the next day's allowance. Backward clock
or stale-day choices refuse without changing saved state.

When quota, destination deadline or the supported10000-attempt archive limit
makes the proposed attempt unavailable, an active run offers its current floor
as **abandon-only**. Accepting releases the roster without reward or allowance
consumption. An inactive run instead offers a preserving inspection; it cannot
grant another attempt. This keeps a defeated roster escapable even when all
configured cohorts expire. An expired current floor cannot be selected via Stay
while a different valid destination exists. No fallback invents a floor0.

The [native clock audit](mirage-reentry-clock-native-2026-10-17.md) found that
Retry is hidden until `local_time > begin_ltime + 86400`, independently of the
run's server state. The private journal retains **actual enrollment time**.
GetInfo projects a separate wire value: ready/active-abandon paths use an
already elapsed anchor, while an inactive exhausted daily quota uses the
configured midnight anchor. Native equality still blocks at countdown zero;
an already cached deadline becomes ready one second later. A fresh boundary
read reflects renewed availability immediately. This is explicit LOCAL UI
clock projection, not a recovery of the original server's clock producer.
Legacy active one-floor attempts also receive a ready anchor so the existing
abandon-only retry flow is reachable; they still gain no re-entry allowance.

## Durable history and retained reads

**Schema14** stores `mirageSeries` alongside the current `mirageRuns` entry.
It captures all floor policies, day/usage, generation, global highest completed
floor, compact attempt history, offer and last-choice receipt. History retains
earned claim prefixes and paid first-aid IDs without retaining old ownership
commitments. New attempts reset their own first-aid schedule, without refunding
earlier Manda. Older schema numbers reject this data. Current floor policy must
match the captured series; counters and archive dates must agree.

The current core run keeps its own progress while GetInfo and genuine-friend
reads expose cumulative highest completion. Resetting to an easier floor does
not erase a higher completed record. New ordinary Hunters can join only when
a new attempt is admitted; a falling selected copy is not swapped for a weaker
duplicate midway through the attempt.

Disabling mode and unsetting configuration preserves records and cache reads.
Mutations remain disabled; re-enable matching captured configuration to proceed.
No native UI/device validation or live profile activation has been performed.
Original enemy/balance/reward tables, floor assignment, calendar and payment
rules remain incomplete.
