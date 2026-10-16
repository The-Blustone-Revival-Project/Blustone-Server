# Owned leader selection and atomic formation saves

`/card_handler/SetLeader` is now implemented using the scalar native contract
in `leader-selection-native-2026-10-16.md`. Existing owned/published Hunters
are eligible, including locked Hunters. The local model adds no fee, role or
rank rule. Changed selections refuse active ordinary/Search/Fight Club
attempts as explicit LOCAL policy; original mid-battle eligibility is unknown.
An unchanged selection acknowledges its absolute ID without writing.

The leader word changes independently of ordered decks, cards, equipment,
items, currency and progress. Persistence failure restores that word before
propagating the error; it cannot return successful selection on a failed save.
The response is a numeric scalar `ret_data`, not a card object, quantity or
previous/current pair. Existing local owned IDs remain an exact safe-number
subset of the native full64 wire contract. Native UI selection is unverified.

The formation audit separately reproduced a real pre-existing failure:
blocking `state.json.tmp` caused SetDeck to throw while leaving a changed
formation array in memory. Durable bytes still contained the old formation.
The new regression test failed on this divergence before the repair.

SetDeck now restores the exact original array on either write or rename
failure. It validates the complete multi-type request before committing,
retains unrelated presets and preserves slot order. Equivalent normalized
requests compare each requested type's five positions, so different request
type order or omitted trailing zeros need no write or preset reordering.
Both controls read the existing game directly rather than calling gameFor;
invalid/no-op operations neither create ownership nor regenerate resources.

Ordinary mission EXP already uses the saved attempt's `deck_inst_ids`.
The audit executed Start with two Hunters, changed the next formation, then
completed the attempt: both original participants received earned EXP. No EXP
snapshot repair or new ordinary-battle formation restriction was introduced.
Existing Search/default-party and Fight Club/attack-party guards remain.

Disposable production-namespace tests verify complete game/account/nested
reference and durable-byte preservation on write/rename failures, exact retry,
mixed-batch validation, elapsed AP/BP clocks, locked target eligibility,
authentication without `market`, active-attempt policy, no-op acknowledgements,
profile leader reflection and restart. The compiled encrypted fixture also
selects an actual owned Hunter, checks the scalar receipt and sole leader-word
change, then verifies no-write retry and lobby/detail state after restart.
Its setup first persists pre-existing lazy inventory-read clock updates via
two reversible lock toggles; the measured leader operation itself remains
subject to the exact sole-field assertion.

No private/live save, client, runtime profile, original library or DataDump
file was changed. No source-derived original fees or stat values are invented.
