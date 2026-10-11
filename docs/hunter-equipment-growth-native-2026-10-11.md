# Equipment stat and growth model, inactive

Pure helper `hunter-equipment.ts` reconstructs original grammar and arithmetic
for caller-supplied equipment rows. Tests use authored rows. No original
numeric equipment reference rows or owned equipment were published; no routes,
state, balance, fees or training changed.

Original ARM library SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
addresses use Ghidra coordinates (subtract0x10000 for ELF). Supporting DataDump
sources: `sources/native/hunters/ghidra-card-keys.txt`, `native-card-inventory.txt`,
`native-card-stat.txt`, `ghidra-stat-parser-first-insn.txt`,
`ghidra-stat-parser-growth-insn.txt`, `sources/native/symbols/native-evidence.tsv`.
CalcStatByEquip and its caller were independently disassembled from original
bytes in this pass. Equipment art/name audit is in the companion reference note.

GetCard equipment loop G87c200 invokes CSRCardStat.parse G886fc0 with100.
All15 stat strings parse into native decimal floating_point fields. For modes
other than1 the parser divides every field by mode; speed+08, critical
chance+a8, penetration+48 and block chance+58 first receive an additional
multiply100. Thus with mode100 these four retain their wire value, while
HP/ATK/DEF, critical damage, block reduction, enhancement/resistance, HP
regeneration and all three growth increments divide100. Rank and awake step
are integers. This differs from Gem combination mode1 plus its separate
eight-field division: equipment growth increments DO divide100. Stat values
are direct siblings in each equipment row, not a nested stat dictionary.

`CSRCardInfoContainer.CalcStatByEquip` G87de28 takes Hunter reference, TYPE,
rank and level. `CSRCard.GetAddedStatByEquip` G86b6dc supplies owned rank from
EQUIP_DATA node+18 and owned level from+14 (G86b7aa), with TYPE0/1/2. When TYPE
is-1 that caller calculates and adds all three slots; this pure helper computes
one explicit slot to avoid quietly selecting any missing equipment.

The original formula:

1. If rank equals1, decrement the input level (G87de56–5c).
2. Compute signed level remainder10 using multiply-high division magic66666667
   (G87dea6–b6). If adjusted level equals rank*10, use10 instead (G87deba–cc).
3. Scan the Hunter equipment vector, stride0x120; select records whose internal
   TYPE equals requested TYPE and whose CardStat.rank equals requested rank
   (G87df7c–88). Copy the full stat record (G87df90).
4. ATK += atk_up*steps (G87dfb6–e0); DEF += def_up*steps
   (G87e006–30); HP += hp_up*steps (G87e056–80). Other stats stay copied.

For rank1/level1 steps0; rank1/level10 steps9; rank2/level10 steps0;
rank2/level11 steps1; rank2/level20 steps10. Rank1/level11 also matches the
adjusted rank*10 branch and gives10: that is arithmetic evidence, not proof
level11 is an admissible original rank1 training level. No maximum level,
rank-up eligibility or charge policy is inferred here.

Native missing match leaves a zero-initialized stat result; repeated matching
rows overwrite it, so the last matching row wins. This helper instead refuses
missing/duplicate slot-rank rows and invalid zero/negative levels as explicit
local admission policy. It also rejects rank-band signed32 overflow. These
refusals preserve the missing-data boundary; they are not reconstructed
original server error codes. JS numbers project the proven decimal arithmetic
but are not bit-for-bit native floating_point storage; currency/stat
settlement must keep exact decimal handling if integration eventually needs it.

Next required data: original per-Hunter id/type/rank/stat rows and allowed
rank/level ranges, equipment fees/materials and authenticated transaction
receipts. The other agent owns the localized name resolver. Existing
DERIVED-ESTIMATE accessory TSVs and zero fixtures do not satisfy these gates.
