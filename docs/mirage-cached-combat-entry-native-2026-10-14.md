# Mirage combat starts from hydrated caches, not a guessed Begin receipt

2026-10-14. Read-only original ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code coordinates ELF+0x10000. Existing DataDump Mirage findings and
preserved decomp were read first, then bounded original Thumb branches were
verified. Server doc only; no live inputs, original/DataDump writes, catalogue
values, floors, stats or rewards invented.

## Existing and newly closed seams

Existing source already closes GetInfo's optional ret_data entry/inst_base/
inst_enemy/ref_stair/ref_hero dispatch; original grade indices0..3, balance
divisor10000, postfix resource composition and native stair states are in
DataDump's Mirage stair-consumer note. Current Server serves a guarded empty
initial lobby and refuses actual runs. This note does not repeat that lobby
as a restored combat milestone.

### Confirmation starts a cached scene directly

`CSRPopUpExploreMirageConfirm::OnButtonClick Gc03374` identifies **BT_NEXT**
at Gc033dc. That branch gets base info Gc033f0..f4 and walks its **deck list
at base+10/+14**, reading full64 IDs at node+8 Gc03404 and skipping zero IDs.
No nonzero selected ID leads to the "set sortie Hunters first" popup
Gc03612..62a.

For every nonzero deck identity it retrieves the owned Hunter via
CSRInventory.GetCardInst Gaeb5b0 at Gc03466, then reads
**CSRCard.GetMirageRemainHP G869fd0** at Gc0346c. A zero result stops the
walk Gc03424..26 and leads to the localized incapacitated-Hunter popup
Gc03598..5b0. Passing every row reaches Gc03594→Gc0363e, supplies scene
**0x81** at Gc03640, and calls the scene transition Geb404c at Gc0364e.

This successful bounded BT_NEXT branch performs no RequestBegin or HTTP
builder call. It uses already hydrated owned IDs and carried HP. Do not
invent a `/mirage/Begin` server receipt by analogy with Hunter Search or
ordinary mission Start. The positive mechanism is confirmation→native
Mirage scene using caches; a separate undiscovered producer is not claimed
globally absent. The native condition is HP==0, not a proved negative-HP
sentinel admission rule or proof that unknown/missing Hunters are safe.

### Mirage scene consumes the cached selected resource/deck/enemies/stair

`CSRExploreMirage.InitBeforeOpen G925118` reads cached GetResName at
G9252e0 and copies it into its scene stage/background context G9252e6..2fe;
it initializes the game scene with scene/type **0x26** G92531e..322. This is
not a server stage ID or a request field.

`MakeStageInst G925798` gets cached base info G92581c..820. Its player-side
loop walks base.deck full64 IDs G9258b0..8ee and resolves real owned cards
at G925916→Gaeb5b0 before constructing battle actors. It subsequently gets
cached enemy info at G925c4a..52 and stair info G925c58..62. It searches
the generated one-based stair ordinal against **base.stair+44**
G925c7a..c90. A matching row loads signed balance at row+c and applies
float32 multiplication G925cac..cbc; only lookup miss uses default1.0
G925cbe. The previously recovered divisor is10000. A supplied zero balance
therefore means zero scaling, not an absent/default row.

Nonempty enemies require actual published Hunter references and their own
progression/skills/art. Current campaign monster IDs are not interchangeable
with these ordinary card-instance consumers. No new owned Hunter is implied
by publishing an enemy clone reference.

## GetNextFloor is not battle hydration

Recovered RequestNextFloor G9322d8 posts `/mirage/GetNextFloor` with auth5
only; callback G938a60 guards application result1 and passes numeric
ret_data.next_floor to its captured UI callback. Failure/missing data defaults
to0. It does not itself parse base/enemy/stairs or select a resource postfix.

Its original caller is the popup's OnButtonClick branch at Gbfadde. The
delegated callback **Gbfdeec** compares the returned word with current
base.floor+40 at Gbfdf40..4c. **Equal floor** invokes
RequestInfo G92b30c with reset1/stay1/mask0x1f at Gbfdf7c..88.
**Different floor** enters the retry-confirm path, passing an unsigned
currentFloor<nextFloor flag and the returned target word
Gbfdfa2..dfc6. Thus failure's zero can equal the empty lobby's floor0 and
cause the reset/stay refresh even though NextFloor failed. The existing
Server reset refusal must remain; blindly returning another empty successful
GetInfo could clear actual carried HP.

The returned scalar is not proof of floor assignment or a monotone +1 rule.
Original daily assignment/reset, floor/stair lists and exact transition/retry
admission must be recovered or explicitly supplied before enabling it.

## Concrete next implementation toward nonempty Mirage

The next source-backed code unit is a **pure complete supplied-cache decoder
and consumer readiness check**, rather than another empty lobby or fabricated
Begin route. Bind its enemy Hunter IDs to the published reference registry;
bind entered/selected owned IDs to the real account; preserve carried HP;
require supplied inst_base/stair/postfix/hero metadata and declared resources;
verify selected stair/resource and enough enemy/deck data before publication.
Reconstruct only exact parser components whose domains are closed, labeling
unknown producer values rather than defaulting them.

GetInfo can supply caches needed for native preparation, but Parse_Entry resets
all native owned Mirage HP before applying supplied rows. A complete owner
snapshot must represent every established commitment; it cannot infer entry
membership from ordinary parties or default HP1000. Empty postfix vectors are
unsafe at random resource selection, and grade/balance0 have actual consumer
effects. No arbitrary neutral rows or future hero expiry can stand in for
the original catalogues.

Still missing for a playable persistent run: original or explicitly configured
floor assignment, supplied stair grade/balance/resource rows, weekly hero
selection/deadline, actual enemy groups/stats, entered-Hunter duplicate
selection/admission, carried HP settlement, End/reward transitions, revive
costs and loss/retry/replay authority. Existing original MIRAGE art supplies
visual assets, not those numerical laws. The confirmation/cache proof narrows
the implementation seam; it does not claim nonempty native preparation or
combat was tested in this task.
