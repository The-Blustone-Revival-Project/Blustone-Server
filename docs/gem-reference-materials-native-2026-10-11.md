# Gem reference/inventory grammar and original artwork

Source-only recovery. The existing `gem-instances.ts` parser from the mount-contract lane owns reference/owned parsing and stat projection; this lane independently verifies its native field/unit evidence and adds an original material catalogue. No Gem instance, gameplay reference ID, stat roll, gacha pool, price or reward was invented or granted. No runtime, save, APK or DataDump file was changed.

## Exact INFO and owned shapes

Original immutable final-client ARM SHA-256 is `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`. All addresses here are ELF; add `0x10000` for the preserved Ghidra exports. Evidence locators: DataDump `sources/native/economy/ghidra-gem-reference.txt`, `ghidra-gem-reference-keys.txt`, `ghidra-gem-inventory.txt` and `sources/native/symbols/native-evidence.tsv`. Bounded original Thumb bytes were checked independently with Capstone.

`ParseGemRefs` ELF `a435e8` selects envelope `ret_data` and builds60-byte INFO records. Its exact string fields are `id`, `name`, `desc`, `res_id`; numeric fields are `set_effect_id`, `rank`, `target`. Direct literal resolutions at `a436b6/c0/c6/cc/d2/d8/de` identify these names. INFO stores the four strings at+0/+0xc/+0x18/+0x24, set family at+0x30, rank+0x34 and internal TYPE+0x38. Wire target1..3 becomes internal0..2 (`a43974` onward); zero yields-1, which the strict parser refuses as unsupported. INFO has no base stat roll table.

Owned `CSRGem::parse` ELF `a4d3dc` reads:

```text
ref_id: string
inst_id: uint64
rank, level, position: numeric
target_inst_id: uint64
ability: string
abilities: null OR {
  level_up_failed: numeric,
  main: CSRCardStat row,
  sub: collection of CSRCardStat rows
}
```

Exact key resolutions: ref_id `a4d41a`, inst_id `a4d464`, rank `a4d4b8`, level `a4d508`, position `a4d556`, target_inst_id `a4d5a4`, **ability** `a4d5f2`, **abilities** `a4d6ae`, level_up_failed `a4d6c8`, main `a4d742`, sub `a4d758`. The singular `ability` is parsed strictly into a string at `a4d606`; it must not be replaced by the plural object or used as a guessed numeric stat selector. Null abilities takes the original skip branch at `a4d6c2`. Position is stored directly; its slot/order semantics and capacity are not inferred here.

The owned reference resolves via FindGemRef (`a44d30`) at `a4d680`, copying INFO.target to owned+0 and INFO.set_effect_id to owned+0x24. This joins ordinary reference identity to equip slot/family; it does not make an art ordinal or instance ID into a set-effect ID. Exact uint64 decimal token handling, strict collections/duplicate checks and account-Hunter ownership guards are local admission policy in the parser. They do not recover the original server allocator or roll validation.

## Main/sub stat units

`abilities.main` is parsed through `CSRCardStat::parse` at `a4d752`, explicitly with mode100 (`a4d750`). Each sub row follows the same mode100 call at `a4d8f0`, then is added into the separate sub aggregate. The principal ability and the sub collection remain separate records; their normalized totals can be projected without inventing rolls.

Mode100 divides HP, ATK, DEF, critical damage, block damage reduction, attribute enhancement/resistance, HP regeneration **and all three HP/ATK/DEF growth increments** by100. Speed, critical chance, penetration and block chance retain their wire numeric value because their generic parser fields receive an additional multiply100 before division. Numeric stat wire fields are strings; rank/awk_step metadata remain numeric. These are the same mode100 parser semantics recovered for equipment; they differ from Gem-combination mode1 plus its later selective division. In particular, do not reuse combination growth units for owned Gem abilities.

`gem-instances.ts` and its focused test cover the complete explicit stat shape, mode100 normalization, null abilities, exact reference/owned field separation and per-Gem stat projection. No magnitude, rank-level growth law, upgrade probability or extra-substat roll rule is supplied by this evidence.

## Source-positive artwork and actual display consumer

`CSRThumbEquip::SetGem(ref_id string)` ELF `105e8c4` calls FindGemRef at `105e914`, returning INFO at stack+0x48. At `105e940` it passes exactly that INFO string at+0x24 (`res_id`) to **CMHashID::Set** (`6d2454`) at `105e946`, then passes the same temporary HashID to **CSRUIImageNode::LoadSprite** (`79f904`) at `105e94e`. CMHashID::Set extracts the source string bytes/length (`6d246e..6d247c`), copies them unchanged via `6c82f4` (`6d2482`), then computes a hash. Neither this path nor the intervening instructions appends a rank/target suffix. Rank is handled later through separate SetGemRank overlay resources (IT_RK_B/S/G/EM/ME), not by rewriting res_id. Consequently a full ranked record name such as G_1_001_R1 is a compatible source-positive res_id; an unranked stem G_1_001 must not silently receive `_R1` from this helper. The direct owned-instance overload at `105e7a0` copies owned data and forwards owned ref_id into that resolver at `105e7b4`. The GetGem reference **id** remains a separate namespace.

`SRGetResGem` ELF `109d83c` separately constructs a `G` prefix, TYPE-specific `_1_`, `_2_`, `_3_` and a zero-padded numeric selector (or original empty-slot glyphs G_TRI_EMPTY/G_REC_EMPTY/G_DIA_EMPTY). This construction is evidence for resource vocabulary; it does not prove an ordinary GemRef ID equals that generated stem. The ranked record names below are copied directly from original JET headers.

New `scripts/resources/catalog-gems.mjs` checks the existing imported-file manifest's full size/SHA pins, traverses every24-byte header using packed length+8 and uint64 base38 name+12, requires exact EOF, and records header flags/offsets and packed payload SHA. It writes/verifies `resources/reference/gem-materials.json` for seven original packages,394 total records:

- GEM.jet:256934bytes, SHA `4b3be168af304158e47a2e09f3108e272df10605d8c40dd1729aabde7da09c69`.
- UI_GEM.jet:139293bytes, SHA `7f4230120aa46f0b58b20881c2727fa04858c14fdc52370033e37ed16bc6e828`.
- GEM_EFT.jet:77742bytes, SHA `d08d9b033ea549414e884c4cbb1129976553a9e35346e713495eaf5251e9d8c6`.
- GEM_CHA.jet:967765bytes, SHA `dcd3f8eb077ce4915e784070809cf7a2b6f72f7cdca1f366247c37f9fbe01c18`.
- GEM_SELECT.jet:821642bytes, SHA `95154d1a8de714f9861a53809106fa7cc8c5645ac88d390515c943cf88fc14db`.
- MP4_GEM.jet:1563238bytes, SHA `6c93ea44c22e871785e1447750332eb9620f4bcd3df2692965a1462b00427b0d`.
- E_GEM_DEFALT.jet:137674bytes, SHA `ce85ce2383bd6d0dbe288b59e3ce68b9bade53ca2ec9236a7d1889c93774580d`.

Exactly75 ranked art namespaces are present in GEM.jet: `G_{1..3}_{001..005}_R{1..5}`. An initial broad G-prefix scan counted80 because it also included five `G_SE_001..005` selection records;75 is the correct ranked-art count. Internal/unclassified decoded records and duplicate non-ranked names remain recorded without inferring semantic reference identities from them.

Source-positive UI_GEM examples include G_HP/G_AP/G_DP/G_CAC/G_CAD/G_BC/G_DRB/G_EE/G_ER/G_AS/G_RE/G_ARP and G_TRI_EMPTY/G_DIA_EMPTY/G_REC_EMPTY. These are retained original names; this catalogue does not claim a recovered mapping from every icon acronym to a numeric stat type. SetGemRank also uses IT_RK_B/S/G/EM/ME and ANIM_GEM/EFT resource names; numeric enum/style assignment must follow that consumer rather than labels alone.

`gem-materials.ts::gemArtworkOwner` admits only the75 ranked resource-name grammar, resolves an exact unique owner from the supplied pinned catalogue and optionally requires that owner in a supplied selected-package set. Selection membership alone is not actual CDN delivery/hash/native rendering proof. The helper never assigns GemRef.id from a record name, never supplies a gacha pool and never infers a rolled stat.

## Verification and remaining content

`node scripts/resources/catalog-gems.mjs` verifies the catalogue against exact originals; `npx tsx tests/gem-materials.ts` and `npm run build` pass. Test GemRef ID AUTHORED_GEM is explicitly local test data and distinct from its genuine resource name. Missing/ambiguous art owners and unselected packages refuse; no actual profile is activated.

Bounded client-table filename/manifest inspection found no GemRef INFO dataset or complete original owned roll records. This is a scoped negative, not a claim that no other archive could contain them. Supplied explicit references/instances can now be checked against the exact parser and original artwork, but original gameplay IDs, roll magnitudes, acquisition/pools/prices, equip fees/capacity and native display validation remain separate dependencies. Root owns their eventual configured state/route integration; the mount-contract lane owns plural weapons/armors/accessories requests and settlement parsing.
