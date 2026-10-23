# Original fever animation package restoration

CB0602 exposed a native null CFE4 image lookup in SetFeverLV, with a null
SetVisible receiver. The original +15 seed declares CFE4/CFE3_B, and their
original AT/S2/I2 images are in CFE_PUB.jet. That package was absent from the
139-group selection. Instrumented's fever-cfe4-crash-source-2026-10-23.md
records the exact ARM caller, retained UI owner, original hashes and limits.
The crash alone cannot distinguish initial missing-image construction from
later UI teardown. Bright's healing graph is not implicated by this trace.

The new current-e6-fever-compatible-progression profile retains every setting
and ordered package of current-e6-materials-compatible-progression and adds
only CFE_PUB.jet. It has 140 groups, coherent resource/header/reslist stamp
1634691, above all previous prepared profiles. Existing profiles remain
unchanged. There is no character, progression, reward or combat numeric change
in this profile. The existing explicit --recruit-card 049 choice is retained
at launch. The separately tested Bibi display serial correction is included
when running the latest built server.

CFE_PUB.jet already exists in the public imported asset ledger:
281615 bytes, SHA256
bae718faf6aa7f1b5f6f868ea77db78e3fc8f0770999729fa64dc1b99e4b7f8b.
No private extraction or original payload modification is needed. The
compiled HTTP test verifies the ledger, exact 139-group baseline/settings,
140 manifest rows in order, coherent header, total download length, and the
one-entry 281655-byte PKGI1 package with original payload/hash and exact EOF.
The existing nine-program resource/profile suite also passes with this new
peer profile present. Run npm run test:fever-resources to repeat the focused
build/transport verification.

The original 139-group profile remains available for rollback. The fresh
global stamp causes the native client to refresh all selected groups; this
is an intentional resource migration. Inactive E7/E8/E9 preparation is not
an authorization to enter those Episodes. Future profile preparation must
retain this dependency and choose a newer stamp; do not activate an older
prepared profile solely because its payload audit passed.

Native boot and fever-transition validation are tracked in the latest
continuation entry in AGENTS.md. Serving the correct original bytes alone
does not prove that the null lookup has been fixed. No APK patch or rebuild
has been made for this restoration.
