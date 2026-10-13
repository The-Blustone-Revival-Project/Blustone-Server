# Mission-instance hydration envelope and explicit pass metadata

2026-10-13. Read-only original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code coordinates ELF+0x10000; data addresses retain ELF virtual mapping.
Server source evidence only; no live inputs, persistence, jobs, entitlements,
AP/EXP/items or DataDump changes. Follows the Start/Refresh and clock/hydration
notes; this closes their previously unresolved complete HTTP envelope seam.

## The generic transformer returns the complete body

CSRInstanceSync.RequestByNlohmnJson Gae59a0 builds its TASK_READY transformer
at Gae5aee..5b04 using the default callable pointer from data G21ac1f4.
Its on-disk value is ELF84001d, Thumb **G85001c**. This function parses the
complete HTTP response body's bytes into the returned JSON object at
G85004a, then indexes that same object's **result_code** G850052..56 and
calls CPVHTTPResponse.SetPVCode G7ee878 at G85009e. It never selects a
ret_data child or reconstructs a user wrapper.

The TASK_READY outer callable Gae7bf8 stores that whole returned JSON in its
shared capture at Gae7c20..36. The route callback **ReqMissionCB Gae6038**
checks response.GetResultCode1 Gae6040..48 and forwards its decoded JSON
argument unchanged to ParseMissionInfo Gb68934 (tail branch Gae6058).

**ParseMissionInfo itself indexes ret_data at Gb68950..52**, holds that
object in r5 at Gb68958 and stack+18 at Gb6899c. The later optional entrust
check/select Gb69222..3c reads this stored ret_data object. Thus the correct
publication seam is the existing HTTP envelope's **ret_data.entrust**.
It is not a top-level entrust alias, ret_data.user.entrust or ret_data.data.

Current Server `/lobby/GetMissionInst` dispatches to missionInventory.
Its tutorial-skipping branch already envelopes the mission/area/stage object;
an independently supplied complete existing snapshot can be added as a
sibling **entrust** inside that object. Preserve the other owner-scoped
mission/progress fields. The legacy branch envelopes game.missions as an
array; converting that branch to object publication is a separate compatibility
choice and must not silently discard existing legacy rows. This note does
not authorize changing either branch or importing another account's job.

## A present entrust requires complete pass metadata

The source-safe skip/preservation path is **absence of the entrust key**.
When present, ParseMissionInfo calls Start with entrust at Gb69248, then
unconditionally selects **entrust.pass** Gb69256..58 and calls
ParseAutoCombatPass G9ba8e4 at Gb69260. Start's null/active-id early exit does
not protect the independent pass parser.

Therefore a supplied hydration component has this shape:

```text
entrust: {
  <all complete Start snapshot fields>,
  pass: {
    end_datetime: STRING,
    end_datetime_utc?: int32-or-null
  }
}
```

The Start component decoder's strict own-key whitelist is intentionally
separate; an integration must explicitly split and validate pass rather than
send its entire extended hydration object to that pure Start decoder.
Missing/null pass, entrust:null and an empty acknowledged job are not safe
declarations. No fabricated null-pass default is warranted.

## Date and UTC fields preserve separate native semantics

Pass end_datetime is strictly converted to STRING G9ba900..910, parsed
using **%Y-%m-%d %H:%M:%S** G9ba9b4..9c0, and converted with the native
calendar/mktime path G9ba9da. Parse failure supplies0; success supplies the
manager+98 expiry. This is not proof that the date text uses UTC rather than
the native process's local calendar.

The **optional nonnull end_datetime_utc** branch G9ba9e8..9baa3c replaces
that same expiry field. The integral path reads the low32 word G9baa0c;
string/double coercions use signed32 conversion G9baa34. Missing/null
override preserves the calendar-derived expiry. No native date/UTC equality
check or forced timezone is recovered.

A suitable deterministic local admission for explicitly supplied metadata
can require a valid fixed-format lossless date string and an explicitly
supplied exact int32 UTC override. Gregorian/date-format validation and
requiring the override are **local** stricter admission, not source producer
law. Preserve both supplied values; do not fabricate the text, derive expiry
from current host time or normalize a contradictory pair while claiming
native parity. The native consumer uses the supplied override after reading
the text. A deliberately supplied expired record is different from guessing
"no pass" merely because source metadata is absent.

## Entitlement getter uses the UTC-zero clock and strict signed comparison

IsHavingAutoPassIAP G9b86e0 loads expiry+98 at G9b86f4, calls
**CGMTime.GetCurUTC_0 G797664** at G9b872e, and tests signed **expiry > now**
at G9b8736..3a. Equality is expired. GetLimitAutoPassIAP G9b8754 obtains
the same clock and returns plain-word expiry−now at G9b87ae; it does not
clamp a negative remainder to zero.

GetCurUTC_0 G797664 computes system milliseconds/1000 at G79766a..674,
adds the manager UTC anchor+18 G797678..67c, and subtracts its local anchor+8
G79767a..67e. This is distinct from ordinary GetCurServerTime's other server
anchor. Use the native UTC clock domain when inspecting entitlement; do not
evaluate a captured expiry against a guessed wall-clock/date timezone.

The source supports faithfully publishing an **already supplied, owner-bound
complete snapshot and explicit pass record** through the mission-instance
envelope. It supplies no purchased rights, pass duration, allocation rules,
automatic dispatch producer, rewards or replay law. Ordinary mutations remain
gated until a complete explicitly declared local policy is separately reviewed.
