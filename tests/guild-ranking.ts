import assert from "node:assert/strict";
import {guildRankingRows} from "../src/guild-ranking.js";
import type {GuildRecord} from "../src/guild-lobby.js";
const accounts=new Map([[1,{serverId:1}],[2,{serverId:1}],[3,{serverId:1}],[4,{serverId:2}],[5,{serverId:1}]]);
const make=(id:number,rank:number,pvid:number):GuildRecord=>({id,name:`Authored ${id}`,type:1,fc_point_limit:0,contribution:1,
  region:"",emblem_id:"GD_IMG_1",desc:"Authored ranking fixture",rank,gvg_win_cnt:0,gvg_inf_win_cnt:0,
  members:[{pvid,contribution:1,newbie:0,role:1,fc_point:10}]});
const records=[make(3,9,3),make(2,4,2),make(1,4,1),make(4,1,4),make(5,0,5)],before=structuredClone(records);
const first=guildRankingRows({page:"0",size:"10"},records,1,accounts);
assert.deepEqual(first.map(row=>[row.id,row.rank]),[[1,4],[2,4],[3,9]],"stored sparse/tied ranks retained; same-server rank0 omitted");
assert.ok(Array.isArray(first));assert.equal(first[0].member_cnt,1);assert.deepEqual(first[0].members,records[2].members);
first[0].members[0].contribution=999;first[0].rank=1;
assert.deepEqual(records,before,"detached full INFO reads do not recompute stored ranks or alter memberships");
assert.deepEqual(guildRankingRows({page:1,size:2},records,1,accounts).map(row=>[row.id,row.rank]),[[3,9]],"pagination over known subset preserves actual rank9");
assert.deepEqual(guildRankingRows({page:0,size:10},records,2,accounts).map(row=>[row.id,row.rank]),[[4,1]]);
assert.deepEqual(guildRankingRows({page:"2147483647",size:"2147483647"},records,1,accounts),[],"BigInt pagination prevents width/product aliases");
assert.deepEqual(guildRankingRows({page:0,size:10},[],1,accounts),[]);
assert.throws(()=>guildRankingRows({page:-1,size:10},records,1,accounts),/page/);
assert.throws(()=>guildRankingRows({page:0,size:0},records,1,accounts),/size/);
assert.throws(()=>guildRankingRows({page:0,size:10},[make(6,1,999)],1,accounts),/unknown account/);
console.log("Guild ranking subset: bare full INFO rows, explicit sparse/tied rank preservation, local same-server/rank0 policy, detached membership rows and exact BigInt pagination passed; no global rankings or rewards invented.");
