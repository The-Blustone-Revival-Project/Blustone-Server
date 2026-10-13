/** Supplied fishing reference tables only. Native Pool Gb324c8 consumes bare
 * lure_id/fish_id rows; ParsePrice Gb2e438 consumes bare fish_id/three-price
 * rows. No artwork-to-item mapping, original prices, catches or RNG invented. */
import {FISHING_BAIT_ITEM_IDS} from "./fishing-reference.js";

export interface FishingPoolRow {lure_id:string;fish_id:string}
export interface FishingPriceRow {fish_id:string;b_price:number;s_price:number;g_price:number}
export interface FishingCatalogue {
  pools:readonly Readonly<FishingPoolRow>[];
  prices:readonly Readonly<FishingPriceRow>[];
}
function record(value:unknown):Record<string,unknown> {
  if(!value||typeof value!=="object"||Array.isArray(value)) throw new TypeError("Expected fishing catalogue object");
  return value as Record<string,unknown>;
}
function identity(value:unknown):string {
  if(typeof value!=="string"||!value.length) throw new TypeError("Fishing reference requires a nonempty string identity");
  return value;
}
function quantity(value:unknown):number {
  if(typeof value!=="number"||!Number.isInteger(value)||value<0||value>0xffff_ffff)
    throw new TypeError("Fishing price must be native uint32");
  return value;
}
/** Caller supplies IDs from independently admitted real item references. That
 * dependency is necessary, not proof that an item is a fish. Pool/price rows
 * are a separate explicit fishing identity assertion. Defaults stay empty.
 * Duplicate refusal and the two supported lure IDs are replica policy. */
export function configuredFishingCatalogue(raw:unknown,itemIds:ReadonlySet<string>):FishingCatalogue {
  const input=record(raw);
  if(!Array.isArray(input.pools)||!Array.isArray(input.prices)) throw new TypeError("Fishing catalogue requires pool and price arrays");
  const membership=new Map<string,Set<string>>(),priced=new Set<string>();
  const pools=input.pools.map(value=>{
    const row=record(value),lure_id=identity(row.lure_id),fish_id=identity(row.fish_id);
    if(lure_id!==FISHING_BAIT_ITEM_IDS[0]&&lure_id!==FISHING_BAIT_ITEM_IDS[1])
      throw new TypeError("Unsupported original fishing lure identity");
    if(!itemIds.has(fish_id)) throw new TypeError("Fishing pool fish has no supplied item reference");
    const fish=membership.get(lure_id)??new Set<string>();
    if(fish.has(fish_id)) throw new TypeError("Duplicate fishing pool membership");
    fish.add(fish_id);membership.set(lure_id,fish);
    return Object.freeze({lure_id,fish_id});
  });
  const prices=input.prices.map(value=>{
    const row=record(value),fish_id=identity(row.fish_id);
    if(!itemIds.has(fish_id)) throw new TypeError("Fishing price fish has no supplied item reference");
    if(priced.has(fish_id)) throw new TypeError("Duplicate fishing fish-price identity");
    priced.add(fish_id);
    return Object.freeze({fish_id,b_price:quantity(row.b_price),s_price:quantity(row.s_price),g_price:quantity(row.g_price)});
  });
  // Pool membership and prices are independent native tables. An incomplete
  // explicit catalogue is allowed for read-only publication, never settlement.
  return Object.freeze({pools:Object.freeze(pools),prices:Object.freeze(prices)});
}
/** Native RequestPrice posts one scalar fish_id; response remains an ARRAY
 * even for that one identity. A miss is unavailable, not a fabricated zero. */
export function fishingPriceRows(catalogue:FishingCatalogue,fishId:unknown):FishingPriceRow[] {
  const id=identity(fishId);
  return catalogue.prices.filter(row=>row.fish_id===id).map(row=>({...row}));
}
/** GetFishPriceByGrade Gb2f15a:1→bronze,2→silver,3→gold. Native unsupported
 * grade/missing key returns0; replica preserves absence as undefined rather
 * than authorizing a free transaction. This is not catch grade selection. */
export function fishingPriceByGrade(catalogue:FishingCatalogue,fishId:unknown,grade:unknown):number|undefined {
  const id=identity(fishId);
  if(grade!==1&&grade!==2&&grade!==3) throw new TypeError("Unsupported fishing sale grade");
  const row=catalogue.prices.find(row=>row.fish_id===id);
  return row?.[grade===1?"b_price":grade===2?"s_price":"g_price"];
}
/** Preserve explicit per-lure member order; no weights, throw-distance
 * sampling or place dependence is inferred from this native row table. */
export function fishingPoolMembers(catalogue:FishingCatalogue,lureId:unknown):string[] {
  const id=identity(lureId);
  return catalogue.pools.filter(row=>row.lure_id===id).map(row=>row.fish_id);
}
