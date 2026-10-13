# Opt-in local Guild gold donations

`BLUSTONE_GUILD_DONATION_MODE=local-gold` enables `/guild/Donate` after the
original Guild resource profile is selected. The mode defaults disabled and
unknown values refuse construction before restoring or writing a save. Direct
ServerState embedders may supply `guildDonationMode:"local-gold"`; the selected
profile and pinned original emblem source are still required. This checkpoint
does not change any live environment, profile, input or APK.

The native request is auth5 plus scalar `amount`; its callback consumes optional
authoritative `my_guild`, `guilds` and generic `user` receipts on result1. Original
UI selects positive multiples of1000 gold, up to100000 and available funds,
and previews floor(amount/10) contribution. These formats, slider bounds,
arithmetic and receipt consumers are recovered source evidence.

The transaction policy is explicitly LOCAL: each accepted request debits the
requested gold and increases both the authenticated actor's MEMBER contribution
and its Guild INFO aggregate by floor(amount/10). Existing local personal
projection maps MEMBER contribution into my_guild.contribution. Their original
relationship is not recovered. Distinct user-extra guild_contribution, CP,
rank, GvG totals, membership/newbie state and reward claims remain untouched.

Only an established idle game and one same-server joined Guild qualify. Pending
applications and unjoined accounts do not qualify. All joined roles, including
newcomer4, are allowed under this declared local eligibility policy. Source
does not prove original maturity/daily limits. Client target Guild, price or
counter fields cannot redirect the transaction or set its value. Amount admits
canonical decimal strings or exact numeric integers; malformed, zero, fractional,
off-step, over-limit and insufficient-funds requests refuse before mutation.

Both contribution totals must remain within the existing Guild model's positive
signed32 range, despite native unsigned parsing. No wrap/clamp/migration occurs.
Full updated records and receipts are validated before commitment. The wallet
receipt includes gold prev/cur, unchanged paid/free pairs and both iap_qty and
free_iap_qty scalar snapshots so generic SyncUser cannot reset Manda balances.
Optional Guild histories and every other account/game field are preserved.

Gold and Guild records persist in one existing atomic snapshot write/rename.
Failure restores the old Guild array and gold in memory. Successful responses
return detached authoritative personal/full Guild data and wallet receipt. No
achievement or currency reward is invented. Reloading the save preserves the
new balances and contributions; ordinary read routes hydrate those records.

The request has no recovered nonce/transaction ID. Each accepted request is a
new donation, including an identical request after a prior success. There is no
claimed automatic retry guarantee or amount-based deduplication. A lost reply
cannot be unambiguously distinguished from a deliberate second donation by
these fields alone. `/guild/ReceiveContributionReward` still refuses: cyclic
preview thresholds do not establish a claim ledger or eligibility law.

The disposable fixture verifies auth/mode/affiliation/busy/quantity/funds and
independent counter overflow refusals, absent-game noncreation, corrupt Manda
prevalidation, real temporary-write and rename failures, complete wallet/record
receipts, unchanged histories/peer games, repeated requests and restart.
Backend behavior is implemented; native donation pixels remain unverified.
Joined Guild panels additionally require independently supplied valid benefit
and mileage reference tables. No original numerical reward data or complete
scene-safety assertion follows from this transaction.

Source: guild-contribution-native-2026-10-13.md and
guild-contribution-counter-semantics-2026-10-13.md.

Donation-driven Guild aggregate thresholds now also feed source-backed per-card
Hunter Raise/rank fees. See guild-hunter-training-workflow-2026-10-13.md. Benefit
magnitudes are still supplied data; this does not enable contribution claims.
