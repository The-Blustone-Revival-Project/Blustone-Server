import assert from "node:assert/strict";
import {applySkillMaterialPrices,skillMaterialRequirements,planSkillMaterials} from "../src/skill-materials.js";
import {createSkillLevelRows,type SkillLevelRow} from "../src/skill-training.js";
import type {LocalItemInstance} from "../src/game.js";

const allowed=new Set(["capsule","trace"]);
const base=createSkillLevelRows("legacy");
const recipe=(level=2):Record<string,unknown>=>({role:1,level,
  source_1_ref_id:"capsule",source_1_qty:2,source_2_ref_id:"capsule",source_2_qty:3,
  source_3_ref_id:"trace",source_3_qty:1,source_4_ref_id:"",source_4_qty:0});
const original=structuredClone(base),raw=[recipe()];
const projected=applySkillMaterialPrices(base,raw);
const price=projected.find(row=>row.role===1&&row.level===2)!;
assert.deepEqual(base,original,"Overlay never mutates base rows");
assert.notEqual(projected[0],base[0]);
assert.equal(price.gold,200,"Material recipes cannot rewrite gold/caps/roles");
assert.equal(price.rank,1);
assert.deepEqual(skillMaterialRequirements([price],allowed),new Map([["capsule",5],["trace",1]]));
raw[0].source_1_qty=999;
assert.equal(price.source_1_qty,2,"Output does not alias input recipe");
assert.deepEqual(projected.filter(row=>row!==price),base.filter(row=>!(row.role===1&&row.level===2)));

for(const invalid of [null,{},[recipe(),recipe()],Array(1),[undefined],
  [{...recipe(),role:5}],[{...recipe(),level:51}],[{...recipe(),source_1_qty:0}],
  [{...recipe(),source_1_ref_id:""}],[{...recipe(),source_1_qty:-1}],
  [{...recipe(),source_1_qty:0x1_0000_0000}],[{...recipe(),source_1_qty:1.5}],
  [{...recipe(),source_1_qty:NaN}],[{...recipe(),source_1_ref_id:"\ud800"}],
  [{...recipe(),gold:0}],[Object.assign(Object.create(null),recipe())]]) {
  assert.throws(()=>applySkillMaterialPrices(base,invalid),TypeError);
  assert.deepEqual(base,original);
}
let getters=0;
const getter={...recipe()};Object.defineProperty(getter,"source_1_qty",{enumerable:true,get(){getters++;return 2;}});
assert.throws(()=>applySkillMaterialPrices(base,[getter]),TypeError);
const accessorArray=[recipe()];Object.defineProperty(accessorArray,"0",{enumerable:true,get(){getters++;return recipe();}});
assert.throws(()=>applySkillMaterialPrices(base,accessorArray),TypeError);
assert.equal(getters,0,"Reject accessors before invocation");
const symbolRow={...recipe(),[Symbol("extra")]:1};assert.throws(()=>applySkillMaterialPrices(base,[symbolRow]),TypeError);
assert.throws(()=>applySkillMaterialPrices(base,Array.from({length:201},()=>recipe())),TypeError);
assert.throws(()=>skillMaterialRequirements([price],new Set(["capsule"])),/published ordinary/);
const huge={...price,source_1_qty:0xffff_ffff};
assert.throws(()=>skillMaterialRequirements([huge],allowed),/uint32/);
const one={...price,source_1_qty:1,source_2_qty:0,source_2_ref_id:"",source_3_qty:0,source_3_ref_id:""};
assert.throws(()=>skillMaterialRequirements([{...one,source_1_qty:0xffff_ffff},one],allowed),/uint32/);

const items:LocalItemInstance[]=[
  {inst_id:90,ref_id:"capsule",qty:100,lock:1},
  {inst_id:12,ref_id:"capsule",qty:4,lock:0},
  {inst_id:3,ref_id:"capsule",qty:2,lock:0},
  {inst_id:5,ref_id:"capsule",qty:0,lock:0},
  {inst_id:20,ref_id:"trace",qty:1,lock:0},
  {inst_id:80,ref_id:"unrelated",qty:13,lock:1},
];
const before=structuredClone(items);
for(const item of items)Object.freeze(item);Object.freeze(items);
const planned=planSkillMaterials(items,[price],allowed);
assert.deepEqual(items,before,"Input inventory remains exact, including frozen rows");
assert.deepEqual(planned.single,[{inst_id:3,qty:2},{inst_id:12,qty:3},{inst_id:20,qty:1}],"Lowest-ID unlocked stacks split demand deterministically");
assert.deepEqual(planned.multi,[{inst_id:3,remain:0},{inst_id:12,remain:1},{inst_id:20,remain:0}],"Multi reports absolute remaining quantities");
assert.equal(planned.items.length,items.length,"No grants or zero-stack erasure");
assert.deepEqual(planned.items.map(row=>row.qty),[100,1,0,0,0,13]);
assert.deepEqual(planned.items.map(({qty,...rest})=>rest),items.map(({qty,...rest})=>rest));
for(let i=0;i<items.length;i++)assert.notEqual(planned.items[i],items[i]);
// Independently replay the native single subtract and multi absolute-set laws.
const singleClient=structuredClone(before),multiClient=structuredClone(before);
for(const row of planned.single)singleClient.find(item=>item.inst_id===row.inst_id)!.qty-=row.qty;
for(const row of planned.multi)multiClient.find(item=>item.inst_id===row.inst_id)!.qty=row.remain;
assert.deepEqual(singleClient,planned.items);assert.deepEqual(multiClient,planned.items);
const empty=planSkillMaterials(items,[],allowed);assert.equal(empty.items,items);assert.deepEqual(empty.single,[]);assert.deepEqual(empty.multi,[]);
const reject=(stock:LocalItemInstance[],prices:SkillLevelRow[]=[price])=>{
  const saved=structuredClone(stock);assert.throws(()=>planSkillMaterials(stock,prices,allowed),TypeError);assert.deepEqual(stock,saved);
};
reject(before.filter(item=>item.ref_id!=="trace")); // Later-reference shortage cannot partially consume earlier stacks.
reject(before.map(item=>item.ref_id==="capsule"?{...item,lock:1}:item));
reject([...before,{inst_id:80,ref_id:"other",qty:1,lock:0}]); // Global duplicate even unrelated to recipe.
reject([...before,{inst_id:Number.MAX_SAFE_INTEGER+1,ref_id:"other",qty:1,lock:0}]);
reject(before.map(item=>item.inst_id===12?{...item,qty:0x1_0000_0000}:item));
reject(before.map(item=>item.inst_id===90?{...item,lock:2}:item));
reject([{inst_id:1,ref_id:"capsule",qty:0xffff_ffff,lock:0},{inst_id:2,ref_id:"capsule",qty:1,lock:0}],[one]);
console.log("Skill material planning: strict sparse recipes, allowed registry, uint32 bounds, deterministic locked-stack preservation, native delta/absolute projections and immutable all-or-nothing failures passed.");
