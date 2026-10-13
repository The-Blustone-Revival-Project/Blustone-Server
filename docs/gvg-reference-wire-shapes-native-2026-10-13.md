# Complete GvG reference wire containers: corrected nesting and reward strings

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra code convention ELF+0x10000. Direct register-flow, original symbol,
literal and concrete callback analysis. DataDump read-only; no live/route/state
activation. This supersedes the nested illustrative shape in DataDump's older
gvg-reference-2026-10-05.md; that retained document is not edited.

## Correct top-level shape, not all children under gvg

```text
{result_code:1,ret_data:{
  gvg:{id:string,min_entry_cnt:uint32,
       teaser_begin_dtm:word32,register_begin_dtm:word32,
       matching_begin_dtm:word32,deploy_begin_dtm:word32,
       combat_begin_dtm:word32,calc_begin_dtm:word32,
       result_begin_dtm:word32,finish_dtm:word32,next_gvg_dtm:word32},
  reward:[{min_cp:int32,max_cp:int32,...RewardPreview}],
  inf_reward:[RewardPreview,...],
  point:[{id:int32,val:int32},...],
  camp:[{min_cp:uint32,camp_id:string,name?:string,link_camp:JSON_STRING},...]
}}
```

Numbers here are domains, not recovered original values. Preserve every supplied
row/order and explicitly configured data; do not invent dates or default camps.

Register proof: BATTLE_INFO.parse Gaa3260 saves destination as sb Gaa3270 and
ORIGINAL ret_data as sl Gaa3274. It selects gvg Gaa3286/88, saves that child
in r6 Gaa328e, and uses r6 for strict id/min_entry_cnt/nine dates. But reward
lookup Gaa363e takes ORIGINAL sl via Gaa3638, not r6. Gaa3690 saves original
sl to stack4; Gaa38e4 restores fp from stack4 for inf_reward lookup Gaa391e,
point Gaa3b50/54 and camp Gaa3cc0/4. These four tables are SIBLINGS of gvg.
Publishing them inside gvg silently leaves those actual consumers unavailable.

Actual RequestRef inner callback vtable2150594 callable Gabbf84 requires
response PVCode1 Gabbfac..fae. It finds envelope.ret_data Gabbfe2/fe4 and
passes that subtree to BATTLE_INFO.parse at Gabc038. CSRSyncRef.ReqGVGRefCB
independently selects ret_data and tail-calls ParseRef. There is no bare array,
ret_data.reference or ret_data.gvg-only callback grammar.

## Schedule/scalar fields

id is strict string Gaa32a0. min_entry_cnt uses uint32 conversion. The nine
numeric schedule words are described exactly in gvg-phase-clock-native-
2026-10-13.md: rawlow32, native signed comparisons, timejump and strict phase
boundaries. A strict supplied parser may admit only exact signed32/uint32 bits,
never rounded64 values or ISO date text. It must not use phase0 as authority
to fabricate a disabled reference or declare empty scene vectors safe.

min_cp/max_cp belong to EACH ordinary reward row, not gvg metadata.
Gaa3722/Gaa3770 select those fields and float/string paths use VCVT.S32.F64
Gaa3760/Gaa37ae. Camp min_cp independently uses unsigned conversion
Gab2de4. Point val Gaa3c12 and id Gaa3c78 use signed32 conversions; there is
no proven full enum maximum merely because other findings mention literal16.

## Exact RewardPreview parser: three JSON strings, not direct arrays

Each ordinary reward row is passed INPLACE to SRREWARD_INFO.parse Gde7f34
at Gaa3828. No nested row.reward field is selected. inf_reward rows go to
the SAME parser Gaa3a94; loop stops before a third row Gaa3a3c..40. A strict
parser should reject more than2 instead of silently truncating supplied data.
The two slots' original semantic labels and numerical policies remain unknown.

RewardPreview has these scalar uint32 fields:

```text
vip_exp, honor, free_iap, paid_iap, ap, bp, gold
```

These are flat preview quantities, not prev/cur wallet pairs, not rupee, and
not iap (paid_iap is exact). Scalar conversions use unsigned VCVT, e.g.
Gde7f92 and Gde82f4. Preview decoding grants none of them.

card_list Gde8178, item_list Gde83a2 and skin_list Gde85be are STRICT JSON
STRINGS: from_json<string> Gde8188/Gde83b6/Gde85d2, followed by JSON.parse
Gde81c8/Gde83f6/Gde8612. Decoded container is a collection whose supported
canonical form is an ARRAY of {id:strict string,qty:uint32}. Row keys are
id/qty (Gde8278/827e; Gde8480/8486; Gde869c/86a2), not ref_id. Empty string
or exact string "[]" skips parsing. A supplied validator can preserve those
two empty forms and otherwise require well-formed canonical array strings.

SRREWARD_INFO.dump emits direct arrays and uses ref_id for its output rows.
That asymmetric local dump is NOT this reference wire parser's input grammar.
Do not publish dump output directly as the original GetRef quote.
Known card/item/skin reference joins, unique IDs/quantities and lossless UTF8
are conservative publication admission policies; all original reward values
and original acquisition/settlement remain separate gates.

## Camp graph

_CAMP.parse Gab2d7c consumes min_cp:uint32 and strict camp_id string
Gab2df0..dfe. Optional name is a plain strict string override Gab2e4c/Gab2ea6,
not a locale object. If absent, the native fallback is camp_id plus literal
" name" at Gab2e04; that suffix is not a JSON field named " name".

link_camp is a STRICT STRING Gab2ef6 and parsed as JSON at Gab2f0c→G8447e4.
Every decoded link is itself a strict STRING Gab2ffc appended to the native
camp's vector. Canonical supported form is e.g. link_camp='["existingCamp"]'.
A direct link_camp array is incompatible. A strict graph parser should retain
the raw wire string and detached decoded adjacency, require unique camp IDs,
and refuse links to missing/self/duplicate targets as explicit local graph
admission. Directedness/symmetry, tactical order, camp counts and numerical
CP requirements must not be inferred from a graph parser.

Camp rows populate a map. Original duplicate insertion and partial-cache
behavior must not choose between conflicting supplier rows silently. Existing
source does not prove [] safe for the entire Guild Battle UI. The successful
strict shape of a collection is not proof that a screen never dereferences
its first/sentinel element or needs named camps.

## What can now be implemented without invented originals

A PURE supplied GetRef decoder can validate this exact envelope/whitelist,
detach gvg schedule, CP-bound previews, max2 infinite previews, signed point
rows and the string-encoded camp graph. Every list must be explicitly supplied;
do not fill missing lists or numerical fields with fabricated defaults.
Optional camp name follows its source optionality. Explicit empty collections
can be inspected offline, but must carry no native UI safety or disabled-
season claim. Generated catch/battle/fee/participation/reward changes are absent.

Actual GvG CARD stats/card_1..4 deployed decks are personal instance/combat
schemas, NOT fields of this GetRef response. Reward card_list only references
card IDs and quantities. Do not create Hunter stat rows, personal enrollment
or enemy decks while validating reference quotes. Full route activation also
needs genuine supplied metadata/provenance and scene-empty/state/cache checks;
original schedules, camps, points and payouts remain unrecovered numerically.

## Implemented offline parser and verification

src/gvg-reference.ts now implements this PURE complete supplied decoder.
parseGvgReference returns detached ret_data-shaped data and preserves raw reward/
link string encodings. gvgRewardEntries/gvgCampLinks provide detached inspection.
Every scalar/list is supplied explicitly; no implicit0, empty table or season.
Optional known registry defaults to empty: empty reward lists can be inspected,
but nonempty card/item/skin rewards require independently known reference IDs.
CP bounds preserve signed32 values including−1 without inventing range semantics;
points preserve signed32 values without claiming enum names. All unsupported
extra/nested fields, missing tables, duplicate identities and incoherent links
refuse under explicit local strict admission.

tests/gvg-reference.ts passes with authored offline probes for corrected sibling
tables, list string/id-versus-dump-array/ref_id grammar, optional plain camp name,
link graph, exact domains, max2 inf slots, partial/invalid refusal and detached
input/output. Isolated strict TypeScript checking with Node types and diff-check
pass. No ServerState/game route/package/goal/runtime integration by this lane.
