import assert from "node:assert/strict";
import {parseGuildUserQuery,guildUserRows} from "../src/guild-user-query.js";
import {GUILD_SPRITE_EMBLEMS} from "../src/guild-emblems.js";
import type {GuildRecord} from "../src/guild-lobby.js";
assert.equal(parseGuildUserQuery({target_pvid_list:"[9007199254740993]"}),"9007199254740993");
for(const raw of [{},{target_pvid_list:"[]"},{target_pvid_list:"[1,2]"},{target_pvid_list:1},
  {target_pvid_list:"1"},{target_pvid_list:"[0]"},{pvid:"1"}]) assert.throws(()=>parseGuildUserQuery(raw));
const records:GuildRecord[]=[{id:42,name:"Explicit Guild",type:2,fc_point_limit:20,contribution:123,region:"EN",emblem_id:GUILD_SPRITE_EMBLEMS[0],
  desc:"Known local record",rank:1,gvg_win_cnt:0,gvg_inf_win_cnt:0,members:[{pvid:1,role:1,newbie:0,contribution:7,fc_point:20}]}];
const accounts=new Map([[1,{serverId:1}],[2,{serverId:1}],[3,{serverId:2}]]),before=JSON.stringify(records);
const rows=guildUserRows("1",records,1,accounts);
assert.deepEqual(rows,[{pvid:1,id:42,name:"Explicit Guild",type:2,fc_point_limit:20,contribution:123,region:"EN",emblem_id:GUILD_SPRITE_EMBLEMS[0]}]);
assert.deepEqual(guildUserRows("2",records,1,accounts),[]);assert.deepEqual(guildUserRows("3",records,1,accounts),[]);
assert.deepEqual(guildUserRows("9007199254740993",records,1,accounts),[]);assert.deepEqual(guildUserRows("1",records,2,accounts),[]);
assert.throws(()=>guildUserRows("1",[records[0],{...records[0],id:43}],1,accounts),/Conflicting/);
assert.throws(()=>guildUserRows("1",[{...records[0],members:[...records[0].members,{pvid:4,role:3,newbie:0,contribution:0,fc_point:0}]}],1,accounts),/unknown account/);
rows[0].name="Detached";assert.equal(JSON.stringify(records),before);
assert.deepEqual(Object.keys(rows[0]).sort(),["pvid","id","name","type","fc_point_limit","contribution","region","emblem_id"].sort());
console.log("Guild user association: native singleton array form, compact established same-server summary, unknown/unjoined omission, conflict/corrupt ownership refusal and detached public fields passed; contribution projection is explicit local policy.");
