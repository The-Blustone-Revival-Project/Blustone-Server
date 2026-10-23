import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';
import {normalizeDispatch} from '../src/local-dispatch.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-dispatch-row-state-')),clock=Date.now;
const begin=1_800_000_000;let now=begin;Date.now=()=>now*1000;
type Mode='disabled'|'local-manda-all'|'local-manda-sequential';
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
function fixture(name:string) {
  now=begin;const file=path.join(directory,name+'.json'),seed=new ServerState('http://localhost',file,{dispatchMode:'disabled'});
  const registered=seed.registerGuest({device_id:name+'-owner'},{}).ret_data as any;
  const other=seed.registerGuest({device_id:name+'-peer'},{}).ret_data as any;
  const auth={pvid:registered.pvid,otp:registered.otp},peer={pvid:other.pvid,otp:other.otp};
  const game=seed.gameFor(seed.accountFor(auth,{})),target=game.starter_cards[0];
  game.decks.push({type:2,list:[target.inst_id,0,0,0,0]});game.stage_achievements={n_01_01:[0],n_01_05:[1]};game.stage_stars={n_01_01:1,n_01_05:1};
  game.gacha_free_qty=2;game.gacha_iap_qty=20;(seed as any).persist();
  const policy={max_runs:3,gold_per_run:3,user_exp_per_run:5,card_exp_per_run:7,skip_price:1,entrust_second_per_cost:60,
    items_per_run:[{ref_id:'AIRSHIP_TICKET',qty:2}],passes:{[auth.pvid]:{end_datetime:'1970-01-01 00:00:00',end_datetime_utc:0}}};
  const options=(mode:Mode,dispatchPolicy=policy)=>({dispatchMode:'local-timed' as const,dispatchPolicy,dispatchSkipMode:mode});
  let state=new ServerState('http://localhost',file,options('local-manda-sequential'));
  const call=(route:string,extra:Record<string,unknown>={},s=state)=>gameResponse(s,'/mission/'+route,{...auth,...extra},{}) as any;
  const ok=(route:string,extra:Record<string,unknown>={},s=state)=>{const reply=call(route,extra,s);assert.equal(reply.result_code,1,JSON.stringify(reply));return reply.ret_data;};
  const start=ok('Entrust',{stage_id:'n_01_01',deck_type:'2',cnt:'3',is_tuto:'0'});
  const id=String((state as any).dispatches.get(auth.pvid).active.snapshot.entrust_id);
  const request=(serial:number,qty=1)=>({entrust_id:id,serial:String(serial),use_iap_qty:String(qty),is_tuto:'0',is_iap_pass:'0'});
  return {file,auth,peer,policy,options,state,call,ok,start,id,request,setState:(s:ServerState)=>{state=s;}};
}
try {
  const f=fixture('same-time'),journal=(f.state as any).dispatches as Map<number,any>,games=(f.state as any).gameByPvid as Map<number,any>;
  const game=games.get(f.auth.pvid),original=structuredClone(journal.get(f.auth.pvid).active.snapshot),baseline=read(f.file);
  assert.equal(f.call('EndEntrust',{entrust_id:f.id}).result_code,2001);
  const refuse=(request:Record<string,unknown>,s=f.state)=>{
    const observed=(s as any).gameByPvid.get(f.auth.pvid),bytes=readFileSync(f.file),memory=structuredClone(observed),reply=f.call('SkipEntrust',request,s);
    assert.notEqual(reply.result_code,1);assert.equal(reply.ret_data,null);assert.deepEqual(readFileSync(f.file),bytes);assert.deepEqual(observed,memory);
  };
  for(const delta of [f.request(1),f.request(2),{...f.request(0),use_iap_qty:'0'},{...f.request(0),use_iap_qty:'2'},
    {...f.request(0),is_iap_pass:'1'},{...f.request(0),is_tuto:'1'}])refuse(delta);
  for(const mode of ['disabled','local-manda-all'] as const)refuse(f.request(0),new ServerState('http://localhost',f.file,f.options(mode)));
  const oldJournal=journal.get(f.auth.pvid),oldCards=game.starter_cards,oldItems=game.items,bytes=readFileSync(f.file);
  mkdirSync(f.file+'.tmp');try{assert.throws(()=>f.call('SkipEntrust',f.request(0)));}finally{rmdirSync(f.file+'.tmp');}
  assert.equal(journal.get(f.auth.pvid),oldJournal);assert.equal(game.starter_cards,oldCards);assert.equal(game.items,oldItems);assert.deepEqual(readFileSync(f.file),bytes);
  const blocked=path.join(directory,'rename-target');mkdirSync(blocked);(f.state as any).stateFile=blocked;
  try{assert.throws(()=>f.call('SkipEntrust',f.request(0)));}finally{(f.state as any).stateFile=f.file;rmdirSync(blocked);if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');}
  assert.equal(journal.get(f.auth.pvid),oldJournal);assert.equal(game.starter_cards,oldCards);assert.equal(game.items,oldItems);assert.deepEqual(readFileSync(f.file),bytes);
  const beforeGame=structuredClone(game),beforeAccounts=structuredClone(read(f.file).accounts);
  const first=f.ok('SkipEntrust',f.request(0));assert.equal(first.list.length,1);assert.equal(first.list[0].serial,0);
  assert.deepEqual(first.user,{free_iap_qty:1,iap_qty:20});assert.equal(first.list[0].item,original.list[0].item);
  refuse(f.request(0));refuse(f.request(2));
  const second=f.ok('SkipEntrust',f.request(1));assert.equal(second.list.length,1);assert.equal(second.list[0].serial,1);
  assert.deepEqual(second.user,{free_iap_qty:0,iap_qty:20});
  const twice=read(f.file),rawJournal=twice.dispatches[0][1],rows=[{serial:0,completed_at:begin,charged_fee:1},{serial:1,completed_at:begin,charged_fee:1}];
  assert.equal(twice.version,19);assert.deepEqual(twice.quests,[]);assert.deepEqual(rawJournal.active.row_skips,rows);
  assert.deepEqual(rawJournal.active.snapshot,original);assert.deepEqual(twice.accounts,beforeAccounts);
  const expectedGame=structuredClone(beforeGame);expectedGame.gacha_free_qty=0;assert.deepEqual(game,expectedGame,'Rows debit only Manda; awards/AP/roster/inventory remain');
  const refresh=f.ok('RefreshEntrust',{entrust_id:f.id});
  assert.deepEqual(refresh.list.slice(0,2).map((row:any)=>String(row.end_utc)),[String(begin),String(begin)]);
  assert.equal(String(refresh.list[2].begin_utc),String(begin));assert.equal(String(refresh.list[2].end_utc),String(begin+150));
  // Pure restore uses captured timestamps, never wall-clock validation.
  Date.now=()=>{throw new Error('No wall clock during dispatch normalization');};
  try{assert.deepEqual(normalizeDispatch(rawJournal),rawJournal);}finally{Date.now=()=>now*1000;}
  const stable=readFileSync(f.file);now=begin+86400;
  new ServerState('http://localhost',f.file,f.options('disabled'));assert.deepEqual(readFileSync(f.file),stable);now=begin;
  // Configuration changes affect future jobs, not captured old schedule/awards/pass.
  const drift={...f.policy,gold_per_run:777,entrust_second_per_cost:600,passes:{[f.auth.pvid]:{end_datetime:'2030-01-01 00:00:00',end_datetime_utc:1_893_456_000}}};
  const all=new ServerState('http://localhost',f.file,f.options('local-manda-all',drift));assert.deepEqual(readFileSync(f.file),stable);
  refuse(f.request(2),all);refuse(f.request(-1,8),all);
  const whole=f.ok('SkipEntrust',f.request(-1,3),all);assert.equal(whole.list.length,3);assert.deepEqual(whole.user,{free_iap_qty:0,iap_qty:17});
  const paid=read(f.file);assert.equal(paid.version,19);assert.deepEqual(paid.dispatches[0][1].active.row_skips,rows);
  assert.deepEqual(paid.dispatches[0][1].active.paid_finish,{completed_at:begin,charged_fee:3});assert.deepEqual(paid.dispatches[0][1].active.snapshot,original);
  const paidBytes=readFileSync(f.file);refuse(f.request(-1,3),all);refuse(f.request(2),all);assert.deepEqual(readFileSync(f.file),paidBytes);
  const restored=new ServerState('http://localhost',f.file,f.options('disabled',drift));
  assert.deepEqual(readFileSync(f.file),paidBytes);const end=f.ok('EndEntrust',{entrust_id:f.id},restored);
  assert.equal(end.result.gold.cur,beforeGame.gold+9);assert.equal(end.result.user_exp.cur,beforeGame.exp+15);
  assert.equal(end.result.card_exp[0].cur,21);assert.equal(end.result.item[0].added,6);
  const final=read(f.file);assert.equal(final.version,2);assert.equal(final.dispatches[0][1].active,null);
  assert.deepEqual(final.gameStates.find(([id]:any)=>id===f.peer.pvid),baseline.gameStates.find(([id]:any)=>id===f.peer.pvid));
  const finalBytes=readFileSync(f.file);assert.deepEqual(f.ok('EndEntrust',{entrust_id:f.id},restored).result.item,[]);assert.deepEqual(readFileSync(f.file),finalBytes);
  // Older headers and corrupt receipt histories must refuse before rewriting.
  const invalid=(name:string,change:(copy:any)=>void)=>{const file=path.join(directory,'bad-'+name+'.json'),copy=structuredClone(twice);change(copy);
    writeFileSync(file,JSON.stringify(copy));const bytes=readFileSync(file);assert.throws(()=>new ServerState('http://localhost',file,f.options('disabled')));assert.deepEqual(readFileSync(file),bytes);};
  for(let version=1;version<=18;version++)invalid('version-'+version,copy=>{copy.version=version;});
  invalid('empty19',copy=>{copy.dispatches[0][1].active.row_skips=[];});
  invalid('missing19',copy=>{delete copy.dispatches[0][1].active.row_skips;});
  invalid('reordered',copy=>{copy.dispatches[0][1].active.row_skips.reverse();});
  invalid('duplicate',copy=>{copy.dispatches[0][1].active.row_skips.push(copy.dispatches[0][1].active.row_skips[0]);});
  invalid('future',copy=>{copy.dispatches[0][1].active.row_skips[0].serial=2;});
  invalid('fee',copy=>{copy.dispatches[0][1].active.row_skips[0].charged_fee=2;});
  invalid('before',copy=>{copy.dispatches[0][1].active.row_skips[0].completed_at=begin-1;});
  invalid('natural-end',copy=>{copy.dispatches[0][1].active.row_skips[0].completed_at=begin+150;});
  const n=fixture('natural');now=begin+160;
  assert.equal(n.call('EndEntrust',{entrust_id:n.id}).result_code,2001);
  const natural=n.ok('SkipEntrust',n.request(1));assert.equal(natural.list[0].serial,1);
  const nj=read(n.file).dispatches[0][1].active;assert.deepEqual(nj.row_skips,[{serial:1,completed_at:now,charged_fee:1}]);
  const nr=n.ok('RefreshEntrust',{entrust_id:n.id});assert.equal(String(nr.list[0].end_utc),String(begin+150));
  assert.equal(String(nr.list[2].begin_utc),String(now));assert.equal(String(nr.list[2].end_utc),String(now+150));
  assert.equal(n.call('EndEntrust',{entrust_id:n.id}).result_code,2001);
  n.ok('SkipEntrust',n.request(2));assert.equal(n.ok('EndEntrust',{entrust_id:n.id}).result.gold.cur,10009);
  console.log('Sequential dispatch row state: current-row1Manda, same-second replay/rebase, original schedule/no awards, null guards, write/rename rollback, schema19/corruption/modeoff restoration, config drift, natural completion and mixed compressed whole/End-once passed; LOCAL policy only.');
}finally{Date.now=clock;assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'blustone-dispatch-row-state-'));rmSync(directory,{recursive:true,force:true});}
