# Fishing End item parent and native defaults correction

Original ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses prefixed G use the retained Ghidra/code coordinate, ELF code offset
plus0x10000. This is a read-only original-source audit and disposable HTTP
regression update; it does not establish a native catch or tutorial completion.

## Actual correction: additions belong directly under ret_data

Both ordinary and tutorial EndWithSell share ReqEndCB Gb2a308 and ParseEnd
Gb2a560. ReqEndCB calls ParseEnd on the full decoded envelope at Gb2a468,
then optionally calls ParseSell on ret_data.sell at Gb2a488. An HTTP success
or a correct server balance alone does not establish a matching native item cache.

The ARM register provenance removes the ambiguity in the older reports:

- Gb2a582 indexes fullJSON.ret_data; Gb2a588 retains that result in **fp**.
- Gb2a58c indexes that object's user; Gb2a592 retains user in **r8**.
- fp is not reassigned before the item lookup. Gb2a9ca executes **MOV r0,fp**;
  Gb2a9cc/Gb2a9d2 resolve literal item, and Gb2a9d4 calls operator[].
  Therefore the actual collection is **ret_data.item**, not user.item.
- Gb2a9ce also saves fp at stack+0x10; the later card lookup at Gb2ab5e
  reloads this same ret_data pointer. The nearby resource-user parser does not
  change the item/card parent.
- Item rows read inst_id (Gb2aa0a/Gb2aa12), added
  (Gb2aa16/Gb2aa18), and ref_id (Gb2aade/Gb2aae2), then call
  CSRInventory.AddItem. A null/missing item list skips that additive branch.

The source-compatible catch then sale ordering is:

1. ret_data.item adds the newly generated general item stack.
2. ParseEnd's nonempty fish_id adds the fish count at Gb2ae3a and updates
   the longest record at Gb2ae46.
3. ParseSell consumes ret_data.sell.item removal deltas, including the exact
   uint64 item instance and uint32 quantity at Gb2b1be/Gb2b262–Gb2b26a.
4. ParseSell publishes the absolute remaining fish counts through sell_result
   at Gb2b2a2–Gb2b2ba, and its optional user.gold synchronizes the wallet.

Placing the addition only in user.item silently skips step1. A subsequent
sale removal cannot remove a stack that the native general inventory never
received. Both tutorial and ordinary producers require the same parent repair.
Their server mutation, prices, bait policy and outcome identity need not change.

The older DataDump fishing-tutorial-settlement-contract report correctly names
ret_data.item. This finding supersedes the conflicting user.item statement in
Instrumented docs/fishing-cache-repair-boundary-2026-10-23.md. DataDump remains
read-only. HTTP assertions now require direct ret_data.item and absent
user.item, independently of the final stored quantity or wallet.

## Quest fields are optional here; no new snapshot plumbing is justified

ParseEnd unconditionally calls CSRAchieve.ParseLobbyEnter at Gb2aec4. That
alone does **not** make its three quest fields mandatory. The original client
uses permissive custom JSON conversion rather than the strict behavior one
might expect from another nlohmann build:

- Missing-key operator[] G7930f8 reaches G7931be and returns a guarded static
  null JSON object; initialization at G7931ec/G7931ee zeroes data/type.
- ParseLobbyEnter indexes dailyquest_min_stage at G844940, then invokes
  the actual string converter G728b08 at G844950 without a preceding null guard.
- The converter's null/default branch G728ba4–G728bdc writes an empty
  temporary string and returns. It does not throw a type exception.
- G844962 checks that temporary's length; only a nonempty value can replace
  the cached minimum at G844966 onward. Missing or empty values preserve it.
- Missing daily_quest and linear_quest yield empty iteration. The inspected
  body has no global quest-list clear before those loops; only supplied rows
  enter their update/removal paths.

Thus omitted fields do not establish a crash, cleared minimum or lost loaded
quest progress. An initial audit warning that treated the converter as strict
was retracted after tracing its actual null branch. Adding neutral or populated
quest fields solely to address that warning is unnecessary.

## Type17 is the sold-fish presentation

Success.Init Gd0704c obtains Fishing.GetInfo and calls SetItemInfo using
INFO+0x18, the fish_id written by ParseEnd; there is no required hardcoded demo
fish seed. GetItemData lookup is Gd0764e. The item's field+4 is compared with
17 at Gd07670. Type17 hides RE_NON_SELL (literal Gd07658), shows RE_SELL
(Gd076b6), and enters the fish branch selected after Gd0771c.

That branch renders the fish name, length/grade medal and SPR_FISH; the latter
uses thumbnail_id+"_V" at Gd07c28–Gd07c3c. Complete LOCAL practice metadata
with thumbnail FS001 therefore requests original FS001_V. The existing
FISH_LIST resource proof remains separate from an original species identity.
Type17 must not be described as the bait/item presentation: the contrasting
non-sell branch contains the BAIT artwork consumers. The fish branch uses
the fixed sold wording at Gd07dfa and displays the sale delta from INFO+0x30.

The authored tutorial auto-sale receipt matches that presentation after the
item-parent correction. Generic additive success replay is still unsafe;
the pending-cast guard and one-time duplicate refusal remain necessary.
No native rendering, cache settlement or guide27/2 success is claimed here.
