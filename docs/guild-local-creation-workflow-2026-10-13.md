# Explicit local Guild creation backend

Creation stays disabled unless constructor guildCreationMode or
BLUSTONE_GUILD_CREATION_MODE is explicitly `local-gold`. The mode requires
selected original GUILD resources with the pinned SHA, and an explicit action1
gold2 row in guildPrices/BLUSTONE_GUILD_ACTION_PRICES_JSON. No original amount,
server admission or debit policy is implied by the supplied quote.

Found uses the six native fields name/desc/type/fc_point_limit/region/emblem_id.
Client fee, Guild identity and membership fields have no authority. The local
subset supports basic printable ASCII names/descriptions, native text lengths,
stock picker6, selected nonempty ASCII region and the native FC slider0..4000
in500 steps. Founder minimum level/FC, original region/font/bad-word corpora,
pending membership, cooldowns and registry policies remain unrecovered. No
unproved Guild setting or minimum level is manufactured.

An authenticated account with a recorded game, no joined Guild and no active
combat can create one after the configured fee check. Same-server name
collisions and repeated Found requests refuse. The new entity initializes one
leader(role1/newbie0), zero contribution/rank/GvG counters and a snapshot of
the local Arena rating. These are explicit local initial policies, not original
server-produced values. No rank, reward, items, cards or other membership is
granted. Imported same-server records are untouched.

The allocator publishes uint32 IDs, keeps nextGuildId durable and greater than
all existing IDs, and recognizes2^32 as exhausted. Missing legacy allocator is
derived from the current maximum for the first local transaction without a
startup rewrite. Gold, Guild records and allocator persist together; a failure
restores original arrays/counter/wallet before returning success. Corrupt or
colliding saved counters refuse startup without file replacement.

The receipt has flat my_guild, complete guilds[] and user.gold with BOTHprev
andcur. Generic SyncUser ignores cur-only gold. Existing equipment level/rank
and Gem-mount callbacks are different: direct cur setters at Gf5bc1c/f5bc6a,
Gf5c6ae/f5c6fc and Ga5cac2/a5cb12, with no bounded direct SyncUser call. Their
cur-only receipts remain valid; do not generalize the Found receipt to them.

Found's actual callback updates manager caches, but its returned callback INFO
remains default in the examined body. Native creation menus therefore remain
unverified even when the backend receipt and persistence are correct. A lost
first response needs wallet/Guild refresh; no universal successful retry or
original nonce semantics is promised.

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --profile current-e6-guild --exercise-guild-local-found
```

The disposable encrypted proof charges authored17 gold(100→83), creates ID1,
checks sole leader/cache receipt, refuses replay without another write/charge,
reads the new Guild through search/lobby, assigns no rank and survives restart
with nextID2. Focused tests cover native text/slider/parser bounds, auth/client
override refusal, duplicates, funds, original-source selection, rollback,
corrupt allocator and a second distinct founder/ID. Existing gameplay and
unrelated accounts stay exact apart from normal proof lobby fuel clocks.
No live enablement, save/profile/client/input change or APK build occurred.
