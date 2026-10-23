# Bibi active skill description identity

This is a narrow LOCAL display binding for adopted Episode70 Bibi040/type1,
not recovery of original ordinary balance. Native rendering and activation
remain pending. No owned Bibi or combat result is claimed by this source change.

The opt-in material projection now supplies serial0 only for Bibi's sole active
effect, matching original `SKILL_REF040|1|1` `SUB_SERIAL="0"`. The original
`FORMULAR` is exactly
`(-1*(stat*(8+2*rank))*(value+value_up*skill_level)/10000)*5`, `IS_FLOAT="0"`.
English describes total `[value]` bleeding damage over four seconds to the
frontline enemy. Validation asserts these exact symbolic fields and the whole
Episode70 active graph: type1/rank1, cooldown5000, cost3, critical50; sole
effect1/target1/HPstat1, reference1/ATKstat1, base−400, duration4000,
interval1000. Existing raw byte pins also remain enforced:

- EPISODE_STAT_ACTORS.json:
  `f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56`
- SKILL_REF.json:
  `50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70`

No formula or description is copied into the wire's `value_calc` or
`effect_desc`. Those stay empty. Every numeric field, cost, gate and timing,
Bibi2–5 serial1, Bright1 serial0, the other six material wrappers and all forty
icons remain unchanged. Default neutral publication remains unchanged.

## Native display and combat are separate lists

`CSRPopupCardSkillDetail::SetSkillDesc` G`00b9c754` calls
`CSRCardSkillUtil::GetCalculatedSkillDetail` G`00881d84` at G`00b9c7fc`.
The latter walks INFO+0x38/first+0x3c at G`00881e1a–00881e54` and matches
the original descriptor SUB_SERIAL to result.serial. On mismatch it leaves
the literal description unchanged. On match it calls `GetValue` G`00882d14`
at G`00881ebe`, evaluates through `CMTextCalc` G`00882dfc`, and replaces
`[value]` at G`00881f42/00881f54`. Original `FORMULAR` and `IS_FLOAT` are
loaded by `FindSkillDetail` G`008823cc`, as documented for Bright.

The parser G`00f219ac` normalizes combat base−400 to coefficient−4 at
result+0x1c, and duration/interval to4s/1s. An interval-bearing negative HP1
effect becomes stat32/Debuff4 and creates a stat33 counter companion. The
companion is copied and inserted only into main INFO+0x2c at
G`00f2253a–00f2257c`. The stat32 original is then copied to main INFO+0x2c
and separately to display INFO+0x38 at G`00f2258a–00f225d0`.
Both copies preserve the supplied serial, but **the display list has one row**;
its matcher cannot accidentally select the main-list counter companion.
Do not demand raw-one-effect/parsed-main-one-effect equality during observation.

## Raw values are retained for formula substitution

No multiplication by100 is needed to undo combat normalization. The same
parser independently reads `base_number` at G`00f22188` into a raw
`floating_point` result+0x38 and `up_number` at G`00f221bc` into result+0x48.
These raw fields are not divided by100. Separate floating-point timing fields
are divided by1000 (retained parser decompilation lines2160–2254).

`CSRCardSkillUtil::Substitution` G`00884528` consumes result+0x48 at
G`00884638/0088463e` for `value_up`, then result+0x38 at
G`008846f8/008846fe` for `value`. Thus the original formula receives raw−400
and the existing LOCAL zero growth. It resolves reference stat1 at
G`00884a32/00884a38` through UI `CalcFinalAttackValue`
G`008851ee/008851f4`, and rank from the owning CSRCard+0x24 at
G`00884b26/00884b2c`. The original formula already contains its own
`/10000` and factor5. Do not add server scaling or substitute coefficient−4.

The UI attack calculation is not the evolving battle actor's buffed attack;
target defense, immunity, admission and actual tick execution are outside this
display calculation. A resolved number cannot establish observed damage or
five successful live ticks.

Serial remains shared native effect identity. Native zero parsing and list
append accept zero, and the inspected display consumer explicitly matches it;
this is not an exhaustive guarantee about every combat consumer. Native
qualification must observe the expected main/display cardinalities and later
accepted activation with source/target identity, actual Rage debit and
time-separated HP changes.

## Other Bibi mismatches stay explicit

The selected type3 numeric node is stat15, while symbolic text describes self
ATK; it is not relabeled or changed. Type5 symbolic text additionally promises
stun immunity, one-second weakening and five stacks not independently supplied
by its sole retained DEF node. Type4 symbolic30% is not proof that its original
ordinary trigger matches the selected source's active critical50 metadata.
Neither this change nor numeric formatting resolves those gaps. See
`material-native-bibi-preflight-2026-10-23.md` for gates and semantic limits.

Focused projection and encrypted HTTP source tests pass, including unchanged
first-six references, exact raw source graphs with only the two scoped serial
exceptions, unchanged owned skill keys and complete disposable save bytes.
No build, live reload, private save access, native input or APK edit occurred.
Native addresses use immutable ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
G addresses are file/code offsets plus0x10000.

## Root integration

TypeScript build, full230-program npm test, compiled projection and encrypted
HTTP checks PASS; independent review clear. No native Bibi owner, display or
activation proof is claimed. The running listener46444 was deliberately NOT
restarted while Windows activation was unavailable; it retains the previously
Bright-validated loaded revision. New Bibi binding is source/build only until
a controlled later reload. All three saved games remained unchanged.
