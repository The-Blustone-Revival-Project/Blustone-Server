# Combined inactive restoration resource profile

`config/profiles/current-restoration.json` prepares169 ordered package groups:
the exact139-package `current-e6-materials` baseline,17 original E7 additions,
11 completed Hunter-material kit additions, GUILD.jet and MIRAGE.jet. The
four added sets do not overlap. Only30 groups are appended; their original
payloads total39,315,842bytes. Existing LEVELING/ST002 remain in their original
baseline positions and are independently verified prerequisites.

The candidate is `preparedOnly:true`, stamp1634688. Neither this profile nor
its preparation script activates a server, installs a client, edits a save,
starts a battle or enables optional Guild/Mirage runtime policies.

## Preparation and provenance

`node scripts/profiles/prepare-restoration.mjs --inspect-only` validates and
prints the candidate without writing. The default command creates the new
profile and manifest only when absent; an existing differing artifact refuses
overwrite. Existing baseline/E7/materials18/Guild/Mirage profiles are unchanged.

Exports are `restorationOriginals({sourceRoot?})` and
`prepareRestorationProfile(profile,{resourceRoot?,sourceProfiles?,originals?})`.
The latter accepts only the exact139 baseline or exact final169 order;
partial, reordered, duplicate or unrelated additions refuse. It preserves all
baseline environment values except the package list and three coherent stamps,
including `materials`, `archive-2019-projection`, `episode-complete`, separate
original groups and the existing resource/database directories. Extra optional
runtime flags refuse. In particular copying the older E7 profile alone would
drop its absent `BLUSTONE_CARD_REFERENCE_PROFILE`; this combined profile does
not do that.

`resources/manifests/restoration-originals.json` has **32** unique records:
30 role`added` records followed by existing LEVELING/ST002 role`prerequisite`
records. Every source/destination/bytes/SHA256 tuple matches the unique
`imported-files.json` ledger record. These are provenance and identity records,
not inventory IDs. E7's smaller source manifest lacks source/destination fields;
the full verified tuple is supplied by that ledger join.

Preparation verifies source-manifest SHA256 identities (LF/CRLF normalized for
Git checkout portability, with original pack bytes always exact) before joining
the ledger, plus known count/order and all32 original asset byte fingerprints.
An existing conflicting copy in either configured package/assets directory
refuses even when the other location contains correct bytes. New profile
stamps are at least1634688 and greater than the maximum of all supplied input
and four prepared source-profile stamp fields on the first addition. Repeating
the complete candidate is idempotent; future stamps are retained and signed32
overflow refuses.

## Actual compiled reference breadth:22 ordinary Hunters

A separate compiled-bootstrap process with the169-package environment publishes
**22 ordinary Hunter references**, compared with14 in the139-package materials
baseline. The eight newly material-ready references are:

`007,011,014,016,018,030,048,054`.

The11 material-kit additions enable014/030/048/054; E7's completed kits also
enable007/011/016/018. Consequently the combined catalogue is22, rather than
18. For these eight additions the current stat rows are explicit LOCAL
fixtures (HP`1000`, ATK`100`, DEF`50` as wire strings) and skill effects are
empty neutral slots. Original art coverage does not recover original balance
or skills. The existing archive projection for its supported Hunters remains
unchanged; no image statistic was promoted into an original stat table here.

The compiled test also proves the starter inventory is identical to the
baseline inventory: publishing these references does not grant owned Hunters
or alter recruitment policy. It does not prove all eight Hunters have rendered
or fought successfully in the native client.

## Verification and limits

`node tests/resource-profile-restoration.mjs` checks the exact169 order,
32 provenance rows, both original-copy locations, stamp coherence/future
inputs/idempotence/overflow, source-profile preservation, missing/changed
manifest and ledger refusals, malformed/partial settings and temporary-file
corruption/conflicts. It runs isolated compiled bootstrap snapshots to verify
22 ordinary references, neutral added fields and unchanged starter ownership.
Build first so `dist/src/bootstrap.js` reflects current sources.

Historical bad_alloc during larger resource initialization remains a practical
reason to keep this profile inactive until separately authorized native
validation. Package hashes, preflight and host HTTP/reference checks establish
byte/transport/catalogue coherence; they do not establish169-package native
boot memory safety, cache persistence, complete scene dependencies or rendering.
There is no live activation or APK/release change in this preparation unit.

The complete union also remains strictly newer than source-profile stamps when
re-preparing an already selected169-group candidate. A future E7/Guild/etc.
stamp cannot be reused for a different package list; the union advances instead.

Compiled HTTP verification uses a disposable existing account created under
its14-reference baseline, then restores it with the combined profile. It reads
169 coherent manifest rows and downloads all32 pinned PKGI containers, checking
full tables/offsets/EOF, inner original SHA/MD5 and outer size/MD5. Native
GetCard exposes22 ordinary references; all14 prior stat/skill rows are exact,
and eight added rows remain neutral fixtures. Targeted RefreshInven confirms
unchanged owned cards, and the complete prior save stays byte-identical.
This targeted sync is intentionally used instead of the ordinary inventory
route, which can legitimately advance or repair resource clocks.

`npm run test:restoration` builds and runs both the profile preparation suite
and this compiled HTTP proof. `npm run test:profiles` includes the new suite.
Starter ownership, birth defaults and acquisition/drop/exchange definitions
remain unchanged. These checks do not establish a native169-group boot, memory
safety, portraits, Episode7 combat, or original balance.
