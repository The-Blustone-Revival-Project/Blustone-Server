# Guild fuel request and support records — partial LOCAL workflow

This opt-in workflow reconstructs request creation, distinct-member support,
personalized Guild chat updates, and contribution points. It does **not** credit
AP. The original recipient AP payout and any payout timing remain unresolved;
the native constructor's `fuelcount=12` is not proof that each support pays 12 AP.
No native UI validation of this implementation is claimed here.

## Original receiver and producer evidence

Addresses below are original ARM Ghidra addresses in `libnative_core.so`, SHA-256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
The read-only original is retained under Instrumented
`local/legacy-analysis/extracted/lib/armeabi-v7a/libnative_core.so`.
Existing `guild-fuel-*-native-2026-10-13.md` reports provide the prior source
context. The date-field correction below supersedes their `+0x24=regdate` claim.

* Request creation: `CSRPopUpChat::OnButtonClick` `Gba46c4` checks the connected
  Guild module at `Gba4b20..Gba4b2c`, then calls Chat at `Gba4b4e` with module 1,
  command 11010, and an **empty string** (`Gba4b34..Gba4b48`). The client supplies
  no request identity, dates, support count, amount, or AP quote.
* `CSRGuild::RequestSupportFuel` `Ga7c898` sends the five authentication fields
  plus `request_id` as uint32 (`Ga7c9f8..Ga7c9fa`) to `/guild/SupportFuel`
  (`Ga7cb44..Ga7cb46`). The callback `Ga91698` checks result 1, then optionally
  parses `ret_data.my_guild` via `ParseMyInfo` (`Ga91754`) and `ret_data.guilds`
  via `ParseGuilds` (`Ga917da`). Its optional `fuel_requests` receiver consumes
  **only array element 0** (`Ga9188a..Ga91890`), `ParseFuel` (`Ga91898`), and
  `UpdateFuel` (`Ga918a2`). The reply's single row belongs to the request owner;
  `my_guild.contribution` belongs to the authenticated donor.
* `RequestFuelList` `Ga7bcdc` is authentication-only. Callback `Ga90d90` iterates
  `ret_data.fuel_requests`, calling `ParseFuel` at `Ga90f38` and `UpdateFuel` at
  `Ga90f42`. This upserts the owner-keyed cache; an empty list does **not** prove
  that already cached expired/departed requests have been removed.
* A successful donor UI callback builds `CreateFuelJson(11011)` at
  `Gbad4de..Gbad4ec` and relays it through Chat at `Gbad4fc`. `CreateFuelJson`
  `Ga82024` produces flat JSON `{type,id,pvid,expdate,regdate,supports,supported}`.
  Here `type=11011` is the chat command, not an inferred fuel category. Incoming
  `ParseFuelMsg` `Ga6da48` expects this flat message, including a server success
  `result_code` (`Ga6daca..Ga6dacc`); a nested HTTP `fuel_requests` envelope is
  unsuitable as the message string.
* The received Guild packet's `who` is the authenticated **sender/donor**;
  the message's `pvid` remains the **request owner**. `supported` must be
  personalized for each recipient, rather than echoing the donor's true flag.

`FUEL_INFO` stores PVID at `+0/+4`, request ID at `+8/+0xc`, support count at
`+0x14`, supported byte at `+0x18`, type at `+0x1c`, **regdate at `+0x20`**, and
**expdate at `+0x24`**. In `ParseFuel` `Ga6c4d0`, the expdate key is loaded at
`Ga6c598`/resolved at `Ga6c5a0` and stored at `Ga6c5e4`; regdate is loaded at
`Ga6c5e2`/resolved at `Ga6c5e8` and stored at `Ga6c62a`.

## AP boundary and useful supported behavior

`CSRGuild::UpdateGuildMessage` `Ga6c8ec` handles 11011 at `Ga6ca70`, checks the
owner/request identities at `Ga6cada..Ga6cae8`, and raises cached supports at
`Ga6caf2`. It has no AP/wallet mutation. The requester Chat UI path checks the
owner against current PVID (`Gba6214..Gba622c`) and passes **expdate `+0x24`** at
`Gba6236` into `UpdateFuelTime` (`Gba623c`). `UpdateFuelTime` `Gba3b34` subtracts
the current clock at `Gba3b5e..Gba3b60`, formats the remaining duration, and
updates request-button state. It is a cooldown display, not an AP grant.

The donor's `UpdateSupportProduct` `Gbab9a4` selects
`ContributionByAction(4)` at `Gbab9c4..Gbab9c6`. The displayed plus-number is
contribution. Missing action references return zero at `Ga7fb6a`; no original
action-4 magnitude has been recovered. The configured value is explicitly LOCAL.

The complete SupportFuel callback ends with `ParseLobbyEnter` at `Ga918b0`; it
does not select `user` or call `SyncUser`/`SyncAP`. Guild chat 11010/11011 likewise
does not trigger `RequestMyInfo`. That separate callback can synchronize AP:
`Ga865e2..Ga865ea` selects `ret_data.user`, `Ga865f6` calls `SyncUser`; its AP
branch requires both `ap.prev` and `ap.cur` (`Gb70a08`, `Gb70a1a`) and reads
`ap.ap_charge_time` at `Gb70aca`. Adding a fabricated AP object to SupportFuel or
chat therefore neither establishes the payout nor closes the observed receiver.

## Explicit local policy and transaction boundary

`guildFuelMode: 'local-requests'` (default `disabled`) requires persistent state,
`guildChatMode: 'local-memory'`, an explicitly supplied request lifetime of
1..86400 seconds, and all four contribution-action values with nonnegative
action 4. These are authored policy choices, not recovered original constants.
Only current joined members of the same server/Guild may participate.

The equivalent environment settings are `BLUSTONE_GUILD_FUEL_MODE=local-requests`,
`BLUSTONE_GUILD_CHAT_MODE=local-memory`, and
`BLUSTONE_GUILD_FUEL_REQUEST_SECONDS=<chosen lifetime>`, with an explicit
`BLUSTONE_GUILD_CONTRIBUTION_POINTS_JSON` map containing keys `1`, `2`, `3`, `4`.
Use the persistent state file option as usual. Enabling the mode creates no
requests until an authenticated joined member sends the native creation packet.
The existing live replica has not been switched to this mode.

The server allocates positive uint32 request IDs, sets registration/expiry from
its clock and lifetime, and retains each owner's latest request for cooldown.
Support accepts only authentication plus request ID, refuses self/duplicates,
foreign/expired/cancelled requests and a sixth distinct donor, then commits one
support and that donor's configured contribution to both member and aggregate.
It changes no account/game field, AP, wallet, roster or progress. The native
maximum five is source-backed (`Ga93e58..Ga93e80`); the constructor's adjacent
12 is deliberately not converted into economics.

11011 relay is a separate transaction bound to an already committed support
receipt. Its client JSON cannot create support, choose financial state, rewrite
counts, or impersonate the owner. Canonical fanout uses current count and each
viewer's supported status. A duplicate relay is refused without success replay;
it cannot repeat contribution. Transport delivery is not a durable outbox or a
claim that an already hot native cache repairs a lost response automatically.

Schema 20 carries the nonempty global `guildFuelLedger` with next ID, owner,
Guild/server, dates, cancellation and donor receipts (`pvid,at,points,relayed`).
Earlier headers refuse this field, and header 20 refuses missing/empty capture.
Disabling the feature retains existing records. Membership cancellation is
derived before serialization and published only after successful rename; an
owner leaving a Guild permanently cancels that request. Rejoining cannot revive
it or bypass its old expiry cooldown. A cancelled record can retain a deleted
Guild ID when its owner account is still known.

The focused state test covers real temporary-write and rename failures for
creation/support/relay, preserving persisted bytes and nested object references;
personalized replies, once-only contribution, maximum support, expiry,
cancellation/rejoin, old-header rejection and mode-off cold retention are also
checked. `node node_modules/tsx/dist/cli.mjs tests/guild-fuel-state.ts` passed
against the source integration on 2026-10-23. This is host state verification;
eventual native validation remains a separate check.

The transport test also passes through a real ephemeral loopback `createApp`
server: six independent signed P384 exchanges, AES HTTP registration/lobby and
SupportFuel, and native binary encrypted Guild WebSocket frames. It checks
recipient keys and supported flags, delayed two-donor relay count, foreign/public
isolation, no unsolicited HTTP fanout, forgery/duplicate refusal and persistence
failure before delivery. `npm run test:guild-fuel-records` builds and runs pure,
state, transport and older-system coexistence checks. The coexistence test keeps
genuine Mirage, fishing, Gem and active paid dispatch row/whole receipts under
schema20, including mode-off cold reload and unrelated saves.

Full `npm test` passed all 250 test programs (247 existing plus three new) on
2026-10-23. Logs: `local/guild-fuel-focused-20261023.log` and
`local/guild-fuel-full-tests-20261023.log`. Read-only integration review found no
concrete issues. This checkpoint does not enable the mode on the live replica.
