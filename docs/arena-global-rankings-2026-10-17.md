# Actual-owned local global ranking pages

2026-10-17, read-only native contract integration. Original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
G addresses are ELF code+0x10000. No original assets, private state, UI/device,
ranked-peer battle, acquisition, economy, season reset or progression changed.

## Exact native contract and new reuse

[The original ranking contract](arena-rankings-native-2026-10-16.md) identifies
RequestWorldRank Gf60294: auth5 plus unsigned32 `page`/`page_scale`, to
`/arena/GetGlobalRankList`. Actual UI initializes page1 and sends scale10.
ReqWorldRankCB Gf60970 requires success/body result1 before ParseWorldRanking
G945e9c. Successful response is **ret_data:{season_no:uint32,list:[Defender]}**.
G945f42 replaces the current page; **G945f94** invokes shared ParseDefender
G943958 for each independent BATTLE_ENEMY object.

The prior blocker was complete Defender publication. The later
[owned-friendly-defense projection](friendly-battle-local-defense-2026-10-16.md)
now provides that exact shared grammar from real saved ownership. This change
factors its generic decoder into **ownedDefenseRival** and retains
**friendlyBattleRival** as a U32-gated wrapper. The global Defender's pvid is
native full64: exact positive **safe numeric** local account IDs aboveU32 now
work, while unsafe/nonpositive/fractional values refuse instead of truncating.
Unsafe U64 account support is not claimed. The friendly request's previous
supported U32 gate remains unchanged.

All strict strings, battle profile, metadata parents, dense five-slot deck,
actual card/equipment/skill fields, mounted-Gem attachment links, published
neutral card-book/chain constraints and unknown-private-field omission are
inherited from the established projector. Only battle.rank is replaced with
its established actual local standing. The outer season_no and row season_no
remain the existing LOCAL season1 presentation; no new seasonal authority or
original ranking/tie rule is inferred.

## Population, visibility and all-or-nothing pages

The existing localArenaStandingRows population is reused: requester always,
and loaded same-server real accounts with existing Fight Club evidence
(deck4/5, win/loss or active attempt). Rating DESC/PVID ASC sequential tie
ordering is the existing explicit LOCAL rule. No Arena fixture rival, profile
placeholder, random account or fake score is added.

Existing mutual-block visibility is applied before pagination, with self
retained. Blocked participants continue to occupy their established rank;
remaining rows preserve rank gaps. No friendship is required for these public
local defense profiles. Cross-server accounts are excluded by population.
This visibility and paging choice is LOCAL, not a recovered original privacy
or server pagination policy.

Both native paging fields must be positive canonical decimal strings or exact
integer numbers. Page acceptsU32; scale1..100 is an explicit LOCAL upper bound,
not an original quota. BigInt offset arithmetic prevents a large valid U32
page from wrapping to page1. Out-of-range pages return an empty list.

Every selected account must have a complete supported **explicit stored
defense deck5**. Global reads never create/copy that deck or call Arena Enter.
An absent/unpublished/malformed selected party, incompatible equipment/Gem or
nonneutral unsupported collection projection refuses the **whole page**. It
never drops a selected bad row while publishing a misleading partial page.
Unselected rows are not exposed or required to project. Missing requester game
refuses without allocation.

The handler accesses loaded maps directly. It neither calls gameFor nor
regenerates AP/BP, allocates identities, changes roster/formation/stats, charges
resources or persists. Returned data is detached. Source test runs with stale
below-cap energy and with write/rename destinations blocked establish this
read-only property, alongside exact nested-reference and file-byte checks.

## Why row-local aliases may be reused across ranking rows

Each Defender row owns its separate parsed card/Gem collections. The ranking
page parser stores those objects independently; it does not create one battle
actor set containing all rows. The aliases from the established projector
remain row-local: cards9_100_000_001..005 and Gems9_200_000_001+inventoryIndex.
Each row keeps its own mounted-Gem target links and checks collisions against
the requester's and selected peer's real card/Gem IDs. Saved IDs never change.
Duplicate aliases across separate row objects are not claimed globally unique.

Fresh bounded source inspection of **CSRTableFCRank::OnTableViewButtonClick
Gffed28** closes the immediate use: selected full64 identity is compared to
self at **Gffef02..0c**; self opens CSRPopUpMyInfo at **Gffef10** and modal
Push **Gffef40**. Another user opens CSRPopUpUserInfo at **Gffef8e**, passes
selected user data at **Gffef98/9a**, and pushes it at **Gffefbe**. No
BattleStart, wallet debit or actor creation is called in this bounded handler.
Thus this ranking read does not authorize actual-peer ranked combat or put
multiple ranking parties into the global actor serial lookup. A subsequent
friendly request remains its own accepted-friend preparation path.

This is a bounded parser/click-consumer justification, not native rendered
ranking/profile validation. Future code that combines page parties into one
actor map must allocate distinct coherent aliases or reject that operation.
Actual-peer ranked BattleStart remains unsupported by the unchanged service.

## Validation

New pure tests cover canonical paging,100 ceiling, very large page offsets,
rank gaps, malformed fields/getters, detachment and safe full64 Defender IDs;
they explicitly retain friendly U32 rejection. State tests earn actual ratings
through accepted Arena settlement, use actual saved defense parties, check
PVID ties, no fixture/unentered/cross-server rows, all required DTO parents,
mounted full64-source Gem links, private metadata omission, mutual blocks,
selected-row refusal, safe wide account IDs, expired energy clocks, blocked
writers, response detachment and restart. Existing friend ranking and friendly
projection regressions remain relevant. No native UI or peer-combat success is
claimed by these host tests.

Compiled encrypted HTTP additionally proves three independent authenticated
accounts, actual saved defense registration, accepted local Arena results,
complete two-page native DTOs, huge-page/invalid-page behavior, mutual blocks
with rank gaps, exact read-only save bytes and replacement-app restoration
using the original clients' persisted transport keys. This is an app restart
within one OS process, distinct from native/client scene execution.

`npm run test:arena-global` builds and runs pure/state/compiled HTTP checks.
The independent compiled-process verifier also now checks valid complete global
pages alongside friend/MyRank data and compares them after process restart:
`node scripts/verify-independent.mjs --fixture --exercise-arena-ranks` PASS.
Its old no-page request still deliberately refuses2001; that is paging
validation, no longer a claim that every global request is unsupported.
