# Native Chat account/key bridge and pure JSON components

`ServerState.chatCryptoFor` reads the canonical lower-case upgrade header
`x-pv-accesstoken`, whose native wire name is X-PV-AccessToken. It requires an
existing exchange key and an account already bound by authenticated HTTP work.
It creates no key/account or fallback OTP/PVID credential. This is strict local
owner admission; actual client connection timing remains a device-validation
requirement rather than proof that every native connect is already bound.

The frozen context exposes only PVID/server ID and encryption/decryption
callbacks. Each operation rechecks key existence, the captured account binding
and current server identity. Header-object mutation cannot retarget a context;
removed accounts and ephemeral keys missing after restart refuse. Room/Guild
membership and lifecycle authorization must still be checked by a future
listener. No URLs, WebSocket listener or account-room registrations are added.

`src/chat-message.ts` decodes/encodes the separately recovered native body:
request command, exact64 tag, version, signed UTC rendered as a double, payload;
response accessToken, signed command, canonical32 tag, payload and error
code/message. Chat success uses error.code0. HTTP result_code1 is not a Chat
success envelope. Response tag canonical32 refusal is explicit local admission;
the native receiver itself discards upper tag bits. Exact64 request/sender IDs
use integer tokens rather than rounded numbers or native strtod string aliases.

Received Guild payload is who/nickname/message/type, distinct from the sender's
request payload. Public channel selection1..9999 is only client admission,
not a new room policy. Payloads remain detached JSON with exact unsafe numeric
tokens and finite float spellings; malformed UTF8, nonfinite or non-JSON data
refuse. Raw token validation must enforce numeric/finite syntax rather than
letting quoted surrogate strings bypass the ordinary string checks.
Array cloning requires the ordinary Array prototype and own indexed data;
sparse/inherited values and custom iterators refuse without being read. Safe
float identity spellings such as1.0/1e0 normalize to decimal1 under explicit
local/native-float-compatible admission; unsafe float tokens are not promoted
to exact64 identities.

Native source shows URLs new_chat(TYPE0), guild_chat(TYPE1 joined3/nonzero)
and chat_whole(TYPE2). Guild on-connect performs a local welcome-log update;
it sends no invented Guild enter packet. Public EnterChannel uses command20000.
Transport readiness, logical channel assignment and authenticated ownership are
three separate facts. A response error.code0 does not establish socket state.

Disposable tests exercise bound/unbound/unknown/peer key contexts, revocation,
restart refusal and byte-identical saved accounts/gameplay. JSON tests use
authored packet values and do not send messages or validate native rendering.
Source notes: native-chat-connection-enter-2026-10-13.md and
chat-response-entry-sinks-native-2026-10-13.md. The encrypted framing layer
remains separate; future socket/control/fanout behavior still needs validation.
