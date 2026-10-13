import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-detail-"));
try {
  const file=path.join(dir,"state.json"),initial=new ServerState("http://localhost",file);
  const leader=initial.registerGuest({device_id:"guild-detail-leader"},{}).ret_data as any;
  const member=initial.registerGuest({device_id:"guild-detail-member"},{}).ret_data as any;
  const outsider=initial.registerGuest({device_id:"guild-detail-outsider"},{}).ret_data as any;
  const foreign=initial.registerGuest({device_id:"guild-detail-foreign"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8"));saved.accounts.find((account:any)=>account.pvid===foreign.pvid).serverId=2;
  const record={id:7001,name:"Authored Guild",type:1,fc_point_limit:0,contribution:10,region:"",emblem_id:"GD_IMG_1",desc:"Authored import",rank:1,
    gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[{pvid:leader.pvid,contribution:3,newbie:0,role:1,fc_point:30},{pvid:member.pvid,contribution:7,newbie:1,role:4,fc_point:10}]};
  const remote={...record,id:7002,name:"Authored Other Server",members:[{pvid:foreign.pvid,contribution:10,newbie:0,role:1,fc_point:20}]};
  saved.guilds=[record,remote];writeFileSync(file,JSON.stringify(saved));
  const before=readFileSync(file),state=new ServerState("http://localhost",file);
  const query=(auth:any,guild_id:unknown)=>gameResponse(state,"/guild/GetDetailInfo",{...auth,guild_id}) as any;
  assert.throws(()=>query({},"[7001]"),/authenticated/);
  assert.deepEqual(query(leader,"[7001]").ret_data,{guilds:[{...record,member_cnt:2}]});
  assert.deepEqual(query(outsider,"[7001,7002,999,4294967297]").ret_data,{guilds:[{...record,member_cnt:2}]},"same-server public details only, no width alias or fabricated records");
  assert.deepEqual(query(foreign,"[7001,7002]").ret_data,{guilds:[{...remote,member_cnt:1}]});
  assert.deepEqual(query(member,"[]").ret_data,{guilds:[]});
  query(member,"[7001]").ret_data.guilds[0].members[0].role=4;
  assert.equal(query(member,"[7001]").ret_data.guilds[0].members[0].role,1,"detached canonical native INFO");
  for(const invalid of [undefined,"{}","[7001,7001]","[0]",7001,[7001],"[18446744073709551616]"])
    assert.equal(query(leader,invalid).result_code,2001);
  assert.deepEqual(readFileSync(file),before,"reads/invalid queries preserve the complete save bytes");
  const restarted=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(restarted,"/guild/GetDetailInfo",{...member,guild_id:"[7001]"}) as any).ret_data,query(member,"[7001]").ret_data);
  assert.deepEqual(readFileSync(file),before);
  assert.equal((gameResponse(state,"/guild/Apply",{...outsider,guild_id:"7001"}) as any).result_code,2001,"reading details does not authorize joining");
  assert.equal((gameResponse(state,"/lobby/GetGuildInfo",outsider) as any).ret_data.my_guild.guild_id,0);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Guild details: exact native guilds wrapper, same-server established INFO/member rows, detached outputs, unknown/width-alias/invalid query protection, auth and byte-preserving restart passed; no affiliation mutation.");
