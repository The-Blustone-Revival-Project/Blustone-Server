# Daily/linear quests: progress cache, modern claim receipt and local boundary

Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra coordinates ELF+0x10000. Bounded original Thumb instructions,
literal reads and request-installed callback RTTI. Follow quest-contracts-
2026-10-11.md and its key locators for reference/reward identity grammar.
Server source note only; no catalogue, counters, claims, code, live input/save,
client/APK or original/DataDump changes.

## Daily overlay and linear row remain different contracts

ParseDailyQuest2 G844d14 looks up a supplied daily_quest_id against previously
registered DATA references; matched rows are set TYPE2 G844eaa..eae.
is_rewarded converts unsigned then stores ONE BYTE G844ee8/G844efc.
cur_val is an absolute unsigned32 word G844f38/G844f4c, not an increment.
TODAY_QUEST receives special TYPE1 handling G844f6e..f7a. Canonical0/1
reward flags and rejecting unknown reference IDs are strict local admission;
byte storage itself does not prove a bool-only producer domain.

ParseLinearQuest2 G844fd4 constructs a full DATA row from title/desc/id,
npc_id/go_to, serial/target_val/option_val, cur_val and reward; numeric fields
are unsigned32 G845202/252/2a2/3e2 and its type is fixed3. Quest reward
reference fields remain symbolic currency scalars and item_list/card_list
ref_id/qty rows; those are reference previews, not settlement instances.

ParseLobbyEnter G844918 requires dailyquest_min_stage STRING
G84493e..4950. A nonempty string updates its cached minimum stage;
empty string preserves the previous value G844962..976. Missing/null is
not a source-safe substitute for that strict string conversion.
Its daily_quest collection selects G84497c and calls ParseDailyQuest2 per
row G844a08. This is an upsert over existing reference DATA: omitted or
empty rows do not reset other cached counters/flags.

## Linear collection is a single replaceable slot, with a terminal tombstone

For each linear_quest row, ParseLobbyEnter searches the FIRST existing
DATA.type3 in its list G844ad4..b36. It does not match incoming id or serial.
The new full row is parsed at G844b3a. A nonempty parsed id replaces that
first slot G844b50..b68, or is pushed to the list when no slot exists
G844b9e..bd8. An EMPTY id removes an existing linear slot
G844b50/52→G844bde..c20; with no existing slot it is skipped.

Therefore multiple supplied linear rows successively overwrite the same
slot; last nonempty row wins. Empty/missing linear_quest collection preserves
the old slot, so [] cannot claim to clear a completed sequence. A supported
canonical producer should publish at most one full linear row. Terminal
clearing requires a separately modeled complete empty-ID row, not an invented
{} or null. Full string fields still reach ParseLinearQuest2; a terminal
tombstone must not silently become an original playable reference identity.

## Claim request and concrete modern callback

RequestReward2 G845ca0 serializes auth5. When captured DATA.type==3, it
sends serial/id/target_val to path literal linearquest/Reward G846144.
Other types send daily_quest_id/target_val to dailyquest/RequestReward
G8463f4. These literals have no leading slash; existing server HTTP route
normalization uses /linearquest/Reward and /dailyquest/RequestReward.
No current count, reward quantity, calendar/period ID or claim nonce is sent.
Client target_val is a quote of its reference target, not proof of completion.

The exact $_2 inner callable is G851ee8, vtable VA2140720, RTTI VA2140744
bound to RequestReward2. It checks CPVHTTPResponse.GetResultCode==1 at
G851f08..f10 before calling ParseDailyQuestCompleteReward G847760 at
G851f16. Non-success skips progress/reward parsing. This concrete modern
callback supports both request branches; do not replace it with an unrelated
achievement or expedition-DailyQuest receipt.

IsClearedQuest G849f9c compares cached cur_val against target_val with
UNSIGNED >= G849fde..fe6. It does not test is_rewarded there. A server must
separately validate known identity, reference serial/target, owned progress
and unclaimed state; this UI comparison alone is no grant authority.

## Actual successful claim envelope

ParseDailyQuestCompleteReward reads FULL response.ret_data G847786.
Optional achievement is parsed only when nonnull G847792..7d6. It THEN
unconditionally calls ParseLobbyEnter on that ret_data object G8477de,
before selecting reward G8477e6. A correct successful receipt therefore
includes the compatible minimum-stage header and daily/linear progress
subtrees, not merely {user:{gold:...}} or {reward:...}.

```text
ret_data: {
  dailyquest_min_stage: STRING,
  daily_quest: [{daily_quest_id:STRING,is_rewarded:BYTE,cur_val:UINT32}, ...],
  linear_quest: [<full linear row or separately admitted terminal row>],
  achievement?: <independent supported achievement payload>,
  reward: {
    gold?: {cur:UINT32},
    ap?: {cur:UINT32,ap_charge_time:UINT32},
    bp?: {cur:UINT32,bp_charge_time:UINT32},
    free_iap?: {cur:UINT32}, iap?: {cur:UINT32},
    honor?: {cur:UINT32}, vip_exp?: {cur:UINT32},
    item?: [{inst_id:UINT32,ref_id:STRING,added:UINT32}, ...],
    card?: <independent complete native card collection>
  }
}
```

Each listed currency block has an independent null guard, e.g. gold
G8477fa. Omission preserves that currency; present block with missing cur
converts0. cur sets an ABSOLUTE native quantity, not an amount to add.
Gold setter G847852, free Manda setter G847a7c, others follow the same
guarded pattern. This function does NOT call generic SyncUser: its mandatory
iap_qty/free_iap_qty reset rule must not be imposed on this unrelated parser.
Paid/free blocks additionally require the native initialized account identity
at the inspected sites G8479e4..9ee; no allocation/purchase rule is inferred.

AP/BP clocks are effective unsigned32 here, despite SyncAP/SyncBP wider
clock arguments: AP converts at G847902 and clears highword G84790e before
SyncAP Gb6c95c G847910. Preserve these parent/unit distinctions. No
reward.exp setter was located in the complete bounded parser, although EXP
exists in reference reward previews. Do not settle EXP from a symbolic field
without its actual live receipt consumer.

## Quest item IDs narrow to32 bits, unlike Expedition End

reward.item selects G847bce. inst_id is converted to unsigned32 lowword
G847cca/G847cf8; ref_id strictly to string G847d12; added unsigned32
G847d80. AddItem Gaec508 receives r2=low ID G847d90 and HIGH WORD ZERO
G847d92 at call G847d94. Thus emitting a full64 item ID aboveUINT32 here
aliases another native stack. Local settlement must reject unsupported wide
existing/new IDs instead of copying Expedition End's full64 identity contract.

Item deltas retain AddItem's existing-ID/ref join and lost-first-reply hazards.
Replaying an additive item award can double it; omission does not repair a
missing stack. Separate GetItemInven absolute upsert remains the established
repair workflow. Card awards require their full nested collection/owned-ID
grammar; this note does not invent new Hunters from reference card_list.

## Counter production and minimum persistent implementation

This bounded native chain supplies absolute cur_val and received flags from
server responses. It does not recover original quest-ID-to-event predicates,
reset calendars, linear serial advancement rules, TODAY_QUEST aggregate
production or original reward magnitudes. title/go_to/option_val are not
proof that a particular battle, training or currency event increments a task.
No client-submitted target can authorize a reward.

A minimal complete opt-in **local** daily workflow can use explicitly supplied
compatible reference identities, title/scene metadata, minimum stage and
per-owner persisted instances. Progress must come from declared authoritative
local events with deduplication, or supplied already-earned records; do not
claim those event mappings recovered from the native client. A fixed explicit
local period policy avoids inventing an original daily reset/timezone. The
request has no period/nonce, so rollover/retry ambiguity remains a producer
design constraint rather than a native exactly-once law.

For an initial gold-only claim, validate known id/target and unclaimed earned
count, prepare marked daily progress plus current linear slot/header, and emit
reward.gold.cur with the new authoritative total. Persist progress/claim/wallet
atomically; a deliberate local replay can repair current absolute gold and
progress without repeating a grant. Do not clear independent linear state
with [] or fabricate a TODAY_QUEST/achievement catalogue. Item/Hunter/currency
expansion needs the specific join and receipt proofs above.

Original production catalogue and condition/reward tables remain missing, as
bounded in the earlier quest-contract note. A pure schema or a declared local
workflow is not a recovered original quest system or verified native quest UI.
