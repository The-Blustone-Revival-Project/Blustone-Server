# Fishing revival: bounded source update and next read integration

Follow-up: fishing-sale-owned-count-price-chain-native-2026-10-13.md positively
closes original GetItem.use_type17→ShopSell fish row production. The later
reference admission now supports explicitly supplied native type17 fields;
neutral type0 remains restricted to empty effect/collect_qty0. This supersedes
the earlier unknown-fish-enum boundary below, not the missing original metadata,
general inventory seed, catch or settlement boundaries.

## Implemented configured read seam

ServerState now snapshots `fishingItems` and `fishingCatalogue` constructor
options, or `BLUSTONE_FISHING_ITEMS_JSON` and
`BLUSTONE_FISHING_CATALOGUE_JSON`. Items are a strict array of the nine fields
below; catalogue is `{pools:[{lure_id,fish_id}],prices:[{fish_id,b_price,s_price,g_price}]}`.
The fish-ID admission set comes ONLY from those separately supplied item rows.
Collision checks reject existing base items, LU001/LU003 bait identities and
selected Hunter reference IDs. The supported read-only metadata policy requires
use_type0, empty effect and collect_qty0 for the neutral LOCAL read fixture.
Follow-up source closes genuine native fish classification as use_type17;
that type is now admitted with all supplied effect/collect_qty fields retained.
No original IDs, metadata values or quantities are constructed. Other numeric
fields remain explicit uint32. Types1/3 and other unproved classifications refuse.

GetItem preserves all existing sections and appends those same detached rows.
Authenticated GetFishingPool returns the complete ordered supplied table,
ignoring invented lure/place filters. GetPriceRef accepts one nonempty scalar
fish_id and returns a bare array of matching rows, including explicit zero
prices. A missing price yields[], while a missing entire catalogue refuses2001.
An explicitly supplied empty catalogue may return[]; defaults remain unavailable.
Config/input/response mutation cannot change subsequent publication. Reads and
restart leave the complete saved games/accounts byte-identical. No fish/item
stacks, records, bait purchase, Begin, SellFish or EndWithSell are enabled.

Authored `tests/fishing-catalogue-state.ts` covers metadata parity, both lure
groups, scalar validation, authentication, immutable repeated reads, independent
accounts, collisions/side-effect rejection, no grants and restart preservation.
These tables are supplied contract fixtures, not an original recovered catalogue.
Native rendering/combined resource validation remains pending.

Root also checked GitHub releases on2026-10-13 via `gh release list`: Latest
is2026-10-11.2, published2026-10-11T08:27:08Z. No newer published release was
listed. This verifies release freshness, not exhaustive fishing-data absence.

The strongest next implementation is authenticated, immutable publication of
explicit fishing metadata and pool/price tables. No new original fish identity
was located. DataDump checkout HEAD is a1c9049, dated2026-10-11.2; the preceding
2026-10-11 release is49a89bc. Its inspected reference exports/findings remain
the same identity boundary described in fishing-catalogue-consumers-2026-10-13.md.
No remote/publication freshness or exhaustiveness claim follows from this local
checkout check. Original/DataDump read-only, no live operations.

## Item metadata integration must avoid unrelated consumers

Actual original CSRSyncRef.ReqItemCB Gf83a14 passes full envelope into
CSRItemInfo.SetItem Gaefe10. This selects ret_data Gaefe36 and item Gaefe58,
clears the existing table, then consumes the row ARRAY. Required row strings
are id/name/desc/thumbnail_id/effect. Required numeric fields are rank/use_type/
sell_price/collect_qty. Effect is a string even when it contains a number.
Keep existing trace/global_item sections and existing item rows intact; a
standalone fish array as ret_data would not satisfy this consumer.

Metadata can have side effects even when no item inventory is granted:

- use_type1 participates in CSRItemInfo.GetItemRefID(USETYPE1), called by
  ShopFuel.Init Gd49bfa. Its effect is parsed as numeric AP at Gd4a2b6..2c6.
  Adding arbitrary fish rows of that type can redirect an existing AP popup.
- use_type3/effect binds Hunter trace identity and collect_qty during original
  ItemPostProcess, as documented by the current hunter-traces implementation.
  Publishing that row can alter Hunter reference/navigation metadata.
- Adding global_item/trace acquisition records would assert purchase or source
  links that the recovered fishing table does not provide.

For a declared LOCAL read-only fish metadata class, use_type0 is a defensible
neutral supported admission; this is not recovery of the original fish enum.
If another original type is supplied later, recover its PostProcess/consumer
before widening that class. Keep raw supplied metadata and provenance visible;
do not fill unknown original name/art/effect/stat values from sprite ordinals.
Reject collision with all existing base item IDs and reserved known bait IDs
LU001/LU003. A supplied RP1/VIP1/capsule/trace must not be reclassified as fish.

Configured pool and price rows must join ONLY those separately supplied fish
definitions, and the SAME definitions must be appended to GetItem's item array.
Return detached copies; validate/freeze constructor configuration before save
restoration. Pool is the full ordered bare table (auth-only request); price
request is one scalar fish_id and returns matching bare row array. Defaults
remain no new fish/pool/price and no grants. Incomplete tables can be published
for reads but cannot authorize Begin/End/Sell or bait purchase.

## Additional original record consumer closure

Direct bounded immutable ARM inspection also pins ParseRecod Gb2c5b8:
it selects ret_data Gb2c5d6, checks optional achievement separately, then
indexes each collection row numerically Gb2c674. Keys are grade Gb2c63e,
length Gb2c644 and strict STRING fish_id Gb2c710/Gb2c720. Both grade/length
float-string conversions use signed32 Gb2c6b2/Gb2c6fc; they populate native
record payload+0/+4 at Gb2c752/Gb2c738. This is distinct from GetInven's
bronze/silver/gold counts. No size unit or grade-from-length threshold follows.

UpdateRecord Gb2e980 accepts fish_id/grade/length. On existing fish record,
it compares EXISTING length+4 with incoming length at Gb2e9b8..9bc using
signed >=. Only STRICTLY longer catch overwrites BOTH grade/length
Gb2e9c0 and sets new-record flag Gb2e9c6. Equal/shorter length keeps both old
fields even if the new grade is higher. Missing identity inserts a new record
and sets that flag Gb2ead4..ad6. Thus a future imported record model must
not maximize grade independently, add lengths, or create a record from prices.
Native length sampling, units, achievement rules and original acquisition
remain separate unknowns. Current empty GetRecord is truthful because no
earned/imported fishing records exist; no invented history follows from reads.

## What this enables and preserves

Immutable explicit fish definition/pool/price publication is a concrete next
unit with full constructor/schema/auth/detachment/collision/restart tests.
It closes missing read routes without inventing fish, catch distributions,
rewards or economics. It does not establish a playable catch/settlement loop,
original bait metadata or a genuine original fish ID. No code/state/runtime
change was made by this evidence lane.
