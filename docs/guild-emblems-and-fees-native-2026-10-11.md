# Original Guild emblem IDs and fee-reference seam — 2026-10-11

Six stock Guild-emblem picker IDs are now positively reconstructed from original
UI/native/resource evidence: GD_IMG_1 through GD_IMG_6. These are full resource
names, not ordinal server IDs inferred from a filename. Four more real original
sprites GD_IMG_7..GD_IMG_10 exist, but the final picker does not offer them.
No Guild creation, fee, membership, resource activation or native UI action was
performed by this lane.

## Three independent bindings

1. Native CSRPopUpGuildChangeIcon.Init Gc8e024 loads exact GUILD/G_P_ICON
   (ADD Gc8e042). Its OnButtonClick Gc8e118 loops integer1..6; Gc8e2de adds1,
   Gc8e2e0 compares7 and exits. The loop constructs BT_THUMB plus index using
   its bound literal (Gc8e2ba). For the matching button, it finds child SPR_RANK
   (literal Gc8e2c0, lookup Gc8e39a) and calls ORIGINAL
   CSRUIImageNode.GetResName G7b1a06 at Gc8e3a0. That existing sprite resource
   name is copied and delivered by the callback; the client does not generate
   an emblem ID from a numeric button ordinal.
2. The original UI_XML_RO source000005.ldb has exact EN/GUILD/G_P_ICON and
   KO/GUILD/G_P_ICON records. Both have BT_THUMB1..6, each with SPR_RANK and
   explicit res-name GD_IMG_1..6 respectively. Their UTF8 XML valueSHA256 is
   cb33d05f90b7de0d9736750d3c61e038fff7df12c0eaef4eeba5c0b7531fe34c.
   Whole sourceSST SHA256 is
   054790fe369d381490a101a38e123de22e8ca4eb28f8255d456515b6ee25bb3e.
   This pass used a read-only pure SST reader with bounded Snappy decoding and
   XML parsing. No database was opened for writing/compaction and no raw XML
   archive was copied into the new repository. Curated binding metadata only
   appears in resources/reference/guild-emblems.json.
3. Original GUILD.jet contains named S2 records GD_IMG_1..10. Resource names are
   recovered from actual24-byte record headers, packed-size at+8 and uint64
   name at+12 using the ORIGINAL base38 alphabet
   0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._. The primary native proof is
   CRMResMap.ExtractJETInfo G10e5f58 and RM10to38 G10d2af4, retained in DataDump
   findings/hunters/starter-skill-resource-bindings.md. The pack was traversed
   to EXACT EOF2258272; all106 header records were accounted for. Existing
   list-jet-entries.py reports52 image entries and misses these raw S2 tail
   records; it is not an oracle for all names in this pack.

The ten exact S2 header offsets, in ID order, are2254903/2254993/2255083/2255173/
2255263/2255353/2255443/2255533/2255623/2255713. Each sprite has raw/packed size66
and actual S2 payload. The metadata sidecar records every payload SHA256.
Whole original pack SHA256 is
9a2964fa1137b4ed6d09570103397ab3a221f31c97ed462c03a94fbe01c5fe66.

Native CSRThumbGuild.LoadEmblem G1071a64 routes ordinary sprite names to
LoadSprite G1071d7c. LoadSprite copies its input unchanged; only empty input
falls back to exact GD_IMG_1 (ADD G1071dae/assignment G1071db4). Hashing/loading
that resource occurs at G1071dd0/G1071dd8. This is a concrete original fallback,
not a guessed arbitrary icon assignment to a newly created Guild. Uploaded
image URL handling is separate and remains unenabled by these stock-ID guards.

Original ARM read-only source SHA256:
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
G addresses equal ELF/file offset+10000 in these regions. Bounded Capstone5.0.7
reads corroborated the consumer sites. No Ghidra/device/runtime/private-save
operation or DataDump edit occurred.

## Fee grammar and the exact creation gate

CSRSyncRef.ReqGuildPriceForActionCB Gf84f6c checks success1 then selects
ret_data at Gf84f8a/Gf84f8c and passes that SELECTED subtree to
ParsePriceByActionRef Ga801ac. This differs from the full-envelope equipment
setters: do not add another ret_data wrapper inside the selected rows.
Parser keys: action ADD Ga80246; price_type Ga8024c; price Ga80252. Arrays and
object collections have iterator branches; this helper's canonical array
admission is deliberate server policy, not a claimed original captured shape.
It stores the action as map key, with price/action/price_type in its returned
three-word PRICE record. Duplicate rows retain a first-row ambiguity natively;
the helper refuses duplicate action keys rather than depend on insertion order.

CSRTabGuildMgr.SetCommon Gfcde6c calls FindPrice(action1) at Gfcde90, action2 at
Gfcdeb0 and action3 at Gfcded0. Their records are cached+930/+93c/+948. The
BT_CREATE branch reaches Gfcf65e, reads FIRST word+930 (price), and compares it
with CSRPlayData.gold+154 at Gfcf66a..Gfcf670 before RequestBuild Gfcf886.
This closes creation action1 and the CLIENT GOLD AFFORDABILITY GATE.

It does NOT establish original server settlement currency, the meaning of
price_type, numeric fee values, admission gates or changes to existing guilds.
Historical guide mentions of Manda cannot override the actual client gold
comparison, and that comparison alone cannot recover server wallet debits.
The quote helper explicitly reports settlement_wallet:"unrecovered". Missing
action1 returns undefined; it never supplies0/free creation. No numeric fee
record is added to the running replica or resource metadata.

## Files, verification and practical limits

- src/guild-emblems.ts: original picker/sprite registries, source pins, native
  base38 header reader and exact original S2 verification.
- resources/reference/guild-emblems.json: curated pack/header/UI bindings with
  provenance and explicit native_rendering_verified:false / no fee-data claim.
- src/guild-prices.ts: independent selected-row grammar validation and exact
  action1 client gate quote, without invented economy/wallet semantics.
- tests/guild-emblems.ts and tests/guild-prices.ts: positive original pack/SST
  pins, all ten real sprites, six exact picker bindings, metadata consistency,
  authored independent header-arithmetic control, damaged/truncated source
  refusal, filename/ordinal/URL guesses refused, and missing/duplicate/unsafe
  fee rows refused. Both focused tests and npm run build passed.

Parent has prepared an inactive140-package Guild profile and verified its
original package transport separately. This lane did not activate it. Native
picker rendering and actual Guild membership/creation remain pending. A future
read of an already-established Guild may recognize all ten verified sprites;
a fresh stock-picker selection is limited to the six actual offered IDs.
