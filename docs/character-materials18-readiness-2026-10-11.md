# Prepared E6 Hunter materials expansion

Inactive `config/profiles/current-e6-materials18.json` extends the unchanged E6
139-group baseline with11 separately served original packages, producing150
groups and18 ordinary references. Stamp1634685 is reserved above E7's1634684;
resource version, reslist and reslist header are coherent. `preparedOnly:true`
records that native activation/download/Library validation remains pending.

New ordinary identities are Locke014, Acerola030, Dumble048 and Dino054. Existing
base bodies are already in E6. The additional Q/effect/voice packages are all
original imported files: Q/EFT/SND for014,030,048 and Q/EFT for054, whose voice
pack is already selected. These11 originals total11,617,256 bytes, before CDN
wrapper overhead. Their exact source locators, sizes and SHA-256 values are
pinned in `resources/manifests/character-materials18-originals.json` and checked
against imported-files.json and the selected on-disk bytes.

`node scripts/profiles/prepare-e6-materials18.mjs --inspect-only` computes the
candidate without writing. Omitting that flag only creates the named inactive
profile; an existing differing profile refuses overwrite/stamp regression.
The preparation function clones input, preserves the first139 names exactly,
rejects reordered/partial/unrelated selections and changed/conflicting/missing
originals, aligns future stamps and refuses malformed or overflowing stamps.

The existing materials seam prepares the four new rows with explicitly neutral
local stats/skills. Original ordinary magnitudes remain unknown; no archive
projection or Episode stat adoption is added. Current fourteen reference rows,
owned inventory, birth-rank rules and exchange whitelist remain unchanged.
Navigation-only trace metadata supplies positive Library bindings with no
acquisition links, inventory grants or new exchange path. Ordinary catalogue
identities are distinct from Episode actors reusing their artwork.

`node tests/resource-profile-materials18.mjs` checks original fingerprints,
canonical150-group preflight, idempotence, reserved/future/invalid/overflow
stamps, missing/corrupted/conflicting originals, fresh-process18-reference
registration data, all four role groups, positive navigation bindings and
unchanged ownership/acquisition rules. Host results establish readiness only.

Root must still select the profile, validate the original native downloader and
post-reference map, inspect every Library role and representative portraits,
and audit private saved gameplay. This preparation performs no live activation,
restart, UI/ADB input, save edit, DataDump edit or client rebuild.
