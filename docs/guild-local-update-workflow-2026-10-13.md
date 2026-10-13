# Explicit local Guild settings updates and wallet correction

Default Update mode is disabled. Constructor guildUpdateMode or
BLUSTONE_GUILD_UPDATE_MODE=`local-manda-free-first` enables the local backend
under a selected/hash-pinned original Guild resource profile. Original server
debit priority and full permission/admission parity remain unverified.

The native request contains six settings, without a Guild ID or fee. The
authenticated actor's single established affiliation determines the target.
Leader1/supervisor2 management UI access is proven; using those roles as server
authorization is explicit local policy. Members, rank, contribution, GvG
counters and allocator are preserved. No join, role change or reward is granted.

Local ASCII/text/FC/region bounds match the supported creation subset. Changed
emblems require stock picker6; unchanged admitted emblems remain intact. Other
same-server name collisions refuse. Name and region changes use action2/3
Manda1 quotes respectively, with explicit free-first spending. Missing changed-
field quotes refuse even though native FindPrice displays0 for missing data.
Unchanged name/region means other metadata changes have fee0 in this local
mode. Exact repeated settings return current data with no fee/write.

The native RequestModify callback uses the first returned full INFO, unlike
Found's examined default callback INFO path. Responses retain flat my_guild,
full guilds[] and generic user currency data. A critical follow-up fix applies
to BOTH Found and Update: SyncUser reads paid/free quantity scalars
unconditionally, so omitted values overwrite client Manda with0. The shared
guildWalletReceipt helper validates explicit uint32 snapshots before commit
and supplies gold/iap/free_iap prev-cur objects plus coherent mandatory
iap_qty/free_iap_qty. Found now uses it too, including oversized-wallet refusal.

Guild settings and both Manda wallets persist atomically; a write failure
restores original records and balances. No-op retries echo updated metadata
and authoritative quantities to repair a lost first response. This is state-
derived behavior, not original nonce or universal retry semantics.

The original BADWORD_RO table exists with five language dictionaries. Earlier
claims that its corpus was absent were too broad; locale selection/matching
and complete font/region/pending admission semantics remain unproved. No
dictionary matching policy or founder minimum level was invented here.

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --profile current-e6-guild --exercise-guild-local-update
```

Encrypted disposable proof creates ID1 for authored17gold(100→83), changes
name/region for authored23+31Manda(50paid/5free→1paid/0free), verifies every
currency pair/scalar and current full records, repeats without another debit/
write and restarts. Existing membership/rank/other gameplay remains exact
apart from normal lobby fuel clocks. Focused tests include privilege/target/
client-price protection, free metadata edits, supervisors, rollback and other
wallet preservation. No live mode enablement or native UI validation occurred.
