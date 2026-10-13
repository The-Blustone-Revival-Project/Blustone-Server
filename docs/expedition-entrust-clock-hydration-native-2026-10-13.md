# Entrust clock, ClearCount and mission/pass hydration

Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra coordinates ELF+0x10000. Bounded original Thumb instructions, direct
BL/B.W call-site resolution, symbols and literal-backed consumers. Follow
expedition-entrust-start-refresh-native-2026-10-13.md for complete snapshots.
No jobs, rewards, code, live inputs/save/client or DataDump changes.

## Derived completion is a wrapped word from a nonzero prefix

CalculateAutoCombatUTC G9b92f8 operates on cached RESULT vector rows of
size0x38. It initializes lastEndLow=0 and prefixCount=0 at G9b9318..931a.
For each row it loads full64 end_utc at row+18 G9b931c and ORs both halves
G9b9320. Nonzero updates lastEndLow to the LOW word G9b9324 and increments
prefixCount G9b932c. The first full64 ZERO stops the scan G9b932e; later
rows are not inspected. No comparison with the current time occurs here.

totalRows is vector byte length/56. The remaining count is totalRows minus
prefixCount, interpreted as a signed word and clamped to zero by BIC at
G9b9340..9346. Native MLA G9b934a writes manager+9c G9b934e:

```text
derivedWord = low32(lastEndLow + max(0,totalRows-prefixCount)*complete_second)
```

All multiplication/addition is32-bit word arithmetic, not unbounded real
seconds. complete_second comes from the signed32 Start field. Empty vector
produces0. All end_utc zero produces totalRows*complete_second modulo2^32,
with origin0: the function does NOT add now or a saved receipt timestamp.
All end_utc nonzero produces the final row's low32 end word. A gap stops the
prefix even when later nonzero rows exist. A nonzero high half with low0 is
still a nonzero timestamp and supplies low0 to this particular derived word.

The Start tail G9b9146..91a6 and Refresh tail G9b9958..99ac duplicate this
algorithm. No monotonicity, duration producer or timestamp repair is inferred.
Preserve full64 source values separately even though this derived consumer
narrows them. Original backend row scheduling remains unknown.

## Countdown uses signed clamp AFTER subtraction wraps

GetTotalCompleteTimeUTC G9badd4 first checks the full64 job ID+78. Zero
returns−1 at G9bae38 even if stale derived+9c remains. For a nonzero ID,
it reads derived+9c, calls CGMTime.GetCurServerTime G797628 at G9bae2a,
subtracts the current32-bit server-time word at G9bae2e, and clamps a
negative SIGNED32 result using BIC G9bae32. Equality returns0.

```text
remaining = max(0, int32(low32(derivedWord - currentServerWord)))
```

Do not replace this with an ordinary nonwrapping positive-number subtraction.
High-bit differences become negative/zero; underflow can wrap into a positive
word. A pure offline consumer can emulate those bit operations, while a
backend producer should admit explicit supported clock ranges and describe
those restrictions as local policy. This function's historical name does
not mean its return is an absolute timestamp: it is a remaining interval.

## GetClearCount is neither the nonzero prefix nor safe claim eligibility

GetClearCount G9ba6c4 scans ALL RESULT rows until vector end. It ignores a
row with full64 end_utc==0 at G9ba708..710, but continues to later rows.
For each nonzero end it obtains the current server word and compares
zero-extended currentServerWord against the full64 **signed** end value.
SUBS low G9ba6f0 and SBCS high G9ba6f8 followed by GE G9ba6fc increment
the count when now>=end, including exact equality. The high subtraction
starts with literal0 G9ba6f4, not a sign-extension of the current word.

The crucial fallback: if this computed count is ZERO, G9ba74e..756 branches
to return the ENTIRE vector length G9ba75a..768. This includes a nonempty
list whose ends are all zero or all future. Empty vector naturally returns0.
If at least one qualifying row exists, it returns the counted rows, not the
whole vector. It is not necessarily a contiguous prefix. No job-ID guard is
present in this getter; ordinary clear empties the rows separately.

This exact UI/cache getter behavior must not become backend reward
eligibility. A source-compatible offline diagnostic may report it distinctly
from a locally defined real completed-row count. No grant or collection
authority follows from its surprising zero-count fallback.

## Actual entry hydration uses mission instances, not user.entrust

A bounded direct B.W scan closes the ParseMissionInfo caller missed by
BL-only scans: CSRInstanceSync.ReqMissionCB Gae6038 checks response
GetResultCode==1 Gae6040..6048 and tail-calls CSRPlayData.ParseMissionInfo
Gb68934 at Gae6058, passing its already-decoded JSON argument unchanged.

CSRInstanceSync constructor registers URI_COMPLETE1 with the literal
/lobby/GetMissionInst Gae4052; enum1 construction is Gae4018..401a.
ReqEnterCB Gae54f8 parses its decoded lobby argument through ParseUserInfo
Gb65850 at Gae5530, THEN issues RequestByNlohmnJson(URI_COMPLETE1) at
Gae559e..55a2. This is a separate mission-instance hydration request, not
a direct read of a guessed ret_data.user.entrust subtree.

The concrete ReqMissionCB itself does not select ret_data; its generic
transport wrapper supplies the decoded parser argument. This note closes
the route/callback/parser chain and field nesting inside that argument,
without guessing a second user wrapper or changing generic envelope aliases.

ParseMissionInfo optionally checks the KEY entrust at Gb6922a..69234.
Absent key skips the entire job/pass branch, preserving previous caches.
Present key is selected Gb6923a..3c and passed to Start Gb69248. Because
Start ignores an existing nonzero job, repeated hydration does not replace
that active job through this method alone.

## Nested pass is required when the hydration key is present

After calling Start, ParseMissionInfo UNCONDITIONALLY selects
the same entrust object's pass child Gb69256..58 and calls
ParseAutoCombatPass G9ba8e4 at Gb69260. The existence check is for entrust,
not for pass, and not for entrust's nonnull value. Start's null guard does
not bypass this subsequent pass lookup.

ParseAutoCombatPass begins by selecting end_datetime G9ba900 and strictly
converting it to string G9ba910. It has NO input-null guard. It parses the
date with "%Y-%m-%d %H:%M:%S" G9ba9b4, using the original stream/date
path; parse failure assigns0, otherwise mktime G9ba9da supplies manager+98
G9ba9e0. This is host/local-calendar interpretation, not proof of a forced
UTC timezone for that date string.

Optional end_datetime_utc is selected G9ba9e4. A nonnull value invokes its
signed32 numeric conversion G9baa34 and overrides manager+98 G9baa3c.
Missing/null override preserves the parsed date result. No source equality
between the date string and override is checked. A strict offline parser can
preserve both supplied fields and label any consistency/timezone requirements
as local admission.

Therefore entrust:{} or entrust:null or a job with missing/null pass is NOT
a source-safe hydration declaration. An absent entrust key is the observed
skip/preservation path. A future complete established job publication must
include a separately admitted pass record with strict end_datetime string;
do not fabricate an empty pass, active paid entitlement or expiry.

## Implementation boundary

Source-backed pure clock consumers are now possible, with explicit low-word
wrap, exact equality, full64 signed completion comparisons and the zero-count
fallback. They may inspect supplied snapshots but do not schedule jobs.
Original dispatch/clock production, paid-pass ownership/expiry rules,
allocation limits and collect rewards remain separate producer requirements.
Timed mutations should remain disabled until those are explicitly modeled.
