# Guild fuel Chat commands: empty creation request and support broadcast payload

Original bounded native evidence, no transport/server/request/AP mutation.
No live input/save/client/APK or DataDump changes. Immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code plus10000. This extends the fuel request-list and
constructor-default audits; ordinary Shop fuel is unrelated.

## Request creation uses Chat, not an invented HTTP RequestFuel

CSRPopUpChat.OnButtonClick Gba46c4 checks the Guild Chat module connection
in its requester path at Gba4b20..4b2c. At **Gba4b30..4b4e** it calls
`CSRChat.Chat(moduleTYPE1,command0x2b02,message)`:

- Gba4b34/4b3c resolves the original **empty string**; std::string construction
  is Gba4b40.
- Gba4b46 sets moduleTYPE1.
- Gba4b48 sets command **0x2b02 = 11010**.
- Gba4b4e calls CSRChat.Chat G8a5bd4.

No request ID, AP quantity, timestamps, type defaults or client-authored
FUEL_INFO are supplied in this creation message. The native button path also
contains existing-time/connection error branches. Empty message is not an
empty JSON object; do not substitute `{}` or add guessed input keys.
Server-owned request allocation, expiry, repeat admission and sender binding
must be recovered or labelled separately before creating records.

## Support's HTTP result is subsequently broadcast through Chat

The already known SupportFuel HTTP request submits request_id:uint32 and
its success callback supplies the updated FUEL_INFO. The Chat UI continuation
at **Gbad4de..4fc** calls CreateFuelJson Ga82024 with
**command0x2b03 = 11011** and that current record, then calls
`CSRChat.Chat(moduleTYPE1,command11011,serializedString)`.

CreateFuelJson's exact JSON string fields are:

```text
type: command argument, not FUEL_INFO.type
id: record request ID uint64
pvid: request owner uint64
expdate, regdate, supports, supported: supplied record values
```

The `type` key is resolved Ga82032/3a. It stores incoming command r2 at
Ga82038, signed-extends Ga8204c and writes that JSON integer Ga8206c/78.
It does NOT serialize record.type at struct+1c. Thus this producer's
inner JSON.type is11011, not a guessed0/1 fuel category. Remaining key sites
are id Ga82090/96, pvid Ga820ca/d0, expdate Ga82106/10a,
regdate Ga82140/144, supports Ga82178/184, supported Ga821b8/1bc.
The factory emits no result_code/user/AP field. Incoming server messages must
therefore add the actual result envelope semantics rather than blindly echo
the submitted string and call it a successful authoritative update.

## Two command layers precede the binary transport

CSRChat.Chat G8a5bd4 selects its module and loads an outer command from a
three-word original array at ELF1dce5b0: `[10010,11000,10010]`.
The moduleTYPE1 lookup **G8a5bfc..c04** selects **11000**, then tail-calls
CSRChatModule.Chat G8ae408 at G8a5c0a. That method receives outer11000,
inner11010/11011 and message string.

CHAT_SEND_PAYLOAD.to_json **G8aee98** creates the ordinary payload object
with **`message`** string (key G8aeee4) and **`type`** inner command
(G8aef1e). Thus the logical creation payload is `{message:"",type:11010}`;
the support payload is `{message:"<CreateFuelJson JSON text>",type:11011}`.
Outer11000 is a separate CPV Chat request command, not another inferred
JSON `guild_id`/`channel` field.

CSRChatModule.Chat then calls **CPVChatRequestMessage.encrypt G7d913c**
at **G8ae4ea**. Its result is sent through the module's binary-vector Send
path. These logical DTOs do NOT establish complete WebSocket framing,
authentication, encryption, message packing, reply command/header, room
membership or fanout. Do not implement a plain JSON WebSocket handler merely
because the inner fields are now known. No transport adapter is activated.
Follow-up exact envelope closure is now in
`native-chat-encrypted-frame-2026-10-13.md`: bytes50 56 13 00, the existing
HTTP-owned cipher vector, then SHA256 of exact plaintext. Account/socket
binding and application schema remain separate; no fuel transaction follows.

## Fuel receiver and AP boundary

`ParseFuelMsg` **Ga6da48** parses a JSON STRING into an object at
Ga6da8a..da92. It requires a nonnull pvid field Ga6dab4..dac6 and reads
**result_code** Ga6daca/dacc. That result goes to FUEL_INFO+10; the HTTP
ParseFuel constructor instead initializes this reserved/result slot to1.
The rest of the incoming row is pvid/id/expdate/regdate/supports/supported/type.
The incoming `type` is read independently; outgoing CreateFuelJson's command
binding must not be confused with a recovered AP category enum.

CSRGuild's Chat event handler **Ga6c8ec** selects command11010 at
Ga6c90c..912 and command11011 at Ga6c914..91a, then calls ParseFuelMsg
Ga6c9ae/Ga6ca70 and updates its owner-keyed cache/flags. Command11012 takes
the separate banish branch, which requests MyInfo; that request must not be
promoted as the fuel response mechanism. The Chat UI receiver likewise parses
fuel text Gba61f6, checks its result slot==1 Gba61fa..1fe, resolves cached
owner fuel Gba620e, compares owner to current account Gba6214..22c and
refreshes its request time display Gba623c.

No user/AP keys or SyncAP call appear in ParseFuelMsg, these bounded Guild
fuel-handler branches, or the complete known HTTP SupportFuel callback.
Their positive effects are request/cache/UI updates, **not native recipient
AP credit**. The original constructor values max5/fuelcount12 do not close
recipient wallet application, maximum/overflow, claiming, donor reward or
authoritative broadcast ownership. Another server event or refresh path may
provide it; this audit does not claim those paths do not exist globally.

## Concrete next implementation boundary

Logical request/broadcast DTO validation and offline command classification
are now source-backed. A real request producer still needs the original
binary/authenticated transport and server-owned identity/time/cooldown policy.
A real support transaction additionally needs recipient AP synchronization,
expiry/max/duplicate/retry law and contribution effects. None is recovered
merely by echoing CreateFuelJson or granting12 AP. Keep SupportFuel and Chat
request creation gated; the truthful authenticated no-request list remains
available without inventing any of these transactions.
