# Mirage Retry UI clock: begin_ltime plus86400 seconds

Bounded read-only original native audit. Existing Mirage entry, clock and
RetryInfo exports were read first; missing main-popup refresh instructions
were inspected directly in immutable DataDump
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses below are ELF code offsets+0x10000. No native patch, live/device
input, DataDump write, account or clock change was made.

## Exact original field and clock source

Published `sources/native/strings/ghidra-mirage-strings-09.txt:33` resolves
the `begin_ltime` literal at G9342e2/2ea. Parse_InstBase converts that value
to an effective signed32 word and writes Mirage manager+0x60 at G934332.
GetBaseInfo G92e8bc returns manager+8 (after its roster-list maintenance),
so this field is **base+0x58**, distinct from revive_price at base+0x50.
Neither the field name nor the store recovers its original server producer.

`CGMTime.GetCurLocalTime G797646` returns:

`floor(RMGetTickCount()/1000) + synchronized_local_time - synchronization_tick_seconds`

The synchronized local word is CGMTime+0x28, and synchronization tick is+8.
Thus these comparisons use advancing seconds from the game's synchronized
local clock, not an independently queried Windows wall clock. SetTime
G79794c writes its second supplied time to+0x28. ParseTime G7976f8 likewise
loads `local_timestamp` into+0x28; `server_timestamp` and `utc0_timestamp`
are separate fields. The existing SetExtra investigation separately binds
the replica's `local_time` synchronization path. This audit does not infer
an original timezone from the word local.

## Main popup refresh controls Retry availability and countdown

Fresh immutable Thumb: `CSRPopUpExploreMirage.OnRefresh Gbfb220`.

1. G bfb494/bfb498 obtains Mirage/GetBaseInfo; **Gbfb49c** loads
   base+0x58 into r9: the actual cached begin_ltime.
2. **Gbfb4d6** calls GetCurLocalTime; Gbfb4da retains its result.
3. **Gbfb508/50c** constructs0x15180 =86400. **Gbfb526** adds that
   literal to begin_ltime. No day rounding, midnight calculation, timezone
   offset or daily-use counter is read in this arithmetic.
4. **Gbfb53e/544** compares `begin_ltime+86400` against current local
   seconds and branches signed **BGE** into the unavailable path. Therefore
   the ready branch requires **current > begin_ltime+86400**; equality still
   follows the countdown path.
5. The ready path selects visual/state enum4 at Gbfb548, hides the
   `TX_MR_TIME` node and shows `MIRAGE_RESET` at Gbfb5a4..5d8.
6. The unavailable path selects enum2 at **Gbfb6ec**, hides
   `MIRAGE_RESET` at **Gbfb7ca/7cc**, and obtains current local seconds again
   at Gbfb806. **Gbfb816** computes `(begin_ltime+86400)-current`;
   **Gbfb81e** formats it with the exact literal **`%H:%M:%S`** and
   Gbfb830..83e shows/updates `TX_MR_TIME`.

This clock block is reached independently of server floor/stair/state. The
entry through Gbfb494 only initializes missing cached UI-node pointers
at popup+c10/+c18/+c20 and positions their geometry; it does not branch on
Mirage base.state, floor or stair before loading begin_ltime. It therefore
also governs the Retry control while a run is active. The later click path
separately protects a pending state2 reward; that does not bypass the clock
block or make its countdown irrelevant to state1.

Exact PC-relative string cross-checks: TX_MR_TIME at G1d7fa6d,
MIRAGE_RESET at G1d7fa78, formatter at G1d70379. The enum labels above
describe the branch behavior; they are not a claim about the universal
meaning of every native UI enum.

The matching `OnButtonClick Gbfa5d0` reads the same button state at
Gbfa7bc, compares it against enum2 at **Gbfa808..812**, and in that state
opens the localized notice keyed by
`유적입장은 매일 0시에 초기화됩니다.` at G1d7f957
(literal Gbfa844/Gbfa84a). The other path separately rejects pending state2
rewards via the “unreceived reward” notice, then reaches the already
documented GetNextFloor/confirmation chain. Thus the unavailable visual
state also affects the real click path; this is not merely decorative text.

## RetryInfo's other countdown is the boosted-Hunter rotation

`CSRPopUpExploreMirageRetryInfo.SetData Gc0643c` calls GetCurLocalTime at
Gc0648e, then GetHeroInfo G92eb60 at Gc06498 and reads **hero+0x18**
at Gc0649c. That is **ref_hero.end_ltime**, not begin_ltime. It asserts
end>=current at Gc0649e..64be, then formats whole days from the difference
(published decomp `ghidra-mirage-retry-fault.txt:858-913`). The86400 divisor
in this second function must not be mistaken for the main Retry gate above.

## Consequence for the configured replica

Serializing a new attempt's actual start time as begin_ltime makes native
Retry unavailable for roughly24hours, even if a configured LOCAL quota
allows another same-day attempt or becomes available at the next fixed-offset
midnight. A host-only RPC proof cannot establish this UI works.

Keep an actual attempt-start timestamp for the persistent generation/day/history
ledger. If exposing a configured availability policy to this native UI,
the **wire** begin_ltime needs a separately documented compatibility projection
whose `begin_ltime+86400` matches the desired eligibility boundary in the
synchronized client clock. A ready-now projection must account for the strict
greater-than comparison; an equality timestamp still shows zero countdown.
This is a LOCAL representation, not recovery of the original producer's
timestamp convention. Do not silently rewrite earned history to satisfy UI.

The boosted-Hunter deadline remains an independent future timestamp; changing
begin_ltime cannot repair an expired ref_hero.end_ltime assertion. No original
run price/quota/timezone or successful native rendering is established here.

Source-export SHA256 pins for reproduction:

- `sources/native/hunters/ghidra-mirage-local-clock.txt`:
  `37112497c062beac0f750822c918cc81a8af4f7cab716d6f37ca8afb20b9d345`.
- `sources/native/hunters/ghidra-mirage-clock-origin.txt`:
  `7072c4b240578af0962634a299966c4017db4f5646ad15750c4f28650970e26e`.
- `sources/native/hunters/ghidra-mirage-retry-fault.txt`:
  `fce84dc2913292f8c2cedb6f4d793daa5713f1c6938efd1a11ca720843ac91de`.
- `sources/native/hunters/ghidra-mirage-entry-model.txt`:
  `c59afcf44e2aa79c8eb242e2a84f1593ed10375fb7672f7212172b91eb7a4160`.
- `sources/native/hunters/ghidra-mirage-entry-flow.txt`:
  `78b6083e38d0ceb942a1dfab8a9e183764a912aed42272f8d10178c2cece78b9`.

The main OnRefresh audit above is direct original instruction evidence; no
new decompilation export was written into DataDump.

The published entry-flow/renew-continuation and RetryInfo exports inspected
here show no second begin_ltime arithmetic consumer. A bounded direct review
of named main-popup GetBaseInfo call sites finds floor/state/stair reads in
OnFirstEnter, RefreshList, BeginAnim and AnimateOpen123/456/789, and the
begin_ltime read in OnRefresh above. This is not a whole-library absence
claim: indirect readers or retained pointers outside these owners have not
been exhaustively enumerated. The proven consumers are enough to establish
the Retry clock mismatch without claiming that begin_ltime is universally
presentation-only.
