# Equipment level fee: native no-Guild path and payment selection

Offline original ARM evidence, SHA-256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`. Addresses below are ELF; add `0x10000` for Ghidra coordinates. No Guild was created, no membership/benefit/price was invented, and no runtime, save or APK was changed.

## Concrete safe branch

For an account with authoritative Guild `guild_id:0`, the equipment level-up fee is the exact configured next-level quote's integer price. **No discount, float conversion or rounding occurs.** The equipment popup requests `price_type:2`, and its funds check reads the gold wallet. This closes a source-backed no-Guild gold path without implementing Guild membership or benefit qualification.

`src/equipment-fee.ts` provides `noGuildEquipmentLevelFee({price_type,price}, guildId)`. It accepts only GuildID0 and the recovered popup payment type2. A nonzero/unknown Guild identity or another payment type refuses; it does not borrow a discount or infer another currency. The caller still needs authenticated ownership, valid equipment stat/reference rows, legal level/rank progression, exact configured price/material data and atomic settlement. This helper alone does not grant or upgrade equipment.

## Qualification: the exact early-out and remaining Guild scope

`CSRGuild::FindBonusBenefit` ELF `a6fb80` gets the Guild singleton through `a728ec`. At `a6fbd2` it reads singleton `+0x9c`; at `a6fbd8`, zero branches to `a6fcb6`, writing a null result pair and returning. `CSRGuild::GetMyGuildPlayData` at `a57eb4` returns `this+0x9c`; the original ParseMyInfo/PLAY_DATA parser identifies its first field as `guild_id` (see [Guild lobby audit](guild-lobby-native-2026-10-11.md)). Thus no-Guild benefit absence is explicit native control flow, not an assumed absent-row fallback.

For nonzero GuildID, the routine looks up that ID in the Guild info cache rooted `+0x118/+0x11c`. On a cache hit, it calls `CalcLevel` (`a6f9e8`) and `GetGuildLevelRef` (`a6fe00`), then searches that level reference's benefit map for the requested BENEFIT::TYPE. Missing cached Guild info or missing benefit returns null. The bounded routine does not add the status3/leader-role checks used by IsInvitable; those permissions must not be transferred to this consumer. Complete Guild level/benefit rows and their original magnitudes remain outside the no-Guild workflow. No Guild benefit is configured by the new helper.

## Exact CalcBonusSaleValue arithmetic

The equipment popup looks up CURRENT level+1 at `bc691c..bc6920`, loads its quote and calls Guild.CalcBonusSaleValue with **BENEFIT::TYPE1** at `bc6952..bc6954`. It stores the returned fee at popup `+0x66c` (`bc6960`). Material requirements are copied separately; this call does not discount their quantities.

`CalcBonusSaleValue` ELF `a6ff08` preserves the input price in r4 and calls FindBonusBenefit at `a6ff16`. If the selected benefit pointer is null, `a6ff1c` branches directly to cleanup and returns r4 (`a6ff7a`). This preserves all UInt32 integers exactly, including values above binary32's exact-integer range.

For a selected benefit, the uint32 value is at benefit+0; its mode byte is at+4. Mode1 takes these exact instructions:

1. `VCVT.F32.U32(value)` (`a6ff2e`).
2. Divide by the **1000.0** literal at `a6ff80` (`a6ff32`).
3. Convert input price to float32 (`a6ff3a`).
4. Multiply float32 ratio and float32 price (`a6ff3e`).
5. `VCVT.U32.F32` (`a6ff42`), truncating toward zero and saturating out-of-range positive results.

The expression is therefore `UInt32TruncateSaturate(float32(float32(value)/1000.0) * float32(price))`. Value950 is a 0.95 multiplier; it is not a 950% amount or a subtraction of950 points. Other mode bytes take `ADD r4,r0` at `a6ff4c`, producing UInt32 modular addition. These are arithmetic semantics only; no numeric benefit row or mode-selection eligibility has been invented.

Illustrative **authored** tests: price101/value950 returns95; price101/value500 returns50. A null benefit preserves16777217, while mode1/value1000 converts it to16777216 through float32. Mode1/value1000 on UInt32MAX saturates back to UInt32MAX after float rounding; additive mode0/value2 on UInt32MAX wraps to1. These are native rounding demonstrations, not game prices or actual Guild rewards.

## Payment type: direct requester and wallet proof

The level popup callback at ELF `bcad70..bcad82` first calls CheckSourcesEnough and verifies its operation gate. It loads target identity halves from popup `+0x658/+0x65c`, loads TYPE from `+0x80c`, obtains the SyncCard owner and invokes RequestEquipLevelUp (`f49380`). Immediately before that call:

- `bcaea8`: `MOVS r1,#2`.
- `bcaeaa`: `STRD ip,r1,[sp]` (stack argument0 TYPE, argument1 PRICE_TYPE2).
- `bcaeb2`: `BL f49380`.

RequestEquipLevelUp encodes TYPE+1 (`f4950a..f4950e`) and serializes its price argument from incoming stack `r7+0xc` (`f49522..f4953a`). CheckSourcesEnough (`bc7c54`, corresponding Gbd7c54) compares popup fee `+0x66c` with PlayData gold `+0x154`, then checks required item quantities against inventory. Combined with the request's hardcoded2, this proves **equipment popup PRICE_TYPE2 selects gold**. It does not recover every global PRICE_TYPE enum or license Manda/item payment alternatives for this workflow. A quote configured with another price_type is explicitly unsupported here even if the parser admits its integer grammar.

## Verification

`npx tsx tests/equipment-fee.ts` passes no-Guild identity, type2 admission, invalid/unsupported Guild/payment refusal, float32/truncation/saturation and additive-wrap cases. Test quantities are explicitly authored.

Independent `tests/equipment-fee-native.py` pins the entire immutable original library SHA and executes the actual `CalcBonusSaleValue` Thumb/VFP body in Unicorn for12 cases. Only FindBonusBenefit is stubbed to return the selected/null benefit; its eligibility is proved by the separately inspected original branch, not claimed as executed by this test. All12 native outputs match the helper's expectations. No library bytes are written on disk. Native popup execution and server transaction settlement remain unverified.
