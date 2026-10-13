# Guild membership limits and initial fields: fresh original evidence

Independent source recovery plus review of the explicitly configured local
lifecycle design. No state/source helper or live data was edited by this lane;
only this evidence note was saved. DataDump and immutable native originals stay
read-only. Original server admission/default/clock rules are kept distinct from
supported local choices.

Native ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Ghidra coordinates below subtract0x10000 for ELF. Native symbol locator is
DataDump `sources/native/symbols/native-evidence.tsv`. The original client
table export is `sources/client-tables/recovered-data/leveldb-tables/all-tables.json`,
already pinned in Server (SHA256
`f166f857d45c6dd68e97bd4b8f055be795796400fa10ba9f040aaa1b1d8f0a78`).

## Stock member-count display is explicitly /40

This is fresh native consumer evidence, stronger than the historical guide's
40-member statement. CSRCellGuildInfo.Init Ga891ae8 resolves **TX_GD_TX3**
at Ga891eb2. It loads Guild INFO.member_cnt+14 at Ga891ec6, converts that
count to text at Ga891ecc, appends literal `/` at Ga891ed2/Ga891ed8,
loads immediate **40** at Ga891ef2, formats it at Ga891ef6 and appends it
at Ga891f0e. The final string is written to the UI text node at Ga891f2c.
For example the native display is supplied-count/40, not a capacity computed
from the number of displayed rows or a guessed server reference field.

The pinned original UI_JSON_RO has the same count label
`협회원 수|TX_GD_TX3|{EN,JA,KO,SC,TC}` with initial TEXT0. Its initial resource
text does not itself contain the cap; the native consumer overwrites it with
the count/40 expression. No GetExtra lookup occurs in this construction.

Approval UI independently enforces the same40 boundary: CheckApply copies INFO
at stack+28; GaFB0876 reads its member-list count at INFO+68 (stack+90), then
GaFB087c..84 adds each selected application. GaFB08ae compares the projected
count with41; GaFB08b2 branches to the enabled path only below41. The
independent Applicants/Confirm evidence note owns the full selection/button
consumer chain; the count/add/compare bytes were independently checked here.

This proves both stock DISPLAY and APPROVAL UI cap40. It does not recover the remote server's
capacity enforcement code, expansion/version changes or exceptions. A local
required maxMembers policy can safely stay<=40 for this client while being
labeled explicit local admission. Lower configured limits are likewise local
choices, not newly discovered original capacity values.

## GetExtra and original-table audit: bounded negative, not blanket absence

The full bounded CSRRefData.SetExtra GaDD819c..GaDDb944 was inspected rather
than assuming the reference lacks relevant data. Literal field families include
AP/BP maxima and refresh intervals, server/local clock values, IAP bonuses/
achievement/daily rewards, client_option, chat_entrance, ads_bonus,
card_sell_profit and decoration references. No direct Guild member-capacity,
new member role/newbie duration or application-expiry field was recovered in
that parser. This is scoped to its actual consumed fields.

`client_option` is a generic key/value map and can carry arbitrary captured
values. Without original GetExtra payload rows, this audit cannot prove that
no remote setting ever existed there. No original Guild capacity/default-role/
newbie clock was found in the pinned export's thirteen families:
SKILL_REF_RO, SKILL_TAG_RO, SKILL_EFFECT_RO, SKILL_DESC_RO, TAG_REF_RO,
CHAR_STR_RO, INGAME_TALK_RO, ADMIN_ID_RO, UI_EPISODE_RO, UI_TEXT_RO,
UI_JSON_RO, UI_XML_RO and BADWORD_RO. These are client tables, not an original
GetExtra capture or a server membership database.

The native vocabulary includes member_cnt/members/newbie and explicit Guild
member-limit error names. Those prove fields/error vocabulary, not numeric
production values or entitlement to turn unknown producer data into defaults.
GvG max_join_cnt and support-fuel count are separate domains, not evidence
that their capacities are Guild membership limits.

## Newbie forces the effective nonleader role to4

Initial joined MEMBER values are supplied by the server; parsing does not
reconstruct their original defaults. There IS a important native coherence
rule that configured/imported rows must respect:

- ParseMember Ga6b4b0 reads role and newbie independently. At Ga6b656..65a
  it checks newbie byte==1. At Ga6b65e..660 it checks supplied role!=1.
  When both apply, Ga6b662/64 overwrites effective native role with **4**.
- ParseMyInfo Ga685f0 stores role at Ga68748..4a. For a nonleader it reads
  newbie byte+ac at Ga68750; if nonzero, Ga68758/5a likewise assigns **4**.
- Canonical boolean0/1 values make both consumers agree. Leader role1 is
  preserved even when newbie1. Noncanonical byte values have differing loose
  handling and are outside the supported replica grammar.

Therefore a locally initialized memberRole3/newbie1 would publish role3 but
the client would see role4. Worse, imported supervisor role2/newbie1 could
grant server management permission while the native client presents role4.
Supported new policy must refuse role3/newbie1, and imported joined rows
with newbie1 must have role1 or4 unless explicit separate native-normalization
modeling is implemented. This is a source-backed coherence guard, not proof
that original new members always had role4/newbie1.

Role4/newbie0 remains preserved by the native parser, so it is a structurally
supported supplied combination; its original producer/expiration meaning is
still unknown. Role3/newbie0 is also structurally supported. The original
default role, initial contribution, expiry/promotion transition and newcomer
benefit duration remain unrecovered. Zero missing-parser fields are not
authoritative original defaults.

## Local pending clock and consumer lifecycle safeguards

The Apply/Applicants/Confirm lane owns exact application row fields and clock
consumer proof. A local persisted `applied` epoch-seconds timestamp must be
identified as local server clock policy until original producer units and
expiry rules are closed. No guessed TTL, one-day rejoin timer or new-member
expiry is supplied by this note. Historical guide claims can be research leads
without becoming a silently enforced original rule.

Pending applications must stay separate from joined members. Status1 plus
matching Guild positively selects the native pending state; joined status3
selects the member scene. Full personal receipt fields still come from the
owned persisted state. Original public-versus-permission producer behavior,
automatic role/newbie assignment and approved batch policy remain separate
from those consumer branches.

Successful CancelApplication clears native personal affiliation directly.
Thus absent pending may be replay-neutral success only for a genuinely
unjoined actor; a joined actor must refuse cancellation. Successful Leave
also clears native state/caches; an actor with pending application must refuse
Leave until that pending record is cancelled, rather than receive a nominal
no-op that clears only the client. Nonleader-only departures and refusal to
orphan the remaining leader are conservative local producer policies, not
recovered last-leader dissolution/succession behavior.

## Independent review scope

The supplied policy is required and detached; maxMembers<=40 and coherent
role/newbie values are validated. Public immediate join, permission pending,
wallet-neutral settlement and free-first-independent membership behavior are
explicit opt-in local policies. Same-server known actors, active combat guards,
derived fresh FC threshold checks, unique affiliation and entire-batch capacity/
ownership admission protect the planner. Rechecking FC when approving is local
authoritative admission, not proof of original producer race behavior.

Candidate Guild/pending arrays are prepared before commit and validated as
established ownership; persistence rollback preserves both original arrays.
No native success is sent before durable ownership changes. Exact retries
echo current state without duplicating membership/fees; Cancel/Leave return
wallet-null receipts, which safely skip generic SyncUser. Unknown/private
invitation, leader succession, joined/pending histories and reward/cooldown
producer rules remain unsupported.

One local policy boundary must be explicit: permission applications can
remain if another settings update later changes Guild.type. Supporting
decisions for those already owned pending records does not reconstruct a
private invitation workflow or the original handling of such type changes.
The implementation must preserve this distinction in documentation/tests.
