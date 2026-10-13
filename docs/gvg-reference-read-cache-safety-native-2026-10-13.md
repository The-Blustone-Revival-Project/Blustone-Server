# GvG GetRef read/cache safety and exact reward interval selector

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code convention ELF+0x10000. Bounded direct original instructions,
request-installed callback vtable and exported symbols. Server source note;
DataDump read-only, no live/code/state/reference activation.

## Existing GetRef failure does not parse or replace reference tables

CSRGuildBattleMgr.RequestRef Gaa25cc sends auth5 app_code/app_ver/market/
pvid/otp to /gvg/GetRef Gaa28c0. No ordinary Guild ID, battle registration,
realm/table selector or instance is serialized. The force-like bool argument
influences native request/cache logic, not an additional form field.

Its installed inner vtable2150594 callable Gabbf84 reads response PVCode
Gabbfa6, compares with1 Gabbfac and branches to caller status on non1
Gabbfae→Gabc03c. Only result1 finds envelope.ret_data Gabbfe2/Gabbfe4 and
passes it to BATTLE_INFO.parse Gabc038. Thus normal result_code2001 from the
existing server safely skips GetRef table parsing; malformed/missing default
success rows must not be substituted. CSRSyncRef's independent reference
bootstrap callback likewise guards result1 before ParseRef.

This differs from GetInst's fresh personal cache replacement documented in
gvg-entry-instance-cache-native-2026-10-13.md. Do not generalize one callback's
status/cache behavior to the other route.

## Client cache can skip a new HTTP read

RequestRef preflight may call Init Gaa25fe when a game-data flag is set and
manager+d4 is notready, and sets+d4 to1 Gaa2612. The inspected Init builds
its listener/UI timing plumbing; no BATTLE_INFO+50 clearing was established.
This readyflag observation is not evidence that a failed GetRef replaced tables.

It separately loads cached next_gvg_dtm+80 and timejump+e0 Gaa2618..1c,
subtracts jump Gaa2628, gets current server timestamp Gaa2656 and compares
signed Gaa265a..5c. If cached next_gvg−jump is STRICTLY FUTURE, it calls
the requester with status1 Gaa2668..2672 without an HTTP request. Otherwise
normal HTTP construction follows. Replacing a server's configured reference
does not guarantee an immediate native refresh through RequestRef; no expiry
or forced-season workaround is invented here.

## Exact ordinary reward selection: signed first-match half-open interval

CSRGuildBattleMgr.GetCurRewardInfo Gab2190 takes int CP and reads the regular
reward shared-pointer vector at manager+84/+88. Empty check precedes row
dereference Gab219e..21a0. It scans supplied order, advancing8bytes per row
Gab21ac. Row min_cp is compared SIGNED at Gab21ce/Gab21d0: if min>CP skip.
Row max_cp is compared SIGNED at Gab21d4/Gab21d6: return if max>CP.
The interval is therefore exactly min_cp<=CP<max_cp, FIRST matching row.

No max_cp−1 branch exists. For nonnegative CP, a max−1 row never matches;
for negative CP it follows ordinary signed comparison. Do not describe−1 as
an open-ended tier, default last reward or proof of original payout policy.
Equal max is excluded; equal min included. Overlapping ranges remain wire-order
dependent. Empty/end/no-match writes both return shared-pointer words0 at
Gab2208..220c, not the last row or a synthesized zero reward.

GetNextRewardInfo Gab2214 independently guards empty vector Gab2224..26;
it must not be inferred by sorting thresholds or changing the current selector.
The ordinary result UI calls GetCurRewardInfo at Gc8021a. A null-safe getter
does NOT prove every downstream popup dereferences its result safely.

## Configured read capability and remaining scene gate

The complete pure parser src/gvg-reference.ts already validates corrected
ret_data siblings gvg/reward/inf_reward/point/camp, strict string-encoded reward
lists and camp links, exact numeric domains, known reward joins and graph
coherence. A realm-keyed immutable authenticated publication could hydrate
these supplied references without enrolling a player, granting any reward,
creating an enemy, editing a schedule or modifying saves. Realm selection is
local admission from the authenticated account, not a native client field.

However, COMPLETE NATIVE SCENE MINIMUM REQUIREMENTS REMAIN UNCLOSED: this
bounded source does not prove empty regular reward list, fewer than2 inf slots,
empty camp graph or particular point subsets safe for the entire entry/field/
reward UI. No arbitrary nonempty row count, camp IDs, CP coverage or schedule
should be invented as a universal scene-safety validator. The original table
values remain missing. Keep route activation gated when it would advertise
unknown scene safety; a valid offline DTO is not a demonstrated restored GvG
screen. Offline signed reward selectors can still advance precise semantics
without enabling that route, season, battle or claim.
