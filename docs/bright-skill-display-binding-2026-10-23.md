# Bright active skill description binding

Source implementation and focused TSX tests passed on 2026-10-23. Root later
verified native display; activation remains pending. This changes one LOCAL ordinary effect identity, not an
original ordinary combat-table recovery.

The native Bright049 skill1 popup showed the original literal `[value]`. Its
receiver is `CSRPopupCardSkillDetail::SetSkillDesc` G`00b9c754`, which calls
`CSRCardSkillUtil::GetCalculatedSkillDetail` G`00881d84` at G`00b9c7fc`.
It does **not** use `SRSKILL::GetSkillEffectDesc` G`00f25618` for this text.
Consequently, filling the wrapper's `value_calc` or `effect_desc` would address
a different consumer.

The retained `resources/reference/episodes/SKILL_REF.json` byte pin is
`50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70`.
Its exact `049|1|1` row has `SUB_SERIAL="0"`, `IS_FLOAT="0"` and
`FORMULAR="stat*(value+value_up*skill_level)*5/100"`. Its English text says
the frontline teammate receives a total `[value]` healing over four seconds,
increasing with defense. `049|1|0` separately supplies the four-Rage cost text.

`FindSkillDetail` G`008823cc` reads the localized row through
`CGMDataMgr::GetStrDBData` at G`0088282a` (table5). It parses `SUB_SERIAL` at
G`0088285c` and stores it at descriptor+0 at G`008828a4`; `FORMULAR` is read at
G`008828aa/008828b8`; `IS_FLOAT` is read at G`00882990/0088299e`.
`GetCalculatedSkillDetail` compares descriptor+0 against each effect's serial
at G`00881e52–00881e58`. An unmatched row branches at G`00881e6c` to
G`00882050`, preserving its untranslated English description. A match calls
`GetValue` G`00882d14` at G`00881ebe`, substitutes the original formula through
G`00884528`, and evaluates it with `CMTextCalc::Calc` at G`00882dfc`.
Formatting consumes `IS_FLOAT` at G`00881f20/00881f26`; `[value]` replacement
occurs at G`00881f42/00881f54`.

The prior ordinary wrapper assigned serial1 to Bright's sole active effect.
The projection now assigns serial0 only for ref049/type1/one effect. Validation
asserts that exact symbolic row and the exact selected Episode93 effect:
effect_type1, target_type4, target_stat1, refer_target_type1,
refer_target_stat3, base_number20, duration4100ms, interval1000ms.
Both retained files remain byte-pinned. No formula is copied into combat data,
no description amount is precalculated, and all coefficients, selectors,
growth defaults, gates, cost4 and timing remain unchanged. The factor5 is the
original formula; this work does not independently prove its combat tick count.

Serial is shared native effect identity, not an isolated presentation field.
The inspected `SRSKILL_INFO::parse` G`00f219ac` accepts numeric zero at
G`00f21c0a–00f21c66` and appends effect records without a positive-serial check
(retained decompilation `ghidra-ordinary-skill-layout.txt`, lines1760–1788 and
2398–2446). The inspected display matcher accepts equality with zero; Server
skill code has no separate serial>0 guard. This bounded inspection found no
zero rejection; it is not an exhaustive proof about every native consumer.
Native popup and subsequent activation checks remain required. No global
renumbering is justified by this single join.

Focused projection and encrypted HTTP tests verify all eight complete source
graphs with precisely this serial exception, unchanged first-six references,
unchanged defaults/save bytes/owned skill levels, Bright skill2 retaining
serial1, and missing Bright skill3–5 effects remaining empty. The forty
original icon bindings remain intact. No build, live reload, save access,
native input or APK change was performed by this change's author.

Native addresses above use the original read-only ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
G addresses are file/code offsets plus0x10000.

## Root native display closure

After controlled reference refresh, native Bright049/owned1000018 at Lv1/rank3
displayed DEF756. Skill1 now renders its original icon and the original text
with total756 recovery for4seconds, replacing the previously observed literal
[value]. All saved games were unchanged by this read. Native ordinary battle
initialization, reserve body and Victory/earned EXP also passed afterward, but
no heal contact was sent. Serial0 skill activation, ticks and actual frontline
recovery still require independent live proof. See the acquisition note.
