# MIRAGE original JET resource-name index recovered

Original library SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
original `MIRAGE.jet` SHA256
`d2cf0adca895de1174f35f507cf5e38a21b8e74572a5c895c50ad6c062f4374e`,
3861142bytes. Both were read from immutable DataDump inputs. No native code,
original pack, DataDump record, client, private state or live UI was changed.

## Actual name owner, not a CRC guess

DataDump `sources/native/resources/ghidra-e05-resource-boundaries.txt`
contains original `CRMResMap::ExtractJETInfo` at G10e5f58. It reads each
24-byte record header, calls `RM10to38` on the unsigned64 field at header+12,
and uses that decoded string as its resource-map key. The earlier outer
word3 CRC probes did not follow this owner and could not recover these names.

Direct bounded Thumb inspection independently verifies the same path in
`CRMResMap::GetResListinJET` G10e5b68:

- G10e5c26..2c: read0x18 bytes to stack+0x48.
- G10e5c10..20: prepare pointer header+0x0c.
- G10e5c36..3a: call `RM10to38` on that field.
- G10e5c56..72: read header+20 as uint16 part index, header+22 type byte,
  and the first three uint32 words; capture current payload position.

`RM10to38` G10d2af4 (ELF10c2af4) divides the unsigned64 value repeatedly
by38 at G10d2b60..84, reverses digits and maps0..9 to ASCII digits,
10..35 to uppercase A..Z,36 to period and37 to underscore at
G10d2b94..bba. Zero becomes "0". It bounds values below38^12; the inverse
`RM38to10` G10d2a00 accepts case-insensitive letters and that punctuation.

The read-only pack walk uses little-endian `<3IQH2s` headers:
three uint32 size words, uint64 encoded name, uint16 part index, two type
bytes. Advancing by24 plus the third size word reaches exact EOF after71
physical chunks. Native ExtractJETInfo likewise seeks by that third word.
Do not call the first two sizes decompressed lengths without their separate
compression consumer; multipart grouping is a distinct operation.

## Actual named sprite resources

The final30 records each contain an uncompressed66-byte S2 payload and
source-decoded names:

MRG001, MRG002, MRG003, MRG004, MRG005, MRG006, MRG900, MRG901,
MRG903, SHADOW_1, SHADOW_2, MIRAGE_BG_G, MIRAGE_BG_R, MIRAGE_G,
MIRAGE_S, MIRAGE_B, RESET, QUESTION, SLOT_LOCK, SLOT_CLEAR, MRG902,
MIRAGE_GRA, OPEN_DOOR, CHAIN_BROKE, PARTI_L_L, PARTI_S_L, PARTI_L_R,
PARTI_S_R, NEWRECORD, BG_M_INGAME.

The first41 physical records include multipart image payloads under opaque
numeric identifiers encoded using the same base38 routine. Those opaque
image names are not substitutes for the above named sprites. As an exact
bytewise cross-check, MRG001's S2 payload offset46 contains uint32
0x55d25c2a, equal to image record2's header encoded-name integer (decoded
name I6K5QQ). MRG002 similarly contains0xf3ba7569, equal to image record3.
This establishes a useful direct relationship, but the S2 consumer must
be followed before generalizing offset46 to all S2s. The bounded follow-up
below closes the exact single-image66-byte form; it does not assume every
S2 resource has that form.

These names are original package contents, not guessed bindings or a new
authored resource registry. Merely proving them does not prove floor/stair
reference values, enemy balance, all future UI dependencies or a live run.

## CMJetLoader is a wrapper, not the name decoder

`CMJetLoader::Load` G71b304 validates a supplied package identity then tracks
that name/directory in its own list. `LoadBytes` G71b7dc extracts a CMHashID's
stored string (short/long string at G71b850..85a), asks IsExistingRes at
G71b85e, then calls LoadRawData at G71b8c0 using the same string. It copies
the returned raw resource's pointer+0x20 and byte count+0x28 into a result
vector at G71b8c6..8f4. Actual JET names come from the CRMResMap header
index above, not from a new hash calculation in LoadBytes.

## Native single-image S2 relationship closed

`CRMResConstructor::MakeResource` G110b358 dispatches the sprite type to
G110b3c0, subtracts the2-byte type prefix, and at G110b3ec..3f4 calls
`CRMSprite2::Load` G10f36f0 with payload+2 and remaining length. This closes
the source-pointer origin rather than inferring it from a visually plausible
header layout.

CRMSprite2.Load first calls `CRMTransfQV::Load` G10fcadc at G10f3766.
That helper copies16 bytes, then12, then12 at G10fcb08/14/28:40 bytes total.
The decoded transform is converted to a matrix separately; it is not image
width/height/UV metadata. Load then reads an unsigned32 image-entry count at
G10f379a..37a2. Each image entry has an8-byte key read at G10f37d0..37d8,
followed by `CRMPoint::Load` G10d30f4 at G10f37e0, which consumes two4-byte
coordinate words at G10d311e/30. The full64 key is decoded by RM10to38 at
G10f37ea; `CRMResourceMgr4::LoadImage2` G10e9df0 receives its decoded name
at G10f3832..3838. A missing image takes the explicit failure path. Otherwise
`CRMSprite2::Add(image,point)` G10f3988 records the point and image pointer.
After that loop, Load reads a separate unsigned32 auxiliary count at
G10f3858..3860. Nonzero auxiliary entries follow a distinct variable-size
parser; this audit does not decode them.

Therefore the exact66-byte originals with one image and zero auxiliary rows
have these offsets relative to the FULL S2 payload:

- 0: two-byte S2 type prefix.
- 2..41:40 raw transform bytes.
- 42: image count uint32, here1.
- 46: image identifier uint64, NOT merely uint32. These originals have high0.
- 54/58: two4-byte CRMPoint placement coordinates; negative values occur.
- 62: auxiliary count uint32, here0.

The point is a sprite placement offset. It is not image width/height, nor a
UV rectangle. Those domains belong to the referenced image resource and
renderer, so they must not be manufactured by reinterpreting the negative
placement words. The exact native image lookup provides the required
name-to-existing-image relationship without guessing a CRC algorithm.

## Strict offline index and Server admission

The bounded jet-index.py profile uses word0 as assembled length, word1 as
part decoded length and word2 as stored length; equal stored/decoded lengths
are admitted raw, otherwise exact bounded zlib streams are required. Both
original MIRAGE and ST002 packs reproduce all lengths and exact EOF under
this profile. These compression semantics are validated for these pinned
inputs; the separate native compression consumer remains unclosed. This is
not universal JET compatibility. Duplicate names/reordered part indices and
unsupported S2 forms are deliberately not silently normalized.

Server mirage-resources.ts verifies package and index SHA256 pins before
returning detached original resource maps. Tests regenerate both complete
reports with the independent Python decoder, validate S2 image references
and reject changed packs/indexes. No runtime Python dependency is added.

Original environments.csv is independently pinned. Its exact column0 map
keys2 and15 both match PreFix STI002 for selector002. Mirage combat
readiness requires ALL matching keys independently ready, retaining leading
zeros and the stage res_prefix override. It no longer asks for a literal
002 sprite. base.bg_res presence remains an additional local UI check.
No package/profile activation, floor generation, HP initialization, live
GetInfo publication or reward grant follows from this resource admission.

The next native compression owner is CRMResConstructor.LoadJETBlock
G110aff8, reached through LoadResFromJET G110b1e4 / LoadResourceFromFile
G10e9704. Existing published decompilation only includes the wrapper
CRMResourceMgr4.LoadRawData G10eac8c, which resolves cache/clone or delegates
file loading. It does not establish compression semantics. There is no
CRMResMap.LoadRawData symbol in the checked source vocabulary.
