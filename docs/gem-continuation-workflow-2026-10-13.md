> Update2026-10-23: configured Manda1 removal now supports selected-currency quotes, LOCAL free-first spending and atomic wallet/inventory updates. Both native funds comparisons are signed; selected gold balance, Manda components/total and fee must fit nonnegative signed32. See [native payment proof](gem-manda-removal-native-2026-10-23.md).

> Update2026-10-23: an optional [sparse historical gold2 quote dataset](gem-removal-observed-gold-2026-10-23.md) now supplies four observed levels. The complete final-server table is still missing; no default activation. Missing native quotes may display0 even while the server refuses removal.

# Configured Gem set effects and removal workflow

The native reference/owned joins, six-cell request and old-level removal fee
lookup now support authenticated configured gold2 removal, replacement and
same-Hunter swaps. Original numerical tables remain missing. This extends the
existing explicit Gem inventory workflow; it does not generate references,
owned Gems, rolls, currencies or unlocks.

Provide immutable JSON arrays at server startup:

- `BLUSTONE_GEM_COMBINATIONS_JSON`: native combination rows with numeric
  id/count/rank/awk_step and decimal-string stat fields. The reference route
  retains wire units; native CardAnalyzer applies set effects.
- `BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON`: numeric uint32 level/price_type/price
  rows. Gold2 replacement charges the OLD Gem's level for each changed occupied
  cell; missing quotes refuse, including a native missing-price sentinel.

Constructor equivalents are gemCombinations/gemDisassemblePrices. Both default
to empty arrays. Invalid/duplicate tables fail before restoring or modifying
saves. Startup snapshots inputs so reference publication and transaction fees
cannot diverge after caller/environment edits. GetGemCombinationEffect and
GetGemDisassemblePrice authenticate account credentials and return detached
bare ret_data arrays.

EquipGem validates the full inventory and supplied references before planning,
refuses active/Mirage commitments, locked second equipment slots, wrong parts,
cross-Hunter transfers, payment4 and uint32 fee-total overflow. Same-Hunter
swaps pay each changed old cell; initial installs into empty cells remain free.
Only owned_gems placement and gold change. Persistence failure restores the
original inventory array and wallet before success can be returned. Other
wallets, Hunter/equipment data, book, decks and unrelated accounts remain intact.

Receipts contain all authoritative owned Gem rows, including removed Gems and
unchanged other-Hunter rows. Repeating an already-applied desired grid incurs
no fee/no write, but still repairs a lost prior removal response. This relies
on current state, not a nonce or universal exactly-once guarantee.

Compiled encrypted disposable proof:

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --profile current-e6-gems --exercise-gem-replacement
```

The proof mounts an explicitly authored precise64-bit Gem, removes it for an
authored13 gold quote, replays the removal without another debit/write, remounts
free and restarts the server. It checks full receipts, raw ability/main/sub
preservation, set percentage strings, seven original package hashes/ranges,
transport persistence and exact unrelated gameplay state. Tests also exercise
swap fees, missing prices, insufficient funds, ownership, rollback and startup
refusal. This is protocol/persistence proof, not native menu/combat proof.

Live source/profile/save/client remain unchanged. BlueStacks inputs remain held
after the earlier Escape stop; no installation or release is owed by this work.
