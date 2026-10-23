# Episode10 aggregate monster recovery and inactive resource continuation

The earlier E10 audit stopped at missing directly named M034/M035/M036 packs.
Fresh parsing closes that specific resource gap: original **M012.jet** contains
all three namespaces. No renamed, copied or substitute monster art is involved.
This is source/resource verification, not native E10 entry or combat proof.

## Original binding and immutable bytes

`resources/reference/monster-art-namespaces.json` already recorded this aggregate
ownership. It was revalidated against the actual retained Server bytes and the
read-only DataDump `local/inputs/extracted/assets/M012.jet`. Both have 866108
bytes and SHA256 `9ba4e88489c28f3c18c7353cee6e9213c284b7d936163ffb9dbdf950259ad3f9`.
The strict JET index reaches exact EOF with135 assembled resource names.
Each M034/M035/M036 family has original AT records for AS1/AS2/AS3, DIE, R1/R2,
S and TH, plus its sprite/image records. The numeric outer filename is a package
identity; it does not restrict the resource names inside it to M012.

CB1002's unique original STAT rows are106 CB1002_M1/M035,107 CB1002_M2/M036,
and110 CB1002_M3/M034. The five enemy slots remain M1,M2,M1,M2,M3. Its ST900
background is already selected by E9. CB1001 still uses unique146 Karl/C012
and147 Acerola/C030 with ST007; all are already selected. No combat stats,
coefficients, targets, monster identity, party or enemy order are modified.

The new four-original manifest additionally pins:

- CUT_E1001.jet:300034 bytes, SHA256 `82395aa981186418b2698a142358b02fcae4092e36e2519461d4642d1e36aca6`.
- CUT_E1002.jet:350099 bytes, SHA256 `6d96a0a34fddd3c91aaed48e689486031ff2ff5ed33febae5a0f0f5e5df9d116`.
- CUT_E1003.jet:386434 bytes, SHA256 `9953d006013da930c6db37e3b5f6e11b077935bedcea682b53b27be49397ce35`.

These exact originals were already imported. No original asset was rewritten.
Each cut reaches exact JET EOF and contains its matching CUTIN_E100x AT name.
All four new selections total1902675 bytes.

## Dialogue and selected prerequisites

Original DIAL-EN.jet SHA256 is
`a79ea5c803b1dc747a052e5a438c521e4e5617932d67990d6ec4d44e75a3a3c0`.
The read-only `python scripts/resources/audit-e10.py` verifies original RW body
lengths, parses the seven EP_1701A..1707A entry XMLs and two win XMLs1704B/1706B,
and walks every link from the sole root. Node counts are30,38,26,28,25,17,32,
10,21; all are reachable. It reports exact decoded XML hashes.

Used character IDs004/009/012/014/030/041/049/052 have body/Q/SND packages in
the selected E9 baseline. Original actor999 is the narrator sentinel, not an
owned Hunter. Windblade052 in S02/S03 is already covered by that baseline.
Every one of13 literal bg-add/play-bgm resource names resolves in a selected
original package: DIAL_BG has BG001_1/3; DIAL_BG2 has BG002_1/BG005_1/BG006_2;
DIAL_BG9 has BG900_1; SND1 has BGM_BATTLE2/BGM_GULLVEIG; SND_CDN has
BGM_COMIC1/BGM_TRAIN; the three added cut packages supply their matching cuts.
This checks literal resources and selected character packages, not every
possible generated portrait, emotion, voice or native renderer consumer.

## Candidate and verification

`current-e10` is an **inactive**209-package continuation of the exact ordered205
E9 preparation. It appends only M012 and the three cuts. Every E9 nonresource
setting is exact. Stamps are coherent1634694, strictly above current peers;
future peers force fresh preparation and signed32 overflow refuses. Older
profiles remain byte-identical. Publication is create-only and inspect-only
never writes. There is no live configuration, process, app or save activation.

The preparer checks72 provenance pins:68 prior E9 prerequisites plus these four,
and rejects missing/corrupt preferred OR fallback copies, altered/duplicate
ledger records and partial/reordered resource lists. It does not convert E9's
neutral extra library rows into recovered ordinary stats or acquisition rights.
Source bootstrap checks keep all29 Hunter references and starter inventory,
birth grades, trace eligibility and acquisition links exact versus E9.

Commands:

```text
node scripts/profiles/prepare-e10.mjs --inspect-only
python scripts/resources/audit-e10.py
node tests/resource-profile-e10.mjs
npm run test:profiles
```

All ten profile test programs passed. The focused E10 check also passes the
nine-dialogue/13-literal resource audit, exact combat bindings, source policy
preservation, future/idempotent/max/overflow stamps, true corrupt/missing/copy
conflicts, provenance refusal and preservation of every existing profile.
Logs: `local/e10-profile-tests-20261023.log` and
`local/e10-aggregate-audit-20261023.json`.

Native boot, earned entry, renderer behavior, battles and settlement remain
pending. E6S04 is still an earned gate; no later story was marked clear. The
original E10 reward names SK13x30 and SK23x30 do not establish complete item
metadata or a safe claim. No reward or Hunter is granted by this preparation.
A future live continuation must also retain the currently active compatible
material stat/skill/birth-rank policies; this historical E9-derived resource
candidate is not authority to remove those policies from an active session.
