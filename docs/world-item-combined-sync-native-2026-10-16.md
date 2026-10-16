# RefreshInven item and combined absolute sync consumers

Companion to world-use-item-and-inventory-sync-native-2026-10-16.md, which
already closes the distinct card-only callback. This audit follows the exact
item/combined continuation owners, not neighboring endpoint assumptions.
Immutable original ARM SHA256 is
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
No original binary, DataDump source, private save or live client was modified.
Code addresses prefixed G use ELF code+0x10000; data addresses explicitly
labelled ELF VA use the actual ELF load mapping (writable data file=VA−0x1000).

## Item-only owner and request

Independent bounded item-only audit identifies the exact native RTTI name at
file1e7dd20 as ReqSyncItemInstance::$_2 E0. Its typeinfo is file217bed0,
vtable file217bea4 (G218cea4), and invoke entryELFf616e9 resolves to
Thumb operator Gf716e8. This positively distinguishes item-only mutation
from the card-only and combined continuations.

ReqSyncItemInstance Gf6c604 accepts a vector of string reference IDs, sends
auth5 plus item_ref_list at Gf6c7e0, and selects /world/RefreshInven at
Gf6c94e. Its exact continuation guards GetResultCode1 at Gf7170a/70e/710
before selecting ret_data.item at Gf71714/71e and operators Gf7171a/722.

The item-only loop independently reads the SAME item row contract:
inst_id keyGf717a8, integral full64 LDRD Gf7180a and STRD Gf71830;
strict ref_id string conversion Gf71846; qty uint32 integer low-word
Gf7189c or float conversion Gf718bc. Optional buy_cnt_gold and
buy_cnt_manda have explicit existence/default0 guards Gf718d6..e6 and
Gf71910..20. SetItem Gaec33c is called at Gf71964. Its same-ID removal
at Gaec3a8 is followed by unconditional whole-row insertion, including qty0.
No lock field is consumed here. Generic collection iteration supports
multiple returned stacks; the callback does not enforce the requested
reference filter itself, so the server must establish that selection.

## Combined builder and exact second callback

CSRSyncGlobal.ReqSyncCardItemInstance Gf6d354 sends auth5 plus item_ref_list
and card_inst_list to /world/RefreshInven. Selector literal sites are
Gf6d5a4/Gf6d61e and route Gf6d7ce. Item references are strings; card selectors
preserve full64 numeric identities. No Gem selector occurs in this builder.

The builder positively installs its second wrapper at Gf6d9b8..9be: a PC
relative value resolves vtable ELF VA217cf24 (file217bf24), adds8 for its
address point and stores that vptr into the allocated0x28-byte wrapper.
RTTI ELF VA217cf50 names ReqSyncCardItemInstance::$_3's TASK_READY E0 chain;
its name is file1e7e47a, recorded in native-evidence.tsv:48224. The invoke
entry is ELFf621b5, resolving to Thumb operator Gf721b4. The first wrapper's
vtable ELF217cee4 at builder Gf6d93e belongs to the separate whole-JSON decode
chain; it is not itself the item/card inventory mutation.

The combined operator obtains application result at Gf721d6 and compares1
at Gf721da..dc. Non-success skips both mutation branches. On success it
selects wholeJSON.ret_data.item at Gf721e0..1f0 and processes ALL item rows
before selecting ret_data.card at Gf72524..2a.

## Item row fields and SetItem law

The combined item loop reads:

- inst_id full unsigned64, integer LDRD at Gf722d8, stored together at
  Gf722fe. This is not an effective32 item identity.
- ref_id strict string conversion at Gf72314.
- qty unsigned32 numeric conversion, stored at Gf7239a.
- buy_cnt_gold optional unsigned32 with missing/default0 at Gf7239c..3d0.
- buy_cnt_manda optional unsigned32 with missing/default0 at Gf723d2..40e.

It calls CSRInventory.SetItem Gaec33c at Gf72432 with that full item record.
SetItem is the independently recovered remove-same-ID then insert-full-row
consumer. It replaces absolute qty/ref and can create an absent stack. This
is not AddItem's added delta, UseItem's consumed qty, or SetItemQuantity's
existing-only remain setter. Returning the same snapshot twice does not add
stock. An explicitly supplied qty0 remains an existing zero-quantity stack;
this callback does not erase it merely because its quantity is zero.

Identity is the full instance ID, not ref_id. Multiple distinct stacks with
the same ref_id remain distinct, so a reference-selected response needs to
preserve each applicable instance rather than merge quantities into one row.
The parser's optional purchase counters default0; original purchase behavior
and whether a local save tracks those counters are separate producer facts.

## Combined card branch and order

After all item rows, the card loop selects ret_data.card Gf72524..2a and
parses each complete instance through CSRPlayData.ParseCardInst Gb69598
at Gf725de. It then removes the same full64 card ID through
CSRInventory.RemoveCard Gaebc44 at Gf7260c and adds the parsed replacement
through CSRInventory.AddCard Gae9238 at Gf72678. Thus the combined order is
item absolute upserts FIRST, card absolute replacements SECOND. It does not
perform a whole-card-roster reset or apply EXP deltas.

## Producer and remaining boundaries

The native bodies establish response consumption, not original ownership
authorization, batch quotas, unknown-selector handling or persistence laws.
The replica must independently authorize the actor and derive full snapshots
from existing owned state. Any request limits, stable ordering, duplicate
coalescing, unknown-ID/ref refusals and purchase-counter fallback policy are
explicitly LOCAL. A sync read must not invent owned stacks/cards or regenerate
energy simply to create a response.

An omitted instance is not an authoritative deletion instruction: neither
SetItem nor this card replacement loop clears every unlisted record. For a
requested known reference with no owned stack, an empty returned collection
does not prove the client erased stale local stacks. Do not advertise missing
stack deletion repair, cross-reference cache cleanup, Gem synchronization or
automatic retry invocation from these receivers alone.

## Implemented producer and scope

ServerState.refreshInventory now admits card_inst_list, item_ref_list, or
both; at least one selector is required. Child arrays appear only for
selected modes. Combined output carries item then card. Both projections
finish before the response is returned, so an invalid card selector, invalid
item count or unknown returned reference cannot expose a partial success.

inventory-item-sync.ts selects only actual owned stacks matching the exact
requested reference strings, with LOCAL1024-entry request-order deduplication.
All matching stacks, including zero quantity, are returned with absolute qty.
Known published GetItem metadata is required for returned references only:
unrequested imported metadata is retained; a reference never owned returns
no rows and never invents an instance ID or zero-stock deletion. Per-instance
purchase counters are preserved when present; omission retains the native
explicit default0. Other stored metadata is detached/preserved, although this
callback does not parse lock. No Gem selector is introduced.

Owned IDs are validated as exact positive uint64, including number/string
alias duplicates. Safe numeric storage and canonical full64 string storage
are supported; already-rounded unsafe numbers refuse. Unsafe IDs serialize
as exact numeric JSON tokens through JSON.rawJSON, avoiding native string
to-double rounding. No owned ID, quantity, counter or extra field is rewritten
in storage by this read.

Tests exercise actual SkillUp consumption into a zero-quantity tombstone,
actual card lock changes, combined full DTOs, multi-stack quantities/counters,
full64 numeric wire output and restart. Invalid mixed requests, unknown
returned metadata, both auth failures and stale resource clocks preserve
all game/account nested references and durable bytes. A separate compiled
--fixture --exercise-inventory-sync verification seeds two explicit test
stacks above32 bits, including zero stock/purchase counters; encrypted
ECDH/HMAC/AES reads, all three modes and process restart pass without stock
changes. The exercise refuses preserved/private state targets and other
exercise combinations. Native inventory-popup pixels remain unverified.
