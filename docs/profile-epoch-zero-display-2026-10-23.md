# Profile registration date: epoch-zero and original English century prefix

Source-only diagnosis,2026-10-23. Root observed own Profile registration date
01/01/2070 and separately reported the primary account's stored beginUtc=0,
with no createdAt value. This lane did not open the private save or operate a
device. No account timestamp, original asset, APK or runtime was changed.

## Server field and units

ServerState.createAccount initializes new beginUtc with Math.floor(Date.now()/1000),
Unix epoch seconds. normalizeStoredAccount preserves an integral stored value,
including0; absent/nonintegral historical values fall back to0. accountSnapshot
publishes begin_utc:account.beginUtc. The brief-profile GetTargetUserInfo path
and localSocialProfile publish reg_utc from that same account value.

ownedUserDetail supplies actual party/progression fields; it has no creation-date
field. The observed OWN Profile date therefore should not be repaired by adding
a guessed timestamp to that detailed-party DTO. A lastLoginAt value is a login
time, not evidence of account creation; do not backfill beginUtc from it.

## Native own-profile data path

Original ELF SHA256:
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
G addresses use ELF code offsets+0x10000.

- CPVDataMgr.ParseLoginResult G7e2784 reads exact literal begin_utc at
  G7e2d12/G7e2d14 (literal slot ELF7d2e9c→ELF1d59b3f), indexes the login JSON
  at G7e2d18 and performs its numeric conversion. G7e2d62 stores the resulting
  pair directly at CPVDataMgr+0xa8. No millisecond divide or epoch-year addition
  appears between this conversion and the stored member.
- CSRPopUpMyInfo.Reset Gd1e990 calls CPVDataMgr.get at Gd1ea3e, loads the LOW
  word from manager+0xa8 at Gd1ea42, and passes it to SetRegistDate at Gd1ea4a.
- SetRegistDate Gd2010c retains that long/time argument; its localized-date key
  load Gd20146/ADD Gd20148 resolves ELF1d74fd4, exact Korean key 년월일.
  The formatted value is passed to CMTimeToStr at Gd20156 and then SetText.
- CMTimeToStr G78cef8 stores the input word at G78cf1c. G78cf98 passes its
  address to the actual gmtime call at G78cf9a. G78cfa8..G78cfb0 supplies the
  returned tm pointer and localized format to the standard time-format stream
  manipulator. It does not multiply/divide the value by1000 or add1970/2000.

This closes the own-popup path; peer-profile date handling and arbitrary future
wide time values are not independently validated by this bounded diagnosis.

## Exact original display format

Public retained export:
resources/reference/recovered-data/leveldb-tables/all-tables.json,
SHA256 f166f857d45c6dd68e97bd4b8f055be795796400fa10ba9f040aaa1b1d8f0a78.
UI_TEXT_RO key 년월일 begins at line47882; EN at line47885 is exactly:

```text
%m/%d/20%y
```

Thus epoch0 goes through UTC gmtime as1970-01-01, whose two-digit year%y is70.
The format prepends literal20, producing **01/01/2070**. A contemporary2026
input yields2026 because its%y is26. The original text expects contemporary
20xx dates and gives a misleading century for the unknown/epoch-zero sentinel.
A host standard formatter reproduces those strings; this is supporting source
arithmetic, not another native UI execution claim.

## Correct interpretation

The observed2070 is not a stored2070 creation date and not a demonstrated
seconds-versus-milliseconds transport bug. It is unknown legacy beginUtc0
combined with the original English century-prefix format. Other locales use
two-digit years without the same literal20 prefix, but their user-facing
interpretation was not tested here.

Preserve the stored unknown value and account history. Omission/null behavior
for begin_utc is not established as a safe native unknown-date representation;
no such wire change is recommended from this audit. Do not substitute current
login time, current clock or a fabricated original creation date. Changing the
original formatter would still display an epoch sentinel rather than recover
its missing history, and no instrumented APK/UI patch was requested here.

Production code and tests are unchanged. The bounded raw instruction/literal
checks and public text-table hash explain the observed result while keeping
unknown creation metadata explicit.
