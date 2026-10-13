import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const directory=mkdtempSync(path.join(tmpdir(),"blustone-guild-records-"));
try {
  const file=path.join(directory,"state.json"),initial=new ServerState("http://localhost",file);
  const leader=initial.registerGuest({device_id:"guild-leader"},{}).ret_data as any;
  const member=initial.registerGuest({device_id:"guild-member"},{}).ret_data as any;
  const outsider=initial.registerGuest({device_id:"guild-outsider"},{}).ret_data as any;
  const record={id:7001,name:"Authored Guild",type:1,fc_point_limit:0,contribution:10,region:"",emblem_id:"GD_IMG_1",desc:"Authored import",rank:1,
    gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[{pvid:leader.pvid,contribution:3,newbie:0,role:1,fc_point:30},{pvid:member.pvid,contribution:7,newbie:1,role:4,fc_point:10}]};
  const saved=JSON.parse(readFileSync(file,"utf8"));saved.guilds=[record];writeFileSync(file,JSON.stringify(saved));
  const before=readFileSync(file),state=new ServerState("http://localhost",file);
  const read=(auth:any)=>gameResponse(state,"/lobby/GetGuildInfo",auth) as any;
  assert.deepEqual(read(member).ret_data,{my_guild:{guild_id:7001,status:3,newbie:1,role:4,contribution:7},guilds:[{...record,member_cnt:2}]});
  assert.equal(read(leader).ret_data.my_guild.role,1);assert.equal(read(outsider).ret_data.my_guild.guild_id,0);
  assert.throws(()=>read({}),/authenticated/);read(member).ret_data.my_guild.role=1;assert.equal(read(member).ret_data.my_guild.role,4);
  assert.deepEqual(readFileSync(file),before,"startup and Guild reads are byte-preserving");
  for(const route of ["/guild/Found","/guild/Apply","/guild/Donate","/guild/SupportFuel","/gvg/Start"])
    assert.equal((gameResponse(state,route,member) as any).result_code,2001);
  assert.deepEqual(readFileSync(file),before);
  // A later unrelated write must preserve the established membership instead
  // of dropping an unknown root field. No save fixtures are promoted live.
  state.registerGuest({device_id:"guild-later-account"},{});
  const persisted=JSON.parse(readFileSync(file,"utf8"));assert.equal(persisted.guilds[0].member_cnt,2);
  assert.deepEqual(persisted.guilds[0].members,record.members);
  assert.deepEqual(persisted.gameStates.filter(([pvid]:[number,unknown])=>saved.gameStates.some(([oldPvid]:[number,unknown])=>oldPvid===pvid)),saved.gameStates);
  const restart=new ServerState("http://localhost",file);
  assert.equal((gameResponse(restart,"/lobby/GetGuildInfo",member) as any).ret_data.my_guild.contribution,7);
  const valid=readFileSync(file);
  const invitationRecord={...persisted,guilds:[{...record,invited_guests:[{pvid:outsider.pvid}]}]};
  writeFileSync(file,JSON.stringify(invitationRecord));const guestBytes=readFileSync(file),guestState=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(guestState,"/guild/GetDetailInfo",{...leader,guild_id:"[7001]"}) as any).ret_data.guilds[0].invited_guests,[{pvid:outsider.pvid}]);
  assert.deepEqual(readFileSync(file),guestBytes,"explicit object invitation history remains byte-preserving, without inventing producer ownership");
  const international={...record,name:"길드 🧭",desc:"復活したギルド",region:"대한민국"};
  writeFileSync(file,JSON.stringify({...persisted,guilds:[international]}));
  const internationalBytes=readFileSync(file),internationalState=new ServerState("http://localhost",file);
  assert.equal((gameResponse(internationalState,"/guild/GetDetailInfo",{...leader,guild_id:"[7001]"}) as any).ret_data.guilds[0].name,international.name);
  assert.deepEqual(readFileSync(file),internationalBytes,"Valid multilingual metadata stays byte-preserving, without local creation ASCII filtering");
  const invalidCases=[null,...["name","desc","region","emblem_id"].map(key=>[{...record,[key]:"bad\ud800"}]),
    [{...record,id:0x1_0000_0000}],[{...record,member_cnt:3}],[{...record,emblem_id:"GUESS"}],
    [{...record,invited_guests:[outsider.pvid]}],[{...record,members:record.members.map(member=>({...member,donation_history:[]}))}],[record,{...record,id:7002}],
    [{...record,members:[{...record.members[0],pvid:999}]}]];
  for(const guilds of invalidCases){const invalid={...persisted,guilds};writeFileSync(file,JSON.stringify(invalid));const invalidBytes=readFileSync(file);
    assert.throws(()=>new ServerState("http://localhost",file));assert.deepEqual(readFileSync(file),invalidBytes);}
  const crossServer=structuredClone(persisted);crossServer.accounts.find((account:any)=>account.pvid===member.pvid).serverId=2;
  writeFileSync(file,JSON.stringify(crossServer));const crossBytes=readFileSync(file);
  assert.throws(()=>new ServerState("http://localhost",file),/different-server/);assert.deepEqual(readFileSync(file),crossBytes);
  writeFileSync(file,valid);
} finally {rmSync(directory,{recursive:true,force:true});}
console.log("Established Guild lobby: pinned emblems, existing account memberships, roles/contributions, byte-preserving reads, durable unrelated writes and malformed/cross-server/conflict refusals passed; no creation or join inferred.");
