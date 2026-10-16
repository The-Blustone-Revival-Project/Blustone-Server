import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-bait-shop-")),realNow=Date.now;
let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),options={baitShopMode:"archive-2018-projection" as const,baitShopDailyLimit:2};
  const state=new ServerState("http://localhost",file,options);
  const actor=state.registerGuest({device_id:"bait-owner",extra_data:{baitShopCounter:{day:0,buy_cnt:100}}},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"bait-peer"},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>,game=games.get(actor.pvid);
  assert.equal(accounts.get(actor.pvid).baitShopCounter,undefined,"Registration cannot inject server-owned purchase history");
  // Disposable authored wallet/clock fixture; every bait stock unit is bought.
  game.gacha_free_qty=4;game.gacha_iap_qty=20;game.ap=1;game.bp=1;game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();
  const request={target_ref_id:"LU003",price_type:1,item_inst_id:0,qty:1};
  const buy=(extra={},who=actor,s=state)=>gameResponse(s,"/shop/BuyGlobalItem",{...who,...request,...extra}) as any;
  assert.throws(()=>gameResponse(state,"/shop/BuyGlobalItem",request),/authenticated account required/);
  const refs=gameResponse(state,"/reference/GetItem",actor).ret_data as any;
  assert.equal(refs.item.filter((row:any)=>row.id==="LU003").length,1);assert.equal(refs.item.find((row:any)=>row.id==="LU003").use_type,0);
  assert.deepEqual(refs.global_item.find((row:any)=>row.item_id==="LU003"),{item_id:"LU003",buy_limit:2,provide_qty:10,type:1,ticket_ref_id:"",ticket_qty:0,
    price_list:[{price_type:1,buy_cnt:1,price:6},{price_type:1,buy_cnt:2,price:6}]});
  const snapshot=()=>({bytes:readFileSync(file),value:structuredClone({g:[...games],a:[...accounts]}),refs:[...games].map(([_id,g])=>[g,Object.entries(g)] as const),counter:accounts.get(actor.pvid).baitShopCounter});
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual({g:[...games],a:[...accounts]},before.value);assert.deepEqual(readFileSync(file),before.bytes);
    before.refs.forEach(([g,children])=>children.forEach(([key,ref])=>{if(ref!==null&&typeof ref==="object")assert.equal(g[key],ref);}));
    assert.equal(accounts.get(actor.pvid).baitShopCounter,before.counter);
  };
  const failWrites=()=>{
    const before=snapshot();mkdirSync(file+".tmp");
    try{assert.throws(()=>buy(),/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}unchanged(before);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(()=>buy(),/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}unchanged(before);
  };
  const initial=snapshot();
  for(const invalid of [{qty:10},{price_type:2},{item_inst_id:1},{price:0},{target_ref_id:"LU001"}]){
    assert.notEqual(buy(invalid).result_code,1);unchanged(initial);
  }
  assert.equal(gameResponse(state,"/arena/SaveComment",{...actor,comment_info:'{"win_message":"Gone fishing"}'}).result_code,1);
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,5);
  failWrites();const first=buy();assert.equal(first.result_code,1);
  assert.deepEqual(first.ret_data.user,{iap:{iap_qty:18,free_iap_qty:0}});assert.equal(first.ret_data.item[0].added,10);
  const inst=first.ret_data.item[0].inst_id;assert.equal(game.items.find((row:any)=>row.inst_id===inst).qty,10);
  assert.equal(game.ap,1);assert.equal(game.bp,1);assert.equal(accounts.get(peer.pvid).baitShopCounter,undefined);
  const saved=JSON.parse(readFileSync(file,"utf8"));assert.equal(saved.version,6);assert.deepEqual(saved.dispatches,[]);assert.deepEqual(saved.quests,[]);
  assert.equal(accounts.get(actor.pvid).arenaComments.win_message,"Gone fishing");
  failWrites();const second=buy();assert.equal(second.result_code,1);
  assert.equal(second.ret_data.item[0].inst_id,inst);assert.equal(second.ret_data.item[0].qty,10,"Receipt goods qty is local nominal pack size, not remaining stock");
  assert.equal(game.items.find((row:any)=>row.inst_id===inst).qty,20);assert.equal(game.gacha_iap_qty,12);
  const capped=snapshot();assert.notEqual(buy().result_code,1);unchanged(capped);
  now-=86_400_000;assert.notEqual(buy().result_code,1);unchanged(capped);now+=2*86_400_000;
  assert.equal(buy().result_code,1);assert.equal(game.items.find((row:any)=>row.inst_id===inst).qty,30);
  const bytes=readFileSync(file),restart=new ServerState("http://localhost",file,options);
  assert.deepEqual((restart as any).gameByPvid.get(actor.pvid),game);assert.deepEqual(readFileSync(file),bytes);
  const inventory=gameResponse(restart,"/lobby/GetItemInven",actor).ret_data as any;
  assert.equal(inventory.global_item.find((row:any)=>row.item_id==="LU003").buy_cnt,1);
  assert.equal(inventory.item.find((row:any)=>row.inst_id===inst).qty,30);
  const disabled=new ServerState("http://localhost",file),offBefore=readFileSync(file);
  assert.notEqual(buy({},actor,disabled).result_code,1);assert.deepEqual(readFileSync(file),offBefore);
  assert.equal((disabled as any).accountsByPvid.get(actor.pvid).baitShopCounter.buy_cnt,1,"Disabling the offer preserves captured counters");
  const linear={id:"local_bait_linear",type:3,title:"Local history",desc:"",desc_noti:"",npc_id:"",go_to:"",serial:1,target_val:1,option_val:0,
    reward:{...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),item_list:[],card_list:[]}};
  const daily={...linear,id:"local_bait_daily",type:2};
  const history=new ServerState("http://localhost",file,{...options,questMode:"local-fixed",questPolicy:{period_id:"bait-history",minimum_stage:"n_01_01",
    references:[daily],rules:[],owners:{[actor.pvid]:[{daily_quest_id:daily.id,is_rewarded:0,cur_val:0}]},linear:{references:[linear],rules:[{id:linear.id,event:"mission-win",stage_id:null}]}}});
  assert.equal(gameResponse(history,"/dailyquest/GetRefList",actor).result_code,1);
  const historyGame=(history as any).gameByPvid.get(actor.pvid);
  (history as any).dispatches.set(actor.pvid,{active:null,last_id:"77",last_deck:[historyGame.leader_inst_id]});
  assert.equal(gameResponse(history,"/arena/SaveComment",{...actor,comment_info:'{"lose_message":"Another cast"}'}).result_code,1);
  const captured=JSON.parse(readFileSync(file,"utf8"));assert.equal(captured.version,6);assert.equal(captured.quests[0][1].linear.index,0);assert.equal(captured.dispatches.length,1);
  const afterHistory=new ServerState("http://localhost",file);
  assert.equal(gameResponse(afterHistory,"/arena/SaveComment",{...actor,comment_info:'{"win_message":"Back to shore"}'}).result_code,1);
  const rewritten=JSON.parse(readFileSync(file,"utf8"));assert.equal(rewritten.version,6);
  assert.deepEqual(rewritten.quests,captured.quests);assert.deepEqual(rewritten.dispatches,captured.dispatches);
  assert.deepEqual(rewritten.accounts.find((a:any)=>a.pvid===actor.pvid).baitShopCounter,captured.accounts.find((a:any)=>a.pvid===actor.pvid).baitShopCounter);
  const canonical=JSON.parse(readFileSync(file,"utf8")),badFile=path.join(directory,"corrupt.json");
  for(const mutate of [
    (v:any)=>{v.version=5;},(v:any)=>{delete v.dispatches;},(v:any)=>{delete v.quests;},
    (v:any)=>{v.accounts.forEach((a:any)=>delete a.baitShopCounter);},
    (v:any)=>{v.accounts.find((a:any)=>a.pvid===actor.pvid).baitShopCounter.buy_cnt=0;},
  ]){
    const value=structuredClone(canonical);mutate(value);writeFileSync(badFile,JSON.stringify(value));const before=readFileSync(badFile);
    assert.throws(()=>new ServerState("http://localhost",badFile,options));assert.deepEqual(readFileSync(badFile),before);
  }
  // Legacy accounts remain at their original schema when the feature is unused.
  const freshFile=path.join(directory,"fresh.json"),fresh=new ServerState("http://localhost",freshFile,options);
  fresh.registerGuest({device_id:"no-bait-purchase"},{});assert.equal(JSON.parse(readFileSync(freshFile,"utf8")).version,1);
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
console.log("Historical bait shop: authenticated reference/purchase/stock/counter/wallet flow, real write/rename rollback, daily/rollback limits, schema6 metadata and Arena preferences, restart/disabled preservation and legacy/corrupt snapshots passed.");
