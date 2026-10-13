import assert from "node:assert/strict";
import {configuredFishingCatalogue,fishingPriceRows,fishingPriceByGrade,fishingPoolMembers,fishingPoolRows} from "../src/fishing-catalogue.js";
const itemIds=new Set(["AUTHORED_A","AUTHORED_B","AUTHORED_C"]);
const input={pools:[{lure_id:"LU003",fish_id:"AUTHORED_B"},{lure_id:"LU003",fish_id:"AUTHORED_A"},{lure_id:"LU001",fish_id:"AUTHORED_A"}],
  prices:[{fish_id:"AUTHORED_A",b_price:0,s_price:17,g_price:0xffff_ffff},{fish_id:"AUTHORED_B",b_price:11,s_price:23,g_price:37}]};
const original=structuredClone(input),catalogue=configuredFishingCatalogue(input,itemIds);
assert.deepEqual(input,original,"admission is pure");
input.pools[0].fish_id="CHANGED";input.prices[0].s_price=999;itemIds.clear();
assert.deepEqual(fishingPoolMembers(catalogue,"LU003"),["AUTHORED_B","AUTHORED_A"],"original explicit membership order is retained");
assert.deepEqual(fishingPoolMembers(catalogue,"UNKNOWN"),[]);
const poolReply=fishingPoolRows(catalogue);
assert.deepEqual(poolReply,original.pools,"bootstrap publishes BOTH lure groups in source order without request filtering");
poolReply[0].fish_id="CHANGED_REPLY";poolReply.pop();
assert.deepEqual(fishingPoolRows(catalogue),original.pools,"detached full pool reply cannot alter later publication");
assert.equal(fishingPriceByGrade(catalogue,"AUTHORED_A",1),0,"explicit zero differs from unavailable");
assert.equal(fishingPriceByGrade(catalogue,"AUTHORED_A",2),17);
assert.equal(fishingPriceByGrade(catalogue,"AUTHORED_A",3),0xffff_ffff);
assert.equal(fishingPriceByGrade(catalogue,"AUTHORED_C",1),undefined,"missing quote does not become native fallback zero");
assert.deepEqual(fishingPriceRows(catalogue,"AUTHORED_C"),[]);
const reply=fishingPriceRows(catalogue,"AUTHORED_A");
assert.ok(Array.isArray(reply));assert.equal(reply.length,1);reply[0].s_price=888;
assert.equal(fishingPriceRows(catalogue,"AUTHORED_A")[0].s_price,17,"detached single-row response preserves immutable config");
assert.ok(Object.isFrozen(catalogue)&&Object.isFrozen(catalogue.prices)&&Object.isFrozen(catalogue.prices[0]));
for(const grade of [0,4,-1,"1",null,1.5]) assert.throws(()=>fishingPriceByGrade(catalogue,"AUTHORED_A",grade),/grade/);
for(const fish of ["",1,null,undefined]) assert.throws(()=>fishingPriceRows(catalogue,fish),/identity/);
const known=new Set(["AUTHORED_A","AUTHORED_B","AUTHORED_C"]);
for(const invalid of [null,[],{},
  {...original,pools:[...original.pools,original.pools[0]]},
  {...original,pools:[{lure_id:"BAIT02",fish_id:"AUTHORED_A"}]},
  {...original,pools:[{lure_id:"LU003",fish_id:"FS001"}]},
  {...original,prices:[...original.prices,original.prices[0]]},
  {...original,prices:[{...original.prices[0],fish_id:"FISH_01"}]},
  ...[-1,1.5,0x1_0000_0000,"17",NaN,Infinity].map(s_price=>({...original,prices:[{...original.prices[0],s_price}]}))])
  assert.throws(()=>configuredFishingCatalogue(invalid,known));
assert.deepEqual(configuredFishingCatalogue({pools:[],prices:[]},new Set()),{pools:[],prices:[]});
assert.deepEqual(fishingPoolRows(configuredFishingCatalogue({pools:[],prices:[]},new Set())),[]);
const incomplete=configuredFishingCatalogue({pools:[original.pools[0]],prices:[]},known);
assert.equal(fishingPriceByGrade(incomplete,"AUTHORED_B",1),undefined,"read-only membership does not invent settlement costs");
console.log("Fishing supplied catalogue: scalar-ID array price replies, exact grade lookup, immutable membership ordering, item-reference gates, duplicate/invalid/overflow refusal and missing-price distinction passed; no original fish IDs or catches granted.");
