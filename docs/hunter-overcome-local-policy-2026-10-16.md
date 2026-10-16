# Optional ordinary Hunter Overcome local policy

The replica can execute `/gym/Overcome` against real owned Hunters, material
stacks and gold when an explicit local policy is supplied. Native request,
reference and receipt grammar is recovered; original numerical effects,
recipes, material IDs and issuance remain unknown. This feature restores a
bounded local workflow, not the original game's economy. It is disabled by
default and does not implement awakening, AwakenOvercome, equipment growth,
ordinary rank-up or automatic Hunter/item grants.

## Configuration and reference readiness

Set both environment variables before starting the server:

```text
BLUSTONE_HUNTER_OVERCOME_MODE=local-configured
BLUSTONE_HUNTER_OVERCOME_POLICY_JSON=<complete JSON policy>
```

The placeholder is not valid policy text: supply a complete JSON object with
exactly `effect`, `src` and `items`. Constructor options are equivalently
`hunterOvercomeMode:"local-configured"` and `hunterOvercomePolicy:<object>`.
There is no automatic historical policy or implicit missing-row fill.

`effect` must contain exactly counts1,2,3. Every row has `cnt`, `hp_percent`,
`atk_percent`, `def_percent`; percentages must be finite numbers0..1000,
nondecreasing independently for each stat. Values are raw wire percentages:
10 means+10%, not0.10. Native parsing stores float32 and its stat calculation
divides later; the replica does not pre-multiply saved base stats. No count0
row is synthesized: the native getter's missing-count0 path is neutral.

`src` must explicitly supply **all12 unique pairs** of `target_base_rank`1..4
and destination `overcome_cnt`1..3. Each row has these exact fields:

```json
{"target_base_rank":3,"overcome_cnt":1,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17}
```

That row is an authored example, not a recovered price. `card_required_rank`
is1..5, `card_cnt`0..3, and `gold`0..2147483647. `item_list` has at most4
distinct declared references with positive uint32 quantities. All three
components apply together; they are not alternative payments. A row with
zero cards, no items and zero gold refuses. Full coverage is a native
readiness requirement: missing recipe lookup can return a sentinel which
popup callers dereference. Partial tables are rejected rather than published
or completed with invented costs. Some pairs may be ineligible for a given
current Hunter grade; their explicit presence still protects reference lookup.

`items` contains zero or more complete inert item rows. New IDs must match
`local_overcome_[a-z0-9_]+`, be unique and avoid existing published identities.
The full required schema is:

```json
{"id":"local_overcome_stone","name":"Authored stone","desc":"Local fixture","use_type":0,"effect":"","thumbnail_id":"","rank":1,"sell_price":0,"collect_qty":0}
```

Only `name` and `desc` supply arbitrary text; the other inert values must
match exactly. The same full schema is used for configuration and durable
snapshot restoration. Recipe material references may also name the existing
known item registry. References do not allocate an owned stack, advertise a
purchase offer, establish a historical item ID or implement a producer.
Unknown fields, duplicate recipe pairs or IDs, malformed descriptors, accessors,
sparse arrays and out-of-range values refuse before publication.

## Complete authored example

The following complete test-style policy demonstrates the format. Every
effect and cost is LOCAL fiction. No value is imported automatically from
the historical screenshots, and the repeated costs are not a universal game
law. Serialize this object as one JSON environment value if using the CLI.

```json
{
  "effect": [
    {"cnt":1,"hp_percent":3,"atk_percent":4,"def_percent":5},
    {"cnt":2,"hp_percent":6,"atk_percent":8,"def_percent":10},
    {"cnt":3,"hp_percent":9,"atk_percent":12,"def_percent":15}
  ],
  "src": [
    {"target_base_rank":1,"overcome_cnt":1,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":1,"overcome_cnt":2,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":1,"overcome_cnt":3,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":2,"overcome_cnt":1,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":2,"overcome_cnt":2,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":2,"overcome_cnt":3,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":3,"overcome_cnt":1,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":3,"overcome_cnt":2,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":3,"overcome_cnt":3,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":4,"overcome_cnt":1,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":4,"overcome_cnt":2,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17},
    {"target_base_rank":4,"overcome_cnt":3,"card_required_rank":3,"card_cnt":1,"item_list":[{"ref_id":"local_overcome_stone","qty":3}],"gold":17}
  ],
  "items": [
    {"id":"local_overcome_stone","name":"Authored stone","desc":"Local fixture","use_type":0,"effect":"","thumbnail_id":"","rank":1,"sell_price":0,"collect_qty":0}
  ]
}
```

## Supported mutation subset

The authenticated request supplies `target_inst_id` and a JSON numeric
`src_inst_id_list`. The target must be an owned ordinary, unawakened Hunter
with a published current rank row, grade3..5 and current count below
`rank-2`. Recipe selection uses its reference's **first stat rank** and
`current overcome count+1`, not its current star rank as the base key.

The supplied real source count must equal the configured count. Sources must
be other owned, unlocked, uncommitted, ordinary, untranscended Hunters of
the **exact same ref_id**, at least the recipe's required grade. This is a
conservative LOCAL subset: the native source UI supports a wider char_id
family/resource-card domain which is not automatically admitted here.
Active mission/Arena/Search blocks the operation; dispatch targets and
protected leader/deck/Gem/dispatch source cards refuse.

Unlocked material stacks are consumed in ascending exact owned-instance ID
order, splitting demand across stacks when necessary. Locked stock does not
fund a recipe. Item identities are checked without rounding full64 strings;
wire removal rows emit exact numeric full64 tokens and quantity deltas.
Gold, copies and items are validated before a complete plan is committed.

Success debits gold/materials, removes the selected real source cards and
increments only the target's ordinary `overcome_cnt`. Target star rank,
awakening state, EXP and skills remain unchanged; maximum card-book history
is retained. Native receipt fields are scalar `target.inst_id/overcome_cnt`,
bare-ID `removed_card`, delta `removed_item`, absolute gold `prev/cur` and
native deck rows, plus neutral achievement/quest fields. No new card, base
stat rewrite, ticket, calendar reward or awakening is implied. Each new
accepted funded request is another next-step operation; consumed sources
cannot authorize a duplicate charge. No original transport nonce is claimed.

## Earned effect snapshot and mode changes

The **first successful operation** atomically captures the complete policy
under root `hunterOvercomePolicy`, including effects, all recipes and inert
item metadata, and writes **local schema11**. Merely reading references or
starting configured mode does not capture a policy. Save failure restores
the original game arrays/scalars and the exact previous captured-policy
reference/absence. Schema11 also retains mandatory dispatch/quest arrays.
Older schema1..10 carrying this new snapshot and schema11 without one refuse.

The policy is deeply frozen in memory. Its canonical JSON fingerprint sorts
effects, recipe pairs, item IDs and material references. Equivalent input
ordering is stable; a changed effect, cost or item definition is different.
On restart, an enabled configured policy must match the captured fingerprint
or startup refuses before rewriting ownership. Existing positive ordinary
transcendence history without a bound policy also refuses enabled mode rather
than silently attaching new effects.

To disable further mutation, unset **both** environment variables (or use
mode `disabled` with no supplied policy JSON). Supplying policy JSON while
disabled refuses configuration. A captured schema11 policy remains restored
and published through `/reference/GetCardOvercome`; its inert material rows
remain in `/reference/GetItem`. Thus already owned `overcome_cnt` continues
to use the same effect table. `/gym/Overcome` returns2001 while disabled.
Turning a feature off does not discard earned effects or reset counters.
Other settings/refill/profile journals and unrelated accounts are preserved.

## Evidence and verification limits

[Native contract](hunter-overcome-native-2026-10-16.md) documents the final
client's field types, lookup domains and receipt consumers. [Historical image
notes](hunter-overcome-image-quotes-2026-10-16.md) deliberately retain route-
plane, pricing and material-identity uncertainty; they do not populate the
configured policy or establish a universal+10% ladder.

Pure/reference tests cover immutable complete matrices, raw-percent units,
eligibility, combined costs, exact IDs and detached plans. Disposable state
tests exercise real write/rename failure rollback and snapshot/schema guards.
The standalone compiled HTTP proof uses signed P384/HMAC/AES requests,
actual busy refusal, combined consumption, schema11 capture, mode-off retained
tables/absolute inventory repair and changed-policy startup refusal:

```text
npm run build
node dist/tests/hunter-overcome-http.js
```

These checks validate server behavior and native-compatible wire contracts.
They do not claim a live native UI, rendered stat increase, original balance,
original material acquisition or an IAP issuance flow.
