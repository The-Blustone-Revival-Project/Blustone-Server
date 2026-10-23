# Episode8: original content and inactive resource continuation

2026-10-23. Bounded read-only content audit and inactive profile preparation.
No original bytes, existing profiles, saves, game inputs, live server selection,
APK or DataDump files changed. No earned E7/E8 progression or native E8 entry is
claimed. Existing device-control permission belongs to the root lane only.

## Exact chapter and combat membership

The original R_EPISODE S01 graph supplies seven E08 stories:

- E08_S01 → EP_1501A, no battle, local_MIDGARD.
- E08_S02 → EP_1502A, no battle, local_MAIL.
- E08_S03 → EP_1503A, no battle, local_MAIL.
- E08_S04 → EP_1504A → CB0801, local_JOTUNSNOW; win EP_1504B.
- E08_S05 → EP_1505A, no battle, local_JOTUNSNOW.
- E08_S06 → EP_1506A → CB0802, local_WHITECAVE; win EP_1506B.
- E08_S07 → EP_1507A, no battle, local_MIDGARD.

CB0801 has one enemy CB0801_052_1, exact unique STAT index134, res_idC052,
ref_id052, role1/attr3, game_res_id7. CB0802 has one enemy CB0802_056_1,
exact unique STAT index135, res_idC056, ref_id056, role1/attr2, game_res_id900.
Both original left-side rows have four empty ordinary-party slots. No forced
ally, owned Hunter, stat retune or imported battle result is supplied.

The dialogue calls C052 Windblade and C056 "???". Independently accepted
ordinary catalogue metadata calls052 Windblade and056 Genovia, both community
Offense/rank4 (Lightning/Ice). The masked Episode speaker does not rename the
ordinary identity, and its encounter STAT does not become an ordinary stat row.

Original chapter reward is CERUM02×20/free_iap0. Its complete item metadata,
thumbnail and settlement remain UNKNOWN; this profile does not grant it.
Existing earned chapter gates and story progress remain authoritative.

## Pinned source inputs

- resources/runtime/assets/R_EPISODE.jet:38080bytes,
  SHA2567f4362cdf80545a6da937444094837f334c8aae4f9f791d6ff4161948d98a01e.
- resources/reference/episodes/EPISODE_S01.json:
  c5d70b11fbbc5c38ba608bfd73f45a50213ca7686aa8d0f32ab96a25e66f4bb0.
- EPISODE_COMBAT_CB0801.json:
  9f42b218183cb9a5a15ec69018f979faf238ebd60c0586351e61889f9203263d.
- EPISODE_COMBAT_CB0802.json:
  7fcdf35167655ba9453df34bf21f7ffef3130724d687c1133502e28b48bb7226.
- EPISODE_STAT_ACTORS.json:
  f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56.
- DIAL-EN.jet:3133395bytes,
  a79ea5c803b1dc747a052e5a438c521e4e5617932d67990d6ec4d44e75a3a3c0.

DIAL-EN was walked by its original24-byte headers to exact EOF. Only the nine
E08 entry/win RW XMLs were decoded. Their inflated RW payload SHA256 values:

- EP_1501A, header2556117/packed1706,13/13 nodes reachable:
  71fe8c2e590c379c730d75abcb40e71bb271628af22781c805552b72cc8bc325.
- EP_1502A, header2557847/packed2277,22/22 reachable:
  9045dcc81f639bd74ab7ff7985db25c4a7228cc2c206008c9a0df3036500fc5a.
- EP_1503A, header2560148/packed2134,18/18 reachable:
  7ef532b8ce61430cb3ff07a381effc604a4fbaa846d1c78464d4387fd8f9bba2.
- EP_1504A, header2562306/packed2321,22/22 reachable:
  492e27319d31d4bec885b3f034be9f3cbfcf4c24098654331c34646db82399d8.
- EP_1504B, header2564651/packed1968,16/16 reachable:
  0b7b135c5639230e173031afb69f608844da15e1026a47ea870b605760d179cb.
- EP_1505A, header2566643/packed2409,25/25 reachable:
  f9e2491abe74ab5e6a73a0d41ba884c247ad8fbe5123d8a1f50f6993dfc0e6d2.
- EP_1506A, header2569076/packed2261,19/19 reachable:
  af01d7a680b53b75f3723560fe20a382dad190a6d37e60c6893a74db1d6db1e7.
- EP_1506B, header2571361/packed2473,22/22 reachable:
  3707b36e37d9169d261a5dfd0ea700e4c09f2ae328a304e37cc643141c3cc622.
- EP_1507A, header2573858/packed3042,34/34 reachable:
  1deddbde0ed8aebeccd166493e3679577d5aa4e2c81f4c67288d35bce5442890.

Every path follows its original single outgoing link from root0 to terminal21;
no dangling link/cycle/extra branch was needed. S04/S06 entry terminals issue
combat_goto CB0801/CB0802. Their B-win terminals issue episode_clear plus
ctrl-scene-back2. The other five terminals issue episode_clear/fade/wait.
No explicit Cxxx_numeric_numeric voice-resource token appears in these nine XMLs;
this is a scoped observation, not proof that all transitive audio is absent.

## Fourteen additional original packs

The exact ordered additions are C052/C056 body,EFT,Q,SND (eight packs), N008,
N008_BG, ST007, ST900, CUT_E0601 and CUT_N9, all.jet. Total13,792,516bytes.
All14 Server payloads match resources/manifests/imported-files.json and the
allowed read-only DataDump/local/inputs/extracted/assets counterparts by exact
size/SHA256. Every source/destination/size/hash is retained in
resources/manifests/episode08-originals.json; its normalized-LF text SHA256 is
 e47f47c84ece43d4b60389c37fced6701d0d2ce03469380fdb22d7cb854e5422.
Historical recovered-assets strings in the import ledger are provenance only;
this work accessed neither the phone nor those private historical paths.

Important dependency closures:

- N008 is Clara's portrait/body; the dialogue N008_BG is in the SEPARATE
  N008_BG.jet (2,134,891bytes), named AT record at2134743. N008 alone is not enough.
- CUTIN_N9 is exactly in CUT_N9.jet at443545; CUTIN_E0601 is in
  CUT_E0601.jet at413025. Both are new additions.
- C052_B references E01..E04/EC and SND01..04; every named token is found in
  its own C052_EFT/C052_SND packs. C056_B similarly closes E01..E07/EC and
  SND01..11. No cross-C-prefix token appeared in these targeted body graphs.
- Both Q packs contain exact TH/STH and SI1..5 wrappers/atlas sprite records.
  This is resource coverage, not a new ordinary skill or cinematic binding.
- ST007 contains STI007_A1..E1/STI007B; ST900 contains
  STI900_A1..E1/STI900B. No invented root STI007/STI900 alias was added.
- Existing selected DIAL_BG contains BG001_3; DIAL_BG2 contains BG005_1,
  BG006_2/BG006_3; DIAL_BG9 contains BG900_1. Existing SND1 has
  BGM_BATTLE2/GULLVEIG; SND_CDN has BGM_COMIC1/MENU/TRAIN/FX_LIGHTOPEN.
  Existing C032_SND has C032_SND01; existing N001_BG has N001_BG.

These checks used the nine XMLs, eight new character packs and targeted
stage/NPC/cut/background/sound families, not a renewed full774-pack corpus scan.
Nested/generated portrait loading and actual renderer memory remain native work.

## Pure preparation and validation

scripts/profiles/prepare-e8.mjs clones the exact reviewed current-restoration
169-group selection and appends only these14 original packs. The INACTIVE
current-e8 candidate has183 groups and coherent resource/list/header stamp
1634689. Every prior non-stamp/package setting remains exact; no inferred
optional feature flag, stat change, grant, save access or runtime activation.

The preparer checks all46 unique pins:32 prior restoration additions/
prerequisites plus14 new originals. Missing/corrupt/conflicting preferred and
fallback copies, ambiguous/mismatched import ledger entries and changed manifest
refuse. Partial/reordered groups or changed baseline settings refuse. Stamps
advance beyond input AND every other declared current profile, including when
re-preparing an already complete183 selection; overflow refuses. Repetition is
idempotent; create-only publication refuses a different existing candidate.

`node scripts/profiles/prepare-e8.mjs --inspect-only` writes no candidate.
`node scripts/profiles/prepare-e8.mjs` creates current-e8 only if absent, or
acknowledges exact existing contents. It never starts a server or edits originals.

`node tests/resource-profile-e8.mjs` PASS: actual preflight, exact169→183 order,
14 new/46 total pins, preservation, source/future/max stamp and corruption/
ledger/copy refusal, idempotence and output overwrite refusal. Isolated SOURCE
bootstrap processes confirm24 material references:22 prior rows exact plus052/
056 with neutral HP1000/ATK100/DEF50, five empty zero-cost skills and no owned
instances. Starter snapshot, birth defaults, exchange whitelist and acquisition
links remain unchanged. New library navigation is not recruitment authority.
This lane did not build or write dist while the root's compiled server was live.

Native183-group boot/RAM/cache persistence, earned E08 entry, portrait/cut-in/
combat rendering, wins, story clears and reward settlement remain UNVERIFIED.
Do not treat package transport/readiness as a substitute for those checks.
