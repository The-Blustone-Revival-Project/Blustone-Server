# Episode reward item IDs: current metadata boundary

The recovered Episode graph proves rewards and quantities, including E01
GC2x3, E03 GC3x3+GC4x3, E04 GC8x1, E09 CERUM03x20 and E10 SK13x30+SK23x30.
These declarations do not provide complete GetItem records. This bounded audit
keeps earned claim refusal for unsupported IDs; no item pool, thumbnail, use
classification, effect, sale or redemption authority was invented.

Two independent source lanes checked the current DataDump text exports and
public client tables, original UI_CSV/UI_ITEM/UI_SHOP records, and the newer
manual image-extraction text. The73 extracted TSV batches contain3626 rows
with3626 unique image indices. Exact SK13/SK23/CERUM03 tokens were absent from
that extracted text; this is not a claim that every source pixel was visually
inspected or that internal IDs must be printed in the game UI. GC2/3/4/8 likewise
have no defensible item-definition join in the scoped table/art checks.

Original UI_CSV HELP_DATA CONTENTS11_3, Modify Equipment, supplies meaningful
material names: Fire uses Flammable Material, Ice uses Coolant, Electricity
uses Lightning Box; the article identifies Mirage as their source. Extracted
images corroborate named items and historical prices: batch13/index624 Mirage
shop has those three names at x2/500; batch15/index726 inventory shows Lightning
Box and Coolant at1000; batch66/index3297 equipment goals display the corresponding
red box, blue bottle and lightning box x4. Those observations do not tie
CERUM03 to an element, prove its item use_type/effect, or recover its full row.
The numeric suffix03 is not accepted as an identity mapping.

Other extracted panels name Unusual Metal Piece, Invincible Shell, Scorching
Flamestone and Fruit-Bearing Herb. Without an exact ID join they cannot label
SK13/SK23. Item record namespaces such as IT_GCO identify original artwork;
they do not independently assign GC2 or GC8 to a particular GetItem thumbnail.
Native coupon request selector/type evidence is distinct from the missing
GetItem metadata and the original redemption pool.

Original UI_CSV has eight records and reaches exact EOF93380; its SHA256 is
73a9dc4755baf8eb84c3fa945b7dd8b10228fe73d47a945de27137de2c84dac8.
The text-bearing records are GUILD, HELP_DATA, HELP_LINK, IAP_CODE, LOCAL_AREA,
MOB_REF, SOUNDLIST and STAGE_REF. None is an original item-reference table.
A bounded web search for exact internal IDs provided no corroborating primary
source; unrelated search results were discarded.

A future enabling evidence unit is an original reference/capture or an
independently verified native/localization binding for the exact item ID,
including name, description, thumbnail, rank, use_type, effect, sell_price and
collect_qty. A reward quantity, a material name or a visually similar icon is
not that unit. No original/DataDump/private/runtime files were changed by this
audit, and no native claim or new Episode reward was attempted.
