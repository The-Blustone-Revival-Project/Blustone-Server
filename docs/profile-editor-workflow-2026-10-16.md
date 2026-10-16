# Reconstructed My Info profile editor

Enable the optional local replacement before starting the server:

```powershell
$env:BLUSTONE_PROFILE_MODE = "archive-profile-projection"
npm run build
npm start
```

Default is disabled. Enabled mode advertises my_info in launcher and login URL
lists. The native client obtains a web token through /pv_account/get_token,
formats the supplied URL, and opens the page in its existing Android WebView.
This implementation restores nickname and introductory status editing. Avatar,
country, SNS/account management and the original hosted page remain incomplete.
The replacement page currently uses English copy.

## Original and local contracts

Original OpenMyinfoView formats three strings in order: web token, available
SNS list, lowercase language. The local server chooses address/webview/my-info
and query template ?web_token=%s&sns=%s&lang=%s; original server query names
were not recovered. The page authenticates the unique token owner, ignoring
foreign pvid selectors. Its JSON POST /webview/my-info/update is a local backend
route, not a claimed original profile API. It only accepts nickname/status data.

The previously mocked token response omitted ret_data.token. The corrected
response supplies the actual persistent account web token there; legacy top
aliases remain separate. Native name confirmation reads ret_data.nick_name.
Confirmation now validates text, rolls back failures, skips equal writes and
returns only the needed nickname subtree, avoiding game/resource refresh.
After profile-edit history exists, changed names must use the editor so the
confirmation route cannot bypass captured rename fees.

The original Java interface is window.VSWebViewBridge. Explicit Close calls
SetData(JSON.stringify({result_code:1,action_type:0,ret_data:{}})) then
CloseView(). Native close handling refreshes self through UserPool, then copies
nickname, profile URL, status and country into CPVDataMgr and the popup. This
is source-proven; no Android execution is claimed. Browser fallback displays
that the page may be closed. Saving does not close the page automatically.

## Historical text and payment policy

An undated original profile screenshot, newly transcribed in DataDump batch12
line44/idx593, says first nickname modification is free and later changes cost
100 Manda, with status up to50 characters. Final-version applicability and
original nickname length, uniqueness, normalization and country rules are not
proved. This optional mode projects that historical policy.

LOCAL validation uses lossless UTF8, no C0 controls, status50 Unicode codepoints
and nonblank nicknames up to128 codepoints. Case and outer whitespace remain
unchanged. Status may be cleared. No original uniqueness rule is invented.
The first actual editor rename is free, later actual names cost100; merely
changing status does not consume the free rename. Free-first Manda spending
is local policy. Same-name/equal retries do not charge or write; a different
subsequent name is a distinct paid operation, without an invented nonce.

Display text uses canonical STRING profile_status in login and brief relation
responses, and propagates through friend/discovery rows. Native conversion
also accepts numbers as decimal text: the former numeric0 yielded message'0',
not a recovered status enum. Detailed Hunter-party DTOs and Arena win/lose
messages are separate. Existing chat sockets may retain their handshake name
until reconnect; no new chat rename event is invented.

## Persistence and verification

Name, status, rename count and Manda persist together. Failed write/rename
restores exact prior account fields, settings presence/reference and wallet.
Reads and no-ops use existing loaded state without AP/BP recovery or game
allocation. Escaped HTML/script data, no-referrer and a restrictive CSP protect
the local bearer-token page from accidental interpolation or external loads.

The first actual profile edit uses save schema7. Mandatory quest/dispatch
arrays, Arena messages, bait purchase counters and existing linear journals
survive restart and later unrelated writes. Older readers reject7 rather than
silently dropping rename history. Editor-unused accounts retain schemas1..6;
disabling the editor preserves captured profile data and normal brief text.

Pure and production-state tests cover Unicode, repair of malformed legacy
names, account isolation, source-bound policies, same-name no-ops, insufficient
funds, fee-bypass refusal, real .tmp/rename failure, prior metadata schemas,
corruption and restart. The compiled disposable proof runs:

```powershell
node scripts/verify-independent.mjs --fixture --exercise-profile
```

It verifies native encrypted token acquisition and URL metadata, plain page and
JSON editing, free/paid renames, peer-safe self refresh and login status,
schema7, no-op bytes and process restart. Disabled baseline omits my_info.

An actual browser interaction with a disposable account saved Aurora Captain
and Ready for the next expedition., displayed Changes saved., left the first
rename free and changed the next price to100 Manda. Local screenshot:
local/profile-ui-saved.jpg. The helper server was stopped; cleanup of its
disposable temporary folder was blocked by automatic approval review.

The page, bridge callback order and backend are tested. Actual instrumented
Android WebView entry/close remains pending the existing BlueStacks input hold.
No live profile, private save or APK was changed; no client release is owed.
See profile-native-contract-2026-10-16.md and
profile-webview-bridge-2026-10-16.md for exact immutable source locators.
