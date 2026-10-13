# Complete Mirage cache decoding and preserving unsupported End

The server now has a pure complete Mirage cache decoder, exact64 JSON/wire
support and a separately declared local combat-readiness check. It does not
publish new GetInfo snapshots, initialize runs, grant enemies/owned entries,
assign floors, settle HP, pay rewards or claim playable native Mirage.

All five components are explicit: entry, inst_base, inst_enemy, ref_stair and
ref_hero. Required fields never default. Plain own data fields, dense arrays,
lossless strings and numeric domains refuse malformed input. Maximum entry/
stair/postfix/hero collections100 and deck/enemy collections5 are LOCAL bounds,
not original catalogue limits. Supplied snapshot data is detached. Base and
hero/stair fields use their recovered signed32 widths; new_record is a
canonical0..255 byte, not an unchecked uint32 alias. Entry ID is effective32,
entry HP uses canonical signed32 bits, while base deck retains exact uint64.

Enemy correction: the complete original parser reads hp_percent signed32,
ref_id string, rank/progression/EXP and five skill levels uint32. It does NOT
read the older documented n field. Extra n, own instance IDs, equipment/stat
objects or missing HP refuse in this exact schema rather than looking like
a reconstructed server enemy. Enemy clones use published ordinary Hunter
references; their stats/art/projection remain separate dependencies.

parseMirageCacheJson captures unsafe numeric64 tokens before Number rounding;
mirageCacheWire emits full numeric64 tokens through JSON.rawJSON. Unsafe
already-rounded JavaScript numbers refuse. Ordinary strings with leading
zeros, fractional/noncanonical IDs and wide entry aliases refuse. Full64
deck parsing is distinct from the entry updater's highword-zero lookup.

Native carried full health is10000. mirageHpRatio performs signed→float32→
division10000; raw1000 is float32 approximately0.1, not1.0. No live/bootstrap
card is auto-healed or migrated: existing1000 is a historical LOCAL placeholder
and not evidence of native entry membership. Native stair balance uses signed
float32 multiplication by original word0x38d1b717 (approximately1/10000).
Found balance0 really scales to0; it is not the lookup-miss default1.0.
Decoder/math preserve raw signed states; numeric validity alone is no run law.

requireMirageCombatCache needs independently established complete ownership/
entry/HP commitments, known hero IDs, proved resource/dialogue bindings, actual
clock seconds and a supplied enemy projection validator. Exact entry membership
and raw HP must match that complete record. It never infers membership from an
ordinary deck or1000 defaults. Selected deck is unique, living and one copy per
reference; highword entry aliases refuse. The current supported local subset
requires positive floor/one-based selected stair, state1, positive selected
balance, grade0..3, nonempty resolvable postfixes and a living supported enemy
camp. HP0..10000 is supported local normal-health admission, not a proved native
clamp. Hero deadlines must satisfy end>=current local seconds. Resource checks
include base background, postfix game resource and prefix+postfix stair resource.
The enemy predicate receives a frozen detached row and cannot mutate the retained
validated cache. Schema/lookup/predicate success does not authenticate provenance.

This check covers the supported current combat subset. It does not prove all
future stair/reward art, rotations, empty-hero UI safety or native scene rendering.
Original MIRAGE.jet is present and has30 decoded image entries; the bounded
listing exposed opaque names, not enough to certify specific postfix strings.
No pack-presence-to-resource-name or artwork-to-encounter inference is made.

Unsupported `/mirage/End` now returns a non-success body with neither ret_data
nor data, including account failure and the global NativeAuthError wrapper.
This is a required exception to generic failure envelopes: the actual callback
tests ret_data key EXISTENCE after its failure/retry path and can still apply
captured enemy HP, state/deck and quest cache parsers on result_code2001.
Null is not a proved neutral subtree. Key omission skips those writes. Its
caller separately checks actual result code and follows error UI; byte1 alone
does not indicate success. No successful preserving echo or End settlement is
invented. Source-backed cache-write avoidance is distinct from native UI testing.

Tests cover complete component domains, signed raw preservation/HP math,
exact64 round trips, callbacks/data getter isolation, ownership and readiness
refusals, actual HTTP/account/transport error shapes and unchanged persisted
carried state. Fixtures are authored offline symbolic data, never original
floors or live owners. No client/APK rebuild, profile activation or private-save
write. Original and DataDump remain read-only.

Next work toward persistent Mirage must admit real or explicitly configured
complete run/catalogue resources and bind registered parties/HP, then implement
End/advance/reward/revive/retry laws with atomic persistence and source-shaped
receipts. End includes no explicit win flag; all-zero rounded HP cannot alone
prove a unique original outcome. Parse_End does not advance floor/stair. No
guessed /mirage/Begin endpoint may substitute for the cached-scene entry path.

Evidence: mirage-supplied-cache-schema-native-2026-10-14.md,
mirage-end-carry-transition-native-2026-10-14.md,
mirage-cached-combat-entry-native-2026-10-14.md.
