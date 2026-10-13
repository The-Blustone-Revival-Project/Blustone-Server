# Guild contribution counters: proven consumers and unresolved personal meaning

Original immutable native SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code convention ELF+0x10000. This follows
guild-contribution-native-2026-10-13.md using direct ARM instructions, original
symbol identities and literal-backed consumers. No UI/live/save mutation.

## PLAY_DATA is an independent wire field

GetMyGuildPlayData Ga67eb4 returns CSRGuild+9c. ParseMyInfo Ga685f0 reads
guild_id/status/newbie/role/contribution. Contribution literal Ga68760 is
selected at Ga68762; unsigned32 conversions store to CSRGuild+a8 at
Ga68778..7ac. In returned PLAY_DATA this is offset+c, distinct from role+8,
status+4 and Guild ID+0. The callback receives this value from authoritative
my_guild; no inspected Donate or Reward callback computes its new value from
captured amount or the preview reference.

MEMBER.contribution is independently parsed inside each INFO.members row.
The two fields sharing the JSON spelling contribution does not establish
that their values or meanings are equal. The native producer is absent.
Neither a personal cumulative donation total nor a reward-claim marker is
positively established by ParseMyInfo alone.

## The inspected mileage panel uses aggregate INFO, not PLAY_DATA

CSRTabGuildInfo.UpdateData calls GetMyGuildPlayData Gfb774c and uses ONLY its
Guild ID at Gfb7750 to request that Guild's INFO. Its concrete LoadAsync
callback Gfc2f98 copies the returned INFO into Tab+838 at Gfc2fd4..2fdc;
copy function G895976 copies INFO scalar bytes including contribution+8.
Consequently Tab+840 is INFO.contribution, the Guild aggregate.
The callback separately reads PLAY_DATA.role+8 at Gfc2fe4..2fe8 for SetGuildRole.

SetInfoNode Gfb9e2c takes this cached INFO projection. IT_MAX_CONTRIBUTION
reads Tab+840 at Gfba16e. IT_CONTRIBUTION display reads Tab+840 Gfba3d2,
obtains reference MAX from GetMileageRef Gfba3da/Gfba3de, and computes
aggregate modulo MAX Gfba3f6. The returned remainder is retained in r5 and
stack14 at Gfba47e. The same remainder is restored Gfbadfa and passed as BOTH
arguments r1/r2 to SetMileageView at Gfbae6a..Gfbae6e. SetMileageView Gfbb8e8
initializes the preview with GetMileageRef Gfbb92e and forwards both arguments
unchanged to CSRLotteryPointDraw.SetMileageView Gfbb93c..Gfbb940.

The next-threshold text Gfba4c4 calls GetMileageNextTarget, which also finds
the owned cached INFO by PLAY_DATA.guild_id then reads INFO.contribution+8
at Ga800a6 and takes remainder modulo reference MAX Ga800aa..b0. This proves
aggregate/cyclical display behavior, not a per-account claim cursor.

No PLAY_DATA.contribution read occurs in these recovered mileage paths.
Passing the same aggregate remainder twice must not be reinterpreted as a
proven personal received/earned pair. The native Reward callback can update
my_guild, but that alone is not evidence that this specific scalar is a
claim watermark.

## Donation text also does not settle the ambiguity

CSRPopUpGuildDonate.SetData TX_MY_CO displays current GOLD, not personal
contribution: Gc8f528..52c gets ExchangeMgr, Gc8f530 reads gold+154,
Gc8f536 formats it and Gc8f540 sets text. Slider-selected donation previews
floor(amount/10) through CalcContributionByGold Gc8ff46. Neither display
proves a debit/increment to PLAY_DATA.contribution. The confirmation caller
and actual Donate callback remain as documented in the prior audit.

## Bounded additional checks

Direct Thumb BL call-site scan across native text located GetMyGuildPlayData
callers in affiliation, chat, management, invitation, Guild battle and Guild
UI paths. The inspected immediate consumers test Guild ID/status/role.
The Guild panel and mileage paths above were followed through concrete
callbacks; this is not a proof that no indirect/inlined consumer exists.

A separate literal user field guild_contribution exists in CSRPlayData parsing:
Gb671ac selects it and unsigned32 value is stored to that parser's user-extra
object+5c at Gb671f6. It is a distinct parser/object from CSRGuild.PLAY_DATA;
no equality to my_guild.contribution or MEMBER.contribution is proved here.
Do not combine those fields solely because of their similar names.

## Server model implication

Current guildPersonal projection copies MEMBER.contribution into
my_guild.contribution. That is an existing LOCAL mapping policy, not original
semantic recovery. Source here neither proves that mapping correct nor
proves a replacement claim-marker mapping. Therefore no automatic migration
or claim ledger should be derived from member totals. A future authoritative
PLAY_DATA value should be modeled separately if supplied evidence establishes
it; preserving an unknown counter is preferable to fabricating earned or
already-claimed rewards.

Reference publication and aggregate-based fee selectors are not blocked by
this unresolved personal meaning. Donation/claim mutations need a separately
declared local policy or stronger original producer/consumer evidence. No
new transaction or source/runtime edit follows from this bounded audit.
