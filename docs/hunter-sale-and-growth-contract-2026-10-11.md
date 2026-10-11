# Hunter sale profit contract and equipped growth boundary — 2026-10-11

The final client's sale economic oracle is GetExtra.card_sell_profit, not
GetLevel.card[].sell_price. A pure, evidence-gated sale planner is implemented
in src/hunter-sale.ts. No original profit rows are recovered or enabled, and no
sale transaction is enabled. Root added authenticated result2001 refusal to the
existing sale route, preventing generic mock success from erasing client targets. Missing rows refuse sale; they do
not license silent zero-reward disposal of an owned hunter.

## Fresh original native evidence

Read-only final ARM source: DataDump local/inputs/extracted/lib/armeabi-v7a/
libnative_core.so, SHA256 c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded Capstone5.0.7 Thumb reads and original Thumb BL-target scan; no Ghidra,
ADB, UI, private saves or DataDump writes. G addresses equal ELF/file position
plus10000 in these code/string regions. Literal pools were excluded from actual
instruction/dataflow conclusions.

CSRRefData.SetExtra Gdd819c selects card_sell_profit at ADD Gdda744. It checks
nonempty collection size then indexes each element numerically at Gdda818.
Exact row keys: rank (ADD Gdda794), profit_type (Gdda890), profit_target
(Gdda8e8), profit_qty (Gdda906). Target is converted strictly to string at
Gdda8fa. Numeric fields use32-bit conversion. Rows become a rank-keyed map at
model+2f0/2f4/2f8. Wire grammar is:

    card_sell_profit: [{rank, profit_type, profit_target, profit_qty}, ...]

FindCardSellProfit Gde5220 selects its rank argument from this map, returning
an original reward struct. Missing rank returns a zero-filled struct at
Gde5252..Gde5262. That is a native UI fallback, not a reconstructed sale policy.

CSRPopUpCardSell.SetCardList Gb993c0 uses CardInfoContainer.FindCardInfo at
Gb9946a, then reads reference+44 at Gb9947a and invokes FindCardSellProfit at
Gb9947e. Reference+44 is GetMinRank (minimum published stat rank), corroborated
by original GetMinRank G87b302 and existing training-source whitelist evidence.
It is NOT the current owned star grade or recruitment birth-rarity guess.
Reward type2 contributes to one display total at Gb99496; type5 contributes to
the other at Gb99488. These are gold versus item profits in the sale grammar.
An entire bounded ELF direct BL-target scan found zero calls to original
CSRUserLV.GetCardSellPrice G10a0ecc and one FindCardSellProfit call (Gb9947e).
Consequently the existing GetLevel sell_price0 fixtures are not permission to
remove hunters for0 gold, even though native missing-profit UI also shows0.

Original request/receipt shapes are independently retained in DataDump
findings/hunters/base-stats-visual-hunt/grouprankup-sellcard-bodies-2026-10-05.md.
RequestSellCard Gf8df98 sends inst_id_list as a JSON array of NUMBERS dumped to
one form string, route /shop/SellCard. ParseSellCard Gf8ed98 takes the captured
request vector, updates ret_data.user.gold.cur, credits ret_data.item[] rows
{inst_id,ref_id,added}, then removes each captured hunter. Its wrapper Gf905c4
gets result code at Gf905e4, compares1 at Gf905ea, and ONLY calls ParseSellCard
Gf905f4 on success. Thus non-success is a real native refusal and does not erase
client-side hunters. No invented response removed-list field is needed.

## Implemented planning and remaining activation seam

cardSellProfitRows validates row domains/duplicate rank keys; no default rows.
planHunterSale requires exact inst_id_list, real owned unlocked hunters,
protected commitments, resolved published reference minimum rank, an explicit
profit row for EVERY selected hunter, and known item identities for type5.
It aggregates gold/items, preserves existing item IDs/locks, allocates new item
IDs monotonically, and emits native absolute gold plus item ADDED quantities.
Inputs never mutate. Unknown rows/items, malformed batches, roster conflicts,
carried Mirage HP and wallet/item/allocation overflow refuse the whole batch.

Tests use clearly named AUTHORED_COIN and synthetic profit values only to verify
arithmetic/grammar; those do not become original or configured game rewards.
They prove rank5-owned/reference-min1 selects the rank1 row, mixed gold/item
receipts, reused/new item identities, unchanged input, absent-row refusal,
unknown item refusal, locks/commitments, duplicate/foreign sources and overflow.
npx tsx tests/hunter-sale.ts and npm run build passed.

Root's later seam: publish only validated evidence-backed card_sell_profit
through GetExtra; resolve minimum from published stat rows; protect leader/all
decks/active campaign/search/arena/Mirage entries; apply selected removals and
reward plan atomically with persistence rollback. Preserve card-book history and
hunter allocator; never replace selected hunters or fabricate Chu-Coin IDs.
Until actual profit rows are available, /shop/SellCard should be explicitly
refused rather than remain a generic successful mock. Native UI validation is
pending, and no claim of a complete hunter-release economy is made.

## Equipment and Overcome: exact missing dependencies

RequestEquipLevelUp Gf59380 sends inst_id/part/price_type and exact unslashed
card_handler/LevelUpEquipment (ADD Gf5970e). RequestEquipRankUp Gf5a0bc sends
inst_id/part/price_type/source_inst_ids and card_handler/RankUpEquipment
(Gf5a452). These are distinct from Gym level/rank helpers. Dedicated native
CSRRefData.SetEquipLevelUpPrice Gddc584 and SetEquipRankUpPrice Gddcc20 own
separate price tables; current ordinary Hunter equipment references are[].
Original equipment stat curves, prices/material requirements and selected
payment-type grammar remain absent. Ordinary Gym100/1000 prices cannot be
reused merely because the actions share level/rank words.

RequestOvercome Gf577b0 sends target_inst_id and src_inst_id_list to
/gym/Overcome. ReqOvercomeCB Gf57f98 reads user.gold.cur, user.deck,
ret_data.target.inst_id/overcome_cnt (scalar), removed_card and removed_item.
CSRTableCardOvercome.SetRequiredGold Gfe1140 reads CSRAwake.GetOvercomeSrc
G861980 using rank and next overcome count; the returned row's+10 is the gold
shown (Gfe1194). This is a separate Overcome source/price row, not Gym training
prices. Exact required sources/price/effect rows and original ticket identities
remain unrecovered. No undocumented retuning, guessed tickets or fake equipped
stat improvement was introduced.
