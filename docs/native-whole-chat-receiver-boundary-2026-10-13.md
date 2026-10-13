# Chat TYPE2 / chat_whole uses the social receiver, not a new generic room

Original bounded source evidence only. No whole listener, subscription/fanout,
announcements, catch/grant, live input/save/client/APK or DataDump changes.
Immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G coordinates are code ELF plus10000; callback/data VA maps to file minus1000.

## Positive module and receive binding

CSRChat.Connect G8a74c4 selects BaseInfo **chat_whole** for moduleTYPE2
G8a76be..6cc, using the same exchange X-PV-AccessToken and encrypted frame
owner already closed for other Chat modules. It sets module kind2
G8a7946..948. The ready callback VA2142ef4/operator G8aa3ae simply sets
per-module statebyte3 on result1, else1. It sends no enter or bootstrap packet.

There is NO separate OnWholeMessage symbol/body in the recovered owner class.
The actual TYPE2 receive callback is positively bound to **OnSocialMessage**:
G8a78fc/7902 resolves original pointer table VA21ac558 whose first word is
**ELF897bc1** (Thumb CSRChat.OnSocialMessage G8a7bc0); G8a7908 loads it,
G8a790e stores that member pointer and G8a792e installs the receiver bind.
This is stronger than inferring behavior from the name chat_whole.

It therefore uses the already closed direct response schema
`{accessToken,command,tag,payload,error:{code,message}}`, requiring callback
status0/error.code0 before payload processing. Native ready state does not
grant a public channel or prove a whole-stream subscription/room policy.

## Supported received shapes and command domains

The shared OnSocialMessage subtracts10002 and tests mask0x6fd over offsets
0..10. Generic accepted OUTER commands are:

```text
10002,10004,10005,10006,10007,10008,10009,10011,10012
```

Each consumes **`{who:uint64,nickname:string,message:string}`** through
message constructor G7d9e30 at G8a7cbc; AddMsg receives the OUTER command
G8a7cd0..ce6. These command acceptance bits alone do not prove all their
production event meanings or permit fabricating system messages.

The separate typed branch checks offset8, therefore **OUTER10010**,
G8a7d72/74 -> CHAT_RECVED_PAYLOAD G8a7d7c. It consumes
**`{who:uint64,nickname:string,message:string,type:uint32}`** and forwards
payload.type into AddMsg G8a7d92..da8. 10003 is NOT this branch.
Exact sender/name/string domains are the same as the public/Guild message
base already documented; pvid/nick aliases are not substituted.

Other shared branches include command1 public bootstrap preference handling
and command20000 assigned public channel. That is NOT evidence those packets
should be sent on whole sockets. Because the callback is shared, incorrectly
sending whole command1 can trigger TYPE0 EnterChannel from a recent preference;
incorrect20000 can rewrite the same current public channel. Do not invent
those control responses for TYPE2 readiness.

## Positive original announcement producer example

CSRMFishing.SendBroadCastMessage **Gb2f918** explicitly emits whole events:
calls **CSRChat.Chat(TYPE2,inner10021,JSON text)** at Gb2fb32 and Gb2fe00.
TYPE2's outer-command table value is10010, so these are typed announcements,
not plain ordinary player text or received outer10021.
Parallel calls use TYPE1 with the same inner10021 (Gb2fb68/Gb2fe36), showing
a distinct Guild announcement producer as well; this does not prove a server
should blindly copy all traffic between those endpoints.

The bounded factory selects reward references GC2/GC7/GC8/GC9/OV1 in one
branch (Gb2f9c0..fa02) and creates JSON text containing **user/item** with
item type/ref_id (key sites Gb2fa46/Gb2fa86/Gb2fa96/Gb2fae4).
Another branch creates **user/fish** with fish type/ref_id/length
(Gb2fc6c/Gb2fcac/Gb2fcbc/Gb2fd0a/Gb2fdb2). This is an original producer
example, not an acquired reward/catch instance or a reconstructed full set
of announcement JSON types/units/eligibility.

Authoritative catching, reward grants, rarity/record conditions and all other
announcement event producers remain separately missing. The submitted user/
ref/type/length text must not be treated as an authenticated backend event
merely because it decodes under the Chat key. Original event validation,
server enrichment, duplicate/retry handling and recipient scope are unknown.

## Safe next boundary

A source-shaped offline TYPE2 receive DTO/classifier is now possible, and an
empty ready socket would need no invented channel assignment. Neither point
establishes a useful original whole-stream fanout producer. Public ordinary
text does not acquire whole distribution by sharing OnSocialMessage.

Keep chat_whole unpublished/default-disabled until a real independently
sourced announcement or explicitly declared local event producer, event
authorization and recipient scope exist. Do not echo arbitrary client system/
catch/reward announcements or fabricate logs to make the endpoint nonempty.
The current public/Guild ordinary-only listeners remain correctly narrower.
No original whole events, live native pixels or new listener are claimed here.
