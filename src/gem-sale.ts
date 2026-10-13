import {parseGemInstances,type GemReference} from "./gem-instances.js";
export interface GemSalePrice {rank:number;level:number;price_type:number;price:number}
function record(raw:unknown):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected Gem sale object");
  return raw as Record<string,unknown>;
}
function uint(raw:unknown,key:string) {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff) throw new TypeError(`Invalid uint32 Gem sale ${key}`);
  return raw;
}
function serial(raw:unknown):string {
  const value=typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):raw;
  if(typeof value!=="string"||! /^[1-9]\d*$/.test(value)||BigInt(value)>0xffff_ffff_ffff_ffffn)
    throw new TypeError("Invalid exact uint64 Gem sale identity");
  return value;
}
/** Native singleton inst_id OR multi inst_id_list JSON form string. Canonical
 * nonempty unique list admission is replica policy; no price field is sent. */
export function parseGemSaleRequest(raw:unknown):string[] {
  const row=record(raw),single=row.inst_id!==undefined,multiple=row.inst_id_list!==undefined;
  if(single===multiple) throw new TypeError("Gem sale requires exactly one identity field");
  if(single) return [serial(row.inst_id)];
  if(typeof row.inst_id_list!=="string") throw new TypeError("Gem inst_id_list must be a JSON form string");
  const values=JSON.parse(row.inst_id_list,(_key,value,context?:{source:string})=>{
    if(typeof value==="number"&&context?.source&&/^(?:0|[1-9]\d*)$/.test(context.source)) return context.source;
    return value;
  });
  if(!Array.isArray(values)||values.length===0) throw new TypeError("Gem sale requires nonempty ID array");
  const ids=values.map(serial);
  if(new Set(ids).size!==ids.length) throw new TypeError("Duplicate Gem sale identity");
  return ids;
}
/** ParseGemSellPrices Ga53e50 stores payment/rank/level/price uint32 rows.
 * No original numeric prices are included. */
export function gemSalePrices(raw:unknown):GemSalePrice[] {
  const envelope=record(raw);
  if(envelope.result_code!==1||!Array.isArray(envelope.ret_data)) throw new TypeError("Gem sale prices require successful ret_data array");
  const seen=new Set<string>();
  return envelope.ret_data.map(raw=>{
    const row=record(raw),quote={rank:uint(row.rank,"rank"),level:uint(row.level,"level"),
      price_type:uint(row.price_type,"price_type"),price:uint(row.price,"price")};
    const key=`${quote.rank}:${quote.level}:${quote.price_type}`;
    if(seen.has(key)) throw new TypeError("Duplicate Gem rank/level/payment sale price");
    seen.add(key);return quote;
  });
}
/** FindGemSellPrice Ga54ea0 exact first-match lookup; missing sentinel9/0/0/0
 * is unavailable, not a zero-valued original quote. */
export const gemSalePriceAt=(rows:readonly GemSalePrice[],rank:number,level:number,priceType:number)=>
  rows.find(row=>row.rank===rank&&row.level===level&&row.price_type===priceType);
/** Configured raw gold-only quotes apply regardless of Guild affiliation.
 * Authentication, rollback and user.gold.cur/item[] receipt belong to caller.
 * Replay containing an already removed ID refuses, never awards twice. */
export function planGemSale(raw:unknown,gems:readonly Record<string,unknown>[],refs:readonly GemReference[],
  knownHunters:ReadonlySet<string>,prices:readonly GemSalePrice[],gold:number) {
  try {
    const ids=parseGemSaleRequest(raw),quotes=gemSalePrices({result_code:1,ret_data:prices});
    if(!Number.isInteger(gold)||gold<0||gold>0x7fff_ffff) throw new TypeError("Gem sale gold balance exceeds native signed32");
    const parsed=parseGemInstances({result_code:1,ret_data:gems},refs,knownHunters),byId=new Map(parsed.map(gem=>[gem.inst_id,gem]));
    let profit=0;
    for(const id of ids) {
      const gem=byId.get(id);
      if(!gem) throw new TypeError("Gem sale identity is not currently owned");
      if(gem.target_inst_id!=="0") throw new TypeError("Mounted Gem cannot be sold");
      const quote=gemSalePriceAt(quotes,gem.rank,gem.level,2);
      if(!quote) throw new TypeError("Gem rank/level gold sale quote missing");
      profit+=quote.price;
      if(profit>0xffff_ffff||gold+profit>0x7fff_ffff) throw new TypeError("Gem sale proceeds exceed native wallet range");
    }
    const sold=new Set(ids),next=gems.filter((_gem,index)=>!sold.has(parsed[index].inst_id)).map(gem=>structuredClone(gem));
    return {ids,next,profit,gold:gold+profit};
  } catch(error) {return {error:error instanceof Error?error.message:"Invalid Gem sale"};}
}
