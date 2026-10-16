# Fishing no-catch sentinel and record-cache limits

Original immutable ARM closure, 2026-10-17. DataDump input
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G code addresses equal ELF file offsets+0x10000. ELF runtime virtual data
addresses below are labelled VA and are not Ghidra-biased code addresses.
No runtime, private save, UI, original asset or stock changed.

Primary published sources are DataDump
`sources/native/systems/ghidra-fishing-end-settlement.txt:850-1012`,
`ghidra-fishing-end-settlement-keys.txt`,
`ghidra-fishing-owned-parsers.txt` (ParseRecod section),
`ghidra-fishing-record-keys.txt`, and the original ELF dynamic symbol,
relocation and initializer sections. Complements
[fishing lifecycle](fishing-catch-lifecycle-native-2026-10-17.md), whose
no-catch sentinel was deliberately left unresolved at that earlier checkpoint.

## Exact no-catch sentinel is the empty string

ParseEnd copies strict ret_data.fish_id into Fishing+0x68, grade into+0x78,
and length into+0x7c. Its comparison reads a shared std::string, not a guessed
fish item ID, ordinal0 or tutorial -1 value:

1. LDR **Gb2add0** reads ELF literal slot **0xb1b00c**, word `0x01690272`.
2. The actual matching PC ADD is **Gb2add6** (ELF **0xb1add6**). It resolves
   GOT **VA0x21ab04c**, mapped to file **0x21aa04c** by the writable LOAD
   segment's VA-file delta0x1000. Pairing this LDR with decompiler expression
   address Gb2adda or adding the Ghidra image bias produces the wrong owner.
3. That GOT word is `0x21ce3d8`, with R_ARM_RELATIVE relocation type23.
   The ELF dynamic symbol at **VA0x21ce3d8**, size12, is exactly **NULL_STR**.
   This object lies in BSS, not file-backed text bytes.
4. Linked initializer **G686288** loads that same GOT owner at
   **G686294/G68629a**, obtains NULL_STR at **G6862a0**, and calls the C-string
   constructor **G6d5ff4 at G6862a4**. Its argument literal resolves from ELF
   slot0x6762e4 plus actual ADD0x67629c+4 to **ELF0x1d52ab4**, whose first
   byte is NUL: the constructor string is exactly **""**.
   `.init_array` file slot **0x21a9860** contains Thumb entry **0x676289**,
   proving this initialization is linked into library startup.

The full string comparison is **Gb2adf6..Gb2ae30**. Equal strings branch to
**Gb2ae4a**, skipping BOTH **AddInven at Gb2ae3a** and **UpdateRecord at
Gb2ae46**. This closes a successful settlement with no caught fish:

```text
ret_data.fish_id = ""
ret_data.grade = 0
ret_data.length = 0
```

Only the empty fish string is the proved no-catch discriminator. Zero grade
and length are explicit neutral loss presentation values, not recovered
original loss awards. The values are still parsed and overwrite the current
Fishing model even when its fish-count/record branch is skipped. Do not omit
fish_id or substitute null/0: its conversion is strict string.

The parser does not inspect request is_win at this branch. The server must
bind that earlier request result to its configured settlement; returning a
nonnull actual fish could increment counts regardless of the reported loss.
No original failed-cast bait debit/refund, wallet change or award is inferred.
Consumed-instance deltas and optional user fields remain independent of this
no-catch branch, as documented in the lifecycle note.

## Neutral achievement is safe without fabricated progress

ParseEnd **Gb2ae50..64** calls ParseAchievementsElement only when its root
achievement child has nonnull JSON type. Explicit **achievement:null** skips
that parser. The shared parser **CSRAchieve::ParseAchievementsElement
G8481c4** also safely accepts **[]**: type2 selects array iterators at
G848210..220, and equal begin/end exits at **G848234..23a** before any row
parse. Null/empty-array neutrality does not authorize made-up achievement
IDs, counters, daily quest updates or rewards.

## GetRecord is an insertion read, not a repair overwrite

`CSRMFishing::ParseRecod` **Gb2c5b8** consumes a direct ret_data collection of
rows **{fish_id:string,grade:number,length:number}**. It accesses ret_data at
Gb2c5d8, the optional achievement child separately, indexes each row at
Gb2c674, reads grade at Gb2c67c, length at Gb2c6c6, and strict fish_id at
Gb2c712/720. Float/string grade and length conversions use **signed32** at
Gb2c6b2 and Gb2c6fc; integer branches retain their low32 word. Record payload
stores grade at+0 and length at+4. There is no size unit or grade-from-length
threshold established by these fields.

After constructing each proposed record, it calls __find_equal on the map
rooted at Fishing+0x10. The insertion block executes only when the returned
node slot is empty (published ParseRecod decomp); an existing identity keeps
its old shared record and the newly constructed candidate is released. There
is **no clear, existing-key replacement, maximum comparison or deletion of
omitted identities** in this parser. Duplicate rows are first-insert-wins.
An empty successful collection consequently does not erase cached records.

This differs from catch-side **UpdateRecord Gb2e980**. For an existing ID it
compares the old signed length+4 against incoming signed length at
**Gb2e9b8..9bc**. Only strictly longer incoming length overwrites BOTH grade
and length at **Gb2e9c0** and sets the new-record flag at Gb2e9c6. Equal or
shorter catches preserve both fields, even if their grade is greater. Missing
identity inserts and sets that flag at Gb2ead4..ad6. An implementation must
not maximize grade independently of the record length.

The separately closed native grade selectors **1/2/3** correspond to bronze,
silver and gold. Raw32 parser permissiveness does not admit arbitrary grades.
A LOCAL supported producer may restrict catch lengths to positive signed32;
original length sampling, physical unit and grade boundaries remain unknown.

## Durable settlement versus native response-loss repair

A persisted cast can safely avoid repeating server-side stock/wallet grants
when its terminal report is retried, but that is not proof of complete native
cache repair. End's non-success **10203/10204** handling can clear a pending
local consume marker without parsing an additive catch receipt. In contrast,
repeating a successful catch receipt repeats AddInven and generic added/removal
item deltas. Returning the same award receipt is therefore not innocuous.

After a lost successful End response, GetRecord cannot overwrite an existing
fish's shorter native record; GetInven's corresponding insert-only count map
likewise does not replace existing count rows. A new client/cache lifetime may
populate server-authoritative records, but this audit establishes no safe
in-session refresh or cache invalidation bridge. Keep that limitation explicit
for an optional persisted LOCAL producer; do not describe its replay refusal
as full native response-loss repair.
