import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {cardInstance,starterReference} from '../src/bootstrap.js';

// Explicit authored one-floor economy/enemies; original assets only. No live save.
const directory=mkdtempSync(path.join(tmpdir(),'blustone-mirage-state-'));
const file=path.join(directory,'state.json'),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
const enemy=(ref_id:string,rank:number)=>({ref_id,hp_percent:10000,rank,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:rank>=2?1:0,skill_3_level:rank>=3?1:0,skill_4_level:rank>=4?1:0,skill_5_level:rank>=5?1:0});
const rankFor=(id:string)=>Math.max(id==='003'?3:2,starterReference.find(row=>row.base.id===id)!.stat[0].rank);
const policy={enrollment:'rank-exp-id-projection',floor:1,bg_res:'MIRAGE_BG_G',dlg_begin:'',dlg_end:'',res_prefix:'MRG',res_postfix_list:['002'],
  stairs:Array.from({length:3},(_,i)=>({grade:i,balance:10000,enemies:[enemy(i===1?'004':'003',rankFor(i===1?'004':'003'))],gold:17+i})),
  hero:{bonus:0,end_ltime:1_900_000_000,cur:[],next:[]}};
const options={mirageMode:'local-configured' as const,miragePolicy:policy};
try {
  const state=new ServerState('http://localhost',file,options);
  const registered=state.registerGuest({device_id:'mirage-state-owner'},{}).ret_data as any;
  const actor={pvid:registered.pvid,otp:registered.otp};
  const peer=state.registerGuest({device_id:'mirage-state-peer'},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
  const runs=(state as any).mirageRuns as Map<number,any>,game=games.get(actor.pvid);
  game.starter_cards=[cardInstance(1000001,'003',rankFor('003')),cardInstance(1000002,'004',rankFor('004'))];
  game.recruited_cards=[];game.leader_inst_id=1000001;
  game.card_book=[{ref_id:'001',rank:1},{ref_id:'002',rank:1},{ref_id:'003',rank:rankFor('003')},{ref_id:'004',rank:rankFor('004')}];
  game.decks=[{type:1,list:[1000001,1000002,0,0,0]}];
  game.gold=100;game.ap_updated_at=Date.now()-86400000;game.bp_updated_at=game.ap_updated_at;
  (state as any).persist();
  const actorBefore=structuredClone(game);
  const peerBefore=structuredClone(games.get(peer.pvid));
  const call=(route:string,extra:Record<string,unknown>={})=>state.mirageAction('/mirage/'+route,{...actor,...extra},{}) as any;
  const snapshot=()=>{
    const refs:Array<{root:any;keys:string[];value:any}>=[];
    const walk=(root:any,value:any,keys:string[]=[])=>{
      if(value===null||typeof value!=='object')return;refs.push({root,keys,value});
      for(const [key,child] of Object.entries(value))walk(root,child,[...keys,key]);
    };
    for(const value of [...games.values(),...accounts.values(),...runs.values()])walk(value,value);
    return {bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),runs:structuredClone([...runs]),refs};
  };
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...games],before.games);
    assert.deepEqual([...accounts],before.accounts);assert.deepEqual([...runs],before.runs);
    for(const {root,keys,value} of before.refs)assert.equal(keys.reduce((row,key)=>row[key],root),value,`Preserve nested ${keys.join('.')}`);
  };
  const faults=(operation:()=>any)=>{
    const before=snapshot();mkdirSync(file+'.tmp');
    try{assert.equal(operation().result_code,2001);}finally{rmdirSync(file+'.tmp');}
    unchanged(before);
    const blocked=path.join(directory,'rename-blocked');mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.equal(operation().result_code,2001);}finally{(state as any).stateFile=file;rmdirSync(blocked);if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');}
    unchanged(before);
  };
  const pre=snapshot();
  const unauthEnd=state.mirageAction('/mirage/End',{pvid:actor.pvid,otp:'incorrect'}, {}) as any;
  assert.notEqual(unauthEnd.result_code,1);assert.equal(Object.hasOwn(unauthEnd,'ret_data'),false);
  assert.equal(call('RegisterDeck',{inst_list:'[1000001]'}).result_code,2001);
  assert.equal(call('GetInfo',{reset:'1'}).result_code,2001);assert.equal(call('GetInfo',{entry:'bad'}).result_code,2001);
  unchanged(pre);
  faults(()=>call('GetInfo'));
  assert.equal(runs.size,0);assert.equal(game.starter_cards[0].mirage_remain_hp,1000);
  const enrolled=call('GetInfo');assert.equal(enrolled.result_code,1);
  assert.deepEqual(enrolled.ret_data.entry,[{id:1000001,mirage_remain_hp:10000},{id:1000002,mirage_remain_hp:10000}]);
  assert.deepEqual(enrolled.ret_data.inst_base.deck,[]);assert.equal(game.starter_cards[0].mirage_remain_hp,10000);
  const disk=JSON.parse(readFileSync(file,'utf8'));assert.equal(disk.version,12);
  assert.ok(Array.isArray(disk.dispatches)&&Array.isArray(disk.quests));assert.equal(disk.mirageRuns.length,1);
  const enrolledSnapshot=snapshot();
  assert.deepEqual(call('GetInfo',{entry:'1',inst_base:'0'}).ret_data,{entry:enrolled.ret_data.entry});
  assert.deepEqual(call('GetInfo',{entry:'0'}).ret_data,{});unchanged(enrolledSnapshot);
  assert.equal(call('RegisterDeck',{inst_list:'[999999]'}).result_code,2001);
  assert.equal(call('RegisterDeck',{inst_list:'[1000001,1000001]'}).result_code,2001);unchanged(enrolledSnapshot);
  faults(()=>call('RegisterDeck',{inst_list:'[1000001]'}));
  assert.deepEqual(call('RegisterDeck',{inst_list:'[1000001]'}).ret_data,[1000001]);
  const end=(id:number,hp:number,enemyHp:number,stair=1)=>call('End',{floor:'1',stair:String(stair),
    remain_deck_hp:JSON.stringify([{inst_id:id,hp_percent:hp}]),remain_enemy_hp:JSON.stringify([enemyHp])});
  faults(()=>end(1000001,0,7000));
  const lost=end(1000001,0,7000);assert.equal(lost.result_code,1,JSON.stringify(lost));assert.equal(lost.ret_data.state,1);
  assert.deepEqual(lost.ret_data.deck,[{inst_id:1000001,remain_hp_percent:0}]);
  assert.equal(game.starter_cards[0].mirage_remain_hp,0);
  const lostSnap=snapshot();assert.deepEqual(end(1000001,0,7000),lost);unchanged(lostSnap);
  assert.equal(call('Reward',{floor:'1',stair:'1'}).result_code,2001);
  assert.equal(call('RegisterDeck',{inst_list:'[1000001]'}).result_code,2001);unchanged(lostSnap);
  assert.deepEqual(call('RegisterDeck',{inst_list:'[1000002]'}).ret_data,[1000002]);
  faults(()=>end(1000002,6500,0));
  const win=end(1000002,6500,0);assert.equal(win.result_code,1);assert.equal(win.ret_data.state,2);
  const winSnap=snapshot();assert.deepEqual(end(1000002,6500,0),win);unchanged(winSnap);
  const restartLost=new ServerState('http://localhost',file,options);
  assert.equal((restartLost as any).gameByPvid.get(actor.pvid).starter_cards[1].mirage_remain_hp,6500);
  assert.equal((restartLost as any).mirageRuns.get(actor.pvid).cache.inst_enemy[0].hp_percent,0);
  assert.deepEqual(readFileSync(file),winSnap.bytes);
  const activeOff=new ServerState('http://localhost',file,{mirageMode:'disabled'});
  const activeOffInfo=activeOff.mirageAction('/mirage/GetInfo',actor,{}) as any;
  assert.equal(activeOffInfo.result_code,1);assert.equal(activeOffInfo.ret_data.inst_base.state,2);
  assert.equal(activeOffInfo.ret_data.entry.find((row:any)=>row.id===1000002).mirage_remain_hp,6500);
  assert.equal((activeOff.mirageAction('/mirage/Reward',{...actor,floor:'1',stair:'1'},{}) as any).result_code,2001);
  assert.deepEqual(readFileSync(file),winSnap.bytes);
  faults(()=>call('Reward',{floor:'1',stair:'1'}));
  const firstReward=call('Reward',{floor:'1',stair:'1'});assert.equal(firstReward.result_code,1);
  assert.deepEqual(firstReward.ret_data.user.gold,{prev:100,cur:117});assert.equal(firstReward.ret_data.cur_stair,2);
  const claimed=snapshot();const repaired=call('Reward',{floor:'1',stair:'1'});assert.equal(repaired.result_code,1);assert.equal(repaired.ret_data.cur_stair,2);assert.deepEqual(repaired.ret_data.user.gold,{prev:117,cur:117});unchanged(claimed);
  Date.now=()=>1_950_000_000_000;
  assert.equal(end(1000002,6000,0,2).result_code,1);
  assert.deepEqual(call('Reward',{floor:'1',stair:'2'}).ret_data.user.gold,{prev:117,cur:135});
  assert.equal(end(1000002,5500,0,3).result_code,1);
  faults(()=>call('Reward',{floor:'1',stair:'3'}));
  const final=call('Reward',{floor:'1',stair:'3'});assert.equal(final.result_code,1);
  assert.deepEqual(final.ret_data.user.gold,{prev:135,cur:154});assert.equal(final.ret_data.state,0);
  assert.deepEqual(runs.get(actor.pvid).cache.entry,[]);assert.deepEqual(runs.get(actor.pvid).cache.inst_base.deck,[]);
  assert.ok(game.starter_cards.every((card:any)=>card.mirage_remain_hp===1000));
  assert.deepEqual(game,{...actorBefore,gold:154},'Completed floor changes only explicit gold; carried HP released, no resource clocks/ordinary progress drift');
  assert.deepEqual(games.get(peer.pvid),peerBefore);
  const completed=snapshot();const finalRepair=call('Reward',{floor:'1',stair:'3'});assert.equal(finalRepair.result_code,1);assert.equal(finalRepair.ret_data.state,0);assert.deepEqual(finalRepair.ret_data.user.gold,{prev:154,cur:154});unchanged(completed);
  const off=new ServerState('http://localhost',file,{mirageMode:'disabled'});
  const offInfo=off.mirageAction('/mirage/GetInfo',actor,{}) as any;assert.equal(offInfo.result_code,1);
  assert.equal(offInfo.ret_data.inst_base.state,0);assert.equal(offInfo.ret_data.inst_base.highest,1);
  assert.equal((off.mirageAction('/mirage/RegisterDeck',{...actor,inst_list:'[1000002]'},{}) as any).result_code,2001);
  assert.deepEqual(readFileSync(file),completed.bytes);
  const changed=structuredClone(policy);changed.stairs[0].gold++;
  assert.throws(()=>new ServerState('http://localhost',file,{...options,miragePolicy:changed}),/differs/);
  assert.deepEqual(readFileSync(file),completed.bytes);
  const restart=new ServerState('http://localhost',file,options);
  assert.deepEqual([...(restart as any).gameByPvid],[...games]);assert.deepEqual([...(restart as any).mirageRuns],[...runs]);
  assert.deepEqual(readFileSync(file),completed.bytes);
  // Exact unrepresented nonentry carry is refused on restore, without erasure.
  const corrupt=JSON.parse(completed.bytes.toString('utf8'));
  corrupt.gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1].starter_cards[0].mirage_remain_hp=7777;
  const corruptFile=path.join(directory,'unrepresented.json');writeFileSync(corruptFile,JSON.stringify(corrupt));const corruptBytes=readFileSync(corruptFile);
  assert.throws(()=>new ServerState('http://localhost',corruptFile,{mirageMode:'disabled'}),/Unrepresented/);
  assert.deepEqual(readFileSync(corruptFile),corruptBytes);
  // Exhausted or expired attempts have a reward-free escape to ordinary play.
  Date.now=()=>1_800_000_000_000;
  const abortFile=path.join(directory,'abandon.json'),abortState=new ServerState('http://localhost',abortFile,options);
  const abortRegistered=abortState.registerGuest({device_id:'mirage-all-dead'},{}).ret_data as any,abortActor={pvid:abortRegistered.pvid,otp:abortRegistered.otp};
  const abortGame=(abortState as any).gameByPvid.get(abortActor.pvid),abortRuns=(abortState as any).mirageRuns as Map<number,any>;
  const abortCall=(route:string,extra:object={})=>abortState.mirageAction('/mirage/'+route,{...abortActor,...extra},{}) as any;
  const zeroFlags=readFileSync(abortFile);assert.deepEqual(abortCall('GetInfo',{entry:'0'}).ret_data,{});assert.deepEqual(readFileSync(abortFile),zeroFlags);assert.equal(abortRuns.size,0);
  const initialAbort=structuredClone(abortGame),entry=abortCall('GetInfo').ret_data.entry;
  for(const row of entry){assert.equal(abortCall('RegisterDeck',{inst_list:JSON.stringify([row.id])}).result_code,1);
    const death=abortCall('End',{floor:'1',stair:'1',remain_deck_hp:JSON.stringify([{inst_id:row.id,hp_percent:0}]),remain_enemy_hp:'[5000]'});assert.equal(death.result_code,1,JSON.stringify(death));}
  const dead=readFileSync(abortFile),oldRun=abortRuns.get(abortActor.pvid),oldCards=abortGame.starter_cards;
  assert.equal(abortState.mirageBlocks('/mission/Start',abortActor,{}),true);
  assert.equal(abortCall('GetInfo',{reset:'1',entry:'bad'}).result_code,2001);assert.deepEqual(readFileSync(abortFile),dead);assert.equal(abortRuns.get(abortActor.pvid),oldRun);
  mkdirSync(abortFile+'.tmp');try{assert.equal(abortCall('GetInfo',{reset:'1'}).result_code,2001);}finally{rmdirSync(abortFile+'.tmp');}
  assert.deepEqual(readFileSync(abortFile),dead);assert.equal(abortRuns.get(abortActor.pvid),oldRun);assert.equal(abortGame.starter_cards,oldCards);
  Date.now=()=>1_950_000_000_000;
  const released=abortCall('GetInfo',{reset:'1'});assert.equal(released.result_code,1);assert.equal(released.ret_data.inst_base.highest,0);assert.equal(released.ret_data.inst_base.state,0);
  assert.equal(abortRuns.get(abortActor.pvid).abandoned,true);assert.deepEqual(abortRuns.get(abortActor.pvid).claimed,[]);
  assert.deepEqual(abortGame,initialAbort);assert.equal(abortState.mirageBlocks('/mission/Start',abortActor,{}),false);
  const releasedBytes=readFileSync(abortFile);assert.equal(abortCall('GetInfo',{reset:'1'}).result_code,1);assert.deepEqual(readFileSync(abortFile),releasedBytes);
  new ServerState('http://localhost',abortFile,{mirageMode:'disabled'});assert.deepEqual(readFileSync(abortFile),releasedBytes);
  for(let version=1;version<=11;version++){const bad=JSON.parse(completed.bytes.toString());bad.version=version;const oldFile=path.join(directory,'schema-'+version+'.json');writeFileSync(oldFile,JSON.stringify(bad));const bytes=readFileSync(oldFile);
    assert.throws(()=>new ServerState('http://localhost',oldFile,{mirageMode:'disabled'}),/schema12|Unsupported or malformed/);assert.deepEqual(readFileSync(oldFile),bytes);}
  Date.now=()=>1_800_000_000_000;
  const badPolicy=structuredClone(policy);badPolicy.stairs[2].enemies[0].ref_id='UNRECOVERED';const badFile=path.join(directory,'bad-enemy.json');
  const badState=new ServerState('http://localhost',badFile,{...options,miragePolicy:badPolicy});const badActor=badState.registerGuest({device_id:'bad-later-enemy'},{}).ret_data as any;const untouched=readFileSync(badFile);
  assert.equal((badState.mirageAction('/mirage/GetInfo',badActor,{}) as any).result_code,2001);assert.deepEqual(readFileSync(badFile),untouched);assert.equal((badState as any).mirageRuns.size,0);
} finally {
  Date.now=realNow;
  assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'blustone-mirage-state-')));
  rmSync(directory,{recursive:true,force:true});
}
console.log('Mirage configured state: real enrollment/schema12, section reads, registration, loss/reserve/win+replay,3gold claims/release, real write+rename rollback refs/bytes, peer/restart/modeoff/fingerprint/carry refusal passed.');
