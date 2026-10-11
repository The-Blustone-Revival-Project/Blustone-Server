# Guarded equipment reference input and original materials

`BLUSTONE_EQUIPMENT_REFERENCE_JSON` accepts an explicit object mapping a currently published ordinary Hunter reference ID to its equipment rows. The default leaves GetCard byte-equivalent. No launch profile supplies these rows, no owned equipment rank/level is written, and no equipment upgrade or price is enabled.

This seam can accept future recovered rows or explicitly supplied local research data without another parser rewrite. Authored rows in tests are **local fixtures**, not original Blustone equipment balances or IDs. Each row has a nonempty string id, wire type1..3, exact rank and awakening selector, and the direct numeric-string stat fields consumed by native CSRCardStat mode100. The pure parser rejects malformed/duplicate slot-rank records. The reference adapter preserves the original wire strings, validates known non-source Hunter identity, and changes only the requested equipment collection. Unknown identities, missing slot artwork or invalid input refuse startup rather than partially publishing references.

## Original material catalogue

`resources/reference/hunter-equipment-materials.json` preserves150 original owner packages and450 exact weapon/armor/accessory records, including header offsets, raw/packed lengths, header flags, packed-payload hashes, complete record counts and whole-source pins. `scripts/resources/catalog-equipment.mjs` reproduces/checks the catalogue from immutable imported `_Q.jet` inputs, decoding the original uint64 base38 record names and traversing each pack to exact EOF. Packed payloads are kept as original bytes; the catalogue does not assume every descriptor is uncompressed S2.

The native slot suffixes are intentionally `_WEP`, `_AMOR`, `_ACCRY`. A caller supplies the real draw prefix, such as C001; this is not inferred from equipment id or rank. `equipmentMaterialCoverage` reports known source owners and declared package selection separately from native rendering. Returned records are detached from the source catalogue.

Configured gameplay references require a separately selected, deliverable original owner under pkgi1/pkgi1-tree. Startup resolves the same package-directory preferred path and asset-directory fallback as the server and verifies whole original size/SHA-256. A corrupt preferred owner cannot fall back to valid alternate bytes. Merely having a package on disk, selecting the Hunter body package or declaring empty-download mode does not satisfy admission. Folded-only owners are deliberately not admitted by this seam.

## Formula and text boundaries

The [growth audit](hunter-equipment-growth-native-2026-10-11.md) closes native mode100 units and exact slot/rank growth. Rank1 subtracts one from level; growth uses the ten-level remainder except the exact rank-band cap, and only HP/ATK/DEF grow. The calculator is an explicit JS projection of that arithmetic, not bit-identical native decimal storage. An arbitrary global accessory curve cannot replace rank-qualified reference rows.

The [localization audit](equipment-localization-native-audit-2026-10-11.md) closes six native field strings, five locale indices, the owned Awake selector and the Hunter-ID copy. The native key is Hunter ID + optional Awake suffix + `|` + field, such as `004_1|WEAPON`. The earlier mismatch claim came from misidentifying a string-copy constructor as empty initialization; it is superseded by original-byte checks and actual Thumb copy execution. Supplying rows still does not prove the popup's names or pixels render correctly.

Original id/type/rank/stat rows, legal rank/level limits and training materials/prices remain missing. Upgrade request/receipt shapes are subsequently recovered in the upgrade audit, while source eligibility and Guild qualification still gate settlement. This change does not publish zero-stat equipment, configure inferred accessory curves, add equipment to live Hunters or claim the full equipment system is revived.

## Verification

All75 configured checks and build pass. Tests verify all150 original source pins and450 independently re-encoded names/payload hashes, package-versus-body selection, metadata nonmutation, native growth boundaries, locale/query distinctions and malformed-data guards. Reference-profile tests prove unchanged default wire output, unchanged unrelated references, exact authored stat projection and whole progressed-save bytes across read/restart, including refused invalid modes/corrupt preferred sources.

Compiled encrypted disposable verification (`node scripts/verify-independent.mjs --fixture --profile current-e6-materials --exercise-equipment`) publishes one authored rank1 weapon row, verifies its normalized ATK/growth projection, leaves all other references empty, and preserves references/save state across restart. C001_Q.jet's50808 original bytes are checked with source SHA-256, inner/outer MD5, full transport and head/tail byte ranges. The experiment requires `--fixture`; no live profile or private save is a mutation target.

No live replica reload, emulator input, APK build/install or release occurred. Native equipment popup validation remains pending while game inputs are held.
