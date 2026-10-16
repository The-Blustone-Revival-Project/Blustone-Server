import assert from "node:assert/strict";
import {parseMirageRegisterDeck,planMirageRegisterDeck,mirageRegisterDeckWire} from "../src/mirage-register.js";
import type {MirageReadiness} from "../src/mirage-cache.js";
for(const raw of ["[1.0]","[1e2]","[-0]"])assert.throws(()=>parseMirageRegisterDeck(raw));

// Independently authored offline cache; no original catalogue, entry producer,
// run creation, live publication or health initialization is asserted.
const enemy={ref_id:"AUTHORED_ENEMY",hp_percent:10000,rank:1,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:1,skill_5_level:1};
const source={entry:[{id:101,mirage_remain_hp:10000},{id:102,mirage_remain_hp:5000},{id:103,mirage_remain_hp:0}],
  inst_base:{bg_res:"AUTHORED_BASE",dlg_begin:"AUTHORED_DIALOG",dlg_end:"",new_record:255,floor:2,stair:1,state:1,
    deck:[101],tier_percent:4,highest:7,revive_price:3,begin_ltime:100},inst_enemy:[enemy],
  ref_stair:{res_prefix:"AUTHORED_PREFIX_",res_postfix_list:["002"],list:[{grade:1,balance:10000}]},
  ref_hero:{bonus:2,end_ltime:200,cur:["AUTHORED_HERO_A"],next:["AUTHORED_HERO_B"]}};
const context:MirageReadiness={owned:new Map([[101,{ref_id:"AUTHORED_HERO_A",char_id:"Authored A"}],
  [102,{ref_id:"AUTHORED_HERO_B",char_id:"Authored B"}],[103,{ref_id:"AUTHORED_HERO_C",char_id:"Authored C"}]]),
  commitments:new Map([[101,10000],[102,5000],[103,0]]),heroIds:new Set(["AUTHORED_HERO_A","AUTHORED_HERO_B"]),
  resources:new Set(["AUTHORED_BASE","AUTHORED_PREFIX_002"]),dialogueIds:new Set(["AUTHORED_DIALOG"]),
  environments:new Map([["env-key","STI002"]]),readyEnvironments:new Set(["env-key"]),
  enemySupported:row=>row.ref_id==="AUTHORED_ENEMY"&&row.rank===1,now:200};
const bytes=JSON.stringify(source),owned=JSON.stringify([...context.owned]),commitments=JSON.stringify([...context.commitments]);
function unchanged(){assert.equal(JSON.stringify(source),bytes);assert.equal(JSON.stringify([...context.owned]),owned);
  assert.equal(JSON.stringify([...context.commitments]),commitments);}
assert.deepEqual(parseMirageRegisterDeck("[102,0,101]"),["102","0","101"]);
assert.deepEqual(parseMirageRegisterDeck("[]"),[],"Wire decoding alone does not invent native nonempty policy");
assert.deepEqual(parseMirageRegisterDeck("[18446744073709551615,9007199254740993]"),
  ["18446744073709551615","9007199254740993"],"Capture exact numeric tokens before JS rounding");
assert.equal(JSON.stringify(mirageRegisterDeckWire(["18446744073709551615","9007199254740993","101"])),
  "[18446744073709551615,9007199254740993,101]","Bare numeric reply retains all64 bits, not string IDs/wrapper");
assert.deepEqual(mirageRegisterDeckWire(["102","101"]),[102,101]);
for(const raw of [undefined,null,[101],101,"null","{}","[true]","[null]","[-1]","[1.5]","[18446744073709551616]",
  "[1e20]","[101,102,103,104,105,106]","[\"101\"]","[\"18446744073709551615\"]","[\"01\"]","[101,]"])
  assert.throws(()=>parseMirageRegisterDeck(raw),`Malformed/non-native request ${String(raw)}`);
for(const id of ["-1","01","","18446744073709551616","1e2"])
  assert.throws(()=>mirageRegisterDeckWire([id]));

const planned=planMirageRegisterDeck(source,"[102,0,101,0]",context);
assert.deepEqual(planned.deck,["102","101"],"Zeros omitted without reordering living IDs");
assert.deepEqual(planned.cache.inst_base.deck,["102","101"]);
assert.deepEqual(planned.cache.entry,source.entry,"Registration does not heal/reset/remove entered Hunters, including dead reserve");
assert.deepEqual(planned.cache.inst_enemy,source.inst_enemy);assert.deepEqual(planned.cache.ref_stair,source.ref_stair);
assert.deepEqual(planned.cache.ref_hero,source.ref_hero);
const {deck:oldDeck,...oldBase}=source.inst_base,{deck:newDeck,...newBase}=planned.cache.inst_base;
assert.deepEqual(newBase,oldBase,"State, floor, stair, clocks, record and prices remain supplied values");
unchanged();
for(const list of ["[]","[0,0]","[101,101]","[103]","[101,103]","[999]","[18446744073709551615]"]){
  assert.throws(()=>planMirageRegisterDeck(source,list,context));unchanged();
}
function withFamilies(a:string,b:string):MirageReadiness{return {...context,owned:new Map([...context.owned].map(([id,row])=>
  [id,{...row,char_id:id===101?a:id===102?b:row.char_id}]))};}
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",withFamilies("Same","Same")),/families/,
  "Different instances and references sharing exact native base.char_id are forbidden");
assert.deepEqual(planMirageRegisterDeck(source,"[101,102]",withFamilies("Same","same")).deck,["101","102"],
  "Native duplicate-family compare is case-sensitive");
assert.deepEqual(planMirageRegisterDeck(source,"[101,102]",withFamilies("헌터","ハンター")).deck,["101","102"]);
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",withFamilies("헌터","헌터")),/families/);
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",withFamilies("","Known")),/families/);
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",withFamilies("bad\ud800","Known")),/lossless/);
// Character identity is independent of localization/display names. The old
// allocation-relative offset reading mislabeled char_id as base.name.
const named=(a:string,b:string,familyA:string,familyB:string):MirageReadiness=>({...context,owned:new Map([...context.owned].map(([id,row])=>
  [id,{...row,name:id===101?a:b,char_id:id===101?familyA:familyB}]))});
assert.deepEqual(planMirageRegisterDeck(source,"[101,102]",named("Shared name","Shared name","family-a","family-b")).deck,["101","102"]);
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",named("Different A","Different B","same-family","same-family")),/families/);
assert.deepEqual(planMirageRegisterDeck(source,"[101,102]",named("","","family-a","family-b")).deck,["101","102"],"Name presence is not this native admission gate");
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",{...context,owned:new Map([[101,context.owned.get(101)!]])}),/commitments/);
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",{...context,commitments:new Map([[101,1000],[102,5000],[103,0]])}),/commitments/);
assert.throws(()=>planMirageRegisterDeck(source,"[101,102]",{...context,owned:new Map([...context.owned].map(([id,row])=>
  [id,{...row,ref_id:id===102?"AUTHORED_HERO_A":row.ref_id}]))}),/distinct living/,
  "Distinct-ref restriction remains explicitly additional LOCAL readiness policy");
assert.throws(()=>planMirageRegisterDeck({...source,inst_base:{...source.inst_base,state:2}},"[101]",context));
assert.throws(()=>planMirageRegisterDeck(source,"[101]",{...context,enemySupported:()=>false}));
unchanged();
planned.deck.push("999");planned.cache.inst_base.deck.reverse();planned.cache.entry[0].mirage_remain_hp=1;
planned.cache.inst_enemy[0].hp_percent=0;planned.cache.ref_stair.list[0].balance=1;planned.cache.ref_hero.cur.push("NEW");
unchanged();assert.deepEqual(newDeck,["101","102"],"Returned cache/deck can change independently of input");
console.log("Mirage registration: numeric JSON-string/full64 bare wire, zero omission/order, malformed refusal, living owned five-slot and exact character-family admission, detached existing cache/HP/state preservation passed; no run/publication.");
