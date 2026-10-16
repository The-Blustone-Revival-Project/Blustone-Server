import assert from "node:assert/strict";
import {cardInstance} from "../src/bootstrap.js";
import {cardSyncIds,syncOwnedCards,LOCAL_CARD_SYNC_MAX} from "../src/inventory-card-sync.js";

assert.deepEqual(cardSyncIds(" [ 1, 9007199254740993, 18446744073709551615,1 ] "),
  ["1","9007199254740993","18446744073709551615"],"Decode full64 tokens before Number rounding; local duplicate requests coalesce");
assert.deepEqual(cardSyncIds("[]"),[]);assert.deepEqual(cardSyncIds([1,2,1]),["1","2"]);
for(const raw of [undefined,null,{},true,1,"null","{}","[0]","[-1]","[1.0]","[1e2]","[01]","[true]","[\"1\"]",
  "[18446744073709551616]","[1,]","[1,,2]",[Number.MAX_SAFE_INTEGER+1],["1"],Array(1),"x".repeat(32769),Array(LOCAL_CARD_SYNC_MAX+1).fill(1)])
  assert.throws(()=>cardSyncIds(raw),TypeError);
const a={...cardInstance(1000001,"001"),exp:137,lock:0,mirage_remain_hp:7219},b=cardInstance(1000002,"002");
const owned=[a,b],before=JSON.stringify(owned);
assert.deepEqual(syncOwnedCards("[1000002,1000001,1000002]",owned),{card:[b,a]});
assert.deepEqual(syncOwnedCards("[]",owned),{card:[]},"Empty targeted sync is not a whole-inventory clear");
const result=syncOwnedCards([1000001],owned);result.card[0].exp=999;result.card.push(b);
assert.equal(JSON.stringify(owned),before,"Returned card DTOs are detached and preserve actual rank/EXP/equipment/skills/lock/carry");
assert.throws(()=>syncOwnedCards("[1000001,999]",owned),/not owned/);
assert.throws(()=>syncOwnedCards("[9007199254740993]",owned),/not owned/);
assert.throws(()=>syncOwnedCards("[]",[a,a]),/duplicated/);
assert.equal(JSON.stringify(owned),before);
console.log("Card inventory sync: exact numeric full64 selectors, bounded/canonical batches, request-order deduplication, absolute detached owned DTOs, unknown/mixed refusal and empty targeted sync passed; no inventory grants/removals.");
