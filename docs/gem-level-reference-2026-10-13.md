# Gem polishing price publication and corrected native transaction boundary

> A later [supplied-sequence adapter](gem-supplied-polish-2026-10-23.md)
> supports explicitly classified LOCAL complete outcomes. Price rows alone
> still do not enable polishing or recover original RNG/growth. This earlier
> note retains the native contract and missing-original-data boundary.

`gem-level-prices.ts` supports detached explicit reference rows only. No original
numeric prices, success chances, compensation values or polishing outcomes were
recovered here. Price publication cannot authorize a level-up transaction:
failure/success selection, main/sub growth and roll assignment remain missing.
No live save, server, input, APK or DataDump changes were made.

Evidence: immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
DataDump `sources/native/economy/ghidra-gem-reference.txt`, corresponding keys
and `sources/native/symbols/native-evidence.tsv`. All addresses below are
Ghidra; ELF offsets subtract0x10000. Consumers were independently decoded
from bounded original Thumb bytes.

## Price fields and actual lookup

ParseGemLevelUpPrices Ga54108 reads direct ret_data collection rows:
level, price_type, price, possibility, failed_compensation, add_sub_ability.
The table replaces its prior vector end;40-byte row storage is:

```text
+00 payment uint32; +04 level uint32; +08 price uint32
+10 possibility float64; +18 failed_compensation float64
+20 add_sub_ability byte; trailing bytes/padding
```

Possibility and failed_compensation use strtod, integer-to-double conversion
or existing JSON float64 and store the unscaled DOUBLE bits. They are not
uint64 counters/currency merely because Ghidra labels their storage undefined8.
No bool conversion arm exists for those doubles. add_sub_ability instead stores
the raw byte for JSON integer/bool; loose string/double conversion has separate
native handling. The helper admits canonical boolean or0/1 and emits0/1,
avoiding arbitrary byte values. It does not infer that the flag is a substat
count, a stat type, a growth amount or a percentage.

FindGemLevelUpPrice Ga54f00 **ignores the PRICE_TYPE argument** despite its
signature. Initial LDRD at Ga54f00 overwrites r3; loop Ga54f08..0c compares
only stored level+4 with requested level r2. First matching level returns40
bytes. Missing lookup returns payment9 and other fields zero at Ga54f14..34.
Thus the helper rejects duplicate levels even across payment types. A missing
row stays unavailable, never a guessed free or guaranteed-success operation.

CreateView Gbce8f6 reads popup current level+6b0, adds1 at Gbce8fc, and calls
FindGemLevelUpPrice at Gbce900. Its quote is for the NEXT level. Price then
passes CSRGuild.get Gbce904 and CalcBonusSaleValue(BENEFIT2,price) Gbce90c
before storing popup cost+6b4. Equipment BENEFIT1 cannot be reused blindly.
No numeric original Guild benefit or stochastic chance calculation follows
from these price-field types; price publication preserves raw finite doubles
without percent/fraction conversion or an invented0..1/0..100 interval.

## Corrected request parameter interpretation

Historical DataDump `gem-levelup-action-2026-10-05.md` and linked popup notes
identify the popup uint argument as inst_id and literal7 as max_tries.
That interpretation is disproven by actual argument flow:

- Popup RequestGemLevelUp Gbd0bf4 reads Gem pointer+7b8 and Gem level+1c,
  refusing level>14 or busy flag+65c. It saves incoming uint r1 in sb at
  Gbd0c40, multiplies current quoted cost by that argument at Gbd0c42 and
  checks available gold before sending.
- At Gbd0f12 it loads BOTH64-bit Gem inst_id halves from Gem+10 into r2/r3.
  It stores the incoming argument sb to stack at Gbd0f2a, then calls
  CSRGem.RequestGemLevelUp Ga5811c at Gbd0f2e. Therefore the popup argument
  is max_tries; the actual instance ID comes from the selected Gem object.
- Request loads max_tries from caller stack `[r7+8]` at Ga58294, converts it
  to a decimal string at Ga582aa, and assigns key max_tries at Ga582b0.
  Instance ID is independently converted from saved r2/r3 at Ga58280 and
  assigned key inst_id at Ga58286.
- Literal7 at Ga582d4 is passed to the form MAP initialization helper
  Ga582d8 as the number of initialized key/value rows (five auth+two action
  fields). It is not a fixed max_tries value. Route is /gem/LevelUp at
  Ga5842c; request has no price_type or supplied success/roll field.

These corrections are recorded in Server without editing read-only DataDump.
Native UI recognizes one-attempt and ten-attempt controls, but this bounded
pass does not recover every max_tries admission or stop condition from the
original server. The level14 entry gate does not prove how repeated tries,
successes or resource shortfalls are settled.

## Receipt: complete authoritative Gem result, no fabricated rolls

ParseGemLevelUp Ga5e43c selects ret_data at Ga5e458, achievement at Ga5e46a
and user at Ga5e48e. It applies absolute user.gold.cur (Ga5e4a2/aa), including
signed32 float/string conversion Ga5e4f4 and balance write Ga5e506. user.item
at Ga5e50c applies absolute instance quantities through SetItemQuantity at
Ga5e678 (item-ID conversion in this parser is bounded uint32).

It reads ret_data.tries at Ga5e6ee as signed32. It reads ONE full
ret_data.gem at Ga5e73c, uses its inst_id to find an existing owned instance
(uint64 integer branch Ga5e768 preserves both halves; string branch uses
strtod and is unsafe for large IDs), and reparses the full row through
CSRGem.parse at Ga5e886. PLAY_DATA assignment is Ga5e88e; target Hunter
ValidateCard follows Ga5e8b6. Unknown Gem IDs are not grants through this
consumer. Partial `{inst_id,level}` results would discard required reference,
ability, main/sub rolls and failure-counter data.

Native parse applies supplied level_up_failed/main/sub fields from the full
Gem row; it does not establish server failure-counter increment/reset rules,
success probability law, compensation meaning or deterministic stat gains.
A configured price with possibility1 or add_sub_ability0 alone cannot supply
those missing outcomes. A future explicitly sourced complete result sequence
would still need operation/level/owned-ID binding, known outcome provenance,
atomic cost/attempt settlement and replay policy. Merely copying current rolls
and incrementing level, forcing success or inventing random substats is not
faithful. Authenticated mutation remains refusal with configured references.

`npx tsx tests/gem-level-prices.ts` and TypeScript build pass. Checks cover
unscaled floating fields, canonical flag, unsigned bounds, duplicate-level
ambiguity, missing/empty references and detached input snapshots. These are
reference/host checks; native polishing UI and original numerical rows remain
unverified.
