import assert from "node:assert/strict";
import {applyDispatchItems,dispatchPolicy,normalizeDispatch,dispatchEndWire,type DispatchJob} from "../src/local-dispatch.js";
import {parseEntrustEndResult} from "../src/expedition-entrust-end.js";
import type {LocalGameState} from "../src/game.js";
const policy={max_runs:2,gold_per_run:0,user_exp_per_run:0,card_exp_per_run:0,skip_price:1,entrust_second_per_cost:60,passes:{}};
const job:DispatchJob={deck:[1],pass:{end_datetime:"1970-01-01 00:00:00",end_datetime_utc:0},gold:0,user_exp:0,card_exp:0,
  items_per_run:[{ref_id:"AIRSHIP_TICKET",qty:2}],snapshot:{entrust_id:"42",stage_id:"n_01_01",cnt:2,complete_second:150,skip_price:1,entrust_second_per_cost:60,
    list:[0,1].map(serial=>({serial,gold:0,user_exp:0,card_exp:0,begin_utc:String(1800000000+serial*150),end_utc:String(1800000150+serial*150),item:'["AIRSHIP_TICKET","AIRSHIP_TICKET"]'}))}};
const game=(items:LocalGameState["items"]=[],next=10)=>({items,next_item_inst_id:next} as LocalGameState);
for(const ref_id of ["unknown","RP1","VIP1","FC1","local_library_trace_001","fish_01","local_gerard_trace"])
  assert.throws(()=>dispatchPolicy({...policy,items_per_run:[{ref_id,qty:1}]}));
for(const qty of [0,-1,257,1.1,NaN,Infinity,"1",true,null])
  assert.throws(()=>dispatchPolicy({...policy,items_per_run:[{ref_id:"AIRSHIP_TICKET",qty}]}));
assert.throws(()=>dispatchPolicy({...policy,items_per_run:[{ref_id:"AIRSHIP_TICKET",qty:1},{ref_id:"AIRSHIP_TICKET",qty:1}]}));
assert.throws(()=>dispatchPolicy({...policy,items_per_run:Array(1)}));
let invoked=false;const accessor={};Object.defineProperty(accessor,"items_per_run",{enumerable:true,get(){invoked=true;return [];}});
const getterPolicy={...policy};Object.defineProperty(getterPolicy,"items_per_run",Object.getOwnPropertyDescriptor(accessor,"items_per_run")!);
assert.throws(()=>dispatchPolicy(getterPolicy));assert.equal(invoked,false);
const getterArray:any[]=[];Object.defineProperty(getterArray,"0",{enumerable:true,get(){invoked=true;return {ref_id:"AIRSHIP_TICKET",qty:1};}});
assert.throws(()=>dispatchPolicy({...policy,items_per_run:getterArray}));assert.equal(invoked,false);
const iteratorArray:any[]=[];Object.defineProperty(iteratorArray,Symbol.iterator,{value:function*(){invoked=true;yield {ref_id:"AIRSHIP_TICKET",qty:1};}});
assert.throws(()=>dispatchPolicy({...policy,items_per_run:iteratorArray}));assert.equal(invoked,false);
const original=[{ref_id:"AIRSHIP_TICKET",qty:2}],parsed=dispatchPolicy({...policy,items_per_run:original});original[0].qty=200;
assert.equal(parsed.items_per_run![0].qty,2);
const joined=game([{inst_id:9,ref_id:"AIRSHIP_TICKET",qty:6,lock:0},{inst_id:4,ref_id:"AIRSHIP_TICKET",qty:7,lock:1},
  {inst_id:5,ref_id:"AIRSHIP_TICKET",qty:8,lock:0},{inst_id:3,ref_id:"RP1",qty:123,lock:0}]);
assert.deepEqual(applyDispatchItems(joined,job),[{inst_id:"5",ref_id:"AIRSHIP_TICKET",added:4}]);
assert.deepEqual(joined.items.map(row=>row.qty),[6,7,12,123]);assert.equal(joined.next_item_inst_id,10);
const locked=game([{inst_id:4,ref_id:"AIRSHIP_TICKET",qty:7,lock:1}]);
assert.deepEqual(applyDispatchItems(locked,job),[{inst_id:"10",ref_id:"AIRSHIP_TICKET",added:4}]);assert.equal(locked.items[0].qty,7);assert.equal(locked.next_item_inst_id,11);
const wide=game([],4294967301),wideItems=applyDispatchItems(wide,job);
const wideResult=parseEntrustEndResult({gold:{prev:0,cur:0},user_exp:{prev:0,cur:0,max_ap:{prev:50,cur:50},ap:{cur:50,ap_charge_time:0}},card_exp:[],item:wideItems});
assert.equal(dispatchEndWire(wideResult).item[0].inst_id,4294967301,"Normal End identity retains the high word unlike Search rewards");
for(const broken of [game([{inst_id:10,ref_id:"RP1",qty:0,lock:0}]),game([{inst_id:11,ref_id:"RP1",qty:0,lock:0}]),game([],0),game([],Number.MAX_SAFE_INTEGER),
  game([{inst_id:5,ref_id:"AIRSHIP_TICKET",qty:0xffff_ffff,lock:0}]),game([{inst_id:5,ref_id:"RP1",qty:1,lock:0},{inst_id:5,ref_id:"AIRSHIP_TICKET",qty:0,lock:0}]),
  game([{inst_id:2,ref_id:"RP1",qty:-1,lock:0}]),game([{inst_id:2,ref_id:"RP1",qty:1,lock:2}])]) {
  const before=structuredClone(broken);assert.throws(()=>applyDispatchItems(broken,job));assert.deepEqual(broken,before);
}
const journal={active:job,last_id:"0",last_deck:[]};assert.deepEqual(normalizeDispatch(journal),journal);
const bad=structuredClone(journal);bad.active.snapshot.list[1].item='["AIRSHIP_TICKET"]';assert.throws(()=>normalizeDispatch(bad));
const legacy=structuredClone(journal);delete legacy.active.items_per_run;for(const row of legacy.active.snapshot.list)row.item="[]";
assert.deepEqual(normalizeDispatch(legacy),legacy,"Existing no-item journal remains compatible");
const empty=game();assert.deepEqual(applyDispatchItems(empty,legacy.active),[]);assert.equal(empty.next_item_inst_id,10);
console.log("Dispatch capsule awards: explicit bounded registry, detached policy, source preview strings, locked-stack preservation, deterministic joins, safe allocation/overflow refusal and old/new journal coherence passed.");
