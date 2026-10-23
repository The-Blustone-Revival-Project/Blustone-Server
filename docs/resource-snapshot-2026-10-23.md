# Opt-in app-owned immutable resource snapshot

Set `BLUSTONE_RESOURCE_SNAPSHOT=1` before creating an app, or launch with
`node scripts/start-local.mjs --profile NAME --resource-snapshot`. The
PowerShell wrapper accepts `-ResourceSnapshot`. This is an explicit operator
override; no checked-in profile, live server, resource stamp or game is changed.
Default behavior remains the existing dynamic resource rebuild on requests.

The first request that actually needs selected resource data builds one lazy
snapshot for that app: raw JET buffers, emitted package buffers, manifest bytes,
source modification dates and the resource configuration used to build them.
Diagnostic reslist text overrides can return without building a snapshot.
Only resource-related environment keys are captured; authentication, transport
sessions, accounts and gameplay state are not cached by this feature.

This mode assumes the reviewed hash-pinned resource profile and original files
are immutable during the build. After the snapshot is built, changing any
resource file, selected package, folded asset/tree, package mode or resource
stamp requires **a new app/process**. There is no automatic invalidation,
per-request source rehash or cross-app cache. A different app owns a separate
snapshot and sees the new bytes/configuration on its first build. The opt-in
itself is selected when createApp runs; resource build settings are captured
when its first successful resource snapshot is constructed.

Raw bytes are read once for retained sources and reused while packaging, so the
manifest's inner MD5 and raw JET route agree with the emitted package's source.
The outer MD5, size and package response come from that exact retained package.
Only the selected package/folded-tree coverage is retained. PKGI1 generally
needs both raw and container payload buffers, approximately twice selected raw
bytes plus packaging/tree overhead; this spends RAM to remove repeated disk,
container assembly and hashing work. It does not load every recovered asset or
retain a new copy for each request. Unwrapped packages reuse the raw buffer.

`/debug/reslist` body and sequence overrides remain app-owned and mutable.
Existing resource header/bootstrap overrides retain their precedence; after a
snapshot exists their environment defaults belong to its captured epoch.
Raw-file routes preserve file-style suffix/combined-range, invalid/multiple-range
fallback, conditional GET and If-Range behavior. Wrapped-package routes retain
their existing stricter range grammar and forced206 diagnostic setting. The
snapshot does not turn a failed/unsupported game request into cached success.

Raw-file preconditions follow the installed send implementation: If-Match
(including its weak-tag/list comparison) takes precedence over
If-Unmodified-Since. A failed precondition returns412 before range parsing;
a fresh matching If-None-Match/If-Modified-Since returns304 before even an
unsatisfiable Range is considered. This applies to both raw JET and unwrapped
package routes. Wrapped-package semantics remain unchanged.

## Verification

`resource-snapshot-http.ts` passes real disposable HTTP off/on comparisons:
manifest/raw/PKGI1/folded bytes and MD5s,200/206/416 responses, suffix/open/invalid/
multiple ranges, stale If-Range and conditional304 behavior, changed source
files, independent app/config/stamp epochs, lazy construction, debug overrides,
new-app visibility and unchanged game/auth summary. Files are authored fixtures
under one temporary directory; no originals or live saves are edited.
TypeScript `--noEmit` passes. No dist build was performed by this lane.
The additional precondition-order tests use Node HTTP directly so fetch cannot
silently add request no-cache headers and mask the expected304 branch. They
assert exact off/on status, bytes, Content-Range/Length/Type for412/304 and
successful weak/list/wildcard ETag and date cases, including contradictory
conditions and unsatisfiable ranges.

The bounded actual170-profile A/B used separate disposable loopback listeners
and the same source runtime, sequentially off then on. Measured client HTTP
round trips, milliseconds:

- Default: first manifest1142.77;16-byte package range1172.22;
  second manifest1481.23.
- Snapshot: first manifest1314.84;16-byte package range21.20;
  second manifest6.91.

Both modes returned identical170-package manifest bytes and the expected
PKGI1 header. First snapshot construction still bears the assembly/hash cost.
These observations include local scheduling, HTTP and GC; OS caches were not
controlled. They are not cold-I/O measurements, a peak-memory benchmark or
proof of native download acceleration. No active8080 process was restarted.

`npm run test:resource-snapshot` builds and runs the semantic HTTP test plus
the bounded A/B. The A/B reports timings rather than imposing flaky thresholds.
Native validation of faster loading belongs to the runtime owner after a
deliberate restart; enabling this source change alone does not alter a running
app or establish native performance.
