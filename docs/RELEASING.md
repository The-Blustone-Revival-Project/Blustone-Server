# Server releases

Start at **1.0.0**. Package/VERSION use `MAJOR.MINOR.PATCH`; Git tags use `vMAJOR.MINOR.PATCH`; release title is always **Blustone Server MAJOR.MINOR.PATCH**.

- Patch: compatible fixes.
- Minor: compatible features/improvements.
- Major: incompatible protocol/configuration or operational changes requiring an upgrade action.

The first public release (1.0.0) introduces the game to players with **Game features**, **Recovered game content**, **Current limitations**, and **Getting started**. Describe what players can do and which original content is recovered. Do not present private development or migration history as public improvements/fixes.

Later releases use **Added**, **Improved**, and **Fixed** to describe actual changes from a previous public version. Keep those entries about gameplay, recovered content, or a user-visible problem. State “None in this release” when appropriate.

Public release notes have no Validation section or test/build checklist. Perform all required checks internally and retain their evidence in developer documentation.

Releases are published regular public releases, never drafts or prereleases. Mark each newly published version Latest. Do not reuse or overwrite a version/tag; retain previous notes/assets.

## Prepare and publish

1. Update package.json, package-lock.json and VERSION together.
2. Write `releases/<version>.md` with the appropriate public-facing sections.
3. Run `npm ci`, `npm test`, `npm run build` and `npm run resources:verify`.
4. Verify the external compiled-process protocol/restart path when runtime behavior changes. This uses a private disposable state copy.
5. Export the current resource bundle under `local/bundles/` if its pinned manifest changes; verify it contains no account/signing material.
6. Commit and push only reviewed public source/docs/reference files. Keep `local/`, `var/`, account data, logs and signing keys ignored.
7. Run `python scripts/releases/publish.py --resources local/bundles/resources-e6.zip`.

The publisher validates semver/version parity, change sections, clean/pushed source, asset fingerprints and immutable tag use. It creates `v<version>` and publishes a regular Latest release with the resource ZIP, manifest and checksums. The runtime resource stamp is a separate native-client contract and must not be bumped merely because the server semver changes.

The GitHub `Publish server release` workflow supports versions whose resource manifest is unchanged from the preceding release. It imports the previous public bundle, runs tests/build/protocol verification, then publishes the new semver. If resources change, prepare and validate the new bundle locally and use the publisher; the old bundle must not silently stand in for changed assets.
