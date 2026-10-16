import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {configuredBaitShop,normalizeBaitShopCounter,baitShopReferences,baitPurchaseInventory,
  planBaitPurchase,FISHING_BAIT_OFFER_SOURCE} from "../src/fishing-bait-shop.js";

const U32=0xffff_ffff,day=20_000,now=day*86_400_000,policy=configuredBaitShop("archive-2018-projection","2")!;
const packet={target_ref_id:"LU003",price_type:1,item_inst_id:0,qty:1};
const fresh=()=>({items:[] as Array<{inst_id:number;ref_id:string;qty:number;lock:number;extra?:{nested:number}}>,
  next_item_inst_id:1,gacha_free_qty:4,gacha_iap_qty:20});
const hash=(value:string|Buffer)=>createHash("sha256").update(value).digest("hex");
assert.equal(configuredBaitShop(undefined,undefined),undefined);assert.equal(configuredBaitShop("disabled",2),undefined);
for(const mode of ["",null,"archive-2017","local-fixture"])assert.throws(()=>configuredBaitShop(mode,2));
for(const limit of [undefined,null,"",0,1001,1.5,"01","2.0",true])assert.throws(()=>configuredBaitShop("archive-2018-projection",limit));
assert.ok(Object.isFrozen(policy));assert.throws(()=>{(policy as {dailyLimit:number}).dailyLimit=100;},TypeError);
assert.equal(configuredBaitShop("archive-2018-projection",1000)!.dailyLimit,1000);
const artifact=FISHING_BAIT_OFFER_SOURCE;
assert.equal(artifact.source.path,"findings/hunters/base-stats-visual-hunt/manual-scrapes-2026-10-14/batch-56.tsv");
assert.equal(artifact.source.sha256,"6b8acb8ebfe1c1bd0d3f6ef82e233308b1c81dd67d827d92fd3269b7966bded6");
assert.equal(artifact.source.line,46);assert.equal(artifact.source.idx,2795);
assert.equal(hash(artifact.source.raw),artifact.source.raw_sha256);assert.match(artifact.source.raw,/^2795\t/);
assert.match(artifact.source.raw,/Purchase with Manda 6/);assert.match(artifact.source.raw,/x10/);
assert.equal(hash(readFileSync("resources/reference/fishing-bait-offer-2018.json")),"73e5c4a9b03d93edafbd8eb2e5fa794f042a4aef25508f50d8eef705f8a81682");
assert.ok(Object.isFrozen(artifact)&&Object.isFrozen(artifact.source)&&Object.isFrozen(artifact.offer));
const references=baitShopReferences(policy);
assert.deepEqual(references.item,[{id:"LU003",name:"High-quality Bait",desc:"Historical2018 bait offer; neutral local item metadata.",
  thumbnail_id:"",rank:1,use_type:0,effect:"",sell_price:0,collect_qty:0}]);
assert.deepEqual(references.global_item,[{item_id:"LU003",buy_limit:2,provide_qty:10,type:1,ticket_ref_id:"",ticket_qty:0,
  price_list:[{price_type:1,buy_cnt:1,price:6},{price_type:1,buy_cnt:2,price:6}]}]);
references.global_item[0].price_list[0].price=999;references.item[0].name="changed";
assert.equal(baitShopReferences(policy).global_item[0].price_list[0].price,6);assert.equal(baitShopReferences(policy).item[0].name,"High-quality Bait");
for(const invalid of [undefined,null,[],{}, {day,buy_cnt:0},{day:-1,buy_cnt:1},{day,buy_cnt:U32+1},{day,buy_cnt:"1"},
  {day:1.5,buy_cnt:1},{day,buy_cnt:1,extra:0}])assert.throws(()=>normalizeBaitShopCounter(invalid));
const counter={day,buy_cnt:1};assert.deepEqual(normalizeBaitShopCounter(counter),counter);assert.notEqual(normalizeBaitShopCounter(counter),counter);
assert.deepEqual(baitPurchaseInventory(undefined,now),[{item_id:"LU003",price_type:1,buy_cnt:0}]);
assert.equal(baitPurchaseInventory(counter,now)[0].buy_cnt,1);assert.equal(baitPurchaseInventory(counter,now-86_400_000)[0].buy_cnt,1);
assert.equal(baitPurchaseInventory(counter,now+86_400_000)[0].buy_cnt,0);assert.deepEqual(counter,{day,buy_cnt:1});
for(const bad of [-1,NaN,Infinity,1.5])assert.throws(()=>baitPurchaseInventory(counter,bad));
const game=fresh(),before=structuredClone(game),plan=planBaitPurchase(packet,game,undefined,policy,now);
assert.deepEqual(game,before);assert.deepEqual(plan.counter,{day,buy_cnt:1});assert.equal(plan.next_item_inst_id,2);
assert.equal(plan.gacha_free_qty,0);assert.equal(plan.gacha_iap_qty,18);
assert.deepEqual(plan.items,[{inst_id:1,ref_id:"LU003",qty:10,lock:0}]);
assert.deepEqual(plan.receipt.user,{iap:{iap_qty:18,free_iap_qty:0}});assert.equal(plan.receipt.item[0].added,10);
assert.equal(plan.receipt.item[0].inst_id,1);assert.equal(plan.receipt.jackpot_level,1);assert.equal(plan.receipt.jackpot_multiply,1);
assert.deepEqual(plan.receipt.target_inst,{item_id:"LU003",price_type:1,buy_cnt:{prev:0,cur:1}});assert.deepEqual(plan.receipt.consumed_inst_list,[]);
assert.deepEqual(planBaitPurchase({...packet,price_type:"1",item_inst_id:"0",qty:"1"},game,undefined,policy,now),plan);
const committed={...game,...plan};
const second=planBaitPurchase(packet,committed,plan.counter,policy,now);assert.equal(second.items[0].qty,20);assert.equal(second.counter.buy_cnt,2);
assert.throws(()=>planBaitPurchase(packet,{...committed,...second},second.counter,policy,now),/limit/);
assert.throws(()=>planBaitPurchase(packet,{...committed,...second},second.counter,policy,now-86_400_000),/limit/);
const reset=planBaitPurchase(packet,{...committed,...second},second.counter,policy,now+86_400_000);
assert.deepEqual(reset.counter,{day:day+1,buy_cnt:1});
assert.equal(planBaitPurchase(packet,{...game,gacha_free_qty:8,gacha_iap_qty:0},undefined,policy,now).gacha_free_qty,2);
const wide=fresh();wide.items=[{inst_id:2**40,ref_id:"unrelated",qty:7,lock:1,extra:{nested:1}}];
const wideBefore=structuredClone(wide),widePlan=planBaitPurchase(packet,wide,undefined,policy,now);
assert.equal(widePlan.items[1].inst_id,2**40+1);assert.equal(widePlan.next_item_inst_id,2**40+2);
(widePlan.items[0] as typeof wide.items[number]).extra!.nested=99;assert.deepEqual(wide,wideBefore);
const existing=fresh();existing.items=[{inst_id:2**40,ref_id:"LU003",qty:9,lock:0,extra:{nested:2}}];
const existingBefore=structuredClone(existing),addition=planBaitPurchase(packet,existing,undefined,policy,now);
assert.equal(addition.items[0].qty,19);assert.equal(addition.items[0].inst_id,2**40);assert.equal(addition.next_item_inst_id,1);
assert.equal(addition.receipt.item[0].qty,10,"LOCAL nominal purchased quantity, not absolute remaining stock");
addition.items[0].qty=0;(addition.items[0] as typeof existing.items[number]).extra!.nested=9;assert.deepEqual(existing,existingBefore);
const refuse=(mutate:(g:ReturnType<typeof fresh>)=>void,pattern?:RegExp)=>{
  const g=fresh();mutate(g);const original=structuredClone(g);assert.throws(()=>planBaitPurchase(packet,g,undefined,policy,now),pattern??TypeError);assert.deepEqual(g,original);
};
refuse(g=>{g.gacha_free_qty=0;g.gacha_iap_qty=5;},/Manda/);
for(const value of [-1,1.5,U32+1,NaN])refuse(g=>{g.gacha_free_qty=value;},/wallet/);
refuse(g=>{g.items=[{inst_id:1,ref_id:"LU003",qty:U32-9,lock:0}];},/stock/);
refuse(g=>{g.items=[{inst_id:1,ref_id:"LU003",qty:0,lock:1}];},/stock/);
refuse(g=>{g.items=[{inst_id:1,ref_id:"LU003",qty:1,lock:0},{inst_id:2,ref_id:"LU003",qty:2,lock:0}];},/Ambiguous/);
refuse(g=>{g.items=[{inst_id:1,ref_id:"x",qty:0,lock:0},{inst_id:1,ref_id:"y",qty:0,lock:0}];},/identity/);
refuse(g=>{g.items=[{inst_id:Number.MAX_SAFE_INTEGER+1,ref_id:"x",qty:0,lock:0}];},/identity/);
refuse(g=>{g.next_item_inst_id=Number.MAX_SAFE_INTEGER;},/capacity/);
const maxStock=fresh();maxStock.items=[{inst_id:1,ref_id:"LU003",qty:U32-10,lock:0}];
assert.equal(planBaitPurchase(packet,maxStock,undefined,policy,now).items[0].qty,U32);
for(const patch of [{target_ref_id:"LU001"},{qty:10},{qty:true},{item_inst_id:1},{price_type:2},{price:6},{added:10},{buy_cnt:0},
  {qty:"01"},{free_iap_qty:6},{provide_qty:10}])assert.throws(()=>planBaitPurchase({...packet,...patch},game,undefined,policy,now),/packet/);
console.log("Historical bait shop: pinned original row, opt-in explicit LOCAL cap, detached references/plan,10-for6 Manda, monotone UTC counters, wide IDs, stock/packet/wallet refusals passed.");
