import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';
import {cardInstance,starterReference} from '../src/bootstrap.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-mirage-social-'));
const file=path.join(directory,'state.json'),realNow=Date.now;let now=1_800_000_000_000;Date.now=()=>now;
const rank=Math.max(3,starterReference.find(row=>row.base.id==='003')!.stat[0].rank);
const enemy={ref_id:'003',hp_percent:10000,rank,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:rank>=4?1:0,skill_5_level:rank>=5?1:0};
const policy={enrollment:'rank-exp-id-projection',floor:1,bg_res:'MIRAGE_BG_G',dlg_begin:'',dlg_end:'',res_prefix:'MRG',res_postfix_list:['002'],
  stairs:[7,11,13].map((gold,i)=>({grade:i,balance:10000,enemies:[enemy],gold})),hero:{bonus:0,end_ltime:1_900_000_000,cur:[],next:[]}};
const options={mirageMode:'local-configured' as const,miragePolicy:policy};
try {
  const state=new ServerState('http://localhost',file,options);
  const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
  const register=(device:string)=>{
    const raw=state.registerGuest({device_id:device},{}).ret_data as any,auth={pvid:raw.pvid,otp:raw.otp},game=games.get(raw.pvid);
    game.starter_cards=[cardInstance(1000001,'003',rank)];game.recruited_cards=[];game.leader_inst_id=1000001;
    game.decks=[{type:1,list:[1000001,0,0,0,0]}];
    game.card_book=[...game.card_book.filter((row:any)=>row.ref_id!=='003'),{ref_id:'003',rank}];
    game.ap=1;game.bp=1;game.ap_updated_at=now;game.bp_updated_at=now;
    return auth;
  };
  const owner=register('mirage-social-owner'),viewer=register('mirage-social-viewer'),pending=register('mirage-social-pending'),stranger=register('mirage-social-stranger');
  (state as any).persist();
  const call=(who:any,route:string,extra:Record<string,unknown>={},s=state)=>gameResponse(s,route,{...who,...extra}) as any;
  const relation=(who:any,name:string,extra:Record<string,unknown>)=>call(who,'/relation/'+name,extra);
  const request=relation(viewer,'FriendRequest',{target_pvid:owner.pvid});assert.equal(request.result_code,1);
  assert.equal(relation(owner,'FriendReqAccept',{target_friend_id:request.ret_data.friend_id}).result_code,1);
  assert.equal(relation(viewer,'FriendRequest',{target_pvid:pending.pvid}).result_code,1);
  for(const auth of [owner,viewer,pending,stranger])assert.equal(call(auth,'/mirage/GetInfo').result_code,1);
  const snapshot=(s=state)=>({bytes:readFileSync(file),games:structuredClone([...(s as any).gameByPvid]),
    accounts:structuredClone([...(s as any).accountsByPvid]),gameRefs:[...(s as any).gameByPvid],accountRefs:[...(s as any).accountsByPvid]});
  const unchanged=(before:ReturnType<typeof snapshot>,s=state)=>{
    assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...(s as any).gameByPvid],before.games);
    assert.deepEqual([...(s as any).accountsByPvid],before.accounts);
    [...(s as any).gameByPvid].forEach(([id,value]:any,index:number)=>{assert.equal(id,before.gameRefs[index][0]);assert.equal(value,before.gameRefs[index][1]);});
    [...(s as any).accountsByPvid].forEach(([id,value]:any,index:number)=>{assert.equal(id,before.accountRefs[index][0]);assert.equal(value,before.accountRefs[index][1]);});
  };
  const friends=(who:any,expected:unknown,s=state)=>{
    const before=snapshot(s),reply=call(who,'/mirage/GetFriendInfo',{target_pvid:stranger.pvid,floor:999,highest:999},s);
    assert.equal(reply.result_code,1,JSON.stringify(reply));assert.deepEqual(reply.ret_data,expected);unchanged(before,s);
  };
  const ownerName=accounts.get(owner.pvid).nickname,viewerName=accounts.get(viewer.pvid).nickname;
  friends(viewer,[{floor:0,nick_list:[ownerName]}]);friends(owner,[{floor:0,nick_list:[viewerName]}]);friends(stranger,[]);
  const guarded:Array<[string,Record<string,unknown>]>=[
    ['/card_handler/ToggleLock',{target_inst_id:1000001}],['/card_handler/SetLeader',{target_inst_id:1000001}],
    ['/gym/SkillUp',{inst_id:1000001,skill_index:1}],['/gem/LevelUp',{}],
    ['/world/SetDeck',{deck_info:'[{"type":1,"list":[1000001]}]'}],['/world/UseItem',{inst_id:1,target_id:1000001,qty:1}],
    ['/shop/SellCard',{inst_id_list:'[1000001]'}],['/mission/Start',{stage_id:'n_01_01'}],
    ['/mission/Entrust',{stage_id:'n_01_01'}],['/mission/EntrustByIAP',{stage_id:'n_01_01'}],['/arena/BattleStart',{}],['/explore/Begin',{}],['/world/GetFriendlyBattleInfo',{target_pvid:owner.pvid}],
  ];
  const verifyGuard=(who:any,s=state)=>{
    const before=snapshot(s);
    for(const [route,extra] of guarded){const result=call(who,route,extra,s);assert.equal(result.result_code,2001);assert.match(JSON.stringify(result),/Finish the captured Mirage attempt/);}
    unchanged(before,s);
  };
  now+=3600000;verifyGuard(owner);verifyGuard(viewer);
  const modeOff=new ServerState('http://localhost',file,{mirageMode:'disabled'});verifyGuard(viewer,modeOff);
  friends(viewer,[{floor:0,nick_list:[ownerName]}],modeOff);
  assert.deepEqual(call(owner,'/mirage/RegisterDeck',{inst_list:'[1000001]'}).ret_data,[1000001]);
  for(let stair=1;stair<=3;stair++) {
    assert.equal(call(owner,'/mirage/End',{floor:'1',stair:String(stair),remain_deck_hp:'[{"inst_id":1000001,"hp_percent":8000}]',remain_enemy_hp:'[0]'}).result_code,1);
    assert.equal(call(owner,'/mirage/Reward',{floor:'1',stair:String(stair)}).result_code,1);
  }
  friends(viewer,[{floor:1,nick_list:[ownerName]}]);friends(owner,[{floor:0,nick_list:[viewerName]}]);
  const released=snapshot();
  const leader=call(owner,'/card_handler/SetLeader',{target_inst_id:1000001});assert.equal(leader.result_code,1);assert.equal(leader.ret_data,1000001);
  unchanged(released);
  const block=(who:any,target:any,name:string)=>relation(who,name,{target_list:JSON.stringify([target.pvid])});
  assert.equal(block(viewer,owner,'Block').result_code,1);friends(viewer,[]);
  assert.equal(block(viewer,owner,'Unblock').result_code,1);friends(viewer,[{floor:1,nick_list:[ownerName]}]);
  assert.equal(block(owner,viewer,'Block').result_code,1);friends(viewer,[]);
  assert.equal(block(owner,viewer,'Unblock').result_code,1);friends(viewer,[{floor:1,nick_list:[ownerName]}]);
  const originalServer=accounts.get(owner.pvid).serverId;accounts.get(owner.pvid).serverId=originalServer+1;
  friends(viewer,[]);accounts.get(owner.pvid).serverId=originalServer;friends(viewer,[{floor:1,nick_list:[ownerName]}]);
  const restart=new ServerState('http://localhost',file,{mirageMode:'disabled'});friends(viewer,[{floor:1,nick_list:[ownerName]}],restart);
  assert.equal(relation(viewer,'Unfriend',{target_friend_id_list:JSON.stringify([request.ret_data.friend_id])}).result_code,1);friends(viewer,[]);
  const removedRestart=new ServerState('http://localhost',file,{mirageMode:'disabled'});friends(viewer,[],removedRestart);
} finally {
  Date.now=realNow;assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'blustone-mirage-social-')));
  rmSync(directory,{recursive:true,force:true});
}
console.log('Mirage social/commitment guards: actual accepted vs pending/unrelated relations, earned highest1 vs fresh0, mutual blocks/crossserver/unfriend/restart, read-only elapsed clocks and active+modeoff central route guards/released ordinary leader passed.');
