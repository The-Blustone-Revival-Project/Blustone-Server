# Fight Club save failure recovery

A disposable in-memory reproduction confirmed that failed Enter persistence
left deck count1 ->3 while reporting failure. BattleStart and BattleComplete
used the same mutate-before-persist sequence without rollback: a failed Start
could retain a BP debit/attempt, and a failed completion could retain a reward
and remove the attempt before its receipt became durable.

arenaRequest now wraps its existing transition with an exact targeted snapshot:
BP, BP anchor, honor, Arena field values and original formation length. Any
exception restores those values on the original nested objects and truncates
only appended formations. Original deck rows/lists, active attempt and previous
receipt references survive. Successful native payloads and existing local BP,
honor, rating, league and no-nonce semantics are unchanged.

This transaction boundary begins after ServerState's existing gameFor resource
access. Its independent lazy recovery/migration is not rolled back by the
service wrapper. This change does not invent a transport transaction nonce or
make stale completions across later same-target Starts distinguishable.

Tests use isolated disposable state, fixed time and real filesystem failures:
a directory blocking .tmp writes and a directory blocking final rename.
Entry with no Arena decks and with an existing attack deck, Start without
prior Enter, winning/losing completion, exact nested references, unrelated
accounts, successful retries, no-write receipt replay and restart are covered.
No original assets, live client, private saves or instrumented APK are changed.
