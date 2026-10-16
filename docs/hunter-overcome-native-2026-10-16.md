# Hunter Overcome: ordinary recipe, effects, and settlement

Bounded read-only original ARM research, 2026-10-16. DataDump original
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so` SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses are Ghidra coordinates, ELF code offsets plus `0x10000`.
Symbol provenance is `sources/native/symbols/native-evidence.tsv`.
No original numeric recipes/effect ladder, item identities, save changes,
or native gameplay validation are supplied by this investigation.

## Ordinary and awakened operations are different contracts

The ordinary table route is **`/reference/GetCardOvercome`**, not a guessed
GetAwake route. `CSRSyncRef::ReqOvercomeCB` Gf84de6 checks result 1
at Gf84df4/6 when a response is present, then invokes
`CSRAwake::SetOvercome` G861cb8 at Gf84e04. The class name CSRAwake
does not make this table exclusively an awakening table.

Separately, `CSRAwake::RequestAwakeRef` G85d7f8 uses the original literal
**`reference/GetCardAwaken`** at G85da5c. Its awakened mutation
`RequestAwakeOvercome` G85e37c sends `target_inst_id`, `target_cnt`,
and `src_inst_id_list` under the literal **`gym/AwakenOvercome`**
(G85e69c/6c6/6f8 and G85e8ac). These requester literals omit the
initial slash; ordinary RequestOvercome's literal includes it.
The awakened requester also contains the warning `Card AwakeOvercome
is 3`; it is not proof that ordinary grade-3 hunters admit three steps.

Historical terms such as capacity transcendence must be tied to these
actual final-client tables before a screenshot cost is assigned to a
route. The first-party Bear before/after observation retained in
`findings/hunters/base-stats-visual-hunt/transcendence-t1t2-hunt-2026-10-06.md`
is historical evidence, not an original final-client recipe or universal
effect ladder recovered by this note.

## Ordinary reference wire shape and lookup

`CSRAwake::SetOvercome` consumes:

```json
{"ret_data":{"effect":[{"cnt":0,"hp_percent":0,"atk_percent":0,"def_percent":0}],"src":[{"target_base_rank":3,"overcome_cnt":1,"card_required_rank":3,"card_cnt":0,"item_list":[],"gold":0}]}}
```

This is a **structural illustration**, not a published recipe or default
fee/effect. Configured successful use must require explicit meaningful rows.

Effect `cnt` is uint32: its literal is loaded at G861d9e and formed at
G861da8; value conversion/store is G861e04..e4a. A naive literal helper
that pairs a PC-relative load with the wrong intervening ADD can report
`%s)` at a neighboring address; the actual matching-register ADD resolves
the key **`cnt`**. `hp_percent`, `atk_percent`, `def_percent` are loaded
at G861db6/G861eb8/G861f28. They are stored as float32 at
G861eba/G861f2a/G861f9c. Numeric/string-number coercions are native
behavior; canonical server tables should use finite numeric values.

Source row fields are uint32 `target_base_rank`, `overcome_cnt`,
`card_required_rank`, `card_cnt`, and `gold`, plus `item_list` rows
containing reference string `ref_id` and uint32 `qty`. Literal owners:
G862180/2188, G862250/229e, G8622ec, G862374/238a, G862500.
The resulting recipe layout is base rank `+0`, destination count `+4`,
required material grade `+8`, material count `+0xc`, gold `+0x10`,
item-vector begin/end `+0x14/+0x18`.

`GetOvercomeSrc(uint,uint)` G861980 does an exact pair-key lookup in
the ordinary recipe map at CSRAwake `+0x28`; it does not interpolate a
missing grade/count row. On success it returns the stored row at
G861a90. The ordinary popup `SetSourceCardList` Gfe0370 supplies
the target reference's **first stat rank** at Gfe03f2 and
`GetTotalOvercome()+1` at Gfe03f6..0400. `SetRequiredGold`
Gfe1140 similarly adds 1 to its current-count argument at Gfe1162,
calls the getter at Gfe1166, and reads row gold at Gfe1194.
Missing required rows must refuse instead of relying on native diagnostics.

## Combined ingredients and bounded target/source gates

The ordinary popup checks cards **and** items **and** gold for the same
recipe in `IsPossible` Gfe15ac:

- Gfe15d8..15e0 requires `target current rank - current count > 2`
  in the native unsigned branch. For well-formed nonnegative ordinary
  progress this permits at most `rank - 2` completed steps: grade3→1,
  grade4→2, grade5→3. Do not use unsigned underflow as admission.
- Gfe1618..1622 requires selected source-card count at least row
  `card_cnt`. This is not an equality proof for original backend handling
  of excess cards.
- Gfe1654..16be iterates every configured item requirement and checks
  owned reference quantity through `GetInstItemCnt` Gfe1682.
- Gfe16c0..16d2 separately checks the row's gold against current gold.

This positively establishes **one combined bill of materials**, not
mutually exclusive ordinary-card and capacity-item routes. Either component
can be empty in a locally supplied recipe, but no original zero requirement
is inferred merely from that structural possibility.

The bounded source picker establishes:

- Normal candidates must match the target reference's **`base.char_id`**
  exactly (reference `+0x30`, Gfe04c4 onward), and differ from the target
  full64 instance ID (Gfe0518..0528).
- `SetCard`'s `char_id` parser is located by the published
  `sources/native/hunters/ghidra-card-keys.txt:34`; G87bce4 writes the
  parsed string to allocation `+0x3c`, returned reference object `+0x30`.
  This is not the unrelated resource prefix or display name.
- Source current grade must be at least `card_required_rank`
  (Gfe05b8, Gfe05fa/5fc); source `GetAwakeStep` must be zero
  (Gfe0600..060a).
- An additional resource-card branch accepts `is_source==1` and a native
  **derived Overcome-admission flag** at reference `+0x3e`, with a matching
  reference base rank (Gfe04ae..04bc and Gfe0580..0588). This flag is
  **not** the raw JSON `source_field` value. The exact derivation and the
  branch's bypass behavior are closed in the follow-up below; no resource
  stock or original acquisition law is implied.

Complete credit transfer from already-transcended sources and every UI
lock/commitment path remain unclosed. A safe configured initial subset can
require ordinary awake-zero targets, exact same reference sources with
zero ordinary/awake transcendence, exactly the configured card count,
and existing ownership/lock/active-commitment protections. Those stricter
conditions and a one-step settlement are **LOCAL policy**, not a claim
that the original backend rejected every other source combination.

## Effect units and lifecycle

`CSRCard::SetOvercome(uint ordinary,uint awake)` G869bb8 stores ordinary
count at card `+0x68c` (G869bda) and awake count at `+0x698`
(G869bd6), calls `GetOvercomeEffect` G86154c at G869bea, and
retains its effect object at card `+0x54` (G869bfa).
`GetTotalOvercome` G867e48 returns ordinary count if awake step `+0x694`
is zero; otherwise it returns ordinary plus awake count. The getters
G867e60/G867e66/G867e6c expose awake step, awake count, ordinary count.

`GetOvercomeEffect` looks up the ordinary effect by its ordinary count
(G86159a..1614), separately selects the awakened-count effect
(G86167a..172a), and adds their float32 HP/ATK/DEF values. These
are selected cumulative rows, not an instruction to sum every preceding
ordinary row again.

`CSRCard::Validate` G86acd0 converts the stored percentages into factors:
G86ad74/78 handles DEF; G86ae3e/42 handles HP; G86af1a/1e handles
ATK. The exact float32 constant at **G86ae50** is
`0.009999999776482582` (binary32 0.01). It adds 1 at
G86adf8/G86aece and uses a 1-initialized accumulator at
G86af12..1e before multiplying calculated stat values
(G86ae02/G86aed8/G86af96). Therefore wire percent **10 means
an added 10 percent**, not 0.10. Other equipment, level, relation,
and growth contributions remain separate native arithmetic; this is
not a blanket instruction to multiply every server-sent stat.

Changing the count and publishing explicit effect rows lets the native
engine apply its recovered modifier. The server should preserve existing
base/equipment/skill values rather than pre-applying a second invented
buff. No numeric effect ladder is recovered here. Config changes or mode
disable must not silently remove the effect row needed by earned nonzero
counts; retain compatible references or refuse incompatible activation.

## Ordinary mutation and exact receipt

`CSRSyncCard::RequestOvercome` Gf577b0 sends auth5 plus
`target_inst_id` full64 (literal Gf57984) and `src_inst_id_list`
(Gf57a0e), a string containing a dumped array of numeric full64 IDs.
Its route is `/gym/Overcome` (Gf57b50). There is no client-selected
effect percent, currency amount, destination count, or recipe identity.

`ReqOvercomeCB` Gf57f98 checks native result code at Gf57fb6 and
accepted result 1 before its success mutations. Canonical successful
`ret_data` needs:

- `achievement:[]`, `dailyquest_min_stage:""`, `daily_quest:[]`,
  `linear_quest:[]` for the established neutral achievement branch
  (Gf5808e/Gf58098).
- `user.gold.cur` **absolute** gold and `user.deck` in its existing
  complete deck grammar (`ParseDeckSetting` Gf58126).
- `target:{inst_id:<numeric uint64>,overcome_cnt:<uint32 scalar>}`;
  these are not prev/cur pairs. Gf58200..5820a calls
  `SetCardOvercome(target,count,0)`, explicitly zeroing the awake
  count in this ordinary callback. It also updates matching cached
  user-pool cards via `CSRCard::SetOvercome` Gf582ac/Gf582c8.
- `removed_card:[<numeric uint64>,...]`: bare IDs, iterated into
  `RemoveCard(id,true)` Gf583b6.
- `removed_item:[{inst_id:<numeric uint64>,qty:<uint32>},...]`:
  **consumed quantity deltas**, passed to `RemoveItem` Gf58520,
  not absolute remaining stock or reference-level stock grants.

No rank, EXP, level-reset or skill setter occurs in this established
ordinary settlement contract. A configured restoration can atomically
debit its explicit combined BOM/gold, remove exactly its admitted owned
sources, and increment the target ordinary count under a clearly stated
LOCAL one-step rule. It must not admit awakened targets that this callback
would clear, invent an original ticket, derive a price from Gym100/1000,
or adopt the historical Bear recipe merely because a UI label sounds alike.

## Follow-up: full ordinary-family and special-resource picker branches

`CSRTableCardOvercome::SetSourceCardList` Gfe0370 resolves the TARGET
reference at Gfe03e6, reads its cached first-stat rank at Gfe03f2,
and selects the next recipe at Gfe0400. It copies that target
`CSRCardInfo` into stack storage at Gfe0450. Candidate source cards are
then resolved independently through `GetCardData` at Gfe04aa.

The normal branch compares **`base.char_id`** (source reference `+0x30`
against copied target `+0x30`, stack `+0x58`) by exact string length and
bytes at Gfe04c0..0516. It does not compare `base.id`/owned `ref_id`.
Therefore **different published reference IDs with the same nonempty
char_id can be normal-family materials**. There is no requirement to
invent or merge reference identities to represent this relationship.
Gfe0518..0528 then excludes the target's exact full64 instance ID;
Gfe05b8..05fc checks source current rank at least recipe
`card_required_rank`; Gfe0600..060a requires source awake step 0.

The special branch precedes that normal-family path:

1. Gfe04ae..04bc checks candidate source reference `+0x3c == 1`
   (`is_source`) and derived flag `+0x3e == 1`.
2. Gfe0580 loads **copied TARGET reference first-stat rank** from
   stack `+0x6c`; Gfe0582 loads **SOURCE reference first-stat rank**
   at source `+0x44`. It compares those two base ranks at Gfe0584.
3. On equality Gfe0588 marks the candidate eligible and jumps directly
   to Gfe054e/push. This bypasses normal char_id equality, self-ID,
   current material-rank requirement, and source awake-step checks.
4. If either special flag is false, or the two first-stat ranks differ,
   control falls back to Gfe04be's **normal-family branch**. It does
   not immediately reject the candidate solely for a failed special test.

An implementation may still impose explicit LOCAL ownership, distinct-ID,
lock/commitment, published current-stat-row, and zero ordinary/awake-source
counter guards for safe economic settlement. Those must not be described as
all having been checked by this special native picker branch.

### The derived flag is an ID mask, not raw source_field

The original `SetCard` routine indexes JSON `source_field` at G87bf40.
Only its string-type branch calls `strtod` at G87bf5a. Its returned
number is then discarded: G87bf5e onward reads the reference ID and
derives an independent bit mask. Exact equality applies only when the
ID length is three bytes (G87bf6c/6e):

- `901`, `902`, `903`, `904` → mask **3**. Literal construction
  addresses G87bf80/G87bf92/G87bfa2/G87bfb2; equality branches
  retain r5=3 before G87bff6.
- `912`, `913`, `914` → mask **4**. Literal construction
  G87bfc0/G87bfd2/G87bfe4. The first two select G87c802's
  `mov r5,#4`; the final equality selects G87bff0's `mov r5,#4`.
- Every other ID/length → mask **7**, through G87bfea/G87bff4.

G87c004/008 writes mask bit0 to allocation `+0x49`, returned
reference `+0x3d`; G87bff8/G87c000 writes bit1 to reference
`+0x3f`; G87c00c/00e writes bit2 to reference **`+0x3e`**.
`is_source` is independent: its JSON conversion writes allocation
`+0x48` at G87bf3a, reference `+0x3c`.

Consequently the special Overcome selector is `is_source==1` and
**derived mask bit2**, not `base.source_field==1`. Within the native
hardcoded map, 901..904 lack that special bit; 912..914 have it;
unlisted published source IDs receive it from the native mask7 fallback.
This mapping proves a selector, not the missing art/stats/availability or
issuance of any absent original source-card identity. Resolve candidates
against the actually published reference registry before admission.

## Follow-up: source-counter credit transfer remains unclosed

The ordinary preview demonstrably uses only target progress:
Gfe136a/Gfe2844 reads the selected target's `GetDefaultOvercome`,
then Gfe1374/Gfe284e calls `CSRCardAnalyzer::SetOvercomeNext`.
That function compares its ordinary-count input with 2 at G86eb80;
G86eb86..8e increments it **exactly one** and selects awake count 0.
Its other branch G86eb94..eba2 increments the awake input only when
ordinary progress is already 3. Selected-source counters are not arguments.

A bounded direct-call/field scan of ordinary UI Gfdf9bc..Gfe2d50 found
`GetTotalOvercome` only in target adjustment/recipe/display paths
(Gfdfb22/42/5a, Gfdffe0, Gfe03f6, Gfe07d8), and the target preview
calls above. No source `+0x68c/+0x698` counter read or source-counter
sum was established. This is bounded negative evidence, not a proof that
the original backend never transferred any source progress.

The backend's final count is still the scalar response described above.
Transfer from already-transcended sources, excess-copy charging/refunds,
and leftover-credit behavior remain **UNKNOWN**. Keep zero ordinary/awake
source-counter restrictions in the local restoration until a separate
authoritative rule is established. Do not infer a source-credit algorithm
from the target-only one-step preview.
