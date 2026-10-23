import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-fishing-tutorial-state-")),file=path.join(dir,"state.json");
const json=(name:string)=>JSON.parse(readFileSync(`config/policies/fishing-practice-${name}.json`,"utf8"));
const options={baitShopMode:"archive-2018-projection" as const,baitShopDailyLimit:3,
 fishingItems:json("items"),fishingCatalogue:json("catalogue"),fishingCastMode:"local-configured" as const,fishingCastPolicy:json("casts"),
 fishingTutorialMode:"local-first-catch" as const,fishingTutorialPolicy:json("tutorial")};
try {
 const seed=new ServerState("http://localhost",file),rawAuth=seed.registerGuest({device_id:"tutorial-owner"},{}).ret_data as any;
 const auth={pvid:rawAuth.pvid,otp:rawAuth.otp};
 seed.registerGuest({device_id:"tutorial-peer"},{});
 let state=new ServerState("http://localhost",file,options);
 const call=(extra:Record<string,unknown>={},suffix="EndWithSell")=>gameResponse(state,"/fishing/"+suffix,{...auth,log_id:"-1",is_win:"1",...extra}) as any;
 const game=()=> (state as any).gameByPvid.get(auth.pvid);
 const bytes=readFileSync(file),original=structuredClone(game());
 // A completed native27/2 flag blocks a first award, without manufacturing a record.
 game().tutorial.push({type:27,step:2,is_cleared:1});assert.equal(call().result_code,2001);game().tutorial=structuredClone(original.tutorial);
 game().owned_fish=[{fish_id:"LOCAL_PRACTICE_FISH",b_cnt:1,s_cnt:0,g_cnt:0}];assert.equal(call().result_code,2001);delete game().owned_fish;
 assert.deepEqual(readFileSync(file),bytes);

 for(const extra of [{is_win:0},{is_win:true},{is_win:"01"},{fish_id:"FORGED"},{lure_id:"LU003"}])assert.equal(call(extra).result_code,2001);
 assert.deepEqual(readFileSync(file),bytes);
 mkdirSync(file+".tmp");assert.throws(()=>call());rmdirSync(file+".tmp");
 assert.deepEqual(game(),original);assert.equal((state as any).fishingTutorials.size,0);assert.deepEqual(readFileSync(file),bytes);
 const blocked=path.join(dir,"blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
 const items=game().items;
 try{assert.throws(()=>call());}finally{(state as any).stateFile=file;}
 assert.equal(game().items,items);assert.equal(Object.hasOwn(game(),"owned_fish"),false);assert.equal((state as any).fishingTutorials.size,0);
 //27/0 is allowed; only27/2 completes the native guide.
 game().tutorial.push({type:27,step:0,is_cleared:1});
 const won=call();assert.equal(won.result_code,1);assert.equal(won.ret_data.fish_id,"LOCAL_PRACTICE_FISH");
 assert.deepEqual(won.ret_data.consumed_inst_list,[]);assert.equal(game().gold,original.gold+10);
 assert.equal(game().tutorial.some((r:any)=>r.type===27&&r.step===2),false);
 assert.equal(game().items.at(-1).qty,0);assert.equal(game().next_item_inst_id,original.next_item_inst_id+1);
 const saved=JSON.parse(readFileSync(file,"utf8"));assert.equal(saved.version,17);assert.deepEqual(saved.dispatches,[]);assert.deepEqual(saved.quests,[]);
 assert.deepEqual(saved.gameStates[1],JSON.parse(bytes.toString()).gameStates[1]);
 const settled=readFileSync(file);assert.equal(call().result_code,10203);assert.deepEqual(readFileSync(file),settled);
 assert.equal(call({fish_id:"forged"}).result_code,2001);
 const record=[{fish_id:"LOCAL_PRACTICE_FISH",grade:1,length:10000}];assert.deepEqual(call({},"GetRecord").ret_data,record);
 state=new ServerState("http://localhost",file,{...options,fishingTutorialMode:"disabled",fishingTutorialPolicy:undefined});
 assert.deepEqual(call({},"GetRecord").ret_data,record);assert.deepEqual(readFileSync(file),settled);
 // Reload refuses corrupt/retuned journals without touching originals.
 for(const mutate of [(s:any)=>s.version=16,(s:any)=>s.fishingTutorials=[],(s:any)=>s.fishingTutorials[0][0]=999999,
  (s:any)=>s.fishingTutorials.push(s.fishingTutorials[0]),(s:any)=>s.gameStates[0][1].items.at(-1).qty=1,
  (s:any)=>s.gameStates[0][1].next_item_inst_id=s.gameStates[0][1].items.at(-1).inst_id,
  (s:any)=>s.fishingTutorials[0][1].reference_hash="0".repeat(64)]) {
  const bad=structuredClone(saved);mutate(bad);writeFileSync(file,JSON.stringify(bad));const raw=readFileSync(file);
  assert.throws(()=>new ServerState("http://localhost",file,options));assert.deepEqual(readFileSync(file),raw);
 }
 writeFileSync(file,settled);
 const retuned=structuredClone(options);retuned.fishingCatalogue.prices[0].b_price++;
 assert.throws(()=>new ServerState("http://localhost",file,retuned));assert.deepEqual(readFileSync(file),settled);
 state=new ServerState("http://localhost",file,options);
 // Any ordinary pending cast blocks even the duplicate tutorial cleanup.
 game().items.push({inst_id:game().next_item_inst_id++,ref_id:"LU003",qty:3,lock:0});
 const begin=gameResponse(state,"/fishing/Begin",{...auth,place_id:"PLC001",cast_dist:"1",lure_id:"LU003"}) as any;
 assert.equal(begin.result_code,1);const pending=readFileSync(file);assert.equal(call().result_code,2001);assert.deepEqual(readFileSync(file),pending);
 assert.equal((gameResponse(state,"/fishing/EndWithSell",{...auth,log_id:begin.ret_data.log_id,is_win:1}) as any).result_code,1);
 assert.deepEqual(call({},"GetRecord").ret_data,record,"Equal ordinary length preserves prior tutorial grade");
 const next=gameResponse(state,"/fishing/Begin",{...auth,place_id:"PLC001",cast_dist:"1",lure_id:"LU003"}) as any;
 assert.equal(next.result_code,1);assert.equal((gameResponse(state,"/fishing/EndWithSell",{...auth,log_id:next.ret_data.log_id,is_win:1}) as any).result_code,1);
 const longer=[{fish_id:"LOCAL_PRACTICE_FISH",grade:2,length:12000}];assert.deepEqual(call({},"GetRecord").ret_data,longer);
 state=new ServerState("http://localhost",file,options);assert.deepEqual(call({},"GetRecord").ret_data,longer);

 console.log("Fishing tutorial state: one-time settlement, native27/0 eligibility, rollback, schema17, retained records and pending protection passed");
} finally {assert.ok(dir.startsWith(path.join(tmpdir(),"blustone-fishing-tutorial-state-")));rmSync(dir,{recursive:true,force:true});}
