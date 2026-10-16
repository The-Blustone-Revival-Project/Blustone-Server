# Mirage End: report decoder and bound carry transition

Continuation2026-10-17: these codecs now support the optional configured local
run described in [Mirage local run](mirage-local-run-2026-10-17.md). Historical
statements below about absent runtime integration are superseded for that
explicit mode; original assignment/economy and native scene validation remain
incomplete.

`src/mirage-end.ts` implements a pure transition toward a persistent Mirage
run. It does not enable `/mirage/End`, enroll Hunters, import a run, grant a
reward or publish a new cache. The existing runtime preserving refusal stays
in place. Native request/receipt evidence is in
[the End audit](mirage-end-carry-transition-native-2026-10-14.md).

`parseMirageEnd` accepts native floor/stair scalar fields and JSON **strings**
`remain_deck_hp` / `remain_enemy_hp`. Player rows have exact `inst_id` and
`hp_percent` fields. Numeric uint64 tokens remain exact through parsing;
quoted IDs, malformed/floating/exponent tokens and duplicate identities refuse.
Positive signed32 floor/stair, five actors per camp and normal HP0..10000
are supported LOCAL bounds, not every native coercion or possible overheal.

`planMirageEnd` first requires the complete active cache and independently
supplied owner/commitment/resource/hero context. The report must name that
exact floor/stair, every selected owned participant once, no reserve or alien
IDs, and exactly the cached enemy count. Mere card inventory or historical
HP1000 never creates enrollment. A full64 foreign ID can decode correctly
and still fail owner binding.

Native OnFinish zeros the losing camp. This planner admits exactly one camp
with surviving HP: surviving players mean state2/reward-ready; surviving
enemies mean state1/retry. Those server outcome/transition choices are explicit
LOCAL policy. Both-empty camps are ambiguous; both-living camps are nonterminal
for this supported finish path. Both refuse without changing input. Actual
client engine outcome is not supplied in the HTTP form, so neither case is
silently treated as an authoritative victory.

Selected entry HP and enemy carry are replaced, preserving reserve HP and
all floor/stair/reference/progression fields. Healing is allowed: an admitted
participant can finish above its starting carry. The reply uses
`remain_hp_percent`, not the request's `hp_percent`, with exact numeric IDs
and neutral quest overlays required by the native callback. No wallet, item,
rank, EXP, skill, enemy progression or stair advance is added.

Canonical report ordering follows the registered party and produces a stable
fingerprint for future lost-reply reconciliation. This is **not** a persistent
replay journal: runtime integration must atomically save the complete cache,
selected owned-card HP and report/receipt together. It must return a cached
absolute receipt for an admitted repeat, reject stale reports after reward or
reset, and preserve the special omission of `ret_data` on End refusal. Calling
this planner again on a reward-ready cache is not an accepted replay.

`tests/mirage-end.ts` checks exact uint64 numeric parsing, source-shaped fields,
win/loss carry, source preservation, healing, reserve isolation, equivalent
report fingerprints, wrong/partial/foreign/duplicate camps and ambiguous
outcomes. Authored one-stair test caches are unit fixtures, not original
floor layouts. Original final-build help specifies3/6/9 battles at floor
ranges1..20/21..40/41+; a future run producer must account for those rules or
clearly identify its different local policy.

The remaining runtime work is substantial: explicit floor/enemy/balance/reward
policy, strongest-copy enrollment ownership, persistent run capture, reset and
retry admission, atomic RegisterDeck/End/Reward handlers and native scene
validation. Original numerical assignments and item metadata remain missing.
