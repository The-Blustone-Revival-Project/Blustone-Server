# Mirage GetInfo: selectors, guarded cache updates, and enrollment boundary

Bounded original ARM inspection, 2026-10-17. Immutable DataDump input
`local/inputs/extracted/lib/armeabi-v7a/libnative_core.so`, SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
G addresses equal ELF code offsets plus `0x10000`. No original, runtime,
live account, UI, or saved game changed by this investigation.

Primary published sources:
`sources/native/hunters/ghidra-mirage-decomp-08.txt` begins with
`CSRExploreMirageInfo::RequestInfo` G92b30c;
`sources/native/strings/ghidra-mirage-strings-07.txt:24` onward locates
the request keys, and `ghidra-mirage-strings-13.txt` locates its matched
response parser's keys. Fresh bounded Thumb closes the following details.

## Exact request flags and section mask

`RequestInfo` G92b30c receives reset BYTE, stay BYTE, section-mask int,
callback, and a final transport/control BYTE. It sends auth5 and route
**`/mirage/GetInfo`**, with these form fields:

- `reset`: **string `"0"` or `"1"`**; exactly reset argument 1 chooses 1.
- `stay`: **string `"0"` or `"1"`**; exactly stay argument 1 chooses 1.
- `entry`: section-mask bit **1**.
- `inst_base`: section-mask bit **2**.
- `inst_enemy`: section-mask bit **4**.
- `ref_stair_list`: section-mask bit **8**.
- `ref_hero`: section-mask bit **16**.

Each section selector is likewise sent as form string 0 or 1. Note the
request key **`ref_stair_list`** differs from response key **`ref_stair`**.
Literal locations are G92b500/576/5ec/662/70c/782/7f8; route
literal G92b91c. There is no source roster, enrollment-ID list, carried
HP, payment type, price, floor choice, or explicit run nonce in this builder.

The exact boolean literals require matching the correct PC-relative ADD:
load G92b364 plus ADD G92b36a resolves `"0"`; load G92b368 plus
ADD **G92b36c** resolves `"1"`. A helper pairing the second load with
the preceding ADD can misleadingly print a nearby `"t"`; that is not
the form value used here. Selection/string construction is G92b366..384;
mask-to-string construction is G92b388..3ca.

## Client-side loaded-cache suppression

When reset argument is zero, G92b328..356 checks existing model cache
owners at `+0x54`, `+0x70`, `+0x94`, and `+0xa0`, and **XORs**
mask bits 2, 4, 8, and 16 for populated owners respectively. This is
the actual native XOR operation, not a universal AND-clear algorithm
for arbitrary caller masks. Normal full-mask31 calls use it to suppress
already loaded sections. Bit1 entry is not part of this four-owner test.

If the adjusted mask is zero, G92b35c takes the local completion path
without issuing HTTP. Reset argument 1 bypasses this suppression entirely.
These facts establish client cache request behavior, not server enrollment,
fresh-roster production, resource restoration or reset pricing.

Concrete bounded caller arguments include:

- `(reset0,stay0,mask31)` at G8f98d2 and Gcc6828.
- `(reset1,stay0,mask31)` at Gbfd900 and Gbfe494.
- `(reset1,stay1,mask31)` at Gbfcdd8, Gbfda9c, Gbfdf88,
  and Gbfe630.

Those calls demonstrate that both stay settings are real UI paths. They do
not by themselves recover which original server fields stay preserved or
how reset eligibility/fees differ between them.

## Matched success callback and authoritative presence

The matched inner callable G9359ac obtains `GetResultCode` at
G9359d2, compares it with **1** at G9359d6, and branches away from
the cache parse on non-success at G9359d8. This differs from End's
documented payload parser that can run after non-success/retry handling.

On accepted GetInfo data it tests child-key presence and independently
invokes:

- `Parse_Entry` G933aec at **G935b5c**.
- `Parse_InstBase` G933d80 at **G935bd6**.
- `Parse_InstEnemy` G92dff4 at **G935c50**.
- `ParseStairInfo` at **G935cca**, from response `ref_stair`.
- `ParseHeroInfo` at **G935d5c**, from response `ref_hero`.
- Achievement parsing at **G935ae4** when present.

No wallet or owned-item setter was found in this bounded callback body.
This is not sufficient proof that the original server reset was free.
Missing children preserve their corresponding native cached sections;
provided authoritative arrays/objects follow their own replacement parsers.
In particular an `entry` array resets every native owned Hunter's carried
HP to -1 before applying its rows, as established in
`mirage-entry-cache-preservation-native-2026-10-13.md`. Empty entry is
not an inert way to signal an unsupported enrollment operation.

## Original producer law remains unresolved

No separate native `RequestEntry` or `/mirage/Entry` route was established
by the bounded exported-symbol/route search. `LoadEntry` and `SaveEntry`
are deck-handler methods; `Parse_Entry` is a response cache updater.
`RegisterDeck` separately sends an ordered owned-ID list and only replaces
the selected Mirage party in its established callback. It does not produce
entry membership or full HP on its own.

The client therefore supplies no explicit enrollment selection in GetInfo.
The original server's initial entry roster, eligible Hunter rules, reset
selection, carried HP restoration, `stay` behavior, reset price/quota and
rotation policy remain **UNKNOWN**. Do not infer all-roster enrollment or
full healing from legacy owned HP1000, from the flag name, or from a request
for the entry section. Full native carry is10000; legacy1000 remains its
separate local historical convention.

A configured restoration can create an explicitly **LOCAL** run and bind
real owned, supported Hunters under a stated enrollment/reset policy. It
must then publish coherent entry/base/enemy/stair/hero caches and settle
owned carried HP atomically. This note provides the request/cache seam;
it does not claim that such production rules or a native new run have
already been recovered or validated.
