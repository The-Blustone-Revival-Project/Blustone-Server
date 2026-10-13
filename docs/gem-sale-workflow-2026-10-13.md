# Authenticated configured Gem sales

Native /gem/Sell supports explicit configured affiliation-independent gold2 quotes from
`BLUSTONE_GEM_SELL_PRICES_JSON`, or constructor `gemSellPrices`. Supply an array
of native numeric uint32 rank/level/price_type/price rows. Default is empty;
original numeric prices remain unrecovered. Startup snapshots/canonicalizes the
rows and refuses duplicate rank/level/payment keys before restoring saves.
Authenticated GetGemSellPrice returns detached bare ret_data rows.

The native request uses either `inst_id` (one decimal uint64), or `inst_id_list`
(a JSON form string containing integer uint64 tokens). The exact original keys
are retained; no invented client price field is trusted. Numeric batch IDs are
parsed from original token source so9007199254740993/max uint64 do not round.

All IDs must be unique, currently owned and unmounted, with complete supplied
references/inventory and a matching rank/level gold2 quote. Mounted refusal is
conservative server policy, not established original scene eligibility. The
native instance parser exposes no known lock flag. Missing prices, unknown or
already-sold IDs and mixed invalid batches refuse before mutation. Proceeds
and wallet capacity must fit the native signed32 gold consumer.

Owned Gem deletion and gold credit persist together; a write exception restores
the original inventory array and wallet. All raw remaining Gem data, other
wallets, items, roster/equipment/book/decks and unrelated accounts stay exact.
Native ParseGemSell deletes the request IDs captured in its callback after
success. Response shape is user.gold.cur plus user.item[] absolute quantities;
there is no invented returned deleted-ID list or Gem delta.

Already sold IDs refuse on replay without another credit. This is not a
universal successful retry acknowledgement. A client that loses the first
response must reconcile through inventory refresh; no original nonce/receipt
ledger was reconstructed.

```powershell
npm run build
node scripts/verify-independent.mjs --fixture --profile current-e6-gems --exercise-gem-sale
```

The encrypted disposable proof sells one exact unsafe64-bit ID then a maxuint64
and safe-ID batch for authored13gold quotes, verifies +39total, empty inventory,
replay no-credit/no-write, exact native receipts, original resource hashes/
ranges and transport/save continuity across restart. Focused state tests cover
immutable quotes, auth, mounted/unknown/duplicate admission, write rollback,
remaining rows and unrelated-account preservation. No real sale, live reload,
native menu validation, balance grant or APK change occurred.
