import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';
import {cardInstance,starterReference} from '../src/bootstrap.js';

// Explicit LOCAL3/5 Manda prices and authored one-floor enemies, no original
// price, use cap, reset schedule or kit-item issuance claim.
const directory=mkdtempSync(path.join(tmpdir(),'blustone-mirage-revive-')),file=path.join(directory,'state.json');
const realNow=Date.now;Date.now=()=>1_800_000_000_000;
const rankFor=(id:string)=>Math.max(id==='003'?3:2,starterReference.find(row=>row.base.id===id)!.stat[0].rank);
const rank=rankFor('003'),enemy={ref_id:'003',hp_percent:10000,rank,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:rank>=4?1:0,skill_5_level:rank>=5?1:0};
const basePolicy={enrollment:'rank-exp-id-projection',floor:1,bg_res:'MIRAGE_BG_G',dlg_begin:'',dlg_end:'',res_prefix:'MRG',res_postfix_list:['002'],
  stairs:[7,11,13].map((gold,i)=>({grade:i,balance:10000,enemies:[enemy],gold})),hero:{bonus:0,end_ltime:1_900_000_000,cur:[],next:[]}};
const policy={...basePolicy,revive_prices:[3,5]},options={mirageMode:'local-configured' as const,miragePolicy:policy};
try {
  const state=new ServerState('http://localhost',file,options);
  const raw=state.registerGuest({device_id:'revive-owner'},{}).ret_data as any,actor={pvid:raw.pvid,otp:raw.otp};
  const peer=state.registerGuest({device_id:'revive-peer'},{}).ret_data as any;
  const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>,runs=(state as any).mirageRuns as Map<number,any>;
  const game=games.get(actor.pvid);
  game.starter_cards=[{...cardInstance(1000001,'003',rank),exp:100},cardInstance(1000002,'004',rankFor('004')),cardInstance(1000003,'003',rank)];
  game.recruited_cards=[];game.leader_inst_id=1000001;game.decks=[{type:1,list:[1000001,1000002,0,0,0]}];
  game.next_card_inst_id=1000004;
  game.card_book=[...game.card_book.filter((row:any)=>!['003','004'].includes(row.ref_id)),{ref_id:'003',rank},{ref_id:'004',rank:rankFor('004')}];
  game.gacha_free_qty=2;game.gacha_iap_qty=10;game.gold=100;
  game.ap=1;game.bp=1;game.ap_updated_at=Date.now()-86400000;game.bp_updated_at=game.ap_updated_at;
  games.get(peer.pvid).recruited_cards=[cardInstance(2000001,'003',rank)];
  games.get(peer.pvid).next_card_inst_id=2000002;
  games.get(peer.pvid).card_book.push({ref_id:'003',rank});
  (state as any).persist();
  const peerBefore=structuredClone(games.get(peer.pvid)),actorBefore=structuredClone(game);
  const call=(name:string,extra:Record<string,unknown>={},s=state)=>gameResponse(s,'/mirage/'+name,{...actor,...extra}) as any;
  const snapshot=()=>{
    const refs:Array<{root:any;keys:string[];value:any}>=[];
    const walk=(root:any,value:any,keys:string[]=[])=>{if(value===null||typeof value!=='object')return;refs.push({root,keys,value});for(const [key,child] of Object.entries(value))walk(root,child,[...keys,key]);};
    for(const value of [...games.values(),...accounts.values(),...runs.values()])walk(value,value);
    return {bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),runs:structuredClone([...runs]),refs};
  };
  const unchanged=(before:ReturnType<typeof snapshot>)=>{
    assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...games],before.games);assert.deepEqual([...accounts],before.accounts);assert.deepEqual([...runs],before.runs);
    for(const {root,keys,value} of before.refs)assert.equal(keys.reduce((row,key)=>row[key],root),value,keys.join('.'));
  };
  const faults=(operation:()=>any)=>{
    const before=snapshot();mkdirSync(file+'.tmp');try{assert.equal(operation().result_code,2001);}finally{rmdirSync(file+'.tmp');}unchanged(before);
    const blocked=path.join(directory,'rename-blocked');mkdirSync(blocked);(state as any).stateFile=blocked;
    try{assert.equal(operation().result_code,2001);}finally{(state as any).stateFile=file;rmdirSync(blocked);if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');}unchanged(before);
  };
  const info=call('GetInfo');assert.equal(info.result_code,1,JSON.stringify(info));
  assert.equal(info.ret_data.inst_base.revive_price,3);assert.equal(info.ret_data.entry.length,2);
  assert.equal(game.starter_cards[2].mirage_remain_hp,-1);
  assert.deepEqual(call('RegisterDeck',{inst_list:'[1000001]'}).ret_data,[1000001]);
  const end=(hp:number,enemyHp:number)=>call('End',{floor:'1',stair:String(runs.get(actor.pvid).cache.inst_base.stair),remain_deck_hp:JSON.stringify([{inst_id:1000001,hp_percent:hp}]),remain_enemy_hp:JSON.stringify([enemyHp])});
  const revive=(target:unknown=1000001,extra:Record<string,unknown>={})=>call('Revive',{target_inst_id:target,...extra});
  const alive=snapshot();assert.equal(revive().result_code,2001);unchanged(alive);
  assert.equal(end(0,7000).result_code,1);
  const dead=snapshot();
  assert.throws(()=>gameResponse(state,'/mirage/Revive',{target_inst_id:1000001}),/authenticated account required/);
  assert.equal(call('Revive').result_code,2001);unchanged(dead);
  for(const target of [1000002,1000003,2000001,999999,null,true,0,-1,1.5,'01000001','1e6','4294967296']){
    assert.equal(revive(target).result_code,2001);unchanged(dead);
  }
  for(const extra of [{price:0},{qty:2},{mirage_remain_hp:10000},{inst_id:1000001}]){assert.equal(revive(1000001,extra).result_code,2001);unchanged(dead);}
  // Valid target and genuine funds shortage must still leave every identity,
  // carried HP, counter/history and durable byte untouched.
  game.gacha_free_qty=0;game.gacha_iap_qty=2;(state as any).persist();const poor=snapshot();
  assert.equal(revive().result_code,2001);unchanged(poor);
  game.gacha_free_qty=2;game.gacha_iap_qty=10;(state as any).persist();
  faults(()=>revive());
  const first=revive();assert.equal(first.result_code,1,JSON.stringify(first));
  assert.deepEqual(Object.keys(first.ret_data).sort(),['inst_id','mirage_remain_hp','revive_price','user']);
  assert.equal(first.ret_data.inst_id,1000001);assert.equal(first.ret_data.mirage_remain_hp,10000);assert.equal(first.ret_data.revive_price,5);
  assert.deepEqual(first.ret_data.user.iap,{free_iap_qty:0,iap_qty:9});
  assert.equal(game.gacha_free_qty,0);assert.equal(game.gacha_iap_qty,9);assert.equal(game.starter_cards[0].mirage_remain_hp,10000);
  assert.deepEqual(runs.get(actor.pvid).revive_ids,[1000001]);
  assert.equal(JSON.parse(readFileSync(file,'utf8')).version,13);
  const healed=snapshot();assert.deepEqual(revive(),first);unchanged(healed);
  const restart=new ServerState('http://localhost',file,options);
  assert.deepEqual(call('Revive',{target_inst_id:1000001},restart).ret_data,first.ret_data);assert.deepEqual(readFileSync(file),healed.bytes);
  const off=new ServerState('http://localhost',file,{mirageMode:'disabled'});
  assert.equal(call('GetInfo',{},off).ret_data.inst_base.revive_price,5);
  assert.equal(call('Revive',{target_inst_id:1000001},off).result_code,2001);assert.deepEqual(readFileSync(file),healed.bytes);
  const changed=structuredClone(policy);changed.revive_prices[0]=4;
  assert.throws(()=>new ServerState('http://localhost',file,{...options,miragePolicy:changed}),/differs/);assert.deepEqual(readFileSync(file),healed.bytes);
  for(let version=1;version<=12;version++){
    const bad=JSON.parse(healed.bytes.toString());bad.version=version;
    const injected=path.join(directory,'schema-'+version+'.json');writeFileSync(injected,JSON.stringify(bad));const bytes=readFileSync(injected);
    assert.throws(()=>new ServerState('http://localhost',injected,{mirageMode:'disabled'}),/schema13|schema12|Unsupported or malformed/);assert.deepEqual(readFileSync(injected),bytes);
  }
  const missing=JSON.parse(healed.bytes.toString());delete missing.mirageRuns[0][1].revive_ids;
  const missingFile=path.join(directory,'missing-history.json');writeFileSync(missingFile,JSON.stringify(missing));const missingBytes=readFileSync(missingFile);
  assert.throws(()=>new ServerState('http://localhost',missingFile,{mirageMode:'disabled'}),/history/);assert.deepEqual(readFileSync(missingFile),missingBytes);
  const cohorts=JSON.parse(healed.bytes.toString()),cohortGame=cohorts.gameStates.find(([id]:any)=>id===actor.pvid)[1],cohortAccount=cohorts.accounts.find((row:any)=>row.pvid===actor.pvid);
  cohortGame.dorm_expansion={capacity:103,manda:1,gold:0};cohortGame.fuel_shop={day:20000,manda:0,gold:0,coupon:1};
  cohortAccount.profileSettings={info_message:'Retained with paid first aid',rename_count:1};cohortAccount.rupeeShopCounter={day:20000,manda:1,coupon:0};
  const cohortFile=path.join(directory,'prior-cohorts.json');writeFileSync(cohortFile,JSON.stringify(cohorts));
  const cohortState=new ServerState('http://localhost',cohortFile,{mirageMode:'disabled'});cohortState.registerGuest({device_id:'later-unrelated'},{});
  const retained=JSON.parse(readFileSync(cohortFile,'utf8')),retainedGame=retained.gameStates.find(([id]:any)=>id===actor.pvid)[1],retainedAccount=retained.accounts.find((row:any)=>row.pvid===actor.pvid);
  assert.equal(retained.version,13);assert.deepEqual(retainedGame.dorm_expansion,cohortGame.dorm_expansion);assert.equal(retainedGame.fuel_shop.coupon,1);
  assert.deepEqual(retainedAccount.profileSettings,cohortAccount.profileSettings);assert.deepEqual(retainedAccount.rupeeShopCounter,cohortAccount.rupeeShopCounter);
  assert.equal(retainedGame.gacha_iap_qty,9);assert.deepEqual(retained.mirageRuns,cohorts.mirageRuns);
  assert.equal(end(8000,0).result_code,1);
  const pendingFirstWin=snapshot();assert.equal(revive().result_code,2001);unchanged(pendingFirstWin);
  assert.equal(call('Reward',{floor:'1',stair:'1'}).result_code,1);
  const carried=snapshot(),currentReplay=revive();assert.equal(currentReplay.result_code,1);
  assert.equal(currentReplay.ret_data.mirage_remain_hp,8000,'Replay echoes current carried HP rather than rehealing');
  assert.equal(currentReplay.ret_data.revive_price,5);assert.deepEqual(currentReplay.ret_data.user.iap,{free_iap_qty:0,iap_qty:9});unchanged(carried);
  assert.equal(end(0,6500).result_code,1);
  faults(()=>revive());const second=revive();assert.equal(second.result_code,1);
  assert.deepEqual(second.ret_data.user.iap,{free_iap_qty:0,iap_qty:4});
  assert.equal(second.ret_data.revive_price,runs.get(actor.pvid).cache.inst_base.revive_price,'Captured LOCAL exhaustion marker remains coherent');
  assert.deepEqual(runs.get(actor.pvid).revive_ids,[1000001,1000001]);
  const cappedAlive=snapshot();assert.deepEqual(revive(),second);unchanged(cappedAlive);
  assert.equal(end(0,6000).result_code,1);const capped=snapshot();assert.equal(revive().result_code,2001);unchanged(capped);
  assert.deepEqual(games.get(peer.pvid),peerBefore);
  // A distinct run without optional prices retains its prior schema and
  // explicit unavailable behavior even when its selected Hunter is dead.
  const oldFile=path.join(directory,'without-prices.json'),old=new ServerState('http://localhost',oldFile,{mirageMode:'local-configured',miragePolicy:basePolicy});
  const oldRaw=old.registerGuest({device_id:'old-mirage-without-revive'},{}).ret_data as any,oldAuth={pvid:oldRaw.pvid,otp:oldRaw.otp};
  const oldCall=(name:string,extra:Record<string,unknown>={})=>gameResponse(old,'/mirage/'+name,{...oldAuth,...extra}) as any;
  assert.equal(oldCall('GetInfo').result_code,1);
  const oldGame=(old as any).gameByPvid.get(oldAuth.pvid),oldId=oldGame.starter_cards[0].inst_id;
  assert.equal(oldCall('RegisterDeck',{inst_list:JSON.stringify([oldId])}).result_code,1);
  assert.equal(oldCall('End',{floor:'1',stair:'1',remain_deck_hp:JSON.stringify([{inst_id:oldId,hp_percent:0}]),remain_enemy_hp:'[9000]'}).result_code,1);
  const oldBytes=readFileSync(oldFile);assert.equal(oldCall('Revive',{target_inst_id:oldId}).result_code,2001);assert.deepEqual(readFileSync(oldFile),oldBytes);
  assert.equal(JSON.parse(oldBytes.toString('utf8')).version,12);
  // Pending winning state is separately protected, even for a prior revived target.
  assert.deepEqual(call('RegisterDeck',{inst_list:'[1000002]'}).ret_data,[1000002]);
  assert.equal(call('End',{floor:'1',stair:'2',remain_deck_hp:'[{"inst_id":1000002,"hp_percent":8000}]',remain_enemy_hp:'[0]'}).result_code,1);
  const pendingWin=snapshot();assert.equal(revive().result_code,2001);unchanged(pendingWin);
  assert.equal(game.gold,actorBefore.gold+7);assert.equal(game.ap_updated_at,actorBefore.ap_updated_at);assert.equal(game.bp_updated_at,actorBefore.bp_updated_at);
  assert.deepEqual(game.decks,actorBefore.decks);assert.deepEqual(game.items,actorBefore.items);assert.deepEqual(game.card_book,actorBefore.card_book);
} finally {
  Date.now=realNow;assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'blustone-mirage-revive-')));
  rmSync(directory,{recursive:true,force:true});
}
console.log('Mirage LOCAL revive state: actual dead enrollment, fullHP/freefirst3then5/cap/history/schema13, no-charge alive replay, realwrite+rename rollbackrefs, policy/restart/modeoff/defaultrefusal and target/pending/funds/auth gates passed.');
