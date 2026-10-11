import assert from "node:assert/strict";
import {equipmentTransition} from "../src/equipment-transition.js";
assert.deepEqual(equipmentTransition("level",1,1),{rank:1,level:2});
assert.deepEqual(equipmentTransition("level",1,9),{rank:1,level:10});
assert.deepEqual(equipmentTransition("rank",1,10),{rank:2,level:10});
assert.deepEqual(equipmentTransition("level",2,10),{rank:2,level:11});
assert.deepEqual(equipmentTransition("rank",4,40),{rank:5,level:40});
assert.deepEqual(equipmentTransition("level",5,49),{rank:5,level:50});
for(const [action,rank,level] of [["level",1,10],["rank",1,9],["rank",5,50],["level",5,50],
 ["rank",1,11],["level",2,1],["rank",0,10],["level",1,0],["rank",1.5,10]] as const)
 assert.throws(()=>equipmentTransition(action,rank,level),TypeError);
console.log("Equipment ordinary transitions: level boundaries, rank+1 with preserved level, max5/50 and conservative malformed-state refusal passed; no fee/upgrade enabled.");
