import assert from "node:assert/strict";
import {planLocalGuildFound} from "../src/guild-local-found.js";
const request={name:"New Guild",desc:"Authored local test",type:"1",fc_point_limit:"500",region:"EN",emblem_id:"GD_IMG_1"};
const accounts=new Map([[1,{serverId:1}],[2,{serverId:1}]]),owner={pvid:1,serverId:1},prices=[{action:1,price_type:2,price:17}];
const plan=planLocalGuildFound(request,[],accounts,owner,100,30,1,prices);
assert.equal(plan.gold,83);assert.equal(plan.fee,17);assert.equal(plan.nextId,2);
assert.equal(plan.created?.members[0].role,1);assert.equal(plan.created?.members[0].fc_point,30);
assert.equal(plan.created?.rank,0);assert.equal(plan.created?.contribution,0);
const rows=[plan.created!],before=JSON.stringify({rows,prices});
assert.match(planLocalGuildFound(request,rows,accounts,owner,83,30,2,prices).error!,/already/);
assert.match(planLocalGuildFound(request,rows,accounts,{pvid:2,serverId:1},100,30,2,prices).error!,/name/);
assert.match(planLocalGuildFound(request,[],accounts,owner,16,30,1,prices).error!,/gold/);
assert.match(planLocalGuildFound(request,[],accounts,owner,100,30,1,[]).error!,/quote/);
for(const patch of [{name:"Bad Name Too Long"},{name:"Mixed字"},{region:""},{fc_point_limit:"501"},{emblem_id:"GD_IMG_7"},{type:"4"}])
  assert.ok(planLocalGuildFound({...request,...patch},[],accounts,owner,100,30,1,prices).error);
assert.ok(planLocalGuildFound(request,[],accounts,owner,100,30,0x1_0000_0000,prices).error);
assert.equal(planLocalGuildFound({...request,price:0,guild_id:99},[],accounts,owner,100,30,1,prices).gold,83,"client has no fee/identity authority");
assert.equal(JSON.stringify({rows,prices}),before);
console.log("Local Guild creation plan: explicit gold quote, native request/slider/text gates, local ASCII/name/leader/zero-rank policy, ownership/wallet/ID protections and pure inputs passed; original admission unknown.");
