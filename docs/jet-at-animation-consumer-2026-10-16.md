# Original AT animations: native frame-to-sprite binding

Immutable library SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Existing DataDump source:
`sources/native/campaign/ghidra-map-animation-binary-loader.txt`,
CRMAnim2.Load G10bae00. Fresh bounded original Thumb independently checked
that loader and CRMResConstructor.MakeResource G110b358; no originals,
DataDump files or live state changed. Coordinates are Ghidra=ELF+0x10000.

## Actual AT owner and offsets

MakeResource examines first two payload bytes G110b3fe..408 for AT, subtracts
the two-byte type prefix G110b462, constructs CRMAnim2, passes payload+2 at
G110b48e, sets the extra stack parameter1 atG110b490/492, and calls
CRMAnim2.Load G110b49a. A2 uses the same loader with parameter0 instead;
this document/tool extension covers AT only.

Load calls CRMTransfQV.Load G10bae72, consuming40 transform bytes. It reads
ONE BYTE into object+5dc G10bae78..80, then uint32 frame count atG10baebe..c6.
This byte is preserved as opaque, not normalized to a boolean or named as a
loop flag. The decompilation's argument propagation is misleading, but the
instruction lengths/pointers are explicit.

Full AT payload offsets:

- 0..1: AT type.
- 2..41:40 transform bytes.
- 42: opaque byte.
- 43..46: unsigned32 frame count.
- Each frame: full unsigned64 sprite key, float32 duration, unsigned16 tag
  byte count and that many opaque tag bytes. First key begins47, duration55,
  tag length59. A one-frame AT with empty tag is61 bytes.

The per-frame key is read as8 bytes atG10baf06..0e and duration as4 at
G10baf12..1a. RM10to38 receives the full key G10baf20..24;
CRMResourceMgr4.LoadSprite2 gets the decoded name G10baf66..6a. Missing
sprite follows the failure branch G10baf70..72→G10baff6. Successful sprite
and duration go to CRMAnim2.Add G10baf74..78. AT's extra parameter1 enables
the uint16 tag count read G10baf7c..90 and optional byte copy G10bafa8..b0.
Native tag assignment uses strlen; offline tooling retains exact tag bytes
without claiming native embedded-NUL equivalence.

## Exact original ST002 joins

Original `local/inputs/extracted/assets/ST002.jet` in DataDump:
SHA256 `e75a9e7be84632e960a3084e4262726604c013d96633c3015d125f9ada9129ba`,
2,985,916 bytes,24 records, exact archive EOF.

All eight AT resources have one frame, duration0.5, empty tag:

- STI002_A1 → STI002_A01; opaque byte0.
- STI002_B1 → STI002_B01; opaque byte224.
- STI002_C1 → STI002_C01; opaque byte255.
- STI002_D1 → STI002_D01; opaque byte112.
- STI002_E1 → STI002_E01; opaque byte34.
- ST002BG → ST002_BG; opaque byte0.
- STI002B → STI002B_01; opaque byte0.
- ST_SHADOW → ST_SHA; opaque byte0.

First seven referenced sprites have66-byte S2 projections and image joins.
ST_SHA is an82-byte two-image S2, closed by the follow-up below. Do not conflate
frame-name resolution with complete sprite decoding. Example first key
4754196294077761 for STI002_A01 exceeds uint32; truncation loses identity.

## Offline supported subset

`scripts/resources/jet-index.py` now emits `atprojection`: `supported`,
`frame_count`, `opaque_byte`, raw/float transform, frames with exact key/name,
duration_float32/duration_hex/tag_hex, sprite digest/size and separate
sprite_projection_supported. Aggregate all_sprite_projections_supported is
separate from structural AT parsing.

LOCAL admission bounds:1..1024 frames, at most4096 tag bytes/frame, exact
payload EOF, finite transform and finite nonnegative durations. The source
audit does not claim equivalent native guards. Unknown/truncated/oversized
AT forms remain indexed with supported:false. Structurally supported forms
with invalid durations or unresolved/non-S2 frame references refuse instead
of claiming readiness. A2 and other animation forms remain unprojected.

Python tests cover full64 keys, multipart prefix splitting, tags/opaque byte,
zero duration, separate S2 readiness, malformed shapes/reference types and
archive EOF cursor preservation. No generated resource report was changed
by this lane. Background ownership is separately documented in
mirage-original-ui-resource-names-2026-10-16.md; this work grants no floor,
enemy, reward or live run.

## ST_SHA: native count loop and exact two-image S2

The previously recovered CRMSprite2.Load G10f36f0 consumes the transform,
then an unsigned32 count G10f379a..37a2 and iterates image entries. Each entry
reads8-byte key G10f37d0..37d8, CRMPoint.Load G10f37e0 consumes8 coordinate
bytes, RM10to38 G10f37ea decodes the full key and LoadImage2 receives its
name G10f3832..3838. Successful entries call Add G10f3988; after the loop a
separate auxiliary count is read G10f3858..3860. This is a count-driven image
list, not a special one-image layout; auxiliary entries remain undecoded.
The source-pointer origin is the two-byte S2-prefix removal by MakeResource
G110b3ec..3f4, as recorded in mirage-native-jet-name-index-2026-10-16.md.

ST002's ST_SHA decodes to82 bytes:2-byte prefix+40 transform+4 image count+
two16-byte(key64,pointX32,pointY32) entries+4 auxiliary count0. Exact entries:

- encoded4200453817 → original I2 resource1F0I1KD, point(-272,-1320).
- encoded1900704825 → original I2 resourceN_KXM1, point(-488,-568).

Both are existing assembled image records in the same original pack. Negative
point coordinates are placement, not image dimensions. All eight original
ST002 AT resources now resolve through supported S2 image lists; this does
not claim I2 pixel conversion or a live rendered native frame.

The indexer's LOCAL S2 subset now supports1..1024 image entries, zero auxiliary
count and exact EOF (`50+16*image_count` full bytes), preserving image order,
duplicate references, exact64 keys and signed points. It emits `images[]` for
single and multi cases, and retains original singular image fields only when
count1. Structurally supported but unresolved/non-I2 image references refuse;
other shapes remain supported:false. Captured prefixes are assembled across
physical chunks, so a split two-byte type prefix does not lose identity.
