# Gem sale: independent economy and protection evidence

No original numeric Gem sale-price table was recovered in this bounded
continuation. Sale support must require explicitly supplied immutable rows;
Gem rarity, artwork, item shop prices and UI help are not substitutes.
This note records evidence boundaries for the separate request/planner work.
No original data, live inventory, device or APK was changed.

## Numeric sources checked

Read-only DataDump evidence:

- `findings/economy/gem-reference-contract.md` identifies
  GetGemSellPrice → ReqGemSellPriceCB Gf84e98 → ParseGemSellPrices Ga53e50.
- `findings/hunters/base-stats-visual-hunt/gem-polish-parsers-2026-10-05.md`
  recovers the four uint32 fields `rank, level, price_type, price` and
  explicitly records missing original values.
- `findings/economy/gem-set-evidence-crosswalk.md` reports no original full
  Gem reference rows in the inspected recovered-reference or thirteen-table
  exports. This is a bounded export finding, not proof that all possible
  historical source material lacks them.
- Existing forum/FAQ research mentions selling low-rarity jewels and
  accumulated Rupees, but supplies no identified Gem rank/level/payment
  quote row. A shop purchase price for a five-star jewel is a different
  transaction and cannot become its sale proceeds.

A fresh official-source attempt on2026-10-13 could not read
[the original official English community](https://bs.visualshower.com/en).
Targeted English/Korean official-domain and game/jewel sale searches returned
no primary numeric sale-price source. This negative attempt does not exhaust
archived official attachments or historical gameplay video frames. Previously
recovered guide bodies also do not supply a usable Gem sale table. No numeric
rows were adopted from unrelated jewelry search results or player totals.

## Native ownership and lock limits

Final immutable ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
DataDump `sources/native/economy/ghidra-gem-inventory.txt` and its key audit
recover CSRGem.parse Ga5d3dc. Canonical top-level fields are `ref_id`,
`inst_id`, `rank`, `level`, `position`, `target_inst_id`, `ability`, and
`abilities`; ability nesting adds `level_up_failed`, `main`, and `sub`.
No Gem lock flag is recovered by this parser. An arbitrary extra persisted
field should not be documented as an original native lock contract.

The current ordinary scene supports selling selections by rank:
SetSellCheckByRank Ge0dfb0 compares the candidate PLAY_DATA rank at+18 to the
requested rank (original bytes Ge0e00e–16). That comparison establishes the
UI rank selection operation; it does not establish original server sale
eligibility, a lock exemption, or permission to sell mounted Gems. Bounded
scene inspection has not closed a mounted-sale prohibition.

Require requested IDs to resolve uniquely in the authenticated account and
reject duplicates/unknown/another-account IDs before any wallet mutation.
Refusing nonzero `target_inst_id` is a conservative replica rule that protects
existing mounted equipment and prevents silently changing a Hunter's combat
stats. Keep that qualification visible; no recovered server response code or
original mounted-sale rule is claimed. Cross-account ownership never follows
from a globally valid uint64 ID or shared Gem reference.

## Success receipt hazard

The separate request audit closes CSRGem.ParseGemSell Ga5ddd8:
it reads `ret_data.user.gold.cur` as the authoritative wallet value and
`ret_data.user.item` quantities as absolute inventory quantities, then calls
DeleteGems using the original submitted list. The client does not select a
successful subset from a returned Gem/consumed-ID list.

Therefore a result_code1 reply must represent settlement of the entire
requested batch. If any requested Gem lacks an eligible quote or ownership,
refuse the whole operation without mutation; never acknowledge a partial
sale. Persist all removals and proceeds before success and restore the exact
prior owned array and wallet on persistence failure. A lost first response
followed by a stale retry must not credit proceeds a second time. Repeating
already removed IDs can conservatively refuse; that is distinct from claiming
a recovered original nonce or universal retry protocol.

No guessed Gem grants, original price rows, mounted-sale eligibility,
lock semantics or actual live sale are established by this note.
