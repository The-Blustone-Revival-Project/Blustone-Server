# Campaign replay progression and hidden-origin ownership fix

One ordinary n_01_01 replay won natively against the migrated server. Its
accepted completion awarded10EXP each: Lantern590→600, Mowgli490→500,
Nene490→500 and Tyltyl1090→1100, plus Search capsule61→62. Replay gold and
teamEXP stayed13000/1500 in that receipt. Native Build Team after client reload
displayed levels7/6/6/12 and strength26243, up from26130. Level growth magnitudes
remain local fixtures over historical stat observations, not recovered balance.

That replay exposed an inherited full-mode fixture bug. n_00 (hidden Village
origin) and n_01 (Snowfield) both linked n_01_01. Return routing selected Village,
displaying a malformed node number4294967287 and3/3 stars. Its synthetic origin
reward catalog allowed native claims for thresholds1 and2:500gold and one914 plus
one913 ticket. These are erroneous fixture rewards exposed by the duplicate link,
not replay gold or recovered original rewards. The saved claims/items/gold were
preserved; no rollback, host grant or save edit was performed. Baseline gold13500
therefore includes this observed bug. A later native Day7 login receipt added100
gold/20VIP EXP, yielding13600/80; it is separately recorded from campaign rewards.

## Change

Full mode retains the hidden ordinal0 origin record with no playable stage links
or chest rewards. All50 recovered campaign IDs now have one CSV-matching area
owner; n_01_01 belongs only to Snowfield. Both nested and top-level link forms
remain consistent. Empty visible areas still refuse, and a synthetic origin chest
claim now refuses without mutating the game. Historical minimal mode keeps its
original two areas, origin link and17stage table unchanged.

Recovered evidence supports hidden origin visibility and the50stage ownership
mapping. An original empty-origin server response has not been recovered; this
is a compatibility correction for the observed duplicate ownership defect.

Read-only original ELF inspection from DataDump independently verifies
CSRGameStage::GetStageLinksDataToStageID: dynsym st_value a19811 (Thumb), size112;
ELF entrya19810 corresponds to Ghidraa29810. It walks the link vector at+18/+1c
in1c-byte strides, compares the stage string atlink+10 and returns the first
match. GetPairArea (ELFa19d20/Ga29d20) instead looks up a separate map at+30; its
map writer and exact result-scene caller were not audited here. Do not describe
that separate function as a direct call to the vector helper. Raw bounded
disassembly is private in Instrumented's campaign-levels-001 evidence directory.

## Verification and activation

All48 server test scripts, TypeScript build and diff checks passed. Tests cover
50unique owners, both link forms, empty origin/rewards, rejection of an empty
visible area, independent same-threshold rewards in Snowfield/Glacier and
nonmutating origin-claim refusal. An isolated minimal-mode check preserved its
historical content.

The compiled external-process verifier now requests encrypted GetArea and asserts
unique50ownership, absent origin rewards and Snowfield ownership of n_01_01. It
also passed encrypted ECDH/HMAC/AES, lobby/reference/Episode,139package/ranged206
checks and persisted credential restart with all three preserved games intact.

Activated against the existing save with wrapper10020/listener55192, current-e6,
139packages/stamp1634683. Before client reload, all three gameStates were exactly
unchanged against the activation snapshot. Installed+15 APK was not rebuilt or
cleared; new client25370 booted and the native team view displayed earned levels.
No resource/version stamp was bumped for this reference correction.

Native corrected return-map verification remains PENDING: subsequent screen
observations became inconsistent, and Windows control found BlueStacks minimized
and failed twice to restore its captured window. Root stopped further game inputs
and requested restoration. No new battle was started after activation. Last save
has active_battle null/active_stage_id empty; other two games are exact. Main
changes since activation are normal clocks/day-reset fields and the recorded
Day7 login receipt. Do not claim the corrected native return path passed yet.
