# Nine later material-Hunter skills: original parser and consumer boundaries

The later projection adopts nine exact Episode graphs alongside the previous
fourteen. It changes no historical stat or birth-grade policy. Matching
identity/cost/role/element and original art does not establish final ordinary
magnitudes, growth, probabilities, display formulas or native execution.
This audit made no live/account/device/production-source change.

## Selected whole source records and exclusions

Original `EPISODE_STAT_ACTORS.json` SHA-256:
`f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56`.
Original `SKILL_REF.json` SHA-256:
`50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70`.
Locators below are zero-based indices. Every selected actor has exact
`ref_id`, base `res_id=C<id>`, matching imported role/element, and active cost
equal to ordinary `<id>|1|0` Rage text. Identity catalogue metadata remains
separately COMMUNITY-SOURCED where marked; it is not an original server table.

* **008 Akasha /87/CB1102_008**: role4/attr3, cost4, cooldown8000,
  critical field50; slots1/2/4. The other008 source uses costume art C008B;
  do not substitute it for the selected C008 graph.
* **019 Balian /84/CB1102_019**: role1/attr3, cost3, cooldown5000,
  critical50; slots1/2/4.
* **023 Hermes /61/CB1601_C023**: role1/attr1, cost3, cooldown5000,
  critical100; slots1/2/4. Ordinary type4 text describes a damage plus Block
  Chance reduction, but this selected type4 contains only the reduction.
* **028 Octavia /78/CB1101_028_1**: role1/attr2, cost3, cooldown5000,
  critical50; slots1/2/4. Do not use the C028B costume candidate.
* **043 Papillon /76/CB1101_043_1**: role2/attr2, cost3, cooldown5000,
  critical50; slots1/2/4. Symbolic critical-immunity/passive descriptions do
  not fill its absent numeric slot3/5.
* **046 Harley /39/CB1402_C046**: role2/attr2, cost3, cooldown5000,
  critical50; slots1/2/4/5. Includes the genuine stat17/type6 passive below.
* **057 Pansy /117/EVCB0301_C057**: role4/attr2, cost4, cooldown5000,
  critical50; slots1/2/4/5. This complete record's type2 uses attack-ban stat21,
  and type5 supplies the team Block Chance graph, agreeing with the ordinary
  symbolic mechanics more closely than116. Index116's different cooldown7000,
  stat5/-9999 and stat14/-80 workaround and missing type5 are not merged into117.
* **064 Geranium /43/CB1602_C064**: role3/attr3, cost4, cooldown5000,
  critical50; slots1/2/4. Includes long bleeding, regeneration reduction and
  the native stat20 exchange-control result.
* **068 Selene /46/CB1602_C068**: role3/attr2, cost4, cooldown5000,
  critical50; slots1/2/4/5. Preserve this exact row, not44's other encounter or
 45's costume C068A graph. Includes the stat22 Rage result.

**All nine lack type3.** Only046/057/068 supply type5; the other six must keep
empty5. Retain all mandatory five ordinary keys without manufacturing effects.
**035 Joy remains neutral:** the actor export has no035 graph.
**071 Anemone remains neutral:** its sole source38 `CB1502_071` is role1
Offense, whereas the accepted ordinary identity is role2 Defense. Cost3/base
art/Fire agreement does not override that identity contradiction. Its graph
and art were removed from this projection's manifest rather than silently
weakening role admission. 020 Sienna's earlier cost mismatch remains excluded.

## Shared parser: no new type7/shield/resurrection graph is selected

Original native ELF was freshly verified SHA-256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below are Ghidra code coordinates, ELF+0x10000.
Ordinary SetCard calls `SRSKILL_INFO::parse Gf219ac` at `G87c466`; Episode
ParseActor calls the SAME parser at `Gb1c130`. The earlier
`material-expanded-skill-native-boundary-2026-10-23.md` records those joins.

These nine use raw effect types **1/2/3/4/6**, all already present in the older
fourteen. **No selected effect7, resurrection or shield selector exists.**
An unselected candidate's additional mechanics must not be promoted merely
because its art or name looks related. The genuinely new target-stat consumers
versus the earlier fourteen are20 and22, with reference-stat10 in068.

The shared parser divides base/up by100 and timing by1000. It also retains
the original base_number as a separate raw signed integer and float: conversion
at `Gf21f04`, float store `Gf21f0a` (scratch+0x144/result+0x34), integer store
`Gf21f10` (scratch+0x140/result+0x30). These control fields must not be replaced
by the normalized coefficient. No server rescaling or category rewrite is needed.

Timed HP1 effects retain their original parser behavior: positive values
become stat31/effect3; negative values generate stat33/effect4 counter plus
stat32/effect4 damage row. That applies to008 active,028 follow-up,046 bleeding,
057 heals and064/068 bleeding. Parsed main cardinality may exceed wire count,
and the generated counter shares the copied source serial. A flat one-to-one
list reader is insufficient; this is not a reason to add counter JSON rows.

## Harley046 slot5 is the genuine nested type6 case

Exact raw tuple order (effect_type,target_type,target_stat,refer_target_type,
refer_target_stat,base_number,duration_ms,interval_ms):

```
(2,1,17,2,0, 1, 500,1000)
(6,1,14,2,0,-5,5000,   0)
```

The second row is stat14 with interval0, so the earlier HP1 transform does not
apply. Final parser pass `Gf225d6..Gf2267e` finds stat17, changes effect6→4 at
`Gf2262a..Gf2262c`, copies it under the carrier's nested result list at
`Gf22640..Gf22656`, and removes its former main row at `Gf2265a..Gf22674`.
Expected main1/nested1; the child keeps stat14, coefficient-0.05 and duration5s.
Do not flatten it or confuse it with052's type6/HP1/nonzero-interval case,
which is converted before nesting and yields three main rows instead.

046 ordinary text mentions stacking up to five times. The raw base_number-5
is not an independent max-stack field. This audit does not invent a stack cap,
merge source rows, or claim that the resulting native aura has been observed.

## Target stat20 is exchange control, not damage or resurrection

064's type4 contains `(1,1,20,2,0,1,0,0)` alongside its other original results.
`CSRGameActorBuffInfo::Apply G99c450` dispatches stat20 to **G99d148**.
It requires raw result integer+0x30 >=1 (`G99d148..G99d152`), obtains the target
GroupID at `G99d15a`, obtains the native MonsterGroupID at `G99d18a`, and
compares both identity words at `G99d1ee..G99d1f8`. Matching monster group exits;
it is not an unconditional switch-out command against every enemy.

The non-monster branch casts to the native Hunter, obtains its parent actor
group, finds a running alternative actor with a different serial, and reaches
the original control-command dispatch. The retained original decompilation
(`ghidra-aura-signed-counter.txt`, stat0x14 case) preserves those group/actor
guards. It does not supply a new server RPC, a guaranteed swap, or permission
to bypass exchange/recipient admission. Incorrect arbitrary non-Hunter target
construction would not be justified by this branch; preserve the source's
existing native construction/target selectors rather than broadening them.

## Target stat22 uses a raw Rage control magnitude

068 type2 retains this separate result after its bleeding result:
`(1,2,22,1,10,1,0,0)`. Apply's stat22 branch begins at **G99cd7c**, casts the
target Hunter, obtains its parent group, checks that group exists, then calls
**CSRGameActorGroup::AddSkillPoint at G99da14**.

Its reference-stat10 is NOT a guessed Rage constant. `RefData G99edc0`'s table
entry10 reaches `G99ee82`, which tail-calls **GetCriticalBonus G99b018**.
That getter reads default/buff critical-bonus state and clamps the result to
the native1..4 range (`G99b018..G99b040`). The usual ApplyBuff path computes
reference × normalized coefficient × application count and skips a zero
result (`G99eb3c`); negative HP damage additionally enters the damage formula.

The stat22 control amount itself is loaded from **raw float+0x34 at G99d9e4**,
with sign selection at `G99d9e8..G99da0c`, then passed to AddSkillPoint at
`G99da14`. It is not the tiny normalized0.01 coefficient multiplied into a
promised0.01 Rage award. This proves the consumer boundary; it does not claim
a measured party Rage delta, bypass of the Rage cap, or an accepted activation.

## Other raw semantics and explicit non-parity

* 008/057 healing references recipient max HP (`refer_target_type2/stat4`),
including source117 Pansy. Ordinary symbolic text describes DEF scaling. Preserve
the encounter selectors; cost agreement does not establish that ordinary mechanism.
* 064's bleed duration is **999000ms**, interval **3000ms**, and regeneration
result uses stat13/base-100 for999000ms. Do not shorten it to ordinary text's
two-second wording or manufacture an until-deactivation semantic flag.
* 046's active attack-speed result uses base-9999 with context reference type3.
ApplyBuff chooses that context, falling back to destination if context is null.
It is not a recovered universal attack-ban enum; keep the raw graph instead
of rewriting it to match a convenient friendly label.
* 068 type5's negative signed stun counter and enemy damage-reduction result
are not negative HP damage. Existing signed-counter consumers and actual aura
recipient/rank admission remain in force. Empty source slots remain empty.

Sequential wrapper serials, zero growth and empty value_calc/effect_desc are
LOCAL adaptation. Original parser branches above do not need new global serial
renumbering, copied numeric companions, guessed display formulas or client patches.
No new fatal parser/unsupported selected-effect branch was found in this
bounded audit. Native owner qualification, passive registration and actual
ordinary skill execution remain pending independently.

## Original art pins and regression

`resources/reference/later-material-skill-art.json` pins exactly **36** original
base/Q/EFT/SND packages for these nine donors, plus **45** exact original icon
chains `C<id>_SI<slot> → C<id>_SI<slot:02> → I2`. All are selected by the
inactive280 profile. All five icons exist even where source skill3/5 is absent;
an icon does not create a numeric effect or prove an original server assignment.

Reviewed manifest SHA-256 (LF-normalized text):
`02ea93743191ed14e9c84cd7b4bb7c2acafe9e61160a0ca6dc4262567d9521ce`.
`tests/later-material-skill-icons.py` validates whole-package hashes/byte counts,
unique imported-files provenance, selected280 package scope, strict inflation/
exact EOF and every AT/S2/I2 hash/dependency. Partial trailing-record rejection
is exercised. A supplied `--datadump-assets` directory additionally requires
exact original/Server byte equality rather than a filename or confidence match.

This audit ran that test with the retained read-only DataDump original asset
directory: **36 package comparisons and45 icon chains passed**. The normal
Server-only invocation remains portable and explicitly reports when the extra
DataDump comparison was not requested. No original resource, DataDump file,
profile, owned Hunter, wallet or runtime was modified.
