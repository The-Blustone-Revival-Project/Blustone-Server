import assert from "node:assert/strict";
import {validatedMiragePolicy,createMirageRun,normalizeMirageRun,advanceMirageReward,abandonMirageRun,type MirageRun} from "../src/mirage-run.js";

const now=1_800_000_000;
const enemy={ref_id:"AUTHORED_ENEMY",hp_percent:10000,rank:1,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:0,skill_3_level:0,skill_4_level:0,skill_5_level:0};
const raw={enrollment:"rank-exp-id-projection",floor:1,bg_res:"AUTHORED_BG",dlg_begin:"",dlg_end:"",res_prefix:"AUTHORED_",res_postfix_list:["2"],
  stairs:[3,4,5].map((gold,index)=>({grade:index,balance:10000,enemies:[{...enemy}],gold})),
  hero:{bonus:0,end_ltime:1_900_000_000,cur:[],next:[]}};
const policy=validatedMiragePolicy(raw);
assert.ok(Object.isFrozen(policy));assert.ok(Object.isFrozen(policy.stairs));assert.ok(Object.isFrozen(policy.stairs[0].enemies[0]));
assert.deepEqual(raw.stairs[0].enemies[0],enemy);
const entries=[{id:1000001,mirage_remain_hp:10000},{id:1000002,mirage_remain_hp:10000}];
const initial=createMirageRun(policy,entries,["1000001"],now),initialBefore=structuredClone(initial);
assert.equal(initial.cache.inst_base.state,1);assert.equal(initial.cache.inst_base.stair,1);assert.equal(initial.cache.inst_base.highest,0);
assert.deepEqual(initial.claimed,[]);assert.equal(Object.hasOwn(initial,"lastEnd"),false);
assert.deepEqual(initial.cache.inst_enemy,[enemy]);assert.equal(initial.cache.inst_base.begin_ltime,now);
assert.equal(createMirageRun(policy,entries,[],now).cache.inst_base.deck.length,0,"Enrollment can precede first party registration");
assert.throws(()=>advanceMirageReward(initial));assert.deepEqual(initial,initialBefore);
function end(run:MirageRun,win:boolean,hp=7000):MirageRun {
  const next=structuredClone(run),ids=next.cache.inst_base.deck;
  const deck=ids.map(id=>({id,hp:win?hp:0})),enemy=next.cache.inst_enemy.map(()=>win?0:5000),state=win?2:1;
  for(const row of next.cache.entry){const found=deck.find(card=>Number(card.id)===row.id);if(found)row.mirage_remain_hp=found.hp;}
  next.cache.inst_enemy.forEach((row,index)=>{row.hp_percent=enemy[index];});next.cache.inst_base.state=state;
  const report={floor:next.cache.inst_base.floor,stair:next.cache.inst_base.stair,deck,enemy};
  next.lastEnd={fingerprint:JSON.stringify(report),receipt:{state,deck:deck.map(row=>({inst_id:Number(row.id),remain_hp_percent:row.hp})),
    dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[]}};
  return normalizeMirageRun(next);
}
const loss=end(initial,false),lossBefore=structuredClone(loss);assert.equal(loss.cache.inst_enemy[0].hp_percent,5000);
assert.throws(()=>advanceMirageReward(loss));assert.deepEqual(loss,lossBefore);
const changedParty=structuredClone(loss);changedParty.cache.inst_base.deck=["1000002"];delete changedParty.lastEnd;
assert.equal(normalizeMirageRun(changedParty).cache.inst_enemy[0].hp_percent,5000,"New living party keeps the loss's damaged enemy camp");
const firstWin=end(initial,true),firstBefore=structuredClone(firstWin),reward=advanceMirageReward(firstWin);
assert.deepEqual(firstWin,firstBefore);assert.equal(reward.gold,3);assert.deepEqual(reward.run.claimed,[1]);
assert.deepEqual(reward.receipt,{cur_stair:2,state:1,inst_enemy:[enemy]});assert.equal(reward.run.cache.entry[0].mirage_remain_hp,7000);
assert.equal(Object.hasOwn(reward.run,"lastEnd"),false);assert.throws(()=>advanceMirageReward(reward.run));
const second=advanceMirageReward(end(reward.run,true,6000));assert.equal(second.gold,4);assert.deepEqual(second.run.claimed,[1,2]);
const final=advanceMirageReward(end(second.run,true,5000));assert.equal(final.gold,5);assert.deepEqual(final.run.claimed,[1,2,3]);
assert.equal(final.run.cache.inst_base.stair,3);assert.equal(final.run.cache.inst_base.state,0);assert.equal(final.run.cache.inst_base.highest,1);
assert.deepEqual(final.run.cache.entry,[]);assert.deepEqual(final.run.cache.inst_base.deck,[],"LOCAL completion releases every owned commitment");
assert.deepEqual(final.receipt.inst_enemy,[{...enemy,hp_percent:0}]);assert.throws(()=>advanceMirageReward(final.run));
assert.deepEqual(normalizeMirageRun(JSON.parse(JSON.stringify(final.run))),final.run,"Completed policy/carry survives JSON journal restoration");
for(const source of [initial,loss,firstWin,reward.run,end(reward.run,true)]) {
  const before=structuredClone(source),aborted=abandonMirageRun(source);
  assert.deepEqual(source,before,"Abandon planning cannot mutate the captured run");
  assert.equal(aborted.abandoned,true);assert.equal(aborted.cache.inst_base.state,0);assert.equal(aborted.cache.inst_base.highest,0);
  assert.equal(aborted.cache.inst_base.stair,source.cache.inst_base.stair);assert.deepEqual(aborted.claimed,source.claimed);
  assert.deepEqual(aborted.cache.entry,[]);assert.deepEqual(aborted.cache.inst_base.deck,[]);assert.equal(Object.hasOwn(aborted,"lastEnd"),false);
  assert.deepEqual(aborted.cache.inst_enemy,source.cache.inst_enemy,"Abort preserves exact enemy carry, including an unclaimed win");
  assert.deepEqual(aborted.policy,source.policy);assert.equal(Object.hasOwn(aborted,"gold"),false);assert.equal(Object.hasOwn(aborted,"receipt"),false);
  assert.throws(()=>advanceMirageReward(aborted),"Abandoning pending reward cannot mint its gold later");
  assert.deepEqual(abandonMirageRun(aborted),aborted);assert.deepEqual(normalizeMirageRun(JSON.parse(JSON.stringify(aborted))),aborted);
}
assert.deepEqual(abandonMirageRun(final.run),final.run,"Resetting an already completed floor cannot erase its earned highest/claims");
const invalid=(change:(run:any)=>void,base:MirageRun=firstWin)=>{const run=structuredClone(base);change(run);assert.throws(()=>normalizeMirageRun(run));};
invalid(run=>{run.cache.entry=[];run.cache.inst_base.deck=[];},initial);
invalid(run=>{run.cache.entry=[{id:1000001,mirage_remain_hp:5000}];},final.run);
for(const marker of [false,null,0,"true"])invalid(run=>{run.abandoned=marker;},abandonMirageRun(initial));
invalid(run=>{run.abandoned=true;},initial);invalid(run=>{run.abandoned=true;},final.run);
invalid(run=>{run.cache.inst_base.highest=run.policy.floor;},abandonMirageRun(reward.run));
invalid(run=>{run.claimed=[];},abandonMirageRun(reward.run));
invalid(run=>{run.lastEnd=firstWin.lastEnd;},abandonMirageRun(firstWin));
invalid(run=>{run.cache.inst_base.state=2;delete run.lastEnd;});
for(const change of [(run:any)=>run.claimed=[2],(run:any)=>run.claimed=[1,1],(run:any)=>run.cache.inst_base.stair=2,
  (run:any)=>run.cache.inst_base.floor=2,(run:any)=>run.cache.inst_base.highest=1,(run:any)=>run.cache.inst_base.revive_price=1,
  (run:any)=>run.cache.ref_hero.bonus=1,(run:any)=>run.cache.ref_stair.list[0].balance++,
  (run:any)=>run.cache.inst_enemy[0].ref_id="OTHER",(run:any)=>run.cache.inst_enemy[0].skill_1_level++,
  (run:any)=>run.cache.entry[0].mirage_remain_hp=10001,(run:any)=>run.cache.entry.push({...run.cache.entry[0]}),
  (run:any)=>run.cache.inst_base.deck=["1000003"],(run:any)=>run.cache.inst_base.deck=["1000001","1000001"],
  (run:any)=>run.cache.inst_base.deck=["4294967296"],(run:any)=>run.lastEnd.receipt.user={gold:{cur:9}},
  (run:any)=>run.lastEnd.receipt.deck[0].remain_hp_percent=2,(run:any)=>run.lastEnd.receipt.achievement=[{id:"GRANT"}],
  (run:any)=>run.lastEnd.fingerprint+=" "])invalid(change);
const reportCorruption=(edit:(report:any)=>void)=>invalid(run=>{const report=JSON.parse(run.lastEnd.fingerprint);edit(report);run.lastEnd.fingerprint=JSON.stringify(report);});
reportCorruption(report=>{report.deck[0].hp=6999;});reportCorruption(report=>{report.enemy[0]=1;});reportCorruption(report=>{report.gold=100;});
const badPolicy=(edit:(raw:any)=>void)=>{const value=structuredClone(raw);edit(value);assert.throws(()=>validatedMiragePolicy(value));};
for(const edit of [(value:any)=>delete value.enrollment,(value:any)=>value.enrollment="all-default",
  (value:any)=>value.floor=0,(value:any)=>value.stairs.pop(),(value:any)=>value.stairs[0].enemies[0].hp_percent=9999,
  (value:any)=>value.stairs[0].enemies=[],(value:any)=>value.stairs[0].grade=4,(value:any)=>value.stairs[0].balance=0,
  (value:any)=>value.stairs[0].gold=0x8000_0000,(value:any)=>value.dlg_begin="UNPROVED_DIALOGUE",
  (value:any)=>value.res_postfix_list=["2","2"],(value:any)=>value.hero.price=3,
  (value:any)=>Object.defineProperty(value,"floor",{enumerable:true,get(){throw new Error("Getter must not execute");}})])badPolicy(edit);
for(const floor of [20,21,40,41]){
  const value=structuredClone(raw);value.floor=floor;const count=floor<=20?3:floor<=40?6:9;
  value.stairs=Array.from({length:count},()=>structuredClone(raw.stairs[0]));assert.equal(validatedMiragePolicy(value).stairs.length,count);
}
assert.throws(()=>createMirageRun(policy,entries,["1000001"],1_900_000_001));
assert.throws(()=>createMirageRun(policy,entries,["1000001"],0x8000_0000));
assert.throws(()=>createMirageRun(policy,[{id:0,mirage_remain_hp:10000}],[],now));
assert.deepEqual(initial,initialBefore,"All transitions and refused corruptions preserve original run");
console.log("Mirage run journal: explicit frozen policy, floor-band stairs, carry, strict End receipt, one-time gold/final release, explicit reward-free abandonment with partial claims, JSON restoration and corruption refusal passed; all content and lifecycle policies LOCAL");
