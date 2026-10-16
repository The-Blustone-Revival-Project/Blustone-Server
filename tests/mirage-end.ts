import assert from "node:assert/strict";
import {parseMirageEnd,planMirageEnd} from "../src/mirage-end.js";
import type {MirageReadiness} from "../src/mirage-cache.js";

// Authored complete cache/context, not original floor/actor/balance data.
const enemy=(ref_id:string)=>({ref_id,hp_percent:10000,rank:1,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:1,skill_5_level:1});
const cache={entry:[{id:101,mirage_remain_hp:10000},{id:102,mirage_remain_hp:5000},{id:103,mirage_remain_hp:2500}],
  inst_base:{bg_res:"AUTHORED_BASE",dlg_begin:"",dlg_end:"",new_record:0,floor:1,stair:1,state:1,
    deck:["101","102"],tier_percent:0,highest:1,revive_price:0,begin_ltime:100},inst_enemy:[enemy("E1"),enemy("E2")],
  ref_stair:{res_prefix:"AUTHORED_PREFIX_",res_postfix_list:["002"],list:[{grade:1,balance:10000}]},
  ref_hero:{bonus:0,end_ltime:200,cur:[],next:[]}};
const context:MirageReadiness={owned:new Map([[101,{ref_id:"A",char_id:"family-a"}],[102,{ref_id:"B",char_id:"family-b"}],[103,{ref_id:"C",char_id:"family-c"}]]),
  commitments:new Map([[101,10000],[102,5000],[103,2500]]),heroIds:new Set(),resources:new Set(["AUTHORED_BASE","AUTHORED_PREFIX_002"]),
  dialogueIds:new Set(),environments:new Map([["2","STI002"]]),readyEnvironments:new Set(["2"]),enemySupported:row=>["E1","E2"].includes(row.ref_id),now:200};
const packet={floor:"1",stair:"1",remain_deck_hp:'[{"inst_id":102,"hp_percent":10000},{"inst_id":101,"hp_percent":8700}]',remain_enemy_hp:"[0,0]"};
const before=structuredClone(cache),owned=JSON.stringify([...context.owned]),committed=JSON.stringify([...context.commitments]);
const won=planMirageEnd(cache,packet,context);
assert.equal(won.won,true);assert.equal(won.cache.inst_base.state,2);
assert.deepEqual(won.receipt,{state:2,deck:[{inst_id:101,remain_hp_percent:8700},{inst_id:102,remain_hp_percent:10000}],
  dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[]});
assert.deepEqual(won.cache.entry,[{id:101,mirage_remain_hp:8700},{id:102,mirage_remain_hp:10000},{id:103,mirage_remain_hp:2500}],"Selected healer may increase carry; reserve is untouched");
const expected=structuredClone(before);expected.inst_base.state=2;expected.entry[0].mirage_remain_hp=8700;expected.entry[1].mirage_remain_hp=10000;
expected.inst_enemy.forEach(row=>row.hp_percent=0);assert.deepEqual(won.cache,expected,"End changes no floor/stair/resource/hero/enemy progression/reward fields");
assert.deepEqual(cache,before);assert.equal(JSON.stringify([...context.owned]),owned);assert.equal(JSON.stringify([...context.commitments]),committed);
assert.equal(Object.hasOwn(won.receipt,"user"),false);assert.equal(Object.hasOwn(won.receipt,"item"),false);
const sorted={...packet,remain_deck_hp:'[{"inst_id":101,"hp_percent":8700},{"inst_id":102,"hp_percent":10000}]'};
assert.equal(planMirageEnd(cache,sorted,context).fingerprint,won.fingerprint,"Canonical selected order reconciles equivalent reports");
const loss={...packet,remain_deck_hp:'[{"inst_id":101,"hp_percent":0},{"inst_id":102,"hp_percent":0}]',remain_enemy_hp:"[0,2500]"};
const lost=planMirageEnd(cache,loss,context);assert.equal(lost.won,false);assert.equal(lost.cache.inst_base.state,1);
assert.deepEqual(lost.cache.entry.map(row=>row.mirage_remain_hp),[0,0,2500]);assert.deepEqual(lost.cache.inst_enemy.map(row=>row.hp_percent),[0,2500]);
const full64=parseMirageEnd({...packet,remain_deck_hp:'[{"inst_id":18446744073709551615,"hp_percent":1},{"inst_id":9007199254740993,"hp_percent":2}]'});
assert.deepEqual(full64.deck,[{id:"18446744073709551615",hp:1},{id:"9007199254740993",hp:2}]);
const rejects=(extra:object)=>{assert.throws(()=>planMirageEnd(cache,{...packet,...extra},context));assert.deepEqual(cache,before);};
for(const extra of [{floor:2},{stair:2},{floor:"01"},{floor:0},{stair:"2147483648"},{win:1},{state:2},{next_stair:2},
  {remain_deck_hp:[]},{remain_enemy_hp:[0,0]},{remain_deck_hp:"not JSON"},{remain_deck_hp:"null"},{remain_enemy_hp:"{}"},
  {remain_deck_hp:'[{"inst_id":101,"hp_percent":8700}]'},
  {remain_deck_hp:'[{"inst_id":101,"hp_percent":8700},{"inst_id":103,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":101,"hp_percent":8700},{"inst_id":101,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":"101","hp_percent":8700},{"inst_id":102,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":18446744073709551616,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":101,"hp_percent":10001},{"inst_id":102,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":101,"hp_percent":-0},{"inst_id":102,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":1.01e2,"hp_percent":100},{"inst_id":102,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":101,"hp_percent":"8700"},{"inst_id":102,"hp_percent":1}]'},
  {remain_deck_hp:'[{"inst_id":101,"hp_percent":8700,"extra":1},{"inst_id":102,"hp_percent":1}]'},
  {remain_enemy_hp:"[0]"},{remain_enemy_hp:"[0,0,0]"},{remain_enemy_hp:"[false,0]"},{remain_enemy_hp:"[0,0.5]"},
  {remain_enemy_hp:"[0,10001]"},{remain_enemy_hp:"[0,2500]"},
  {...loss,remain_enemy_hp:"[0,0]"}])rejects(extra);
assert.throws(()=>planMirageEnd(won.cache,packet,{...context,commitments:new Map(won.cache.entry.map(row=>[row.id,row.mirage_remain_hp]))}),/state/);
const wrongCommitment={...context,commitments:new Map([[101,10000],[102,5000]])};assert.throws(()=>planMirageEnd(cache,packet,wrongCommitment),/commitments/);
won.cache.entry[0].mirage_remain_hp=1;assert.deepEqual(cache,before,"Output arrays remain detached");
console.log("Mirage End: exact native JSON-string/full64 report, owner-bound selected camps, normal-health win/loss carry, reserve preservation, healing, canonical retry fingerprint and preserving rejection passed; no runtime run/reward enabled");
