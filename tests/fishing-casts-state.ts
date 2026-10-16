import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {configuredFishingCasts,normalizeFishingCasts} from "../src/fishing-casts.js";
import {castFish,castOptions,castContext} from "./fishing-casts-fixture.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-fishing-casts-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
try {
  const seed=new ServerState("http://localhost",file);
  const auth=seed.registerGuest({device_id:"cast-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"cast-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),initial=saved.gameStates[0][1],baitId=4_294_967_301;
  initial.items=[{inst_id:baitId,ref_id:"LU003",qty:30,lock:0},{inst_id:8,ref_id:"unrelated",qty:7,lock:1}];
  initial.next_item_inst_id=baitId+1;
  writeFileSync(file,JSON.stringify(saved));
  const options=castOptions(),state=new ServerState("http://localhost",file,options),game=(state as any).gameByPvid.get(auth.pvid);
  const route=(suffix:string,extra:Record<string,unknown>={})=>gameResponse(state,"/fishing/"+suffix,{...auth,...extra}) as any;
  const begin=(extra={})=>route("Begin",{...castContext,...extra});
  const end=(log_id=1,is_win:unknown=1)=>route("EndWithSell",{log_id,is_win});
  const original=structuredClone(game),bytes=readFileSync(file);
  assert.throws(()=>gameResponse(state,"/fishing/Begin",castContext),/authenticated/);
  for(const context of [{place_id:"unknown"},{lure_id:"LU001"},{cast_dist:"02"},{cast_dist:true},{cast_dist:-1},{cast_dist:2.5}])assert.equal(begin(context).result_code,2001);
  assert.equal(end().result_code,2001);
  assert.deepEqual(readFileSync(file),bytes);
  // Begin owns a durable server outcome/log, but does not debit stock early.
  mkdirSync(file+".tmp");assert.throws(()=>begin());rmdirSync(file+".tmp");assert.deepEqual(readFileSync(file),bytes);
  assert.equal((state as any).fishingCasts.size,0);assert.deepEqual(game,original);
  const blocked=path.join(dir,"blocked-rename");mkdirSync(blocked);
  const beginItems=game.items;
  (state as any).stateFile=blocked;
  try{assert.throws(()=>begin());}finally{(state as any).stateFile=file;}
  assert.equal(game.items,beginItems);assert.equal(Object.hasOwn(game,"owned_fish"),false);
  assert.equal((state as any).fishingCasts.size,0);assert.deepEqual(readFileSync(file),bytes);
  const first=begin();assert.equal(first.result_code,1);assert.equal(first.ret_data.log_id,1);
  assert.equal(first.ret_data.fish_id,undefined);assert.equal(first.ret_data.achievement,null);
  assert.equal(first.ret_data.inc_val,5);assert.deepEqual(game,original);
  const pendingBytes=readFileSync(file),pendingJournal=structuredClone((state as any).fishingCasts.get(auth.pvid));
  assert.equal(JSON.parse(pendingBytes.toString()).version,15);
  assert.deepEqual(begin().ret_data,first.ret_data);assert.deepEqual(readFileSync(file),pendingBytes,"Begin retry keeps captured outcome/log without writes");
  assert.equal(begin({place_id:"different"}).result_code,2001);
  for(const [log,result] of [[0,1],[-1,1],[2,1],[1,true],[1,"01"],[1,2],[1,0.1]])assert.equal(end(log as number,result).result_code,2001);
  assert.equal(route("EndWithSell",{...peer,log_id:1,is_win:1}).result_code,2001);
  for(const mutation of [()=>game.items[0].qty=1,()=>game.items[0].lock=1,()=>game.items[0].ref_id="unrelated",
    ()=>game.next_item_inst_id=baitId,()=>game.items.push({...game.items[0]})]) {
    mutation();const prior=JSON.stringify(game);assert.equal(end().result_code,2001);assert.equal(JSON.stringify(game),prior);
    Object.assign(game,structuredClone(original));
  }
  mkdirSync(file+".tmp");assert.throws(()=>end());rmdirSync(file+".tmp");
  assert.deepEqual(game,original);assert.deepEqual((state as any).fishingCasts.get(auth.pvid),pendingJournal);assert.deepEqual(readFileSync(file),pendingBytes);
  const endItems=game.items,endJournal=(state as any).fishingCasts.get(auth.pvid);
  (state as any).stateFile=blocked;
  try{assert.throws(()=>end());}finally{(state as any).stateFile=file;}
  assert.equal(game.items,endItems);assert.equal(Object.hasOwn(game,"owned_fish"),false);
  assert.equal((state as any).fishingCasts.get(auth.pvid),endJournal);assert.deepEqual(game,original);assert.deepEqual(readFileSync(file),pendingBytes);
  // Restart the genuinely pending log and finish it; no fake Begin success.
  const restarted=new ServerState("http://localhost",file,options);
  const won=gameResponse(restarted,"/fishing/EndWithSell",{...auth,log_id:"1",is_win:"1"}) as any;
  assert.equal(won.result_code,1);assert.equal(won.ret_data.fish_id,castFish.id);
  assert.deepEqual(won.ret_data.user.item,[{inst_id:baitId+1,ref_id:castFish.id,added:1}]);
  assert.deepEqual(won.ret_data.consumed_inst_list,[{inst_id:baitId,qty:2}]);assert.equal(won.ret_data.sell,undefined);
  let current=restarted;
  const call=(suffix:string,extra:Record<string,unknown>={})=>gameResponse(current,"/fishing/"+suffix,{...auth,...extra}) as any;
  assert.deepEqual(call("GetInven").ret_data,[{fish_id:castFish.id,b_cnt:1,s_cnt:0,g_cnt:0}]);
  assert.deepEqual(call("GetRecord").ret_data,[{fish_id:castFish.id,grade:1,length:100}]);
  const wonBytes=readFileSync(file);
  assert.equal(call("EndWithSell",{log_id:1,is_win:0}).result_code,10203,"Lost-reply recovery clears consume without reapplying additive catch");
  assert.deepEqual(readFileSync(file),wonBytes);
  // Dynamic bridge allows sale of this real earned stack, not just imported fish.
  const sale=call("SellFish",{fish_id:castFish.id,grade:1,qty:1});assert.equal(sale.result_code,1);
  assert.deepEqual(sale.ret_data.item,[{inst_id:baitId+1,qty:1}]);assert.equal(sale.ret_data.user.gold.cur,10011);
  assert.equal(call("Begin",castContext).ret_data.log_id,2);
  const secondPending=readFileSync(file);
  assert.equal(call("EndWithSell",{log_id:1,is_win:1}).result_code,2001,"Stale old result must not clear a newer pending native consume marker");
  assert.deepEqual(readFileSync(file),secondPending);
  assert.equal(call("EndWithSell",{log_id:2,is_win:1}).result_code,1);
  assert.deepEqual(call("GetRecord").ret_data,[{fish_id:castFish.id,grade:1,length:100}],"Equal length preserves prior grade, even when new grade is higher");
  assert.equal(call("Begin",castContext).ret_data.log_id,3);
  assert.equal(call("EndWithSell",{log_id:3,is_win:1}).result_code,1);
  assert.deepEqual(call("GetRecord").ret_data,[{fish_id:castFish.id,grade:2,length:120}]);
  assert.equal(call("Begin",castContext).ret_data.log_id,4);
  const loss=call("EndWithSell",{log_id:4,is_win:0});assert.equal(loss.result_code,1);
  assert.deepEqual(loss.ret_data,{fish_id:"",grade:0,length:0,consumed_inst_list:[{inst_id:baitId,qty:2}],achievement:null});
  assert.deepEqual(call("GetRecord").ret_data,[{fish_id:castFish.id,grade:2,length:120}]);
  const after=JSON.parse(readFileSync(file,"utf8")),finalGame=after.gameStates[0][1];
  assert.equal(finalGame.items.find((i:any)=>i.inst_id===baitId).qty,22);
  assert.deepEqual(finalGame.owned_fish,[{fish_id:castFish.id,b_cnt:0,s_cnt:1,g_cnt:1}]);
  assert.deepEqual(after.gameStates[1],saved.gameStates[1],"Peer game unchanged");
  assert.deepEqual(finalGame,{...original,items:finalGame.items,owned_fish:finalGame.owned_fish,gold:10011,next_item_inst_id:baitId+4},"Only actual caught/sold inventory, bait, allocator and gold change");
  current=new ServerState("http://localhost",file,{...options,fishingCastMode:"disabled",fishingCastPolicy:undefined});
  const disabledBytes=readFileSync(file);
  assert.equal(call("Begin",castContext).result_code,2001);assert.equal(call("EndWithSell",{log_id:4,is_win:0}).result_code,2001);
  assert.deepEqual(call("GetRecord").ret_data,[{fish_id:castFish.id,grade:2,length:120}]);assert.deepEqual(readFileSync(file),disabledBytes);
  for(const change of [(o:any)=>o.fishingCastPolicy.bait_qty++, (o:any)=>o.fishingItems[0].name="Changed",
    (o:any)=>o.fishingSaleBindings={[auth.pvid]:[{fish_id:castFish.id,grade:1,inst_id:77}]}]) {
    const modified=structuredClone(options);change(modified);assert.throws(()=>new ServerState("http://localhost",file,modified));assert.deepEqual(readFileSync(file),disabledBytes);
  }
  // Malformed cohort/journal/ownership never silently migrates or overwrites.
  for(const corrupt of [(s:any)=>s.version=14,(s:any)=>s.fishingCasts=[],(s:any)=>s.fishingCasts[0][0]=999,
    (s:any)=>s.fishingCasts[0][1].casts[0].log_id=3,(s:any)=>s.fishingCasts[0][1].casts[0].outcome_index=2,
    (s:any)=>s.fishingCasts[0][1].casts[0].state="pending",(s:any)=>s.fishingCasts[0][1].casts[0].item_inst_id=baitId,
    (s:any)=>s.fishingCasts[0][1].casts[0].bait[0].qty=1,(s:any)=>s.gameStates[0][1].owned_fish[0].s_cnt=99,
    (s:any)=>{s.gameStates[0][1].items.find((i:any)=>i.inst_id===baitId+2).qty=100;s.gameStates[0][1].owned_fish[0].g_cnt=100;}]) {
    const changed=structuredClone(after);corrupt(changed);const invalid=JSON.stringify(changed);writeFileSync(file,invalid);
    assert.throws(()=>new ServerState("http://localhost",file,options));assert.equal(readFileSync(file,"utf8"),invalid);
  }
  writeFileSync(file,disabledBytes);
  // Exact local policy grammar and float32 safety prevent incomplete minigames.
  for(const mutate of [(p:any)=>delete p.stock,(p:any)=>p.contexts=[],(p:any)=>p.contexts.push(p.contexts[0]),
    (p:any)=>p.contexts[0].outcomes[0].fish_id="UNKNOWN",(p:any)=>p.contexts[0].outcomes[0].grade=4,
    (p:any)=>p.contexts[0].outcomes[0].length=0,(p:any)=>p.contexts[0].tuning.max_val=Infinity,
    (p:any)=>p.contexts[0].tuning.inc_val=1e-50,(p:any)=>p.contexts[0].tuning.first_burn={min:8,max:1},
    (p:any)=>p.contexts[0].outcomes=Array(1),(p:any)=>p.contexts[0].tuning.extra=1]) {
    const policy=structuredClone(options.fishingCastPolicy);mutate(policy);
    assert.throws(()=>configuredFishingCasts(policy,options.fishingItems,options.fishingCatalogue));
  }
  const journal=after.fishingCasts[0][1];assert.deepEqual(normalizeFishingCasts(journal,options.fishingItems,options.fishingCatalogue),journal);
  const noBait={...options,baitShopMode:"disabled" as const};assert.throws(()=>new ServerState("http://localhost",undefined,noBait),/bait.*metadata/);
  // Complete automatic sale, including original callback ordering and tombstones.
  const saleFile=path.join(dir,"auto-sale.json");writeFileSync(saleFile,JSON.stringify(saved));
  const auto=new ServerState("http://localhost",saleFile,castOptions("sell"));
  assert.equal((gameResponse(auto,"/fishing/Begin",{...auth,...castContext}) as any).result_code,1);
  const autoGame=(auto as any).gameByPvid.get(auth.pvid),autoItems=autoGame.items,autoJournal=(auto as any).fishingCasts.get(auth.pvid),autoBefore=structuredClone(autoGame),autoBytes=readFileSync(saleFile);
  (auto as any).stateFile=blocked;
  try{assert.throws(()=>gameResponse(auto,"/fishing/EndWithSell",{...auth,log_id:1,is_win:1}));}finally{(auto as any).stateFile=saleFile;}
  assert.equal(autoGame.items,autoItems);assert.equal(Object.hasOwn(autoGame,"owned_fish"),false);
  assert.equal((auto as any).fishingCasts.get(auth.pvid),autoJournal);assert.deepEqual(autoGame,autoBefore);assert.deepEqual(readFileSync(saleFile),autoBytes);
  autoGame.gold=0xffff_ffff;
  assert.equal((gameResponse(auto,"/fishing/EndWithSell",{...auth,log_id:1,is_win:1}) as any).result_code,2001);
  assert.equal(autoGame.items,autoItems);assert.equal((auto as any).fishingCasts.get(auth.pvid),autoJournal);
  autoGame.gold=autoBefore.gold;
  const autoWon=gameResponse(auto,"/fishing/EndWithSell",{...auth,log_id:1,is_win:1}) as any;
  assert.equal(autoWon.result_code,1);assert.deepEqual(autoWon.ret_data.user.item,[{inst_id:baitId+1,ref_id:castFish.id,added:1}]);
  assert.deepEqual(autoWon.ret_data.sell.item,[{inst_id:baitId+1,qty:1}]);assert.equal(autoWon.ret_data.sell.user.gold.cur,10011);
  assert.deepEqual(autoWon.ret_data.sell.sell_result,{fish_id:castFish.id,b_cnt:0,s_cnt:0,g_cnt:0});
  assert.equal(JSON.parse(readFileSync(saleFile,"utf8")).gameStates[0][1].items.at(-1).qty,0);
  new ServerState("http://localhost",saleFile,castOptions("sell"));
  const lossFile=path.join(dir,"first-loss.json");writeFileSync(lossFile,JSON.stringify(saved));
  const firstLoss=new ServerState("http://localhost",lossFile,options);
  assert.equal((gameResponse(firstLoss,"/fishing/Begin",{...auth,...castContext}) as any).result_code,1);
  assert.equal((gameResponse(firstLoss,"/fishing/EndWithSell",{...auth,log_id:1,is_win:0}) as any).result_code,1);
  const lossGame=JSON.parse(readFileSync(lossFile,"utf8")).gameStates[0][1],expectedLoss=structuredClone(original);
  expectedLoss.items[0].qty-=2;
  assert.deepEqual(lossGame,expectedLoss,"First loss changes only actual bait, preserving absent owned_fish and allocator/gold");
  assert.deepEqual((gameResponse(firstLoss,"/fishing/GetRecord",auth) as any).ret_data,[]);
  new ServerState("http://localhost",lossFile,options);
} finally {Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Configured fishing casts: durable Begin, end-only owned bait, native empty loss, earned grade/stack bridge and records, keep/sell, restart/replay, stale consume safety, schema15 integrity, immutable policy, atomic rollback and peer/progress preservation passed; original tables and native UI unverified.");
