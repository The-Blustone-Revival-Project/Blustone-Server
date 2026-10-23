# Material Hunter detail icons: bounded LOCAL bindings

Root observed newly paid/recruited Bright049 rendering its original body and
three-star Support/Fire detail, but all five skill icons were empty outlines.
The indexed adapter previously retained empty `icon_id`. This change supplies
only a LOCAL slot-to-art mapping inside the existing opt-in eight-Hunter
`episode-indexed-projection` adapter: `C{ref_id}_SI{type}` for types1..5.
Original server assignments remain unknown; native icon rendering after this
change is pending. Names, cuts, effects, cost, timings, tiers and ownership are
unchanged. Empty Bright3/4/5 graphs remain empty despite receiving original art.
Neutral mode and the first six references are unchanged.

The original native `CSRPopUpCardInfo::SetSkillPanel` at G0xb9610c receives the
icon string, constructs CMHashID at G0xb9618c..90 and calls
`CSRUIImageNode::LoadAnim` at G0xb96198. There is no nonempty fallback visible
in this path. `SRSKILL_INFO.parse` copies icon_id into skill-info+4. The original
ELF pin is `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Read-only retained evidence: DataDump
`findings/hunters/starter-skill-resource-bindings.md` and
`sources/native/hunters/ghidra-ordinary-skill-layout.txt`. Existing first-four
LOCAL ordinary wrappers use the same AT naming pattern; that precedent is not
an original response capture.

`tests/material-skill-icon-resources.py` reads only eight known Server
`resources/runtime/assets/C{id}_Q.jet` inputs using existing bounded
`scripts/resources/jet-index.py`. For every one of40 icons it requires exact
EOF, package byte/hash pin, AT kind, supported one-frame animation, matching S2
`C{id}_SI0{type}` sprite, supported single-image atlas wrapper and a resolving
I2 image/hash. AT names and leading-zero S2 names are distinct resources.
This is a structure/header/dependency proof, not a screenshot interpretation.
Runtime request handling performs no binary reads or resource parsing.

Q-pack SHA256 pins, retained in `src/material-skill-evidence.ts`:

- 009: `ba7951cd2d2f0bab3b69021d5250c270b81130b3ee80c8bd375664139382549c`
- 010: `f2a19358c627047df72baa8329428147e70f8a0d36960b1e0a3996301985955d`
- 012: `37b022a9949b6a2ec16df563522e416cfe0f90652aae47ceb21c2f81d389fa4b`
- 013: `1a09892b4e9ac4809b83e9e60a54f768d790caf98024677e85726eba8dd8d583`
- 017: `6c773754a1242733743da0554a35184e7b361c6da576bfae12c1da1f2de6728b`
- 036: `73002b5ee10b3dd49e5647531b142fb4fff410ab11cf8a99f6386d031e4baa25`
- 040: `029b991a93eb6f3d9d7aea668bdf75006218957de09211378a4013306126718b`
- 049: `4e3e5638bd74f83acc9c722be8b1ad3ea6ab9790a6bcb4f08d791a0cabbd3940`

Bright AT offsets1..5 are58630,58686,58742,58798,58854. Their S2 records are
C049_SI01..05; corresponding I2 image IDs are `2S8NUR`, `U.P8Q2`, `VHJCPM`,
`HTI_LG`, `.LT657`. All required Q packs were already selected in139; no asset
copy, resource version/stamp change, profile expansion or client patch is needed.

The source projection test invokes the bounded art proof and preserves its
exact graph/default/first-six checks, with only the expected icon difference
allowed for missing source slots. It explicitly verifies Bright3/4/5 still
contain no effects. Native detail icons, slot order and locked appearance must
be checked after the controlled server/client reload; do not claim those from
the host tests.

## Root native Bright closure

Same+15 APK, unchanged139/stamp1634683, compatible material profile. Native
Bright Train now renders original icons1/2/3 and locked4/5; Skill1 popup icon
also renders. Missing Bright3/4/5 graphs remain empty. Native presentation of
the other seven Hunters and unlocked4/5 is not claimed from this one check.
The corrected Bright active description separately calculates756 via its exact
serial0 source join. Native ordinary participation and earned EXP passed; no
heal activation was performed. See bright-native-acquisition-2026-10-23.md.

The bounded source proof checks uniqueness at each AT/S2/I2 join and complete
EOF with the exact retained Q hashes. Verification uses Python3 (python on
Windows, python3 elsewhere) without writing interpreter caches.
