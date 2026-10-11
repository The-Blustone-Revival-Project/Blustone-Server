# Monster actor namespace and owner-pack admission

The old bootstrap guard treated22 package basenames as22 actor identities.
That rejected genuine M022, while admitting M008 without requiring its real
owner M003.jet. The corrected namespace contains64 original actor prefixes:
M001–M063 and M100. Original M008.jet contains M022/M023/M024; monster
res_prefix remains the actor prefix, never the owner package basename.

`resources/reference/monster-art-namespaces.json` was extracted directly from
all22 immutable imported original JETs. It retains source locators, byte sizes,
SHA-256 values, record counts and every original Mxxx-prefixed record name.
Extraction walks24-byte record headers to exact EOF and decodes the uint64
record_id in base38 using0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ._. No formulas
or ordinal assumptions generate actor identities. Tests independently repeat
that walk and check each original import's hash.

The tagged DataDump source49a89bc preserves the original package inventory and
Episode records, but its supplementary jet-monster-namespaces JSON path was
not available at that tag. This patch therefore does not claim a tagged table
copy: it independently derives the crosswalk from accepted original JET bytes.
The old normalized22-row monster identity table remains package-level evidence,
not authority for the actor namespace or final combat stats.

`requireSelectedMonsterArt` separates namespace existence from actual resource
delivery. Explicit BLUSTONE_MONSTER_IDS opt-ins require the exact hash-pinned
owner pack to be selected and present through a genuine PKGI1 separate group
or E_NEW folded asset path. Folded admission requires pkgi1-tree, selected and
existing E_NEW, an existing package-tree directory, the selected folded name
or matching supported glob, and the original asset bytes. Missing/non-directory
trees refuse because the actual server returns before folding in those cases.
Unrelated M008 files in the non-UI tree cannot shadow the folded asset: the
server's tree traversal emits only E_NEW before the explicit asset fold.

The default M001 path is unchanged. The fix does not widen live selection,
change reference magnitudes, replace neutral fixtures with Episode stats,
alter campaign/monster placement, import34 already-served Episode tuples,
modify saved progress or grant anything. New opt-in monster references retain
the existing local100HP/10ATK/5DEF fixture policy. Source availability and
selected delivery do not establish native pixels or original balance.

Focused tests cover all64 actor namespaces and22 owner packs, M022 positive,
M064/card/pack-name negatives, separate/folded/glob selection, absent/non-directory
tree refusal, wrong preferred source bytes, preserved default serialization,
unchanged inventory/levels and actor-prefix retention. Campaign tests and build
pass. Root also verified an encrypted compiled disposable M022 response/restart
and M008 original payload223669 bytes with SHA-256, inner/outer MD5 and ranged
delivery. That is host protocol/material proof; no new native-client rendering
or battle outcome was verified by this patch. Root's complete68 configured
checks and final build passed, followed by the final compiled response/material
and restart proof.

No live profile, save, UI/ADB, APK or DataDump files changed. Root owns full-suite
validation, documentation integration and any eventual native opt-in trial.
