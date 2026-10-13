# Blustone Server

A local TypeScript/Express compatibility server for the preserved BLUSTONE client. The current E6 resource profile is pinned to 139 packages and stamp 1634683. Many original systems remain compatibility fixtures or explicitly unsupported; this is not a claim of complete game functionality.

## Run on Windows

```powershell
npm ci
npm run resources:verify
npm run build
npm start
```

The default profile serves the Android/BlueStacks host address `http://10.0.2.2:8080`, binds port 8080, and persists state in ignored `var/state.json`. Existing migration state is preserved separately at `local/private/preserved-state.json`; the working migrated save is copied into `var/state.json` during setup. Do not replace it with a fresh account fixture.

For local HTTP verification or another port:

```powershell
npm start -- --host 127.0.0.1 --port 18081 --base-url http://127.0.0.1:18081 --state-file local/manual-test-state.json
```

## Resource bundle

Guild text Chat is available in explicit local memory mode:
`BLUSTONE_GUILD_CHAT_MODE=local-memory`. It requires existing joined Guild
records and authenticated exchange sessions; ordinary encrypted text is
supported, while fuel requests and persistent history remain incomplete.
The default stays disabled. See the [Guild Chat workflow](docs/guild-chat-local-workflow-2026-10-13.md)
for setup and the remaining native validation requirements.

Resources are repo-local and pinned by `resources/manifests/imported-files.json`. Proprietary binary trees are ignored; a fresh checkout requires the locally retained bundle or an authorized distributed copy. Download the pinned resource bundle from the [server releases](https://github.com/The-Blustone-Revival-Project/Blustone-Server/releases). The migration also retained `local/bundles/resources-e6.zip`. Import it with:

```powershell
python scripts/resources/bundle.py import PATH_TO_resources-e6.zip
npm run resources:verify
```

The importer verifies exact contents, lengths and SHA-256, and refuses to replace differing inputs. No sibling DataDump checkout, phone snapshot, junction or original Blustone folder is needed to run. Required textual Episode/catalogue evidence is included under `resources/reference/`. Bundle redistribution rights must be reviewed separately from this code's LICENSE.

## Verification

```powershell
npm test
node scripts/verify-independent.mjs
```

The second command runs the compiled server from an unrelated working directory against a disposable private state copy. It verifies encrypted ECDH/HMAC/AES traffic, authenticated lobby/reference/Episode routes, 139 resource rows, ranged package delivery, the portrait asset, and credential/transport persistence across restart. It preserves the three existing games and does not operate the Android app.

## Prepared Episode 7 resources

The default remains `current-e6`. An inactive `current-e7` profile includes the
17 additional hash-pinned original packs (156 total, coherent stamp1634684).
It expands available art; it does not grant story progress or resolve the unknown
CERUM01 reward metadata. Native E7 validation remains pending the earned E6 gate.

```powershell
node scripts/profiles/prepare-e7.mjs --inspect-only
npm run test:profiles
npm run resources:verify -- --profile current-e7
```

Preparation verifies originals and leaves the live server, save and E6 profile
unchanged. The historical Episode7 PowerShell helper now delegates to this named
profile preparation; sourcing it does not mutate environment selections. When
earned progression and native validation are ready, the launcher explicitly
selects a named profile with `--profile` or PowerShell `-Profile`. See
[readiness evidence](docs/e7-readiness-2026-10-11.md).

## Container option

`docker compose up --build -d` mounts the local imported runtime resources read-only and persists `var/`. The Node launch and tests are verified in this migration; container build/runtime validation is recorded separately in the migration report. Run one writer per state file.

[Migration plan and report](docs/migration/) · [Legacy server implementation notes](docs/legacy-server-README.md)

Release versions follow semver starting at 1.0.0; see [release policy](docs/RELEASING.md) and [changelog](CHANGELOG.md).
