import assert from "node:assert/strict";
import crypto from "node:crypto";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
import {castOptions,castContext,castFish} from "./fishing-casts-fixture.js";
import {polishRefs,polishPrices,suppliedGem,polishPolicy} from "./gem-polish-fixture.js";

Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8")).env);
const {ServerState}=await import("../src/state.js"),{gameResponse}=await import("../src/game-routes.js");
const {cardInstance,starterReference}=await import("../src/bootstrap.js");

// These standalone regressions have no exported Mirage factory. Keep the same
// authored floor/graph as fishing-casts-cohorts, without importing its side effects.
const rank=Math.max(3,starterReference.find(row=>row.base.id==="003")!.stat[0].rank);
const enemy={ref_id:"003",hp_percent:10000,rank,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:rank>=4?1:0,skill_5_level:rank>=5?1:0};
const floor=(floor:number)=>({enrollment:"rank-exp-id-projection",floor,bg_res:"MIRAGE_BG_G",dlg_begin:"",dlg_end:"",
  res_prefix:"MRG",res_postfix_list:["002"],stairs:Array.from({length:floor>=21?6:3},(_,i)=>({grade:i%4,balance:10000,enemies:[enemy],gold:i+1})),
  hero:{bonus:0,end_ltime:2_000_000_000,cur:[],next:[]},revive_prices:[3]});
const mirageOptions={mirageMode:"local-configured" as const,miragePolicy:floor(1),mirageReentryPolicy:{payment:"free-local",daily_attempts:2,
  day_offset_minutes:0,on_unavailable:"abandon-local",floors:[floor(21)],
  transitions:[{floor:1,cleared:21,failed:1},{floor:21,cleared:21,failed:1}]}};
const directory=mkdtempSync(path.join(tmpdir(),"blustone-polish-cohorts-")),file=path.join(directory,"state.json"),clock=Date.now;
Date.now=()=>1_800_000_000_000;
try {
  const initial=new ServerState("http://localhost",file,mirageOptions);
  const actorRaw=initial.registerGuest({device_id:"polish-cohort-owner"},{}).ret_data as any;
  const actor={pvid:actorRaw.pvid,otp:actorRaw.otp};
  const peerRaw=initial.registerGuest({device_id:"polish-cohort-peer"},{}).ret_data as any;
  const peer={pvid:peerRaw.pvid,otp:peerRaw.otp};
  const game=(initial as any).gameByPvid.get(actor.pvid);
  game.starter_cards=[cardInstance(1000001,"003",rank)];game.recruited_cards=[];game.leader_inst_id=1000001;
  game.next_card_inst_id=1000002;game.decks=[{type:1,list:[1000001,0,0,0,0]}];
  game.card_book=[...game.card_book.filter((row:any)=>row.ref_id!=="003"),{ref_id:"003",rank}];
  game.gacha_free_qty=20;game.gacha_iap_qty=10;
  const baitId=4_294_967_321;
  game.items=[{inst_id:baitId,ref_id:"LU003",qty:12,lock:0}];game.next_item_inst_id=baitId+1;
  game.ap=1;game.bp=1;game.ap_updated_at=Date.now()-86_400_000;game.bp_updated_at=game.ap_updated_at;
  (initial as any).persist();
  const mirage=(name:string,extra:object={})=>initial.mirageAction("/mirage/"+name,{...actor,...extra},{}) as any;
  const end=()=>mirage("End",{floor:"1",stair:"1",remain_deck_hp:JSON.stringify([{inst_id:1000001,hp_percent:0}]),remain_enemy_hp:"[5000]"});
  assert.equal(mirage("GetInfo").result_code,1);
  assert.equal(mirage("RegisterDeck",{inst_list:"[1000001]"}).result_code,1);{const result=end();assert.equal(result.result_code,1,JSON.stringify(result));}
  assert.equal(mirage("Revive",{target_inst_id:1000001}).result_code,1);
  assert.equal(mirage("GetNextFloor").ret_data.next_floor,1);assert.equal(mirage("GetInfo",{reset:"1",stay:"1"}).result_code,1);
  assert.equal(mirage("RegisterDeck",{inst_list:"[1000001]"}).result_code,1);{const result=end();assert.equal(result.result_code,1,JSON.stringify(result));}
  assert.equal(mirage("Revive",{target_inst_id:1000001}).result_code,1);
  // A real quota-exhausted abandon releases Mirage commitments before polishing.
  assert.equal(mirage("GetNextFloor").ret_data.next_floor,1);assert.equal(mirage("GetInfo",{reset:"1",stay:"1"}).result_code,1);
  const captured=JSON.parse(readFileSync(file,"utf8"));assert.equal(captured.version,14);
  assert.equal(captured.mirageRuns[0][1].abandoned,true);
  assert.deepEqual(captured.mirageSeries[0][1].history[0].revive_ids,[1000001]);
  assert.deepEqual(captured.mirageRuns[0][1].revive_ids,[1000001]);
  const account=captured.accounts.find((row:any)=>row.pvid===actor.pvid),owned=captured.gameStates.find(([id]:any)=>id===actor.pvid)[1];
  // Explicit imported inventory/earlier cohorts; Mirage and fishing journals
  // themselves below are generated only through their real handlers.
  owned.gold=1000;owned.owned_gems=[suppliedGem()];
  account.arenaComments={start_message:"Begin",win_message:"Done",lose_message:"Again"};
  account.baitShopCounter={day:20000,buy_cnt:1};account.profileSettings={info_message:"Preserve cohorts",rename_count:1};
  account.rupeeShopCounter={day:20000,manda:1,coupon:0};
  owned.dorm_expansion={capacity:103,manda:1,gold:0};owned.fuel_shop={day:20000,manda:0,gold:0,coupon:1};owned.bp_shop={day:20000,manda:0,gold:1,coupon:0};
  captured.guilds=[{id:1,name:"Polish cohort",desc:"Authored established Guild",type:1,fc_point_limit:0,region:"EN",emblem_id:"GD_IMG_1",
    contribution:100,rank:0,gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[
      {pvid:peer.pvid,role:1,newbie:0,contribution:100,fc_point:0},{pvid:actor.pvid,role:3,newbie:0,contribution:0,fc_point:0}]}];
  writeFileSync(file,JSON.stringify(captured));
  const options={...mirageOptions,...castOptions(),gemReferences:polishRefs,gemLevelPrices:polishPrices,
    gemPolishMode:"local-supplied-sequence" as const,gemPolishPolicy:polishPolicy(actor.pvid),
    guildLevelBenefits:[{level:0,contribution:0},{level:1,contribution:100,gem_level_up:500}]};
  const state=new ServerState("http://localhost",file,options);
  const fishing=(s:typeof state,name:string,extra:object={})=>gameResponse(s,"/fishing/"+name,{...actor,...extra}) as any;
  assert.equal(fishing(state,"Begin",castContext).result_code,1);assert.equal(JSON.parse(readFileSync(file,"utf8")).version,15);
  assert.equal(fishing(state,"EndWithSell",{log_id:"1",is_win:"1"}).result_code,1);
  const beforePolish=JSON.parse(readFileSync(file,"utf8")),beforeBytes=readFileSync(file);
  assert.equal(beforePolish.version,15);assert.deepEqual(beforePolish.gameStates[0][1].owned_fish,[{fish_id:castFish.id,b_cnt:1,s_cnt:0,g_cnt:0}]);
  const polish=(s:typeof state,max_tries=1)=>gameResponse(s,"/gem/LevelUp",{...actor,inst_id:suppliedGem().inst_id,max_tries}) as any;
  const missingGuild=new ServerState("http://localhost",file,{...options,guildLevelBenefits:undefined});
  assert.equal(polish(missingGuild).result_code,2001);assert.deepEqual(readFileSync(file),beforeBytes);
  const first=polish(state);assert.equal(first.result_code,1);assert.equal(first.ret_data.tries,1);
  assert.equal(first.ret_data.user.gold.cur,995,"Guild TYPE2 uses aggregate100 and multiplier500, not owner's personal0 or raw10");
  const firstBytes=readFileSync(file),firstSnapshot=JSON.parse(firstBytes.toString());assert.equal(firstSnapshot.version,16);
  const verifyOlder=(snapshot:any)=>{
    assert.equal(snapshot.version,16);
    for(const key of ["mirageRuns","mirageSeries","fishingCasts","guilds","dispatches","quests","transportKeys","sessionBindings"])
      assert.deepEqual(snapshot[key],beforePolish[key],key);
    assert.deepEqual(snapshot.accounts,beforePolish.accounts,"Prior preferences/counters/credentials untouched by polishing");
    const original=beforePolish.gameStates.find(([id]:any)=>id===actor.pvid)[1],actual=snapshot.gameStates.find(([id]:any)=>id===actor.pvid)[1];
    assert.deepEqual({...actual,gold:original.gold,owned_gems:original.owned_gems},original,"No AP/BP/roster/Manda/earlier cohort side effect");
    assert.deepEqual(snapshot.gameStates.find(([id]:any)=>id===peer.pvid),beforePolish.gameStates.find(([id]:any)=>id===peer.pvid));
  };
  verifyOlder(firstSnapshot);
  const restored=new ServerState("http://localhost",file,options);assert.deepEqual(readFileSync(file),firstBytes);
  assert.equal(polish(restored,10).ret_data.tries,2);
  let current=JSON.parse(readFileSync(file,"utf8"));verifyOlder(current);
  assert.equal(current.gameStates[0][1].gold,985);assert.deepEqual(current.gameStates[0][1].owned_gems,[suppliedGem(2,0,"250")]);
  assert.equal(polish(restored).ret_data.user.gold.cur,978,"Next-level raw15 becomes truncated Guild fee7");
  current=JSON.parse(readFileSync(file,"utf8"));verifyOlder(current);
  const retainedJournal=structuredClone(current.gemPolishJournals),retainedGames=structuredClone(current.gameStates);
  assert.equal(restored.confirmNickname({...peer,nick_name:"Gem Cohort Peer"},{}).result_code,1);
  const ordinary=JSON.parse(readFileSync(file,"utf8"));assert.deepEqual(ordinary.gameStates,retainedGames);
  assert.deepEqual(ordinary.gemPolishJournals,retainedJournal);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","guilds","dispatches","quests"])
    assert.deepEqual(ordinary[key],beforePolish[key]);
  const durable=readFileSync(file),disabled=new ServerState("http://localhost",file,{...options,mirageMode:"disabled",miragePolicy:undefined,
    mirageReentryPolicy:undefined,fishingCastMode:"disabled",fishingCastPolicy:undefined,gemPolishMode:"disabled",gemPolishPolicy:undefined});
  assert.deepEqual(readFileSync(file),durable);assert.equal(polish(disabled).result_code,2001);
  assert.deepEqual(fishing(disabled,"GetRecord").ret_data,[{fish_id:castFish.id,grade:1,length:100}]);assert.deepEqual(readFileSync(file),durable);
  disabled.registerGuest({device_id:"gem-cohort-unrelated-save"},{});
  const final=JSON.parse(readFileSync(file,"utf8"));assert.equal(final.version,16);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","guilds","dispatches","quests"])
    assert.deepEqual(final[key],ordinary[key]);
  assert.deepEqual(final.gameStates.filter(([id]:any)=>id===actor.pvid||id===peer.pvid),ordinary.gameStates);
  for(const expected of ordinary.accounts)assert.deepEqual(final.accounts.find((a:any)=>a.pvid===expected.pvid),expected);
  const good=readFileSync(file),old=JSON.parse(good.toString());old.version=15;const bad=JSON.stringify(old);writeFileSync(file,bad);
  assert.throws(()=>new ServerState("http://localhost",file,options));assert.equal(readFileSync(file,"utf8"),bad);writeFileSync(file,good);
  // Schema17 adds a genuine first tutorial catch for the uncaught peer while
  // preserving the owner's real schema14/15/16 work and every earlier cohort.
  const tutorialOptions={...options,fishingTutorialMode:"local-first-catch" as const,
    fishingTutorialPolicy:{origin:"local-authored",stock:"new-stack-per-catch",bait_debit:"none-local",on_win:"sell",
      outcome:{fish_id:castFish.id,grade:1,length:10000}}};
  const tutorialState=new ServerState("http://localhost",file,tutorialOptions),beforeTutorial=JSON.parse(readFileSync(file,"utf8"));
  const tutorialResult=gameResponse(tutorialState,"/fishing/EndWithSell",{...peer,log_id:"-1",is_win:"1"}) as any;
  assert.equal(tutorialResult.result_code,1,JSON.stringify(tutorialResult));
  const withTutorial=JSON.parse(readFileSync(file,"utf8"));assert.equal(withTutorial.version,17);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","guilds","dispatches","quests","accounts","transportKeys","sessionBindings"])
    assert.deepEqual(withTutorial[key],beforeTutorial[key],key);
  assert.deepEqual(withTutorial.gameStates.find(([id]:any)=>id===actor.pvid),beforeTutorial.gameStates.find(([id]:any)=>id===actor.pvid));
  const tutorialBytes=readFileSync(file),tutorialOff=new ServerState("http://localhost",file,{...tutorialOptions,fishingTutorialMode:"disabled",fishingTutorialPolicy:undefined});
  assert.deepEqual(readFileSync(file),tutorialBytes);
  assert.deepEqual((gameResponse(tutorialOff,"/fishing/GetRecord",peer) as any).ret_data,[{fish_id:castFish.id,grade:1,length:10000}]);
  tutorialOff.confirmNickname({...peer,nick_name:"Tutorial Cohort Peer"},{});
  const final17=JSON.parse(readFileSync(file,"utf8"));assert.equal(final17.version,17);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","dispatches","quests"])
    assert.deepEqual(final17[key],withTutorial[key],key);
  assert.deepEqual(final17.gameStates,withTutorial.gameStates);
  // Exercise schema18 with every genuine prior14/15/16/17 cohort retained.
  const setup18=JSON.parse(readFileSync(file,"utf8")),actor18=setup18.gameStates.find(([id]:any)=>id===actor.pvid)[1];
  actor18.stage_achievements={...actor18.stage_achievements,n_01_01:[0],n_01_05:[0]};
  actor18.stage_stars={...actor18.stage_stars,n_01_01:1,n_01_05:1};
  actor18.decks.push({type:2,list:[1000001,0,0,0,0]});writeFileSync(file,JSON.stringify(setup18));
  const paidOptions={...tutorialOptions,dispatchMode:"local-timed" as const,dispatchSkipMode:"local-manda-all" as const,
    dispatchPolicy:{max_runs:1,gold_per_run:0,user_exp_per_run:0,card_exp_per_run:0,skip_price:1,entrust_second_per_cost:60,
      passes:{[actor.pvid]:{end_datetime:"1970-01-01 00:00:00",end_datetime_utc:0}}}};
  const paidState=new ServerState("http://localhost",file,paidOptions);
  assert.equal((gameResponse(paidState,"/mission/Entrust",{...actor,deck_type:2,stage_id:"n_01_01",cnt:1,is_tuto:0}) as any).result_code,1);
  const pending18=JSON.parse(readFileSync(file,"utf8")),job18=pending18.dispatches.find(([id]:any)=>id===actor.pvid)[1].active;
  const paid18=gameResponse(paidState,"/mission/SkipEntrust",{...actor,entrust_id:job18.snapshot.entrust_id,serial:-1,use_iap_qty:3,is_tuto:0,is_iap_pass:0}) as any;
  assert.equal(paid18.result_code,1,JSON.stringify(paid18));
  const captured18=JSON.parse(readFileSync(file,"utf8"));assert.equal(captured18.version,18);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","quests","accounts"])
    assert.deepEqual(captured18[key],pending18[key],key);
  assert.deepEqual(captured18.gameStates.filter(([id]:any)=>id!==actor.pvid),pending18.gameStates.filter(([id]:any)=>id!==actor.pvid));
  assert.deepEqual(captured18.dispatches[0][1].active.snapshot,job18.snapshot);
  const paidBytes=readFileSync(file),modeOff18=new ServerState("http://localhost",file,{...paidOptions,dispatchSkipMode:"disabled"});
  assert.deepEqual(readFileSync(file),paidBytes);assert.equal((gameResponse(modeOff18,"/mission/EndEntrust",{...actor,entrust_id:job18.snapshot.entrust_id}) as any).result_code,1);
  const collected18=JSON.parse(readFileSync(file,"utf8"));assert.equal(collected18.version,17);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","quests","accounts"])
    assert.deepEqual(collected18[key],pending18[key],key);
  new ServerState("http://localhost",file,{...paidOptions,dispatchSkipMode:"disabled"});
  // Row compression adds schema19 without losing any earlier captured system.
  const sequentialOptions={...paidOptions,dispatchSkipMode:"local-manda-sequential" as const,
    dispatchPolicy:{...paidOptions.dispatchPolicy,max_runs:3}};
  const sequential=new ServerState("http://localhost",file,sequentialOptions);
  assert.equal((gameResponse(sequential,"/mission/Entrust",{...actor,deck_type:2,stage_id:"n_01_01",cnt:3,is_tuto:0}) as any).result_code,1);
  const beforeRows=JSON.parse(readFileSync(file,"utf8")),rowJob=beforeRows.dispatches.find(([id]:any)=>id===actor.pvid)[1].active;
  const rowRequest={...actor,entrust_id:rowJob.snapshot.entrust_id,serial:0,use_iap_qty:1,is_tuto:0,is_iap_pass:0};
  const rowReply=gameResponse(sequential,"/mission/SkipEntrust",rowRequest) as any;assert.equal(rowReply.result_code,1,JSON.stringify(rowReply));
  const afterRow=JSON.parse(readFileSync(file,"utf8"));assert.equal(afterRow.version,19);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","quests","accounts"])
    assert.deepEqual(afterRow[key],beforeRows[key],key);
  assert.deepEqual(afterRow.dispatches[0][1].active.snapshot,rowJob.snapshot);
  const coldRow=new ServerState("http://localhost",file,{...sequentialOptions,dispatchSkipMode:"local-manda-all"});
  const mixedReply=gameResponse(coldRow,"/mission/SkipEntrust",{...rowRequest,serial:-1,use_iap_qty:6}) as any;
  assert.equal(mixedReply.result_code,1,JSON.stringify(mixedReply));const afterMixed=JSON.parse(readFileSync(file,"utf8"));assert.equal(afterMixed.version,19);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","quests","accounts"])
    assert.deepEqual(afterMixed[key],beforeRows[key],key);
  assert.equal((gameResponse(coldRow,"/mission/EndEntrust",{...actor,entrust_id:rowJob.snapshot.entrust_id}) as any).result_code,1);
  const final19=JSON.parse(readFileSync(file,"utf8"));assert.equal(final19.version,17);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","quests","accounts"])
    assert.deepEqual(final19[key],beforeRows[key],key);
  assert.deepEqual(final19.gameStates.filter(([id]:any)=>id!==actor.pvid),beforeRows.gameStates.filter(([id]:any)=>id!==actor.pvid));
  new ServerState("http://localhost",file,{...sequentialOptions,dispatchSkipMode:"disabled"});
  // Genuine Guild support capture coexists with every previously exercised cohort.
  const fuel=new ServerState("http://localhost",file,{...sequentialOptions,guildChatMode:"local-memory",
    guildFuelMode:"local-requests",guildFuelRequestSeconds:3600,guildContributionPoints:{"1":0,"2":0,"3":0,"4":0}});
  const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
  const exchange=fuel.exchangeSecret({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")});
  const headers={"pv-accesstoken":exchange.accessToken,"x-pv-accesstoken":exchange.accessToken};
  fuel.accountFor(actor,headers);
  (fuel as any).persist(); // Authentication binding precedes the mutation baseline.
  const before20=JSON.parse(readFileSync(file,"utf8"));
  const event=fuel.guildFuelChat(headers,11010,"");
  const supported=gameResponse(fuel,"/guild/SupportFuel",{...peer,request_id:event.requestId}) as any;
  assert.equal(supported.result_code,1,JSON.stringify(supported));
  const after20=JSON.parse(readFileSync(file,"utf8"));assert.equal(after20.version,20);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","dispatches","quests","accounts","gameStates","transportKeys","sessionBindings"])
    assert.deepEqual(after20[key],before20[key],key);
  assert.equal(after20.guildFuelLedger.requests[0].supporters.length,1);
  const mixed20File=path.join(directory,"fuel-with-active-paid-rows.json");
  const mixed20={...after20,dispatches:afterMixed.dispatches,gameStates:afterMixed.gameStates};
  writeFileSync(mixed20File,JSON.stringify(mixed20));
  const mixed20Cold=new ServerState("http://localhost",mixed20File,{...sequentialOptions,dispatchSkipMode:"disabled",guildFuelMode:"disabled"});
  mixed20Cold.confirmNickname({...peer,nick_name:"Mixed Schema20 Peer"},{});
  const mixed20Saved=JSON.parse(readFileSync(mixed20File,"utf8"));assert.equal(mixed20Saved.version,20);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","dispatches","quests","gameStates","guildFuelLedger"])
    assert.deepEqual(mixed20Saved[key],mixed20[key],key);
  const cold20=new ServerState("http://localhost",file,{...sequentialOptions,guildFuelMode:"disabled"});
  assert.equal((gameResponse(cold20,"/guild/GetFuelRequests",actor) as any).ret_data.fuel_requests[0].supports,1);
  cold20.confirmNickname({...peer,nick_name:"Fuel Cohort Peer"},{});
  const retained20=JSON.parse(readFileSync(file,"utf8"));assert.equal(retained20.version,20);
  for(const key of ["mirageRuns","mirageSeries","fishingCasts","gemPolishJournals","fishingTutorials","guilds","dispatches","quests","gameStates","guildFuelLedger"])
    assert.deepEqual(retained20[key],after20[key],key);
} finally {Date.now=clock;rmSync(directory,{recursive:true,force:true});}
console.log("Gem polish cohorts: real Mirage schema14 current/archived paid aid and abandon → actual fishing schema15 → supplied Gem work schema16, Guild TYPE2 aggregate fees, restart/unrelated saves/modeoff and complete earlier-state retention passed.");
