# Hunter level training and rank-up: Guild fee per source card

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra addresses are ELF+0x10000. Bounded direct Thumb instructions and
original symbol identities. DataDump read-only, no live inputs/save/client
changes. This closes arithmetic placement beyond the previously recovered
TYPE3 call sites in guild-level-benefits-native-2026-10-13.md.

## Level Raise charges each selected source separately

CSRTableLevelUp.UpdateTraningInfo G101cb70 clears its price accumulator
popup+6b0 at G101cb9c. It loops the selected full64 source-ID vector
popup+668/+66c at G101cc06..cc1a, reading each ID G101cc3c and resolving the
owned source CARD at G101cc42. The target CARD was resolved separately
G101cbc2..cbc8; it is not the price-selector source at the following site.

For each source, G101cce4 loads that source CARD pointer from stack60,
G101cce6 loads source.rank at CARD+24, and G101cce8 calls
CSRCardInfoContainer.GetCardRaisePrice G87f2fc. G101ccec moves the returned
raw quote to argument r2, G101ccf0 supplies Guild BENEFIT TYPE3, and
G101ccf2 calls CSRGuild.CalcBonusSaleValue Ga7ff08. Only AFTER that call,
G101ccf6..ccfc reads the running total, adds the adjusted per-source amount
and stores popup+6b0. The source iteration continues G101cd00..cd34.
The resulting total is formatted into the fee UI G101cd36..cd4e.

Therefore the source-proven formula is:

```text
total = sum(CalcBonusSaleValue(TYPE3, GetCardRaisePrice(source.rank)))
```

It is not CalcBonusSaleValue(TYPE3,sum(raw quotes)). Per-source float32
conversion/truncation can produce a different total. EXP calculation is
separate earlier code; this price call does not multiply training EXP.

## Hunter rank-up also uses TYPE3 per real material

CSRTableRankUp.UpdateRankupInfo G1039c40 zeroes its fee accumulator popup+690
at G1039c68, and iterates selected full64 IDs popup+66c/+670 at
G1039c60..c78. G1039c7c..c8a compares each full64 source ID against popup+65c
and skips IDs below that threshold. These are the existing synthetic credited
material placeholders; they do not acquire a source CARD price merely because
they occupy a slot. Resolving the real source CARD follows G1039caa..cb0.

G1039ce8 loads the resolved source CARD, G1039cea loads its rank+24,
G1039cec calls GetCardRankUpPrice G87f322; G1039cf0 passes that quote to r2,
G1039cf4 passes TYPE3 and G1039cf6 calls CalcBonusSaleValue. The adjusted
per-source result is added into popup+690 G1039cfa..d00. The total is
displayed G1039d36..d4c. This is **Hunter rank-up**, not equipment rank-up:
the latter's positive raw quote path remains independently documented.

## Raw quote selection and existing Guild qualifications

GetCardRaisePrice G87f2fc and GetCardRankUpPrice G87f322 use their separate
price vectors at container+24 and+30. Rank0 selects first; positive ranks
select rank-1 while out-of-range ranks clamp to the last supplied vector
element (Raise G87f306..f31e, Rank G87f32c..f344). Empty vectors are not
proved safe: neither getter checks empty before first/last dereference.
Original numerical quotes have not been recovered by this audit.

TYPE3 binds exact network key traning, mode1. Existing FindBonusBenefit
qualification is personal Guild ID nonzero plus matching INFO and its
aggregate contribution, not member total/status/role/newbie. Pending status
is not excluded by this helper. A valid nonempty configured level table with
no selected traning benefit gives the null/base-quote branch; affiliated
missing/empty native numeric caches remain unsafe, as previously documented.
Mode1 multiplier/float32/truncation and other-mode addition are unchanged.

Native accumulator ADDs are plain 32-bit word operations. A replica may
refuse unsupported sums/overflow as local admission rather than wrapping a
gold debit. This note proves fee selection and placement only: it does not
recover original prices, training EXP/bonus law, source admission, wallet
receipt grammar or a new registration/reward policy.

## Search audit scope and implementation recommendation

Before this pivot, current game-routes.ts was checked: /explore/GetRef,
GetInst, Begin, End, Retry and Reset already route to the dedicated local
Hunter Search implementation, separate from ordinary mission battles.
Its GetRef remains a documented local one-row fixture; remaining Reward/
Entrust paths still refuse. No new complete missing Search read was claimed,
and no new reward pool, capsule cost, slot or Search identity was invented.

The substantive next integration is reuse of the existing source-tested Guild
fee helper on each real source's raw Raise/rank-up quote before summing.
Keep unaffiliated base pricing, existing source/deck protection, exact owned
cards, no mutation on missing affiliated reference and atomic persistence.
Configured benefit magnitudes are supplied local data, not original values.
