# Fixed-damage skill leads: original tuples versus text estimates

Offline source audit, 2026-10-11. No skill configuration, save, runtime, APK or DataDump file was changed. Addresses below are ELF virtual addresses; the existing Ghidra findings use ELF + `0x10000`.

## Result and concrete next implementation

Audrey (`072`) has two **complete original encounter slot-4 graphs**. Preserve them as separate, source-indexed encounter records. They provide an implementable native mechanism for defense-independent damage, temporary block-reduction suppression and (one graph only) an invincibility-counter adjustment. They do **not** recover the final ordinary Hunter's complete slot-4 coefficient or activation probability.

The released four-row `2000/0` inference is a text-magnitude observation, not a recovered `base_number` / `base_number_up` wire tuple. In particular, Audrey's actual shipped encounter tuple is `base_number:-100000, refer_target_type:2, refer_target_stat:3`; neither text nor that tuple justifies replacing ordinary fixture skills with `2000/0`.

An explicitly encounter-derived opt-in projection can use the original graph unchanged and label its scope and numeric provenance. First add Audrey's original identity/material readiness if needed, select the exact encounter record, and retain its rank gate and source probability. Do not copy this graph to Judith, Kamala or `087`, and do not merge the Audrey variants. No ordinary skill promotion is recommended from these four leads alone.

## Pinned inputs

Server `resources/reference/episodes/` copies of original tables:

- `SKILL_REF.json`: SHA-256 `50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70`.
- `SKILL_TAG.json`: `81d0ea2d038d078efd2196471fe9e669a9117c53edda1b3263ca8d5eddd73942`.
- `SKILL_EFFECT.json`: `92b81f08f2cac6ff7b35c9782efde54310f001b21586c9730117e08aef879cbc`.
- `EPISODE_STAT_ACTORS.json`: `f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56` (152 rows).

Original final-client ARM library, read only from DataDump `local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`: `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`. Thumb/VFP instructions were inspected with Capstone 5.0.7. These findings concern the final shipped encounter tables, not the 2019 archive-stat projection.

Related existing findings: DataDump `findings/hunters/starter-skill-combat-mechanics.md` and `skill-followup-construction-contract.md`; Server `src/material-skill-evidence.ts` and `docs/material-skill-evidence-2026-10-11.md`. The new release's `skill-magnitude-estimates-2026-10-11/REPORT.md` supplies leads, not native tuple authority.

## Four leads and source coverage

- Judith `067`: text says 50% activation, fixed 2000 frontline damage penetrating immunity, enemy Rage -1. Tags `DAMAGE_2000,INVIN_BREAK,GAGE_DOWN`. No matching actor row in the original encounter table.
- Audrey `072`: text says 40% activation and fixed 2000 frontline damage penetrating immunity. Tags `DAMAGE_2000,INVIN_BREAK`. Original encounter rows 11 and 32 exist, but both slot-1 `crt_chance` fields are **50**, not the ordinary text's 40.
- Kamala `083`: text says 40% activation, fixed 2000 frontline damage penetrating immunity, frontline stun with unresolved duration. Tags `STUN,DAMAGE_2000,INVIN_BREAK`. No matching actor row.
- `087`: text says 50% activation, fixed 2000 frontline damage penetrating immunity, allied Rage +1. Tags `DAMAGE_2000,INVIN_BREAK,GAGE_UP`. No matching actor row.

The relevant ordinary text formulas are `nan`. Literal damage/chance/Rage text gives semantic constraints; it does not identify target-stat graph encoding, rank gates, duration, complete effect order, level growth or callback behavior for the three absent records.

## Exact Audrey encounter graphs

Row 11: `EVCB0201_072`, `ref_id:072`, `res_id:C072`, attr 3, role 3, rank 5. Slot 4 has `target_rank:4` and these original effects, in original order:

```json
[
  {"effect_type":1,"target_type":1,"target_stat":1,"refer_target_type":2,"refer_target_stat":3,"base_number":-100000,"duration":0,"interval":0},
  {"effect_type":4,"target_type":1,"target_stat":10,"refer_target_type":2,"refer_target_stat":0,"base_number":-999,"duration":300,"interval":0},
  {"effect_type":4,"target_type":1,"target_stat":16,"refer_target_type":2,"refer_target_stat":0,"base_number":-3,"duration":300,"interval":0}
]
```

Row 32: `EVCB0103_072A`, `res_id:C072A`. It has the same first two effects and **omits target_stat 16**. Its actor stats and slot-1 interval duration also differ. The omission is material: these variants are not interchangeable even though they share `ref_id:072`.

## Native arithmetic and consumers

`SRSKILL_INFO::parse` at ELF `f119ac` converts coefficients by `/100` and durations/intervals by `/1000`. Thus the damage coefficient is -1000; 300 means 0.3 seconds. Missing `base_number_up` in these source rows must remain missing/source-default behavior, not be presented as an independently recovered ordinary growth coefficient.

`BuffInfo::RefData` at `98edc0` selects the reference stat. Reference type 2 selects the destination. Stat 3 reaches `Actor::GetDef` at `98b078` through `98ee10`. For reference stat 0 it returns 100 only for target stats 6..9; otherwise it returns 1 (`98eddc..98edee`). This matters for both companion effects.

The negative HP path in `BuffInfo::ApplyBuff` calls `SRCalcDamage` at `98ebbe`, then multiplies the result by the converted coefficient and application count (`98ebd4..98ebd8`). `SRCalcDamage` at `109c7c0` loads two signed 64-bit values, calls signed division helper `1bd343c` and converts its quotient to float through `1bd2fa8`. It is not a universal multiply-by-two function. With the same unchanged, nonzero converted destination DEF used for numerator and denominator, the quotient is 1. The pre-modifier HP effect is therefore **-1000 per application**, not a direct -2000 assignment. Zero DEF and changes between getter calls are outside that simplified condition.

Final HP loss is not established by this quotient alone. The HP dispatch path `98d508..98d600` applies attribute advantage, block adjustment and a minimum-damage clamp. `98de1a` reaches `98a9b4` with the assembled damage record. Invincibility can zero damage (`98aa72` onward). Application count and effect execution ordering must be retained from the native scheduler before any exact total-damage claim. This audit has not proved a universal final 1000 or 2000 HP loss.

Target stat 10 dispatches through `98cace..98caf0` to `Actor::AddBuffBlockDamage` at `98b48e`, adding to the buff reduction field `+0x60`. Its coefficient is -9.99, with reference 1; it is a temporary block-reduction modifier, not another damage hit.

Target stat 16 dispatches through `98cb76..98cb9e` to `Actor::AddBuffInvincible` at `98b634`. The sign chooses plus/minus application count; the coefficient's magnitude is not treated as an integer -3 counter decrement. It is unsafe to describe the row as a literal three-stack removal merely from `base_number:-3`.

## Trigger scope and known contradiction

The original follow-up constructor (`MakeBackEndActor`, ELF `99c2ac`) selects slot 4 by rank and owned key 4, using normal base-plus-growth conversion. The default ordinary actor path reads activation probability from slot-1 `crt_chance`, converts `/100`, and constructs an adaptive rule. `SkillMgr::Buy` at `9a23bc` compares a random draw with probability plus adaptive adjustment; miss raises adjustment by 0.1 and hit lowers it by 0.1. These are not independent fixed-probability trials. `Actor::UseSkill` at `971910` calls this routine at `971a4c`; its bounded inspected return path transfers selected records rather than supplying evidence for an unconditional damage-doubling step.

Audrey encounter probability 50 versus ordinary text 40, encounter raw -100000 versus text 2000, and the missing invincibility node in C072A are explicit scope differences. Recovering the real encounter mechanism is useful; silently deriving an ordinary wire tuple from the text would discard those differences.

## Validation and limits

Checked exact table rows, input hashes, native dispatch branches, coefficient units, DEF-reference arithmetic, block/invincibility consumers and the bounded activation path. No native skill execution, total HP-loss measurement, ordinary reference consumer integration or save mutation was performed. Existing material skill fixtures remain unchanged. This is a source-backed encounter implementation blueprint and a correction to the four-row wire-coefficient inference, not a complete recovery of four ordinary skills.
