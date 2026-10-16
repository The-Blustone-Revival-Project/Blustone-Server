# OV1: original reward ID and bounded native owners

Read-only research, 2026-10-16. Original DataDump library
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code offsets plus `0x10000`.
No original bytes, live account, runtime behavior or server defaults changed.

## Established original Episode rewards

Published original table `sources/client-tables/reference/EPISODE_S01.json`
SHA256 `c5d70b11fbbc5c38ba608bfd73f45a50213ca7686aa8d0f32ab96a25e66f4bb0`:

- E06 begins at line 630. Its `reward.item[0]` is `ref_id:"OV1"`
  at line 638 with `qty:10` at line 639.
- E14 begins at line 1647. Its `reward.item[0]` is `ref_id:"OV1"`
  at line 1655 with `qty:30` at line 1656.
- Both reward objects have `free_iap:0`.

These are concrete reward identifiers and quantities, not a recovery of the
item's name, use classification, effect, thumbnail, sale price or acquisition
law outside those Episode rewards. Native string catalogue
`sources/native/strings/native-all-strings.tsv:441578` independently records
literal **OV1** at G1d70815 (ELF file offset `0x1d60815`).

## IAP goods display ordering

One detected code owner is `CSRCellIAP::ArrangeMD` G898e00.
G899664 loads the OV1 literal; G89966a forms its address and
G899670 constructs its string in a local pair array. The paired integer
is **14**, written at G899678 (the preceding EM01 pair has value 15).
The function inserts these pairs into a `map<string,int>` using the exact
template helper G89b264, including the OV1 pair at G89976e.

Neighboring keys are EM01, CELUM01/02, CERUM03/02/01, RP1, AP1,
BP1, MD1, GC2 and GC7/8/9. This is an IAP goods arrangement map;
its integer 14 is **not** an item `use_type`, item rank, price, quantity,
effect magnitude or recovered economy value. The bounded work does not
claim a universal display sort direction or original IAP offer containing OV1.

## Fishing reward announcement whitelist

The second detected owner is `CSRMFishing::SendBroadCastMessage`
Gb2f918. It resolves its current item reference through
`CSRItemInfo::GetItemData` Gaf109c at Gb2f94c.

- Gb2f952/954 reads the resolved INFO classification and compares it
  with **17**. Equality selects the fish-specific announcement branch.
- The other branch compares the resolved item ID's exact byte length
  with 3 at Gb2f9b6/9b8, then compares it against a whitelist:
  **GC2, GC7, GC8, GC9, OV1**. OV1 literal load is Gb2f9fc,
  address formation Gb2fa02, exact three-byte comparison Gb2fa04.
- A match takes Gb2fa0e into construction of the reward announcement
  data. A nonmatch exits through Gb2fe6e. Gb2fa46 and Gb2fa82
  form the `user` and `item` payload keys respectively.

This identifies OV1 as a recognized reward item in that non-fish whitelist
branch. It does **not** recover the missing authoritative INFO row or prove
its original numeric `use_type`; the branch reads that from the separate
item reference. Neither this whitelist nor IAP arrangement supplies an
owned-item use operation, stat modifier, thumbnail binding or name string.

## Explicit remaining boundary

There is **no established OV1-to-Metron join** in this investigation.
Do not label OV1 Metron, assign an original icon, infer a transcendence
ingredient role, or publish guessed active-use metadata from these owners.
The useful next dependency is an authoritative item-reference/localization/
thumbnail row tying this exact ID to those fields. The Episode reward rows
can be retained as evidence while settlement remains gated on compatible
item metadata and the operation's existing atomic reward policy.
