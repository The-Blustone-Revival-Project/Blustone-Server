# Durable established Guild membership projection

Explicit `guilds` records in a local save are now validated and retained through
restart and unrelated persistence, then projected by authenticated
/lobby/GetGuildInfo. No request creates a Guild or assigns a player to one.
There are no default Guild instances, recovered original membership rows or
new creation/join/GvG/reward transactions.

Each record uses the existing native Guild INFO/member schema. INFO IDs must
fit uint32 even though detail requests carry uint64 lists; wider saved IDs
refuse before writes rather than alias after native narrowing. All members
must already be local accounts on the same server; each account belongs to at
most one Guild and each Guild has one leader. Emblem IDs must exist in the
hash-pinned original GUILD.jet. Native joined status3 and role enums1..4 are
preserved; personal contribution is distinct from Guild-wide contribution.
Membership identity/authentication is local-save authority, not proof that an
imported Guild ever existed on the original service.

The server refuses malformed records, unknown accounts/emblems, duplicate IDs,
conflicting memberships, mismatched member counts and unsupported top-level or
member history fields. Review caught silent loss of extra member history;
import now refuses before any file write. Omitted legacy guilds stays omitted
and existing unaffiliated accounts keep the five-zero native lobby subtree.

Guild reads neither mutate gameplay nor regenerate fuel clocks. Unrelated
successful account writes retain membership records, including canonical
member count. Restored affiliation also reaches existing equipment/Gem benefit
gates so joined members cannot accidentally use the no-Guild economic path.
The exact /guild/GetDetailInfo read now returns full established same-server
INFO rows under ret_data.guilds from the singular guild_id array-form string.
It does not alter personal my_guild; creation/join/action/fee/participation
rules remain gated. See the native detail audit for request/response/cache
behavior and the distinction between request and response identity widths.

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --profile current-e6-guild --exercise-guild-records --exercise-gem-level-reference
```

Compiled encrypted proof uses explicitly authored leader/member records,
separate authenticated transport sessions, distinct personal contributions,
unsupported-action refusal and restart preservation. It verifies the original
GUILD package bytes/hash/ranges under the inactive140-package profile. Gameplay
fields remain exact except legitimate lobby AP/BP clock advancement. Focused
tests cover unrelated writes, auth, detached outputs and byte-preserving refusal
of malformed imports, including unsupported member donation history.

Default live profile stays139; no actual membership, live reload/save/client
input or APK change occurred. Native Guild menus remain unverified.
