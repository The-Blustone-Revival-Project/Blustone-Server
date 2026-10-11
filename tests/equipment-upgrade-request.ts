import assert from "node:assert/strict";
import {parseEquipmentUpgradeRequest} from "../src/equipment-upgrade-request.js";
const form = {inst_id:"1000001",part:"2",price_type:"0",source_inst_ids:"[1000002,1000003]"};
const before=JSON.stringify(form);
assert.deepEqual(parseEquipmentUpgradeRequest("rank",form),{inst_id:"1000001",slot:1,price_type:0,source_inst_ids:["1000002","1000003"]});
assert.deepEqual(parseEquipmentUpgradeRequest("level",form),{inst_id:"1000001",slot:1,price_type:0,source_inst_ids:[]});
assert.equal(parseEquipmentUpgradeRequest("level",{...form,part:3,inst_id:"18446744073709551615"}).inst_id,"18446744073709551615");
assert.deepEqual(parseEquipmentUpgradeRequest("rank",{...form,source_inst_ids:[]}).source_inst_ids,[],"Native vector may be empty; required card_qty is separate missing reference policy");
assert.deepEqual(parseEquipmentUpgradeRequest("rank",{...form,source_inst_ids:"null"}).source_inst_ids,[],"Actual native empty vector JSON dump is null");
assert.deepEqual(parseEquipmentUpgradeRequest("rank",{...form,source_inst_ids:null}).source_inst_ids,[]);
assert.deepEqual(parseEquipmentUpgradeRequest("rank",{...form,source_inst_ids:"[9007199254740993,18446744073709551615]"}).source_inst_ids,
  ["9007199254740993","18446744073709551615"],"Native decimal uint64 vector must preserve high bits before JSON Number conversion");
for(const patch of [{part:0},{part:4},{inst_id:0},{inst_id:"18446744073709551616"},{inst_id:9007199254740992},{price_type:-1},
 {source_inst_ids:"[1000001]"},{source_inst_ids:"[1000002,1000002]"},{source_inst_ids:"{"},{source_inst_ids:{list:[]}},
 {source_inst_ids:[9007199254740992]},{source_inst_ids:"[18446744073709551616]"}]) assert.throws(()=>parseEquipmentUpgradeRequest("rank",{...form,...patch}),TypeError);
assert.equal(JSON.stringify(form),before);
console.log("Equipment request grammar: uint64 identity preservation, native part1..3, JSON source vector and strict duplicate/rounding refusal passed; no eligibility or upgrade authorized.");
