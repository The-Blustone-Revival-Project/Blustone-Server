import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {itemReference} from "../src/hunter-traces.js";
// Explicit authored read-only fixtures, not original fish/item metadata or prices.
const item={id:"AUTHORED_FISH",name:"Authored",desc:"",thumbnail_id:"",effect:"",
  rank:1,use_type:0,sell_price:0,collect_qty:0};
const catalogue={pools:[{lure_id:"LU001",fish_id:item.id},{lure_id:"LU003",fish_id:item.id}],
  prices:[{fish_id:item.id,b_price:0,s_price:17,g_price:23}]};
const dir=mkdtempSync(path.join(tmpdir(),"blustone-fishing-read-"));
try {
  const file=path.join(dir,"state.json"),items=[{...item}],supplied=structuredClone(catalogue);
  const state=new ServerState("http://localhost",file,{fishingItems:items,fishingCatalogue:supplied});
  const auth=state.registerGuest({device_id:"fishing-read"},{}).ret_data as Record<string,unknown>;
  const other=state.registerGuest({device_id:"fishing-read-peer"},{}).ret_data as Record<string,unknown>;
  // Establish game snapshots before proving read-only operations preserve all saves.
  state.gameFor(state.accountFor(auth,{}));state.gameFor(state.accountFor(other,{}));
  const bytes=readFileSync(file);
  const read=(route:string,payload:Record<string,unknown>=auth)=>gameResponse(state,route,payload) as any;
  items[0].name="changed";supplied.pools.length=0;supplied.prices[0].s_price=999;
  const combined=read("/reference/GetItem").ret_data;
  assert.deepEqual(combined,{...itemReference(),item:[...itemReference().item,item]});
  assert.equal(combined.item.filter((row:any)=>row.id===item.id).length,1);
  combined.item.at(-1)!.name="mutated response";
  assert.equal(read("/reference/GetItem").ret_data.item.at(-1).name,"Authored");
  assert.deepEqual(read("/fishing/GetFishingPool",{...auth,lure_id:"LU001",fish_id:"ignored"}).ret_data,catalogue.pools);
  const response=read("/fishing/GetFishingPool");response.ret_data[0].fish_id="mutated";
  assert.deepEqual(read("/fishing/GetFishingPool",other).ret_data,catalogue.pools);
  assert.deepEqual(read("/fishing/GetPriceRef",{...auth,fish_id:item.id}).ret_data,catalogue.prices);
  assert.deepEqual(read("/fishing/GetPriceRef",{...auth,fish_id:"UNKNOWN"}).ret_data,[]);
  for(const fish_id of [undefined,[],0,{id:item.id}])
    assert.equal(read("/fishing/GetPriceRef",{...auth,fish_id}).result_code,2001);
  for(const route of ["/fishing/GetFishingPool","/fishing/GetPriceRef"])
    assert.throws(()=>read(route,{fish_id:item.id}),/authenticated/);
  for(const suffix of ["GetInven","GetRecord"])
    assert.deepEqual(read(`/fishing/${suffix}`).ret_data,[]);
  for(const suffix of ["Begin","EndWithSell","SellFish"])
    assert.equal(read(`/fishing/${suffix}`,{...auth,fish_id:item.id,is_win:1}).result_code,2001);
  assert.deepEqual(readFileSync(file),bytes);
  const restarted=new ServerState("http://localhost",file,{fishingItems:[item],fishingCatalogue:catalogue});
  assert.deepEqual((gameResponse(restarted,"/fishing/GetFishingPool",auth) as any).ret_data,catalogue.pools);
  assert.deepEqual(readFileSync(file),bytes);
  const baseline=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(baseline,"/reference/GetItem",auth) as any).ret_data,itemReference());
  assert.equal((gameResponse(baseline,"/fishing/GetFishingPool",auth) as any).result_code,2001);
  const empty=new ServerState("http://localhost",file,{fishingCatalogue:{pools:[],prices:[]}});
  assert.deepEqual((gameResponse(empty,"/fishing/GetFishingPool",auth) as any).ret_data,[]);
  for(const patch of [{id:"RP1"},{id:"LU001"},{id:"LU003"},{id:"001"},{use_type:1},{use_type:3},
    {effect:"005"},{collect_qty:1},{rank:-1},{thumbnail_id:4}])
    assert.throws(()=>new ServerState("http://localhost",file,{fishingItems:[{...item,...patch}],fishingCatalogue:catalogue}));
  assert.throws(()=>new ServerState("http://localhost",file,{fishingItems:[item,item]}),/Duplicate/);
  assert.throws(()=>new ServerState("http://localhost",file,{fishingCatalogue:catalogue}),/item reference/);
  assert.throws(()=>new ServerState("http://localhost",file,{fishingItems:[item],fishingCatalogue:{pools:[],prices:[{...catalogue.prices[0],fish_id:"RP1"}]}}),/item reference/);
  assert.deepEqual(readFileSync(file),bytes);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Fishing configured reads: matching neutral item metadata, authenticated full pool/scalar prices, immutable config, collisions, no grants/settlement and exact save-preserving restart passed.");
