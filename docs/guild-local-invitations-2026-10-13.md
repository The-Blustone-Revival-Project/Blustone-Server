# Local invitations, native Guild Mail and owned notification lifecycle

Default-disabled guildInvitationMode/BLUSTONE_GUILD_INVITATION_MODE=
local-invitations requires the complete enabled local-public-approval membership
mode and its explicit capacity/member role/newbie policy. That ensures the
native Mail YES pending-application cancellation path is available. Source
contracts and rendered-template consumers are documented separately; no live
game inputs, profile activation or APK changes occurred.

INFO.invited_guests is an object collection [{pvid}], unlike scalar banished.
Both optional histories must be explicit and authoritative before Invite.
Omitted legacy fields stay unknown and refuse replacement. Fresh local Found
genesis now establishes both known-empty histories. Imported guest IDs are
unique known same-server supported uint32 actors, outside this Guild's current
members and its local indefinite bans. Other unsupported histories remain out.

Joined manager1/2 sends one scalar target_pvid. Known unjoined same-server,
unblocked recipient receives one active offer and one native MSG2 atomically
with the full invited_guests update. No profile workaround exposes blocked
senders or recipients. Invitation does not assign personal status2: that value
was recovered only as an own-Guild target relationship classification. Pending
applications remain separate. Active duplicate offers are no-write retries;
incomplete imported producer ownership is refused rather than synthesizing mail.

The recipient owns a durable offer linked to its unique notification ID. MSG2
has native id/sender/guild_id/message/supplement/read/regdate fields; recipient
and deleted stay private. IDs are generated from a monotonic local uint32
allocator (2^32 exhaustion sentinel), dates use explicitly local epoch seconds,
and supplement is empty/opaque. These are authored producer choices. The
native invitation summary AND full letter body format sender nickname and Guild
name using original localized templates; popup markers are built internally.
No guessed supplement JSON, ordinary mail row or personal affiliation is needed.

ConfirmInvitation takes scalar guild_id/agreed0|1. Accept must own an active
offer, be unjoined and cancel any pending application first. Current FC rating,
idle gameplay, known bans and configured capacity are checked before appending
the configured member and consuming this Guild's offer. Those eligibility,
initialization, indefinite lifetime and contribution0 rules are local policy,
not recovered server defaults. Decline consumes only that offer and preserves
pending applications. Stale/absent/contradictory acceptance refuses: native
result1 would otherwise show false success and delete the letter. Accepted
replay succeeds only when actually joined that target; compatible decision
retries return current personal/Guild INFO without writes. All success uses
user:null, preserving generic wallet quantities.

Other Guild offers stay owned through unrelated joins; no automatic expiry or
rejection is invented. Joining this same Guild through public Apply or manager
approval fulfils its known pending offer and clears the corresponding guest
classification atomically. Notification rows remain until a separate native
Read/Delete operation, exactly as the Mail action flow requires. Deleted
ownership tombstones permit safe retries without ID reuse or letter revival.
Blocked/unavailable sender profiles omit a row from visible inbox publication.

Every cross-reference/import is validated before persist: sender/recipient/
Guild scope, message binding, unique active pair, supported identities/scalars,
unknown fields and allocator. Invite/accept writes restore Guilds, offers,
notifications and allocator together on failure; notification flag writes also
roll back. Hunters, wallets, progress, Arena, clocks and other Guilds stay exact
except the intentionally changed owned offer/membership records.

Sender lookup exposed a separate fidelity bug: the replica limited brief-user
profiles to3, but native CSRUserPool.FlushQueueUser batches5, while the general
relation requester serializes complete supplied vectors. The three-profile cap
was removed while preserving every per-ID same-server/privacy/presentation
guard; unknown and foreign profiles still refuse whole batches. No invitation
inbox cap was imposed to hide this incompatible profile seam.

Validation covers private acceptance/decline/reinvite, pending cancel gate,
capacity and both offer/write rollback paths, no personalstatus2, exact object
history, ownership/privacy/foreign IDs, atomic read/delete batches and tombstones,
decision retries, other-offer preservation, approval reconciliation, restart,
invalid-import byte preservation and five-user profile batches. Compiled
encrypted --fixture --profile current-e6-guild --exercise-guild-invitations
proves notification2, decline/reinvite, pending cancellation, private join,
separate mailbox deletion, no-write retries and exact persisted records across
process restart. Five authored games stay unchanged except normal registering/
lobby AP/BP clock anchors. No original player/Guild instances are claimed.

Native menu/inbox rendering remains unverified while inputs are held. Original
expiry, admission exceptions, broader event notifications and opaque supplement
semantics remain incomplete; full Guild/GvG functionality is not claimed.
