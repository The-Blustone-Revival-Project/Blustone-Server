# Equipment quote publication and guarded upgrade actions

Authenticated `/reference/GetCardEquipmentLevelUpPrice` and `/reference/GetCardEquipmentRankUpPrice` now return the native `ret_data` array grammar. Missing tables return empty arrays, rather than the generic mock object. Explicit local/recovered input is supplied through `BLUSTONE_EQUIPMENT_LEVEL_PRICES_JSON` / `BLUSTONE_EQUIPMENT_RANK_PRICES_JSON`, or constructor options `equipmentLevelPrices` / `equipmentRankPrices`. No launch profile supplies prices; original numerical rows remain missing.

Constructor options distinguish absent fields from explicit malformed null/undefined values. Price tables are validated and frozen once before state restoration; invalid input cannot rewrite a save. Positive material requirements must name an item in the currently published item reference. Level keys and rank/attribute pairs must be unique. API reads return detached row copies, so caller or environment mutation cannot silently alter a running server's quote data. The existing [price grammar](equipment-price-reference-2026-10-11.md) governs all fields; no ordinary Gym-price fallback is used.

`/card_handler/LevelUpEquipment` and `/card_handler/RankUpEquipment` now authenticate and refuse2001 without modifying gold, items, source Hunters, owned equipment ranks/levels or any save bytes. The newly recovered [upgrade contract](equipment-upgrade-native-2026-10-11.md) establishes part1..3, string uint64 target identity, rank JSON source vector, absolute settlement fields and the client next-level/next-rank quote lookups. It also identifies a Guild-benefit discount consumer. Source eligibility, exact source-capture linkage, Guild qualification and original prices still gate full transactions. Publishing an authored quote does not authorize or pretend to execute an upgrade.

The request decoder preserves decimal uint64 source tokens before JSON Number conversion, including9007199254740993 and18446744073709551615. Out-of-range IDs, unsafe already-decoded numeric IDs, duplicates and target-as-source refuse. This closes wire parsing; it does not expand the persistent game's owned-ID domain or bypass ownership.

## Verification

All77 configured checks and build pass. Tests cover authenticated/cross-account reads, immutable quote publication, empty defaults, malformed/duplicate/unknown-material refusal, restart, mutation refusal and exact entire private-fixture save bytes. They use authored17/23 quotes and no positive material costs; these numbers and payment codes are not original economy claims or interpreted settlement currencies.

Compiled encrypted disposable `--fixture --exercise-equipment` verification checks the authored level/rank arrays before and after restart, guards both native upgrade routes and verifies the complete save remains byte-identical around refusals. The earlier reference/artwork checks still pass with exact C001_Q original bytes, hashes and ranges. Native popup rendering and paid upgrade gameplay remain unverified. No live reload, profile change, emulator input, APK build/install or release occurred.

## Name-binding correction

The [localization audit](equipment-localization-native-audit-2026-10-11.md) now closes the exact Hunter prefix: GetEquipName/GetEquipDesc copy CSRCardInfo's first string before appending Awake suffix and TYPE field. `001|WEAPON` and `004_1|WEAPON` are therefore native keys. The previous empty-initialization interpretation was wrong and has been corrected in code/tests/docs. Independent original-byte call checks and five actual Thumb/VFP copy cases pass using the pinned immutable library. Host Python test: `tests/equipment-localization-native.py`, run with Instrumented's Python environment; no library was patched.
