# Equipment rank-up uses its raw quote; level-up requires matching Guild caches

Original source-only closure. No prices, stat rows or discounts were invented;
no live save/client/input/APK or DataDump changes. Immutable final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are code ELF offsets plus10000. RTTI/vtable data addresses map to
file offsets minus1000.

## The shared popup distinguishes rank and level payment arithmetic

`CSRPopUpEquipLevelUp.UpdateEnhancePrice` Gbd65a8 receives current rank r2 and
level r3. It computes rank*10 at Gbd668e..696 and compares against current
level at Gbd6698. Non-cap level branches into the level path; cap/equality
branches to **Gbd672c**, the ordinary rank path. This is equipment rank-up,
not Hunter/Gym rank-up: the latter uses Guild benefit3 and cannot establish
equipment benefit semantics.

Rank branch gets CSRRefData, reads the owned card's attribute at
Gbd6736..73a, passes currentRank+1 Gbd673e and that attribute Gbd6742, and
calls FindEquipRankUpPrice Gddd130 at Gbd6748. Quote output is stack+60.
It then copies **all three raw quote integers** into popup price storage:

- VLoad quote+0/+4 Gbd6750 and VStore to popup+664/+668 Gbd675a.
- LDR quote+8 (price) Gbd6754, STR directly to popup+66c Gbd6758.
- Separate material collection copy Gbd6760..76e, and attribute/card quantity
  storage Gbd6772..77a. Those are not Guild fee adjustments.

There is no Guild singleton/benefit call or fee arithmetic along this rank
branch. In contrast, the level branch reads next-level quote Gbd691c..920,
then explicitly calls Guild CalcBonusSaleValue(type1, price) Gbd694c..954
and stores its result to the same popup+66c Gbd6960. The branch distinction
positively proves equipment rank-up retains **raw uint32 quote.price** even
for affiliated actors; it does not inherit the equipment-level multiplier.

FindEquipRankUpPrice Gddd130 matches stored next rank and attribute at
Gddd15c..166. Its output copy Gddd174..182 copies the raw first12 bytes,
with materials separately Gddd188..192 and the remaining selectors
Gddd196..19a. It contains no price adjustment. Missing lookup returns the
initialized empty quote, not an authorization to charge zero; the server
must continue requiring an explicit matching quote.

CheckSourcesEnough Gbd7c54 reads **popup+66c** at Gbd7c6e and compares against
PlayData gold+154 at Gbd7c7a..80, then checks required material inventory.
UpdateGold Gbd4e68 renders the wallet at Gbd4e9e and does not alter the fee.
The rank-button closure Gbd9ca4 calls CheckSourcesEnough at Gbd9cc6 and sends
RequestEquipRankUp Gf5a0bc at Gbda1f2 with price_type2 and the known empty
source vector. See `equipment-source-capture-native-2026-10-11.md` for exact
cap transition, preserved level, empty-vector serialization and general
request source capture. Nonempty Hunter source eligibility remains unknown.

A bounded direct-BL scan previously found five CalcBonusSaleValue consumers;
the equipment popup's sole call is the level branch Gbd6954. This negative
scan alone would not prove rank behavior. The raw quote-to-fee copy above
and direct funds-check/read chain are the positive proof.

## Guild level quote parity depends on INFO hydration

FindBonusBenefit uses personal Guild ID and **matching cached INFO aggregate
contribution**, not personal contribution, as recovered in
`guild-level-benefits-native-2026-10-13.md`. Missing INFO returns a null benefit
and the client displays a raw level fee. A server using its persisted Guild
record to charge a multiplier cannot claim native quote parity unless that
INFO and the valid numeric level table have been published to the client.

The exact `RequestMyInfo` inner `$_12` E0 wrapper name string ELF1df3bf5
binds RTTI VA214ee58, vtable VA214ee2c, callable ELFa76409/Ga86408.
Its callback selects ret_data Ga8643c/43e, optionally reads my_guild
Ga864ae/b2 and calls ParseMyInfo Ga864bc. **It also optionally reads guilds
Ga86528/52c and calls ParseGuilds Ga8653a.** User/achievement are further
optional fields. Thus `/lobby/GetGuildInfo` can truthfully include a current
full `guilds:[INFO]` snapshot alongside personal PLAY_DATA; it is not restricted
to the flat my_guild subtree. This establishes a source-backed producer seam
for fee qualification.

Native direct request consumers include Village down-tab Init Ge9fb10
(RequestMyInfo call Ge9fbc8) and SceneMgr.ApplyScene Gea6600 (call Gea77ea).
This audit does not assign the latter to a guessed scene enum. Neither the
equipment popup nor its quote function directly requests Guild INFO in the
inspected path. Publishing personal Guild ID alone can therefore leave a
fresh client's matching INFO absent, or an existing client's contribution
stale. Return full current matching INFO for joined and pending nonzero Guild
IDs when this producer route is used; do not synthesize affiliation or overwrite
other Guild histories. Numeric Guild references must still be explicitly valid
before affiliated level selection; empty-list sentinel safety remains unproved.

## Actionable integration boundary

Ordinary no-source **equipment rank** can settle raw quote.price for known
affiliated or unaffiliated actors with gold2, exact next-rank/attribute price,
card_qty0, complete stat transition, material/ownership/combat checks and
atomic receipt. Guild level tables are not consulted by that rank fee path.
Do not reduce rank price with equipment benefit1 or training benefit3.

Equipment **level** retains configured Guild benefit1 selection and requires
coherent current my_guild/full INFO/reference hydration. Neither closure
recovers original numeric prices, source-Hunter consumption, production
benefit magnitudes or live rendered Gym quote verification.
