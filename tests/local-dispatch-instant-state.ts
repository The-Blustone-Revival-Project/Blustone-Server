import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
import {cardInstance} from "../src/bootstrap.js";
import {parseEntrustEndResultJson} from "../src/expedition-entrust-end.js";
import {trainingCurve} from "../src/training.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-instant-dispatch-")),realNow=Date.now;
const now=1_800_000_000;Date.now=()=>now*1000;
try {
  const file=path.join(dir,"state.json"),initial=new ServerState("http://localhost",file,{dispatchMode:"disabled"});
  const actor=initial.registerGuest({device_id:"instant-dispatch-author"},{}).ret_data as any;
  const peer=initial.registerGuest({device_id:"instant-dispatch-peer"},{}).ret_data as any;
  initial.registerGuest({device_id:"instant-dispatch-third"},{});
  const saved=JSON.parse(readFileSync(file,"utf8"));
  for(const [,game] of saved.gameStates) {
    game.stage_achievements={n_01_01:[0],n_01_05:[2]};game.stage_stars={n_01_01:1,n_01_05:1};
    game.recruited_cards=[cardInstance(1000101,"001"),cardInstance(1000102,"002")];game.next_card_inst_id=1000103;
    game.decks.push({type:2,list:[1000101,1000102,0,0,0]});
    game.gacha_free_qty=17;game.gacha_iap_qty=23;
  }
  writeFileSync(file,JSON.stringify(saved));const baseline=readFileSync(file);
  const pass={end_datetime:"2027-01-15 09:00:00",end_datetime_utc:now+3600};
  const policy={max_runs:3,gold_per_run:7,user_exp_per_run:11,card_exp_per_run:13,skip_price:999,entrust_second_per_cost:60,
    items_per_run:[{ref_id:"AIRSHIP_TICKET",qty:2}],passes:{[actor.pvid]:pass}};
  const options={dispatchMode:"local-timed" as const,dispatchPolicy:policy,dispatchInstantMode:"local-entitled" as const};
  const state=new ServerState("http://localhost",file,options),game=(state as any).gameByPvid.get(actor.pvid);
  const body={pvid:actor.pvid,otp:actor.otp,app_code:"_SR",app_ver:"28010",market:"GOOGLE",deck_type:"2",stage_id:"n_01_01",cnt:"2"};
  const run=(extra={},target=state)=>gameResponse(target,"/mission/EntrustByIAP",{...body,...extra}) as any;
  const original=structuredClone(game),originalItems=game.items,originalCards=game.recruited_cards;
  assert.throws(()=>new ServerState("http://localhost",file,{...options,dispatchInstantMode:"invalid" as any}),/Unknown instant/);
  assert.throws(()=>new ServerState("http://localhost",file,{...options,dispatchMode:"disabled"}),/requires configured/);
  assert.deepEqual(readFileSync(file),baseline,"enabling instant mode must not create a pass, job or award");
  const defaultOff=new ServerState("http://localhost",file,{dispatchMode:"local-timed",dispatchPolicy:policy});
  assert.equal(run({},defaultOff).result_code,2001,"default instant mode stays disabled");
  assert.equal(run({},initial).result_code,2001);
  for(const expiry of [now-1,now]) {
    const expired=new ServerState("http://localhost",file,{...options,dispatchPolicy:{...policy,
      passes:{[actor.pvid]:{...pass,end_datetime_utc:expiry}}}});
    assert.equal(run({},expired).result_code,2001,"native IsHavingAutoPassIAP uses strict expiry > now; equality is expired");
  }
  const missing=new ServerState("http://localhost",file,{...options,dispatchPolicy:{...policy,passes:{}}});
  assert.equal(run({},missing).result_code,2001);
  assert.equal(run({pvid:peer.pvid,otp:peer.otp}).result_code,2001,"another account cannot borrow the actor's configured entitlement");
  for(const extra of [{cnt:"0"},{cnt:"4"},{cnt:true},{deck_type:"1"},{stage_id:"missing"},
    {is_tuto:"0"},{is_iap_pass:"1"},{pass},{end_datetime_utc:now+86400},{use_iap_qty:0},{gold:999}])
    assert.equal(run(extra).result_code,2001,"request has no client pass/price/reward producer fields");
  assert.deepEqual(game,original);assert.deepEqual(readFileSync(file),baseline);
  game.ap=0;const unfunded=structuredClone(game);
  assert.equal(run().result_code,2001);assert.deepEqual(game,unfunded);assert.deepEqual(readFileSync(file),baseline);
  game.ap=original.ap;

  mkdirSync(file+".tmp");assert.throws(()=>run());rmdirSync(file+".tmp");
  assert.deepEqual(game,original);assert.equal(game.items,originalItems);assert.equal(game.recruited_cards,originalCards);
  assert.equal((state as any).dispatches.size,0);assert.deepEqual(readFileSync(file),baseline);
  const blocked=path.join(dir,"blocked-destination");mkdirSync(blocked);(state as any).stateFile=blocked;
  assert.throws(()=>run(),/EISDIR|EPERM|EEXIST|rename/);(state as any).stateFile=file;
  assert.deepEqual(game,original);assert.equal(game.items,originalItems);assert.equal(game.recruited_cards,originalCards);
  assert.equal((state as any).dispatches.size,0);assert.deepEqual(readFileSync(file),baseline,"real rename failure rolls back the entire instant operation");

  const first=run();assert.equal(first.result_code,1);
  assert.deepEqual(Object.keys(first.ret_data).sort(),["end","entrust","skip"]);
  const start=first.ret_data.entrust.data,skip=first.ret_data.skip.data,end=first.ret_data.end.data;
  assert.equal(start.cnt,2);assert.equal(start.stage_id,"n_01_01");assert.equal(start.complete_second,150);
  assert.equal(start.user.ap,48);assert.equal(start.list.length,2);
  assert.deepEqual(JSON.parse(start.list[0].item),["AIRSHIP_TICKET","AIRSHIP_TICKET"]);
  assert.equal(skip.skip_price,999,"configured captured preview is not a Manda debit");
  assert.deepEqual([skip.user.iap_qty,skip.user.free_iap_qty],[23,17]);assert.equal(skip.list.length,2);
  assert.equal(end.user,null);
  const result=parseEntrustEndResultJson(JSON.stringify(end.result));
  assert.deepEqual(result.gold,{prev:10000,cur:10014});assert.deepEqual([result.user_exp.prev,result.user_exp.cur],[0,22]);
  assert.equal(result.user_exp.ap.cur,48);assert.deepEqual(result.card_exp.map(row=>[row.prev,row.cur]),[[0,26],[0,26]]);
  assert.equal(result.item.length,1);assert.equal(result.item[0].ref_id,"AIRSHIP_TICKET");assert.equal(result.item[0].added,4);
  const journal=(state as any).dispatches.get(actor.pvid),id=journal.last_id;
  assert.equal(journal.active,null);assert.deepEqual(journal.last_deck,[1000101,1000102]);
  assert.deepEqual(Object.keys(journal).sort(),["active","last_deck","last_id"]);
  assert.ok(/^[1-9]\d*$/.test(id)&&BigInt(id)<=0xffff_ffff_ffff_ffffn);
  assert.ok(JSON.stringify(start).includes('"entrust_id":'+id),"full64 job identity must use exact JSON integer token");
  assert.equal(game.ap,48);assert.equal(game.gold,10014);assert.equal(game.exp,22);
  assert.deepEqual([game.gacha_free_qty,game.gacha_iap_qty],[17,23],"pass branch charges no additional Manda under explicit LOCAL policy");
  const expected=structuredClone(original);expected.ap=48;expected.gold=10014;expected.exp=22;
  expected.recruited_cards.forEach((card:any)=>{card.exp=26;});
  const capsule=expected.items.filter((row:any)=>row.ref_id==="AIRSHIP_TICKET"&&row.lock===0).sort((a:any,b:any)=>a.inst_id-b.inst_id)[0];
  if(capsule)capsule.qty+=4;
  else {expected.items.push({inst_id:expected.next_item_inst_id,ref_id:"AIRSHIP_TICKET",qty:4,lock:0});expected.next_item_inst_id++;}
  assert.deepEqual(game,expected,"only actual AP/EXP/gold/capsule acquisition changes");
  const durable=readFileSync(file),stored=JSON.parse(durable.toString());assert.equal(stored.version,2);
  for(const entry of stored.gameStates.filter(([pvid]:[number])=>pvid!==actor.pvid))
    assert.deepEqual(entry,saved.gameStates.find(([pvid]:[number])=>pvid===entry[0]),"both peer games remain exact");
  assert.deepEqual(stored.accounts,saved.accounts,"no credentials/account mutation in game operation");
  for(const mutate of [(g:any)=>{g.gold=0xffff_ffff;},(g:any)=>{g.items.find((row:any)=>row.ref_id==="AIRSHIP_TICKET"&&row.lock===0).qty=0xffff_ffff;}]) {
    const restore=structuredClone(game);mutate(game);const refusalGame=structuredClone(game),journalRef=(state as any).dispatches.get(actor.pvid);
    assert.equal(run().result_code,2001);assert.deepEqual(game,refusalGame);assert.equal((state as any).dispatches.get(actor.pvid),journalRef);
    assert.deepEqual(readFileSync(file),durable,"overflow cannot commit AP debit, earlier EXP growth or a new terminal ID");Object.assign(game,restore);
  }

  // End replay repairs current absolute snapshots, with no additive items.
  const replay=gameResponse(state,"/mission/EndEntrust",{...actor,entrust_id:id}) as any;
  assert.equal(replay.result_code,1);assert.deepEqual(replay.ret_data.result.item,[]);
  assert.deepEqual(replay.ret_data.result.gold,{prev:10014,cur:10014});assert.deepEqual(readFileSync(file),durable);
  const off=new ServerState("http://localhost",file,{dispatchMode:"disabled",dispatchInstantMode:"disabled"});
  assert.deepEqual((off as any).gameByPvid.get(actor.pvid),game);assert.deepEqual((off as any).dispatches.get(actor.pvid),journal);
  assert.equal(run({},off).result_code,2001);assert.deepEqual(readFileSync(file),durable,"cold disabled mode must retain terminal journal/game without rewriting");
  const restart=new ServerState("http://localhost",file,options),repeat=run({},restart);
  assert.equal(repeat.result_code,1,"funded repeated request is NEW work; original payload has no nonce");
  const nextGame=(restart as any).gameByPvid.get(actor.pvid),nextJournal=(restart as any).dispatches.get(actor.pvid);
  assert.notEqual(nextJournal.last_id,id);assert.equal(nextJournal.active,null);assert.equal(nextGame.ap,46);
  assert.equal(nextGame.gold,10028);assert.equal(nextGame.exp,44);assert.deepEqual([nextGame.gacha_free_qty,nextGame.gacha_iap_qty],[17,23]);
  assert.deepEqual(nextGame.stage_achievements,original.stage_achievements);assert.deepEqual(nextGame.stage_stars,original.stage_stars);
  const capped=trainingCurve(nextGame.recruited_cards[1])!.maxExp;
  nextGame.recruited_cards[0].exp=capped+100;nextGame.recruited_cards[1].exp=capped-1;
  const capResult=run({cnt:"1"},restart);assert.equal(capResult.result_code,1);
  assert.deepEqual(capResult.ret_data.end.data.result.card_exp.map((row:any)=>[row.prev,row.cur]),[[capped+100,capped+100],[capped-1,capped]],"preserve over-cap EXP and cap newly earned growth");

  const activeFile=path.join(dir,"active.json");writeFileSync(activeFile,baseline);
  const active=new ServerState("http://localhost",activeFile,options);
  assert.equal((gameResponse(active,"/mission/Entrust",{...body,is_tuto:"0"}) as any).result_code,1);
  const activeBytes=readFileSync(activeFile),activeGame=structuredClone((active as any).gameByPvid.get(actor.pvid)),activeJournal=(active as any).dispatches.get(actor.pvid);
  assert.equal(run({},active).result_code,2001);assert.deepEqual(readFileSync(activeFile),activeBytes);
  assert.deepEqual((active as any).gameByPvid.get(actor.pvid),activeGame);assert.equal((active as any).dispatches.get(actor.pvid),activeJournal);
} finally {Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Entitled instant dispatch: strict pass expiry, auth/request gates, compound receipt, actual AP/EXP/capsule settlement, unchanged Manda/peers/stars, real rollback, cold mode-off/repeat-new-work PASS; supplied pass and rewards are LOCAL fixtures.");
