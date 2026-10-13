# Public Chat ordinary text producer and socket-ready/bootstrap separation

Bounded original source only. No public listener, room, channel assignment,
message, input/save/client/APK or DataDump changes. Original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G coordinates are code ELF plus10000.

## Exact ordinary public text command

CSRPopUpChat text-submit continuation Gba94b0 first rejects empty, invalid
UTF8 (CMIsUtf8 Gba94da) and its whitespace-only inputs. It copies the submitted
text Gba9580..958a, reads the selected origin Gba9592..9598 and, for origin0,
calls **CSRChat.Chat(TYPE0,inner10002,text)** at **Gba959c..95a8**.
Guild origin1 instead sends inner11000. These are different command domains.

CSRChat.Chat G8a5bd4 uses the original module command array at ELF1dce5b0,
`[10010,11000,10010]`. TYPE0 therefore selects **OUTER10010**, tail-calling
CSRChatModule.Chat G8a5bfc..5c0a. Its CHAT_SEND_PAYLOAD is the already closed
JSON **`{message:<actual text>,type:10002}`**. Thus ordinary public outgoing
request uses outer10010/inner10002; no user-authored who/nickname/channel or
system event is added by the ordinary text DTO.

The existing authenticated exchange header, encrypted PV1300 frame and body
envelope remain unchanged. TYPE0 URL is `new_chat`; TYPE2 `chat_whole` shares
an outer-command value but is a separate module and must not be enabled just
because TYPE0 text is now known.

## Receiver correction: typed10010, not10003

Independent direct source verifies that OnSocialMessage subtracts10002 into
r1 G8a7c9e..ca2 and tests mask0x6fd G8a7cac..cb4. Ordinary **OUTER10002**
is the generic message branch: message constructor G7d9e30 consumes
`{who:uint64,nickname:string,message:string}`, and AddMsg G8a7ce6 receives
the OUTER command G8a7cd0.

The typed fallback at **G8a7d72 compares that offset r1 with8**, therefore
selecting **OUTER10010**, not10003. It calls CHAT_RECVED_PAYLOAD G8a7d7c,
consuming who/nickname/message/type and forwarding **payload.type** to AddMsg
G8a7d92..da8. A typed response outer10010/payload.type10002 is therefore a
source-supported ordinary public receive path matching the ordinary sender's
inner command. A plain response outer10002 uses its three-field parser.
Original server selection between those two supported forms is not captured;
a local implementation must label its chosen mapping.

10003 (offset1) is excluded by the mask and fails the offset8 typed comparison.
The older note naming10003 as typed was incorrect and is superseded by the
corrected chat-response-entry-sinks-native-2026-10-13.md and complementary
public entry receiver note. Do not implement10003 as a normal text echo.

AddChatLog's established ordinary10002 branch compares full sender identity
to the current account and uses own style3/other style4; banned IDs are
filtered before insertion. Names are display fields, not room identity.
Authoritative who/nickname must come from the bound connection account.
No optimistic local text append is proved by the send continuation, so own
echo is source-compatible, not a duplicate-prevention theorem.

## Connected socket does not mean an assigned public channel

TYPE0's actual ready callback is vtable VA2142d98/operator **G8a9dc6**.
It sets per-module statebyte3 on result1, else1, and sends no enter packet.
Public Connect also resets current channel Chat+28 to0 G8a7722.
Therefore socket ready alone does not install a channel or prove ordinary
room/fanout membership. Do not fabricate a ready-time channel assignment.

The command1 **server response** path at G8a7db6 ignores payload, reads
local option **user_recent_channel** G8a7dc2..dd6 and checks whether its
stored string is nonempty G8a7de8..df8. Empty returns without entry. Nonempty
is parsed to an integer G8a7e04 and compared with current Chat+28
G8a7e0a..10. If different, it stores **user_try_channel** G8a7e1c..e36 and
calls EnterChannel G8a7e58. Same value also returns without an enter request.

No random channel generation or fixed fallback appears in this complete
command1 consumer or TYPE0 ready callback. This does not establish every
initial-options producer or the contents of an original persisted preference.
Do not fill absent recent_channel with a guessed original value1 or a random
room. An explicitly chosen LOCAL default would be a separate policy, not this
source behavior. The public socket can be ready but remain unentered.

Explicit EnterChannel sends command20000/payload{channel} and source admits
only1..9999. Its successful SAME-command20000 reply reads payload.channel
and updates current/recent/try local state. Exact entry response/selector
proof is owned by the complementary public channel entry sink note. A normal
Chat success DTO still requires accessToken STRING and error.code0/message
STRING; HTTP result_code/ret_data are incompatible here.

## Narrow supported next boundary

An opt-in LOCAL public channel listener can authenticate existing exchange
contexts, handle explicit20000 entry, then admit outer10010/inner10002 text
and use a declared source-supported receive form. Server-ID/channel isolation,
capacity, membership before text, bootstrap/default policy, limits, history,
replay and lifecycle are LOCAL admission/fanout policy unless further original
evidence is recovered. No TYPE2, Guild/fuel/control/system event or room grant
is activated by this producer/bootstrap document.
