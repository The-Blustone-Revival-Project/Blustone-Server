# New Hunter acquisition dates

Actual premium and trace recruitment now record `regdate` as the creation time
in uint32 epoch seconds. The field already existed, but every new grant used
the generic template value0. Existing owned dates remain untouched. Starter
fixtures, transient Arena rivals and the fixed Search helper keep their existing
template dates; this is not a retrofit of acquisition history.

The native [quick-advancement audit](quick-advancement-use-item-native-2026-10-16.md)
closes the field and units. CSRCard.parseG8680a4 selects the `regdate` literal
atG8681ac/1b4, calls JSON operator[]G8681b6, converts a numeric value to uint32
(VCVT.U32.F64 atG8681f6 when applicable), and stores the low word with a zero
high word to card+18 atG868200. GetJustRankUpRemainedTG867a3c reads that exact
low word atG867a5e. The native clock chain uses CLOCK_REALTIME milliseconds,
divides by1000 and adjusts by server-supplied seconds.

For references below900, that getter uses native signed32 arithmetic over
regdate+3600−serverTime, returning a positive remainder or0. The server does
not reproduce or extend this timer. A new zero-dated card cannot have a positive
remainder at the present epoch. Fixing the field removes that obstacle for new
grants, but does not establish entitlement, all activation paths or a successful
SU1/SU2 award. `/world/UseItem` remains guarded.

Each accepted batch samples and validates the host clock once before payment,
ID allocation or trace consumption. All cards in that batch receive the same
second. Negative, fractional, unsafe or out-of-uint32 clocks refuse; no wrapped
or millisecond value is published. Persistence remains the existing atomic
owned-recruitment transaction, with rollback of wallet/allocator/ownership/book
or trace quantity if saving fails. Existing lazy energy recovery remains its
separate preceding boundary. Restoring a save or retrying a refused operation
does not re-date existing cards. No new schema, item, card, currency or grant is
introduced; only dates on actual new grants change.

Focused checks cover timestamp units/bounds, gacha and trace batches, different
acquisition dates, untouched templates and old cards, exact failure rollback,
invalid-clock no-debit and restart. The compiled encrypted minimum-rank HTTP
test also bounds the actual gacha wire timestamp by host epoch seconds and
checks the same date after restart. No live save/profile, client APK, original
asset, physical device, Docker, Collector or inference endpoint changed.
