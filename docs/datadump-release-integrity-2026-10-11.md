# DataDump Latest verification — 2026-10-11

GitHub's live Latest endpoint returned [2026-10-11](https://github.com/The-Blustone-Revival-Project/Blustone-DataDump/releases/tag/2026-10-11), published 2026-10-11T01:53:35Z. Its source tag is commit `49a89bcb0bd54f21f7637a9755561724e9de5b6f`. Existing downloaded artifacts under ignored `local/research/datadump-2026-10-11/` were rechecked against fresh GitHub asset sizes and digest fields. All five match:

- BLUSTONE-Evidence.md: 7451 bytes, SHA-256 `d35950e0e8c4b658daa62882c02870277660f7867d22de4ce48d18733182f229`.
- BLUSTONE-Stats.json: 3334427 bytes, SHA-256 `60f99ec6070d874ef8fbdd695cc12cf23ea50b07f482b05db7eb8b677794f51d`.
- BLUSTONE-Stats.md: 32063 bytes, SHA-256 `839a6cf83806d56f19e1cdde71d751e591109118c3e698d6d7e7ca3d55140f49`.
- RELEASE-MANIFEST.json: 3039 bytes, SHA-256 `b5e4ce0fdb019a43fafe2e9caccb4bf55e880fe5d23e11ee80bce26509d20312`.
- SHA256SUMS.txt: 433 bytes, SHA-256 `5d8c5fb06d790c4442b34bf87242fbcd07e7714c1fd4c6d91cf1930233469c87`.

The JSON change ledger confirms zero additions, changes or removals in all eight normalized datasets and the curated source tables. New content is supplementary derivation research. The sibling DataDump checkout contains unpublished work; it was left untouched and must not substitute for this tagged snapshot.

## Adoption boundary

The existing [character audit](datadump-character-stat-audit-2026-10-11.md) found no new measurement supporting a retune of current Hunters. Archive observations retain unknown level/equipment state; confidence labels do not establish final-version base stats. Accessory estimates derive largely from one item, skill magnitudes retain unknown-level degeneracy, and jewel locale/era conflicts remain explicit.

The original stage-linked Episode actor table is a positive source, independently compared in [monster parity evidence](datadump-release-monster-parity-2026-10-11.json). All 34 monster rows across 22 resource IDs are already present without changes or omissions. The entire source table and the Server copy have identical SHA-256 `f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56`. These stage-specific actors do not establish ordinary expedition monster scaling. The original R_EPISODE package also matches the configured source pin; this comparison is not a fresh live rendering claim.

Use the release to target missing observations and preserve corrected interpretation. No live Hunter stats, skill magnitudes, equipment curves, expedition monster balance, rewards or private saves were changed by this release check. Server and Instrumented remain the only writable projects.
