import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {repositoryPath} from "../src/paths.js";
import {fuelItemReference,FUEL_SHOP_ID,BP_SHOP_ID} from "../src/shop-fuel.js";
import {configuredResourceShop,resourceShopReferences,resourceShopPolicyFromEnv,RESOURCE_SHOP_AMOUNTS,RESOURCE_SHOP_COUPON_IDS,RESOURCE_SHOP_JACKPOT,RESOURCE_SHOP_EVIDENCE} from "../src/resource-shop.js";
assert.equal(configuredResourceShop(undefined,undefined,undefined),undefined);assert.equal(configuredResourceShop("disabled",undefined,undefined),undefined);
for(const mode of [null,"","archive-2017-base-only","archive-2018"])assert.throws(()=>configuredResourceShop(mode,2,3));
for(const mode of [undefined,"disabled"])for(const limits of [[2,undefined],[undefined,3],[2,3],["",undefined]])assert.throws(()=>configuredResourceShop(mode,...limits as [unknown,unknown]),/enabled/);
for(const bad of [undefined,null,"",0,-1,1.5,1001,"01","1e0","2.0",true,NaN,Infinity]){
  assert.throws(()=>configuredResourceShop("archive-2018-base-only",bad,3));assert.throws(()=>configuredResourceShop("archive-2018-base-only",2,bad));
}
const policy=configuredResourceShop("archive-2018-base-only","2","3")!;
assert.deepEqual(policy,{mode:"archive-2018-base-only",apDailyLimit:2,bpDailyLimit:3});assert.ok(Object.isFrozen(policy));
assert.throws(()=>{(policy as {apDailyLimit:number}).apDailyLimit=999;},TypeError);
assert.deepEqual(resourceShopPolicyFromEnv({BLUSTONE_RESOURCE_SHOP_MODE:"archive-2018-base-only",BLUSTONE_RESOURCE_AP_DAILY_LIMIT:"2",BLUSTONE_RESOURCE_BP_DAILY_LIMIT:"3"}),policy);
assert.equal(resourceShopPolicyFromEnv({}),undefined);assert.throws(()=>resourceShopPolicyFromEnv({BLUSTONE_RESOURCE_AP_DAILY_LIMIT:"2"}));
assert.throws(()=>resourceShopPolicyFromEnv({BLUSTONE_RESOURCE_SHOP_MODE:"archive-2018-base-only",BLUSTONE_RESOURCE_BP_DAILY_LIMIT:"2"}));
const bytes=readFileSync(repositoryPath(RESOURCE_SHOP_EVIDENCE.path)),hash=(raw:Buffer|string)=>createHash("sha256").update(raw).digest("hex");
assert.equal(hash(bytes),RESOURCE_SHOP_EVIDENCE.sha256);const evidence=JSON.parse(bytes.toString());
for(const row of evidence.quotes)assert.equal(hash(row.raw_tsv_row),row.raw_row_sha256);
assert.ok(evidence.quotes.some((r:any)=>r.idx===2840&&r.filename_year===2018&&r.observation_kind==="fuel-complete-2018"));
assert.ok(evidence.quotes.some((r:any)=>r.idx===2478&&r.filename_year===2018&&r.observation_kind==="invitations-complete-2018"));
const legacy=fuelItemReference(),legacyBefore=structuredClone(legacy),refs=resourceShopReferences(policy);
for(const offer of legacy.global_item) {
  assert.equal(offer.ticket_qty,1,"Default missing coupons must fail affordability before unchecked native lookup");
  assert.equal(legacy.item.find(row=>row.id===offer.ticket_ref_id)!.use_type,0);
}
assert.deepEqual(RESOURCE_SHOP_AMOUNTS,{ap:60,bp:2});assert.deepEqual(RESOURCE_SHOP_JACKPOT,{jackpot_level:1,jackpot_multiply:1});
assert.equal(refs.item.length,4);assert.deepEqual(refs.item.map(r=>r.id),[FUEL_SHOP_ID,BP_SHOP_ID,RESOURCE_SHOP_COUPON_IDS.ap,RESOURCE_SHOP_COUPON_IDS.bp]);
assert.equal(refs.item.filter(r=>r.use_type===1).length,1);assert.equal(refs.item.filter(r=>r.use_type===2).length,1);
for(const [resource,id,type,amount,cap]of [["ap",FUEL_SHOP_ID,1,60,2],["bp",BP_SHOP_ID,2,2,3]] as const){
  const row=refs.item.find(r=>r.id===id)!,global=refs.global_item.find(r=>r.item_id===id)!;
  assert.equal(row.use_type,type);assert.equal(row.effect,String(amount));assert.equal(global.provide_qty,1);assert.equal(global.buy_limit,cap);
  assert.equal(global.ticket_ref_id,RESOURCE_SHOP_COUPON_IDS[resource]);assert.equal(global.ticket_qty,1,"No empty-ID/zero-required coupon lookup");
  const coupon=refs.item.find(r=>r.id===global.ticket_ref_id)!;assert.equal(coupon.use_type,0);assert.equal(coupon.effect,"");assert.equal(coupon.sell_price,0);
  assert.deepEqual(global.price_list,[1,2,4].flatMap(price_type=>Array.from({length:cap},(_,i)=>({price_type,buy_cnt:i+1,price:price_type===1?5:price_type===2?5000:1}))));
}
// A consuming owner replaces matching IDs, preserving one selector of each
// type and all unrelated references; builder never rewrites baseline fixtures.
const replacements=new Map(refs.item.map(row=>[row.id,row]));
const merged=legacy.item.map(row=>replacements.get(row.id)??row).concat(refs.item.filter(row=>!legacy.item.some(old=>old.id===row.id)));
assert.equal(merged.filter(row=>row.use_type===1).length,1);assert.equal(merged.filter(row=>row.use_type===2).length,1);
assert.deepEqual(legacy,legacyBefore);assert.equal(legacy.item[0].effect,"10");assert.equal(legacy.item[1].effect,"5");
refs.item[0].effect="999";refs.global_item[0].price_list[0].price=5000;
assert.equal(resourceShopReferences(policy).item[0].effect,"60");assert.equal(resourceShopReferences(policy).global_item[0].price_list[0].price,5);
assert.throws(()=>resourceShopReferences({...policy,mode:"disabled"} as any));assert.throws(()=>resourceShopReferences({...policy,apDailyLimit:0}));
assert.equal(resourceShopReferences(configuredResourceShop("archive-2018-base-only",1000,1000)!).global_item[0].price_list.length,3000);
console.log("Resource shop policy: pinned2018 AP60/BP2 base quotes, explicit complete caps/env refusal, replacement-only stable IDs/type selectors, all payment tiers, positive local coupons, normal jackpot and detached references passed; no state integration/grants.");
