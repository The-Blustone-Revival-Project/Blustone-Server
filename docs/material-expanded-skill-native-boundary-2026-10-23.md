# Six additional material-Hunter skill graphs: original parser boundary

The proposed expanded mode adds six explicitly selected Episode graphs to the
existing eight LOCAL ordinary adoptions. It preserves raw encounter data; it
does not recover final ordinary magnitudes, growth, birth ranks, stats, or
native ordinary activation. No live/profile/save/client changes were performed
by this source audit.

## Exact donors and excluded alternatives

Original actor export `resources/reference/episodes/EPISODE_STAT_ACTORS.json`
SHA-256 `f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56`;
ordinary symbolic text `resources/reference/episodes/SKILL_REF.json` SHA-256
`50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70`.
Indices are zero-based, not first matching actor-ID searches. Role/element
assignments match the independently imported identity catalogue and exact
base art/ref identity. Original cost literals are each `<ref>|1|0` EN.

* **021 Rebecca**, index **137**, `CB0901_021_1`, `C021`, role1/attr1,
  cost3, cooldown6000, critical field50; source slots **1/2/4**. Index48
  `CB0003_C021` also costs3, but has cooldown5000, critical100 and different
  coefficients/timings. The selected E9 row is an explicit local choice.
* **024 Riko**, index **136**, `CB0901_024_1`, `C024`, role2/attr3,
  cost3/cooldown6000/critical50; slots **1/2/4/5**. Preserve the active's
  duration4500 and interval1000, not a rounded symbolic four seconds.
* **039 Gullveig**, index **10**, `EVCB0201_039`, `C039`, role3/attr3,
  cost4/cooldown5000/critical50; slots **1/2/4/5**. Reject index138
  `CB0901_039_1` for this adapter: its cost3 contradicts the ordinary literal4.
* **041 Edward**, index **140**, `CB0902_041_1`, `C041`, role2/attr3,
  cost3/cooldown6000/critical50; slots **1/2/4**. Reject index37
  `CB1501_C041`: cost4 versus ordinary3, and a different active graph.
* **052 Windblade**, index **134**, `CB0801_052_1`, `C052`, role1/attr3,
  cost3/cooldown6000/critical50; slots **1/2/4/5**. Its passive has the
  parser-sensitive type6/HP interval combination described below.
* **056 Genovia**, index **135**, `CB0802_056_1`, `C056`, role1/attr2,
  cost3/cooldown5000/critical50; slots **1/2/4/5**. Indices40/41
  `CB1402_C056`/`CB1602_C056` have identical skill graphs to each other and
  matching cost, but differ from135 in active coefficients, secondary effects,
  timings and passive reference selector. Do not merge their extra effects
  into the chosen E8 row.

**020 Sienna remains neutral:** its only graph, index141 `CB0902_020_1`,
role3/attr3/C020, costs3 versus ordinary literal4. No cost rewrite is justified.
**All six selected donors lack type3.** No source row is complete1..5. Retain
mandatory empty slot3; 021/041 also lack slot5. Symbolic descriptions do not
fill missing numeric vectors. Preserve original skill gates, effect order,
raw selectors/coefficient/duration/interval, including sparse effects.

## Episode and ordinary references call the SAME parser

Fresh direct Thumb inspection of immutable original `libnative_core.so`, SHA-256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`, establishes:

* Ordinary `CSRCardInfoContainer::SetCard G87baa4` calls
  **`SRSKILL_INFO::parse Gf219ac` at `G87c466`**.
* Episode `CSRMEpisode::ParseActor Gb1bd5c` calls that **same function at
  `Gb1c130`**. It is not a second identity parser bypassing ordinary transforms.

The shared parser normalizes base/up by100 and timing by1000. Its scratch result
has serial at +0, target_stat at +8, effect_type at +0x14, coefficient at +0x1c,
duration at +0x24 and interval at +0x2c. Ordinary serial1..N, zero growth, empty
value_calc/effect_desc and default-zero absent skill metadata remain local wire
wrappers. Serial does not participate in the stat17/type5/type6 selection
branches below; it is copied with its result. A generated counter can therefore
share its source serial. Do not require all parsed serials to be unique or
renumber them on the server to force a display join.

## Windblade052 slot5: HP conversion happens BEFORE stat17 nesting

The exact selected raw pair is:

```
(effect_type,target_type,target_stat,refer_target_type,refer_target_stat,base_number,duration,interval)
(2,1,17,2,0,1,500,1500)
(6,1, 1,1,1,-300,1500,1500)
```

It is tempting but incorrect to assume raw type6 always becomes one nested
debuff under stat17. Processing order changes this particular pair:

1. `Gf22420..Gf22424` treats only type7 as the preceding-result attachment
   special case. Type6 takes the ordinary non7 branch.
2. `Gf2250c..Gf22510` tests target_stat1; `Gf22512..Gf2251e` tests nonzero
   interval; `Gf22520..Gf2252c` selects negative coefficient. This has **no
   requirement that the raw effect_type be1**.
3. `Gf2252e..Gf22534` changes the original HP row to **effect4/stat32**.
   The copied counter is made **effect4/stat33**, reference stat0, normalized
   coefficient1.0/up0
   (`Gf2253e..Gf22552`) and appended first at `Gf22566..Gf22578`.
   The modified original stat32 row is appended at `Gf2258a..Gf225ae`.
4. Only afterwards does the final pass begin at `Gf225d6`. It finds stat17,
   but the former type6 is now type4, so neither result qualifies for nesting.

Expected **main-list order is stat17/effect2, stat33/effect4,
stat32/effect4; stat17 nested count remains0**, not main1/nested1. The original
raw2 becomes parsed main3. The raw source and sequential wrapper serials must
remain unchanged; this transformation belongs to the original client and also
happens when it parses the original Episode row. This is a source prediction,
not a measured live ordinary passive or proof of the intended bleed timing.

## Genovia056 slot5: the type5 row DOES become nested

Selected index135 raw pair:

```
(2,2,17,1,0,1,500,1000)
(5,2,19,1,0,1,0,0)
```

The second row has target_stat19 and interval0, so the HP conversion does not
apply. The final pass finds the stat17 main result (`Gf225e4..Gf225f2`), tests
type5 at `Gf2260e..Gf22610`, changes it to **effect3** at
`Gf22612..Gf22614`, copies it to that stat17 result's nested list
(`Gf22640..Gf22656`), and unlinks/deletes the old main row while decrementing
main count (`Gf2265a..Gf22674`). Expected main1/nested1; child stat19 and all
other raw fields survive with normalized units. The same pass has a type6→4
branch at `Gf2262a..Gf2263c`, but Windblade's HP row no longer reaches it as6.

No JSON flattening, manual type rewrite, fabricated counterpart, native patch,
new rank gate or positive-level rule is needed to make these source graphs
parse. The original allocator/copy/list code supports the nested structure;
that does not establish downstream actor targeting, passive admission,
cleansing frequency, or actual combat results. Symbolic Genovia describes
0.5-second cleansing while this encounter carrier has interval1000; preserve
the encounter instead of making up ordinary parity.

## Validation boundary

An expanded ordinary profile may faithfully expose these six raw graphs as
**LOCAL Episode adoption**, leaving the existing eight byte-exact and020
neutral. It must not claim that normalized list cardinality equals wire effect
count, that all slots are reconstructed, or that native ordinary execution has
been verified. References alone must not modify owned skills/ranks/XP, decks,
wallets or recruitment pricing/shape.

Future native readers should validate proper bounded linked lists, copied
counter serials and nested-list count/backlinks before comparing payloads.
For052 expect the pre-nesting HP transformation; for056 inspect the real nested
child. Runtime Aura registration, rank admission and application remain separate
proofs. Read-only recovered sources are DataDump
`sources/native/hunters/ghidra-ordinary-skill-layout.txt` and
`ghidra-episode-combat-actors.txt`; retain the existing ordinary skill/vector,
follow-up and passive-registration contracts as context.
