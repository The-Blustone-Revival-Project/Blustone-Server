# Chat response DTO, channel entry and Guild message sinks

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code convention ELF+0x10000. Direct bounded Thumb/ELF/symbol analysis.
Server evidence document only, DataDump read-only, no listener/connection/input
or messages. Complements native-chat-encrypted-frame-2026-10-13.md.

## Response is not the HTTP result envelope

CPVChatResponseMessage.Parse G8a9530 consumes this direct decrypted JSON:

```text
{accessToken:string,command:int32,tag:uint32,payload:JSON,
 error:{code:int32,message:string}}
```

accessToken is exact camel case and unconditionally strict string G8a9548/
G8a957a. Empty string is accepted by this conversion but does not establish
server connection identity. command G8a95b0 uses signed32 conversion
G8a95fa and writes response+10 G8a9604. tag G8a9606 uses uint32 conversion
G8a964a, and G8a9654 stores its lowword with HIGHWORD ZERO. This response
tag is effectively32 bits despite the request's recovered full uint64 tag.
A supported decoder should refuse >uint32 aliases, not truncate them.

payload G8a9658 is copied as arbitrary JSON G8a9664 into response+20; the
top parser does not require its type, validate commands or authenticate it.
error G8a9690 unconditionally delegates to error_t.Parse G8a974c.
error.code G8a9762 is signed32 G8a97b8, and error.message is strict STRING
G8a97d6 EVEN for the success branch. Missing/null error.message is therefore
not a safe success encoding. A supported success DTO is error:{code:0,message:""},
not result_code:1, error_code0 or ret_data. No HTTP aliases/wallet fields are
part of this top response grammar.

## Consumer success gate and channel entry

CSRChat.OnSocialMessage G8a7bc0 only parses data for callback status0
G8a7bd8..c0a. It calls response.create G8a7c66 and requires error.code0
G8a7c6a..6c before dispatch. Nonzero error returns the error path; code11001
(0x2af9) specifically shows the original channel-full toast G8a7c6e..c8c.
This error domain is Chat-specific; HTTP result1 is not its success convention.

Outer command1 G8a7db6 is a bootstrap response: the handler reads persisted
user_recent_channel, compares current Chat+28, records user_try_channel and
can call EnterChannel G8a7e58. This bounded consumer does not assign a room,
bind a new token, or parse payload.channel for command1. If no recent channel
is available, it can return without issuing that next request.

CSRChat.EnterChannel G8a8ea4 stores user_try_channel and sends command20000
at G8a8f48/G8a8f54. enter_message.to_json G8a949c inserts scalar channel
G8a94c4. Successful assigned-channel response uses the SAME outer20000:
OnSocialMessage compares0x4e20 G8a7dae..db4, then reads payload.channel
G8a7f10/G8a7f16, signed32 conversion G8a7f60, and stores Chat+28 G8a7f68.
It formats the original channel-entered log, updates recent/try preferences
and appends that log. No extra room_id/channel_id/Guild assignment key is read.
Channel numeric range/same-server mapping/session admission remains server
policy; source here does not make every signed number a valid channel.

## General message versus Guild payload domains

Social outer-command handling is not a blanket all-command echo. G8a7c9e
subtracts10002 and checks mask0x6fd over the next11 positions. Generic social
message commands go through message base+message parser G7d9e30. The separate
10003 branch G8a7d72..7c uses CHAT_RECVED_PAYLOAD with inner type. Do not
assume request outer10000 is automatically the received general broadcast ID.
That production mapping/fanout needs its own request/capture proof.

CSRChat.OnGuildMessage G8a81a8 likewise requires callback status0 and
error.code0 G8a824e..8250. It subtracts11000 G8a82bc..c0, bounds offset0..12,
and tests mask0x1c01 G8a82cc..d2. Accepted received commands are exactly
11000,11010,11011,11012. Each goes through CHAT_RECVED_PAYLOAD G8a82dc.

The latter inherits message_base constructor G7d9cc8 at G8aab7c, whose
fields are who:uint64 and nickname:STRICTSTRING. who's integer branch reads
BOTH words G7d9d12 and stores both G7d9d3e. nickname conversion is G7d9d56.
It then selects message:STRICTSTRING G8aab82/G8aab98 and inner type:uint32
G8aab9e/G8aabdc. Thus supported received Guild payload is:

```text
{who:exactUint64,nickname:string,message:string,type:uint32}
```

Request CHAT_SEND_PAYLOAD instead supplies message/type; the authoritative
server would fill sender fields from its independently authenticated connection.
Do not replace who with pvid/sender or nickname with nick_name, and do not
derive trusted sender from client payload.who or tag. A lossless scalar ID codec
is required for general uint64 values. No automatic Guild room/channel/member
assignment field is consumed in this bounded received-message branch.

Other Guild commands are distinct:10001 can create an initial waiting/log row
when tag is nonzero G8a8308..8334. Generic message branch G8a843e can inspect
payload.result_code10247 for an unavailable-state toast. Those neighbor paths
do not redefine the11000 schema or success error.code domain.

## Connected readiness is separate from an entry acknowledgement

CSRChatModule.IsConnected G8ae56c obtains its underlying client at+68,
calls the virtual state getter and returns whether state==3 G8ae57a..80.
The inspected Social/Guild entry/message sinks do not set that transport
state. command1/error0 or payload.channel therefore cannot by itself prove
authentication, readiness transition, room subscription or a token exchange.
No listener/handshake/key-selection/fanout policy is implemented by this audit.

The framing audit separately pins PV1300/rawAES/SHA256 plaintext. A pure
response decoder can now validate this DTO and supported payload components,
with exact32-bit response tag, uint64 sender, lossless strings and detached
arbitrary JSON. It cannot invent an HTTP wrapper or conclude original session
ownership, connection authorization or a playable Guild fuel AP producer.
