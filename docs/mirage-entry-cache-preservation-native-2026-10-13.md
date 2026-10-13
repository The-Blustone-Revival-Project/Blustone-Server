# Mirage GetInfo empty entries actively reset native carried HP

## Implemented preservation guard

Authenticated GetInfo now checks already established server game state before
publishing any empty entry/deck. Any starter or recruited Hunter with present
mirage_remain_hp other than1000 causes result2001 without entry/inst_base.
This matches existing conservative mutation protections; absent/1000 is a
LOCAL replica no-carried convention, not original entry-membership proof.
No game is created and no save is written by this check. All section flags
still follow the same guard; explicit reset remains refused independently.
Unrelated accounts and GetFriendInfo keep their prior empty read behavior.

Authored historical-save tests exercise rawHP0/425/999/-1, true/false section
flags, complete save/restart preservation, peer isolation, authentication and
ordinary1000 starter lobby. No inferred entry, registered party, run, floor,
enemy or healing/reward producer is added. Native UI validation remains pending.

Targeted source audit, not a new Mirage run. No enemies, stairs, floors, rewards
or original numerical policy were invented. No live input/save/client/APK or
DataDump changes. Original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code plus10000.

## Strongest actionable gap in the current read-only lobby

Before this guard, Server GetInfo always returned `entry:[]` and `inst_base.deck:[]`. These are
native cache replacement instructions, not inert descriptions of unavailable
data. An imported historical card can have preserved `mirage_remain_hp` and
server sale/equipment/Gem guards refuse carried commitments, yet this read
still clears the corresponding native state. The correct next seam is
preservation/admission of already-established Mirage state, not another
invented empty floor or new enemy/reward fixture.

`CSRExploreMirageInfo.Parse_Entry` **G933aec** checks JSON type2 at
G933b02. For **any array, including empty**, it obtains the inventory and
calls **ResetCardMirageRemainHP Gaea4c4** at **G933b2e**, before iterating rows.
Reset walks every owned card Gaea4c8..4da, calls SetMirageRemainHP with
**integer−1** at **Gaea4ce..4d2**. It does not set1000/full HP. The card setter
G869fcc simply writes its integer argument to card+2c, getter G869fd0 reads
that same field. Avoid describing [] as a free heal or reconstructing all
roster defaults as entered hunters.

Each supplied entry row then selects exact keys **`id`** (G933bbe/bc8) and
**`mirage_remain_hp`** (G933bcc/bce). ID integer branch reads its lowword
G933c08; string/double conversion is uint32 G933c30. HP integer branch reads
lowword G933c52; string/double conversion is also uint32 G933c7a. At
G933ca6..cac the setter receives ID lowword with highword0 and HP raw integer
bits through SetCardMirageRemainHP Gaea4de. This is not a per-entry PVID,
Gem identity or stat-reference ID; it is the already-owned Hunter instance.
Supported identity admission should refuse >uint32 rather than publish aliases.
Original complete HP units/legal range and run producer remain separate.

`ParseDeckInfo` G92c428 also checks a supplied array before replacing its
current saved-deck list: it copies previous deck through SetSaveDeckInfo,
clears the current list and appends the supplied scalar IDs in order. The
source export `ghidra-mirage-entry-model.txt` records that exact parser.
Its IDs are uint64, unlike the entry updater's effective uint32 lookup.
`inst_base.deck` is not the ordinary account party/deck and must not be filled
from that party solely to make Mirage look nonempty.

The model's IsMirageDeckCard G92ecda independently checks a saved ID list.
It is not an HP>=0 predicate. This audit therefore establishes HP reset and
deck cache replacement, not a complete entry-membership derivation from one
card field. Do not silently equate explicit carried HP with a reconstructed
Mirage run/registered deck or exact floor state.

## Safe progress without fabricated content

Until a distinct established Mirage record and entry/party provenance exist,
GetInfo can conservatively refuse publication of the empty lobby when it would
conflict with known carried Mirage commitments, instead of acknowledging an
authoritative native reset. This preserves the existing empty starter lobby
and keeps reset/registration/combat/revive/reward transactions unavailable.
The server already treats nondefault carried HP conservatively in other
mutation guards; a matching read safeguard needs no new enemies or payouts.

A future explicit restored-state read should validate owned entries and a
distinct registered deck, then hydrate the exact corresponding native rows
without changing the save. Missing run fields must remain unknown; ordinary
roster HP1000 alone is not sufficient source for an entry record. Full run
floor/stair/type/clock coherence and original production initialization still
need their own source/captured record. No such import contract is enabled here.

## Other Mirage boundaries remain substantive

Latest preserved findings already close stair row shape/order, grade0..3,
balance scaling1e-4, postfix/resource composition and GetNextFloor scalar
callback. Original final floor/enemy/grade/balance/reward/rotation/first-aid
tables remain missing. Original MIRAGE art and archived3/6/9 stair counts
cannot supply those server rows. No broad private-cache/stat searches were
repeated. RegisterDeck/request callbacks and run creation must not be enabled
merely because a saved-party parser is known.
