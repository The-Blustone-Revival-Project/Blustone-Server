import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import path from "node:path";
import {tmpdir} from "node:os";
import {repositoryPath} from "../src/paths.js";
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8")).env);
const {ServerState}=await import("../src/state.js"),{gameResponse}=await import("../src/game-routes.js");
const dir=mkdtempSync(path.join(tmpdir(),"blustone-manda-gem-")),file=path.join(dir,"state.json"),clock=Date.now;
Date.now=()=>1_800_000_000_000;
try {
 const ref={id:"AUTHORED_MANDA_GEM",name:"Fixture",desc:"",res_id:"G_1_001_R1",set_effect_id:1,rank:1,target:1};
 const options={gemReferences:[ref],gemDisassemblePrices:[{level:1,price_type:1,price:2},{level:6,price_type:1,price:15}]};
 let state=new ServerState("http://localhost",file,options);
 const auth=state.registerGuest({device_id:"manda-gem-owner"},{}).ret_data as any;
 const peer=state.registerGuest({device_id:"manda-gem-peer"},{}).ret_data as any;
 let game=state.gameFor(state.accountFor(auth,{}));const target=game.starter_cards[0];target.weapon_rank=3;
 game.gold=20000;game.gacha_free_qty=1;game.gacha_iap_qty=3;
 const gem=(id:string,level:number,position:number)=>({inst_id:id,ref_id:ref.id,rank:1,level,position,target_inst_id:String(target.inst_id),ability:"authored opaque",abilities:null});
 game.owned_gems=[gem("18446744073709551615",1,1),gem("9007199254740993",6,2)];
 (state as any).persist();const original=structuredClone(game),bytes=readFileSync(file),items=game.owned_gems;
 const call=(cells:unknown[],extra:Record<string,unknown>={})=>gameResponse(state,"/card_handler/EquipGem",{pvid:auth.pvid,otp:auth.otp,
  target_inst_id:String(target.inst_id),price_type:"1",combination:JSON.stringify({weapons:cells,armors:[0,0],accessories:[0,0]}),...extra}) as any;
 assert.equal(call([0,0]).result_code,2001);assert.deepEqual(game,original);assert.deepEqual(readFileSync(file),bytes);
 mkdirSync(file+".tmp");assert.throws(()=>call([0,"9007199254740993"]));rmdirSync(file+".tmp");
 assert.equal(game.owned_gems,items);assert.deepEqual(game,original);assert.deepEqual(readFileSync(file),bytes);
 const blocked=path.join(dir,"blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
 try{assert.throws(()=>call([0,"9007199254740993"]));}finally{(state as any).stateFile=file;}
 assert.equal(game.owned_gems,items);assert.deepEqual(game,original);assert.deepEqual(readFileSync(file),bytes);
 const result=call([0,"9007199254740993"],{price:0});assert.equal(result.result_code,1);
 assert.equal(result.ret_data.user.iap_qty,2);assert.equal(result.ret_data.user.free_iap_qty,0);assert.equal(result.ret_data.user.gold.cur,20000);
 assert.equal(result.ret_data.gems.length,2);assert.equal(result.ret_data.gems[0].target_inst_id,"0");
 const settled=readFileSync(file),saved=JSON.parse(settled.toString()),initial=JSON.parse(bytes.toString());
 assert.deepEqual(saved.gameStates[1],initial.gameStates[1]);assert.deepEqual(saved.accounts,initial.accounts);
 assert.deepEqual({...game,owned_gems:original.owned_gems,gacha_free_qty:original.gacha_free_qty,gacha_iap_qty:original.gacha_iap_qty},original);
 const retry=call([0,"9007199254740993"]);assert.equal(retry.result_code,1);assert.deepEqual(retry.ret_data,result.ret_data);
 assert.deepEqual(readFileSync(file),settled,"No-write retry must not spend twice");
 state=new ServerState("http://localhost",file,options);game=state.gameFor(state.accountFor(auth,{}));
 assert.deepEqual(readFileSync(file),settled);assert.equal(game.gacha_free_qty,0);assert.equal(game.gacha_iap_qty,2);
 const cold=call([0,"9007199254740993"]);assert.deepEqual(cold.ret_data,result.ret_data);assert.deepEqual(readFileSync(file),settled);
 const missing=new ServerState("http://localhost",file,{gemReferences:[ref],gemDisassemblePrices:[{level:6,price_type:2,price:1}]});
 const unavailable=gameResponse(missing,"/card_handler/EquipGem",{pvid:auth.pvid,otp:auth.otp,target_inst_id:String(target.inst_id),price_type:1,
  combination:JSON.stringify({weapons:[0,0],armors:[0,0],accessories:[0,0]})}) as any;
 assert.equal(unavailable.result_code,2001);assert.deepEqual(readFileSync(file),settled);
 assert.equal((gameResponse(state,"/reference/GetGemDisassemblePrice",{pvid:peer.pvid,otp:peer.otp}) as any).ret_data[0].price_type,1);
 console.log("Manda Gem state: authoritative selected fee/local debit, real write+rename rollback, full rows/peer isolation, no-op and cold restart passed");
}finally{Date.now=clock;assert.ok(dir.startsWith(path.join(tmpdir(),"blustone-manda-gem-")));rmSync(dir,{recursive:true,force:true});}
