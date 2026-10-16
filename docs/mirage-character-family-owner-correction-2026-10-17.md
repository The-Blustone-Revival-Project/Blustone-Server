# Mirage party duplicates: character-family pointer owner correction

Original ARM checked 2026-10-17; DataDump immutable input
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses equal ELF code offsets plus `0x10000`.
This is source evidence, not native runtime validation or a save change.

**Correction:** the Mirage deck picker compares **`base.char_id`**, not
`base.name`. The older `mirage-register-deck-native-2026-10-14.md`
mistook shared-allocation offsets for returned `CSRCardInfo` offsets.
The recovered allocation-to-reader chain below removes that ambiguity.

## Shared allocation and returned reference

Let **A** be the shared allocation returned by `operator_new(0xc4)`
at G87bb7c inside `CSRCardInfoContainer::SetCard` G87baa4:

- G87bba6 computes **A+0x0c** and G87bbaa saves it at stack `+0x4c`.
  G87bc14 separately saves **A** at stack `+0x54`.
- The `char_id` literal at G87bcbe/G87bcc2 is parsed at G87bcdc.
  G87bce0 reloads **A**, G87bce4 chooses **A+0x3c**, and
  G87bd1c/1e writes that string there.
- The following `name` literal at G87bd16/G87bd1a is parsed at
  G87bd34. G87bd38 reloads **A**, G87bd3c chooses **A+0x30**,
  and G87bd6c writes that separate string there.
- G87c71a reloads **A+0x0c**; G87c726 reloads **A**;
  G87c728 forms shared pointer `{object:A+0x0c,control:A}` at
  stack `+0x7c/+0x80`.
- G87c75e reloads that object pointer and G87c76e inserts it into
  the reference-map node at **node+0x1c**, with its control pointer
  at **node+0x20**.
- `GetCardData` G87ce64 returns **node+0x1c** at G87cef8.
  Thus the returned reference object is **A+0x0c**, not A.

Consequently the true returned-object layout is:

- `char_id`: **+0x30** (`A+0x3c` minus the shared prefix `0x0c`).
- `name`: **+0x24** (`A+0x30` minus that same prefix).
- `is_source`: **+0x3c**, parsed into A+0x48 at G87bf3a.
- Derived source-admission flag bit2: **+0x3e**, written into
  A+0x4a at G87c00e. It is not raw JSON `source_field`.

The map's object/control pair and this offset correction also support the
ordinary Overcome character-family analysis. They do not require changing
that analysis to display-name matching.

## Exact Mirage consumer reaches the same reference object

`CSRExploreMirageDeckHandler::OnClickBottom` G92a2c4 obtains the
clicked real owned `CSRCard` via `CSRInventory::FindCard` G92a344,
using its full64 instance ID at G92a33e.

For each occupied selected slot it first compares both instance-ID words
at G92a438..444. Same-instance selection takes the existing removal/toggle
path; only different instances reach the family comparison.

G92a464 and G92a472 invoke **`CSRCard::GetCardInfo` G86ac32**
for the selected and clicked cards. This is not a separate custom name
record or arbitrary copied UI structure:

- Getter G86ac32 loads the stored shared pair at **card+0x4c/+0x50**
  and G86ac38 copies it unchanged to its result.
- `CSRCard::SetRefID` G86c30c populates that pair through
  `FindCardByID` G87d2ec at G86c37c. G87d302 reads the same
  map node's **+0x1c/+0x20** object/control pair; G87d318 copies it
  to the return value. G86c382/38c stores it at card+0x4c/+0x50.
- Therefore `GetCardInfo` returns the identical **A+0x0c** reference
  owner established above. There is no extra offset subtraction or
  alternative copied string layout between map and picker.

The picker then indexes returned-object **+0x30** at G92a47a and
G92a48e, compares lengths at G92a49c, and compares exact bytes via
the inline loop G92a4c8..4d6 or `memcmp` G92a4e6. Equal strings are
treated as duplicate character-family selection. There is no case folding,
localized display-name comparison, or fallback to ref_id in this branch.

Thus distinct references with equal char_id cannot both be selected by this
native party UI, while equal display names alone do not establish that native
duplicate condition. A server may choose stricter documented LOCAL admission,
but it must not attribute a name-based guard to this native comparison.

## Bounded requester inventory: no separate RequestEntry established

The published native symbol/route vocabulary and bounded requester reads
establish these exact owners:

- `CSRExploreMirageInfo::RequestInfo` **G92b30c** →
  **`/mirage/GetInfo`**, auth5 plus `reset`, `stay`, and section
  selectors `entry`, `inst_base`, `inst_enemy`, `ref_stair_list`,
  `ref_hero`. Literal addresses are retained in
  `sources/native/strings/ghidra-mirage-strings-07.txt:24` onward.
- `RequestRegisterDeck` **G92fed0** → **`/mirage/RegisterDeck`**,
  auth5 plus `inst_list` (string containing ordered numeric full64 IDs).
  Its reply changes the saved party only; the existing exact callback
  and living-entry guards remain independently documented.
- `RequestHealHunter` **G930b60** → **`/mirage/Revive`**, auth5
  plus `target_inst_id` full64; request key literal G930cc8 and
  route literal G930e1a. The parsed full64 request ID does not by
  itself expand the effective-width limit of other entry consumers.

No distinct exported Mirage `RequestEntry` or `/mirage/Entry` route was
established by this bounded vocabulary search. `LoadEntry`/`SaveEntry`
are deck-handler methods, and `Parse_Entry` is a response cache updater;
none is proof of a separate enrollment endpoint. Likewise `entry` in
GetInfo is a section selector, not a captured owned-hunter enrollment list.
GetInfo reset semantics, initial entry production, revive charges and exact
success mutations still need their own requester/callback/caller closure
before a configured owned-hunter run is created. This note does not invent
those missing producer rules.
