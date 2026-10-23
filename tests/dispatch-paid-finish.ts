import assert from "node:assert/strict";
import {normalizePaidDispatchFinish,projectPaidDispatchFinish,planPaidDispatchFinish} from "../src/dispatch-paid-finish.js";
import type {EntrustStart} from "../src/expedition-entrust-snapshot.js";

// All rewards, rate, pass expiry and ownership below are explicit LOCAL data.
// No original price table, acquisition grant or native gameplay is claimed.
const snapshot:EntrustStart={entrust_id:"18446744073709551615",stage_id:"n_01_05",cnt:3,complete_second:100,
  skip_price:25,entrust_second_per_cost:100,list:[0,1,2].map(serial=>({serial,card_exp:13,user_exp:11,gold:7,
    begin_utc:String(1000+serial*100),end_utc:String(1100+serial*100),item:'["AIRSHIP_TICKET"]'}))};
const raw={app_code:"_SR",app_ver:"28010",market:"GOOGLE",pvid:"7",otp:"dummy",entrust_id:snapshot.entrust_id,
  serial:"-1",use_iap_qty:"4",is_tuto:"0",is_iap_pass:"0"};
const wallet={free_iap_qty:2,iap_qty:5},before=structuredClone({snapshot,raw,wallet}),listRef=snapshot.list,rowRef=snapshot.list[2];
const plan=planPaidDispatchFinish(snapshot,1000,undefined,raw,1000,wallet);
assert.deepEqual(plan.finish,{completed_at:1000,charged_fee:4});assert.deepEqual(plan.wallet,{free_iap_qty:0,iap_qty:3});
assert.deepEqual(Object.keys(plan).sort(),["finish","receipt","wallet"]);
assert.deepEqual(plan.receipt,{skip_price:25,list:snapshot.list.map(row=>({...row,end_utc:"1000"})),user:plan.wallet});
assert.notEqual(plan.receipt.user,plan.wallet);assert.notEqual(plan.receipt.list,snapshot.list);
assert.ok(BigInt(plan.receipt.list[2].end_utc)<BigInt(plan.receipt.list[2].begin_utc),"wire projection may finish a future run before original begin");
const projected=projectPaidDispatchFinish(snapshot,plan.finish);
assert.deepEqual(projected,{...snapshot,list:plan.receipt.list});assert.notEqual(projected.list,plan.receipt.list);
assert.deepEqual(projectPaidDispatchFinish(snapshot),snapshot);assert.notEqual(projectPaidDispatchFinish(snapshot).list,snapshot.list);
assert.deepEqual(normalizePaidDispatchFinish(plan.finish,snapshot,0),plan.finish);
assert.deepEqual(normalizePaidDispatchFinish(plan.finish,snapshot,1000),plan.finish,"expiry equality is expired, matching native strictgreater comparison");
assert.equal(planPaidDispatchFinish(snapshot,-1,undefined,raw,1000,{free_iap_qty:4,iap_qty:0}).wallet.free_iap_qty,0);
assert.deepEqual(planPaidDispatchFinish(snapshot,0,undefined,raw,1000,{free_iap_qty:6,iap_qty:2}).wallet,{free_iap_qty:2,iap_qty:2});
assert.deepEqual(planPaidDispatchFinish(snapshot,0,undefined,raw,1000,{free_iap_qty:0,iap_qty:4}).wallet,{free_iap_qty:0,iap_qty:0});
assert.deepEqual(planPaidDispatchFinish(snapshot,0,undefined,raw,1000,{free_iap_qty:0xffff_ffff,iap_qty:0}).wallet,
  {free_iap_qty:0xffff_fffb,iap_qty:0},"funds sum follows native unsigned domain, not signed wallet truncation");
assert.deepEqual(normalizePaidDispatchFinish({completed_at:1100,charged_fee:3},snapshot,1000),{completed_at:1100,charged_fee:3});
assert.throws(()=>normalizePaidDispatchFinish(plan.finish,snapshot,1001),/Pass/);
assert.throws(()=>normalizePaidDispatchFinish({...plan.finish,completed_at:1001},snapshot,0),/quote/);
assert.throws(()=>normalizePaidDispatchFinish({...plan.finish,charged_fee:3},snapshot,0),/quote/);
assert.throws(()=>normalizePaidDispatchFinish({...plan.finish,extra:1},snapshot,0));
assert.throws(()=>normalizePaidDispatchFinish(plan.finish,{...snapshot,entrust_second_per_cost:200},0),/quote/);
assert.throws(()=>projectPaidDispatchFinish(snapshot,{...plan.finish,charged_fee:5}),/quote/);
assert.throws(()=>projectPaidDispatchFinish(snapshot,{...plan.finish,completed_at:1300}),/horizon/);
for(const now of [0,999,1300,1301,NaN,1000.5,0x8000_0000])
  assert.throws(()=>planPaidDispatchFinish(snapshot,0,undefined,raw,now,wallet));
for(const expiry of [1001,0x8000_0000,NaN,0.5])assert.throws(()=>planPaidDispatchFinish(snapshot,expiry,undefined,raw,1000,wallet));
for(const prior of [plan.finish,{completed_at:1100,charged_fee:3}])
  assert.throws(()=>planPaidDispatchFinish(snapshot,0,prior,raw,1000,wallet),/already/);
for(const badWallet of [{free_iap_qty:1,iap_qty:2},{free_iap_qty:-1,iap_qty:10},{free_iap_qty:1,iap_qty:-1},
  {free_iap_qty:0xffff_ffff,iap_qty:1},{free_iap_qty:0x1_0000_0000,iap_qty:0},{free_iap_qty:1.5,iap_qty:10},
  {free_iap_qty:NaN,iap_qty:10},{free_iap_qty:10,iap_qty:0,gem:99}]) {
  const copy=structuredClone(badWallet);assert.throws(()=>planPaidDispatchFinish(snapshot,0,undefined,raw,1000,badWallet));
  assert.deepEqual(badWallet,copy);
}
for(const delta of [{serial:0},{serial:2},{serial:"-01"},{serial:true},{is_tuto:1},{is_tuto:"00"},{is_iap_pass:1},
  {is_iap_pass:false},{use_iap_qty:0},{use_iap_qty:3},{use_iap_qty:5},{use_iap_qty:"04"},{use_iap_qty:true},
  {entrust_id:"1"},{entrust_id:Number(snapshot.entrust_id)},{entrust_id:"018446744073709551615"},
  {gold:7},{stage_id:"n_01_05"},{cnt:3},{pass:{end_datetime_utc:999999}},{wallet:{free_iap_qty:999}},
  {iap_qty:100},{completed_at:1000},{charged_fee:4},{otp:{}},{market:Infinity}])
  assert.throws(()=>planPaidDispatchFinish(snapshot,0,undefined,{...raw,...delta},1000,wallet));
for(const key of ["entrust_id","serial","use_iap_qty","is_tuto","is_iap_pass"]) {
  const bad={...raw} as Record<string,unknown>;delete bad[key];assert.throws(()=>planPaidDispatchFinish(snapshot,0,undefined,bad,1000,wallet));
}
let invoked=false;const getter={...raw};Object.defineProperty(getter,"serial",{enumerable:true,get(){invoked=true;return "-1";}});
assert.throws(()=>planPaidDispatchFinish(snapshot,0,undefined,getter,1000,wallet));assert.equal(invoked,false);
const symbol={...raw,[Symbol("producer")]:1};assert.throws(()=>planPaidDispatchFinish(snapshot,0,undefined,symbol,1000,wallet));
const pending={...snapshot,entrust_id:"0"};assert.throws(()=>planPaidDispatchFinish(pending,0,undefined,{...raw,entrust_id:"0"},1000,wallet));
assert.throws(()=>planPaidDispatchFinish({...snapshot,entrust_second_per_cost:0},0,undefined,raw,1000,wallet));
const overflow:EntrustStart={...snapshot,cnt:1,complete_second:1,list:[{...snapshot.list[0],begin_utc:"1",end_utc:"2147483647"}],entrust_second_per_cost:1};
assert.throws(()=>planPaidDispatchFinish(overflow,0,undefined,{...raw,use_iap_qty:0x80000000},1,{free_iap_qty:0xffff_ffff,iap_qty:0}),/signed32/);
assert.deepEqual({snapshot,raw,wallet},before);assert.equal(snapshot.list,listRef);assert.equal(snapshot.list[2],rowRef);
console.log("Whole-job paid dispatch finish: exact native sentinel/quote, expired-pass horizon, immutable original and detached projection, uint32 funds/free-first debit, durable timestamp normalization, duplicate/overflow/malformed refusal PASS");

for(const invalid of [{...snapshot,cnt:2},{...snapshot,list:snapshot.list.map((row,index)=>index===2?{...row,serial:99}:row)},
 {...snapshot,list:snapshot.list.map((row,index)=>index===1?{...row,serial:0}:row)}]) {
 assert.throws(()=>planPaidDispatchFinish(invalid,0,undefined,raw,1000,wallet),/indices/);
 assert.throws(()=>projectPaidDispatchFinish(invalid,plan.finish),/indices/);
}
