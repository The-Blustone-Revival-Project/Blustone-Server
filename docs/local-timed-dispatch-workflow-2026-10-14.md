> Update2026-10-23: the separate optional [pass-entitled instant route](expedition-instant-pass-native-2026-10-23.md) is implemented behind dispatchInstantMode=local-entitled. It requires an existing supplied unexpired owner pass and charges normal AP under explicit LOCAL zero-additional-Manda policy. Ongoing paid Skip still refuses with ret_data:null.

# Opt-in persistent local Expedition dispatch

The server now implements normal `/mission/Entrust` → Refresh → elapsed End
with a durable account-owned journal. `BLUSTONE_DISPATCH_MODE=local-timed`
requires `BLUSTONE_DISPATCH_POLICY_JSON`; both may also be supplied explicitly
to ServerState or createApp. The default remains disabled. No live policy,
profile, private state, input or instrumented APK was changed by this checkpoint.

Policy fields are max_runs, gold_per_run, user_exp_per_run, card_exp_per_run,
skip_price, entrust_second_per_cost and passes. Every value must be supplied.
Optional items_per_run is an explicit array such as
`[{"ref_id":"AIRSHIP_TICKET","qty":2}]`; omission or [] grants no items.
Only the existing ordinary capsule loop is admitted, with1..256 per run and
one unique reference. These limits and drops are LOCAL policy. Display-only,
navigation-only, fish and unreconstructed trace awards are refused. No
original dispatch drop table or original probability has been recovered.
passes is an owner-PVID map of explicit existing entitlement snapshots:
end_datetime in fixed calendar format plus signed32 end_datetime_utc override.
The server validates and preserves those values; it does not infer rights from
currency, create a pass, normalize timezone or publish a null/empty pass.
Unknown owner pass data refuses Start. Configuration metadata is detached from
its caller and captured in the pending job; changing configured awards cannot
rewrite an existing job. Provided pass data must describe the intended owner.

Recovered source admission includes any achieved star on original unlock stage
n_01_05 and any achieved star on the selected stage. Source deck2 resolves full
owned Hunter identities. The original VIP helper uses the first matching
UNLOCK_ENTRUST perk group ordinal; no original tier row is recovered, and the
currently empty published group table yields -1. No three-star or tutorial19
clear requirement is invented. The stage mapping for enum19 is n_01_05.

Local producer choices are explicit: one pending job per account, supplied run
limit1..100, ordinary published n_ stages, normal deck2/non-tutorial request,
established supported owned Hunters and an idle actor at Start. HTTP Hunter/
equipment/Gem/deck mutations and new ordinary/Arena/Search combat are held
until collection. Captured IDs also protect direct inventory-consumption
planners independently of current deck settings. This account freeze is a
local commitment policy, not a recovered claim that original targets or all
other gameplay were locked. Read-only lobby/catalogue/social operations remain
available. Paid Skip and IAP compound dispatch still refuse.

The source-backed preview is150 seconds per run, adjusted by the current
matching Guild INFO aggregate and supplied intrust benefit with native
per-run float32 truncation. Fuel uses the published stage ap_cost separately.
The local producer uses that preview as its scheduled duration, freezes the
captured deck and configured rewards, and charges AP once. Times form a
continuous sequence of planned runs. Clock horizon and numeric bounds refuse
unsupported values rather than wrapping a future job into a past timestamp.
Full64 random nonzero job identity is stored as exact decimal text and emitted
as a numeric JSON token, preserving the native parser's integer path.

Start, AP recovery/debit and journal persist atomically. A duplicate valid
Start for the same pending stage/count returns the same job and current AP;
different parameters refuse. This is local one-job retry behavior, not a
recovered original nonce guarantee. Refresh is an owned read of the complete
planned preview. It does not grant any reward. End requires the exact current
account's ID and actual scheduled last end time. Native ClearCount's fallback
to all rows is deliberately not used as entitlement.

Collection applies the configured gold/user EXP per run and current captured
Hunter EXP growth capped by the already published local curve. Existing
over-cap EXP is preserved, never reduced. Unsafe signed Hunter setter values
or wallet overflow refuse before mutation. Max AP is preserved; ordinary lazy
resource recovery remains coherent. No new stars, stage clears, rank/skills,
achievement, pass purchase or inferred level-up rewards are granted.
The supported reward policy is gold, EXP and explicitly configured capsules; numerical values remain
authored data, not recovered original dispatch balances.

The End receipt is prepared before committing: generic user:null preserves
Manda, while result carries absolute gold/EXP pairs, correctly nested
user_exp.max_ap/ap (effective32 charge time), full64 Hunter EXP identities and
actual full64 instance/ref/added item deltas. Start/Refresh preview item remains
a JSON string of repeated reference IDs. Capsule collection joins the lowest-ID
unlocked matching stack; locked stacks are preserved. New stacks require a
positive safe allocator strictly above all existing IDs, with a safe successor.
Duplicate IDs, invalid quantities/locks, stale allocators and uint32 overflow
refuse before any live mutation. Stack choice and allocator admission are
declared local policy. Game changes and journal collection commit together;
write/rename failure restores both original game and journal. Restore validates
snapshot schedule/rewards/pass and captured ownership and refuses corrupted
journals without rewriting them. Disabling the mode does not erase an existing
journal; its owned hydration and commitments remain represented.

Snapshots containing dispatch journals use schema2. Current code accepts the
original schema1 when no journal field exists; older schema1-only writers refuse
schema2, preventing silent loss of pending jobs or collected-ID history. The
version changes only when a journal is actually persisted, not on mode selection.

The latest collected ID and participant list are retained. Retrying that End
with no newer pending job rebases current gold/user EXP/AP and remaining owned
participants' current EXP to prev==cur snapshots. It adds no award and cannot
rewind later progress. This repairs lost gold/EXP/AP receipts, including Hunter setters.
Item receipts are additive: End retries deliberately send an empty item array.
After a lost first End reply, separately request `/lobby/GetItemInven` to restore
absolute stack quantities. Original ParseUserItemInven/SetItem upserts listed
rows; it does not clear unlisted cached IDs. Repeated absolute reads cannot
double-grant. Generic user.item is ignored and SyncItem is additive, so neither
is a repair alternative. Automatic native End→inventory refresh has NOT been
proved; this recovery requires the separate inventory read/reconnect workflow.
Unknown/older IDs or an old ID during another pending job refuse. Legitimate
resource recovery can persist on delayed retries; no new job/charge/reward does.

Mission hydration is at existing `/lobby/GetMissionInst` ret_data.entrust with
complete Start fields plus explicit pass. It is not user.entrust or a new
envelope alias. Without an active job the prior compatibility response remains.
Raw numeric64 tokens require the existing JSON.rawJSON-capable runtime.

Disposable state tests verify source gates, owned/pass admission, duplicate
charge prevention, early refusal, restart/hydration, actual persistence failure,
current-participant replay repair, cap/overflow, immutable policy, corrupt-save
preservation and peer/roster/star isolation. Independent imported-job sale
probe verifies captured Hunters outside all current decks cannot be consumed.
The real encrypted HTTP test verifies P384/HMAC/AES authentication through the
whole lifecycle, numeric64 identity, AP/EXP/gold/item receipts, empty-delta replay,
separate absolute inventory recovery and restart;
successful responses must remain encrypted. Native UI validation is pending.

Source: expedition-entrust-hunter-admission-native-2026-10-13.md,
expedition-mission-hydration-envelope-native-2026-10-13.md and the earlier
Entrust unit/Start/Refresh/End/clock evidence. No original reward tables,
paid skip/IAP rules or native dispatch pixels are claimed recovered here.
