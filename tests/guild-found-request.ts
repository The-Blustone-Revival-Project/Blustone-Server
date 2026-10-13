import assert from "node:assert/strict";
import {parseGuildFoundRequest} from "../src/guild-found-request.js";
const emblems=new Set(["GD_IMG_1"]),raw={name:"Authored Guild",desc:"Explicit description",type:"2",fc_point_limit:"123",region:"EN",emblem_id:"GD_IMG_1"};
const before=JSON.stringify(raw),result=parseGuildFoundRequest(raw,emblems);
assert.deepEqual(result,{...raw,type:2,fc_point_limit:123});
assert.deepEqual(parseGuildFoundRequest({...raw,desc:"",region:"",type:1,fc_point_limit:0},emblems),{...raw,desc:"",region:"",type:1,fc_point_limit:0});
for(const patch of [{name:""},{name:1},{desc:null},{region:[]},{emblem_id:"unknown"},{type:0},{type:4},{type:"01"},
  {fc_point_limit:-1},{fc_point_limit:0x8000_0000},{fc_point_limit:"1.5"},{fc_point_limit:true}])
  assert.throws(()=>parseGuildFoundRequest({...raw,...patch},emblems));
assert.throws(()=>parseGuildFoundRequest({},emblems));assert.throws(()=>parseGuildFoundRequest(raw,new Set()));
assert.equal(JSON.stringify(raw),before);
assert.equal(Object.hasOwn(result,"price_type"),false);assert.equal(Object.hasOwn(result,"price"),false);assert.equal(Object.hasOwn(result,"id"),false);
console.log("Guild Found request: exact six native fields, plain strings/canonical enum/count, original emblem gate and detached input; fees, allocator, membership and settlement remain caller policy.");
