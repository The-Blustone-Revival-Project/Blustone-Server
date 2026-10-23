# E11–E18 original combat readiness (2026-10-23)

Source-only audit against `current-e10-expanded-character-progression`(210 packages). No profile, copied asset, native execution, reward, ownership or progression change. Dialogue/cut-in/gallery readiness is a separate lane. Full body/Q/EFT/SND bundles are a conservative completeness bundle for fixed actors and their ordinary reference metadata, not proof every pack is consumed by every battle.

## Exact combat graph bindings

Zero-based STAT array indices below. Each used full actor ID resolves to exactly ONE retained row; same-ref variants are not collapsed or chosen by prefix. Empty slots remain dynamic.

E11: 8 stories, direct combat links: CB1101=E11_S03, CB1102=E11_S08.

- `CB1101` (E11_S03); environment `99`→`STI099`/`ST099.jet`; left [dynamic; dynamic; dynamic; dynamic; 75:CB1101_011_1→C011/ref011] | right [76:CB1101_043_1→C043/ref043; 77:CB1101_003_1→C003/ref003; 78:CB1101_028_1→C028/ref028; 79:CB1101_014_1→C014/ref014; 81:CB1101_001_1→C001/ref001]. JSON SHA256 `cd6a420218af96c618cdc5ec6eed1c4cd03684468905bc0ce0f7e9819e1cd154`.
- `CB1102` (E11_S08); environment `99`→`STI099`/`ST099.jet`; left [dynamic; dynamic; dynamic; dynamic; dynamic] | right [82:CB1102_011→C011/ref011; 83:CB1102_018→C018/ref018; 84:CB1102_019→C019/ref019; 86:CB1102_006→C006/ref006; 87:CB1102_008→C008/ref008]. JSON SHA256 `062346909cdf91ab448f10c1372cc0ff8b8f3d22bd2616f0f58d556dd049e9d5`.

E12: 7 stories, direct combat links: CB1201=E12_S02, CB1202=E12_S04.

- `CB1201` (E12_S02); environment `7`→`STI001`/`ST001.jet`; left [dynamic; dynamic; dynamic; dynamic; 118:CB1201_C054→C054/ref054] | right [124:CB1201_M1→M041; 125:CB1201_M2→M040; 126:CB1201_M3→M042; 124:CB1201_M1→M041; 122:CB1201_BOSS→M100]. JSON SHA256 `4e07208c10e7a03a38a7acfce16f42fb49606cef5bddd0fe89a713699bbf99e3`.
- `CB1202` (E12_S04); environment `7`→`STI001`/`ST001.jet`; left [dynamic; dynamic; dynamic; dynamic; 118:CB1201_C054→C054/ref054] | right [114:CB1202_C036→C036/ref036; 115:CB1202_C040→C040/ref040; 116:CB1202_C057→C057/ref057]. JSON SHA256 `6ba874e61ceaeecc002668abf7beb0f2ff8a57a752daebf1dd1548226fb8848e`.

E13: 8 stories, direct combat links: CB1301=E13_S01, CB1302=E13_S02, CB1303=E13_S07.

- `CB1301` (E13_S01); environment `3`→`STI003`/`ST003.jet`; left [dynamic; dynamic; dynamic; dynamic; dynamic] | right [111:CB1301_M1→M035; 112:CB1301_M2→M036; 111:CB1301_M1→M035; 112:CB1301_M2→M036; 113:CB1301_M3→M034]. JSON SHA256 `a97cb7e13c82d0d2a7b67eb233048eaf1689aaeea8f2c91037fe9ab473637afb`.
- `CB1302` (E13_S02); environment `7`→`STI001`/`ST001.jet`; left [58:CB1302_C009→C009/ref009] | right [132:CB1302_C010→C010/ref010]. JSON SHA256 `237e9011e9d1f5fda0ae89796717b5e5707e9c86650e62a11d8f9530fa259c2c`.
- `CB1303` (E13_S07); environment `7`→`STI001`/`ST001.jet`; left [58:CB1302_C009→C009/ref009] | right [145:CB1303_C012→C012/ref012]. JSON SHA256 `c8847777e5596cd47f7dc99ffe27595b845fb3d9a014658ff2465463cf9a610f`.
- `CB1304` (TRANSITIVELY reachable via dialogue outcome scripts; not directly linked by S01); environment `7`→`STI001`/`ST001.jet`; left [58:CB1302_C009→C009/ref009] | right [145:CB1303_C012→C012/ref012]. JSON SHA256 `56d7d61fbbc50f1ed8ef36d8addd0a6195efb1840a65f37799e45f4e11a8c142`.
- `CB1305` (TRANSITIVELY reachable via dialogue outcome scripts; not directly linked by S01); environment `7`→`STI001`/`ST001.jet`; left [58:CB1302_C009→C009/ref009] | right [132:CB1302_C010→C010/ref010]. JSON SHA256 `3ada756484919a9604376ff7b0bb24199a04a72ffb10ab99e32a3f5a06dd1693`.

E14: 7 stories, direct combat links: CB1401=E14_S03, CB1402=E14_S05.

- `CB1401` (E14_S03); environment `7`→`STI001`/`ST001.jet`; left [dynamic; dynamic; dynamic; dynamic; dynamic] | right [124:CB1201_M1→M041; 126:CB1201_M3→M042; 124:CB1201_M1→M041; 126:CB1201_M3→M042; 123:CB1401_BOSS→M100]. JSON SHA256 `c9c2fc51d7faa5a54684f79aa584f3e3cdac1b09bdac3ef86224b733a7accb84`.
- `CB1402` (E14_S05); environment `7`→`STI001`/`ST001.jet`; left [dynamic; dynamic; dynamic; dynamic; dynamic] | right [39:CB1402_C046→C046/ref046; 40:CB1402_C056→C056/ref056; 42:CB1402_C064→C064/ref064; 44:CB1402_C068→C068/ref068]. JSON SHA256 `d83e2575ef4e459709a457a8e27f168046e736b4871edaeef00b456f15ed06b2`.

E15: 8 stories, direct combat links: CB1501=E15_S02, CB1502=E15_S05.

- `CB1501` (E15_S02); environment `901`→`STI901`/`ST901.jet`; left [dynamic; dynamic; dynamic; dynamic; dynamic] | right [35:CB1501_M1→M034; 36:CB1501_M2→M035; 35:CB1501_M1→M034; 36:CB1501_M2→M035; 37:CB1501_C041→C041/ref041]. JSON SHA256 `9c51e45aee7013b863a5a19a305294fb264662a3b1440e4e7d4a474d98907774`.
- `CB1502` (E15_S05); environment `901`→`STI901`/`ST901.jet`; left [dynamic; dynamic; dynamic; dynamic; dynamic] | right [38:CB1502_071→C071/ref071; 148:CB1502_017→C017/ref017; 92:CB1502_016→C016/ref016; 120:CB1502_054→C054/ref054; 121:CB1502_054_1→C054/ref054]. JSON SHA256 `1f905195762deed4de2653f510339c123d5ea2f74aec183f393ed04531c27e33`.

E16: 9 stories, direct combat links: CB1601=E16_S03, CB1602=E16_S06, CB1603=E16_S07, CB1604=E16_S08.

- `CB1601` (E16_S03); environment `901`→`STI901`/`ST901.jet`; left [59:CB1601_C009→C009/ref009] | right [61:CB1601_C023→C023/ref023]. JSON SHA256 `1366973f9337d499e06bcb7c4e96962befc0806793d683427028ac4ec360d10f`.
- `CB1602` (E16_S06); environment `902`→`STI902`/`ST902.jet`; left [dynamic; dynamic; dynamic; dynamic; 41:CB1602_C056→C056/ref056] | right [61:CB1601_C023→C023/ref023; 119:CB1602_C054→C054/ref054; 46:CB1602_C068→C068/ref068; 43:CB1602_C064→C064/ref064; 129:CB1602_C004→C004/ref004]. JSON SHA256 `018390a7ff0de299b76f172f892ffd56506d312a9bb7f55b05dba105841e48aa`.
- `CB1603` (E16_S07); environment `902`→`STI902`/`ST902.jet`; left [59:CB1601_C009→C009/ref009; 41:CB1602_C056→C056/ref056] | right [133:CB1603_C010→C010/ref010]. JSON SHA256 `3137ece5a7f761fa1ea87b26e0c83044dfc294d4fa1c5868f88a2dd9d10642b3`.
- `CB1604` (E16_S08); environment `902`→`STI902`/`ST902.jet`; left [60:CB1604_C009→C009/ref009] | right [133:CB1603_C010→C010/ref010]. JSON SHA256 `0e9006fe77ba00764fb1f370d69fb896b6b4f542701a9e4b63f3c91e8dc119a2`.

E17: 9 stories, direct combat links: CB1701=E17_S03, CB1702=E17_S04, CB1703=E17_S07, CB1706=E17_S08.

- `CB1701` (E17_S03); environment `901`→`STI901`/`ST901.jet`; left [dynamic; dynamic; dynamic; dynamic; 59:CB1601_C009→C009/ref009] | right [24:CB1701_C510→C510/ref010]. JSON SHA256 `49ed8bc71967fe28feee0bd99bfc02d87235b4f52ef691ba563842d0d1f80432`.
- `CB1702` (E17_S04); environment `901`→`STI901`/`ST901.jet`; left [dynamic; dynamic; dynamic; dynamic; 26:CB1702_C509→C509/ref009] | right [25:CB1702_C510→C510/ref010]. JSON SHA256 `6baea7e99ed21e3a713785b849db8d6ba4e59d175a08335ce8b75a031642f379`.
- `CB1703` (E17_S07); environment `200`→`STI007`/`ST007.jet`; left [59:CB1601_C009→C009/ref009] | right [25:CB1702_C510→C510/ref010]. JSON SHA256 `29a4208344a38f13c844db7e57769a327263321f60bba891940ef5788d891fb3`.
- `CB1704` (TRANSITIVELY reachable via dialogue outcome scripts; not directly linked by S01); environment `200`→`STI007`/`ST007.jet`; left [59:CB1601_C009→C009/ref009] | right [25:CB1702_C510→C510/ref010]. JSON SHA256 `a5be92b49d30cbad3a41ff330d62dbf99c6b4121f74cc7de435f6ea55e3b677a`.
- `CB1705` (TRANSITIVELY reachable via dialogue outcome scripts; not directly linked by S01); environment `200`→`STI007`/`ST007.jet`; left [59:CB1601_C009→C009/ref009] | right [25:CB1702_C510→C510/ref010]. JSON SHA256 `f026181a66dfe6c97171b024df35c1af36abe0a58f1bb0462a02d6eda1ce69ad`.
- `CB1706` (E17_S08); environment `200`→`STI007`/`ST007.jet`; left [27:CB1706_C509→C509/ref009] | right [25:CB1702_C510→C510/ref010]. JSON SHA256 `7536ea0e86c23d85a5e4db6ebd320913793d590dc2b085d18f6105ae3aaac63e`.

E18: 5 stories, direct combat links: NONE.


## Original package closure

51 additional packages relative to210: twelve four-pack Hunter/variant bundles(48), M014/M100(2), ST902(1). All are present as original Server bytes, match allowed DataDump `local/inputs/extracted/assets/` byte-for-byte, and match unique import-ledger destination/length/SHA256. Every package in the full combat closure passed bounded strict JET indexing with exact EOF.

Environment keys are NOT package ordinals: 7→STI001/ST001;99→STI099/ST099;3→STI003/ST003;901→STI901/ST901;902→STI902/ST902;200→STI007/ST007. ST200 is NOT required. All these backdrop packs except ST902 already belong to210.

Original monster aggregate ownership: M012→M034/M035/M036(already selected); M014→M040/M041/M042(new); M100→M100(new). All twelve exact namespace ATs AS1/AS2/AS3/DIE/H1/H2/H3/R1/R2/S/SHADOW/TH are present for each. AT projections resolve to retained sprite names. M012/M014 AT→S2→I2 projections pass. **Bounded decoder limitation:** M100_R1 resolves to M100_R01, whose S2 payload has a nonzero auxiliary/unsupported layout; full atlas projection of that sprite is not claimed. Exact original package/record bytes remain retained; no replacement or alias is proposed.

`name bytes SHA256 recordCount` for all51 additions. Ledger source is original `recovered-assets/phone-2026-09-18/extracted/split_PADResource/assets/{name}` and destination `resources/runtime/assets/{name}`. Import origin is provenance only; no private snapshot was read.

```text
C008.jet 1258251 0e01a954edeb2e33914bc37d8a2be21aab8f383c3bbfef2c564aeca8ee3532c4 6
C008_EFT.jet 3085158 04c2c3c170e203ab45826648dc17fb89bcb883ea3cc34dd3631def339cf969b0 8
C008_Q.jet 51236 30d58a6e7dce79b19d6ed2a01700948d964ac7cae32870246bb2b80022670e0d 39
C008_SND.jet 151464 53d1873c06f7a42a0b0e6989fdc1abb3e876eca64696a8c06c27a51fd584f2a6 5
C019.jet 1006359 9118f0b1985a165a3ce66a4fb771766c204e9a3e935256c27ef12b9c18ef35f0 7
C019_EFT.jet 3639431 4d737840a7e5bfde6aca776e4359ca2ebe0174b81aa4057e541b1418bb1e7dae 10
C019_Q.jet 128378 f9053a5752ccc2a27f8c8b86667ae6760ad65bbc63973af0e9968e232c6413e0 39
C019_SND.jet 84975 fa4dcd9c466137724273496b48ec7f8c35a63890cdc2d4d4bcc5efa72f9ad8db 4
C023.jet 684063 0e0f349e143e91eb4be245f6927f60feb7e0917d80230b5b64dedd2f963c5baa 6
C023_EFT.jet 2684266 cd37f5e43dd2832d3f1e4eae832d3752fb5a59f7a5f00ab48caa23ac453f0aba 12
C023_Q.jet 47846 2dd61442a8b386e7d1bfffaabcdb0264b6d1bc1c36b35cd48f75205857c5f233 39
C023_SND.jet 102529 2d987eb51b35e70caa26041742f06580946db1b8c60b8764007fe40bc992ca3e 4
C028.jet 1590116 b5f14b4710a89bdcd3429e90bb16536f1b9ba54226f02ca8836d67fc51a95ab7 6
C028_EFT.jet 1826648 cc2308c0a575892bd07d5c980b071f7a79707374fc5745376835dee8a25e852b 10
C028_Q.jet 52800 46e516ac0b13341bdbdadac193d69256c972aa679e7c14a21129cee4cf0f4305 39
C028_SND.jet 178664 3e8d2633f67fe363cb5af2c1b4d91882174340650a7696436c9db7de5229fb99 6
C043.jet 1235758 220ccc4a101bebb81ab7ea0958d46698fe1536a5b9985a9e51630204d6576c9d 6
C043_EFT.jet 2041289 db2ac87c4071c3ec007519d58635159ded477ccbad8bb3ec18371bfacd227e2d 14
C043_Q.jet 61861 dbc0420b8e7b1ffe26e99d5049b091f62cee2ca1ffbad9e145682dfcd3cb8edb 39
C043_SND.jet 179928 c56e94e2831b4bad8d7538de8d269bda4de44035db9f7c298beb023e0d55bb60 6
C046.jet 1451563 3a63e61edf8b98f6f40dc90d45bd80b20a6fe57b555080e6bf97e6f764ec02f8 6
C046_EFT.jet 1281233 044804c3558bbe1db5f5e8bf1996d63c21329e3c0895b52df07a33d748ba8242 14
C046_Q.jet 52882 8239162bbbb2d89a6f507980d385a4800c97250009b3161cdb4b32eff294f2e4 39
C046_SND.jet 138450 f09dea34c781eccc6d2889bfec6f95d4e4cc94a3a455577eab638435a7bb2c3b 6
C057.jet 959618 5c3a6d557d1b05a740d14cc59f3487ab70c87a9b618407a12bc6870cb56c2bfa 6
C057_EFT.jet 2405438 b355bb1cb4fb6080243b0b2e9e595007e8a5b3c57b5882d0af5ac5ba0f13cdaf 6
C057_Q.jet 62925 f1d12b9a7b8395d8c28ec8d4965b47462f53b44556acd99839a0c50745fe61bb 39
C057_SND.jet 139216 c10f0e8a4083353aa331c2f6ac29b832db797db87fa7f8ced44ab620d5861d92 2
C064.jet 1565579 059aef498003350ecc16c4f77f55164b3637d4ea64a75d081e52fdce86661155 6
C064_EFT.jet 2850105 762e84a122284a15eb333fcb0d017ee8c974dcc0ee7501782349fdede4a541a7 8
C064_Q.jet 52191 dd1fcba9d964dd020e799a75dc5ce9b86b8c6fe399aaf12fee853ce7daa5a786 36
C064_SND.jet 159958 4ae9008b8553c9f1ea533cd17496a1acf77082d2bd5d7849217d1e7adc306a8a 5
C068.jet 1798531 3c004a974232368e41e83417caf2883fa44c2c45b62fb779a69ffa199d602a3b 6
C068_EFT.jet 4828946 8666e61cdf6ba0bf5e9de5ad75efcd8a38ceac930144db5cc7401021e0c15b68 8
C068_Q.jet 65262 5b2a741fd4dda0975f3785dbed4ba05b6bd4ae42f55565c77553dac0ef008ca9 41
C068_SND.jet 111439 afecb1c0aba992f734392cfdeecf65172108f7d21aff1be0bf2a059b7e6bc40a 3
C071.jet 1785757 583cba6eb9c3d5491aae2548aa789c2c7fd878d345fb89c58f721467b5fba614 7
C071_EFT.jet 4300805 5ac47a90fac591c5234afaf19ca09951097ad7f5787df2c3ee68a8d200659a04 10
C071_Q.jet 63990 f9c18034d6d275da03ea45fef396e34c10ee8826955fee0ab45e60edb624e556 41
C071_SND.jet 254643 0c901457fd32af82c729da1a1715b55727faab5d48e619cdfc5b2590255b1de1 6
C509.jet 2395347 505f30d9ea7b707176b367d0d788c9ad389e96cd6672b8a0fd08e5905eefa640 7
C509_EFT.jet 4150156 be3c73a91e44a89030c41df90a05a13cbef69ac6a10b5c1d5b36861c1635f1c4 10
C509_Q.jet 53690 6d7d594b114a0c235310232854f73471d705752c600fafdac64b2c9653fbc8fb 39
C509_SND.jet 138833 97b77db66f802cad33198c01b76712cd878c3c6a6ae08bcb9f47f9f976465f22 4
C510.jet 2359538 ca9219d813c730a0e6978f606bd3bfec102d838635d3e7e1dae5c914f4e387dd 7
C510_EFT.jet 4569329 46ec03599acbb9f1e3eb6f734eb39550b89b880432f16282f3435e53c521bad0 10
C510_Q.jet 50438 e2db31a85d49a7c5e18c239dff18a4512500f00af906427ecc967b6c727e6d10 39
C510_SND.jet 74241 2df88d2f990e5a4764bbc1721f536dc23c05a5f0dc4453ce40d636b4d5f7e808 3
M014.jet 1557994 d4c6aafef0fcf31511312da39e19320c84d9dad0d60b891dd4ce7a5410855225 135
M100.jet 584684 f133b1aec0d04c67e524abe97b795565c439b803ba5175f56d76fdc641283243 39
ST902.jet 1673990 40bfd2d1a5c86d36bf0b4846d1f51eac71224cc4a343bd9768d47f6e71f46455 29
```

## Reference pins

- `resources/reference/episodes/EPISODE_S01.json` SHA256 `c5d70b11fbbc5c38ba608bfd73f45a50213ca7686aa8d0f32ab96a25e66f4bb0`.
- `resources/reference/episodes/EPISODE_STAT_ACTORS.json` SHA256 `f3b8cb90372c89490467e75ed0564bfc3f8a4d094370264caa2c821b0eb13b56`.
- `resources/reference/recovered-data/environments.csv` SHA256 `0c9e214daae929e264083329dc8fdd7f0b02b4f438ec159080a82d6264da1b4c`.
- `resources/reference/monster-art-namespaces.json` SHA256 `9abd70a09ce9341b0ad67b9226b532536f4a964819f6ec0dc01c64ba9082aa58`.

## Admission boundaries

E11 adds008/019/028/043; E12 adds057/M014/M100; E13 uses existing combat art; E14 adds046/064/068; E15 adds071; E16 adds023/ST902; E17 addsC509/C510 variant art while ordinary refIDs remain009/010. Distinct CB1604_C009 attr1 and earlier009 attr3 remain source graphs, not ordinary rebalance data. E18 has five stories and no retained CB18 graph; do not invent a final battle. CB1304/1305 and CB1704/1705 lack S01 direct links but ARE transitively reachable through original outcome dialogue scripts (EP_2007C/D and EP_2407C/D). Root's expanded closure verified84 entry/outcome XMLs/2027 reachable nodes/23 combat graphs, plus shared EP_0000A/B (28/22 nodes). All win/lose/lose2 paths were traversed; some E13 losing paths intentionally select win-labelled EP_2007B and continue into CB1304. This is original graph behavior, not permission to force a victory. The four additional XMLs add no literal owner beyond the reviewed70-pack union.

Next step is an inactive original-resource ordered union after independent dialogue/cut-in/map closure, preserving prior210 settings and references. This audit does not prove native gameplay, complete ordinary Hunter metadata or chapter reward item support.
