# Boutique and original skin identity readiness

The current four Hunter references have genuine native-generated default skin
identities Default_001, Default_002, Default_003 and Default_004. Original
CSRSkin::ParseReferenceDefaultSkin ELFf19338 assigns literal Default_ atf19436,
appends CardInfo's exact reference ID atf19456, copies that ID into target_card
and copies CardInfo's base resource prefix atf194ce. This is recovered native
construction, not a paid skin ID inferred from a JET filename.

The client separately enumerates owned CardInfo references atf19daa, skips
source cards and calls AddDefaultSkin atf19e00. Describing those default
identities does not require a server ownership grant. The new isolated module
does not construct wire references or instances, equip skins or alter saves.

## Seven art variants already available

The unchanged E6 selection includes body and Q portrait pairs for C001A,
C003A/B/C and C004A/B/C. No C002 A/B/C pair was found in the examined imported
assets. Including the four base body/Q pairs, the readiness catalogue pins22
original files across11 art groups by size and SHA-256.

The A/B/C values are resource prefixes. Their relationship to a Hunter is only
a naming-family hint; original target_card, paid skin ref_id, displayed name,
prices, ownership, collection bonuses and any alternate effect/voice bindings
remain unknown. Every variant's skinRefId is null. No filename is turned into
a paid reference or an ownership claim. Availability requires both exact
selected body/Q packages; it does not imply native Boutique rendering.

The character catalogue's story/holiday Hunter variants are another namespace.
Their names or similar gear descriptions do not prove that C004A/B/C uses those
character IDs as skin references.

## Reference and owned grammar

CSRSyncRef::ReqSkinRefCB ELFf75070 explicitly unwraps ret_data atf75090 before
tail-calling CSRSkin::ParseReference atf7509c. The inner object indexes skin
and bonus. Skin REF_DATA::parse ELFf16a8c reads ref_id, target_card, res_prefix,
title, desc, victory, regdate, order, dialog_list and price. A nonempty
dialog_list is consumed as a vector of strings, not a generic dialogue object.

Price entries contain value/begin_utc/end_utc/type. Numeric types and original
currency enum meanings require their own source evidence. The parser adjusts
positive begin/end UTC values by32400 seconds; do not insert host-local or
current epoch windows without closing that original time convention. Bonus
rows read target_cnt and pass stat data through CSRCardStat; no original bonus
ladder or magnitudes have been recovered here.

CSRInstanceSync::ReqSkinInstCB ELFad62ac unwraps ret_data atad62ca and calls
ParseInstance atad62d6. Its inner object indexes skin. INST_DATA::parse
ELFf17364 reads inst_id, ref_id, is_seen and **is_equiped**, preserving the
original single-p spelling. The instance ID is a signed64-bit native value;
strict positive safe-integer ingestion in the new helper is a local policy,
not a claim that every native-generated default instance uses that range.

ParseInstance looks up each skin ref_id and asserts if it is absent from the
reference map. Do not publish a paid owned instance before its original
reference/target binding is established.

RequestPutOn ELFf1bb30 sends target_card_ref/inst_id to /skin/PutOn. PutOff
ELFf1abf0 uses the same /skin/PutOn route, so inventing a separate /skin/PutOff
endpoint would miss the native request. RequestSeen sends inst_id to /skin/Seen.
RequestBuy sends ref_id/type/value to /skin/Buy; this is not proof of original
prices, purchase currency, ownership receipt or unlock policy.

## Isolated implementation and remaining gate

`src/skin-materials.ts` exposes only native default identity descriptions,
original art availability and strict source-approved owned-instance ingestion.
It rejects owned-instance IDs as CardInfo IDs and does not infer paid IDs from
C001A or related prefixes. `ingestOwnedSkinInstances` requires independently
approved reference IDs; schema validation cannot authenticate their provenance.

Bounded offline Thumb evidence uses immutable original library SHA-256
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec. Curated key
locators record ELF instruction/string addresses; private disassembly is under
local/research/skin-contract-20261011. DataDump was read-only. Literal decoding
continued across embedded pools; no Ghidra/native getter/device input ran.

Tests verify four native default identities, seven variant art pairs/all22
original hashes, missing-portrait refusal, paid identities remaining null,
caller-copy isolation, exact parser keys/typo and strict owned-ID/flag gates.
TypeScript build passes. Shared routes/state/bootstrap/runtime, private saves,
UI/ADB, originals and client binaries are unchanged. Native Boutique entry,
portrait rendering and default selection still need root validation; original
paid reference IDs/prices/bonus/receipt data are required before purchases or
wearable grants can be reconstructed.

Root integrated canonical authenticated empty reference/paid-instance shapes
and mutation refusal. Existing non-default saved style/instance fields cause
read refusal rather than clearing unreconstructed ownership. Native boot logs
confirm OTP/PVID fields on both requests. Null/empty collections converge to
zero-row parsing, and postprocessing unconditionally builds native defaults.
Empty bonus getters return neutral objects, so coldboot behavior is equivalent.
However Boutique SetBonus divides0/0 atELF1041b50 for zero paid skins/bonus
rows; UI remains unverified. Instrumented has a host-emulated proposal only,
with no approved cave, native patch, APK build, installation or release.
