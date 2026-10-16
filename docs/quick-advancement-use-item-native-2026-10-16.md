# Quick advancement tickets and UseItem: bounded native evidence

Current implementation follow-up: optional `local-owned-tickets` settlement
is documented in [the owned-ticket policy](quick-advancement-local-ticket-2026-10-16.md).
Recovered protocol and preview rules are separated from its explicit LOCAL
counter-reset policy. Default remains guarded; original IAP verification and
ticket issuance are still absent. Historical blocker statements below record
the order of investigation, not a requirement for a server extra_data marker.

Read-only native investigation, 2026-10-16. Original DataDump input:
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Published symbol index: `sources/native/symbols/native-evidence.tsv`.
Addresses use Ghidra coordinates, ELF code address plus `0x10000`.
This note records bounded Thumb inspection of the immutable original, not
an implemented server operation or a live-client validation.

## Proven activation and ticket selection

`CSRPopUpIAPQuickRankUp::OnButtonClick` starts at Gcb33c0. Its owned-item
path checks the cached ticket reference at popup offset `+0xdc` through
`GetInstItemCnt` at Gcb34c0 and checks a positive quantity at Gcb34f0.
It then calls `CSRInventory::GetItemInst` at Gcb3524. The returned item is
dereferenced at Gcb352c without a separate null guard in this branch.
An absent-ticket path must not be represented as an owned zero-ID ticket.

The same handler calls `CSRSyncGlobal::ReqUseItem` at Gcb3844:

- Gcb37ce loads the selected card from popup `+0x100`;
  Gcb37d4 loads its full 64-bit owned instance ID from card `+0x10`.
- Gcb37ca loads the copied source ticket instance ID.
- Gcb3834 selects quantity **1**; Gcb3836 places the full target-card ID
  into the request arguments before the call.

Additional calls to this same requester occur at Gcb7296 and Gcb7c7c
inside the quick-rank popup continuation region. Their existence does not
establish a wider target domain.

The genuine reference names **SU1** and **SU2** are hardcoded by this UI:

- `IsIncompletionImmediatlyAdvanced` Gcb4e24 calls `FindCard` Gaeb5b0
  at Gcb4e74 and `CSRCard::GetRank` G86ac1c at Gcb4e7a.
- Its comparison at Gcb4e80 is rank **3**. The equality branch selects
  **SU1** (literal load Gcb4e82); the other branch selects **SU2**
  (literal load Gcb4e7e, conditional selection Gcb4e8a).
- `InCompletionImmediatlyAdvancedPopup` Gcb4978 repeats that selection:
  SU2 literal Gcb4a4a, comparison against 3 at Gcb4a4c, SU1 literal
  Gcb4a50, conditional move Gcb4a58. It calls `GetItemInst` at Gcb4a64
  and dereferences the result at Gcb4a6c.

**The non-3 branch is not proof that ranks 1, 2, 4, 5, or every other
rank are eligible for SU2.** A caller can constrain the domain before
this selection. Only the rank-3 selection itself is closed here.

## Request and callback contract

`CSRSyncGlobal::ReqUseItem` Gf6ab8c takes source instance ID uint64,
target instance ID uint64, quantity uint32, and a result callback.
The request uses the normal five auth fields (`app_code`, `app_ver`,
`market`, `pvid`, `otp`), with `inst_id` at Gf6acec, `target_id` at
Gf6ad16, `qty` at Gf6ad3e, and route `/world/UseItem` at Gf6aeb8.

`ReqUseItemCB` Gf6b2f4 checks result code 1 at Gf6b312. The accepted
response reads `ret_data` at Gf6b3cc, passes that object to achievement
lobby parsing at Gf6b3e2, and handles achievement data at Gf6b3fe.
Its relevant inventory/card mutations are:

- `consumed_item_list` (Gf6b402/40a): per-row full64 `inst_id`
  (Gf6b474), uint32 `qty` (Gf6b480), then `RemoveItem` Gaec5f4
  called at Gf6b564. This is a **consumed delta**, not absolute stock.
- `card.target_inst` (Gf6b5a2/b4): target `inst_id` Gf6b5c6,
  `rank.cur` Gf6b61a/624, `rank_up_cnt.cur` Gf6b69a/6a4, and
  `exp.cur` Gf6b6ee/6f8, then `SetCardRank` Gae9c78 at Gf6b76c.

The callback accepts server-supplied resulting rank and EXP; this does
not determine what the original server awarded. No AP/BP, gold, or
Veteran EXP setter was identified in this bounded callback call list.
It therefore does not establish owned consumption of the revival's
virtual `local_ap`, `local_bp`, or `local_rupee_pack` shop references.
GC6 gifting has a separate `/world/UseVIPTicket` contract.

See [the shared UseItem and inventory-sync contract](world-use-item-and-inventory-sync-native-2026-10-16.md)
for the distinction from absolute RefreshInven receipts.

## Pending-state gate and unresolved transition

`IsAvailableCondition` Gcb43e0 reads the local marker key with the
original spelling **`immediatly_rankup`** (literal references Gcb4400
and Gcb448c), through `GetMarker` Gb72798. It parses a pending instance
ID, calls `RemoveMarker` Gb726c0 with that key at Gcb449e, and searches the owned-card
map for the pending ID. Thus availability includes a pending cached
state, not merely a rank comparison against every owned hunter.

`SetData(uint64)` Gcb3fac finds the selected card at Gcb4092, gets its
rank at Gcb4098, and compares against rank 4 at Gcb409e. The nearby
`PACKPOP_02` / `PACKPOP_04` selection is popup presentation evidence;
it is not proof of the awarded rank or level. Another overload,
`SetData(int,uint64)` Gcb5330, is called by the continuation at
Gcb7afc. Its integer argument has not been closed as an award value.

The following remain **unresolved** and block enabling a successful
SU1/SU2 settlement from this note alone:

- Exact target rank domain, maximum-level requirement, and other
  eligibility conditions before the popup/cached-state path.
- Whether the award is exactly rank +1, the resulting level/EXP
  (level 1 versus maximum), and rank-up-count semantics.
- The producer and complete lifecycle of `immediatly_rankup`, including
  whether the original operation requires an account/package entitlement.
- Original ticket metadata, acquisition/issuance, and any purchase law.

No original ticket amount, entitlement, generic item-use effect,
currency debit, or grant is inferred. There is no UseItem implementation
change in this checkpoint. The separate historical advancement gold
display projection does not close these ticket transition rules.

## Follow-up: original-rank gate and next-rank level-1 preview

Further bounded original-native inspection closes two of the earlier
questions, with an important separation between an automatic-popup gate
and the server's settlement authority.

`IsAvailableCondition` Gcb43e0 admits its pending owned card only when:

- Gcb45d8 loads card `+0x24` (the rank field; `CSRCard::GetRank`
  G86ac1c is exactly a load from this offset). Gcb45e0 subtracts 3,
  Gcb45e2 compares with 1, and the unsigned-higher branch Gcb45e4
  rejects. This gate therefore accepts **only current ranks 3 and 4**.
- Gcb45ea gets `CSRCardInfoContainer`, Gcb45f4 calls its
  `GetCardData(ref_id)`, and Gcb45f8 calls `CSRCardInfo::GetMinRank`
  G87b302. Gcb45fe compares that result with the saved current rank;
  Gcb4600 rejects inequality. Thus the card must match the reference
  rank returned by this getter; the getter's exact first-row behavior
  and revival-reference incompatibility are described below.
- The following owned-card traversal excludes the pending card by its
  full64 ID at Gcb4686..4694. For another card with the same exact
  reference string, a greater rank excludes the candidate
  (Gcb4720..4728); equal rank with nonzero card `+0x28`
  (`rank_up_cnt`) also excludes it (Gcb476e..477c). Matches are
  collected and a nonempty collection makes the return ID zero at
  Gcb487c..488e. These are additional account-roster conditions.

There is **no maximum-level comparison in this exact gate**. The
`GetMinRank` call is a rank/reference test, not a level/MAX test. This
does not prove that every other activation path has identical gates,
nor that the original backend accepted any level.

The popup's preview is now positively closed:

- In `SetData(int,uint64)` Gcb5330, `CSRCardAnalyzer::Load` is called
  at Gcb5a00 for the selected full64 card ID.
- Gcb5a06 reads its rank; Gcb5a0a adds **1**; Gcb5a0e calls
  `CSRCardAnalyzer::SetRank` G86e7d4.
- Gcb5a14 sets argument 1 and Gcb5a16 calls
  `CSRCardAnalyzer::SetLV` G86df3c. Gcb5a26 gets that analyzer's
  detached instance, and Gcb5a32 initializes the after-preview card
  from it. Gcb5b70 computes the displayed after-power from the analyzer.
- Analyzer SetLV copies the card and calls `CSRCard::SetLV`
  G869cec at G86df8a. That setter records level at `+0x678` and
  derives EXP/min/max boundaries from the published `CSRUserLV`
  functions (`GetCardMinExp` G10a0da0 and `GetCardMaxExp`
  G10a0d0c), at G869cfc..9d1c. The supported statement is
  **next rank, level 1 according to the supplied level reference**;
  it does not independently prove a universal literal EXP value of 0.

The preview does not establish resetting the credited-material counter:
Analyzer SetRank reads the old card `+0x28` at G86e820 and passes it
to `CSRCard::SetRank` at G86e826. The actual UseItem response separately
supplies `rank_up_cnt.cur`. No original backend counter-reset rule is
recovered by treating this preview as an authoritative receipt.

### Caller and timing boundary

The direct opener at Gdc7280 creates/initializes this popup and calls
`SetData(uint64)` at Gdc72a8 with the closure's full64 card ID from
`+8`. Another opener at Ge3df56 calls `IsAvailableCondition`; its
nonzero return is the ID passed to `SetData(uint64)` at Ge3df78.
The one-argument setter queues a task at Gcb4272; the continuation
calls the two-argument setter at Gcb7afc. It is not a second rank award.

A neighboring bounded predicate Gdc70f0 finds the owned instance at
Gdc712e, obtains server time at Gdc7194, and calls
`CSRCard::GetJustRankUpRemainedT` G867a3c at Gdc719c. That getter
checks the numeric reference identifier at G867a58 against 900,
returns 0 for identifiers at least 900, and otherwise returns the
positive remainder of card `+0x18 + 3600 - supplied_time`
(G867a5e..7a68). The complete binding of this predicate to the
direct opener and the exact server origin/meaning of card `+0x18`
remain unclosed here. Do not convert this into an invented acquisition
timer or entitlement in persistent server state.

The decisive remaining blockers are the original pending-state producer,
all activation-path eligibility/timing requirements, and actual backend
settlement values (especially `rank_up_cnt.cur` and entitlement). The
rank3/rank4 minimum-rank gate and rank+1/level1 preview are concrete
progress, but do not authorize a general SU2 non-3 fallback or successful
UseItem implementation in this checkpoint.

### GetMinRank is the first published stat row, not a separate birth grade

`CSRCardInfo::GetMinRank` G87b302 does not search a base-info birth-rank
field and does not compute a numeric minimum over all rows:

- G87b306 loads the stat vector begin/end from CardInfo `+0xa0/+0xa4`.
- G87b30a..314 returns 0 for an empty vector/null first entry.
- G87b30e loads the first pointed entry; G87b32e reads that entry's
  first uint32 word and returns it (the no-control-block branch reads
  the same word at G87b34c).
- `sources/native/hunters/ghidra-card-stat-level-detail.txt`,
  `CSRCardInfo::GetStat` G87acc8, lines 26 onward, independently shows
  this same `+0xa0/+0xa4` vector being searched for rank and awake
  step as entry words 0 and 1.

Therefore the native name "MinRank" relies on the supplied reference
ordering. It returns the **first stat row's rank**. The revival's
ordinary rank-1-through-5 stat rows make this result 1, even where its
separate server-side recruitment birth-rank map says 3 or 4. Such a
reference cannot pass the automatic-popup rank3/rank4 equality gate.
The separate birth-rank map is not a native field read by this getter.

Changing reference row availability/order would affect existing owned
cards and other native consumers. This note does not propose trimming
rank1/rank2 references or changing earned hunters to activate the popup.
Reference compatibility must be solved explicitly before claiming this
native quick-advancement flow is usable with the current ordinary refs.

## Follow-up: the one-hour field is parsed regdate in seconds

The field identity and unit in the timer above are now positively closed.
`CSRCard::parse` G8680a4 loads literal **`regdate`** at G8681ac,
forms the key address at G8681b4, and indexes the card JSON at G8681b6.
Its numeric branch loads the value's low word at G8681ce. Its
floating/string-number conversion uses `VCVT.U32.F64` at G8681f6;
the default path supplies 0. At G868200 it stores the resulting low
uint32 together with the zero register r6 as a doubleword at **card
`+0x18`**. This field is not a full-width uint64 timestamp just because
its native storage occupies eight bytes. Canonical server wire values
should be integral numeric uint32 timestamps.

`GetJustRankUpRemainedT` G867a3c then reads exactly that field's low word
at G867a5e. G867a60 adds `0xe10` (**3600**), G867a64 subtracts the
supplied server time, and G867a66/68 returns the difference only under
the signed **GT** condition; otherwise the prior result 0 is returned.
Arithmetic is native low32 arithmetic, followed by a signed-positive
test. The earlier numeric-reference guard at G867a58/5c still applies.
Do not describe this as unbounded JavaScript timestamp arithmetic.

Seconds are established independently by the clock owner:

- `CGMTime::GetCurServerTime` G797628 calls `RMGetTickCount`
  G10ff8e8 at G79762e, divides the returned 64-bit quantity by **1000**
  at G797632..638, and applies its stored server-time offset at
  G79763c..642.
- `RMGetTickCount` calls imported `clock_gettime` G62225c with
  clock ID **0** at G10ff8fa..8fc. G10ff914..926 converts the
  realtime seconds/nanoseconds pair into milliseconds. Thus the
  divided clock represents realtime epoch seconds before server offset.
- `CGMTime::SetTime` G79794c also samples this clock divided by 1000
  at G79795c..966, stores that baseline at `+8`, and stores supplied
  server seconds at `+0x14` via G797974..976. The current-server getter
  returns supplied server time plus elapsed seconds.
- The bounded popup-region predicate passes `GetCurServerTime`'s
  result directly to `GetJustRankUpRemainedT` at Gdc7194..719c.

Consequently a revival factory that always emits `regdate:0` for a
newly earned ordinary hunter cannot expose a positive present-day
hour remainder through this getter. Timestamping an actually new
earned hunter with current server seconds would repair that missing
input. It must not rewrite old owned hunters, imply an original grant
date for migrated records, or turn transient Arena/Search templates
into newly earned ownership. The complete UI predicate binding and
original package/entitlement settlement remain separate unresolved
boundaries; a nonzero timer is not proof of backend purchase admission.

## Follow-up: local gacha marker and persistent purchase recovery are distinct

The pending marker's producer is now closed. It is not a required
`account.extra_data.immediatly_rankup` response field:

- `CSRLotteryX10Card::SetCharData(uint64)` Gb03f18 constructs the
  result-card display. Its displayed-rank check is `>=3` at
  Gb03f7e/80. It then calls `CSRPlayData::SetMarker64` Gb72280
  at Gb03fae with marker **`immediatly_rankup`**, subkey **`inst_id`**,
  and the full64 card ID loaded at Gb03fa0.
- `CSRPopUpGachaResult::SetCardData` Gcdfaa8 reads the same marker
  through `GetMarker` at Gce02ac. If present, it resolves the stored
  candidate through `FindCard` at Gce0336. When both cards resolve,
  Gce0370/378 reads their ranks and Gce039e/3a0 skips replacement
  when the existing candidate is greater. Otherwise it stores the
  displayed card's full64 ID through `SetMarker64` at Gce03ce.
  This comparison must not be promoted to a new backend award rule.
- `SetMarker64` builds a JSON object with the requested subkey and
  a uint64 value, then delegates to `SetMarker` Gb67bbc at
  Gb722e4. The latter indexes/updates **PlayData `+0x330`**
  (Gb67bca and Gb67be0), without a network request in this setter.
  `GetMarker`, `RemoveMarker`, and `ClearMarkerAll` use that same
  JSON owner. The published constructor export
  `sources/native/campaign/ghidra-campaign-marker-play-owner.txt`
  lines 222/223 initializes its `+0x338` payload and `+0x330` type
  to zero/null.
- `IsAvailableCondition` reads and **removes** this local marker at
  Gcb4412/Gcb449e, before testing the pending owned card. Its
  rank/reference/roster tests still decide whether it returns the ID.

Thus the normal native gacha result UI can generate the candidate from
the actual acquired card DTO. Injecting a server marker or extra-data
field is unnecessary for these positively identified producers. This
does not claim that no other generic native marker API can ever be
fed by server content; the claim is about this exact key's closed path.

There is a **second, persistent local record** for an already purchased
quick advancement that still needs consuming:

- `CSRUserDB::PutImmediatlyAdvencedCard(uint64)` G109c464 creates
  a per-user local DB key ending **`/IMMEDIATLY_ADVENCED_CARD`**
  (literal G109c484). It converts the supplied uint64 to a decimal
  string at G109c496 and writes via the local DB at G109c4a2.
  The corresponding getter G109c50c and remover G109c790 use
  the same key (literal loads G109c528 and G109c7b2).
- The success continuation queued by `PurchasePackageCB` Gcb3a58
  begins at Gcb6c24. Its result comparison Gcb6c42/44 accepts 1;
  it loads the selected card's full64 ID at Gcb6c4e/52 and writes
  this persistent recovery record at Gcb6c56.
- The continuation reads purchase-result **`item`** at Gcb6c62,
  iterates rows with **`inst_id`**, **`ref_id`**, **`added`**
  (literal loads Gcb6ce4/f0/f6), and calls `CSRInventory::AddItem`
  at Gcb6df2. These are purchase stock additions, not the later
  UseItem consumed deltas.
- It checks the popup-selected SU reference's owned quantity through
  `GetInstItemCnt` at Gcb7034, refuses the automatic continuation
  when zero at Gcb7058/5a, obtains the owned instance at Gcb7084,
  and invokes `ReqUseItem` at Gcb7296. Quantity is explicitly 1
  at Gcb7286; source and target IDs are supplied separately.
- Recovery methods `IsIncompletionImmediatlyAdvanced` Gcb4e24
  and `InCompletionImmediatlyAdvancedPopup` Gcb4978 start from
  the persistent UserDB getter at Gcb4e40/Gcb4998. The former
  checks the selected SU reference's current quantity at Gcb4f82
  and resolves the saved target card again at Gcb5136. This is
  evidence of recovery of an owned purchased ticket, not issuance
  of a ticket when no stock exists.
- Successful UseItem continuations remove the persistent record only
  after result 1: Gcb64f4..650c, Gcb7554..7566,
  Gcb7d78..7d94, and Gdc53bc..53d4. Non-success branches do
  not take these demonstrated removals.

The persistent getter's callers in the recovery methods pass its
returned low word as the target ID and explicitly zero the high word
(Gcb4e6e/70 and Gcb5132/34). The purchase-record setter accepts
uint64, but full-width recovery must not be assumed from that signature
alone. Current revival owned-card IDs fit the safe lower subset; this
note does not authorize changing or renumbering storage identities.

The two local owners explain normal-popup selection versus interrupted
purchase recovery without inventing a server entitlement journal.
Original purchase verification, ticket issuance/product economics,
complete alternative activation gates, and authoritative UseItem
`rank_up_cnt.cur` settlement remain outside the closed contract.
