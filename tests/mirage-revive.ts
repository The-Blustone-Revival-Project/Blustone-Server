import assert from "node:assert/strict";
import {createLocalGameState} from "../src/game.js";
import {createMirageRun,validatedMiragePolicy,normalizeMirageRun,abandonMirageRun,advanceMirageReward,type MirageRun} from "../src/mirage-run.js";
import {planMirageRevive} from "../src/mirage-revive.js";

const enemy={ref_id:"003",hp_percent:10000,rank:3,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:0,skill_5_level:0};
const raw={enrollment:"rank-exp-id-projection",floor:1,bg_res:"AUTHORED_BG",dlg_begin:"",dlg_end:"",res_prefix:"AUTHORED_",res_postfix_list:["002"],
  stairs:[7,11,13].map(gold=>({grade:0,balance:10000,enemies:[enemy],gold})),hero:{bonus:0,end_ltime:2147483647,cur:[],next:[]},revive_prices:[3,5]};
const now=1_800_000_000;
function fixture(){
  const game=createLocalGameState(),id=game.starter_cards[0].inst_id;game.starter_cards[0].mirage_remain_hp=0;
  game.gacha_free_qty=2;game.gacha_iap_qty=10;
  const run=createMirageRun(validatedMiragePolicy(raw),[{id,mirage_remain_hp:0}],[String(id)],now);
  run.cache.inst_enemy[0].hp_percent=5000;
  const report={floor:1,stair:1,deck:[{id:String(id),hp:0}],enemy:[5000]};
  run.lastEnd={fingerprint:JSON.stringify(report),receipt:{state:1,deck:[{inst_id:id,remain_hp_percent:0}],
    dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[]}};
  return {game,run:normalizeMirageRun(run),id};
}
const {game,run,id}=fixture(),gameBefore=structuredClone(game),runBefore=structuredClone(run);
assert.deepEqual(run.revive_ids,[]);assert.equal(run.cache.inst_base.revive_price,3);
const paid=planMirageRevive(run,{target_inst_id:String(id)},game);
assert.equal(paid.replay,false);assert.equal(paid.gacha_free_qty,0);assert.equal(paid.gacha_iap_qty,9);
assert.deepEqual(paid.receipt,{inst_id:id,mirage_remain_hp:10000,revive_price:5,user:{iap:{free_iap_qty:0,iap_qty:9}}});
assert.deepEqual(paid.run.revive_ids,[id]);assert.equal(paid.run.cache.entry[0].mirage_remain_hp,10000);assert.equal(paid.run.cache.inst_base.revive_price,5);
assert.equal(Object.hasOwn(paid.run,"lastEnd"),false);assert.equal(paid.starter_cards[0].mirage_remain_hp,10000);
assert.deepEqual(run,runBefore);assert.deepEqual(game,gameBefore,"Pure paid plan never changes original money or ownership");
const current={...game,gacha_free_qty:paid.gacha_free_qty,gacha_iap_qty:paid.gacha_iap_qty,starter_cards:paid.starter_cards,recruited_cards:paid.recruited_cards};
const partial=structuredClone(paid.run);partial.cache.entry[0].mirage_remain_hp=3210;current.starter_cards[0].mirage_remain_hp=3210;
const replay=planMirageRevive(partial,{target_inst_id:id},current);
assert.equal(replay.replay,true);assert.equal(replay.run,partial);assert.equal(replay.starter_cards,current.starter_cards);assert.equal(replay.recruited_cards,current.recruited_cards);
assert.equal(replay.receipt.mirage_remain_hp,3210,"Response-loss repair echoes CURRENT carry without another heal");assert.equal(replay.gacha_iap_qty,9);
partial.cache.entry[0].mirage_remain_hp=0;current.starter_cards[0].mirage_remain_hp=0;
const second=planMirageRevive(partial,{target_inst_id:id},current);
assert.equal(second.replay,false);assert.equal(second.gacha_iap_qty,4);assert.deepEqual(second.run.revive_ids,[id,id]);
assert.equal(second.run.cache.inst_base.revive_price,-1,"Finite exhaustion marker is an explicit LOCAL policy");
assert.equal(second.receipt.revive_price,-1);assert.deepEqual(normalizeMirageRun(JSON.parse(JSON.stringify(second.run))),second.run);
const exhausted={...current,gacha_iap_qty:second.gacha_iap_qty,starter_cards:second.starter_cards,recruited_cards:second.recruited_cards};
assert.equal(planMirageRevive(second.run,{target_inst_id:id},exhausted).replay,true,"Exhausted receipt repair is still a free read");
const deadAgain=structuredClone(second.run);deadAgain.cache.entry[0].mirage_remain_hp=0;exhausted.starter_cards[0].mirage_remain_hp=0;
assert.throws(()=>planMirageRevive(deadAgain,{target_inst_id:id},exhausted),/limit|funds/);
const refuse=(change:(data:ReturnType<typeof fixture>)=>void,payload:Record<string,unknown>={target_inst_id:id})=>{
  const data=fixture();change(data);const before=structuredClone(data);assert.throws(()=>planMirageRevive(data.run,payload,data.game));assert.deepEqual(data,before);
};
for(const payload of [{target_inst_id:"01"},{target_inst_id:0},{target_inst_id:"4294967296"},{target_inst_id:1.5},{target_inst_id:99999},
  {target_inst_id:id,price:0},{target_inst_id:id,mirage_remain_hp:10000},{target_inst_id:id,qty:1}])refuse(()=>{},payload);
refuse(data=>{data.game.gacha_free_qty=0;data.game.gacha_iap_qty=2;});
refuse(data=>{data.game.gacha_free_qty=2147483647;data.game.gacha_iap_qty=1;});
refuse(data=>{data.game.gacha_iap_qty=-1;});refuse(data=>{data.game.starter_cards[0].mirage_remain_hp=1;});
refuse(data=>{data.game.starter_cards.push({...data.game.starter_cards[0]});});
refuse(data=>{data.run.cache.entry[0].mirage_remain_hp=10000;data.game.starter_cards[0].mirage_remain_hp=10000;delete data.run.lastEnd;});
const disabledRaw={...raw};delete (disabledRaw as any).revive_prices;
const disabled=createMirageRun(validatedMiragePolicy(disabledRaw),[{id,mirage_remain_hp:0}],[String(id)],now);
assert.equal(disabled.cache.inst_base.revive_price,0);assert.equal(Object.hasOwn(disabled,"revive_ids"),false);assert.throws(()=>planMirageRevive(disabled,{target_inst_id:id},game));
for(const prices of [[],[0],[-1],[1.5],[2147483648],Array.from({length:101},()=>1)])assert.throws(()=>validatedMiragePolicy({...raw,revive_prices:prices}));
const invalid=(edit:(run:any)=>void,base:MirageRun=run)=>{const corrupt=structuredClone(base);edit(corrupt);assert.throws(()=>normalizeMirageRun(corrupt));};
invalid(value=>{delete value.revive_ids;});invalid(value=>{value.revive_ids=[id,id,id];});invalid(value=>{value.revive_ids=[999];value.cache.inst_base.revive_price=5;});
invalid(value=>{value.cache.inst_base.revive_price=0;});invalid(value=>{value.revive_ids=[];},disabled);
const aborted=abandonMirageRun(second.run);assert.deepEqual(aborted.revive_ids,[id,id]);assert.equal(aborted.cache.inst_base.revive_price,-1);
assert.deepEqual(normalizeMirageRun(JSON.parse(JSON.stringify(aborted))),aborted,"Abandoned history retains now-unenrolled paid targets");
function win(source:MirageRun):MirageRun {
  const copy=structuredClone(source);copy.cache.inst_base.state=2;copy.cache.entry[0].mirage_remain_hp=5000;copy.cache.inst_enemy[0].hp_percent=0;
  const report={floor:copy.policy.floor,stair:copy.cache.inst_base.stair,deck:[{id:String(id),hp:5000}],enemy:[0]};
  copy.lastEnd={fingerprint:JSON.stringify(report),receipt:{state:2,deck:[{inst_id:id,remain_hp_percent:5000}],dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[]}};
  return normalizeMirageRun(copy);
}
let completed=second.run;for(let i=0;i<3;i++)completed=advanceMirageReward(win(completed)).run;
assert.deepEqual(completed.revive_ids,[id,id]);assert.deepEqual(completed.cache.entry,[]);assert.equal(completed.cache.inst_base.revive_price,-1);
assert.deepEqual(normalizeMirageRun(JSON.parse(JSON.stringify(completed))),completed);
console.log("Mirage first aid: optional explicit finite prices/history, signed wallets/free-first, dead-again paid use, current-HP response-loss repair, exact receipt, exhaustion marker, detached input and completed/abandoned history passed; policy LOCAL");
