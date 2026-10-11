# Original skill mechanics for material Hunters

The isolated `src/material-skill-evidence.ts` module preserves original symbolic
skill rows, formulas, Rage costs, mechanic tags and dialogue/effect labels for
the twelve new material-backed ordinary identities. Original source hashes and
record keys remain explicit. All60 type slots have symbolic coverage, but this
does not supply ordinary final-version magnitudes or growth. The module is not
connected to active profiles, bootstrap publication or saved ownership.

Original skill1 tags and literal ordinary Rage costs are:

- Captain009: cost3, HARD_HIT/INVIN_BAN.
- Vincent010: cost3, HARD_HIT/INVIN_BAN.
- Karl Steiner012: cost3, HARD_HIT/INVIN_BAN.
- Denali013: cost4, HEAL_TEAM/CLEAR_DEBUFF.
- Locke014: cost4, BLEED.
- Lapis017: cost3, BLEED.
- Acerola030: cost4, DOT_HEAL.
- Bear036: cost4, HARD_HIT. Defense role does not imply cost3.
- Bibi040: cost3, BLEED.
- Dumble048: cost3, HARD_HIT/USE_ENEMY_ATT.
- Bright049: cost4, DOT_HEAL.
- Dino054: cost4, BLEED.

These are exact text/tag records, not guessed universal role rules. The module
also preserves original slot2/4 label bindings and all formula strings. A `nan`
binding stays the original missing marker; it does not become a made-up image
or magnitude. Text containing value/duration placeholders remains unresolved.

## Original numeric graphs: encounter scope only

The original `EPISODE_STAT_ACTORS.json` contains compatible base-art/role/element
skill graphs for eleven of these twelve Hunters. Dumble048 has no numeric
Episode source in this table. Selection records full source index and actor ID,
retains every original type/effect tuple unchanged, and rejects wrong art,
role/element, alternate bodies and empty graphs. Original variants C509/C510,
C036B/C049B and monster-art M040 cannot substitute for base ordinary art.

Representative rows are Captain13/EVCB0201_009; Vincent130/CB0302_010_1;
Karl142/CB0502_012_1; Denali4/EVCB0201_013; Locke79/CB1101_014_1;
Lapis150/CB0401_017_1; Acerola147/CB1001_030_1; Bear67/CB0103_036_1;
Bibi69/CB0602_040_1; Bright73/CB0201_049_1; Dino118/CB1201_C054.
These examples locate source evidence; the module does not automatically select
them as ordinary gameplay donors. Karl's duplicated CB0601_012_1 IDs at143/144
remain separate indexed records; no first-match shortcut collapses them.

Denali's original graph includes team HP effects with interval1000 plus
separate active/follow-up/passive nodes; Locke/Lapis/Bibi/Dino contain timed
damage nodes; Bright/Acerola have timed ally HP nodes. Every selector, numeric
coefficient, interval and duration can be inspected in the selected original
record without creating absent slots, inventing growth or flattening separate
effects. Native trigger, effect-enum interpretation and ordinary activation
still require their own evidence.

Same-art/role matching is insufficient for ordinary adoption: original ordinary
Karl cost3 conflicts with source142 cost4; Acerola ordinary4/source147 cost3;
Bibi ordinary3/source69 cost4; Dino ordinary4/source118 cost3. Vincent's boss
rows even use cost1 versus original ordinary cost3. The module exposes both
costs and an agreement flag. Any later ordinary adapter must explicitly resolve
that scope difference and preserve the literal ordinary cost; quietly copying
the full Episode tuple would introduce a gameplay discrepancy.

## Visual payloads do not recover balance

The body/Q/EFT/voice packages for all twelve are size/SHA-pinned in the evidence
module. Bounded inspection finds embedded MP4 headers in EFT assets; the Q packs
contain texture/sprite payloads. These supply original presentation material,
not an ordinary combat effect graph. No ordinary numerical balance was found
by interpreting video bytes or animation names. SKILL_EFFECT label records are
separate source bindings and cannot prove that a particular native animation
slot is selected for an active skill.

`materialSkillReadiness(refId)` exposes symbolic and indexed graph availability.
`selectMaterialEpisodeGraph(refId, sourceIndex)` returns an independent unchanged
copy with RECOVERED_EPISODE provenance and an explicit ordinary-policy boundary.
It does not activate a skill, transform magnitudes or prepare a wire adapter.
Unknown ordinary magnitudes/growth and pending native activation remain visible.

The existing2019 archive observations could separately differentiate these
unowned Hunters through an explicitly named opt-in historical projection.
That is local policy, not a consequence of this skill evidence. Do not retune
the current four Hunters, adopt an extrapolated growth curve, infer final
balance from source artwork or grant rank/skills to force eligibility.

`npx tsx tests/material-skill-evidence.ts` checks all symbolic/tag/label records
against imported original tables, all art hashes, every Episode graph against
the pinned original table, costs and mismatches, duplicate-index preservation,
variant/empty refusal and caller-copy isolation. TypeScript build passes. No
shared skills/bootstrap/profile files, runtime, ADB/UI, save, DataDump or client
binary were changed by this lane.
