import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';
import {cardInstance,starterReference} from '../src/bootstrap.js';
import {castOptions,castContext,castFish} from './fishing-casts-fixture.js';

// Same authored floor factory/graph as mirage-reentry-state. That standalone
// regression has no exported fixture: importing it would execute its tests.
const rank=Math.max(3,starterReference.find(row=>row.base.id==='003')!.stat[0].rank);
const enemy={ref_id:'003',hp_percent:10000,rank,rank_up_cnt:0,overcome_cnt:0,exp:0,skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:rank>=4?1:0,skill_5_level:rank>=5?1:0};
const floor=(floor:number)=>({enrollment:'rank-exp-id-projection',floor,bg_res:'MIRAGE_BG_G',dlg_begin:'',dlg_end:'',res_prefix:'MRG',res_postfix_list:['002'],stairs:Array.from({length:floor>=21?6:3},(_,i)=>({grade:i%4,balance:10000,enemies:[enemy],gold:i+1})),hero:{bonus:0,end_ltime:2_000_000_000,cur:[],next:[]},revive_prices:[3]});
const miragePolicy=floor(1),mirageReentryPolicy={payment:'free-local',daily_attempts:2,day_offset_minutes:0,on_unavailable:'abandon-local',floors:[floor(21)],transitions:[{floor:1,cleared:21,failed:1},{floor:21,cleared:21,failed:1}]};
const directory=mkdtempSync(path.join(tmpdir(),'blustone-fishing-cohorts-')),file=path.join(directory,'state.json'),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
try{
 const mirageOptions={mirageMode:'local-configured' as const,miragePolicy,mirageReentryPolicy};
 const initial=new ServerState('http://localhost',file,mirageOptions),raw=initial.registerGuest({device_id:'cohort-owner'},{}).ret_data as any,actor={pvid:raw.pvid,otp:raw.otp};
 const peerRaw=initial.registerGuest({device_id:'cohort-peer'},{}).ret_data as any,peer={pvid:peerRaw.pvid,otp:peerRaw.otp};
 const game=(initial as any).gameByPvid.get(actor.pvid);
 game.starter_cards=[cardInstance(1000001,'003',rank)];game.recruited_cards=[];game.leader_inst_id=1000001;game.next_card_inst_id=1000002;game.decks=[{type:1,list:[1000001,0,0,0,0]}];
 game.card_book=[...game.card_book.filter((row:any)=>row.ref_id!=='003'),{ref_id:'003',rank}];game.gacha_free_qty=20;game.gacha_iap_qty=10;
 const baitId=4_294_967_321;game.items=[{inst_id:baitId,ref_id:'LU003',qty:12,lock:0}];game.next_item_inst_id=baitId+1;
 game.ap=1;game.bp=1;game.ap_updated_at=Date.now()-86400000;game.bp_updated_at=game.ap_updated_at;(initial as any).persist();
 const mirage=(suffix:string,extra:object={})=>initial.mirageAction('/mirage/'+suffix,{...actor,...extra},{}) as any;
 assert.equal(mirage('GetInfo').result_code,1);
 const end=(hp:number,enemyHp:number)=>mirage('End',{floor:'1',stair:'1',remain_deck_hp:JSON.stringify([{inst_id:1000001,hp_percent:hp}]),remain_enemy_hp:JSON.stringify([enemyHp])});
 assert.equal(mirage('RegisterDeck',{inst_list:'[1000001]'}).result_code,1);assert.equal(end(0,5000).result_code,1);assert.equal(mirage('Revive',{target_inst_id:1000001}).result_code,1);
 assert.equal(mirage('GetNextFloor').ret_data.next_floor,1);assert.equal(mirage('GetInfo',{reset:'1',stay:'1'}).result_code,1);
 assert.equal(mirage('RegisterDeck',{inst_list:'[1000001]'}).result_code,1);assert.equal(end(0,6000).result_code,1);assert.equal(mirage('Revive',{target_inst_id:1000001}).result_code,1);
 const captured=JSON.parse(readFileSync(file,'utf8'));assert.equal(captured.version,14);
 assert.equal(captured.mirageSeries[0][1].generation,2);assert.deepEqual(captured.mirageSeries[0][1].history[0].revive_ids,[1000001]);assert.deepEqual(captured.mirageRuns[0][1].revive_ids,[1000001]);
 assert.equal(game.gacha_free_qty,14);
 // Authored earlier-feature counters/prefs, as in prior Mirage coexistence
 // regressions. Real Mirage history above is never fabricated or patched.
 const account=captured.accounts.find((row:any)=>row.pvid===actor.pvid),owned=captured.gameStates.find(([id]:any)=>id===actor.pvid)[1];
 account.arenaComments={start_message:'Keep starting',win_message:'Keep winning',lose_message:'Keep learning'};
 account.baitShopCounter={day:20000,buy_cnt:1};account.profileSettings={info_message:'Cohorts retained',rename_count:1};account.rupeeShopCounter={day:20000,manda:1,coupon:0};
 owned.dorm_expansion={capacity:103,manda:1,gold:0};owned.fuel_shop={day:20000,manda:0,gold:0,coupon:1};owned.bp_shop={day:20000,manda:0,gold:1,coupon:0};
 writeFileSync(file,JSON.stringify(captured));
 const options={...mirageOptions,...castOptions()},state=new ServerState('http://localhost',file,options),beforeCast=JSON.parse(readFileSync(file,'utf8'));
 const call=(s:ServerState,suffix:string,extra:object={})=>gameResponse(s,'/fishing/'+suffix,{...actor,...extra}) as any;
 assert.equal(call(state,'Begin',castContext).result_code,1);const pendingBytes=readFileSync(file),pending=JSON.parse(pendingBytes.toString());assert.equal(pending.version,15);
 assert.deepEqual(pending.gameStates,beforeCast.gameStates,'Begin does not alter owned Mirage HP, clocks, wallets, decks or earlier counters');
 const verifyOlder=(saved:any)=>{
  assert.equal(saved.version,15);assert.deepEqual(saved.mirageSeries,captured.mirageSeries);assert.deepEqual(saved.mirageRuns,captured.mirageRuns);
  assert.deepEqual(saved.dispatches,captured.dispatches);assert.deepEqual(saved.quests,captured.quests);assert.deepEqual(saved.transportKeys,captured.transportKeys);
  const a=saved.accounts.find((row:any)=>row.pvid===actor.pvid),g=saved.gameStates.find(([id]:any)=>id===actor.pvid)[1];
  for(const key of ['arenaComments','baitShopCounter','profileSettings','rupeeShopCounter'])assert.deepEqual(a[key],account[key],key);
  for(const key of ['dorm_expansion','fuel_shop','bp_shop','starter_cards','recruited_cards','decks','card_book','ap','bp','ap_updated_at','bp_updated_at','gacha_free_qty','gacha_iap_qty'])assert.deepEqual(g[key],owned[key],key);
  assert.deepEqual(saved.gameStates.find(([id]:any)=>id===peer.pvid),captured.gameStates.find(([id]:any)=>id===peer.pvid));
 };
 verifyOlder(pending);
 const restarted=new ServerState('http://localhost',file,options);assert.deepEqual(readFileSync(file),pendingBytes);assert.deepEqual(call(restarted,'Begin',castContext).ret_data.log_id,1);assert.deepEqual(readFileSync(file),pendingBytes);
 const won=call(restarted,'EndWithSell',{log_id:'1',is_win:'1'});assert.equal(won.result_code,1);assert.equal(won.ret_data.fish_id,castFish.id);assert.deepEqual(won.ret_data.consumed_inst_list,[{inst_id:baitId,qty:2}]);
 const settledBytes=readFileSync(file),settled=JSON.parse(settledBytes.toString());verifyOlder(settled);
 const settledGame=settled.gameStates.find(([id]:any)=>id===actor.pvid)[1];assert.equal(settledGame.items.find((item:any)=>item.inst_id===baitId).qty,10);assert.deepEqual(settledGame.owned_fish,[{fish_id:castFish.id,b_cnt:1,s_cnt:0,g_cnt:0}]);
 const restored=new ServerState('http://localhost',file,options);assert.deepEqual(readFileSync(file),settledBytes);verifyOlder(JSON.parse(readFileSync(file,'utf8')));
 // A real unrelated account action persists the combined snapshot, rather
 // than merely proving that a no-op constructor can read it.
 assert.equal((restored.confirmNickname({...peer,nick_name:'Cohort Peer'}, {}) as any).result_code,1);
 const unrelated=JSON.parse(readFileSync(file,'utf8'));verifyOlder(unrelated);assert.deepEqual(unrelated.fishingCasts,settled.fishingCasts);assert.deepEqual(unrelated.gameStates,settled.gameStates);assert.equal(unrelated.accounts.find((row:any)=>row.pvid===peer.pvid).nickname,'Cohort Peer');
 const combinedBytes=readFileSync(file),disabled=new ServerState('http://localhost',file,{...castOptions(),fishingCastMode:'disabled',fishingCastPolicy:undefined,mirageMode:'disabled'});
 assert.deepEqual(readFileSync(file),combinedBytes);assert.equal(call(disabled,'Begin',castContext).result_code,2001);assert.deepEqual(call(disabled,'GetRecord').ret_data,[{fish_id:castFish.id,grade:1,length:100}]);
 disabled.registerGuest({device_id:'cohort-final-save'},{});const final=JSON.parse(readFileSync(file,'utf8'));verifyOlder(final);assert.deepEqual(final.fishingCasts,settled.fishingCasts);assert.deepEqual(final.gameStates.filter(([id]:any)=>id===actor.pvid||id===peer.pvid),settled.gameStates);
 assert.deepEqual(final.accounts.find((row:any)=>row.pvid===actor.pvid),unrelated.accounts.find((row:any)=>row.pvid===actor.pvid));
 console.log('fishing-casts-cohorts: schema14 real Mirage re-entry/current+archived paid first aid → schema15 cast, restart/ordinary save/modeoff and older feature retention passed');
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
