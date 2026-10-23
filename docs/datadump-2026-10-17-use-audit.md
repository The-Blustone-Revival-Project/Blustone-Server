# DataDump 2026-10-17 release: verified artifacts and actual delta

Read-only evidence audit, 2026-10-23. DataDump HEAD was `6d2c3cc`; the release
snapshot commit is `5956fae`. No runtime/stat/profile, original asset, private
save, device or Docker changes. This note supersedes the earlier assumption
that2026-10-14 was still the latest published release.

## Published bytes verified

GitHub release metadata reports2026-10-17, published2026-10-17T17:44:26Z.
All five release assets were downloaded directly through the GitHub CLI into
ignored Server `local/datadump-release-2026-10-17-audit/`, without changing
DataDump. Their raw sizes and SHA256 values match the GitHub asset digests:

- `BLUSTONE-Evidence.md`:6959 bytes,
  `3cb0c9171f430c677430170a86cce4a4d216daaa5cf2cf5e5e9185f7753827a3`.
- `BLUSTONE-Stats.json`:3857193 bytes,
  `06244491113980cb1920db9db44ff8c8f12cd9ab0cf2331321f5984fbd3b93f3`.
- `BLUSTONE-Stats.md`:52447 bytes,
  `b388d08bd5aa1c5bfa00082ce0bdd8279031710078f6d903f73ff2b27bde00cd`.
- `RELEASE-MANIFEST.json`:4226 bytes,
  `aac7d065fe517ef40a978f781e1a04cf498a9a9a8a02b0ef58e47e6f19bf8c55`.
- `SHA256SUMS.txt`:345 bytes,
  `a432ebd87e65871ad2de731f5242a051c74a46d768a3065fac5b94cfaa446442`.

The downloaded SHA256SUMS entries agree with the four named downloaded files;
the downloaded manifest's three payload sizes/hashes also agree. There is no
published-asset corruption finding.

The local DataDump `releases/2026-10-17/` files are a different byte product:
its JSON is3944487 bytes/raw SHA`6e5770e16cd576ed41dd248a55141348e0940cb82e9cf5e5f4c8d7ceb951b3a6`.
Converting CRLF to LF for comparison yields exactly the published payload
bytes/digest; Evidence.md and Stats.md behave the same. Local manifest/SUMS
instead describe the local raw payload hashes, so even LF-normalizing those
two does not turn them into the published manifest/SUMS. Do not mix the two
sets or call the locally checked-out manifest the verified GitHub asset.
This text-only diagnostic is not permission to normalize binary/original
source bytes or bypass provenance pins.

## Exact semantic comparison with2026-10-14

Parsed-payload equality checks establish:

- All eight normalized datasets are exactly unchanged: Hunter identities,
  stat observations, symbolic skill reference, monster identities, campaign
  identifiers, Episode story graph/rewards and Hunter gear identities.
- All100 accessory,22 monster and565 skill magnitude estimate rows are exactly
  unchanged.
- Of113 Hero-at-draw estimate rows,14 change **only `method`**. Numeric values,
  tiers, classes and confidence strings are unchanged for every row.
- All15 previous curated source-table records are exact; three records added.

The14 annotated IDs are005_1,009_1,010_1,017_1,020_1,023,065,067,068,069,071,
083,089,095. Awakened IDs are distinct references, not updates to base005/009/
010/017/020. None of the current eight material-Hunter base-stat projections
is a changed numeric row.

The three new curated tables are:

- Hit census:119 YES rows, release consolidation line45.
- Back-calculation table: implied-at-draw versus tier estimate, line120.
- Per-row verdicts: owner adjudication line27.

Source paths are under DataDump
`findings/hunters/base-stats-visual-hunt/`. The two consolidation tables use
`manual-scrapes-2026-10-14/scrape-consolidation-2026-10-14.md`, release SHA
`3b0b5fec4927ca69b348bbf469567c5428cf2080ad31b21bb2023985f5aeecd3`;
verdicts use `panel-adjudication-2026-10-17.md`, SHA
`9c7cfd7271c93171a8fe43e3981eb16902048f099f405310526e61572fd3fc3d`.

## Source migration and interpretation limits

Nineteen of the published manifest's20 current source paths match their raw
pins. The current consolidation file differs after the later media-path move:
HEAD raw SHA`fa025031c2631bcf11d6c1105c8b1a298494dceade5c43466dca598bc2e3d936`.
Reading its frozen release blob with `git show 5956fae:<source-path>` yields
18303 bytes and the exact published source hash above. The frozen text was
copied into the ignored audit folder for comparison; DataDump was not reset or
rewritten. Current path edits are not automatically original evidence changes.

The dated owner adjudication explicitly grants **no numeric replacement and
no tier promotion**. Its useful new result is calibration and conflict control:
Hermes023's naked-base L30/five-star decomposition supports its existing2019
archive observation1750/937/653 within that stated model. It does not supply
final-client level-one values, an ordinary native growth table, a new resource
kit, or an original acquisition/drop law. Hermes is not among the current
material profile's eight new skill donors.

The approximately1.88%-per-level back-calculation model is scoped to a fixed
star/transcendence state. Lv1 draw panels demonstrably use another state;
gear spreads can exceed the confirmation threshold. Do not replace the native
ordinary linear wire growth fields with this analytical model, apply a global
awakened multiplier from one Lapis result, or use CONFIRM labels as exact
final-version magnitudes. Clara089 and Teresa065 retain explicit conflicts;
Katrina090 remains a zero-hit gap.

Recommendation: preserve current neutral/archive/encounter policy boundaries.
Use this release to prioritize genuinely naked-base, same-state source joins
and reject contradictory retunes. It provides no new authoritative table for
fish IDs, minigame tuning, gacha rates, reward quantities or skill coefficients.
No server gameplay retune is justified by the changed annotations alone.

Validation was artifact SHA/size/manifest checking plus exact parsed comparisons
and a frozen source-blob hash check. Production tests were not rerun for this
document-only audit; no native rendering/combat or new visual re-read is claimed.
