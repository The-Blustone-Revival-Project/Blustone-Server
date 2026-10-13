import {nativeGuildSaleValue} from "./equipment-fee.js";

export const EXPEDITION_ENTRUST_BASE_SECONDS=150;
export interface ExpeditionEntrustRequest {stage_id:string;deck_type:number;cnt:number;is_tuto:0|1}
function integer(raw:unknown,label:string,signed=false):number {
  const value=typeof raw==="string"&&/^(?:0|-?[1-9]\d*)$/.test(raw)?Number(raw):raw;
  if(typeof value!=="number"||!Number.isInteger(value)||value<(signed?-0x8000_0000:0)||value>(signed?0x7fff_ffff:0xffff_ffff))
    throw new TypeError(`Expedition Entrust ${label} requires exact ${signed?"int32":"uint32"}`);
  return value;
}
/** Ordinary /mission/Entrust request, distinct from Search /explore/Entrust.
 * Auth/ownership/stage eligibility/deck contents are separate server duties.
 * Count/selector domains follow the general native request producer; no UI
 * maximum, slot capacity or reward/auto-result law is inferred here. */
export function parseExpeditionEntrustRequest(raw:unknown):ExpeditionEntrustRequest {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))
    throw new TypeError("Expedition Entrust requires plain request object");
  const row=raw as Record<string,unknown>;
  for(const key of ["stage_id","deck_type","cnt","is_tuto"]) {
    const descriptor=Object.getOwnPropertyDescriptor(row,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))throw new TypeError("Incomplete Expedition Entrust request");
  }
  if(typeof row.stage_id!=="string"||!row.stage_id||Buffer.from(row.stage_id,"utf8").toString("utf8")!==row.stage_id)
    throw new TypeError("Expedition Entrust requires lossless nonempty stage string");
  const is_tuto=integer(row.is_tuto,"tutorial flag");
  if(is_tuto!==0&&is_tuto!==1)throw new TypeError("Expedition Entrust tutorial flag requires0or1");
  return {stage_id:row.stage_id,deck_type:integer(row.deck_type,"deck selector",true),cnt:integer(row.cnt,"count"),is_tuto};
}
/** Original SetCharList applies TYPE4 intrust to150 SECONDS per run, once
 * after its deck loop. Calculate independently multiplies per-run time and
 * stage-derived fuel by count. The generic numeric helper's name does not
 * make this a gold charge. No jobs, clocks, AP debit, rewards or route enabled.
 * Strict no-overflow admission is LOCAL; native word products may wrap. */
export function expeditionEntrustQuote(count:number,stageFuelPerRun:number,selected:{mode:number;value:number}|null) {
  if(typeof count!=="number"||typeof stageFuelPerRun!=="number")throw new TypeError("Expedition quote requires supplied numeric words");
  integer(count,"count");integer(stageFuelPerRun,"stage fuel");
  if(selected!==null&&selected.mode!==1)throw new TypeError("Expedition intrust requires native multiplier mode1");
  const secondsPerRun=nativeGuildSaleValue(EXPEDITION_ENTRUST_BASE_SECONDS,selected);
  const durationSeconds=secondsPerRun*count,fuel=stageFuelPerRun*count;
  if(!Number.isSafeInteger(durationSeconds)||durationSeconds>0xffff_ffff||!Number.isSafeInteger(fuel)||fuel>0xffff_ffff)
    throw new TypeError("Expedition quote exceeds supported uint32 totals");
  return {secondsPerRun,durationSeconds,fuel};
}
