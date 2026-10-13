# Fishing SellFish request and actual callback boundary

Original immutable ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`;
Ghidra code addresses ELF+0x10000. Direct bounded instruction, ELF literal and
manager callback-vtable analysis. DataDump/originals read-only; no live inputs,
catch grants, code/state or APK changes.

## Exact authenticated request

CSRMFishing.RequestSell Gb2d3ec takes fish_id STRING, unsigned32 grade,
unsigned32 qty and status callback. It preserves string r1 in sl Gb2d3f8,
grade r2 in r8 Gb2d3fc, qty r3 in sb Gb2d400. After app_code/app_ver/market/
pvid/otp auth5, key fish_id is inserted Gb2d54c and its supplied string copied
Gb2d55c. Grade is decimal unsigned string Gb2d564 under grade Gb2d56a;
qty is decimal unsigned string Gb2d58c under qty Gb2d592. Exact route literal
Gb2d6fe is /fishing/SellFish; native does not send count, fish_grade, price,
gold, owned stack ID, b/s/g list or multiple fish identities.

Actual shop sale caller CSRPopUpShopSell.OnButtonClick Gd53e9c requires
selected quantity popup+b0>=1 Gd53eee..ef4. Its fishing SELL_INFO branch
compares popup+ec to17 Gd53ef6..f00, supplies fish string popup+d0,
grade popup+e4, selected qty popup+b0 and calls RequestSell Gd53f32.
The17 here is a sale-info discriminator. This bounded observation alone
does NOT bind it to GetItem.use_type17; do not widen neutral metadata
admission from this comparison without the original SELL_INFO producer.

The current catalogue's exact grade1/2/3 to bronze/silver/gold quote mapping
remains positively pinned in fishing-catalogue-consumers-2026-10-13.md.
Request unsigned width is not permission for unsupported grade0 or arbitrary
selectors. Whole quantity admission and available count are server policy.

## Corrected first guard: ordinary body failure safely skips parsing

RequestSell enqueues through CPVHTTPManager.Enqueue at Gb2d796. That Enqueue
installs TASK_READY preprocessing vtable213d30c, callable G7ea7a0. It decrypts/
parses the body G7ea806, selects body.result_code G7ea80c/G7ea810 and stores
its converted value via CPVHTTPResponse.SetPVCode G7ea86a. SetPVCode G7ee878
writes response+4. GetResultCode G7eeaf8 returns this stored PVCode on normal
HTTP200; HTTP301/302/206 handling remaps special1001..1004, not2001.

Actual ReqSellCB Gb2db30 invokes GetResultCode Gb2db4c and requires1 at
Gb2db52..54 before entering its JSON parse/ParseSell branch. Thus the existing
HTTP200 result_code2001 refusal SKIPS ParseSell and reaches caller error.
No transport override, guessed empty fish row or authoritative zero inventory
is needed. An initial inner-callback-only reading appeared hazardous because
the later locally parsed result_code is not checked before ParseSell; tracing
the specific Enqueue producer closes that apparent hazard.

For result1, callback reparses body.result_code, selects ret_data
Gb2dbf4/Gb2dbfa, then passes THAT sale object to ParseSell Gb2dc02. The
successful standalone wrapper is therefore {result_code:1,ret_data:sale},
not ret_data.sell (the latter belongs to EndWithSell). Caller receives status
Gb2dc2e. Successful malformed sale data remains unsafe: ParseSell unconditionally
forwards sell_result Gb2b2a6..Gb2b2ba, and UpdateInven requires strict fish_id
Gb2ecae/Gb2ecbc with no initial null guard.

## Complete supported receipt shape, separate quantity models

Previous source audits positively pin:

```text
sale = {
  user: {gold:{prev:before,cur:after}},
  item: [{inst_id:exactUint64,qty:REMOVAL_DELTA},...],
  sell_result: {fish_id:exactString,b_cnt:remainingBronze,
               s_cnt:remainingSilver,g_cnt:remainingGold}
}
```

ParseSell Gb2b018 resets displayed sale delta to0, applies optional gold
uint32 cur-prev and absolute wallet cur. It does not call generic SyncUser
or require Manda scalar snapshots. The item list uses RemoveItem with uint64
ID and uint32 removal DELTA; repeat delivery would remove twice. sell_result
is independently an absolute replacement of all three fish counts, not a
delta or general item quantity list. Optional achievement must retain its
separately recovered schema; no invented achievement success is implied.

## Remaining transaction law

Existing explicitly imported fish count rows can now be represented faithfully
by GetInven and preserved without a catch producer. But a full SellFish
settlement also needs the relationship between those grade-count rows and
general item inventory instance stacks consumed by sale.item. The request
does not supply those stack IDs; server must select them authoritatively.
Count-only import must not create general item stacks or silently assume
sale.item[] proves there are none. Original fish metadata, price amounts,
inventory synchronization and original replay/nonce law remain missing.

An explicit local imported-inventory sale could be designed only after those
dependencies and its retry policy are declared. Do not fabricate original
stack identities or catches to enable it. Repeated identical fish_id/grade/qty
has no request nonce and can be a deliberate second sale, so unconditional
same-request success deduplication would itself invent a protocol rule.
For now, constructor/import/read support is substantive progress and ordinary
result2001 mutation refusal remains correct and native-parser safe.
