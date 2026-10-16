# Player profile native contracts (2026-10-16)

Read-only bounded ARM inspection of the original final client and published
DataDump source. No original library, live account, UI, client or DataDump was
changed. Original `libnative_core.so` SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses are code ELF plus0x10000. Vtable coordinates below are explicitly
ELF virtual addresses; this ELF's writable segment has file offset VA−0x1000.

## Native nickname confirmation

`CPVAccount::RequestConfirmNickname G7c3d50` posts exactly
`/account/ConfirmNickname`. Its form has app_code, app_ver, market, platform,
pvid, otp and **nick_name**. The name argument is a native string; there is no
native request key nickname, profile status, desired currency or price. Exact
name literal LDRG7c3ece / ADDG7c3ed0; route LDRG7c4006 / ADDG7c4008.

`ReqConfirmNicknameCB G7c43fc` requires PVParseHTTPResult G830a00 result1
(G7c4424/4428), then body result_code1 (G7c444a..4482). It selects
ret_data.nick_name atG7c4484..4492, decodes a string atG7c44a0, calls
CPVDataMgr.UpdateNickname G7e0f62 atG7c44aa and UpdateNicknameConfirm(1)
G7e0f90 atG7c44b4. Its callback receives integer1. A compatible minimal success
is `{result_code:1,ret_data:{nick_name:ACCEPTED_STRING}}`.

This establishes initial confirmation behavior, not the original service's
paid rename price, uniqueness rules, length bounds or future rename policy.
Input admission and any local rename allowance must be labeled LOCAL. The
previous replica handler accepted arbitrary String coercion and changed the
account before persistence. An injected failure in a disposable memory-only
ServerState confirmed that the name remained changed after an exception.
Persistence rollback and no-op handling are warranted independent corrections.

## Canonical strings versus permissive native conversion

Important correction to earlier shorthand: `from_json<string> G728b08` is
**not a strict JSON type gate in this binary**. Its type dispatch G728b1e..b26
copies a JSON string atG728b30..b48; signed/unsigned integer and double branches
atG728b4e/5a/66 format numbers as strings. Other/default types produce an empty
string atG728ba4..bdc. This same helper is used by nickname confirmation, web
token, relation brief fields and login profile status. Canonical server replies
should supply actual strings; a numerical fallback is not the intended field
meaning. Do not claim native rejection of all non-string inputs from the
mangled helper name alone.

`CPVDataMgr::ParseLoginResult G7e2784` positively treats **profile_status as
text**, not a numeric flag: key LDRG7e2e5a / ADDG7e2e5e, lookupG7e2e68,
string helperG7e2e76, destination CPVDataMgr+84 atG7e2e7c/7e and final string
assignment G7e2ec8 onward. A numeric0 reply is converted to textual0 by the
helper; its historical successful boot does not prove a numeric status enum.
Publishing an account's saved information message as a profile_status STRING
on login restores that same native field. Empty string is the neutral message.
Country code and profile URL immediately precede it and populate CPVDataMgr+90
and+78 respectively. Nickname populates the separate CPVDataMgr+60 string.

## Opening the MyInfo WebView and obtaining its token

`CSRPopUpMyInfo::OpenWebUserInfo Gd21010` checks CPVDataMgr.GetWebLoginToken
G7e10e6 (Gd21030). If nonempty, it directly opens MyInfo (Gd21044). Otherwise
it calls `CPVAccount::RequestWebLoginToken G7c20a8` atGd2109c. The request has
seven fields app_code, app_ver, platform, otp, pvid, market, callback, and posts
`/pv_account/get_token`. Exact callback key LDRG7c219e / ADDG7c21aa;
route LDRG7c231e / ADDG7c2320. This MyInfo caller passes the current account OTP
and an empty callback string; no JSONP wrapper is implied by the field name.

`ReqWebLoginTokenCB G7c28c0` reads body result_code and on1 selects
ret_data.token atG7c299c..29ae, converts to string atG7c29be, and checks
nonempty G7c29d0. It calls CPVDataMgr.SetWebLoginToken G7e10ac atG7c29e2.
The MyInfo token callback Gd21288 directly continues into OpenMyinfoView.
A proper success supplies nonempty canonical `ret_data.token`.

`OpenMyinfoView Gd2128c` calls GetURLInfo G7e0ecc with exact key **my_info**
(Gd212aa..2b0). URL_INFO+0 is the address and+0c the parameter format.
The address must be nonempty; otherwise a native assertion branch exists.
It invokes `CMFormat G78cac4` atGd213f4 with:

1. URL_INFO.param_format as the printf-style format string (Gd2134e..35a).
2. CPVDataMgr.GetWebLoginToken (Gd21362), first string argument.
3. GetAvailableSNSTypeListString G7e3200 (Gd21378), second string argument.
4. Lowercase language from the native table, third string argument: ko, en,
   ja, zh, zh-hant. Table ELF VA2164f08/file2163f08.

It concatenates the supplied address and formatted suffix atGd2141a, then
calls OpenWebViewMyInfo G7c4f88 atGd2142a with the popup listener at+9c.
The original address and literal query-field names are SERVER DATA, not
hardcoded in this path. A local page can supply a compatible local address
and a three-string parameter format in this proven argument order; that does
not recover the original website URL/query vocabulary.

## Closing the page and refreshing the actual native profile

`CPVAccount::OpenWebViewMyInfo G7c4f88` registers its listener+f8 and opens a
CMWebView with a string callback. `MyInfoWebViewCloseCB G7c525c` parses the
returned string as JSON (G7c532c), selects result_code, action_type and
ret_data (G7c53a0/5414/5460). Its exact TBB dispatch atG7c5470/table5474 is:

- 0 and1: listener PVMyInfoViewClose, targetG7c548c or5516.
- 2: Login callback (+8), targetG7c5498; parses login fields on success.
- 3: BindInfo (+c), targetG7c54b6.
- 4: BindSNS (+10), targetG7c5522.
- 5: UnbindSNS (+14), targetG7c54d6.
- 6: no-op, targetG7c547e.
- 7: Logout (+1c), targetG7c54e6.
- 8: Unregister (+20), targetG7c5506.
- 9: Switch (+24), targetG7c5532.
- Out of range: Close, targetG7c5516.

Thus `{result_code:1,action_type:0,ret_data:{}}` is a compatible ordinary
close-result string. No invented profile-edit action enum is needed.
Native `RMWebView.NativeCB G110399c` receives a Java string, copies its UTF8
bytes to CRMWebView+0c atG11039d2, and schedules the registered callback.
`CMWebView::CallBack G78fef0` copies that returned text and invokes its closure
atG78ff40. The browser JavaScript API/URI that reaches this JNI entry is a
Java-side boundary, not proved merely by its native symbol. The separate
original Java bridge review must establish that page-side close vocabulary.

The actual popup listener **PVMyInfoViewClose Gd2221c** calls
`CSRUserPool::Update(selfPVID) G10a350c` atGd2232a. Its function vtable is
ELF VA216515c/file216415c, RTTI2165188; invokeELFd1348d gives Thumb body
**Gd2348c**. The continuation takes a returned SRTARGET_USER and updates BOTH
the global CPVDataMgr strings and the visible popup:

- Nickname source+28 to CPVDataMgr+60: Gd234b6..4d8.
- Profile URL source+40 to CPVDataMgr+78: Gd234dc..4fc.
- Profile status source+4c to CPVDataMgr+84: Gd23500..522.
- Country source+34 to CPVDataMgr+90: Gd23526..548.
- Popup SetNickname Gd23588, SetNickname_Thumb Gd2358e and
  SetInfoMessage Gd235a2. The last consumes the returned source+4c string.

This is positive global/profile refresh evidence, not just a cache update.
Existing UserPool lifecycle evidence distinguishes completed cached targets
from a cold brief target: the cold case also queues /world/GetUserDetail
before listeners become complete. Keep the already supported own detailed
party read available; a brief response alone does not prove every cold cache
has completed. See DataDump findings/economy/mail-portrait-profile-contract.md.

## Brief field identity and detailed-profile separation

`CPVRelation::ReqUserInfoCB G8227f0` reads ret_data.list and passes each row
to GetTargetInfo G822c54. Canonical row fields are pvid, reg_utc, utc,
nick_name, country_code, profile_url, profile_status, like_cnt and is_like.
The nickname key is G822d64 with string conversionG822d7c and row+28;
profile_status is G822e44/48 with lookupG822e52 and string conversionG822e60,
row+4c. Thus **profile_status** is the wire field consumed by the popup method
named **SetInfoMessage**. There is no proved info_message wire alias in this
brief parser. An internal stored setting may use that name locally.

/world/GetUserDetail is the separate flat party/stat parser
CSRSyncGlobal.ParseUserDatailInfo Gf6e240. It is not the profile-status text
carrier and must not replace the brief list receipt. Arena's profile_status
string is likewise a separate consumer; update it through its established
full defender DTO when needed, rather than inventing nickname/stat mutations.

## Scope and source pointers

DataDump retained original source:
`sources/native/protocol/native-network-decomp.txt` (ParseLoginResult begins
line2088), `sources/native/economy/ghidra-mail-profile.txt`,
`findings/economy/mail-portrait-profile-contract.md`, and
`sources/native/symbols/native-evidence.tsv`. Additional literal/Thumb slices
above were read directly from the same immutable original library.

No native standalone RequestSetStatus/RequestSetThumbnail route was found in
the bounded named-requester review. MyInfo's SetNickname/SetInfoMessage are
view setters, not network requests. A local authenticated profile page and
its own mutation endpoint can restore meaningful functionality through the
native open/close/refresh path, but its HTML, endpoint, authentication policy,
validation, rename availability and stored status remain explicitly LOCAL.
Original paid rename rules, upload/avatar service, moderation and website
backend implementation are not recovered. No native display verification is
claimed by source closure alone.
