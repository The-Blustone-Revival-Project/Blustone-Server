# Profile editing WebView and historical screen observations

The optional local profile page restores nickname and status editing. It uses
the original WebView bridge to close and refresh the native profile. Its HTTP
GET/POST paths, query parameter names, authentication policy and persistence
schema are local revival contracts, not recovered original web endpoints.
No original avatar chooser, country editor or account-binding action is added.

## Historical screen evidence

Read-only DataDump source:
`findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-12.tsv`,
line44, idx593, `image-024d7b6b06f1906b.png` (1536x2048), high-confidence manual
transcription. File SHA256:
`71f91a76f0d19d9b95a25b4e9ebb20c0bf2f1f73d088227122df5152e3ea2bb5`.
The Profile screen says the first nickname modification is free and subsequent
modifications cost100 Manda, with status messages up to50 characters. It also
shows a country change-once rule and Link Accounts; those actions are outside
this restoration. The capture filename is undated. This is one historical
observation, not proof of final2.8 economics, original nickname limits,
uniqueness rules, or how an old account's prior changes should be inferred.

`batch-39.tsv` lines43/44, idx1942/1943, filename dates2017-07-28, show player
profiles with Edit Information and introductory text alongside level,
registration date, team strength, league points and recent area. SHA256:
`5c10e65172e86d62ec4eeb7c1dbb77b6fef4dd7335b5e828f8fff85b8026012a`.
Fight Club introductory messages are a separate surface: batch08 line22
idx371 and batch47 line28 idx2327 explicitly show a100-character limit.
The profile50 limit must not silently replace Arena message policy.

## Original Java bridge

DataDump retains the original-APK JADX export at
`local/archive/analysis/jadx/sources/com/vshower/rann/RMWebView.java`.
This is a local archive export, not a tracked public Java source file and not
a private phone-cache capture. Its SHA256 is
`fdd4d33ccf137ea98f0391a90d722d1cf93e9531289b5e37873c66826eb42882`.

- Line645 registers the JavaScript interface as `VSWebViewBridge`.
- Lines288-289 expose `SetData(String)` and retain its exact raw string.
- Line276 exposes `CloseView()`, scheduling closure on the UI thread.
- Lines560-565 enter the closing state and load `about:blank`; onPageFinished
  lines360-371 removes the overlay, calls `NativeCB(savedString)`, then changes
  to closed state4. A new open resets the saved string at line595.

The local page therefore saves through its authenticated HTTP endpoint, then
only on explicit Close calls, in order:

```js
window.VSWebViewBridge.SetData(JSON.stringify({
  result_code: 1, action_type: 0, ret_data: {}
}));
window.VSWebViewBridge.CloseView();
```

Java does not interpret JSON or mutate profile fields. The native
`CPVAccount::MyInfoWebViewCloseCB` consumes the action. The recovered action0
path refreshes the own user-pool entry; callback Gd2348c copies brief
`nick_name`, `profile_url`, `profile_status` and `country_code` into CPVDataMgr
and the popup. This does not license arbitrary action values or SNS actions.
Published native strings corroborate JNI entry names at
`sources/native/strings/native-all-strings.tsv` lines38805/38806 and
`action_type` at line440083. That file's SHA256 is
`4fff32f5218ed6104200b8236a8c439248747366cca82056c6200081338269b7`.

## Original URL boundary

Native `OpenMyinfoView` Gd2128c finds key `my_info` at Gd212ae/Gd212b0 and uses
the URL_INFO address at+0 and param_format at+0c. Its CMFormat call Gd213f4
passes exactly three string arguments in this order:

1. Web login token (`GetWebLoginToken` G7e10e6).
2. Available SNS list (`GetAvailableSNSTypeListString` G7e3200).
3. Lowercase language: ko/en/ja/zh/zh-hant.

Gd2141a appends the address; Gd2142a calls `OpenWebViewMyInfo` G7c4f88.
The original query parameter names are unrecovered. The revival's
`?web_token=%s&sns=%s&lang=%s` is explicitly local. Likewise
`/webview/my-info/update` and JSON `{web_token,patch}` are local contracts.
The original `/profile/` string belongs to image-cache/path handling and is
not evidence of an editing API. Web login token response consumption requires
strict `ret_data.token`; account/auth integration is owned by ServerState.

## Local planner and page behavior

`profile-settings.ts` admits lossless UTF8, refuses C0 control characters and
counts Unicode codepoints. Status accepts empty text and at most50 codepoints.
Nickname admission is LOCAL: nonblank and at most128 codepoints, preserving
case and outer spaces. No original nickname length or uniqueness is claimed.
An explicit valid nickname patch can repair a legacy name outside these local
limits; leaving such an invalid nickname unchanged still refuses validation.
Only string patch keys `nick_name` and `info_message` are admitted; clients
cannot assign rename history or prices. Each wallet word and rename counter
must fit uint32. Actual first rename costs0; later actual renames cost100,
using LOCAL free-Manda-first spending. Status changes never advance the rename
counter or incur a fee. Equal/empty patches do not create a settings record;
a first status change creates count0. Rename overflow and insufficient funds
refuse before any mutation. The returned settings are detached.

`profile-page.ts` renders a mobile page with no external assets. Text,
attributes, script JSON and tokens are escaped for their output contexts.
Save uses XMLHttpRequest JSON POST to the local endpoint, applies the returned
view and remains open. Explicit Close uses the bridge above; an ordinary
browser shows a close-page message without external navigation. No platform
account, avatar or country controls are presented.

The pure test exercises real JavaScript handlers in an isolated VM with a
fake DOM/XHR, including POST body, successful refresh, busy-close refusal,
bridge call order, browser fallback and codepoint limits. It also covers
historical pricing, status-only edits, exact-case/space changes, missing/equal
record no-ops, wallet/counter refusals, detached plans and script/text escaping.
This is not a native UI or live save validation claim. The caller must apply
the complete plan and account metadata atomically and restore them on a failed
durable write; the pure helper performs no persistence.
