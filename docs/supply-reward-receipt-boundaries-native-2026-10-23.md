# Special Supply and Activity Supply: exact receipt and transaction boundaries

Read-only original ARM audit; no live/client/private/save changes. Original
Instrumented `local/legacy-analysis/extracted/lib/armeabi-v7a/libnative_core.so`
was freshly SHA-256 verified as
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code coordinates below equal ELF file offsets plus `0x10000`.

The partial-user/Manda-reset hypothesis is **disproved for these callbacks**.
They use targeted, optional currency branches rather than generic
`CSRPlayData::SyncUser`. Their wire shapes must not be replaced by that different
consumer's scalar-wallet contract. Separately, their existing server settlement
ordering needs failure rollback; native receipt correctness does not make an
in-memory mutation durable.

## Special Supply individual and Collect All share one request

`CSRSyncSupply::RequestSpecialReward` **`Gf96e68`** takes
`vector<unsigned long long>` IDs and sends the normal five authentication
fields plus `id_list` (`Gf970ba`/`Gf970bc`) to **`/supply/SpecialListReward`**
(`Gf971e0`/`Gf971e2`). The request body encodes the selected vector, so individual
and multi-ID collection use the same receiver. IDs are native uint64; the
replica's positive uint32 allocator is a narrower local policy.

Its callback **`CSRSyncSupply::ReqSpecialRewardCB Gf97610`** rejects transport
failure or non-1 HTTP result, parses the decrypted JSON, and requires body
`result_code=1` (`Gf9773c`/`Gf9773e`). It selects `ret_data` at `Gf97742..Gf97748`.
Achievement handling is separate (`Gf97762`, `Gf9776c`).

The user branch is optional:

* `Gf97770..Gf9777e` selects `ret_data.user`; missing/null jumps to `Gf9807e`,
  beyond the user currency branches.
* `Gf97784..Gf97792` selects `user.gold`; missing/null jumps to `Gf978aa`.
* If gold exists, the callback reads `gold.prev` at `Gf977a0..Gf977a4` and
  `gold.cur` at `Gf977fa..Gf977fe`, computes the reward-display difference with
  `SUBS` at `Gf97844`, and stores that difference at `Gf97846`.
* It separately re-reads `gold.cur` at `Gf97850..Gf97860`, converts to uint32,
  and writes absolute PlayData gold `+0x154` at **`Gf978a6`**. Integer JSON
  branches load the low word; floating/string conversions use
  `VCVT.U32.F64` at `Gf97896`. Display difference uses 32-bit subtraction, with
  signed conversions at `Gf977e0`/`Gf97834`; this is not a 64-bit gold balance.

Manda does **not** follow an unguarded root-scalar path here:

* Optional `user.free_iap` is tested at `Gf97a86..Gf97a94`. Missing/null skips to
  `Gf97b4a`; it does not write zero. Present nested `{prev,cur}` is decoded to
  uint32 and its absolute `cur` is stored in CPVDataMgr `+0xa0` at `Gf97b46`.
* Optional `user.iap` is tested at `Gf97b4a..Gf97b58`. Missing/null skips to
  `Gf97c0e`; present nested `{prev,cur}` writes CPVDataMgr `+0x9c` at `Gf97c0a`.
* The complete bounded callback `Gf97610..Gf98cf6` has no direct generic
  `SyncUser` call. Its explicit currency branches supply the positive evidence;
  this is not merely an inference from a missing symbol name.

Therefore a gold-only receipt
`ret_data.user={gold:{prev,cur}}` preserves both cached Manda components in
this callback. Adding `iap_qty`/`free_iap_qty` root scalars is unnecessary for
that hypothesis, and those are not this callback's Manda selectors.

`ret_data.target_inst_id` is selected at `Gf987f4..Gf987f6`. Its IDs identify
the cached Special Supply rows to settle/remove; the callback uses the two-word
ID at `Gf98990` and calls **RemoveSpecialSupply `Gf98994`**. The server's
already-claimed retry can return settled IDs without another currency award;
this audit does not introduce a new additive item/reward replay.

Read-only preserved decompilation and key resolution are in DataDump
`sources/native/economy/ghidra-special-supply.txt` (producer begins line 1435,
callback line 1837) and `ghidra-special-supply-keys.txt`. Exact ARM branches above
were independently decoded from the freshly verified original ELF.

## Activity Supply uses current AP and nested charge time; no prev requirement

`CSRSyncSupply::RequestActivityReward` **`Gf94a0c`** sends auth5 plus string
`id` (`Gf94b5e`/`Gf94b62`) to **`/supply/ActivityReward`**
(`Gf94c6e`/`Gf94c70`). Its callback **`ReqActivityRewardCB Gf9502c`** checks
transport failure at `Gf95050..Gf95052` and native result 1 at
`Gf95058..Gf9505e`, then parses/checks body `result_code` and selects `ret_data`.

Optional `ret_data.user` is tested at `Gf95130..Gf95140`; null skips all user
branches. Its AP branch:

* Tests `user.ap` at **`Gf95300..Gf9530e`**. Null skips to BP.
* Reads **`user.ap.cur`** via `Gf95312..Gf95320`; integer JSON reads one word
  at `Gf95336`, floating conversion is uint32 at `Gf953b8`.
* Reads **`user.ap.ap_charge_time`** via `Gf953c0..Gf953ce`; integer JSON reads
  one word at `Gf953e4`, floating conversion is uint32 at `Gf9540c`.
* Passes current AP as `r1`, charge time as `r2`, zero as `r3` at
  `Gf9541c..Gf95420`, then calls **SyncAP at `Gf95422`**.
* The tiny original `CSRPlayData::SyncAP Gb6c95c` writes `r2` to `+0x160`
  and `r1` to `+0x130` (`Gb6c95c`, `Gb6c960`). Despite its wider C++ timestamp
  argument type, this producer and concrete cache retain only low32 charge time.

There is **no `prev` read in this Activity AP branch**. It differs from generic
SyncUser and from the Special Supply AP reward-display branch. The existing
`user:{ap:{cur,ap_charge_time}}` shape matches this targeted receiver. Move
charge time neither to `user.ap_charge_time` nor to a generic root user scalar.

Activity's Manda branch also has its own optional wrapper. `user.iap` is tested
at `Gf95238..Gf95246`; absent/null skips both writes. If present, its children
are `iap.iap_qty` (`Gf95252..Gf95256`) and `iap.free_iap_qty`
(`Gf952a6..Gf952aa`), with absolute stores to CPVDataMgr `+0x9c`/`+0xa0` at
`Gf952f4`/`Gf952fc`. It likewise does not require generic root wallet scalars.

The callback reads `ret_data.target_inst.id` as string at
`Gf958c2..Gf958de`, `target_inst.status` as uint32 at
`Gf958e2..Gf95932`, and calls **SetActivitySupplyState at `Gf95942`**.
This is the concrete claimed-marker update paired with AP synchronization.

## Actual server issue and narrow repair boundary

At audit time `claimSpecialSupply` increases `game.gold`, marks the selected
fresh rows `claimed=true`, then calls `persist()` without rollback. A failed
temporary write or rename can leave the in-memory wallet/claim flags ahead of
the saved file. `claimActivitySupply` similarly sets the cycle marker and AP
before an unprotected persist; its preceding `gameFor` can also refresh AP/BP
clocks or persist before validation. These are independent of the disproved
Manda-reset hypothesis.

The repair should plan on detached state, preserve the existing Local rewards,
claim IDs/cycle rules and targeted receipt shapes, persist once before success,
and restore original maps/objects/nested references on failure. Activity's
current JS-safe-integer-only capacity check also needs the actual native
uint32 result boundary: preserve authored overflow above max AP **within**
`0..0xffffffff`, rather than permitting a wire balance that the client truncates.
Special Supply already checks the corresponding uint32 gold ceiling.

Tests should exercise real temporary-write and rename failures, retry/restart,
claimed/cycle flags and wallet/clock rollback, peer preservation and no Manda
change. This source audit does not claim that repair or a new native validation
has already run. Login Bonus is a separate, already guarded settlement and is
outside this checkpoint.
