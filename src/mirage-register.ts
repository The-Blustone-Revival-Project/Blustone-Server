import {parseMirageCache,requireMirageCombatCache,type MirageReadiness} from "./mirage-cache.js";

/** Source RequestRegisterDeck sends inst_list as a JSON STRING of full64
 * numeric IDs. Authentication is separate. No HP/state/floor initialization. */
export function parseMirageRegisterDeck(raw:unknown):string[] {
  if(typeof raw!=="string")throw new TypeError("Mirage registration requires serialized inst_list");
  const numericToken=Symbol("exact native numeric ID");
  const parsed=JSON.parse(raw,(_key,value,context?:{source:string})=>{
    if(typeof value==="number"&&(!context?.source||!/^\d+$/.test(context.source)))throw new TypeError("Mirage registration requires unsigned decimal integer tokens");
    if(typeof value==="number"&&Number.isInteger(value)&&!Number.isSafeInteger(value)) {
      if(!context?.source||!/^\d+$/.test(context.source))throw new TypeError("Exact Mirage registration ID unavailable");return {[numericToken]:context.source};
    }
    return value;
  });
  if(!Array.isArray(parsed)||parsed.length>5)throw new TypeError("Mirage registration supports five supplied slots");
  return parsed.map((value:unknown)=>{
    const id=typeof value==="number"&&Number.isSafeInteger(value)?String(value):
      value&&typeof value==="object"&&Object.hasOwn(value,numericToken)?(value as Record<symbol,string>)[numericToken]:"";
    if(!/^(?:0|[1-9]\d*)$/.test(id)||BigInt(id)>0xffff_ffff_ffff_ffffn)throw new TypeError("Invalid Mirage registration uint64 identity");return id;
  });
}
/** Supported LOCAL existing-cache change only. Exact native same-name
 * exclusion and living/owned slots are checked by readiness. No publication,
 * persistence, enrollment or battle-start endpoint is manufactured here. */
export function planMirageRegisterDeck(rawCache:unknown,instList:unknown,context:MirageReadiness) {
  const cache=parseMirageCache(rawCache),ids=parseMirageRegisterDeck(instList).filter(id=>id!=="0");
  cache.inst_base.deck=ids;
  return {cache:requireMirageCombatCache(cache,context),deck:[...ids]};
}
/** Native successful ret_data is this bare array, not {deck:...}. */
export function mirageRegisterDeckWire(ids:readonly string[]):unknown[] {
  const json=JSON as typeof JSON&{rawJSON?:(source:string)=>unknown};
  return ids.map(id=>{
    if(typeof id!=="string"||!/^(?:0|[1-9]\d*)$/.test(id)||BigInt(id)>0xffff_ffff_ffff_ffffn)throw new TypeError("Invalid Mirage registration response ID");
    if(BigInt(id)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(id);
    if(!json.rawJSON)throw new TypeError("Exact Mirage registration wire unavailable");return json.rawJSON(id);
  });
}
