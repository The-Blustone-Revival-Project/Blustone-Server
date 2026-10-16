# Mirage first aid: Revive request, signed receipt, and local pricing boundary

Bounded original ARM inspection, 2026-10-17. Immutable DataDump input
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are ELF code offsets plus `0x10000`. No UI, live save,
original binary or DataDump bytes were changed. Source symbols are retained
in `sources/native/symbols/native-evidence.tsv`; parser keys are published
in `sources/native/strings/ghidra-mirage-strings-08.txt:9` onward.

## Request and guarded matched callback

`CSRExploreMirageInfo::RequestHealHunter` **G930b60** takes a uint64
Hunter instance ID and callback. It sends standard auth5
(`app_code`, `app_ver`, `market`, `pvid`, `otp`) and exactly:

```text
target_inst_id: <full64 numeric identity serialized to the form>
```

The target literal is G930cc8; the route is **`/mirage/Revive`**
at G930e1a. No client-supplied price, payment selector, quantity, HP,
usage count, tier or nonce occurs in this builder.

The matched inner callable **G937ad0** calls `GetResultCode` at
G937af6 and requires **1** at G937afa/afc. It then tests whether
`ret_data` exists (G937b2c..b78), selects that object at G937b80,
and invokes **`Parse_HealHunter` G92c8e0** at **G937b88**.
Other results skip that mutation parser and still reach the caller.
Thus a non-success refusal is cache-safe here; it does not need the special
ret_data-omission rule required by Mirage End's different callback.

## Exact flat receipt and widths

Canonical accepted response subtree:

```text
ret_data: {
  inst_id: <exact numeric uint64>,
  mirage_remain_hp: <int32>,
  revive_price: <int32>,
  user: {iap: {free_iap_qty: <int32>, iap_qty: <int32>}}
}
```

These fields are **absolute current scalars**, not prev/cur pairs. Required
parent objects must be supplied; this parser does not presence-guard every
nested child. Do not substitute the generic SyncUser grammar or put currency
fields at the top level.

- `inst_id` literal G92c8ec; integral branch loads both words
  at **G92c912**. The floating/string-number path goes through double
  conversion, so arbitrary wide identities must use exact unquoted numeric
  JSON tokens. Safe owned uint32 IDs also honor Parse_Entry's narrower
  membership updater in the rest of the Mirage flow.
- `mirage_remain_hp` literal G92c93c; numeric-word branch G92c958
  and signed floating conversion **G92c980**. The full target ID
  and signed HP word are passed to
  `SetCardMirageRemainHP(uint64,int32)` at **G92c9b2**.
- `revive_price` literal G92c9e0; signed conversion **G92ca20**,
  stored at manager **+0x58** at **G92ca2e**. `GetBaseInfo`
  exposes this as base **+0x50**. This response supplies the next
  cached quote; its original price progression is not derived here.
- `user.iap.free_iap_qty`: signed conversion **G92ca80**,
  absolute write into `CPVDataMgr +0xa0` at **G92ca92**.
- `user.iap.iap_qty`: signed conversion **G92cae4**, absolute
  write into `CPVDataMgr +0x9c` at **G92caf4**.

No ordinary party replacement, entry-wide HP reset, enemy update, state
transition, reward/item grant, AP/BP setter, or quest parser occurs in this
complete bounded Heal parser. It updates only the supplied owned target's
HP, the next price and both Manda wallets. Native full carry is10000 from
the independently established battle ratio; a full-heal award is still a
server settlement policy rather than a recovered original numeric receipt.

## UI target source, price confirmation, and affordability

`CSRTableDeck::OnTableViewButtonClick` **Gfeb4ac** reaches its Mirage
first-aid confirmation branch and reads `GetBaseInfo` at Gfeb672.
It loads cached price at **Gfeb67a** from base+0x50. The clicked
index selects the table's row at Gfeb676/67c; Gfeb680 resolves that
row's card shared pointer. Gfeb696 (or Gfeb6c2) loads both target
card instance words from **CSRCard +0x10/+0x14**. The closure captures
that price and target at Gfeb6ea/6ee and opens its confirmation with the
price argument at Gfeb708/70c.

The confirmed callable **Gfecb14** reloads the captured price at
Gfecb2e, obtains paid/free Manda at Gfecb34, and adds them at
Gfecb38. Critically, its comparison/branch **Gfecb3a/3c is unsigned
`price <= walletTotal`**. Insufficient funds take the message branch;
admitted funds lead to `RequestHealHunter` at **Gfecba4** with the
captured full64 target. The following caller **Gfecd1c** independently
checks result1 at Gfecd50/52 before running `OnMirageHeal` Gfe99d8
at Gfecd58; other results show error UI.

This closes the target and price-confirmation chain, but not every row-button
visibility or target-health admission rule. In particular this bounded work
does not establish an original exact-HP0-only gate, original use cap, or the
original exhaustion marker. It does not prove free-first versus paid-first
server charging from a sum-only affordability check.

## Exhaustion and configured local first aid

The affordability gate makes price **0 affordable**, so 0 must not silently
mean an exhausted finite policy. Signed price **-1** reaches that comparison
as UINT_MAX and is unaffordable for the supported ordinary signed-wallet
range. That is useful for an explicitly LOCAL exhausted marker; it is **not
proof of an original sentinel**, hidden-button behavior or original cap.
The native confirmation might display a negative quote before showing the
funds error; native exhaustion presentation remains unvalidated.

The optional revival policy therefore requires explicit positive signed32
`revive_prices` (a finite array of1..100 uses), captures a `revive_ids`
payment history, and derives next price from its length or LOCAL-1 when
exhausted. No prices or usage cap are supplied for old policies that omit
the option. Generic combat readiness must opt into this precise local
negative-price sentinel rather than rejecting the otherwise usable run.

The supported local planner admits only state1, a real owned/enrolled target
whose captured HP exactly matches inventory, and dead HP0. It charges
nonnegative signed32 wallets whose total fits signed32, spends free Manda
first, restores10000, clears the old End receipt and appends one paid use.
These eligibility, price/cap, free-first and restoration rules are **LOCAL**.
They do not recover original prices or entitlement. Repeated use on a Hunter
that has died again can purchase the next configured use; no original nonce
or battle-proof law is invented.

For a previously paid target that is currently alive, a response-loss retry
returns **current** HP, wallet scalars and next price without healing again,
charging again or rewriting the journal. Completed/abandoned records retain
paid history after membership release so subsequent ownership changes do
not invalidate that historical ledger. State integration must atomically
commit wallet, target HP and captured history and restore all on failure.
