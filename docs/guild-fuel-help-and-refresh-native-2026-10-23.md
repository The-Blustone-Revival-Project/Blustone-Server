# Original Guild fuel help and recipient refresh paths

Source-only recovery. No AP implementation, policy activation, gameplay grant,
live/private data, client input or original/DataDump writes occurred. The current
`local-requests` workflow remains request/support/contribution records only.

## Original help positively recovers daily requests and total Fuel

Read the complete original `resources/runtime/assets/UI_CSV.jet` with the
Instrumented `tools/extract-jet-chunk.py` walker, in memory. Exact identity:

* Whole original: 93,380 bytes; SHA-256
  `73a9dc4755baf8eb84c3fa945b7dd8b10228fe73d47a945de27137de2c84dac8`.
* Named `HELP_DATA`: chunk index 1, header file offset 516, compressed payload
  85,055 bytes. Inflated RW record is 288,768 bytes; its SHA-256 is
  `c1f7e0d240e569231d64f38c0d3418d2b72d07069248f8595d0c4baa9f6cf7b7`.
* Removing the six-byte RW envelope leaves the 288,762-byte UTF-8/BOM JSON body,
  SHA-256 `730070894cb69ccbfc85bbaa3d44de5ed8dbb8238081d91ab196a2716eb6b754`.
* Article array index 192, ID **`CONTENTS13_4`**, EN title **Fuel Requests and
  Helping**; text is in `desc1`. Canonical article SHA-256 (UTF-8 JSON, sorted
  keys, `ensure_ascii=False`, compact separators) is
  `b87b45729e8414cacfe94dfa015132924dd32087d80e5adba4b30793163cee1b`.

The English article says a request can be made **once per day through Guild
chat**, is visible to Guildmates, and **up to five Guildmates can help for a
total of 60 Fuel**. Helpers consume no Fuel. These are original help statements,
not arithmetic invented from the constructor's adjacent values 5 and 12.

Short original excerpts, with only rendering tags removed:

* EN: “a maximum of 5 guildmates” / “a total of 60 Fuel.”
* KO: “최대 5명의 협회원에게 60연료” / “연료의 소모가 없기 때문에”.
* JA: “最大5人のメンバーから合計60燃料” / “燃料は消耗されないため”.
* SC: “最多可从5名成员处获得总共60燃料的支援” / “支援方无需消耗燃料”.
* TC: “最多可透過5名成員獲得總共60燃料的支援” / “給予支援者無需消耗燃料”.

The Korean/Japanese/Chinese articles also expressly say once per day. They make
the donor-free wording particularly clear; the English “no consumption on
either end” is not a claim that the requester receives nothing.

This closes the **documented aggregate** quantity and daily frequency gap.
It does not independently establish uniform 12 per individual support,
immediate-versus-final-support settlement, collection timing, midnight versus
rolling-day reset, timezone, request lifetime, AP-cap/overflow behavior, or the
production backend's final balance law. The constructor's `supportFuel=12`
supports a uniform-12 hypothesis but does not supply its missing application
branch. Original help can also lag backend changes; preserve the evidence's
actual status instead of treating a guide as a captured server transaction.

## Actual native MyInfo route and ordinary refresh callers

All ARM addresses below refer to the freshly hash-verified original
`libnative_core.so`, SHA-256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Code addresses use the Ghidra `ELF + 0x10000` convention.

`CSRGuild::RequestMyInfo` **`Ga6ced0`** posts **`/lobby/GetGuildInfo`**. Its route
literal load `Ga6d122` uses slot `Ga6d2b0`, word `0x130bc0d`; ADD `Ga6d124`
resolves `G1d78d35`. The initial form constructor receives **five fields** at
`Ga6d01e`/`Ga6d022`: the normal native authentication fields. The method's final
byte argument is saved at `Ga6ceda`, loaded at `Ga6d126`, placed in the stack
argument at `Ga6d12a`, and passed into `CPVHTTPRequest::Create` at `Ga6d132`.
It is a local HTTP-creation flag, not an extra Fuel amount or request-body
selector. This audit does not assign an unproved UI meaning to that flag.

Concrete ordinary callers include:

* `CSRPopUpVillage::OnReset` (`Gda1f20`): gets Guild manager at `Gda487a`, sets
  flag 1 at `Gda4890`, calls RequestMyInfo at **`Gda4892`**.
* `CSRSceneMainTabDownVillage::Init` (`Ge9fb10`): gets Guild manager at
  `Ge9fbb4`, sets flag 1 at `Ge9fbc6`, calls at **`Ge9fbc8`**.
* `CSRSceneMgr::ApplyScene` (`Gea6600`): the inspected branch gets Guild manager
  at `Gea77b8`, sets flag 0 at `Gea77e8`, calls at **`Gea77ea`**. This identifies
  a real branch, not a claim that every scene transition invokes it.

Those callers establish an available normal Village/scene refresh path. They
do **not** prove that closing Chat always resets Village, that MyInfo is polled
periodically, or that a fuel11010/11011 message invokes any of those callers.

The RequestMyInfo callback **`Ga86408`** checks native result 1 at
`Ga86430..Ga86434`. It optionally selects `ret_data.user` at
`Ga865e2..Ga865ea` and calls `CSRPlayData::SyncUser` at **`Ga865f6`**.
In that consumer (`Gb7047c`), the AP branch requires nonnull `user.ap` and BOTH
`ap.prev` / `ap.cur` (`Gb709f4..Gb70a28`). Charge time is selected from that
**same AP object**, `ap.ap_charge_time`, at `Gb70aca..Gb70ad0`, then written to
PlayData `+0x160` at `Gb70b48`; current AP is written to `+0x130` at `Gb70b50`.
This is an absolute synchronization mechanism, not an additive Fuel award.

If a future actual settlement exposes AP through this optional user branch,
include the real plain `user.iap_qty` and `user.free_iap_qty` too: generic
SyncUser has unguarded scalar-wallet conversions and omission is not a promise
to preserve them. The currently omitted optional `user` branch is safe for the
records-only mode; adding an economic receipt requires its own exact tests.

## Guild chat does not establish a hot AP receipt

`CSRChat::OnGuildMessage` **`G8a81a8`** recognizes the incoming Guild-message
family at `G8a82bc..G8a82d2`: base 11000, range 0..12, mask `0x1c01`, admitting
11000, 11010, 11011 and 11012. Its received payload is sender/nickname/message/
type. Neither a hypothetical extra wallet field nor an unrelated command is
thereby an AP-refresh contract.

`CSRGuild::UpdateGuildMessage` **`Ga6c8ec`** dispatches 11010/11011/11012 at
`Ga6c90c..Ga6c924`. The positive RequestMyInfo call at **`Ga6c990`** belongs
specifically to **11012**, whose literal is `0x2b04` at `Ga6c91e` and whose
message is parsed with **ParseBanishMessage** at `Ga6c930`. It compares the
banished PVID with current account at `Ga6c934..Ga6c946` before taking that
refresh. Reusing 11012 as a made-up fuel push would assert a banishment event.

11011 instead updates the matched request's higher support count at
`Ga6cada..Ga6caf2`. The requester Chat UI passes cached **expdate `+0x24`** to
`UpdateFuelTime` at `Gba6236..Gba623c`. The recurring Chat `Refresh`
(`Gba45a0`) also calls that timer updater at `Gba4642`; its complete inspected
body contains no RequestMyInfo/AP request. These are request/cooldown refreshes.

A bounded direct Thumb-BL scan over code `G600000..G1c00000` found the above
MyInfo callers plus other ordinary Guild/profile actions, and no direct call
from the inspected Chat refresh/fuel continuations. Such a scan does not
exclude every indirect/inlined producer. The out-of-line mission RequestAP
symbol likewise did not yield a direct caller in this scan; that is not proof
that the application never synchronizes AP elsewhere.

## Implementation boundary

The earlier recipient-boundary report's **no fuel-triggered MyInfo/AP call**
finding remains valid for its inspected continuations. It must not be enlarged
into “the original client cannot normally refresh recipient AP.” The real
`/lobby/GetGuildInfo` callback and Village callers provide that refresh seam.
This note supersedes a blanket “original total Fuel is unknown”: the help now
positively documents total 60, maximum five, once daily, and donor-free support.

Keep the existing no-AP workflow unchanged pending an explicitly bounded
settlement policy. Any AP implementation still needs atomic donor/request/
recipient accounting, duplicate/lost-response handling, supported capacity/
overflow semantics, and correct recipient read receipts. A useful next
validation would distinguish a cold/normal Village refresh from a hot Chat
refresh; no such native validation was performed in this source audit.
