# Equipment rank-up: the final client has one direct request caller

A full executable-segment scan of the immutable final ARM library finds only
the already recovered ordinary popup call to `RequestEquipRankUp`. It does
not supply a missing Hunter sacrifice selector. Keep nonempty sources and
positive `card_qty` transactions refused: neither the general request vector
nor the reference field establishes original server eligibility.

## Reproducible bounded evidence

Original ARM SHA256:
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
The original executable PT_LOAD maps file offset0 to ELF0 and contains
34,657,056 bytes. The new Instrumented helper
`tools/audit-equipment-rank-caller.py` checks this hash, scans every halfword
for Thumb immediate BL/BLX/unconditional and conditional B.W, and every word
for ARM immediate B/BL/BLX. Including immediate branches catches possible
tail forwarding, rather than checking only calls. The segment contains data
as well as instructions, so this deliberately admits extra candidates.

Exactly one candidate targets ELF`0xf4a0bc` / Ghidra`0xf5a0bc`:
ELF`0xbca1f2`, bytes`7ff363ff`, Thumb`bl #0xf4a0bc`.
No other immediate caller or tail-forwarding candidate was found.
Register-indirect calls and possible calls from another shared object are
outside this scan; this is not a claim that every conceivable runtime call
has been eliminated.

Actual disassembly around the sole direct call verifies:

- ELF`0xbca174`: zero registerr0.
- ELF`0xbca176`: clear vector capacity at stack`+0x2c`.
- ELF`0xbca178`: clear vector begin/end at stack`+0x24/+0x28`.
- ELF`0xbca1e6`: choose PRICE_TYPE2.
- ELF`0xbca1e8`: supply that stack`+0x24` empty vector.
- ELF`0xbca1f2`: call the original requester.

The adjacent quote producer does store reference attr/card_qty:
ELF`0xbc6772` loads the two values, `0xbc6776` stores attr at popup`+0x67c`,
and `0xbc677a` stores card_qty at popup`+0x680`. Storage is not proof of a
working selector. The recovered affordability consumer checks gold/items;
the sole direct request caller still initializes and submits no Hunters.
See [the earlier capture audit](equipment-source-capture-native-2026-10-11.md)
for the complete source JSON capture/removal chain and its distinct limits.

From Instrumented with the existing research Python environment:

```powershell
& local/toolchains/python-venv/Scripts/python.exe -B tools/audit-equipment-rank-caller.py <original-armeabi-v7a-libnative_core.so>
& local/toolchains/python-venv/Scripts/python.exe -B tools/audit-equipment-rank-caller.py --self-test
```

The first command emits JSON containing the segment coverage, branch
candidates, original bytes and disassembly. The tool never writes the input
library. The pinned-original scan and independent forward/backward branch
decoder checks passed. Local output is ignored in Instrumented
`local/equipment-rank-caller-audit-20261013.json`.

## What this resolves

Searching for another direct final-client caller is now exhausted for this
library. A new successful nonempty-source workflow requires additional
production evidence, such as an original server transaction or a separately
identified indirect caller with its source-selection semantics. It should
not be implemented by borrowing Gym matching, quantities or protection rules.
No original equipment prices, source grades/attributes, paid transactions,
live inventory changes or APK modifications were recovered or performed.
