# Explicit owned fishing inventory persistence and native reads

`LocalGameState.owned_fish` is optional, separately imported ownership:
`[{fish_id,b_cnt,s_cnt,g_cnt}]`. It is never initialized from GetItem, lure
membership, price quotes, sprite names, tutorial flags or another account.
The live save is unchanged by this implementation. Authored tests seed only
disposable files; no grant or import endpoint is added.

Normalization preserves an explicitly present array, including zero-count rows,
and keeps the field absent in legacy/starter games. Malformed snapshots refuse
restoration rather than being replaced with an empty inventory. The supported
local schema requires unique nonempty lossless UTF-8 fish IDs, nonnegative
integer bronze/silver counts through INT32_MAX and gold through UINT32_MAX.
These are conservative supported widths, not original quantity admission rules.
Unknown row fields also refuse before projection, protecting unsupported import
metadata from silent deletion on a later save. The original file stays intact.

Authenticated GetInven reads existing game state without creating or persisting
a game. Each stored fish ID must have a separately supplied fishing item
definition; missing metadata refuses2001, preserving the imported snapshot.
The response is a detached bare row array. Repeated reads, unrelated accounts
and restarts preserve complete saved state. GetRecord remains empty because
counts do not establish longest-catch grade/length or original catch history.

Native ParseInven Gb2d038 inserts absent fish keys and does not clear its map
or replace already-present payloads. Consequently these reads are not promised
as a full destructive refresh. A future sale uses the distinct one-object
absolute `sell_result` update described in the source notes. Zero-count rows
must not be dropped merely to make the map look empty.

The reused agents additionally closed scalar SellFish fish_id/grade/qty and
the HTTP response preprocessing guard. Normal result2001 skips its settlement
parser; no HTTP status override or fabricated neutral sale receipt is needed.
Original fish-count/general-item-instance mapping and replay producer remain
unproved. Prices plus imported fish counts alone do not authorize skipping
possible item removals or crediting a guessed sale. Begin/EndWithSell/SellFish
remain unavailable and no bait/catch/record/wallet producer is enabled.

Verification: `tests/fishing-inventory-state.ts` uses authored rows for owner
isolation, exact grade widths, malformed/unknown/duplicate identity refusal,
no metadata-created ownership, detached repeated reads, full save preservation,
restart with/without metadata and refusal to overwrite malformed persistence.
Native rendering and actual production snapshots remain unverified.
