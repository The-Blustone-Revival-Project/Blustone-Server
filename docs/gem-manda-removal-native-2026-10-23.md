# Gem removal with supplied Manda quotes

The original confirmation supports price_type1/Manda as a separate payment
choice. The local server can apply explicit supplied type1 old-level fees
without inventing a fee table or changing Gem ownership rules. Spending free
Manda before paid Manda is an explicit LOCAL settlement choice; the original
client proves only a combined-funds check and absolute wallet synchronization.
No native Manda removal or original numeric price is claimed here.

All native evidence uses original ARM ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are retained Ghidra coordinates, code ELF offsets plus0x10000.
Original bytes and DataDump sources were read only; no native getter, UI,
private save, APK, runtime configuration or live process was changed.

## Quote, funds and selected payment

CSRPopUpEquipGemConfirm.SetGemInfo Gbc8b70 compares the complete BEFORE/AFTER
six-cell grids. Each changed OLD occupied cell uses its OLD Gem level at
Gbc9076. FindGemDisassemblePrice receives type1 at Gbc90a2; the raw quote
accumulates into popup+0xa0 at Gbc90ae/Gbc90b0. Type2 independently uses
popup+0x9c. Empty-before and unchanged cells contribute no removal fee.
Missing lookup sentinel9/0/0 is unavailable data, not a free fee.

In OnButtonClick Gbc80e8, literal BT_BUY_MD is resolved at Gbc8594.
The accepted button branch calls CPVDataMgr.get at Gbc85ac, then:

- Gbc85b0 LDRD reads its two32-bit Manda components at +0x9c/+0xa0.
- Gbc85b8 adds them with a32-bit ADD; overflow would wrap.
- Gbc85b4 loads the cached type1 fee; Gbc85ba compares that fee with
  the summed balance, and **SIGNED BLE** at Gbc85bc admits sufficient funds.
- The success branch closes the popup at Gbc863e, reloads its same cached
  fee at Gbc8640, sets payment1 at Gbc8658, and dispatches the event through
  Gbc88d6. Insufficient funds instead opens the native no-money popup.

The local type1 planner therefore requires nonnegative signed32 components,
combined balance and fee, refusing native wrap/sign-boundary ambiguity. The gold branch likewise loads cached fee at Gbc8606 and gold at Gbc8612,
compares at Gbc8616 and uses signed BLE at Gbc8618. The selected gold
balance and either currency fee are therefore bounded to nonnegative signed32. Quote amounts are recomputed from supplied
rows; no client-supplied fee is trusted. The raw quote/funds chain supplies no
paid-versus-free spending priority and no Guild multiplier.

## Payment survives the callback and form serialization

The confirmation listener Ge15364 loads the selected enum from its first
reference argument into r5 at Ge1537e. Ge153ac places the AFTER map and
that same payment on the caller stack; Ge153b4 calls RequestGemEquip Ga557cc.
The listener does not replace payment1 with gold2 or send the displayed fee as
a trusted cost.

RequestGemEquip reads the payment argument from [r7+0xc] at Ga55c44,
converts it to a decimal string at Ga55c5c, and pairs it with literal
price_type at Ga55c60/Ga55c62. Ga55c8c builds the eight form pairs:
app_code/app_ver/market/pvid/otp, target_inst_id, combination and price_type.
The route literal card_handler/EquipGem is selected at Ga55e0c. Combination
is the JSON string containing weapons/armors/accessories, each with the exact
two ordered IDs and zero placeholders; existing identity/slot rules remain.

## Authoritative callback wallets are plain user scalars

The RequestGemEquip continuation checks result1 at Ga62276/Ga62278 and
calls ParseGemEquip at Ga62284 with its captured target and full response.
ParseGemEquip Ga5c9ec obtains ret_data.user at Ga5ca3a/Ga5ca40.

- user.iap_qty lookup uses Ga5cc2a/Ga5cc46 and stores the converted32-bit
  absolute value to CPVDataMgr+0x9c at Ga5cc9a.
- user.free_iap_qty uses Ga5ccea/Ga5cd08 and stores its absolute value
  to CPVDataMgr+0xa0 at Ga5cd9c.
- user.gold.cur and user.gdp.cur keep their existing absolute consumers.
  user.item quantities use SetItemQuantity Gaec4bc at Ga5cf0c.

These are **user.iap_qty and user.free_iap_qty**, not a nested user.iap
object or debit deltas. The server returns both actual post-settlement values
alongside unchanged gold, existing GDP0 policy and empty item updates. Full
authoritative owned Gem rows remain necessary: ParseGemEquip updates existing
instances from complete rows and does not award newly invented instances.

## Local implementation and verification limits

The paid planner opts into parsing payment1 and selects matching type1 quotes;
the free-only parser retains its default gold2 admission. Free-first allocation
changes only the selected Manda components. The existing target/part/position,
unique full64 Gem identity, rank3 second-slot, active/Mirage and cross-Hunter
guards remain. Type4 stays refused. Persistence rolls back owned Gem array,
gold and both Manda components on failure.

The new encrypted HTTP regression uses the existing Gem profile with disposable
authored references/ownership and supplied fees7+11. It verifies numeric full64
IDs, a type1 form/grid, refusal when only type2 quotes exist, free5+paid13 spent
from a5/20 wallet, unchanged gold/accounts/peer, plain absolute wallet scalars,
complete inventory, type4 refusal, lost-response no-charge replay and a cold app
restart. Tests ran on an ephemeral loopback server with P384/HMAC/AES; supplied
amounts and outcomes are not original prices or native interaction proof.

Run `npm run test:gem-manda-removal` for the compiled dataset, pure, state, encrypted HTTP and existing gold-path regressions. `npm test` passed237 separate test programs through scripts/test.mjs. Its curated tests/suite.json preserves all234 previous entries in exact order and adds3 Manda/data checks; the new HTTP check is included in the focused command. This runner replaces only the overlong Windows shell chain.
