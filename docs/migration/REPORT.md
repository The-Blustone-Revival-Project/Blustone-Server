# Migration completed locally — 2026-10-10

Copied and SHA-256 verified **132,278 original files / 217,277,444,268 logical bytes** (217.3 GB; 202.36 GiB). No copy errors, skipped files or discovered junctions/symlinks. Every legacy file has an owner and a preserved byte-identical copy. The original folder is retained; no rename, deletion, commit, push, APK rebuild/install or release occurred.

## Destinations

- **Blustone-Server:** server-ts flattened into the repo; required textual references, binary resource imports, current E6 profile, launch scripts, bundle export/import and persistence. Private/cache originals are in local/.
- **Blustone-Instrumented:** client source/native/stubs/assets, existing collector, build/patch/observer/guard tooling, preserved signing key and independent toolchain/build inputs. Full host fixtures are copied locally. Existing VERSION/release metadata retained.
- **Blustone-DataDump:** original tables, native evidence grouped by system, source archives, findings, normalized datasets, schemas, extraction/community tools and server exports. Private snapshots, emulator disks, historical experiments and complete old Git metadata are retained locally.

Raw community archives and observations are copied but ignored pending publication review. All local/, var/, secrets, signing keys and runtime binaries stay outside ordinary Git candidates. The authored-code LICENSE does not claim rights over recovered original game assets.

## Server independence verified

`npm ci`, the complete 48-script `npm test` chain, and `npm run build` passed. `node scripts/verify-independent.mjs` launched the compiled server from an unrelated working directory, verified encrypted ECDH/HMAC/AES requests, authenticated lobby/reference/Episode responses, all 139 resource rows, HTTP206 package ranges, and the portrait asset. It restarted the process and reused persisted credentials/transport keys. All three preserved gameplay states remained exactly equal.

The migrated server is running on port8080 from this repo using current-e6, 139 packages and stamp1634683. The old recorded server PIDs were absent at migration start; no old process was terminated. `var/server-process.json`, `var/server-listener.json` and private stdout/stderr logs identify the new process. `var/state.json` is the migrated working save; local/private/preserved-state.json is the unchanged backup.

Resource import verification covered 968 files / 1,113,400,848 bytes by SHA-256. The portable bundle is `local/bundles/resources-e6.zip`, SHA-256 `8bee83d69c5105aedcfa834c789ff039009dc047aa0e139c5641548322df3ae1`. A fresh clone requires this locally retained proprietary bundle; normal launch does not require the old folder or a sibling checkout.

## DataDump organization and validation

Eight normalized datasets cover hunter identities, historical stat observations, symbolic skill references, monster identities, campaign identifiers, Episode nodes, Episode rewards and named gear associations. Counts:121 character rows /113 playable rows,22 monster identities,63 archive rows with806 numeric historical stat claims,50 campaign identifiers,147 Episode nodes and1070 skill-reference records. No archive claim was relabeled as a recovered base stat.

Validation checked3941 provenance claims,7 underlying source hashes and5 server exports. Ten JET-decoder tests passed, and campaign extraction reproduced the original chunk SHA-256 and all50 IDs. Sources/findings are indexed in catalog/sources.json and catalog/findings.json.

1499 native-evidence files are grouped under sources/native by game system, symbols and strings. 382 Markdown links were migrated; unresolved historical links:0. Originals of 20 edited research documents are preserved separately.

## Instrumented verification

31 host Python tests passed. Twelve repo-local build inputs and the preserved signing key passed read-only validation. Existing native patch checks passed. The copied JDK runs locally, and InspectNativeInput plus NativeCampaignMarkers compile with it. No APK rebuild/install occurred, so the release requirement was not triggered.

Collector files were compared; the only source-vs-existing conflict was an extra trailing newline in Dockerfile. Existing collector contents were retained and the alternative bytes preserved. The obsolete patch-smoke-area-links.py already had a syntax error in the source; it is preserved under ignored local/migration/archived-broken-tools rather than presented as runnable tooling.

## Preservation evidence

The full ledger is in DataDump/local/migration/ledger.sqlite and ledger.ndjson. It includes source metadata, SHA-256, destination, owner, role, Git state and verification status. Initial import kept24 differing destination/source copies separately. Post-migration sealing preserved originals for76 additionally adapted/regenerated files. All132278 recorded destinations passed presence/size checks; original source metadata had not drifted at the seal. Public legacy mapping is in DataDump/manifests/legacy-path-map.json.

The original state, signing key and original native library fingerprints remain equal. Durable workspace continuation guidance is updated separately after the baseline seal and also copied/verified; no original game assets/source code/private state are altered.

## Limits and next action

Native Android UI was not operated, no battle was started, and E7 remains inactive. The battle goal remains paused. The encrypted HTTP checks prove the standalone server protocol/resource/persistence path; they do not constitute a new native gameplay victory. Docker configuration was added, but no Docker service/build was run.

Nothing is pushed or committed. Review the three local working trees and publication/storage decisions before publishing. Keep the original folder until a separate retirement/deletion request; the current instruction explicitly forbids deleting it.
