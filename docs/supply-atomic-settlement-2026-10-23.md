# Atomic Special and Activity Supply settlement

Special Supply and the local daily Activity Supply now restore in-memory state
when persistence fails. Previously each could mark a reward claimed and increase
its wallet before an unsuccessful write or rename, leaving the live process
ahead of the saved file. The repair changes no reward amount, source, schedule,
request identity or native receipt shape.

Special single and Collect All settlement restore the previous gold balance
and only the newly claimed row flags on failure. Already claimed rows remain
claimed; nested arrays and row objects keep their identities. A retry pays only
fresh rows, including mixed lists containing earlier claims. A fully settled
repeat returns its existing ID acknowledgement without another write or award.

Activity validates the native activity ID, clock and prior cycle before touching
an existing game's resource clocks. Regeneration is planned on a detached
shallow model. Its AP reward, naturally elapsed AP/BP recovery, both regeneration
anchors and daily claim marker are committed in one persistence operation.
Failure restores all five scalar fields on the same game object. Invalid or
already received requests cannot cause a preliminary gameFor regeneration/write.

The result must fit native uint32 AP and AP charge-time fields. Legitimate AP
above max_ap remains preserved within that range; a JS-safe value above
0xffffffff is refused before mutation. The existing LOCAL10 AP award and UTC
cycle are unchanged and are not claimed as recovered original balance.
Special first-clear10-gold bonuses likewise remain the existing local rule.

## Native counterproof and wire contract

The companion `supply-reward-receipt-boundaries-native-2026-10-23.md` establishes
that neither callback uses generic SyncUser. Special has independent optional
wallet branches, so a gold-only user object does not zero Manda. Activity reads
nested user.ap.cur and user.ap.ap_charge_time; it does not require ap.prev.
The suspected generic wallet-reset issue was disproved, and no unnecessary
Manda scalar fields were added. Login Bonus remains a separate settlement.

## Verification

The new state test uses three disposable accounts and real temporary-write and
rename failures. It checks exact nested references, all gameplay/account/save
bytes, due AP/BP recovery and residual anchors, current/future-cycle refusal,
invalid clocks and native capacity limits, peers, Manda, retry and cold restart.
The new signed P384/AES HTTP test earns two Special bonuses through actual local
mission model transitions, then exercises individual and mixed Collect All
requests, both disk failures as HTTP500, no success receipt on failure, and
once-only retry. These are test fixture completions, not native battle proof.
Activity also passes over encrypted HTTP with due recovery and disk failures.

```text
npm run test:supply-atomic
npm test
```

The server build, focused state/HTTP tests and existing Special/Activity programs
pass. Full suite status is recorded in AGENTS.md and
`local/supply-atomic-full-tests-20261023.log`; focused output is
`local/supply-atomic-focused-20261023.log`. No save schema changes are needed.
No live claim, account mutation, server restart, game input, APK build/install,
original/DataDump edit or release occurred. Native validation remains pending.

Full `npm test` passed252 programs (250 previous plus two new). The final
compiled state test also verifies the last valid uint32 AP balance succeeds,
while larger balances and charge deadlines refuse without mutation.
