# Dorm capacity, native purchase contract and local price policy

The server can now persist paid dorm expansions and use the same capacity for
premium recruitment and trace recruitment, including the guided trace exchange.
This restores a missing mechanic without lowering existing100-slot fixtures to
match an older screenshot. Android popup validation remains pending. All checks
use disposable accounts; no live save, client, APK or original resource changed.

## What the recovered data establishes

The [image notes](dorm-expansion-image-quotes-2026-10-16.md) preserve8 exact rows
from6 source files. The evidence JSON is
`resources/reference/dorm-expansion-screen-quotes.json`, SHA256
`5b463282280450b47dca1edc375a23fe8b68773b1cde99f89b37a1b9c2306104`.
Two undated popup observations show51→54 for12800 Rupees/3 Manda, and60→63
for50000 Rupees/3 Manda. A dated publisher screenshot identifies v1.0.7.0's
maximum change57→72. These do not establish initial capacity, a final-version
maximum, a universal3-Manda price, or ANY price at capacity100. The implementation
uses explicit local prices rather than extrapolating these historical offers.

Native addresses refer to the immutable final native ELF with SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`:

- CreateCardInvenExtendGb8dd04 selects GetItemRefID(use_type9) atGb8dd22/24.
  The original item ID is not recovered. LOCAL `local_dorm_expansion` supplies
  one use_type9 row; effect"3" is the explicitly generalized local increment.
- SetCardInvenExtendGb8de54 reads PlayData.card_inven_max at+158 (Gb8de7e).
  Gb8dfca..dfd8 converts item.effect with atoi; Gb8dfe2/4 previews current+effect.
  It is not an absolute replacement with the item's effect value.
- Gold actionGb8d64e sends price_type2/item_inst_id0/qty1 to the selected
  popup+d8 reference. Manda confirmationGb8e8ba sends1/0/1. Both use the existing
  `/shop/BuyGlobalItem` request. No separate Extend endpoint or coupon path is
  invented. The popup has no identified coupon instance dereference.
- Shared ReqBuyGlobalItemCBGf8b4a8 reads user.card_inven_max.cur atGf8b940..9d4
  and stores PlayData+158 atGf8b9d6. Manda updates scalar user.iap balances;
  gold updates user.gold.cur. target_inst supplies item_id/price_type and the
  paid currency's buy_cnt prev/cur. CardInvenExtendCBGb8dc2c refreshes the preview
  atGb8dc4e on success1, with no additional capacity-specific DTO.
- The global.type2 price selector uses combined purchase counts. The local
  ladder publishes Manda and Rupee prices at each combined tier, with separate
  lifetime currency counters and an inert zero coupon counter. Counter reset
  policy and original ladder/max remain unknown; lifetime/no-reset is LOCAL.
- GetCardInvenCntGaebbe2 loads full inventory map size at+7c. AddCardGae9238
  always reaches full-ID map insertionGaedc1c viaGae9470 (inventory+70), including
  the IsTrainingCardGae92fc branch. Training cards skip book/new-card-event work,
  then joinGae9386 before full insertion. All owned cards consume capacity.

## Configuration

Expansion is disabled by default. Enabling it requires a complete price ladder:

```text
BLUSTONE_DORM_EXPANSION_MODE=local-priced
BLUSTONE_DORM_EXPANSION_PRICES_JSON=[{"capacity":100,"gold":50000,"manda":3},{"capacity":103,"gold":60000,"manda":4}]
```

These are EXAMPLE LOCAL PRICES, not recovered prices at100/103. Each entry
prices the transition from its capacity to capacity+3. Supply1..100 contiguous
tiers beginning at100 with positive integer gold/Manda prices. Global buy_limit
is the number of supplied tiers; global.type2 indexes the combined purchase
number. Missing tiers and exhausted ladders refuse without payment. The example
thus buys100→103→106. No expansion item, Hunter, currency or coupon is issued
at startup, and no original item ID or thumbnail mapping is claimed.

Captured capacity survives disabling expansion or shortening/changing the
configured price ladder. The server never erases Hunters to fit a cap. Existing
oversized rosters remain owned but cannot recruit more until enough slots are
free. No unstated capacity increase is granted to accommodate them.

## Persistence and recruitment consistency

The first paid expansion records game.dorm_expansion={capacity,manda,gold}.
Capacity must equal100+3*(manda+gold), with at least one recorded purchase.
Lobby, the shop receipt, premium recruitment and trace exchange read this same
capacity. Absent history retains the existing LOCAL100 slots. Captured history
promotes the save to schema10;10 requires actual history and dispatch/quest
arrays. Schemas1..9 carrying the new field refuse before normalization. The
other feature journals/counters remain supported, including resource-shop9,
Rupee8, profile7, bait6, comments5 and linear quests4. Restoring an account is
not a purchase and does not rewrite capacity or create history.

Purchase planning uses a detached counter. Wallet and capacity commit together;
write/rename failures restore exact balances, counter reference and prior field
absence. The expansion path uses the already loaded owned game directly, so it
does not incidentally settle energy or touch battle/roster state. Repeated funded
requests buy subsequent configured tiers; no native nonce or exactly-once
transport guarantee was recovered.

Premium recruitment previously lacked the trace path's capacity check. It now
requires enough space for the whole draw before spending Manda or allocating
IDs. At-capacity refusal uses the existing local cnt0/cardnull no-op receipt;
the specific native UI reaction to a server10027 gacha error is unproven. Trace
exchange keeps its existing10027 refusal. A failed premium recruitment save
also restores both Manda pools, allocator, card tail and original book reference.
Existing lazy resource recovery before recruitment remains a separate boundary.

Current implemented Hunter producers are premium recruitment and trace exchange;
the guided tutorial recruits through the latter. Search drops traces rather
than owned Hunters. Training, sales and advancement consume/update owned cards.
Future direct Hunter rewards must use the same capacity admission policy.

## Verification

`npm test` includes pure policy and state integration checks. `npm run
test:dorm-expansion` builds and runs compiled state plus encrypted HTTP checks.
Coverage includes Manda/free-first and Rupee purchases, combined tiers,
capacity/receipt/lobby coherence, atomic write and real rename failures before
and after first history, mode-off persistence, oversized roster preservation,
whole-bundle refusal, trace and gacha admission above100, numeric/forged requests,
schema downgrade refusal and restart. The state fixture retains resource9,
Rupee and profile data across promotion to10. Independent compiled HTTP runs on
an ephemeral loopback port with authored prices and a disposable peer; it checks
the actual P384/HMAC/AES transport and persisted key/OTP across process restart.
See AGENTS.md for completed check results and pending live/native work.
