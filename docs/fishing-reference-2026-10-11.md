# Fishing: original bait identities and sale inventory replacement

Read-only original ELF analysis on 2026-10-11. No ADB, Ghidra, live server
activation, catch, bait purchase or save mutation. DataDump stayed read-only.
This closes two previously unknown contracts; fishing settlement stays disabled
because the fish catalog and original economy remain missing.

## Original bait item IDs are LU001 and LU003

`CSRMFishing::GetBait` **G b2efd0 / ELF b1efd0** is a short string-returning
selector. Its integer argument is r2 (r0 is the returned-string destination).
Zero selects **LU001**, nonzero selects **LU003**. These are not BAIT1/BAIT2
or BAIT01/BAIT02. Those prior candidates belong to art/control namespaces.

Exact original literal resolution, accounting for ELF load segments:

```text
literal-word ELF b1efec = 0124c039
ADD ELF b1efdc, PC = b1efe0 -> ELF 1d6b019 = "LU001\0"
literal-word ELF b1efe8 = 0124c041
ADD ELF b1efda, PC = b1efde -> ELF 1d6b01f = "LU003\0"
```

Positive item-reference corroboration is now available, rather than an art-name
guess: original `CSRPopUpMFishingBuyItem::SetLure` **G cfc760** preserves the
requested selector in r5, calls GetBait at **G cfc962**, then passes the returned
string directly to **CSRItemInfo::GetItemData G af109c at G cfc96c**. That same
string is supplied to GetGlobalItemBuyLimit (G cfcc2c), GetGlobalItemInfo
(G cfcfee), and GetGlobalItemPrice (G cfd190/cfd28e). Thus both are genuine
item/global-shop identifiers. **UpdateBait G e6ea48** independently calls
GetBait with literal selector1 (G e6ea88/e6ea8a) and passes the returned string
to **CSRInventory::GetInstItemCnt G aeca80 at G e6ea92**.

No complete original item name/thumbnail row, effect, use_type, collection quantity, purchase
price, purchase-limit values or free grant has been recovered. Do not create
GetItem rows just from these IDs. The main-scene High-quality Bait binding is
recovered below; LU001's Average Bait binding remains unproved.
`fishingBaitItemId` supports selectors0/1 only as an explicit server policy;
the native nonzero branch does not prove that every integer is a valid LURE enum.

### Bait IDs are also Begin.lure_id values

`SetLure G b2f064` stores selector at Fishing+0x90 and chooses LU001 for zero /
LU003 for nonzero. Its exact literal resolutions are ELF b1f0f4 + PC b1f084+4
→1d6b019 (LU001) and b1f0f0 + PC b1f07e+4 →1d6b01f (LU003). It assigns that
string to **Fishing+0x5c** at G b2f096..b2f0b0. RequestBegin G b26cbc saves its
CSRMFishing receiver in r11 at G b26cc8; exact key **lure_id** resolves from
ELF b1701c + PC b16e8a+4 →1d6aeea. The immediately following value constructor
copies Fishing+0x5c at **G b26ea4/b26ea8**. This positively binds item identity
to the Begin wire field. It does not recover any fish membership or pool weights.

### LU003 main-scene label and badge

OnButtonClick G e6e444 compares exact **BT_BAIT2** (ELF literal e5e718 + PC
e5e574+4 →1d7a5c2), then GetBait(1) at G e6e5aa/e6e5ac supplies the item string
to GetInstItemCnt at G e6e5b4. Original **UI_XML_RO KO/FISHING/FISH_MAIN** places
textbox **TX_FI_BA2**, text-ko `고급 미끼`, under this exact button. Original
UI_JSON_RO key `고급 미끼|TX_FI_BA2|EN` supplies **High-quality Bait**. Thus LU003
has a positive main-scene label binding rather than an inferred ordinal name.

The same button receiver compares exact **BT_MY_BAIT2** (ELF e5e708 + PC
e5e4a4+4 →1d7a592) and opens RequestBuyGlobalItem with literal selector1 at
G e6e4bc/e6e4ca. The original FISH_MAIN XML has **BAIT02_S** as this inventory
button's child sprite. UpdateBait's selector1 counter populates its TX_MY_MD
child, independently corroborating the display binding. This compact badge
resource is **not proved GetItem.thumbnail_id**. `FISHING_HIGH_QUALITY_BAIT_DISPLAY`
records only these exact main-scene facts, not a complete reference row.

The BT_BAIT1 branch queries GetBait(0) at G e6e50e/e6e510; final FISH_MAIN lacks
that button. The global Average Bait/TX_FI_BA1 text alone does not establish a
complete original LU001 item row or current clickable control.

## ParseSell.sell_result is one absolute-count object

The prior sale receipt report correctly left this child unclosed.
**UpdateInven G b2eb9c / ELF b1eb9c** reads one JSON object:

```text
{ fish_id: string, b_cnt: number, s_cnt: number, g_cnt: number }
```

These are exact PC-relative literal resolutions, not inferred field names:

```text
literal ELF b1eec8 + ADD ELF b1ebba + 4 -> ELF 1d6afe3 = "b_cnt"
literal ELF b1ef1c + ADD ELF b1ec0c + 4 -> ELF 1d6afe9 = "s_cnt"
literal ELF b1ef20 + ADD ELF b1ec60 + 4 -> ELF 1d6afef = "g_cnt"
literal ELF b1ef24 + ADD ELF b1ecae + 4 -> ELF 1d6af57 = "fish_id"
```

The strict string conversion is ELF b1ecbc (`from_json<string>`). Bronze and
silver floating/string conversions use `vcvt.s32.f64` at ELF b1ebf4/b1ec48;
gold uses `vcvt.u32.f64` at ELF b1ec9a. Numeric integer branches load low32
bits. Bool/omitted/type-specific default branches exist; these are receiver
conversion behavior, not sane server count validation.

The function constructs a shared INVEN payload with the three count words
at payload+0/+4/+8 (allocation+0xc/+0x10/+0x14). Its string-keyed inventory
map is **Fishing+4**: lookup at G b2ed70 uses the exact fish_id. Missing keys
insert a new node. **Existing keys replace their shared payload** at
G b2ee34..b2ee88: freshly allocated counts are stored, payload/control replaces
node+0x1c/+0x20, and the old control is released. Counts are neither additions
nor removals. A zero-count replacement does not erase the map key in this
function. No whole-inventory refresh is inferred from a one-key upsert.

This is distinct from `ParseSell.item[]` which calls RemoveItem with uint64
instance IDs and removal DELTAS. Repeating absolute sell_result counts is
idempotent for that child; repeating item deltas still removes twice. The
complete sale receipt is therefore not made retry-safe by this discovery.
Standalone SellFish callback envelope and earned catch/price policies remain
separate gates. No success response or zero-value sale is enabled.

## Implementation and verification

`src/fishing-reference.ts` exposes the recovered bait identity mapping and a
pure `fishingInventoryReplacement` serializer. It emits a single object with
strict nonempty identity and nonnegative integer counts. Bronze/silver cap at
signed32 maximum, gold at uint32 maximum; these validation limits and refusal
of unknown lure selectors are declared server policy. The helper mutates no
state and is not an original fish catalog.

`npx tsx tests/fishing-reference.ts` passed: exact mappings, unknown selectors,
zero/max-width counts, signed overflow, invalid scalar values, one-object
shape, repeat serialization and unchanged inputs. Isolated strict TypeScript
checking of the module and test also passed (`tsc --ignoreConfig --noEmit
--strict --target ES2022 --module NodeNext --moduleResolution NodeNext
--types node --esModuleInterop --skipLibCheck`). The full build initially
encountered unrelated in-flight character-materials null/string typing errors;
root performs the final integrated build. No shared route/state/package seams
were edited by this agent.

Native listing: `docs/fishing-native-receivers-2026-10-11.txt`. Produced with
NDK29 llvm-objdump, `-d --triple=thumbv7-linux-android`, bounded functions/ranges
only, from DataDump `local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`.
Original ELF SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses in the retained listing are ELF; Ghidra addresses add0x10000.

Next concrete recovery: request an original item/global-shop row for **LU001 or
LU003**, rather than another BAIT-art search. Recover one original fish item
row plus fish_id corroboration before a catch, pool or settlement. Current
price amounts, catch pools and fish definitions remain unknown. Existing
DataDump native inventory/cache scans should not be repeated without a new
source; the positive IDs above provide a new targeted item lookup instead.

## Bounded metadata follow-up

The DataDump 2026-10-10 →2026-10-11 tagged diff adds stats estimates/release
documents, not fishing item/shop data. A targeted LU001/LU003 search of tracked
sources, datasets, findings and retained migration documents returned only the
two native-string records. Exact-ID web searches likewise recovered no
qualifying original item/shop row; unrelated products sharing these codes
were discarded. No public search result was treated as gameplay data.

An independent read-only targeted scan of recognized inflated resource bodies
in seven original public PAD packages found zero LU001/LU003 occurrences:
LEVELING21, UI_CSV8, UI_ITEM196, UI_ITEM_CHA66, FISH_LIST45, FISHING87,
MGM_FISH343 (766 recognized inflated bodies total). This is a scoped literal
miss, **not** an exhaustive descriptor/reference absence proof: decoder counts
are recognized inflated bodies, not native record counts. Originals stayed
unchanged and no extracted file was written into DataDump.

Existing active-MANIFEST/SST/WAL GetItem-key audits already covered all six
preserved UserData/EtcData containers; those private body scans were not
repeated. The older VSFan raw extracted asset trees are not present in the
relocated DataDump local storage inspected here; its retained reports describe
older encrypted captures and no readable GetItem table. Their absence from
this location does not permit reading/editing the retained original workspace.

The positive wire/UI bindings above change the next action: inspect or obtain
**LU003's exact item and global-shop rows**. Its main-scene label and BAIT02_S
badge can guide a native observation, while item thumbnail_id and prices must
remain unknown. No hypothetical purchase or fish grant is now authorized by
this metadata-only discovery.
