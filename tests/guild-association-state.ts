import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-association-"));
try {
  const file=path.join(dir,"state.json"),initial=new ServerState("http://localhost",file);
  const leader=initial.registerGuest({device_id:"association-leader"},{}).ret_data as any;
  const outsider=initial.registerGuest({device_id:"association-outsider"},{}).ret_data as any;
  const foreign=initial.registerGuest({device_id:"association-foreign"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8"));saved.accounts.find((account:any)=>account.pvid===foreign.pvid).serverId=2;
  saved.guilds=[{id:42,name:"Explicit Guild",type:2,fc_point_limit:20,contribution:123,region:"EN",emblem_id:"GD_IMG_1",desc:"Known local record",rank:1,
    gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[{pvid:leader.pvid,role:1,newbie:0,contribution:7,fc_point:20}]}];
  writeFileSync(file,JSON.stringify(saved));const before=readFileSync(file),state=new ServerState("http://localhost",file);
  const query=(auth:any,target_pvid_list:unknown)=>gameResponse(state,"/guild/GetUserGuilds",{...auth,target_pvid_list}) as any;
  const expected={user_guilds:[{pvid:leader.pvid,id:42,name:"Explicit Guild",type:2,fc_point_limit:20,contribution:123,region:"EN",emblem_id:"GD_IMG_1"}]};
  assert.deepEqual(query(outsider,JSON.stringify([leader.pvid])).ret_data,expected);
  assert.deepEqual(query(outsider,JSON.stringify([outsider.pvid])).ret_data,{user_guilds:[]});
  assert.deepEqual(query(foreign,JSON.stringify([leader.pvid])).ret_data,{user_guilds:[]});
  assert.deepEqual(query(leader,"[9007199254740993]").ret_data,{user_guilds:[]});
  assert.throws(()=>query({},JSON.stringify([leader.pvid])),/authenticated/);
  for(const invalid of ["[]",JSON.stringify([leader.pvid,outsider.pvid]),"1",[leader.pvid],undefined])assert.equal(query(leader,invalid).result_code,2001);
  query(outsider,JSON.stringify([leader.pvid])).ret_data.user_guilds[0].name="Changed";
  assert.deepEqual(query(leader,JSON.stringify([leader.pvid])).ret_data,expected);
  assert.equal((gameResponse(state,"/lobby/GetGuildInfo",outsider) as any).ret_data.my_guild.guild_id,0,"query does not assign personal affiliation");
  assert.deepEqual(readFileSync(file),before);
  const restarted=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(restarted,"/guild/GetUserGuilds",{...outsider,target_pvid_list:JSON.stringify([leader.pvid])}) as any).ret_data,expected);
  assert.deepEqual(readFileSync(file),before);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Guild association state: authenticated singleton native user_guilds wrapper, public established metadata, separate aggregate/personal contribution, server/unknown/invalid target filtering and byte-preserving restart passed.");
