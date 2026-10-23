# Native Mirage trial: two wins, final defeat and roster release

The opt-in authored zero-reward recipe now has native entry, formation,
combat, two claims and abandonment evidence. **The floor was not completed.**
Stair1 was won with human intervention after Codex reacted too slowly;
stair2 was played by Codex, and stair3 was lost. No healing activation is
claimed for Codex's attempted healing strategy.

## Configuration and native entry

The unchanged +15 instrumented APK ran against the compatible170-package
profile, stamp1634693, local100-EXP team curve and resource snapshots. The
existing2021 Rupee mode/cap3 and paid recruitment target049 were retained.
Only the explicit Mirage mode and public
`config/policies/mirage-local-zero-reward.json` were added on server restart.
The three opponents, balance10000, grades, zero gold and enrollment selection
remain authored LOCAL content, not recovered original Mirage balance.

Fresh native Search → red attendant → “I want to challenge the Mirage Ruins!”
loaded Floor1 with all three stair sections and the original background.
The first real `/mirage/GetInfo` captured five existing Hunter families and
promoted the live save from schema8 to12. Duplicate family instances were
excluded, not consumed. The separate Build Team UI displayed the five eligible
Hunters and their carried-health bars. Native `/mirage/RegisterDeck` accepted
the real selected party; no ordinary formation was copied or overwritten.

Begin Battle entered the original combat scene directly from the hydrated
Mirage cache. No invented Begin RPC was needed. The expected Nene opponent,
original environment, HP gauges, reserve Hunters, skill cut-ins and fever
presentation rendered. This is native gameplay evidence beyond synthetic
End-packet tests.

## Outcomes and control attribution

Stair1's successful native End persisted enemy HP0 and remaining player HP
fractions2173/10000/3421/8135/7344 for Nene/Bright/Mowgli/Captain/Tyltyl.
The human took over because Codex's initial reactions were too slow. Actions
observed during that takeover must not be attributed to Codex or treated as
an independently executed healing/skill validation.

After explicit control handback, Codex collected the zero-gold result through
the stair tile and prepared Captain as the next lead. Stair2's native End
again reported enemy HP0 with all five alive. Its captured party order was
Captain/Bright/Mowgli/Nene/Tyltyl, with carried HP3728/3361/2593/2762/2503.
The second native Reward advanced to stair3 without gold or another grant.

Stair3 began with those reduced HP values and Mowgli as lead. Repeated ordinary
attack bursts continued; a manual Captain-for-Tyltyl swap visibly succeeded.
Codex did not secure its planned healing activation. The party was defeated,
the native End was accepted, and all five portraits were gray on return to
preparation. Do not claim a third win, full-floor completion, manual heal or
successful manual Rage-reservation control from this run. The exact AUTO
toggle/skill-spending behavior still needs a bounded source/control check
before relying on it for another fight.

## Native abandonment and persisted-state audit

From the map, Retry opened the original active-attempt warning. Yes emitted
`/mirage/GetNextFloor`, followed by the native same-floor
`/mirage/GetInfo` reset/stay chain. The configured baseline marked the record
abandoned, cleared entry and the separate deck, and returned every owned
Hunter's Mirage HP to the historical1000 placeholder. This exercised the
previously unverified warning/owner gate and the normal native release path;
no host-authenticated gameplay request or save edit was used.

The released map displayed COMPLETE labels, including the last stair. Those
pixels are **not evidence of a third win**: this baseline's inactive state0
and retained stair3 produce that presentation after abandonment. The durable
record is `abandoned:true`, claims are exactly `[1,2]`, and highest remains0.
This presentation limitation and the recipe's single-attempt behavior remain;
automatic fresh enrollment or a complete repeatable Mirage mode is not proved.

After release, comparison against the pretrial save found only main-game
AP/BP clock fields changed. Every owned card, ordinary deck, wallet, EXP,
stage/episode progress, item and claim field returned exactly to its pretrial
value. Both other games were exact throughout. The Rupee purchase journal
remained exact; account differences were the normal OTP/login timestamp from
the deliberate client restart. Gold18700, free Manda239635 and paid240000
were unchanged. The new abandoned Mirage journal remains durably captured.

The client returned safely to Village; no battle or helper was left running.
At validation time server listener30580/session32101 and native client4750
were live. The configured policy remains selected; this does not automatically
create another attempt for the abandoned journal.

## Reproduction evidence and further work

Ignored local evidence is retained under
`local/native-validation-20261023/mirage/`: floor, preparation, battle,
defeated-party, Retry warning, abandonment popup and released-map captures.
The private pretrial backup is
`local/private/native-20261023-20261023T001531493/pre-mirage-restored-20261023T144814.json`;
post-first-win and post-abandon copies are beside it. The request trace is
`local/native-mirage-20261023-server.log` (three End, two Reward, one
GetNextFloor and reset GetInfo). Private snapshots and authentication data
must remain local.

`npm run test:mirage-public-policy` passed independently before activation,
and the public policy/test received independent source review. The new
evidence does not replace its rollback/replay/coexistence checks, nor does
that test establish native combat. No APK was patched, rebuilt or installed;
no instrumented release was required. Original assets, DataDump, the physical
phone, Docker, collector and inference were untouched.

The subsequent Instrumented source report
`docs/battle-auto-manual-skill-controls-2026-10-23.md` closes the current
OFF0→ALL2→DASH1→OFF0 cycle: DASH/TAP separates automatic attacks from full
AUTO's skill/exchange AI. It also closes one opaque255 bench-skill press,
not a hold gesture. Native DASH selection and the manual heal remain unproved.
Next combat work must qualify that mode and eligible skill control, preserve
short input-to-observation cycles, and prioritize timely healing and swaps.
The subsequent [terminal-adoption trial](mirage-terminal-adoption-native-2026-10-23.md)
now verifies configured re-entry, quota release and persistence. Truthful
abandoned-map presentation and a real final-stair/full-floor win remain open.
