import assert from "node:assert/strict";
import {planPaidGemMount} from "../src/gem-paid-mount.js";
import {gemRemovalPrices,gemRemovalPriceAt} from "../src/gem-removal-prices.js";
import type {GemReference} from "../src/gem-instances.js";
import type {LocalCardInstance} from "../src/game.js";
const refs:GemReference[]=[{id:"AUTHORED",name:"",desc:"",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1}];
const cards=[{inst_id:1000001,ref_id:"001",weapon_rank:3,armor_rank:1,accessory_rank:1},{inst_id:1000002,ref_id:"002",weapon_rank:3}] as LocalCardInstance[];
const gems=[{ref_id:"AUTHORED",inst_id:"9007199254740993",rank:1,level:7,position:1,target_inst_id:"1000001",ability:"opaqueA",abilities:null},
  {ref_id:"AUTHORED",inst_id:"18446744073709551615",rank:1,level:9,position:2,target_inst_id:"1000001",ability:"opaqueB",abilities:null},
  {ref_id:"AUTHORED",inst_id:"3",rank:1,level:1,position:0,target_inst_id:"0",ability:"opaqueC",abilities:null},
  {ref_id:"AUTHORED",inst_id:"4",rank:1,level:1,position:1,target_inst_id:"1000002",ability:"opaqueD",abilities:null}];
const prices=[{level:7,price_type:2,price:11},{level:9,price_type:2,price:17}];
const request=(cells:unknown[])=>({target_inst_id:"1000001",price_type:2,combination:{weapons:cells,armors:[0,0],accessories:[0,0]}});
const before=JSON.stringify({cards,gems,prices});
const run=(cells:unknown[],quotes=prices,gold=100,busy=new Set<number>())=>planPaidGemMount(request(cells),cards,gems,refs,busy,quotes,gold);
const current=[gems[0].inst_id,gems[1].inst_id];
const unchanged=run(current,[]);assert.equal(unchanged.fee,0);assert.equal(unchanged.changed,0);assert.equal(unchanged.receipt?.length,4);
const cleared=run([0,0]);assert.equal(cleared.fee,28);assert.equal(cleared.removedCells,2);assert.equal(cleared.gold,72);
assert.deepEqual(cleared.receipt?.slice(0,2).map(row=>[row.inst_id,row.target_inst_id,row.position,row.ability]),[
  [gems[0].inst_id,"0",0,"opaqueA"],[gems[1].inst_id,"0",0,"opaqueB"]]);
const swapped=run([...current].reverse());assert.equal(swapped.fee,28);assert.equal(swapped.changed,2);
assert.equal(swapped.next?.[0].position,2);assert.equal(swapped.next?.[1].position,1);
const replaced=run(["3",gems[1].inst_id]);assert.equal(replaced.fee,11);assert.equal(replaced.changed,2);assert.equal(replaced.receipt?.length,4);
const clearedRetry=planPaidGemMount(request([0,0]),cards,cleared.next!,refs,new Set(),[],cleared.gold!);
assert.equal(clearedRetry.fee,0);assert.equal(clearedRetry.changed,0);assert.deepEqual(clearedRetry.receipt,cleared.receipt,"lost removal receipt retry restores unmounted rows despite empty current target");
assert.deepEqual(replaced.next?.[3],gems[3],"another Hunter's full row remains exact");
assert.match(run([0,0],[],100).error!,/missing/);
assert.match(run([0,0],prices,27).error!,/Insufficient/);
assert.match(run(["4",0]).error!,/Cross-Hunter/);
assert.match(run(current,prices,100,new Set([1000001])).error!,/combat/);
assert.match(run([0,0],[{level:7,price_type:2,price:0xffffffff},{level:9,price_type:2,price:1}],0x1_0000_0000).error!,/uint32/);
assert.match(planPaidGemMount({...request(current),price_type:4},cards,gems,refs,new Set(),prices,100).error!,/gold2/);
const duplicate=[{level:7,price_type:2,price:11},{level:7,price_type:2,price:12}];assert.throws(()=>gemRemovalPrices({result_code:1,ret_data:duplicate}),/Duplicate/);
assert.throws(()=>gemRemovalPrices({result_code:1,ret_data:[{level:1,price_type:2,price:-1}]}),/uint32/);
assert.equal(gemRemovalPriceAt(prices,8,2),undefined);assert.equal(gemRemovalPriceAt(prices,7,1),undefined);
assert.equal(JSON.stringify({cards,gems,prices}),before,"all success/refusal paths are pure");
console.log("Configured Gem replacements: old-level per-cell fees, swaps/removals/full receipts, lossless IDs, owner/part/rank/combat protections, missing-price/payment/overflow/balance refusal and input preservation passed.");
