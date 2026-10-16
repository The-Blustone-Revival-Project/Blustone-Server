import {createHash} from "node:crypto";
import type {LocalGameState} from "./game.js";
import type {FishingItemReference} from "./fishing-item-references.js";
import {fishingPoolMembers, fishingPriceByGrade, type FishingCatalogue} from "./fishing-catalogue.js";
import {ownedFishingInventory} from "./fishing-inventory.js";
import {fishingSaleBindings, planFishingSale, type FishingStackBinding, type FishingSaleBindings} from "./fishing-sale.js";

const I32 = 0x7fff_ffff;
const HISTORY_LIMIT = 10_000;
type Range = {min:number; max:number};
export interface FishingTuning {
  init_val:number; max_val:number; dec_val:number; inc_val:number; dec_val_on_burn:number;
  first_burn:Range; burn_cool:Range; burn_dur:Range; wait_time:Range;
}
interface Outcome {fish_id:string; grade:number; length:number}
interface Context {
  place_id:string; cast_dist:number; lure_id:string;
  tuning:FishingTuning; outcomes:Outcome[];
}
export interface FishingCastPolicy {
  origin:"local-authored";
  bait_debit:"end-all";
  bait_qty:number;
  stock:"new-stack-per-catch";
  on_win:"keep"|"sell";
  contexts:Context[];
}
interface Cast {
  log_id:number; context_index:number; outcome_index:number;
  bait:{inst_id:number; qty:number}[];
  state:"pending"|"won"|"lost";
  item_inst_id:number|null;
}
export interface FishingCastJournal {
  policy:FishingCastPolicy;
  reference_hash:string;
  base_bindings:FishingStackBinding[];
  casts:Cast[];
}

function object(raw:unknown, keys:readonly string[]):Record<string,unknown> {
  if(!raw || typeof raw!=="object" || Object.getPrototypeOf(raw)!==Object.prototype ||
    Reflect.ownKeys(raw).length!==keys.length || keys.some(key=>{
      const d=Object.getOwnPropertyDescriptor(raw,key);return !d?.enumerable || !Object.hasOwn(d,"value");
    })) throw new TypeError("Fishing casts require exact plain JSON fields");
  return raw as Record<string,unknown>;
}
function array(raw:unknown, limit=HISTORY_LIMIT):unknown[] {
  if(!Array.isArray(raw) || Object.getPrototypeOf(raw)!==Array.prototype || raw.length>limit ||
    Reflect.ownKeys(raw).length!==raw.length+1 || Array.from({length:raw.length},(_,i)=>{
      const d=Object.getOwnPropertyDescriptor(raw,String(i));return !d?.enumerable || !Object.hasOwn(d,"value");
    }).some(Boolean)) throw new TypeError("Fishing casts require dense bounded JSON arrays");
  return raw;
}
function uint(raw:unknown, min=0, max=I32):number {
  if(typeof raw!=="number" || !Number.isInteger(raw) || raw<min || raw>max)
    throw new TypeError("Fishing cast integer is outside its supported width");
  return raw;
}
function formUint(raw:unknown, min=0):number {
  return uint(typeof raw==="string" && /^(?:0|[1-9]\d*)$/.test(raw)?Number(raw):raw,min);
}
function text(raw:unknown):string {
  if(typeof raw!=="string" || !raw || Buffer.from(raw,"utf8").toString("utf8")!==raw)
    throw new TypeError("Fishing cast identity must be a lossless nonempty string");
  return raw;
}
function scalar(raw:unknown, positive=false):number {
  if(typeof raw!=="number" || !Number.isFinite(raw) || raw<0 || (positive && raw===0) ||
    !Number.isFinite(Math.fround(raw)) || (positive && Math.fround(raw)===0))
    throw new TypeError("Fishing tuning requires finite nonnegative float32 values");
  return Math.fround(raw);
}
function range(raw:unknown):Range {
  const row=object(raw,["min","max"]),min=scalar(row.min),max=scalar(row.max);
  if(min>max)throw new TypeError("Fishing tuning range is reversed");
  return {min,max};
}
function tuning(raw:unknown):FishingTuning {
  const row=object(raw,["init_val","max_val","dec_val","inc_val","dec_val_on_burn","first_burn","burn_cool","burn_dur","wait_time"]);
  const result={init_val:scalar(row.init_val),max_val:scalar(row.max_val,true),dec_val:scalar(row.dec_val),
    inc_val:scalar(row.inc_val,true),dec_val_on_burn:scalar(row.dec_val_on_burn),
    first_burn:range(row.first_burn),burn_cool:range(row.burn_cool),burn_dur:range(row.burn_dur),wait_time:range(row.wait_time)};
  if(result.init_val>result.max_val)throw new TypeError("Fishing initial gauge exceeds its maximum");
  return result;
}

/** All tuning, deterministic cycles, debit and stack laws below are explicit
 * LOCAL policy. No original fish identity, sampling law or economy is inferred. */
export function configuredFishingCasts(raw:unknown, items:readonly Readonly<FishingItemReference>[], catalogue:FishingCatalogue|undefined):FishingCastPolicy {
  const row=object(raw,["origin","bait_debit","bait_qty","stock","on_win","contexts"]);
  if(row.origin!=="local-authored" || row.bait_debit!=="end-all" || row.stock!=="new-stack-per-catch" ||
    (row.on_win!=="keep" && row.on_win!=="sell") || !catalogue)
    throw new TypeError("Fishing casts require explicit local laws and a fishing catalogue");
  const ids=new Set(items.filter(item=>item.use_type===17).map(item=>item.id)),seen=new Set<string>();
  const contexts=array(row.contexts,100).map(rawContext=>{
    const c=object(rawContext,["place_id","cast_dist","lure_id","tuning","outcomes"]);
    const place_id=text(c.place_id),cast_dist=uint(c.cast_dist),lure_id=text(c.lure_id),key=JSON.stringify([place_id,cast_dist,lure_id]);
    if(!["LU001","LU003"].includes(lure_id) || seen.has(key))throw new TypeError("Fishing cast context is duplicated or has unsupported bait");
    seen.add(key);
    const members=new Set(fishingPoolMembers(catalogue,lure_id));
    const outcomes=array(c.outcomes,100).map(rawOutcome=>{
      const o=object(rawOutcome,["fish_id","grade","length"]),fish_id=text(o.fish_id),grade=uint(o.grade,1,3),length=uint(o.length,1);
      if(!ids.has(fish_id) || !members.has(fish_id))throw new TypeError("Fishing outcome lacks explicit type17 metadata or lure membership");
      if(row.on_win==="sell" && fishingPriceByGrade(catalogue,fish_id,grade)===undefined)
        throw new TypeError("Fishing automatic sale has no supplied grade price");
      return {fish_id,grade,length};
    });
    if(!outcomes.length)throw new TypeError("Fishing context needs an explicit outcome cycle");
    return {place_id,cast_dist,lure_id,tuning:tuning(c.tuning),outcomes};
  });
  if(!contexts.length)throw new TypeError("Fishing policy needs an explicit context");
  return {origin:"local-authored",bait_debit:"end-all",bait_qty:uint(row.bait_qty,1),stock:"new-stack-per-catch",on_win:row.on_win,contexts};
}

export function fishingReferenceHash(policy:FishingCastPolicy,items:readonly Readonly<FishingItemReference>[],catalogue:FishingCatalogue|undefined):string {
  if(!catalogue)throw new TypeError("Captured fishing casts require their reference catalogue");
  const fishIds=new Set(policy.contexts.flatMap(c=>c.outcomes.map(o=>o.fish_id)));
  const lures=new Set(policy.contexts.map(c=>c.lure_id));
  return createHash("sha256").update(JSON.stringify({
    items:items.filter(item=>fishIds.has(item.id)).map(item=>({...item})).sort((a,b)=>a.id.localeCompare(b.id)),
    pools:catalogue.pools.filter(p=>lures.has(p.lure_id)&&fishIds.has(p.fish_id)).map(p=>({...p})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))),
    prices:policy.on_win==="sell"?catalogue.prices.filter(p=>fishIds.has(p.fish_id)).map(p=>({...p})).sort((a,b)=>a.fish_id.localeCompare(b.fish_id)):[],
  })).digest("hex");
}

export function normalizeFishingCasts(raw:unknown,items:readonly Readonly<FishingItemReference>[],catalogue:FishingCatalogue|undefined):FishingCastJournal {
  const row=object(raw,["policy","reference_hash","base_bindings","casts"]),policy=configuredFishingCasts(row.policy,items,catalogue);
  if(row.reference_hash!==fishingReferenceHash(policy,items,catalogue))throw new TypeError("Captured fishing references differ from their supplied definitions");
  const fishIds=new Set(items.filter(item=>item.use_type===17).map(item=>item.id));
  const base_bindings=[...fishingSaleBindings({"1":row.base_bindings},fishIds)["1"]].map(b=>({...b}));
  const usedIds=new Set(base_bindings.map(b=>b.inst_id)),contextUses=new Map<number,number>();
  const input=array(row.casts);
  const casts=input.map((rawCast,index):Cast=>{
    const c=object(rawCast,["log_id","context_index","outcome_index","bait","state","item_inst_id"]);
    const log_id=uint(c.log_id,1),context_index=uint(c.context_index,0,policy.contexts.length-1),context=policy.contexts[context_index];
    const count=contextUses.get(context_index)??0,outcome_index=uint(c.outcome_index,0,context.outcomes.length-1);
    if(log_id!==index+1 || outcome_index!==count%context.outcomes.length)throw new TypeError("Fishing cast log/cycle history is inconsistent");
    contextUses.set(context_index,count+1);
    if(!["pending","won","lost"].includes(String(c.state)) || (c.state==="pending"&&index!==input.length-1))
      throw new TypeError("Fishing cast has an invalid terminal history");
    const baitIds=new Set<number>();let quantity=0;
    const bait=array(c.bait).map(rawBait=>{
      const b=object(rawBait,["inst_id","qty"]),inst_id=uint(b.inst_id,1,Number.MAX_SAFE_INTEGER),qty=uint(b.qty,1);
      if(baitIds.has(inst_id))throw new TypeError("Duplicate fishing bait debit identity");baitIds.add(inst_id);quantity+=qty;return {inst_id,qty};
    });
    if(quantity!==policy.bait_qty)throw new TypeError("Fishing bait debit does not match captured policy");
    let item_inst_id:null|number=null;
    if(c.state==="won") {
      item_inst_id=uint(c.item_inst_id,1,Number.MAX_SAFE_INTEGER-1);
      if(usedIds.has(item_inst_id))throw new TypeError("Fishing catch stack identity was reused");usedIds.add(item_inst_id);
    }else if(c.item_inst_id!==null)throw new TypeError("Unwon cast cannot own a catch stack");
    return {log_id,context_index,outcome_index,bait,state:c.state as Cast["state"],item_inst_id};
  });
  if(!casts.length)throw new TypeError("Fishing journal must contain a real cast");
  return {policy,reference_hash:String(row.reference_hash),base_bindings,casts};
}

export function fishingCastBindings(journal:FishingCastJournal):FishingStackBinding[] {
  return [...journal.base_bindings.map(b=>({...b})),...journal.casts.flatMap(c=>{
    if(c.state!=="won" || c.item_inst_id===null)return [];
    const o=journal.policy.contexts[c.context_index].outcomes[c.outcome_index];
    return [{fish_id:o.fish_id,grade:o.grade,inst_id:c.item_inst_id}];
  })];
}

/** The explicit LOCAL bridge is journaled, never guessed from item IDs.
 * Existing positive stock must already have its independently supplied binding. */
export function validateFishingCastStock(game:LocalGameState,journal:FishingCastJournal,fishIds:ReadonlySet<string>):void {
  const owned=ownedFishingInventory(game.owned_fish??[],fishIds),bindings=fishingCastBindings(journal),ids=new Set<number>();
  for(const item of game.items) {
    uint(item.inst_id,1,Number.MAX_SAFE_INTEGER);uint(item.qty,0,0xffff_ffff);
    if(ids.has(item.inst_id) || ![0,1].includes(item.lock))throw new TypeError("Malformed fishing item stock");ids.add(item.inst_id);
  }
  for(const cast of journal.casts)if(cast.state==="won") {
    const item=game.items.find(item=>item.inst_id===cast.item_inst_id);
    if(!item || item.qty>1)throw new TypeError("A generated fishing catch stack can retain at most its one earned fish");
  }
  for(const fish_id of new Set(journal.policy.contexts.flatMap(c=>c.outcomes.map(o=>o.fish_id)))) {
    const bound=bindings.filter(b=>b.fish_id===fish_id),counts=[0,0,0];
    for(const binding of bound) {
      const item=game.items.find(i=>i.inst_id===binding.inst_id);
      if(!item || item.ref_id!==fish_id || item.lock!==0)throw new TypeError("Captured fishing stack is missing, unrelated or locked");
      counts[binding.grade-1]+=item.qty;
    }
    if(game.items.some(i=>i.ref_id===fish_id&&i.qty>0&&!bound.some(b=>b.inst_id===i.inst_id)))
      throw new TypeError("Fishing stock has an unbound positive fish stack");
    const fish=owned.find(f=>f.fish_id===fish_id);
    if(counts.some((count,i)=>count!==(fish?.[(["b_cnt","s_cnt","g_cnt"] as const)[i]]??0)))
      throw new TypeError("Fishing grade and general stack ownership disagree");
  }
}

export function planFishingBegin(game:LocalGameState,pvid:number,policy:FishingCastPolicy,reference_hash:string,
  bindings:FishingSaleBindings|undefined,prior:FishingCastJournal|undefined,raw:Record<string,unknown>,fishIds:ReadonlySet<string>) {
  const place_id=text(raw.place_id),cast_dist=formUint(raw.cast_dist),lure_id=text(raw.lure_id);
  const context_index=policy.contexts.findIndex(c=>c.place_id===place_id&&c.cast_dist===cast_dist&&c.lure_id===lure_id);
  if(context_index<0)throw new TypeError("Casting context has no explicitly configured outcome and tuning");
  const journal:FishingCastJournal=prior?structuredClone(prior):{policy:structuredClone(policy),reference_hash,
    base_bindings:(bindings?.[String(pvid)]??[]).map(b=>({...b})),casts:[]};
  validateFishingCastStock(game,journal,fishIds);
  const pending=journal.casts.at(-1);
  if(pending?.state==="pending") {
    if(pending.context_index!==context_index)throw new TypeError("A different fishing cast is already pending");
    return {journal:prior!,changed:false,receipt:{log_id:pending.log_id,...structuredClone(policy.contexts[context_index].tuning)}};
  }
  if(journal.casts.length>=HISTORY_LIMIT)throw new TypeError("Fishing cast history has reached the supported bound");
  const bait:{inst_id:number;qty:number}[]=[];let remaining=policy.bait_qty;
  for(const item of [...game.items].filter(i=>i.ref_id===lure_id&&i.lock===0).sort((a,b)=>a.inst_id-b.inst_id)) {
    const qty=Math.min(remaining,item.qty);if(!qty)continue; bait.push({inst_id:item.inst_id,qty});remaining-=qty;if(!remaining)break;
  }
  if(remaining)throw new TypeError("Insufficient unlocked owned bait for configured cast");
  const outcome_index=journal.casts.filter(c=>c.context_index===context_index).length%policy.contexts[context_index].outcomes.length;
  const log_id=journal.casts.length+1;
  journal.casts.push({log_id,context_index,outcome_index,bait,state:"pending",item_inst_id:null});
  return {journal,changed:true,receipt:{log_id,...structuredClone(policy.contexts[context_index].tuning)}};
}

export function fishingCastRecordRows(journal:FishingCastJournal|undefined) {
  const records=new Map<string,Outcome>();
  for(const cast of journal?.casts??[])if(cast.state==="won") {
    const outcome=journal!.policy.contexts[cast.context_index].outcomes[cast.outcome_index],prior=records.get(outcome.fish_id);
    if(!prior || outcome.length>prior.length)records.set(outcome.fish_id,{...outcome});
  }
  return [...records.values()];
}

export function fishingEndLog(raw:Record<string,unknown>):number {return formUint(raw.log_id,1);}

export function planFishingEnd(game:LocalGameState,pvid:number,prior:FishingCastJournal,catalogue:FishingCatalogue,
  fishIds:ReadonlySet<string>,raw:Record<string,unknown>,noCatchId:string) {
  const log_id=fishingEndLog(raw),is_win=formUint(raw.is_win);
  if(is_win!==0&&is_win!==1)throw new TypeError("Fishing result must be exactly0 or1");
  const journal=structuredClone(prior),cast=journal.casts.find(c=>c.log_id===log_id);
  if(!cast || cast.state!=="pending")throw new TypeError("Fishing pending log is unavailable");
  validateFishingCastStock(game,journal,fishIds);
  const context=journal.policy.contexts[cast.context_index],items=game.items.map(i=>({...i}));
  for(const debit of cast.bait) {
    const item=items.find(i=>i.inst_id===debit.inst_id);
    if(!item || item.ref_id!==context.lure_id || item.lock!==0 || item.qty<debit.qty)
      throw new TypeError("Captured fishing bait is no longer available");
    item.qty-=debit.qty;
  }
  let owned_fish=ownedFishingInventory(game.owned_fish??[],fishIds),gold=uint(game.gold,0,0xffff_ffff),next_item_inst_id=game.next_item_inst_id;
  const receipt:Record<string,unknown>={fish_id:noCatchId,grade:0,length:0,consumed_inst_list:cast.bait.map(b=>({...b}))};
  cast.state=is_win?"won":"lost";
  if(is_win) {
    const outcome=context.outcomes[cast.outcome_index],inst_id=uint(next_item_inst_id,1,Number.MAX_SAFE_INTEGER-1);
    if(items.some(i=>i.inst_id>=inst_id))throw new TypeError("Fishing item allocator would reuse an existing identity");
    next_item_inst_id=inst_id+1;cast.item_inst_id=inst_id;
    items.push({inst_id,ref_id:outcome.fish_id,qty:1,lock:0});
    let fish=owned_fish.find(f=>f.fish_id===outcome.fish_id);
    if(!fish){fish={fish_id:outcome.fish_id,b_cnt:0,s_cnt:0,g_cnt:0};owned_fish.push(fish);}
    const key=(["b_cnt","s_cnt","g_cnt"] as const)[outcome.grade-1];
    fish[key]=uint(fish[key]+1,0,key==="g_cnt"?0xffff_ffff:I32);
    Object.assign(receipt,outcome,{user:{item:[{inst_id,ref_id:outcome.fish_id,added:1}]}});
    if(journal.policy.on_win==="sell") {
      const sale=planFishingSale({...game,items,owned_fish,gold},pvid,{[String(pvid)]:fishingCastBindings(journal)},catalogue,fishIds,
        {fish_id:outcome.fish_id,grade:outcome.grade,qty:1});
      // AddItem/grade increment run before optional ParseSell removals and
      // absolute grade replacement. Preserve original callback ordering.
      items.splice(0,items.length,...sale.items);owned_fish=sale.owned_fish;gold=sale.gold;receipt.sell=sale.receipt;
    }
  }
  return {journal,items,owned_fish:is_win || game.owned_fish!==undefined?owned_fish:undefined,gold,next_item_inst_id,receipt};
}
