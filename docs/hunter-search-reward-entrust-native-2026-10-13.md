# Hunter Search deferred Reward and Entrust: native closure

2026-10-13. Read-only original ARM Thumb evidence, checked against the pinned
`libnative_core.so` SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses use the Ghidra `G` convention (ELF code address +0x10000). DataDump
was not modified. No live inputs, jobs, awards or server activation occurred.

The targeted starting evidence was DataDump
`findings/revival/search-end-contract.md` and `search-begin-contract.md`, plus
`findings/protocol/search-entry-reference-contract.md`. This note closes
previously partial reward parsing and Entrust callback attribution; it does
not reconstruct original reward quantities, discovery law or eligibility.

## Deferred Reward uses the current account's My record

`CSRFindShardStage::RequestReward G9118b8` posts `/explore/Reward`
(G911ba8) with auth5 plus `ref_id` and `inst_id`. The form fields are strings:
ref_id comes from INFO.id and inst_id is decimal full unsigned64 conversion
of PLAY_DATA.instance+8 (G911a2a..a3e). It does not post log_id, owner, a
claimed amount, or a job list.

More precisely than the earlier note's "selected instance" description,
RequestReward calls **CSRFindShardStage::My G90bfb4 at G9118d8**. Its returned
record's INFO+68 supplies ref_id (G911a12..a26). My looks up the instance map
by the current account's PVID (G90bfe4..c01a), compares the found record's
end_datetime+2c against current server time (G90c01e/G90c05c..05e), and calls
fallback G90c14c when absent or expired. The complete fallback lifecycle is
not promoted here. There is no recovered empty/no-job Reward read branch.
This lookup must not be replaced with arbitrary client-selected ownership.

The previously attributed successful callback `G91c5f0` checks application
result_code1 at G91c626..62a. It calls My again at G91c630, obtains the returned
PVID+18 (G91c642), and erases the matching uint64 map key at G91c680. It then
passes ret_data directly to ParseReward at G91c6b2, and forwards that same
ret_data to the UI callback. Erasure is before item parsing. A server-side
one-time ledger and deliberate lost-response/replay policy are required;
returning success after the owned record has disappeared is not proven safe
or idempotent merely because rewards are empty. Non1 skips erase/ParseReward.

## Complete ParseReward mutation is item-only, with a narrowed instance ID

`ParseReward G917c04` indexes only **item**, iterates rows, and reads exactly
**inst_id, ref_id, added** (G917c9e/ca4/caa). ref_id is a strict string via
G917d48→G728b08; added is effective uint32 (numeric integral lowword or
converted string/double, G917d54..d92). The call is the existing
`CSRInventory::AddItem(uint64, string, uint32) Gaec508` at G917da2.

An important correction to the previous generic uint64 description:
**this caller narrows inst_id to uint32 and zeroes its high word**. Integral
JSON loads only the low word at G917d06; floating/string branches convert
with VCVT.U32.F64 G917d2e. The resulting r6 is placed in r2 at G917d9e,
and r3 is explicitly zeroed at G917da0 before AddItem. Thus a high-ID grant
would alias an unrelated low-ID inventory row despite AddItem's uint64
signature. A future supported receipt must restrict its item instance IDs to
the effective namespace instead of emitting arbitrary full64 IDs here.

The full normal function returns at G917e24..e2a after that item loop; its
exception cleanup ends G917e76, with the next distinct function at G917e90.
There is **no SyncUser, gold/AP/BP, Hunter/card grant, gem or special-supply
branch** in this parser. Do not transplant mission or Search-End rewards
into deferred Reward. `item:[]` skips AddItem, but is not proof of a valid
claimable instance, complete award policy or playable claim lifecycle.

## Reward display also consumes nickname_list

`CSRSceneExploreReward::SetData Ge3b9c4` consumes **nickname_list** as a
collection of strict strings (Ge3b9e0/e3ba80), calls AddUserList Ge3baf4, and
then consumes **item[]** with ref_id STRING and added numeric values
(Ge3bafe/e3bb76/e3bb7c). It resolves the item reference through GetItemData
Ge3bc40→G853de8 and builds display rows via PushItemList Ge3bc9c. Therefore
authoritative receipt rows need real published GetItem references in
addition to actual inventory mutation, and a future full claim DTO should
include the proven display list rather than guessing a reward wrapper.
Neither nickname_list nor display quantities supply account authority.

## Entrust is a combined Begin→End callback, not Reward

`EntrustMission G913f08` posts `/explore/Entrust` (G91431c). The exact form
contains auth5 plus **owner, type, ref_id, inst_id**: owner is selected
PLAY_DATA.pvid+18 converted unsigned64 decimal (G914068..07c), type is the
selected INFO.type (G9140aa..0c2), ref_id is INFO.id (G9140fa..10e), and
inst_id is selected PLAY_DATA.instance+8 unsigned64 decimal
(G91412e..144). No count, period, reward amount or auto-job ID is posted in
this request. This does not prove all owner/type values are admitted.

Original vtable G2146b40, invoke slot G2146b60, contains ELF90da25,
identifying the second TASK_READY callback **G91da24**. It creates an ordinary
RESULT, checks HTTP application result1 at G91daf4..af6, and only on success:

- selects full envelope.ret_data G91dafa..afe;
- selects **ret_data.begin**, calls ParseBegin G915d6c at G91db10;
- selects **ret_data.end**, calls ParseEnd G9167b4 at G91db22;
- forwards result_code and the constructed RESULT to the UI callback
  G91db26..34.

These are sibling objects, not bare End ret_data or a deferred Reward DTO.
ParseBegin writes the selected target's battle log/reward/wave cache and
applies consume_result; ParseEnd handles its own item/gem/supply/wave/detect
branches. Existing exact parent schemas remain in the targeted source notes.
Entrust therefore needs the same real selected-target/cache/reference and
consumption prerequisites as those parsers, even when no native fight is
played. A synthetic success `{begin:{},end:{}}` is not a neutral read.

## Actionable boundary

The request and receipt seams now permit an offline source-backed DTO/parser
unit, but do not justify enabling awards or Entrust settlement. Original
deferred claim eligibility, item quantities/IDs, discovery/timing law,
per-account claim ledger and replay behavior remain missing. Existing
non1 refusals are compatible with the callback guards. Preserve the current
GetInst no-job read and existing Begin/End local fixtures; do not create a
reward job, grant a Hunter or choose a reward pool to fill this gap.
