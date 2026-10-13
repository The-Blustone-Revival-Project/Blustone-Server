# Opt-in public channel Chat

`BLUSTONE_PUBLIC_CHAT_MODE=local-memory` advertises native `new_chat` at
`/chat/public` and enables public sockets on the existing HTTP server.
The Guild flag remains independent; both default disabled. No `chat_whole`
service, system announcements or original channel allocation is implied.
Use the normal npm start entry point. Embedders call attachLocalChat once;
the Guild compatibility entry point shares the same idempotent dispatcher.

Public admission requires an existing bound HTTP exchange account, current
server identity and valid stored UTF8 nickname. It does not require Guild
membership. Each sender and recipient is rechecked before delivery. Crypto
remains per-recipient; a realm change invalidates an old subscription instead
of moving it automatically. Public and Guild sockets never share delivery,
even for the same account/key or coincident room numbers.

On connection the service sends source-compatible command1/error0 with null
payload. The native branch consults only an existing recent-channel preference;
there is no captured random or fixed fallback. The server assigns no channel
at upgrade. Explicit command20000/payload{channel} admits1..9999 and returns
the same command with payload.channel. This virtual channel range/allocation
is local policy matching the client selector, not recovered production room
capacity or persistence. Invalid entry refuses and preserves the old channel.

Normal requests use outer10010 and inner10002 with message/type. This service
chooses the independently supported plain response command10002 with exactly
who/nickname/message. The sender is derived from authentication, and own echo
is delivered alongside other subscribers in the same server/channel. Typed
receive command10010 is another valid client path; **10003 is not that path**.
The earlier interpretation was corrected in the source notes. Text before
entry, forged sender fields, unsupported commands and fuel actions refuse.

As with Guild text, accessTokenempty and low32 request-tag echo are explicit
supported local response policies. No durable history, replay guarantees,
cooldowns, awards or wallet changes are introduced. Resource profiles and
live flags were not activated. Native UI verification remains pending.

Real loopback fixture tests cover bootstrap, explicit entry, unentered refusal,
own/member echo, four authenticated accounts across two channels/two servers,
channel switching, rejected entry, sender spoofing, stale realm closure and
byte-identical saved gameplay. Mixed-mode tests prove private Guild text stays
out of public sockets and both service entry points attach only one upgrade
handler. All packets and accounts are disposable authored fixtures.

Source evidence: native-public-chat-producer-bootstrap-2026-10-13.md and
public-chat-channel-response-native-2026-10-13.md. These establish consumer
behavior; original channel topology and server producer choices remain unknown.
