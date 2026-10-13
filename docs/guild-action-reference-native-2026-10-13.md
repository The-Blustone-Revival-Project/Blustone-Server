# Guild action price reference: route and change-action consumers closed

The exact reference route is `/reference/GetGuildPrices`. New original-byte
proof binds that route to ReqGuildPriceForActionCB, and binds action2/3 to
Guild name/country changes. These references and UI quotes do not authorize
creation or modification. Original numeric prices and server debit policies
remain unknown; no fees, membership, live state or APK were changed.

## Exact route/callback binding

Immutable final ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra addresses below subtract0x10000 for code ELF offsets. Writable-data
addresses use actual PT_LOAD mapping; GOT virtual addresses have an additional
0x1000 file-offset difference in this segment.

CSRSyncRef constructor Gf80768 creates its URI map. At Gf818fc it assigns
enum`0x21`, stores that key at Gf818fe, and sets the same node's string at
Gf81932/Gf81934/Gf8193c. Its PC-relative literal resolves to
ELF`0x1d8016c`, exact `/reference/GetGuildPrices`.

CSRSyncRef.Init Gf81ebc selects callback pointer at Gf82702/Gf8270a/Gf8270e.
The literal/add resolves GOT VA`0x21aed08`, file`0x21add08`; the original cell
contains ELF Thumb address`0xf74f6d`, ReqGuildPriceForActionCB Gf84f6c.
It assigns request enum`0x21` at Gf82716 and calls RequestByNlohmnJson at
Gf8271a. Matching the enum closes route-to-callback assignment; the route
string and nearby callback symbol alone were not sufficient proof.

The existing callback proof is unchanged: success1 selects envelope.ret_data
at Gf84f8a/Gf84f8c and tail-calls ParsePriceByActionRef at Gf84f98.
Thus an authenticated canonical reference response is
`{result_code:1,ret_data:[{action,price_type,price},...]}`. The parser is given
the selected rows, not another nested ret_data object. Strict canonical array
publication and duplicate rejection are replica policy. Empty[] is missing
price data, never a zero-price action grant.

The constructor also names separate GetGuildContributionReward,
GetGuildContributionPoints, GetGuildLevelBenefits and GetGuildLevelBenefitsStr
routes. Their adjacent existence does not establish their schemas or values.
This unit does not publish guessed settings, contribution thresholds or benefits.

## Action2 changes name; action3 changes country

Earlier SetCommon Gfcde6c proof recovers FindPrice calls1/2/3 and cached records
at tab+930/+93c/+948 respectively. The first word of each PRICE is its amount.
New setter links:

- SetGuildName Gfcd534 compares original/edited name state and writes changed
  flag tab+956 at Gfcd640, then calls UpdateChangePrice at Gfcd646.
- SetCountry Gfcd6c4 compares original/edited country state and writes changed
  flag tab+957 at Gfcd89e, then calls UpdateChangePrice at Gfcd8a4.
- GetChangePrice Gfd02fc loads cached amount+93c only when+956 is nonzero,
  loads amount+948 only when+957 is nonzero, and adds them at Gfd0318.

Therefore action2 is name-change pricing and action3 country-change pricing.
Action3 must not be renamed emblem-change merely because an icon picker exists
nearby. No price for emblem/description/join-mode changes is inferred.

UpdateChangePrice Gfd031c uses the same flags and amounts, sums them at
Gfd0382 and formats the result for UI text. The native ADD is32-bit; no
original amount values or separate rounding rule were recovered. The strict
quote helper uses the already supported nonnegative signed32 amount rows;
the sum of these two amounts fits uint32 without wrapping.

## Modification uses total-Manda affordability; creation still uses gold

The management-button path duplicates this conditional sum at
Gfcf3f0–Gfcf40a. It calls CPVDataMgr.get at Gfcf40c, loads both wallet words
at CPVDataMgr+9c/+a0 at Gfcf410, adds them at Gfcf416, then compares the changed
action sum at Gfcf418. These are the paid/free Manda words independently
identified in the original ShopFuel payment consumer. This closes the
modification UI's TOTAL-MANDA affordability gate, distinct from the earlier
creation action1 comparison against PlayData.gold.

The supported helper `guildModificationPrice` takes explicit boolean name and
country change flags, returns their detached configured rows and client Manda
gate, and keeps settlement_wallet:`unrecovered`. It does not enforce a guessed
price_type enum or select a paid/free debit order. A missing changed-action
row yields undefined. Neither a supplied zero row nor no changed fields
authorizes a free Modify request, permissions, or durable server settlement.

## Verification

`npx tsx tests/guild-modification-prices.ts` and existing guild-prices tests pass,
as does isolated strict TypeScript checking and `git diff --check`. Tests use
authored amounts and cover name-only/country-only/both, immutable detached
quotes, missing versus explicit zero, duplicate/malformed refusal and the
unrecovered settlement boundary. No shared state/routes were edited.
