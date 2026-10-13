import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-guild.json"),"utf8")).env);
const {ServerState}=await import("../src/state.js"),{gameResponse}=await import("../src/game-routes.js");
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-donate-"));
try {
  const file=path.join(dir,"state.json"),initial=new ServerState("http://localhost",file,{guildDonationMode:"disabled"});
  const users=Array.from({length:4},(_,i)=>initial.registerGuest({device_id:"donation-fixture"+i},{}).ret_data as any);
  const saved=JSON.parse(readFileSync(file,"utf8"));
  saved.gameStates[0][1].gold=2500;saved.gameStates[0][1].gacha_iap_qty=17;saved.gameStates[0][1].gacha_free_qty=19;
  saved.gameStates[1][1].gold=100000;
  const record={id:1,name:"Guild",desc:"Preserve",type:1,fc_point_limit:0,region:"EN",emblem_id:"GD_IMG_1",contribution:100,rank:7,gvg_win_cnt:8,gvg_inf_win_cnt:9,
    members:[{pvid:users[0].pvid,role:1,newbie:0,contribution:20,fc_point:30},{pvid:users[1].pvid,role:4,newbie:1,contribution:3,fc_point:40}],
    banished:[users[3].pvid]};
  saved.guilds=[record,{...record,id:2,name:"Other",members:[{pvid:users[2].pvid,role:1,newbie:0,contribution:0,fc_point:0}],banished:[]}];
  writeFileSync(file,JSON.stringify(saved));
  const options={guildDonationMode:"local-gold" as const},state=new ServerState("http://localhost",file,options);
  const game=(state as any).gameByPvid.get(users[0].pvid),before=readFileSync(file),beforeGame=structuredClone(game);
  const donate=(amount:unknown,actor=users[0],extra={})=>gameResponse(state,"/guild/Donate",{...actor,amount,...extra}) as any;
  assert.throws(()=>gameResponse(state,"/guild/Donate",{amount:"1000"}),/authenticated/);
  const disabled=new ServerState("http://localhost",file,{guildDonationMode:"disabled"});
  assert.equal((gameResponse(disabled,"/guild/Donate",{...users[0],amount:"1000"}) as any).result_code,2001);
  for(const amount of [undefined,null,0,1,999,1001,100001,1000000,-1000,1.5,"01","1e3","1000.0",[1000],"4294967296"])
    assert.equal(donate(amount).result_code,2001);
  assert.equal(donate(3000).result_code,2001,"Funds must cover requested donation");
  assert.equal(donate(1000,users[3]).result_code,2001,"Ban/absence is not joined membership");
  const pending={pvid:users[3].pvid,guild_id:1,joined_dtm:1};(state as any).guildPending=[pending];
  assert.equal(donate(1000,users[3]).result_code,2001,"Pending nonzero Guild ID does not authorize donation");(state as any).guildPending=undefined;
  game.search.active={};assert.equal(donate(1000).result_code,2001);game.search.active=beforeGame.search.active;
  game.arena.active={};assert.equal(donate(1000).result_code,2001);game.arena.active=beforeGame.arena.active;
  game.active_battle={state:"active"};assert.equal(donate(1000).result_code,2001);game.active_battle=beforeGame.active_battle;
  const originalGames=(state as any).gameByPvid,missingGames=new Map(originalGames);missingGames.delete(users[0].pvid);
  (state as any).gameByPvid=missingGames;assert.equal(donate(1000).result_code,2001);
  assert.equal(missingGames.has(users[0].pvid),false,"A refused donation never creates gameplay");(state as any).gameByPvid=originalGames;
  game.gacha_free_qty=0x1_0000_0000;assert.equal(donate(1000).result_code,2001);game.gacha_free_qty=beforeGame.gacha_free_qty;
  const guilds=(state as any).guilds;
  for(const key of ["contribution","member"]){
    const target=key==="member"?guilds[0].members[0]:guilds[0],old=target.contribution;target.contribution=0x7fff_ffff-99;
    assert.equal(donate(1000).result_code,2001,"Both aggregate/member overflows refuse before gold debit");target.contribution=old;
  }
  assert.deepEqual(readFileSync(file),before);assert.deepEqual(game,beforeGame);
  const persist=(state as any).persist;(state as any).persist=()=>{throw new Error("fixture persistence error");};
  assert.throws(()=>donate(1000),/persistence error/);assert.equal((state as any).guilds,guilds);assert.deepEqual(game,beforeGame);assert.deepEqual(readFileSync(file),before);
  (state as any).persist=persist;
  mkdirSync(file+".tmp");assert.throws(()=>donate(1000),/EISDIR|EPERM|EACCES/);
  assert.equal((state as any).guilds,guilds);assert.deepEqual(game,beforeGame);assert.deepEqual(readFileSync(file),before);rmdirSync(file+".tmp");
  const blockedDestination=path.join(dir,"rename-destination");mkdirSync(blockedDestination);
  (state as any).stateFile=blockedDestination;
  assert.throws(()=>donate(1000),/EISDIR|EPERM|EEXIST|rename/);
  assert.equal((state as any).guilds,guilds);assert.deepEqual(game,beforeGame);assert.deepEqual(readFileSync(file),before);
  (state as any).stateFile=file;
  const result=donate("1000",users[0],{guild_id:2,price:0,contribution:999999});
  assert.equal(result.result_code,1);assert.equal(result.ret_data.my_guild.guild_id,1);assert.equal(result.ret_data.my_guild.contribution,120);
  assert.equal(result.ret_data.guilds[0].contribution,200);
  assert.deepEqual(result.ret_data.user,{gold:{prev:2500,cur:1500},iap:{prev:17,cur:17},free_iap:{prev:19,cur:19},iap_qty:17,free_iap_qty:19});
  assert.equal(Object.hasOwn(result.ret_data.user,"guild_contribution"),false);
  assert.deepEqual(game,{...beforeGame,gold:1500});
  const settled=JSON.parse(readFileSync(file,"utf8"));
  assert.deepEqual(settled.guilds[0],{...record,member_cnt:2,contribution:200,members:[{...record.members[0],contribution:120},record.members[1]]});
  assert.deepEqual(settled.guilds[1],{...saved.guilds[1],member_cnt:1});assert.deepEqual(settled.gameStates.slice(1),saved.gameStates.slice(1));
  result.ret_data.guilds[0].contribution=0;assert.equal(donate(1000).ret_data.guilds[0].contribution,300,"Identical valid request is a new donation, not fabricated idempotency");
  const twice=readFileSync(file);assert.equal(donate(1000).result_code,2001);assert.deepEqual(readFileSync(file),twice);
  const restart=new ServerState("http://localhost",file,options);
  const hydrated=gameResponse(restart,"/lobby/GetGuildInfo",users[0]) as any;
  assert.equal(hydrated.ret_data.my_guild.contribution,220);assert.equal(hydrated.ret_data.guilds[0].contribution,300);assert.deepEqual(readFileSync(file),twice);
  const newcomer=gameResponse(restart,"/guild/Donate",{...users[1],amount:"100000"}) as any;
  assert.equal(newcomer.result_code,1);assert.equal(newcomer.ret_data.user.gold.cur,0);assert.equal(newcomer.ret_data.my_guild.role,4);
  assert.equal(newcomer.ret_data.my_guild.contribution,10003);assert.equal(newcomer.ret_data.guilds[0].contribution,10300);
  const final=readFileSync(file);assert.equal((gameResponse(restart,"/guild/ReceiveContributionReward",users[1]) as any).result_code,2001);assert.deepEqual(readFileSync(file),final);
  assert.throws(()=>new ServerState("http://localhost",file,{guildDonationMode:"bad" as any}),/donation mode/);assert.deepEqual(readFileSync(file),final);
}finally{rmSync(dir,{recursive:true,force:true});}
console.log("Local Guild donation: default-disabled auth/affiliation/busy/amount/funds/overflow guards, atomic rollback, complete wallet/record receipts, histories and peer preservation, repeated donations, newcomer policy and restart passed; no reward claims.");
