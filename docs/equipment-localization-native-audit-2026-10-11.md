# Equipment localized strings: initializer recovered, native Hunter join open

Read-only final-client ARM audit, SHA-256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`. Addresses here are **ELF**; add `0x10000` for the Ghidra addresses used in [the preceding equipment audit](hunter-equipment-reference-audit-2026-10-11.md). No reference, owned equipment field, price, stat, runtime, save or APK was changed.

## Exact initialized TYPE strings

Initializer ELF `67886c` resolves table base `21cf288` at `67887e`. It constructs six libc++ strings through `6c5ff4`, with three 24-byte pairs:

- TYPE 0: `WEAPON` at `+0`, `WEAPON_DESC` at `+0xc`.
- TYPE 1: `ARMOR` at `+0x18`, `ARMOR_DESC` at `+0x24`.
- TYPE 2: `ACCESSORY` at `+0x30`, **`ACCE_DESC`** at `+0x3c`.

Exact original string pointers resolve to ELF `1d5fd94`, `1d5fd9b`, `1d5fda7`, `1d5fdad`, `1d5fdb8`, `1d5fdc2`. These are field names, not equipment IDs, resource suffixes, or full Hunter-specific localization keys. Art retains the separately recovered `_WEP`, `_AMOR`, `_ACCRY` suffixes.

## Getter and caller: the unsigned argument is Awake

`CSRCardInfo::GetEquipName` ELF `86aaac` builds an empty string when its unsigned selector is zero; otherwise it converts the selector to decimal and inserts `_` at offset 0 (`86aacc..86aae2`). It selects table `21cf288 + TYPE*24`, then calls `CSRStaticData::FindCharRefString` at `86ab48`. `GetEquipDesc` ELF `86abb8` performs the same operation, selecting the pair's `+0xc`, and calls at `86ac58`.

The concrete popup caller at ELF `bc5142` calls `CSRCard::GetAwake` (`85acc6`, returns owned `+0x694`), passes that result as the unsigned selector in r2, takes TYPE from popup `+0x80c`, and invokes GetEquipName at `bc5150`. Description repeats the same GetAwake/TYPE chain at `bc51fa..bc5208`. Thus treating this selector as equipment rank, level, Hunter numeric ID or a guessed costume index would be wrong on this caller. Other direct calls to GetEquipName were found at `bcc172` and `bcc204`; their callers are not needed to establish the popup chain.

## FindCharRefString composition and locales

At ELF `f31c44..f31c60`, FindCharRefString concatenates its first string argument, the literal `|` (ELF `1d52eba`), and its second string argument. The string concatenation helper `6caa2c` copies the first argument then appends the literal; `6c8430` appends the TYPE field. It passes this constructed key to `CGMDataMgr::GetStrDBData` at `f31c9e`, with table index **4**. It then selects a locale field from that returned record.

`CGMLocalDB::GetLanguage` (`785bfc`) supplies the index. The five pointer entries at ELF `217c0e0`, read using the RW PT_LOAD mapping (**file offset = VA - 0x1000** here), resolve exactly to:

- 0 → `KO` (`1d574e5`)
- 1 → `EN` (`1d574e8`)
- 2 → `JA` (`1d574eb`)
- 3 → `SC` (`1d574fa`)
- 4 → `TC` (`1d574fd`)

FindCharRefString uses that locale pointer at `f31cd2`; absent/empty records return an empty string (`f31cb6..f31cc2`). No language fallback or line-break rewrite is inferred by the new helper.

## Important unresolved prefix binding

The bounded getter bodies do **not** insert the Hunter reference's `id` or equipment row `id`. The CSRCardInfo `this` argument is not used to construct the string on this path. The observed pre-DB query is consequently `|WEAPON` for Awake 0, or `_1|WEAPON` for Awake 1 (and equivalent fields for other TYPEs).

Preserved DataDump `sources/client-tables/reference/CHAR_STR.json` has **1033** source keys, including `001|WEAPON`, `001|WEAPON_DESC`, `001|ARMOR`, `001|ARMOR_DESC`, `001|ACCESSORY`, `001|ACCE_DESC`. It has no keys beginning `_` or `|`. This mismatch must remain explicit. A runtime DB table transformation, current-character binding, or another consumer may explain it; none is proved by the bounded native path above. It is not evidence that the native display is broken, and not permission to replace `_1` with `001` or equate equipment IDs with CHAR_STR keys.

## Isolated reusable helpers and next seam

`src/equipment-localization.ts` recovers TYPE fields, locale indices and the exact unsigned Awake query. Its separate `originalEquipmentText` function reads a caller-supplied original source table using an explicit three-digit Hunter ref ID and exact locale. That offline source lookup is useful to the original material catalog, but is **not** exposed as a completed native lookup resolver. Missing keys/locales stay missing; invalid enums/selectors refuse.

`npx tsx tests/equipment-localization.ts` passes, covering the six strings, five locale indices, zero/nonzero/max-UInt32 queries, source/query separation, absent data and invalid domains. Tests use small authored text fixtures. No original text dataset was copied or silently added to gameplay. Root owns original catalog pinning; the stat/growth consumer lane separately owns `CalcStatByEquip`.

The remaining native closure is to identify table-4's actual boot-loaded source/key transformation or a current-character prefix binding. Ordinary equipment references still require original per-Hunter id/type/rank/direct-stat rows and owned rank/level evidence; having art and names alone does not authorize zero-stat grants or guessed training prices.
