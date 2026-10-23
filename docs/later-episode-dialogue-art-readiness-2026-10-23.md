# Later Episode dialogue, cut-in and NPC resource readiness

Read-only original-resource/native audit against the inactive compatible210
`current-e10-expanded-character-progression.json`. No profile/default,
ordinary reference, ownership, resource alias, runtime or client change is made.
This is the dialogue-art lane; combat bodies/effects/backgrounds and full
reference completeness are separate checks.

## Exact source and corrected graph scope

Original `DIAL-EN.jet` SHA-256:
`a79ea5c803b1dc747a052e5a438c521e4e5617932d67990d6ec4d44e75a3a3c0`.
Every inspected resource inflates with the original **six-byte RW envelope**:
`RW` plus little-endian length, followed by the XML. The encoded length must
match exactly; stripping four bytes is incorrect.

The complete E11–E18 set contains **84 dialogue XMLs / 2,027 DialogEntry nodes**:
61 story entries and 23 combat victory continuations. An initial direct-S01
linked-combat pass found only80/1978. It omitted four transitive continuations:
`CB1304→EP_2007C`, `CB1305→EP_2007D`, `CB1704→EP_2407C`,
`CB1705→EP_2407D`. These four were then independently inflated/parsed and add
49 nodes, no new actor family or literal resource. The root's separate generic
BFS auditor also follows combat win/lose/lose2 edges and confirms this scope.
The common `EP_0000A/B` loss scripts are additional shared resources, not part
of the84 chapter-local XML count.

Several original combats intentionally name the SAME chapter continuation for
win, lose and lose2. E13's CB1304/1305 and E17's CB1704/1705 are examples; these
are not all ordinary lose-to-map cases. Do not replace their original graph
links with a guessed shared failure dialogue or treat a named victory XML as
proof the battle must be won to follow that edge.

Literal extraction covers `bg-add res:` and `play-bgm res:` in UserScript.
A separate scan of all chapter-local scripts found no such commands with
unhandled argument-before-res ordering. There are **45 unique literal
resources, all with positive original package owners**. Absence of a music
literal in a given XML is not proof of silence: combat/default music policy
is outside that particular script.

## Per-chapter declarations and additional selection

Actor lists contain only Actor/Conversant IDs actually referenced by dialogue
nodes, excluding narrator999. All declarations are Char or NPC. The base/Q/SND
family checklist follows the existing E10 dialogue packaging policy; it is a
conservative family-readiness check, not proof that every node loads each file.
Combat EFT requirements are deliberately left to the combat lane.

### E11

- Entries: `EP_1801A`, `EP_1802A`, `EP_1803A`, `EP_1804A`, `EP_1805A`, `EP_1806A`, `EP_1807A`, `EP_1808A`.
- Combat continuations: `EP_1803B`, `EP_1808B`.
- 10 XMLs / 233 nodes; Char IDs: 001, 003, 006, 008, 009, 011, 014, 018, 019, 028, 043;
  NPC IDs: 001.
- Literal backgrounds/music/cut-ins: BG003_1, BG006_3, N001_BG, N010_BG.
- Unselected Char/NPC family files relative to210: C008.jet, C008_Q.jet, C008_SND.jet, C019.jet, C019_Q.jet, C019_SND.jet, C028.jet, C028_Q.jet, C028_SND.jet, C043.jet, C043_Q.jet, C043_SND.jet.
- Unselected literal owner packs relative to210: N010.jet.

### E12

- Entries: `EP_1901A`, `EP_1902A`, `EP_1903A`, `EP_1904A`, `EP_1905A`, `EP_1906A`, `EP_1907A`.
- Combat continuations: `EP_1902B`, `EP_1904B`.
- 9 XMLs / 177 nodes; Char IDs: 004, 009, 012, 013, 040, 041, 049, 054, 057;
  NPC IDs: none.
- Literal backgrounds/music/cut-ins: BG002_1, BG004_1, BG007_1, CUTIN_E1201.
- Unselected Char/NPC family files relative to210: C057.jet, C057_Q.jet, C057_SND.jet.
- Unselected literal owner packs relative to210: CUT_E1201.jet.

### E13

- Entries: `EP_2001A`, `EP_2002A`, `EP_2003A`, `EP_2004A`, `EP_2005A`, `EP_2006A`, `EP_2007A`, `EP_2008A`.
- Combat continuations: `EP_2001B`, `EP_2002B`, `EP_2007B`, `EP_2007C`, `EP_2007D`.
- 13 XMLs / 242 nodes; Char IDs: 001, 003, 004, 009, 010, 012, 013, 030, 035, 041, 054;
  NPC IDs: 001.
- Literal backgrounds/music/cut-ins: BG000_1, BG003_1, BG004_1, BG005_1, BG007_1, BGM_BATTLE2, BGM_BATTLE3, BGM_D_START, BGM_GULLVEIG, BGM_TRAIN, CUTIN_E1002, CUTIN_E1301, N001_BG, N007_BG.
- Unselected Char/NPC family files relative to210: C035.jet, C035_Q.jet, C035_SND.jet.
- Unselected literal owner packs relative to210: CUT_E1301.jet.

### E14

- Entries: `EP_2101A`, `EP_2102A`, `EP_2103A`, `EP_2104A`, `EP_2105A`, `EP_2106A`, `EP_2107A`.
- Combat continuations: `EP_2103B`, `EP_2105B`.
- 9 XMLs / 236 nodes; Char IDs: 004, 009, 041, 054, 056, 064, 068;
  NPC IDs: none.
- Literal backgrounds/music/cut-ins: BG000_1, BG001_1, BG001_2, BG001_3, BG006_1, BG006_2, CUTIN_E1401, CUTIN_E1402, N004_BG.
- Unselected Char/NPC family files relative to210: C064.jet, C064_Q.jet, C064_SND.jet, C068.jet, C068_Q.jet, C068_SND.jet.
- Unselected literal owner packs relative to210: CUT_E1401.jet, CUT_E1402.jet.

### E15

- Entries: `EP_2201A`, `EP_2202A`, `EP_2203A`, `EP_2204A`, `EP_2205A`, `EP_2206A`, `EP_2207A`, `EP_2208A`.
- Combat continuations: `EP_2202B`, `EP_2205B`.
- 10 XMLs / 225 nodes; Char IDs: 004, 009, 010, 023, 041, 054;
  NPC IDs: none.
- Literal backgrounds/music/cut-ins: BG901_1, CUTIN_E1201, CUTIN_E1402, CUTIN_E1501, CUTIN_MI01, N004_BG.
- Unselected Char/NPC family files relative to210: C023.jet, C023_Q.jet, C023_SND.jet.
- Unselected literal owner packs relative to210: CUT_E1201.jet, CUT_E1402.jet, CUT_E1501.jet, CUT_MI01.jet.

### E16

- Entries: `EP_2301A`, `EP_2302A`, `EP_2303A`, `EP_2304A`, `EP_2305A`, `EP_2306A`, `EP_2307A`, `EP_2308A`, `EP_2309A`.
- Combat continuations: `EP_2303B`, `EP_2306B`, `EP_2307B`, `EP_2308B`.
- 13 XMLs / 256 nodes; Char IDs: 004, 009, 010, 023, 041, 054, 056, 064, 068;
  NPC IDs: none.
- Literal backgrounds/music/cut-ins: BG901_1, BG902_1, BGM_BATTLE1, BGM_BATTLE2, BGM_BATTLE3, BGM_D_START, BGM_GULLVEIG, BGM_MENU, CUTIN_E0601, CUTIN_E1001, CUTIN_E1601, CUTIN_MI01, N004_BG.
- Unselected Char/NPC family files relative to210: C023.jet, C023_Q.jet, C023_SND.jet, C064.jet, C064_Q.jet, C064_SND.jet, C068.jet, C068_Q.jet, C068_SND.jet.
- Unselected literal owner packs relative to210: CUT_E1601.jet, CUT_MI01.jet.

### E17

- Entries: `EP_2401A`, `EP_2402A`, `EP_2403A`, `EP_2404A`, `EP_2405A`, `EP_2406A`, `EP_2407A`, `EP_2408A`, `EP_2409A`.
- Combat continuations: `EP_2403B`, `EP_2404B`, `EP_2407B`, `EP_2408B`, `EP_2407C`, `EP_2407D`.
- 15 XMLs / 473 nodes; Char IDs: 004, 009, 010, 013, 054, 056, 064, 509, 510;
  NPC IDs: 502.
- Literal backgrounds/music/cut-ins: BG000_1, BG004_1, BG011_1, BG902_1, BGM_BATTLE2, BGM_BATTLE3, BGM_D_START, BGM_MENU, BGM_TRAIN, CUTIN_E0101, CUTIN_E0401, CUTIN_E0601, CUTIN_E1001, CUTIN_E1401, CUTIN_E1402, CUTIN_E1501, CUTIN_E1601, CUTIN_E1701, CUTIN_N2, N004_BG.
- Unselected Char/NPC family files relative to210: C064.jet, C064_Q.jet, C064_SND.jet, C509.jet, C509_Q.jet, C509_SND.jet, C510.jet, C510_Q.jet, C510_SND.jet, N502.jet.
- Unselected literal owner packs relative to210: CUT_E1401.jet, CUT_E1402.jet, CUT_E1501.jet, CUT_E1601.jet, CUT_E1701.jet, CUT_N2.jet, DIAL_BG011.jet.

### E18

- Entries: `EP_2501A`, `EP_2502A`, `EP_2503A`, `EP_2504A`, `EP_2505A`.
- Combat continuations: none.
- 5 XMLs / 185 nodes; Char IDs: 004, 009, 010, 012, 013, 023, 030, 041, 054, 056;
  NPC IDs: 001, 007.
- Literal backgrounds/music/cut-ins: BG003_1, BG011_1, BGM_D_START, BGM_MENU, CUTIN003, CUTIN003EF, CUTIN_E1801, CUTIN_E1802, CUTIN_N4, N001_BG.
- Unselected Char/NPC family files relative to210: C023.jet, C023_Q.jet, C023_SND.jet.
- Unselected literal owner packs relative to210: CUT_002.jet, CUT_E1801.jet, CUT_N4.jet, DIAL_BG011.jet.

## Aggregate ownership: filename assumptions would be wrong

- `BG000_1` → `DIAL_BG2.jet`.
- `BG001_1` → `DIAL_BG.jet`.
- `BG001_2` → `DIAL_BG.jet`.
- `BG001_3` → `DIAL_BG.jet`.
- `BG002_1` → `DIAL_BG2.jet`.
- `BG003_1` → `DIAL_BG2.jet`.
- `BG004_1` → `DIAL_BG2.jet`.
- `BG005_1` → `DIAL_BG2.jet`.
- `BG006_1` → `DIAL_BG2.jet`.
- `BG006_2` → `DIAL_BG2.jet`.
- `BG006_3` → `DIAL_BG2.jet`.
- `BG007_1` → `DIAL_BG2.jet`.
- `BG011_1` → `DIAL_BG011.jet`.
- `BG901_1` → `DIAL_BG9.jet`.
- `BG902_1` → `DIAL_BG9.jet`.
- `BGM_BATTLE1` → `SND1.jet`.
- `BGM_BATTLE2` → `SND1.jet`.
- `BGM_BATTLE3` → `SND1.jet`.
- `BGM_D_START` → `SND1.jet`.
- `BGM_GULLVEIG` → `SND1.jet`.
- `BGM_MENU` → `SND_CDN.jet`.
- `BGM_TRAIN` → `SND_CDN.jet`.
- `CUTIN_E0101` → `CUT_E0101.jet`.
- `CUTIN_E0401` → `CUT_E0401.jet`.
- `CUTIN_E0601` → `CUT_E0601.jet`.
- `CUTIN_E1001` → `CUT_E1001.jet`.
- `CUTIN_E1002` → `CUT_E1002.jet`.
- `CUTIN_E1201` → `CUT_E1201.jet`.
- `CUTIN_E1301` → `CUT_E1301.jet`.
- `CUTIN_E1401` → `CUT_E1401.jet`.
- `CUTIN_E1402` → `CUT_E1402.jet`.
- `CUTIN_E1501` → `CUT_E1501.jet`.
- `CUTIN_E1601` → `CUT_E1601.jet`.
- `CUTIN_E1701` → `CUT_E1701.jet`.
- `CUTIN_E1801` → `CUT_E1801.jet`.
- `CUTIN_E1802` → `CUT_E1801.jet`.
- `CUTIN_MI01` → `CUT_MI01.jet`.
- `CUTIN_N2` → `CUT_N2.jet`.
- `CUTIN_N4` → `CUT_N4.jet`.
- `CUTIN003` → `CUT_002.jet`.
- `CUTIN003EF` → `CUT_002.jet`.
- `N001_BG` → `N001_BG.jet`.
- `N004_BG` → `N004.jet`.
- `N007_BG` → `N007.jet`.
- `N010_BG` → `N010.jet`.

In particular, **CUTIN_E1801 and CUTIN_E1802 both belong to CUT_E1801.jet**;
no CUT_E1802 filename or alias is required. **CUTIN003 and CUTIN003EF belong
to CUT_002.jet**. BG011_1 belongs to DIAL_BG011.jet; N010_BG belongs to N010.jet.
The strict index verifies their actual retained AT/S2/I2 records rather than
inferring an owner from a matching stem. N502.jet contains the concrete
`N502_DLG01→N502_C→A5XVJ6` AT/S2/I2 chain, not a substitute N004/N500 actor.

## Original availability and immutable pins

The Server runtime asset directory has **774 .jet files**. An earlier777
figure counted every file including non-JET entries; it is not a second asset
census. The bounded header walk reached exact EOF for all774 while resolving
the literal ownership map. Every one of the48 unselected dialogue-family/
literal-owner files below was then fully inflated with the strict original
JET index, checked against its unique imported-files provenance row, and
byte-compared against DataDump's retained original
`local/inputs/extracted/assets/<name>`. **All48 exist; no physical original
availability gap was found in this lane.** Their total size is27,028,122 bytes.

Canonical Server destination is `resources/runtime/assets/<name>`. Each ledger
source is `recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets/<name>`;
those source-path labels are provenance, not instructions to read private phone
data. Only the public retained Server and DataDump copies were read.

- `C008.jet`: 1258251 bytes, SHA-256 `0e01a954edeb2e33914bc37d8a2be21aab8f383c3bbfef2c564aeca8ee3532c4`.
- `C008_Q.jet`: 51236 bytes, SHA-256 `30d58a6e7dce79b19d6ed2a01700948d964ac7cae32870246bb2b80022670e0d`.
- `C008_SND.jet`: 151464 bytes, SHA-256 `53d1873c06f7a42a0b0e6989fdc1abb3e876eca64696a8c06c27a51fd584f2a6`.
- `C019.jet`: 1006359 bytes, SHA-256 `9118f0b1985a165a3ce66a4fb771766c204e9a3e935256c27ef12b9c18ef35f0`.
- `C019_Q.jet`: 128378 bytes, SHA-256 `f9053a5752ccc2a27f8c8b86667ae6760ad65bbc63973af0e9968e232c6413e0`.
- `C019_SND.jet`: 84975 bytes, SHA-256 `fa4dcd9c466137724273496b48ec7f8c35a63890cdc2d4d4bcc5efa72f9ad8db`.
- `C023.jet`: 684063 bytes, SHA-256 `0e0f349e143e91eb4be245f6927f60feb7e0917d80230b5b64dedd2f963c5baa`.
- `C023_Q.jet`: 47846 bytes, SHA-256 `2dd61442a8b386e7d1bfffaabcdb0264b6d1bc1c36b35cd48f75205857c5f233`.
- `C023_SND.jet`: 102529 bytes, SHA-256 `2d987eb51b35e70caa26041742f06580946db1b8c60b8764007fe40bc992ca3e`.
- `C028.jet`: 1590116 bytes, SHA-256 `b5f14b4710a89bdcd3429e90bb16536f1b9ba54226f02ca8836d67fc51a95ab7`.
- `C028_Q.jet`: 52800 bytes, SHA-256 `46e516ac0b13341bdbdadac193d69256c972aa679e7c14a21129cee4cf0f4305`.
- `C028_SND.jet`: 178664 bytes, SHA-256 `3e8d2633f67fe363cb5af2c1b4d91882174340650a7696436c9db7de5229fb99`.
- `C035.jet`: 628747 bytes, SHA-256 `6311e945fb8a841f1fc70049469af3d5ba2dc7693c5bb197850d89eb3ac582cc`.
- `C035_Q.jet`: 55463 bytes, SHA-256 `b292cfe99b7e67559b37ca716771bdc87d1f5378810f3518e4ab7e344e1da7c2`.
- `C035_SND.jet`: 275784 bytes, SHA-256 `00084ad8351cd3e6f8bf4131db1d34ff1806a8d9ce2879caa4ebd95fadc075cb`.
- `C043.jet`: 1235758 bytes, SHA-256 `220ccc4a101bebb81ab7ea0958d46698fe1536a5b9985a9e51630204d6576c9d`.
- `C043_Q.jet`: 61861 bytes, SHA-256 `dbc0420b8e7b1ffe26e99d5049b091f62cee2ca1ffbad9e145682dfcd3cb8edb`.
- `C043_SND.jet`: 179928 bytes, SHA-256 `c56e94e2831b4bad8d7538de8d269bda4de44035db9f7c298beb023e0d55bb60`.
- `C057.jet`: 959618 bytes, SHA-256 `5c3a6d557d1b05a740d14cc59f3487ab70c87a9b618407a12bc6870cb56c2bfa`.
- `C057_Q.jet`: 62925 bytes, SHA-256 `f1d12b9a7b8395d8c28ec8d4965b47462f53b44556acd99839a0c50745fe61bb`.
- `C057_SND.jet`: 139216 bytes, SHA-256 `c10f0e8a4083353aa331c2f6ac29b832db797db87fa7f8ced44ab620d5861d92`.
- `C064.jet`: 1565579 bytes, SHA-256 `059aef498003350ecc16c4f77f55164b3637d4ea64a75d081e52fdce86661155`.
- `C064_Q.jet`: 52191 bytes, SHA-256 `dd1fcba9d964dd020e799a75dc5ce9b86b8c6fe399aaf12fee853ce7daa5a786`.
- `C064_SND.jet`: 159958 bytes, SHA-256 `4ae9008b8553c9f1ea533cd17496a1acf77082d2bd5d7849217d1e7adc306a8a`.
- `C068.jet`: 1798531 bytes, SHA-256 `3c004a974232368e41e83417caf2883fa44c2c45b62fb779a69ffa199d602a3b`.
- `C068_Q.jet`: 65262 bytes, SHA-256 `5b2a741fd4dda0975f3785dbed4ba05b6bd4ae42f55565c77553dac0ef008ca9`.
- `C068_SND.jet`: 111439 bytes, SHA-256 `afecb1c0aba992f734392cfdeecf65172108f7d21aff1be0bf2a059b7e6bc40a`.
- `C509.jet`: 2395347 bytes, SHA-256 `505f30d9ea7b707176b367d0d788c9ad389e96cd6672b8a0fd08e5905eefa640`.
- `C509_Q.jet`: 53690 bytes, SHA-256 `6d7d594b114a0c235310232854f73471d705752c600fafdac64b2c9653fbc8fb`.
- `C509_SND.jet`: 138833 bytes, SHA-256 `97b77db66f802cad33198c01b76712cd878c3c6a6ae08bcb9f47f9f976465f22`.
- `C510.jet`: 2359538 bytes, SHA-256 `ca9219d813c730a0e6978f606bd3bfec102d838635d3e7e1dae5c914f4e387dd`.
- `C510_Q.jet`: 50438 bytes, SHA-256 `e2db31a85d49a7c5e18c239dff18a4512500f00af906427ecc967b6c727e6d10`.
- `C510_SND.jet`: 74241 bytes, SHA-256 `2df88d2f990e5a4764bbc1721f536dc23c05a5f0dc4453ce40d636b4d5f7e808`.
- `CUT_002.jet`: 1938440 bytes, SHA-256 `1d23f20f03b610c4f3c1c77ceb239f2654364bad6e3d540627410deea1ff03c4`.
- `CUT_E1201.jet`: 401397 bytes, SHA-256 `86849aa1ab782eb7e307cfe2b227532c5a4fa1f7c5621569b35189ddaabef524`.
- `CUT_E1301.jet`: 497849 bytes, SHA-256 `a29b7ffb906396754a2b8e95fc670d9eb24d86066c578433cab1f02378cb765c`.
- `CUT_E1401.jet`: 459503 bytes, SHA-256 `98954ad4b51572b2dc938a0a889825dd4fc2d1100cd96455570104d7062923d8`.
- `CUT_E1402.jet`: 453145 bytes, SHA-256 `249e7c620b0dd2061843c9db8d2210c095b10855f42df61d53dd1a092489a308`.
- `CUT_E1501.jet`: 489809 bytes, SHA-256 `c97481061bbe26559d35fb55c554c935560fcd59d230e6491361a0d6e222df55`.
- `CUT_E1601.jet`: 352386 bytes, SHA-256 `a3045300976ec747c2084afa3bd0e5b3f39bcf764256ff9343e95fc9b56d8c1c`.
- `CUT_E1701.jet`: 398441 bytes, SHA-256 `4200a87602da9a59a92d2b2d64af49c60e7f0aae4eab10c6d46a2a7e6ec278c0`.
- `CUT_E1801.jet`: 785442 bytes, SHA-256 `8e869b32be43a360f32138fbf9da6f77ee3e9930c04c7d1cca155c225e9d850e`.
- `CUT_MI01.jet`: 398690 bytes, SHA-256 `e4c2f9a18c9a6ea43334b979f1fa9c5f92a678ec1b0fe152a9bba1b56a29b92f`.
- `CUT_N2.jet`: 576625 bytes, SHA-256 `84f329b02044f3a1479383fd8871d8b6ec66c6e362d97892d69766370ef2110b`.
- `CUT_N4.jet`: 387918 bytes, SHA-256 `2b944afba825f316aa429acf133261c2ab14d2ff321df9883ea45854b429ecab`.
- `DIAL_BG011.jet`: 297130 bytes, SHA-256 `6375773d092aa57ce4358a1d622b1d5b582e941736e711fef0de2e76b91252e7`.
- `N010.jet`: 1650793 bytes, SHA-256 `f40a3ea39cd2f5b19eed2ec608b1d6451e75cc0de131ac3e70d940e4cc31889a`.
- `N502.jet`: 179526 bytes, SHA-256 `2960b3e13df33513889a4528b29f68280a5965b25a21fae6ebe7ad93fd3c9a89`.

## E17 Char509/510: visual IDs do not authorize ordinary variants

The original XML itself declares, for example in EP_2404A/B, Name Vincent /
CardType Char / CardID510, and %user_name% / Char /509. NPC502 is separately
named Children of Cracion. They must not be rewritten to NPC identities or
silently added as ordinary owned Hunter definitions.

Original native library SHA-256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
addresses use Ghidra code coordinates (ELF+0x10000).

- CSRParserDlg.LoadFile `Gb59ba0` recognizes CardType at
  `Gb5a742/Gb5a744`; Char stores character code C, NPC stores N
  (`Gb5a946/Gb5a948`). CardID is selected at
  `Gb5a7a6/Gb5a7a8`, parsed base10 at `Gb5a7de..Gb5a7e4`, and stored
  as the integer actor CardID at `Gb5a7ec`. The exact three-character
  strings509/510 have no suffix; no modulo500 or009/010 substitution appears.
- CSRDlgPlayer.MakeDlgID `G8edd00` formats type/ID/suffix with
  `%c%03d%s` at `G8edd70..G8edd7a`. For empty suffix on a Char actor,
  it formats the ID `%03d` at `G8eddda..G8edde0`, asks
  CSRSkin.FindWornSkinByCardRefId at `G8eddee`, and if none is selected
  falls back to **`%c%03d`** at `G8ede4c..G8ede5c`. Thus the default
  visual IDs are C509/C510, not aliases C009/C010. A real worn-skin branch
  can select its own portrait resource; that branch is not fabricated here.
- SpawnNext calls MakeDlgID at `G8ef4bc`; the resulting identity flows to
  SwitchChar. CSRDlgScriptPlayer.AddChar `G8f7048` passes the supplied
  CMHashID to CSRDlgCharDraw.AddChar at `G8f70b4`.
- CSRDlgCharDraw.AddChar `G8c0eb0` copies that identity and calls
  **SRCreateSpinePortrait at `G8c0f00`**. The original helper
  `G10af47c` loads binary resources via CMSpineNode.LoadFromBinaryFile at
  `G10af66c`/`G10af7ac`. The non-Spine branch at `G8c1094` and its
  animation-name loop likewise operate on the supplied resource identity.

The inspected complete parser/ID formatter/draw helpers do not request
CSRCardInfoContainer.GetCardData for509/510. This positively closes the default
visual path; it does **not** create a general509/510 ordinary-reference alias
or prove every unrelated collection/profile/combat consumer is reference-free.
Fixed Episode combat's ref_id versus res_id binding is a separate contract;
use the original supplied combat rows rather than ordinary509/510 stat rows.
Native E17 entry/rendering remains unverified.

035 is a different boundary: its available dialogue base/Q/SND family does not
itself publish an ordinary reference. The existing additional-material adapter
requires all four base/Q/EFT/SND packages plus metadata before adding a neutral
035 row. The combat/full-reference preparation must check that gate separately;
this48-file list is not the complete final Episode11–18 profile recipe.

No acquisition, reward settlement, original ordinary stats, passive behavior,
scene memory usage or native later-chapter success follows from this source
inventory. The result is a concrete original-resource selection plan with
aggregate ownership and exact availability pins, pending the other lanes and
native validation.

