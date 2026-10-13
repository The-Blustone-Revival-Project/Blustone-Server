import assert from "node:assert/strict";
import {parseMirageCache,parseMirageCacheJson,mirageCacheWire,mirageHpRatio,mirageBalanceScale,requireMirageCombatCache,type MirageReadiness} from "../src/mirage-cache.js";

// Authored offline data and symbolic bindings: no original floor/actor/material claim.
const enemy={ref_id:"AUTHORED_ENEMY",hp_percent:10000,rank:1,rank_up_cnt:0,overcome_cnt:0,exp:0,
  skill_1_level:1,skill_2_level:1,skill_3_level:1,skill_4_level:1,skill_5_level:1};
const source={entry:[{id:101,mirage_remain_hp:10000},{id:102,mirage_remain_hp:5000}],
  inst_base:{bg_res:"AUTHORED_BASE",dlg_begin:"AUTHORED_DIALOG",dlg_end:"",new_record:1,floor:1,stair:1,state:1,
    deck:[101,102,0],tier_percent:0,highest:1,revive_price:0,begin_ltime:100},inst_enemy:[enemy],
  ref_stair:{res_prefix:"AUTHORED_PREFIX_",res_postfix_list:["AUTHORED_BG"],list:[{grade:1,balance:10000}]},
  ref_hero:{bonus:0,end_ltime:200,cur:["AUTHORED_HERO_A"],next:["AUTHORED_HERO_B"]}};
const context:MirageReadiness={owned:new Map([[101,{ref_id:"AUTHORED_HERO_A"}],[102,{ref_id:"AUTHORED_HERO_B"}]]),
  commitments:new Map([[101,10000],[102,5000]]),heroIds:new Set(["AUTHORED_HERO_A","AUTHORED_HERO_B"]),
  resources:new Set(["AUTHORED_BASE","AUTHORED_BG","AUTHORED_PREFIX_AUTHORED_BG"]),dialogueIds:new Set(["AUTHORED_DIALOG"]),
  enemySupported:row=>row.ref_id==="AUTHORED_ENEMY"&&row.rank===1,now:200};
const bytes=JSON.stringify(source),decoded=parseMirageCache(source);
assert.deepEqual(decoded.inst_base.deck,["101","102","0"]);
assert.deepEqual(requireMirageCombatCache(source,context),decoded,"Complete supplied commitments at exact hero deadline admitted by local subset");
assert.equal(mirageHpRatio(10000),1);assert.equal(mirageHpRatio(1000),Math.fround(0.1),"Legacy1000 is not native full carry");
assert.equal(mirageHpRatio(5000),0.5);assert.equal(mirageHpRatio(-1),Math.fround(-0.0001));
assert.equal(mirageBalanceScale(10000),1);assert.equal(mirageBalanceScale(0),0);
assert.equal(mirageBalanceScale(-10000),-1,"Raw signed balance survives offline arithmetic; readiness is separate");
const signed=parseMirageCache({...source,entry:[{id:101,mirage_remain_hp:-1}],inst_base:{...source.inst_base,new_record:255,floor:-1},
  ref_stair:{...source.ref_stair,list:[{grade:-1,balance:-10000}]},ref_hero:{...source.ref_hero,bonus:-1,end_ltime:-1}});
assert.equal(signed.entry[0].mirage_remain_hp,-1);assert.equal(signed.inst_base.floor,-1);assert.equal(signed.ref_hero.bonus,-1);
assert.throws(()=>parseMirageCache({...source,entry:[{id:101,mirage_remain_hp:0xffff_ffff}]}),/width/);
assert.throws(()=>parseMirageCache({...source,inst_base:{...source.inst_base,new_record:256}}),/byte/);
assert.throws(()=>parseMirageCache({...source,inst_base:{...source.inst_base,floor:0x8000_0000}}),/width/);
assert.throws(()=>parseMirageCache({...source,inst_enemy:[{...enemy,rank:-1}]}),/width/);
assert.throws(()=>parseMirageCache({...source,inst_enemy:[{...enemy,n:1}]}),/fields/,"Unproved n ordinal is not a parsed enemy field");
assert.throws(()=>parseMirageCache({...source,inst_enemy:[{...enemy,hp_percent:undefined}]}),/width/);
assert.throws(()=>parseMirageCache({...source,ref_hero:{...source.ref_hero,cur:{0:"AUTHORED_HERO_A"}}}),/arrays/);
assert.throws(()=>parseMirageCache({...source,inst_base:{...source.inst_base,deck:{id:101}}}),/arrays/);
const wide=bytes.replace('"deck":[101,102,0]','"deck":[18446744073709551615,102,0]');
const exact=parseMirageCacheJson(wide);assert.equal(exact.inst_base.deck[0],"18446744073709551615");
assert.ok(JSON.stringify(mirageCacheWire(exact)).includes('"deck":[18446744073709551615,102,0]'));
assert.throws(()=>parseMirageCache(JSON.parse(wide)),/uint64/);
assert.throws(()=>parseMirageCacheJson(wide.replace("18446744073709551615","1e20")));
assert.throws(()=>requireMirageCombatCache(exact,context),/sortie/);
let invoked=false;const getter={...source};Object.defineProperty(getter,"inst_base",{enumerable:true,get(){invoked=true;return source.inst_base;}});
assert.throws(()=>parseMirageCache(getter));assert.equal(invoked,false);
const indexed:any[]=[];Object.defineProperty(indexed,"0",{enumerable:true,get(){invoked=true;return enemy;}});
assert.throws(()=>parseMirageCache({...source,inst_enemy:indexed}));assert.equal(invoked,false);
const custom=[enemy];Object.defineProperty(custom,Symbol.iterator,{value:function*(){invoked=true;yield enemy;}});
assert.throws(()=>parseMirageCache({...source,inst_enemy:custom}));assert.equal(invoked,false);
assert.throws(()=>parseMirageCache(Object.create(source)));assert.throws(()=>parseMirageCache({...source,entry:Array(1)}));
assert.throws(()=>parseMirageCache({...source,inst_base:{...source.inst_base,bg_res:"bad\ud800"}}),/lossless/);
for(const patch of [{commitments:new Map([[101,1000],[102,5000]])},{commitments:new Map([[101,10000]])},
  {heroIds:new Set<string>()},{resources:new Set(["AUTHORED_BASE","AUTHORED_PREFIX_AUTHORED_BG"])},
  {dialogueIds:new Set<string>()},{enemySupported:()=>false},{now:201}])assert.throws(()=>requireMirageCombatCache(source,{...context,...patch}));
for(const patch of [{floor:0},{stair:0},{stair:2},{state:2},{revive_price:-1},{deck:[101,101]},
  {deck:[101,999]},{deck:[0,0]}])assert.throws(()=>requireMirageCombatCache({...source,inst_base:{...source.inst_base,...patch}},context));
assert.throws(()=>requireMirageCombatCache({...source,entry:[...source.entry,source.entry[0]]},context));
assert.throws(()=>requireMirageCombatCache({...source,inst_enemy:[{...enemy,hp_percent:0}]},context));
assert.throws(()=>requireMirageCombatCache({...source,ref_stair:{...source.ref_stair,list:[{grade:4,balance:10000}]}},context));
assert.throws(()=>requireMirageCombatCache({...source,ref_stair:{...source.ref_stair,list:[{grade:1,balance:0}]}},context));
assert.throws(()=>requireMirageCombatCache({...source,ref_stair:{...source.ref_stair,res_postfix_list:[]}},context));
const detached=requireMirageCombatCache(source,context);detached.entry[0].mirage_remain_hp=0;detached.ref_stair.list[0].balance=1;
assert.equal(JSON.stringify(source),bytes);
// An external projection predicate must not rewrite the retained source DTO.
assert.throws(()=>requireMirageCombatCache(source,{...context,enemySupported:row=>{
  (row as {rank:number}).rank=5;return true;
}}),TypeError,"Projection callbacks cannot mutate frozen source-check inputs");
const isolated=requireMirageCombatCache(source,{...context,enemySupported:row=>{assert.equal(Object.isFrozen(row),true);return true;}});
assert.deepEqual(isolated.inst_enemy,[enemy]);assert.equal(JSON.stringify(source),bytes);
console.log("Mirage cache: exact source fields/widths, full64 deck capture, signed HP10000 unit and balance math, strict JSON/detachment, complete commitment/resource/hero readiness and predicate isolation passed; no native cache publication, actors or grants.");
