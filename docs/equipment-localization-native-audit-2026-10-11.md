# Equipment localized strings: original Hunter/Awake/TYPE join recovered

Read-only final-client ARM audit, SHA-256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`. Addresses here are **ELF**; add `0x10000` for the Ghidra addresses used in [the preceding equipment audit](hunter-equipment-reference-audit-2026-10-11.md). No reference, owned equipment field, price, stat, runtime, save or APK was changed.

## Exact initialized TYPE strings

Initializer ELF `67886c` resolves table base `21cf288` at `67887e`. It constructs six libc++ strings through `6c5ff4`, with three 24-byte pairs:

- TYPE 0: `WEAPON` at `+0`, `WEAPON_DESC` at `+0xc`.
- TYPE 1: `ARMOR` at `+0x18`, `ARMOR_DESC` at `+0x24`.
- TYPE 2: `ACCESSORY` at `+0x30`, **`ACCE_DESC`** at `+0x3c`.

Exact original string pointers resolve to ELF `1d5fd94`, `1d5fd9b`, `1d5fda7`, `1d5fdad`, `1d5fdb8`, `1d5fdc2`. These are field names, not equipment IDs, resource suffixes, or full Hunter-specific localization keys. Art retains the separately recovered `_WEP`, `_AMOR`, `_ACCRY` suffixes.

## Getter and caller: the unsigned argument is Awake

`CSRCardInfo::GetEquipName` ELF `86aaac` first copies the Hunter ID string from `CSRCardInfo+0` into its local string. At `86aac8` it calls **string-copy constructor `6c7efc`**, with r1 still holding the incoming CSRCardInfo pointer. This was misread as empty initialization in the initial bounded audit; that interpretation was wrong. The copy retains `001`, for example. Selector zero skips suffix generation and keeps the ID. Nonzero selector converts to decimal, inserts `_` at the beginning of that temporary suffix (`86aacc..86aae2`), and appends it to the copied ID (`86ab0e`). It selects table `21cf288 + TYPE*24`, then calls `CSRStaticData::FindCharRefString` at `86ab48`. `GetEquipDesc` ELF `86abb8` likewise copies at `86abd4`, appends its suffix at `86ac1a`, selects the pair's `+0xc`, and calls at `86ac58`.

The ID comes from the Hunter reference's base `id`, not the equipment row's `id`. SetCard selects literal `id` at ELF `86bc68..86bc74`, converts to a string and transfers it into the first string field at `86bcca`'s preceding stores (`86bcc4..86bcc6`). The shared allocation starts at `86bb7c`; `86bba6..86bbaa` records its object/string base at allocation+0xc. The next parsed `char_id` is separately stored at the object's +0x30. The getter's initial copy therefore carries the original wire Hunter identity unchanged.

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

## Exact source keys and verified prefix binding

The full query is **`HunterId + (Awake == 0 ? "" : "_" + decimal(Awake)) + "|" + TYPE-field`**. For ordinary Hunter001/Awake0, this is `001|WEAPON`; for Hunter004/Awake1, it is `004_1|WEAPON`. No table-4 transformation or global current-character binding is needed to explain the prefix; it is already copied before the query reaches the DB. The historical `|WEAPON`/`_1|WEAPON` claim omitted the string-copy constructor and is superseded by the direct copy proof.

Preserved DataDump `sources/client-tables/reference/CHAR_STR.json` has **1033** source keys, including all six ordinary001 fields and `004_1|WEAPON`/`004_1|WEAPON_DESC` plus other awakened fields. There are135 keys whose Hunter prefix contains `_`; these include non-equipment fields, so135 is not an equipment count. Export SHA-256 is `79537f24a5e4ce9fbf34cb58d5d3cb6a6d4abb8f26e19071c395946c081c64a1`; its original `CHAR_STR_RO.db/000005.ldb` source hash is `a4d40f0739316e998ef1a6817d1b98c10ca2a8c246d9d89683d331a0b6b5ef36` per the preserved manifest. Equipment row IDs and resource prefixes still must not replace the wire Hunter ID.

## Isolated reusable helpers and next seam

`src/equipment-localization.ts` recovers TYPE fields, locale indices and the exact Hunter-ID/Awake query. `originalEquipmentText` reads a caller-supplied original source table through that same query, preserving wire ID and Awake as distinct inputs. Default Awake is0. Missing keys/locales stay missing; invalid enums/selectors refuse. Resource prefixC001 is not rewritten into001; unknown IDs simply miss.

`npx tsx tests/equipment-localization.ts` passes, covering the six strings, five locale indices, zero/nonzero/max-UInt32 queries, original versus awakened source selection, absent data and invalid domains. Tests use small authored text fixtures. Independent `tests/equipment-localization-native.py`, run with Instrumented Python, pins the entire original library SHA, verifies both exact getter copy calls with no prior r1 replacement, and **executes the actual Thumb/VFP copy constructor** with five IDs (`001`, `004`, `072`, `x914`, `004_1`) in Unicorn. Every destination retains the original string, with unchanged source. This confirms the missed operation independently of the TypeScript implementation. No original text dataset was copied or silently added to gameplay. Root owns original catalog pinning; the stat/growth consumer lane separately owns `CalcStatByEquip`.

The localized-key composition is closed. Ordinary equipment references still require original per-Hunter id/type/rank/direct-stat rows and owned rank/level evidence; having art and names alone does not authorize zero-stat grants or guessed training prices. Native equipment popup rendering remains unverified.
