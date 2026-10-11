# Explicit Gem inventory and free first-mount workflow

Gem references and owned inventory now have authenticated server readers and persistent validation. The normal scene's proven free first-install path also persists mounting. Original catalogue IDs, rolls, set-effect magnitudes, prices and gacha pools remain missing; no default Gems are granted and no live Gem data/profile is activated.

## Data and original material admission

`BLUSTONE_GEM_REFERENCE_JSON` or constructor option `gemReferences` supplies explicit INFO rows `{id,name,desc,res_id,set_effect_id,rank,target}`. They are copied/frozen once, with duplicate/invalid identities refused. The actual ranked sprite `res_id` must have one source-positive owner, separately selected in a PKGI1 delivery mode, with exact original size/SHA-256. The resource name is loaded unchanged natively; neither a gameplay ID nor a rank suffix is inferred.

The catalogue pins seven original Gem packs,394 records and75 ranked Gem sprites. The earlier80 count included five selection markers and is corrected. `current-e6-gems` is an **inactive**146-package/stamp1634687 preparation containing the unchanged139-package prefix plus these seven originals. Reference IDs/instances remain empty unless explicitly supplied. The catalogue generator verifies the original source hashes and exact JET record traversal.

Private game state optionally carries `owned_gems` as full wire rows. Legacy absence stays absent; the old scalar `gem` remains unchanged and is never converted into inventory. References, uint64 IDs, main/sub mode100 stat fields, opaque ability string, target ownership and mounted occupancy are validated before restored state can be used. Reads return detached data without initialization or grants. Unknown references, malformed rows, foreign targets, duplicate identity/occupancy or invalid mounted positions refuse while preserving source files.

Mounted positions are1..2; the second position requires that particular equipment rank>=3. These are original scene indexing rules, not an inferred limit based on Hunter rank. Hunters with mounted Gems are protected from sale/training/rank source consumption as explicit conservative policy; no automatic detachment or source fees are invented. Mounting itself does not change equipment rank/level.

## Native uint64 wire correction

The original Gem parser's string-ID branch calls `strtod` before converting to uint64, so values above2^53−1 lose precision. The integer-JSON branch reads both64-bit words directly. Large IDs therefore use **exact unquoted integer JSON tokens** on responses, emitted with the current Node22 runtime's JSON.rawJSON support. Decimal strings remain lossless private storage. Scoped state import preserves large numeric Gem tokens before JS Number rounding. Other state numbers are unchanged. Unsupported encoders refuse instead of emitting rounded identities.

Tests cover9007199254740993 and18446744073709551615. Compiled encrypted checks inspect actual plaintext tokens; preserving an ID only inside a pure decoder is insufficient native wire proof. Independent native review identified this bug and verified the original branches.

## First install and retry behavior

`EquipGem` accepts target_inst_id, price_type2 and complete `combination` data with **weapons/armors/accessories arrays of exactly two ordered IDs each**. Zero means empty. Owned Gems must match the requested part, be unmounted, and target an ordinary owned Hunter free of active ordinary/arena/search or carried Mirage commitments. Occupied old cells must remain unchanged: removing, replacing, moving or swapping any old Gem needs its still-missing level-specific fee and refuses. Cross-Hunter transfers and alternate payments remain gated.

The original confirmation charges only changed occupied BEFORE cells; installing into an empty cell is free. No fabricated zero price is used. One atomic snapshot updates only Gem target/position fields. Failure restores the prior owned array and file; gold, items, paid/free Manda, cards, equipment, decks, collection history, other accounts and the legacy scalar stay unchanged. GDP0 in receipts is the same explicit current lobby policy, not a reinterpretation of the scalar gem counter.

Native success reads `ret_data.gems` full known instance rows plus absolute user wallet/item channels, then validates the requested card. The server echoes **all authoritative Gems on that target**, including on a no-write identical-grid retry. Returning an empty list after a lost first response would leave the native cache stale; the full echo repairs it. Paid removal, Gem sale/level-up/gacha and set-effect numerical reconstruction are not enabled.

## Verification and limits

All85 configured checks and build pass. Tests cover complete source/material/stat schemas, safe/unsafe identity encoding, private-file preservation, legacy scalar separation, auth/account/part/position/rank constraints, mounted-Hunter consumption protection, unlocked second slot, active target refusal, missing removal fees, unchanged-grid no-write response repair, persistent rollback and restart. Authored Gem IDs and ability rolls are explicitly fixtures.

Compiled encrypted `--fixture --profile current-e6-gems --exercise-gem-mount` checks exact reference/owned arrays, an actual first install, unchanged wallets, full response-loss retry echo, refused removal and restored target/position after restart. Actual unsafe ID integer tokens, all seven original package bytes/SHA/inner-outer MD5/head-tail ranges,146-package manifest and unrelated game state pass. Native Gem inventory/mount pixels and combat effects remain unverified while game inputs are held.

Separately, the previously tested80-check source was reloaded under the unchanged live139/stamp1634683 profile after fresh read-only Village/render guards and three no-active-battle saves. Wrapper48628/listener49632, same client27165/+15 APK. Authenticated equipment price reads and Gem inventory reads return empty native arrays; entire private save bytes stayed exact. The newer Gem workflow source remains pending activation. No emulator inputs, APK build/install/release, Docker/collector or DataDump changes occurred.
