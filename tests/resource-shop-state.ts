import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-resource-shop-")),clock=Date.now;
let now=1_800_000_000_000;Date.now=()=>now;
const options={resourceShopMode:"archive-2018-base-only",resourceApDailyLimit:3,resourceBpDailyLimit:3} as const;
try {
  const file=path.join(directory,"state.json");let state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"resource-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"resource-peer"},{}).ret_data as any;
  let game=(state as any).gameByPvid.get(actor.pvid);
  const run=(extra={},s=state)=>gameResponse(s,"/shop/BuyGlobalItem",{...actor,target_ref_id:"local_ap",qty:1,item_inst_id:0,price_type:1,...extra}) as any;
  game.ap=70;game.bp=15;game.gold=25000;game.gacha_free_qty=4;game.gacha_iap_qty=100;
  game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();
  assert.equal(run().result_code,1);assert.equal(game.ap,80,"Legacy amount remains10");
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,1);
  state=new ServerState("http://localhost",file,options);game=(state as any).gameByPvid.get(actor.pvid);
  const peerBefore=JSON.stringify((state as any).gameByPvid.get(peer.pvid));
  assert.equal(game.fuel_shop.manda,1,"Enabling historical quotes preserves paid history");
  const refs=state.itemReferenceRows();
  for(const [id,type,amount] of [["local_ap",1,60],["local_bp",2,2]] as const) {
    assert.equal(refs.item.filter(row=>row.use_type===type).length,1);
    assert.equal(refs.item.find(row=>row.id===id)!.effect,String(amount));
    const offer=refs.global_item.find(row=>row.item_id===id)!;
    assert.equal(offer.ticket_ref_id,id+"_coupon");assert.equal(offer.ticket_qty,1);
  }
  assert.equal(game.items.some((row:any)=>row.ref_id.endsWith("_coupon")),false,"No coupon issuance");
  game.items=[{inst_id:"9007199254740993",ref_id:"local_ap_coupon",qty:2,lock:0},
    {inst_id:4294967331,ref_id:"local_bp_coupon",qty:2,lock:0}];(state as any).persist();
  const account=(state as any).accountsByPvid.get(actor.pvid);
  account.rupeeShopCounter={day:Math.floor(now/86400000),manda:1,coupon:0};
  account.profileSettings={info_message:"Preserved profile",rename_count:1};(state as any).persist();
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,8);
  const unchanged=(before:string)=>assert.equal(JSON.stringify(game),before);
  const failure=(extra:object)=>{const before=JSON.stringify(game),disk=readFileSync(file);assert.notEqual(run(extra).result_code,1);unchanged(before);assert.deepEqual(readFileSync(file),disk);};
  for(const extra of [{qty:2},{qty:true},{item_inst_id:1},{price_type:3},{price_type:4,item_inst_id:0},
    {price_type:4,item_inst_id:4294967331},{price_type:4,item_inst_id:"09007199254740993"},{price:1},{added:999},{target_ref_id:"unknown"}])failure(extra);
  const bpBefore=game.bp,apClock=game.ap_updated_at,bpClock=game.bp_updated_at;
  const gold=run({price_type:2});assert.equal(gold.result_code,1);assert.equal(game.ap,140);assert.equal(game.gold,20000);
  assert.equal(gold.ret_data.user.ap.ap_charge_time,Math.floor(now/1000)+300);assert.equal(gold.ret_data.user.bp,undefined);
  assert.deepEqual(gold.ret_data.user.gold,{prev:25000,cur:20000});
  const money=[game.gold,game.gacha_free_qty,game.gacha_iap_qty];
  const coupon=run({price_type:4,item_inst_id:"9007199254740993"});assert.equal(coupon.result_code,1);
  assert.equal(game.ap,200);assert.equal(game.bp,bpBefore);assert.equal(game.items[0].qty,1);
  assert.deepEqual([game.gold,game.gacha_free_qty,game.gacha_iap_qty],money);
  assert.equal(coupon.ret_data.target_item_inst.qty,1);assert.match(JSON.stringify(coupon),/"inst_id":9007199254740993/);
  assert.deepEqual(coupon.ret_data.consumed_inst_list,[]);assert.equal(coupon.ret_data.user.iap,undefined);
  assert.deepEqual([game.ap_updated_at,game.bp_updated_at],[apClock,bpClock]);
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,9);failure({price_type:4,item_inst_id:"9007199254740993"});
  for(const payment of [1,2,4])assert.equal(run({target_ref_id:"local_bp",price_type:payment,item_inst_id:payment===4?4294967331:0}).result_code,1);
  assert.equal(game.bp,21);assert.deepEqual(game.bp_shop,{day:Math.floor(now/86400000),manda:1,gold:1,coupon:1});
  assert.equal(JSON.stringify((state as any).gameByPvid.get(peer.pvid)),peerBefore);
  state=new ServerState("http://localhost",file,options);game=(state as any).gameByPvid.get(actor.pvid);
  assert.deepEqual((state as any).accountsByPvid.get(actor.pvid).rupeeShopCounter,account.rupeeShopCounter);
  assert.deepEqual((state as any).accountsByPvid.get(actor.pvid).profileSettings,account.profileSettings);
  const inven=gameResponse(state,"/lobby/GetItemInven",actor) as any;
  for(const id of ["local_ap","local_bp"])assert.deepEqual(inven.ret_data.global_item.filter((row:any)=>row.item_id===id).map((row:any)=>[row.price_type,row.buy_cnt]),[[1,1],[2,1],[4,1]]);
  const disabled=new ServerState("http://localhost",file);assert.notEqual(run({},disabled).result_code,1,"Disabled mode retains coupon usage in shared cap");
  now-=86400000;gameResponse(state,"/lobby/GetItemInven",actor);failure({});now+=2*86400000;
  // Settle clocks at the existing resource boundary before testing purchase rollback.
  gameResponse(state,"/lobby/GetItemInven",actor);
  assert.deepEqual(game.fuel_shop,{day:Math.floor(now/86400000),manda:0,gold:0,coupon:0});
  const saved=readFileSync(file),priorGame=JSON.stringify(game),counter=game.fuel_shop,couponRow=game.items[0];
  mkdirSync(file+".tmp");
  try{assert.throws(()=>run({price_type:4,item_inst_id:"9007199254740993"}));assert.equal(game.fuel_shop,counter);assert.equal(game.items[0],couponRow);unchanged(priorGame);assert.deepEqual(readFileSync(file),saved);}
  finally{rmdirSync(file+".tmp");}
  // A rename failure must roll back the same transaction too.
  const previousPersist=(state as any).persist.bind(state);
  (state as any).persist=()=>{throw new Error("rename fixture");};
  try{assert.throws(()=>run({price_type:2}));unchanged(priorGame);assert.equal(game.fuel_shop,counter);assert.deepEqual(readFileSync(file),saved);}
  finally{(state as any).persist=previousPersist;}
  const original=JSON.parse(saved.toString());
  for(let version=1;version<=8;version++) {
    const invalid=structuredClone(original);invalid.version=version;
    if(version===1){delete invalid.dispatches;delete invalid.quests;}else if(version===2)delete invalid.quests;
    writeFileSync(file,JSON.stringify(invalid));const bytes=readFileSync(file);assert.throws(()=>new ServerState("http://localhost",file,options),/schema9/);assert.deepEqual(readFileSync(file),bytes);
  }
  const empty=structuredClone(original);for(const [,row] of empty.gameStates){delete row.fuel_shop.coupon;delete row.bp_shop.coupon;}
  writeFileSync(file,JSON.stringify(empty));assert.throws(()=>new ServerState("http://localhost",file,options),/Schema9/);
  writeFileSync(file,saved);assert.equal(run({price_type:4,item_inst_id:"9007199254740993"}).result_code,1);assert.equal(game.items[0].qty,0);
  // Failed first purchase preserves old schema/counter absence in both modes.
  for(const mode of [undefined,options]) {
    const target=path.join(directory,mode?"new-history.json":"legacy.json"),s=new ServerState("http://localhost",target,mode);
    const a=s.registerGuest({device_id:"first"},{}).ret_data as any,g=(s as any).gameByPvid.get(a.pvid);
    g.ap_updated_at=now;g.bp_updated_at=now;g.gold=10000;
    if(mode)g.items=[{inst_id:4294967331,ref_id:"local_ap_coupon",qty:1,lock:0}];
    (s as any).persist();const before=JSON.stringify(g),disk=readFileSync(target),shop=g.fuel_shop,row=g.items[0];
    for(const payment of mode?[1,2,4]:[1,2]) {
      const purchase=()=>gameResponse(s,"/shop/BuyGlobalItem",{...a,target_ref_id:"local_ap",qty:1,item_inst_id:payment===4?4294967331:0,price_type:payment});
      const exact=()=>{assert.equal(JSON.stringify(g),before);assert.equal(g.fuel_shop,shop);assert.equal(g.items[0],row);assert.equal(g.fuel_shop.coupon,undefined);assert.deepEqual(readFileSync(target),disk);};
      mkdirSync(target+".tmp");try{assert.throws(purchase,/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(target+".tmp");}exact();
      const blocked=target+"-blocked";mkdirSync(blocked);(s as any).stateFile=blocked;
      try{assert.throws(purchase,/EISDIR|EPERM|EEXIST|rename/);}finally{(s as any).stateFile=target;rmdirSync(blocked);}exact();
    }
    const refused=(mutate:()=>void,extra:object={})=>{const previous=structuredClone(g);mutate();(s as any).persist();const invalid=JSON.stringify(g),bytes=readFileSync(target);
      assert.notEqual((gameResponse(s,"/shop/BuyGlobalItem",{...a,target_ref_id:"local_ap",qty:1,item_inst_id:0,price_type:1,...extra}) as any).result_code,1);
      assert.equal(JSON.stringify(g),invalid);assert.deepEqual(readFileSync(target),bytes);Object.assign(g,previous);};
    refused(()=>g.ap=0x7fff_ffff);refused(()=>g.gacha_free_qty=0x1_0000_0000);
    refused(()=>{g.gacha_free_qty=0;g.gacha_iap_qty=4;});refused(()=>g.gold=0,{price_type:2});
    if(mode) {
      const request={price_type:4,item_inst_id:4294967331};
      refused(()=>g.items[0].lock=1,request);refused(()=>g.items[0].qty=0,request);
      refused(()=>g.items.push({...g.items[0],inst_id:4294967332}),request);
      refused(()=>g.items.push({...g.items[0],ref_id:"other"}),request);
      // A failed inventory rollover restores previously captured counters too.
      assert.equal((gameResponse(s,"/shop/BuyGlobalItem",{...a,target_ref_id:"local_ap",qty:1,...request}) as any).result_code,1);
      now+=86400000;g.ap_updated_at=now;g.bp_updated_at=now;(s as any).persist();
      const prior=JSON.stringify(g),bytes=readFileSync(target),counter=g.fuel_shop;
      mkdirSync(target+".tmp");try{assert.throws(()=>gameResponse(s,"/lobby/GetItemInven",a));assert.equal(JSON.stringify(g),prior);assert.equal(g.fuel_shop,counter);assert.deepEqual(readFileSync(target),bytes);}finally{rmdirSync(target+".tmp");}
    }
  }
  console.log("Historical resource shop state: paid-history carry, three payments, schema9/restart, shared caps, exact coupons and rollback passed");
} finally {Date.now=clock;rmSync(directory,{recursive:true,force:true});}
