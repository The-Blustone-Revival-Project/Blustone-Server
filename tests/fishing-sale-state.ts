import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {fishingSaleBindings} from "../src/fishing-sale.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-fishing-sale-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1800000000000;
try {
  const seed=new ServerState("http://localhost",file,{fishingSaleMode:"disabled"});
  const auth=seed.registerGuest({device_id:"fishing-sale-owner"},{}).ret_data as any,peer=seed.registerGuest({device_id:"fishing-sale-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),source=saved.gameStates[0][1];
  source.owned_fish=[{fish_id:"AUTHORED_FISH",b_cnt:5,s_cnt:2,g_cnt:1}];
  source.items=[{inst_id:4294967301,ref_id:"AUTHORED_FISH",qty:2,lock:0},{inst_id:4294967302,ref_id:"AUTHORED_FISH",qty:3,lock:0},
    {inst_id:4294967303,ref_id:"AUTHORED_FISH",qty:2,lock:0},{inst_id:4294967304,ref_id:"AUTHORED_FISH",qty:1,lock:0},
    {inst_id:8,ref_id:"unrelated",qty:89,lock:1}];source.next_item_inst_id=4294967305;
  writeFileSync(file,JSON.stringify(saved));
  const item={id:"AUTHORED_FISH",name:"",desc:"",thumbnail_id:"",effect:"",rank:1,use_type:17,sell_price:0,collect_qty:0};
  const bindings={[auth.pvid]:source.items.filter((row:any)=>row.ref_id===item.id).map((row:any,i:number)=>({fish_id:item.id,grade:i<2?1:i===2?2:3,inst_id:row.inst_id}))};
  const options={fishingSaleMode:"local-bound" as const,fishingItems:[item],fishingCatalogue:{pools:[],prices:[{fish_id:item.id,b_price:10,s_price:20,g_price:30}]},fishingSaleBindings:bindings};
  const state=new ServerState("http://localhost",file,options),game=(state as any).gameByPvid.get(auth.pvid);
  const sell=(extra={})=>gameResponse(state,"/fishing/SellFish",{...auth,fish_id:item.id,grade:"1",qty:"4",...extra}) as any;
  const pending=readFileSync(file),original=structuredClone(game);let items=game.items,fish=game.owned_fish;
  assert.throws(()=>gameResponse(state,"/fishing/SellFish",{}),/authenticated/);
  assert.equal((gameResponse(seed,"/fishing/SellFish",{...auth,fish_id:item.id,grade:1,qty:1}) as any).result_code,2001);
  for(const extra of [{...peer},{fish_id:"unknown"},{grade:"0"},{grade:"4"},{grade:true},{qty:"0"},{qty:"6"},{qty:"1.5"},{qty:true}])assert.equal(sell(extra).result_code,2001);
  for(const mutation of [()=>game.items[0].lock=1,()=>game.items[0].ref_id="unrelated",()=>game.items[0].qty=1,
    ()=>game.items[1].inst_id=game.items[0].inst_id,()=>game.gold=0xffff_ffff,
    ()=>game.items.push({inst_id:4294967305,ref_id:item.id,qty:1,lock:0})]) {
    mutation();const before=JSON.stringify(game);assert.equal(sell().result_code,2001);assert.equal(JSON.stringify(game),before);Object.assign(game,structuredClone(original));
  }
  Object.assign(game,structuredClone(original));items=game.items;fish=game.owned_fish;assert.deepEqual(readFileSync(file),pending);
  mkdirSync(file+".tmp");assert.throws(()=>sell());rmdirSync(file+".tmp");assert.deepEqual(game,original);assert.equal(game.items,items);assert.equal(game.owned_fish,fish);assert.deepEqual(readFileSync(file),pending);
  const blocked=path.join(dir,"blocked");mkdirSync(blocked);(state as any).stateFile=blocked;assert.throws(()=>sell());(state as any).stateFile=file;
  assert.deepEqual(game,original);assert.equal(game.items,items);assert.deepEqual(readFileSync(file),pending);
  bindings[auth.pvid][0].grade=3;options.fishingCatalogue.prices[0].b_price=999;
  const sold=sell();assert.equal(sold.result_code,1);assert.deepEqual(sold.ret_data.user.gold,{prev:10000,cur:10040});
  assert.deepEqual(sold.ret_data.item,[{inst_id:4294967301,qty:2},{inst_id:4294967302,qty:2}],"Full64 instance removal deltas, not qty remaining");
  assert.deepEqual(sold.ret_data.sell_result,{fish_id:item.id,b_cnt:1,s_cnt:2,g_cnt:1});assert.equal(game.items[0].qty,0,"Explicit zero tombstone supports absolute stale-cache repair");
  const bytes=readFileSync(file);assert.equal(sell().result_code,2001);assert.deepEqual(readFileSync(file),bytes,"Unavailable repeat does not reapply or misrepresent native receipt");
  for(let i=0;i<2;i++)assert.equal(sell({grade:2,qty:1}).result_code,1,"Funded identical repeat is a deliberate additional sale, no nonce guessed");
  assert.equal(sell({grade:2,qty:1}).result_code,2001);assert.equal(game.gold,10080);
  const restartOptions={...options,fishingSaleBindings:{[auth.pvid]:source.items.filter((row:any)=>row.ref_id===item.id).map((row:any,i:number)=>({fish_id:item.id,grade:i<2?1:i===2?2:3,inst_id:row.inst_id}))}};
  const restart=new ServerState("http://localhost",file,restartOptions);
  const inv=(gameResponse(restart,"/fishing/GetInven",auth) as any).ret_data;assert.deepEqual(inv,[{fish_id:item.id,b_cnt:1,s_cnt:0,g_cnt:1}]);
  const ordinary=(gameResponse(restart,"/lobby/GetItemInven",auth) as any).ret_data.item;assert.equal(ordinary.find((row:any)=>row.inst_id===4294967301).qty,0);
  const latest=JSON.parse(readFileSync(file,"utf8"));assert.deepEqual(latest.gameStates[1],saved.gameStates[1]);
  const expected={...original,items:game.items,owned_fish:game.owned_fish,gold:game.gold};assert.deepEqual(game,expected,"Wallet/items/fish only; clocks, roster, decks, allocators and histories preserved");
  const noPrices=new ServerState("http://localhost",file,{...restartOptions,fishingCatalogue:{pools:[],prices:[]}}),beforeMissingPrice=readFileSync(file);
  const missingPrice=gameResponse(noPrices,"/fishing/SellFish",{...auth,fish_id:item.id,grade:1,qty:1}) as any;
  assert.equal(missingPrice.result_code,2001);assert.match(JSON.stringify(missingPrice),/price is unavailable/);
  assert.deepEqual(readFileSync(file),beforeMissingPrice,"Owned and bound inventory with absent price cannot settle");
  assert.throws(()=>new ServerState("http://localhost",file,{fishingSaleMode:"local-bound"}),/explicit/);
  for(const raw of [{[auth.pvid]:[{fish_id:item.id,grade:0,inst_id:1}]},{[auth.pvid]:[{fish_id:item.id,grade:1,inst_id:1},{fish_id:item.id,grade:2,inst_id:1}]},
    {[auth.pvid]:[{fish_id:"unknown",grade:1,inst_id:1}]},{[auth.pvid]:Array(1)}])assert.throws(()=>fishingSaleBindings(raw,new Set([item.id])));
}finally{Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Bound fishing sales: authored ownership/grade/price binding, full64 removal deltas, exact grade count coherence, atomic write/rename rollback, quantity/lock/overflow/auth refusal, funded repeats, zero tombstone repair, restart and other-field/account preservation passed; no catches/original balance/native UI claim.");
