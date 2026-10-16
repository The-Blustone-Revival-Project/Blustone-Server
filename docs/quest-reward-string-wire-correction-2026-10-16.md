# Quest reward preview strings and terminal linear rows

Bounded re-audit of retained original Thumb instructions, original library
SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
This corrects an omitted wire distinction in the earlier quest notes. ELF
coordinates below become Ghidra addresses by adding0x10000. No DataDump,
original binary, private save, live UI or client APK was changed.

## Reference and linear preview reward are JSON strings

`CSRAchieve::ParseReference` consumes `/dailyquest/GetRefList` full response.
Retained `local/research/quest-contract-20261011/QuestReference.txt` shows:

- ELF833e2e selects row `reward`.
- ELF833e40 calls `nlohmann::detail::from_json(...string_t&)`.
- ELF833e56 calls `basic_json::parse<string>` on that extracted string.
- ELF833e7e onwards reads preview currency scalars and item/card lists from
  the parsed inner JSON object.

`CSRAchieve::ParseLinearQuest2` uses the same mechanism. Retained `Linear2.txt`
shows reward selection at ELF8353f8, strict string conversion at ELF83540a,
then inner JSON parse at ELF83541c. Empty quest ID does not bypass this path.

Therefore BOTH reference rows and full linear cache rows require
`reward: JSON.stringify(previewRewardObject)` on the network. The existing
internal `QuestReward` object is a useful decoded model, not the native wire
representation. Persistence/ingestion can keep that object; projection must
encode it once. A direct object is not accepted by these strict string sites.
Do not double-encode the whole row or stringify unrelated settlement data.

This correction concerns preview rows only. The modern successful claim's
`ret_data.reward` is an OBJECT read by `ParseDailyQuestCompleteReward`, with
guarded specialized currency blocks such as `gold:{cur:UINT32}`. It must NOT
be converted into the preview string format.

## Complete terminal row

ParseLinearQuest2 reads strings title/desc/id/npc_id/go_to, unsigned32
serial/target_val/option_val/cur_val, plus the JSON-string reward preview.
It assigns DATA.type3 internally at ELF83501a..1e. It does not read
desc_noti or is_rewarded (daily reference/overlay contracts are separate).

A separately authored terminal tombstone can therefore contain empty values
for all five strings, zero for all four numeric fields and a reward string
encoding all eight zero currencies (vip_exp/ap/bp/gold/honor/exp/free_iap/iap)
and empty item_list/card_list. This is a cache-control sentinel, never a
playable quest identity or claimed recovered production quest.

ParseLobbyEnter first parses the FULL row, then tests the parsed ID. Empty
ID removes its first existing type3 slot; no existing slot means no insertion.
An omitted/empty linear_quest collection preserves its old slot. Thus null,
{} or [] cannot substitute for the complete tombstone.

## Current progress and replay boundaries

RequestReward2 selects type3 for linearquest/Reward and sends auth plus
serial/id/target_val. The matched modern callback requires application
result1 before parsing. Successful mission/Complete already invokes
ParseLobbyEnter on ret_data; successful claim also invokes it before its
specialized reward setters. Both can publish the current full linear row or
terminal sentinel with the mandatory dailyquest_min_stage string and daily
overlays. Gold-only claims may include absolute reward.gold.cur and omit
unsupported currency blocks.

The native request carries no nonce or period. Local replay handling must
not return an earlier captured linear row or wallet: emit current cache and
current absolute gold, with no second grant, so an old claim cannot rewind
a later sequence position. Sequence/event/serial advancement and monetary
amounts remain explicitly local policy, not recovered original quest data.
