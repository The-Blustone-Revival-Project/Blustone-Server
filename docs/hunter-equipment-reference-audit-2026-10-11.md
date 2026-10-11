# Hunter equipment: recovered identities and display joins

Bounded offline audit only. No references, owned fields, routes, game saves,
fees or growth values were changed. DataDump remains read-only.

Original final ARM library SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below use Ghidra coordinates; ELF offsets subtract0x10000.
Native locators: DataDump `sources/native/hunters/ghidra-card-keys.txt`,
`native-card-inventory.txt`, `sources/native/symbols/native-evidence.tsv`.
New conclusions were checked directly against immutable original Thumb bytes.

## Reference and owned joins

GetCard's equipment collection is embedded per Hunter, not an independent
equipment inventory. The loop at G87bff6–G87c226 constructs CSREquip records
with stride0x120: CSRCardStat at+0, internal TYPE at+f8 and string storage at
+fc/+108/+114. The loop reads `id` as a string (literal slotG87c1c0,
PC-addG87c0ae resolves G1d676c3), `type` and `rank` numerically. Wire types1..3
become internal0..2 at G87c164; invalid zero becomes-1. It calls
CSRCardStat.parse G886fc0 on the SAME equipment row with mode100 at G87c200.
Stat fields therefore are direct siblings of id/type/rank, not a nested
`stat` object. There is no equipment `res_id` read in this loop. Do not add
an invented res_id to explain missing art.

Owned CSRCard.parse G8680a4 reads flat `weapon_rank`, `weapon_level`,
`armor_rank`, `armor_level`, `accessory_rank`, `accessory_level`, not an
array of equipment instances. Exact literals:

- G868a2c + G86873c → weapon_rank; G868a30 + G868792 → weapon_level.
- G868a34 + G86885a → armor_rank; G868a38 + G8688ac → armor_level.
- G868a3c + G868972 → accessory_rank; G868a40 + G8689c4 → accessory_level.

These values populate the TYPE-keyed EQUIP_DATA map at card+40/44/48 with
keys0 weapon,1 armor,2 accessory. Tree nodes store level at+14 and rank
at+18. `FindEquipInfo` G87db04 joins a Hunter reference, TYPE and requested
rank against the Hunter's equipment vector, whose records advance0x120.
`CalcStatByEquip` G87de28 is the further level/rank stat consumer to inspect
before any equipment stat or training integration. Prices remain separately
gated by `equipment-prices.ts`; ordinary Gym prices are not these prices.

## Genuine artwork already available

`CSRThumbEquip.SetEquip` G1070144 takes a Hunter reference string, TYPE,
and an unsigned alternate selector. With selector0 it gets ordinary
CSRCardInfo.res_prefix at+0c (G1070212); with nonzero selector it obtains
CSRAwake.FindAwakeRef G85d494 and uses returned resource prefix at+20
(G10701c4). At G1070236 it calls `SRGetResEquip` G10ad7c4.
That function appends ORIGINAL suffixes to the supplied prefix:

- TYPE0 → `_WEP` (G10ad7de, string G1d94575).
- TYPE1 → `_AMOR` (G10ad7ec, string G1d9457a).
- TYPE2 → `_ACCRY` (G10ad7fa, string G1d94580).

The spelling AMOR/ACCRY is intentional. These are actual resource lookup
names, not guessed filenames. Read-only traversal of all imported
`resources/runtime/assets/*.jet` using original24-byte record headers,
packed length+8 and uint64 base38 name+12 found150 owner packs with exactly
three equipment records each (450 names); each matching pack traversed to
exact EOF. For the four current ordinary Hunter identities:

- C001_Q.jet owns C001_WEP/C001_AMOR/C001_ACCRY; SHA256
  `35dd21bbe416a32058935ffa6d8e1cbbafd883f6fd06ab4909161faa97016b79`.
- C002_Q.jet owns C002_WEP/C002_AMOR/C002_ACCRY; SHA256
  `978711f8e135b03c771835f159fb2be8d63b7778a815c0fbaa065199d2aef9b9`.
- C004_Q.jet owns C004_WEP/C004_AMOR/C004_ACCRY; SHA256
  `08f6e49a8237350b583f2730cdc48428173cbca87c7fd9619ba8973c3ad70f05`.
- C005_Q.jet owns C005_WEP/C005_AMOR/C005_ACCRY; SHA256
  `e42fa21170173e51328f69bd97ac56252f65e0c61be41c5fef923283e4a97afe`.

Availability on disk does not prove selection/download/native rendering.
Art metadata can be catalogued and pinned independently of unknown stats;
publishing zero-stat equipment rows to open the screen would invent original
equipment references and could alter combat totals.

## Localized names and exact remaining links

DataDump `findings/hunters/base-stats-visual-hunt/charstr-items-2026-10-06.tsv`
is original shipped CHAR_STR name metadata, numbered001–098 with localized
WEAPON/ARMOR/ACCESSORY keys. It has98 weapon/accessory records and97 armor
records; community wiki text is not interchangeable. For example001 has
Long-Range Rifle/Hunter Jumper/Judecca's Gift;002 Combat Knives/Werewolf's
Ranger Suit/Tribe's Token. These strings are available without guessing.

Native `CSRCardInfo.GetEquipName` G87aaac and GetEquipDesc G87abb8 call
`CSRStaticData.FindCharRefString` Gf41bd8 using a global TYPE-indexed24-byte
pair table rooted G21df288. Follow-up name lane closed the constructor:
G87aac8/G87abd4 copy the original Hunter reference string (the initial
empty-string interpretation was wrong). The exact lookup key is Hunter refId
plus optional `_`+GetAwake plus `|`+TYPE field. The original initializer
ELF67886c supplies WEAPON/WEAPON_DESC, ARMOR/ARMOR_DESC,
ACCESSORY/ACCE_DESC. Ordinary001|WEAPON and004_1|WEAPON align with real
original keys. This does not equate a GetCard equipment id to a CHAR_STR key.

To make the real equipment popup safe, recover original per-Hunter
equipment id/type/rank/direct-stat rows and permitted level/rank ranges.
Localized-name resolver and CalcStatByEquip formula are now closed by their
separate pure helper lanes. Existing original art needs no
fabricated equipment res_id. Unknown owned rank/level must not silently
become1 or be granted merely because images exist. Earlier accessory
screenshots contain only isolated observed values; new release estimates
are explicitly DERIVED-ESTIMATE and do not close the reference rows.
