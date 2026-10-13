# Configured Gem removal and replacement preparation

`gem-removal-prices.ts` and `gem-paid-mount.ts` close the previously refused
changed-occupied-cell path for explicit supplied gold2 fee rows. They are pure
preparation helpers: authenticated account selection, immutable configuration,
wallet receipt and atomic persistence belong to the caller. No original numeric
fees, Gem identities, rolls, grants or acquisition tables were invented. No live
save, server process, APK or game input was changed during this helper work.

## Original lookup and unsigned accumulation

Immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Coordinates are Ghidra; subtract0x10000 for ELF. DataDump read-only evidence:
`sources/native/economy/ghidra-gem-reference.txt`, corresponding keys and
`sources/native/symbols/native-evidence.tsv`. Bounded original Thumb bytes were
independently decoded with Capstone.

ParseGemDisassemblePrices Ga54528 reads direct ret_data collection rows
`level`, `price_type`, `price`, converted to uint32. It stores12-byte records
in field order payment+0, level+4, price+8. FindGemDisassemblePrice Ga54f5a
loads the table at Gem+58/+5c and walks12-byte records. At Ga54f66/6a it
requires exact level, then at Ga54f6e/72 exact payment type; first match is
returned. A miss at Ga54f7e..88 returns payment9, level0, price0. This sentinel
is unavailable data, not an original free-removal quote. Strict canonical
numeric rows and duplicate (level,payment) rejection are replica admission
policy; native loose conversion/first-match ambiguity is not copied.

Confirmation's changed-old gate and full six-cell grid are already proven in
[the position/replacement audit](gem-mount-position-replacement-native-2026-10-11.md).
At Gbc9076 it reads the OLD Gem level. Ga54f5a is called with type2 at
Gbc9084 and type1 at Gbc90a2. The type2 accumulated price uses 32-bit ADD
Gbc9090 and STR Gbc9092 at popup+9c; type1 uses ADD Gbc90ae and STR Gbc90b0
at+a0. Therefore native totals wrap modulo2^32 on overflow. The helper
instead refuses sums above0xffffffff, avoiding a configured quote that would
appear cheaper after native wrap. It never rounds/saturates a missing fee.
Each changed OLD occupied cell is priced independently: clearing two cells
or swapping their same two IDs charges twice at each original old level.

No Guild multiplier call occurs inside this bounded accumulation path; the
helper has no Guild benefit input or extrapolated discount. Subsequent complete
quote/cache/funds/event source closure now admits known joined and pending
Guild contexts with these same raw gold2 fees; see
[affiliated removal proof](gem-affiliated-removal-fee-native-2026-10-13.md).
Type4's changed-old
count and GDP/item payment qualification are still unknown, so type4 is refused.
Known gold2 replacement must retain existing GDP0 receipt policy, not infer GDP
from the historical scalar `gem`. This work does not close every popup payment
branch or prove original numeric balance values.

## Pure transition and receipt

The planner validates full current inventory, exact uint64 IDs, target ownership,
matching equipment part, unique six-cell occupancy, equipment-rank3 second-slot
unlock and active/Mirage commitments. Selected Gems must be unmounted or already
on the same target Hunter. Cross-Hunter transfers remain refused. It evaluates
all required old-cell quotes before returning a candidate and checks available
gold. Rows preserve their reference, ability, rank, level and all other fields.
Removed rows use explicit local target0/position0 policy; same-target swaps
change positions, newly installed Gems change target and position.

Receipt echoes every authoritative owned Gem row, including unmounted rows and
other Hunter rows unchanged. A lost removal response followed by the same empty
desired grid would otherwise omit removed rows that no longer belong to the
target, leaving the client stale. Full inventory echo repairs that case without
a guessed durable receipt ledger. An unchanged desired grid returns fee0; a
repeat after a paid replacement has no fee because its formerly changed cells
now match. This is state-derived no-op behavior, not nonce or universal request
idempotency. Caller must persist before success and roll back on write failure.

`npx tsx tests/gem-paid-mount.ts` passes: clear, replace, move/swap, missing
quotes, insufficient funds, cross-Hunter refusal, active target refusal, type4
refusal, unsigned overflow, precise unsafe uint64 IDs, full removed receipts
and exact immutable input preservation. Test fees11/17 and identities are
authored fixtures. Native UI and configured encrypted persistence remain root
integration work; no actual owned data or live removal is claimed.
