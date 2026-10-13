# Mirage supplied-cache schema: enemy correction and exact scalar domains

2026-10-14. Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code coordinates ELF+0x10000. Preserved DataDump Mirage exports and
bounded original Thumb checked. Evidence only: no catalogue values, actors,
items/rewards, run, UI or original/DataDump writes.

GetInfo's successful ret_data selects entry, inst_base, inst_enemy, ref_stair
and ref_hero independently when present. A strict complete supplied snapshot
may require all five; that is local admission beyond its partial-cache wire
consumer. Missing fields and wrong collection types are not interchangeable
with authoritative empties.

## Entry IDs narrow, while HP is a signed setter word

Parse_Entry G933aec resets ALL native owned Mirage HP first, then reads each
row's id and mirage_remain_hp. Both conversions are effective uint32:
id integral lowword G933c08 / VCVT.U32.F64 G933c30, and HP integral lowword
G933c52 / VCVT.U32.F64 G933c7a. ID highword is zeroed G933ca8; the HP word
is passed on the stack G933caa to
SetCardMirageRemainHP(uint64,int32) Gaea4de at G933cac.

Canonical signed32 integral HP tokens preserve the setter bits, including
integer−1→FFFFFFFF→signed−1. Unsigned UINT_MAX is a native alias of that
same stored word, but may be refused as a local canonical admission. Negative
string/double conversion is DIFFERENT because it uses the unsigned FP
conversion; do not claim the decoder emulates every native legacy coercion.
Entry IDs must honor effective32 even though base.deck separately preserves
full64. A ready owner-bound producer should reject wide/unknown aliases rather
than update the wrong Hunter after the all-inventory reset.

Independent raw literal reads confirm MakeStageInst's G925ad0 float word
0x461c4000 and OnFinish's G9275ec same float word are **10000**. The battle
consumer divides carried HP by10000 and finish scales HP/maximum by10000;
the peer's bounded finish note records those operations. Full carry is10000,
not1000. Existing Server HP1000 is a LOCAL unentered legacy placeholder:
do not silently heal or reinterpret stored defaults while introducing this
decoder. Readiness HP>0 and<=10000 is a declared supported local subset;
the pure parsed signed word may retain other values as evidence.

## Correct inst_enemy fields: hp_percent, not n

The complete **Parse_InstEnemy G92dff4..92e7dc** processes only a JSON
**ARRAY** (type2 gate G92e010..012); that branch clears its old enemy clone
list G92e016..e0ac before iterating. Wrong type skips replacement, preserving
old clones. A strict DTO should refuse wrong/partial input rather than model
it as an empty authoritative enemy list.

Each row's proven consumed fields are:

```text
{
  hp_percent: int32,
  ref_id: STRING,
  rank: uint32,
  rank_up_cnt: uint32,
  overcome_cnt: uint32,
  exp: uint32,
  skill_1_level:uint32, skill_2_level:uint32, skill_3_level:uint32,
  skill_4_level:uint32, skill_5_level:uint32
}
```

**Correction to the older Mirage GetInfo vocabulary:** no `n` JSON index is
present in this complete parser. The previously described n/ordinal was not
positively tied to the consumed subtree. Do not require a fabricated n or
interpret it as an owned Hunter/instance identity. The parser constructs fresh
ordinary CSRCard clones via constructor G86f850 at G92e17a; type/control
vtable pointers are internal native data, not wire identities.

hp_percent's literal is G92e112; conversion VCVT.S32.F64 G92e1ca stores the
value at clone shared-allocation+3c G92e1d2 (CSRCard+2c). ref_id strictly
converts STRING G92e1ea and invokes the ordinary reference assignment
G86c30c at G92e1f2. Rank and rank_up_cnt use unsigned conversions
G92e246/G92e294 and stores G92e24e/G92e29e. overcome_cnt is unsigned
G92e2e4 and passed to SetOvercomeCount G869bb8 with its additional argument0
G92e2ee..2f0. EXP is unsigned G92e35c/G92e366. Skill levels each use unsigned
conversion and keys1..5 to populate the clone's skill map
G92e36a..92e728. No alternate equipment, flat stats, skin or awakening row
is parsed by this function.

Thus actual battle numbers derive through the ordinary published Hunter
reference/progression/skills and subsequent actor consumers, not from a
Mirage flat-stat DTO. Bind ref_id to real available Hunter data/art and require
supported rank/level/skill reference consumers before publication. This note
does not invent original enemy level/rank/HP/skill values, deduce hp_percent
units from its name, or claim all zero/negative inputs are battle-ready.

## inst_base exact types and selected owned deck

`Parse_InstBase G933d80` consumes:

```text
{
  bg_res:STRING, dlg_begin:STRING, dlg_end:STRING,
  new_record:BYTE,
  floor:int32, stair:int32, state:int32,
  deck:[exactUint64, ...],
  tier_percent:int32, highest:int32, revive_price:int32, begin_ltime:int32
}
```

bg_res is strict STRING G933daa..db8. dlg_begin/dlg_end have key-presence
checks before their strict string assignments G933e2a..e8a and
G933efc..f5c, so absence can retain cached text; complete DTO admission may
require them explicitly. new_record likewise has a presence check before
U32 conversion G93405a and BYTE store G934062. BYTE itself is0..255, not
proof of a boolean-only server domain.

Other numeric conversion sites are **signed32**: floor G9340aa; stair
G934120; state G934174; tier_percent G93423a; highest G93428a; revive_price
G9342da; begin_ltime G93432a. Preserve these source domains even if a local
publication/readiness subset refuses negative values or unsupported states.
Do not classify floor or revive_price as uint32 just because negative values
would be unsuitable for a particular run.

deck selects G934184 and passes to strict array conversion G93931c at
G934194. Its mangled specialization is std::list<unsigned long long>;
nonarray throws the original "type must be array" branch G939334..3b8.
This is an ordered scalar-ID list, not {id,hp} objects or a CASE party alias.
The actual confirmation/battle uses these IDs to resolve real owned Hunters;
the parser shape alone does not establish enrollment or shared ownership.
Entry membership's independent effective-width contract must also be honored.

## ref_stair exact rows and resource binding

Already preserved ParseStairInfo G9343b4 gives:

```text
{
  res_prefix:STRING,
  res_postfix_list:[STRING, ...],
  list:[{grade:int32,balance:int32}, ...]
}
```

Both lists must actually be arrays to replace caches. Their order is retained;
row ordinals are generated one-based rather than read from an ID. Grade and
balance conversions are signed32 G9346d8/G934722. Grade drawing directly
indexes a four-entry suffix table: positions0(empty),1(B),2(S),3(G). A
publication-ready subset therefore needs grade0..3 to avoid unchecked indexing;
no assignment of those grades to original floors is recovered.

The selected signed balance is converted to float32 and multiplied by the
original approximately0.0001 literal. Found0 gives0; lookup miss alone gives
1.0. Neither balance10000 nor any arbitrary numeric pattern is a recovered
original row. Preserve supplied values rather than silently filling a missing
stair with neutral scaling.

MakeRandResPostFix G92e868 indexes a supplied postfix vector0..count−1 with
no local empty guard; its positive RefreshList caller is Gbf8f50. CreateStair
combines prefix with the selected postfix; the stage sprite/background must
resolve from that literal resource name. A read-only decoder may accept empty
vectors as representable data, but cannot call them ready for that selector.
A ready supplied set should validate every selectable prefix+postfix against
available original resources. Resource pack artwork is not a numeric catalogue.

## ref_hero types and clock caveat

`ParseHeroInfo G9347f8` consumes:

```text
{bonus:int32,end_ltime:int32,cur:[STRING,...],next:[STRING,...]}
```

Bonus is signed conversion G934860→store model+b4 G93486a. end_ltime is
signed G9348b0→model+b0 G9348ba. Both cur and next require actual ARRAY
type to rebuild their own vectors (G9348ca..cc and G934a3c..3e); entries
strictly convert to Hunter ID STRING G9349be/G934b36. Wrong type preserves
old vector, so missing/empty/wrong type must remain distinct.

The retry UI compares end_ltime with synchronized **local seconds** and asserts
end>=now. A pure decoder can preserve the supplied signed word without
asserting scene readiness at arbitrary clocks. A future publishing provider
must check the actual native clock domain/deadline and known rotating Hunter
identities; do not create a weekly schedule or infer rotations from available
portrait filenames. Empty hero lists alone are not proof of safe all-UI usage.

## Decoder versus publication readiness

These components support a strict pure supplied-cache decoder now, with exact64
numeric-token capture for deck, signed versus unsigned domains, lossless UTF8,
dense/plain JSON validation and detached copies. Canonical nonnegative full64
IDs and complete fields are local admission beyond legacy native coercions.
They do not need a fabricated default snapshot or enemy n values.

Publishing nonempty Mirage further requires real owner-entry/HP/deck coherence,
known Hunter/ref/level/skill data, selected one-based stair/state, nonempty
resolvable postfix resources and safe supplied hero deadlines. Original floor
assignment, enemy groups, grade/balance rows, rotations, reset/revive/reward
producer law and HP settlement remain missing. A supplied parser restores a
faithful representation; native nonempty selector/battle still requires separate
authorized UI evidence before claiming playable Mirage.
