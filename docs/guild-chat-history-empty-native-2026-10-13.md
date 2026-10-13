# Guild GetChattingLog: bare history array and actual cache replacement

Bounded original source evidence only. No history, messages, dates, listener,
input/save/client/APK or DataDump changes. Immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code plus10000; vtable VA maps to file minus1000.

## Exact route, callback and no-history response

CSRGuild.RequestGuildChatLog **Ga6e078** submits auth5 only; route literal
**`/guild/GetChattingLog`** resolves Ga6e2ea/2ec. No client Guild ID, limit,
cursor, timestamp or archive selection is sent.

Inner `$_11` E0 wrapper string ELF1df352d binds RTTI VA214edd8, vtable
VA214edac, callable ELFa75dbd/**Ga85dbc**. It checks HTTP/PV result1
Ga85de2/4, selects **ret_data** Ga85de6/ea and passes that subtree DIRECTLY
to **ParseChatLog Ga681b8** at Ga85df4. There is no chat_log/history/messages
named child. The captured caller receives only status.

The supported canonical response for **no stored local archive** is therefore
**`{result_code:1,ret_data:[]}`**. Do not return an empty string, metadata
object, nested collection or fabricated welcome/history row. Existing native
socket-ready Guild welcome is local display logic, not an archived server log.

## Cache semantics differ from Fuel requests

ParseChatLog always clears its current CSRGuild archive list at manager+e8/
ec/count+f0 BEFORE iterating the selected subtree (Ga681d6..Ga6823c).
An empty array thus authoritatively replaces this archive cache with no rows.
That is distinct from GetFuelRequests' upsert/no-clear semantics.

The archive is also distinct from CSRChat's LIVE log at manager+e0/e4/count+e8.
Returning empty HTTP history does not itself erase the live socket log or
implement durable history deletion/reconnect policy. It means this replica
has not persisted historical messages, which is truthful while any local
listener remains explicitly ephemeral. Publishing such a read grants no room,
sender authority, AP support, account or other game mutation.

## Nonempty row shape for a later independently supplied archive

Each row selects exact **`sent`, `pvid`, `type`, `name`, `message`**:
sent Ga682ac/b4, pvid Ga682b8/ba, type Ga68380/84,
name Ga683d8/dc, message Ga683f0/f2. Name/message use strict string conversion
Ga683ec/Ga68404. History name is not live payload.nickname, and pvid is not
live payload.who. Do not substitute live DTOs without a proved mapping.

Sent integer reads full64 Ga682fa and divides by1000 Ga68324..32c before
storing the native timestamp. Thus its producer unit is milliseconds in this
consumer, not an invented Unix-seconds row. PVID integer reads BOTH words
Ga68350 and preserves the full sender identity; loose string/double conversion
does not establish safe exact64 string identities. Type reads a raw integer
and stores the command word; production type/time/ordering/fanout provenance
still need an actual archive producer.

The parser compares both sender words against the current account at
Ga68496..4a6, selects own style3/other style4 Ga684a8..4b0 and inserts rows
at the list FRONT Ga684d0..4e4. Wire order is therefore reversed internally.
This does not prove the backend's chronology, retention count or replay law.
No nonempty archive or historical sender metadata is fabricated here.

## Safe integration boundary

Authenticated GetChattingLog can now return the exact bare empty array while
no local archived-history producer exists. Preserve the save and all account/
Guild/wallet/clock fields; room admission belongs to the independently checked
socket session/membership seam. This read must not enable public/general Chat,
fuel control commands, claiming or a production-persistence assertion.
Native UI verification remains pending while live inputs are held.
