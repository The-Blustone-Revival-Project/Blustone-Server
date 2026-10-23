import assert from "node:assert/strict";
import {dispatchFutureProjection,normalizeDispatch} from "../src/local-dispatch.js";
import {entrustDerivedEndWord} from "../src/expedition-entrust-clock.js";
import {entrustNativeSkipPrice} from "../src/expedition-skip-quote.js";
import type {EntrustStart} from "../src/expedition-entrust-snapshot.js";
const snapshot:EntrustStart={entrust_id:"18446744073709551615",stage_id:"n_01_01",cnt:3,complete_second:150,
 skip_price:777,entrust_second_per_cost:60,list:Array.from({length:3},(_,serial)=>({serial,gold:7,user_exp:11,card_exp:13,
 begin_utc:String(100+serial*150),end_utc:String(250+serial*150),item:'["AIRSHIP_TICKET"]'}))};
const original=structuredClone(snapshot),rows=snapshot.list,first=rows[0];
for(const [now,visible] of [[100,1],[249,1],[250,2],[399,2],[400,3],[550,3],[700,3]]) {
 const projected=dispatchFutureProjection(snapshot,now);assert.equal(projected.list.length,3);
 assert.equal(projected.list.filter(row=>row.begin_utc!=="0"&&row.end_utc!=="0").length,visible);
 assert.equal(entrustDerivedEndWord(projected),550);assert.equal(entrustDerivedEndWord(snapshot),550);
 assert.equal(entrustNativeSkipPrice(projected,now).price,entrustNativeSkipPrice(snapshot,now).price);
 for(const row of projected.list)assert.deepEqual({...row,begin_utc:snapshot.list[row.serial].begin_utc,end_utc:snapshot.list[row.serial].end_utc},snapshot.list[row.serial]);
 assert.notEqual(projected.list,snapshot.list);assert.notEqual(projected.list[0],snapshot.list[0]);
}
const projected=dispatchFutureProjection(snapshot,100);
const job={snapshot,deck:[1000001],pass:{end_datetime:"1970-01-01 00:00:00",end_datetime_utc:0},gold:7,user_exp:11,card_exp:13,
 items_per_run:[{ref_id:"AIRSHIP_TICKET",qty:1}]};
assert.doesNotThrow(()=>normalizeDispatch({active:job,last_id:"0",last_deck:[]}));
assert.throws(()=>normalizeDispatch({active:{...job,snapshot:projected},last_id:"0",last_deck:[]}),/schedule/,
 "Native-hidden future placeholders must never overwrite canonical stored schedules");
for(const now of [0,-1,0.5,NaN,Infinity,0x80000000])assert.throws(()=>dispatchFutureProjection(snapshot,now));
assert.deepEqual(snapshot,original);assert.equal(snapshot.list,rows);assert.equal(snapshot.list[0],first);
console.log("Dispatch future projection: only completed/current row visible, queue length/deadline/price and original immutable schedule preserved");
