import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';
import {repositoryPath} from '../src/paths.js';

// Disposable LOCAL content and supplied battle reports, never native results.
const directory=mkdtempSync(path.join(tmpdir(),'blustone-adoption-')),file=path.join(directory,'state.json');
const base=JSON.parse(readFileSync(repositoryPath('config/policies/mirage-local-zero-reward.json'),'utf8'));
const reentry=JSON.parse(readFileSync(repositoryPath('config/policies/mirage-local-zero-reward-reentry.json'),'utf8'));
const baseline={mirageMode:'local-configured' as const,miragePolicy:base,rupeeShopMode:'archive-2021-base-only' as const,rupeeShopDailyLimit:3};
const adoption={...baseline,mirageReentryPolicy:reentry,mirageReentryAdoption:'terminal-local' as const};
const realNow=Date.now,begin=1_800_000_000;let now=begin;Date.now=()=>now*1000;
const read=(target=file)=>JSON.parse(readFileSync(target,'utf8'));
try {
  let state=new ServerState('http://localhost',file,baseline);
  const actors=[0,1,2].map(i=>{const r=state.registerGuest({device_id:'terminal-adoption-'+i},{}).ret_data as any;return {pvid:r.pvid,otp:r.otp};});
  const call=(actor:typeof actors[number],route:string,extra:Record<string,unknown>={},s=state)=>s.mirageAction('/mirage/'+route,{...actor,...extra},{}) as any;
  const ok=(actor:typeof actors[number],route:string,extra:Record<string,unknown>={},s=state)=>{
    const r=call(actor,route,extra,s);assert.equal(r.result_code,1,JSON.stringify(r));return r.ret_data;
  };
  assert.equal(gameResponse(state,'/shop/BuyGlobalItem',{...actors[0],target_ref_id:'local_rupee_pack',qty:1,price_type:1,item_inst_id:0},{}).result_code,1);
  assert.equal(read().version,8);
  const enroll=(actor:typeof actors[number])=>{
    const ids=ok(actor,'GetInfo').entry.map((row:any)=>row.id);ok(actor,'RegisterDeck',{inst_list:JSON.stringify(ids)});return ids;
  };
  const end=(actor:typeof actors[number],ids:number[],stair:number,hp=7500,enemy=0)=>ok(actor,'End',{
    floor:'1',stair:String(stair),remain_deck_hp:JSON.stringify(ids.map(inst_id=>({inst_id,hp_percent:hp}))),remain_enemy_hp:JSON.stringify([enemy])});
  const ids=enroll(actors[0]);end(actors[0],ids,1);ok(actors[0],'Reward',{floor:'1',stair:'1'});
  end(actors[0],ids,2,0,5000);ok(actors[0],'GetNextFloor');ok(actors[0],'GetInfo',{reset:'1',stay:'1'});
  const completedIds=enroll(actors[1]);for(let stair=1;stair<=3;stair++){end(actors[1],completedIds,stair);ok(actors[1],'Reward',{floor:'1',stair:String(stair)});}
  const terminal=read(),terminalBytes=readFileSync(file),terminalRuns=structuredClone(terminal.mirageRuns);
  assert.equal(terminal.version,12);assert.deepEqual(terminal.mirageRuns[0][1].claimed,[1]);
  assert.equal(terminal.mirageRuns[0][1].abandoned,true);assert.equal(terminal.mirageRuns[1][1].cache.inst_base.highest,1);
  const noWrite=()=>assert.deepEqual(readFileSync(file),terminalBytes);
  for(const setting of [undefined,'disabled']) {
    assert.throws(()=>new ServerState('http://localhost',file,{...baseline,mirageReentryPolicy:reentry,
      ...(setting?{mirageReentryAdoption:setting as 'disabled'}:{})}),/captured re-entry/);noWrite();
  }
  assert.throws(()=>new ServerState('http://localhost',file,{...baseline,mirageReentryAdoption:'terminal-local'}),/requires explicit/);noWrite();
  assert.throws(()=>new ServerState('http://localhost',file,{...adoption,mirageReentryAdoption:'guess' as any}),/Unknown/);noWrite();
  now=begin+60;state=new ServerState('http://localhost',file,adoption);
  const series=(state as any).mirageSeries as Map<number,any>,runs=(state as any).mirageRuns as Map<number,any>;
  const games=(state as any).gameByPvid as Map<number,any>,accounts=(state as any).accountsByPvid as Map<number,any>;
  const gamesBefore=structuredClone([...games]),accountsBefore=structuredClone([...accounts]);
  assert.equal(series.size,0);noWrite();
  for(const actor of actors.slice(0,2)) {
    const info=ok(actor,'GetInfo');assert.equal(info.inst_base.state,0);assert.deepEqual(info.entry,[]);
    assert.equal(info.inst_base.begin_ltime,begin-86401,'Only wire retry clock changes; actual attempt time remains');
    assert.equal(series.size,0);noWrite();
    assert.equal(call(actor,'GetInfo',{reset:'1',stay:'1'}).result_code,2001,'No legacy terminal no-op success without an offer');noWrite();
  }
  assert.deepEqual([...games],gamesBefore);assert.deepEqual([...accounts],accountsBefore);assert.deepEqual([...runs],terminalRuns);
  const runRef=runs.get(actors[0].pvid),gameRef=games.get(actors[0].pvid),cardsRef=gameRef.starter_cards;
  mkdirSync(file+'.tmp');try{assert.equal(call(actors[0],'GetNextFloor').result_code,2001);}finally{rmdirSync(file+'.tmp');}
  assert.equal(series.size,0);assert.equal(runs.get(actors[0].pvid),runRef);assert.equal(gameRef.starter_cards,cardsRef);noWrite();
  const blocked=path.join(directory,'blocked');mkdirSync(blocked);(state as any).stateFile=blocked;
  try{assert.equal(call(actors[0],'GetNextFloor').result_code,2001);}finally{(state as any).stateFile=file;rmdirSync(blocked);if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');}
  assert.equal(series.size,0);assert.equal(runs.get(actors[0].pvid),runRef);noWrite();
  assert.equal(ok(actors[0],'GetNextFloor').next_floor,1);
  const offered=readFileSync(file),captured=series.get(actors[0].pvid);
  assert.equal(read().version,14);assert.equal(captured.used,1);assert.equal(captured.generation,1);
  assert.equal(captured.day,Math.floor(begin/86400));assert.deepEqual(captured.history,[]);
  assert.deepEqual(read().mirageRuns,terminalRuns);assert.deepEqual([...games],gamesBefore);assert.deepEqual([...accounts],accountsBefore);
  ok(actors[0],'GetNextFloor');assert.deepEqual(readFileSync(file),offered);
  // The completed peer retains its distinct earned highest/claims on capture.
  ok(actors[1],'GetNextFloor');
  assert.equal(series.get(actors[1].pvid).highest,1);assert.equal(series.get(actors[1].pvid).used,1);
  assert.deepEqual(runs.get(actors[1].pvid),terminalRuns[1][1]);
  const bothOffered=readFileSync(file);
  const offeredRunRef=runs.get(actors[0].pvid);
  const reset={reset:'1',stay:'1',entry:'1',inst_base:'1',inst_enemy:'1',ref_stair_list:'1',ref_hero:'1'};
  mkdirSync(file+'.tmp');try{assert.equal(call(actors[0],'GetInfo',reset).result_code,2001);}finally{rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),bothOffered);assert.equal(series.get(actors[0].pvid),captured);assert.equal(runs.get(actors[0].pvid),offeredRunRef);
  const fresh=ok(actors[0],'GetInfo',reset);assert.equal(fresh.inst_base.state,1);assert.deepEqual(fresh.inst_base.deck,[]);
  assert.ok(fresh.entry.every((row:any)=>row.mirage_remain_hp===10000));
  const second=series.get(actors[0].pvid);assert.equal(second.used,2);assert.equal(second.generation,2);
  assert.deepEqual(second.history,[{generation:1,floor:1,begin_ltime:begin,claimed:[1],abandoned:true,completed:false}]);
  const resetBytes=readFileSync(file);assert.deepEqual(ok(actors[0],'GetInfo',reset),fresh);assert.deepEqual(readFileSync(file),resetBytes);
  const newIds=fresh.entry.map((row:any)=>row.id);ok(actors[0],'RegisterDeck',{inst_list:JSON.stringify(newIds)});end(actors[0],newIds,1,0,5000);
  const deadBytes=readFileSync(file),dead=ok(actors[0],'GetInfo');assert.deepEqual(ok(actors[0],'GetInfo',reset),dead);assert.deepEqual(readFileSync(file),deadBytes,'Lost reset reply cannot heal later damage');
  // The explicit opt-in is unnecessary after capture; strict series binding remains.
  state=new ServerState('http://localhost',file,{...adoption,mirageReentryAdoption:'disabled'});
  assert.deepEqual(ok(actors[0],'GetInfo'),dead);assert.deepEqual(readFileSync(file),deadBytes);
  ok(actors[0],'GetNextFloor');ok(actors[0],'GetInfo',reset);
  ok(actors[0],'GetNextFloor');assert.equal((state as any).mirageSeries.get(actors[0].pvid).offer.action,'abandon');ok(actors[0],'GetInfo',reset);
  assert.equal((state as any).mirageRuns.get(actors[0].pvid).abandoned,true);
  assert.equal(call(actors[1],'GetNextFloor').result_code,1);
  const final=read();assert.deepEqual(final.gameStates,terminal.gameStates);assert.deepEqual(final.accounts,terminal.accounts);
  const off=new ServerState('http://localhost',file,{mirageMode:'disabled'}),offBytes=readFileSync(file);
  assert.equal(call(actors[0],'GetNextFloor',{},off).result_code,2001);assert.equal(ok(actors[0],'GetInfo',{},off).inst_base.state,0);
  assert.deepEqual(readFileSync(file),offBytes);
  for(const key of ['unreleased','retuned','future']) {
    const invalid=path.join(directory,key+'.json'),snapshot=structuredClone(terminal);let options:any=adoption;
    if(key==='unreleased')snapshot.gameStates[0][1].starter_cards[0].mirage_remain_hp=-1;
    if(key==='retuned'){options={...adoption,miragePolicy:structuredClone(base)};options.miragePolicy.stairs[0].gold=1;}
    if(key==='future')options={...adoption,mirageReentryPolicy:{...reentry,floors:[{...base,floor:21,stairs:base.stairs.map((s:any)=>({...s,enemies:[{...s.enemies[0],ref_id:'UNKNOWN'}]}))}],transitions:[...reentry.transitions,{floor:21,cleared:1,failed:1}]}};
    writeFileSync(invalid,JSON.stringify(snapshot));const bytes=readFileSync(invalid);
    assert.throws(()=>new ServerState('http://localhost',invalid,options));assert.deepEqual(readFileSync(invalid),bytes);
  }
  for(const pendingReward of [false,true]) {
    const activeFile=path.join(directory,pendingReward?'reward-ready.json':'active.json');
    const activeState=new ServerState('http://localhost',activeFile,baseline);
    const registered=activeState.registerGuest({device_id:'nonterminal-'+pendingReward},{}).ret_data as any;
    const actor={pvid:registered.pvid,otp:registered.otp},info=ok(actor,'GetInfo',{},activeState);
    if(pendingReward) {
      const selected=info.entry.map((row:any)=>row.id);
      ok(actor,'RegisterDeck',{inst_list:JSON.stringify(selected)},activeState);
      ok(actor,'End',{floor:'1',stair:'1',remain_deck_hp:JSON.stringify(selected.map((inst_id:number)=>({inst_id,hp_percent:9000}))),remain_enemy_hp:'[0]'},activeState);
    }
    const bytes=readFileSync(activeFile);assert.throws(()=>new ServerState('http://localhost',activeFile,adoption));assert.deepEqual(readFileSync(activeFile),bytes);
  }
  // One known attempt counts against its actual old day, never adoption time.
  const quotaFile=path.join(directory,'quota.json');writeFileSync(quotaFile,terminalBytes);
  const quotaOptions={...adoption,mirageReentryPolicy:{...reentry,daily_attempts:1}};
  let quota=new ServerState('http://localhost',quotaFile,quotaOptions);
  ok(actors[0],'GetNextFloor',{},quota);assert.equal((quota as any).mirageSeries.get(actors[0].pvid).offer.action,'inspect');
  ok(actors[0],'GetInfo',reset,quota);assert.equal((quota as any).mirageSeries.get(actors[0].pvid).generation,1);
  now=begin+86400;quota=new ServerState('http://localhost',quotaFile,quotaOptions);
  ok(actors[0],'GetNextFloor',{},quota);ok(actors[0],'GetInfo',reset,quota);
  assert.equal((quota as any).mirageSeries.get(actors[0].pvid).generation,2);assert.equal((quota as any).mirageSeries.get(actors[0].pvid).used,1);
  console.log('Terminal Mirage adoption: read-only projection, exact old evidence/quota, atomic offer/reset rollback, replay without healing, strict policies and Rupee/three-game retention passed; no native claim.');
}finally{
  Date.now=realNow;assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'blustone-adoption-'));rmSync(directory,{recursive:true,force:true});
}
