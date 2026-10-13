import assert from "node:assert/strict";
import {parseGuildUpdateRequest} from "../src/guild-update-request.js";
const original={name:"Known Guild",desc:"Authored description",type:"2",fc_point_limit:"500",region:"EN",emblem_id:"GD_IMG_1"},
  emblems=new Set(["GD_IMG_1"]),before=JSON.stringify(original);
assert.deepEqual(parseGuildUpdateRequest(original,emblems),{...original,type:2,fc_point_limit:500});
const extra=parseGuildUpdateRequest({...original,id:99,guild_id:"99",price:0,price_type:2,role:1},emblems);
assert.deepEqual(Object.keys(extra).sort(),["name","desc","type","fc_point_limit","region","emblem_id"].sort(),"client adds no target/fee/role authority");
for(const patch of [{name:""},{desc:undefined},{type:"4"},{fc_point_limit:-1},{region:1},{emblem_id:"unknown"}])
  assert.throws(()=>parseGuildUpdateRequest({...original,...patch},emblems));
assert.equal(JSON.stringify(original),before);
console.log("Guild Update request: exact six replacement fields, implicit affiliation/no client fee/ID/role authority, known-art/text/count admission and unchanged inputs passed; permissions/settlement remain separate.");
