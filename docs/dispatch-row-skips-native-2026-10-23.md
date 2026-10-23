# Sequential local dispatch row skips

The opt-in local-manda-sequential mode extends whole-job paid finish with a
bounded current-row operation. It accepts the first unfinished row under the
captured effective schedule, charges the native client's nominal one-Manda
row quote, and rebases later rows to match its NextAutoCombat(true) prediction.
Free-first debit, current-row-only admission and persistent schedule replay are
explicit LOCAL policy. Original backend scheduling and currency priority are
not recovered by this work.

Original ARM ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are retained Ghidra/code coordinates, ELF code offsets plus0x10000.
Only original-source reads and disposable state tests occurred in this lane;
no UI, live account, runtime configuration, DataDump or APK was changed.

## Exact per-row native producer and funds check

CSRPopUpEntrust.OnButtonClick recognizes BT_CLEAR at Gb7dd5c. It matches the
clicked button against its row-list node+0x54 at Gb7dda0/Gb7dda4 and captures
the matching node+8 row data at Gb7dde8/Gb7ddee. The later confirmation
callback reads that row's serial at Gb82ad6 and sends RequestSkipEntrust at
Gb82af6 with that serial, literal use_iap_qty1 and is_tuto0. is_iap_pass is
derived by the requester from the cached entitlement. This is the clicked row,
not a producer that searches for the first unfinished server row.

Its funds check calls CPVDataMgr.get at Gb7dda8, loads paid/free words at
+0x9c/+0xa0 at Gb7ddac, then **CMN** Gb7ddb0 and **BEQ** Gb7ddb2 reject
a zero wrapped32-bit total. The confirmation amount is literal1 at Gb7ddfa;
the request's amount is literal1 at Gb82aea/Gb82aee. Unlike Gem removal's
signed comparison, this is a nonzero combined-word check for a one-unit fee.
The supported local wallet domain requires nonnegative uint32 components,
their sum not exceeding uint32 and enough funds; overflow is not reproduced.
The client does not establish paid-versus-free consumption priority.

## Why supported rows are sequential

The future-row audit documents the actual UI builder: Gb8311a–Gb83124 adds
only rows with both begin/end UTC nonzero. It does not test begin<=now.
Publishing every future timestamp therefore exposes future-row buttons.
Normal Start/Refresh/mission projection instead leaves completed/current rows
visible and supplies zero/zero timestamps for future rows, retaining the full
vector and count. Native GetSkipPrice still derives the same deadline from
the nonzero prefix plus remaining_count*duration. These projections never
overwrite the complete original schedule in the durable job.

ParseSkip addresses the selected existing vector index directly at
G9b9b92–G9b9b9e and stamps supplied row.end_utc to the receipt-time server
word at G9b9cb0. Its success callback marks the clicked UI row done at
Gb82bd8, calls SetResult Gb82bea, then NextAutoCombat(true) Gb82bf2.
NextAutoCombat takes now as the next UI begin at Gb80604/Gb80608, selects
last displayed serial+1 at Gb8065a–Gb80662, and computes end=begin+duration
at Gb80672–Gb80684. It appends through AddList at Gb806ae. There is no
immediate Refresh/model rewrite in that callback.

The supported server operation therefore shortens the current row to paid_at
and rebases later begins/ends sequentially with their unchanged per-row
duration. Only the selected row is returned in the per-row Skip receipt; the
native callback supplies its own next-row UI prediction. Returning the next
row too would stamp it completed in ParseSkip, rather than merely forecast it.
Timestamp differences between server acceptance and native receipt are not
claimed bit-exact; later absolute Refresh/mission hydration reconciles the
captured effective schedule.

## Active-job receipts and whole finish

The original job snapshot remains immutable. Its optional nonempty row_skips
contains ordered {serial, completed_at, charged_fee:1} records. Replay starts
from the original schedule and validates each receipt at its captured time:
the pass was expired, that serial was then the first unfinished current row,
the row was not already naturally complete or previously paid, and its fee is1.
Receipt times are nondecreasing; equal times are valid when users immediately
skip consecutive rows. Natural completion can create gaps in paid serials.

Schema19 is required while row receipts are retained in an active job; older
headers reject them. The minimal higher-cohort dispatches/quests arrays remain
present. Restore and projection use captured times, not today's wall clock,
so passing the original deadline or disabling the producer cannot erase paid
work. New policy, reward, rate or pass settings do not retune the captured job.

Whole-job serial-1 remains available in sequential mode. It uses the source
float32 GetSkipPrice arithmetic on the compressed effective schedule. Paid
prefix rows can have equal ends, so the original strict-increasing original
schedule validator cannot be applied unchanged to that derived schedule.
Only replay-proven paid shortening admits these equalities; arbitrary broken
or equal future ordinary rows are not authorized.

An existing paid_finish is validated against the effective schedule after row
replay. The legacy local-manda-all mode still refuses positive serials, but
can finish a captured sequential job at its compressed quote. Disabled mode
preserves all commitments and permits the normal eventual End path.

Per-row Skip changes only the selected Manda components. It grants no AP,
gold, team/Hunter EXP or inventory. Normal End settles the existing captured
award recipe once after the effective deadline or whole paid completion.
Then the normal collected journal retains last_id/last_deck, and schema may
fall back to2 when no higher feature remains. This is an active-job payment
record, not a newly invented permanent transaction history.

Every malformed, disabled, stale, duplicate or unsupported Skip refusal retains
ret_data:null, including auth failures. This bypasses native nonnull failure
wallet/cache mutations. Duplicate success is not replayed or charged again;
Refresh is an absolute cache projection, not an automatic hot wallet-recovery
callback. Existing cold bootstrap/inventory reconciliation limits still apply.

## Verification boundary

The focused state test passes for current-row fee1, same-second consecutive
rows, immutable original/no early awards, temporary-write and rename rollback
with original object references, schema19/older headers, corrupt/reordered/
duplicate/future/time/fee receipts, normalization without Date.now, later-clock
modeoff load, configuration drift, natural row expiry, and row-to-whole finish.
It verifies a compressed quote3 after two immediate rows under supplied rate60,
unchanged peers, End-only awards, no-additive End repair and schema fallback.
Those rates, rewards and account fixtures are authored. No native per-row
acceptance, displayed compressed quote, wallet debit or win is claimed here.

Run `npm run test:dispatch-row-skips` for compiled pure, state and encrypted HTTP cases plus legacy whole/timed/instant and all-cohort regressions. No launch profile was enabled.
