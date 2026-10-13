# Mirage RegisterDeck: wire, guarded bare-array reply and party admission

Bounded original ARM audit, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G code addresses are ELF offsets+10000; writable data VA maps to file VA−1000.
Read preserved mirage entry-model/deck-key/name exports first, then original
Thumb and concrete callback RTTI/vtables. Server documentation only; no
DataDump/original edits, live input, private save, client or APK changes.

## Exact request and reply

CSRExploreMirageInfo.RequestRegisterDeck **G92fed0** receives
`list<uint64>` and callback(request,response). It posts auth5 plus:

```text
inst_list: <JSON STRING encoding an ordered array of numeric uint64 Hunter IDs>
```

The list loop loads both ID words G92ff1e, ORs them and **skips zero IDs**
G92ff22..24. Nonzero IDs copy both words G92ff2a..2e, mark JSON unsigned
number type6 G92ff32, append G92ff3a. JSON dump G93008c is assigned to
literal `inst_list` G930090..98. Route literal resolved from G9301e6/1e8 is
**`/mirage/RegisterDeck`**; construction G9301f4. No floor, stair, HP,
grade, entry enrollment, ordinary deck type or outcome is sent. The builder
has no list-length, duplicate, ownership or living-HP validation itself.
Server validation must independently bind already-owned, admitted run entries.

The concrete $_5 inner callable is **G9372c0** (RTTI VA214751c,
vtable VA21474f0; outer RTTI VA21474dc/vtable21474b0 dispatches through
G936f94). It tests CPVHTTPResponse.GetResultCode G93730e and admits
**result1 OR10189 (`0x27cd`)** G937312..31c. For other results it skips
the cache parser and still forwards the actual response to the caller.

Within that admitted branch, it checks whether top-level **`ret_data` exists**
G93734e..398. If present, it selects **ret_data directly** G93739e..3a4
and invokes **ParseDeckInfo G92c428** at G9373ac. Therefore a successful
reply is `ret_data:[ID,...]`, **not** `{deck:[...]}`, `{inst_base:...}` or
an entry/HP object. Missing ret_data preserves the cache; null/nonarray is
ignored by ParseDeckInfo's type2 guard. An empty array actively replaces the
current registered deck with empty. Do not use result10189 as an arbitrary
local success: its original server meaning is not proved here.

ParseDeckInfo first snapshots its previous current list through
SetSaveDeckInfo G92c5ac, then clears current list at model+18 and appends the
supplied scalar IDs in order (preserved entry-model export). Full64 numeric
IDs are retained. It does not validate ownership/duplicates/living state;
malformed scalar values may convert to zero. The strict complete-array local
decoder should refuse those values rather than imitate aliases/coercion.
The backup/save list at model+0c is distinct from current list at model+18;
do not collapse them in native-cache reasoning.

**No registration HP setter, Parse_Entry, Parse_End, state/floor/stair setter,
wallet parser or quest parser occurs in this inner callback.** Registering a
party is not proof of enrolling/resetting Hunters to10000 HP or creating a
run. Those producers remain separate required provenance.

## UI admission, five slots and duplicate-name rule

CSRExploreMirageDeckHandler.Init **G928dcc** sets its slot count to
**5** at G928de4..de6 and initializes the selected vector to that size.
This is positive native UI capacity, not the request builder's wire bound.
SaveEntry **G92970c** has two distinct modes controlled by handler+18.
Mode1 uses ordinary LoadSetting G8b8748; the other mode loads the Mirage
model's saved list through GetBaseInfo G92e8bc. Do not confuse mode1's
ordinary setting-save branch with the actual RegisterDeck branch.

In Mirage mode0, SaveEntry scans selected nonnull thumbnail gauges at +20:
float gauge<=0 increments a rejected count G929918..92c; any rejected
count displays “unconscious Hunters cannot deploy” G929930..94c and does
not send registration. It counts null slots G929abc..b02; if all5 slots
are null it displays “at least one member is required” G929b04..26.
For admitted selected cells it collects each cell's full64 ID at +10
G9299ca..d2, preserving slot order while omitting empty cells. Mode0 calls
RequestRegisterDeck G929c30. Gauge source/entry provenance must remain
separate from historical server HP1000; native full carried HP is10000.

OnClickBottom **G92a2c4** resolves the selected thumbnail's owned Hunter
with CSRInventory.FindCard G92a344 (full64 arguments G92a33e). It scans
the existing five selected slots. Exact same instance ID is compared using
both words G92a438..446 and **toggles removal** G92a594..5de; it is not
an instruction to add a duplicate. For different IDs it compares two
**CSRCardInfo strings at+30** G92a47a..4ee and rejects equal strings with
“same character cannot deploy simultaneously” G92a612..628.

The compared field is positively **`base.name`**, not ref_id or char_id:
CSRCardInfoContainer.SetCard G87bd16 selects the `name` literal, converts
the string G87bd24..34 and stores it into CardInfo+30 G87bd3c..66.
The preceding `char_id` selection G87bcbe stores to+3c separately. Native
duplicate checking is exact byte-string name equality (length then bytes or
memcmp), with no case normalization here. Distinct refs sharing the same
source display name are rejected. Existing distinct-ref readiness alone
does not close this UI restriction; a server policy must use trustworthy
source names or explicitly acknowledge a narrower local approximation.

The picker checks clicked gauge<=0 in mode0 G92a5f0..604 and refuses it
G92a6ce..6e4. It rejects same-name selection when adding, refuses when no
empty slot exists G92a644..65a, and otherwise inserts into the first empty
slot G92a672..696. Removing an already-selected same instance happens before
the living-gauge check and is allowed. Duplicate-name comparison is stronger
than merely requiring different Hunter instance IDs or different refs.

## Caller completion and remaining producer boundary

SaveEntry $_4 continuation **G92b1e4**, RTTI VA214731c/vtable21472f0,
checks actual result1 G92b1fe..204 OR10189 G92b208..212. Only those values
invoke the supplied completion closure G92b214..22e. Other results show
error text G92b230..24a. Thus truthful unsupported result2001 safely skips
both registration cache updates and the success completion path; unlike End,
RegisterDeck has a positive result guard before parsing.

Implementable contract: authenticated full64-ID list registration for an
**already independently established run/entry set**, one through five owned
living selected Hunters, no duplicate instances or exact source names,
atomic persisted party replacement, bare numeric-ID-array response. The
one-to-five and strict scalar checks are conservative server admission of the
native UI subset; builder itself does not enforce them. No native initial
entry roster, full-HP reset, state transition, grade mapping, floor catalogue,
future stair progression or reward producer was established by this audit.
Those must not be synthesized from successful registration.
