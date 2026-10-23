# Eight material Hunters: optional indexed Episode skill projection

The opt-in `BLUSTONE_MATERIAL_SKILL_PROFILE=episode-indexed-projection`
uses eight explicitly selected original encounter graphs as LOCAL ordinary
Hunter skill policy. Default neutral behavior remains separate. These are
recovered Episode numbers and mechanics, not recovered final ordinary balance,
training growth, probabilities or a new historical screenshot interpolation.
Native execution/rendering of the resulting ordinary references is PENDING.

## Exact immutable sources

Server `resources/reference/episodes/EPISODE_STAT_ACTORS.json`, SHA256
`f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56`:
selected source locators below are zero-based array indices, never first-match
actor-ID lookups. Each row must retain its actor ID, ordinary ref_id, base-art
res_id, role/element identity and complete original skill graph.

Original ordinary Rage-cost text is independently pinned in
`SKILL_REF.json`, SHA256
`50ad32940affdd74f070a59ebc0a99727fa1c35a386f1526ce17c3a9291ebf70`,
at each `<ref_id>|1|0` key. Symbolic tags and labels are separately retained
in `src/material-skill-evidence.ts`; they cannot supply missing magnitudes.
See `material-skill-evidence-2026-10-11.md` for all original input pins and
the broader rejected/alternative encounter candidates.

## Fixed selected rows

- **009 Captain: index13, EVCB0201_009**, base art C009. Original cost3,
  cooldown5000, critical field50; types1/2/4. Retains the active hit and
  immunity-counter adjustment, plus the complete ordered follow-up graphs.
- **010 Vincent: index130, CB0302_010_1**, C010. Cost3, cooldown6000,
  critical50; types1/2/4. Uses this particular story encounter rather than
  boss rows50–52 with cost1 or row131 with cost4. Later cost3 variants are
  not silently substituted for stronger coefficients/additional effects.
- **012 Karl Steiner: index143, CB0601_012_1**, C012. Cost3,
  cooldown5000, critical50; types1/2/4. This exact index distinguishes
  duplicate ID index144:144 has cooldown6000 and type4 base_number1.2,
  whereas143 has5000 and **1.0**. Do not collapse the1.0/1.2 coefficient
  difference by rounding or choose whichever duplicate an ID search finds first.
- **013 Denali: index4, EVCB0201_013**, C013. Cost4, cooldown5000,
  critical50; types1/2/4/5. Retains the full team-heal/cleanse graph and its
  original passive tier. Its HP nodes use fixed-reference max-HP selectors
  (`refer_target_type:2, refer_target_stat:4`), including the timed active.
  Ordinary symbolic text describes DEF-scaled team healing; that mechanism
  agreement is **not** recovered. The selected max-HP encounter behavior
  is an explicit LOCAL adoption, without rewriting it to match that text.
- **017 Lapis: index150, CB0401_017_1**, C017. Cost3, cooldown8000,
  critical50; types1/2/4. Retains this story variant's bleeding and follow-ups;
  row149 is a different richer/stronger encounter graph, not missing data
  to merge into150.
- **036 Bear: index68, CB0601_036_1**, C036. Cost4, cooldown8000,
  critical50; types1/2/3/4. Unlike representative index67, this rank4
  encounter supplies explicit active critical metadata and a type4 self-heal.
  It preserves the selected passive/follow-up and source tier gates; it does
  not borrow index21's extra type4 effect or index114's other timings.
- **040 Bibi: index70, EVCB0301_040**, C040. Cost3, cooldown5000,
  critical50; all types1–5. This is an actual cost-agreeing full graph;
  representative69 and candidate115 instead cost4. No cost override or
  coefficient rescaling is needed or permitted to make those variants fit.
- **049 Bright: index93, CB0202_049_1**, C049. Cost4, cooldown8000,
  critical metadata **absent**; types1/2. Unlike representative73's fixed
  max-HP heal,93 references source DEF (`refer_target_type:1,
  refer_target_stat:3`), agreeing with the ordinary symbolic dependency.
  That agreement does not recover ordinary magnitude/growth. Critical0 is
  an explicit neutral wrapper value, not a recovered original probability.

All eight source active costs agree with their independently recovered literal
ordinary costs. Cost agreement alone does not establish ordinary formula or
balance agreement; Denali above demonstrates the distinction.

## Adapter boundaries

Preserve each present source `type`, `target_rank`, effect order, effect_type,
target/ref selectors, base_number, duration and interval exactly. Raw source
milliseconds remain raw:4100 must not be rounded to4000 to fit descriptive
four-second wording. Actor rank/stat records are not skill magnitudes and
must not be adopted alongside the graph by implication.

The complete five-slot ordinary wire wrapper is still necessary. Absent
source types keep neutral empty effect arrays; do not synthesize a skill3/5
from a symbolic placeholder or another encounter. Added serials1..N,
up_number0, duration_up0, empty value_calc/effect_desc and missing scalar
metadata default0 are LOCAL wire adaptation choices, not newly recovered
source fields. Existing source numeric values take precedence.
Zero growth preserves an encounter coefficient; it does not claim original
ordinary skill training had zero growth.

Native type2 follow-ups and type3/5 auras use the supplied target_rank and
`base + up*owned_level`; no general positive-level gate is proved. Retain all
five owned level keys, including0, and do not change owned skill levels/ranks
to force eligibility. Proven paths and limitations are in DataDump
`findings/hunters/skill-followup-construction-contract.md` and
`skill-passive-registration-contract.md`.

The adapter must keep original source labels/cost provenance distinct from
ordinary semantic claims, preserve default behavior outside these eight IDs,
and refuse unknown profiles or mismatched/modified source rows. Publishing
skill references neither grants a Hunter nor changes inventory, XP, level,
rank, training fees, decks or saved ownership. Existing first-four active
skill profiles remain a separate policy.

## Empty icon/cut-in fields: narrow positive native closure

The original preparation kept icon/cut strings empty. The 2026-10-23 bounded
resource audit now supplies LOCAL `C{id}_SI{slot}` icon bindings only for these
eight opted-in Hunters; see `material-skill-icon-bindings-2026-10-23.md`.
Cut strings remain empty; no CUT filename mapping is inferred. Read-only original
ELF SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`
and retained DataDump consumers establish the following narrower facts:

- `sources/native/hunters/ghidra-ordinary-skill-layout.txt:1462` begins
  **SRSKILL_INFO.parse Gf219ac**. Its ending string-copy branches are at
  lines2609–2658. Fresh Thumb independently resolves **cut_in_id** from
  Gf2279e/Gf227a4 to G1d76bcb; Gf227a6..7ec strictly converts/copies the
  string into skill-info+0x54. **icon_id** resolves from Gf227e2/Gf227e8
  to G1d8df24; Gf227f0..2830 copies it into+4. These copies have no
  nonempty-length assertion. Present empty strings satisfy this parser's
  string contract; null/missing fields are not equivalent.
- `sources/native/hunters/ghidra-skill-drawable-targeting.txt:693-701`
  obtains the actual actor's role, attribute and skill cost, then invokes
  **CSRGameUIIconSkill.SetData Ga3bc20**. Its signature is
  `(CHAR_ROLE,CHAR_ATTRIB,float)`, without a skill icon ID. The role switch
  at `ghidra-skill-badge-children-contract.txt:44-65` selects generic HUD
  sprites. `ghidra-skill-badge-literals.txt:1-22` independently identifies
  **SR_INGAME/UI_SKILL**, **SKILL_ICON** and role resources
  **UI_IG_SK_A/D/F/M**. This battle-button presentation uses generic
  role/attribute/cost data, not the material reference's icon_id.
- `findings/hunters/starter-skill-resource-bindings.md:93-97` and
  `sources/native/hunters/ghidra-active-skill-cut-flow.txt` close
  **OnProcSkillRet G9cf920 → skill-view Make Ga20e0c → Prologue.Load
  Ga1df14**. DATA receives actor Ref/ResID/ResPrefix; Make passes DATA+8
  and+0x14 into Prologue. It does not read the direct skill cut_in_id field
  in this producer. Prologue loads **SR_INGAME/SKILL_EFT**, uses Hunter
  reference data for the title and actor ResID for portrait helpers.

Thus no nonempty icon_id/cut_in_id precondition is established in these closed
parser, battle-button and prologue producer paths. This is not a universal
blank-resource safety claim: training/detail skill-icon consumers remain
unverified, actor portrait/animation assets still need to resolve, and the
prologue does not become optional merely because cut_in_id is empty. Missing
portrait animation has native assertion/failure paths. Source closure does
not replace a native ordinary material-Hunter activation/rendering check.

## Completed host verification and pending native validation

Root implementation checks passed: TypeScript build; unit coverage of all
eight exact selected graphs/costs/tier gates/timings and local defaults;
neutral/default behavior and unchanged first-six references; unknown profiles
and profile-flag admission; source-hash corruption refusal; detached outputs
and caller-copy isolation. Separate import-time profile processes prevent
module-cache settings from masquerading as default compatibility.

Compiled encrypted HTTP verification also passed for the14-reference materials
catalogue: the eight selected rows are projected while unrelated references
remain unchanged, with no mutation of existing owned keys or progression.
These are host protocol/reference/ownership checks. Native ordinary skill
execution, exact HP effects, Rage debit, portrait/cut-in rendering and return
to battle remain **PENDING**; no such result is claimed by this note.

Locke79 and an ordinary-cost-compatible Dino candidate119 may be investigated
for later breadth. They are outside this fixed eight-row proposal; neither
the combined22-reference asset profile nor the565 derived estimate rows
automatically expands this skill policy.

## Prepared profile and ownership boundary

`config/profiles/current-e6-materials-skills.json` is an INACTIVE candidate:
all139 package names/order/bytes, stamp1634683, existing starter active profile,
stat policy, recruitment and network/persistence settings match its materials
baseline. Only BLUSTONE_MATERIAL_SKILL_PROFILE selects this adapter. The option
requires BLUSTONE_CARD_REFERENCE_PROFILE=materials and rejects unknown modes.
It does not rewrite the default/live profile or enable the broader169 union.

`npm run test:material-skills` builds and runs source-parity and compiled
P384/HMAC/AES HTTP checks. The stronger HTTP fixture seeds all eight material
Hunters in an independently created neutral-profile prior save, with explicit
AUTHORED disposable ownership; this is not an acquisition grant. Restoring that
save under the new profile preserves every owned rank, level, skill key
(including0), card book and peer game. Targeted inventory and reference reads
leave the complete post-authentication save byte-identical; restart does too.
The existing six references, all14 reference stats/base metadata, original
source bytes and profile files remain exact. Publishing this profile grants no
Hunter and does not widen trace exchange or gacha pools.

The full220-program runtime regression run passed, alongside the final focused
build/unit/compiled HTTP command. No live save or native input was used. Native
combat/portraits/detail/training presentation and ordinary final balance remain
unverified. The eight source graphs are encounter behavior adopted as policy.

## Native continuation,2026-10-23

A new selective material-only birth-grade profile safely preserves the actual
rank1 starter saves; it now supplies these eight graphs and historical stats
without altering001..006. One normal paid30-Manda draw acquired Bright049/
rank3. Original body/name/role/element and icons1..3 now render; exact Bright
active serial0 joins its original description formula, showing756 recovery.
Missing graph slots remain empty. Native ordinary reserve body/Victory and
participant EXP verified, but no Bright heal activation or E6 win is claimed.
The older named profiles themselves remain unchanged. See the dedicated
compatible-rank, icon-binding, Bright-description and native acquisition notes.
