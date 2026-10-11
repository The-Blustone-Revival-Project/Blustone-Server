import assert from "node:assert/strict";
import { GEM_STAT_KEYS } from "../src/gem-combinations.js";
import { parseGemReferences, parseGemInstances, projectGemStats } from "../src/gem-instances.js";
// Authored parser fixtures; not original Gem catalog/rolls or inventory grants.
const ref = { id:"AUTHORED_GEM",name:"Authored",desc:"",res_id:"AUTHORED_ART",set_effect_id:3,rank:1,target:2 };
const refs = parseGemReferences({result_code:1,ret_data:[ref]});
const stat = {rank:0,awk_step:0,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,"100"]))};
const owned = {ref_id:ref.id,inst_id:1000010,rank:1,level:2,position:1,target_inst_id:1000001,ability:"original format unknown",
 abilities:{level_up_failed:0,main:stat,sub:[stat,stat]}};
const envelope={result_code:1,ret_data:[owned]},before=JSON.stringify(envelope),hunters=new Set(["1000001"]);
const instances=parseGemInstances(envelope,refs,hunters);
const projection=projectGemStats(instances[0],refs);
assert.equal(projection.slot,1);assert.equal(projection.familyId,3);
assert.equal(projection.stats.def,3);assert.equal(projection.stats.hp_up,3);assert.equal(projection.stats.spd,300);
assert.equal(instances[0].inst_id,"1000010");assert.equal(instances[0].abilities?.sub.length,2);
const absent=parseGemInstances({result_code:1,ret_data:[{...owned,target_inst_id:0,abilities:null}]},refs,hunters)[0];
assert.equal(absent.target_inst_id,"0");assert.equal(projectGemStats(absent,refs).stats.hp,0);
assert.deepEqual(parseGemInstances({result_code:1,ret_data:[]},[],hunters),[]);
for(const patch of [{ref_id:"MISSING"},{inst_id:0},{inst_id:9007199254740992},{target_inst_id:1000002},{ability:{}},
 {abilities:{level_up_failed:0,main:stat,sub:{}}},{abilities:{level_up_failed:0,main:{...stat,hp:100},sub:[]}}])
 assert.throws(()=>parseGemInstances({result_code:1,ret_data:[{...owned,...patch}]},refs,hunters),TypeError);
assert.throws(()=>parseGemInstances({result_code:1,ret_data:[owned,owned]},refs,hunters),/Duplicate/);
assert.throws(()=>parseGemReferences({result_code:1,ret_data:[ref,ref]}),/Duplicate/);
assert.throws(()=>parseGemReferences({result_code:1,ret_data:[{...ref,target:0}]}),/slot/);
assert.equal(JSON.stringify(envelope),before);
assert.throws(()=>parseGemInstances({result_code:1,ret_data:[{...owned,position:0}]},refs,hunters),/position/);
assert.throws(()=>parseGemInstances({result_code:1,ret_data:[owned,{...owned,inst_id:1000011}]},refs,hunters),/position/);
assert.throws(()=>parseGemInstances({result_code:1,ret_data:[{...owned,position:2}]},refs,hunters,()=>1),/slot/);
assert.equal(parseGemInstances({result_code:1,ret_data:[{...owned,position:2}]},refs,hunters,()=>3).length,1);
console.log("Gem owned contracts: original ref slot/family join, mode100 main/sub sums, null abilities, owner validation and identity guards passed; no catalog/rolls/mount configured.");
