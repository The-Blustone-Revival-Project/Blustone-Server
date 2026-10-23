# Native Mail contracts and existing mailbox transaction gap

Read-only audit of Server `src/mail.ts`/`ServerState.mailAction`, recovered
DataDump Mail dumps, and the immutable original ARM library. Fresh original
SHA-256 is `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
original path is Instrumented
`local/legacy-analysis/extracted/lib/armeabi-v7a/libnative_core.so`.
Addresses below are Ghidra code coordinates, ELF plus `0x10000`.
No production/test/live/private/client changes or external messages occurred.

## Actual routes and callback ownership

The native network family is **`/message/`**, not guessed `/mail/Claim`,
`Receive`, or `Delete` aliases. Relevant original CPV producers are:

* `ReqGetReceivedList G7f89c8`: auth5 plus `start`, `length`, `after`, `before`;
  route `/message/GetReceivedList` resolves at `G7f8c86/G7f8c88`.
  Native signature is `start:uint64, length:uint32, after:uint64, before:uint64`.
* `ReqGetSentList G7f9338`: the corresponding `/message/GetSentList` producer.
* `ReqRead G7f9ca8`: auth5 plus scalar decimal `target_list`, route
  `/message/Read` at `G7f9f3e/G7f9f40`; argument type is uint64.
* `ReqArchive G7fa604`: auth5 plus scalar decimal `target_list`, route
  `/message/Archive` at `G7fa89a/G7fa89c`; argument type is uint64.
* `ReqRemoveReceived G7fc380`: auth5 plus comma-separated `target_list`, route
  `/message/RemoveReceived` at `G7fc5e4/G7fc5e6`.
  `CSRSyncMail::ReqRemove Gf7f138` appends a comma after each selected ID
  (comma literal `Gf7f16e/Gf7f17c`); accepting that terminal comma is required.
* `ReqGetTotalUnreadCount G7fe750`: `/message/GetUnreadCount` resolves at
  `G7fe982/G7fe984`. It does not claim a message or award a resource.

The game wrapper `CSRMail::RequestRead Gb4c1a4` distinguishes Guild notices from
ordinary post. Ordinary post calls `CSRSyncMail::ReqRead Gf7ef78`, which sets the
CPV request callback and invokes the ordinary Read producer. The inspected
wrapper also marks its local DATA row read before the asynchronous response
finishes. This optimistic client state is not server persistence or an attachment
claim. Guild notices have a separate `CSRGuild::RequestMsgRead` path.

## Supported list/read/archive/remove receipts do not synchronize wallets

`CPVMsg::ProcessCommonGetListComplete G800690` checks result 1 and selects
`ret_data` (`G8006d0/G8006d4`), **`unread_count`** (`G8006da/G8006de`), and
**`list`** (`G800728/G800730`). It parses each mail row with `ParseMsgInfo
G7ffd2c`. Thus the current named `ret_data:{unread_count,list:[...]}` envelope
is the correct family; a bare list or a game inventory receipt is different.

`ProcessCommonComplete G800c30` serves the targeted Read/Archive/Remove
operations. It checks result 1, selects `ret_data` at `G800c62/G800c64`,
`unread_count` at `G800c6c/G800c70`, and **array `target_list`** at
`G800cb8/G800cbc`. It updates cached flags or erases the matching IDs according
to the command. These IDs are native uint64; unread count is a low32/uint32
conversion. Request scalar/comma encoding and response numeric array are
deliberately different contracts.

`ProcessGetTotalUnreadCountComplete G801b20` likewise selects
`ret_data.unread_count` (`G801b48..G801b54`) and updates the counter.
These bounded callbacks have no `CSRPlayData::SyncUser`, AP setter, AddItem,
or AddCard application. The current no-attachment notice therefore has no
partial-user/Manda-reset issue: no `user` receipt is emitted or consumed.

Mail rows parsed by `G7ffd2c` include full64 message/sender/receiver identities,
content, dates and read/archive/attachment flags. The replica's uint32 IDs and
local timestamp policy are narrower authored choices. Its `attachment:null`,
`is_attachment_taken:1` notification makes no original item-definition or
unclaimed-reward assertion. Its sender and portrait are documented local display
identity, not an authenticatable external account.

## Attachment-taking is a separate, incompletely joined game capability

The original generic producer **`CPVMsg::ReqTakeAttachment G7faf60`** sends
auth5 plus **`message_id:uint64`** (`G7fb0d4/G7fb0d6`) to
**`/message/TakeAttachment`** (`G7fb1f6/G7fb1f8`). Read does not itself prove
that this producer is called. There is no recovered `Claim`/`Receive` synonym.

`CPVMsg::ProcessTakeAttachmentComplete G80101c` has its own contract:

* `ret_data` at `G801086/G801088`;
* **`content_result`** at `G801090/G801094`, copied as JSON into the callback
  result object; this alone does not interpret it as a card/item/AP grant;
* `unread_count` at `G8010cc/G8010ce`, uint32;
* `message_id` at `G801118/G80111c`, preserving its two-word uint64 identity;
* **`iap_quantity`** at `G801166/G80116c` and **`free_iap_quantity`** at
  `G8011be/G8011c0`, converted to uint32.

It marks cached attachment/read state (`G801258`, `G80125c`). It updates paid
Manda only if the decoded `iap_quantity` is **nonzero**
(`G801268..G80126e`, CPVDataMgr `+0x9c`), and free Manda only if decoded
`free_iap_quantity` is **nonzero** (`G801276..G80127c`, `+0xa0`). Those are
absolute writes, not additions, and a zero is skipped rather than clearing the
wallet. These selectors differ from generic SyncUser's `iap_qty` scalars.

The complete inspected callback does not call generic SyncUser, SyncAP,
AddItem, ParseCardInst, or AddCard. Its generic `content_result` is passed onward;
the actual game-specific consumer/attachment economics remain unclosed. The
retained Ghidra attachment-caller report finds only an unattributed reference,
and the recovered CSRSyncMail wrapper surface contains Enter/Read/Send/Remove/
Unread operations without a positively joined attachment-taking UI callback.
This is a bounded missing join, not proof of global dead code or impossibility
of an indirect caller.

Consequently the current refusal of `/message/TakeAttachment` is appropriate
for the no-attachment mailbox. Publishing invented attachments or treating
arbitrary `content_result` as the Special Supply/game reward schema would add
unsupported economic behavior. `Send`, RemoveSent and clear-list capabilities
also remain separate from the local victory-notice workflow.

## Concrete existing bug: failed mailbox persistence leaves live changes

`mailboxRequest` currently mutates its supplied live `MailState` and then calls
the provided persist function:

* Read/Archive set `row.is_read` / `row.is_archived` before persistence.
* RemoveReceived replaces `state.received` and pushes deletion tombstones into
  `state.deleted` before persistence.
* `ServerState.mailAction` passes `game.mail` directly and has no rollback.

A temporary-write or rename error can therefore leave live flags/deletions
ahead of the unchanged saved file; a retry/restart may disagree about unread
counts, visibility or ownership. This is a real transaction gap even though
the native receipt shapes and no-wallet boundary are correct. The fallback
`gameFor` in mailAction can also initialize/refresh state if an account lacks
an existing game; rejection/read handlers should not silently rely on that
when establishing an owned mailbox.

A narrow repair can plan mailbox changes on detached state and commit once,
restoring the original game/map/mail/array/row references on failed write or
rename. Keep local no-attachment contents, paging policy, trailing-comma
support and tombstone retry behavior unchanged. Verify real failed writes,
retry/restart, byte-exact peer/game/wallet/clock preservation, and response
detachment; an AP/Manda or attachment expansion is unnecessary for this fix.

Preserved read-only sources: DataDump `sources/native/economy/ghidra-mail-`
`{contract,contract-keys,removal,removal-keys,attachment,attachment-keys,`
`attachment-callers}.txt`. Concrete branches and literal resolutions above
were checked against the original ELF, rather than inferred from neighboring
Supply or Guild callbacks.
