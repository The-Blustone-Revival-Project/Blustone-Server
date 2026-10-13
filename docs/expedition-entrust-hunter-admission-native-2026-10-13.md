# Expedition Entrust: owned deck, material protection and exact unlock stage

Immutable original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra addresses ELF+0x10000. Bounded original Thumb/literal/symbol checks
and direct consumer scans. Server source note only; no native inputs, jobs,
live saves/client or original/DataDump changes.

## Deck2 contains actual owned full64 Hunter IDs

CSRSceneMStageEntrust.SetCharList Ge794fc clears its old scene character
pointer vector, then gets CSRPlayData.GetDeckInfo(DECK_CASE2) Gb6dac8 at
Ge79564..56a. It iterates the returned full64 ID vector Ge7956e..5ba and
skips full64 zero slots Ge795ba..5c0. Each nonzero ID is loaded with LDRD
Ge795e0 and passed to CSRInventory.FindCard(uint64) G aeb5b0 at Ge795e6.
This is owned-card resolution, not card-reference IDs, art names or a new
Hunter grant. A missing owned card enters the explicit diagnostic branch
Ge79618→Ge796a6, whose literal Ge796b2 is
"decksetting entrust deck has a card which not exist [inst_id: %s]".
Existing cards provide scene character display objects.

Normal dispatch sends ONLY deck_type2 along with stage/count/tutorial/auth,
not the selected owned IDs (prior request evidence Ge7b398..39a). Start
snapshots also have no owned deck list. Consequently the replica cannot
recover an original immutable job deck from the Start parser alone. A future
local dispatcher should capture the established owned IDs before committing
a job and state that ownership/commitment snapshot as local producer policy.
Client scene rendering pointers do not constitute a durable server job model.

## Positive native material protection is current-deck membership

CSRTableLevelUp.IsInactiveCard explicitly tests DECK_CASE2:
G101db4c sets argument1=2 and G101db52 calls
CSRInventory.IsContainedDeck Gaeaba4 with both full64 identity halves.
CSRTableRankUp.IsInactiveCard likewise sets case2 at G103c24c and calls
Gaeaba4 at G103c252. Their surrounding recovered material guards also
test cases1/4/5 independently; the entrust-specific positive fact is case2.

IsContainedDeck's complete function gets **current** CSRPlayData deck(case)
at Gaeabd0, then compares both ID halves Gaeabde..abe8 and returns a bool.
It reads no automatic-combat job, timer or captured prior deck. Therefore
current deck2 materials are protected irrespective of whether a job exists.
This directly supports source-consumption exclusion already in the server.
It does not prove a training/advancement TARGET freeze, equipment/Gem
freeze or blocking a later deck2 edit while a timed job exists.

A bounded direct BL consumer scan for both CSRAutoCombatBase.get and its
shared-singleton getter found UI/job/parser/timing consumers but no direct
sale/training/rank/deck-handler consumer. This is **not a global absence
proof**: indirect/inlined hooks or original server admission may differ.
Do not interpret it as permission to sell/consume/modify committed Hunters.
The precise native sale/deck-edit restrictions beyond existing independently
recovered current-deck checks are not newly closed by this note.

Because End applies absolute Hunter EXP from server-supplied owned IDs, a
local producer must resolve and protect its captured commitments explicitly.
Blocking job-card consumption, target changes and deck2 replacement until
settlement is defensible local integrity policy, but not an invented original
backend rule. Protecting only whichever deck2 happens to contain later could
allow a captured Hunter to be consumed and invalidate a future End receipt.

## Original client requires any selected-stage star, not three here

CSRSceneStageConfirm.IsAutoCombat Ge86a9c first builds the exact action
string UNLOCK_ENTRUST at Ge86ab6 and calls
SRGetPossibleLevelVipAction G10ad20c at Ge86abc. It compares the returned
threshold against CSRPlayData.GetUserVIPLevel Gb6cc2c at Ge86ad8..ade.
It next calls GetStageAchieveCnt(selected stage string) Gb6ce4c
Ge86ae8..aec and returns false only when that count is ZERO Ge86af0.

The string GetStageAchieveCnt function Gb6ce4c finds the owned stage record
and sums its three achievement flag bytes at Gb6ce88..cea4. Thus any
positive earned achievement suffices at this gate. There is no comparison
with3 in this complete helper. A stricter local three-star requirement must
be described as local policy, not attributed to this source.

Finally IsAutoCombat passes literal TU_TYPE19 Ge86afa to the overloaded
GetStageAchieveCnt(TU_TYPE) G84e87c at Ge86afc; it must also return nonzero.
This overload is **not a tutorial-clear flag**. It resolves the enum with
CSRStaticData.GetStageID Gf42820 at G84e8a4, then invokes the same string
stage-achievement counter Gb6ce4c at G84e8ac.

## Hardcoded original unlock stage: n_01_05

GetStageID Gf42820 is a hardcoded Thumb TBB switch. For enum19, table byte
at Gf42841 is40; base Gf4282e plus2*40 branches to Gf4287e. Its LDR/PCADD
Gf4287e/Gf42880 resolves the exact original string **n_01_05**, which is
copied at Gf42882. Therefore the second stage condition is a nonzero earned
achievement on n_01_05. Do not substitute a made-up tutorial status19 or
another stage from UI prose. This original stage identity can constrain a
local dispatcher without inventing an unlock destination.

SetMission applies IsAutoCombat to the actual BT_LEAVE button:
BT_LEAVE resolution Ge7f7a0, helper Ge7f7b6, CMUIButton.SetEnable G77a938
at Ge7f7be. OnButtonClick selects BT_LEAVE Ge895cc and reaches the
LeaveMission path Ge89602→Ge86b3c in the relevant scene branch. This is
positive native entry-button admission, not merely a progress label.

## VIP threshold is the first matching group ordinal

SRGetPossibleLevelVipAction G10ad20c scans the available VIP groups from
ordinal0 upward G10ad21c..230. For each group it scans perk rows and
compares their name strings byte-for-byte G10ad234..29c. The first matching
UNLOCK_ENTRUST name returns the **group ordinal**, not that perk's numeric
value or a supplied level_limit field. Missing match returns−1
G10ad29e..2aa; ordinary nonnegative VIP levels therefore pass the later
VIP>=−1 comparison. Absence is not a native deny branch.

Current starterLevels.vip_group is empty and remains a local fixture; no
original populated VIP unlock tier was recovered here. A configured/local
VIP admission may supply a compatible group table or explicitly choose a
local threshold, but must not claim an original tier number from missing data.
The separate run-count cap/paid-pass window has its own dynamic consumers.

## Safe local implementation boundary

Proven client conditions are: actual owned nonzero deck2 cards, any selected
stage achievement, any n_01_05 achievement, and current VIP satisfying the
first UNLOCK_ENTRUST group ordinal when present. Exact producer limits,
original rewards, immutable job-Hunter association and all active-job mutation
restrictions remain unproved. The existing one-id client cache does not by
itself establish original backend allocation capacity.

An opt-in local producer should declare its single-job/idle/count/commitment/
award policies, snapshot owned IDs and stage/clock inputs before atomic AP
debit, refuse unsupported collisions or unavailable references, and preserve
all unrelated gameplay. Native quirky ClearCount must not authorize rewards.
No timed dispatch is activated by this source note.
