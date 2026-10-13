import assert from "node:assert/strict";
import {parseEntrustEndResult,parseEntrustEndResultJson} from "../src/expedition-entrust-end.js";
import {parseEntrustStart} from "../src/expedition-entrust-snapshot.js";
import {entrustDerivedEndWord,entrustCountdown,entrustNativeClearCount} from "../src/expedition-entrust-clock.js";
// Authored offline probes, not job/award/entitlement production.
const result={gold:{prev:100,cur:110},user_exp:{prev:1,cur:2,max_ap:{prev:50,cur:50},ap:{cur:47,ap_charge_time:0xffff_ffff}},
  card_exp:[{inst_id:"18446744073709551615",prev:0,cur:0xffff_ffff}],item:[{inst_id:"9007199254740993",ref_id:"AUTHORED",added:2}]};
const bytes=JSON.stringify(result),decoded=parseEntrustEndResult(result);assert.deepEqual(decoded,result);
decoded.item[0].added=9;decoded.user_exp.ap.cur=0;assert.equal(JSON.stringify(result),bytes);
const capture=bytes.replace('"inst_id":"18446744073709551615"','"inst_id":18446744073709551615').replace('"inst_id":"9007199254740993"','"inst_id":9007199254740993');
assert.deepEqual(parseEntrustEndResultJson(capture),result);assert.throws(()=>parseEntrustEndResult(JSON.parse(capture)),/64/);
assert.throws(()=>parseEntrustEndResultJson(capture.replace("18446744073709551615","1e20")),/token/);
assert.throws(()=>parseEntrustEndResult({...result,ap:result.user_exp.ap}),/fields/);
assert.throws(()=>parseEntrustEndResult({...result,user_exp:{prev:1,cur:2,max_ap:result.user_exp.max_ap}}));
assert.throws(()=>parseEntrustEndResult({...result,user_exp:{...result.user_exp,ap:{cur:47,ap_charge_time:0x1_0000_0000}}}),/uint32/);
assert.throws(()=>parseEntrustEndResult({...result,item:'["AUTHORED"]'}),/array/);
assert.throws(()=>parseEntrustEndResult({...result,item:[{...result.item[0],added:-1}]}));assert.throws(()=>parseEntrustEndResult(null));
let getter=false;const access={...result};Object.defineProperty(access,"gold",{enumerable:true,get(){getter=true;return result.gold;}});
assert.throws(()=>parseEntrustEndResult(access));assert.equal(getter,false);
const row={serial:0,card_exp:1,user_exp:1,gold:1,begin_utc:"100",end_utc:"250",item:"[]"};
const job=parseEntrustStart({entrust_id:1,stage_id:"AUTHORED",cnt:3,complete_second:150,skip_price:0,entrust_second_per_cost:1,
  list:[row,{...row,serial:1,end_utc:"0"},{...row,serial:2,end_utc:"999"}]});
assert.equal(entrustDerivedEndWord(job),550,"First zero stops prefix; later999 ignored, two remaining×150 added");
assert.equal(entrustCountdown(job,500),50);assert.equal(entrustCountdown(job,550),0);assert.equal(entrustCountdown(job,600),0);
assert.equal(entrustCountdown({...job,entrust_id:"0"},500),-1);
assert.equal(entrustNativeClearCount(job,250),1,"Equality elapsed and all rows scanned");
assert.equal(entrustNativeClearCount(job,100),3,"No elapsed rows falls back to full count, not reward eligibility");
assert.equal(entrustNativeClearCount(job,999),2,"Later row counts despite earlier zero");
assert.equal(entrustDerivedEndWord({...job,list:job.list.map(row=>({...row,end_utc:"0"}))}),450,"All zero uses origin0 rather than now");
assert.equal(entrustDerivedEndWord({...job,list:[]}),0);assert.equal(entrustNativeClearCount({...job,list:[]},100),0);
const wrap={...job,list:[{...row,end_utc:"4294967280"},{...row,end_utc:"0"}]};
assert.equal(entrustDerivedEndWord(wrap),134);assert.equal(entrustCountdown(wrap,0xffff_fff0),150,"Native subtraction wraps before signed clamp");
assert.equal(entrustDerivedEndWord({...job,list:[{...row,end_utc:"4294967546"}]}),250,"Low32 countdown consumer retains full64 source");
assert.equal(entrustNativeClearCount({...job,list:[{...row,end_utc:"18446744073709551615"},{...row,end_utc:"999"}]},100),1,"Signed64−1 end is elapsed, rather than unsigned comparison/full fallback");
assert.throws(()=>entrustCountdown(job,1.5));assert.throws(()=>entrustCountdown(job,0x1_0000_0000));
assert.equal(JSON.stringify(result),bytes);
console.log("Entrust End/clock: exact nested AP and effective32 charge time, full64 settlement identities, absolute snapshots/delta item grammar, prefix lowword countdown/wrap and all-row ClearCount fallback passed; no job or reward authority.");
