# Optional local Mirage first aid

First aid extends the [configured Mirage run](mirage-local-run-2026-10-17.md)
using real enrolled Hunters and existing Manda. It supplies no item, Hunter,
currency or original price. The native request/receipt is documented in
[the Revive audit](mirage-revive-native-2026-10-17.md); the
[image/localization audit](mirage-first-aid-image-evidence-2026-10-17.md)
found no trustworthy numeric price or cap to adopt.

Add optional `revive_prices` to a **new** complete configured policy:

```json
"revive_prices": [3, 5]
```

These two amounts are authored examples, not recovered prices. The dense
array contains1..100 positive signed32 Manda prices, in purchase order. Its
length is the explicit LOCAL use limit. Omit the field to retain the previous
disabled behavior. An empty array, zero/free tier or malformed value refuses.
The whole policy is captured and immutable: adding first aid to an already
captured attempt is a policy change, not an implicit migration or entitlement.

First-aid policy/history uses **schema13**. Existing policies without the
optional field remain schema12. Older schema numbers carrying first-aid data
refuse before overwrite. The captured `revive_ids` history records actual paid
uses; repeated identities are valid only as separate admitted purchases after
that Hunter has fallen again. Missing/invalid history or a price inconsistent
with the captured tier refuses restoration. Completed/abandoned runs retain
payment history without retaining ownership commitments.

`/mirage/Revive` accepts authenticated `target_inst_id` only. The target must
be a real enrolled owned Hunter with current carried HP0 in an active state1
attempt. Foreign, unenrolled, currently living never-revived, reward-ready or
finished targets refuse. Grade/EXP/skills/book/decks and enemy/reserve HP do not
change. Paid first aid restores exactly10000 carried HP, the native full-health
unit. This dead-only/normal-health/state subset is LOCAL admission; it does not
claim every original UI or server gate.

Payment consumes existing free Manda first, then paid Manda—an explicit LOCAL
allocation rule. Both balances and their sum must fit supported nonnegative
signed32 values, matching this receiver's signed setters. Insufficient funds
refuse before any change. Wallet, owned HP, entry HP, next price and paid-use
history save atomically; write/rename failures restore their exact prior state.
The old terminal End receipt is cleared so its dead-HP snapshot cannot conflict
with the healed cache.

The successful native receipt is flat except for its wallet subtree:

```text
ret_data: {
  inst_id: <numeric owned uint64>,
  mirage_remain_hp: <signed32 absolute HP>,
  revive_price: <signed32 next price>,
  user: {iap: {free_iap_qty: <signed32>, iap_qty: <signed32>}}
}
```

These are absolute values, without wallet `prev/cur` pairs. Retrying an already
restored, previously paid target returns its **current** HP, price and wallet
without charging, saving or overwriting newer balances. A new valid terminal
loss that leaves that target dead can authorize the next configured purchase.
The native request has no purchase nonce; no battle authority or complete
historical replay distinction is claimed.

At exhaustion, the cache and receipt use **-1 as an explicit LOCAL marker**.
This is not a recovered original sentinel. Zero is unsuitable: the inspected
native confirmation treats price0 as affordable/free. Its unsigned comparison
makes -1 unaffordable for supported wallets. The runtime readiness context
explicitly admits this local marker so reaching the cap does not disable
ordinary Mirage battles; other negative prices still refuse. Native marker
presentation remains unverified. The existing reward-free abandon path remains
available for a defeated roster.

Disabling mode and unsetting policy JSON retains paid history, cache, HP and
wallet; mutations refuse until the identical policy is re-enabled. GetInfo
rehydrates absolute carry, and ordinary lobby/inventory synchronization retains
the existing authoritative wallet. Completion/abandon releases owned carry to
the previous LOCAL unentered convention without refunding or granting Manda.

Native UI, original price escalation, use caps, wallet priority, revival timing
and original exhaustion presentation remain incomplete. This is a configured
local workflow, not original-economy parity.
