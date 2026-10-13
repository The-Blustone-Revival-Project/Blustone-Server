# Guild progression now affects Hunter Raise and rank advancement

Hunter level Raise and Hunter rank advancement now apply the source-backed
Guild TYPE3 benefit (`traning`) to each actual consumed source's raw price,
then add the adjusted fees. The source rank selects its price vector entry,
with rank0 using the first and higher ranks clamped to the last quote. This
is separate from equipment rank advancement, whose raw fee stays unchanged.

Selection uses personal Guild ID, current matching Guild INFO aggregate
contribution, and the existing complete configured level table. It does not
use a personal member total or invent a status/role/newbie exclusion. A selected
row without traning uses the null/raw-price branch. Unaffiliated accounts keep
raw fees; affiliated accounts without a valid supplied table/INFO refuse before
consuming Hunters. Numerical training prices, curves and benefit magnitudes
remain authored/local data; no original values were recovered by this change.

Mode1 uses the existing original float32 multiplier/truncation helper. Placement
matters: two authored101 quotes at333/1000 cost33+33=66, whereas multiplying
202 as one quote would cost67. Hunter rank's two1001 quotes similarly cost666,
not667. The actual native loops transform before accumulator addition. The
server refuses totals outside uint32 and malformed/insufficient gold instead of
wrapping a debit; that overflow guard is explicit local admission.

Existing target/source ownership, lock/deck/battle commitments, training curves,
rank rules, EXP receipts, source removal formats and stat calculations remain
in force. Fee benefits do not multiply earned EXP. Credited rank placeholders
are not charged as real Hunters or newly enabled as consumable IDs.

Both operations now roll back persistence failures: target EXP/rank/counter,
gold, original roster and deck references, plus rank-up book history. Rank-up
prepares the next book before mutation so malformed in-memory history refuses
without partial consumption. The successful callback shapes remain unchanged.

The disposable integration test starts with Guild aggregate0 and another
member's personal contribution0. A real local donation raises the aggregate
to100; the peer then receives the configured threshold benefit for both Raise
and rank. It checks the distinguishing per-source rounding, raw absent-benefit
branch, missing-table refusal, real temporary-write rollback, malformed-book
precommit refusal, target/source updates, restart and unchanged Guild/donor
state. It uses production owned-ID namespaces and authored fixture cards.

Backend consumers are implemented; no live profile/flags/input/APK changed.
Native fee-panel rendering, original numerical references and reward claims
remain unverified. See hunter-training-guild-per-source-fee-native-2026-10-13.md
for exact source loop/getter addresses and guild-local-donation-workflow-
2026-10-13.md for the explicitly local donation/counter policy.
