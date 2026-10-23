# VIP1 login reward thumbnail: current metadata and remaining native boundary

2026-10-23. Source/asset inspection plus a root-provided bounded capture. Root's day8 native claim credited20
VIP EXP and100 gold, but its VIP thumbnail remained blank. No claim was replayed,
VIP stack granted, native observer/getter invoked, device input sent, APK built or original
resource edited in this lane.

## Already reconstructed: identity, reward and current metadata

DataDump findings/economy/login-bonus-veteran-receipt.md closes the original
calendar's captured20 VIP delta and CSRItemThumb.GetItemThumbList Gafa584:
Gafa5d2 synthesizes exact VIP1, then AddThumbList Gafa420 receives its amount.
The calendar credit is separate absolute reward.user.vip_exp.cur; it is not
ordinary VIP1 item inventory. Actual native day8 credit is root's observation.

Current Server src/hunter-traces.ts ALREADY publishes one display row:
VIP1 / Veteran EXP / thumbnail_id ICON_VE / rank1 / use_type0 / empty effect /
sell_price0 / collect_qty0. Those metadata numbers/binding are explicit LOCAL
display policy, not a recovered original VIP1 GetItem record. Existing
hunter-traces tests assert the normal lookup, no trace/redemption link and no
synthetic VIP1 owned stack.

The older DataDump veteran-reward-thumbnail-contract.md initially identified
missing VIP1 metadata, but its final Root follow-up records an owner-qualified
native read after repair: VIP1 present, thumbnail ICON_VE/count7. Do not repeat
that initial missing-metadata diagnosis as confirmed current state. The new
session's qualified cache read below now closes that metadata question.

## Original payload availability, not original reward-map authority

Current unchanged Server original UI_SHOP.jet is1236254 bytes, SHA256
89f3cc6750f01b3ca149ceece7c0798d963569bd8b6bb504c0c6be2b61162a09.
The existing original-resource finding pins ICON_VE S2 at header1233343 to
I2 image0xd41fffca in the same pack. Its source image is14x17 RGBA with131
positive-alpha pixels. The recovered Shop layout binds it as a Veteran footer
glyph. Its actual scaling/attachment in a reward node is not proved by image
size or by successful footer rendering.

No exact original VIP1→full-size thumbnail mapping has been recovered. Exact
negative names VIP1/IMT_VIP1/IT_VIP1 were already covered by the historical774-
pack header scan; that is not proof every conceivable full-size resource is
absent. New bounded scans here walked all160 UI_SHOP records and391 UI_ITEM
records to exact EOF. UI_ITEM is1655400 bytes/SHA256
4b4350559330947254764f795902b2f66ea48826290316b9eb2bd295bd446eda.
It contains IT_RK_VIP / IT_RK_VIP_M / IT_RK_VIP_S, but their names are not an
original VIP1 metadata assignment or permission to replace the reward artwork.

## Exact rendering owner and rank separation

The retained ghidra-item-thumb-display.txt normal CSRItemThumb.LoadRes Gaf7404
gets the row through CSRItemInfo.GetItemData, then passes INFO+0x38 thumbnail
string directly through CMHashID.Set to CSRUIImageNode.LoadSprite (source
lines399–407). It independently creates a rank/background sprite afterward.
Gold's RP1 and the VIP1 synthetic reward use the same AddThumbList item factory;
no recovered numeric VIP item/use-type special case follows from the name.

Fresh bounded original Thumb inspection closes the rank resource decoder
CSRItemThumb.ConvertRankToResourceName Gaf8260 and its TBB:

- ranks0/1 → IT_RK_B; rank2 → IT_RK_S; rank3 → IT_RK_G;
- rank4 → IT_RK_EM; rank5 → IT_RK_ME.

These exact literal branches are Gaf827e/Gaf828c/Gaf829a/Gaf82a8/Gaf82b6/
Gaf82c4 respectively. IT_RK_VIP is NOT one of this normal decoder's outputs;
do not infer an enum or swap it into thumbnail_id just because it exists.

CSRUIImageNode.LoadSprite G7af904 checks resource availability through
CRMResMap.IsExistingRes G7af9b2, loads CRMResourceMgr4.LoadSprite2 G7af9f8
and calls MakeSpriteToMesh G7afa66. MakeSpriteToMesh G7aff60 iterates sprite
image entries and calls MakeImageToMesh G7affea. This bounded path does not
establish a100x100/150x150 reward equality gate; Mail's100x100 URL gate belongs
to another class. Resource residency, actual selected mesh, node scaling,
visibility and alpha still need runtime proof. No universal tiny-image scaling
or final pixel-rendering guarantee is inferred from this call chain.

All native addresses use G=ELF code+0x10000; immutable ELF SHA256 is
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.

## Current native metadata is positively verified

At root's explicit instruction, this lane read only the bounded capture at
Instrumented/local/verification/item-references-20261023.txt. Root ran the
already prepared --item-references --frame observer against client4606:

```text
Item references owner=default_delete_verified count=22 nativeGettersCalled=false
Item reference key=VIP1 thumbnail=ICON_VE info=inline_verified displayRendering=unproved
Item reference key=RP1 thumbnail=IT_CO info=inline_verified displayRendering=unproved
Item reference key=DUMMY MISSING fallbackNotInvoked=true
```

The observer reported131 memory reads/2770 requested bytes and snapshot0.738784s;
root confirmed terminal exit0. It was a render-callback read with no input or
native getter invocation. No additional observer was launched by this lane.
This establishes current VIP1 presence and exact normal thumbnail field, not
merely HTTP publication or an old metadata-repair observation. Missing or empty
VIP1 metadata is therefore not the current explanation for this native blank.

Resource residency, actual selected CSRItemThumb image/sprite mesh, attachment,
scaling, visibility and alpha remain unresolved. The next rendering owner is
the actual receipt node, not another metadata alias or a second EXP credit.
There is no source-backed small Server fix from this audit: the current native
row already contains the selected local binding, while a different original
full-size reward resource remains unjoined. Preserve earned VIP EXP and all
inventory/cooldown state. Any later display validation must not replay an
already claimed reward or invent original item rank/use-type mappings.
