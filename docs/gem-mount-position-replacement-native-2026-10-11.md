# Gem mounting: positions, full replacement and fee trigger closed

New bounded original-byte closure, no UI/runtime/owned changes. Same immutable
ARM SHA256 `c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses are Ghidra; code ELF offsets subtract0x10000. Relevant symbols in
DataDump `sources/native/symbols/native-evidence.tsv`: CSRSceneGem.UpdateOrigin
Ge09bc0, InitGems Ge08ed4, SimulateGem Ge1288c, OnButtonClick Ge0a124,
EquipGemCB Ge14068, CSRPopUpEquipGemConfirm.SetGemInfo Gbc8b70,
CSRGem.RequestGemEquip Ga557cc.

## Mounted position numbering and unlock

UpdateOrigin obtains GetEquipedGem(target) at Ge09cfe, iterates TYPE-grouped
owned Gems and reads each PLAY_DATA.position+20 at Ge09d32. It subtracts1
at Ge09d36 and writes the shared_ptr into:

`scene+0x760 + TYPE*16 + (position-1)*8`

TYPE0/1/2 is already resolved from GemRef.target1/2/3. Therefore mounted
position1 is first and position2 second. Native code does no local bound
check here: mounted position0 underflows the row, and position>2 can overwrite
adjacent scene state. Duplicate target/TYPE/position rows overwrite each other.
Strict server admission must reject invalid mounted positions and duplicate
occupancy before exposing owned rows. Target0 is unmounted and GetEquipedGem
returns empty groups; its position is not indexed by this consumer. Position0
is a reasonable explicit local unmounted convention, not a recovered global
requirement for all original unmounted rows.

InitGems Ge08ffc invokes Hunter.GetEquipRank(TYPE) and tests rank<3 at
Ge09000. Confirmation SetGemInfo invokes the same getter at Gbc8c36 only
for second column index1, tests rank<3 at Gbc8c3c and marks it locked.
Thus first position is ordinarily available, second requires THAT Hunter
equipment slot rank>=3. Hunter card rank, Gem rank, level or help family
do not unlock it. A conservative server should still require valid ordinary
equipment rank state and supplied refs; these branches are not permission to
create rank/gear/Gem data.

## Exactly three ordered two-entry arrays, zero clears a position

Scene's original grid lives at+760; edited/simulated grid at+790.
SimulateGem Ge1288c writes or clears edited cells by TYPE and zero-based
column (Ge12896–9e and Ge128f0–fa), then recalculates display. Applying
changes passes original grid via r2=scene+760 and edited via r3=scene+790
at Ge0a6f6/fa into confirmation SetGemInfo Ge0a700.

SetGemInfo captures these in stack+18/+1c at Gbc8b82 and constructs its
combination map from the AFTER grid. It loops TYPE0..2 (Gbc8bc0–c8) and
column0..1 (Gbc8bd2–da), even for locked/empty cells. A present AFTER Gem
appends its uint64 inst_id at Gbc8d2c–46. An absent AFTER Gem appends a
uint64 ZERO at Gbc91a6–be. Both append at the list tail; order is preserved.
RequestGemEquip serializes these lists into weapons/armors/accessories arrays.
It does not emit position values separately; array index+1 is the desired
owned position.

Examples of actual ordinary shape:

- weapons:[GemA,0], armors:[0,0], accessories:[0,0] mounts GemA in weapon1.
- weapons:[0,GemA] requests weapon2 and requires weapon equipment rank>=3.
- all three arrays[0,0] requests the complete empty layout for this target.

This is FULL desired layout replacement, not an additive list or only changed
slots. An unchanged occupied cell is included with its existing ID. Omitting
empty cells or compacting [0,GemA] to[GemA] would move it into position1.
General RequestGemEquip can serialize empty lists if called directly; that
does not override this final ordinary scene's proven six-entry shape.

Full replacement implies removed Gems must receive full refreshed rows in
ret_data.gems (the receipt parser reparses complete instances), with their
target changed to unmounted0 under the chosen local policy. Newly mounted and
retained Gems preserve ref/ability/roll/rank/level metadata. Unknown/new gem
instances are not inserted by ParseGemEquip, so mounting cannot double as a
grant mechanism. No original server database implementation is claimed.

## Exact removal fee trigger, including reordering

For each cell confirmation compares BEFORE/AFTER inst_ids. Equal occupied IDs
set changed flag r4=0 at Gbc8e5a–74. Different occupied IDs use r4=1 via
Gbc9150. An empty AFTER cell with occupied BEFORE sets r4=1 at Gbc91c4–ca.
New AFTER Gem with empty BEFORE also marks a visual change, but the fee gate
Gbc906a–72 requires BOTH nonnull BEFORE and changed flag.

Thus each changed previously occupied position incurs the BEFORE Gem's
disassembly fee, selected by its LEVEL (Gbc9076), PRICE_TYPE2 or1
(Gbc9084/Gbc90a2). An unchanged cell incurs none. Mounting into an empty
position incurs none in this confirmation total. Clearing an occupied slot
incurs one. Swapping two occupied positions incurs two, even though both
Gem IDs remain somewhere on the same Hunter. The UI does not globally dedupe
old IDs for pricing; valid unique occupancy must be established beforehand.

The TYPE4 payment option uses changed-old count, but its settlement currency/
item qualification remains unclosed. Numeric original disassembly rows are
missing. Configured local type2 prices could support a separate explicit
transaction once original/local reference provenance and auth/owner/active-use
protections are enforced. A read-only UI price of0 from missing references
does not prove free original unmounting.

Remaining original boundaries: direct moves between Hunters and whether the
source Hunter also requires fee/refresh, TYPE4 payment identities, original
fees and account/Gem acquisition records. Until cross-Hunter transfer is
closed, admitting only unmounted Gems or Gems already on the chosen target
is conservative local policy. Every transaction still needs wallet/material
validation, exact full affected Gem receipts and atomic persistence rollback.
