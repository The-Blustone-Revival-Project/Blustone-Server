import assert from "node:assert/strict";
import {configuredHunterOvercome,hunterOvercomeWire,hunterOvercomeItems,hunterOvercomeFingerprint} from "../src/hunter-overcome-reference.js";

const known=new Set(["AIRSHIP_TICKET","existing_material"]);
const metadata=(id:string)=>({id,name:"Local catalyst",desc:"An explicitly supplied local material.",use_type:0,effect:"",thumbnail_id:"",rank:1,sell_price:0,collect_qty:0});
const recipe=(base:number,count:number)=>({target_base_rank:base,overcome_cnt:count,card_required_rank:3,card_cnt:1,item_list:[{ref_id:"AIRSHIP_TICKET",qty:2},{ref_id:"local_overcome_test",qty:1}],gold:17});
const input=()=>({effect:[{cnt:3,hp_percent:3.75,atk_percent:4,def_percent:2.5},{cnt:1,hp_percent:1.5,atk_percent:2.25,def_percent:0},
  {cnt:2,hp_percent:2.5,atk_percent:2.25,def_percent:1}],src:[1,2,3,4].flatMap(base=>[1,2,3].map(count=>recipe(base,count))).reverse(),items:[metadata("local_overcome_z"),metadata("local_overcome_test")]});
const raw=input(),rawBefore=structuredClone(raw),knownBefore=[...known],policy=configuredHunterOvercome(raw,known);
assert.deepEqual(raw,rawBefore);assert.deepEqual([...known],knownBefore);
assert.deepEqual(policy.effect.map(row=>row.cnt),[1,2,3]);assert.equal(policy.effect[0].hp_percent,1.5,"Raw wire percentages are not divided by100 or rounded to F32 here");
assert.deepEqual(policy.src.map(row=>[row.target_base_rank,row.overcome_cnt]),[1,2,3,4].flatMap(base=>[1,2,3].map(count=>[base,count])),"Every native base/count pair must be explicitly supplied and canonical");
assert.deepEqual(policy.items.map(row=>row.id),["local_overcome_test","local_overcome_z"]);
for(const array of [policy.effect,policy.src,policy.items]){assert.ok(Object.isFrozen(array));assert.ok(array.every(Object.isFrozen));}
assert.ok(Object.isFrozen(policy));assert.ok(policy.src.every(row=>Object.isFrozen(row.item_list)&&row.item_list.every(Object.isFrozen)));
assert.throws(()=>{(policy.effect[0] as any).hp_percent=999;},TypeError);
assert.throws(()=>{(policy.src[0].item_list as any[]).push({ref_id:"existing_material",qty:1});},TypeError);
assert.throws(()=>{(policy.items[0] as any).use_type=99;},TypeError);
const wire:any=hunterOvercomeWire(policy),items:any=hunterOvercomeItems(policy);
assert.deepEqual(Object.keys(wire),["effect","src"]);assert.equal("items" in wire,false);assert.equal(wire.effect.some((row:any)=>row.cnt===0),false);
wire.effect[0].hp_percent=999;wire.src[0].item_list[0].qty=999;items[0].name="Changed";
assert.equal(policy.effect[0].hp_percent,1.5);assert.equal(policy.src[0].item_list[0].qty,2);assert.equal(policy.items[0].name,"Local catalyst");
assert.notEqual(hunterOvercomeItems(policy),policy.items);
const fingerprint=hunterOvercomeFingerprint(policy),restored=configuredHunterOvercome(JSON.parse(fingerprint),known);
assert.equal(hunterOvercomeFingerprint(restored),fingerprint);assert.deepEqual(restored,policy);assert.notEqual(restored,policy);
const permuted=input();permuted.effect.reverse();permuted.src.reverse();permuted.items.reverse();permuted.src.forEach(row=>row.item_list.reverse());
const keysReordered=JSON.parse(JSON.stringify(permuted),function(_key,value){return value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse()):value;});
assert.equal(hunterOvercomeFingerprint(configuredHunterOvercome(JSON.stringify(keysReordered),known)),fingerprint);
for(const mutate of [(v:ReturnType<typeof input>)=>{v.effect[0].hp_percent=4;},(v:ReturnType<typeof input>)=>{v.src[0].gold=18;},
  (v:ReturnType<typeof input>)=>{v.items[0].name="Different local metadata";}]){
  const altered=input();mutate(altered);assert.notEqual(hunterOvercomeFingerprint(configuredHunterOvercome(altered,known)),fingerprint,"Snapshot binds effects, costs and metadata");
}
const invalid=(mutate:(value:any)=>void)=>{const value:any=input();mutate(value);const before=structuredClone(value);assert.throws(()=>configuredHunterOvercome(value,known));assert.deepEqual(value,before);};
for(const value of [undefined,null,[],{},"not-json","[]",42])assert.throws(()=>configuredHunterOvercome(value,known));
invalid(v=>{v.extra=true;});invalid(v=>{delete v.items;});
invalid(v=>{v.items[0]={id:"local_overcome_simplified",name:"No full schema",desc:""};});
invalid(v=>{v.items[0].id="GC6";});invalid(v=>{v.items[0].id="local_overcome_";});invalid(v=>{v.items[0].id="local_overcome_Upper";});
invalid(v=>{v.items[1].id=v.items[0].id;});
assert.throws(()=>configuredHunterOvercome(input(),new Set([...known,"local_overcome_z"])),/noncolliding/);
for(const [key,value] of [["use_type",3],["effect","3"],["thumbnail_id","art"],["rank",2],["sell_price",1],["collect_qty",1],["name",null],["desc","\ud800"]] as const)
  invalid(v=>{v.items[0][key]=value;});
invalid(v=>{v.items[0].private_token="private";});
for(const value of [NaN,Infinity,-Infinity,-1,1000.01,"1",null])invalid(v=>{v.effect[0].hp_percent=value;});
invalid(v=>{v.effect[0].cnt=2;});invalid(v=>{v.effect[0].cnt=4;});invalid(v=>{v.effect.push({cnt:0,hp_percent:0,atk_percent:0,def_percent:0});});
invalid(v=>{v.effect.pop();});invalid(v=>{v.effect[0].extra=0;});invalid(v=>{v.effect[2].atk_percent=1;});
invalid(v=>{delete v.effect[1];});invalid(v=>{v.effect.foo=1;});
invalid(v=>{v.src=[];});invalid(v=>{v.src.pop();});invalid(v=>{v.src=v.src.slice(0,2);});invalid(v=>{v.src.push({...v.src[0]});});
invalid(v=>{v.src[0]={...v.src[1]};});invalid(v=>{v.src[0].target_base_rank=0;});invalid(v=>{v.src[0].target_base_rank=5;});
invalid(v=>{v.src[0].overcome_cnt=0;});invalid(v=>{v.src[0].overcome_cnt=4;});invalid(v=>{v.src[0].card_required_rank=0;});invalid(v=>{v.src[0].card_required_rank=6;});
invalid(v=>{v.src[0].card_cnt=-1;});invalid(v=>{v.src[0].card_cnt=4;});invalid(v=>{v.src[0].card_cnt="1";});
invalid(v=>{v.src[0].gold=-1;});invalid(v=>{v.src[0].gold=0x8000_0000;});invalid(v=>{v.src[0].gold=1.5;});
invalid(v=>{v.src[0].card_cnt=0;v.src[0].item_list=[];v.src[0].gold=0;});
invalid(v=>{v.src[0].item_list[0].ref_id="UNDECLARED";});invalid(v=>{v.src[0].item_list[0].ref_id="";});
invalid(v=>{v.src[0].item_list[1].ref_id=v.src[0].item_list[0].ref_id;});
for(const value of [0,-1,1.5,0x1_0000_0000,"1",null])invalid(v=>{v.src[0].item_list[0].qty=value;});
invalid(v=>{v.src[0].item_list=Array.from({length:5},(_,index)=>({ref_id:"local_overcome_"+index,qty:1}));});
invalid(v=>{v.src[0].item_list[0].price=1;});invalid(v=>{delete v.src[0].item_list[0].qty;});invalid(v=>{delete v.src[1];});
let getterCalls=0;
for(const part of ["root","effect","src","item","array"]){
  const value:any=input();
  const [owner,key]=part==="root"?[value,"items"]:part==="effect"?[value.effect[0],"hp_percent"]:part==="src"?[value.src[0],"gold"]:
    part==="item"?[value.items[0],"name"]:[value.effect,"0"];
  Object.defineProperty(owner,key,{enumerable:true,get(){getterCalls++;throw new Error("must not execute accessor");}});
  assert.throws(()=>configuredHunterOvercome(value,known),/data fields|data arrays/);
}
assert.equal(getterCalls,0);
const symbol=input() as any;symbol[Symbol("unknown")]=1;assert.throws(()=>configuredHunterOvercome(symbol,known));
const prototype=Object.assign(Object.create({}),input());assert.throws(()=>configuredHunterOvercome(prototype,known));
const hidden=input();Object.defineProperty(hidden.items[0],"name",{value:"hidden",enumerable:false});assert.throws(()=>configuredHunterOvercome(hidden,known));
const maximum=input();maximum.src[0].gold=0x7fff_ffff;maximum.src[0].item_list[0].qty=0xffff_ffff;maximum.effect[0].hp_percent=1000;
assert.equal(configuredHunterOvercome(maximum,known).src.find(row=>row.target_base_rank===4&&row.overcome_cnt===3)!.gold,0x7fff_ffff);
for(const cost of ["gold","card","item"]){const value=input();value.src[0].gold=cost==="gold"?1:0;value.src[0].card_cnt=cost==="card"?1:0;
  value.src[0].item_list=cost==="item"?[{ref_id:"existing_material",qty:1}]:[];assert.ok(configuredHunterOvercome(value,known));}
const noNewItems=input();noNewItems.items=[];noNewItems.src.forEach(row=>{row.item_list=[{ref_id:"AIRSHIP_TICKET",qty:1}];});
assert.deepEqual(hunterOvercomeItems(configuredHunterOvercome(noNewItems,known)),[]);
console.log("Hunter Overcome reference: explicit LOCAL full-schema snapshots, raw monotone percent counts1..3, complete twelve native recipe pairs, checked material/gold/card costs, inert unique refs, strict descriptor/dense-array refusal, deep freeze/detached wire and stable canonical fingerprint roundtrip passed.");
