# Mirage friend-floor response — 2026-10-11

The original final client supports a separate read-only friend-floor panel even
when the reconstructed Mirage run remains unavailable. This patch supplies its
native DTO. It does not create friend relationships, floors, enemy teams or rewards.

Evidence is the original read-only ARM ELF in DataDump:
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA-256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra addresses below equal ELF virtual/file positions plus 0x10000 for this
code/string region. A bounded Capstone 5.0.7 Thumb inspection corroborated the
existing DataDump string and caller exports; no Ghidra, device, original or save
writes occurred.

* RequestFriend G931764..G931e32 constructs only `app_code`, `app_ver`, `market`,
  `pvid`, `otp`. ADD sites G931796/G9317c0/G9317de/G93180c/G931840 bind those
  five strings. ADD G9319be binds `/mirage/GetFriendInfo` at G1d72fab.
* Its result continuation G938298 calls GetResultCode at G9382be, compares 1,
  locates `ret_data` and reads that same selected subtree. Exact ret_data
  literals: word 0x14306bf at G938474 plus ADD G9382f8+4; word 0x1430671 at
  G938478 plus ADD G938346+4; both resolve G1d689bb. Call G938350 targets
  ParseFriendInfo G934c00 (ELF call target924c00).
* ParseFriendInfo first compares selected JSON type to2 (array) at
  G934c16..G934c1a. Only that branch clears the list at model+b8 and rebuilds
  rows. Each row indexes `floor` (ADD G934c9c) and `nick_list` (ADD G934ca6).
  Floor converts into32-bit numeric storage at G934d1c. Nick-list type2 is
  checked at G934d28..G934d2c; each member is a strict string conversion
  G934d86. Native list rows contain floor and nickname-list, not account IDs.
* Original popup OnButtonClick G bfa5d0 invokes RequestFriend in its friend-button branch
  (existing DataDump `ghidra-mirage-entry-flow.txt` corroborates the caller).

Wire response: `result_code:1, ret_data:[{floor:integer,nick_list:string[]},...]`.
A successful empty array clears stale cache; a metadata object does not clear it.
Local-account friendships can now be established, but no original or earned
friend highest-floor records have been reconstructed. The honest Mirage
response remains `[]`. Do not infer floor0 from friendship or populate it with unrelated local accounts or
Arena fixture rivals. `mirageFriendFloors` groups supplied, already established
friends without using nickname as identity: two friends with the same name are
retained. Descending floor order is explicitly a local presentation policy;
original ordering remains unknown. Invalid numeric ranges and empty nicknames
are rejected by server policy, not claimed native parser behavior.

Offline validation: `npx tsx tests/mirage-contract.ts`, `npm run build`.
Root integration belongs in authenticated ServerState.mirageAction before its
GetInfo branch. Native validation: enter the verified Mirage lobby, select its
Friend button after identifying it on a fresh screen; verify actual
GetFriendInfo, successful bare array, and the original empty friend-floor panel.
No run reset or combat must be started for this test.

Original floor assignment, per-stair grades/balances, enemy instances, revive
price, rotations and rewards remain absent. Final shipped help proves3/6/9
stairs for floors1–20/21–40/41+, but supplies no original nonempty rows. Native
safe grade table0..3 and balance scale1e-4 do not license invented difficulty.
This patch makes no claim that Mirage combat or payout has been revived.

