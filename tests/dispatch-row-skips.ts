import assert from "node:assert/strict";
import {replayDispatchRowSkips,normalizeSequentialFinish,projectSequentialFinish,planSequentialDispatchSkip,type DispatchRowSkip} from "../src/dispatch-row-skips.js";
import {entrustNativeSkipPrice} from "../src/expedition-skip-quote.js";
import {planPaidDispatchFinish} from "../src/dispatch-paid-finish.js";
import type {EntrustStart} from "../src/expedition-entrust-snapshot.js";

// Original schedule, rewards, rate, pass expiry and wallets are LOCAL fixtures.
const original:EntrustStart={entrust_id:"18446744073709551615",stage_id:"n_01_05",cnt:4,complete_second:150,
  skip_price:999,entrust_second_per_cost:100,list:[0,1,2,3].map(serial=>({serial,card_exp:13,user_exp:11,gold:7,
    begin_utc:String(1000+150*serial),end_utc:String(1150+150*serial),item:'["AIRSHIP_TICKET","AIRSHIP_TICKET"]'}))};
const auth={app_code:"_SR",app_ver:"28010",market:"GOOGLE",pvid:"7",otp:"dummy"};
const request=(serial:number,fee=serial===-1?7:1)=>({...auth,entrust_id:original.entrust_id,serial:String(serial),use_iap_qty:String(fee),is_tuto:"0",is_iap_pass:"0"});
const wallet={free_iap_qty:2,iap_qty:8},before=structuredClone({original,wallet}),listRef=original.list,rowRef=original.list[0];
let nativeCache:EntrustStart={...original,list:original.list.map(row=>BigInt(row.begin_utc)>1000n?{...row,begin_utc:"0",end_utc:"0"}:{...row})};
/** Actual ParseSkip semantics: stamp ONLY supplied serial's model end to now.
 * NextAutoCombat's next-row UI times do not write model RESULT begin/end. */
function nativeSkip(receipt:{list:EntrustStart["list"]},now:number) {
  nativeCache={...nativeCache,list:nativeCache.list.map(row=>({...row}))};
  for(const row of receipt.list)nativeCache.list[row.serial].end_utc=String(now);
}
const one=planSequentialDispatchSkip(original,0,undefined,undefined,request(0),1020,wallet);
assert.deepEqual(one.rows,[{serial:0,completed_at:1020,charged_fee:1}]);assert.equal(one.finish,undefined);
assert.deepEqual(one.wallet,{free_iap_qty:1,iap_qty:8});assert.equal(one.receipt.list.length,1);
assert.deepEqual(one.receipt.list[0],{...original.list[0],end_utc:"1020"});nativeSkip(one.receipt,1020);
const replayOne=replayDispatchRowSkips(original,0,one.rows);
assert.deepEqual(replayOne.effective.list.map(row=>[row.begin_utc,row.end_utc]),[["1000","1020"],["1020","1170"],["1170","1320"],["1320","1470"]]);
assert.deepEqual(entrustNativeSkipPrice(nativeCache,1020),entrustNativeSkipPrice(replayOne.effective,1020));
assert.equal(entrustNativeSkipPrice(nativeCache,1020).price,5);
const two=planSequentialDispatchSkip(original,0,one.rows,undefined,request(1),1020,one.wallet);nativeSkip(two.receipt,1020);
assert.deepEqual(two.wallet,{free_iap_qty:0,iap_qty:8});assert.equal(two.receipt.list.length,1);assert.equal(two.receipt.list[0].serial,1);
assert.equal(nativeCache.list[1].begin_utc,"0","simulation must not invent a model write from the UI-only next-row callback");
const replayTwo=replayDispatchRowSkips(original,0,two.rows);
assert.deepEqual(replayTwo.effective.list.map(row=>row.end_utc),["1020","1020","1170","1320"]);
assert.deepEqual(entrustNativeSkipPrice(nativeCache,1020),entrustNativeSkipPrice(replayTwo.effective,1020));assert.equal(entrustNativeSkipPrice(nativeCache,1020).price,4);
const three=planSequentialDispatchSkip(original,0,two.rows,undefined,request(2),1050,two.wallet);nativeSkip(three.receipt,1050);
assert.deepEqual(three.wallet,{free_iap_qty:0,iap_qty:7});const replayThree=replayDispatchRowSkips(original,0,three.rows);
assert.deepEqual(replayThree.effective.list.map(row=>row.end_utc),["1020","1020","1050","1200"]);
assert.deepEqual(entrustNativeSkipPrice(nativeCache,1050),entrustNativeSkipPrice(replayThree.effective,1050));assert.equal(entrustNativeSkipPrice(nativeCache,1050).price,2);
const finish=planSequentialDispatchSkip(original,0,three.rows,undefined,request(-1,2),1050,three.wallet);
assert.deepEqual(finish.rows,three.rows);assert.deepEqual(finish.finish,{completed_at:1050,charged_fee:2});assert.deepEqual(finish.wallet,{free_iap_qty:0,iap_qty:5});
assert.notEqual(finish.rows,three.rows,"whole planning detaches prior row captures");
assert.equal(finish.receipt.list.length,4);assert.deepEqual(finish.receipt.list.map(row=>row.end_utc),["1050","1050","1050","1050"]);
assert.deepEqual(finish.receipt.list.map(row=>row.begin_utc),replayThree.effective.list.map(row=>row.begin_utc));
assert.deepEqual(normalizeSequentialFinish(finish.finish,replayThree.effective,0),finish.finish);
assert.deepEqual(projectSequentialFinish(replayThree.effective,finish.finish!,0).list,finish.receipt.list);
nativeSkip(finish.receipt,1050);assert.equal(entrustNativeSkipPrice(nativeCache,1050).price,1,"native no-work quote1 never authorizes another payment");
assert.throws(()=>planSequentialDispatchSkip(original,0,three.rows,finish.finish,request(-1,1),1050,finish.wallet),/already/);

// Zero-time consecutive payments are legal current-row transitions, not a
// duplicate debit: each receipt names a different current row and costs1.
let rows:DispatchRowSkip[]|undefined;let funds={free_iap_qty:4,iap_qty:0};
for(let serial=0;serial<4;serial++) {
  const next=planSequentialDispatchSkip(original,1000,rows,undefined,request(serial),1000,funds);rows=next.rows;funds=next.wallet;
  assert.equal(next.receipt.list.length,1);assert.equal(next.receipt.list[0].serial,serial);
}
assert.deepEqual(funds,{free_iap_qty:0,iap_qty:0});const zeroTime=replayDispatchRowSkips(original,1000,rows);
assert.deepEqual(zeroTime.effective.list.map(row=>row.end_utc),["1000","1000","1000","1000"]);
assert.throws(()=>planSequentialDispatchSkip(original,0,rows,undefined,request(-1,1),1000,{free_iap_qty:9,iap_qty:0}),/horizon/);
assert.throws(()=>planSequentialDispatchSkip(original,0,rows,undefined,request(3),1000,{free_iap_qty:9,iap_qty:0}),/unpaid/);

// Natural expiry can advance the current index without a paid record.
const mixed=planSequentialDispatchSkip(original,0,one.rows,undefined,request(2),1200,one.wallet);
assert.deepEqual(mixed.rows,[...one.rows!,{serial:2,completed_at:1200,charged_fee:1}]);
const mixedReplay=replayDispatchRowSkips(original,0,mixed.rows);
assert.deepEqual(mixedReplay.effective.list.map(row=>[row.begin_utc,row.end_utc]),[["1000","1020"],["1020","1170"],["1170","1200"],["1200","1350"]]);
nativeCache={...replayOne.effective,list:replayOne.effective.list.map(row=>BigInt(row.begin_utc)>1200n?{...row,begin_utc:"0",end_utc:"0"}:{...row})};
nativeSkip(mixed.receipt,1200);
assert.deepEqual(entrustNativeSkipPrice(nativeCache,1200),entrustNativeSkipPrice(mixedReplay.effective,1200),"natural-prefix refresh plus only-selected stamp retains the compressed deadline");
const naturalFirst=planSequentialDispatchSkip(original,0,undefined,undefined,request(1),1150,wallet);
assert.deepEqual(naturalFirst.rows,[{serial:1,completed_at:1150,charged_fee:1}]);
assert.throws(()=>planSequentialDispatchSkip(original,0,undefined,undefined,request(0),1150,wallet),/current/);
assert.throws(()=>planSequentialDispatchSkip(original,0,one.rows,undefined,request(1),1200,wallet),/current/);
assert.throws(()=>planSequentialDispatchSkip(original,0,undefined,undefined,request(3),1020,wallet),/current/);
assert.throws(()=>planSequentialDispatchSkip(original,0,one.rows,undefined,request(2),1020,wallet),/current/);
assert.throws(()=>planSequentialDispatchSkip(original,0,one.rows,undefined,request(0),1020,wallet),/unpaid/);
assert.throws(()=>planSequentialDispatchSkip(original,0,one.rows,undefined,request(1),1019,wallet),/predates/);
assert.throws(()=>normalizeSequentialFinish({completed_at:1049,charged_fee:2},replayThree.effective,0),/chronological/);
assert.throws(()=>normalizeSequentialFinish({...finish.finish,charged_fee:3},replayThree.effective,0),/fee/);
assert.throws(()=>normalizeSequentialFinish(finish.finish,{...replayThree.effective,entrust_second_per_cost:200},0),/fee/);
assert.throws(()=>normalizeSequentialFinish(finish.finish,replayThree.effective,1051),/Pass/);
assert.throws(()=>normalizeSequentialFinish({completed_at:1200,charged_fee:1},replayThree.effective,0),/horizon/);

const whole=planSequentialDispatchSkip(original,0,undefined,undefined,request(-1,7),1000,{free_iap_qty:2,iap_qty:8});
const legacy=planPaidDispatchFinish(original,0,undefined,request(-1,7),1000,{free_iap_qty:2,iap_qty:8});
assert.deepEqual(whole,legacy,"no-row whole operation delegates unchanged schema18 planner");
for(const badRows of [[],new Array(1),[...one.rows!,...one.rows!],[{serial:1,completed_at:1020,charged_fee:1}],
  [{serial:0,completed_at:999,charged_fee:1}],[{serial:0,completed_at:1150,charged_fee:1}],
  [{serial:0,completed_at:1020,charged_fee:0}],[{serial:0,completed_at:1020,charged_fee:"1"}],
  [{serial:4,completed_at:1020,charged_fee:1}],[{serial:0,completed_at:0x8000_0000,charged_fee:1}],
  [{serial:0,completed_at:1020,charged_fee:1,extra:0}],
  [...one.rows!,{serial:1,completed_at:1019,charged_fee:1}]])assert.throws(()=>replayDispatchRowSkips(original,0,badRows));
assert.throws(()=>replayDispatchRowSkips(original,1021,one.rows),/Pass/);
for(const stamp of [0,999,1600,1700,0x8000_0000,1000.5])assert.throws(()=>planSequentialDispatchSkip(original,0,undefined,undefined,request(0),stamp,wallet));
for(const amount of [{free_iap_qty:0,iap_qty:0},{free_iap_qty:-1,iap_qty:9},{free_iap_qty:0xffff_ffff,iap_qty:1},
  {free_iap_qty:0x1_0000_0000,iap_qty:0},{free_iap_qty:1.5,iap_qty:9}]) {
  const prior=structuredClone(amount);assert.throws(()=>planSequentialDispatchSkip(original,0,undefined,undefined,request(0),1000,amount));assert.deepEqual(amount,prior);
}
assert.deepEqual(planSequentialDispatchSkip(original,0,undefined,undefined,request(0),1000,{free_iap_qty:0xffff_ffff,iap_qty:0}).wallet,
  {free_iap_qty:0xffff_fffe,iap_qty:0});
for(const change of [{serial:"-2"},{serial:"01"},{serial:true},{use_iap_qty:"0"},{use_iap_qty:"2"},{use_iap_qty:true},
  {is_tuto:1},{is_iap_pass:1},{entrust_id:"1"},{entrust_id:Number(original.entrust_id)},
  {pass:{}},{gold:7},{stage_id:"n_01_05"},{cnt:4},{iap_qty:999},{completed_at:1000},{otp:{}},{market:Infinity}])
  assert.throws(()=>planSequentialDispatchSkip(original,0,undefined,undefined,{...request(0),...change},1000,wallet));
let invoked=false;const accessor={...request(0)};Object.defineProperty(accessor,"serial",{enumerable:true,get(){invoked=true;return "0";}});
assert.throws(()=>planSequentialDispatchSkip(original,0,undefined,undefined,accessor,1000,wallet));assert.equal(invoked,false);
const unsafe={...original,list:original.list.map(row=>({...row,begin_utc:String(Number(row.begin_utc)+0x7fff_ffff),end_utc:String(Number(row.end_utc)+0x7fff_ffff)}))};
assert.throws(()=>replayDispatchRowSkips(unsafe,0,one.rows),/signed32/);
assert.throws(()=>planSequentialDispatchSkip({...original,entrust_second_per_cost:0},0,undefined,undefined,request(0),1000,wallet));
assert.throws(()=>planSequentialDispatchSkip({...original,complete_second:0},0,undefined,undefined,request(0),1000,wallet));
const malformed=snapshotClone();malformed.list[1].begin_utc="1";assert.throws(()=>replayDispatchRowSkips(malformed,0,one.rows),/incoherent/);
function snapshotClone(){return structuredClone(original);}
assert.deepEqual({original,wallet},before);assert.equal(original.list,listRef);assert.equal(original.list[0],rowRef);
assert.notEqual(replayThree.rows,three.rows);assert.notEqual(replayThree.effective.list,original.list);
console.log("Sequential dispatch skips: current-row fee1/rebase, exact selected-only native cache simulation, equal timestamps, natural expiry/mixed whole quote, immutable restore, no-row legacy parity and malformed/overflow/duplicate refusal PASS");
