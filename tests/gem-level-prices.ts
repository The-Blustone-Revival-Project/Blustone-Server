import assert from "node:assert/strict";
import {gemLevelPrices,gemLevelPriceAt} from "../src/gem-level-prices.js";
const fixture={level:7,price_type:2,price:17,possibility:0.125,failed_compensation:0.00375,add_sub_ability:true};
const source={result_code:1,ret_data:[fixture]},before=JSON.stringify(source);
const rows=gemLevelPrices(source);assert.deepEqual(rows,[{...fixture,add_sub_ability:1}]);
assert.equal(gemLevelPriceAt(rows,7)?.possibility,0.125);assert.equal(gemLevelPriceAt(rows,6),undefined);
assert.deepEqual(gemLevelPrices({result_code:1,ret_data:[]}),[]);
assert.throws(()=>gemLevelPrices({result_code:1,ret_data:[fixture,{...fixture,price_type:1}]}),/Duplicate/);
for(const patch of [{level:-1},{price:0x1_0000_0000},{price_type:1.5},{possibility:NaN},
  {failed_compensation:Infinity},{possibility:"0.125"},{add_sub_ability:2},{add_sub_ability:"1"}])
  assert.throws(()=>gemLevelPrices({result_code:1,ret_data:[{...fixture,...patch}]}));
assert.throws(()=>gemLevelPrices({result_code:0,ret_data:[fixture]}),/successful/);
assert.throws(()=>gemLevelPrices({result_code:1,ret_data:{a:fixture}}),/array/);
const rawUnits=gemLevelPrices({result_code:1,ret_data:[{...fixture,possibility:12.5,failed_compensation:0.375,add_sub_ability:0}]})[0];
assert.equal(rawUnits.possibility,12.5);assert.equal(rawUnits.failed_compensation,0.375,"no percent/fraction formula is guessed");
rows[0].price=999;assert.equal(JSON.stringify(source),before,"supplied reference snapshot is detached");
console.log("Gem level-price reference: uint32 fields, unscaled double possibility/compensation, canonical byte flag, level-only lookup ambiguity/missing-table refusal and detached snapshots passed; upgrade outcomes remain gated.");
