import {parseEntrustStart,type EntrustStart} from "./expedition-entrust-snapshot.js";
import {admitEntrustSkipQuote} from "./expedition-skip-quote.js";

const I32=0x7fff_ffff,U32=0xffff_ffff;
export interface PaidDispatchFinish {completed_at:number;charged_fee:number}
export interface DispatchFinishWallet {free_iap_qty:number;iap_qty:number}
function object(raw:unknown,keys:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Object.getPrototypeOf(raw)!==Object.prototype||keys.some(key=>!Object.hasOwn(raw,key))||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)&&!optional.includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))
    throw new TypeError("Paid dispatch finish requires exact plain data fields");
  return raw as Record<string,unknown>;
}
function integer(raw:unknown,min=0,max=U32):number {
  if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<min||raw>max)throw new TypeError("Paid dispatch finish integer exceeds supported width");return raw;
}
function formUint(raw:unknown):number {
  return integer(typeof raw==="string"&&/^(?:0|[1-9]\d*)$/.test(raw)?Number(raw):raw);
}
function eligible(snapshot:EntrustStart,stamp:unknown,passExpiry?:number) {
  const job=parseEntrustStart(snapshot),now=integer(stamp,1,I32);
  // ParseSkip indexes the existing native vector without a bounds check.
  if(job.cnt!==job.list.length||job.list.some((row,index)=>row.serial!==index))
    throw new TypeError("Paid dispatch finish requires canonical existing row indices");
  if(passExpiry!==undefined&&(integer(passExpiry,-0x8000_0000,I32)>now))
    throw new TypeError("Paid dispatch finish cannot charge an unexpired supplied Auto Pass");
  if(!job.list.length||BigInt(now)<BigInt(job.list[0].begin_utc)||BigInt(now)>=BigInt(job.list.at(-1)!.end_utc))
    throw new TypeError("Paid dispatch finish requires an active original time horizon");
  return {job,now,fee:admitEntrustSkipQuote(job,now)};
}
/** Restore is bound to the original immutable schedule and the fee at its
 * canonical timestamp. Later wall-clock time does not invalidate a paid row. */
export function normalizePaidDispatchFinish(raw:unknown,snapshot:EntrustStart,passExpiry:number):PaidDispatchFinish {
  integer(passExpiry,-0x8000_0000,I32);
  const row=object(raw,["completed_at","charged_fee"]),{now,fee}=eligible(snapshot,row.completed_at,passExpiry);
  if(integer(row.charged_fee,1,I32)!==fee)throw new TypeError("Paid dispatch finish quote differs from its captured original schedule");
  return {completed_at:now,charged_fee:fee};
}
/** Wire projection only: an accelerated End may precede a future original
 * Begin. Never persist this projection in place of the normalized original. */
export function projectPaidDispatchFinish(snapshot:EntrustStart,finish?:PaidDispatchFinish):EntrustStart {
  const detached=parseEntrustStart(snapshot);
  if(finish===undefined)return detached;
  const row=object(finish,["completed_at","charged_fee"]),{now,fee}=eligible(detached,row.completed_at);
  if(integer(row.charged_fee,1,I32)!==fee)throw new TypeError("Paid dispatch finish projection has an invalid captured quote");
  return {...detached,list:detached.list.map(row=>({...row,end_utc:String(now)}))};
}
/** Whole-job native serial-1 only. Price selection and temporal/currency
 * eligibility are server-owned; auth/owner lookup and atomic persistence are
 * caller duties. Free-first debit is explicit LOCAL policy. */
export function planPaidDispatchFinish(snapshot:EntrustStart,passExpiry:number,priorFinish:PaidDispatchFinish|undefined,
  rawRequest:unknown,now:number,rawWallet:DispatchFinishWallet) {
  const request=object(rawRequest,["entrust_id","serial","use_iap_qty","is_tuto","is_iap_pass"],
    ["app_code","app_ver","market","pvid","otp"]);
  for(const key of ["app_code","app_ver","market","pvid","otp"])if(Object.hasOwn(request,key)&&
    (typeof request[key]!=="string"&&typeof request[key]!=="number"||typeof request[key]==="number"&&!Number.isFinite(request[key])))
    throw new TypeError("Paid dispatch finish auth fields require scalar form data");
  if((request.serial!==-1&&request.serial!=="-1")||formUint(request.is_tuto)!==0||formUint(request.is_iap_pass)!==0)
    throw new TypeError("Paid dispatch finish supports only native whole-job non-tutorial non-pass selection");
  if(priorFinish!==undefined)throw new TypeError("Paid dispatch finish was already accepted; reconcile without success replay");
  const {job,now:stamp,fee}=eligible(snapshot,now,integer(passExpiry,-0x8000_0000,I32));
  const id=typeof request.entrust_id==="number"&&Number.isSafeInteger(request.entrust_id)?String(request.entrust_id):request.entrust_id;
  if(typeof id!=="string"||!(/^[1-9]\d*$/.test(id))||BigInt(id)>0xffff_ffff_ffff_ffffn||id!==job.entrust_id)
    throw new TypeError("Paid dispatch finish requires the exact owned job identity");
  if(formUint(request.use_iap_qty)!==fee)throw new TypeError("Paid dispatch finish request quote differs from the current original schedule");
  const source=object(rawWallet,["free_iap_qty","iap_qty"]),free=integer(source.free_iap_qty),paid=integer(source.iap_qty);
  if(free>U32-paid)throw new TypeError("Paid dispatch finish total Manda exceeds native uint32");
  if(free+paid<fee)throw new TypeError("Insufficient Manda for paid dispatch finish");
  const freeDebit=Math.min(free,fee),wallet={free_iap_qty:free-freeDebit,iap_qty:paid-(fee-freeDebit)};
  const finish={completed_at:stamp,charged_fee:fee},projected=projectPaidDispatchFinish(job,finish);
  return {finish,wallet,receipt:{skip_price:job.skip_price,list:projected.list,user:{...wallet}}};
}
