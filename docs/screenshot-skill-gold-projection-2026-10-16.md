# Optional image-supported skill gold projection

DataDump release2026-10-14 (commit0aff320) adds the3626-image manual lane.
It changes no normalized stat/estimate table from10-11.2. The source lane
contains119 stat hits/22 full triples plus useful non-stat screens. It is not
grounds to promote level/rank/gear-dependent readings into original base stats.

The new optional BLUSTONE_SKILL_GOLD_PROFILE=screenshot-2018-gold-projection
uses historical training fee observations to improve the gold-only local model.
Default remains legacy100*destinationLevel. Both profiles keep the existing
rank caps and empty material slots; final-version material/economy reconstruction
remains incomplete. No live setting, balance, rank, EXP or skill was modified.

Five exact transcript rows are copied into the byte-pinned portable artifact
resources/reference/skill-training-screen-quotes-2018.json. Each carries original
batch path/hash, one-based line, corpus index and complete raw TSV row:

- idx2277 (Sunny), current1→destination2: displayed fee100.
- idx444, current5→destination6:200.
- idx2591, current20→destination21:500.
- idx605 (Beckhen), current33→destination34:700.
- idx1387 (Lv40/50), current40→destination41:900.

The capped Lv40/40 idx2505 quote is deliberately not used as the fifth anchor.
The currency destination uses the independently recovered GetLevel.skill.gold
consumer/index; transcript currency wording alone is not an original item-ID
or currency mapping. These are2017–2018 historical screen observations, not a
captured final2.8.0.1 server table. Named/unnamed roles remain distinct evidence.

All five fit100*ceil(destinationLevel/5). Only these five destinations are
observed; filling other levels and applying the same bracket curve to all four
roles is explicitly LOCAL interpolation. No claim that a complete original
gold schedule was recovered. The fixture matrix still has200 dense role/level
rows and retained10/20/30/40/50 rank caps. CSRUserLV destinationLevel−1 indexing
and UI ownedLevel+1 are independently source-backed.

The selected matrix is shared by GetLevel and single/batch settlement. Batch
cost sums every intermediate destination, including bracket crossings; it
does not multiply one final quote. The profile is selected once at module load
and validates its pinned source before producing rows. The Server remains
independent of a sibling DataDump checkout at runtime.

Screens show material requirements, including quantities such as5030/4. Those
are owned/required counts, NOT reference IDs. No material identity is guessed,
no nonzero material requirement is published, and neither profile claims an
original material-free upgrade. Single and batch handlers now refuse any future
nonempty/nonzero material row instead of silently ignoring it. Real material
settlement requires its own reference mapping and atomic consumption work.

Single and batch persist failures now restore exact original gold and selected
skill values, including absent fields and imported numeric strings. The same
owned object/roster references remain intact. Real .tmp write and directory
rename failures leave durable bytes unchanged; retry remains another requested
upgrade only when successfully persisted. There is no recovered request nonce
or expected-level field, so funded repeated requests remain separate upgrades.

Tests run the new profile in an isolated process before bootstrap imports and
cover independent observation anchors, bracket crossings,200 shared reference
rows, actual single/batch debit, rollback, cap/refusal, unsupported materials,
restart/peer and unchanged inventory. The legacy test remains unchanged.
Native popup validation is pending under the existing input hold. No APK rebuild
or release is owed by this source-only Server checkpoint.
