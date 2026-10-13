# Fishing sale UI: general-item seed, grade-count selection and raw total

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code convention ELF+0x10000. Direct original instruction/TBB inspection;
DataDump read-only, Server document only; no game grants/inputs/transactions.

## Positive general-item dependency and original fish use_type17

CSRTableShopSell.SetTab G1046fa0 obtains CSRInventory.GetItemList at
G1047032. It walks those GENERAL owned-item records, resolves their ref_id
through CSRItemInfo.GetItemData G1047172, and skips general quantity0 at
G1047178..17c. It selects INFO.use_type+4 G10471bc, subtracts3 G10471c0 and
uses TBB at G10471c6. The exact original jump-table byte index14 (=17−3)
targets G1047260. That branch requires Fish tab1 G1047262..64 and invokes
PushFish G104726c.

This positively binds original GetItem.use_type17 to the fish sale row
producer, rather than guessing from the popup's later discriminator. The
original final-client loop needs BOTH a nonzero general item record for that
fish ref AND the separate Fishing inventory count row. A read-only neutral
use_type0 catalogue does not create those sale rows. Do not claim native Shop
sale activation from count-only owned_fish or pool/price metadata.

This closes an enum consumer but not the original fish metadata contents,
general owned stack allocator, acquisition or how general quantity relates
to the three grade totals. Publishing a use_type17 reference alone still
does not supply a genuine owned item seed.

## Sale row quantity comes from separate Fishing grade counts

PushFish G10480d0 resolves the exact fish string via Fishing.GetInvenInfo
G104816a. It reads count payload word0 G1048176; when positive it overwrites
the temporary SELL_INFO quantity G1048182 with that bronze count, sets
grade1 G1048184..86, calls GetFishPriceByGrade G1048190 and stores its returned
price G1048196. Zero quote suppresses this row G1048198: a configured zero
price is valid read data but does not prove a visible sale control.

The silver path reads count+4 G104828e and sets temporary grade2 G1048298..9a;
gold reads count+8 G10483a6 and sets grade3 G10483b0..b2. Their quote calls
occur G10482a6/G10483be. These two branches visibly load the incoming
ITEM_INFO+2c for the quote argument rather than the just-written temporary
grade field. That quirk must not be rewritten into a claimed original backend
quote law or silently described as tested UI parity. GetFishPriceByGrade's
independent exact1/2/3 mapping is the recovered authoritative lookup seam.

Thus the selected available quantity is grade-specific aggregate count,
not the original general-item stack quantity. General inventory remains the
outer seed/filter, not proof that its quantity equals sum(b_cnt,s_cnt,g_cnt).

## Popup limits and arithmetic carry that SELL_INFO through unchanged

CSRPopUpShopSell.SetItemInfo Gd540ca copies SELL_INFO scalar bytes into
popup+b8 Gd540dc..ec, then copies its quote/grade fields into popup+dc/+e4
Gd5410a..14. Its fish string is stored at popup+d0. Init reads copied
quantity popup+b8 Gd53600 and stores slider maximum popup+ac Gd53606.
Slider initialization Gd53840..4c passes min0, that maximum, step1.
OnButtonClick requires selected quantity popup+b0>=1 Gd53eee..ef4.

UpdateSlideBar reads the selected value Gd53bec and stores popup+b0
Gd53bf8. It loads that quantity Gd53c9c and unit price popup+e0
Gd53ca2, performs plain32-bit MUL Gd53caa, then formats/displays that result
Gd53cae/Gd53cb8. No Guild fee/proceeds transformation or random catch
calculation intervenes in this bounded total path. Overflow wraps in the
native display; a replica may retain explicit overflow refusal.

Final fishing request branch compares copied item type popup+ec to17
Gd53ef6..f00, loads selected qty+b0 Gd53f0c, grade+e4 Gd53f12 and fish
string+d0 Gd53efa/Gd53f2c, then calls RequestSell Gd53f32. Wire is the
already recovered fish_id/grade/qty request; no general stack ID is supplied.

## item-removal receipt remains a distinct producer responsibility

ParseSell accepts absent/empty item collection and performs no RemoveItem
calls in that case; no receiver assertion makes an item removal mandatory.
Positive item rows instead invoke RemoveItem(uint64,REMOVAL_DELTA), independently
of the absolute sell_result grade-count replacement. Therefore it is incorrect
to claim client parsing requires nonempty sale.item for every fish sale.

It is equally incorrect to infer the original server always omitted it.
The actual UI dependency above proves general item state can coexist with
aggregate fish state. An original or explicitly imported general inventory
relationship needs coherent authoritative settlement; dropping its removal
semantics from an alleged complete original sale would be unjustified.
No source here establishes general quantity=sum(all grades), which stacks
to consume, original zero-stack removal policy or nonce-free retry law.

An explicitly local aggregate-only API sale can be considered separately from
native Shop UI and original general-item parity, provided no unrelated general
stack is silently modified, authoritative counts/quotes/wallets settle atomically,
and repeated nonce-free requests remain honestly distinguished from retries.
That design would be local policy, not an original fish acquisition/RNG/grant.
This evidence lane implements no transaction and makes no native pixel claim.
