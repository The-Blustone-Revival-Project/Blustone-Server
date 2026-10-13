# Guild creation: concrete UI bounds and remaining admission gates

This bounded original-byte pass closes edit-text character limits, the ordinary
FC-point threshold slider and the Found payload. It does not recover original
minimum founder level/points, pending-membership restrictions, name uniqueness
normalization, bad-word locale/consumer semantics, font admission, numeric fees or server payment rules.
Any opt-in creation implementation must identify its local policies explicitly.
Passing these pure UI checks is not permission to create a Guild.

## Exact edit-input character limits

Final immutable ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra addresses subtract0x10000 for code ELF offsets. Read-only Capstone5.0.7
and retained native symbols identify every consumer below.

CSRTabGuildMgr.OnButtonClick's name editor passes literal14 at Gfcf26e to
LoadEditInputPopup Gfcfd2c; the description editor passes literal80 at
Gfcf390. LoadEditInputPopup preserves this input inr9/sb at Gfcfd3a and passes
it to CSRPopUpEditBoxGuild.SetData Gc910f4 at Gfcfe80–82. SetData stores it at
popup+bc at Gc9111a.

ResultCB Gc915ec first checks input with CMIsUtf8 G78ddb8, calls
CGMDataMgr.HasBadWord G793cb8 and checks font IsSupportingChar G79d4f8.
Those are distinct validation consumers. Follow-up inspection confirms original
BADWORD_RO data exists in the retained export: five locale records
EN502/JA31/KO4159/SC4082/TC85 string entries. Earlier missing-corpus language
was too broad. Locale selection, loading, matching/normalization and its exact
admission behavior remain unreconstructed; font admission is also incomplete.
No blacklist is promoted into the server merely from these available strings.

Length validation at Gc91764 calls RMGetUTF8len G10f6a18. The preceding loop
counts high-bit bytes; any nonzero result becomes1 at Gc91770. It loads the
configured limit from+bc, shifts it right by that0/1 at Gc91772, floors the
effective maximum at8 at Gc91774–78, and refuses when UTF8 length exceeds that
maximum at Gc9177a–7c. Therefore:

- name: ASCII maximum14; ANY non-ASCII byte makes the entire-field maximum8.
- description: ASCII maximum80; ANY non-ASCII byte makes maximum40.

RMGetUTF8len counts bytes whose top bits are not`10`, skipping UTF8
continuation bytes (G10f6a34–42), and stops at NUL. For valid UTF8 this is a
Unicode code-point count, not UTF16 length or grapheme-cluster count. Mixed
ASCII/non-ASCII names do not receive a per-character weighted allowance.
Empty input has length0; this length check alone establishes no minimum name.

`guildTextInput` reproduces this length-only admission for name/desc. It
rejects nonstrings, lossy/unpaired-surrogate encoding and embedded NUL as
explicit safe replica admission. Bad words, font support, minimum/name syntax,
case folding and duplicate-name rules remain independent gates. A narrower
printable-ASCII creation subset would be local policy, not recovered parity.

## FC-point limit is a membership setting, not founder eligibility

SetCommon initializes its slider at Gfce696–Gfce6a4 using
CSRUISlideBar.SetSlideArea G1095d94 with min0, max4000 and unit500.
The setter stores those three words at+8b4/+8b8/+8bc; GetUnit G1095e3a
reads+8bc. SetCountToPos G10958c8 snaps the requested count by subtracting
its remainder modulo unit at G10958f0–5900 and applies the bounds. GetCount
G1095e40 returns the selected count.

Creation gets that count at Gfcf83a–42 and supplies it as RequestBuild's
unsigned fc_point_limit argument at Gfcf878. `guildFcPointLimit` admits only
ordinary UI values0..4000 in500 increments; strict server refusal outside
this range/unit is local policy based on the observed UI path. The original
server may have accepted different values. This does NOT prove the founder
needs their own FC score to meet the chosen threshold, nor establish a minimum
FC score or account level for creating a Guild.

## Found payload, region and payment boundaries

RequestBuild Ga6f8c4 serializes exactly six creation fields alongside auth5:

- name: strict string, key Ga6fa24/Ga6fa28.
- desc: strict string, key Ga6fa3c/Ga6fa40.
- type: USER::JOIN integer, key Ga6fa60/Ga6fa62.
- fc_point_limit: unsigned integer, key Ga6fa8c/Ga6fa90.
- region: strict string, key Ga6fa9a/Ga6faa6.
- emblem_id: strict string, key Ga6fac6/Ga6faca.

Route literal Ga6fba2/Ga6fba4 resolves `/guild/Found`. No price_type,
wallet choice, requested initial member/role, founder minimum level or initial
rank is sent in this request.

The ordinary creation caller supplies name tab+8e8, emblem from+8f4,
join-dropdown index+1, slider count, region+900 and description+90c at
Gfcf83a–Gfcf886. SetCountry copies its region string to+900 at
Gfcd6e4–Gfcd6fc. The creation button rejects a zero-length+900 string at
Gfcf64a–Gfcf65a and displays exact original invalid-region text at
Gfcf70e/Gfcf714. Region allow-list, creator-region eligibility and original
country code registry are not closed by this nonempty check.

Join values1/2/3 are independently recovered public/permission/private.
The original stock icon picker supplies only GD_IMG_1..6 by actual sprite
GetResName; historical sprites7..10 are not current picker choices. Name and
description do not supply permission to upload a custom emblem URL.

Creation uses action1's cached amount and PlayData.gold affordability at
Gfcf65e–Gfcf670. Exact original error literal is insufficient Rupees. This
supports an explicitly configured local gold2 action1 branch, but numeric
original prices and full server fee/receipt rules remain separate evidence.
The native Found request cannot establish paid/free Manda debit order because
it sends no payment choice. Do not reuse the modification total-Manda gate.

## Unknown account/settings gates stay explicit

No GetGuildSetting route/symbol was found in the inspected final native indexes.
The positively bound references are the five GetGuildPrices/contribution/
level-benefit routes already documented. This is a bounded index finding;
it does not prove no configuration existed on the original server. There is
no recovered original minLevel/minFC setting row to invent or default.

The persisted model currently represents joined status3 or no joined record;
unsupported histories refuse import. Absence of a joined record does not
prove absence of original pending applications, invitations, bans, cooldowns
or recently exited membership. Found must refuse known affiliation/conflicts
and retain these limitations; it must not assign another account based only
on a supplied name or members array. Minimum levels, pending transitions and
rejoin restrictions can only be explicit local policy until their actual
consumer/data proof is recovered.

## Verification

`tests/guild-text-input.ts`, isolated strict TypeScript and diff checks pass.
Tests cover exact ASCII/mixed/Korean limits, astral and combining code-point
counts, malformed surrogate/NUL refusal, length-only empty-input behavior,
all nine FC slider values and out-of-range/off-unit refusal. No source price,
account level, ownership or mutation fixture is created by these tests.
No state/routes, live saves, game inputs, resources or APK were changed.
