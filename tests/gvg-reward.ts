import assert from "node:assert/strict";
import {GVG_REWARD_SCALARS} from "../src/gvg-reference.js";
import {gvgRewardAt} from "../src/gvg-reward.js";

// Authored offline probes. No original CP quantities, dates or rewards.
const preview={...Object.fromEntries(GVG_REWARD_SCALARS.map(key=>[key,0])),card_list:"[]",item_list:"[]",skin_list:"[]"};
const data={gvg:{id:"AUTHORED",min_entry_cnt:1,teaser_begin_dtm:1,register_begin_dtm:2,matching_begin_dtm:3,
  deploy_begin_dtm:4,combat_begin_dtm:5,calc_begin_dtm:6,result_begin_dtm:7,finish_dtm:8,next_gvg_dtm:9},
  reward:[{...preview,min_cp:0,max_cp:10,gold:1},{...preview,min_cp:5,max_cp:20,gold:2},
    {...preview,min_cp:20,max_cp:30,gold:3}],inf_reward:[],point:[],camp:[]};
const raw={result_code:1,ret_data:data},bytes=JSON.stringify(raw);
assert.equal(gvgRewardAt(raw,0)?.gold,1,"Lower bound is included");
assert.equal(gvgRewardAt(raw,5)?.gold,1,"First wire row wins overlapping intervals");
assert.equal(gvgRewardAt(raw,9)?.gold,1);
assert.equal(gvgRewardAt(raw,10)?.gold,2,"Upper bound is excluded");
assert.equal(gvgRewardAt(raw,20)?.gold,3);
for(const cp of [-1,30,0x7fff_ffff,-0x8000_0000])assert.equal(gvgRewardAt(raw,cp),undefined,"No fallback reward on a miss");
assert.equal(gvgRewardAt({result_code:1,ret_data:{...data,reward:[]}},0),undefined);
const negative={result_code:1,ret_data:{...data,reward:[{...preview,min_cp:-10,max_cp:-1,gold:4}]}};
assert.equal(gvgRewardAt(negative,-2)?.gold,4,"Signed negative interval is ordinary");
assert.equal(gvgRewardAt(negative,-1),undefined,"Max=-1 is not open-ended");
assert.equal(gvgRewardAt(negative,0),undefined);
const reversed={result_code:1,ret_data:{...data,reward:[{...preview,min_cp:10,max_cp:5}]}};
assert.equal(gvgRewardAt(reversed,7),undefined,"No interval sorting or correction");
const reordered={result_code:1,ret_data:{...data,reward:[data.reward[1],data.reward[0]]}};
assert.equal(gvgRewardAt(reordered,5)?.gold,2,"Wire order is preserved");
const result=gvgRewardAt(raw,0)!;result.gold=999;result.card_list="changed";
assert.equal(JSON.stringify(raw),bytes);assert.equal(gvgRewardAt(raw,0)?.gold,1,"Selected result is detached");
for(const cp of [1.5,NaN,Infinity,0x8000_0000,-0x8000_0001,"1",null])assert.throws(()=>gvgRewardAt(raw,cp as number),/int32/);
assert.throws(()=>gvgRewardAt({result_code:2001,ret_data:data},0));
assert.throws(()=>gvgRewardAt({result_code:1,ret_data:{...data,reward:[{...data.reward[0],max_cp:0xffff_ffff}]}},0));
console.log("GvG reward lookup: signed inclusive/exclusive boundaries, first wire match, max−1 without sentinel, empty/missing/reversed ranges, detached results and invalid CP/reference refusal passed; no grant.");
