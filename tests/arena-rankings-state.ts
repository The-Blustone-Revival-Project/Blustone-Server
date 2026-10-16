import assert from "node:assert/strict";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {ARENA_RIVAL_PVID} from "../src/arena.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";

const directory=mkdtempSync(path.join(tmpdir(),"blustone-arena-rankings-"));
const originalNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
try {
  const file=path.join(directory,"state.json"),seed=new ServerState("http://localhost",file);
  const actor=seed.registerGuest({device_id:"rank-self"},{}).ret_data as any;
  const friend=seed.registerGuest({device_id:"rank-friend"},{}).ret_data as any;
  const other=seed.registerGuest({device_id:"rank-other"},{}).ret_data as any;
  const fresh=seed.registerGuest({device_id:"rank-unentered-friend"},{}).ret_data as any;
  const cross=seed.registerGuest({device_id:"rank-other-server"},{}).ret_data as any;
  const ref={id:"local_rank_history",type:2,title:"Local history",desc:"",desc_noti:"",npc_id:"",go_to:"",serial:1,target_val:1,option_val:0,
    reward:{...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),item_list:[],card_list:[]}};
  const options={questMode:"local-fixed" as const,questPolicy:{period_id:"rank-test-fixed",minimum_stage:"n_01_01",references:[ref],rules:[],
    owners:{[actor.pvid]:[{daily_quest_id:ref.id,is_rewarded:0,cur_val:0}]}}};
  const state=new ServerState("http://localhost",file,options),games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
  const arena=(who:any,name:string,extra={})=>gameResponse(state,"/arena/"+name,{...who,...extra}) as any;
  const friends=(extra={},s=state)=>gameResponse(s,"/arena/GetFriendRankList",{...actor,...extra}) as any;
  const myRank=(s=state)=>gameResponse(s,"/arena/GetMyRank",actor) as any;
  const relation=(who:any,name:string,extra={})=>gameResponse(state,"/relation/"+name,{...who,...extra}) as any;
  const immutable=(operation:()=>any,s=state)=>{
    const g=[...(s as any).gameByPvid],a=[...(s as any).accountsByPvid],before=structuredClone({g,a}),bytes=readFileSync(file);
    const children=g.map(([_id,value])=>Object.entries(value));const result=operation();
    assert.deepEqual({g:[...(s as any).gameByPvid],a:[...(s as any).accountsByPvid]},before);
    [...(s as any).gameByPvid].forEach(([_id,value],index)=>{assert.equal(value,g[index][1]);children[index].forEach(([key,ref])=>{if(ref!==null&&typeof ref==="object")assert.equal(value[key],ref);});});
    [...(s as any).accountsByPvid].forEach(([_id,value],index)=>assert.equal(value,a[index][1]));
    assert.deepEqual(readFileSync(file),bytes,"Ranking reads/refusals cannot initialize decks, allocate games or regenerate clocks");return result;
  };
  const zero={pvid:actor.pvid,rating_point:0,rank:1,win:0,lose:0};
  assert.deepEqual(immutable(()=>friends()).ret_data,{list:[zero]},"Self is present without a fabricated Enter or friend edge");
  assert.deepEqual(immutable(()=>myRank()).ret_data,{rank:1});
  for(const route of ["/arena/GetFriendRankList","/arena/GetMyRank","/arena/GetGlobalRankList"])
    assert.throws(()=>gameResponse(state,route,{}),/authenticated account required/);
  assert.notEqual(immutable(()=>arena(actor,"GetGlobalRankList")).result_code,1,"Incomplete global Defender records cannot be published as a guessed success");
  assert.equal(gameResponse(state,"/dailyquest/GetRefList",actor).result_code,1);
  const accept=(who:any)=>{const requested=relation(actor,"FriendRequest",{target_pvid:who.pvid});assert.equal(requested.result_code,1);
    assert.equal(relation(who,"FriendReqAccept",{target_friend_id:requested.ret_data.friend_id}).result_code,1);return requested.ret_data.friend_id as number;};
  const friendId=accept(friend);accept(fresh);
  assert.deepEqual(immutable(()=>friends()).ret_data,{list:[zero]},"Accepted unentered friends do not acquire a Fight Club record");
  accounts.get(cross.pvid).serverId=accounts.get(actor.pvid).serverId+1;(state as any).persist();
  const earn=(who:any,count:number)=>{
    assert.equal(arena(who,"Enter").result_code,1);
    for(let index=0;index<count;index++) {
      assert.equal(arena(who,"BattleStart",{target_pvid:ARENA_RIVAL_PVID,bid:0,is_revenge:0,is_friendship:0}).result_code,1);
      const metrics={is_win:1,clear_time:10,dead_cnt:0,player_total_hp:100,player_total_hp_max:100,
        enemy_total_hp:0,enemy_total_hp_max:300,atk_max:181,atk_total:300,atk_cnt:2};
      assert.equal(arena(who,"BattleComplete",{target_pvid:ARENA_RIVAL_PVID,is_revenge:0,play_info:JSON.stringify(metrics)}).result_code,1);
    }
  };
  earn(actor,1);earn(friend,3);earn(other,3);earn(cross,5);
  assert.deepEqual([actor,friend,other,cross].map(who=>games.get(who.pvid).arena.rating_point),[10,30,30,50],"Standing inputs come from accepted local battle settlement, not invented points");
  const expected={list:[{pvid:friend.pvid,rating_point:30,rank:1,win:3,lose:0},{pvid:actor.pvid,rating_point:10,rank:3,win:1,lose:0}]};
  assert.deepEqual(immutable(()=>friends()).ret_data,expected,"Nonfriend tied by PVID occupies rank2; other-server higher rating is excluded");
  assert.deepEqual(immutable(()=>myRank()).ret_data,{rank:3});
  for(const row of expected.list)for(const value of Object.values(row))assert.ok(Number.isInteger(value)&&value>=0&&value<=0xffff_ffff);
  const raw=immutable(()=>friends({start:99,length:0,target_pvid:cross.pvid,list:"[]",rank:999}));assert.deepEqual(raw.ret_data,expected,"Native auth-only request has no paging/target selector");
  raw.ret_data.list.forEach((row:any)=>assert.deepEqual(Object.keys(row).sort(),["pvid","rating_point","rank","win","lose"].sort()));
  raw.ret_data.list[0].rating_point=999;assert.equal(games.get(friend.pvid).arena.rating_point,30);
  assert.equal(arena(actor,"Enter").ret_data.user.battle.rank,3);
  const save=arena(actor,"SaveComment",{comment_info:JSON.stringify({win_message:"Clear skies"})});assert.equal(save.result_code,1);assert.equal(save.ret_data.user.battle.rank,3);
  const durable=JSON.parse(readFileSync(file,"utf8"));assert.equal(durable.version,5);assert.ok(Array.isArray(durable.quests));assert.equal(durable.quests.length,1);assert.deepEqual(durable.dispatches,[]);
  const ownOnly={list:[expected.list[1]]};
  const block=(who:any,target:number,name:string)=>relation(who,name,{target_list:JSON.stringify([target])});
  assert.equal(block(actor,friend.pvid,"Block").result_code,1);assert.deepEqual(immutable(()=>friends()).ret_data,ownOnly);assert.equal(immutable(()=>myRank()).ret_data.rank,3);
  assert.equal(block(actor,friend.pvid,"Unblock").result_code,1);
  assert.equal(block(friend,actor.pvid,"Block").result_code,1);assert.deepEqual(immutable(()=>friends()).ret_data,ownOnly);assert.equal(immutable(()=>myRank()).ret_data.rank,3);
  assert.equal(block(friend,actor.pvid,"Unblock").result_code,1);
  assert.equal(relation(actor,"Unfriend",{target_friend_id_list:JSON.stringify([friendId])}).result_code,1);
  assert.deepEqual(immutable(()=>friends()).ret_data,ownOnly);assert.equal(immutable(()=>myRank()).ret_data.rank,3,"Visibility never renumbers the underlying local population");
  const friendGame=games.get(friend.pvid);games.delete(friend.pvid);
  assert.equal(immutable(()=>myRank()).ret_data.rank,2);assert.equal(games.has(friend.pvid),false);games.set(friend.pvid,friendGame);
  const otherGame=games.get(other.pvid),savedRating=otherGame.arena.rating_point;
  for(const bad of [-1,1.5,0x1_0000_0000]) {
    otherGame.arena.rating_point=bad;assert.notEqual(immutable(()=>friends()).result_code,1);assert.notEqual(immutable(()=>myRank()).result_code,1);
  }
  otherGame.arena.rating_point=savedRating;
  // A supplied malformed participating account must not narrow its identity
  // into a valid U32 self/friend alias. No fake identity is persisted.
  const accountEntries=[...accounts],gameEntries=[...games],wide=actor.pvid+0x1_0000_0000;
  accounts.delete(other.pvid);games.delete(other.pvid);accounts.set(wide,{...accountEntries.find(([id])=>id===other.pvid)![1],pvid:wide});games.set(wide,otherGame);
  const originalGraph=(state as any).socialFriends,wideGraph=structuredClone(originalGraph);
  wideGraph.relations.push({friend_id:wideGraph.next_id++,from_pvid:actor.pvid,to_pvid:wide,state:"accepted",created_at:now});
  (state as any).socialFriends=wideGraph;
  assert.notEqual(immutable(()=>friends()).result_code,1,"A visible wide PVID refuses rather than aliasing the native U32 field");
  assert.equal(immutable(()=>myRank()).ret_data.rank,3,"Scalar local rank does not serialize the wide peer PVID");
  (state as any).socialFriends=originalGraph;
  accounts.clear();accountEntries.forEach(([id,value])=>accounts.set(id,value));games.clear();gameEntries.forEach(([id,value])=>games.set(id,value));
  now+=3_600_000;assert.deepEqual(immutable(()=>friends()).ret_data,ownOnly);assert.equal(immutable(()=>myRank()).ret_data.rank,3);
  const selfGame=games.get(actor.pvid);games.delete(actor.pvid);
  assert.notEqual(immutable(()=>friends()).result_code,1);assert.notEqual(immutable(()=>myRank()).result_code,1);
  assert.equal(games.has(actor.pvid),false,"An absent self snapshot must not allocate a replacement game");games.set(actor.pvid,selfGame);
  assert.equal(arena(fresh,"Enter").result_code,1);
  const entered={list:[expected.list[1],{pvid:fresh.pvid,rating_point:0,rank:4,win:0,lose:0}]};
  assert.deepEqual(immutable(()=>friends()).ret_data,entered,"A real Enter makes the zero-win friend a local participant without granting rating");
  const final=readFileSync(file),restart=new ServerState("http://localhost",file,options);
  assert.deepEqual(immutable(()=>friends({},restart),restart).ret_data,entered);assert.equal(immutable(()=>myRank(restart),restart).ret_data.rank,3);
  const restored=JSON.parse(readFileSync(file,"utf8"));assert.equal(restored.version,5);assert.deepEqual(restored.quests,durable.quests);assert.deepEqual(restored.dispatches,durable.dispatches);
  assert.deepEqual((restart as any).accountsByPvid.get(actor.pvid).arenaComments,{start_message:save.ret_data.user.battle.start_message,win_message:"Clear skies",lose_message:save.ret_data.user.battle.lose_message});
  assert.deepEqual(readFileSync(file),final);
}finally{Date.now=originalNow;rmSync(directory,{recursive:true,force:true});}
console.log("Local Arena standings: actual battle earnings, deterministic ties, self/friend visibility with stable rank gaps, auth-only selectors, consistent MyRank/Enter/comments, U32 refusal, read-only clocks/missing games and schema5 history/restart passed; no global ladder claim.");
