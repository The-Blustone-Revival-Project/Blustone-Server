# Guild Banish: exact target, authoritative scalar ban history and cache boundaries

Source recovery only; no mutation helper or Server state was changed by this
lane. DataDump/native originals remain read-only. No live save, process, device
input or APK operations occurred. Banish must not be implemented as ordinary
member removal followed by unrestricted rejoining: its native ban-list consumer
is now explicit. Original producer lifetime, permissions and event broadcasts
remain separate unknowns.

Immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Coordinates are Ghidra; ELF code offsets subtract0x10000. Read-only symbol
locator: DataDump `sources/native/symbols/native-evidence.tsv`. Bounded Thumb
bytes and ELF RTTI/vtable links were checked independently.

## RequestBanish sends one decimal scalar target_pvid

CSRGuild.RequestBanish Ga78c00 has mangled signature `Ey` (uint64), not
unsigned32 at the service boundary. It captures incoming r2/r3 into r8/fp
at Ga78c10/Ga78c14. At Ga78d5e..64 it passes BOTH halves to uint64
to_string, then assigns exact form key **target_pvid** at Ga78d6a.
Route is **/guild/Banish** at Ga78ebc. The body is auth5 plus this one plain
decimal string, never JSON array. It contains no Guild ID, role, price,
reason, ban expiry or caller-supplied member/history collection.

The ordinary current MEMBER consumer is narrower: ParseMember Ga6b4b0 reads
pvid's integer low32word at Ga6b4ec and stores zero highword at Ga6b51e.
Therefore a supported current local member/management workflow must keep
account IDs<=uint32; wide uint64 service serialization does not repair native
MEMBER aliasing. The original allocator is not recovered from these widths.

## Actual RequestBanish receipt does not clear actor affiliation

RequestBanish `$_26` inner RTTI string ELF1df9d29 links through RTTI214f558 /
vtable214f52c to callable ELF a7ea11 (Thumb), Ghidra Ga8ea10. It requires
result1 and selects ret_data at Ga8ea44.

Optional my_guild is selected Ga8ea70/Ga8eab8 and sent to ParseMyInfo at
Ga8eac2. Optional guilds is selected Ga8eaea/Ga8eb34 and sent to ParseGuilds
at Ga8eb44. Optional user goes to generic SyncUser Gb7047c at Ga8ec02;
achievements are independent optional consumers. Callback returns status only.
There is no unconditional actor PLAY_DATA/cache reset and no direct captured
target erasure in this network callback, unlike Leave/CancelApplication.

A wallet-neutral supported response should omit user or use user:null; a
nonnull user object needs authoritative paid/free scalars and coherent changed
wallet previous/current pairs. A manager receipt should preserve the actor's
own authoritative affiliation and return FULL updated Guild INFO/member/ban
collections, not a guessed target-account personal reset.

Removing another member does not directly clear that other device's personal
Guild scene through this actor's HTTP response. Original chat/mail/notification
producer and delivery behavior remains unreconstructed; later authoritative
target account reads can reflect removal without claiming realtime parity.

## Exact banished wire shape is scalar uint64 collection

ParseGuild Ga6a384 selects **banished** at Ga6ab5e. Missing/null branches
around replacement at Ga6ab68, preserving cached unknown/prior history. When
nonnull it clears the cache's map-node+88 list at Ga6ab6c..9c, selects the
collection again at Ga6aba0 and iterates EACH VALUE at Ga6ac32/34.

The element itself is parsed as uint64: numeric integer branch Ga6ac4e
loads both words; string branch uses strtod Ga6ac62→uint64 conversion
Ga6ac70 and can round large IDs. Each result is appended to a16-byte list
node at Ga6ac78..94. There are no {pvid,time,reason,operator} history rows in
this consumer. The exact supported canonical field is:

```text
banished: [ <scalar integer PVID>, ... ]
```

Native generic iteration also has object-container branches, but the supported
replica can require a canonical array. Integer tokens retain full native64-bit
precision; current local IDs within uint32 avoid string-rounding concerns.
An empty array explicitly clears the entire ban list. Missing/null means
preserve cache, not proven empty history. There is no parsed ban expiration,
penalty amount or original duration in this field.

Other histories are distinct: rejected resolves Ga6acd6 and occupies INFO+6c;
banished occupies INFO+78; exited resolves Ga6ae66 and occupies INFO+84;
invited_guests resolves Ga6afde and occupies INFO+90. Do not swap those lists,
equate kicked members with ordinary exits, or manufacture empty sibling
histories merely to serialize a larger INFO object.

## Concrete history consumer: target-user status5

CSRGuild.CheckUserStatus Ga67ede takes a TARGET USER PVID, not a Guild ID.
It loads the actor's own my_guild ID at Ga67ef8 and looks up that Guild's
cached INFO, then compares the supplied target PVID against separate lists.
Its banished scan uses INFO+78 at Ga67fda/fe and compares both scalar halves
at Ga67fe8..f0. A match returns **5** at Ga67ffa.

Nearby results classify rejected as4, exited as6, invited guest as2 and
current application list as1. Those are target/menu classifications; they
must not be confused with personal PLAY_DATA.status (pending1/joined3).
This source proves that retained banished history affects native member/user
management presentation. It is not itself the unjoined user's fresh Apply
gate into an arbitrary target Guild.

The recovered ordinary Apply popup refreshes personal state and checks FC
threshold; a direct banished-list check in that flow has not been recovered
by this bounded pass. Original server ban enforcement/unban/expiry remains
unproved. An explicit local mode can refuse future Apply/approval to a Guild
with an owned ban record, but its enforcement/lifetime must be labeled local
producer policy rather than inferred as an original eternal ban.

## Separate local cache helper and permissions

CSRGuild.Banish Ga69ecc (distinct from RequestBanish) checks personal
role1or2 at Ga69ee8..f0 and requires the own Guild INFO cache. It copies
the member list into a temporary list, finds/removes a matching target at
Ga6a03e..5e and appends a scalar ID to cached banished at Ga6a062..8a.
The bounded bytes show no explicit reassignment of that temporary member
list back to the cached original; they also read target ID bytes from the
removed node after its deallocation. This original helper is not a reliable
substitute for a full authoritative members/banished receipt, nor proof of
remote server history policy. No original binary was patched here.

The role1/2 helper gate provides concrete manager-context evidence. It does
not establish self/leader/supervisor hierarchy, last-leader deletion, actor
affiliation, fees, cooldown or native UI acknowledgement rules. A conservative
local server should independently enforce known same-server ownership,
non-self/nonleader targets, supported role hierarchy and preservation of the
remaining known leader before emitting success. Such conservative admission
is explicit local policy until the producer rules are recovered.

## History completeness is a required boundary

Current imported Guild records deliberately omit histories that were unknown.
Replacing an absent banished field with [newly kicked target] could discard
previous native cached bans because the parser replaces the WHOLE list.
Do not retrofit unknown original histories as[] across all imports.

A supported Banish transaction needs an explicitly authoritative supplied
banished array or a newly authored local genesis with known-empty history.
It must preserve prior known ban IDs, remove only the owned target member,
update member_cnt and persist membership/history atomically before success.
Unrelated Guilds, pending applications, ranks/counters, wallets, Hunters and
other histories must remain exact. A separate explicitly local ban ledger
must not be reported as complete recovered original history.

No original unban operation, TTL, refund, chat payload production or penalty
was enabled by this evidence. Native UI and genuine remote state transitions
remain unverified.

## Invitation request boundary, not yet a restored workflow

Preliminary complementary byte recovery: RequestInvite Ga79804 sends auth5
plus scalar target_pvid at Ga7996e to /guild/Invite at Ga79ac0.
RequestConfirmInvite Ga71cf8 sends scalar guild_id at Ga71e64 and agreed at
Ga71e7a to /guild/ConfirmInvitation at Ga72000. agreed is emitted as1 only
when its incoming byte equals1, otherwise0 (Ga71e9a..a4).

IsInvitable Ga67eb8 requires own nonzero Guild ID, personal status3 and
role1or2. It has no Guild-type check; this is a manager UI predicate, not
permission to manufacture invitations for all records. Exact invitation
producers, visibility, pending mail/notification ownership and acceptance/
decline history remain separate recovery work. They stay unsupported here.
