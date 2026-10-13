# Original bad-word source and Guild edit consumer

The original BADWORD_RO corpus and its native HasBadWord behavior are now
positively bound. The client checks a merged union of ALL five locale tables,
using exact case-sensitive UTF8 byte substring matching. It does not select
only the current UI language, casefold, normalize Unicode or enforce word
boundaries in this consumer. The isolated helper reads an already imported
source file and copies no actual word list into authored code or this note.

## Exact source shape and hashes

Server's existing
`resources/reference/recovered-data/leveldb-tables/all-tables.json` is
byte-identical to read-only DataDump
`sources/client-tables/recovered-data/leveldb-tables/all-tables.json`:
15,797,336 bytes, SHA256
`f166f857d45c6dd68e97bd4b8f055be795796400fa10ba9f040aaa1b1d8f0a78`.

The public original export contains table BADWORD_RO with five records. Each
record's key is its locale, raw is the original JSON object mapping numeric
string IDs to string values, and json is the exact parsed projection. Counts:
EN502, JA31, KO4159, SC4082, TC85; total8859. There are no empty strings in
this pinned source. Numeric IDs and string bytes are retained, with no trim,
normalization, deduplication or translation.

`resources/reference/badword-source.json` records whole-export SHA/size and
each raw locale body's UTF8 SHA/size/count without reproducing the words.
`originalBadwordLocale` checks those pins, shape and projection equality before
returning frozen entry records. Locale reads are for diagnostics, not a rule
that the native matcher uses only that locale. Its lexical ID order is harmless
for the boolean HasBadWord result; no ChangeBadWord replacement algorithm is
implemented or implied by this helper.

## Loader merges five dictionaries, independently of current language

Final immutable ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code addresses subtract0x10000 for ELF. Writable data uses PT_LOAD
mapping. Independent native inspection by the second reused agent corroborated
the loader and libc import bindings; no device or original modification.

CSRDataMgr.Init G8b1d60 opens CRMEmbeddedDB stem BADWORD at G8b1d92 with
read-only flag1 at G8b1d94. The destination is the manager's linked list at
+a818, set at G8b1d9a. It loops a fixed pointer array VA21433f4, referenced at
G8b1df4, with exactly these keys: KO, EN, JA, SC, TC. Loop index0..4 is bounded
at G8b1e4e–50. Each locale dictionary is retrieved at G8b1e72 and parsed at
G8b1e9c, then its values convert to strings at G8b206c. Empty strings skip at
G8b2080–82; nonempty raw strings append into the SAME+a818 list at
G8b210c–2122. There is no current-language selection or lowercase operation
on this path.

`originalBadwordMatcher` mirrors that exact five-table union and skips ONLY
empty source values because the native loader does so. The diagnostic source
reader keeps every original entry. Do not use an EN-only list for the English
client or silently drop unusual nonempty entries. The pinned data happens to
have zero empty entries, but the distinction matters for the raw algorithm.

## HasBadWord is an exact raw byte search

CGMDataMgr.HasBadWord G793cb8 reads the input std::string byte length. Empty
input returnsfalse at G793cd2–d6/G793d6a. An absent/empty linked dictionary
likewise returnsfalse. Each dictionary string is inspected directly, with no
normalization or Unicode boundary calculation.

At G793d38–48 it finds the dictionary's first byte in the input through
memchr; at G793d50–56 it compares the full candidate bytes through memcmp.
ARM PLT/GOT plus relocation/dynamic-symbol decoding independently binds those
thunks: G621b00 is memchr and G621b18 is memcmp. A failed comparison advances
one input byte and retries while enough bytes remain. Match returnstrue at
G793d74. Nonempty input with a zero-length dictionary entry also returnstrue
at G793d32/G793d74, but the original loader prevents such entries from reaching
this list by skipping them. Raw matcher tests preserve this difference.

ChangeBadWord G793b18 is a DIFFERENT consumer that calls strlower at G793b58.
That call must not be borrowed into HasBadWord behavior. No trimming, casefold,
Unicode normalization or word-boundary rule is inferred from a neighboring
function.

## Guild edit callback supplies the original string

CSRPopUpEditBoxGuild.ResultCB Gc915ec preserves its input string argumentr2
inr5 at Gc915fa. It checks CMIsUtf8 at Gc91636–38, obtains the data manager at
Gc91640, passes the SAME string inr1 at Gc91644 and calls HasBadWord at
Gc91646. A true result branches to the existing rejection path at
Gc9164a–4c. No preceding casefold or replacement was found in that bounded
Guild callback path. Empty input skips this check; minimum-name validity is
still a separate gate.

This closes the source-backed dictionary check for Guild name/description
edit input. Original font support and server admission/country/pending rules
remain separate limitations; applying this helper does not claim complete
production validation or authorize a mutation. Root owns any optional local
creation/update integration and corresponding protocol tests.

## Verification

`tests/badword-source.ts`, isolated strict TypeScript and diff checks pass.
Tests verify all locale payload pins/counts, source projection agreement,
manifest consistency, all-five union controls, raw case/substring/UTF8 behavior,
unmodified input snapshots, empty-input/dictionary distinctions and damaged
source rejection. Original positive controls run without printing any words.
Independent helper review and repeated focused test also passed. No live save,
profile, game input, APK or DataDump content changed.
