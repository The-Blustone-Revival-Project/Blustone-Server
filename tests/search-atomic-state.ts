import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';
import {SEARCH_CAPSULE_ID} from '../src/search-capsules.js';
import {SEARCH_WAVE_COUNT} from '../src/search-stage.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-search-atomic-')),file=path.join(directory,'state.json'),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
try{
 const state=new ServerState('http://localhost',file),auth=state.registerGuest({device_id:'search-atomic-owner'},{}).ret_data as any;
 state.registerGuest({device_id:'search-atomic-peer'},{});
 const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>,game=games.get(auth.pvid);
 for(let i=0;i<3;i++){assert.equal((state.startMission({...auth,stage_id:'n_01_01'},{}) as any).result_code,1);assert.equal((state.completeMission({...auth,stage_id:'n_01_01',play_info:'{"clear":1}'},{}) as any).result_code,1);}
 game.gacha_free_qty=5;game.gacha_iap_qty=40;(state as any).persist();
 const capsule=game.items.find((row:any)=>row.ref_id===SEARCH_CAPSULE_ID);assert.equal(capsule.qty,3);
 const req=(suffix:string,extra:Record<string,unknown>={},actor=auth)=>gameResponse(state,'/explore/'+suffix,{...actor,...extra}) as any;
 const start={type:1,ref_id:'017',owner:0,inst_id:0,friend_pvid:0,friend_leader_id:0,vfid:'local_lantern_helper',wave_info:1};
 const begin=(helper=true)=>req('Begin',{...start,vfid:helper?start.vfid:''});
 const end=(id:number,won=true)=>req('End',{log_id:id,cleared_wave:won?SEARCH_WAVE_COUNT:0,play_info:JSON.stringify({clear:won?1:0,item_use:[]})});
 const retry=()=>req('Retry',{ref_id:'017',price:10,price_type:1}),reset=()=>req('Reset',{price:30,price_type:1});
 const snapshot=()=>{const refs:{root:any;keys:string[];value:any}[]=[];const walk=(root:any,value:any,keys:string[]=[])=>{if(!value||typeof value!=='object')return;refs.push({root,keys,value});for(const [key,child]of Object.entries(value))walk(root,child,[...keys,key]);};for(const value of [...games.values(),...accounts.values()])walk(value,value);return{bytes:readFileSync(file),games:structuredClone([...games]),accounts:structuredClone([...accounts]),entries:[...games],refs};};
 const unchanged=(before:ReturnType<typeof snapshot>)=>{assert.deepEqual(readFileSync(file),before.bytes);assert.deepEqual([...games],before.games);assert.deepEqual([...accounts],before.accounts);before.entries.forEach(([id,g])=>assert.equal(games.get(id),g));for(const {root,keys,value}of before.refs)assert.equal(keys.reduce((row,key)=>row[key],root),value,keys.join('.'));};
 const faults=(action:()=>unknown)=>{const before=snapshot();mkdirSync(file+'.tmp');try{assert.throws(action,/EISDIR|EPERM|EACCES|illegal operation/);}finally{rmdirSync(file+'.tmp');}unchanged(before);const blocked=path.join(directory,'rename-blocked');mkdirSync(blocked);(state as any).stateFile=blocked;try{assert.throws(action,/EISDIR|EPERM|EEXIST|rename/);}finally{(state as any).stateFile=file;rmdirSync(blocked);if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');}unchanged(before);};
 const refuse=(action:()=>any)=>{const before=snapshot();assert.notEqual(action().result_code,1);unchanged(before);};
 const staticOwned=structuredClone({cards:game.starter_cards,recruited:game.recruited_cards,decks:game.decks,tutorial:game.tutorial,progress:game.stage_achievements,ap:game.ap,bp:game.bp,gold:game.gold,exp:game.exp,apclock:game.ap_updated_at,bpclock:game.bp_updated_at});
 refuse(()=>req('Begin',{...start,owner:42}));refuse(()=>retry());refuse(()=>reset());
 faults(()=>begin());assert.equal(capsule.qty,3);assert.equal(game.search.next_log_id,1);assert.deepEqual(game.search.used_virtual,[]);
 const first=begin();assert.equal(first.result_code,1);assert.equal(capsule.qty,2,'Successful publication preserves hoisted capsule row');assert.equal(game.items.find((i:any)=>i.inst_id===capsule.inst_id),capsule);
 const active=snapshot();assert.equal(begin().result_code,1);unchanged(active);refuse(()=>req('Begin',{...start,vfid:''}));refuse(()=>end(first.ret_data.log_id+1));refuse(()=>retry());refuse(()=>reset());
 const allocator=game.next_item_inst_id;faults(()=>end(first.ret_data.log_id));assert.equal(game.next_item_inst_id,allocator);assert.equal(game.items.some((i:any)=>i.ref_id==='local_sylvester_trace'),false);
 const firstEnd=end(first.ret_data.log_id);assert.equal(firstEnd.result_code,1);assert.equal(firstEnd.ret_data.item[0].added,1);assert.equal(game.next_item_inst_id,allocator+1);
 const trace=game.items.find((i:any)=>i.ref_id==='local_sylvester_trace');assert.equal(trace.qty,1);const settled=snapshot();assert.deepEqual(end(first.ret_data.log_id).ret_data.item,[]);unchanged(settled);
 faults(()=>retry());assert.equal(game.gacha_free_qty,5);assert.equal(game.gacha_iap_qty,40);assert.deepEqual(game.search.repeat.retry_log,[]);
 const paidRetry=retry();assert.equal(paidRetry.result_code,1);assert.deepEqual(paidRetry.ret_data.user,{iap:{prev:40,cur:35},free_iap:{prev:5,cur:0}});const retried=snapshot();assert.equal(retry().ret_data.user,null);unchanged(retried);
 const second=begin(false);assert.equal(second.result_code,1);assert.equal(capsule.qty,1);faults(()=>end(second.ret_data.log_id));assert.equal(trace.qty,1);assert.equal(end(second.ret_data.log_id).result_code,1);assert.equal(trace.qty,2,'Existing trace object retained after successful increment');
 faults(()=>reset());assert.equal(game.gacha_iap_qty,35);assert.equal(game.search.repeat.reset_cnt,0);assert.equal(reset().result_code,1);assert.equal(game.gacha_iap_qty,5);assert.equal(game.search.repeat.reset_cnt,1);assert.deepEqual(game.search.repeat.play_log,[]);assert.deepEqual(game.search.used_virtual,['local_lantern_helper']);
 const resetDone=snapshot();assert.equal(reset().result_code,1);unchanged(resetDone);
 assert.deepEqual({cards:game.starter_cards,recruited:game.recruited_cards,decks:game.decks,tutorial:game.tutorial,progress:game.stage_achievements,ap:game.ap,bp:game.bp,gold:game.gold,exp:game.exp,apclock:game.ap_updated_at,bpclock:game.bp_updated_at},staticOwned);
 const durable=readFileSync(file),restart=new ServerState('http://localhost',file);assert.deepEqual((restart as any).gameByPvid.get(auth.pvid),game);assert.deepEqual(readFileSync(file),durable);
 // Exact existing disposable guide fixture: no capsule issuance, one initial
 // cost waiver, helper/log reservation and ten earned traces only on victory.
 const guided=state.registerGuest({device_id:'search-atomic-guided'},{}).ret_data as any,guideGame=games.get(guided.pvid);
 guideGame.items=[];guideGame.stage_achievements.n_01_08=[0];guideGame.tutorial.push({type:37,step:0,is_cleared:1});(state as any).persist();
 const guideBegin=()=>req('Begin',start,guided),guideEnd=(id:number)=>req('End',{log_id:id,cleared_wave:SEARCH_WAVE_COUNT,play_info:'{"clear":1,"item_use":[]}'},guided);
 const guideTutorial=structuredClone(guideGame.tutorial);faults(guideBegin);assert.equal(guideGame.search.onboarding_used,false);assert.deepEqual(guideGame.items,[]);
 const guide=guideBegin();assert.equal(guide.result_code,1);assert.deepEqual(guide.ret_data.consume_result,[]);assert.equal(guideGame.search.onboarding_used,true);faults(()=>guideEnd(guide.ret_data.log_id));assert.equal(guideGame.items.length,0);
 const guideWon=guideEnd(guide.ret_data.log_id);assert.equal(guideWon.result_code,1);assert.equal(guideWon.ret_data.item[0].added,10);assert.equal(guideGame.items[0].qty,10);assert.deepEqual(guideGame.tutorial,guideTutorial);const guideSettled=snapshot();assert.deepEqual(guideEnd(guide.ret_data.log_id).ret_data.item,[]);unchanged(guideSettled);
 const finalBytes=readFileSync(file),final=new ServerState('http://localhost',file);assert.deepEqual([...(final as any).gameByPvid],[...games]);assert.deepEqual(readFileSync(file),finalBytes);
 console.log('search-atomic-state: Begin/End/Retry/Reset write+rename failures preserve exact game/account/nested refs, capsules/helpers/logs/guide waiver/reward allocator/Manda; no-effect refusals/replays and successful restart passed');
}finally{Date.now=realNow;rmSync(directory,{recursive:true,force:true});}
