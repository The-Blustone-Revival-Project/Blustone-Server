# Hunter Library empty-role crash and navigation metadata

Root verified native CardInfo map count14, then opening Hunter Library crashed
in original `CSRCardBookPageDraw::SetRole`, PC ELF8630b5/LR862ead, with a fault
near zero. HTTP/GetCard registration was successful; catalogue usability was
not. The earlier assumption that neutral role bonus rows alone made Library
safe is disproven.

Bounded Thumb disassembly of the immutable original ARM library was saved
privately to `local/research/cardbook-setrole-disasm-20261011.txt`. No Ghidra,
ADB/UI, native getter or client patch was used in this investigation.

## Exact consumer chain

- `SelectCardByRole` ELF86cb58 compares the exact native role at86cb98–9e.
  With boolean1, it also excludes CardInfo byte3c nonzero at86cbaa–b0. That
  byte is `is_source`; published ordinary Hunters supply0.
- `SetRole` calls that selector at86292a with the requested role and boolean1.
  It obtains each candidate CardInfo at862ea8, reads field4c at862eb4, compares
  it with0 at862ee2, and skips zero candidates at862eea.
- Field4c is the trace collection threshold. The existing recovered evidence
  `hunter-trace-item-binding.md` pins its writer: CardInfo PostProcess
  G87d3c8/3ca copies ItemInfo.collect_qty into4c after matching
  `use_type3/effect=exact Hunter reference ID`. This is separate from the
  neutral CardBook role/count bonus rows.
- With no retained candidates, SetRole's page row vector remains empty. At
  ELF862f60 it branches straight to8630b4. There, `ldr r0,[sb,#-0xc]!`
  dereferences the last vector element without testing an empty vector.
  Endpointer0 yields faultfffffff4, matching the root's observed crash.

The current item references previously had positive trace bindings only for
Gerard005 and Sylvester006. Thus the Library could have empty role tabs even
with the legacy six references. Adding eight neutral references did not provide
the missing native item post-processing metadata. A script test that only
checked GetCard rows could not catch this consumer requirement.

## Scoped server correction

Only `BLUSTONE_CARD_REFERENCE_PROFILE=materials` adds local navigation-only
trace item references for published Hunters lacking an existing005/006 binding.
Each uses a clearly local ID `local_library_trace_<reference ID>`, `use_type3`,
the exact Hunter ID as its string effect and positive collect_qty1.

Original trace IDs and collection thresholds remain unknown. Positive1 is an
explicit local navigation gate for the original Library consumer, not a
recovered threshold or an earned exchange price. The rows have no acquisition
links, sources, drops, inventory stacks, shop offers or redemption handler.
They are deliberately excluded from HUNTER_TRACE_ITEMS, which continues to
own the existing Search/exchange whitelist. Existing005/006 rows, prices and
links remain unchanged; default starter profile is unchanged.

The dedicated isolated-profile test proves14 positive item post-processing
bindings, nonempty role1–4 candidate groups, all prior item rows unchanged, and
unchanged acquisition links, inventory and recruitment. Existing hunter-traces
and trace-exchange tests plus the TypeScript build pass. Root owns restart and
native UI proof; host tests do not establish that the crash has stopped live.

## Further catalogue breadth after native validation

The unchanged E7 resource profile already completes four additional ordinary
material identities: Metis007, Hecate011, Bruce Bang016 and Robin018. With
materials selection that would prepare18 ordinary references, independently of
Episode completion. This is readiness, not authorization to bypass earned E7.

A separate E6 material batch could instead complete existing base bodies for
Locke014, Acerola030, Dumble048 and Dino054 using11 missing Q/effect/voice packs.
All11 original files are already imported; adding their named groups requires
a new coherent resource stamp and native download/Library checks. Do not
activate a large catalogue just because84 further base identities have complete
original files on disk. Original source availability, selected profile, native
registration, Library rendering and playable ownership are distinct gates.

The 2026-10-11 release adds no normalized identity, graph, reward or symbolic
skill rows (all change counts0). Its useful non-stat contribution is stronger
dated cross-language/era context; it supplies no new ordinary trace IDs or
original collection thresholds that could replace this local navigation policy.
