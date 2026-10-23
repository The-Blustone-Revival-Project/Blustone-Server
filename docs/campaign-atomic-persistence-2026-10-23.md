# Atomic ordinary campaign Start and Complete

2026-10-23. Scope: durability of the existing campaign lifecycle. No original
stage/monster balance, star policy, drop quantities, area gate, request parser,
receipt grammar or client binary was changed. Source lane used no device inputs;
root subsequently validated the compiled handlers through native gameplay.

## Concrete progression defect

Start previously debited AP, replaced active_battle and changed the mission
list before its final persistence call. Complete without a configured local
quest mutated the live game directly before saving: AP refund, participant
EXP, first-clear gold/team EXP, stars/clears, Search capsules, mail/Special
Supply and battle completion could remain changed in memory when the write or
atomic rename failed. A retry and a process restart could then disagree about
what was spent or earned. The prior local-quest path had its own narrower
candidate/rollback implementation, so durability also depended on quest mode.

The reconstructed native Start success gate and Complete receipt are retained.
The underlying50 recovered campaign IDs and area ownership are already present;
the recovered stage-identifier export supplies no original per-stage monster
assignment, wave count, reward table or numerical difficulty. This work does
not substitute new guessed encounter content for those missing tables.

## Transaction boundary

Both handlers now run their existing mutation core against a detached game.
The core marks when the campaign needs saving; Complete also returns its next
captured local-quest journal through a separate callback. Accepted operations
stage that entire game and quest journal together for the synchronous writer.
Original map entries are restored in finally regardless of write/rename result.
Only after durable replacement succeeds is the candidate published into the
original game graph; successful capsule/card/mission/array references remain
usable. No transient game object is exposed as the authoritative live owner.

A failed campaign save leaves the prior file, all account/game/quest values,
original map entries and nested live references untouched. Start can be retried
without a phantom AP debit or unavailable log. Complete can be retried without
a missing refund, skipped award, duplicate capsule or partially advanced quest.
Refused requests and acknowledged same-attempt replays do not perform a new
campaign write. Existing accepted/refused native response codes are unchanged.

The existing **preceding** gameFor resource regeneration/migration and
ensureLocalQuests lazy-capture boundaries remain unchanged. Tests first settle
those entry boundaries; this is not a claim that an unrelated lazy writer or
all pre-handler resource-clock failures are now atomic. Authentication/session
admission and transport exactly-once behavior are likewise separate.

## Verification

New tests/campaign-atomic-state.ts forces real .tmp-write and destination-rename
failure for Start, first win with newly allocated capsule/mail/Special Supply,
replay win with an existing capsule, loss/refund and configured local-quest
completion. It compares complete game/account/quest values, prior bytes and
every original nested object/array identity, then proves successful retry and
restoration. First-clear rewards stay once-only; replay pays existing local
participant EXP/capsule policy; loss refunds only its accepted AP charge once.
The authored fixed quest is captured through its actual GetRefList path and
advances with the same saved campaign completion, not before it.

Source-run TSX tests PASS: campaign-atomic-state, mission-start-admission,
mission-hunter-exp, mission-complete, campaign, chest-reward, local-quests-state,
local-linear-quests-state, mail and special-supply. Build/compiled verification
is intentionally left to the root lane when the active native runtime is safe;
this lane did not write dist, rebuild/reload the server, or operate BlueStacks.
Native battle outcome authority and final-version numerical balance remain
outside these persistence checks.

## Root integration and native validation

Full228-program npm test, TypeScript build and all8 resource-profile programs
passed. The rebuilt local server was loaded only while Village was idle; the
private save remained byte-identical across that controlled restart.

Human explicitly resumed exclusive BlueStacks control. Native n_01_10 Start
and Complete both returned200. Prompt ordinary scene taps defeated its Penguin;
Victory rendered and Next returned to Snowfield. Persisted AP60→59, capsule
AIRSHIP_TICKET63→64, participating four Hunters each +10 EXP; gold/team EXP,
BP, honor and all other owners remained unchanged. Stage achievements[0,2]
became[0,1,2], total stars130→131, Snowfield25→26/30. No active battle remains.
This proves the existing local fixture encounter/reward loop on the new code,
not recovered final-version campaign balance or native failure injection.
See native-validation-2026-10-23.md for retained local evidence.
