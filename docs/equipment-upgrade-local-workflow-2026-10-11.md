# Configured ordinary equipment upgrade workflow

The authenticated equipment handlers now persist the native popup's normal level/rank path when an administrator explicitly supplies equipment reference rows and matching price tables. Defaults still refuse because no original numeric tables were recovered. No shipped launch profile enables these inputs and no live upgrade was performed.

## Supported path and original evidence

`LevelUpEquipment` increments level within the current rank band. `RankUpEquipment` requires the exact rank cap, raises rank and preserves level: rank1/level10 becomes rank2/level10. The normal popup's domain reaches rank5/level50; malformed/out-of-band states and over-cap extrapolation refuse as explicit local admission policy. Current and destination slot/rank stat rows must exist, so a counter cannot improve without its configured stat reference. All three parts—weapon, armor and accessory—use their recovered owned fields.

Both buttons request price_type2 and compare against gold. GuildID0's native benefit lookup returns null, and its fee calculation returns the original uint32 quote unchanged. The service reads the account's authoritative Guild boot metadata rather than trusting a request-supplied affiliation. Other Guild/payment paths remain unsupported. See [fee evidence](equipment-fee-guild-native-2026-10-11.md), including twelve actual native arithmetic cases; no benefit qualification or original magnitude is invented.

The final rank popup passes an empty source vector, serialized natively as `source_inst_ids:"null"`. Rank settlement therefore requires no sources and a configured next-rank/attribute price with card_qty0. The general native requester can carry nonempty source vectors and the callback capture chain is now proven, but that does not establish their eligibility. Those workflows refuse. See [source capture](equipment-source-capture-native-2026-10-11.md). Null, explicit empty arrays and lossless uint64 vectors are decoded without rounding; only the no-source path settles.

## Persistence and receipts

The planner validates unique owned target identity, active ordinary/arena/search commitments, target Mirage carry, current/destination stats, exact next-level or next-rank/attribute price, payment choice, wallet bounds and every material quantity before mutation. A locked target may be upgraded; no Hunter is consumed. Required materials aggregate across repeated price slots. Unlocked matching item stacks are consumed in ascending instance-ID order as explicit local allocation policy; zero-quantity records remain represented. Missing/unavailable materials refuse the entire action.

One atomic snapshot stores selected equipment rank/level, gold and remaining item quantities. Failure restores the original roster/item arrays and wallet. Card-book history, decks, Hunter rank/EXP, other equipment parts, monotone allocators and unrelated accounts remain unchanged.

Native receipt nesting matters: `ret_data.user.gold.cur` is absolute gold; `ret_data.user.card` contains the owned card with absolute flat equipment fields; **`ret_data.user.item[{inst_id,qty}]`** contains absolute remaining quantities. Equipment does not use Hunter sale's top-level additive item receipt. Independent review caught that initial mistake, and original-byte inspection plus tests verified the correction.

Level requests have no recovered expected-level or intent field. Two identical successful requests can mean two upgrades if the next exact quotes exist; no timed deduplication or universal retry-idempotency is claimed. Rank replay at the new non-cap state refuses. Native popup input/control, response-loss behavior and a full original economy remain unverified.

## Verification

All80 configured checks and build pass. The state test covers all three parts, gold/material settlement, null-vector rank-up with preserved level, active/Mirage protections, insufficient gold/locked materials, auth/cross-account refusal, missing prices, unsupported affiliation, exact history/deck preservation, restart and induced persistence failure restoring original object arrays and prior file bytes. Authored prices17/19/23/29 and equipment coefficients are local test policy, not original measurements.

Compiled encrypted disposable verification (`--fixture --profile current-e6-materials --exercise-equipment-upgrade`) executes level9→10, rank1→2 with level10 preserved, then level10→11. Gold100→83→60→31 and one known item's quantity3→2→1→0 match the nested absolute receipts. After restart, all game fields except those exact selected changes and legitimate energy clocks match the seeded snapshot; the other fixture account remains exact. Original C001 equipment artwork bytes/hashes/ranges also pass. The experiment refuses private/preserved-state transaction targets and incompatible roster-transaction combinations.

No live reload, profile/save/roster mutation, emulator input, library/APK build/install or release occurred. The live replica remains on its prior source; native equipment popup and combat-impact validation are pending while inputs are held.
