# Guild contribution reference, donation and reward consumer audit

Original immutable armeabi-v7a libnative_core.so SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses use Ghidra's +0x10000 code convention. Direct Capstone instruction,
ELF section/literal and RTTI/vtable inspection; no live inputs or original writes.

## Reference containers and supported values

CSRSyncRef.ReqGuildContributionPointsCB Gf84fd4 takes ret_data at Gf84ff2,
then tail-calls CSRGuild.ParseContributionPoints Ga80c5c. The parser clears
the action map at Guild+138 and reads STRING keys "1", "2", "3", "4":
std::to_string(int) calls Ga80c98/a80d6a/a80e3c/a80f0e build those keys,
and const JSON string subscript Ga7c4ba0 selects each value. Each numeric
conversion is signed32 (including vcvt.s32.f64), then stored under action1..4.
Thus ret_data is an OBJECT with decimal action keys, not an array of rows.
Missing keys become zero through the native conversion path; that behavior is
not evidence that the original action quantities were zero. ContributionByAction
Ga7fb3a searches this map and returns zero for a missing action.

CSRSyncRef.ReqGuildContributionRewardCB Gf84fa0 selects ret_data Gf84fbe,
then calls ParseContributionReward Ga8043c. This collection is iterated directly;
each row reads contribution at Ga80532/Ga8057e, converted to uint32, and reward
at Ga8053e/Ga805ca. Ga7266ac is a JSON COPY constructor, not text parsing:
reward is a direct JSON object. Recognized optional reward fields are ap,
gold and item_list. AP maps to native AP1 item-like preview at Ga8069c; gold
maps to RP1 at Ga807c8. item_list Ga8080e is a direct collection of objects
whose id is a string (Ga80896/Ga808a4) and qty is uint32 (Ga808aa and its
unsigned conversion). These rows populate the native lottery-point reward
preview tree keyed by contribution, not a backend claim ledger.

Example SHAPES ONLY; the numbers below are placeholders, not original values:

```text
GetGuildContributionPoints: {"1":n,"2":n,"3":n,"4":n}
GetGuildContributionReward: [{contribution:n,reward:{ap:n,gold:n,
                                            item_list:[{id:originalId,qty:n}]}}]
```

The reward parser resets cached maximum at Guild+c0, then updates it with
max(previous,row.contribution) at Ga809fa..Ga80a08. GetMileageRef Ga7ff84
returns Guild+c0 (maximum followed by preview tree). GetMileageNextTarget
Ga7ff88 looks up the currently affiliated Guild INFO, divides its contribution
by that MAXIMUM at Ga800a6..b0 and uses the remainder to select the next
strictly greater preview threshold; if none remains it returns the maximum.
This is cyclical display arithmetic. SetInfoNode Gfba3da..Gfba3f6 independently
uses the same maximum for displayed contribution modulo. Zero/empty tables
therefore cannot justify claiming a complete safe joined-Guild progress panel.
An explicit usable quote set should have positive maximum, unique thresholds,
supported uint32 values and known item IDs; its numerical provenance must remain
declared. Do not treat the threshold as an original one-time reward ID.

## Donation request, gold slider and preview

CSRGuild.RequestDonate Ga75808 has unsigned32 amount argument. It builds
five auth rows app_code/app_ver/market/pvid/otp, converts amount to decimal
string Ga75964 and inserts scalar amount Ga7596a. Route literal Ga75ab6 is
/guild/Donate. There is no guild_id, client price, counter total or reward
selection in this request. Affiliation is implicitly authenticated.

CSRPopUpGuildDonate.SetData Gc8f4ec reads current ExchangeMgr gold+154 at
Gc8f716; magic unsigned division at Gc8f71a..734 removes gold modulo1000.
It caps this rounded amount at100000 (Gc8f73c..756). Slider initialization
Gc8f8aa..8b6 passes minimum0, rounded/capped maximum and step1000. Amount0
is displayed but Donate is enabled only for positive selected amount
Gc8ffac..Gc8ffb6; OnButtonClick separately requires selected amount>=1 at
Gc8f3ee..3f4. UpdateSlideBar copies the selected slider amount to popup+b8
Gc8febc, then previews its contribution using CalcContributionByGold
Gc8ff46. CalcContributionByGold Ga7fb6e performs exact unsigned
floor(amount/10): multiply0xcccccccd, take highword, shift right3.
The confirmation caller Gfc1d40 loads the selected amount and forwards it to
RequestDonate at Gfc1d90.

These are exact original UI/preview bounds and arithmetic, not recovered
backend admission rules, fee settlement or guarantee that all Guild/global/
member counters increase identically. A replica may choose a matching local
gold-only donation policy, but must label that policy and settle atomically.

## Actual transaction callbacks and claim limits

RequestDonate $_22 inner callback Ga8c0d0 (RTTI/vtable214f32c) checks result1,
selects ret_data Ga8c10c, optionally parses my_guild Ga8c19c, guilds Ga8c22c,
user via generic SyncUser Gb7047c at Ga8c2f4, and achievement Ga8c38a.
It returns status only at Ga8c3a8. Full authoritative personal/INFO echoes
repair the native cache; the callback does not infer a contribution increment
from its captured amount or directly debit gold.

RequestContributionReward Ga74c94 similarly sends auth5 ONLY. Literal
Ga74eee is /guild/ReceiveContributionReward. There is no threshold, Guild ID,
reward ID, quantity or claim sequence in the form. Its actual $_21 inner
callback Ga8b544 (vtable214f2ac) checks result1 and selects ret_data Ga8b5a4.
Optional branches are my_guild→ParseMyInfo Ga8b634; guilds→ParseGuilds
Ga8b6c2; user→SyncUser Ga8b78a; item→SyncItem Ga8b836;
card→SyncCard Ga8b900; special→SyncSpecial Ga8b9aa;
achievement→ParseInfo Ga8ba3a. Sync results accumulate in SRREWARD_INFO
and are passed to the caller at Ga8ba5a. There is no guessed ret_data.reward
wrapper or captured claim ID. CSRTabGuildInfo's actual reward caller reaches
RequestContributionReward at Gfb9836.

Both callbacks use generic SyncUser. A nonnull user must carry unchanged paid
and current free iap_qty/free_iap_qty scalar snapshots; missing scalars reset
native balances. Changed gold/AP currency pairs need BOTH prev and cur. Null
user is safe for a no-currency/refused/no-op receipt under the previously
verified SyncUser null guard. Item/card/special settlement requires their
own recovered authoritative grammars, not reference-preview rows.

ParseMyInfo Ga685f0 only consumes guild_id/status/newbie/role/contribution;
it does not establish a reward-claim ledger. Cyclical preview arithmetic and
an auth-only claim request do not prove eligibility, claim reset period,
which pending thresholds are bundled, backend duplicate handling, or original
membership-age restrictions. No claim mutation is enabled by this audit.

## Original numerical search scope

Inspected pinned all-tables.json (13 tables: skill/tag/character/UI/episode/
badword), DataDump sources/client-tables/reference, datasets and existing
findings/systems/guild.md. These inspected machine-readable exports contain
no Guild contribution reward/action response table. The older Guild finding
has guide-text examples of GvG contribution, but those do not identify all four
action keys or recover a reward-response table. No original numerical rewards
or action values are invented here; this bounded absence finding is not a
claim that every preserved private/native resource has been exhausted.

Authenticated immutable explicitly configured reference publication can be
implemented from these shapes without enabling any producer/claim mutation.
UI rendering, production server parity and original claim policy remain
unverified. Source originals and DataDump were read-only throughout.
