# Guild Search and recommendations: reconstructed read contracts

`guild-discovery.ts` provides exact request parsing and explicit local discovery
over established same-server Guild INFO. It creates no Guild, membership,
application, invitation, fee or reward. Original production search matching,
recommendation ranking, result limits and join eligibility remain unrecovered.
No device input, live save/server, APK or DataDump content changed.

Source is the immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec` and
read-only DataDump `sources/native/symbols/native-evidence.tsv`. Addresses
below are Ghidra; subtract0x10000 for ELF. Bounded original Thumb bytes and
ELF RTTI/vtable pointers were independently checked.

## Native request fields

CSRGuild.RequestSearch Ga740a0 takes `string const& keyword` and callback
`(int status,list<INFO> const&)`. It adds form key **keyword** at Ga74218
and copies the original string at Ga74228. At Ga74230 it initializes six
form rows: five auth fields and keyword. Route **/guild/Search** resolves
at Ga74352. The keyword is a plain form string, not a JSON dump, ID list or
Guild name mutation. This consumer sends no page/cursor/limit parameter.

CSRGuild.RequestRecommandList (original spelling) Ga729b8 takes only the
same status/INFO-list callback, with no search argument. Its request carries
the five auth fields and no gameplay selection/pagination fields. Route
**/guild/GetRecommendations** resolves at Ga72c12. No keyword, tier, strength,
region or suggested eligibility is supplied by this native method.

The replica parser requires an object and, for Search, an actual keyword
string; it refuses other types. It preserves empty strings because this
request body provides no proven nonempty gate. Recommendations selects its
auth-only read behavior. Extra submitted pagination fields have no supported
meaning; the replica does not fabricate a corresponding pagination workflow.

## Exact callback wrapper and parser

Recommendation RequestRecommandList `$_18` outer RTTI string ELF1df61ce
links through RTTI214f118 and vtable214f0ec to callable ELF a795b5,
Ghidra Ga895b4. Its inner RTTI string ELF1df656a links through RTTI214f158
and vtable214f12c to callable ELF a798e1, Ghidra Ga898e0.

Search RequestSearch `$_20` outer RTTI string ELF1df6fe0 links through
RTTI214f218/vtable214f1ec to callable ELF a7a871, Ghidra Ga8a870. Inner
RTTI string ELF1df7379 links through RTTI214f258/vtable214f22c to callable
ELF a7ab9d, Ghidra Ga8ab9c. These links identify the actual operation's
callback rather than assuming a neighboring Guild method shares its wrapper.

Both callbacks check native success1 and select **ret_data** (Ga8991e
recommendations, Ga8abda Search). They check and select **guilds** at
Ga899ce/Ga89a18 and Ga8ac8a/Ga8acd4 respectively. ParseGuilds Ga6b340
is invoked at Ga89a26 or Ga8ace2, and the parsed INFO list is moved into
callback output at Ga89a38 or Ga8acf4. The consumed read shape is:

```text
{result_code:1,ret_data:{guilds:[established INFO rows]}}
```

my_guild/user/achievement are optional separate update branches, following
the same common Guild callback pattern as GetDetailInfo. Read-only discovery
does not require them and should not guess a personal affiliation or wallet
update. No pagination page/count/total/cursor metadata is parsed on these
callbacks; their C++ result is status plus INFO list. This bounded recovery
does not prove that production never imposed a server-side result limit.

## Explicit local corpus and matching policy

The pure helper publishes all already established Guilds whose known members
belong to the caller's server. It uses existing `guildDetailRows`/`guildInfo`
validation, original emblem references, positive uint32 Guild IDs and complete
joined member rows. Unknown accounts/corrupt affiliations are not repaired by
query-created data. No cache/history field is inferred beyond the established
record. Responses are detached copies.

Local Search compares only name, using JavaScript Unicode lowercase and
substring matching. It does not search private descriptions, account secrets,
member nicknames or IDs. An empty keyword returns the same known corpus.
Results use ascending Guild ID for deterministic ordering. Recommendations
returns that same corpus, not an invented skill/region/activity ranking.
These are explicit replica policies, not reconstructed production matching.

Listing a public, permission or private Guild does not authorize joining it
or indicate available space/point eligibility. Existing local records may be
listed regardless of join type; any joining/membership action remains a
separate unsupported mutation. Empty known corpus or no matches returns[]
without manufacturing a recommendation or search result.

`npx tsx tests/guild-discovery.ts` and TypeScript build pass. Tests cover
keyword/auth-only request parsing, name-only case-insensitive matching, stable
ordering, same-server exclusion, private/listed versus join eligibility,
empty/missing results, duplicate identity refusal and detached data. Native
discovery scene pixels and original remote ranking/limits remain unverified.
