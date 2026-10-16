import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {LOCAL_MAIL_SENDER} from "../src/mail.js";
import {ARENA_RIVAL_PVID} from "../src/arena.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-user-details-"));
const originalNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),state=new ServerState("http://localhost",file);
  const actor=state.registerGuest({device_id:"detail-viewer",nickname:"Viewer"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"detail-peer",nickname:"Peer"},{}).ret_data as any;
  const byPvid=(state as any).gameByPvid as Map<number,any>,game=byPvid.get(peer.pvid),viewerGame=byPvid.get(actor.pvid);
  const call=(who:any,route:string,extra={})=>gameResponse(state,route,{...who,...extra}) as any;
  const detail=(targets:unknown=JSON.stringify([peer.pvid]),s=state)=>gameResponse(s,"/world/GetUserDetail",{...actor,list:targets}) as any;
  const immutable=(operation:()=>any,s=state)=>{
    const bytes=readFileSync(file),games=[...(s as any).gameByPvid],accounts=[...(s as any).accountsByPvid];
    const before=structuredClone({games,accounts}),children=games.map(([_id,value])=>Object.entries(value));
    const reply=operation();assert.deepEqual({games:[...(s as any).gameByPvid],accounts:[...(s as any).accountsByPvid]},before);
    [...(s as any).gameByPvid].forEach(([_id,value],index)=>{
      assert.equal(value,games[index][1]);children[index].forEach(([key,child])=>{if(child!==null&&typeof child==="object")assert.equal(value[key],child);});
    });
    assert.deepEqual(readFileSync(file),bytes,"Detail reads cannot allocate games, regenerate clocks or persist");return reply;
  };
  assert.equal((state as any).socialFriends,undefined,"Public same-server detail does not require an invented friend edge");
  const fresh=immutable(()=>detail());assert.equal(fresh.result_code,1);assert.ok(Array.isArray(fresh.ret_data));
  assert.equal(fresh.ret_data[0].pvid,peer.pvid);assert.equal(viewerGame.vip_exp,0);
  assert.throws(()=>gameResponse(state,"/world/GetUserDetail",{list:JSON.stringify([peer.pvid])}),/authenticated account required/);
  assert.throws(()=>gameResponse(state,"/world/GetUserDetail",{otp:actor.otp,pvid:peer.pvid,list:JSON.stringify([peer.pvid])}),/account|identity|pvid/i);
  assert.equal(call(peer,"/lobby/V2_GetSupplyInst").result_code,1);
  assert.equal(call(peer,"/supply/LoginBonusReward",{target_cnt:1}).result_code,1);assert.equal(game.vip_exp,20);
  const leaderId=game.leader_inst_id,leader=game.starter_cards.find((card:any)=>card.inst_id===leaderId)!;
  const skillBefore=leader.skill_1_level;
  assert.equal(call(peer,"/gym/SkillUp",{target_inst_id:leaderId,skill_idx:1}).result_code,1);
  assert.equal(leader.skill_1_level,skillBefore+1);
  const expBefore=leader.exp,groupBefore=game.exp;
  assert.equal(state.startMission({...peer,stage_id:"n_01_01",deck_inst_id_1:leaderId},{}).result_code,1);
  assert.equal((state.completeMission({...peer,stage_id:"n_01_01",play_info:JSON.stringify({clear:1,clear_time:10,dead_cnt:0})},{}) as any).ret_data.accepted,true);
  assert.ok(leader.exp>expBefore);assert.ok(game.exp>groupBefore);
  const earnedLeaderExp=leader.exp;
  while(game.starter_cards.length+game.recruited_cards.length<5)assert.equal(call(peer,"/shop/GachaPremium",{cnt:1}).result_code,1);
  const owned=[...game.starter_cards,...game.recruited_cards],ids=owned.map((card:any)=>card.inst_id);
  assert.equal(new Set(ids).size,ids.length);
  const fifth=ids.find((id:number)=>id!==leaderId&&id!==ids[1]&&id!==ids[2]&&id!==ids[3])??ids[4];
  assert.notEqual(fifth,leaderId);
  const deck=[ids.find((id:number)=>id!==leaderId)!,0,leaderId,0,fifth];
  assert.equal(new Set(deck.filter(Boolean)).size,3);
  assert.equal(call(peer,"/world/SetDeck",{deck_info:JSON.stringify([{type:1,list:deck}])}).result_code,1);
  const response=immutable(()=>detail()),row=response.ret_data[0];assert.equal(response.result_code,1);
  assert.equal(row.vip_exp,20);assert.equal(row.group_exp,game.exp);assert.equal(row.stage_id,"n_01_01","Progress label is locally derived from actual earned stage");
  assert.equal(row.inst_id_leader,leaderId);assert.equal(row.ref_id_leader,leader.ref_id);
  assert.equal(row.exp_leader,leader.exp);assert.equal(row.skill_1_level_leader,leader.skill_1_level);
  for(let slot=1;slot<=5;slot++) {
    const selected=deck[slot-1];assert.equal(row[`inst_id_${slot}`],selected);
    if(!selected){assert.equal(row[`ref_id_${slot}`],undefined);assert.equal(row[`exp_${slot}`],undefined);assert.equal(row[`skill_1_level_${slot}`],undefined);}
    else {const card=owned.find((card:any)=>card.inst_id===selected)!;assert.equal(row[`ref_id_${slot}`],card.ref_id);assert.equal(row[`exp_${slot}`],card.exp);}
  }
  assert.equal(row.inst_id_5,fifth,"Native has five numbered slots in addition to its separate leader metadata");
  for(const key of Object.keys(row))assert.ok(!/^(weapon_|armor_|accessory_|equipment_|gem_|lock_|regdate_|skin_id_|skin_total_count_)/.test(key),"Unparsed private instance fields are not added to flat public detail");
  for(const key of ["otp","token","vsToken","deviceId","passwordHash","items","gem_instances","starter_cards","recruited_cards","decks","gold","gacha_iap_qty"])
    assert.equal(row[key],undefined);
  assert.equal(row.card,undefined);assert.equal(row.user,undefined);
  assert.deepEqual(immutable(()=>detail([peer.pvid,peer.pvid])).ret_data,[row],"Local duplicate targets coalesce");
  assert.deepEqual(immutable(()=>detail(JSON.stringify(Array(50).fill(peer.pvid)))).ret_data,[row],"The local input limit admits50 targets before deduplication");
  row.exp_leader=123456;row.vip_exp=999;assert.equal(game.vip_exp,20);assert.equal(leader.exp,earnedLeaderExp);
  assert.equal(immutable(()=>detail()).ret_data[0].exp_leader,leader.exp);
  const mixed=immutable(()=>detail(JSON.stringify([actor.pvid,peer.pvid,LOCAL_MAIL_SENDER.pvid,ARENA_RIVAL_PVID])));
  assert.equal(mixed.result_code,1);assert.deepEqual(mixed.ret_data.map((value:any)=>value.pvid),[actor.pvid,peer.pvid,LOCAL_MAIL_SENDER.pvid,ARENA_RIVAL_PVID]);
  assert.equal(mixed.ret_data[0].vip_exp,viewerGame.vip_exp);assert.equal(mixed.ret_data[1].vip_exp,20);
  assert.ok(mixed.ret_data[2].ref_id_leader);assert.ok(mixed.ret_data[3].ref_id_leader);
  for(const value of ["[]","[true]","[0]","[4294967296]",JSON.stringify([actor.pvid,999999]),JSON.stringify(Array(51).fill(peer.pvid)),null,"bad"])
    assert.notEqual(immutable(()=>detail(value)).result_code,1,"Malformed, out-of-width and mixed unknown batches refuse without partial profiles");
  assert.notEqual(immutable(()=>gameResponse(state,"/world/GetUserDetail",actor)).result_code,1);
  const block=(who:any,name:string,target:number)=>call(who,"/relation/"+name,{target_list:JSON.stringify([target])});
  assert.equal(block(actor,"Block",peer.pvid).result_code,1);assert.notEqual(immutable(()=>detail()).result_code,1);
  assert.equal(block(actor,"Unblock",peer.pvid).result_code,1);
  assert.equal(block(peer,"Block",actor.pvid).result_code,1);assert.notEqual(immutable(()=>detail()).result_code,1);
  assert.equal(block(peer,"Unblock",actor.pvid).result_code,1);
  const account=(state as any).accountsByPvid.get(peer.pvid),server=account.serverId;account.serverId=server+1;
  assert.notEqual(immutable(()=>detail()).result_code,1);account.serverId=server;
  const loaded=byPvid.get(peer.pvid);byPvid.delete(peer.pvid);assert.notEqual(immutable(()=>detail()).result_code,1);assert.equal(byPvid.has(peer.pvid),false);byPvid.set(peer.pvid,loaded);
  game.leader_inst_id=99999999;assert.notEqual(immutable(()=>detail(JSON.stringify([actor.pvid,peer.pvid]))).result_code,1);game.leader_inst_id=leaderId;
  const ref=leader.ref_id;leader.ref_id="unpublished-hunter";assert.notEqual(immutable(()=>detail()).result_code,1);leader.ref_id=ref;
  const skill=leader.skill_1_level;leader.skill_1_level=-1;assert.notEqual(immutable(()=>detail()).result_code,1);leader.skill_1_level=skill;
  now+=3_600_000;const finalRow=immutable(()=>detail()).ret_data[0],bytes=readFileSync(file);
  const restarted=new ServerState("http://localhost",file);
  assert.deepEqual(immutable(()=>detail(JSON.stringify([peer.pvid]),restarted),restarted).ret_data,[finalRow]);
  assert.deepEqual(readFileSync(file),bytes);
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Real user details: public same-server snapshots, actual VIP/skill/mission/recruitment/party changes, five slots plus leader, zeros, privacy, whole-batch admission, read-only failure/clock behavior and restart passed; no native render claim.");
