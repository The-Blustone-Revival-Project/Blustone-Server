# Established Guild discovery and supplied ranking reads

Authenticated /guild/Search accepts a plain keyword string. Authenticated
/guild/GetRecommendations sends auth only. Both responses use ret_data.guilds
with full established Guild INFO/member rows; no original page/cursor/count
fields were recovered. Local discovery searches names by case-insensitive
substring and lists the known same-server corpus in stable ID order. Empty
keyword matches all; empty corpus/no match returns[]. Discovery does not assert
join eligibility, assign membership or recover original recommendation scoring.

/guild/GetRanking is a separate callback: page/size are signed32 decimal form
fields, the tab starts page0/size10, and ret_data is a bare INFO array. Supplied
positive INFO.rank is the displayed rank; it is never recomputed from score,
contribution, member count or result position. Sparse/tied ranks remain intact.
Local ranking omits unknown rank0 records, uses rank/ID order and paginates the
known same-server subset. This is not a complete original global ladder or
reward policy. BigInt multiplication preserves huge page offsets accurately.

The state handlers authenticate before selecting rows, preserve personal
my_guild and all gameplay/history/wallet fields, and return detached data.
Malformed queries refuse without writes. Private/permission join modes remain
distinct from ability to list public INFO; production visibility rules are
unrecovered and same-server public selection is explicit replica policy.

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --profile current-e6-guild --exercise-guild-records --exercise-gem-level-reference
```

Compiled encrypted proof checks keyword hit/miss, full known recommendations,
the ranking bare-array distinction, huge signed32 pagination, original Guild
package hashes/ranges and unchanged established state across restart. Focused
state tests include multiple servers, unknown/empty records, sparse ranks,
detached member data, authenticated errors and exact save-byte preservation.
All105 configured server checks and build pass; independent review found no
concrete defects. Native discovery/ranking menus remain unverified.

No live activation, profile/save/client/input change, membership/reward grant
or APK build occurred. The previous Escape input hold remains. DataDump Latest
was freshly checked on2026-10-13 and remains2026-10-11.2; no newer published
tables were available in that check.
