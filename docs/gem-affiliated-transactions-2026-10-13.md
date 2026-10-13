# Guild affiliation no longer blocks supported Gem transactions

The replica's historical blanket refusals in equipGems and sellGems were
removed after closing the original quote producers and consumers. The existing
configured transaction planners and protections remain unchanged. No original
price row, acquired Gem, roll or grant was invented. No live inputs, resource
profile activation or APK changes occurred.

Removal/swap confirmation initializes cached cost0, adds the raw OLD occupied
cell's level/payment2 quote for every changed position, checks gold against that
same cached total, then submits the same amount. Mounting into an empty position
adds nothing; swapping two occupied positions charges both. It does not apply
the Guild Gem polishing TYPE2 multiplier. Full source addresses are in
gem-affiliated-removal-fee-native-2026-10-13.md.

Single and batch Gem sale display raw rank/level/payment2 quotes. The batch
sums those prices and submits selected IDs; the receipt's authoritative gold
and captured-ID deletion do not derive proceeds from Guild benefit data.
See gem-sale-guild-raw-quotes-native-2026-10-13.md. Joined, pending and
unaffiliated actors therefore use the same supported fees/proceeds. Neither
operation requires a Guild level table or applies its polish coefficient.

All existing checks remain: exact/lossless uint64 Gem identities, authenticated
owned/reference rows, ordinary Hunter identity, correct part/position/unlock,
active/Mirage protection, same-target/unmounted mount policy, configured quotes,
overflow bounds and whole-operation atomic persistence/rollback. Mounted Gem
sale refusal remains conservative local policy. Cross-Hunter transfers,
type4/GDP payments, original prices and polishing outcomes remain incomplete.

Receipts retain the native contracts: mounting echoes all owned Gem rows to
repair lost removal responses, preserves legacy gem scalar and GDP0 policy,
and supplies existing authoritative wallet snapshots. Sale uses gold.cur plus
item[] and deletes the captured full submitted list. No-op mounts do not debit
or write; already-sold replay refuses rather than crediting again.

Focused tests cover joined actors with no benefit data and pending actors with
an explicit zero-valued polish benefit. Two genuine-width authored IDs
9007199254740993 and maxuint64 survive raw integer-token inputs. Empty slots
mount free; a two-cell swap costs26 from raw13+13; clearing costs26; subsequent
sale credits26. Wallet100 ends74, with original legacy scalar/other wallets/
Hunter state/Guild records/pending rows/peers unchanged. Both write-failure paths,
mounted refusal, no-write retries, inventory reconciliation and restart pass.

Compiled encrypted --fixture --profile current-e6-gems --exercise-guild-gems
proves free mount, raw13 removal despite polish coefficient0, raw13 sale,
no-op removal and no-credit sold replay, exact empty inventory and unchanged
Guild data through process restart. Original seven Gem package hashes/ranges
are verified; this remains a Gem resource/Server proof, not a combined Guild
menu or rendered native interaction claim. The two authored games are preserved
except the intentional owner inventory change and normal registration/lobby
AP/BP clock anchors. No original production economy or UI parity is claimed.
