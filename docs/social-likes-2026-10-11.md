# Native likes: local peer interaction plan

Read-only original ELF audit, pure server helper and authenticated route/store
integration, 2026-10-11. No UI/ADB, Ghidra, external message, live save change
or DataDump write. This restores a concrete peer interaction without guessing social
currency, fuel transfers or invitation/recommendation rewards.

## Exact original request and receipt

**RequestLikeCnt G823c84** takes a target uint64, sends **target_pvid** at
G823e08 to **/relation/GetLikeCnt** at G823f54. **ReqLikeCntCB G82434c** reads
full-response **ret_data** G82453a, **target_pvid** G824546 and **cnt** G82458e.
Target uses paired64-bit conversions; count uses uint32 conversion
(`vcvt.u32.f64` G8245d8, integer low32 load G8245ac). Successful shape:

```text
ret_data:{target_pvid:<real local account ID>,cnt:<received like count>}
```

**RequestToggleLike G8246a0** sends **only target_pvid** at G824824 to
**/relation/ToggleLike** G824970. No requested bool/is_like, amount, price or
intent/nonce field was found in the inspected complete requester. **ReqToggleLikeCB
G824d68** reads **ret_data.target_pvid** at G824f4a and **is_like** G824f92.
Its callback type is void(int,uint64,unsigned char); integer/boolean branches
read the status lowbyte at G824fb0 and float/string branches convert to a
numeric word before byte consumption. Canonical local status is integer0/1:

```text
ret_data:{target_pvid:<real local account ID>,is_like:0|1}
```

The count endpoint's **cnt** spelling is distinct from profile DTO **like_cnt**.
The Toggle endpoint does not use cnt as its callback status. The pure helper
returns exactly these distinct receipts, with separate like_cnt/is_like
projection for existing friend/discovery/brief profiles.

Exact register-matched keys: `social-likes-native-keys-2026-10-11.txt`; bounded
Thumb listing: `social-likes-native-2026-10-11.txt`. Source DataDump original
ELF SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Listing addresses are ELF; G addresses add0x10000. Original file stayed read-only.

## Local interaction policy

`social-likes.ts` stores a pure directed-edge graph: from_pvid owns one like
to to_pvid. Distinct local actors contribute separately to a target's count.
Removing one actor's edge never removes another's. Actual local registration,
same-server membership and mutually nonblocked target scope are required;
unknown/fake presentation identities and different-server interactions refuse.
Self count is readable, but liking oneself refuses. A prior block does not
silently erase a previously earned like; blocked interactions refuse until
unblocked. These are explicit local policies, not recovered original rules.

No original daily limit, cooldown, friendship requirement, recommendation,
fuel gift or reward amount is recovered. No such limit or reward is invented.
The helper does not alter account/game state, create friendship or return an
inventory/currency receipt. Safe-integer IDs and uint32 totals are enforced by
local policy; original IDs are uint64.

**Toggle is deliberately not claimed retry-idempotent.** Two accepted calls
with the same target flip twice. The original requester has no recovered
desired state or unique intent identifier; treating every repeated body as a
retry would suppress legitimate unlike operations. Server persistence failure
must restore the previous graph, but successful response-loss retry behavior
remains limited by this native scalar-only interface. No new protocol field or
timed heuristic is invented to disguise that limitation.

## Server integration

The optional private socialLikes field stays absent on legacy reads. Restore
calls normalizeSocialLikes with the actual local-profile resolver so
unknown/cross-server/duplicate/self edges refuse before exposing state; malformed
source bytes remain intact. Routes authenticate the actor independently from
target_pvid. Planning returns a clone; the service publishes/persists once and
restores its prior whole graph if persistence fails. This restores both target
aggregate and viewer status, including the initially absent legacy field.

Placeholder like_cnt/is_like now project coherently in **friend lists, discovery
candidates and brief peer/self profiles** using socialLikeProjection.
Documented Mail/Arena presentation fixtures remain separate neutral views and
must not acquire a fake like edge. Original game wallets, cards, decks, EXP,
rewards and the relationship graph stay unchanged. Native UI still needs
verification on actual local peers.

## Verification

`npx tsx tests/social-likes.ts` and isolated strict TypeScript checking pass.
Tests cover exact native receipts; distinct-actor totals; viewer-specific
status; owned unlike isolation; numeric identities; non-idempotent toggle
behavior; unknown/self/cross-server/blocked refusals; immutable planning;
JSON persistence normalization; malformed/duplicate/self/unknown/cross-server
edge refusal; and absence of reward/currency fields.

`npx tsx tests/social-likes-state.ts` passes real-route tests: authenticated
count/toggle receipts; spoof/self/fake/cross-server refusal; two distinct actors
contributing and one owned unlike preserving the other's edge; coherence across
friend/discovery/search/peer/own profiles; exact legacy read bytes; restart;
first-write and unlike persistence-failure whole-graph rollback; blocked
interactions without erased earned likes; malformed persisted graph refusal
preserving bytes; and all unrelated gameStates unchanged. Build passes. Native
device interaction remains pending, and root owns activation/final combined tests.
