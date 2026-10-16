# Historical named-Hunter trace threshold projection (2026-10-16)

The optional `BLUSTONE_TRACE_THRESHOLD_PROFILE=archive-images-2017-2018` projects the observed **Sylvester (`006`) 20** and **Gerard (`005`) 40** trace exchange thresholds. Unset or `local-fixture` retains the existing local Sylvester10/Gerard20 fixture. Any other value, including an empty string, refuses at import. This profile is an immutable import-time snapshot: restart to change it. Both the array and each definition are frozen; GetItem and exchange consume the same definitions.

The historical observations are specific to these two named Hunters. They do not establish a rank-wide threshold ladder or the final 2.8 client economy. Original trace item IDs, drop tables, acquisition rates and original migration rules remain unknown. `local_sylvester_trace` and `local_gerard_trace`, their acquisition policies and generated owned instances remain LOCAL. No live profile was changed for this work.

## Published evidence

All paths below are relative to the read-only Blustone-DataDump checkout. TSV line numbers include the header. The source images are the filenames recorded in the published manual transcription; dates below are derived from filenames, not independently verified capture metadata. This integration uses the published transcription, not a new visual re-read.

* `findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-04.tsv`, line47, idx196: `Blustone_2017-06-30-17-55-48-bfc96655ab1a6f1c.png`, Offense board, **Undying Soldier Sylvester46/20 Recruit**. The unrelated Octavia digits are explicitly uncertain and are not used. Line48, idx197: `Blustone_2017-06-30-17-57-43-2cefed5668a57809.png`, Defense board, **Invincible One Gerard55/40 Recruit**. Filename date: **2017-06-30**. File SHA256: `668d0cde87ff9dce5e550124c67945d1cd840125eebd06a81ed588d9d9d82e5b`.
* `findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-28.tsv`, line12, idx1361: `image-a52bba870dba5326.png`, **Undying Soldier Sylvester39/20 Recruit**. Line22, idx1371: `image-a9edc7bdb6411b3f.png`, **Invincible One Gerard21/40**. Both are high-confidence named observations; their dates are unknown. File SHA256: `9c7e8edc0f66847cf09ddc4e2496184b422be45ba3f6f67312aeabdb9bd07b83`.
* `findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-55.tsv`, line5, idx2704: `Screenshot_2018-05-21-02-01-25-bbe41efaa95615c3.png`, full-view Defense board, **Invincible One Gerard7/40**. Filename date: **2018-05-21**. File SHA256: `26fa03d8effdf419dd597522ffb3b538a3574a933beec80887fa5daabeb1a556`.

The existing identity join is exact named Hunter006/Sylvester and005/Gerard. Native item binding is independently documented in `findings/hunters/hunter-trace-item-binding.md`, lines7-13: PostProcess at G87d348 uses type3 and exact `effect` matching a Hunter reference, then writes item identity and `collect_qty` (G87d3c8/G87d3ca). `findings/hunters/base-stats-visual-hunt/trace-threshold-2026-10-05.md`, lines65-67, records maximum exchanges as floor(owned/threshold), Gce1252/Gce1256/Gce125c, with count times threshold consumption. That older note's numeric-data gap predates these newly published image rows.

## Award and save boundary

`GUIDE_TRACE_QTY` is explicitly the existing LOCAL **10** in `search-battle.ts`, independent of this optional price profile. New guided Search victories still award10, ordinary victories retain their existing local award, and old guided receipts admitting1 or10 remain unchanged. Enabling the historical threshold does not add traces, rewrite receipts, or retroactively change an exchanged Hunter. Receipt replay retains its reward preview but returns an empty item-delta array, preventing repeated grants.

As a consequence, a fresh10-trace guide award alone is insufficient for a20-trace Sylvester exchange under the historical profile. The existing tutorial Recruit action refuses until sufficient additional owned, unlocked traces exist. This opt-in does not invent funding to hide that difference. No historical tutorial payout or era transition rule is claimed.

The thresholds affect future exchange quotes and debits only. Default behavior is unchanged; no save schema migration is needed. No original drop IDs, extra grants, native rendering, APK changes or UI validation are claimed.

## Verification

`tests/trace-threshold-projection.ts` starts isolated processes for unset, explicit local, historical and invalid profiles, setting the environment before any game imports. It checks reference/exchange agreement, exact20/40 historical consumption, shortage and lock refusals, deep immutability, and immunity to later environment edits. Disposable production ServerState accounts earn the guide capsule through an actual mission, begin/finish guided Search, receive exactly10, restart and replay without another grant or durable write. A default-profile10 receipt is also reopened under the historical profile without rewriting bytes. The historical tutorial exchange refuses at10; default exchanges still consume10.

## Extended library projection

The same opt-in now projects eleven corroborated named base identities:002
Mowgli40,003 Nene80,004 Tyltyl20,005 Gerard40,006 Sylvester20,009 Captain20,
012 Karl Steiner80,013 Denali40,017 Lapis20,036 Bear80 and040 Bibi80. The
nine additional entries change only collect_qty on already-published library
navigation items in the materials profile. The exchange whitelist remains
005/006; no new acquisition sources, trace grants, birth ranks or ownership.
Default local navigation thresholds remain1.

The curated resources/reference/hunter-trace-image-thresholds-2017-2018.json
retains17 exact raw TSV observations, nine source file hashes, per-hunter
observation joins and three explicit exclusions. The runtime verifies its
SHA256 before projecting it; audit access returns detached data. These are
published transcription observations, not a new visual reread or proof of
final-version requirements. Source files need not exist beside the server.

Lantern001 is excluded because named rows conflict80 vs20; Vincent010
conflicts80 vs160. Bright049 has only a single medium-confidence19/80 row.
Their existing navigation1 stays an explicit local fallback, not a recovered
price. Contradictory screenshot pixels were not found inside DataDump; Desktop
originals were not accessed. Tyltyl004 uses World's Best Cook observations
only, distinct from In Wonderland Tyltyl. Captain009 is identified by the
Captain title despite player-renamed names. No rarity-wide rule is inferred.

Tests compare isolated local/historical materials-profile processes: exact
ID/name joins, all11 quantities, three holds, detached evidence, unchanged
reference stats/inventory/birth ranks, item identities, acquisition links and
shop offers. Library-only identities remain outside supported recruitment.

Compiled encrypted verification also passes with the historical environment
flag and node scripts/verify-independent.mjs --fixture --profile
current-e6-materials. Report compiled_historical_trace_requirements is true;
the server is started from an unrelated working directory and validates all
11 values plus unresolved fallback through authenticated GetItem. This remains
backend verification, without native library pixels or live profile activation.
