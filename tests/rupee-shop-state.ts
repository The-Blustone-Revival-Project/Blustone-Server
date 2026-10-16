import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {RUPEE_SHOP_ID,RUPEE_COUPON_ID} from "../src/rupee-shop.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-rupee-shop-")),realNow=Date.now;
let now=1_800_000_000_000;Date.now=()=>now;
const wide="9007199254740993",request={target_ref_id:RUPEE_SHOP_ID,price_type:1,item_inst_id:0,qty:1};
try {
  for(const [mode,price] of [["archive-2017-base-only",10],["archive-2021-base-only",5]] as const) {
    const file=path.join(directory,mode+".json"),options={rupeeShopMode:mode,rupeeShopDailyLimit:2};
    const state=new ServerState("http://localhost",file,options);
    const actor=state.registerGuest({device_id:"rupee-owner",extra_data:{rupeeShopCounter:{day:0,manda:0,coupon:999}}},{}).ret_data as any;
    const peer=state.registerGuest({device_id:"rupee-peer"},{}).ret_data as any;
    const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>,game=games.get(actor.pvid);
    const run=(extra={},who=actor,s=state)=>gameResponse(s,"/shop/BuyGlobalItem",{...who,...request,...extra}) as any;
    assert.equal(accounts.get(actor.pvid).rupeeShopCounter,undefined);assert.equal(JSON.parse(readFileSync(file,"utf8")).version,1);
    assert.equal(game.items.some((row:any)=>row.ref_id===RUPEE_COUPON_ID||row.ref_id===RUPEE_SHOP_ID),false,"Publication cannot grant coupons or pack stock");
    const refs=state.itemReferenceRows(),pack=refs.item.find(row=>row.id===RUPEE_SHOP_ID)!;
    assert.equal(refs.item.filter(row=>row.use_type===11).length,1);assert.equal(pack.use_type,11);assert.equal(pack.effect,"5000");
    const offer=refs.global_item.find(row=>row.item_id===RUPEE_SHOP_ID)!;
    assert.equal(offer.provide_qty,1);assert.equal(offer.ticket_ref_id,RUPEE_COUPON_ID);assert.equal(offer.ticket_qty,1);
    assert.deepEqual(offer.price_list,[{price_type:1,buy_cnt:1,price},{price_type:1,buy_cnt:2,price}]);
    // Explicit authored coupon ownership, unrelated stock and wallet/clock fixture.
    game.items=[{inst_id:wide,ref_id:RUPEE_COUPON_ID,qty:2,lock:0},{inst_id:17,ref_id:"unrelated",qty:4,lock:1}];
    games.get(peer.pvid).items=[{inst_id:77,ref_id:RUPEE_COUPON_ID,qty:3,lock:0}];
    game.gacha_free_qty=4;game.gacha_iap_qty=30;game.gold=123;
    game.ap=1;game.bp=1;game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();
    const snapshot=()=>{
      const refs:Array<{root:any;keys:string[];ref:any}>=[];
      const walk=(root:any,ref:any,keys:string[]=[])=>{if(!ref||typeof ref!=="object")return;refs.push({root,keys,ref});for(const [key,value] of Object.entries(ref))walk(root,value,[...keys,key]);};
      [...games.values(),...accounts.values()].forEach(value=>walk(value,value));
      return {bytes:readFileSync(file),g:structuredClone([...games]),a:structuredClone([...accounts]),refs};
    };
    const unchanged=(before:ReturnType<typeof snapshot>)=>{
      assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...games],before.g);assert.deepEqual([...accounts],before.a);
      before.refs.forEach(({root,keys,ref})=>assert.equal(keys.reduce((value,key)=>value[key],root),ref));
    };
    const failures=(operation:()=>unknown)=>{
      const before=snapshot();mkdirSync(file+".tmp");
      try{assert.throws(operation,/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}unchanged(before);
      const blocked=path.join(directory,mode+"-rename");mkdirSync(blocked);(state as any).stateFile=blocked;
      try{assert.throws(operation,/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}unchanged(before);
    };
    const coupon=()=>run({price_type:4,item_inst_id:wide});
    now+=3_600_000;const initial=snapshot();
    assert.throws(()=>gameResponse(state,"/shop/BuyGlobalItem",request),/authenticated account required/);unchanged(initial);
    for(const extra of [{qty:10},{qty:"01"},{price_type:2},{price:0},{jackpot_multiply:16},{price_type:4,item_inst_id:77},
      {price_type:4,item_inst_id:17},{price_type:4,item_inst_id:0},{item_inst_id:wide}]){
      assert.notEqual(run(extra).result_code,1);unchanged(initial);
    }
    game.items[0].lock=1;const locked=snapshot();assert.notEqual(coupon().result_code,1);unchanged(locked);game.items[0].lock=0;
    game.items[0].qty=0;const shortage=snapshot();assert.notEqual(coupon().result_code,1);unchanged(shortage);game.items[0].qty=2;
    const free=game.gacha_free_qty,paid=game.gacha_iap_qty;game.gacha_free_qty=0;game.gacha_iap_qty=price-1;
    const poor=snapshot();assert.notEqual(run().result_code,1);unchanged(poor);game.gacha_free_qty=free;game.gacha_iap_qty=paid;
    const gold=game.gold;game.gold=0x7fff_ffff-4999;const overflow=snapshot();assert.notEqual(run().result_code,1);unchanged(overflow);game.gold=gold;
    games.delete(actor.pvid);const absent=snapshot();assert.notEqual(run().result_code,1);unchanged(absent);assert.equal(games.has(actor.pvid),false);games.set(actor.pvid,game);
    failures(()=>run());failures(coupon);assert.equal(accounts.get(actor.pvid).rupeeShopCounter,undefined);
    const beforeBuy=snapshot(),result=run();assert.equal(result.result_code,1);
    assert.deepEqual(result.ret_data,{jackpot_level:1,jackpot_multiply:1,user:{gold:{prev:123,cur:5123},iap:{iap_qty:30-(price-4),free_iap_qty:0}},
      target_inst:{item_id:RUPEE_SHOP_ID,price_type:1,buy_cnt:{prev:0,cur:1}},consumed_inst_list:[]});
    assert.equal(game.gold,5123);assert.equal(game.items[0].qty,2);assert.equal(game.vip_exp,beforeBuy.g.find(([pvid])=>pvid===actor.pvid)![1].vip_exp);
    const expectedManda=structuredClone(beforeBuy.g.find(([pvid])=>pvid===actor.pvid)![1]);
    Object.assign(expectedManda,{gold:5123,gacha_free_qty:0,gacha_iap_qty:30-(price-4)});
    assert.deepEqual(game,expectedManda,"Manda purchase changes exactly gold and two Manda words; no items, allocator, clocks or rewards");
    assert.deepEqual(games.get(peer.pvid),beforeBuy.g.find(([pvid])=>pvid===peer.pvid)![1]);
    assert.equal(game.ap,1);assert.equal(game.bp,1);assert.equal(game.ap_updated_at,initial.g.find(([pvid])=>pvid===actor.pvid)![1].ap_updated_at);
    failures(coupon);const beforeCoupon=snapshot(),converted=coupon();assert.equal(converted.result_code,1);
    assert.equal(game.gold,10123);assert.equal(game.items[0].qty,1);
    assert.deepEqual(converted.ret_data.user,{gold:{prev:5123,cur:10123}});
    assert.deepEqual(converted.ret_data.target_inst,{item_id:RUPEE_SHOP_ID,price_type:4,buy_cnt:{prev:0,cur:1}});
    assert.equal(converted.ret_data.target_item_inst.qty,1);assert.match(JSON.stringify(converted.ret_data.target_item_inst),/"inst_id":9007199254740993/);
    assert.deepEqual(converted.ret_data.consumed_inst_list,[]);assert.equal("item" in converted.ret_data,false);assert.equal("item" in converted.ret_data.user,false);
    assert.equal(game.gacha_free_qty,beforeCoupon.g.find(([pvid])=>pvid===actor.pvid)![1].gacha_free_qty);
    assert.equal(game.gacha_iap_qty,beforeCoupon.g.find(([pvid])=>pvid===actor.pvid)![1].gacha_iap_qty);
    const expectedCoupon=structuredClone(beforeCoupon.g.find(([pvid])=>pvid===actor.pvid)![1]);expectedCoupon.gold=10123;expectedCoupon.items[0].qty=1;
    assert.deepEqual(game,expectedCoupon,"Coupon purchase changes exactly gold and selected absolute stock");
    const capped=snapshot();assert.notEqual(run().result_code,1);assert.notEqual(coupon().result_code,1);unchanged(capped);
    const inventory=(gameResponse(state,"/lobby/GetItemInven",actor).ret_data as any).global_item.filter((row:any)=>row.item_id===RUPEE_SHOP_ID);
    assert.deepEqual(inventory,[{item_id:RUPEE_SHOP_ID,price_type:1,buy_cnt:1},{item_id:RUPEE_SHOP_ID,price_type:2,buy_cnt:0},{item_id:RUPEE_SHOP_ID,price_type:4,buy_cnt:1}]);
    const saved=JSON.parse(readFileSync(file,"utf8"));assert.equal(saved.version,8);assert.deepEqual(saved.dispatches,[]);assert.deepEqual(saved.quests,[]);
    const bytes=readFileSync(file),restored=new ServerState("http://localhost",file,options);assert.deepEqual([...(restored as any).gameByPvid],[...games]);assert.deepEqual(readFileSync(file),bytes);
    assert.notEqual(run({},actor,restored).result_code,1);assert.deepEqual(readFileSync(file),bytes);
    const off=new ServerState("http://localhost",file,{rupeeShopMode:"disabled"});assert.notEqual(run({},actor,off).result_code,1);assert.deepEqual(readFileSync(file),bytes);
    assert.equal(off.itemReferenceRows().item.some(row=>row.use_type===11||row.id===RUPEE_COUPON_ID),false);
    now+=86_400_000;
    const reset=(gameResponse(state,"/lobby/GetItemInven",actor).ret_data as any).global_item.filter((row:any)=>row.item_id===RUPEE_SHOP_ID);
    assert.deepEqual(reset,[1,2,4].map(price_type=>({item_id:RUPEE_SHOP_ID,price_type,buy_cnt:0})));
    assert.equal(coupon().result_code,1);assert.equal(game.items[0].qty,0,"Fully consumed coupon stays a zero row");assert.equal(run().result_code,1);
    now-=86_400_000;const rollback=snapshot();assert.notEqual(run().result_code,1);assert.notEqual(coupon().result_code,1);unchanged(rollback);now+=86_400_000;
    const corrupt=(mutate:(raw:any)=>void)=>{
      const copy=structuredClone(saved);mutate(copy);const target=path.join(directory,"invalid-"+mode+".json");writeFileSync(target,JSON.stringify(copy));
      const exact=readFileSync(target);assert.throws(()=>new ServerState("http://localhost",target,options));assert.deepEqual(readFileSync(target),exact);
    };
    for(let version=1;version<=7;version++)corrupt(raw=>{raw.version=version;if(version<3)delete raw.quests;if(version===1)delete raw.dispatches;});
    corrupt(raw=>{for(const account of raw.accounts)delete account.rupeeShopCounter;});
    corrupt(raw=>{delete raw.dispatches;});corrupt(raw=>{delete raw.quests;});
    corrupt(raw=>{raw.accounts[0].rupeeShopCounter={day:0,manda:0,coupon:0};});
  }
  // Real optional-feature journals coexist with schema8 and survive unrelated writes.
  const file=path.join(directory,"coexist.json"),seed=new ServerState("http://localhost",file);
  const actor=seed.registerGuest({device_id:"coexist-owner"},{}).ret_data as any;
  const reward={...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),gold:0,item_list:[],card_list:[]};
  const ref=(id:string,type:number)=>({id,type,target_val:10,serial:1,title:"Local coexistence",desc:"Earn %t",desc_noti:"",npc_id:"",go_to:"",option_val:0,reward});
  const daily=ref("local_rupee_daily",2),linear=ref("local_rupee_linear",3);
  const questPolicy={period_id:"rupee-period",minimum_stage:"n_01_01",references:[daily],rules:[{id:daily.id,event:"mission-win",stage_id:null}],
    owners:{[actor.pvid]:[{daily_quest_id:daily.id,is_rewarded:0,cur_val:0}]},linear:{references:[linear],rules:[{id:linear.id,event:"mission-win",stage_id:null}]}};
  const options={rupeeShopMode:"archive-2021-base-only" as const,rupeeShopDailyLimit:3,profileMode:"archive-profile-projection" as const,
    baitShopMode:"archive-2018-projection" as const,baitShopDailyLimit:2,questMode:"local-fixed" as const,questPolicy,
    dispatchMode:"local-timed" as const,dispatchPolicy:{max_runs:2,gold_per_run:7,user_exp_per_run:1,card_exp_per_run:1,skip_price:1,entrust_second_per_cost:60,
      passes:{[actor.pvid]:{end_datetime:"1970-01-01 00:00:00",end_datetime_utc:0}}}};
  const state=new ServerState("http://localhost",file,options),call=(route:string,extra={})=>gameResponse(state,route,{...actor,...extra}) as any;
  const account=(state as any).accountsByPvid.get(actor.pvid),game=(state as any).gameByPvid.get(actor.pvid);
  assert.equal(call("/dailyquest/GetRefList").result_code,1);
  for(const stage_id of ["n_01_01","n_01_05"]){assert.equal(state.startMission({...actor,stage_id},{}).result_code,1);assert.equal((state.completeMission({...actor,stage_id,play_info:'{"clear":1,"clear_time":1,"dead_cnt":0}'},{}) as any).ret_data.accepted,true);}
  assert.equal(call("/world/SetDeck",{deck_info:JSON.stringify([{type:2,list:[game.starter_cards[0].inst_id,0,0,0,0]}])}).result_code,1);
  assert.equal(call("/mission/Entrust",{stage_id:"n_01_01",deck_type:2,cnt:1,is_tuto:0}).result_code,1);
  assert.ok((state as any).dispatches.size>0);
  assert.equal(call("/arena/Enter").result_code,1);
  assert.equal(call("/arena/SaveComment",{comment_info:'{"win_message":"Rupee coexistence"}'}).result_code,1);
  assert.equal(call("/shop/BuyGlobalItem",{target_ref_id:"LU003",price_type:1,item_inst_id:0,qty:1}).result_code,1);
  assert.equal(state.updateWebProfile(account.webToken,{info_message:"Rupee coexistence"}).result_code,1);
  const before=JSON.parse(readFileSync(file,"utf8"));assert.equal(before.version,7);
  assert.equal(call("/shop/BuyGlobalItem",request).result_code,1);
  const paid=JSON.parse(readFileSync(file,"utf8"));assert.equal(paid.version,8);
  assert.deepEqual(paid.dispatches,before.dispatches);assert.deepEqual(paid.quests,before.quests);
  for(const key of ["profileSettings","arenaComments","baitShopCounter"])assert.deepEqual(paid.accounts[0][key],before.accounts[0][key]);
  const restored=new ServerState("http://localhost",file,options),snapshot=readFileSync(file);
  assert.deepEqual((restored as any).accountsByPvid.get(actor.pvid).rupeeShopCounter,account.rupeeShopCounter);assert.deepEqual(readFileSync(file),snapshot);
  restored.registerGuest({device_id:"unrelated-writer"},{});
  const after=JSON.parse(readFileSync(file,"utf8"));assert.equal(after.version,8);assert.deepEqual(after.dispatches,paid.dispatches);assert.deepEqual(after.quests,paid.quests);
  assert.deepEqual(after.accounts.find((row:any)=>row.pvid===actor.pvid),paid.accounts[0]);
  const unusedFile=path.join(directory,"unused.json"),unused=new ServerState("http://localhost",unusedFile,{rupeeShopMode:"archive-2021-base-only",rupeeShopDailyLimit:2});
  const guest=unused.registerGuest({device_id:"unused-shop"},{}).ret_data as any;unused.itemReferenceRows();gameResponse(unused,"/lobby/GetItemInven",guest);
  assert.equal(JSON.parse(readFileSync(unusedFile,"utf8")).version,1);
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
console.log("Rupee shop state: two historical base quotes, native absolute full64 coupon receipts, shared cap/reset, strict refusals, exact write/rename rollback, no allocation/clocks/grants, schema8 guards and optional-journal coexistence/restart passed.");
