import assert from "node:assert/strict";
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-ranking-"));
try {
  const file=path.join(dir,"state.json"),initial=new ServerState("http://localhost",file);
  const users=Array.from({length:5},(_,i)=>initial.registerGuest({device_id:"ranking-user"+i},{}).ret_data as any);
  const saved=JSON.parse(readFileSync(file,"utf8"));saved.accounts.find((account:any)=>account.pvid===users[4].pvid).serverId=2;
  const make=(id:number,rank:number,pvid:number)=>({id,rank,name:"Authored Guild"+id,type:1,fc_point_limit:0,contribution:10,region:"",emblem_id:"GD_IMG_1",desc:"Authored import",
    gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[{pvid,contribution:10,newbie:0,role:1,fc_point:30}]});
  saved.guilds=[make(8,7,users[0].pvid),make(7,2,users[1].pvid),make(9,0,users[2].pvid),make(3,1,users[4].pvid)];
  writeFileSync(file,JSON.stringify(saved));const before=readFileSync(file),state=new ServerState("http://localhost",file);
  const read=(page:unknown,size:unknown,auth=users[3])=>gameResponse(state,"/guild/GetRanking",{...auth,page,size}) as any;
  assert.throws(()=>read("0","10",{}),/authenticated/);
  assert.deepEqual(read("0","10").ret_data.map((guild:any)=>[guild.id,guild.rank]),[[7,2],[8,7]],"explicit sparse ranks stay unchanged, not positions1/2");
  assert.deepEqual(read("1","1").ret_data.map((guild:any)=>guild.id),[8]);
  assert.deepEqual(read("0","10",users[4]).ret_data.map((guild:any)=>guild.id),[3]);
  assert.deepEqual(read("2147483647","2147483647").ret_data,[],"exact large signed32 offset cannot wrap to first page");
  assert.equal(Array.isArray(read("0","10").ret_data),true,"ranking bare array differs from discovery/detail guilds object");
  read("0","10").ret_data[0].members[0].role=4;assert.equal(read("0","10").ret_data[0].members[0].role,1);
  for(const [page,size] of [[-1,10],[0,0],["bad","10"],[0,undefined]])assert.equal(read(page,size).result_code,2001);
  assert.deepEqual(readFileSync(file),before);
  const restarted=new ServerState("http://localhost",file);
  assert.deepEqual((gameResponse(restarted,"/guild/GetRanking",{...users[3],page:"0",size:"10"}) as any).ret_data,read("0","10").ret_data);
  assert.deepEqual(readFileSync(file),before);
} finally {rmSync(dir,{recursive:true,force:true});}
console.log("Guild ranking state: native bare array, preserved explicit sparse ranks, safe paging, same-server corpus, no rewards/affiliation mutation and authenticated byte-preserving restart passed; global ladder completeness unknown.");
