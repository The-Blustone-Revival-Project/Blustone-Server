# Arena honor reward art: recovered header family, local full-size display

Read-only original table/native/package analysis, 2026-10-11. No ADB/UI,
Ghidra, live runtime change, inventory/currency grant or reward replay. DataDump
and original source bytes remain unchanged. Root owns integration/native tests.

## Positive identity/resource crosswalk

The existing Arena result contract pins **FC1** as the item identity passed to
CSRItemBoxDraw.SetData from FCResult.SetData G c21274. FC1 is not itself a
resource name. Original **CSRPopUpFC.OnButtonClick G c0c7b0** (retained native
`ghidra-arena-lobby-button.txt`, exact literals in
`ghidra-village-input-button-keys.txt:404–405`) compares **BT_MY_CHIP** at
G c0c964/G c0c96c and opens ItemDetail with **FC1** at G c0c9ac/G c0c9ae.
The original popup's **OnInit G c0adcc** calls LoadView at **G c0ae48** with
exact **BATTLE/BT_LOBBY**: ELF literal bfafb8 + PC bfae46+4 →1d70012.
This independently binds the native handler's own view to the preserved XML.
The bounded original Thumb listing is `arena-honor-native-2026-10-11.txt`;
its addresses are ELF (Ghidra adds0x10000), from original ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.

Original UI_XML_RO row **KO/BATTLE/BT_LOBBY** directly places a sprite with
**res-name="IT_BT_S"** inside that exact **BT_MY_CHIP** button. It also places
the currency counter TX_MY_CO there. The button is not a generic reward-image
guess: native item-detail identity and original scene XML establish the shared
control. Original XML UTF8 SHA256:
`1cbeccc33e7ff83f8aa1e77835d112551432e4fabb169f5901acf61c02893666`.
Table source is DataDump `sources/client-tables/recovered-data/leveldb-tables/all-tables.json`.

## Complete original art family

Original **UI_ITEM.jet**, 1655400bytes/SHA256
`4b4350559330947254764f795902b2f66ea48826290316b9eb2bd295bd446eda`, was walked
through all391 native24-byte records to exact EOF. Header+8 gives packed
length; uint64+12 gives native base38 resource name. The three exact named S2
descriptors each contain one image ID at inflated+46 and resolve to genuine
same-package I2 textures with pixel-format4 (decoded RGBA8):

```text
IT_BT    S2 header1649137/34 -> I2 ef38dfb7 header646875/13209: 150x150, 5730 positive-alpha pixels
IT_BT_M  S2 header1649195/34 -> I2 efa0e253 header796026/7774:   68x68,  2983 positive-alpha pixels
IT_BT_S  S2 header1649253/34 -> I2 f95f88d3 header843283/2831:   34x34,   820 positive-alpha pixels
```

`arena-honor-art-2026-10-11.json` retains descriptor/image IDs, offsets, source
and inflated payload hashes, dimensions, format and alpha counts. It does not
contain invented art, an alias or a generated image. Alpha was counted from
read-only decoder output in memory; no image or extraction was written into
DataDump.

## Exact consumer and local policy

The native normal item thumb consumer is already recovered in
`ghidra-item-thumb-display.txt`: **CSRItemThumb.LoadRes G af7404** calls
GetItemData and sends its **INFO+0x38 thumbnail_id string** directly through
CMHashID.Set to **CSRUIImageNode.LoadSprite**. It does not choose an FC1 sprite
or infer this family from the item ID. A reference row must supply the resource.
The inspected LoadRes has no exact100x100/150x150 equality gate. The separate
Mail avatar100x100 requirement does not apply. This does not prove every
transitive loader/layout size is universally accepted; runtime rendering is
still required. IT_BT is the same150x150 format/dimension class used by the
already validated original full-size Search capsule resource.

Root explicitly authorized selecting the genuine full-size **IT_BT** member
for a **local FC1 display reference**, analogous to the existing capsule/gold
display policy. This is not FC1's recovered original GetItem.thumbnail_id.
`src/arena-honor-reference.ts` records this distinction and uses inert local
metadata (rank1/use_type0/effect-empty/sell_price0/collect_qty0); the original
name/description/rank/use_type/effect/prices/collection semantics remain
unrecovered. These neutral fields are display policy, not a new honor item
stack or a reconstructed redeem/sell handler. No global-shop entry is added.

The change belongs in itemReference only when root integrates it; current Arena
honor is its existing currency state and existing earned reward, with no new
inventory/grant/replay. Original UI_ITEM is already in the active content
selection, so this mapping requires no new package, resource version, profile
change, client patch or APK rebuild.

## Verification and next native check

`tests/arena-honor-reference.ts` compares the pure display reference against
independent original graph metadata, pins original package hash, checks genuine
nonempty RGBA8 150x150 art, retains the header/full-size distinction, and ensures
the row is inert/frozen and contains no inventory quantity. Root's integration
test must additionally exercise the actual GetItem response.

After ordinary reference reload, verify ItemDetail from **BT_MY_CHIP** using
already-earned honor or inspect the next legitimate Arena result. Do not replay
an existing reward, grant FC1 inventory, alter rating/honor balance or rebuild
the APK to manufacture presentation proof. Until root verifies actual pixels,
native FC1 thumbnail rendering remains pending.

Root integrated the display row into itemReference. The actual /reference/GetItem
route test confirms exactlyoneFC1 reference, no acquisition/globalshop link,
no game-state credit and independent response copies. Native pixels pending.
