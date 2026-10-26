# Clean-install compatibility and the reported empty-value assertion

Read-only source audit; no APK build/patch/install, live input/restart, state or
original/DataDump change, external publication or messaging occurred.

## Keep the two reports separate

**Matthias** explicitly described a **stock2.8.0.1 APK plus mitmproxy** setup.
**Stinger** provided the screenshot and discussed rebuilding native code, but
the APK currently producing that screenshot is **unspecified**. Do not silently
attribute Stinger's assertion to Matthias's stock installation or claim that
both installations have the same APK/cache/server profile.

The screenshot, as independently inspected by the root agent, shows **Prepare
for Battle / Snowfield–First Expedition**, AP50/50 and an assertion displaying
**`!sVal.empty()`**, before Begin Battle. It is not a missing-texture toast.
The screenshot alone identifies neither the failing DB key nor the server
response that led to it, and does not establish missing/corrupt CDN assets.

## Exact native attribution: Put rejects an empty VALUE

The immutable original ARM library SHA-256 is
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra addresses below equal ELF code file offset plus `0x10000`.

* Literal **`!sVal.empty()`** is at ELF`0x1d5756f` / G`0x1d6756f`, beside
  the original `.../Juice/GMLevelDB.cpp` source path and `!sSubKey.empty()`.
* Its positive literal xref is **LDR G794cfc / ADD G794d04**, inside
  **`CGMLevelDB::Put G794c90`**, not a GetString/GetJson value getter.
* The three string references arrive in `r1/r2/r3`; the value in `r3` is saved
  as `r5` at `G794ca4`. The native libc++ short/long string length is read at
  `G794cf0..G794cf8`. **`G794cfa` skips the assertion only when nonempty.**
* On empty value the call sets condition false at **`G794cfe`**, source line
  **`0x3f=63`** at `G794d02`, and calls **`_RMAssert G10c3abc` at `G794d0a`**.
  The preceding empty-subkey check is a different branch/source line62.

This is a nonempty **local database write-value precondition**, not itself a
proof that a texture, monster definition or CDN package is missing. A bounded
direct-Thumb-BL scan found many Put wrappers for local/user settings,
selections, notifications and other state; no unique battle-preview producer
can be selected from the screenshot without its caller/key evidence.

## Direct instrumented counterproof

Instrumented `tools/patch-native-ui-animation.py` explicitly contains:

```
GM_LEVELDB_PUT_ASSERT_OFFSET = 0x784CFE
GM_LEVELDB_PUT_ASSERT_EXPECTED = 0020  # MOVS r0,#0
GM_LEVELDB_PUT_ASSERT_PATCH    = 0120  # MOVS r0,#1
```

That ELF offset is **the exact G794cfe condition instruction above**.
`tools/verify-native-patches.py` calls it **“GMLevelDB Put assert -> non-fatal”**
and validates the normal versus `--keep-asserts` bytes. The build also supports
global assertion reporter/nontermination variants for diagnostics.

Consequently an instrumented run getting past this assertion does not prove
that it never attempted an empty value. A stock or differently rebuilt library
can surface a precondition the diagnostic client deliberately allowed through.
This audit does **not** recommend silencing assertions as a repair. The actual
producer must be identified so its input/lifecycle can be corrected faithfully.

## Stock plus proxy is not automatically equivalent to instrumented+15

The checked-in Instrumented version is2.8.0.1+15. Its source/release history
documents functional compatibility changes in addition to logging:

* `Telemetry.install` restores a missing `files/local/UI_MAIN.jet` from the
  byte-identical bundled offline asset before native startup.
* It installs the offline **UI_XML_RO.db seed before native LevelDB handles
  open**. This preserves the working locale trees and includes verified EN
  launcher/progress, mission/battle and six Episode-layout repairs. Unsafe
  EN/DEFINE_COLOR aliasing is intentionally excluded.
* The native copy redirects the retired bootstrap host. A proxy may replace
  that routing function, but doing so does not apply the other changes.
* The native copy includes the BlueStacks/Houdini menu-video fallback,
  LoadAnim2/null-tutorial-animation handling and missing-animation assertion
  changes, plus later scoped Search/Gym guards. These are not all asserted to
  be necessary on every stock device or to explain this particular screenshot.
* +15 corrects the instrumented bootstrap CDN table/manifest compatibility and
  supplies a narrowly hash-gated pre-native migration for the **specific
  previously diagnosed instrumented cache**. Unknown snapshots are preserved.
  This is not evidence that a fresh stock cache has that corruption, nor a
  general stock-cache repair recipe.

The current Server's tested native path has used the instrumented client.
Default `current-e6` resource selection is139 groups/stamp1634683; having the
full original asset corpus on disk does not mean every asset is advertised or
downloaded. Broader prepared profiles are explicit selections.

Server `packageTreeEntries` treats UI database groups specially only when
explicitly selected. For E_NEW its tree walk deliberately excludes arbitrary
UI_XML_RO.db files; ordinary asset folding admits selected JET files. Thus
“the same CDN package names” does not establish that the stock client's
pre-native local UI database equals the instrumented seed. An eventual
server-only stock bootstrap requires independent clean-install validation.

Since the screenshot already reaches Prepare for Battle, do not assert that
the early launcher EN layout or BlueStacks menu-video issue is **this** crash.
The exact Put assertion is the stronger current evidence. A clean stock+proxy
flow is not certified equivalent, but this audit also does not prove that stock
revival is impossible without a client patch.

## Focused diagnostics to request from the matching reporter

Ask Stinger to identify the APK actually producing the screenshot independently
from Matthias's stated stock setup. Useful bounded evidence is:

* APK source, package/version/versionCode and APK SHA-256; if rebuilt, native
  library SHA-256 and which compatibility/diagnostic options were included.
* Emulator/device model, Android version and ABI, selected game locale, exact
  last action, and whether the assertion appeared before or after Begin Battle.
* Full assertion text including source filename/line, and logcat/native
  backtrace covering that first failure if available. A safe diagnostic showing
  **Put key/subkey and caller** is decisive; the empty value itself need not
  expose account/private database contents.
* Recent matching proxy/server requests and responses around preparation,
  especially GetCard/GetMonster/GetArea/GetStage and subsequent preview calls,
  with route/status/ordering and relevant public reference fields. Redact OTP,
  vs_token, access tokens, signatures, cookies and other credentials.
* If investigating CDN distribution separately: that run's chosen profile,
  reslist stamp/count, requested package/status/length, and manifest inner/outer
  MD5 comparison. The manifest's six-column record separates original entry
  hash from whole-package hash; a200 alone is not byte verification.

Do not request private account/LevelDB dumps, clear app data, reinstall over an
original installation, or change assertions merely to get beyond the modal.
There is not yet enough evidence to blame a particular empty server field,
recommend an asset alias, or declare CDN distribution the root cause.

Source references: Instrumented `src/Telemetry.java`,
`tools/build-instrumented-apk.py`, `tools/patch-native-ui-animation.py`,
`tools/verify-native-patches.py`, `RELEASE-NOTES.md`, `VERSION` and
`releases/index.json`; Server `src/server.ts` package-tree handling,
`scripts/start-local.mjs` and the explicit resource profiles. Native Put body
and its literal/line/patch match were decoded from the immutable original.

## Distribution audit and local installation repair

The currently published Server release is v1.1.0 (2026-10-11). Its attached
Blustone-Server-Resources-1.1.0.zip is1,113,549,668 bytes with SHA256
`8bee83d69c5105aedcfa834c789ff039009dc047aa0e139c5641548322df3ae1`.
The retained local resources-e6.zip has that exact public download digest.
All968 ZIP members were streamed and verified against the current manifest:
exact names, unique entries, sizes and SHA256 for1,113,400,848 payload bytes.
The release and current manifest inventories match. All packages selected by
139/170/280 profiles are in that bundle; none requires an undistributed extra
local asset from this scope. A different stock request or device-private seed
is not ruled out by this bundle comparison.

Git and the Docker image intentionally omit resources/runtime. The README
previously put resources:verify before import and discussed a private migration
save as if it were a prerequisite. Bare node dist/src/server.js also selected
the historical two-package protocol fixture when no resource selection was
provided. These are concrete installation/configuration traps, separate from
the screenshot's exact empty-value write.

Local changes now provide npm run setup: verify existing files, otherwise fetch
and hash-check the pinned existing public ZIP, validate every member, and install
without replacing differing resources. An offline --bundle option uses the same
pin. Downloads stage atomically; concurrent partials and existing destinations
are preserved. Resource file publication is exclusive and interruption-safe.
No state/configuration/private snapshot is imported. README now puts this step
first, separates fresh accounts from upgrade state preservation, explains the
Docker mount and explicitly separates stock from the Instrumented client.
Unconfigured executable startup refuses with actionable instructions; explicit
resource selections and programmatic protocol fixtures remain supported.

Validation:13 installer fixture tests, including a real loopback download,
archive/path/hash/conflict/interrupt/concurrency checks; compiled startup guards;
existing host setup verifies968 files with no download; full262 runtime test
programs pass. Resource preflight regression passes. No Docker build, live
server/app restart, real-account write, new APK or release publication occurred.
The new setup command belongs to the changed source tree and is not present in
the older v1.1.0 source archive until a subsequent Server release includes it.
For existing releases the equivalent supported path remains manual download,
python scripts/resources/bundle.py import ZIP, then npm start.

Public references:
- https://github.com/The-Blustone-Revival-Project/Blustone-Server/releases/tag/v1.1.0
- https://github.com/The-Blustone-Revival-Project/Blustone-Instrumented/releases/tag/2.8.0.1%2B15
