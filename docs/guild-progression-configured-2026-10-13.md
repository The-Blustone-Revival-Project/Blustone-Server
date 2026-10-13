# Configured Guild progression references and equipment-level fees

Native schemas/selection are source-backed; the numerical production tables
remain absent from the bounded inspected client corpus. This implementation
accepts explicit authored or recovered supplied rows without inventing defaults.
No live game input, resource-profile activation or APK changes occurred.

Four authenticated reference routes now bypass generic success metadata:

- GetGuildLevelBenefits: bare rows with uint32 level/contribution and optional
  equipment_level_up, gem_level_up, exact traning, intrust, ap scalar values.
- GetGuildLevelBenefitsStr: an object of those optional string keys.
- GetGuildContributionPoints: object with signed32 values under keys1..4.
- GetGuildContributionReward: bare contribution/reward rows; reward is direct
  JSON {ap?,gold?,item_list?:[{id,qty}]}, with known item IDs.

Constructor options are guildLevelBenefits, guildBenefitStrings,
guildContributionPoints and guildContributionRewards. Environment equivalents
are BLUSTONE_GUILD_LEVEL_BENEFITS_JSON, BLUSTONE_GUILD_BENEFIT_STRINGS_JSON,
BLUSTONE_GUILD_CONTRIBUTION_POINTS_JSON and
BLUSTONE_GUILD_CONTRIBUTION_REWARDS_JSON. Validated inputs are detached once;
responses are deep clones, so later caller/config mutations cannot change fees.
Reference reads never alter wallet, progression or membership state.

The numeric level parser reverses wire rows; supported configured order must
strictly increase both level and threshold and include explicit base0/threshold0.
This is supported local admission, not a claim about original producer rows.
It ensures contribution0 has a real level0 entry and avoids the unguarded empty
list sentinel in GetGuildLevelRef. Reward tables require a positive maximum:
native progress consumers divide/modulo the cached maximum without proving a
safe zero case. Duplicate/unknown/rounded/malformed values fail at startup.

Unconfigured unaffiliated startup keeps canonical empty successful references
(arrays for numeric collections, objects for points/text) instead of fabricated
mock metadata rows. This preserves its bootstrap contract and is NOT evidence
that an empty table is safe for a Guild progression panel. Nonzero personal
Guild IDs, including pending applications, refuse unavailable references before
clearing unsafe caches. Configure valid tables before native Guild UI testing.
No default level0 row, contribution coefficients or reward amounts are guessed.

## Equipment-level integration

With an explicit valid level table, the Server selects the level from actual
Guild INFO aggregate contribution and uses the equipment_level_up benefit.
Contribution0 selects0; otherwise thresholds select the current interval or
capped highest level. Missing benefit is null/base price; present0 is a real
zero multiplier. Types1..4 use mode1, so equipment fee is native binary32
(value/1000)*price followed by unsigned truncation/saturation. It is not
price minus a percentage. AP is a separate additive mode0 field.

FindBonusBenefit tests nonzero personal Guild ID, not status3/newbie/role;
pending actors with matching cached INFO can qualify. Backend selection uses
authoritative matching Guild data. Exact native UI quote parity still requires
the client to have current INFO/reference caches; source recovery alone does
not prove those caches were hydrated in a live panel.

Only the equipment LEVEL popup's TYPE1 caller is closed. Affiliated equipment
rank changes remain refused; training rank-up TYPE3 is a separate operation,
not evidence for equipment rank discounts. No-Guild fees remain unchanged.
Other Gem/training/entrust/AP benefit settlements remain incomplete. Reference
publication does not automatically implement or grant those perks.

Tests cover strict schemas/base/order, threshold boundaries, aggregate versus
personal contribution, capped selection, missing versus present-zero benefits,
binary32 arithmetic, signed action points, positive mileage max/item identity,
input/response snapshot isolation, authentication and empty unaffiliated versus
refused affiliated missing-data paths. Configured level17 with value900 costs15,
gold100→85 while personal contribution0 and Guild aggregate100 qualify. Guild
metadata/leader gameplay remain unchanged, and restart preserves supplied rows.

Compiled encrypted --fixture --profile current-e6-guild --exercise-guild-equipment
proves all four reference shapes, level9→10, gold100→85, one original capsule
material consumed, affiliated rank/claim refusal and exact restart persistence.
All quantities/thresholds/descriptions in that run are authored explicit test
data, not recovered production economy. The separate peer remains unchanged;
ordinary registering/lobby AP/BP clock anchors are the only allowed exclusions.

Donation source exposes gold slider/amount and floor(gold/10) preview. Reward
source exposes cyclical mileage and a generic Sync* receipt, but neither proves
the original claim ledger/reset/replay policy. Their mutation routes remain
unavailable rather than derive eligibility from display thresholds.
