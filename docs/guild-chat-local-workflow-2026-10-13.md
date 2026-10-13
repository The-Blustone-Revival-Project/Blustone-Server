# Opt-in local Guild text service

`BLUSTONE_GUILD_CHAT_MODE=local-memory` enables the Guild socket on the existing
HTTP server at `/chat/guild`. Default mode is disabled. `npm start` attaches it
and advertises only the native `guild_chat` URL in launcher/account URL lists;
no public `new_chat` or `chat_whole` service is implied. Embedders using createApp
and their own HTTP listener must call attachGuildChat themselves.

The mode requires already established local joined Guild records and bound HTTP
exchange sessions. It creates no Guild, account or membership. Original Guild
assets and references remain requirements for native rendering; enabling this
flag does not switch resource profiles or establish a visible game screen.
No live replica configuration or emulator input was changed during development.

Upgrade uses X-PV-AccessToken, current joined status3/nonzero Guild and valid
stored UTF8 nickname. Every sender and recipient is rechecked against the
original socket subscription's account/server/Guild. Leaving, banishment or
revoked bindings cannot retain access through an old socket. Membership changes
close/refuse the old subscription rather than silently moving it to a new room.

Only ordinary outer11000/inner11000 text is accepted. Broadcast payload uses
the authenticated sender's who/nickname plus message/type; client-added sender
fields refuse. Each recipient gets its own shared-key encryption, including
the sender's source-compatible own echo. Reply error.code0 and messageempty
match the Chat success domain. Empty accessToken is explicit parser-compatible
LOCAL policy, not a captured server token or key rotation. Request64 tag is
echoed as its low32 bits, matching the supported native response width; this
does not preserve full64 reply identity or establish a replay/nonce law.

This is an ephemeral joined-member fanout policy. There is no durable archive,
delivery guarantee, historical log producer, cooldown or deduplication policy.
GetChattingLog returns authenticated bare[] only in this mode; it clears the
Guild archived cache, whose source storage is separate from live socket logs.
Fuel/support/control/public-channel requests refuse2001 and grant nothing.
Incoming frame and queued-byte caps65536 are local transport limits, not
recovered original character limits. Plaintext/corrupt/non-UTF8 packets close.

The service uses ws with noServer upgrades, authentication before handleUpgrade,
compression disabled and shutdown termination before HTTP drain. Library API
guidance: [official ws authentication examples](https://github.com/websockets/ws#client-authentication).
Native wire and renderer-consumer evidence is in
native-guild-chat-ordinary-text-2026-10-13.md and
guild-chat-history-empty-native-2026-10-13.md.

`tests/guild-chat.ts` opens real loopback WebSocket clients against disposable
accounts/keys/Guild records. It proves encrypted own/member echo, distinct-Guild
isolation, authoritative sender metadata, UTF8 and exact tags, pending-user
refusal, newcomer admission, spoof/fuel refusal, malformed/plaintext closure,
leave/revocation, opt-in URL/archive behavior, restart without invented history
and byte-identical saved gameplay. It sends no human or live game messages.
BlueStacks/native-pixel verification remains pending under the input hold.
