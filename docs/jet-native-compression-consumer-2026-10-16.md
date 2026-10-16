# Native JET stored/decoded chunk lengths

Read-only bounded Thumb audit of the original ARM library, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra coordinates below are file/ELF coordinates plus0x10000. No original
library, client or DataDump file was modified.

The prior resource-name audit left the compression consumer unclosed. That
specific branch is now recovered from `CRMResConstructor.LoadJETBlock`
G110aff8, rather than inferred from successful zlib decoding alone.

Existing published source `sources/native/resources/ghidra-e05-resource-boundaries.txt`
lines228–232 copies header word1 to RMRESINFO+0x10 and word2 to+0x18,
with the payload file position at+0x0c. Lines397–400 preserve those offsets
in the resource map. Header word0 is separately retained at+0x1c.

- G110b04e..054: seek to RMRESINFO+0x0c using RMFileSeek.
- G110b05e..06c: allocate RMRESINFO+0x10 bytes for the decoded output.
- G110b076..07c: compare stored+0x18 with decoded+0x10.
- Equal: G110b07e..084 reads exactly the decoded length directly into output
  with RMFileRead G10c96f4. No decompression call on this branch.
- Different: G110b10e..124 allocates the stored length and reads that many
  bytes into a separate input buffer.
- G110b12c..134 calls RMDecompress G10c4ddc with output pointer, pointer to
  decoded-length variable, stored input pointer, and stored length.
- G110b138 branches on the decompressor's boolean result; the failed path
  logs/releases buffers rather than treating compressed bytes as raw data.

The symbols are independently named in `sources/native/symbols/native-evidence.tsv`:
RMFileRead G10c96f4, RMFileSeek G10c9832 and RMDecompress G10c4ddc.
RMDecompress sets z_stream next_out/avail_out from its first two arguments
at G10c4e10..1a, next_in/avail_in at G10c4e12, then calls:

- inflateInit_ G621e60 at G10c4e22;
- inflate G621dc4 with flush4 (Z_FINISH) at G10c4e42..46;
- inflateEnd G621dd0 at G10c4e66..68.

On its success path G10c4e88..8c, it copies total_out back through the
decoded-length pointer and returns1. This establishes the native zlib
consumer and the equal-length raw branch for these JET chunks.

The offline indexer remains deliberately stricter: exact zlib EOF, no
unused/trailing bytes, exact declared decoded length, bounded allocation,
unique resource names and contiguous part indices. Native stream acceptance,
replacement behavior and all multipart resource constructors are not fully
emulated. Word0's assembled-length interpretation remains a validated pack
profile invariant; this consumer alone does not establish its universal role.
