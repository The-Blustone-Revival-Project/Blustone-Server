import assert from "node:assert/strict";
import {parseGuildDiscoveryRequest,guildDiscoveryRows} from "../src/guild-discovery.js";
import {GUILD_SPRITE_EMBLEMS} from "../src/guild-emblems.js";
import type {GuildRecord} from "../src/guild-lobby.js";
const guild=(id:number,name:string,pvid:number,type:1|2|3):GuildRecord=>({id,name,type,fc_point_limit:20,contribution:123,region:"EN",emblem_id:GUILD_SPRITE_EMBLEMS[0],
  desc:"Unsearched private description",rank:1,gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[{pvid,role:1,newbie:0,contribution:7,fc_point:20}]});
const records=[guild(43,"ICEWOOD Team",1,3),guild(42,"Snow Team",2,1),guild(44,"Foreign Team",3,2)];
const accounts=new Map([[1,{serverId:1}],[2,{serverId:1}],[3,{serverId:2}]]),before=JSON.stringify(records);
const search=(keyword:string)=>guildDiscoveryRows(parseGuildDiscoveryRequest("/guild/Search",{keyword}),records,1,accounts);
assert.deepEqual(search("TEAM").map(row=>row.id),[42,43]);assert.deepEqual(search("ice").map(row=>row.id),[43]);
assert.deepEqual(search("").map(row=>row.id),[42,43]);assert.deepEqual(search("Unsearched"),[]);
assert.deepEqual(guildDiscoveryRows(parseGuildDiscoveryRequest("/guild/GetRecommendations",{}),records,1,accounts).map(row=>row.id),[42,43]);
for(const raw of [{},{keyword:2},{keyword:null},{keyword:["Team"]}])assert.throws(()=>parseGuildDiscoveryRequest("/guild/Search",raw));
assert.throws(()=>parseGuildDiscoveryRequest("/guild/Unknown",{}),/Unsupported/);
assert.throws(()=>guildDiscoveryRows({keyword:null},[records[0],records[0]],1,accounts),/Duplicate/);
assert.deepEqual(search("missing"),[]);assert.equal(search("ice")[0].type,3,"listing does not imply private Guild join eligibility");
search("ice")[0].members[0].contribution=999;assert.equal(JSON.stringify(records),before,"response snapshots detached, records unchanged");
assert.deepEqual(guildDiscoveryRows({keyword:null},[],1,accounts),[]);
console.log("Guild discovery: exact keyword/auth-only parsers, stable same-server established INFO, explicit name substring policy, private/join eligibility distinction, empty/missing corpus and detached snapshots passed.");
