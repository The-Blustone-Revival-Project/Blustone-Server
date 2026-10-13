import assert from "node:assert/strict";
import {parseGemSaleRequest,gemSalePrices,gemSalePriceAt,planGemSale} from "../src/gem-sale.js";
import type {GemReference} from "../src/gem-instances.js";
const refs:GemReference[]=[{id:"AUTHORED",name:"",desc:"",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1}];
const gems=[{ref_id:"AUTHORED",inst_id:"9007199254740993",rank:2,level:7,position:0,target_inst_id:"0",ability:"opaque",abilities:null},
  {ref_id:"AUTHORED",inst_id:"18446744073709551615",rank:3,level:9,position:0,target_inst_id:"0",ability:"opaque2",abilities:null},
  {ref_id:"AUTHORED",inst_id:"3",rank:2,level:7,position:1,target_inst_id:"1000001",ability:"mounted",abilities:null}];
const hunters=new Set(["1000001"]),prices=[{rank:2,level:7,price_type:2,price:11},{rank:3,level:9,price_type:2,price:17}];
const batch={inst_id_list:"[9007199254740993,18446744073709551615]"};
assert.deepEqual(parseGemSaleRequest(batch),gems.slice(0,2).map(gem=>gem.inst_id));
assert.deepEqual(parseGemSaleRequest({inst_id:gems[0].inst_id}),[gems[0].inst_id]);
for(const raw of [{},{inst_id:"1",inst_id_list:"[2]"},{inst_id_list:"[]"},{inst_id_list:[1]},
  {inst_id_list:"[1,1]"},{inst_id_list:"[0]"},{inst_id_list:"[18446744073709551616]"},{inst_id:9007199254740992},
  {inst_id_list:"[1.5]"},{inst_id_list:"{}"}]) assert.throws(()=>parseGemSaleRequest(raw));
const before=JSON.stringify({gems,prices,refs}),plan=planGemSale(batch,gems,refs,hunters,prices,100);
assert.equal(plan.profit,28);assert.equal(plan.gold,128);assert.deepEqual(plan.next,[gems[2]]);
assert.match(planGemSale(batch,plan.next!,refs,hunters,prices,128).error!,/currently owned/);
assert.match(planGemSale({inst_id:"3"},gems,refs,hunters,prices,100).error!,/Mounted/);
assert.match(planGemSale(batch,gems,refs,hunters,[],100).error!,/missing/);
assert.match(planGemSale(batch,gems,refs,hunters,prices,0x7fff_ffff-27).error!,/wallet range/);
assert.match(planGemSale(batch,gems,refs,hunters,prices,-1).error!,/signed32/);
assert.throws(()=>gemSalePrices({result_code:1,ret_data:[prices[0],prices[0]]}),/Duplicate/);
assert.throws(()=>gemSalePrices({result_code:1,ret_data:[{...prices[0],price:0x1_0000_0000}]}),/uint32/);
assert.equal(gemSalePriceAt(prices,1,7,2),undefined);assert.equal(gemSalePriceAt(prices,2,7,1),undefined);
const zero=planGemSale({inst_id:gems[0].inst_id},gems,refs,hunters,[{...prices[0],price:0}],100);
assert.equal(zero.gold,100);assert.equal(zero.next?.length,2,"explicit zero quote distinct from unavailable");
assert.equal(JSON.stringify({gems,prices,refs}),before,"sale planning never mutates inventory/quotes/references");
console.log("Configured Gem sale: exact scalar/JSON-list uint64 request, rank/level/payment quotes, mounted/duplicate/missing/replay refusal, signed-wallet bounds and pure inventory removal passed.");
