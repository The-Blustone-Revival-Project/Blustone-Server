# Expanded character progression: evidence boundary and HTTP verification

The inactive `current-e10-expanded-character-progression.json` keeps the exact
210 resources, stamp and expanded skill graphs from
`current-e10-expanded-skills-progression.json`. Its only environment changes are
`BLUSTONE_MATERIAL_STAT_PROFILE=archive-2019-expanded-projection` and
`BLUSTONE_HUNTER_MIN_RANK_PROFILE=expanded-material-catalogue-birth-rank-projection`.
These are separate explicit LOCAL historical/catalogue policies, not newly
recovered final ordinary stats or rank laws.

The archive stat mode retains the existing eight and adds **021 Rebecca,
024 Riko,039 Gullveig,041 Edward,052 Windblade** from
`resources/reference/archived-hunter-database-2019.tsv`, pinned SHA-256
`778e41835a8c44f21652abcb9c10de021afb2871292af8aba3431e71b9fef54e`.
Those observations have level **not shown** and equipment **not established**.
Repeating their displayed values as rank bases while retaining fixture growth
is policy, not original magnitude parity. **056 Genovia has no admitted numeric
archive observation** and retains neutral1000HP/100ATK/50DEF values.

The birth mode retains its eight-Hunter allowlist and adds six community
catalogue claims: **021→2,024→2,039→3,041→3,052→4,056→4**. These match the
imported identity dataset's COMMUNITY-SOURCED rarity claims. Main001, existing
002..006 and all unselected identities retain their previous references.
Genovia's known community grade does not create missing numeric stats.

The prior native contract is reused, not rediscovered here:
`docs/hunter-minimum-rank-projection-2026-10-16.md` pins **GetMinRank G87b302**
to the **first ordinary stat row**. The new policy filters below-birth rows;
it does not rewrite existing owned ranks. The normal paid factory then uses
the published minimum and initializes eligible skill keys. A newly paid rank4
Hunter has keys1..4 at1 and key5 at0 under existing factory behavior; missing
type3 numeric effects remain empty despite that stored level key.

One existing derived display changes with the minimum: the six
`local_library_trace_<id>` rows acquire rank2/2/3/3/4/4 because Library navigation
derives rank from the reference's minimum. Other item fields, item count and
actual `trace` acquisition/drop links stay exact. These are navigation rows,
not new owned trace stacks, redeemable grants or new acquisition authority.
The partial mode still fails the existing global-catalogue-only quick-ticket
guard; no advancement-ticket behavior is enabled.

## Disposable encrypted HTTP evidence

`tests/material-expanded-progression-http.ts` passed through source TSX on
2026-10-23. It uses a real temporary loopback Express app and signed P384/AES
HTTP; no live state, account funding grant, port8080, device input or production
activation is used.

* The baseline process actually pays for Bright049rank3, retains legacy
  Mowgli002rank1, and saves distinct earned EXP/skills/gold/decks/progress across
  three disposable games. New-mode restoration and encrypted reference/inventory
  reads preserve all three games and the saved bytes after auth setup.
* GetCard retains29 references. All prior22 plus unselected020 Sienna remain
  exact; only the six selected stat vectors change. All five admitted historical
  rows'12 numeric columns match the pinned TSV, retained selectors/growth stay
  exact, and Genovia's retained rows preserve their neutral numeric values.
* Two separately captured **actual paid** old-mode saves own052rank1 and056rank1.
  Each refuses new-mode startup without rewriting its bytes. The test neither
  promotes those owners nor erases them to fit the new policy.
* A real encrypted paid052 request now returns rank4 for the **same30 Manda**.
  Against the equivalent old-mode receipt, the complete response shape/fee/
  identity/wallet are exact except explicit rank and newly eligible initial
  skill-level keys, including both envelope aliases. No unrelated owned state
  or grant is introduced; the other two games remain exact.
* A further explicit paid056 request likewise returns rank4 for30, while keeping
  Genovia's unknown numeric stats neutral. Both valid new rank4 owners cold-load
  without a save rewrite. These are two explicit charged test requests, not
  automatic profile-selection grants.

Compiled/full-suite and native validation are separate checks. This host proof
does not establish original final ordinary stats, native combat effectiveness,
historical pool probabilities, or safe activation against an uninspected roster.
