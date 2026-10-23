# E6 Story04: earned strategy and the missing Nene passive boundary

2026-10-23. Source/strategy audit and ordinary formation admission fix. The parent supplied the current
roster below; this lane did not inspect live/private files, control the game,
change ownership/tiers/levels/configuration or build dist. This is an actionable
next-trial proposal, not a native victory or simulated win claim.

## Current root-reported ownership

Primary Nene003/1000004 is rank3 EXP520/nativeLv6; second Nene003/1000017 is
rank3 EXP0/Lv1. Mowgli002/1000002 is rank1 EXP520/Lv6; Tyltyl004/1000005
rank1 EXP1120/Lv12; Captain001/1000001 rank1 EXP620/Lv7. Five other rank1
Tyltyls1000012..16 are EXP0. All are locked. There is NO ordinary owned Karl:
CB0602 supplies a separate fixed Karl actor. Preserve these distinctions.
Current deck1 is002,003,001,004. The native Episode initial front has previously
been Nene despite Mowgli's earlier ordinary deck position. Do not assume changing
deck order directly determines Episode front/skill-button positions.

## Duplicate-Nene proposal: disproved by the native crew interface

The initial source-only proposal was to place the already owned second Nene
in Captain's party slot. It was based on Nene's currently selected archive
HP1750/DEF864/block33%/block reduction50 versus Captain1521/653/14%/42, and
on ServerSetDeck accepting distinct instance IDs. Those comparative CURRENT
LOCAL reference values do not establish native team eligibility.

Root tested the actual native crew interface after removing Captain from
slot3 and tapping the owned Lv1 Nene. The client showed the exact toast:
**"The same character cannot be in a team."** No checkmark/addition occurred;
the empty slot remained. Root then restored Captain through the native UI and
verified all three saved games exact to its pre-leader-ui snapshot. Private
visual evidence is retained at Server/local/native-validation-20261023/
duplicate-hunter-refused.jpg; it is ignored/unpublished, not a new public asset.

This positively DISPROVES the proposed duplicate-Nene ordinary party strategy.
Do not retry it, bypass the UI with direct SetDeck, or infer that distinct
instance serials imply distinct native characters. The original four-Hunter
party remains the baseline; no owned Hunter was consumed or tier changed.

The Server request boundary now rejects duplicate owned **ref_id** entries
within default ordinary deck type1, including distinct real instance IDs.
The whole batch refuses before writes/clock refresh/mutation. Other deck types
retain their existing independent policy; no broader duplicate-family/costume/
Arena/Search native rule was inferred from this one verified ordinary example.
Historical already-loaded clone parties are not erased, migrated or auto-fixed.
The new tests/deck-reference-uniqueness-state.ts obtains two same-ref rank3
Nenes through real paid recruitment, verifies rejection/nested-reference/file
preservation and valid distinct-ref/idempotent requests. Its TSX run PASS;
no dist build or live reload was performed by this lane.

Future actual E6 trials still need prompt ordinary attacks, source-qualified
Tyltyl's earliest funded cost4 bench heal and fresh identity after any death/
exchange. Avoid leaving live combat idle during long observer captures, or
spending every early Rage point on offensive skills and then assuming a heal
remains funded. These are resource/timing priorities, not a guaranteed clear.

## One effective existing paid upgrade

Mowgli's current active is the existing local periodic fixture, including under
ACTIVE_SKILLS=episode-complete because no original002 active donor is selected.
Its wire base_number=-19/up_number=-1 gives coefficient magnitude
(19+owned skill1 level)/100. If the actual current owned skill1 is1, training it
to the existing rank1 cap10 changes0.20→0.29, a45% increase in the coefficient,
with the same cost3 and five nominal bounded DOT applications. This does NOT
prove45% greater final HP loss after native mitigation/scheduling/clamps.
Verify current level and the native preview before purchase. Under unchanged
legacy gold-only prices, levels2..10 cost5400 total. No material or donor Hunter
is required, and the target's lock does not prohibit skill improvement.

Conversely, the current selected Captain/Nene/Tyltyl active graphs have
up_number0/duration_up0. Paying their ordinary skill levels does not increase
these adopted coefficients. Nene's displayed blank Skill3/zero effect therefore
must not be treated as an available DEF boost purchase. Plain EXP levels add
only the retained local10HP/1ATK/1DEF base terms per level before other native
bonuses; a small amount of repeated campaign grinding is not a large combat fix.

## Negative coherent-donor audit for Nene skill3/5

All152 original Episode STAT rows were filtered for ref_id003/res_idC003 and
alternate C003-prefixed bodies. Exactly three base donors exist:

- Index47 CB0003_C003: types1/2/4; cost3, cooldown5000, crit100;
  direct coefficient-2000 and target-stat15 stun1500ms.
- Index63 CB0101_003_1: types1/2/4; cost3, cooldown5000, crit100;
  direct-1800, stun2500ms, existing same periodic type4 graph.
- Index77 CB1101_003_1: types1/2/4; cost3, cooldown5000, crit50;
  direct-1500, stun2000ms; type4 has max-HP heal8/4100ms and immunity.

NONE contains type3 or5. No C003A/B/C numeric graph is available in this table.
Ordinary SKILL_REF003|3|0 says self DEF increase at battle start, with symbolic
value+value_up*skill_level; its numeric value/growth remain missing. Another
coherent donor cannot restore this passive from the recovered table. Do not mix
another Hunter's DEF node into47, silently merge77 effects, or change the chosen
variant to improve this battle. The alternatives are encounter tradeoffs, not
recovered ordinary completeness, and this strategy does not adopt them.

## Encounter and pins

Original CB0602 has four copies of M024 STAT72 (eachHP2500/ATK1800/DEF200) and
Bibi C040 STAT69 (HP4000/ATK900/DEF240), plus fixed friendly Karl. Duplicate
Karl ID CB0601_012_1 retains first original index143 under the closed native
unique insertion: HP1150/ATK750/DEF550, cost3, rank4. It is not ordinary Karl's
neutral material reference. A manual Karl-front exchange already lost in the
retained native history; do not sell it as an untried guaranteed remedy.

Source SHA256:

- EPISODE_COMBAT_CB0602.json:
  cbba3914e6e413ed008a9f67d81a7c1ac89c2c266c5577e79b6cd68259d596e9.
- EPISODE_STAT_ACTORS.json:
  f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56.
- SKILL_REF.json:
  50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70.
- Current src/skills.ts:
  a5ab990bfe4bfd678fa8a869458feab9bcbaf23539469c9a03db87eb897c1708.
- Current src/ordinary-stat-projection.ts:
  26b771ef004d22110a762e601d9b4af862e4b254f8652a241ce7bef5adc2c90c.

Relevant retained evidence: DataDump findings/episodes/episode06-entry-materials.md,
episode06-next-retry-20261010.md and findings/hunters/hunter-native-stat-growth.md;
Instrumented docs/bench-heal-native-2026-10-11.md; Server src/skill-training.ts
and src/skills.ts. Earlier bench healing proved positive net front HP gain,
not isolated heal magnitude or an earned E6 win. No new strategy was executed
by this lane; owned tiers remain unchanged, and an earned E6 win remains for root validation.

## Root integration

Independent review clear. Full229-program npm test and TypeScript build PASS;
compiled deck-reference-uniqueness-state also PASS. The first regression run
found user-details-state had constructed a duplicate-Hunter ordinary fixture.
That fixture now pays to recruit Nene beside its two distinct starter refs,
retaining fifth-slot profile coverage and all original privacy/clock assertions.
The full rerun passed. No native rule was weakened to preserve the old fixture.

Loaded the compiled guard while all three saved games were idle. Listener45504
serves the unchanged current-e6-materials139/stamp1634683 profile. Whole private
save bytes were EXACT across reload; existing +15APK unchanged, safe Village
visible, no active battle/helper. Root backup pre-ref-admission-reload.json is
ignored under local/private/native-20261023-20261023T001531493/. No duplicate
ordinary party was forced into native battle. E6S04 remains uncleared.
