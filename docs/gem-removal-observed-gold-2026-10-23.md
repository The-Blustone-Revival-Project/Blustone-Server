# Sparse observed jewel removal fees

`config/policies/gem-removal-observed-gold.json` supplies four historical
**observed** gold2 quotes through the existing explicit
`BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON` / `gemDisassemblePrices` option. No new
mode or default is introduced. Nothing is activated and no owned jewel,
equipment, ability, acquisition pool or wallet value is created by these files.

The rows are level1=2500, level6=15000, level7=17500 and level15=40000 gold.
Every other level and payment1 remain unavailable. In particular, level15 is
**40000**, not an extrapolated `15*2500=37500`. Missing rows must continue to
refuse paid changes; no zero-price fallback or interpolation is appropriate.
Screenshots have undated filenames, so these are not asserted to be one
version-coherent original final-server table. They are an optional sparse
historical projection. A future conflicting same-level quote needs a separate
provenance decision, not silent replacement or averaging.

**Native UI limitation:** the inspected detail path formats the raw returned
price without checking the missing-row sentinel. With this sparse table,
payment1 and unlisted levels can therefore display **0** from the native
type9/level0/price0 sentinel. That is a misleading unavailable-data display,
never an authorized free transaction. The server still refuses payment1 and
changed occupied cells lacking an exact gold2 row. This limitation is another
reason these files are deliberate input only, not a complete native price table
or a default launch setting. No guessed payment1 rows are added to mask it.

## Exact display-to-table source closure

Read-only final original ARM library in DataDump
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below are Ghidra addresses, file/ELF offsets plus0x10000.
Bounded Capstone Thumb inspection closes the detail panel, independently of
the existing equip-confirmation audit:

- `CSRPopUpEquipGem.SetCase` Gbc4ac0 loads its owned Gem through popup+f0
  at Gbc5448, then Gem+1c at Gbc544c. That field is owned level, not rank
  (rank is+18; see `gem-owned-and-mount-native-2026-10-11.md`).
- Type2 is set at Gbc5458; `FindGemDisassemblePrice` is called Gbc545a.
  Returned price+8 loads directly into r6 at Gbc545e.
- Gbc5474/Gbc5476 resolves the exact node `UI_EV_ST_CO` at G1d7c9f0.
  The raw r6 integer is converted to text Gbc548e and passed to
  `CMUITextBox.SetString` Gbc5498. No multiplier or Guild adjustment intervenes.
- Independently type1 is selected Gbc546a/c; raw price goes into r8
  Gbc5470, then `UI_EV_ST_MD` (G1d7e78c) receives its text at
  Gbc54fe/Gbc5508. These observed secondary numbers are preserved only in
  provenance; this recipe supplies **no payment1 rows**.
- `FindGemDisassemblePrice` Ga54f5a compares exact level at Ga54f66/6a
  and payment at Ga54f6e/72. A match copies raw price+8 at Ga54f8e/92.
  Its missing sentinel type9/level0/price0 is not a free quote.

The bounded entire detail `SetCase` has no direct Guild call; more strongly,
its quoted value flows directly from lookup to text without transformation.
The separate gold equip-confirmation path consumes the same table's raw
old-level fee, including joined Guild actors. See
`gem-affiliated-removal-fee-native-2026-10-13.md` for that full funds/event
chain. Polishing's Guild benefit must not be transferred to removal.

Retained native locators in DataDump:
`sources/native/symbols/native-evidence.tsv:15822` (`SetCase`),
`:12988` (lookup), and
`sources/native/economy/ghidra-gem-reference.txt:1330` (price parser).

## Transcription provenance and limits

The companion `gem-removal-observed-gold.provenance.json` pins full original
manual TSV bytes, header-inclusive line numbers, complete raw rows and their
SHA256, observation indices, exact screenshot filenames and dimensions.
DataDump checkout6d2c3cc / latest release2026-10-17 were checked read-only.
All paths below are under
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/`:

- `batch-17.tsv:16`, idx815, `image0-ac9c23e54f3c6b61.png`:
  Ordinary Penetration Jewel, three stars, Lv1, displayed2500gold/2gems.
  TSV SHA256 `5bf667e132cbe86c6cb3db3f37bea6a257649f5a6ae04e388f3908aae53fd9b6`.
- `batch-27.tsv:37`, idx1336, `image-99b8dc6013b76b8c.png`:
  independent Shiny Fatal Jewel, four stars, Lv1, displayed2500/2.
  TSV SHA256 `9afcf585bd699f7c20c3233b16684a383a64d956f09f5f666501a2bacb4f6c0d`.
- `batch-18.tsv:40`, idx889, `image0-d73b330cb0f3306e.png`:
  Radiant Speed Jewel, five stars, Lv6, displayed15000gold/15gems.
  TSV SHA256 `ff6ea11434bd131e07d3704ad901cf887ec5380bc8493e66b6635f9bd984485c`.
- `batch-12.tsv:50`, idx599, `image0-27689264e12b5b80.png`:
  Radiant Speed Jewel, five stars, Lv7, displayed17500rupees/17.
  TSV SHA256 `71f91a76f0d19d9b95a25b4e9ebb20c0bf2f1f73d088227122df5152e3ea2bb5`.
- `batch-71.tsv:44`, idx3543, `unknown-7b35468bfd25672d.png`:
  Ordinary Speed Jewel, three stars, Lv15, displayed40000coin/40gems.
  TSV SHA256 `1a11e7a052f6e9ded8b438c6c702db33c264eac0a6d4e553f881bdd539ac5071`.

This is a transcription audit, **not a fresh visual recheck**. Original full
screenshot bytes were unavailable in allowed DataDump material locations;
`screenshot_sha256:null` explicitly preserves that limit. The old manifest's
Desktop paths were not read. Filename digest suffixes are not asserted to be
SHA256. Native-source closure establishes field semantics; it does not upgrade
manual transcription numbers into captured original server rows.

## Verification and opt-in boundary

Run `npm run test:gem-observed-removal` (compiled dataset checks plus durable replacement regression), or `npx tsx tests/gem-removal-observed-gold.ts`. The test pins all five rows
and checks the full TSV hashes when a sibling DataDump checkout is available.
It uses the actual existing parser and paid-mount planner with explicitly
authored dummy ownership: each exact fee, whole-batch missing-level refusal,
insufficient funds, same-target swap charging both old cells, full unchanged
peer rows, exact large instance IDs, lost-response no-op retry, busy-target
refusal and nonmutation. No original jewel metadata or ability roll is implied.

To supply the rows deliberately, pass the parsed JSON array as constructor
`gemDisassemblePrices`, or set the existing environment variable to its full
JSON text before creating an app. This document does not change a launch
profile, restart a server, supply Gem references/owned instances or claim
native removal gameplay was validated.
