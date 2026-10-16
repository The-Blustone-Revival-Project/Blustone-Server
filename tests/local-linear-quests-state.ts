import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";
import {localQuestPolicy,localQuestProgress} from "../src/local-quests.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-local-linear-quests-"));
const originalNow=Date.now;Date.now=()=>1_800_000_000_000;
try {
  const file=path.join(directory,"state.json"),seed=new ServerState("http://localhost",file);
  const actor=seed.registerGuest({device_id:"linear-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"linear-peer"},{}).ret_data as any;
  const initial=JSON.parse(readFileSync(file,"utf8"));
  const reward=(gold:number)=>({...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),gold,item_list:[],card_list:[]});
  const reference=(id:string,type:number,target_val:number,serial:number,gold:number)=>({id,type,target_val,serial,title:"Local sequence",desc:"Earn %t",desc_noti:"",npc_id:"",go_to:"",option_val:0,reward:reward(gold)});
  const daily=reference("local_linear_daily",2,10,1,5),first=reference("local_linear_first",3,2,10,17),last=reference("local_linear_last",3,1,30,23);
  const policy={period_id:"local-linear-period",minimum_stage:"n_01_01",references:[daily],rules:[{id:daily.id,event:"mission-win",stage_id:null}],
    owners:{[actor.pvid]:[{daily_quest_id:daily.id,is_rewarded:0,cur_val:0}]},
    linear:{references:[first,last],rules:[{id:first.id,event:"mission-win",stage_id:"n_01_01"},{id:last.id,event:"mission-win",stage_id:"n_01_02"}]}};
  const options={questMode:"local-fixed" as const,questPolicy:policy},state=new ServerState("http://localhost",file,options);
  const game=state.gameFor(state.accountFor(actor,{}));
  const journal=()=>((state as any).quests.get(actor.pvid));
  const claim=(ref=first,extra:Record<string,unknown>={})=>gameResponse(state,"/linearquest/Reward",{...actor,id:ref.id,serial:String(ref.serial),target_val:String(ref.target_val),...extra}) as any;
  const unenrolled=readFileSync(file);assert.equal(journal(),undefined);
  mkdirSync(file+".tmp");
  try{assert.throws(()=>gameResponse(state,"/dailyquest/GetRefList",actor));}finally{rmdirSync(file+".tmp");}
  assert.equal(journal(),undefined);assert.deepEqual(readFileSync(file),unenrolled,"Failed enrollment cannot publish a transient ladder");
  assert.deepEqual((gameResponse(state,"/dailyquest/GetRefList",actor) as any).ret_data,[{...daily,reward:JSON.stringify(daily.reward)}]);
  assert.deepEqual(journal().linear,{...policy.linear,index:0,cur_val:0});
  assert.equal(JSON.parse(readFileSync(file,"utf8")).version,4);
  const progress=()=>localQuestProgress(journal());
  assert.equal(typeof progress().linear_quest[0].reward,"string");
  assert.deepEqual(JSON.parse(progress().linear_quest[0].reward),first.reward);
  assert.deepEqual((gameResponse(state,"/lobby/Enter",actor) as any).ret_data.linear_quest,progress().linear_quest);
  assert.deepEqual((gameResponse(state,"/dailyquest/GetRefList",peer) as any).ret_data,[]);
  assert.equal(claim().result_code,2001,"Fresh sequence cannot be claimed from caller target alone");
  const start=(stage="n_01_01")=>{
    const reply=state.startMission({...actor,stage_id:stage,deck_inst_id_1:game.starter_cards[0].inst_id},{}) as any;
    assert.equal(reply.result_code,1);assert.equal(reply.ret_data.accepted,true);return game.active_battle!.battle_id;
  };
  const finish=(stage="n_01_01",clear:unknown=1)=>state.completeMission({...actor,stage_id:stage,play_info:JSON.stringify({clear,clear_time:10,dead_cnt:0})},{}) as any;
  const diskFailures=(operation:()=>unknown)=>{
    const before=structuredClone(game),oldJournal=journal(),bytes=readFileSync(file),cards=game.starter_cards,items=game.items,battle=game.active_battle;
    mkdirSync(file+".tmp");try{assert.throws(operation);}finally{rmdirSync(file+".tmp");}
    assert.deepEqual(game,before);assert.equal(journal(),oldJournal);assert.equal(game.starter_cards,cards);assert.equal(game.items,items);assert.equal(game.active_battle,battle);assert.deepEqual(readFileSync(file),bytes);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(operation,/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}
    assert.deepEqual(game,before);assert.equal(journal(),oldJournal);assert.equal(game.starter_cards,cards);assert.equal(game.items,items);assert.equal(game.active_battle,battle);assert.deepEqual(readFileSync(file),bytes);
  };
  start();
  const wrongBytes=readFileSync(file);
  assert.equal(finish("n_01_02").ret_data.accepted,false);assert.deepEqual(readFileSync(file),wrongBytes);
  diskFailures(()=>finish());
  const win1=finish();assert.equal(win1.ret_data.accepted,true);assert.equal(journal().instances[0].cur_val,1);assert.equal(journal().linear.cur_val,1);
  assert.deepEqual(win1.ret_data.linear_quest,progress().linear_quest);
  const settled1=readFileSync(file);assert.equal(finish().ret_data.accepted,false);assert.deepEqual(readFileSync(file),settled1);
  start("n_01_03");finish("n_01_03",0);assert.equal(journal().linear.cur_val,1);assert.equal(journal().instances[0].cur_val,1);
  start("n_01_02");finish("n_01_02");assert.equal(journal().linear.cur_val,1,"Future matching rule cannot progress before its claim transition");
  assert.equal(journal().instances[0].cur_val,2);
  start();finish();assert.equal(journal().linear.cur_val,2);assert.equal(journal().linear.index,0,"Target completion does not auto-advance");
  const strictBytes=readFileSync(file);
  for(const extra of [{serial:11},{serial:"010"},{serial:true},{id:last.id},{target_val:"02"},{target_val:3},{target_val:true},{id:"unknown"}])assert.equal(claim(first,extra).result_code,2001);
  assert.equal(claim(last).result_code,2001);assert.deepEqual(readFileSync(file),strictBytes);
  diskFailures(()=>claim());
  const oldGold=game.gold,claimed=claim();assert.equal(claimed.result_code,1);assert.equal(game.gold,oldGold+17);
  assert.equal(journal().linear.index,1);assert.equal(journal().linear.cur_val,0);assert.equal(claimed.ret_data.linear_quest[0].id,last.id);
  assert.equal(JSON.parse(claimed.ret_data.linear_quest[0].reward).gold,23);
  game.gold+=100;(state as any).persist();const laterBytes=readFileSync(file),laterGold=game.gold;
  const replay=claim();assert.equal(replay.ret_data.linear_quest[0].id,last.id);assert.equal(replay.ret_data.linear_quest[0].cur_val,0);
  assert.equal(replay.ret_data.reward.gold.cur,laterGold);assert.deepEqual(readFileSync(file),laterBytes);
  start();finish();assert.equal(journal().linear.cur_val,0,"Current stage filter holds while daily progress continues");
  start("n_01_02");finish("n_01_02");assert.equal(journal().linear.cur_val,1);assert.equal(journal().instances[0].cur_val,5);
  diskFailures(()=>claim(last));
  const terminalGold=game.gold+23,terminal=claim(last);assert.equal(terminal.result_code,1);assert.equal(game.gold,terminalGold);
  assert.equal(journal().linear.index,2);assert.equal(journal().linear.cur_val,0);
  const tombstone=terminal.ret_data.linear_quest;assert.equal(tombstone.length,1);assert.equal(tombstone[0].id,"");
  assert.deepEqual(Object.keys(tombstone[0]).sort(),["title","desc","id","npc_id","go_to","serial","target_val","option_val","cur_val","reward"].sort());
  assert.equal(typeof tombstone[0].reward,"string");assert.deepEqual(JSON.parse(tombstone[0].reward),reward(0));
  const final=readFileSync(file),snapshot=JSON.parse(final.toString());
  for(const ref of [first,last]){const reply=claim(ref);assert.deepEqual(reply.ret_data.linear_quest,tombstone);assert.equal(reply.ret_data.reward.gold.cur,terminalGold);}
  assert.deepEqual(readFileSync(file),final);
  const changed=structuredClone(policy);changed.period_id="changed";changed.linear.references.reverse();changed.linear.references.forEach((row,index)=>{row.serial=(index+1)*100;row.reward.gold=999;});
  const restart=new ServerState("http://localhost",file,{...options,questPolicy:changed});
  assert.deepEqual((restart as any).quests.get(actor.pvid),journal(),"Persisted definitions/progress cannot be repriced or reordered");
  const off=new ServerState("http://localhost",file,{questMode:"disabled"});
  assert.equal(gameResponse(off,"/linearquest/Reward",{...actor,id:last.id,serial:last.serial,target_val:last.target_val}).result_code,2001);
  assert.deepEqual((off as any).quests.get(actor.pvid),journal());assert.deepEqual(readFileSync(file),final);
  assert.deepEqual(snapshot.gameStates.find((row:any)=>row[0]===peer.pvid),initial.gameStates.find((row:any)=>row[0]===peer.pvid));
  for(const mutate of [(value:any)=>value.version=3,(value:any)=>delete value.quests[0][1].linear,
    (value:any)=>value.quests[0][1].linear.cur_val=1,(value:any)=>value.quests[0][1].linear.index=3,
    (value:any)=>value.quests[0][1].seen=[],(value:any)=>value.quests[0][0]=999999]) {
    const invalid=structuredClone(snapshot);mutate(invalid);writeFileSync(file,JSON.stringify(invalid));const bytes=readFileSync(file);
    assert.throws(()=>new ServerState("http://localhost",file,options));assert.deepEqual(readFileSync(file),bytes);
  }
  writeFileSync(file,final);
  const legacyFile=path.join(directory,"legacy.json"),legacy=structuredClone(snapshot);legacy.version=3;delete legacy.quests[0][1].linear;
  writeFileSync(legacyFile,JSON.stringify(legacy));const legacyBytes=readFileSync(legacyFile);
  const preserved=new ServerState("http://localhost",legacyFile,options);
  gameResponse(preserved,"/dailyquest/GetInstList",actor);
  assert.equal((preserved as any).quests.get(actor.pvid).linear,undefined,"Configured ladder does not backfill old daily-only journals");
  assert.deepEqual(readFileSync(legacyFile),legacyBytes);
  const stages=new Set(["n_01_01","n_01_02"]);
  for(const mutate of [(value:any)=>value.linear.references[0].type=2,(value:any)=>value.linear.references[0].id=daily.id,
    (value:any)=>value.linear.references[1].serial=10,(value:any)=>value.linear.rules.pop(),
    (value:any)=>value.linear.references[0].target_val=10000]) {
    const invalid=structuredClone(policy);mutate(invalid);assert.throws(()=>localQuestPolicy(invalid,stages));
  }
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Local linear quests: captured ladder, current-only native-clear progress, stage filters, exact claims, current-state replay/tombstone, real mission/claim disk rollback, schema4 corruption, legacy/off/policy-change preservation and peer isolation passed.");
