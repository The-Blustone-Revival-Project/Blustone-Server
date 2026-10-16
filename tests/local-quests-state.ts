import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";
import {localQuestPolicy} from "../src/local-quests.js";

// Authored local tasks and rewards; no original quest catalogue/calendar claim.
const dir=mkdtempSync(path.join(tmpdir(),"blustone-local-quests-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
try {
  const seed=new ServerState("http://localhost",file,{questMode:"disabled"});
  const actor=seed.registerGuest({device_id:"quest-event-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"quest-event-peer"},{}).ret_data as any;
  const initial=JSON.parse(readFileSync(file,"utf8"));assert.equal(initial.version,1);
  const reward=(gold:number)=>({...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),gold,item_list:[],card_list:[]});
  const reference=(id:string,target_val:number,gold:number,serial:number)=>({id,type:2,title:"Authored task",desc:"Local %t",desc_noti:"",
    npc_id:"",go_to:"",serial,target_val,option_val:0,reward:reward(gold)});
  const references=[reference("local_any_win",3,17,1),reference("local_stage_win",1,5,2),reference("local_imported",1,3,3)];
  const instances=references.map(row=>({daily_quest_id:row.id,is_rewarded:0,cur_val:row.id==="local_imported"?1:0}));
  const policy={period_id:"authored-fixed-period",minimum_stage:"n_01_01",references,
    rules:[{id:"local_any_win",event:"mission-win",stage_id:null},{id:"local_stage_win",event:"mission-win",stage_id:"n_01_02"}],owners:{[actor.pvid]:instances}};
  const options={questMode:"local-fixed" as const,questPolicy:policy},state=new ServerState("http://localhost",file,options);
  const route=(name:string,extra={},who=actor)=>gameResponse(state,"/dailyquest/"+name,{...who,...extra}) as any;
  const game=(state as any).gameByPvid.get(actor.pvid);
  const journal=()=>((state as any).quests.get(actor.pvid));
  const progress=(id="local_any_win")=>journal().instances.find((row:any)=>row.daily_quest_id===id);
  const count=()=>progress().cur_val;
  const claim=(id="local_any_win",target="3")=>route("RequestReward",{daily_quest_id:id,target_val:target});
  assert.throws(()=>gameResponse(state,"/dailyquest/GetRefList",{}),/authenticated/);
  assert.deepEqual(route("GetRefList").ret_data,references.map(row=>({...row,reward:JSON.stringify(row.reward)})));
  assert.deepEqual(route("GetInstList").ret_data,instances);
  assert.deepEqual(route("GetRefList",{},peer).ret_data,[],"Unlisted owner is not assigned tasks");
  const lobby=gameResponse(state,"/lobby/Enter",actor) as any;
  assert.equal(lobby.ret_data.dailyquest_min_stage,"n_01_01");assert.deepEqual(lobby.ret_data.daily_quest,instances);
  assert.deepEqual(lobby.ret_data.linear_quest,[]);
  const admitted=readFileSync(file);assert.equal(JSON.parse(admitted.toString()).version,3);
  assert.deepEqual(JSON.parse(admitted.toString()).dispatches,[],"Schema3 retains the supported journal collections");
  assert.equal(claim("local_imported","1").result_code,2001,"Already-earned import still needs minimum-stage admission");
  assert.equal(claim().result_code,2001,"Request target is not evidence of earned progress");
  assert.equal(route("RequestReward",{daily_quest_id:"local_unknown",target_val:3,cur_val:999}).result_code,2001);
  assert.equal((gameResponse(state,"/linearquest/Reward",{...actor,id:"local_any_win",serial:1,target_val:3}) as any).result_code,2001);
  assert.deepEqual(readFileSync(file),admitted);
  const start=(stage="n_01_01")=>{
    const result=state.startMission({...actor,stage_id:stage,deck_inst_id_1:game.starter_cards[0].inst_id}, {}) as any;
    assert.equal(result.result_code,1);assert.equal(result.ret_data.accepted,true);return game.active_battle.battle_id;
  };
  const finish=(stage="n_01_01",play_info:unknown=JSON.stringify({clear:1,clear_time:10,dead_cnt:0}),extra={})=>
    state.completeMission({...actor,stage_id:stage,play_info,...extra},{}) as any;
  for(const info of [undefined,"{broken",JSON.stringify({}),JSON.stringify({clear:2}),JSON.stringify({clear:null})]) {
    start("n_01_03");assert.equal((state.completeMission({...actor,stage_id:"n_01_03",play_info:info},{}) as any).ret_data.accepted,true);
    assert.equal(count(),0,"Legacy fixture wins do not produce quest events");
  }
  start("n_01_03");assert.equal(finish("n_01_03",JSON.stringify({clear:0})).ret_data.clear,0);assert.equal(count(),0);
  const firstId=start(),beforeWrong=readFileSync(file),beforeWrongGame=structuredClone(game),beforeWrongQuest=journal();
  assert.equal(finish("n_01_02").ret_data.accepted,false);
  assert.equal(finish("n_01_01",JSON.stringify({clear:1}),{battle_id:"foreign-attempt"}).ret_data.accepted,false);
  assert.equal((state.completeMission({...peer,stage_id:"n_01_01",battle_id:firstId,play_info:JSON.stringify({clear:1})},{}) as any).ret_data.accepted,false);
  assert.equal(journal(),beforeWrongQuest);assert.deepEqual(game,beforeWrongGame);assert.deepEqual(readFileSync(file),beforeWrong);
  const beforeComplete=structuredClone(game),oldCards=game.starter_cards,oldItems=game.items,oldMail=game.mail,oldBattle=game.active_battle;
  mkdirSync(file+".tmp");assert.throws(()=>finish());rmdirSync(file+".tmp");
  assert.deepEqual(game,beforeComplete);assert.equal(game.starter_cards,oldCards);assert.equal(game.items,oldItems);assert.equal(game.mail,oldMail);
  assert.equal(game.active_battle,oldBattle);assert.equal(journal(),beforeWrongQuest);assert.deepEqual(readFileSync(file),beforeWrong);
  const blocked=path.join(dir,"complete-rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
  assert.throws(()=>finish());(state as any).stateFile=file;
  assert.deepEqual(game,beforeComplete);assert.equal(journal(),beforeWrongQuest);assert.deepEqual(readFileSync(file),beforeWrong);
  const firstComplete=finish();assert.equal(firstComplete.ret_data.accepted,true);assert.equal(count(),1);assert.deepEqual(journal().seen,[firstId]);
  assert.deepEqual(firstComplete.ret_data.daily_quest,journal().instances,"Mission receipt hydrates committed quest progress inline");
  const settledFirst=readFileSync(file),firstQuest=journal(),duplicate=finish();assert.equal(duplicate.ret_data.accepted,false);
  assert.deepEqual(duplicate.ret_data.daily_quest,journal().instances,"Duplicate refusal echoes current progress without another event");
  assert.equal(journal(),firstQuest);assert.equal(count(),1);assert.deepEqual(readFileSync(file),settledFirst);
  const importedGold=game.gold;assert.equal(claim("local_imported","1").ret_data.reward.gold.cur,importedGold+3);
  start();finish();assert.equal(count(),2,"A new battle on an already-cleared stage earns a new event");assert.equal(progress("local_stage_win").cur_val,0);
  assert.equal(claim().result_code,2001,"One remaining victory cannot be supplied through target_val");
  start("n_01_02");finish("n_01_02");assert.equal(count(),3);assert.equal(progress("local_stage_win").cur_val,1);
  assert.equal(journal().seen.length,3);assert.equal(new Set(journal().seen).size,3);
  assert.equal(claim("local_any_win","2").result_code,2001);assert.equal(claim("local_any_win","03").result_code,2001);
  const beforeClaim=readFileSync(file),claimGame=structuredClone(game),claimQuest=journal();
  mkdirSync(file+".tmp");assert.throws(()=>claim());rmdirSync(file+".tmp");
  assert.deepEqual(game,claimGame);assert.equal(journal(),claimQuest);assert.deepEqual(readFileSync(file),beforeClaim);
  const claimBlocked=path.join(dir,"claim-rename-blocked");mkdirSync(claimBlocked);(state as any).stateFile=claimBlocked;
  assert.throws(()=>claim());(state as any).stateFile=file;
  assert.deepEqual(game,claimGame);assert.equal(journal(),claimQuest);assert.deepEqual(readFileSync(file),beforeClaim);
  const claimed=claim();assert.equal(claimed.result_code,1);assert.equal(game.gold,claimGame.gold+17);
  assert.equal(claimed.ret_data.daily_quest.find((row:any)=>row.daily_quest_id==="local_any_win").is_rewarded,1);
  assert.deepEqual(claimed.ret_data.reward,{gold:{cur:game.gold}});assert.equal(claimed.ret_data.user,undefined,"Special quest parser has its own reward wallet parent");
  game.gold+=100;(state as any).persist();const laterWallet=game.gold,laterBytes=readFileSync(file);
  assert.equal(claim().ret_data.reward.gold.cur,laterWallet);assert.equal(game.gold,laterWallet);assert.deepEqual(readFileSync(file),laterBytes);
  const beforeStageGold=game.gold;assert.equal(claim("local_stage_win","1").result_code,1);assert.equal(game.gold,beforeStageGold+5);
  const final=readFileSync(file),snapshot=JSON.parse(final.toString());assert.equal(snapshot.version,3);
  assert.deepEqual(snapshot.gameStates.find((row:any)=>row[0]===peer.pvid),initial.gameStates.find((row:any)=>row[0]===peer.pvid));
  const changedPolicy=structuredClone(policy);changedPolicy.period_id="different-configured-period";changedPolicy.references[0].reward.gold=999;
  const restart=new ServerState("http://localhost",file,{...options,questPolicy:changedPolicy});
  assert.equal((restart as any).quests.get(actor.pvid).period_id,"authored-fixed-period","Existing fixed-period history is not reset/repriced by new options");
  assert.deepEqual((gameResponse(restart,"/dailyquest/GetInstList",actor) as any).ret_data,journal().instances);
  assert.deepEqual((restart as any).quests.get(actor.pvid).seen,journal().seen);assert.deepEqual(readFileSync(file),final);
  const off=new ServerState("http://localhost",file,{questMode:"disabled"});
  assert.equal((gameResponse(off,"/dailyquest/RequestReward",{...actor,daily_quest_id:"local_any_win",target_val:3}) as any).result_code,2001);
  assert.deepEqual((off as any).quests.get(actor.pvid),journal());assert.deepEqual(readFileSync(file),final);
  for(const corrupt of [(()=>{const value=structuredClone(snapshot);value.version=2;return value;})(),
    (()=>{const value=structuredClone(snapshot);value.quests[0][1].seen.push(value.quests[0][1].seen[0]);return value;})(),
    (()=>{const value=structuredClone(snapshot);value.quests[0][1].instances[0].daily_quest_id="unknown";return value;})()]) {
    writeFileSync(file,JSON.stringify(corrupt));const bytes=readFileSync(file);assert.throws(()=>new ServerState("http://localhost",file,options));assert.deepEqual(readFileSync(file),bytes);
  }
  writeFileSync(file,final);
  const stages=new Set(["n_01_01","n_01_02"]);
  for(const mutation of [(value:any)=>value.references[0].type=3,(value:any)=>value.references[0].id="unknown_original",
    (value:any)=>value.references[0].reward.ap=1,(value:any)=>value.rules[0].event="mission-loss",
    (value:any)=>value.rules[0].stage_id="unknown",(value:any)=>value.owners[actor.pvid][0].is_rewarded=1]) {
    const invalid=structuredClone(policy);mutation(invalid);assert.throws(()=>localQuestPolicy(invalid,stages));
  }
  assert.throws(()=>new ServerState("http://localhost",file,{questMode:"local-fixed"}),/explicit/);assert.deepEqual(readFileSync(file),final);
} finally {Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Local fixed quests: authored owner/catalogue/lobby, strict once-per-settled-win events and replay battles, minimum/target/progress admission, gold claim/rebase replay, real Complete/claim write+rename rollback, fixed-period restart/peer history and schema3/corrupt-save/off-mode preservation passed; no original catalogue/calendar/native UI claim.");
