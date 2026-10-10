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

## Container option

`docker compose up --build -d` mounts the local imported runtime resources read-only and persists `var/`. The Node launch and tests are verified in this migration; container build/runtime validation is recorded separately in the migration report. Run one writer per state file.

[Migration plan and report](docs/migration/) · [Legacy server implementation notes](docs/legacy-server-README.md)

Release versions follow semver starting at 1.0.0; see [release policy](docs/RELEASING.md) and [changelog](CHANGELOG.md).
