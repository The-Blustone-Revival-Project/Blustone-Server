import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-discovery-"));
try {
  const file=path.join(dir,"state.json"),initial=new ServerState("http://localhost",file);
  const member=initial.registerGuest({device_id:"discovery-member"},{}).ret_data as any;
  const second=initial.registerGuest({device_id:"discovery-second"},{}).ret_data as any;
  const outsider=initial.registerGuest({device_id:"discovery-outsider"},{}).ret_data as any;
  const foreign=initial.registerGuest({device_id:"discovery-foreign"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8"));saved.accounts.find((account:any)=>account.pvid===foreign.pvid).serverId=2;
  const make=(id:number,name:string,pvid:number)=>({id,name,type:1,fc_point_limit:0,contribution:10,region:"",emblem_id:"GD_IMG_1",desc:"Authored import",rank:1,
    gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[{pvid,contribution:10,newbie:0,role:1,fc_point:30}]});
  saved.guilds=[make(42,"Alpha Guild",member.pvid),make(7,"Beta Guild",second.pvid),make(3,"Alpha Remote",foreign.pvid)];
  writeFileSync(file,JSON.stringify(saved));const before=readFileSync(file),state=new ServerState("http://localhost",file);
  const read=(route:string,auth:any=outsider,extra={})=>gameResponse(state,route,{...auth,...extra}) as any;
  assert.throws(()=>read("/guild/Search",{}, {keyword:"Alpha"}),/authenticated/);
  const recommended=read("/guild/GetRecommendations").ret_data;
  assert.deepEqual(recommended.guilds.map((guild:any)=>guild.id),[7,42]);
  assert.deepEqual(read("/guild/Search",outsider,{keyword:"aLpHa"}).ret_data.guilds.map((guild:any)=>guild.id),[42]);
  assert.deepEqual(read("/guild/Search",outsider,{keyword:""}).ret_data,recommended);
  assert.deepEqual(read("/guild/Search",outsider,{keyword:"not present"}).ret_data,{guilds:[]});
  assert.deepEqual(read("/guild/GetRecommendations",foreign).ret_data.guilds.map((guild:any)=>guild.id),[3]);
  assert.equal(read("/guild/Search",outsider,{keyword:["Alpha"]}).result_code,2001);
  read("/guild/GetRecommendations").ret_data.guilds[0].members[0].role=4;
  assert.equal(read("/guild/GetRecommendations").ret_data.guilds[0].members[0].role,1);
  assert.equal(read("/lobby/GetGuildInfo").ret_data.my_guild.guild_id,0,"listing does not join a Guild");
  assert.deepEqual(readFileSync(file),before);
  const restart=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(restart,"/guild/GetRecommendations",outsider) as any).ret_data,recommended);
  assert.deepEqual(readFileSync(file),before);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Guild discovery state: native guilds wrapper, same-server established records, explicit local matching/order, auth/detached metadata and byte-preserving restart passed; production ranking/join rules remain unknown.");
