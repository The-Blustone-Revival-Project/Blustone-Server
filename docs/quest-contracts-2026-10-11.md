# Daily, linear and achievement blueprint

The isolated quest module recovers native collection shapes, source identity
boundaries, symbolic reward fields and request-key grammar. It publishes no
quest catalogue, condition, completion, reward or claim. Original production
IDs and target semantics are missing; no IDs are synthesized from stages or
UI resources. A working full quest loop is not established by this patch.

## Distinct native systems

CSRAchieve's `/dailyquest/GetRefList` reads `ret_data` directly as a collection.
The native iterator supports arrays and object values; no nested list child is
read by this consumer. The module chooses a strict array ingestion policy. Original
`ParseReference` ELF83391c reads each record's type, title, desc, desc_noti,
id, npc_id, go_to, serial, target_val, option_val and reward. Condition counters
are numeric fields, but their production identifiers/event meanings remain
server-authoritative and unresolved. The client substitutes target/option
values into text placeholders; that is formatting, not proof of event semantics.

`ParseLobbyEnter` ELF834918 consumes dailyquest_min_stage, daily_quest and
linear_quest. Daily entries pass to `ParseDailyQuest2` ELF834d14 and read
daily_quest_id, is_rewarded and cur_val against the registered reference list.
The native TODAY_QUEST marker is present in this consumer; it does not identify
the production day's task catalogue or authorize fabricating a reference row.

Linear entries use `ParseLinearQuest2` ELF834fd4, which reads full title/desc/id,
npc_id/go_to, serial/target_val/option_val/cur_val and reward data, and sets the
native data type3. This differs from a daily instance overlay. Other type enum
meanings are not reconstructed here merely from the word daily.

`RequestReward2` ELF835ca0 selects type3 for `linearquest/Reward` and sends
serial/id/target_val. The other branch uses `dailyquest/RequestReward` with
daily_quest_id/target_val. These original path literals have no leading slash;
their final HTTP normalization remains a separate integration concern.

The older DailyQuest response wrapper checks result_code1 and iterates ret_data
through ParseDailyQuestEach, which forwards rows to ParseDailyQuest2. Do not
turn that into a `{list:...}` response without proving a distinct caller.

`CSRRefData::SetDailyQuest` ELFdd2ec0 is a separate daily expedition/challenge
reference: ret_data.list rows have id/area_id/valid_day/try_cnt/reset_cnt/res_id,
reward_id_1/2/3 and reset_price. Sharing the DailyQuest name does not allow this
shape to replace CSRAchieve's quest-reference array.

## Symbolic rewards and achievement hierarchy

Quest-reference/linear rewards read vip_exp, ap, bp, gold, honor, exp, free_iap
and iap, plus item_list/card_list rows with **ref_id/qty**. The pure module
preserves those identities and quantities without resolving them into wallets,
item instances, Hunter grants or paid-currency pools.

`CreateAchievementElement` ELF83ba08 uses a distinct hierarchy: id/group/npc_id,
inst.cur_val/target_step/last_step, and ref.title/desc/step/max_step/target_val.
Its item_list/card_list use **id/qty**, not the quest reward's ref_id/qty. The
achievement reward consumer ELF83cac0 separately reads reward/user currency
prev/cur pairs and added item rows. A single generic reward parser would erase
these important namespace differences.

The original CreateSampleAchievementData ELF83d5a4 explicitly creates sample
title/description records with N00 and generated group/achievement strings.
Those are original executable debug samples, not production quest IDs or an
original account receipt. They were examined but deliberately not published as
playable reference data.

## Source coverage and implementation

The immutable original ARM library SHA-256 is
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Bounded offline Thumb disassembly and direct literal reads are retained under
private `local/research/quest-contract-20261011/`. The curated
quest-native-key-locators JSON records exact ELF instruction/string addresses;
Ghidra coordinates equal ELF+0x10000. Key reads are paired with native JSON
index/string or unsigned numeric consumers, rather than guessed from labels.

No quest-reference dataset appeared in the13 recovered LevelDB tables examined.
All21 original LEVELING chunks were inspected with the byte-faithful extractor;
they provide configuration/progression/analytics data, not a production quest
catalogue. UI_QUEST contains original presentation resources, not recovered
quest IDs/target mappings. This bounded absence is not a claim that every
private packet or historical community source was searched.

`ingestQuestReferences` requires a bare array and independently source-approved
IDs. `ingestDailyQuestInstances` requires references already approved, refuses
unknown/duplicate identities and preserves observed current/rewarded state.
`questRewardIdentity` preserves symbolic reward IDs. Strict string/uint32
ingestion is a local validation policy; native numeric conversion itself accepts
additional JSON types. These helpers do not authenticate source provenance or
generate a catalogue. `questRewardRequestKeys` only demonstrates recovered
request grammar; it does not authorize or plan settlement.

Tests use clearly disposable grammar fixtures, not counterfeit original quests.
They verify namespace/wrapper differences, unknown/malformed refusal,
source-copy isolation and request branches. Tests and TypeScript build pass.
Shared routes/state/bootstrap, private saves, runtime, UI/ADB and DataDump were
not changed. No client rebuild or release is owed.

Next substantive integration needs actual source-backed production records,
their event-to-condition mapping, authoritative earned progress, native quest
display/shortcuts, and claim/replay/rollback receipts. Reward identity recovery
must precede settlement. The recovered blueprint narrows those searches without
turning missing data into invented tasks or rewards.

Root integrated authenticated canonical empty reference/instance responses and
non-success daily/linear claim refusal. Native collection iteration permits
array/object values; this publication uses arrays as local policy. Actual
production rows and settlement remain missing. Route tests prove auth and
unchanged game state; compiled encrypted checks pass for reads/refusals.
