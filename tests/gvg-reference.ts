import assert from "node:assert/strict";
import {parseGvgReference,gvgRewardEntries,gvgCampLinks,GVG_REWARD_SCALARS} from "../src/gvg-reference.js";
const registry={cards:new Set(["AUTHORED_CARD"]),items:new Set(["AUTHORED_ITEM"]),skins:new Set(["AUTHORED_SKIN"])};
// Authored offline decoder probes only. No original dates/camps/reward quantities.
const preview={...Object.fromEntries(GVG_REWARD_SCALARS.map(key=>[key,0])),
  card_list:'[{"id":"AUTHORED_CARD","qty":2}]',item_list:"[]",skin_list:""};
const data={gvg:{id:"AUTHORED_SEASON",min_entry_cnt:1,teaser_begin_dtm:100,register_begin_dtm:200,matching_begin_dtm:300,
  deploy_begin_dtm:400,combat_begin_dtm:500,calc_begin_dtm:600,result_begin_dtm:700,finish_dtm:800,next_gvg_dtm:900},
  reward:[{...preview,min_cp:0,max_cp:-1}],inf_reward:[{...preview,card_list:"[]"},{...preview,card_list:"[]"}],
  point:[{id:0,val:-2},{id:17,val:23}],camp:[{camp_id:"A",min_cp:0,name:"길드 🧭",link_camp:'["B"]'},
    {camp_id:"B",min_cp:10,link_camp:"[]"}]};
const raw={result_code:1,ret_data:data},snapshot=JSON.stringify(raw);
const decoded=parseGvgReference(raw,registry);
assert.deepEqual(decoded,data);
assert.equal(decoded.reward[0].skin_list,"");assert.equal(decoded.reward[0].item_list,"[]");
assert.deepEqual(gvgRewardEntries(preview.card_list,registry.cards),[{id:"AUTHORED_CARD",qty:2}]);
assert.deepEqual(gvgCampLinks(data.camp[0].link_camp),["B"]);
decoded.gvg.id="changed";decoded.reward[0].gold=999;decoded.camp[0].name="changed";
assert.equal(JSON.stringify(raw),snapshot);
assert.deepEqual(parseGvgReference({result_code:1,ret_data:{...data,reward:[],inf_reward:[],point:[],camp:[]}}).reward,[],"Explicit empty tables offline are not generated defaults");
assert.throws(()=>parseGvgReference(raw),/unknown/);
for(const key of ["reward","inf_reward","point","camp"] as const){
  const missing=structuredClone(data) as any;delete missing[key];
  assert.throws(()=>parseGvgReference({result_code:1,ret_data:missing},registry));
  assert.throws(()=>parseGvgReference({result_code:1,ret_data:{gvg:{...data.gvg,[key]:data[key]}}},registry),/field/);
}
for(const patch of [{id:""},{min_entry_cnt:-1},{teaser_begin_dtm:"100"},{finish_dtm:0x1_0000_0000},{next_gvg_dtm:1.5}])
  assert.throws(()=>parseGvgReference({result_code:1,ret_data:{...data,gvg:{...data.gvg,...patch}}},registry));
for(const patch of [{card_list:[]},{item_list:'[{"ref_id":"AUTHORED_ITEM","qty":1}]'},{card_list:'[{"id":"MISSING","qty":1}]'},
  {card_list:'[{"id":"AUTHORED_CARD","qty":1},{"id":"AUTHORED_CARD","qty":2}]'},
  {skin_list:'[{"id":"AUTHORED_SKIN","qty":-1}]'},{gold:0x1_0000_0000},{paid_iap:undefined},{min_cp:-0x8000_0001}])
  assert.throws(()=>parseGvgReference({result_code:1,ret_data:{...data,reward:[{...data.reward[0],...patch}]}},registry));
assert.throws(()=>parseGvgReference({result_code:1,ret_data:{...data,inf_reward:[preview,preview,preview]}},registry),/two/);
assert.throws(()=>parseGvgReference({result_code:1,ret_data:{...data,point:[data.point[0],data.point[0]]}},registry),/Duplicate/);
for(const patch of [{name:{EN:"Name"}},{name:"bad\ud800"},{link_camp:[]},{link_camp:""},{link_camp:'["MISSING"]'},
  {link_camp:'["A"]'},{link_camp:'["B","B"]'},{link_camp:"[1]"}])
  assert.throws(()=>parseGvgReference({result_code:1,ret_data:{...data,camp:[{...data.camp[0],...patch},data.camp[1]]}},registry));
assert.throws(()=>parseGvgReference({result_code:1,ret_data:{...data,camp:[data.camp[0],data.camp[0]]}},registry),/Duplicate/);
assert.throws(()=>parseGvgReference({...raw,result_code:2001},registry));
assert.equal(JSON.stringify(raw),snapshot);
console.log("GvG supplied reference: corrected sibling tables, exact scalar domains, raw reward/link JSON strings, known IDs, two infinite slots, detached graph and malformed/partial refusal passed; offline only.");
