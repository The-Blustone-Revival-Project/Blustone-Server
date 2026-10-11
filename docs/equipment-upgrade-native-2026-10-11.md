# Equipment upgrade request/receipt contract, transaction still gated

Bounded original-byte audit. `equipment-upgrade-request.ts` only decodes the
native request grammar; it does not authorize any upgrade or charge. Sources
remain read-only DataDump, same original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra coordinates subtract0x10000 for code ELF offsets. ELF writable data
segment has an additional0x1000 offset delta: vtable reads must map PT_LOAD,
not blindly subtract0x10000. Original symbol locator is
`sources/native/symbols/native-evidence.tsv`.

## Requests

- CSRSyncCard.RequestEquipLevelUp Gf59380 posts
  `card_handler/LevelUpEquipment` (literal G1d8f7eb, PC-addGf5970e).
  Fields include inst_id, part, price_type, app_code/app_ver/market/pvid/otp.
- RequestEquipRankUp Gf5a0bc posts `card_handler/RankUpEquipment`
  (G1d8f819, PC-addGf5a452), adding source_inst_ids.

Inst_id uses uint64 to_string. TYPE is encoded as TYPE+1, then integer
to_string (Gf5950a/0e and Gf5a216/21a). Wire part1/2/3 therefore means
weapon/armor/accessory. Price_type is integer to_string; complete enum and
accepted server currency choices are unclosed. Source vector is uint64
elements, dumped by JSON.dump G71f754 at Gf5a278 and put into the FORM value
source_inst_ids at Gf5a27e. Empty vectors remain JSON type0/null and dump
`"null"`; nonempty vectors become arrays. It is not a comma-separated scalar or single
source field. Rank request removes remembered skill selections for selected
sources before dispatch (Gf5a12c); that client housekeeping is not successful
server consumption evidence.

Decoder's strict uint64/part/signed32 checks, distinct-source/target rules,
already-decoded-array admission and refusal of rounded unsafe JS numbers are
replica policy. Native source count/eligibility comes from other consumers;
empty vectors normalize native null to[] and are not automatically invalid.
The final popup specifically submits no Hunters. Caller must authenticate and
resolve target/sources in one account.

## Receipts and mutations

The TASK_READY response functions are level Gf5bbb8 and rank Gf5c63c.
Their vtables are G218c8dc and the adjacent rank task family; level request
constructs task vtable at Gf59896. On response result_code1 they use captured
parsed envelope.ret_data; failures skip settlement.

- ret_data.user.gold.cur is an ABSOLUTE wallet value, stored directly in
  CSRPlayData+154 (level Gf5bc6a, rank Gf5c6fc). It is not amount spent or added.
- ret_data.user.item is iterated; entries inst_id/qty call
  CSRInventory.SetItemQuantity Gaec4bc (Gf5bdde/Gf5c866). Qty is ABSOLUTE.
- ret_data.user.card entries pass to CSRPlayData.ParseCardInst Gb69598
  (Gf5bf1e/Gf5c9aa). Their six flat equipment rank/level fields yield TYPE-keyed
  map entries, then CSRInventory.SetEquipRankLevel Gaeac1c receives absolute
  target rank/level for each entry (Gf5bf68/Gf5c9f4). This is neither an EXP
  receipt nor a +1 scalar. Canonical production container shape of card/item
  arrays versus objects remains unclosed; native iteration supports both.
- Rank callback iterates the captured original source vector JSON at closure+30
  and calls RemoveCard Gaebc44 with uint64 serial and flag1 at Gf5cbbc. The
  capture chain is closed in the source/capture follow-up note. Empty/null
  values skip removal. Do not fabricate a consumed_inst_list receipt key.
- Both pass ret_data to Achieve.ParseLobbyEnter and independently consume
  achievement via ParseAchievementsElement. These are genuine side channels,
  not sufficient justification to grant missing achievements.

## Native eligibility/pricing evidence and remaining gate

Popup.UpdateEnhancePrice Gbd65a8 stops regular enhancement presentation above
level49 (Gbd6686–8a), and chooses rank-up when level>=rank*10
(Gbd668e–9a). This proves client branch behavior, not final server eligibility,
maximum rank or legal over-cap progression.

Rank prices are selected for CURRENT rank+1 and Hunter attribute via
FindEquipRankUpPrice Gddd130 at Gbd6748. Level prices select CURRENT level+1
via FindEquipLevelUpPrice Gddd0c0 at Gbd6920. Level fee passes through
Guild.CalcBonusSaleValue with BENEFIT::TYPE1 at Gbd6954, so blindly charging
the undiscounted table price would omit an original consumer.

CheckSourcesEnough Gbd7c54 compares popup stored price+66c against actual
PlayData.gold+154 (Gbd7c7a–80), then checks every required material reference
against Inventory.GetInstItemCnt Gaeca80 and required quantities
(Gbd7cee/Gbd7d22). Gold/material insufficiency refuses the UI action. It
does not itself close source-Hunter grade/role/deck locks or server wallet
currency validation. Needed next: Guild discount formula/qualification and
original price/material rows. The final popup's empty sources and rank/level
preview are closed in the follow-up note; legal server transition policy remains
distinct. No safe full
transaction planner is claimed until those links close. Existing route
refusals must remain; do not charge zero or use ordinary Gym fees.
