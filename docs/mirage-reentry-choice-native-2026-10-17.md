# Mirage re-entry choice: native floor offer and reset/stay flow

Bounded immutable ARM investigation, 2026-10-17. Original DataDump input
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G code addresses equal ELF code offsets plus `0x10000`; data.rel.ro virtual
addresses below map to ELF file offsets by subtracting `0x1000`. No native UI,
live account, original data or runtime state was changed.

Published source anchors are DataDump
`sources/native/hunters/ghidra-mirage-entry-flow.txt:299-477` (Retry admission,
state branches and warning), `sources/native/symbols/native-evidence.tsv`
(symbol owners), and `sources/native/strings/native-all-strings.tsv`.
Fresh bounded Thumb inspection closes the callback targets below. See also
[GetInfo flags/cache](mirage-getinfo-enrollment-boundary-2026-10-17.md).

## Request and choice vocabulary

`CSRExploreMirageInfo::RequestNextFloor` G9322d8 sends `/mirage/GetNextFloor`
with the normal five authentication fields, without a requested floor, payment,
source roster or run nonce. Its matched callback G938a60 reads `next_floor`
and passes that scalar to the UI callback. This is an offer/discovery request;
original assignment, quota, persistence and economic rules are not recovered.

The completed-state Retry callback Gbfdeec loads returned `next_floor` at
Gbfdf3e and the current base floor (`+0x40`) at Gbfdf48. Equality at
Gbfdf4a/4c bypasses the choice popup and issues GetInfo at **Gbfdf88** with
**reset1, stay1, section mask31**. Different floors open
`CSRPopUpExploreMirageRetryConfirm`, passing `currentFloor < nextFloor`
(unsigned comparison) and the proposed floor to `SetDetail` Gc049b4 at
Gbfdfbc..dfc6. No server-side formula for deeper/shallow assignment follows
from that comparison.

`RetryConfirm::OnButtonClick` Gc04920 dispatches these exact button hashes:

- `BT_MIR_BT1` invokes popup event `+0x9c` at Gc04964..6a. In this path its
  callable Gbfe444 sends **reset1, stay0, mask31** at **Gbfe494**.
- `BT_MIR_BT2` invokes popup event `+0xb8` at Gc04988..8a. Its callable
  Gbfe5e0 sends **reset1, stay1, mask31** at **Gbfe630**.
- `BT_CLOSE` closes the popup without either choice request.

The binding proof is std::function vtable VA `0x215a0ec` for event+9c
(invoke ELF Thumb `0xbee445`) and VA `0x215a12c` for event+b8
(invoke ELF Thumb `0xbee5e1`), installed at Gbfdff6 and Gbfe04c respectively.
Thus first choice accepts the offered destination; second stays on the current
floor. These names describe caller intent, not an independently recovered
original server reset implementation. Same-floor offers take the stay1 shortcut.

## Active-attempt warning is another offer path

`CSRPopUpExploreMirage::OnButtonClick` Gbfa5d0 first checks an owner field at
`popup+c28 -> +0x294` against a global virtual call with argument2; equality
shows a toast. The field's meaning is unclosed: it is not proof of a daily
quota, server day or price. Base state2 also refuses with a toast before this
retry flow, consistent with pending reward handling.

For base state0 the button calls RequestNextFloor directly at **Gbfadde**.
For base state1 it creates a `CSRCommonPopup` with `SetButton_Yes` and
`SetButton_No` (published decomp lines449-477). Yes event+0xa8 is bound at
Gbfaaa4/aaaa through vtable VA `0x2159e84` (invoke ELF Thumb `0xbeca79`)
to **Gbfca78**, which calls RequestNextFloor at **Gbfcb0c**. No direct reset
request is issued by declining or closing the warning.

This second floor-offer reply uses the same two-choice semantics:

- Equal floor: GetInfo **Gbfcdd8**, reset1/stay1/mask31.
- Different floor, first button: event+9c bound at Gbfce46, vtable VA
  `0x2159fa4`, invoke ELF Thumb `0xbed8b1` -> **Gbfd8b0** -> GetInfo
  **Gbfd900**, reset1/stay0/mask31.
- Different floor, second button: event+b8 bound at Gbfce9c, vtable VA
  `0x2159fe4`, invoke ELF Thumb `0xbeda4d` -> **Gbfda4c** -> GetInfo
  **Gbfda9c**, reset1/stay1/mask31.

Consequently all six detected reset1 callers are downstream of a GetNextFloor
request, including the three earlier ambiguous sites Gbfcdd8/Gbfd900/Gbfda9c.
A bounded direct Thumb BL scan of original ELF code offsets `0x800000` through
`0x1100000` found only the two RequestNextFloor call sites above. Other detected
RequestInfo calls at G84e126, G8f98d2, Gcc6828, Gcc6a84 and Gda6432 use reset0.
This is a bounded native-call inventory, not a claim about dynamically resolved
or undiscovered callers outside that range.

## Labels and informational popup

SetDetail uses one localization family when current floor is less than the
proposed floor, and another when it is greater. Exact recovered keys include
`신기루_재입장_확인_완료_타이틀` (Gc049da/49e2),
`신기루_재입장_확인_완료_두번째문구` (Gc04aaa/4aac),
`신기루_재입장_확인_완료_세번째문구` (Gc04b22/4b24), and
`신기루_재입장_확인_완료_이동` (Gc04b9a/4b9c).
The other branch uses corresponding `미완료` keys at Gc04d6c/4d74,
Gc04e3c/4e3e, Gc04eb4/4eb6 and Gc04f2c/4f2e.
The suffix `이동` means move; `완료`/`미완료` mean complete/incomplete.
These are literal key translations, not verified English UI copy. The bounded
published table lookup did not recover their localized displayed sentences.
The code also toggles `BTN_RED1`, `BTN_GRAY1`, `BTN_RED2`, `BTN_GRAY2` widgets;
color alone does not establish a payment or destructive action.

The separate `CSRPopUpExploreMirageRetryInfo` is informational. It is created
at Gbf8984 around tutorial25/0 handling and at Gbfd292 after a result1 guard
Gbfd288..28e, then receives the current floor through SetData. Its
OnButtonClick Gc063d0 closes the popup; it does not issue a reset or a new floor
request. It supplies no alternative direct re-entry path in this audit.

## Implementation boundary

A LOCAL rule requiring a successful, persisted GetNextFloor proposal before a
new reset attempt is compatible with the detected native choices. The client
sends no explicit offer ID. Reset1/stay0 can consume the captured offered floor;
reset1/stay1 can consume the captured current floor. Lost-reset-response repair
must be a separately documented LOCAL idempotency rule returning CURRENT cache,
without healing, re-enrollment or another quota charge. Original proposal
storage, daily counters/timezone, reset HP, free/paid entry, repeat eligibility,
next-floor graph and reward laws remain unknown.

Do not infer a valid offer from the callback's failure fallback scalar0: a
current-floor0 comparison could still reach the equal-floor shortcut. Successful
configured offer creation should remain an explicit server prerequisite.
