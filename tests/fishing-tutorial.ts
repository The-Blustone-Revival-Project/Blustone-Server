import assert from "node:assert/strict";
import {repositoryPath} from "../src/paths.js";
import {readFileSync} from "node:fs";
import {createLocalGameState} from "../src/game.js";
import {configuredFishingItems} from "../src/fishing-item-references.js";
import {configuredFishingCatalogue} from "../src/fishing-catalogue.js";
import {fishingEndLog} from "../src/fishing-casts.js";
import {configuredFishingTutorial,fishingTutorialReferenceHash,normalizeFishingTutorial,
  validateFishingTutorialStock,validateFishingTutorialEnd,planFishingTutorial} from "../src/fishing-tutorial.js";

const load=(file:string)=>JSON.parse(readFileSync(repositoryPath("config","policies",file),"utf8"));
const items=configuredFishingItems(load("fishing-practice-items.json"),new Set());
const catalogue=configuredFishingCatalogue(load("fishing-practice-catalogue.json"),new Set(items.map(row=>row.id)));
const rawPolicy=load("fishing-practice-tutorial.json"),policy=configuredFishingTutorial(rawPolicy,items,catalogue);
const hash=fishingTutorialReferenceHash(policy,items,catalogue),fish_id=policy.outcome.fish_id;
const game=createLocalGameState();game.gold=42;game.items=[{inst_id:11,ref_id:"UNRELATED",qty:4,lock:1}];game.next_item_inst_id=12;
const original=structuredClone(game),itemRef=game.items[0],itemsRef=game.items;
const raw={app_code:"_SR",app_ver:"28010",market:"GOOGLE",pvid:"7",otp:"dummy",log_id:"-1",is_win:"1"};
const plan=planFishingTutorial(game,7,policy,hash,catalogue,raw,1234);
assert.deepEqual(game,original);assert.equal(game.items,itemsRef);assert.equal(game.items[0],itemRef);
assert.equal(game.items.some(row=>row.ref_id==="LU003"),false,"tutorial must work without owned bait");
assert.equal(plan.gold,52);assert.equal(plan.next_item_inst_id,13);
assert.deepEqual(plan.items,[original.items[0],{inst_id:12,ref_id:fish_id,qty:0,lock:0}]);
assert.deepEqual(plan.owned_fish,[{fish_id,b_cnt:0,s_cnt:0,g_cnt:0}]);
assert.deepEqual(plan.receipt,{fish_id,grade:1,length:10000,item:[{inst_id:12,ref_id:fish_id,added:1}],consumed_inst_list:[],
  sell:{user:{gold:{prev:42,cur:52}},item:[{inst_id:12,qty:1}],sell_result:{fish_id,b_cnt:0,s_cnt:0,g_cnt:0}}});
assert.deepEqual(plan.journal,{policy,reference_hash:hash,item_inst_id:12,settled_ltime:1234});
assert.deepEqual(normalizeFishingTutorial(plan.journal,items,catalogue),plan.journal);
const settled={...game,...plan};validateFishingTutorialStock(settled,plan.journal);
const later=structuredClone(settled);later.items.push({inst_id:13,ref_id:fish_id,qty:2,lock:0});later.next_item_inst_id=14;
later.owned_fish[0].g_cnt=2;validateFishingTutorialStock(later,plan.journal);
const prior=structuredClone(game);prior.items.push({inst_id:10,ref_id:fish_id,qty:2,lock:0});
prior.owned_fish=[{fish_id,b_cnt:2,s_cnt:0,g_cnt:0},{fish_id:"UNRELATED_FISH",b_cnt:1,s_cnt:0,g_cnt:0}];
const priorCopy=structuredClone(prior),isolated=planFishingTutorial(prior,7,policy,hash,catalogue,raw,1234);
assert.deepEqual(prior,priorCopy);assert.deepEqual(isolated.owned_fish,prior.owned_fish);
assert.deepEqual(isolated.items.slice(0,-1),prior.items,"sale must never consume a previous stack");
assert.deepEqual(isolated.receipt.sell.sell_result,prior.owned_fish[0]);

for(const end of [{log_id:-1,is_win:1},raw])assert.doesNotThrow(()=>validateFishingTutorialEnd(end));
for(const bad of [null,[],{}, {log_id:-1,is_win:0},{log_id:1,is_win:1},{log_id:"-01",is_win:1},
  {log_id:-1,is_win:"01"},{log_id:-1,is_win:true},{...raw,fish_id},{...raw,grade:1},{...raw,length:1},
  {...raw,gauge:100},{...raw,qty:1},{...raw,achievement:{}},{...raw,offer_token:"x"},
  Object.defineProperty({is_win:1},"log_id",{enumerable:true,get(){throw Error("getter executed");}})]) {
  assert.throws(()=>validateFishingTutorialEnd(bad));
  assert.throws(()=>planFishingTutorial(game,7,policy,hash,catalogue,bad,1234));
  assert.deepEqual(game,original);assert.equal(game.items[0],itemRef);
}
assert.throws(()=>fishingEndLog({log_id:-1,is_win:1}),"ordinary logs must continue refusing the tutorial sentinel");

for(const key of ["name","desc","thumbnail_id","effect","rank","sell_price","collect_qty"] as const) {
  const changed=structuredClone(items);const item=changed[0] as unknown as Record<string,unknown>;
  item[key]=typeof item[key]==="number"?(item[key] as number)+1:`${item[key]}changed`;
  assert.throws(()=>normalizeFishingTutorial(plan.journal,changed,catalogue),`metadata ${key} must be pinned`);
}
for(const key of ["b_price","s_price","g_price"] as const) {
  const changed=structuredClone(catalogue);(changed.prices[0] as {b_price:number;s_price:number;g_price:number})[key]++;
  assert.throws(()=>normalizeFishingTutorial(plan.journal,items,changed),`full price ${key} must be pinned`);
}
for(const invalid of [[],[...items,...items],[{...items[0],use_type:0}],[{...items[0],rank:-1}]])
  assert.throws(()=>configuredFishingTutorial(rawPolicy,invalid,catalogue));
assert.throws(()=>configuredFishingTutorial(rawPolicy,items,{...catalogue,prices:[]}));
assert.throws(()=>configuredFishingTutorial(rawPolicy,items,{...catalogue,prices:[...catalogue.prices,...catalogue.prices]}));
for(const bad of [{...rawPolicy,on_win:"keep"},{...rawPolicy,bait_debit:"end-all"},{...rawPolicy,bait_qty:1},
  {...rawPolicy,outcome:{...rawPolicy.outcome,grade:0}},{...rawPolicy,outcome:{...rawPolicy.outcome,length:0}},
  {...rawPolicy,outcome:{...rawPolicy.outcome,length:0x80000000}}])assert.throws(()=>configuredFishingTutorial(bad,items,catalogue));
for(const key of ["reference_hash","item_inst_id","settled_ltime"] as const) {
  const bad={...plan.journal,[key]:key==="reference_hash"?"a".repeat(64):-1};
  assert.throws(()=>normalizeFishingTutorial(bad,items,catalogue));
}
assert.throws(()=>normalizeFishingTutorial({...plan.journal,policy:{...policy,outcome:{...policy.outcome,grade:2}}},items,catalogue));
for(const change of [(g:typeof settled)=>{g.items.pop();},(g:typeof settled)=>{g.items[1].qty=1;},
  (g:typeof settled)=>{g.items[1].lock=1;},(g:typeof settled)=>{g.items[1].ref_id="OTHER";},
  (g:typeof settled)=>{g.next_item_inst_id=12;}]) {
  const bad=structuredClone(settled);change(bad);assert.throws(()=>validateFishingTutorialStock(bad,plan.journal));
}
for(const change of [(g:typeof game)=>{g.gold=0xffff_ffff;},(g:typeof game)=>{g.gold=-1;},
  (g:typeof game)=>{g.next_item_inst_id=Number.MAX_SAFE_INTEGER;},(g:typeof game)=>{g.next_item_inst_id=11;},
  (g:typeof game)=>{g.items.push({...g.items[0]});},(g:typeof game)=>{g.items[0].qty=-1;},
  (g:typeof game)=>{g.owned_fish=[{fish_id,b_cnt:-1,s_cnt:0,g_cnt:0}];}]) {
  const bad=structuredClone(game);change(bad);const before=structuredClone(bad);
  assert.throws(()=>planFishingTutorial(bad,7,policy,hash,catalogue,raw,1234));assert.deepEqual(bad,before);
}
assert.throws(()=>planFishingTutorial(game,0,policy,hash,catalogue,raw,1234));
assert.throws(()=>planFishingTutorial(game,7,policy,hash,catalogue,raw,0x80000000));
assert.throws(()=>planFishingTutorial(game,7,policy,"unbound",catalogue,raw,1234));
const sparse=new Array(1);assert.throws(()=>configuredFishingTutorial(rawPolicy,sparse,catalogue));
console.log("fishing tutorial: strict native winning sentinel, no bait debit, isolated new-stack sale, full reference pins and durable tombstone PASS");
