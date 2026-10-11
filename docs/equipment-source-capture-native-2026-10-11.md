# Equipment rank-up source capture and ordinary transition

Original final ARM byte audit; same library hash and coordinates as the
equipment upgrade note. Read-only evidence; no original price rows, inventory,
fees or native UI actions changed. Source decoding now admits the actual
empty-vector JSON null. Full uint64 decoding remains lossless.

## Final popup submits no source Hunters

The rank-button closure Gbd9ca4 runs CheckSourcesEnough Gbd9cc6, gets owned
target rank/level, previews result, then clears all three vector pointers:
Gbda174 mov0; Gbda176 writes source-vector end/capacity at stack+2c;
Gbda178 writes begin/end at stack+24. No subsequent source append occurs.
Gbda1e8 passes stack+24 to RequestEquipRankUp at Gbda1f2. It sets PRICE_TYPE2
at Gbda1e6. Level-button closure Gbdad4c likewise uses PRICE_TYPE2 at
Gbdaea8 and calls RequestEquipLevelUp at Gbdaeb2. Both use the gold/material
affordability helper. This is the proven ordinary gold branch, not permission
to accept every PRICE_TYPE from the general request API.

Rank price reference contains card_qty; FindEquipRankUpPrice Gddd130 copies
its trailing attr/card_qty words into output+18/+1c (Gddd196). Popup copies
these to+67c/+680 at Gbd6772–7a. However CheckSourcesEnough and this rank-button
closure check gold/materials and submit an empty Hunter vector. No source
Hunter selection, grade/ref/role matching or protection rule is proven here.
Do not apply ordinary Gym sacrifice rules. A supported local transaction can
conservatively require explicitly configured card_qty0 and no sources;
positive card_qty/nonempty sources must stay gated pending another caller or
production rule evidence.

## General source-vector capture is now closed

RequestEquipRankUp initializes JSON at stack+40 to type0/null
(Gf5a0dc–e2). It iterates the supplied vector using8-byte uint64 elements;
Gf5a102 reads each ID, Gf5a10a sets JSON type6/unsigned, Gf5a112 appends.
Only nonempty vectors become arrays. Gf5a278 dumps this JSON into the outgoing
form; ordinary empty vector therefore produces source_inst_ids:`"null"`.

The same JSON is copied into callback capture storage:
Gf5a432 adds20 to r6 (stack+98 becomes+b8); Gf5a434/438 copies stack+40 there.
Gf5a518/520 copies it to stack callback+28; Gf5a5dc/e4 copies into the next
closure; Gf5a630/636 copies it to final callback object+30. The copy routine
G7266ac is nlohmann basic_json copy construction, not string parsing.
On result_code1, callback Gf5c63c iterates that captured JSON at+30
(Gf5cac6–ce); type0/null skips the loop. Each numeric uint64 source calls
Inventory.RemoveCard with flag1 at Gf5cbbc. Thus sources are the ORIGINAL
submitted vector, not a new server consumed_inst_list field. Failed response
does not run this removal. This proves client receipt consumption mechanics;
it does not prove which nonempty source lists the original server allowed.

## Rank transition preserves current level at exact cap

Rank closure reads current rank at Gbd9d92 and current level at Gbd9d9e.
Gbd9dbc–c6 computes rank*10 and increments rank only when level equals that
value; clamps rank to5 at Gbd9dc8–cc. Gbd9dce–d6 chooses increment0 at equality,
otherwise1, then adds it to current level and clamps50 at Gbd9dda–e0.
Both preview CalcStatByEquip Gbd9df6 and analyzer SetEquipRankLevel Gbda0a8
receive these result rank/level values. Normal at-cap rank-up therefore changes
rank+1 and preserves level:1/10→2/10,4/40→5/40. Subsequent normal level-up
changes level+1 within the new band; final level50 presentation is capped.

UpdateEnhancePrice's display branch uses level>=rank*10, while this preview
increments rank only at exact equality. Over-cap data would produce divergent
behavior; do not extrapolate it into legal upgrades. The pure
equipmentTransition helper admits exact normal boundaries, rank1..5,
level1..50, and the bands reachable through level-preserving rank-ups.
Its lower-band/malformed-state rejection is conservative local policy,
not recovered original server error behavior. Fees/materials/target original
stat rows/ownership/locks/active-use and persistence must all be checked in a
future authenticated transaction before mutation; this helper grants nothing.
