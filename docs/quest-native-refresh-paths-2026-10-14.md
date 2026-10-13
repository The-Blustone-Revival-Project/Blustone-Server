# Quest cache refresh: mission completion, achievements and panel entry

2026-10-14. Read-only original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code coordinates ELF+0x10000. Bounded Thumb instructions and exported
symbol/call-site attribution. No live quest/battle input, achievements,
condition values, producer code or DataDump edits.

## Correct the old achievement/request-builder attribution

**CSRAchieve.ParseAchievementsElement G8481c4** is an achievement-data parser,
not `/dailyquest/GetInstList`'s request builder. Its complete bounded normal
body iterates the supplied JSON argument G848234..25e, calls
**CreateAchievementElement G84ba08** at G848268 and the achievement update
consumer G84c7f4 at G848270. There is no HTTP request-builder call in this
body. The older Server comment equating it to a GetInstList builder was wrong.
Do not emit fabricated `achievement:{}` or `achievement:[]` as a presumed
daily counter refresh signal.

The actual separately exported builder is **CSRAchieve.RequestDailyQuest
G848410**. Existing reference/claim source notes establish its daily request
route. A parser's optional achievement branch does not invoke it by name
merely because both belong to CSRAchieve.

## Successful ordinary mission completion already parses daily overlays

The exact successful native callback is **CSRSyncMStage.ReqCompleteCB
Gb426ac**. It receives the complete decoded JSON in r3 and captures that in
sb at Gb426be. It first requires GetResultCode1 Gb426d0..d6. It selects
**ret_data** at Gb42740/Gb4277e and saves the selected pointer to stack+1c
at Gb42782.

In the successful callback's tail, it gets the achievement singleton
Gb43d0e, loads **that ret_data pointer** into r1 Gb43d12, and calls
**ParseLobbyEnter G844918 at Gb43d14**. Only AFTER that does it select the
optional achievement child Gb43d1a..1e and call ParseAchievementsElement
when nonnull Gb43d24..2e. These are distinct updates.

Therefore an accepted local mission win can synchronize known daily counters
by placing the existing source-compatible progress component directly in
**mission/Complete.ret_data**:

```text
dailyquest_min_stage: STRING,
daily_quest: [{daily_quest_id:STRING,is_rewarded:BYTE,cur_val:UINT32}, ...],
linear_quest: [<independent supported current slot>]
```

The ordinary receipt's stage_id, stars, user/item/battle result fields remain
their independent native contract. No fake achievement element or second
HTTP request is needed to feed the direct ParseLobbyEnter call. Its daily
rows are absolute upserts against registered references; the local event
producer must commit its known counters before constructing this component.
No completion or original event mapping is inferred from its presence.

Empty linear collection preserves an existing native linear slot; it is not
a fabricated terminal clear. Keep existing source distinction between the
daily overlay and full linear rows. Modern daily claim callback also calls
ParseLobbyEnter before specialized currency reward setters, as already pinned.

## Distinguish two actual quest UI entry paths

`CSRSceneAchieveList.OnInit Ge00590` calls its internal initialization and
**SetData Ge00c0c** at Ge00b2c. SetData gets CSRAchieve.GetDataList G847160
at Ge00c78 and builds its list from cached DATA. Neither complete bounded
OnInit nor this SetData calls RequestDailyQuest. Merely opening this direct
scene is not proven to fetch current server counters.

By contrast **CSRTabAchieve.OnInit Gf9e4f0** positively calls the singleton
G848160 at Gf9e7b6 and **RequestDailyQuest G848410 at Gf9e7de**, with a
captured status callback. A bounded direct BL scan found this one direct
RequestDailyQuest caller; indirect/PLT paths are not claimed globally absent.
This tab path can request fresh daily overlays, but must not be generalized
to the direct SceneAchieveList path or every navigation entry.

## Implementation/review implication

The supplied local policy/journal may provide type2 references, known owner
instances, fixed explicit period, declared ordinary mission-win rules and
gold-only claims. Strict descriptor/dense-array validation, detached policy,
absolute snapshots, earned target/claimed checks and atomic wallet/journal
persistence are separate producer requirements, not native event law.

For a complete native counter flow, publish the newly committed known progress
component in ordinary mission completion, and preserve compatible header/
overlay fields in lobby and claim responses. Do not rely on the direct panel
performing a GetInstList refresh or introduce an achievement placeholder.
This source seam is actionable without inventing original IDs, NPC/shortcut
mapping, reset schedule or reward amounts. Native quest pixels and claims
still require a separate permitted UI trial before asserting they are verified.
