import assert from "node:assert/strict";
import {gemWireRows,parseStateWithGemIds} from "../src/gem-wire.js";
const fields={ref_id:"AUTHORED",rank:1,level:1,position:0,target_inst_id:"0",ability:"",abilities:null};
for(const id of ["9007199254740993","18446744073709551615"]) {
  const row={...fields,inst_id:id},before=JSON.stringify(row);
  const wire=JSON.stringify({ret_data:gemWireRows([row])});
  assert.ok(wire.includes('"inst_id":'+id));assert.ok(!wire.includes('"inst_id":"'+id+'"'));
  assert.deepEqual((parseStateWithGemIds(wire) as any).ret_data,[row]);
  assert.equal(JSON.stringify(row),before);
  const imported='{"owned_gems":['+JSON.stringify({...fields,inst_id:"TOKEN"}).replace('"TOKEN"',id)+'],"other":123}';
  const parsed=parseStateWithGemIds(imported) as any;
  assert.equal(parsed.owned_gems[0].inst_id,id);assert.equal(parsed.other,123);
}
const safe=JSON.stringify(gemWireRows([{...fields,inst_id:"1000001"}]));
assert.ok(safe.includes('"inst_id":"1000001"'));
console.log("Gem wire: exact unsafe uint64 integer tokens, lossless scoped import, unchanged safe IDs/source objects passed; native string strtod rounding avoided.");
