# Skill material inventory mutation contract

Read-only source audit of the original `libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below use Ghidra image coordinates (ELF code address +0x10000).
No live client, private save, DataDump file or original binary was modified.

## Single skill upgrade: subtract the consumed quantity

The single SkillUp callback invokes `CSRInventory::UseItem(JSON const&)`.
Existing DataDump evidence is
`sources/native/revival/ghidra-find-shard-wave-consume.txt`, lines64–169,
with literal resolution in
`sources/native/revival/ghidra-find-shard-wave-consume-keys.txt`.
Fresh direct Thumb disassembly closes widths and the underlying write:

- `Gaea604..60c` resolves row key `inst_id`. Integer JSON reads both words
  at `Gaea68e`; it is a full unsigned64 instance identity.
- `Gaea6bc..6c2` resolves key `qty`. Integer JSON reads its low word at
  `Gaea6f0`; string/float conversion uses `vcvt.u32.f64` at `Gaea612`.
  `Gaea61a..61e` puts the resulting word and an explicit zero high word on
  the stack. The effective positive quantity width is unsigned32.
- `Gaea620..626` calls the exported overload
  `_ZN12CSRInventory7UseItemEyy`, entry `Gaea714` (ELF `0xada714`).
- The overload searches the item map using the full64 ID at
  `Gaea73c..76e`. Missing identity takes the diagnostic path.
- For a matching existing stack, `Gaea7fa..800` loads quantity at map node
  offset0x18, subtracts the requested low word and stores the result.

Therefore a positive consumed row must be `{inst_id,qty:consumedDelta}`.
It is NOT an absolute remaining quantity, and `ref_id` is not consumed here.
Duplicate positive rows subtract repeatedly. There is no quantity-underflow
guard, zero-quantity erasure, reference validation or lock-field read in this
overload. Word arithmetic wraps on underflow. The server must validate stock
before settlement and emit only actual consumed deltas. Native keeps the
existing zero-quantity stack after exact exhaustion.

The overloaded C++ signature has two unsigned64 arguments, but the JSON
wrapper deliberately zero-extends its effective32 quantity. Do not infer a
full64 JSON quantity from the mangled signature.

## Multi skill upgrade: set absolute remaining quantity

The separately recovered Multi callback uses `SetItemQuantity(inst_id,remain)`.
Fresh disassembly of exported `_ZN12CSRInventory15SetItemQuantityEyj`,
`Gaec4bc` (ELF `0xadc4bc`,76bytes), verifies full64 lookup at
`Gaec4cc..500` followed by the absolute remaining-word write at `Gaec502`.
Missing identity is unchanged; it does not create a stack. Zero remains zero
without erasing the item. Thus Multi consumed-list rows require `remain`,
whereas the single callback requires the consumed `qty` delta.

## Policy and unknowns

The mutation consumers do not establish which inventory stacks the original
price/selection UI counts, how locked items are admitted, recipe item IDs,
role-specific recipes, or original quantities/prices. An exported inventory
`GetItemCount` function was not found in a bounded symbol check; that absence
does not prove the UI has no count helper. Lock exclusion, deterministic
stack order and any configured recipes must be explicitly local server
policy. Historical screenshot `5030/4` notation is owned/required quantity,
never an original reference ID.

Neither callback shape proves transparent replay repair. Repeating a single
positive delta subtracts again; absolute Multi rows set existing stacks only.
Client-cache recovery after a lost reply needs independently established
inventory refresh behavior; do not claim original idempotency or a request
nonce.
