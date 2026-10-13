# Gem sale uses raw quotes, independently of Guild polish benefits

Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Direct bounded Thumb disassembly of the original lookup, single/batch popup,
request and receipt; Ghidra code addresses use ELF+0x10000. Read-only originals,
no live game/server/APK actions. Complements gem-configured-sale-2026-10-13.md.

## Exact single sale amount

FindGemSellPrice Ga54ea0 takes Gem manager, rank, level and PRICE_TYPE, with
return storage as a hidden first argument. It loads Gem sale reference vector
at manager+40, iterates16bytes, compares rank+4 Ga54eba/ebe, level+8
Ga54ec2/ec6 and payment+0 Ga54eca/ece. First complete match is copied RAW as
16bytes Ga54ed2..ed6. Miss copies sentinel type9/rank0/level0/price0.
There is no Guild lookup, member status check or benefit calculation here.

CSRPopUpLotteryGemSell.SetGem Gce7340 obtains Gem singleton Gce755a,
loads actual PLAY_DATA rank/level from+18/+1c at Gce7564, puts PRICE_TYPE2
on stack at Gce7568/56a, and calls FindGemSellPrice at Gce756e. Returned
price+12 resides stack34; Gce7588 loads it, Gce758c directly formats it, and
Gce7596 displays TXT_PRICE2. No multiplier/additive adjustment intervenes.
The bounded complete SetGem function contains no CSRGuild or benefit call.

Single OnButtonClick Gce7134 checks the sale button, creates a singleton
owned-instance list and calls RequestGemSell Gce71ee. There is no Guild ID,
membership/newbie/role admission or progression-reference gate in this handler.

## Exact batch total

CSRPopUpLotteryGemSellAll.SetGem Gce7eac accepts a map<uint64,PLAY_DATA>.
For every selected row it loads rank/level from map-node+30/+34
Gce7ee2 (PLAY_DATA+18/+1c), passes payment2 Gce7ee8/eea, and calls the SAME
FindGemSellPrice Gce7eee. The raw price at return-storage+12 is loaded into
fp Gce7ef4. The accumulator initializes0 Gce7ed6 and performs plain
32-bit ADD r4,fp Gce7f00 once per selected Gem. It simultaneously appends
that Gem's two-word instance ID Gce7f02..f0a to the captured sale list.
Final total is formatted Gce7f7a/7c and displayed TX_PRICE Gce7f86.
There is no Guild branch or adjustment anywhere in this bounded batch function.
Batch OnButtonClick Gce7d04 forwards that list to RequestGemSell Gce7d8e,
again without any Guild status gate.

The original batch preview sum wraps modulo2^32 if excessive quotes are
supplied. The replica should retain its explicit overflow refusal and signed32
wallet cap; matching source lookup/sum does not require reproducing unsafe
wrapped or negative wallet behavior. This is a conservative local admission.

## Receipt and policy implication

The actual sale RequestGemSell/ParseGemSell grammar remains as documented:
scalar inst_id or JSON-array form-string inst_id_list; absolute user.gold.cur
and user.item quantities; deletion uses the captured original full ID list.
ParseGemSell Ga5ddd8 reads no Guild field/benefit and directly sets gold+154
at Ga5de76. It does not call generic SyncUser or its Manda scalar consumer.
No partial batch success or invented returned deletion field is justified.

Thus original consumer evidence supports selling an otherwise eligible owned
Gem in joined OR pending Guild context using the SAME explicit raw type2
sale quotes. Guild TYPE2 polish/upgrade fee benefits must NOT be applied to
sale proceeds. Missing or zero-valued Guild benefit tables do not qualify or
change this sale path. Removing the historical blanket Guild refusal closes
an unnecessary restriction; it does not enable unknown original numerical
prices or broader Guild transactions.

Mounted-Gem refusal remains the existing conservative replica admission until
its UI/backend consumer is independently closed. Existing ownership/reference,
uint64 precision, all-or-nothing batch, signed32 wallet/overflow, atomic
persistence and sold-ID replay refusal should remain intact. The lack of Guild
checks in these exact original handlers is not proof of every original remote
server permission or event exception. No UI rendering or production parity is
claimed by this source-only closure.
