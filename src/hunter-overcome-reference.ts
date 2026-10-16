export interface HunterOvercomeEffect {readonly cnt:number;readonly hp_percent:number;readonly atk_percent:number;readonly def_percent:number}
export interface HunterOvercomeMaterial {readonly ref_id:string;readonly qty:number}
export interface HunterOvercomeSource {readonly target_base_rank:number;readonly overcome_cnt:number;readonly card_required_rank:number;
  readonly card_cnt:number;readonly item_list:readonly HunterOvercomeMaterial[];readonly gold:number}
export interface HunterOvercomeItem {readonly id:string;readonly name:string;readonly desc:string;readonly use_type:0;readonly effect:"";
  readonly thumbnail_id:"";readonly rank:1;readonly sell_price:0;readonly collect_qty:0}
export interface HunterOvercomePolicy {readonly effect:readonly HunterOvercomeEffect[];readonly src:readonly HunterOvercomeSource[];readonly items:readonly HunterOvercomeItem[]}
const U32=0xffff_ffff,INT32=0x7fff_ffff;
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||
    Reflect.ownKeys(raw).length!==keys.length||Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)))
    throw new TypeError("Overcome policy requires exact plain fields");
  for(const key of keys){const descriptor=Object.getOwnPropertyDescriptor(raw,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))throw new TypeError("Overcome policy requires own data fields");}
  return raw as Record<string,unknown>;
}
function array(raw:unknown,max?:number):unknown[] {
  if(!Array.isArray(raw)||max!==undefined&&raw.length>max||Object.getPrototypeOf(raw)!==Array.prototype||
    Reflect.ownKeys(raw).length!==raw.length+1)throw new TypeError("Overcome policy requires bounded dense arrays");
  for(let index=0;index<raw.length;index++) {
    const descriptor=Object.getOwnPropertyDescriptor(raw,String(index));
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))throw new TypeError("Overcome policy requires dense data arrays");
  }
  return raw;
}
function integer(raw:unknown,min:number,max:number):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<min||raw>max)throw new TypeError("Overcome policy integer is out of range");return raw===0?0:raw;
}
function percent(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isFinite(raw)||raw<0||raw>1000)throw new TypeError("Overcome effect requires finite raw wire percent0..1000");
  return raw===0?0:raw;
}
function text(raw:unknown):string {
  if(typeof raw!=="string"||Buffer.from(raw,"utf8").toString("utf8")!==raw||raw.includes("\0"))throw new TypeError("Overcome metadata requires lossless text");return raw;
}
/** Explicit LOCAL policy only. Native wire percent10 means+10%; native stores
 * float32 and divides later in its stat calculation. No image numerals, item
 * stock, original recipe or item classification is silently supplied here.
 * The same exact full item schema is accepted on input and snapshot restore. */
export function configuredHunterOvercome(raw:unknown,knownItemIDs:ReadonlySet<string>):HunterOvercomePolicy {
  if(typeof raw==="string"){try{raw=JSON.parse(raw);}catch{throw new TypeError("Overcome policy requires JSON object text");}}
  const root=object(raw,["effect","src","items"]),ids=new Set<string>();
  const items=array(root.items).map(value=>{
    const row=object(value,["id","name","desc","use_type","effect","thumbnail_id","rank","sell_price","collect_qty"]),id=text(row.id);
    if(!/^local_overcome_[a-z0-9_]+$/.test(id)||ids.has(id)||knownItemIDs.has(id))throw new TypeError("Overcome metadata requires unique noncolliding LOCAL identity");
    if(row.use_type!==0||row.effect!==""||row.thumbnail_id!==""||row.rank!==1||row.sell_price!==0||row.collect_qty!==0)
      throw new TypeError("Overcome metadata must remain inert");
    ids.add(id);return Object.freeze({id,name:text(row.name),desc:text(row.desc),use_type:0 as const,effect:"" as const,thumbnail_id:"" as const,
      rank:1 as const,sell_price:0 as const,collect_qty:0 as const});
  }).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const effect=array(root.effect,3).map(value=>{
    const row=object(value,["cnt","hp_percent","atk_percent","def_percent"]);
    return Object.freeze({cnt:integer(row.cnt,1,3),hp_percent:percent(row.hp_percent),atk_percent:percent(row.atk_percent),def_percent:percent(row.def_percent)});
  }).sort((a,b)=>a.cnt-b.cnt);
  if(effect.length!==3||effect.some((row,index)=>row.cnt!==index+1))throw new TypeError("Overcome requires exactly dense effect counts1..3");
  for(let index=1;index<effect.length;index++)for(const key of ["hp_percent","atk_percent","def_percent"] as const)
    if(effect[index][key]<effect[index-1][key])throw new TypeError("Overcome effects must be monotone for every stat");
  const pairs=new Set<string>();
  const src=array(root.src,12).map(value=>{
    const row=object(value,["target_base_rank","overcome_cnt","card_required_rank","card_cnt","item_list","gold"]);
    const target_base_rank=integer(row.target_base_rank,1,4),overcome_cnt=integer(row.overcome_cnt,1,3),key=`${target_base_rank}:${overcome_cnt}`;
    if(pairs.has(key))throw new TypeError("Duplicate Overcome recipe key");pairs.add(key);
    const card_required_rank=integer(row.card_required_rank,1,5),card_cnt=integer(row.card_cnt,0,3),gold=integer(row.gold,0,INT32),seen=new Set<string>();
    const item_list=array(row.item_list,4).map(value=>{
      const item=object(value,["ref_id","qty"]),ref_id=text(item.ref_id),qty=integer(item.qty,1,U32);
      if(!ref_id||seen.has(ref_id)||!knownItemIDs.has(ref_id)&&!ids.has(ref_id))throw new TypeError("Overcome material reference is duplicate or undeclared");
      seen.add(ref_id);return Object.freeze({ref_id,qty});
    }).sort((a,b)=>a.ref_id<b.ref_id?-1:a.ref_id>b.ref_id?1:0);
    if(card_cnt===0&&gold===0&&!item_list.length)throw new TypeError("All-free Overcome recipes are unsupported");
    return Object.freeze({target_base_rank,overcome_cnt,card_required_rank,card_cnt,item_list:Object.freeze(item_list),gold});
  }).sort((a,b)=>a.target_base_rank-b.target_base_rank||a.overcome_cnt-b.overcome_cnt);
  // Missing native recipe lookup returns a sentinel subsequently dereferenced
  // by popup consumers. Require every supported base/count pair; never fill
  // missing rows with invented costs or publish a sparse unsafe native table.
  if(src.length!==12)throw new TypeError("Complete twelve-row Overcome recipe table required");
  return Object.freeze({effect:Object.freeze(effect),src:Object.freeze(src),items:Object.freeze(items)});
}
export function hunterOvercomeWire(policy:HunterOvercomePolicy) {
  return structuredClone({effect:policy.effect,src:policy.src});
}
export function hunterOvercomeItems(policy:HunterOvercomePolicy) {return structuredClone(policy.items);}
/** Canonical property/row order is produced by parsing, including item refs.
 * Caller persists this complete effect/cost/item snapshot with first purchase. */
export function hunterOvercomeFingerprint(policy:HunterOvercomePolicy):string {
  return JSON.stringify({effect:policy.effect,src:policy.src,items:policy.items});
}
