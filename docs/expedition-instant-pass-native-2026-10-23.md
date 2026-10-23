# Explicit entitled instant Expedition dispatch

The native client has a separate pass-entitled EntrustByIAP path, distinct
from accelerating an existing timed job through SkipEntrust. The opt-in LOCAL
implementation reuses normal dispatch admission and award planning, then
commit a collected journal once and return the three native phases together.
It requires an explicitly supplied, unexpired owner pass. It does not acquire,
purchase, extend or infer a pass. Zero additional Manda is LOCAL policy, not
a recovered original server charge or pass price.

Original ARM ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
G addresses are retained Ghidra coordinates, code ELF offsets plus0x10000.
No native input, live dispatch, private-save change or APK patch occurred in
this source/test lane. HTTP results below use disposable authored fixtures.

## Native admission and actual request

CSRSceneMStageEntrust.OnButtonClick Ge7add4 handles BT_PLAY_AUTO. After its
normal fuel/deck admission, it calls IsHavingAutoPassIAP at Ge7b278. The true
branch reaches the instant producer Ge7b466; the alternative normal branch
calls EntrustMission at Ge7b39a. IsHavingAutoPassIAP G9b86e0 reads expiry
manager+0x98 at G9b86f4, obtains CGMTime.GetCurUTC_0 at G9b872e, then
uses signed comparison G9b8736 and GT at G9b873a. Equality is expired.

The instant producer gets the current selected stage from UserDB at Ge7b42e,
count from scene+0x680 at Ge7b432, and selects ordinary deck2 at Ge7b462.
RequestAutoCombatByIAP G9bb0cc emits auth5 plus **deck_type, stage_id, cnt**,
all scalar form strings, to /mission/EntrustByIAP at G9bb4be. It sends no
is_tuto, requested rewards, job identity, Manda amount or quote nonce.
The actual producer does not call GetSkipPrice in Ge7b41c–Ge7b466.

Local eligibility retains earned n_01_05/selected-stage progress, available
fuel, supported owned deck2 Hunters and idle ordinary/arena/Search/dispatch
commitments. Existing Mirage holds must also guard this exact new route.
Counts and awards remain explicit local policy, not recovered original caps
or loot tables. A pending timed job cannot be replaced by this instant path.

## Exact compound response parents and mutations

The original continuation G9bcd10 checks result1 at G9bcd30/G9bcd34.
Full ret_data is retained in r8 at G9bcd44. The three sibling phase wrappers
are literal **entrust.data, skip.data, end.data**, not bare arrays or nested
phase ret_data envelopes. Phase result_code fields are not read here.

1. entrust.data is selected at G9bcd48/G9bcd50 and retained in sb.
   Its user.ap and user.ap_charge_time feed SyncAP at G9bce8c; the complete
   same phase object is passed to ParseAutoCombatStart at G9bcec8. The
   auto_5_days literal in this body is a local UserDB timestamp key written
   at G9bcdc2, not a required server response field.
2. skip.data is selected from r8 at G9bced2/G9bceda, retained in r6, and
   passed to ParseAutoCombatSkip at G9bd02c. Include the complete list of
   existing in-range serials, string-encoded item previews, skip_price and
   **user.iap_qty/free_iap_qty absolute scalars**. A guard at G9bcf04 reads
   retained entrust.user rather than the just-selected skip.user pointer;
   omitting the latter's scalars can therefore zero Manda even if one expects
   a null-user shortcut. Explicit actual balances avoid that ambiguity.
3. end.data is selected at G9bd036/G9bd03e and retained in r4. It enters
   ParseLobbyEnter at G9bd04a, then its result is selected at G9bd06e and
   passed to ParseAutoCombatEnd at G9bd0ae. Specialized setters apply
   result.gold and result.user_exp, including nested user_exp.max_ap/ap,
   absolute card_exp at G9bd4f8, and additive result.item at G9bd68c.
   end.data.user:null is harmless; this compound branch uses result setters.

The same original identity and quantity rules as normal dispatch apply:
entrust_id/UTC words preserve numeric full64 tokens; Start/Skip item previews
are JSON strings containing repeated reference IDs, whereas End result.item
contains actual inst_id/ref_id/added deltas. Confusing those two item forms
would corrupt result presentation or general inventory.

## Idle pass discovery is a separate bootstrap requirement

Only returning a pass with an active timed job leaves a freshly booted idle
client unable to discover its configured entitlement. In explicit instant
mode, the owner may receive a complete idle entrust snapshot from
/lobby/GetMissionInst, with numeric ID0, stage_id empty string, cnt0,
complete_second0, explicit quote fields, list[] and the exact supplied pass.
No dispatch journal or roster commitment is created by that read.

ParseMissionInfo checks the entrust key at Gb69234, selects its value at
Gb6923c, calls ParseAutoCombatStart at Gb69248, then unconditionally selects
that same object's pass and calls ParseAutoCombatPass at Gb69258/Gb69260.
The complete pass date and signed UTC override remain required inputs; an
empty pass is not a safe entitlement or absence marker.

With cached native job ID0, ParseStart G9b896c admits a nonnull idle object.
It only copies stage_id to its cached string at G9b89f4 onward; its whole
bounded body has no stage-reference lookup. It sets ID/cnt/duration0, clears
the prior RESULT vector, and its empty-list tail G9b918e–G9b91a6 derives0.
The completion getter with ID0 returns -1 and empty ClearCount returns0.
The snapshot therefore does not create a cached active job or require an
invented stage. If the client already has a nonzero cached job, Start ignores
the incoming object at G9b8996/G9b899c while the pass parser still runs.
This is fresh-idle bootstrap, not repair of a stale active native job.

## Persistence, retries and verification limits

dispatchInstantMode:'local-entitled' requires local-timed policy and an
explicit current-owner pass whose signed expiry is strictly after now.
All Start/AP, Skip/cache and End/award components are planned before the
single commit. The existing schema2 collected journal stores active:null,
last_id and last_deck; no partly accelerated timed schedule is persisted.
Gold/EXP/item arithmetic and owned-Hunter EXP use the normal End planner.

The request has no nonce. Repeating EntrustByIAP is another dispatch and may
consume more AP and pay another valid local reward. The collected last_id
supports existing **EndEntrust** repair without additive awards; it does not
make an instant-start request idempotent. After an uncertain reply inspect
authoritative inventory/progress before requesting another instant operation.

Paid ongoing Skip is deferred: native serial-1 requests target the whole
pending job, while BT_CLEAR captures the clicked row's exact serial. ParseSkip
indexes its existing vector directly at G9b9b92–G9b9b9e and stamps supplied
rows' end times at G9b9cb0. It updates only supplied rows, with no bounds
check there. Normal DispatchJournal requires contiguous fixed-duration
schedules, so adding this acceleration requires a separately captured law;
it cannot be silently folded into the existing timed snapshot. Its refusal
must retain ret_data:null because its callback parses nonnull failure data.

The encrypted HTTP test covers default-disabled/owner/expiry/admission guards,
idle entitlement bootstrap without writes, compound parent shapes, exact64
job tokens, one-commit failure, explicit AP/awards, unchanged Manda/pass/peer,
schema2 collected state, End repair and disabled restart. Fixture passes,
awards and zero Manda are authored. Source and HTTP compatibility do not
establish native entry, entitlement pixels, instant dispatch or reward display.

## Configuration and checks

Enable only when the operator has a separately established owner pass snapshot:
`BLUSTONE_DISPATCH_MODE=local-timed`, the existing explicit `BLUSTONE_DISPATCH_POLICY_JSON`, and `BLUSTONE_DISPATCH_INSTANT_MODE=local-entitled`. The constructor/createApp equivalent is `dispatchInstantMode:"local-entitled"`. Default is disabled. No shipped profile or live owner was enabled by this change; the pass acquisition route and its original price remain unknown.

Run `npm run test:dispatch-instant` for compiled quote, instant state/HTTP, ordinary timed state/HTTP and Mirage hold regressions. The native quote projection is a separate tested discovery, not the price of this pass-gated route. Full-suite tests run from the curated `tests/suite.json` using `npm test`.
