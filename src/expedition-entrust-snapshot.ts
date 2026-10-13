/** Offline complete native automatic-combat snapshots. No dispatcher, AP
 * debit, slots, elapsed rewards, correlation or claim authority is generated. */
export interface EntrustPreviewRow {serial:number;card_exp:number;user_exp:number;gold:number;begin_utc:string;end_utc:string;item:string}
export interface EntrustStart {entrust_id:string;stage_id:string;cnt:number;complete_second:number;skip_price:number;entrust_second_per_cost:number;list:EntrustPreviewRow[]}
export interface EntrustRefresh {skip_price:number;entrust_second_per_cost:number;list:EntrustPreviewRow[]}
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw))||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)||!Object.getOwnPropertyDescriptor(raw,key)?.enumerable||
      !Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value"))||keys.some(key=>!Object.hasOwn(raw,key)))
    throw new TypeError("Incomplete or unsupported Entrust snapshot JSON fields");
  return raw as Record<string,unknown>;
}
function text(raw:unknown):string {
  if(typeof raw!=="string"||Buffer.from(raw,"utf8").toString("utf8")!==raw)throw new TypeError("Entrust snapshot requires lossless string");return raw;
}
function integer(raw:unknown,signed=false):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<(signed?-0x8000_0000:0)||raw>(signed?0x7fff_ffff:0xffff_ffff))
    throw new TypeError("Entrust snapshot integer outside exact native word domain");return raw;
}
function serial64(raw:unknown):string {
  const value=typeof raw==="string"?raw:typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):"";
  if(!/^(?:0|[1-9]\d*)$/.test(value)||BigInt(value)>0xffff_ffff_ffff_ffffn)throw new TypeError("Entrust snapshot requires exact nonnegative64 token");return value;
}
function array(raw:unknown):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||Reflect.ownKeys(raw).some(key=>key!=="length"&&
    (typeof key!=="string"||!/^(?:0|[1-9]\d*)$/.test(key)||Number(key)>=raw.length)))throw new TypeError("Entrust snapshot requires JSON array");
  for(let i=0;i<raw.length;i++)if(!Object.hasOwn(raw,i)||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,String(i))!,"value"))throw new TypeError("Entrust snapshot requires dense data array");
  return raw;
}
/** item is a JSON STRING of reference-ID strings. Duplicates are occurrences,
 * not {id,qty} rows. Counts are preview metadata, never inventory settlement. */
export function entrustItemCounts(raw:unknown):{ref_id:string;qty:number}[] {
  const counts=new Map<string,number>();
  for(const value of array(JSON.parse(text(raw)))){const id=text(value);counts.set(id,(counts.get(id)??0)+1);}
  // Native std::map<string,count> emits lexical byte order, not locale order.
  return [...counts].sort(([a],[b])=>Buffer.compare(Buffer.from(a,"utf8"),Buffer.from(b,"utf8")))
    .map(([ref_id,qty])=>({ref_id,qty}));
}
function row(raw:unknown,refresh=false):EntrustPreviewRow {
  const value=object(raw,["serial","card_exp","user_exp","gold","begin_utc","end_utc","item"]),item=text(value.item);entrustItemCounts(item);
  return {serial:integer(value.serial,true),card_exp:integer(value.card_exp,!refresh),user_exp:integer(value.user_exp,!refresh),
    gold:integer(value.gold,!refresh),begin_utc:serial64(value.begin_utc),end_utc:serial64(value.end_utc),item};
}
export function parseEntrustStart(raw:unknown):EntrustStart {
  const value=object(raw,["entrust_id","stage_id","cnt","complete_second","skip_price","entrust_second_per_cost","list"]);
  return {entrust_id:serial64(value.entrust_id),stage_id:text(value.stage_id),cnt:integer(value.cnt,true),complete_second:integer(value.complete_second,true),
    skip_price:integer(value.skip_price),entrust_second_per_cost:integer(value.entrust_second_per_cost),list:array(value.list).map(value=>row(value))};
}
/** Complete quote/list subset. Native missing quotes convert0, and missing list
 * preserves rows; this decoder refuses partial data instead of inventing it. */
export function parseEntrustRefresh(raw:unknown):EntrustRefresh {
  const value=object(raw,["skip_price","entrust_second_per_cost","list"]);
  return {skip_price:integer(value.skip_price),entrust_second_per_cost:integer(value.entrust_second_per_cost),list:array(value.list).map(value=>row(value,true))};
}
/** Native Start ignores null and ANY incoming data while a nonzero job exists.
 * No merge/replacement of that active snapshot or foreign identity occurs. */
export function applyEntrustStart(current:EntrustStart|undefined,incoming:unknown):EntrustStart|undefined {
  if(incoming===null||current&&current.entrust_id!=="0")return current===undefined?undefined:structuredClone(current);
  return parseEntrustStart(incoming);
}
/** Refresh serial is an array INDEX, not owned Hunter identity or stored-row
 * serial matching. No append; absent rows retained; duplicates last-write-win.
 * Complete supplied deltas only; no publication/correlation guarantee. */
export function applyEntrustRefresh(current:EntrustStart,incoming:unknown):EntrustStart {
  if(incoming===null)return structuredClone(current);
  const delta=parseEntrustRefresh(incoming),next=structuredClone(current);
  next.skip_price=delta.skip_price;next.entrust_second_per_cost=delta.entrust_second_per_cost;
  for(const changed of delta.list)if(changed.serial>=0&&changed.serial<next.list.length)next.list[changed.serial]={...changed};
  return next;
}
/** Exact64 capture support before JS rounding. Decimal strings are local
 * model storage; native legacy string/float coercions are not emulated. */
function capture(source:string):unknown {
  return JSON.parse(source,function(key,value,context?:{source:string}){
    if(["entrust_id","begin_utc","end_utc"].includes(key)&&typeof value==="number"&&!Number.isSafeInteger(value)){
      if(!context?.source||!/^(?:0|[1-9]\d*)$/.test(context.source))throw new TypeError("Unrecoverable Entrust64 capture token");return context.source;
    }return value;
  });
}
export const parseEntrustStartJson=(source:string)=>parseEntrustStart(capture(source));
export const parseEntrustRefreshJson=(source:string)=>parseEntrustRefresh(capture(source));
