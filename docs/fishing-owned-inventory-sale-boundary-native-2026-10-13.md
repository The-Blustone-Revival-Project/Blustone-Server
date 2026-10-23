> Correction2026-10-23: fishing item additions belong to ret_data.item. See [original ARM parent proof](fishing-end-item-parent-correction-2026-10-23.md).

# Fishing owned inventory and the remaining sale ownership boundary

Source audit only: no catches, RNG, inventory grants, original prices or sale
transactions generated. No live input/save/client/APK or DataDump changes.
Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
G coordinates are code ELF plus10000.

## Owned inventory is separate aggregate fish rows

RequestInven Gb2c914 posts auth5 to `/fishing/GetInven`; ReqInvenCB passes
the full response to ParseInven **Gb2d038**. That parser selects bare
`ret_data` Gb2d050/056, optionally handles achievement and indexes rows
numerically. Exact row shape is **`{fish_id,b_cnt,s_cnt,g_cnt}`**. IDs are
strict strings (lookup Gb2d1e6 then native string conversion), not instances
or resource aliases. Bronze/silver/gold counts are row scalar counters.

ParseInven converts all three counts as uint32: b at Gb2d136, s at
Gb2d184 and g at Gb2d1d0 (integer cases keep lowword). It creates a
fish-keyed count object. Critically, it **only inserts when that fish key
is absent** (lookup Gb2d296, existing-key branch Gb2d29e..2a0 skips insertion,
new entry Gb2d2a2..2f0). No full-map clear occurs at function entry. Empty
arrays simply skip iteration (Gb2d094..098). Therefore GetInven is NOT a
destructive inventory replacement and repeated native reads do not refresh
already-known counts. Do not claim successful[] clears stale fish inventory.

The sale updater below uses signed32 bronze/silver conversions, so limiting
supplied b_cnt/s_cnt to nonnegative signed32 is conservative local admission
that preserves both consumers; it is stricter than ParseInven's uint32 grammar.
g_cnt's source conversions are uint32 in both. Missing/malformed counters
default to zero natively; strict complete imported rows avoid that fallback.
Duplicate IDs, unknown metadata, rounded counts and malformed UTF8 must refuse
rather than be inserted ambiguously. No initial catch count is inferred.

## Exact sale request and authoritative count update

RequestSell **Gb2d3ec** takes fish string, two uint arguments and callback.
It serializes auth5 plus scalar **fish_id** (Gb2d548/54c), **grade**
(Gb2d568/56a) and **qty** (Gb2d590/592). Form constructor count8 is
Gb2d5b4; route `/fishing/SellFish` Gb2d6fc/6fe. This is not a batch instance
ID list or automatic sell-everything command. GetFishPriceByGrade separately
maps grade1/2/3 to b/s/g prices, as documented in the catalogue audit.
Original UI quantity limits and server stock/all-sale policy need their own
producer/consumer proof; a request grammar alone does not authorize settlement.

ParseSell Gb2b018 selects **one `sell_result` object**, not an array, at
Gb2b2a2..2a8 and tail-calls UpdateInven **Gb2eb9c** at Gb2b2ba.
That object has the same four fields: fish_id and all three remaining counts.
UpdateInven reads b_cnt Gb2ebba, s_cnt Gb2ec0c, g_cnt Gb2ec60 and fish_id
Gb2ecae. Bronze/silver float/string conversion is **signed32**
(Gb2ebf4/Gb2ec48), gold is **uint32** (Gb2ec9a). It inserts absent keys or
replaces the existing shared count object **absolutely**
(found-key path Gb2ee34..56). It does not subtract incoming counters or erase
the key on zero. Return the full remaining count row for a supported sale;
partial counters can reset unrelated grades to zero.

The original prior receiver audit positively proves ParseSell.user.gold.prev/
cur produces a uint32 delta and absolute wallet update, while `item` is an
array of **removal deltas** `{inst_id:uint64,qty:uint32}` consumed through
CSRInventory.RemoveItem Gaec5f4, not remaining quantities. Repeated item
deltas remove again. See DataDump
`findings/systems/fishing-sale-receipt-contract.md` and retained caller listings.

The relationship between aggregate owned fish counts and those general
inventory item instances has NOT been recovered. Supplying GetItem fish
metadata/catalogue rows proves identity/rendering, not that an aggregate
catch may be sold without a corresponding item debit or that one general
item equals one grade counter. This is the concrete remaining sale boundary.

## Follow-up catch classification and the separate generic receipt

`ParseEnd` Gb2a560 supports generic `ret_data.item` rows with
inst_id/added/ref_id; it calls CSRInventory.AddItem Gaec508 at **Gb2ab20**.
It independently supports card additions (Gb2ac38) and later consumed item
updates (UseItem Gaea5f8 at Gb2ae90). The actual catch fish_id/grade/length
branch instead calls **AddInven Gb2e758 at Gb2ae3a**, followed by
UpdateRecord Gb2e980 at Gb2ae46. These independent branches do not establish
that the generic item row must represent the caught fish, nor that it cannot.
No exclusive stock model or mandatory debit ratio follows from this callback.

AddInven independently resolves the exact fish metadata through
CSRItemInfo.GetItemData Gaf109c at **Gb2e77c**, then requires
**INFO+4==17** (Gb2e780..784) before it looks up the fish-keyed INVEN map
Gb2e790 and increments the selected grade counter. It does not allocate a
general item instance or read one to increment that map.

The metadata field binding is now positive: CSRItemInfo.SetItem Gaefe10
resolves `use_type` at Gaeff94/98 and stores its value at stack+ac
Gaeffe4. Raw INFO starts stack+a8 (Gaefe88/Gaefeb8). Its copy constructor
Gaf1aa4 copies the first16 bytes unchanged (Gaf1ab6/1ac8), called with that
raw INFO at Gaf0264..26e. GetItemData returns the map INFO value at node+1c
Gaf10c6. Therefore INFO+4 is the actual **GetItem.use_type**, and17 is the
native fish classification; it is not an inferred rank or resource ordinal.

Configured fish metadata may now admit use_type17 with supplied effect and
collect_qty retained. Type0 remains a prior LOCAL neutral read fixture, not
native fish behavior. Types1/3 remain unrelated fuel/trace gates. This enum
recovery does not recover any original fish ID/art/effect/value.

The complementary positive Shop stock-chain audit
`fishing-sale-owned-count-price-chain-native-2026-10-13.md` proves its outer
producer iterates nonzero GENERAL inventory item records of type17, then
uses Fishing.INVEN for grade quantities. Both are needed to expose the
ordinary sale UI. Count-only `owned_fish` publication must not be advertised
as playable native sale. Original stack-to-grade arithmetic, stack selection,
debit and retry ownership remain missing.

Neither the request nor the receiver supplies a transaction nonce or expected
stock version. Absolute wallet/count replacement is naturally repeatable as
receipt parsing, while positive general item removal rows are additive deltas.
That is NOT server-side sale idempotency: the same qty request can legitimately
sell another batch while stock remains. Do not add a guessed timed deduplication
window or claim a response-loss retry cannot sell twice.

## Refusal code safety: corrected transport/application distinction

ReqSellCB Gb2db30 checks CPVHTTPResponse.GetResultCode at Gb2db4c and
requires1 **before** parsing response JSON (Gb2db52/54). It later extracts
body result_code and calls ParseSell without another check (Gb2dc02).
Initially interpreting the first guard as HTTP-only would incorrectly imply
generic result2001 was unsafe. Further exact source closes that distinction:

- HTTP-manager producer parses response body G7ea806, selects `result_code`
  G7ea80a/810, converts its integer into r4 G7ea826 and calls
  SetPVCode G7ea866..86a. SetPVCode G7ee878 writes response+4.
- GetResultCode G7eeaf8 resolves HTTP200 at G7eebb2..b4, then returns the
  stored application/PV code at G7eeb8a. Only1001..1004 are remapped to1
  (G7eeb8c..94); ordinary code2001 is not.
- Therefore a normal replica JSON **result_code2001 skips ParseSell** via
  the first guard. No new transport error override or invented no-op sale
  receipt is required for the ordinary refusal. Those special remapped codes
  must not be used as arbitrary transaction errors.

## Safe current implementation seam

A distinct optional persisted `owned_fish` aggregate can expose explicitly
supplied already-owned rows through authenticated GetInven, using independently
admitted fish metadata and exact caller ownership. This read creates no
catch/general item or historical record and must preserve every game field.
Omitted state stays omitted; no default fish quantities are manufactured.
GetRecord is separate and cannot be derived from current stock alone.

Until aggregate-to-item ownership and price/receipt/quantity policy are closed,
SellFish/EndWithSell/catch generation remain unavailable. In particular,
publishing a grade price or owned row cannot license invented sale proceeds,
an empty general-item debit or idempotent retry claims.
