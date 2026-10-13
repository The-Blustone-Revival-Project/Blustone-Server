# GvG GetInst: card and deployment snapshot grammar

Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses use Ghidra ELF+0x10000. Direct bounded Thumb instruction/literal
inspection, including the actual RequestInst callback. Read alongside
`gvg-entry-instance-cache-native-2026-10-13.md`; no route, registration,
native input, original/DataDump, or live save was changed.

## Complete canonical wire shape

This is a field/type grammar, **not an original populated snapshot**. Names in
angle brackets are type descriptions, not values to publish.

```text
ret_data: {
  enemy_guild_id: <uint32>,
  inf_gvg: <byte>,
  user: {
    guild_id: <uint32>, total_cp: <uint32>,
    offense_point: <uint32>, defense_point: <uint32>,
    commander: <exact 64-bit identity>
  },
  card_list: [{
    ref_id: <string>, skin_id: <string>,
    level: <int32>, overcome_cnt: <int32>, cp: <int32>,
    rank: <uint32>, awk_step: <uint32>, awk_overcome: <uint32>,
    hp: <string>, atk: <string>, def: <string>, spd: <string>,
    crt_chance: <string>, crt_dmg: <string>, penetration: <string>,
    block_chance: <string>, block_dec_dmg: <string>,
    attr_enhance: <string>, attr_resist: <string>, hp_regen: <string>,
    hp_up: <string>, atk_up: <string>, def_up: <string>,
    skill_level: <JSON STRING encoding an array of uint32 levels>,
    enemy_camp_id?: <string>, remain_hp?: <int32>
  }, ...],
  deployed_list: [{
    camp_id: <string>, order: <string>,
    card_1: <string>, card_2: <string>,
    card_3: <string>, card_4: <string>
  }, ...],
  auto_register: <byte>
}
```

The canonical collections above are arrays. Native generic iteration can also
walk JSON objects' values; it does not consume their keys as card identities.
Strict array-only admission is a reasonable **local decoder policy**, not a
claim that the native iterator rejects all objects. These cards have ref_id,
not owned inst_id. Do not fabricate owned Hunter commitments, rank, level,
CP, stats, camp identity or enrollment from ordinary Guild membership.

## Personal scalar widths and flags

PLAY_DATA.parse Gab3758 optionally finds enemy_guild_id, then converts/stores
one unsigned word at Gab383c..3846. inf_gvg is separately converted unsigned
at Gab3912 and stored with STRB at Gab391c: byte storage, not a proved strict
boolean. user selects guild_id Gab39bc, total_cp Gab3a08, offense_point
Gab3a58 and defense_point Gab3ad0; unsigned conversion/storage is visible at
Gab39fc/3a0a, Gab3a4c/3a5a, Gab3ac4/3ad2, Gab3b14/3b22 respectively.
commander Gab3b20 selects a full 64-bit value: integer LDRD Gab3b44 and
STRD Gab3b6c. It must not pass through a JavaScript Number when unsafe.
Canonical nonnegative exact integer identity admission avoids native legacy
string/double coercions; no scientific-notation alias policy is inferred.

auto_register belongs to the callback, not PLAY_DATA.parse: Gab8dd2/dd6
selects it, unsigned conversion Gab8e10, STRB manager+d6 Gab8e18. Restricting
inf_gvg/auto_register to 0/1, or canonical integers instead of native numeric
strings/floats, would be an explicit local safety policy. Native byte storage
alone does not prove which producer flag values are valid.

## CARD: direct flat stat fields and JSON-string skills

CARD.parse Gab4214 strictly converts ref_id to string Gab4242. level,
overcome_cnt and cp use signed32 conversion Gab42be, Gab430c, Gab435a;
awk_step and awk_overcome use unsigned32 Gab43a8 and Gab43f8. skin_id uses
the same strict string conversion at Gab4622. There is no inst_id key in
this complete bounded parser.

Gab4660..4668 passes the **same card object**, not a nested stat object, to
CSRCardStat.parse G886fc0 with mode1. This shared parser selects unsigned
rank G886fe2/G887022 and unsigned awk_step G887032/G887080. All fifteen
stat magnitude keys above are strict JSON strings, converted through native
floating_point: hp G887090/709e/70b0, atk G8870c6, def G8870fe,
spd G887138, crt_chance G887174, crt_dmg G8871b2, penetration G8871ee,
block_chance G887228, block_dec_dmg G887262, attr_enhance G88729a,
attr_resist G8872d2, hp_regen G88730a, hp_up G887342, atk_up G88737a,
def_up G8873b2/73c2/73d6. Mode1 branches over the subsequent scaling at
G8873e8..73ec. Preserve supplied decimal strings and units; this does not
recover their original magnitudes or justify inventing numeric defaults.
Finite decimal validation would be local admission beyond strict string type.

skill_level selects Gab4684/468e, strict string conversion Gab469a, JSON.parse
Gab46ac. Decoded array iteration builds unsigned levels Gab476e, with keys
index+1 Gab477a and key/value storage Gab47c6. It clears the previous skill
map before decoding at Gab466c..468a. No fixed five-element limit appears in
this parser. A literal JSON array field is the wrong wire type. An encoded
empty array string is structurally valid; an empty string still reaches
JSON.parse, so do not claim it safely means no skills.

enemy_camp_id is optional by key existence, Gab4432..44c2, and strictly
converted only if present Gab44d4. remain_hp is optional by key existence
Gab456c..45b8, then signed32 converted Gab4600 and stored Gab460c.
Present null is not equivalent to missing for the strict camp string.
Fresh CARD construction Gab9f54 zeroes the object and sets remain_hp=10000
with MOVW2710/STR Gab9f7c..80; enemy camp remains empty. Optional missing
fields preserve these fresh defaults (or an existing CARD value when this
parser is used elsewhere). Preserve absence in an offline wire decoder;
do not silently add invented producer fields.

## Deployment: two string keys and four string slots

PLAY_DATA selects deployed_list Gab3e7e..84. Each row converts camp_id to
string Gab3fa4..3fb2 and order to string Gab3fba..3fcc. It generates literal
card_ plus indices1..4 Gab3f78, Gab3fe4..3ffe; selected card_i values are
strict strings at Gab4014/4022. All four slots are read, so omitted/null
slots are not source-equivalent to explicit empty strings. The string-keyed
camp/order map receives these four slots Gab403e..4092, then each slot is
also passed to SetDefenceCard(refId) Gab40aa..40b2. The loop ends at index5
Gab40e4..40ee. There is no numeric order conversion or owned-ID array.

SetDefenceCard(refId) Gab3230 compares strings against its deployed-ref
list, logs duplicates, and inserts unmatched strings Gab3334..335c. It has
no nonempty-string gate. Therefore explicit empty string slots are parsed
and even traverse this bookkeeping; they must not be converted to guessed
Hunter IDs or zero-number slots. Original producer uniqueness, order range,
valid camp IDs and deployment eligibility remain separate unknowns. A
strict decoder may require supplied known references and reject duplicate
nonempty commitments, but must label those conditions as local admission.

## Missing, empty and authoritative replacement

Present card_list clears the prior CARD list Gab3c0a..3c70, then appends each
parsed CARD at the FRONT Gab3d5e..6e. Consequently native cache traversal
reverses wire array order; it does not prove a server sort policy. Present
deployed_list clears both camp/order map and deployed-ref list at
Gab3e88..3ede before iteration. Empty arrays therefore clear those selected
collections. Missing collection keys skip that clearing inside parse itself.

Actual GetInst callback Gab8d46..82 constructs a fresh zero PLAY_DATA, then
parses Gab8d86 and replaces scalars and **all three containers**
Gab8d90..8dcc. In this callback missing collections also become empty;
missing personal sections become zero. Never merge a partial response into
an existing instance and call that the native GetInst behavior. Conversely,
publishing an empty snapshot over unknown established registration/decks
is a destructive authoritative declaration, not an inert UI fixture.

An offline complete snapshot decoder is now possible from supplied data.
No original instance/enemies/schedule/registrations/stat magnitudes were
recovered by this grammar audit, and no GetInst route activation follows.
