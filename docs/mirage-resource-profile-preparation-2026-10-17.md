# Inactive original Mirage resource profile

`node scripts/profiles/prepare-mirage.mjs` prepares
`config/profiles/current-e6-mirage.json`; `--inspect-only` prints the candidate
without writing. Neither command starts a server, activates a profile, changes
an account, installs a client or touches a device.

The exact ordered139-package `current-e6-materials` baseline remains unchanged.
The candidate appends only original `MIRAGE.jet`, giving140 separate package
groups. Its `preparedOnly:true` marker is retained. The first addition uses
the greater of reserved stamp1634687 and the maximum supplied resource/header/
list/profile stamp plus1. All four candidate stamp declarations agree. Repeating
preparation of the candidate is idempotent; malformed/overflowing signed32
stamps refuse. The CLI refuses to overwrite an existing different candidate.

`resources/manifests/mirage-originals.json` copies the exact source/destination/
byte/hash provenance from `imported-files.json`, adding package names. It pins
three originals: LEVELING and ST002 are existing baseline prerequisites;
MIRAGE is the only appended package. Both configured package directories are
checked: an existing conflicting copy refuses even if the other directory
contains the correct original. Missing/corrupt prerequisites refuse preparation.

- LEVELING.jet:18524bytes,
  SHA256 ba73fff17002cc94f7f1a98bf657be1bef042283051a5b92c395347006d3c57e.
- ST002.jet:2985916bytes,
  SHA256 e75a9e7be84632e960a3084e4262726604c013d96633c3015d125f9ada9129ba.
- MIRAGE.jet:3861142bytes,
  SHA256 d2cf0adca895de1174f35f507cf5e38a21b8e74572a5c895c50ad6c062f4374e.

These pins agree with `src/mirage-resources.ts` and the original COMMON
background closure in `mirage-original-common-background-prefixes-2026-10-16.md`.
Named resources, environment selection and animation/image joins are documented
in `mirage-native-jet-name-index-2026-10-16.md` and
`mirage-original-ui-resource-names-2026-10-16.md`.

This is a resource prerequisite for further restoration. It supplies no
synthetic resource, floor, enemy, enrollment, HP initialization, boost schedule
or reward. No playable Mirage run or native rendering is claimed. Live
activation and complete runtime policy/transactions remain separate work.

`node tests/resource-profile-mirage.mjs` verifies original import provenance,
all three byte pins, preflight140groups, exact baseline preservation, future
stamps and idempotence, malformed/reordered/duplicate lists, invalid manifests,
missing/corrupt/conflicting copies and stamp overflow. Its file mutations are
confined to a generated disposable temporary directory.
