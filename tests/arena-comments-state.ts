import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-arena-comments-"));
const originalNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),seed=new ServerState("http://localhost",file);
  const actor=seed.registerGuest({device_id:"comment-owner"},{}).ret_data as any;
  const injected={arenaComments:{start_message:"Injected",win_message:"Injected",lose_message:"Injected"}};
  const peer=seed.registerGuest({device_id:"comment-peer",extra_data:injected},{}).ret_data as any;
  const untouchedLegacy=readFileSync(file);
  assert.equal(gameResponse(seed,"/arena/SaveComment",{...actor,comment_info:"{}"}).result_code,1);
  assert.deepEqual(readFileSync(file),untouchedLegacy,"A fresh schema1 account is not enrolled by an empty patch");
  // Existing nonempty daily journal must survive promotion to account-pref
  // schema5; comments must not replace quest/dispatch or wallet histories.
  const reference={id:"local_comment_history",type:2,title:"Local history",desc:"",desc_noti:"",npc_id:"",go_to:"",serial:1,target_val:1,option_val:0,
    reward:{...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),item_list:[],card_list:[]}};
  const options={questMode:"local-fixed" as const,questPolicy:{period_id:"comment-test-fixed",minimum_stage:"n_01_01",references:[reference],rules:[],
    owners:{[actor.pvid]:[{daily_quest_id:reference.id,is_rewarded:0,cur_val:0}]}}};
  const state=new ServerState("http://localhost",file,options);
  assert.equal(gameResponse(state,"/dailyquest/GetRefList",actor).result_code,1);
  const enter=gameResponse(state,"/arena/Enter",actor) as any;assert.equal(enter.result_code,1);
  const baselineProfile=structuredClone(enter.ret_data.user.battle);
  const account=(state as any).accountsByPvid.get(actor.pvid),peerAccount=(state as any).accountsByPvid.get(peer.pvid);
  assert.equal(Object.hasOwn(account,"arenaComments"),false);assert.equal(Object.hasOwn(peerAccount,"arenaComments"),false);
  assert.deepEqual(peerAccount.extraData,injected,"Registration extra-data retains opaque data but cannot seed server-owned preferences");
  const games=(state as any).gameByPvid as Map<number,any>,game=games.get(actor.pvid);
  game.ap=1;game.bp=1;game.ap_updated_at=now;game.bp_updated_at=now;(state as any).persist();
  const historical=JSON.parse(readFileSync(file,"utf8"));assert.equal(historical.version,3);assert.equal(historical.quests.length,1);
  now+=3_600_000;
  const save=(patch:unknown,who=actor,s=state)=>gameResponse(s,"/arena/SaveComment",{...who,comment_info:typeof patch==="string"?patch:JSON.stringify(patch)}) as any;
  const snapshot=()=>({bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...(state as any).accountsByPvid]),
    gameRefs:[...games],accountRefs:[...(state as any).accountsByPvid],children:[...games].map(([_id,value])=>Object.entries(value)),
    prefs:account.arenaComments,present:Object.hasOwn(account,"arenaComments"),quests:(state as any).quests,dispatches:(state as any).dispatches});
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual([...games],before.games);assert.deepEqual([...(state as any).accountsByPvid],before.accounts);
    [...games].forEach(([_id,value],index)=>{assert.equal(value,before.gameRefs[index][1]);before.children[index].forEach(([key,ref])=>{if(ref!==null&&typeof ref==="object")assert.equal(value[key],ref);});});
    [...(state as any).accountsByPvid].forEach(([_id,value],index)=>assert.equal(value,before.accountRefs[index][1]));
    assert.equal(account.arenaComments,before.prefs);assert.equal(Object.hasOwn(account,"arenaComments"),before.present);
    assert.equal((state as any).quests,before.quests);assert.equal((state as any).dispatches,before.dispatches);assert.deepEqual(readFileSync(file),before.bytes);
  };
  let before=snapshot();
  assert.throws(()=>gameResponse(state,"/arena/SaveComment",{comment_info:"{}"}),/authenticated account required/);unchanged(before);
  assert.throws(()=>gameResponse(state,"/arena/SaveComment",{otp:actor.otp,pvid:peer.pvid,comment_info:"{}"}),/account|identity|pvid/i);unchanged(before);
  mkdirSync(file+".tmp");
  try{const empty=save({});assert.equal(empty.result_code,1);assert.deepEqual(empty.ret_data.user.battle,baselineProfile);}finally{rmdirSync(file+".tmp");}
  unchanged(before);assert.equal(JSON.parse(readFileSync(file,"utf8")).version,3,"Empty patch cannot enroll preferences or promote schema");
  for(const patch of ["bad","null","[]","1",{unknown:"A"},{start_message:""},{win_message:0},{lose_message:null},
    {start_message:"A".repeat(129)},{start_message:"\0"},{win_message:"\ud800"}]) {
    assert.notEqual(save(patch).result_code,1);unchanged(before);
  }
  const first={start_message:"Lake breeze 🌙"};
  const failures=(patch:unknown)=>{
    const prior=snapshot();mkdirSync(file+".tmp");try{assert.throws(()=>save(patch));}finally{rmdirSync(file+".tmp");}unchanged(prior);
    const blocked=path.join(directory,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.throws(()=>save(patch),/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);}unchanged(prior);
  };
  failures(first);assert.equal(Object.hasOwn(account,"arenaComments"),false);
  const saved=save(first);assert.equal(saved.result_code,1);
  assert.deepEqual(saved.ret_data,{user:{battle:{...baselineProfile,...first}}},"Native callback receives full battle profile, including stable counters");
  assert.deepEqual(account.arenaComments,{start_message:first.start_message,win_message:baselineProfile.win_message,lose_message:baselineProfile.lose_message});
  assert.equal(Object.hasOwn(peerAccount,"arenaComments"),false);
  const version5=JSON.parse(readFileSync(file,"utf8"));assert.equal(version5.version,5);
  assert.deepEqual(version5.quests,historical.quests);assert.deepEqual(version5.dispatches,historical.dispatches);
  before=snapshot();mkdirSync(file+".tmp");
  try{assert.deepEqual(save(first).ret_data,saved.ret_data);assert.deepEqual(save({}).ret_data,saved.ret_data);}finally{rmdirSync(file+".tmp");}unchanged(before);
  failures({win_message:"Clear skies"});
  assert.equal(save({win_message:"Clear skies",lose_message:"Another sunrise"}).result_code,1);
  const expected={start_message:first.start_message,win_message:"Clear skies",lose_message:"Another sunrise"};
  assert.deepEqual(account.arenaComments,expected);
  const detailBefore=snapshot(),detail=gameResponse(state,"/world/GetUserDetail",{...peer,list:JSON.stringify([actor.pvid])}) as any;
  assert.equal(detail.result_code,1);assert.equal(detail.ret_data[0].win_message,expected.win_message);assert.equal(detail.ret_data[0].lose_message,expected.lose_message);unchanged(detailBefore);
  // Enter has existing energy/deck side effects, so test display propagation
  // separately, then establish a fresh preservation baseline for restart.
  const again=gameResponse(state,"/arena/Enter",actor) as any;
  assert.equal(again.result_code,1);for(const [key,value] of Object.entries(expected))assert.equal(again.ret_data.user.battle[key],value);
  const peerEnter=gameResponse(state,"/arena/Enter",peer) as any;assert.equal(peerEnter.result_code,1);
  assert.notEqual(peerEnter.ret_data.user.battle.start_message,"Injected");assert.equal(Object.hasOwn(peerAccount,"arenaComments"),false);
  const final=readFileSync(file),snapshot5=JSON.parse(final.toString()),restart=new ServerState("http://localhost",file,options);
  assert.deepEqual((restart as any).accountsByPvid.get(actor.pvid).arenaComments,expected);
  assert.equal(Object.hasOwn((restart as any).accountsByPvid.get(peer.pvid),"arenaComments"),false);
  assert.deepEqual(readFileSync(file),final);
  mkdirSync(file+".tmp");try{assert.equal(save(expected,actor,restart).result_code,1);}finally{rmdirSync(file+".tmp");}assert.deepEqual(readFileSync(file),final);
  for(const mutate of [
    ...[1,2,3,4].map(version=>(value:any)=>{value.version=version;if(version===1){delete value.quests;delete value.dispatches;}else if(version===2)delete value.quests;}),
    (value:any)=>delete value.dispatches,(value:any)=>delete value.quests,
    (value:any)=>value.accounts.forEach((row:any)=>delete row.arenaComments),
    (value:any)=>value.accounts.find((row:any)=>row.pvid===actor.pvid).arenaComments={},
    (value:any)=>value.accounts.find((row:any)=>row.pvid===actor.pvid).arenaComments.win_message="",
  ]) {
    const invalid=structuredClone(snapshot5);mutate(invalid);writeFileSync(file,JSON.stringify(invalid));const bytes=readFileSync(file);
    assert.throws(()=>new ServerState("http://localhost",file,options));assert.deepEqual(readFileSync(file),bytes,"Malformed/downgraded comments must not be silently dropped by restore");
  }
  writeFileSync(file,final);
  for(const version of [1,2,3,4]) {
    const old=structuredClone(snapshot5);old.version=version;old.accounts.forEach((row:any)=>delete row.arenaComments);
    if(version===1){delete old.quests;delete old.dispatches;}
    else if(version===2)delete old.quests;
    else if(version===4) {
      const linear={...structuredClone(reference),id:"local_comment_linear_history",type:3};
      old.quests[0][1].linear={references:[linear],rules:[{id:linear.id,event:"mission-win",stage_id:null}],index:0,cur_val:0};
    }
    const oldFile=path.join(directory,`legacy-${version}.json`);writeFileSync(oldFile,JSON.stringify(old));const bytes=readFileSync(oldFile);
    const legacy=new ServerState("http://localhost",oldFile,options);
    assert.equal(save({},actor,legacy).result_code,1);
    assert.equal(Object.hasOwn((legacy as any).accountsByPvid.get(actor.pvid),"arenaComments"),false);
    assert.deepEqual(readFileSync(oldFile),bytes,"Legacy comments-free schemas remain unchanged after restore/no-op");
  }
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Arena comments: authenticated JSON patches/full native profile, server-owned preferences, empty/repeated no-op, real disk rollback, read-only clocks/ownership, peer/detail/Enter propagation and schema5 restart/downgrade/corruption preservation passed.");
