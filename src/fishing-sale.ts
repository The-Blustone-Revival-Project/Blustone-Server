import type {LocalGameState} from "./game.js";
import {fishingPriceByGrade,type FishingCatalogue} from "./fishing-catalogue.js";
import {ownedFishingInventory} from "./fishing-inventory.js";

export interface FishingStackBinding {fish_id:string;grade:number;inst_id:number}
export type FishingSaleBindings=Readonly<Record<string,readonly Readonly<FishingStackBinding>[]>>;
function uint(value:unknown):number {
  if(typeof value!=="number"||!Number.isInteger(value)||value<0||value>0xffff_ffff)throw new TypeError("Fishing sale requires uint32 quantity");return value;
}
function integer(value:unknown):number {
  if(typeof value==="string"&&/^(?:0|[1-9]\d*)$/.test(value))return uint(Number(value));return uint(value);
}
function dataObject(raw:unknown,keys?:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!Object.getOwnPropertyDescriptor(raw,key)?.enumerable||
      !Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")||keys&&!keys.includes(key))||
    keys?.some(key=>!Object.hasOwn(raw,key)))throw new TypeError("Fishing bindings require plain JSON data");return raw as Record<string,unknown>;
}
/** Explicit LOCAL relationship between two independently imported ownership
 * namespaces. No item IDs, stacks, grade mapping or catches are inferred. */
export function fishingSaleBindings(raw:unknown,fishIds:ReadonlySet<string>):FishingSaleBindings {
  const owners=dataObject(raw),result:Record<string,readonly Readonly<FishingStackBinding>[]>={};
  for(const [owner,value] of Object.entries(owners)) {
    if(!/^[1-9]\d*$/.test(owner)||!Number.isSafeInteger(Number(owner)))throw new TypeError("Fishing binding owner requires safe positive PVID");
    if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length>10000||Reflect.ownKeys(value).length!==value.length+1||
      Array.from({length:value.length},(_,i)=>Object.getOwnPropertyDescriptor(value,String(i))).some(d=>!d?.enumerable||!Object.hasOwn(d,"value")))
      throw new TypeError("Fishing bindings require dense bounded data arrays");
    const seen=new Set<number>();
    result[owner]=Object.freeze(value.map(rawRow=>{
      const row=dataObject(rawRow,["fish_id","grade","inst_id"]),grade=uint(row.grade),id=row.inst_id;
      if(typeof row.fish_id!=="string"||!fishIds.has(row.fish_id)||![1,2,3].includes(grade)||
        typeof id!=="number"||!Number.isSafeInteger(id)||id<1||seen.has(id))throw new TypeError("Fishing binding requires unique owned stack identity and explicit fish grade");
      seen.add(id);return Object.freeze({fish_id:row.fish_id,grade,inst_id:id});
    }));
  }
  return Object.freeze(result);
}
/** A funded repeat is another sale: original request has no nonce. After a
 * lost reply reconcile GetInven/GetItemInven/gold before selling again. */
export function planFishingSale(game:LocalGameState,pvid:number,bindings:FishingSaleBindings,catalogue:FishingCatalogue,
  fishIds:ReadonlySet<string>,raw:Record<string,unknown>) {
  const fish_id=raw.fish_id,grade=integer(raw.grade),qty=integer(raw.qty);
  if(typeof fish_id!=="string"||!fishIds.has(fish_id)||![1,2,3].includes(grade)||!qty)throw new TypeError("Fishing sale requires explicit fish, grade1..3 and positive qty");
  const owner=bindings[String(pvid)];if(!owner)throw new TypeError("Fishing stack ownership bindings are unavailable");
  let owned;try{owned=ownedFishingInventory(game.owned_fish??[],fishIds);}catch(error){throw new TypeError(error instanceof Error?error.message:"Malformed owned fish");}
  const fish=owned.find(row=>row.fish_id===fish_id);
  if(!fish)throw new TypeError("Fishing sale has no owned fish counts");
  const price=fishingPriceByGrade(catalogue,fish_id,grade);if(price===undefined)throw new TypeError("Fishing sale price is unavailable");
  const ids=new Set<number>();
  for(const item of game.items) {
    if(!Number.isSafeInteger(item.inst_id)||item.inst_id<1||ids.has(item.inst_id)||typeof item.ref_id!=="string"||!item.ref_id||
      (item.lock!==0&&item.lock!==1))throw new TypeError("Fishing item inventory identity/lock is malformed");uint(item.qty);ids.add(item.inst_id);
  }
  const bound=owner.filter(row=>row.fish_id===fish_id),byGrade=new Map<number,typeof game.items>();
  if(game.items.some(item=>item.ref_id===fish_id&&item.qty>0&&!bound.some(row=>row.inst_id===item.inst_id)))
    throw new TypeError("Fishing ownership includes an unbound positive stack");
  for(const row of bound) {
    const item=game.items.find(item=>item.inst_id===row.inst_id);
    if(!item||item.ref_id!==fish_id||item.lock!==0)throw new TypeError("Fishing bound stack is missing, unrelated or locked");
    const list=byGrade.get(row.grade)??[];list.push(item);byGrade.set(row.grade,list);
  }
  for(const [index,key] of (["b_cnt","s_cnt","g_cnt"] as const).entries()) {
    const count=(byGrade.get(index+1)??[]).reduce((sum,row)=>uint(sum+row.qty),0);
    if(count!==fish[key])throw new TypeError("Fishing stack quantities disagree with authoritative grade counts");
  }
  const key=grade===1?"b_cnt":grade===2?"s_cnt":"g_cnt";
  if(qty>fish[key])throw new TypeError("Insufficient owned fishing quantity");
  const gold=uint(uint(game.gold)+uint(price*qty)),items=game.items.map(row=>({...row}));
  let remaining=qty;const deltas:{inst_id:number;qty:number}[]=[];
  for(const item of [...(byGrade.get(grade)??[])].sort((a,b)=>a.inst_id-b.inst_id)) {
    const used=Math.min(remaining,item.qty);if(!used)continue;
    items.find(row=>row.inst_id===item.inst_id)!.qty-=used;deltas.push({inst_id:item.inst_id,qty:used});remaining-=used;if(!remaining)break;
  }
  if(remaining)throw new TypeError("Fishing sale allocation is incomplete");
  fish[key]-=qty;
  // Keep zero-quantity stack rows as LOCAL repair tombstones: native absolute
  // GetItemInven upserts listed rows but never clears omitted stale cache IDs.
  return {items,owned_fish:owned,gold,receipt:{user:{gold:{prev:game.gold,cur:gold}},item:deltas,sell_result:{...fish}}};
}
