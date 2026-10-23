# Native rankings, daily reward and campaign validation

2026-10-23. Human explicitly resumed exclusive BlueStacks control, including
battle taps and earned progression. Previous Escape hold is superseded.
Only the instrumented package was operated; original app/phone untouched.
Computer Use skill used for Windows actions. No APK patch/rebuild occurred.

## Runtime and preservation

Local listener PID62012, port8080, current-e6-materials profile:139 packages,
stamp1634683, existing +15 instrumented APK. Controlled reload while Village
was idle loaded the campaign durability fix; whole private save was byte-exact
across reload. Private backups are ignored under
local/private/native-20261023-20261023T001531493/: state.json,
pre-campaign-reload.json, pre-battle.json and post-battle.json.
Original preboot snapshot SHA256:
ece653a392e4e179ba907c3a9c3d1a8a2ce72284879e01493b2cc398dc4a0b2e.
No private state or credentials were committed. Docker, Collector, inference
and DataDump remained untouched.

## Fight Club and login

Opened Fight Club→previous rankings→Overall: native GetGlobalRankList rendered
owned Captain1000001 rank1,30Point, saved Local revival sparring comment.
Own profile rendered four actual portraits, attack power26243 and rank1/30.
Friend tab likewise rendered self rank1/30; its start-message field differs
from the Overall victory-message field. This is local-owned ranking data,
not an original online population or historical-season reconstruction.

Native day8 login claim rendered Received and calendar stamp. Persisted exactly
+100gold,+20VIP EXP; AP/BP/honor unchanged, both other games byte-equivalent as
JSON. VIP reward thumbnail is still blank/unresolved.
Profile01/01/2070 is separately source-closed to epoch0 and original date format;
creation date remains unknown. See profile-epoch-zero-display-2026-10-23.md.

## Campaign

Entered Snowfield stage10 and Begin Battle; HUD Nene vs one Penguin. One prompt
12-click ordinary attack burst at window(881,379) defeated it; stopped input
once it disappeared. Native Victory showed four living participants and one
capsule. Next returned safely to Snowfield, stage10 with three stars,26/30.
Native mission Start and Complete returned200. Existing generic preparation
title First Expedition is fixture text, not stage-identity evidence.

Compared complete saved games to the immediate pre-battle backup:
- n_01_10 achievements[0,2]→[0,1,2], star count2→3.
- Total stars130→131; Snowfield25→26/30.
- AP60→59, BP10 unchanged; AIRSHIP_TICKET63→64.
- Four participants each +10EXP, no level change.
- Gold13700/team EXP1500/VIP EXP100/honor30 unchanged.
- No clear/deck/quest/mail/unrelated reward changes; both other games exact.
- active_battle null, active_stage_id empty after completion.

This verifies local fixture campaign progression on the atomic handlers; it
does not restore original per-stage encounters or drop laws. E6S04/CB0602 is
still uncleared. No E7/E8 native entry or progression grant was performed.

Ignored JPEG evidence: local/native-validation-20261023/overall-ranking.jpg,
own-ranking-profile.jpg, friend-ranking.jpg, day8-received.jpg,
campaign-victory.jpg and snowfield-26-stars.jpg. Server route-only evidence is
in ignored local/native-validation-20261023-server-atomic.log.

## Gym, formation and owned leader continuation

Native Build Team displayed the four saved Hunters/power26243. Removing Nene
from slot2 then selecting her owned row restored the exact ordered formation;
no other deck was changed. Whole saved games were compared afterward.

Village lower arrow reveals Gym; its original Westfield introduction rendered,
then the get-stronger choice opened Hunter List10/100. Native Nene detail
rendered Lv6/30, HP1810/ATK732/DEF870 and locked state. Leader crown opened
the original confirmation and SetLeader succeeded: crown gold, sole persisted
gameplay delta leader1000001 to1000004; other two games exact. Returning to the
list marked Nene Leader. Selecting Captain and confirming restored1000001 and
its gold crown. All three complete saved games were EXACT to pre-leader-ui.json
after restoration, including wallets, cards, locks, formations and progress.

Skill Training opens, but Nene active and unlocked passive3 preview zero
growth/empty supplied effects respectively; no training fee was spent. Its
passive label remains Skill3 under the existing reconstructed wrappers.
Captain Equipment click gave native Available when advanced to4-star notice;
no equipment upgrade/request was attempted. Ended safely in lower Village.
Ignored evidence nene-native-leader.jpg and captain-leader-restored.jpg retained
under the same local/native-validation-20261023 directory.

The bounded read-only item reference observer, client4606, exited0 after
0.738784s: default-delete-qualified22-row cache, VIP1->ICON_VE, RP1->IT_CO,
DUMMY missing, no native getters. Instrumented capture retained locally at
local/verification/item-references-20261023.txt. No private save mutation or
client patch followed. See vip-thumbnail-native-boundary-2026-10-23.md.

## Native duplicate-character admission

A proposed second-Nene reserve strategy was directly tested before any battle.
Removed Captain from ordinary slot3, then clicked the already-owned second
Nene1000017/Lv1 row. The native client rejected it with The same character
cannot be in a team. Slot3 remained empty and no duplicate was selected.
Captain was restored through its visible roster row, returning team power26243
and the exact original deck. All three complete saved games matched the
pre-leader-ui snapshot afterward. No battle, spend, consumption or grant.
Ignored screenshot duplicate-hunter-refused.jpg retains the toast. This
disproves the duplicate-Nene strategy for native ordinary formation; distinct
owned instance IDs alone do not establish distinct-character eligibility.

The type1 request admission fix was independently reviewed and passed the full
229-program suite, build and compiled new test. Server listener45504 now loads
that fix on the unchanged139/stamp1634683 profile. Whole private save bytes
were EXACT across idle reload; safe lower Village was freshly observed.
This is compiled server admission proof plus original native UI refusal, not
a native request from the rejecting UI or a broader character-family law.
