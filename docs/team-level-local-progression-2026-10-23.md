# Explicit local team-level progression

The native Guild entry was verified after the compatible170 resource boot:
the lower Village fist-emblem building displays "Only those at level 5 or
higher can enter." Original BT_GUILD (CRC32 60ee2579), Village OnButtonClick
Gdaf63c–642, checks GetUserLevel > 4. This is a real account/team-level gate;
it does not use Hunter levels, an Episode clear, or Guild membership.

The existing GetLevel.user fixture has just min_exp 0 and 100. The native
getter counts the ordered threshold prefix and returns at least 1. Consequently
that fixture caps team level at 2 even when this save has 1500 earned EXP.
The server's teamLevel function correctly mirrors the same rule. The problem
is fixture capacity, not a missing grant or a level scalar that can be patched.

The original numeric account EXP curve remains unrecovered. Recovered notes
and the3626-image text corpus do not close a cumulative account EXP/level pair;
nearby four-participant EXP rewards are Hunter payouts. A bounded web check
also found no authoritative threshold table. No original threshold claim is
made by the following explicit local policy.

Set BLUSTONE_TEAM_LEVEL_PROFILE=local-linear-100 before server startup to
extend the existing fixture's100-EXP steps to100 rows: level1 threshold0,
level2 threshold100, level5 threshold400, level100 threshold9900. Both the step
and cap are authored local choices. Missing/legacy selects the exact old two
rows. Unknown values refuse startup. Each call returns detached rows.

The launchers also expose --team-level-profile local-linear-100 (Node) or
-TeamLevelProfile local-linear-100 (PowerShell); they validate the exact named
choice and print a LOCAL policy notice. The checked-in resource profiles are
unchanged, so the wider curve remains an explicit operator choice.

GetLevel.user, native GetUserLevel, server area gates and mission EXP/level
receipts consume the same selected table. Hunter curves, combat stats, VIP,
max AP/BP and level-up rewards are unchanged. Existing EXP is not rewritten;
1500 derives local team level16. Changing or reverting this setting requires
a fresh server/app reference load and does not edit a persisted level field.
This is progression policy, separate from the original resource profile stamp.

Tests cover legacy defaults, local boundaries/cap, unknown-mode refusal,
detached rows, real compiled GetLevel route output, save-preserving load and
revert, and an authored mission transition380→410 with nested level4→5.
The normal earned team EXP test remains passing. A private copy of all three
live game objects also loaded exactly under this mode: derived levels16/1/1,
with both original and copy files byte-exact. The private data stays ignored.

The setting does not enable Guild creation, membership, numerical Guild level
tables, fees or GvG providers. Joined Guild workflows still require their own
data and policy. Native application of the table and Guild screen validation
are recorded in the latest AGENTS.md continuation; tests alone do not prove it.
