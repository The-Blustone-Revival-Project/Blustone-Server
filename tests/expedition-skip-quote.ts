import assert from "node:assert/strict";
import {entrustNativeSkipPrice,admitEntrustSkipQuote} from "../src/expedition-skip-quote.js";
import type {EntrustStart} from "../src/expedition-entrust-snapshot.js";

const job=(end:number,rate:number,id="1"):EntrustStart=>({entrust_id:id,stage_id:"n_01_05",cnt:1,complete_second:150,
  skip_price:999,entrust_second_per_cost:rate,list:[{serial:1,card_exp:0,user_exp:0,gold:0,begin_utc:"0",end_utc:String(end),item:"[]"}]});
const price=(end:number,rate:number,now=0)=>entrustNativeSkipPrice(job(end,rate),now).price;
assert.deepEqual(entrustNativeSkipPrice(job(100,100),0),{price:2,derivedEndWord:100},"exact divisibility adds one; not ceil");
assert.equal(price(99,100),1);assert.equal(price(101,100),2);
assert.equal(price(100,100,100),1,"elapsed zero dividend still adds one");
assert.equal(price(100,100,101),1,"past end signed subtraction clamps to zero");
assert.equal(price(100,0),0,"zero denominator is an explicit native early return");
assert.equal(price(0x7fff_ffff,1),0x8000_0000,"float32 numerator rounds signed32 max upward");
assert.equal(price(16777217,1),16777216,"both integer-to-float and +1 round independently");
assert.equal(price(16777215,1),16777216);
assert.equal(price(100,0xffff_ffff),1,"denominator uint32 conversion rounds to 2^32");
assert.equal(price(0xf0000000,100),1,"native signed lowword difference can clamp a wrapped horizon");
assert.equal(price(100,100,-1),2,"signed clock input preserves its exact uint32 bits");
assert.equal(entrustNativeSkipPrice(job(100,1,"0"),0).price,0,"missing job uses -1, not remaining time");
assert.equal(entrustNativeSkipPrice(job(100,2,"0"),0).price,0);
assert.equal(entrustNativeSkipPrice(job(100,16777216,"0"),0).price,0);
assert.equal(entrustNativeSkipPrice(job(100,33554432,"0"),0).price,1,"float32 rounding of no-job sentinel is not paid entitlement");
assert.equal(entrustNativeSkipPrice(job(100,0,"0"),0).price,0);
const noRows={...job(100,100,"0"),cnt:0,list:[]};
assert.deepEqual(entrustNativeSkipPrice(noRows,0),{price:0,derivedEndWord:0});
assert.equal(entrustNativeSkipPrice({...noRows,entrust_second_per_cost:33554432},0).price,1);
const activeEmpty={...noRows,entrust_id:"1"};assert.equal(entrustNativeSkipPrice(activeEmpty,100).price,1);
const sparse:EntrustStart={...job(100,100),cnt:3,complete_second:150,list:[
  {serial:1,card_exp:0,user_exp:0,gold:0,begin_utc:"1",end_utc:"100",item:"[]"},
  {serial:2,card_exp:0,user_exp:0,gold:0,begin_utc:"0",end_utc:"0",item:"[]"},
  {serial:3,card_exp:0,user_exp:0,gold:0,begin_utc:"0",end_utc:"9999",item:"[]"}]};
assert.deepEqual(entrustNativeSkipPrice(sparse,0),{price:5,derivedEndWord:400},"only contiguous nonzero-end prefix anchors derived end");
const zeroFirst={...sparse,list:[{...sparse.list[0],end_utc:"0"},...sparse.list.slice(1)]};
assert.deepEqual(entrustNativeSkipPrice(zeroFirst,0),{price:5,derivedEndWord:450});
const overflow={...job(0xffff_ffff,1),complete_second:2,list:[{...job(1,1).list[0],end_utc:"4294967295"},
  {...job(1,1).list[0],serial:2,end_utc:"0"}]};
assert.deepEqual(entrustNativeSkipPrice(overflow,0),{price:2,derivedEndWord:1},"native end arithmetic is low32");
const unchanged=job(100,100),before=structuredClone(unchanged),list=unchanged.list,row=unchanged.list[0];
for(const cached of [0,1,999,0xffff_ffff])assert.equal(entrustNativeSkipPrice({...unchanged,skip_price:cached},0).price,2,"cached skip_price is not used here");
assert.equal(admitEntrustSkipQuote(unchanged,0),2);assert.equal(admitEntrustSkipQuote(unchanged,101),1);
for(const bad of [job(100,0),job(100,100,"0"),job(0x7fff_ffff,1),job(0xf0000000,100),sparse,zeroFirst,overflow,noRows,
  {...job(100,100),complete_second:0},{...job(100,100),complete_second:-1},
  {...job(100,100),list:[{...row,begin_utc:"101"}]},
  {...job(100,100),list:[row,{...row,serial:2}]}])assert.throws(()=>admitEntrustSkipQuote(bad,0));
assert.throws(()=>admitEntrustSkipQuote(unchanged,0x8000_0000));
for(const now of [NaN,Infinity,0.5,-0x8000_0001,0x1_0000_0000])assert.throws(()=>entrustNativeSkipPrice(unchanged,now));
for(const bad of [null,{}, {...unchanged,entrust_second_per_cost:-1},{...unchanged,entrust_second_per_cost:1.5},
  {...unchanged,list:[{...row,end_utc:"-1"}]}])assert.throws(()=>entrustNativeSkipPrice(bad as EntrustStart,0));
assert.deepEqual(unchanged,before);assert.equal(unchanged.list,list);assert.equal(unchanged.list[0],row);
console.log("Entrust native skip quote: exact f32 division/+1, zero/no-job/signedwrap/prefix behavior, unused cached price, separate strict paid admission and nonmutation PASS");
