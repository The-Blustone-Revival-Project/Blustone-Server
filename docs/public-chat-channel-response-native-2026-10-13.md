# Public Chat channel/bootstrap and exact normal receive payload

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code convention ELF+0x10000. Direct bounded instruction/symbol/literal
analysis, DataDump read-only, Server document only, no connections/messages.

## Bootstrap command1 has no mandatory payload schema

Successful top response remains accessToken STRING, command signed32, effective
tag uint32, payload JSON and error:{code:0,message:STRING}. Unconditional strict
accessToken/error.message conversions are pinned in chat-response-entry-sinks-
native-2026-10-13.md. payload is copied as generic JSON, not strict object.

OnSocialMessage requires error.code0 G8a7c6a..6c. For outer command1 at
G8a7db6, its entire branch G8a7dba..G8a7e58 reads NO payload children.
It reads persisted user_recent_channel G8a7dc6..dd6; if that string is empty
G8a7df6..df8 it returns. Otherwise it parses the preference and compares it
with current Chat+28 G8a7e0a..10. Different preference is stored under
user_try_channel G8a7e20..36 and passed into EnterChannel G8a7e58. Equal
channel returns without an entry request. This establishes no implicit default
channel, channel allocation, token credential or room binding from payload.
An explicit supported bootstrap reply payload can be null or an empty object;
neither fills in a recovered mandatory child. The existing strict DTO encoder
requires the payload property as canonical local admission, not this consumer.

## Exact channel request and acknowledged assignment

EnterChannel G8a8ea4 serializes outer20000 at G8a8f48/54 and enter_message's
payload.channel at G8a94c4. Receiver outer20000 is identified at
G8a7dae..db4 and selects payload.channel G8a7f10/16. Signed32 conversion
G8a7f60 is stored into Chat+28 G8a7f68. The response is therefore SAME command
20000 with payload:{channel:acceptedNumber}. No channel_id, room_id, joined
PVID list or generic HTTP result_code wrapper is selected on this path.

Original public channel UI admission is now positively pinned:
CSRPopUpChatChannel.ResultCB Gbb0ae4 scans every input byte for ASCII digits
Gbb0b0c..1a. It parses the number Gbb0b1c and tests unsigned
(number−1)<9999 Gbb0b22..2a, proving inclusive1..9999. Invalid input shows
the original numeric-only/range toast; same currently assigned channel is
separately refused Gbb0b4a..52. Accepted number calls EnterChannel Gbb0bb6.
This is CLIENT selector admission, not original capacity/room-creation policy.
The listener can validate1..9999 under declared local admission without
inventing an auto-created native production room or initial selection.

## Normal10002 receive is THREE fields; typed10010 is FOUR

OnSocialMessage loads outer command G8a7c9c, subtracts10002 G8a7c9e..ca2,
bounds offset0..10 G8a7ca4 and tests mask0x6fd G8a7cac..cb2. Mask bit0 is
set, so ordinary received10002 goes into message parser G7d9e30 at G8a7cbc.
That parser inherits message_base G7d9cc8: who uint64 loads BOTH words
G7d9d12/stores G7d9d3e, nickname strict STRING G7d9d56. Its own message is
strict STRING G7d9e70. Supported ordinary public payload is exactly:

```text
{who:exactUint64,nickname:string,message:string}
```

The normal path does NOT parse type; CHATDATA.Add receives OUTER10002
as its protocol argument G8a7cd0/G8a7ce6. It does not need a Guild room marker,
PVID aliases, profile data or invented payload.type. Extra ignored fields are
not mandatory response grammar; a strict local producer can emit the three.

Mask also accepts generic10004..10009 and10011..10012. It excludes offsets1
and8. The subsequent typed branch G8a7d72 compares OFFSET r1 with8, proving
outer10010 (=10002+8), NOT10003. Earlier inference of typed10003 was incorrect
and the prior Server source note is corrected. 10003 falls through without
that typed parse. Typed10010 uses CHAT_RECVED_PAYLOAD G8a7d7c and requires
who/nickname/message plus inner type:uint32 G8aab9e..be8. Its Add protocol is
that INNER type G8a7d92/G8a7da8.

Thus two positively supported receive forms exist: normal10002 with three
fields, and typed10010 with four fields. Native outgoing normal text is
independently recovered as outer10010/inner10002 by the complementary lane.
The original SERVER producer's choice between the two receive forms is not
recovered from these client sinks. A local service may declare normal10002
broadcast with trusted who/nickname, but must label that fanout/protocol choice
rather than claim an original traffic capture. Do not echo10003 or interpret
request outer10010 as the message text's semantic command automatically.

## Limits of supported public service

Underlying transport readiness, authenticated X header/key binding, per-peer
encryption and authoritative sender identity are separate source/implementation
boundaries. These sinks do not authenticate payload.who, create channel members,
define fanout/capacity/persistence/rate/nonce rules or produce system notices.
No connection or public/Guild runtime change follows from this source document.
