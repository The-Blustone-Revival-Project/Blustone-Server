import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";

// Deliberately enable the diagnostic star floor before all bootstrap imports:
// friend placement must still use only the peer's persisted earned progress.
process.env.BLUSTONE_SEED_STAGE_STARS="3";
const {ServerState}=await import("../src/state.js");
const {gameResponse}=await import("../src/game-routes.js");
const {LOCAL_MAIL_PORTRAIT_PATH}=await import("../src/mail.js");
const previousNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
const directory=mkdtempSync(path.join(tmpdir(),"blustone-friend-mission-records-"));
try {
  const file=path.join(directory,"state.json"),base="http://localhost";
  const state=new ServerState(base,file);
  const actor=state.registerGuest({device_id:"mission-viewer",nickname:"Viewer"},{}).ret_data as any;
  const peer=state.registerGuest({device_id:"mission-peer",nickname:"Peer"},{}).ret_data as any;
  const stranger=state.registerGuest({device_id:"mission-stranger",nickname:"Stranger"},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,peerGame=games.get(peer.pvid),actorGame=games.get(actor.pvid);
  const relation=(who:any,name:string,extra={})=>gameResponse(state,"/relation/"+name,{...who,...extra}) as any;
  const record=(extra={},s=state)=>gameResponse(s,"/world/GetFriendMissionRecord",{...actor,...extra}) as any;
  const readOnly=(expected:unknown,s=state,extra={})=>{
    const before=structuredClone([...(s as any).gameByPvid]),bytes=readFileSync(file),graph=(s as any).socialFriends;
    const values=[...(s as any).gameByPvid.values()];
    const reply=record(extra,s);assert.equal(reply.result_code,1);assert.ok(Array.isArray(reply.ret_data));assert.deepEqual(reply.ret_data,expected);
    assert.deepEqual([...(s as any).gameByPvid],before);assert.equal((s as any).socialFriends,graph);
    [...(s as any).gameByPvid.values()].forEach((value,index)=>assert.equal(value,values[index]));
    assert.deepEqual(readFileSync(file),bytes,"Record reads never regenerate energy, allocate games or persist");
    return reply.ret_data;
  };
  readOnly([]);assert.throws(()=>gameResponse(state,"/world/GetFriendMissionRecord",{}),/authenticated account required/);
  assert.throws(()=>gameResponse(state,"/world/GetFriendMissionRecord",{otp:actor.otp,pvid:peer.pvid}),/account|identity|pvid/i);
  const request=relation(actor,"FriendRequest",{target_pvid:peer.pvid});assert.equal(request.result_code,1);
  readOnly([],state,{target_pvid:peer.pvid});
  assert.equal(relation(peer,"FriendReqAccept",{target_friend_id:request.ret_data.friend_id}).result_code,1);
  readOnly([],state,{stage_id:"n_01_10",cur_val:999,clear:1});
  assert.deepEqual(peerGame.stage_achievements,{});assert.deepEqual(peerGame.stage_stars,{},"Diagnostic seed floor is not stored earned progress");
  // A genuine accepted local mission earns an actual record for this friend.
  const start=state.startMission({...peer,stage_id:"n_01_01",deck_inst_id_1:peerGame.starter_cards[0].inst_id},{}) as any;
  assert.equal(start.result_code,1);assert.equal(start.ret_data.accepted,true);
  readOnly([],state,{target_pvid:stranger.pvid});
  const completed=state.completeMission({...peer,stage_id:"n_01_01",play_info:JSON.stringify({clear:1,clear_time:70,dead_cnt:0})},{}) as any;
  assert.equal(completed.result_code,1);assert.equal(completed.ret_data.accepted,true);
  assert.deepEqual(peerGame.stage_achievements.n_01_01,[0,2]);
  const earned=[{pvid:peer.pvid,profile_url:base+LOCAL_MAIL_PORTRAIT_PATH,stage:"n_01_01"}];
  const rows=readOnly(earned);assert.deepEqual(Object.keys(rows[0]).sort(),["pvid","profile_url","stage"].sort());
  assert.equal(actorGame.stage_achievements.n_01_01,undefined,"Friend completion does not copy progress to the viewer");
  // Unlocked, selected and active-but-uncleared stages are not earned records.
  const second=state.startMission({...peer,stage_id:"n_01_03",deck_inst_id_1:peerGame.starter_cards[0].inst_id},{}) as any;
  assert.equal(second.ret_data.accepted,true);
  readOnly(earned,state,{target_pvid:stranger.pvid,stage_id:"n_99_99",list:JSON.stringify([stranger.pvid]),profile_url:"forged",stage:"n_01_10"});
  const lost=state.completeMission({...peer,stage_id:"n_01_03",play_info:JSON.stringify({clear:0})},{}) as any;
  assert.equal(lost.ret_data.clear,0);readOnly(earned);
  // Advance time so an accidental gameFor call would regenerate AP/BP/anchors.
  now+=3_600_000;readOnly(earned);
  const stored=games.get(peer.pvid);games.delete(peer.pvid);
  readOnly([]);assert.equal(games.has(peer.pvid),false,"An account without loaded progress must not receive a newly generated game");games.set(peer.pvid,stored);
  assert.equal(relation(actor,"Block",{target_list:JSON.stringify([peer.pvid])}).result_code,1);readOnly([]);
  assert.equal(relation(actor,"Unblock",{target_list:JSON.stringify([peer.pvid])}).result_code,1);readOnly(earned);
  assert.equal(relation(peer,"Block",{target_list:JSON.stringify([actor.pvid])}).result_code,1);readOnly([]);
  assert.equal(relation(peer,"Unblock",{target_list:JSON.stringify([actor.pvid])}).result_code,1);readOnly(earned);
  const peerAccount=(state as any).accountsByPvid.get(peer.pvid),originalServer=peerAccount.serverId;
  peerAccount.serverId=originalServer+1;readOnly([]);peerAccount.serverId=originalServer;
  readOnly(earned);
  const final=readFileSync(file),restarted=new ServerState(base,file);
  readOnly(earned,restarted,{target_pvid:stranger.pvid});assert.deepEqual(readFileSync(file),final);
  assert.equal(relation(actor,"Unfriend",{target_friend_id_list:JSON.stringify([request.ret_data.friend_id])}).result_code,1);readOnly([]);
  const removedRestart=new ServerState(base,file);readOnly([],removedRestart);
}finally{Date.now=previousNow;rmSync(directory,{recursive:true,force:true});}
console.log("Friend mission records: actual request/accept and campaign victory, earned-only seed-independent placement, pending/unfriend/mutual-block/cross-server visibility, selector isolation, auth, missing-game/read-only clocks and restart passed.");
