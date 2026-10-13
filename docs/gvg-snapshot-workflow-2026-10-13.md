# GvG supplied snapshots and native reward lookup

`src/gvg-instance.ts` validates a complete supplied successful GetInst envelope.
`parseGvgInstanceJson` reads capture text and preserves full64 commander integer
tokens before JavaScript can round them. The detached model stores commander
as a canonical decimal string; this is exact identity storage, not an assertion
that a native wire string has identical conversion behavior. A future producer
must serialize that identity as an exact numeric token where appropriate.

Battle cards use ref_id, signed level/overcome/CP, unsigned rank/awakening fields,
fifteen flat stat strings and string-encoded skill arrays. Stat strings are
preserved without scaling; finite decimal float32 admission is a local supported
subset. No owned inst_id, inferred Hunter inventory join or default stat exists.
Optional enemy_camp_id/remain_hp absence remains absent. Native fresh CARD uses
remain_hp10000, but that constructor behavior is not inserted as a producer row.

Deployment camp/order and all four slots remain strings, including explicit
empty slots. Wire card order is retained; native cache insertion reverses it.
The decoder does not sort, deduplicate, authorize commitments, or convert deck
slots into owned identities. It admits explicit bytes0..255 for both flags,
without assuming boolean semantics or silently truncating larger values.

Missing top-level sections, user fields or collections refuse. Explicit empty
collections are available for offline inspection, not asserted safe for a live
scene. This distinction matters because the actual GetInst callback replaces
the entire cache with a freshly parsed snapshot, even without a success guard.
There is no partial merge or fabricated unregistered response. Plain JSON data
descriptors are required before accessing envelope fields or nested records.

`src/gvg-reward.ts` provides `gvgRewardAt` over the complete independently supplied
GetRef grammar. It checks signed32 CP and follows native first-wire-match
`min_cp <= CP < max_cp`. It neither sorts nor treats max_cp=-1 as an unlimited
tier. Empty tables and misses return undefined. The selected row is detached;
lookup never changes CP, participation, wallets, claims or reference data.

Tests use authored offline snapshots only: exact64 capture preservation and
rounded-input refusal, string skills/stats/deck selectors, signed/unsigned/byte
domains, optional absence, detached values, missing fields, accessor/inherited
refusal, overlap order and reward interval boundaries. No original populated
GvG instance, schedule, numerical table or reward quantity was recovered here.

Neither helper is imported by ServerState or activated on a game route. GetRef
failure positively skips reference parsing; complete entry/field/result scene
requirements remain unclosed. Restoring visible GvG still requires established
instance and reference data plus scene/commitment validation. Live flags, saved
profiles, game inputs and the instrumented APK remain unchanged.

Source evidence:
- gvg-instance-card-deployment-native-2026-10-13.md
- gvg-reference-read-cache-safety-native-2026-10-13.md
- gvg-entry-instance-cache-native-2026-10-13.md
- gvg-reference-wire-shapes-native-2026-10-13.md
