import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {cardInstance} from "../src/bootstrap.js";
import {parseEntrustEndResultJson} from "../src/expedition-entrust-end.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-paid-finish-state-")),realNow=Date.now;
const begin=1_800_000_000;let now=begin;Date.now=()=>now*1000;
try {
  const file=path.join(dir,"state.json"),seed=new ServerState("http://localhost",file,{dispatchMode:"disabled"});
  const actor=seed.registerGuest({device_id:"paid-finish-actor"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"paid-finish-peer"},{}).ret_data as any;
  seed.registerGuest({device_id:"paid-finish-third"},{});
  const initial=JSON.parse(readFileSync(file,"utf8"));
  for(const [,game] of initial.gameStates) {
    game.stage_achievements={n_01_01:[0],n_01_05:[2]};game.stage_stars={n_01_01:1,n_01_05:1};
    game.recruited_cards=[cardInstance(1000101,"001"),cardInstance(1000102,"002")];game.next_card_inst_id=1000103;
    game.decks.push({type:2,list:[1000101,1000102,0,0,0]});game.gacha_free_qty=2;game.gacha_iap_qty=9;
  }
  writeFileSync(file,JSON.stringify(initial));const fixture=readFileSync(file);
  const auth={pvid:actor.pvid,otp:actor.otp,app_code:"_SR",app_ver:"28010",market:"GOOGLE"};
  const policy={max_runs:3,gold_per_run:7,user_exp_per_run:11,card_exp_per_run:13,skip_price:999,entrust_second_per_cost:100,
    items_per_run:[{ref_id:"AIRSHIP_TICKET",qty:2}],passes:{[actor.pvid]:{end_datetime:"1970-01-01 00:00:00",end_datetime_utc:0}}};
  const options={dispatchMode:"local-timed" as const,dispatchPolicy:policy,dispatchSkipMode:"local-manda-all" as const};
  let state=new ServerState("http://localhost",file,options);
  const call=(route:string,payload:Record<string,unknown>,target=state)=>gameResponse(target,"/mission/"+route,payload) as any;
  const start=()=>call("Entrust",{...auth,stage_id:"n_01_01",deck_type:"2",cnt:"2",is_tuto:"0"});
  const started=start();assert.equal(started.result_code,1);
  assert.deepEqual(started.ret_data.list.map((row:any)=>[row.begin_utc,row.end_utc]),[[begin,begin+150],[0,0]],"future queued rows cannot expose native Skip buttons");
  const game=()=> (state as any).gameByPvid.get(actor.pvid),journal=()=> (state as any).dispatches.get(actor.pvid);
  const captured=structuredClone(journal().active),snapshot=structuredClone(captured.snapshot),id=snapshot.entrust_id;
  const paidRequest={...auth,entrust_id:id,serial:"-1",use_iap_qty:"4",is_tuto:"0",is_iap_pass:"0"};
  const skip=(extra:Record<string,unknown>={},target=state)=>call("SkipEntrust",{...paidRequest,...extra},target);
  const pending=readFileSync(file),postStart=structuredClone(game()),pendingRef=journal(),itemsRef=game().items,cardsRef=game().recruited_cards;
  const disabled=new ServerState("http://localhost",file,{dispatchMode:"local-timed",dispatchPolicy:policy});
  assert.notEqual(skip({},disabled).result_code,1);assert.equal(skip({},disabled).ret_data,null);
  const absent=call("SkipEntrust",{});assert.notEqual(absent.result_code,1);assert.equal(absent.ret_data,null);
  for(const extra of [{otp:"wrong-dummy-otp"},{pvid:peer.pvid,otp:peer.otp},{entrust_id:"1"},{serial:"0"},{serial:"1"},
    {use_iap_qty:"3"},{use_iap_qty:"5"},{is_tuto:"1"},{is_iap_pass:"1"},{gold:999},{cnt:2},{pass:{end_datetime_utc:0}}]) {
    const refusal=skip(extra);assert.notEqual(refusal.result_code,1);assert.equal(refusal.ret_data,null);
    assert.deepEqual(game(),postStart);assert.equal(journal(),pendingRef);assert.deepEqual(readFileSync(file),pending);
  }
  for(const wallet of [[0,3],[0xffff_ffff,1],[-1,9],[2,0x1_0000_0000]]) {
    game().gacha_free_qty=wallet[0];game().gacha_iap_qty=wallet[1];const before=structuredClone(game());
    const refused=skip();assert.notEqual(refused.result_code,1);assert.equal(refused.ret_data,null);
    assert.deepEqual(game(),before);assert.equal(journal(),pendingRef);assert.deepEqual(readFileSync(file),pending);
  }
  game().gacha_free_qty=2;game().gacha_iap_qty=9;
  mkdirSync(file+".tmp");assert.throws(()=>skip());rmdirSync(file+".tmp");
  assert.deepEqual(game(),postStart);assert.equal(game().items,itemsRef);assert.equal(game().recruited_cards,cardsRef);assert.equal(journal(),pendingRef);
  const blocked=path.join(dir,"rename-blocked");mkdirSync(blocked);(state as any).stateFile=blocked;
  assert.throws(()=>skip(),/EISDIR|EPERM|EEXIST|rename/);(state as any).stateFile=file;
  assert.deepEqual(game(),postStart);assert.equal(game().items,itemsRef);assert.equal(journal(),pendingRef);assert.deepEqual(readFileSync(file),pending);
  const accepted=skip();assert.equal(accepted.result_code,1);
  assert.deepEqual(accepted.ret_data.user,{iap_qty:7,free_iap_qty:0});assert.equal(accepted.ret_data.skip_price,999);
  assert.deepEqual(accepted.ret_data.list,snapshot.list.map((row:any)=>({...row,end_utc:String(now)})));
  assert.equal(accepted.ret_data.list[1].begin_utc,snapshot.list[1].begin_utc,"paid projection preserves original future begin");
  const expected=structuredClone(postStart);expected.gacha_free_qty=0;expected.gacha_iap_qty=7;
  assert.deepEqual(game(),expected,"Skip changes only actual Manda; AP/gold/EXP/items/stars/cards stay exact");
  assert.deepEqual(journal().active.snapshot,snapshot,"original immutable captured snapshot is never accelerated in place");
  assert.deepEqual(journal().active.paid_finish,{completed_at:now,charged_fee:4});
  const paidBytes=readFileSync(file),paid=JSON.parse(paidBytes.toString());assert.equal(paid.version,18);assert.deepEqual(paid.quests,[]);
  for(const entry of paid.gameStates.filter(([pvid]:[number])=>pvid!==actor.pvid))assert.deepEqual(entry,initial.gameStates.find(([pvid]:[number])=>pvid===entry[0]));
  assert.deepEqual(paid.accounts,initial.accounts);
  const duplicate=skip();assert.notEqual(duplicate.result_code,1);assert.equal(duplicate.ret_data,null);assert.deepEqual(readFileSync(file),paidBytes);
  assert.deepEqual(journal().active.snapshot,snapshot);assert.deepEqual(game(),expected);
  // Current configuration can change future jobs; it cannot retune this capture.
  const futurePolicy=new ServerState("http://localhost",file,{...options,dispatchPolicy:{...policy,entrust_second_per_cost:200}});
  assert.deepEqual((futurePolicy as any).dispatches.get(actor.pvid).active,journal().active);assert.deepEqual(readFileSync(file),paidBytes);
  for(const mutate of [(s:any)=>{s.version=17;},(s:any)=>{delete s.dispatches[0][1].active.paid_finish;},
    (s:any)=>{s.dispatches[0][1].active.paid_finish.charged_fee++;},
    (s:any)=>{s.dispatches[0][1].active.paid_finish.completed_at=begin-1;},
    (s:any)=>{s.dispatches[0][1].active.paid_finish.completed_at=begin+300;},
    (s:any)=>{s.dispatches[0][1].active.snapshot.entrust_second_per_cost=200;},
    (s:any)=>{s.dispatches[0][1].active.pass.end_datetime_utc=begin+1;}]) {
    const corrupt=structuredClone(paid);mutate(corrupt);writeFileSync(file,JSON.stringify(corrupt));const bytes=readFileSync(file);
    assert.throws(()=>new ServerState("http://localhost",file,options));assert.deepEqual(readFileSync(file),bytes);
  }
  writeFileSync(file,paidBytes);
  const laterFile=path.join(dir,"later-paid.json");writeFileSync(laterFile,paidBytes);now=begin+10000;
  const later=new ServerState("http://localhost",laterFile,{dispatchMode:"disabled",dispatchSkipMode:"disabled"});
  assert.deepEqual((later as any).dispatches.get(actor.pvid).active.paid_finish,{completed_at:begin,charged_fee:4});
  assert.deepEqual(readFileSync(laterFile),paidBytes,"later wall clock must not invalidate or rewrite canonical paid timestamp");now=begin;
  state=new ServerState("http://localhost",file,{dispatchMode:"disabled",dispatchSkipMode:"disabled"});
  const offJournal=structuredClone(journal()),offGame=structuredClone(game());
  const hydrated=gameResponse(state,"/lobby/GetMissionInst",auth) as any;assert.equal(hydrated.result_code,1);
  const paidWireList=snapshot.list.map((row:any)=>({...row,begin_utc:Number(row.begin_utc),end_utc:begin}));
  assert.deepEqual(hydrated.ret_data.entrust.list,paidWireList);
  assert.deepEqual(journal(),offJournal);assert.deepEqual(game(),offGame);assert.deepEqual(readFileSync(file),paidBytes);
  const deniedOff=skip();assert.notEqual(deniedOff.result_code,1);assert.equal(deniedOff.ret_data,null);
  state=new ServerState("http://localhost",file,{dispatchMode:"local-timed",dispatchPolicy:policy,dispatchSkipMode:"disabled"});
  const refresh=call("RefreshEntrust",{...auth,entrust_id:id});assert.equal(refresh.result_code,1);
  assert.deepEqual(refresh.ret_data.list,paidWireList);
  const ended=call("EndEntrust",{...auth,entrust_id:id});assert.equal(ended.result_code,1);
  const result=parseEntrustEndResultJson(JSON.stringify(ended.ret_data.result));
  assert.deepEqual(result.gold,{prev:10000,cur:10014});assert.deepEqual([result.user_exp.prev,result.user_exp.cur],[0,22]);
  assert.equal(result.item[0].added,4);assert.equal(result.item[0].ref_id,"AIRSHIP_TICKET");
  assert.deepEqual(result.card_exp.map(row=>[row.prev,row.cur]),[[0,26],[0,26]]);assert.equal(result.user_exp.ap.cur,48);
  assert.equal(journal().active,null);assert.equal(journal().last_id,id);assert.equal(JSON.parse(readFileSync(file,"utf8")).version,2);
  const final=readFileSync(file),finalGame=structuredClone(game());
  assert.deepEqual([game().gacha_free_qty,game().gacha_iap_qty],[0,7]);assert.deepEqual(game().stage_achievements,postStart.stage_achievements);
  const replay=call("EndEntrust",{...auth,entrust_id:id});assert.equal(replay.result_code,1);assert.deepEqual(replay.ret_data.result.item,[]);
  assert.deepEqual(readFileSync(file),final);assert.deepEqual(game(),finalGame);
  assert.notEqual(skip().result_code,1);assert.equal(skip().ret_data,null);assert.deepEqual(readFileSync(file),final);

  // Natural expiry cannot be charged, even though native zero-dividend quote is1.
  const naturalFile=path.join(dir,"natural.json");writeFileSync(naturalFile,pending);now=begin+300;
  const natural=new ServerState("http://localhost",naturalFile,options),naturalBefore=readFileSync(naturalFile);
  const noWork=skip({use_iap_qty:1},natural);assert.notEqual(noWork.result_code,1);assert.equal(noWork.ret_data,null);
  assert.deepEqual(readFileSync(naturalFile),naturalBefore);now=begin;

  // Real one-time tutorial journal17 survives paid dispatch18 and End fallback17.
  const cohortFile=path.join(dir,"cohort.json");writeFileSync(cohortFile,fixture);
  const json=(name:string)=>JSON.parse(readFileSync(`config/policies/fishing-practice-${name}.json`,"utf8"));
  const cohortOptions={...options,baitShopMode:"archive-2018-projection" as const,baitShopDailyLimit:3,
    fishingItems:json("items"),fishingCatalogue:json("catalogue"),fishingTutorialMode:"local-first-catch" as const,fishingTutorialPolicy:json("tutorial")};
  const cohort=new ServerState("http://localhost",cohortFile,cohortOptions);
  assert.equal((gameResponse(cohort,"/fishing/EndWithSell",{...auth,log_id:"-1",is_win:"1"}) as any).result_code,1);
  const tutorial=JSON.parse(readFileSync(cohortFile,"utf8"));assert.equal(tutorial.version,17);
  assert.equal(call("Entrust",{...auth,stage_id:"n_01_01",deck_type:"2",cnt:"2",is_tuto:"0"},cohort).result_code,1);
  const cohortId=(cohort as any).dispatches.get(actor.pvid).active.snapshot.entrust_id;
  assert.equal(skip({entrust_id:cohortId},cohort).result_code,1);assert.equal(JSON.parse(readFileSync(cohortFile,"utf8")).version,18);
  assert.equal(call("EndEntrust",{...auth,entrust_id:cohortId},cohort).result_code,1);
  const cohortDone=JSON.parse(readFileSync(cohortFile,"utf8"));assert.equal(cohortDone.version,17);
  assert.deepEqual(cohortDone.fishingTutorials,tutorial.fishingTutorials);
  for(const entry of cohortDone.gameStates.filter(([pvid]:[number])=>pvid!==actor.pvid))assert.deepEqual(entry,tutorial.gameStates.find(([pvid]:[number])=>pvid===entry[0]));
} finally {Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Paid whole-job dispatch state: strict/null admission, wallet-only free-first Skip, immutable schedule/schema18, rollback/corrupt restore, cold projections, End once/fallback2 and actual tutorial17 coexist PASS; no native gameplay claim.");
