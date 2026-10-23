import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";
import {SEARCH_CAPSULE_ID} from "../src/search-capsules.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-campaign-atomic-")),file=path.join(dir,"state.json"),clock=Date.now;
Date.now=()=>1_800_000_000_000;
try {
  let state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"campaign-atomic-owner"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"campaign-atomic-peer"},{}).ret_data as any;
  let game=(state as any).gameByPvid.get(actor.pvid);
  // Settle the existing pre-handler lazy resource boundary before snapshots.
  state.gameFor(state.accountFor(actor,{}));state.gameFor(state.accountFor(peer,{}));
  const snapshot=()=>{
    const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
    const quests=(state as any).quests as Map<number,any>,refs:{root:any;path:string[];value:any}[]=[];
    const walk=(root:any,value:any,path:string[]=[])=>{
      if(!value||typeof value!=="object")return;refs.push({root,path,value});
      for(const [key,child] of Object.entries(value))walk(root,child,[...path,key]);
    };
    for(const value of [...games.values(),...accounts.values(),...quests.values()])walk(value,value);
    return {bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),quests:structuredClone([...quests]),
      gameEntries:[...games],accountEntries:[...accounts],questEntries:[...quests],refs};
  };
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual(readFileSync(file),before.bytes);
    for(const [name,entries,values] of [["gameByPvid",before.gameEntries,before.games],["accountsByPvid",before.accountEntries,before.accounts],
      ["quests",before.questEntries,before.quests]] as const) {
      const map=(state as any)[name] as Map<number,any>;assert.deepEqual([...map],values);
      for(const [id,value] of entries)assert.equal(map.get(id),value,"Original transaction owner/map identity");
    }
    for(const {root,path,value} of before.refs)assert.equal(path.reduce((r,key)=>r[key],root),value,path.join("."));
  };
  const failures=(operation:()=>any)=>{
    const before=snapshot();mkdirSync(file+".tmp");
    try{assert.throws(operation);}finally{rmdirSync(file+".tmp");}unchanged(before);
    const blocked=path.join(dir,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(operation);}finally{(state as any).stateFile=file;rmdirSync(blocked);}unchanged(before);
  };
  const start=(stage="n_01_01")=>state.startMission({...actor,stage_id:stage,deck_inst_id_1:game.starter_cards[0].inst_id}, {}) as any;
  const complete=(stage="n_01_01",win=true)=>state.completeMission({...actor,stage_id:stage,
    play_info:JSON.stringify({clear:win?1:0,clear_time:2,dead_cnt:0})}, {}) as any;
  const initial=structuredClone(game),heldCards=game.starter_cards,heldCard=game.starter_cards[0],heldItems=game.items;
  failures(()=>start());assert.deepEqual(game,initial);assert.equal(game.active_battle,null);
  const begun=start();assert.equal(begun.result_code,1);assert.equal(game.ap,initial.ap-1);
  assert.equal(game.starter_cards,heldCards);assert.equal(game.starter_cards[0],heldCard);assert.equal(game.items,heldItems);
  const pending=snapshot();mkdirSync(file+".tmp");
  try {
    assert.equal(start().ret_data.idempotent,true);unchanged(pending);
    assert.equal(state.startMission({...actor,stage_id:"n_01_01",deck_inst_id_1:99},{}).result_code,2001);unchanged(pending);
    assert.equal(complete("n_01_02").ret_data.accepted,false);unchanged(pending);
  }finally{rmdirSync(file+".tmp");}
  // First win touches both progression and actual earned-mail/supply branches.
  failures(()=>complete());assert.equal(game.active_battle.battle_id,begun.ret_data.battle_id);
  const first=complete();assert.equal(first.result_code,1);assert.equal(first.ret_data.accepted,true);
  assert.equal(game.gold,initial.gold+10);assert.equal(game.exp,initial.exp+30);assert.equal(game.active_battle,null);
  assert.equal(game.starter_cards[0],heldCard);assert.ok(heldCard.exp>initial.starter_cards[0].exp);
  const capsule=game.items.find((row:any)=>row.ref_id===SEARCH_CAPSULE_ID);assert.equal(capsule.qty,1);
  const afterFirst=structuredClone(game),settled=snapshot();mkdirSync(file+".tmp");
  try{assert.equal(complete().ret_data.accepted,false);unchanged(settled);}finally{rmdirSync(file+".tmp");}
  // Replay earns a capsule/participant EXP, without repeating first-clear awards.
  assert.equal(start().result_code,1);failures(()=>complete());assert.equal(capsule.qty,1);
  const replay=complete();assert.equal(replay.ret_data.reward.gold,0);assert.equal(game.gold,afterFirst.gold);assert.equal(game.exp,afterFirst.exp);
  assert.equal(game.items.find((row:any)=>row.ref_id===SEARCH_CAPSULE_ID),capsule);assert.equal(capsule.qty,2);
  assert.deepEqual(game.mail,afterFirst.mail);assert.deepEqual(game.special_supply,afterFirst.special_supply);
  // Loss refunds only its accepted AP charge once and awards nothing.
  assert.equal(start("n_01_02").result_code,1);const lostPending=structuredClone(game);
  failures(()=>complete("n_01_02",false));assert.equal(game.ap,lostPending.ap);
  const lost=complete("n_01_02",false);assert.equal(lost.ret_data.clear,0);assert.equal(game.ap,lostPending.ap+1);
  assert.equal(capsule.qty,2);assert.equal(game.cleared_stage_ids.includes("n_01_02"),false);
  const afterLoss=snapshot();assert.equal(complete("n_01_02",false).ret_data.accepted,false);unchanged(afterLoss);
  const stable=readFileSync(file),restored=new ServerState("http://localhost",file);
  assert.deepEqual((restored as any).gameByPvid.get(actor.pvid),game);assert.deepEqual(readFileSync(file),stable);
  assert.deepEqual((restored as any).gameByPvid.get(peer.pvid),(state as any).gameByPvid.get(peer.pvid));
  // Capture an authored fixed quest through its real admission path. Completion
  // must commit that journal with the same campaign candidate, never ahead of it.
  const quest={id:"local_campaign_atomic",type:2,title:"Authored campaign task",desc:"",desc_noti:"",npc_id:"",go_to:"",serial:1,
    target_val:2,option_val:0,reward:{...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),item_list:[],card_list:[]}};
  const options={questMode:"local-fixed" as const,questPolicy:{period_id:"campaign-atomic",minimum_stage:"n_01_01",references:[quest],
    rules:[{id:quest.id,event:"mission-win",stage_id:null}],owners:{[actor.pvid]:[{daily_quest_id:quest.id,is_rewarded:0,cur_val:0}]}}};
  state=new ServerState("http://localhost",file,options);game=(state as any).gameByPvid.get(actor.pvid);
  assert.equal(gameResponse(state,"/dailyquest/GetRefList",actor).result_code,1);
  const priorQuest=(state as any).quests.get(actor.pvid);
  assert.equal(start("n_01_03").result_code,1);failures(()=>complete("n_01_03"));
  assert.equal((state as any).quests.get(actor.pvid),priorQuest);assert.equal(priorQuest.instances[0].cur_val,0);
  assert.equal(complete("n_01_03").result_code,1);assert.equal((state as any).quests.get(actor.pvid).instances[0].cur_val,1);
  const completed=snapshot();assert.equal(complete("n_01_03").ret_data.accepted,false);unchanged(completed);
  const restartQuest=new ServerState("http://localhost",file,options);assert.deepEqual((restartQuest as any).quests.get(actor.pvid),(state as any).quests.get(actor.pvid));
  assert.deepEqual((restartQuest as any).gameByPvid.get(actor.pvid),game);assert.deepEqual(readFileSync(file),completed.bytes);
}finally{Date.now=clock;rmSync(dir,{recursive:true,force:true});}
console.log("Campaign atomic Start/Complete: real write/rename failures preserve all game/account/quest values and nested references, AP/log/refund/EXP/stars/capsule/mail/supply/quest work commits once, successful retry/replay and restart passed; lazy entry writers and native battle authority unchanged.");
