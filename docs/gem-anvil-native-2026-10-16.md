# Original Gem anvil display table and arithmetic

Source is original LEVELING.jet, already mirrored in Server at
resources/runtime/assets/LEVELING.jet,18524bytes, SHA256
ba73fff17002cc94f7f1a98bf657be1bef042283051a5b92c395347006d3c57e.
Base38-named ANVILHEATED starts at3119, compressed payload3143, header
total/raw/stored267/267/226, part0, typeRW. Decoded267-byte RW SHA256 is
fae1527132d31e47b7e714523971219333a2d57981817d1f262ca869b9054f47.
The inner RW length261 contains14 CSV rows, destination levels2 through15.
No production server prices or receipts are present in this table.

Original ARM SHA256 is
c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec.
Published DataDump sources/native/revival/ghidra-leveldata-decomp-04.txt
lines2806 onwards recovers CSRStaticData.LoadAnvilStatus Gf3e358, its map
at static+19c and CSV columns0/1/2 at lines2961/2963/2965. The third column
is NOT retained as a decimal float: direct instructions Gf3e4e6 convert
float32 to unsigned32, and Gf3e540 store its low BYTE at map node+1c.
The base remains float32 at node+18. Thus6.4 becomes6, while0.6 becomes0.

GetAnvilInfo Gf406f0 searches exact signed destination key. Its return has
destination at+0, float32 base at+4 and increment byte at+8. A missing key
returns destination0/base0/increment255 at Gf40722..72a; it is not a safe
zero-chance replacement.

The actual consumer is CSRPopUpGemLevelUp.Anvilheated Gbd0720: Gem polishing
UI, not equipment or Hunter advancement. CreateView Gbce868 reads selected
Gem pointer+7b8; Gbce870 copies Gem.level_up_failed+28 into popup+6b8;
Gbce876..878 copies Gem.level+1c into popup+6b0. Gbceb04 loads that failure
word into r1 and Gbceb0a calls Anvilheated. That function adds1 to current
level at Gbd0752 for GetAnvilInfo. It loads increment BYTE Gbd075a, multiplies
it by the passed failure word Gbd0764, then converts the wrapped32-bit product
as SIGNED to float32 Gbd076e and adds base Gbd077a. Large unsigned failure
counters therefore must not be modeled by unbounded JS multiplication.

The result feeds the percentage-text member+6a0 through a separate numeric
formatting/parsing path. This checkpoint exposes the exact float32 percentage
BEFORE that formatter and does not claim exact displayed text. It separately
models the downstream heat stage Gbd0854..86c: float32(percent*255/100),
upper-clamped to255, then divided by255. Literals Gbd0960/964 are255/100.
No lower clamp is established. Heat animation timing is separate again.
The heat helper takes the percentage at that downstream stage, rather than
asserting all unusual values survive text formatting unchanged.

src/gem-anvil.ts extracts the pinned original table and provides pure UI
projection helpers. Source parsing, missing-row sentinel and machine-width
behavior remain visible. No GetGemLevelUpPrice.possibility or
failed_compensation conversion/formula is inferred. Server RNG, success/fail
settlement, paid attempts, wallet effects, actual Gem growth and original
economic authority remain unproved and unchanged. Tests cover input corruption,
detached rows, decimal truncation, high-bit/overflow failure words and heat.
