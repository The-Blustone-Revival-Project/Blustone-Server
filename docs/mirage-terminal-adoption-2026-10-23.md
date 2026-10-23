# Repeatable Mirage after a finished single-attempt trial

An explicit terminal-adoption option lets a completed or abandoned one-attempt
Mirage record enter the existing configured re-entry lifecycle. It preserves
that old attempt, its actual timestamp, earned claims, outcome, first-aid
history and highest completed floor. It does not retune or erase the old run.
The default still refuses adding a re-entry policy to an uncaptured old run.

This addresses the single-attempt trial's dead end using the recovered native
GetNextFloor → reset/stay protocol. Quota, day boundary, free payment, floor
choices and subsequent enrollment remain explicit LOCAL policy. It does not
recover original Mirage balance or prove another native win.

## Explicit setup

Keep the matching base recipe and reviewed170-package profile. Supply both
the re-entry policy and the additional adoption opt-in:

```powershell
$env:BLUSTONE_MIRAGE_MODE = 'local-configured'
$env:BLUSTONE_MIRAGE_POLICY_JSON = Get-Content -Raw 'config/policies/mirage-local-zero-reward.json'
$env:BLUSTONE_MIRAGE_REENTRY_JSON = Get-Content -Raw 'config/policies/mirage-local-zero-reward-reentry.json'
$env:BLUSTONE_MIRAGE_REENTRY_ADOPTION = 'terminal-local'
```

The new public re-entry recipe offers the same floor after either outcome,
with three total attempts per UTC day. Initial enrollment counts as one.
Those choices are authored; they are not inferred from Rupee shop limits,
historical reset prices or the game's original once-daily wording. All three
stairs, opponents, balance and zero rewards stay exactly as captured in the
base recipe. Additional floor policies can be supplied through the existing
re-entry configuration, subject to its strict reference/resource validation.

For the retained validation profile, preserve its other explicit settings:

```powershell
$env:BLUSTONE_RUPEE_SHOP_MODE = 'archive-2021-base-only'
$env:BLUSTONE_RUPEE_SHOP_DAILY_LIMIT = '3'
node scripts/start-local.mjs --profile current-restoration-fever-compatible-progression --team-level-profile local-linear-100 --resource-snapshot --recruit-card 049 --state-file var/state.json
```

The constructor option is `mirageReentryAdoption:'terminal-local'`; omission
or `'disabled'` retains the old refusal. Unknown values or adoption without
configured Mirage plus a complete re-entry policy refuse before loading an
attempt. No new default profile is selected by this feature.

## Admission and capture boundary

Every old run lacking a series must be a normalized terminal run on the exact
configured initial floor, with empty entry and deck and every currently owned
Hunter released at HP1000. An active battle, pending reward, unrepresented carry,
changed base policy or unsupported future floor cannot be adopted. The clock
must not precede the original enrollment time. Already captured series keep
their existing exact policy binding; this flag cannot override it.

Construction validates a provisional series without storing it in the map or
rewriting the save. Ordinary GetInfo can project the source-backed Retry clock
from that provisional value, but still captures nothing and changes no HP.
The original run timestamp remains intact. A fresh native base-section read
is needed for a changed wire deadline; already cached UI is not proof of it.

Only an authenticated `/mirage/GetNextFloor` captures the series and its exact
run/day/generation-bound offer together, in one existing atomic persistence
operation. Schema12/13 becomes14, or a later existing cohort schema is retained.
The current run, accounts, wallets, cards and unrelated games remain unchanged.
Repeated identical offers do not rewrite the file. A failed write/rename leaves
neither a captured series nor a partial offer in memory or on disk.

The adopted run is generation1, history is empty, and usage is one on the day
of its **actual old enrollment**, not the adoption day. This represents the one
known retained attempt; it does not invent older missing attempts. A completed
run retains its earned highest; an abandoned run does not become a completion.
No separate adoption-time history is asserted.

Reset without a persisted offer refuses, including for an inactive old run.
Accepting the current offer through normal native reset/stay creates the next
attempt with the existing owned-family selection and full starting Mirage HP.
That is the deliberate new-attempt boundary; no Hunter, EXP, gold or item is
granted. Quota and the archived old attempt save with the fresh run. An identical
lost-response reset returns the current snapshot, including damage incurred
after that reset, rather than healing or enrolling again.

Quota is counted from original timestamps. If today's sole allowed attempt
was already used, adoption cannot make another available. A later configured
day renews availability normally. Exhausted active runs retain the existing
abandon-only exit; abandoned/completed records remain distinguishable in history.

The opt-in may be removed once every applicable old run has captured a series.
If an uncaptured old peer remains, startup with re-entry configured and adoption
disabled still refuses for that peer. Disabling Mirage preserves captured series,
carry and holds; remove incompatible configuration environment values together
when selecting disabled mode. Keep the matching references/resources for any
retained journal. Disabling a feature is not a roster-release operation.

## Verification boundary

`npm run test:mirage-terminal-adoption` builds and runs pure policy, state and
actual compiled encrypted HTTP checks on disposable local accounts. They cover
both terminal outcomes, original quota day, no-write construction/reads, a real
dummy Rupee purchase, schema12→14 coexistence, atomic offer/reset rollback,
same-floor full hydration, duplicate reset after later damage, strict policy
and future-reference rejection, restart and disabled-mode preservation.

The HTTP child uses an ephemeral loopback port, signed P384 key exchange and
AES/HMAC transport. Supplied End packets are test reports, not native combat.
The broader server suite also passed with the new state test included.
The unchanged legacy re-entry encrypted HTTP regression passed separately.
A PRIVATE COPY of the actual schema12 save also loaded under the matching170
profile, Rupee policy and team curve with adoption enabled: GetInfo returned
the terminal cache while the captured-series map stayed empty and both the
copy and live source bytes remained exact. That is configuration/read proof,
not a native offer/reset or a live journal migration.
Native adoption/re-entry, another full-floor attempt and a win remain pending;
the earlier native trial's two wins and final defeat are unchanged facts.

No live configuration, journal or private save was edited to implement/test
this feature. No active server restart, APK patch/rebuild/install/release,
DataDump/original asset, phone, Docker or collector change was required.
