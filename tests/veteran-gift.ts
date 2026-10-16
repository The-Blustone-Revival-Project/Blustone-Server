import assert from "node:assert/strict";
import {configuredVeteranGift,veteranGiftItem,planVeteranGift} from "../src/veteran-gift.js";
const policy=configuredVeteranGift("local-points","20")!,packet={inst_id:7,target_pvid:123,qty:1};
const inventory=()=>[{inst_id:6,ref_id:"unknown_unrelated",qty:999,lock:1,extra:{preserved:true}},{inst_id:7,ref_id:"GC6",qty:2,lock:0,extra:{preserved:true}}];
assert.equal(configuredVeteranGift(undefined,undefined),undefined);assert.equal(configuredVeteranGift("disabled",undefined),undefined);
for(const mode of [null,"","historical","local"])assert.throws(()=>configuredVeteranGift(mode,20));
for(const points of [undefined,null,0,-1,1.5,0x100000000,NaN,Infinity,"01","1e2","2.0",true])assert.throws(()=>configuredVeteranGift("local-points",points));
assert.ok(Object.isFrozen(policy));assert.equal(policy.pointsPerTicket,20);
assert.deepEqual(veteranGiftItem(policy),{id:"GC6",name:"Veteran Ticket",desc:"Give this ticket to another captain to award 20 Veteran Points.",rank:1,use_type:0,thumbnail_id:"",effect:"",sell_price:0,collect_qty:0});
const metadata=veteranGiftItem(policy);metadata.name="changed";assert.equal(veteranGiftItem(policy).name,"Veteran Ticket");
const items=inventory(),before=structuredClone(items),plan=planVeteranGift(packet,items,10,policy);
assert.deepEqual(plan,{index:1,remaining:1,vip_exp:30,receipt:{consumed_item_list:[{inst_id:7,qty:1}]}});assert.deepEqual(items,before);
assert.deepEqual(planVeteranGift({...packet,inst_id:"7",target_pvid:"123",qty:"2"},items,10,policy),{index:1,remaining:0,vip_exp:50,receipt:{consumed_item_list:[{inst_id:7,qty:2}]}});
plan.receipt.consumed_item_list[0].qty=999;assert.deepEqual(items,before);
for(const id of ["9007199254740993","18446744073709551615"]) {
  const source=[{inst_id:id,ref_id:"GC6",qty:1,lock:0}],copy=structuredClone(source);
  const result=planVeteranGift({...packet,inst_id:id,target_pvid:"18446744073709551615"},source,0,policy);
  assert.equal(JSON.stringify(result.receipt),`{"consumed_item_list":[{"inst_id":${id},"qty":1}]}`);assert.equal(result.remaining,0);assert.deepEqual(source,copy);
}
assert.equal(planVeteranGift({...packet,inst_id:Number.MAX_SAFE_INTEGER},[{inst_id:String(Number.MAX_SAFE_INTEGER),ref_id:"GC6",qty:1,lock:0}],0,policy).receipt.consumed_item_list[0].inst_id,Number.MAX_SAFE_INTEGER);
for(const field of ["inst_id","target_pvid"]){
  for(const value of [0,-1,1.5,true,undefined,"", "0","07","+7","7.0","7e0"," 7","18446744073709551616",Number.MAX_SAFE_INTEGER+1])assert.throws(()=>planVeteranGift({...packet,[field]:value},items,0,policy));
}
for(const qty of [0,-1,1.5,true,undefined,"01","1e0","1.0",0x100000000])assert.throws(()=>planVeteranGift({...packet,qty},items,0,policy));
for(const vip of [-1,1.5,NaN,0x100000000])assert.throws(()=>planVeteranGift(packet,items,vip,policy));
for(const patch of [{ref_id:"VIP1"},{ref_id:"local_gc6"},{lock:1},{qty:0},{qty:-1},{qty:1.5},{qty:0x100000000}]) {
  const source=inventory();Object.assign(source[1],patch);const copy=structuredClone(source);assert.throws(()=>planVeteranGift(packet,source,0,policy));assert.deepEqual(source,copy);
}
assert.throws(()=>planVeteranGift({...packet,inst_id:999},items,0,policy));
assert.throws(()=>planVeteranGift(packet,[...items,{...items[1],inst_id:6}],0,policy),/Duplicate/);
assert.throws(()=>planVeteranGift(packet,[{inst_id:"7",ref_id:"GC6",qty:1,lock:0},{inst_id:7,ref_id:"GC6",qty:1,lock:0}],0,policy),/Duplicate/);
assert.throws(()=>planVeteranGift({...packet,qty:3},items,0,policy),/Insufficient/);
const huge=configuredVeteranGift("local-points",0xffffffff)!;
assert.equal(planVeteranGift(packet,items,0,huge).vip_exp,0xffffffff);
assert.throws(()=>planVeteranGift(packet,items,1,huge),/overflow/);
assert.throws(()=>planVeteranGift({...packet,qty:2},items,0,huge),/overflow/);
assert.equal(planVeteranGift(packet,items,0xffffffff-20,policy).vip_exp,0xffffffff);
assert.throws(()=>planVeteranGift({...packet,inst_id:undefined},items,0,policy));
const getter={...packet};Object.defineProperty(getter,"qty",{get(){throw new Error("must not execute");}});
assert.throws(()=>planVeteranGift(getter,items,0,policy),/own data fields/);
console.log("Veteran gift planner: explicit LOCAL recipient points, genuine GC6, exact full64 numeric IDs, removal deltas, checked U32 math, zero tombstones, ownership/lock/alias/duplicate refusals and immutable inputs passed.");
