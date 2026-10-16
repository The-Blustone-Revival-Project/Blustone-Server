# Configured fishing casts and durable catches

Implementation checkpoint, 2026-10-17. Default **disabled**. This restores the
missing Begin → minigame result → durable catch/loss → keep or sale server
flow. It does not recover the original fish catalogue, RNG, tuning or economy.
No live profile/save/device/APK/resource activation is included.

## Evidence and explicit local choices

Native request/receipt evidence is in
[fishing-catch-lifecycle-native-2026-10-17.md](fishing-catch-lifecycle-native-2026-10-17.md)
and [fishing-no-catch-record-native-2026-10-17.md](fishing-no-catch-record-native-2026-10-17.md).
Begin sends place_id, cast_dist and lure_id, and receives log_id plus float32
minigame tuning. End sends only log_id and is_win. The server must supply the
catch; the client supplies no fish, grade, length or sale choice.

All of the following are **LOCAL authored** laws, not extracted balance:

- Deterministic per-context outcome cycles; each admitted cast advances its
  own context's cycle, including a loss. No random weights are invented.
- Exact place/distance/lure matching; no fallback to a neighboring place or
  unsupported lure, nor a guessed numeric distance enum.
- A supplied positive bait quantity, debited at End on both win and loss.
  Begin binds exact unlocked owned stacks, lowest instance first, but spends
  nothing. If those stacks become unavailable, End refuses without settling.
- One newly allocated general item stack per successful catch, explicitly
  bound to its fish and grade alongside the separate native grade count.
  This bridges the two namespaces as a captured local law. No grade is
  deduced from a general instance ID or from artwork.
- Keep or immediate sale for the configured cohort. Sale uses supplied grade
  prices and the existing local lowest-ID owned-stock allocation law.
- At most10000 casts per owner, with no automatic history pruning. Positive
  signed32 log IDs are sequential within each authenticated owner's journal.

## Enabling a separately authored configuration

Set `BLUSTONE_FISHING_CAST_MODE=local-configured` and supply
`BLUSTONE_FISHING_CAST_POLICY_JSON` with these exact fields:

```json
{
  "origin": "local-authored",
  "bait_debit": "end-all",
  "bait_qty": 2,
  "stock": "new-stack-per-catch",
  "on_win": "keep",
  "contexts": [{
    "place_id": "SUPPLIED_PLACE",
    "cast_dist": 2,
    "lure_id": "LU003",
    "tuning": {
      "init_val": 20, "max_val": 100, "dec_val": 2,
      "inc_val": 5, "dec_val_on_burn": 4,
      "first_burn": {"min": 3, "max": 5},
      "burn_cool": {"min": 2, "max": 4},
      "burn_dur": {"min": 1, "max": 2},
      "wait_time": {"min": 1, "max": 3}
    },
    "outcomes": [{"fish_id": "SUPPLIED_FISH", "grade": 1, "length": 100}]
  }]
}
```

**Every example number and SUPPLIED identity above is authored**, not a native
statistic or a working original pool. Tuning is converted to finite nonnegative
float32, with positive max/inc, initial gauge no larger than max, and ordered
ranges. Grade is1..3; positive length fits signed32. Exact bounded JSON fields
and dense arrays refuse partial/malformed policies.

Independently supply `BLUSTONE_FISHING_ITEMS_JSON` (GetItem use_type17 definitions)
and `BLUSTONE_FISHING_CATALOGUE_JSON` (explicit lure membership, plus sale prices
when on_win is sell). Bait must have separately published item metadata:
currently the supported historical LU003 shop projection supplies its neutral
metadata through `BLUSTONE_BAIT_SHOP_MODE=archive-2018-projection` and an explicit
`BLUSTONE_BAIT_SHOP_DAILY_LIMIT`. Recognizing native LU001's identity does not
supply its missing complete item definition. The cast implementation does not
invent it. Bait must actually be owned; publishing its shop does not grant any.

To sell kept catches later, enable existing
`BLUSTONE_FISHING_SALE_MODE=local-bound` with
`BLUSTONE_FISHING_SALE_BINDINGS_JSON={}` for a fresh owner. Existing owned fish
need explicit imported bindings whose grade totals equal their general stacks.
The cast journal adds its earned dynamic bindings. Policy, referenced metadata,
relevant membership and automatic-sale prices are pinned across restoration;
retuning a captured cohort refuses. Mode-off preserves journals and read paths,
but still needs the supplied fish metadata/catalogue to validate that cohort.
The test fixture `tests/fishing-casts-fixture.ts` is deliberately authored and
never selected by an ordinary startup or resource profile.

## Transactions and native callback order

Begin persists one pending positive log and selected configured outcome, then
returns tuning plus achievement:null. Same pending context returns that log
without saving or consuming another cycle; another context refuses. Cast IDs
are owner-scoped, and another account cannot settle an owner's journal.

End atomically saves exact bait deltas, one catch stack, grade counts, item
allocator, optional gold/sale and journal completion. A failure before atomic
rename restores the original fields and journal references, including absence
of owned_fish. First-ever loss changes only bait and journal, creates no empty
fish inventory, and preserves the item allocator and gold.

A win returns root fish_id/grade/length, user.item positive added1, and
consumed_inst_list bait REMOVAL deltas. With keep, sell is absent. With immediate
sale, ParseEnd first adds the catch/count/record; optional ParseSell then applies
sell.user.gold prev/cur, sell.item removals and sell.sell_result ABSOLUTE grade
counts. A real zero-quantity general stack remains as a repair tombstone.
Generated catch stacks can retain only0 or1 fish; a corrupt save cannot inflate
one cast into many sellable fish by changing both its item quantity and count.
Imported base-bound stacks may legitimately contain larger quantities.

A loss returns exact native fish_id:"", grade:0,length:0 and intended bait
deltas. Source-closed NULL_STR comparison skips BOTH AddInven and UpdateRecord.
GetRecord returns bare fish_id/grade/length rows from successful journaled
catches. Only strictly longer length changes the record; equal or shorter
catches preserve the previous grade too. Sale never deletes a record.

Schema15 retains fishing journals with all earlier optional cohorts. Older
headers refuse these journals. Missing owners, malformed logs/cycles/bindings,
changed references/policy and inconsistent stock refuse before overwriting.

## Retry limitations and verification

Replaying an additive successful End would increment native stock/counts twice.
A terminal repeat instead returns LOCAL code10203, chosen because native End's
error branch clears consume for that code. Its original server meaning is not
claimed. If a newer cast is pending, stale old End returns2001 instead, preserving
that newer native consume marker. Unknown logs refuse2001 and grant nothing.
A still-pending recovery result0 settles a loss under the captured local rules.

**Lost-response in-session cache repair is not solved.** Native GetInven and
GetRecord insert missing keys but do not overwrite already cached counts or
records. Terminal cleanup avoids duplicate awards but cannot show a missed
award/record in an existing populated model. A cold native model reload is
required for those caches; absolute general inventory can repair its own zero
stacks. This is not a claim of native end-to-end response-loss recovery.

`npm run test:fishing-casts` builds and runs state, cross-cohort and compiled encrypted HTTP
checks. The HTTP workflow uses actual bait purchase, a pending app/state/transport
restart, keep→sale, loss, records, stale/terminal End and disabled retention.
A separate cohort test creates real Mirage re-entry and paid first-aid history,
then verifies schema15 preserves both current/archived Mirage state and earlier
feature settings through restart, unrelated saves and disabled modes.
State tests cover malformed policy, byte-preserving refusals, ownership/auth,
write and rename rollback, overflow, equal/longer record rules, schema downgrade,
corrupt generated stock and preservation of unrelated accounts/progression.
No native catch/minigame/rendering validation or original numeric-data claim.
