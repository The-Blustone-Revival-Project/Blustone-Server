# Fishing catalogue consumer closure: scalar price request and exact grades

The next fishing seam now has pure, strict supplied-table helpers. No original
fish catalogue IDs or price amounts were recovered, so no catch, pool, bait
purchase or settlement is enabled. This work advances exact consumer behavior
without repeating exhausted asset/cache searches or assigning sprite names to
fish references. State/routes remain root-owned and unchanged by this unit.

## Newly closed original consumers

Final immutable ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below are Ghidra; subtract0x10000 for code ELF offsets. Bounded
original Thumb bytes were decoded read-only with the existing Capstone5.0.7
environment. The original symbol index independently identifies both functions.

**RequestPrice Gb2dca0 posts one scalar fish_id.** Its signature takes callback
and `basic_string const&`, not a fish-ID array. At Gb2dcc8 it preserves the
incoming string argumentr2 inr10/sl. The request adds key`fish_id` at Gb2de02–0c
and copies the supplied string fromsl at Gb2de14–16. ELF literal slotb1e07c
contains`0x0124d14d`; ADD at ELFb1de06 plus PC+4 resolves to
ELF`0x1d6af57`, exact NUL-terminated`fish_id`. The route literal resolves at
Gb2df14/Gb2df16 to ELF`0x1d6af71`, `/fishing/GetPriceRef`.
The native request does not stringify a list or include a requested grade.

**GetFishPriceByGrade Gb2f15a uses exact grade1/2/3.** It looks up the supplied
fish identity in Fishing+1c at Gb2f160–64, compares against the map end anchor
Fishing+20 at Gb2f168–6e, then chooses:

- grade1: node+1c, bronze price, Gb2f178–7e.
- grade2: node+20, silver price, Gb2f174–76/Gb2f188.
- grade3: node+24, gold price, Gb2f170–72/Gb2f184.

A missing map entry or unsupported grade returns literal0 at Gb2f180–82.
That native fallback is presentation behavior, not permission for a zero-price
sale. A strict server helper preserves a missing quote as undefined and refuses
unknown grade selectors; an explicitly supplied zero quote remains distinct.

The earlier original ParsePrice Gb2e438 audit positively maps
`b_price`, `s_price`, `g_price`, and strict string`fish_id` in each direct
ret_data row. Its exact PC-relative key dump is DataDump
`sources/native/systems/ghidra-fishing-price-sale-keys.txt`. Response remains a
collection even for a scalar request: `[ {fish_id,b_price,s_price,g_price} ]`.
The map upsert neither creates item metadata nor proves whole-table replacement.

## Strict supplied catalogue helpers

`src/fishing-catalogue.ts` admits an explicit object containing `pools` and
`prices` arrays. Every fish identity must already exist in the caller's
independently admitted item-reference ID set. That dependency is necessary,
but it is not itself proof that an arbitrary item is a fish. Explicit pool or
price rows are the separate fishing identity assertion; provenance belongs to
their supplier. FS001, FISH_01 and other resource names acquire no automatic
item aliases. No item definition is constructed by this helper.

Pool rows preserve their supplied order and exact `lure_id/fish_id` strings.
Supported lure IDs LU001/LU003 are the recovered native GetBait identities.
Strict duplicate membership refusal and restriction to those two supported
lures are replica policy, not original server uniqueness or full enum proof.
No weights, throw-distance sampling, place distribution or catch membership
outside the supplied rows is inferred. Native pool rows append to a per-lure
vector; response replay must not be described as a proven destructive refresh.

Price rows retain exact uint32 quantities. Duplicate fish-price rows refuse
rather than relying on native last-upsert behavior. The independently supplied
pool and price tables may be incomplete for read-only publication; missing
prices continue to gate settlement. Input arrays/rows are copied and frozen;
price selectors return detached arrays, and member selectors return new arrays.
Unknown price fish yields[]; missing grade quote yields undefined. No defaults
or process environment are introduced, and no ServerState route is enabled here.

## Verification and remaining identity gate

`npx tsx tests/fishing-catalogue.ts` passes: scalar-ID array responses,
exact1/2/3 grade mapping, explicit zero versus missing, immutable input snapshots,
ordered memberships, missing item-reference rejection, duplicate/unsupported
lure/invalid number/uint32 overflow refusal, and incomplete read-only tables.
All names and prices in that test are authored fixtures. Isolated strict
TypeScript checking of the helper and test also passes; `git diff --check` is clean.

The DataDump2026-10-11.2 commit adds Hunter/stat derivation publication, not a
new fish catalogue. Existing FISH_LIST/FISHING/settings and private cache
negative audits were not rerun. The actual remaining source need is unchanged:
one original GetItem row and positive corroboration that its exact ID is used
as fish_id, then original pool/price rows or explicitly declared local tables.
No original numeric price, fish grant, game input, runtime change, save edit or
APK build was performed.

## Pool bootstrap request: publish the full explicit table

Follow-up original decomp and byte review closes RequestPool Gb2b31c. Its
signature takes only a callback. It constructs exactly five form pairs:
`app_code`, `app_ver`, `market`, `pvid`, `otp`; the final unordered_map
constructor receives literal count5. No requested lure_id, fish_id, place_id,
grade, throw-distance or current inventory is serialized. The original route
literal is `fishing/GetFishingPool`, which the replica handles at
`/fishing/GetFishingPool` after ordinary HTTP path normalization.

After authentication, the supported read response is
`{result_code:1,ret_data:[{lure_id,fish_id},...]}` with EVERY configured
membership row, preserving explicit row order across both supported lure IDs.
Do not use fishingPoolMembers to filter a bootstrap response by an invented
request predicate. `fishingPoolRows` now provides that detached full array.
The per-lure selector remains a separate pure local lookup.

Success receiver Gb324c8 sets Fishing+45 byte1 at Gb324fa BEFORE iterating
full response.ret_data. Its strict-string decoder groups the full table into
the native lure→vector map, appending each row. RequestPool checks byte+45==1
at entry and returns without another HTTP request when already ready; its
cached path is the epilogue at Gb2ba08, with no new callback invocation seen
in this function. An empty successful pool likewise marks it ready. A caller
must not promise live catalogue refresh through repeated native RequestPool
calls, or describe duplicate success delivery as a destructive replacement.
The server read can remain pure; no catch or inventory mutation follows merely
from this bootstrap table.

Current itemReference() supplies local fuel, traces, capsule and currency/
reward display rows. Those are not genuine fishing item identities. Passing
its entire ID set to this helper does not make RP1, VIP1 or a local Hunter trace
a recovered fish. A nonempty integration needs separately admitted explicit
fish item definitions, rejects collision with those existing unrelated IDs,
and publishes the SAME definitions through GetItem. Required base item fields
remain strict string id/name/desc/thumbnail_id/effect plus numeric
rank/use_type/sell_price/collect_qty. Later source positively closes native fish
use_type17 (see fishing-owned-inventory-sale-boundary-native-2026-10-13.md).
Ownership, acquisition, original ID→art/effect assignments and prices remain
separate gates. Neutral use_type0 is only the prior local read fixture.
Do not grant any supplied fish reference merely to populate this read-only seam.

Focused catalogue tests and strict TypeScript checks pass after this follow-up,
including both lure groups in full detached replies and immutable repeated
publication. No state/routes or live resources changed by this agent.
