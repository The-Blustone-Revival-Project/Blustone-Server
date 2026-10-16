# Local Veteran ticket gifts

The native UserInfo gift action uses genuine owned item GC6 and another
player's PVID. The original recipient reward amount and delivery mechanism
remain missing. The optional local model makes those choices explicit:

```powershell
$env:BLUSTONE_VETERAN_GIFT_MODE = "local-points"
$env:BLUSTONE_VETERAN_POINTS_PER_TICKET = "25" # Authored LOCAL example
npm run build
npm start
```

Default is disabled, with authenticated result2001. Enabled mode requires a
positive uint32 point amount. It publishes a neutral local GC6 definition so
owned tickets can be displayed. No ticket is issued merely by enabling it;
original jackpot/episode acquisition, item metadata and benefit are not guessed.
The item description states the actual configured benefit to the player.

## Native sender contract and local recipient policy

Native RequestUseVIPTicket sends inst_id:uint64, target_pvid:uint64, qty:uint32.
Its actual gift button selects GC6 from the sender's inventory and sends1.
The backend permits funded positive batch quantities as local API policy.
It only accepts an existing other local account on the same server, with both
block directions respected. Friendship is not additionally invented as a gate.
Both owned game snapshots must already be loaded; missing state is not created.

A successful local gift removes that many sender certificates and increments
only the recipient's existing vip_exp by configured points times quantity.
It does not transfer a certificate into recipient inventory or award sender
VIP EXP, gold, Manda, card EXP or a mailbox message. Those are not claimed as
original server semantics. No external message is sent.

The native callback consumes ret_data.consumed_item_list [{inst_id,qty}]
through RemoveItem. Quantity is a decrement delta, not remaining stock; the
key is distinct from consumed_inst_list used by other operations. Full64
instance IDs are validated exactly, including canonical stored strings above
the JavaScript safe-number range; wire IDs remain numeric via JSON.rawJSON.
Local account PVIDs retain the server's existing exact safe-number subset.

## Atomic ownership and retry behavior

Only the sender's selected unlocked owned GC6 stack can fund a gift. Equal
instance IDs in another account remain separate. Invalid IDs, aliases,
duplicate ownership, locked/non-GC6/missing/depleted stock and recipient
uint32 overflow refuse. BigInt arithmetic checks quantity times point value.
GC6 is reserved from unrelated fishing definitions after its positive identity
was recovered.

Planning leaves inputs unchanged. One persistence operation commits sender
quantity and recipient VIP EXP together; a write/rename exception restores
both values on their original objects. Other wallets, owned records, parties,
clocks and allocators remain unchanged. The path does not call gameFor or
regenerate energy. Existing fields suffice; no new journal schema is added.
Existing profile, Arena and other saved metadata remain under their prior
schema guards.

No native nonce was recovered. Another funded request is another gift; a
successful gift is not replayed for free. Absolute RefreshInven for GC6 can
repair sender inventory after a lost response. Recipient updated VIP EXP is
available through ordinary profile/lobby synchronization, without a fabricated
push or inbox receipt.

## Evidence and validation

See veteran-gift-native-2026-10-16.md for exact original library addresses,
GC6 owned-instance selection and callback parsing. Newly extracted jackpot
screens corroborate certificates as observed rewards, not original odds or a
license to mint them deterministically. Original text says Veteran tickets
can raise Veteran Level but does not recover points per ticket.

Pure tests cover full uint64 limits, alias/lock/stock admission, checked points
and input immutability. Production-state tests use an explicitly authored
owned-GC6 fixture, not a simulated original jackpot producer. They exercise
actual authenticated gifting, owner separation, recipient-only points, both
blocks, cross-server/self/presentation-ID rejection, missing snapshots, real
.tmp/rename failures, exact nested references and bytes, exhausted repeats,
restart and disabled behavior.

Native Android gift execution remains pending the input hold. No live/private
save or APK was changed, and no instrumented release is owed.

Compiled proof also passes twice with
node scripts/verify-independent.mjs --fixture --exercise-veteran-gift.
It imports an explicitly authored owned-GC6 fixture only after stopping its
disposable server, then exercises actual encrypted two-account gifting,
absolute sender inventory repair, recipient detail/lobby synchronization,
refusals and process restart. The original fixture game is unchanged. Reports
mark owned_gc6_fixture_import true and veteran_gift_original_benefit_verified
false; this is not an original ticket producer or recipient-reward discovery.
