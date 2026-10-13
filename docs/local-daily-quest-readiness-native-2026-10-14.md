# Local daily quest readiness: minimum-stage filter and presentation metadata

2026-10-14. Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code coordinates ELF+0x10000. Bounded original Thumb and existing
quest-contracts/quest-progress-claim-cache source notes. Server doc only; no
original quest IDs/event mapping, metadata, counters or rewards fabricated.

## Required reference and instance components remain separate

The recovered reference requires numeric type/serial/target_val/option_val;
strict STRING title/desc/desc_noti/id/npc_id/go_to; a complete symbolic reward
object with currency scalars and item_list/card_list reference-ID rows.
npc_id and go_to are not JSON scene objects, lists or executable expressions.
The existing pure helper's source whitelist does not prove an authored ID is
original; a new local mode must identify its catalogue as explicit local data.

GetInstList overlays contain daily_quest_id, is_rewarded byte and absolute
uint32 cur_val, matched against registered reference DATA. Missing/empty rows
do not clear omitted native tasks. Local publication should include complete
owner overlays for its explicit known references instead of interpreting []
as cache reset. Native ParseDailyQuest2 assigns normal matching rows type2,
while TODAY_QUEST receives special type1 treatment; use type2 local references
and do not fabricate that summary identity or its aggregate condition.

## Minimum-stage gating can hide otherwise valid type2 tasks

`CSRAchieve.GetDataList G847160` first reads cached dailyquest_min_stage.
A nonempty value calls CSRPlayData.IsClearStage **Gb6ce4c** at G847188.
Empty or cleared minimum returns the ordinary list-copy branch G847194.
When minimum is nonempty and uncleared, it builds a filtered list: DATA.type
is ORed with2 and compared against3 at G8471dc..1e4, thereby retaining
**types1 or3 and excluding normal type2**. It does not turn an uncleared
minimum stage into quest completion or reset the normal tasks.

Consequently an explicit local daily catalogue should supply a real published
minimum stage and model its earned gate deliberately. ParseLobbyEnter's empty
minimum string preserves the old native field, so empty text is not a reliable
way to disable an already cached gate. A supported producer must not choose
a made-up stage or grant its clear solely to expose the quest list.

## TODAY_QUEST absence is handled by the bounded getter

GetTodayQuestTargetValue **G849ee0** searches exact STRING **TODAY_QUEST**
at G849f1a. A match reads its target field G849f50; absent match returns0
G849f52/G849f6a. There is no mandatory dereference in this bounded getter.
This supports leaving the unproved summary absent rather than manufacturing
a type1 bonus quest. It is not a global claim that every other UI caller is
safe for arbitrary empty quest lists or reference IDs.

Other inspected daily lookup/overlay paths match provided references. Their
key names and arbitrary provided IDs do not prove original production event
semantics, serial advancement, reset periods or a nonce protocol. Existing
quest source notes remain authoritative about claimed flags/upserts, unsigned
cur>=target UI comparison and gold-only absolute reward receipt.

## NPC thumbnail and shortcut limits

Normal quest cell `CSRCellAchieveNormal.SetData Ge01b3c` builds the portrait
name from the quest's npc string plus **_TH** at Ge01f10..1a, performs the
resource lookup Ge01f2c..34, and checks the returned pointer before binding
the image **Ge01f56..58**. A missing thumbnail is skipped in this bounded
branch; it is not proof of a complete original portrait or every cell's visual
readiness. Preserve a supplied npc_id literally, and validate any promised
portrait against available original resources rather than infer NPC mappings
from a task's event label. Empty npc_id may produce a blank portrait; it is
not an original NPC assignment.

`CSRAchieve.GoShortcut G84dcb0` hashes its STRING and branches over explicit
native shortcut cases. The inspected source establishes that it is a string
selector, not an HTTP URL/stage-ID resolver or extensible scene DSL. No
shortcut alias mapping was promoted by this audit. A neutral local shortcut
may remain empty/disabled by explicit policy; do not claim a working navigation
action from an unverified authored value or invent a go_to value by event name.
The ordinary cell has a separate BTN_DAILY_MOVE handler Ge0243e..452.

## Bounded implementation constraints

A first explicit local gold-only workflow can publish supplied type2
references, a source-compatible minimum-stage STRING, owner-complete overlays,
and reward.gold.cur only after atomically persisting a claimed flag and current
gold. Keep item_list/card_list and unsupported currencies0/empty in those
authored reference previews. Native claim uses specialized currency setters,
not generic SyncUser. Preserve independent linear/achievement state and emit
the required progress header/subtrees in claims/replays.

Event-to-task mapping, fixed local period, eligibility, amounts, shortcut/NPC
presentation and replay behavior must be declared local policy. No original
daily calendar, stage association or rewards follow from these parser/UI
mechanisms. A source-compatible HTTP fixture is meaningful progress but does
not prove native quest list pixels, navigation or claim UI were tested.
