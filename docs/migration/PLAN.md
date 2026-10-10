# Blustone: three-repository migration plan

Prepared 2026-10-10. This is a plan, not an executed transfer. Local checkout inspection only; remote branch parity and release contents have not been verified. No running service, device, save, or existing source was changed.

## Outcome

Retire `C:/Users/shaha/Documents/ChatGPT/Blustone` as an active workspace. Give each of the three existing GitHub repositories one clear owner responsibility:

- **Blustone-Server:** clone, obtain the documented resource bundle, configure, and launch a compatible local server. No dependency on the old workspace or a DataDump checkout.
- **Blustone-Instrumented:** diagnostic client source, reproducible build and patch pipeline, collector, native observation and battle-control tooling, and releases.
- **Blustone-DataDump:** searchable, provenance-preserving game data and reconstruction evidence, primarily from `analysis/`, with extraction/research tooling. No invented balance promoted to original data.

Exactly three code/data repositories. Private state, signing material, preservation snapshots, bulky binaries, and installed SDKs have local storage outside Git. That storage is not a fourth project or repository.

## Verified starting point

The Server and DataDump checkouts each contain only README and LICENSE besides Git metadata. Instrumented contains collector, Compose, release documentation, VERSION and ignored artifacts, but no top-level client `src`, `native`, `stubs`, or build tooling. All three local working trees were clean at inspection.

Old workspace has 5,312 tracked files, 21 modified files, and 17,380 untracked files at the inventory snapshot. These counts exclude later plan artifacts. A tracked-only export would lose substantial work.

Logical sizes (file lengths, not allocated disk usage; not a deduplication estimate):

- analysis: 112.68 GiB, 64,368 files
- recovered-assets: 32.69 GiB, 11,956 files
- tools: 32.62 GiB, 34,113 files
- instrumentation: 8.28 GiB, 17,895 files
- server-ts: 0.075 GiB, 3,404 files
- .git: 16.02 GiB, 536 files

Total of those six trees: approximately 202.4 GiB. Inventory records totals and the largest groups; it is NOT the final per-file transfer ledger. Directory scans were not a frozen snapshot.

Largest groups explain why wholesale Git import is unsuitable: analysis/patched ~64.42 GiB, analysis/avd ~29.35 GiB, recovered-assets/emulator-host-recovery-2026-10-05 ~27.71 GiB, Android SDK ~26.51 GiB, analysis/testing ~5.79 GiB. Collector data is ~8.21 GiB. Old .git includes ~6.27 GiB of lost-found files: preserve before any Git maintenance.

## Ownership and target layouts

### Blustone-Server

Flatten `server-ts/` into the repository root. Keep src/, tests/, scripts/, assets/, package.json, package-lock.json, tsconfig.json, OpenAPI outputs and contributor documentation.

Add:

```text
config/profiles/          # versioned, non-secret launch profiles
resources/reference/     # runtime-required JSON/TSV exports
resources/manifests/     # resource bundle hash inventory and version stamps
scripts/resources/       # validate/import/build required resource bundle
scripts/start-local.ps1  # one supported Windows launch entry point
Dockerfile
compose.yaml             # optional local container launch with persistent volumes
docs/protocol/           # server-facing contract summaries
var/                     # ignored state, logs and imported runtime bundles
```

Move tools/start-server.ps1 and server-specific resource-profile scripts here after removing workspace-relative paths. Resource builders belong here if their output is necessary to launch; exploratory extractors belong to DataDump.

Runtime dependencies found:

1. src/episode-progress.ts reads analysis/recovered-reference/EPISODE_S01.json through paths outside server-ts. Copy the required export into resources/reference and resolve correctly in both TS development and compiled JS.
2. src/catalog.ts searches parent directories for analysis/native-all-strings.tsv. Ship the required catalogue input locally and set a repo-local default for BLUSTONE_CATALOG_PATH.
3. src/server.ts and config.ts default package paths to a recovered phone's private files/local directory. Replace with explicit imported resources, never a private phone snapshot.
4. tools/start-server.ps1 depends on analysis/runtime-package-full and recovered phone PAD assets. The current profile is not captured by copying that launcher alone.
5. Existing .env.example is a historical smoke profile, not the current playable profile. It must not become the default migration configuration.
6. Audit tests, resource builders, scripts and all other file reads before declaring this list complete. server-ts also has nested analysis/, recovered-assets/ and server-ts/ directories: classify their files; do not blindly flatten collisions.

Pin a sanitized **current-session resource profile** from actual configuration, not old README defaults: exact package ordering, package bytes/hashes, resource and reslist stamps, asset names, gameplay flags and database overrides. Workspace §238 records 139 groups / 1634683 / +15 APK / profile24; this is orientation, not live runtime verification. E07 is prepared but inactive and must remain inactive during migration.

Server gets an explicit versioned runtime bundle derived from DataDump sources. DataDump remains the evidence owner; Server owns its accepted runtime snapshot. Record source dataset revision and hashes. Normal launch cannot require a sibling repo, a junction into the retired directory, or a private account capture.

Acceptance: fresh checkout outside the old folder; npm ci, npm test, npm run build; compiled npm start; resource preflight; encrypted app handshake, village/resources and one authorized existing gameplay path; restart preserving exact credentials and progress. Health/docs alone are insufficient. Document what still uses compatibility fixtures.

### Blustone-Instrumented

Keep existing collector/, docker-compose.yml, VERSION, release notes and release identity. Compare collector files with instrumentation/collector before resolving duplicates; do not overwrite newer published work.

```text
client/src/              # instrumentation/src
authoring/stubs/         # instrumentation/stubs
client/native/           # instrumentation/native
client/assets/           # active seed assets plus documented provenance
scripts/build/           # build-instrumented-apk, assembly, native patches
scripts/device/          # explicit-device ADB helpers
scripts/observe/         # Java/JDWP and native inspection tools
scripts/battle/          # guards, control scripts, original-pixel templates
tests/                   # guard/finder tests and focused sanitized fixtures
docs/build/              # prerequisites and patch provenance
docs/research/           # client implementation/ABI investigation
inputs/                  # ignored original APK and immutable native inputs
build/                   # ignored generated files
```

Current builder hardcodes analysis/patched, a prepared debug base APK, toolchain subpaths, extracted original libnative_core.so, output paths, and signing-key location. It needs a prerequisite/dependency graph and configurable input/toolchain paths. Copying Java source is not enough to reproduce +15.

Preserve signing identity securely so future updates remain compatible with the installed package. Never regenerate a key merely because its location changed. Preserve original/native input hashes; never patch original files in place. Any rebuilt instrumented APK still requires a GitHub release under the standing project instructions. A documentation/source relocation alone need not force a rebuild or reinstall.

Keep battle automation disabled during migration. Move current scripts, tests, templates and their curated fixtures together; broad test-session evidence lives in DataDump. Native-address/layout assumptions must retain APK/library provenance.

Acceptance: compare collector version/content; build prerequisite validation; relevant host tests; build with same preserved signing identity; patch-manifest review. Only if a rebuilt APK is actually installed, validate side-by-side identity, native startup and release publication. No casual app clearing/reinstallation.

### Blustone-DataDump: substantive reorganization

Do not transplant analysis as one giant directory. Use source preservation plus normalized records plus human findings, connected by stable IDs:

```text
catalog/                 # dataset/source/entity indices and coverage
schemas/                 # machine-readable dataset and provenance schemas
sources/native/          # curated original strings, symbols, decomp and parser evidence
sources/client-tables/   # recovered-reference, recovered-data, sanitized RO exports
sources/community/       # VSFan/forum/wiki archives and archive retrieval manifests
sources/observations/    # sanitized screenshots/OCR/native runtime observations
datasets/hunters/        # identities, base stats, growth, skills, tags, relationships
datasets/monsters/
datasets/campaign/       # stages, areas, achievements; field-level evidence
datasets/episodes/      # stories, fixed parties, dialogue and battle metadata
datasets/economy/        # items, rewards, currencies, prices, recruitment, login
datasets/equipment/
datasets/systems/        # arena, fishing, mirage, training and other mechanics
findings/<system>/       # conclusions, conflicts, rejected hypotheses, unknowns
tools/extract/           # JET/LevelDB/native extraction and Ghidra scripts
tools/community/         # forum/login/VSFan research collectors and parsers
tools/normalize/         # dataset assembly, validation and coverage generation
exports/server/          # pinned reproducible exports for Server consumption
manifests/               # source hashes, migration ledger and legacy-path map
docs/                    # methodology, contribution and evidence labels
local/                   # ignored private inputs/cache pointers; no secrets in Git
```

Source mapping:

- analysis/catalogue -> catalog plus datasets/hunters, monsters, equipment; preserve existing IDs and provenance.
- analysis/recovered-data -> sources/client-tables plus deriveddatasets/campaign; keep original chunk bytes and extraction method.
- analysis/recovered-reference -> sources/client-tables, reviewed for account contamination.
- analysis/research/base-stats-visual-hunt and analysis/in-game-stats -> findings/hunters and sources/observations with links from normalized stat records.
- analysis/research, analysis/systems -> findings by game system; classify individual documents, not just whole directories.
- analysis/native-*, analysis/ghidra-* and relevant scripts -> sources/native and tools/extract; large raw decomp bundles use indexed bulk storage.
- analysis/VSFan plus public forum/login/VSFan collections currently under recovered-assets -> sources/community after content review, retaining retrieval URL/time and original response hash.
- analysis/testing, capture, r010..r018, battle-scene, exchange-ui, card-stat-ui-probe -> evidence-bearing observations and regression fixtures. Keep selected public evidence in Git; full/private sessions in local archive with ledger references.
- analysis/reconstructed-*, runtime-package*, seed*, patched* -> classify as generated client/server build inputs or archival experiments. They are not original stat datasets.
- analysis/avd, SDK installs, downloads, node_modules, dist -> preservation/toolchain/cache storage, not DataDump datasets.

Every dataset has README, schema, primary keys, units, provenance and coverage. Records should include source_id, original locator (file/chunk/key/native function/frame), source hash, observed game/version/locale, extraction method, evidence label and linked evidence IDs. For stats also preserve rank, level, awakening, equipment/buffs and whether a displayed reading or base value. Distinguish character reference IDs from owned-instance IDs. Never merge observations at different levels as contradictory base stats.

Use labels already established by the project: RECOVERED, COMMUNITY-SOURCED, INFERRED, INFERRED-FIXTURE and UNKNOWN, with separate native-verification status where relevant. Preserve conflicting values as separate claims. Missing values stay unknown, never zero. Label archive-2019 projections as projections, not final-version recovered balance.

Important example: campaign-stages.csv enumerates 50 IDs from a CMGE analytics table. Its own README explicitly says this is not stage difficulty, AP-cost or monster metadata. The migration must preserve that qualification.

Stable evidence IDs and manifests allow physical files to move without losing links. Keep legacy-path -> destination-path mapping and a link-rewrite report. Raw source bytes remain immutable; scrubbed derivatives have separate hashes and transformation records. No single unreviewed mega-CSV called canonical stats.

Acceptance: dataset schema/key validation; hash checks; link resolution; evidence-status preservation; extract/normalize/export reproduced from fixed inputs; coverage showing known/unknown fields; spot-check original stat evidence against normalized records.

## Private and large-file storage

Suggested local sibling roots, outside the three Git repositories:

- C:/Users/shaha/Documents/Blustone-Local/private/ — account snapshots, save state, signing material, raw sensitive telemetry.
- C:/Users/shaha/Documents/Blustone-Local/archive/ — original captures/APKs, emulator disk images, old Git bundle and preserved experiments.
- C:/Users/shaha/Documents/Blustone-Local/toolchains/ — installed Android SDK/NDK/JDK/Ghidra/JADX.
- C:/Users/shaha/Documents/Blustone-Local/bundles/ — hash-verified runtime/build/evidence bundles.

These paths are proposed, not created or transferred. Published manifests must not include tokens, cookies, private identifiers or confidential path details. Public raw archives can contain credentials too; review content, not just folder names or .gitignore.

Ordinary Git: code, schemas, normalized text data, manifests, curated small evidence. Bulk public binaries: versioned downloadable bundles or selectively configured LFS after confirming current repository limits/terms and legal distribution constraints. Private material: local protected storage plus a separate verified backup. Do not assume recovered game assets inherit the repository LICENSE.

Exact hosting decisions require current GitHub/LFS/release limit verification during execution; this plan does not quote unverified platform quotas.

## Execution sequence and gates

### 0. Freeze and capture a recoverable baseline

Keep the battle goal paused. Inventory actual running service paths/configuration without exposing credentials; snapshot active profile and CDN state. Record three destination repo heads and branches; verify remote parity. Preserve modified and untracked work, Git refs/history and .git/lost-found before Git cleanup. Archive full original AGENTS.md; derive concise per-repo guidance and current continuation documents, retaining §238 and historical corrections.

Generate a full per-file ledger: old relative path, length, SHA-256, Git state, privacy, role, destination repo/path or local archive, copy status and verification. Every file must have a disposition; unresolved files block retirement. Follow neither symlinks nor junctions silently. Inspect the unexplained root file '-w' before deciding its destination.

### 1. Define contracts before copying

Agree on resource bundle and dataset manifest schemas, active profile snapshot and input locations. Write destination ignore rules first. Make no service changes. Classify tools by primary owner; transfer shared parsing primitives to one owner with versioned consumption, not divergent copies.

### 2. Migrate DataDump foundations

Copy immutable public sources first; establish manifests and stable IDs. Reorganize normalized datasets and findings by system. Import research tools with explicit roots and reproducible dependencies. Resolve privacy cases individually; preserve excluded originals in private/archive storage. Generate the first server export and link map.

### 3. Make Server standalone

Copy server source/tests/assets and accepted exports. Adapt paths, resource import/preflight, launch profiles and persistence directories. Add clear startup docs and a container option if feasible. Validate in an unrelated checkout directory with the old folder inaccessible to the process. Never silently fall back to older smoke resources.

### 4. Complete Instrumented ownership

Transfer client sources and complete build/patch dependency closure. Merge collector differences carefully. Migrate observer/control tools and fixtures; configure toolchain/input/output roots. Preserve signing key and original library. Verify build reproducibility separately from installation.

### 5. Copy private and archival material

Copy rather than move on the first pass. Account for mutating logs/state with a final coordinated snapshot. Deduplicate only by full-content hash and role; identical bytes do not erase provenance or source relationships. Preserve image sparse-file behavior where supported. Do not delete generated artifacts simply because regeneration seems plausible.

### 6. Cut over deliberately

After standalone checks pass, schedule one bounded service transition. Back up current state and relevant CDN cache; stop only the verified owned service, then launch the replacement with the same keys, profile, ports and resource bytes. Never run two writers on one state file. Validate native app startup, save equality outside expected clocks and session/cache behavior; retain rollback commands and exact old configuration.

Do not enable E07, widen asset coverage, change combat balance, fix unrelated game bugs or alter app identity as part of this transfer. Any native gameplay test requires expected scene/stage verification and prompt attacks during the battle under the standing instructions.

### 7. Retire the old workspace

Require every ledger row resolved and copied/archive-verified; no active process, launcher, scheduled task, IDE setting, test or build depends on the old path; all relevant tests passed; private state and signing keys backed up; repositories contain complete independently usable documented projects; native cutover verified.

Rename the original directory to a dated retired archive and run from the new locations through a normal restart. Retain it for an agreed review interval. Final deletion is a separate explicit user action after independent backup verification. No '/MIR', blanket clean, mass git add, or recursive delete during transfer.

## History and review strategy

Keep existing destination histories. Default to curated imports with old source commit/path and file hashes in the ledger, plus a private complete old-history archive. Selectively preserve history for useful code paths if needed; do not push the entire old .git into public destinations. Scan any history selected for publication as well as current files.

Suggested reviewable batches: (1) ownership/docs/manifests, (2) DataDump sources/catalog, (3) datasets/findings/tools, (4) Server source/runtime dependencies, (5) launch and resource bundles, (6) Instrumented build/tooling closure, (7) validation/cutover records. Retain unpublished local work until each batch is verified; publishing is outside this planning turn.

## Planning limits and remaining execution questions

This audit is directory-size, local-checkout and selected dependency evidence, not a completed per-file classification, full secret scan, collector diff, reproducibility test or live runtime inspection. No online quota/license check was needed to draft this plan. Execution must resolve those explicitly.

Recommended defaults: self-contained Server bundle import; DataDump optimized for source-backed stat reconstruction; minimal Instrumented layout disruption; private archive outside Git; copy-and-verify first; preserve all work/history before retiring anything. Estimate effort after the complete ledger and runtime closure, not from directory names alone.
