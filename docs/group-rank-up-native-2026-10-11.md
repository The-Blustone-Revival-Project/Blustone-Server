# Native group rank-up plan — 2026-10-11

A separate underlevel bulk advancement plan is prepared in src/group-rank-up.ts.
The route is implemented; no live server profile was restarted or activated. Ordinary single-rank advancement continues
using its existing max-level/partial-promotion rules. No live hunter was
selected, unlocked, consumed or promoted.

The final native UI establishes different arithmetic for /gym/RankUpBundle:

- CSRPopUpGroupRankUpStar constructor Gc5d918 stores its supplied grade at+65c.
  OnInit Gc5da50..Gc5da5a reads that grade and stores grade+3 at+658.
- SlideSetting Gc5eb82..Gc5ebb4 gets GetCardRaisePrice(source grade) at Gc5eb8a,
  then GetCardRankUpPrice(source grade) at Gc5eb98. Gc5ebaa performs
  sourceGrade*RankUpPrice + 2*RaisePrice and stores per-output price at+660.
  GetCardRaisePrice/GetCardRankUpPrice are original G87f2fc/G87f322 symbols.
- SlideSetting Gc5ebba computes availableCount modulo groupSize; Gc5ebc6 sets
  slider range0..(availableCount-remainder) with groupSize step. It initializes
  the slider to that divisible maximum at Gc5ebe0. Thus native requests use
  complete groups, not an arbitrary nondivisible count whose leftovers vanish.
- UpdateSlideBar Gc5f05a..Gc5f078 stores selected source count+664, source grade
  +668, source grade+1 as destination+670, and divides selected source count by
  groupSize to obtain output count+66c. Gc5f190..Gc5f19c multiplies per-output
  price by output count. Under native source grades1/2 this yields4 rank1
  hunters per rank2 output,5 rank2 hunters per rank3 output.
- Source filters in SlideSetting Gc5e648 use MakeCardStreamWithoutSource.
  Gc5e7ca..Gc5e7dc requires matching source rank and zero credited promotion.
  Gc5e826 rejects lock1; Gc5e830 requires GetTotalOvercome0. The remaining
  branches exclude leader, Mirage sortie entries and several deck cases.
  The helper requires reference classification supplied by caller and excludes
  all protected IDs rather than guessing from names. An absent live Mirage
  model must not be interpreted as permission to consume a sortie hunter.

Read-only source: DataDump local/inputs/extracted/lib/armeabi-v7a/libnative_core.so,
SHA256 c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Bounded Capstone5.0.7 Thumb instruction inspection corroborates existing native
symbols. G addresses = ELF/file position+10000 in these regions. Literal pools
are not instructions; snippets were restarted after pools to avoid inherited
Thumb IT state. DataDump was not edited and Ghidra was not invoked.

The request/receipt grammar already audited in read-only DataDump
findings/hunters/base-stats-visual-hunt/grouprankup-sellcard-bodies-2026-10-05.md
is separate from single RankUp: five decimal form fields src_rank/src_cnt/
target_rank/target_cnt/price; Gf586e4 RequestGroupRankUp; Gf58da0 callback.
Response ret_data.user.gold.cur is absolute. ret_data.card contains
removed_inst_id_list:number[] and target_list:[{inst_id,rank:{cur},
rank_up_cnt:{cur},exp:{cur}}]. Do not use single-target prev/cur receipt
nesting or removed_inst_list spelling for this route.

Replica policy explicitly retained: existing local trainingPrices level100 and
rank1000 are used through their existing getters. Native price formula therefore
computes1200/2200 per output for source grade1/2. These are NOT original numeric
prices. Stable ascending instance selection, with first targetCount surviving,
is local deterministic policy; original server selection order remains absent.
Full advancement resets EXP0 and credited promotion0, preserving all skill
levels/equipment/other owned fields, consistently with existing full RankUp
policy. It does not synthesize new hunters or choose a new hunter reference.
Only grades1/2 are admitted, matching the archived bulk UI scope. Native end-to-end confirmation remains pending.

Planning is pure: it returns updates, removed IDs, wallet destination and exact
native receipt. Caller must resolve ordinary reference eligibility, protect
leader/all decks/all active battle/search/arena/Mirage commitments, verify
published destination stats and level curves, apply all updates/removals plus
book history together, and roll back if atomic persistence fails. It verifies
request price/counts against published policy rather than trust a client quote.
No max-level requirement is imposed; this is the substantive bulk shortcut.

Focused tests prove underlevel two-output batches, unchanged inputs, identity
conservation, canonical native receipt, same existing price vectors, refused
mixed protections/locks/partial/awake/overcome states, unknown destination,
wrong client price and duplicate roster IDs. npx tsx tests/group-rank-up.ts and
npm run build passed. No live runtime activation was performed.


## Scene/grade proof and integrated transaction

Original full-text Thumb BL target scan found exactly two calls to constructor
Gc5d918: Geac0ee and Geac160. Their immediate argument1 is1 at Geac0ec and2 at
Geac15e. CSRSceneMgr.ApplyScene Gea6600 loads requested scene at Gea6708.
ADR Gea6712 constructs the table base Gea6744. TBH Gea673a uses branch-PC base
Gea673e; index99 halfword0x2cd2 targets Geac0e2; index100 halfword0x2d0b targets
Geac154. The original selector branches send99 at Gc5d820 and100 at Gc5d840.
Thus source grade1/2 and scene99/100 are fully closed; no literal-name guess.

The authenticated /gym/RankUpBundle route now invokes groupRankUpCards in
state.ts. It protects leader and ALL registered deck cases plus active campaign,
Search and Fight Club participants. It admits only published is_source0
references, and destination rank stats plus rank-level1 EXP0 must exist. Existing
Mirage run/entry actions remain refused; any carried HP differing from1000
causes a refusal rather than treating an unrepresented sortie as disposable.
A later actual Mirage run needs explicit registered-entry protection integration.

Book history projection is performed before mutation, so invalid historical
rows cannot leave a partly destroyed roster. The owned target fields, arrays,
book and gold are retained and restored if atomic persistence fails. Source
instance counters are not rewound/reused. No AP/BP clock regeneration occurs
for existing games during this unrelated transaction.

Tests now exercise actual route and restart under both legacy and production
namespace1 IDs>=1000000, preservation of trained skills/starter roster/decks/
wallet ownership, all active-mode/leader commitments, Mirage carried HP,
malformed-history throw preservation, failed-file-write rollback and retry when
no eligible sources remain. Date.now is locally frozen/restored for production
snapshot tests. Input/selection failures make no account changes.

Request contains no nonce or expected source serials. Identical successful calls
with sufficient remaining eligible hunters are distinct local batch operations;
this does not promise exactly-once handling of network retries. The repeated
request test proves refusal only when insufficient eligible sources remain.
Native UI verification and original numeric prices/server selection order are
still pending; no live hunter was unlocked, consumed or promoted.


Compiled encrypted HTTP verification passes with disposable production-namespace
sources: forged quote refuses without mutation, valid4-to1 advancement emits
exactcur fields/removals/gold3800, insufficient-source repeat refuses, and
restart preserves exact projected ownership apart from lobby fuel clocks.
--exercise-bulk requires --fixture; private preserved saves cannot be mutation
targets. Native rendering remains pending.
