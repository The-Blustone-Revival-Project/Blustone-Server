# Supplied Gem polishing transitions

2026-10-23. `/gem/LevelUp` now has a disabled-by-default transaction path for
complete independently supplied before/after Gem sequences. Original RNG,
main/substat roll tables, growth, compensation and backend batch laws remain
unrecovered. No live profile/save/device/APK or original asset was changed.

## Native contract and scope

The request is authentication plus `inst_id` (full uint64) and `max_tries`.
The native callback accepts result1 as executed work, including failed attempts.
It parses signed32 absolute `user.gold.cur`, positive actual `tries` and ONE
complete already-owned Gem; final failure counter0 selects success animation.
See [callback evidence](gem-polish-outcome-callback-native-2026-10-13.md) and
[producer boundary](gem-polish-failure-ability-boundary-native-2026-10-13.md).

This adapter never derives a roll from original ANVILHEATED, quote.possibility,
failed_compensation or add_sub_ability. Every main/sub record, raw ability
string, failure count and before/after level must be supplied explicitly.
No Gem, protection item, other stock, Manda, AP, EXP or reward is created.

## Explicit configuration

Set `BLUSTONE_GEM_POLISH_MODE=local-supplied-sequence` and supply
`BLUSTONE_GEM_POLISH_POLICY_JSON` with this exact outer shape:

```text
{
  classification: "local-supplied-sequence",
  owners: {
    "<actual PVID>": [
      {inst_id: "<owned canonical uint64>", steps: [
        {before: <complete owned Gem>, after: <complete resulting Gem>}, ...
      ]}
    ]
  }
}
```

This is a shape sketch, not ready-to-use JSON or an original outcome table.
Each complete Gem has exactly ref_id,inst_id,rank,level,position,target_inst_id,
ability,abilities. Abilities includes the raw complete main/sub stat records
and level_up_failed. Separately supplied `BLUSTONE_GEM_REFERENCE_JSON` and
`BLUSTONE_GEM_LEVEL_PRICES_JSON` must admit those references and next-level
quotes. Existing selected original Gem artwork prerequisites still apply.
The test fixture in tests/gem-polish-fixture.ts is deliberately LOCAL authored;
it is never selected automatically or imported into live ownership.

Sequences are owner/instance-bound, contiguous and finite (at most10000 steps
per owner). Stable ID/ref/rank/mounted target/position cannot change inside a
step. LOCAL transition law requires failure to retain level/increment counter
and success to advance one level/reset counter. Current level1..14 is supported;
source-complete resulting level15 is allowed. Native float32 stats must remain
finite. Accessors, sparse arrays, partial Gem fields and unsafe identities refuse.

Raw references/prices and the complete captured policy are pinned in schema16
journals. Caller mutations or silent replacement of an earned policy cannot
retune the next operation. Disabled mode retains journals/owned outcomes and
requires those reference/price dependencies for restoration. Subsequent valid
mount changes or Gem sale preserve the journal; a changed placement can make a
future bound step unavailable, and missing sold Gems cannot be polished again.

## Transaction, pricing and retries

LOCAL request limit is1..100 attempts. The currently selected NEXT-level quote
must explicitly use gold payment2. Guild affiliation requires current INFO and
valid configured level-benefit references; the exact native TYPE2 selector and
float32 CalcBonusSaleValue arithmetic determine the per-attempt fee. Null and
present-zero benefits remain distinct; no missing quote implies free work.

Admission checks the current effective quote times requested max_tries against
nonnegative signed32 gold without native multiplication overflow. The LOCAL
batch policy charges this quote per actual attempt and stops at the first
supplied success. If required steps are absent/stale before that stop or the
requested bound, the whole request refuses without doing partial work. An
accepted all-failure batch is valid and retains a nonzero failure count.

Only actual gold, the selected full Gem and its captured cursor change.
Mounted Hunters committed to ordinary/Search/Arena combat refuse; existing
Mirage/dispatch route guards remain in force. Validation and planning do not
regenerate resource clocks. Failed writes/renames restore the original Gem
array, gold and exact journal references before any success can be returned.

Receipt shape is `achievement:null`, `user:{gold:{cur},item:[]}`, positive tries
and one complete gem. Gem IDs above the JS safe-number limit use exact numeric
JSON tokens, avoiding the native string/strtod rounding path. No unsupported
uint32 item-removal receipt or guessed ability deltas are emitted.

The native request contains no operation nonce. Another funded identical call
is new work, not a replay acknowledgement. After a lost response, reconcile
absolute Gem inventory and gold before issuing another polish request. Sequence
exhaustion or stale state refuses; it never resends an old tries count or
charges for a nonexistent transition. Transport exactly-once is not claimed.

## Verification and remaining work

`npm run test:gem-polish` builds and runs state, encrypted HTTP and coexistence
checks. State tests cover supplied failures/successes, multiple failures then
success, checked maximum budget, signed gold, exact maximum uint64 wire ID,
malformed/stale/corrupt policies/journals, source pins, exhaustion, mounted busy
admission, write/rename rollback, modeoff, subsequent sale and peer preservation.
HTTP checks use authored imported ownership, not an original Gem acquisition
claim; a replacement app restores the journal and original secure client keys.
Original numeric tables, live scene/render/animation validation and a complete
original polishing economy remain missing. No profile is activated by this work.

The final build/focused command and all227 runtime regression programs PASS.
Coexistence tests create real current/archived paid Mirage first aid and
re-entry, safely abandon before changing commitments, settle an actual
configured fishing cast, then apply supplied Gem failures and successes.
Schema16 preserves those earlier journals, Guild aggregate-based TYPE2 fees
(including per-attempt truncation), older counters, Manda/AP/BP, roster and peer
state through restart, unrelated saves and all feature modes disabled.
Missing affiliated reference data refuses before writes. Independent review
found native-float overflow and accessor-coercion gaps; both were corrected and
tested before this checkpoint. Native UI execution remains pending input control.
