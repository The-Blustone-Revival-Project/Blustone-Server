# Mirage Reward: exact request, currency/item receipt and inline next-stair cache

2026-10-14. Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code coordinates ELF+0x10000. Preserved Mirage entry/stair exports were
read before bounded Thumb callback/parser inspection. Server doc only; no
reward amounts, original floors, jobs, live inputs or DataDump writes.

## Request and positive callback attribution

CSRExploreMirageInfo.RequestReward **G932e4c** posts **/mirage/Reward**
at G933166. Exactly auth5 plus **floor and stair** are scalar form strings.
Both caller arguments are signed int and use decimal int conversion
G932fba/G932fe6; the keys are G932fc0/G932fec. No reward amount, resource,
Hunter/stack identity, cleared flag, next_stair or nonce is supplied.
Caller popup reads current base floor+40 and stair+44 Gbfac00..1a.

Installed second TASK_READY vtable G21476f0, invoke slot G2147710, contains
ELF929171 and identifies **callback G939170**. It requires GetResultCode1
G9391c0..c6 and presence of ret_data before selecting that child G93924a..4e
and calling **ParseRewardInfo G92cb5c at G93925a**. It forwards the resulting
SRREWARD_INFO along with request/response to the UI caller. Non1 or missing
ret_data skips its reward/cache parsing; this is distinct from the unsafe
unguarded Mirage End parser under investigation in the companion lane.

## Receipt updates cached state before showing rewards

ParseRewardInfo operates directly on the selected ret_data object and checks
presence before each supported branch. The source-compatible field vocabulary:

```text
{
  cur_stair?: int32,
  state?: int32,
  inst_enemy?: [<complete Mirage enemy clone rows>],
  user?: {
    gold?: {prev:uint32,cur:uint32},
    ap?: {prev:uint32,cur:uint32,ap_charge_time:uint32},
    bp?: {prev:uint32,cur:uint32,bp_charge_time:uint32},
    free_iap?: {prev:uint32,cur:uint32}, iap?: {prev:uint32,cur:uint32},
    honor?: {prev:uint32,cur:uint32}, vip_exp?: {prev:uint32,cur:uint32}
  },
  item?: [{inst_id:exactUint64,ref_id:STRING,added:uint32},...],
  gem?: <independently supported complete Gem rows>
}
```

cur_stair uses signed conversion G92cc3e and updates manager+4c G92cc4e,
corresponding to GetBaseInfo().stair+44. state uses signed conversion G92cd1a
and updates manager+8 G92cd2a, corresponding to GetBaseInfo().state+0.
inst_enemy passes directly to Parse_InstEnemy G92cdc8. That array branch
replaces old clone rows; malformed nonarray skips replacement. Complete enemy
schema—including hp_percent, not the older unproved n field—is in
mirage-supplied-cache-schema-native-2026-10-14.md.

The parser does **not** index floor, inst_base, ref_stair, ref_hero or entry.
There is no recovered implicit stair+1 arithmetic here: the server supplies
cur_stair/state and any next enemy cache. Adding a successful empty receipt
does not move the client from the receivable stair to a new fight.

## Specialized absolute wallet setters and actual item deltas

Gold branch reads user.gold.prev/cur, both uint32
(G92cf76/G92cfd2), sets PlayData.gold absolute cur at G92cfea and constructs
display delta cur−prev G92cfee..ff4. Other currency branches follow independent
presence checks and unsigned32 conversions; omission is different from a
present incomplete block silently converting missing scalars to0.

AP/BP charge times are **effective32**: unsigned conversions G92d17e/G92d38a,
then highword0 G92d19a/G92d3a6 before SyncAP/SyncBP. They are nested inside
their own user.ap/user.bp blocks, not root fields or an Expedition End
user_exp subtree. This parser never calls generic SyncUser, so its unrelated
iap_qty/free_iap_qty requirement must not be imposed on a gold-only receipt.
Paid/free branches still require the native initialized account state; their
purchase/allocation law is not recovered here. No EXP setter was found in
the complete ParseRewardInfo body.

item[] is a collection of actual **AddItem deltas**: full64 inst_id is loaded
with both words, ref_id strictly converted at G92db4c, added unsigned32
G92db8c, and both ID halves passed in r2/r3 G92dbc0..c2 to AddItem Gaec508
at G92dbca. Display item data subsequently resolves GetItemData G92dc92.
This preserves full64 IDs unlike deferred Search Reward or modern daily
quest item callers. It still does not resolve original item identity/amount
or prove an allocator/stack ownership law. Gem data invokes separate native
Gem parsers; no fake Gem grant is needed for an explicitly gold-only local
policy. Keep unsupported item/gem branches absent or explicitly model them.

## The normal reward-close path refreshes locally, not GetInfo

The concrete popup Reward UI callable **Gbfe834**, installed from vtable
G215a1b4 at Gbfac0a..1a, checks application result1 at Gbfe880..886 and
constructs the reward dialog from the parsed SRREWARD_INFO. Its close callback
is vtable G215a1f4 invoke G215a214→ELFbeefc9/**Gbfefc8**.

Gbfefc8 reads current cached base.state at Gbfefea. When **state!=0**, it
calls **RefreshList Gbf8d9c at Gbfeff8** and evaluates the new cached stair
in further local UI animation branches. RefreshList's independently recovered
MakeRandResPostFix call selects a supplied resource postfix. There is no
RequestInfo call in this complete bounded reward-close callable.

When **state==0**, it opens the native Mirage-complete popup
Gbff05e..f09e (SetData Gd09db4). That popup's captured close continuation
**Gbff3fe** also calls RefreshList at Gbff412 and reads cached base data;
no RequestInfo call appeared in its bounded branch either. This is not a
global absence claim about every subsequent navigation/reset path.

Therefore the ordinary receivable→next-stair mechanism is **successful
Reward receipt inline cur_stair/state/enemy updates → reward dialog closes →
local RefreshList**, not a guaranteed Reward→GetInfo round trip. The separate
GetNextFloor/reset/stay paths remain independently documented.

## Persistent producer and retry implications

A local persistent run needs an owner-bound existing floor/stair/state2 claim
record, actual accepted End outcome/carried HP, supplied next stair/enemies
and a declared reward policy. Client floor/stair arguments are a quote of its
cache, not grant authority. Original rewards, end-of-floor transitions,
reset/retry/revive eligibility and replay law remain unproved; do not assume
cur_stair=current+1 or claim completed floor0 from missing data.

A gold-only configured claim can atomically mark the specific stair rewarded,
credit its configured gold and persist the supplied next cache before emitting
current user.gold prev/cur plus cur_stair/state/inst_enemy. A duplicate response
must not re-credit gold or rewind later cached enemies/stair/state. Return a
current authoritative bounded repair or refuse obsolete claims deliberately;
no universal original retry protocol is inferred. Item delta replay has the
separate duplicate/lost-response inventory-refresh limitation already documented.

Because Reward itself does not parse entry HP, it cannot silently repair or
heal missing carried-player state. A complete GetInfo owner-entry snapshot is
a separate recovery/read seam. These contracts permit a faithful explicitly
supplied local producer design, not invented original numerical catalogue or
a claim that native Mirage battle/reward UI was exercised in this task.
