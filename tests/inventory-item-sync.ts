import assert from "node:assert/strict";
import {itemSyncRefs,syncOwnedItems,LOCAL_ITEM_SYNC_MAX} from "../src/inventory-item-sync.js";
import type {LocalItemInstance} from "../src/game.js";

assert.deepEqual(itemSyncRefs('["AIRSHIP_TICKET"," α ","AIRSHIP_TICKET","α"]'),["AIRSHIP_TICKET"," α ","α"]);
assert.deepEqual(itemSyncRefs(["001","1","AIRSHIP_TICKET"]),["001","1","AIRSHIP_TICKET"],"Reference spelling is never treated as numeric identity");
assert.deepEqual(itemSyncRefs("[]"),[]);assert.deepEqual(itemSyncRefs([]),[]);
for(const raw of [undefined,null,{},true,1,"null","{}","[1]","[true]",'[""]','["\\ud800"]',
  '["AIRSHIP_TICKET",]',Array(1),[1],[""],["\udfff"],"x".repeat(32769),Array(LOCAL_ITEM_SYNC_MAX+1).fill("A")])
  assert.throws(()=>itemSyncRefs(raw),TypeError);
let getterCalls=0;const getter:unknown[]=[];Object.defineProperty(getter,"0",{enumerable:true,get:()=>{getterCalls++;return"A";}});
assert.throws(()=>itemSyncRefs(getter),TypeError);assert.equal(getterCalls,0);
const prototype=Object.create(["A"]);assert.throws(()=>itemSyncRefs(prototype),TypeError);

const a={inst_id:9,ref_id:"A",qty:0,lock:1,buy_cnt_gold:0,buy_cnt_manda:0,note:{history:[1,2]}},
  b={inst_id:"9007199254740993",ref_id:"B",qty:0xffff_ffff,buy_cnt_gold:0xffff_ffff},
  c={inst_id:"18446744073709551615",ref_id:"A",qty:8,buy_cnt_manda:7},
  unrequested={inst_id:10,ref_id:"unknown-imported",qty:3};
const owned=[a,b,c,unrequested],before=structuredClone(owned),known=new Set(["A","B"]);
const result=syncOwnedItems('["B","A","B","unowned"]',owned,known);
const json=JSON.stringify(result);
assert.ok(json.includes('"inst_id":9007199254740993'));assert.ok(json.includes('"inst_id":18446744073709551615'));
assert.ok(!json.includes('"inst_id":"'),"Canonical string storage IDs become exact numeric tokens");
const decoded=JSON.parse(json,(_key,value,context?:{source:string})=>typeof value==="number"&&!Number.isSafeInteger(value)?context!.source:value);
assert.deepEqual(decoded.item.map((row:any)=>[row.ref_id,row.inst_id,row.qty]),[["B","9007199254740993",0xffff_ffff],["A",9,0],["A","18446744073709551615",8]],"Requested reference order retains every owned stack in stable inventory order");
assert.equal(Object.hasOwn(decoded.item[0],"buy_cnt_manda"),false,"Absent counters stay absent; native defaults them to0");
assert.equal(decoded.item[0].buy_cnt_gold,0xffff_ffff);assert.equal(decoded.item[2].buy_cnt_manda,7);
(result.item[1].note as {history:number[]}).history.push(99);result.item[1].qty=123;
assert.deepEqual(owned,before,"All returned instance fields and nested retained metadata are detached");
assert.deepEqual(syncOwnedItems(["unowned"],owned,known),{item:[]},"Unowned refs do not synthesize zero-ID or deletion rows");
assert.deepEqual(syncOwnedItems([],owned,known),{item:[]});
assert.throws(()=>syncOwnedItems(["unknown-imported"],owned,known),/not published/);
assert.throws(()=>syncOwnedItems(["A","unknown-imported"],owned,known),/not published/);
assert.deepEqual(owned,before,"Mixed unsupported batch cannot partially mutate stocks");
assert.deepEqual(syncOwnedItems(["A"],[{inst_id:"9",ref_id:"A",qty:1}],known),{item:[{inst_id:9,ref_id:"A",qty:1}]});
const structural:LocalItemInstance[]=[{inst_id:17,ref_id:"A",qty:4,lock:0}];
assert.deepEqual(syncOwnedItems(["A"],structural,known),{item:structural},"Existing LocalItemInstance input remains structurally compatible");
for(const row of [{...a,inst_id:0},{...a,inst_id:-1},{...a,inst_id:Number.MAX_SAFE_INTEGER+1},{...a,inst_id:"09"},
  {...a,inst_id:"18446744073709551616"},{...a,inst_id:1.5},{...a,inst_id:"0"},
  {...a,qty:-1},{...a,qty:1.5},{...a,qty:0x1_0000_0000},{...a,buy_cnt_gold:undefined},
  {...a,buy_cnt_gold:-1},{...a,buy_cnt_manda:0x1_0000_0000},{...a,ref_id:""},{...a,ref_id:"\ud800"}])
  assert.throws(()=>syncOwnedItems(["A"],[row],known),TypeError);
assert.throws(()=>syncOwnedItems([],[a,{...a,inst_id:"9"}],known),/duplicated/);
const hidden={...a};Object.defineProperty(hidden,"qty",{enumerable:true,get:()=>{getterCalls++;return 1;}});
assert.throws(()=>syncOwnedItems(["A"],[hidden],known),TypeError);assert.equal(getterCalls,0);
const codec=JSON as typeof JSON&{rawJSON?:unknown},rawCodec=codec.rawJSON;
try{codec.rawJSON=undefined;assert.throws(()=>syncOwnedItems(["B"],owned,known),/rawJSON/);}
finally{codec.rawJSON=rawCodec;}
assert.deepEqual(owned,before);
console.log("Item inventory sync: exact reference selectors, bounded dense batches, all matching zero/multi stacks, full64 numeric wire IDs, absolute counters, detached extra fields, known-reference admission and malformed-stock refusal passed; no grants/deletion claims.");
