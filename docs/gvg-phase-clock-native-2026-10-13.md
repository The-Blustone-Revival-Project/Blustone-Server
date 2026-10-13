# GvG phase selector: signed clock, exact boundaries and inactive limit

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code convention ELF+0x10000. Direct original instructions and exported
symbol identities. DataDump read-only, no live operations or route activation.

## Full source-bound selector

CSRGuildBattleMgr.GetCurGVGPhase Gaab938 returns a pair<int,int>. It gets
CGMTime via G73e298 and calls GetCurServerTimeStamp G7977fc at Gaab98a.
The following schedule fields are raw32-bit words in manager storage:

```text
+60 teaser_begin_dtm   -> phase1
+64 register_begin_dtm -> phase2
+68 matching_begin_dtm -> phase3
+6c deploy_begin_dtm   -> phase4
+70 combat_begin_dtm   -> phase5
+74 calc_begin_dtm     -> phase6
+78 result_begin_dtm   -> phase7
+7c finish_dtm         -> phase8
+80 next_gvg_dtm       -> phase9
```

Selector checks them in DESCENDING order9..1, never sorts dates or checks
membership. next_gvg must be>=1 Gaab992..994; finish must be>0 Gaab9a8..aa;
all other fields must be>=1. Every comparison is SIGNED32 (BLT/BLE/BGE).
For each positive field it computes current server timestamp PLUS manager+e0
with plain32-bit ADD, then chooses that phase only when the field is STRICTLY
LESS than the adjusted current time. At exact boundary equality the preceding
phase remains active (unless a higher phase independently already qualifies).
No eligible field yields phase0 Gaaba66..6a. Phase9 immediately returns second0.

For phases1..8, the second return word is the NEXT schedule word selected
by indexed load manager+(60+phase*4) Gaaba44..48, MINUS the timejump
Gaaba4a. It is an absolute next-phase timestamp, not seconds remaining.
ADD/SUB arithmetic wraps to low32 bits; returned words/branches are signed32.
This applies even to misordered explicit dates; native picks the highest
eligible phase rather than first chronological interval.

## Timejump is an explicit native debugging adjustment

Do not confuse manager+e0 with a server timezone or inferred offset.
CSRGuildBattleMgr.AddTimeJump(long) Gab1dc2 loads+e0, adds its r1 argument
Gab1dc6 and writes+e0 Gab1dc8. ARM32 long is32 bits; there is no sign or
positivity admission in this method. Negative jumps and overflow use ordinary
32-bit arithmetic. ResetTimeJump Gab1dce writes literal0 Gab1dd0.
Original constructor Gac9dec..9df0 zeroes16bytes from+d8, including+e0.

CGMTime.GetCurServerTimeStamp G7977fc obtains system millisecond time
G797802, divides by1000 G797806..80c, adds its synchronized server anchor+20
G797810/814 and subtracts local anchor+8 G797812/816. It returns the low32
timestamp word. The pure phase seam should accept this already-observed
signed32 timestamp and optional supplied signed32 native timejump; do not
reproduce a new clock synchronization protocol or assume wall-clock date from
the name alone. Dates use numeric timestamps, not ISO strings.

## Numeric reference conversion and inactive interpretation

Battle reference parser stores teaser at BATTLE_INFO+10 Gaa337e,
register+14 Gaa33c4 and subsequent schedule words consecutively. Integer JSON
branches read low32; string/double branches use a64-bit conversion then store
only its lowword (Gaa3374/Gaa337e, Gaa33be/Gaa33c4). A supported publication
validator should preserve exact numeric admission and reject narrowing aliases
instead of copying permissive native conversions.

Nine supplied zero/negative words all select phase0; sufficiently future words
can also select phase0. This positively defines phase0 as the selector's
no-current-eligible-boundary case. It does NOT recover an original production
disabled-schedule record, permit inventing nine zero dates, or prove empty
camp/point/reward structures safe for every scene. A complete independently
supplied reference can be checked against this predicate without changing it.
Original schedules, numerical camp/reward/point rows remain missing.

GetCurActionID Gab0698 calls this selector and accepts ONLY phases2..7
Gab06b6..bc. Outside that range it returns the original EMPTY string
Gab070c..714. Inside it formats phase with current BATTLE_INFO.id. A Guild
alone cannot produce this action ID: selection depends on the separate GvG
reference clock, while enrollment depends on separate PLAY_DATA as already
documented in gvg-entry-instance-cache-native-2026-10-13.md.

## Concrete safe next unit

A pure gvgPhaseAt decoder is fully grounded now: detached explicit schedule,
signed32 clock/jump, wrap32 addition/subtraction, descending predicates,
strict-boundary equality, phase0/9 second0 and absolute next timestamp. Tests
can use authored dates and cover negative jumps, wrap and misordered fields
without claiming an original schedule or enabling any battle.

Full GetRef parser is a separate larger boundary: gvg.id strict string,
reward rows CP bounds+SRREWARD_INFO, at most two inf_reward consumers, point
numeric rows and localized camp/link graph. CAMP.link_camp is itself a STRING
parsed as JSON by G8447e4 at Gab2f0c; it must not be supplied as a direct array.
These consumers should be independently validated before accepting full
publication. No schedule-free successful empty reference is justified, and
no GetInst or GvG route is enabled by this source note.

## Implemented offline selector

`src/gvg-phase.ts` now extracts the nine complete numeric schedule words and
provides `gvgPhaseAt` and `gvgPhaseTimingAt`. Signed32 or uint32 integer spellings
retain their native low bits; signed comparisons and wrap32 clock/time-jump
addition and deadline subtraction follow the original. Native loose string/
float conversions are outside the strict supported input subset. The returned
nextServerSeconds is an absolute server timestamp, not a countdown.

Authored tests cover all nine equality/next-second boundaries, explicit zero
markers, descending priority with misordered timestamps, positive/negative
jumps, signed wrap and unsigned word spellings, detached extraction, missing
fields and malformed scalars. No dates are generated, no recurring period or
timezone policy is assigned, and no routes/state import the helper. This is
not complete GetRef validation or evidence of a rendered GvG venue.
