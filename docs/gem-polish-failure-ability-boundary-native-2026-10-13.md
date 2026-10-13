# Gem polishing: failed counter and ability producer boundary

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code convention ELF+0x10000. Bounded direct instruction inspection;
DataDump read-only, Server documentation only, no live/APK operations.
Companion: gem-level-reference-2026-10-13.md.

## The failed counter is an authoritative unsigned field

CSRGem.parse Ga5d3dc first selects abilities at Ga5d6b8. When abilities is
nonnull, it selects nested level_up_failed at Ga5d6c8/Ga5d6cc. Integer
conversion reads its lowword; float/string path uses VCVT.U32.F64 Ga5d702;
stored value is Gem PLAY_DATA+28 at Ga5d740. Missing nested failed counter
converts to zero, but that permissive client conversion does not establish
an original backend zero/reset rule. Null abilities skips this block entirely.

Same abilities object supplies main Ga5d742/Ga5d746 to CSRCardStat.parse
G886fc0 at Ga5d752 (argument100), and sub Ga5d758/Ga5d75c through the
individual stat parse loop. These are supplied complete native stat results.
They are not computed from price.possibility, compensation or level by the
Gem instance parser. Raw main/sub stat values, selection, growth, duplicate
substat rules and per-rank magnitudes must have their own provenance.

## Popup animation infers outcome from final failed count

CSRPopUpGemLevelUp.UpgradeCB Gbd2368 accepts pair<int,int>, not a typed JSON
success boolean. pair.first is tested against result1 Gbd2382..2386;
pair.second is read at Gbd2388. After receipt parsing has refreshed the owned
Gem, it finds that Gem Gbd239a and reads FINAL level_up_failed+28 Gbd23a0.
For the per-attempt animation queue, Gbd23da XORs the remaining attempt count
with1 and Gbd23de ORs final failed count. The loop decrements its remaining
count Gbd23f0 and repeats Gbd2402: earlier attempts queue state3; the FINAL
iteration queues state2 iff final failed count0, otherwise state3. This is
UI interpretation of the authoritative final record,
not evidence of a server roll law or a returned success flag.

On error first!=1, Gbd243a clears popup busy flag+65c and displays the
domain error; it does not perform a compensating gold refund or restore
server ability data. On successful transport it refreshes from the parsed
owned record. Server result1 can therefore represent a failed polish attempt;
inventing success=true from envelope success would be incorrect.

## Possibility and compensation remain reference metadata

The existing price audit pins possibility and failed_compensation as raw
float64 fields in the40-byte next-level quote, and add_sub_ability as a byte
flag. They are not amounts merely because their names resemble familiar
progression rules. The bounded complete popup path inspected here calls
FindGemLevelUpPrice Gbce900 for the NEXT level, reads quote price at
Gbce908 and applies Guild TYPE2 fee at Gbce90c. No probability/compensation
double arithmetic or failed-counter-derived refund was observed in that path.

Consequently these observations do not prove whether failure compensation
adds probability, changes a pity state, refunds payment, or uses a particular
scale/cap. They also do not prove when add_sub_ability chooses a stat, how
its roll is distributed, or whether existing stats grow on a successful step.
No refund/protection item semantics should be inferred from optional user.item
receipt parsing. The recovered request carries instance and max_tries, not
client-supplied roll/ability/protection outcome authority.

## Original data search and implementation limit

Inspected DataDump datasets, sources/client-tables/reference, pinned13-table
all-tables export and Gem native reference findings. No machine-readable
original Gem per-level ability growth/selection table, roll distribution,
numeric success/compensation table or owned successful/failed result sequence
was located in these bounded exported corpora. Original reference vocabulary
contains GetGem, CombinationEffect, SellPrice, LevelUpPrice, DisassemblePrice
and gacha reads; the preserved Gem finding explicitly distinguishes owned
CSRCardStat ability parsing from a nonexistent recovered GetGemStats consumer.
This is a bounded missing-data report, not a claim that all preserved private
materials or original remote data have been exhausted.

A valid immutable fee quote alone cannot authorize a faithful producer.
Do not increment level while copying current stats, fabricate random substats,
force success from possibility1, or infer compensation counters from names.
An explicitly supplied original complete result sequence would need owned-ID/
current-level/attempt binding, full before/after abilities, exact attempted
cost, and atomic replay handling before its settlement is supported. Until
then mutation refusal remains appropriate even while read/price publication
and affiliation-aware quote selection can be completed.
