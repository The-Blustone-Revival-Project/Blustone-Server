# Character stat release audit — 2026-10-11

The public DataDump tag resolves to commit
`49a89bcb0bd54f21f7637a9755561724e9de5b6f`. Five relevant finding files were
downloaded through GitHub's Contents API at that exact commit, into private
`local/research/datadump-2026-10-11/tag-49a89bc/`. Every SHA-256 matches the
supplementary fingerprints in the downloaded BLUSTONE-Evidence.md. These are
tagged release findings, not possibly newer files in the sibling checkout.
The retained retrieval.json records URLs, hashes and sizes. DataDump was not
modified.

## Decision

No new numeric measurement supports changing the current four Hunters. All
twelve relevant Tier-A HP/ATK/DEF tuples (the four current Hunters plus the eight
material candidates) are exactly the same values already imported from the
2019 archive TSV. The new release changes interpretation, not numbers. The
normalized snapshot reports zero changed stat observations and zero complete
archive base-stat claims.

The eight unowned candidates could reasonably receive these source-backed
historical display values under an explicitly named, opt-in **2019 archive
projection** policy, rather than identical HP1000/ATK100/DEF50 neutral fixtures.
That would improve historical per-character differentiation without claiming
final-version balance. It is a separate local policy decision, not justified by
the release's near-100% at-draw classification. Do not silently activate it,
alter current four stats, adopt the extrapolated growth curve, or copy missing
skill/equipment magnitudes. Existing earned EXP/ranks/decks remain unchanged.

## Contradictions and unsupported conclusions

- BLUSTONE-Stats.md's new appendix calls the 62 archive rows exact at-draw,
  gear-free anchors with approximately 100% tuple confidence. In the same
  release, BLUSTONE-Evidence.md line32 explicitly retains unknown archive
  levels/equipment and zero complete base claims; Stats.json line14 does too.
  Both interpretations must remain visible. The normalized source remains
  COMMUNITY-SOURCED historical observations, not original extracted GetCard
  records, regardless of the estimate TSV's `[RECOVERED]` label.
- The derivation's lines47–53 infer untrained stats from a heading naming basic
  abilities and a birth-rarity field. The heading distinguishes core from
  detailed stats; it does not print a level. A rarity-at-draw label does not
  identify the state of every other number on the page. The derivation itself
  admits no printed level and gives only a conditional upper bound of17.
- Lines82–84 generalize one Beckhen secondary-stat match to gear-free status
  for all62. A common page schema does not force a common equipment state.
  Equality with one known nude secondary-stat line can support that one
  hypothesis; it does not exclude core-only equipment effects, cross-era
  differences or prove the other61 rows. No per-row equipment exclusion is
  supplied.
- Lines99–103 use a high-quality regression of combat power on displayed core
  stats to claim absence of a level or gear term. Level/gear effects may already
  be contained in the displayed predictors; a linear derived rating can fit
  equally well when the input stats are trained or equipped. High R-squared
  does not establish measurement state or an exact formula. Offense and
  Defense have materially worse residuals than Bomber/Support, as the note
  itself records.
- The integer-growth argument treats displayed rounded/truncated values from
  different-era sources as exact unrounded affine measurements. Failure of an
  integer divisor test under those assumptions does not recover fractional
  native growth. The proposed exponential growth model is fitted to one pair
  and assumes cross-Hunter uniformity while the same note cites a native
  affine base-plus-growth consumer. It must remain a model, not gameplay data.
- The archetype report line127 describes37 rows covering44 distinct refs, an
  impossible distinct-count relationship unless a quantity is mislabelled.
  Its sparse tier-B/C cells and tier-D polluted Vincent anchor are already
  explicitly limited in the report. Agreement of two estimators sharing an
  archive anchor is not independent proof of an exact tuple. The reported
  confidence percentages have no supplied empirical calibration.

## Useful evidence that survives the audit

The tagged report preserves an official Japanese page's original labels,
original source URL, 2019 capture date and a cross-language skill-slot ordering.
It highlights explicit skill-text drift across eras (Beckhen timing) and a
large difference between database and trained-panel composite power. Those
facts improve interpretation and stop accidental cross-era joins even though
they do not close level/equipment state.

The new stat-panel report identifies a real Lv1 Tyltyl panel in a 2018 video,
with HP/ATK/DEF147/147/147 versus the2019 archive1467/679/679. The panel's own
gear state remains unestablished and its lane claims no base coverage. The
unequal changes across HP versus ATK/DEF demonstrate why a uniform10x rescale
must not replace an era-specific interpretation. Akasha and Riko panels are
also source-backed leads; they do not establish final2.8.0.1 balance.

For the eight material candidates, retained historical HP/ATK/DEF values are:

- Captain009:1624/628/893; capture20191015065805.
- Vincent010:1923/1032/718; capture20191015065805.
- Karl Steiner012:1750/1007/689; capture20191015065805.
- Denali013:1584/755/682; capture20191211112530.
- Lapis017:1537/854/540; capture20191015065805.
- Bear036:1923/755/864; capture20191015065805.
- Bibi040:1750/883/755; capture20191211120956.
- Bright049:1710/828/755; capture20191015065805.

Private `character-stat-audit.json` retains all12 numeric display fields,
capture URLs/timestamps, prior unknown state fields, release classification and
the exact numeric-equality check for all12 relevant Hunters. No live inputs,
stats, saves, fixtures or runtime profiles were changed by this audit.
