# Guild fuel recipient follow-up: support counters and UI are not an AP receipt

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code convention ELF+0x10000. Bounded direct original Chat/Guild/UI
continuations only; no broad cache/corpus scans or live inputs/grants/transactions.
DataDump read-only, Server source note. Complements the prior fuel default,
request-list, Chat producer and response field audits.

## What the11011 Guild receiver changes positively

CSRGuild.UpdateGuildMessage Ga6c8ec selects fuel command11011 and calls
ParseFuelMsg at Ga6ca70. It finds the cached owner-keyed request and compares
the actual request's two-word ID at Ga6cada..cae8. For an ID match it reads
incoming supports and cached supports Ga6caea..caee; only if incoming is
greater does it write cached FUEL_INFO+14 at Ga6caf2. It updates request/cache
state, not the account AP wallet. The bounded complete continuation has no
user/ap field selection, SyncUser/AP setter or requester claim request.

The11010 branch separately compares cached owner with current account
Ga6ca26..ca40, writes CHATDATA flag3 for own/4 for others Ga6ca42..4a, and
checks the cached request date. These flags are not reward quantities or
currency settlement. Do not interpret a completion-looking row as12 AP earned.

## Requester UI only refreshes request time

CSRPopUpChat's fuel receive continuation parses the message string Gba61f6
and requires its result slot1 Gba61fa..61fe. It resolves cached owner fuel
Gba620e, compares that owner with current account PVID Gba6214..622c, and
for the requester writes CHATDATA flag3 Gba6232. It passes cached regdate+24
to UpdateFuelTime at Gba6236..623c, then branches to the end of this UI case.
No AP quantity is passed to that method.

UpdateFuelTime Gba3b34 contains request-on/request-off visibility logic and
formats the remaining timer using %H:%M:%S Gba3d4c..64. Its concrete children
are BT_REQ_ON/BT_REQ_OFF/IMG_TXT_DETAIL/TX_GD_ST1. The inspected complete
function does not call a native AP credit/SyncUser/claim producer. Timer reset
or availability is not evidence of a recipient payout.

## Donor's plus animation is contribution data, not stored12 AP

CSRPopUpChat.UpdateSupportProduct Gbab9a4 explicitly calls
CSRGuild.ContributionByAction with literal action4 Gbab9c4..9c6. It saves
that return as r4 Gbab9ca and formats r4 with '+' Gbaba58..74 for
TX_GD_TX15/IMT_FUEL. The displayed amount depends on the separately supplied
Guild contribution action map. It is not GetSupportFuelCount12 or proof of
an AP grant to either donor or recipient; backend donor contribution settlement
is also separate from this display/animation consumer.

The support HTTP/UI continuation Gbad404..41a reports a changed Guild, marks
the button completed Gbad460..492, emits CreateFuelJson(command11011)
Gbad4de..4ec and sends it through Chat Gbad4fc. That message carries the
updated FUEL_INFO, not user/ap or an account currency receipt. No extra
requester collection operation appears in these bounded continuations.

## What12 does and does not prove

Original constructor initializes max-support+b0=5 and support-fuel+b4=12;
GetSupportFuelCount Ga8015a is a getter for the latter. This follow-up does
not find an actual AP application branch merely by observing that value.
A bounded direct Thumb BL check of the two tiny getter addresses found no
direct callsites; possible PLT/inlined/indirect consumers are not exhausted,
so this is NOT a global dead-code or absence claim. The positive requester
and donor consumers above remain the evidence relevant to these actual paths.

Optional user in RequestMyInfo has an independently recovered generic
SyncUser path; that can refresh an authoritative existing AP snapshot when
called. But fuel11010/11011 continuation here does not establish such a
request, does not supply its receipt, and does not prove12/max5 payout law,
per-support versus full-request credit, AP cap/overflow or duplicate handling.
The11012 banish branch's MyInfo refresh is a different command and cannot
be reused as the source of fuel credit semantics.

## Supported next boundary

HTTP request-list rows and authenticated Chat support-update records can be
made coherent without changing any AP. That is meaningful request/UI progress,
but cannot be called complete fuel settlement. Any local AP credit policy
must be declared separately with authoritative counter/clock/wallet persistence
and an actual requester refresh/receipt contract, not silently inferred from
the stored12 or animated '+'. This unit enables no grant or transaction.
