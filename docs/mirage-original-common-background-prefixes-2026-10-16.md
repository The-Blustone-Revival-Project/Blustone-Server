# Original COMMON background prefixes recovered

The immutable original LEVELING.jet is already mirrored at
resources/runtime/assets/LEVELING.jet:18524bytes, SHA256
ba73fff17002cc94f7f1a98bf657be1bef042283051a5b92c395347006d3c57e.
Its base38-named COMMON record starts at3369 (payload3393), with the native
24-byte header total/raw/stored sizes2119/2119/813 and part0. Bounded zlib
inflation yields RW payload SHA256
7b9078265f4f1c0383d3d9b289939c9e3ac4db6de39a882111e1746bfeb447c4.
Its RW length is2113; the payload after6bytes is UTF8-BOM JSON, SHA256
8f0a2890d7f1a43314f5637617239d2ad2f31f8bec6f68b48e87b2f62ef3162a.

Decoded JSON lines49–54 give bg_prefix_header empty and the five values:
longlong D, long C, short B, shortshort A, window E. These are original
data values, not inferred alphabetic ordering. COMMON_DESC is a different
programmer example with LL/L/S/SS; it must not replace COMMON.

The original native LoadCommon owner is retained in DataDump
sources/native/revival/ghidra-leveldata-decomp-04.txt:583–598: the normal
branch calls SRLoadRawData with literal common. Literal slotGf3a1b8 plus
Gf39f36 resolves that name. The optional developer path builds a filesystem
common.JSON from the configured directory, lines602–633. This proves which
resource supplies the fields; the path does not make COMMON_DESC active.
Original library SHA256 is
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.

Source field destinations, layer construction and decimal-digit selection
are documented in mirage-original-ui-resource-names-2026-10-16.md. Original
ENV rows2/15 both use STI002 and compositions11/11/11/111/11. Their resulting
ordered layer occurrences are D1 twice, C1 twice, B1 twice, A1 three times,
E1 twice. All five distinct STI002_*1 names exist as AT resources in the
independently pinned ST002 index.

src/mirage-backgrounds.ts verifies the original pack, exact COMMON header,
bounded inflation, RW length, BOM and inner JSON pins before returning
detached five-prefix values. Its separate recipe function admits only the
two pinned original ENV rows and verifies supplied resource names/types.
Recipes distinguish repeated layer instances from distinct resource names.
The recipe alone does not claim animation dependency closure, live deployment, renderer
readiness, original Mirage floor policy or a playable Mirage run.

## Pinned layer dependency closure

The separate originalMirageLayerDependencies function pins original ST002
and its generated index, then joins each of the five required AT names to
its original frame S2 and that sprite's I2 image. All five use one frame
of0.5seconds. Ordered sprites are STI002_D01/C01/B01/A01/E01. Their image
names are M7UX9J/NQK6.I/13I5AHF/M4M5EK/M7UX9J; D/E share an image and
must not be forced into distinct textures. Both candidate environments2/15
produce identical dependencies and preserve repeated layer instances.
This proves layer asset references, not native scene rendering or all UI
dependencies. No automatic ready-environment publication or live run follows.
