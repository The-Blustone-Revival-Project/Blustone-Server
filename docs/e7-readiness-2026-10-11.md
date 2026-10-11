# Episode 7 readiness after relocation

Continuation: the blockers below are now corrected in source. Inactive
config/profiles/current-e7.json contains156packages/stamp1634684; current-e6
bytes and running139package selection remain unchanged. Native E7 remains pending.

Read-only readiness audit, 2026-10-11. No device input, live profile activation, save mutation, copied assets, or APK rebuild. Episode 6 Story04 remains uncleared; earn the original gate before Episode 7 validation.

## Original material is already present

The 17 additional packages are `C007`, `C007_EFT`, `C007_Q`, `C011`, `C011_EFT`, `C011_Q`, `C011_SND`, `C016`, `C016_EFT`, `C016_Q`, `C016_SND`, `C018`, `C018_EFT`, `C018_Q`, `M020`, `N007`, and `ST901` (all `.jet`).

Each file exists in read-only `../Blustone-DataDump/local/inputs/extracted/assets/`, with size and SHA-256 matching the prepared script's original inventory. Each also exists in this repository's `resources/runtime/assets/`, and each Server copy matches the pinned SHA-256. The imported-files manifest records these copies. None is in `resources/runtime/packages/`; the server's existing `resourcePackages()` explicitly falls back to the asset directory, so another bulk copy is unnecessary.

The complete recovered Episode graph, CB0701/CB0702 combat rows, and STAT actors are already imported under `resources/reference/episodes/`. Recovered dependencies and original package/atlas evidence are in DataDump `findings/episodes/episode07-entry-materials.md`; the earned entry and validation sequence are in `episode7-next-audit-2026-10-10.md`.

## Relocation blockers in the prepared tools

`tools/episode07-resource-profile.ps1` has relocated asset/package defaults but still expects the historical `BLUSTONE_PACKAGE_NAMES_EXTRA` split. `config/profiles/current-e6.json` instead stores all 139 packages in `BLUSTONE_PACKAGE_NAMES`, without EXTRA. Mutation mode therefore rejects the legitimate baseline; even bypassing that prerequisite would append to EXTRA, which `src/server.ts` no longer consumes.

`scripts/start-local.mjs` loads the named JSON profile after environment inheritance, overriding profile keys. Sourcing the old environment-mutating script cannot change the canonical launcher's package list or stamps. The Node launcher supports `--profile`; the PowerShell wrapper exposes no Profile parameter.

`scripts/resources/verify.mjs` currently requires all three stamps to equal literal `1634683`. An otherwise coherent 156-package E7 profile at `1634684` would be rejected. This is a host preflight restriction, not evidence of a native protocol restriction.

The Instrumented copy of `tools/episode07-resource-profile.ps1` still defaults to historical `recovered-assets/...` and `analysis/runtime-package-full` paths. Resource selection belongs in Server; maintain a redirect or explicit relocated paths if retaining the diagnostic copy.

## Bounded next implementation

Prepare an inactive Server JSON profile derived from the entire current E6 profile, retaining every prior package and setting. Append only the 17 pinned originals, set expectedPackages to 156, and advance resource/list/header stamps together to at least 1634684 and above the greatest baseline stamp. Make the existing preflight profile-aware while retaining pinned baseline expectations; verify coherent stamps, unique package names, file presence, original hashes, and UI database tree. Test that the default E6 profile remains unchanged and the E7 candidate passes independently. Do not start the candidate against the live save until the earned gate and native validation are ready.

Use the migrated Server assets directly. Original Story01 EP_1401A is dialogue-only; CB0701 has four enemy Hunters and CB0702 has four M058 actors plus Vincent, with original ST901 environment. Actual native actor row selection, materials rendering, skill effects, wins, story terminal clears, and expanded cache persistence remain unverified. No stat retuning, stronger actor grant, or forced clear is justified by asset readiness.

The recovered chapter reward is CERUM01 x20. Original item metadata, thumbnail and behavior/settlement remain unknown; retain the unsupported reward boundary until those dependencies are recovered. Package availability does not establish reward completeness.

## Implemented named-profile preparation

scripts/profiles/prepare-e7.mjs validates all17 original sizes/SHA256 values,
including any conflicting preferred package file, before constructing a cloned
profile. It retains the entire baseline selection/settings, appends only missing
originals and coherently advances all3 CDN stamps beyond the maximum prior stamp
when adding packages (minimum1634684). Re-preparing a selected profile is idempotent;
malformed/overflow stamps refuse before output mutation. Positive signed32-bit
stamps are a local tool policy, not a newly recovered native ABI constraint.

The CLI only prepares current-e7; it never starts a server, edits a save or grants
progress. Inspect-only writes nothing. Existing different candidate contents refuse
overwrite, preserving a reviewed newer selection/stamp. The E6 profile stays byte
identical. The original pins are in resources/manifests/episode07-originals.json.

Resource preflight now validates the declared coherent stamp for new profiles,
retaining the existing E6 pin as1634683. It rejects undeclared/incoherent stamps,
duplicate/missing packages and missing UI backing trees. PowerShell launch exposes
-Profile; both Server and Instrumented's historical E7 helper delegate to canonical
Server preparation rather than mutating the obsolete EXTRA environment split.

Two resource-profile suites cover expansion, original hashes/conflicts, idempotence,
future/max stamps, malformed/overflow refusal, missing prerequisites, inspect-only
and E6 immutability. They run with npm run test:profiles after importing the pinned
resource bundle and are included in release validation. Both profiles pass preflight;
all968 imported resource files passed SHA256 verification for the E7 candidate.
No assets were copied or altered and no running profile was switched.
