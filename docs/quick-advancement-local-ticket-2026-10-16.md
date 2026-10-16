# Optional owned-ticket quick advancement

`BLUSTONE_QUICK_ADVANCEMENT_MODE=local-owned-tickets` enables a narrow
`/world/UseItem` implementation for already owned SU1/SU2 tickets. It requires
`BLUSTONE_HUNTER_MIN_RANK_PROFILE=catalogue-birth-rank-projection`; otherwise
startup refuses before serving or saving. Default behavior remains guarded2001.
No tickets, currency, purchase rights or IAP receipts are created or validated.
The retained live profile is unchanged and Android validation remains pending.

## Recovered protocol and explicit local policy

The [native audit](quick-advancement-use-item-native-2026-10-16.md) now separates
two records which were previously conflated:

- Gacha result UI writes a temporary `immediatly_rankup` candidate in local
  PlayData JSON. It is not a required server account.extra_data flag.
- Successful IAP callbacks write the local UserDB recovery record
  `/IMMEDIATLY_ADVENCED_CARD`, add received items, check actual owned SU stock,
  then request consumption. Successful UseItem callbacks remove that record.

The direct owned-stock path checks positive quantity and sends only normal
auth fields, full64 `inst_id`, full64 `target_id`, and `qty:1`. No price, effect,
entitlement marker or package token is sent. Recovery checks target and stock
without reimposing the initial popup's one-hour or competing-copy offer gates.
Consequently already owned tickets are not rejected merely because the initial
offer expired or another copy advanced while purchase recovery was pending.

SU1 is the genuine hardcoded reference selected for current rank3; SU2 is
selected for rank4 within the closed rank3/4 automatic domain. The server's
LOCAL delivery policy requires an ordinary non-main owned target at its
published first stat rank3/4, a matching unlocked funded ticket, and next-grade
ordinary stat and level1 references. It does not allow the unbounded native
non-3 selection branch to authorize SU2 on ranks1/2/5.

The detached native preview establishes next rank and level1. The replica
therefore selects the next-grade level1 min_exp from its current level table.
Resetting rank_up_cnt to0 is an **explicit LOCAL completed-promotion rule**;
the original backend's counter value remains unrecovered. No maximum-level
requirement is invented: preserved package imagery shows level1 before/after.
Existing skill, equipment, lock, awakening, registration date and other owned
fields remain unchanged. Book maximum advances using the existing local book
policy. Current level/stat curves and metadata still include explicit fixtures
and community projections; this is not original-server economy parity.

## Admission, receipts and persistence

The target must be uniquely owned by the authenticated account. Source IDs
accept canonical exact decimal uint64 values; already-rounded unsafe numbers
refuse. Target identities are bounded by the existing safe owned-card model.
Native persistent recovery callers also narrow target IDs; the compiled proof
uses the current low-word ownership namespace and does not validate wide native
target recovery.
Duplicate item identities, locked/empty/wrong tickets, unsupported packets,
unknown targets or references, invalid credited progress and awakening refuse
without mutation. Target inventory locks permit improvement. Ordinary combat,
Arena or Search activity blocks the operation; a dispatched target also refuses.

The successful native receipt supplies:

```text
dailyquest_min_stage: ""
daily_quest: [], linear_quest: [], achievement: []
consumed_item_list: [{inst_id: exact numeric uint64, qty: 1}]
card.target_inst: {
  inst_id: owned target,
  rank: {prev,cur}, rank_up_cnt: {prev,cur:0}, exp: {prev,cur:level1MinExp}
}
```

The item quantity is a consumption DELTA. It is not remaining stock and not
the separate consumed_inst_list grammar. The callback does not require wallet
or AP/BP subtrees. Source stock, target promotion and book commit in one write;
real write/rename failures restore exact fields, row references and book
reference. The handler uses the loaded owned snapshot directly and does not
regenerate energy, allocate IDs or create a missing game. Zero stock remains a
server row. Absolute RefreshInven repairs the client item/card snapshot after
a lost response. A promoted target no longer matches the same natural-rank
ticket, so repeating the consumed promotion refuses; no general transport
exactly-once or nonce guarantee is claimed.

SU1/SU2 references use inert use_type0 and local neutral display labels, with
blank original thumbnails/effects and no shop offers. They are published while
the mode is enabled and retained whenever any loaded account owns either row,
including quantity0, so disabling consumption does not make stock unresolvable.
These recovered IDs are reserved against conflicting fishing-reference imports.
Metadata publication grants no stock. No new journal or save schema is needed.

## Verification and limits

`npm test` includes the source policy/state check. `npm run test:quick-advancement`
builds and runs compiled state and encrypted HTTP checks. Disposable fixtures
cover both SU1 and SU2 with full64 ticket IDs, expired initial offer dates,
non-max-level targets, existing credits, explicit next-level1 EXP, lock/stock/
identity/busy/refusal cases, last-ticket consumption to0, real write and rename
rollback, replay refusal, unchanged wallets/skills/peers and restart. The HTTP
proof uses an ephemeral child and actual P384/HMAC/AES transport, then restores
absolute target and stock through combined RefreshInven with persisted key/OTP.
It also verifies the profile dependency and disabled-mode preservation.

Original IAP verification, stock issuance, original award-counter policy and
full native purchase/recovery UI remain incomplete. No live/private save,
physical device, client rebuild, original binary, Docker, Collector or inference
endpoint changed. Future ticket producers must supply actual owned stock through
a separately reconstructed issuance path rather than granting it at startup.
