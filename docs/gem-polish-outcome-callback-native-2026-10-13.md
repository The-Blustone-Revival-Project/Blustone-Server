# Gem polishing: result1 is accepted work, not proof of a successful polish

This extends `gem-level-reference-2026-10-13.md` with the actual request
callback binding and native outcome-animation consumer. Source evidence only;
no outcome, chance, compensation, stat growth, prices or Gem instances were
invented. No live client/save/input/APK or DataDump changes. Original ARM
SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
G coordinates are ELF code plus10000, data VA maps to file minus1000.

## Payment preparation and exact request

`CSRPopUpGemLevelUp.CreateView` looks up the **next level**, current+1
Gbce8f6..8fc, passing nominal price_type2 to FindGemLevelUpPrice Ga54f00
at Gbce900. That lookup actually matches level only; conflicting same-level
currencies remain unsupported. It sends the quote price through
Guild CalcBonusSaleValue(BENEFIT2) Gbce904..90c and stores fee+6b4
Gbce914. This is the Guild polishing consumer; it is separate from raw
Gem removal/sale fees. Guild lookup uses current personal Guild ID and
matching cached INFO aggregate contribution, without a new role/newbie gate.
Valid numeric Guild reference/INFO hydration is needed for affiliated quote
parity; empty-table sentinel safety is not assumed.

Popup `RequestGemLevelUp` Gbd0bf4 reads the selected Gem's current level
Gbd0c12..016 and refuses level>14 (Gbd0c18..01a) or busyflag+65c
(Gbd0c1c..020). It reads cached next-level fee+6b4 Gbd0c3c and multiplies
by incoming max_tries at **Gbd0c42**, a 32-bit MUL, before comparing to
actual gold+154 Gbd0c4e..054. This is a preflight maximum funds check,
not a proof that the backend always debits max_tries or recomputes future
level quotes within one batch. Wrapped multiplication is not a sensible
configured admission policy. Ten-attempt control passes literal10 through
the OnButtonClick tail at Gbd09ec..09f8. General request syntax still accepts
uint max_tries; the original backend's complete admission limits are unknown.

CSRGem.RequestGemLevelUp Ga5811c serializes five authentication fields plus
**scalar inst_id** (key Ga58284/286) and **scalar max_tries**
(Ga582ae/2b0), route `/gem/LevelUp` Ga5842a/42c. No price_type, requested
fee, selected stat, RNG seed, success or failure field is sent. Inst_id is
the selected Gem object's full uint64 identity; max_tries is the separate
incoming argument. The form initializer's literal7 is auth5+action2 row
count, not a fixed number of attempts.

## Exact callback binding and successful receipt parsing

Inner `RequestGemLevelUp $_8` E0 wrapper string ELF1defe04 binds RTTI
VA214e7e8, vtable VA214e7bc and callable ELFa53295/**Ga63294**.
It gets HTTP result at Ga632ba and checks result1 Ga632c0. Only result1
calls **ParseGemLevelUp Ga5e43c** at Ga632c8. Non1 sets actualtries0
Ga632ce. It then calls the captured UI callback with a pair
**`{result_code, actual_tries}`**, stored at Ga632d4. That second element
is ParseGemLevelUp's returned signed32 `ret_data.tries`, not max_tries,
an outcome enum, attempted Gem ID or the result code repeated.

ParseGemLevelUp consumes absolute `ret_data.user.gold.cur` and instance
item quantities, one signed32 `tries` at Ga5e6ee..736, and **one complete
`ret_data.gem`** Ga5e73c. Its exact uint64 ID must already be owned; it
reparses the full Gem and assigns it Ga5e886..88e, then validates the
mounted target Hunter Ga5e8b6. Unknown IDs are not grants. The final return
is actualtries held in r8, reloaded from stack+10 Ga5e82c and returned
Ga5e944. See the existing reference doc for all wallet/item conversion
addresses and large-ID string conversion hazards. Use exact numeric Gem
identity serialization, not strtod-rounded strings.

## Accepted failures and outcome animation

`CSRPopUpGemLevelUp.UpgradeCB` **Gbd2368** checks pair.first==1 at
Gbd2382..386. A non1 result clears busyflag Gbd243a..43c and follows the
error display path. It does not invoke a successful Gem mutation parser.
Result1 instead reads pair.second/actualtries Gbd2388 and finds the refreshed
Gem by the cached selected uint64 ID Gbd238a..39a. It reads the refreshed
Gem's **level_up_failed at +28** Gbd23a0.

The callback queues a preparation entry1 at Gbd23b4..3cc and loops once for
each positive actualtry. For each entry it defaults to animation3
Gbd23e2. Only the **final entry**, when remainingtries==1 **and** the
refreshed failure counter==0, switches to animation2 Gbd23da..3e8. The
loop decrements remainingtries at Gbd23f0 and repeats Gbd2402. Earlier
entries are therefore fail3; the final entry is success2 only under that
failure-counter test. This is not an exactly-one-attempt callback.

Consequences:

- **result_code1 is accepted/executed work, not inherently successful polish.**
  A complete same-level Gem with nonzero failure counter can present accepted
  failed attempts, with consumed gold represented in its authoritative receipt.
- Client animation expects prior failures and one final success/failure state.
  It does not consume a list of success/failure/stat-roll rows. This suggests
  batch attempts stopping at a success, but does not prove the original backend
  stop law or permit arbitrary multiple successes in one request.
- The client does not increment/reset failure counters or generate stat rolls
  in this callback. Those fields come from the full returned Gem. Returning
  result1 with copied metadata and fabricated tries/counter/level would create
  a false native outcome.
- Signed or very large returned tries can underflow/expand the animation
  sequence. A future supported receipt must bind a bounded positive actual
  attempt count to the authenticated requested max and sourced operation.
  That is strict local admission, not a recovered full backend grammar.

## Implementable boundary without invented outcomes

Further bounded wallet/item detail: nonnull `user` selects `gold.cur` and writes
signed32 absolute gold (VCVT.S32 Ga5e4f4; store Ga5e506); missing gold/cur can
write zero. `user.item` iterates rows with exact `inst_id` key
Ga5e586/592 and `qty` Ga5e58c/594. Item ID is uint32 conversion Ga5e5f6;
quantity is **signed32**, Ga5e640. SetItemQuantity receives ID lowword,
highword0 and absolute quantity at Ga5e672..678. An empty item array updates
no items; it is not authoritative replacement of the whole inventory. Positive
known IDs/nonnegative signed32 quantities are conservative supported admission.
Missing row quantities can reset an existing item to zero. These destructive
partial-wallet paths are distinct from validating just the outcome subtree.

Exact authenticated request parsing and complete receipt validation/preflight
can be implemented independently: canonical lossless uint64 owned instance,
bounded supported max_tries, known next-level quote, valid affiliation benefit
selection, checked maximum cost and full existing instance metadata. A sourced
receipt must preserve ref/rank/target/position and every supplied main/sub/
ability field, plus coherent absolute wallet/item quantities and actualtries.
Rollback must cover both wallet and full Gem state before success.

These structural pieces **cannot enable a faithful polishing transaction**.
Original success probability units/law, compensation arithmetic, failed-count
increment/reset, main growth/substat selection, add_sub_ability effect,
batch stopping/charging and retry semantics remain missing. The complementary
audit `gem-polish-failure-ability-boundary-native-2026-10-13.md` owns exact
failure/main/sub parsing and bounded absence of original roll tables.
Neither possibility1 nor add_sub_ability0 authorizes copying rolls and adding
a level. Keep `/gem/LevelUp` unavailable until a complete sourced outcome or
explicitly labelled authored local policy exists; no such outcome is supplied
by this source checkpoint. Native UI validation remains pending.

## Offline outcome decoder

`src/gem-polish-outcome.ts` decodes only accepted `ret_data.tries` and the
complete returned owned Gem. It returns a compact animation descriptor:
`priorFailures = tries - 1`, with final success exactly when the supplied
failure counter is zero. It retains supplied main/sub stats through the
existing Gem parser rather than generating or carrying forward old rolls.
Positive actual tries bounded by the caller's positive signed32 request and
stable instance/reference/rank/target/position are explicit local safeguards.
They do not establish original backend transition laws or supported batch sizes.

This helper is deliberately unused by routes and state mutations. It does not
validate gold, item quantities, achievements, fees, counter transitions or
level growth, and its output is not a safely settled receipt. Authored tests
cover accepted failures, a seven-attempt final success, supplied stat/subarray
changes, exact maximum uint64 numeric-token imports, detached results, partial
payloads and invalid identity/counts. These are contract probes, not recovered
original outcomes or playable polishing validation.

