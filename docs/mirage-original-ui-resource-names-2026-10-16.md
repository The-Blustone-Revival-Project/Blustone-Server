# Mirage original UI resource names: bounded positive evidence

Read-only resource-metadata audit. No live UI, device/private application
values, database replay, DataDump mutations or runtime/profile changes.

## Positive exact background name and concrete UI owner

Published DataDump source
`sources/client-tables/recovered-data/leveldb-tables/all-tables.json` contains
the original `UI_XML_RO` record `KO/MIRAGE/MIRAGE_STAIR`, key at fileline257341.
Whole export SHA256:
`f166f857d45c6dd68e97bd4b8f055be795796400fa10ba9f040aaa1b1d8f0a78`.
Decoded raw XML UTF8 SHA256:
`1f69ff0ea1d8958a637eb242bc5815608b7d4bdc8cc0e1a9ed0c2cdc248ee34c`.
The same export is already mirrored under Server
`resources/reference/recovered-data/leveldb-tables/all-tables.json`.

Decoded XML line36 is:

```xml
<spr9 name="BG_STAGE" res-name="MRG002" pos="0, 0" size="screen, 180" align="left, top" visible="t">
```

This proves **MRG002** is an original nine-sprite resource name attached to
the precise `BG_STAGE` node subsequently replaced by native SetBG G93ca44
(existing `mirage-stair-consumer-contract-20261010.md`). It is a stronger
candidate than a guessed MIRAGE_STAIR naming pattern. At this audit step it did not prove
which hashed JET record owns MRG002 or which original server prefix/postfix
list selected it. Resource ownership/resolution must be joined before serving
a nonempty run. The placeholder alone does not establish the original list.

Other exact references in the same XML:

- line4/8 SLOT_CLEAR nine-sprites; line9 SLOT_LOCK sprite.
- line46 opened-box MS_RW_B8 sprite.
- line48 shaking-box MS_RW_G Animation.
- line52 SPR_LOCK uses MIRAGE_G sprite.
- CHAIN_BROKE and MN_NC are also literal resources.

## Nine exact Mirage layout keys and selective resource names

All records are published original KO UI XML; no new locale aliases made.

- `KO/MIRAGE/MIRAGE_ANI`, line257311: OPEN_DOOR.
- `KO/MIRAGE/MIRAGE_BT`, line257316: video MIRAGE_R_BG, plus generic MS_BG,
  MS_VS, RK_PL, MN_NC and other shared controls.
- `KO/MIRAGE/MIRAGE_MAIN`, line257321: MIRAGE_BG_G, MIRAGE_GRA, OPEN_DOOR,
  PARTI_L_L/PARTI_L_R/PARTI_S_L/PARTI_S_R, RESET, SHOP_ESTELLE, UI_ITM_95.
- `KO/MIRAGE/MIRAGE_POP`, line257326: NEWRECORD and shared controls.
- `KO/MIRAGE/MIRAGE_POP2`, line257331: shared controls/sound/motion resources.
- `KO/MIRAGE/MIRAGE_SHOP`, line257336: MIRAGE_BG_R, SSHOP_MIRAGE,
  SHOP_M_CHA, SHOP_M_DODGE, SHOP_M_TH, SHOP_ONLY_Y, UI_ITM_95.
- `KO/MIRAGE/MIRAGE_STAIR`, line257341: concrete MRG002 owner above.
- `KO/MIRAGE/MIRAGE_STAT`, line257346: MIRAGE_BG_R and shared controls.
- `KO/MIRAGE/MIRAGE_TT`, line257351: no literal res-name/file attributes.

These dependencies prove XML names, not owning pack/file members or successful
native rendering. Dynamic names introduced by native code remain additional.

## CDN index cannot resolve per-sprite filenames

The authorized exact metadata index
`local/private/recovered-assets/phone-evidence-2026-09-19/CDN.db.keys.json`
SHA256 `3937bced171a986b5cdded8b463903eb5b4ebce9a2de636e3b978884715fdc79`
has60 Mirage-containing keys:30 descriptors plus30 type descriptors. All60
have bytes0 and empty prefixHex. They identify MIRAGE/UI_MIRAGE package groups,
PVC packs and header metadata only. The published corresponding
`sources/client-tables/recovered-data/cdn-manifest/cdn-packs.json` MIRAGE row
(line6562) has empty stamp/filename/sign/size. There is no sprite filename
mapping in this scoped evidence. No unrelated values were examined or emitted.

`tools/extract/collect-ui-resource-refs.py` can derive literal dependencies,
but directly opens plyvel.DB. Existing research warns this can compact/write
preserved databases; it was read as code only. This audit instead parsed the
published JSON export and filtered exact Mirage layout records, avoiding raw
private cache replay entirely.

Next useful proof: join MRG002 and the three Mirage background names to the
native resource-name/hash loader and exact original JET record table. The
current evidence cannot support a floor/balance/enemy/reward assignment.

## Battle environment: postfix is a selector, never a direct sprite

Follow-up bounded Thumb audit of immutable original library SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
All addresses below are Ghidra code coordinates ELF+0x10000. No new decoder
or raw native source was written to DataDump.

`CSRExploreMirage.InitBeforeOpen G925118` calls MirageInfo.GetResName
G9252e0, then copies the returned selected postfix into scene+0x220 at
G9252e6..2fe. Its scene type is0x26 G92531e..322.

`CSRExploreMirage.InitBackground G926778` does this:

1. CSRGameStage.get G92679a and GetStageData(scene+0x220) G9267a6.
2. Examine that stage row's string+0x70 at G9267ac..7b0. This is
   **res_prefix**, established by existing bootstrap stage/environment source
   recovery; it is not Mirage inst_base.bg_res. If nonempty use it; otherwise
   use the selected postfix string itself, G9267c6..7dc.
3. Get CSRStaticData at G9267b2/b6 and iterate its ENV_INFO map+0x150,
   G9267ba..7e8/G926832..868.
4. For each ENV node, inspect its PreFix string at node+0x34 G9268a0.
   Build regex literal `[0-9]+` (LDR G926868, ADD G926876, targetG1d72e63),
   call matching helper G9268aa, then extract the first matched substring
   G9268ae..94c. Compare its length and bytes against the chosen selector
   G92694e..9ba. This comparison is exact; leading zeroes matter.
5. On a match copy the map node key at+0x10 G926a24..2e into a candidate
   string vector G926ad2..af6. Randomly select an index at G926b46..5c and
   call **CSRGameBase.OnInitBackground** with that selected ENV key,
   G926b76..82. Empty vector enters the warning path G926b8e..bdc,
   `Cannot find environment Information(ID:%s)`.

There is **no GetBaseInfo call or inst_base.bg_res read in this function**.
The base parser separately stores bg_res at MirageInfo+0x24 (Parse_InstBase
G933dbc..df8), but that is not the selection path above. Do not claim it is
unused everywhere merely from this bounded consumer audit.

Concrete independent published example:
`sources/client-tables/recovered-data/environments.csv` row#ID2 is
`2,빙하지대,STI002,...`. Its first digits are002. File SHA256 is
`0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c`;
Server already mirrors it under resources/reference/recovered-data/.
With no matching stage-row override, postfix002 therefore selects this ENV
candidate; prefixMRG+postfix002 separately selects stair UI nine-spriteMRG002.
This is a demonstrated binding mechanism/example, **not a recovered server
floor, grade, balance, encounter or original prefix/postfix policy**.

The CSV#ID→native map-key owner is independently closed, rather than assumed
from column naming. DataDump
`sources/native/revival/ghidra-leveldata-decomp-04.txt:205-217` loads
CMCSVReader.GetString(column0,row) into local_c0; lines281..309 copy that
string into local_130, the pair key; lines335..341 emplace into this+0x150.
Fresh immutable Thumb cross-check: Gf3bca8 sets r1=0, GetString atGf3bcae,
assigns the returned exact string to sp+90 atGf3bccc. Gf3be84..8c copies that
string into pair-key sp+20; Gf3bf0e sets r5=sp+20, and Gf3bf98/9a pass r5
as key/pair to emplace Gf3bf9c. No numeric coercion occurs in this key path.
Thus source#ID2 is native map key string"2", whereas selector002 is the
separate digit substring of PreFixSTI002.

The preserved `sources/native/episodes/ghidra-episode-background-producer.txt`
OnInitBackground G9cbf34 independently finds the exact ENV key in static+150,
reads PreFix node+34 and builds the normal layered battle background. A
Mirage-only asset registry cannot prove the required STI002 layer coverage.
Native random ENV selection requires coverage of every matching candidate,
not merely one selected convenient texture.

Readiness correction implied by this source:

- Keep prefix+postfix stair-sprite binding checks.
- **Remove direct resources.has(postfix)**: selector002 is not sprite002.
- Do not infer a required direct sprite from inst_base.bg_res in this path.
- Require independently established stage-row override/fallback and all
  matching ENV candidate/layer bindings, with exact leading-zero handling.

## BG_M_INGAME is a separate shade node

Published UI_XML_RO `KO/SR_INGAME/INGAME_MR`, decoded rawline73, contains:

```xml
<rect name="SHADE_BG_M" position="screen/2, 0" size="screen,766" align="center,top" color="0,0,0,0" visible="f">
  <res-sprite res-name="BG_M_INGAME" pos="0, 0" align="center, center" render-option="alphablend"/>
</rect>
```

The same static shade resource exists in INGAMENM. It is a real UI dependency,
but does not replace the ENV selection and layer construction above.

## Follow-up closure and remaining limits

The companion mirage-native-jet-name-index-2026-10-16.md now closes actual
MRG002 ownership in MIRAGE.jet and its full64 S2 image reference. Server
ships hash-pinned reproducible indexes for MIRAGE.jet and ST002.jet. This
closes the named-resource lookup gap above, without establishing an original
server floor assignment. Both ENV map keys2 AND15 have PreFixSTI002 and
therefore belong to the selector002 candidate vector. Updated offline
readiness requires independently established coverage of every candidate.
No live cache, package profile, battle, original app or private save changed.
