# Owned Gems and mounting: original parser and receipt evidence

Later closure: [position/replacement audit](gem-mount-position-replacement-native-2026-10-11.md)
proves positions1..2, equipment-rank3 second slot and full six-ID zero-placeholder
grids. It supersedes the earlier position/omission gaps recorded below. The
[server workflow](gem-inventory-mount-workflow-2026-10-11.md) now supports explicit
owned data and free first installs; paid removals/transfers remain gated.
Large native IDs require integer JSON tokens, not strtod-converted strings.

`gem-instances.ts` is a pure supplied-data parser/projector; tests use authored
identities and ability rolls. It publishes/grants nothing. Original GetGem
catalog, owned rolls and disassembly prices remain missing. Original ARM hash
and coordinate convention match the Gem combination note. Primary DataDump
sources: `sources/native/economy/ghidra-gem-inventory.txt`, corresponding keys,
`ghidra-gem-reference.txt`, and native symbols. Additional request/receipt/UI
consumers were checked directly from immutable Thumb bytes.

## Owned shape and join

GetGem reference rows contain id/name/desc/res_id strings plus numeric
set_effect_id/rank/target. target1..3 becomes native equipment TYPE0..2.
GetGemInven ret_data is the owned array. CSRGem.parse Ga5d3dc reads:

- ref_id string; inst_id uint64; rank/level/position unsigned numeric.
- target_inst_id uint64 (zero means no selected Hunter in GetEquipedGem).
- ability is a STRING, separate from structured abilities. Its format remains
  opaque; no decoded JSON/stat meaning is invented.
- abilities is null or an object with level_up_failed unsigned, main full
  CSRCardStat and sub collection of full CSRCardStat rows. Null skips parsing.
  Each main/sub stat uses mode100, so growth increments divide100 as well;
  speed/critical chance/penetration/block chance retain wire values, other
  floating fields divide100. Sub rows are individually retained and summed.

The allocation includes a shared_ptr header; subtract its16 bytes before
reasoning about PLAY_DATA. Exact PLAY_DATA layout: reference-resolved TYPE+00,
ref_id+04, inst_id+10, rank+18, level+1c, position+20, set_effect_id+24,
level_up_failed+28, reference res_id+2c, ability+38, target_inst_id+48,
main+50, summed sub+148, individual sub vector+240. Earlier apparent position
versus resource-string overlap is an allocation-base mistake, not a native
overlapping field. Owned rank is preserved; no inference equates it to the
reference rank or overwrites it from the reference.

The pure helper requires supplied known references and explicit known Hunter
ownership for mounted targets, exact decimal uint64 IDs/safe numeric IDs,
unique instance/ref identities, strict full numeric-string stats and canonical
sub arrays. These are local admission rules; native iterators also accept
object containers and loose scalar conversions. Position remains unrestricted
uint32 because its mount ordinal has not been closed. No slot-capacity or
occupancy permission is implied by parser success. JS stat projection is not
bit-perfect native decimal arithmetic.

## Request and current mounted selection

CSRGem.RequestGemEquip Ga557cc posts `card_handler/EquipGem`, reading
target_inst_id, price_type and combination. Combination is JSON dumped into
a form STRING; its exact plural keys are weapons, armors, accessories.
The function explicitly creates three empty JSON ARRAYS at Ga557f2,
Ga55846, Ga55892, then appends uint64 list IDs for internal TYPE0/1/2 at
Ga55932/Ga559ac/Ga55a1c. Empty lists stay[], unlike equipment rank-up's null
source vector. It does not itself enforce uniqueness, slot count or ownership.

GetEquipedGem Ga56858 returns empty slot groups for target0. For a nonzero
target it filters inventory by PLAY_DATA.target_inst_id+48
(Ga56ad8/Ga56b14), sorts by PLAY_DATA.TYPE+00 via Ga6650c/Ga6691c, then groups
by TYPE (Ga56c64/Ga56c72). This consumer does NOT establish position+20
numbering or positional ordering. The confirmation interface signature
`SetGemInfo(..., shared_ptr<PLAY_DATA> (*)[2], ...)` and scene grid prove
two positions per equipment row, but do not alone prove whether outbound
lists omit empty positions or send uint64 zero placeholders. No zero-ID
mount/unmount interpretation is enabled yet.

## Receipt is full existing-instance replacement, not a Gem grant

ParseGemEquip Ga5c9ec receives full envelope plus target Hunter uint64.
It selects ret_data.achievement and ret_data.user and applies absolute
user.gold.cur, user.gdp.cur, user.iap_qty, user.free_iap_qty; user.item rows
contain inst_id/qty and call SetItemQuantity Gaec4bc at Ga5cf0c. These are
absolute balances/quantities, not additive rewards or charges.

ret_data.gems (literal PC-addGa5cf80) contains FULL owned Gem rows. It looks
up each returned inst_id only among existing Gems; unknown IDs are skipped.
For a found instance it reparses the full row at Ga5d146 and assigns
PLAY_DATA at Ga5d14e. A changed-only `{inst_id,target_inst_id,position}` DTO
would therefore drop/refuse required ability/reference fields. Finally
ValidateCard Gaeae10 at Ga5d21a refreshes the supplied target's calculated
stats. This path does not insert newly awarded jewels or recover gacha pools.

## Unmount economics and exact remaining gate

Confirmation SetGemInfo Gbc8b70 computes disassembly totals using the
current Gem LEVEL+1c, not rank, at Gbc9076. It calls
FindGemDisassemblePrice(level, PRICE_TYPE2) at Gbc9084 and TYPE1 at Gbc90a2,
adds their price fields to popup+9c/+a0, and increments a count at+a4.
The payment buttons call a confirmation action with TYPE2 and that price
(Gbc86b0/Gbc86c8), or TYPE4 and the count (Gbc88b4/Gbc88ca); this is evidence
of another removal payment option, not permission to guess its server
currency/consumable semantics. Receipt gdp/iap channels must remain distinct.

Still needed before a full mount planner: exact old/new comparison deciding
which Gems incur removal fees, complete position numbering and zero/omission
semantics in the submitted arrays, whether a selected Gem can move directly
between Hunters, original disassembly rows/currency identities and ownership/
active-use protections. Do not silently make removal free or use display-help
values as base Gem rolls. An eventual configured local-data workflow can reuse
the validated reference/instance model and full receipt reconstruction once
these specific links close; no runtime/UI/owned grants were performed here.
