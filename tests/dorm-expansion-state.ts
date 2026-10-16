import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {cardInstance} from "../src/bootstrap.js";
import {DORM_SHOP_ID,hunterCapacity} from "../src/dorm-expansion.js";

const folder=mkdtempSync(path.join(tmpdir(),"blustone-dorm-state-")),clock=Date.now;
let now=1_800_000_000_000;Date.now=()=>now;
const options={dormExpansionMode:"local-priced",dormExpansionPrices:[{capacity:100,gold:50000,manda:3},{capacity:103,gold:60000,manda:4}]} as const;
try {
  const file=path.join(folder,"state.json");let state=new ServerState("http://localhost",file,options);
  const actor=state.registerGuest({device_id:"dorm-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"dorm-peer"},{}).ret_data as any;
  let game=(state as any).gameByPvid.get(actor.pvid);
  game.gold=200000;game.gacha_free_qty=2;game.gacha_iap_qty=10000;game.ap_updated_at=now;game.bp_updated_at=now;
  (state as any).persist();
  const req=(route:string,extra:object={})=>gameResponse(state,route,{...actor,...extra}) as any;
  const buy=(extra={})=>req("/shop/BuyGlobalItem",{target_ref_id:DORM_SHOP_ID,price_type:1,item_inst_id:0,qty:1,...extra});
  const snapshot=()=>({game:JSON.stringify(game),disk:readFileSync(file),counter:game.dorm_expansion,book:game.card_book,cards:game.recruited_cards});
  const exact=(before:ReturnType<typeof snapshot>)=>{assert.equal(JSON.stringify(game),before.game);assert.deepEqual(readFileSync(file),before.disk);assert.equal(game.dorm_expansion,before.counter);assert.equal(game.card_book,before.book);assert.equal(game.recruited_cards,before.cards);};
  const failures=(action:()=>unknown)=>{
    const before=snapshot();mkdirSync(file+".tmp");try{assert.throws(action,/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+".tmp");}exact(before);
    const blocked=file+"-blocked";mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(action,/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}exact(before);
  };
  assert.equal(hunterCapacity(game),100);assert.equal(game.dorm_expansion,undefined);assert.equal(JSON.parse(readFileSync(file,"utf8")).version,1);
  game.fuel_shop={day:Math.floor(now/86400000),manda:1,gold:0,coupon:1};
  const owner=(state as any).accountsByPvid.get(actor.pvid);
  owner.rupeeShopCounter={day:Math.floor(now/86400000),manda:1,coupon:0};owner.profileSettings={info_message:"Kept through schema10",rename_count:1};
  (state as any).persist();assert.equal(JSON.parse(readFileSync(file,"utf8")).version,9);
  const refs=state.itemReferenceRows();assert.equal(refs.item.filter(row=>row.use_type===9).length,1);
  assert.equal(refs.item.find(row=>row.id===DORM_SHOP_ID)!.effect,"3");
  for(const extra of [{price_type:4},{qty:2},{qty:true},{item_inst_id:1},{price:0},{capacity:999},{card_inven_max:999}]) {
    const before=snapshot();assert.notEqual(buy(extra).result_code,1);exact(before);
  }
  failures(()=>buy());failures(()=>buy({price_type:2}));assert.equal(game.dorm_expansion,undefined);
  const peerBefore=structuredClone((state as any).gameByPvid.get(peer.pvid)),before=snapshot();
  const first=buy();assert.equal(first.result_code,1);assert.deepEqual(first.ret_data.user.card_inven_max,{prev:100,cur:103});
  assert.deepEqual(first.ret_data.user.iap,{iap_qty:9999,free_iap_qty:0});assert.equal(game.gold,200000);
  assert.deepEqual(game.dorm_expansion,{capacity:103,manda:1,gold:0});assert.equal(JSON.parse(readFileSync(file,"utf8")).version,10);
  const expected=JSON.parse(before.game);Object.assign(expected,{gacha_free_qty:0,gacha_iap_qty:9999,dorm_expansion:{capacity:103,manda:1,gold:0}});assert.deepEqual(game,expected);
  failures(()=>buy({price_type:2}));const second=buy({price_type:2});assert.equal(second.result_code,1);
  assert.deepEqual(second.ret_data.user.card_inven_max,{prev:103,cur:106});assert.deepEqual(second.ret_data.user.gold,{prev:200000,cur:140000});
  assert.deepEqual(game.dorm_expansion,{capacity:106,manda:1,gold:1});assert.equal(hunterCapacity(game),106);
  const capped=snapshot();assert.notEqual(buy().result_code,1);exact(capped);
  const counters=req("/lobby/GetItemInven").ret_data.global_item.filter((row:any)=>row.item_id===DORM_SHOP_ID);
  assert.deepEqual(counters,[1,2,4].map(price_type=>({item_id:DORM_SHOP_ID,price_type,buy_cnt:price_type===4?0:1})));
  const durable=readFileSync(file);state=new ServerState("http://localhost",file,{dormExpansionMode:"disabled"});game=(state as any).gameByPvid.get(actor.pvid);
  assert.deepEqual((state as any).accountsByPvid.get(actor.pvid).rupeeShopCounter,owner.rupeeShopCounter);
  assert.deepEqual((state as any).accountsByPvid.get(actor.pvid).profileSettings,owner.profileSettings);
  assert.equal(game.fuel_shop.coupon,1);
  assert.equal(hunterCapacity(game),106);assert.notEqual(buy().result_code,1);assert.deepEqual(readFileSync(file),durable);
  assert.equal((state.lobbyEnter(actor,{}).ret_data as any).user.card_inven_max,106);
  assert.deepEqual((state as any).gameByPvid.get(peer.pvid),peerBefore);
  // Both actual card producers share the captured capacity, even while paid
  // expansion is disabled. Authored cards/traces are disposable test stock.
  const fill=(total:number)=>{game.recruited_cards=Array.from({length:total-game.starter_cards.length},(_,index)=>cardInstance(1000100+index,"006",1));
    game.next_card_inst_id=1000100+game.recruited_cards.length;};
  fill(100);game.items.push({inst_id:99,ref_id:"local_sylvester_trace",qty:100,lock:0});(state as any).persist();
  assert.equal(req("/shop/PieceExchange",{item_inst_id:99,cnt:1}).result_code,1,"Trace recruiting uses paid slots beyond old100");
  assert.equal(req("/shop/GachaPremium",{cnt:1}).ret_data.cnt,1,"Gacha uses paid slots beyond old100");
  fill(105);(state as any).persist();const bundle=snapshot();assert.equal(req("/shop/GachaPremium",{cnt:11}).ret_data.cnt,0);exact(bundle);
  failures(()=>req("/shop/GachaPremium",{cnt:1}));assert.equal(req("/shop/GachaPremium",{cnt:1}).ret_data.cnt,1);
  const full=snapshot();assert.equal(req("/shop/PieceExchange",{item_inst_id:99,cnt:1}).result_code,10027);exact(full);
  assert.equal(req("/shop/GachaPremium",{cnt:1}).ret_data.cnt,0);exact(full);
  fill(108);(state as any).persist();state=new ServerState("http://localhost",file);game=(state as any).gameByPvid.get(actor.pvid);
  assert.equal(game.starter_cards.length+game.recruited_cards.length,108,"Grandfathered overflow is preserved without hidden capacity increase");
  assert.equal(hunterCapacity(game),106);const overflow=snapshot();assert.equal(req("/shop/GachaPremium",{cnt:1}).ret_data.cnt,0);exact(overflow);
  const saved=JSON.parse(readFileSync(file,"utf8"));
  for(let version=1;version<=9;version++) {
    const invalid=structuredClone(saved);invalid.version=version;if(version===1){delete invalid.quests;delete invalid.dispatches;}if(version===2)delete invalid.quests;
    writeFileSync(file,JSON.stringify(invalid));const bytes=readFileSync(file);assert.throws(()=>new ServerState("http://localhost",file),/schema10/);assert.deepEqual(readFileSync(file),bytes);
  }
  const malformed=structuredClone(saved);delete malformed.gameStates.find(([id]:any)=>id===actor.pvid)[1].dorm_expansion;
  writeFileSync(file,JSON.stringify(malformed));assert.throws(()=>new ServerState("http://localhost",file),/Schema10/);
  writeFileSync(file,JSON.stringify(saved));
  const restored=new ServerState("http://localhost",file),g=(restored as any).gameByPvid.get(actor.pvid);
  assert.equal(hunterCapacity(g),106);assert.equal(g.recruited_cards.length+g.starter_cards.length,108);
  // Legacy100 capacity also protects the unchanged baseline from over-recruiting.
  const old=new ServerState("http://localhost"),auth=old.registerGuest({device_id:"old-full"},{}).ret_data as any,oldGame=(old as any).gameByPvid.get(auth.pvid);
  oldGame.recruited_cards=Array.from({length:100-oldGame.starter_cards.length},(_,i)=>cardInstance(1000100+i,"006",1));
  const oldBefore=JSON.stringify(oldGame);assert.equal((old.gachaPremium({...auth,cnt:1},{}).ret_data as any).cnt,0);assert.equal(JSON.stringify(oldGame),oldBefore);
  console.log("Dorm state: exact paid capacity/price tier, atomic writes/renames, schema10/restart/disabled preservation, shared gacha+trace gates, grandfathered overflow and no side effects passed");
}finally{Date.now=clock;rmSync(folder,{recursive:true,force:true});}
