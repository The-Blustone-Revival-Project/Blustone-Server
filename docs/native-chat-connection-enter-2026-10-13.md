# Native Chat connection identity, module URLs and public channel enter

Bounded original native evidence; no listener, socket, live input/private key,
account/save/client/APK or DataDump change. ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are code ELF plus10000; vtable VA maps to file minus1000.

## Upgrade header binds the existing transport key

CSRChat.Connect **G8a74c4** gets CPVHTTPSharedSecret at G8a765c and calls
**GetAccessToken G7f2ce0** at **G8a7660**. It constructs the exact header
**`X-PV-AccessToken`** G8a7664/668 and copies that returned token into its
header map G8a7670..674. This is the shared-secret EXCHANGE transport token,
not account OTP, vs_token, nickname, Guild ID or a guessed Chat credential.
The map is passed with the selected URL into CSRChatModule.Connect G8ada64
(call sites G8a7952/G8a797e/G8a7a58). Module.Connect delegates asynchronous
socket creation using the supplied URL and headers; the encrypted frame uses
the same HTTP shared-secret owner as previously closed.

Consequently the future server must select a transport key by this header
and independently require an established authenticated account binding.
Possessing an anonymous exchange token alone is not proved room membership.
Frame command/tag/payload pvid must not substitute for connection identity.
No private token value is captured or printed by this audit.

## Exact three module URL choices

The URL values come from **CPVDataMgr.GetBaseInfo G7e0ecc**, accessed through
the manager singleton G7e15dc. These are named URL values, not request keys
that should be sent back inside the message body:

- moduleTYPE0: **`new_chat`**, G8a7710/712 -> GetBaseInfo G8a7714.
- moduleTYPE1: **`guild_chat`**, G8a7772/774 -> GetBaseInfo G8a7776.
- moduleTYPE2: **`chat_whole`**, G8a76c8/6ca -> GetBaseInfo G8a76cc.

TYPE1 first requires personal Guild ID nonzero G8a7758..7762 and status3
G8a776c/777a..777c. A pending applicant must not be connected as a Guild
member merely because personal guild_id is nonzero. Missing URL/affiliation
takes the close/error branch G8a77d0..77de. Other modules also close when their
selected URL value is absent. The exact original host/path strings and complete
base-info URL publication mapping remain a separate configuration seam.

These module selectors are distinct from message outer commands. For normal
Chat message sending the original module command array maps TYPE1 to11000,
while TYPE0/2 share10010; see guild-fuel-chat-producer-native-2026-10-13.md.
That does not collapse all modules into a shared room or permit cross-Guild
broadcasting. Server room scope must use its authoritative account/server/
joined-Guild record rather than user-supplied message metadata.

## Socket-ready callbacks do not send a Guild enter payload

Connect binds these callback vtables/operators:

- TYPE0: VA2142d98, **G8a9dc6**.
- TYPE2: VA2142ef4, **G8aa3ae**.
- TYPE1: VA2142e74, **G8aa044**.

The TYPE0/2 operators only store per-module statebyte3 when callback result1
and statebyte1 otherwise (G8a9dd0..dd6/G8aa3b8..3be). They do not send an
enter packet in these bound bodies.

TYPE1 sets state3 G8aa068..06e, resolves the current Guild's cached INFO/name
G8aa070..09e, and constructs a LOCAL welcome chat-log entry command10001
(G8aa0bc..0c4). It adds this to CSRChat.AddChatLog **G8aa13c**, then resets
the chat-log Guild binding through SetChatLogGuildID G8aa148. This is a local
display/log effect, not a socket send. No Send/EnterChannel invocation appears
in the complete TYPE1 operator. Do not require or generate an invented
Guild20000 enter, Guild-ID join payload or welcome network event to emulate it.

This source behavior permits a correctly authenticated Guild endpoint to
derive room scope from current joined membership. It still does not prove
original disconnect, reconnect, membership-change invalidation or room fanout
policy; those are required when implementing a real listener.

## Explicit public EnterChannel command and payload

`CSRChat.EnterChannel` **G8a8ea4** accepts an integer channel and returns
without sending when outside **1..9999** (subtract1/compare9998 at
G8a8ebe..ec6). It stores the chosen channel under the local option
user_try_channel G8a8ed0..eea, then sends through **moduleTYPE0** with
outer command **20000 /0x4e20**, G8a8f44..54.

`enter_message.to_json` **G8a949c** has exactly **`{channel:int}`**. Key
channel G8a94c0/4c4; value is signed32 from message+4, sign-extended before
JSON integer storage G8a94be..4cc. No auth token, pvid, Guild ID, nickname,
recipient list or payload type is produced by this DTO. The derived enter
message wrapper adds it as payload to the already closed base request JSON.

A halfword-aligned direct BL scan of original ELF610000..1c00000 found only
this EnterChannel call to the concrete Send<enter_message> wrapper G8a9008
(G8a8f54). This negative alone does not exclude arbitrary indirect/external
calls, but the positive bound Guild-ready body above supplies no enter send.
Public channel-response callbacks update recent/try channel options and can
invoke EnterChannel again (G8a7e58); they must not be borrowed as Guild room
authorization. Exact enter response/error/history DTOs remain another unit.

## Implementable scope and limits

The connection header now supplies a source-backed existing shared-key
selection seam. Logical public channel enter validation can enforce source
1..9999 and exact payload.channel while preserving module separation.
Guild socket scope requires actual joined status3 on BOTH client producer and
server admission, with authenticated account/key ownership and same-server
Guild members. No client room identifier needs inventing for TYPE1 readiness.

The pure encrypted frame codec is already independently verified. Before a
listener, complete URL publication, account/key binding, control/enter reply
JSON schema, fanout ownership, lifecycle and anti-spoof admission must be
explicitly closed. Fuel request creation/AP support is a further application
transaction, not activated by accepting a socket or public enter DTO.
