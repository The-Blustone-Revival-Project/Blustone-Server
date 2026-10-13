# GvG entry instance: exact route, authoritative cache and reference boundary

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code convention ELF+0x10000. Direct bounded Thumb instruction, ELF
literal and concrete request callback vtable inspection. Existing DataDump
gvg-reference-2026-10-05.md provides the independently recovered field index.
No code, live input/save, original/DataDump or APK mutation.

## There is no recovered GetInfo route: entry uses GetInst

CSRGuildBattleMgr.RequestInst Ga9f63c calls GetMyGuildPlayData Ga9f658,
reads personal Guild ID and branches out if zero Ga9f65c..660. When nonzero,
it serializes ONLY app_code/app_ver/market/pvid/otp auth5; route literal
Ga9f8bc is /gvg/GetInst. No target Guild, instance ID, player-supplied state,
schedule, battle selection or registered member count is sent. This client
nonzero-affiliation gate also does not prove original joined-status admission.

The concrete inner callback is callable Gab8d14 from vtable215036c installed
by this request (outer215032c callable Gab89e8). It selects fullJSON.ret_data
Gab8d40/Gab8d42, passes it to PLAY_DATA.parse Gab8d86 and then replaces
manager personal data. Thus the response is one OBJECT under ret_data,
not a bare array or ret_data.gvg wrapper. auto_register is an additional
ret_data field, separately read Gab8dd2/Gab8dd6 and stored as manager byte+d6.

## Actual personal fields, distinct from ordinary Guild membership

PLAY_DATA.parse Gab3758 takes that unwrapped object. Positively resolved keys:

```text
enemy_guild_id
inf_gvg
user: {guild_id,total_cp,offense_point,defense_point,commander}
card_list
deployed_list: [{camp_id,order,card_1,card_2,card_3,card_4},...]
auto_register // separate RequestInst callback consumer
```

Card rows and deployed/order deck values require their own already recovered
CARD/ORDER_DECK parsers; empty collections do not invent a registered defense.
User here is GvG PLAY_DATA metadata, NOT generic wallet SyncUser. Ordinary
my_guild.guild_id and this user.guild_id are separate domains. In manager
layout personal user Guild ID resides+14; AmIPlayGVG Gab0808 returns whether
this word is nonzero. IsMyGuildPlayGVG Gab2d72 separately checks+18.
Neither function asks the ordinary Guild membership module at that point.
Do not copy ordinary Guild membership into these fields solely because they
share guild_id, or infer battle enrollment from an existing local Guild.

## Important cache replacement on the actual callback

The inner callback builds a fresh zero-initialized temporary PLAY_DATA at
Gab8d46..82, parses into it, copies its scalar bytes to manager+8..27
Gab8d90..da2, and assigns its card/deployed maps/lists at manager+28/+34/+40
Gab8db2/Gab8dc0/Gab8dcc. Missing sections in the parsed object therefore
do not preserve the previous GvG instance cache.

It reads the response PVCode Gab8d36 for the later caller status, but this
bounded callback contains no result1 conditional branch before PLAY_DATA.parse
or replacement. Unlike the separately closed Fishing legacy callback, simply
calling a generic GetInst failure 'inert' is unjustified; its body can still
pass through native replacement. This is a source cache behavior finding,
not a claim that existing Server state or any live client was changed.

An acknowledged neutral snapshot is an authoritative unregistered/empty
GvG declaration. It cannot be emitted as a placeholder over imported active
or unknown registered/deployed state. A future local inactive read would need
explicit mode/model admission and its no-registration policy, plus preserved
Hunter/deployment commitments, not guessed zeros from ordinary Guild fields.

## GetRef is not an empty-safe schedule-free substitute

Actual CSRGuildBattleMgr.ParseRef Gaa3258 delegates to reference+50 parser.
It selects gvg Gaa3286, then id Gaa3290/Gaa3292, and calls strict string
conversion Gaa32a0. Successful {} or {gvg:null} is therefore unsafe even
before timing/reward/camp consumers. Full original reference schema includes
id/min_entry_cnt, teaser/register/matching/deploy/combat/calc/result/finish/
next_gvg datetimes, reward/inf_reward, CP bounds, point and camp rows. No
original numerical table or schedule was located in the inspected exported
corpus; default zero dates or made-up current periods would fabricate it.

## Strongest next implementation recommendation

First introduce a PURE offline RequestInst outcome/model decoder with exact
user-versus-wallet domains and detached card/deployed data, then immutable
read support only for independently supplied complete established instance
snapshots or an explicitly declared local unregistered mode. This improves
the actual entry seam without creating registrations, camps, opponents,
schedule, ranking or rewards. No active combat/mutation should be enabled
from that read alone.

Full GvG entry restoration additionally needs an admitted complete GetRef
snapshot and its schedule/UI state selector proof. Do not claim this audit
unblocks a visible GvG screen or just return empty GetRef to avoid the missing
data. Existing source findings are suitable for a bounded configured reference
decoder, but original reward/camp/clock values and production producer remain
separate evidence requirements. This unit enables no route or local battle.
