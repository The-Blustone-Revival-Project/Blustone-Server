# Configured Gem sale: native request, quote and deletion contract

`gem-sale.ts` prepares a pure gold-only sale candidate from explicit price rows
and currently owned unmounted Gems. No original numerical sale rows or Gem rolls
were recovered by this unit. Authenticated atomic inventory/wallet persistence
and immutable quote publication are root integration work. Tests use authored
fees11/17. No live save, server process, device inputs or APK were changed.

## Native request has scalar and batch forms

Immutable final ARM SHA256
`c4646ac3817b0008b6ea387fde9c8279fd439343ccc272acdc5883fab9d00eec`.
Addresses below are Ghidra; subtract0x10000 for ELF. Read-only DataDump
locators: `sources/native/economy/ghidra-gem-reference.txt`, corresponding
keys and `sources/native/symbols/native-evidence.tsv`. Request, lookup and
receipt were independently read from bounded immutable Thumb bytes.

RequestGemSell Ga56ffc takes a list<uint64> and callback. At Ga57014..18 an
empty list follows warning `Gem Instance ID List is empty`, without issuing
the request. At Ga57288..8e a single element enters scalar form: its two words
are loaded at Ga57294, converted to decimal string at Ga5729a, and assigned
form key **inst_id** resolved at Ga572a0.

For multiple entries, Ga57344 loads both64-bit words and Ga57348 stores them
in a JSON value tagged6 (unsigned integer) at Ga5734c. Each list element is
appended to a JSON array, then dumped into a form STRING at Ga57376. Its key
is **inst_id_list** resolved at Ga5737c. The route literal is **/gem/Sell**
at Ga5746e. The actual request carries neither price nor price_type; the
server selects the corresponding authoritative sale quote.

Examples: `inst_id=9007199254740993`, or
`inst_id_list=[9007199254740993,18446744073709551615]` as a form string.
Batch integer token text is preserved before JavaScript numeric rounding.
Exactly one field, positive uint64 IDs, nonempty unique arrays and canonical
form-string container are strict replica admission choices. The native request
generator emits integer JSON batch tokens; decimal-string IDs are also admitted
by the server parser without converting them to floating point.

## Exact rank, level and payment quote

ParseGemSellPrices Ga53e50 reads ret_data rows rank, level, price_type, price
as uint32;16-byte storage is payment+0, rank+4, level+8, price+12. Native
FindGemSellPrice Ga54ea0 iterates by16bytes at Ga54eb2. Rank is compared at
Ga54eba..be, level at Ga54ec2..c6, payment at Ga54eca..ce; all must match.
First match is returned. On miss Ga54edc loads the constant16-byte sentinel
`payment9,rank0,level0,price0` at Ga54ef0. Unavailable is distinct from an
explicit configured zero quote; duplicates refuse rather than selecting an
ambiguous first row. Owned Gem rank and level select the quote, not GemRef rank
or artwork suffix. Only type2 gold proceeds are supported by this helper;
alternative currencies/items and original numeric balance values remain gated.

## Receipt deletes the captured request list

ParseGemSell Ga5ddd8 receives the ORIGINAL list as its second parameter and
the JSON envelope as its third. It selects ret_data at Ga5ddf4, then user at
Ga5de04, gold at Ga5de18, cur at Ga5de20. Absolute `user.gold.cur` is applied
at Ga5de76 to user+154. Numeric JSON integer branch loads the low32word;
floating/string branch uses VCVT.S32.F64 at Ga5de64. The helper conservatively
admits nonnegative signed32 current/result balances and refuses overflow;
it does not reproduce a wrapped or negative native wallet.

Then `user.item` at Ga5de7c iterates rows containing inst_id/qty, resolved at
Ga5defc/Ga5df02. At Ga5dfe6 it invokes SetItemQuantity Gaec4bc with absolute
quantity. Therefore the gold-only receipt should contain user.item:[] to
preserve item inventory; a top-level additive item list is not this grammar.
No GDP/iap/free-iap field is read by this sale parser.

At Ga5e056..5a it passes the captured ORIGINAL submitted list to the deletion
helper Ga5e0c4. That helper loads the list node's uint64 at Ga5e0ee, compares
both halves with owned Gem PLAY_DATA.inst_id+10 at Ga5e12a/Ga5e158, and removes
matching entries. Sale deletion is not selected from returned `gems`,
`deleted_ids` or any other receipt ID array. No guessed deletion receipt field
is required. `ret_data.user.gold.cur` plus `user.item:[]` supplies this supported
settlement. A successful receipt may cause native deletion of every submitted
ID, so any invalid element requires whole-batch refusal before success.

## Local admission and replay limits

The planner requires known references, unique currently owned IDs and fully
valid supplied owned rows. Mounted Gems are conservatively refused regardless
of their owner's battle status; this rule must not be cited as original UI
eligibility until that consumer is independently closed. The caller must
qualify the supported ordinary no-Guild account context. Opaque ability data,
other owners, roster/decks/book, other Gems and all item records remain exact.

All IDs must still be owned at settlement. A replay after completed sale
refuses rather than crediting proceeds twice; mixed old/new batches also refuse
whole. Native deletion uses the callback's request capture, so the caller
cannot safely return generic success for an invalid list. This policy does
not provide universal successful retry acknowledgement: after a lost response,
client inventory refresh is required to reconcile sold Gem deletion. No
durable original sale ledger or server nonce semantics were recovered.

`npx tsx tests/gem-sale.ts` and TypeScript build pass. The pure checks cover
singleton/batch uint64 precision, original exact quote dimensions, duplicate/
missing/mounted/replay/overflow refusal, explicit zero quote and unchanged
input data. They are source/fixture evidence; native sale UI and actual original
price tables remain unverified.
