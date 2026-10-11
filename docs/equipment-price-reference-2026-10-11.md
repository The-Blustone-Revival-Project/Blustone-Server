# Equipment-cost reference admission — 2026-10-11

No original numeric equipment price, Overcome price or card-sale profit record
was recovered by this bounded new-key pass. It searched exact card_sell_profit
in structured sources/findings JSON/TSV/CSV/text; hits were native symbol/string
exports, not production data rows. Phone snapshot path inventory showed known
local resource/UI databases, not a new identified game-reference response.
Three new queries (official publisher equipment+rupees, transcend+rupees, and
exact Blustone+card_sell_profit) returned no results. This is a bounded negative,
not an exhaustive absence claim or repetition of prior equipment-wiki sweeps.
Private account/preferences contents were not printed/read as a data substitute.

The next useful seam closed is the final native equipment-cost consumer. The
new validation helper src/equipment-prices.ts admits complete explicit rows,
requires known positive material identities and refuses absent/empty-table
activation rather than fabricating generic Gym prices.

## Native source and envelope owner

Read-only DataDump local/inputs/extracted/lib/armeabi-v7a/libnative_core.so,
SHA256 c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded Capstone5.0.7 Thumb reads; G addresses equal ELF/file position+10000 in
these regions. No Ghidra, original/private-save writes, device or runtime action.

SetEquipLevelUpPrice Gddc584 takes the FULL response JSON, clears its level map
at model+380/384/388, then indexes ret_data at ADD Gddc5b8/call Gddc5c0.
It iterates that selected collection. Arrays are supported (Gddc5d2..Gddc5e8)
and there are object-iterator branches too; canonical arrays in this helper are
an explicit replica admission policy, not a captured production container.

Each level row's exact keys:

- price_type — ADD Gddc650
- price — Gddc6ca
- level — Gddc718
- item1_qty / item1_ref_id — Gddc766 / Gddc7b4
- item2_qty / item2_ref_id — Gddc814 / Gddc894
- item3_qty / item3_ref_id — Gddc8f2 / Gddc950
- item4_qty / item4_ref_id — Gddc9ae / Gddca0c

Level numeric value is stored sp+3c at Gddc764, then copied as the map key to
sp+18 at Gddca68..Gddca6c, followed by map emplace Gddca8a. The key is LEVEL,
not (level,price_type) or a fake sequential row ordinal. FindEquipLevelUpPrice
Gddd0c0 searches model+384 by this key and returns row data+14. Its missing
branch Gddd0f2..Gddd110 invokes the original assert. Publishing an empty or
partial table merely to satisfy a response shape does not restore equipment
training; every actual level looked up needs a proven row.

SetEquipRankUpPrice Gddcc20 separately selects envelope.ret_data at Gddcc48.
Its exact row keys: price_type Gddccd6; price Gddccdc; rank Gddcce2;
item_qty Gddcdf8; item_ref_id Gddce56; card_qty Gddcec6; attr Gddcf14.
FindEquipRankUpPrice Gddd130 iterates its model+38c/390 rows and compares
RANK at row+c (Gddd15c) and ATTRIBUTE at row+20 (Gddd162), corroborating its
original FindEquipRankUpPrice(int,CHAR_ATTRIB) signature. No match returns
an initialized empty price record; it does not borrow ordinary Gym prices.

The reference routes are /reference/GetCardEquipmentLevelUpPrice and
/reference/GetCardEquipmentRankUpPrice. Original CSRSyncRef callback symbols
Gf84e08/Gf84e2e own these routes. Setters operate on the full envelope; a replica
route still places the selected records as ret_data, rather than wrapping them
again in ret_data.list or ret_data.ret_data.

## Implemented admission and limits

The helper returns exact level or rank/attribute rows; duplicate keys refuse.
Each item quantity is a deliberate nonnegative integer and its matching ref
field must be string. A positive quantity requires a nonempty known item ID;
zero+empty is an explicit no-source slot. It requires result_code1 and a
nonempty ret_data array. Signed32 nonnegative numeric bounds and strict JSON
numbers are local safe publication policy; native coercion accepts additional
types which this module intentionally does not reproduce. It does not infer
original maximum level/rank, legal payment enum, wallet choice, attribute
assignment, original costs, item requirements, discounts or stat curves.

Lookups return undefined on a missing exact key, with no zero/100/1000 fallback.
A later mutation needs the native part/price_type mapping, next-level semantics,
original equipment stat reference, every material's owned instance accounting
and atomic persistent settlement. No counter-only fake stat improvement is
implemented. Unknown prices remain unknown.

Tests/equipment-prices.ts uses authored amounts/AUTHORED_CRYSTAL only as a
contract harness. It checks full envelope ownership, four distinct source
slots, same-rank distinct attributes, duplicate/missing rows, wrong old Gym
container/alias fields, signed32 overflow, unknown material identities and
unchanged inputs. npx tsx tests/equipment-prices.ts and npm run build passed.
No shared route/state/bootstrap file or live configuration was changed.

