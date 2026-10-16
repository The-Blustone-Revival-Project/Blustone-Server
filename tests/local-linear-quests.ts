import assert from "node:assert/strict";
import {QUEST_CURRENCY_FIELDS,type QuestReference} from "../src/quest-contracts.js";
import {localQuestPolicy,localQuestJournal,beginLocalQuests,localQuestProgress,localQuestReferenceWire,recordLocalQuestWin,planLocalLinearClaim,planLocalQuestClaim} from "../src/local-quests.js";

const stages=new Set(["n_01_01","n_01_02"]);
const reference=(id:string,type:number,serial:number,target_val:number,gold:number):QuestReference=>({
  id,type,serial,target_val,title:id,desc:"Win %t times",desc_noti:"",npc_id:"",go_to:"",option_val:0,
  reward:{vip_exp:0,ap:0,bp:0,gold,honor:0,exp:0,free_iap:0,iap:0,item_list:[],card_list:[]}});
const raw={period_id:"fixed",minimum_stage:"n_01_01",
  references:[reference("local_daily",2,1,2,5)],rules:[{id:"local_daily",event:"mission-win",stage_id:null}],
  owners:{"1":[{daily_quest_id:"local_daily",is_rewarded:0,cur_val:0}]},
  linear:{references:[reference("local_first",3,10,1,7),reference("local_second",3,20,2,11)],
    rules:[{id:"local_first",event:"mission-win",stage_id:"n_01_01"},{id:"local_second",event:"mission-win",stage_id:"n_01_02"}]}};
const policy=localQuestPolicy(raw,stages),initial=beginLocalQuests(policy,1)!;
assert.equal(beginLocalQuests(policy,2),undefined);
const pristine=structuredClone(initial);
raw.linear.references[0].reward.gold=999;raw.linear.rules[0].stage_id="n_01_02";
assert.equal(initial.linear!.references[0].reward.gold,7,"Captured config is detached");
const refWire=localQuestReferenceWire(policy.references[0]);
assert.equal(typeof refWire.reward,"string");assert.deepEqual(JSON.parse(refWire.reward),policy.references[0].reward);
let progress=localQuestProgress(initial);
assert.equal(progress.linear_quest.length,1);assert.equal(progress.linear_quest[0].id,"local_first");
assert.equal(typeof progress.linear_quest[0].reward,"string");
assert.throws(()=>planLocalLinearClaim(initial,100,"local_first",10,1),/earned/);
assert.throws(()=>planLocalLinearClaim(initial,100,"local_second",20,2),/earned/);
const earned=recordLocalQuestWin(initial,"battle1","n_01_01");
assert.deepEqual(initial,pristine,"Event planner preserves original captured journal");
assert.equal(earned.linear!.cur_val,1);assert.equal(earned.instances[0].cur_val,1);
assert.equal(recordLocalQuestWin(earned,"battle1","n_01_01"),earned,"Duplicate accepted battle cannot advance twice");
const first=planLocalLinearClaim(earned,100,"local_first","10","1");
assert.equal(first.gold,107);assert.equal(first.replay,false);assert.equal(first.journal.linear!.index,1);
assert.equal(first.receipt.linear_quest[0].id,"local_second");assert.equal(first.receipt.linear_quest[0].cur_val,0);
assert.deepEqual(localQuestJournal(first.journal,stages),first.journal,"Claimed prefix restores through strict journal parser");
let current=recordLocalQuestWin(first.journal,"battle2","n_01_01");
assert.equal(current.linear!.cur_val,0,"Only the current rule stage advances the linear sequence");
assert.equal(current.instances[0].cur_val,2);
current=recordLocalQuestWin(current,"battle3","n_01_02");
assert.equal(current.linear!.cur_val,1);
const replay=planLocalLinearClaim(current,500,"local_first",10,1);
assert.equal(replay.replay,true);assert.equal(replay.gold,500);
assert.equal(replay.receipt.linear_quest[0].id,"local_second");assert.equal(replay.receipt.linear_quest[0].cur_val,1);
assert.deepEqual(replay.journal,current,"Old claim replay neither rewinds index nor loses later progress");
const daily=planLocalQuestClaim(current,500,"local_daily",2);
assert.equal(daily.receipt.linear_quest[0].id,"local_second");assert.equal(daily.receipt.linear_quest[0].cur_val,1);
current=recordLocalQuestWin(daily.journal,"battle4","n_01_02");
const terminal=planLocalLinearClaim(current,505,"local_second",20,2);
assert.equal(terminal.gold,516);assert.equal(terminal.journal.linear!.index,2);assert.equal(terminal.journal.linear!.cur_val,0);
const tombstone=terminal.receipt.linear_quest[0];
assert.deepEqual(Object.keys(tombstone).sort(),["title","desc","id","npc_id","go_to","serial","target_val","option_val","cur_val","reward"].sort());
for(const field of ["title","desc","id","npc_id","go_to"] as const)assert.equal(tombstone[field],"");
for(const field of ["serial","target_val","option_val","cur_val"] as const)assert.equal(tombstone[field],0);
const reward=JSON.parse(tombstone.reward);for(const field of QUEST_CURRENCY_FIELDS)assert.equal(reward[field],0);
assert.deepEqual(reward.item_list,[]);assert.deepEqual(reward.card_list,[]);
assert.deepEqual(localQuestJournal(terminal.journal,stages),terminal.journal);
assert.deepEqual(planLocalLinearClaim(terminal.journal,800,"local_first",10,1).receipt,{...terminal.receipt,reward:{gold:{cur:800}}});
assert.deepEqual(planLocalLinearClaim(terminal.journal,800,"local_second",20,2).receipt,{...terminal.receipt,reward:{gold:{cur:800}}});
for(const [id,serial,target] of [["local_first",11,1],["local_first",10,2],["foreign",10,1],["local_first",true,1],["local_first","01",1]] as const)
  assert.throws(()=>planLocalLinearClaim(current,505,id,serial,target),TypeError);
assert.throws(()=>planLocalLinearClaim(current,0xffff_ffff,"local_second",20,2),/uint32/);

const invalidJournal=(mutate:(j:typeof initial)=>void)=>{const j=structuredClone(initial);mutate(j);assert.throws(()=>localQuestJournal(j,stages),TypeError);};
invalidJournal(j=>{j.linear!.index=3;});
invalidJournal(j=>{j.linear!.index=2;j.linear!.cur_val=1;});
invalidJournal(j=>{j.linear!.cur_val=2;});
invalidJournal(j=>{j.linear!.index=1;}); // Claimed prefix must have enough captured earned events.
invalidJournal(j=>{j.linear!.references[0].type=2;});
invalidJournal(j=>{j.linear!.references[1].serial=10;});
invalidJournal(j=>{j.linear!.references[0].id="local_daily";});
invalidJournal(j=>{j.linear!.rules.pop();});
const over=structuredClone(policy);over.references[0].target_val=9998;
assert.throws(()=>localQuestPolicy(over,stages),/combined targets/);
let getters=0;const getter=structuredClone(policy);Object.defineProperty(getter.linear!,"references",{enumerable:true,get(){getters++;return [];}});
assert.throws(()=>localQuestPolicy(getter,stages),TypeError);assert.equal(getters,0);
const noLinear=structuredClone(policy);delete noLinear.linear;
assert.deepEqual(localQuestProgress(beginLocalQuests(noLinear,1)!).linear_quest,[],"Existing daily-only journal does not acquire a sequence");
console.log("Linear quest model: strict capture, earned prefix invariants, current-rule progression, preview reward strings, terminal tombstone and replay-current cache/wallet passed.");
