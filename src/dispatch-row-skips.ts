import {parseEntrustStart,type EntrustStart} from "./expedition-entrust-snapshot.js";
import {entrustNativeSkipPrice} from "./expedition-skip-quote.js";
import {planPaidDispatchFinish,type PaidDispatchFinish,type DispatchFinishWallet} from "./dispatch-paid-finish.js";

const I32=0x7fff_ffff,U32=0xffff_ffff;
export interface DispatchRowSkip {serial:number;completed_at:number;charged_fee:1}
function object(raw:unknown,keys:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Object.getPrototypeOf(raw)!==Object.prototype||keys.some(key=>!Object.hasOwn(raw,key))||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)&&!optional.includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))
    throw new TypeError("Sequential dispatch requires exact plain data fields");return raw as Record<string,unknown>;
}
function integer(raw:unknown,min=0,max=U32):number {
  if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<min||raw>max)throw new TypeError("Sequential dispatch integer exceeds supported width");return raw;
}
function form(raw:unknown,min=0,max=U32):number {
  return integer(typeof raw==="string"&&/^(?:0|-?[1-9]\d*)$/.test(raw)?Number(raw):raw,min,max);
}
function expiry(raw:unknown):number {return integer(raw,-0x8000_0000,I32);}
function expiredAt(passExpiry:number,now:number) {
  if(expiry(passExpiry)>now)throw new TypeError("Sequential dispatch cannot charge an unexpired supplied Auto Pass");
}
/** Canonical local schedule subset. Replayed rows may be shorter or zero-time;
 * original capture requires the full fixed duration for every row. */
function schedule(raw:EntrustStart,original=false):EntrustStart {
  const job=parseEntrustStart(raw),duration=job.complete_second;
  if(job.entrust_id==="0"||job.cnt<1||job.cnt>100||job.list.length!==job.cnt||duration<=0||!job.entrust_second_per_cost)
    throw new TypeError("Sequential dispatch requires a real bounded positive-duration/rate job");
  for(const [index,row] of job.list.entries()) {
    const begin=BigInt(row.begin_utc),end=BigInt(row.end_utc),span=end-begin;
    if(row.serial!==index||begin<1n||end>BigInt(I32)||span<0n||span>BigInt(duration)||original&&span!==BigInt(duration)||
      index>0&&row.begin_utc!==job.list[index-1].end_utc||[row.gold,row.user_exp,row.card_exp].some(value=>value<0))
      throw new TypeError("Sequential dispatch schedule is incoherent or outside signed32 UTC");
  }
  return job;
}
function rowList(raw:unknown):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||!raw.length||raw.length>100||
    Reflect.ownKeys(raw).length!==raw.length+1||Array.from({length:raw.length},(_,i)=>{
      const d=Object.getOwnPropertyDescriptor(raw,String(i));return !d?.enumerable||!Object.hasOwn(d,"value");
    }).some(Boolean))throw new TypeError("Sequential dispatch captures require a nonempty dense bounded data array");return raw;
}
function applyRow(job:EntrustStart,serial:number,stamp:number):EntrustStart {
  const current=job.list.findIndex(row=>BigInt(row.end_utc)>BigInt(stamp));
  if(current<0||serial!==current||BigInt(job.list[current].begin_utc)>BigInt(stamp))
    throw new TypeError("Sequential dispatch can skip only the current unfinished row");
  const result={...job,list:job.list.map(row=>({...row}))};result.list[serial].end_utc=String(stamp);
  for(let index=serial+1;index<result.list.length;index++) {
    const begin=BigInt(result.list[index-1].end_utc),end=begin+BigInt(result.complete_second);
    if(end>BigInt(I32))throw new TypeError("Sequential dispatch rebased deadline exceeds signed32 UTC");
    result.list[index].begin_utc=String(begin);result.list[index].end_utc=String(end);
  }
  return result;
}
/** Replay against the immutable original, with no dependence on today's clock.
 * Timestamp ordering may be equal; accepted serials necessarily progress. */
export function replayDispatchRowSkips(original:EntrustStart,passExpiry:number,rawNonemptyRows:unknown):{rows:DispatchRowSkip[];effective:EntrustStart} {
  let effective=schedule(original,true);expiry(passExpiry);
  const input=rowList(rawNonemptyRows);if(input.length>effective.cnt)throw new TypeError("Too many sequential dispatch captures");
  const rows:DispatchRowSkip[]=[],seen=new Set<number>();let lastStamp=0;
  for(const value of input) {
    const row=object(value,["serial","completed_at","charged_fee"]),serial=integer(row.serial,0,effective.cnt-1),completed_at=integer(row.completed_at,1,I32);
    if(row.charged_fee!==1||seen.has(serial)||completed_at<lastStamp)throw new TypeError("Sequential dispatch capture is duplicate, out of order or has a wrong fee");
    expiredAt(passExpiry,completed_at);effective=applyRow(effective,serial,completed_at);
    rows.push({serial,completed_at,charged_fee:1});seen.add(serial);lastStamp=completed_at;
  }
  return {rows,effective};
}
/** Replayed paid rows can share ends, so the original strict-increasing whole
 * helper is intentionally not used here. Numeric quote operations remain the
 * exact original float32 GetSkipPrice projection. */
function sequentialQuote(rawEffective:EntrustStart,passExpiry:number,rawNow:unknown) {
  const effective=schedule(rawEffective),now=integer(rawNow,1,I32);expiredAt(passExpiry,now);
  const lastPaid=effective.list.reduce((latest,row)=>BigInt(row.end_utc)-BigInt(row.begin_utc)<BigInt(effective.complete_second)
    ?Math.max(latest,Number(row.end_utc)):latest,Number(effective.list[0].begin_utc));
  if(now<lastPaid||BigInt(now)<BigInt(effective.list[0].begin_utc)||BigInt(now)>=BigInt(effective.list.at(-1)!.end_utc))
    throw new TypeError("Sequential whole-job finish is outside its remaining chronological horizon");
  const quote=entrustNativeSkipPrice(effective,now);
  if(quote.derivedEndWord!==Number(effective.list.at(-1)!.end_utc)||quote.price<1||quote.price>I32)
    throw new TypeError("Sequential whole-job quote exceeds supported signed32 bounds");
  return {effective,now,fee:quote.price};
}
export function normalizeSequentialFinish(rawPaidFinish:unknown,effective:EntrustStart,passExpiry:number):PaidDispatchFinish {
  const row=object(rawPaidFinish,["completed_at","charged_fee"]),quote=sequentialQuote(effective,passExpiry,row.completed_at);
  if(integer(row.charged_fee,1,I32)!==quote.fee)throw new TypeError("Sequential whole-job captured fee differs from its effective schedule");
  return {completed_at:quote.now,charged_fee:quote.fee};
}
export function projectSequentialFinish(effective:EntrustStart,finish:PaidDispatchFinish,passExpiry:number):EntrustStart {
  const normalized=normalizeSequentialFinish(finish,effective,passExpiry),job=schedule(effective);
  return {...job,list:job.list.map(row=>({...row,end_utc:String(normalized.completed_at)}))};
}
function debit(rawWallet:DispatchFinishWallet,fee:number):DispatchFinishWallet {
  const row=object(rawWallet,["free_iap_qty","iap_qty"]),free=integer(row.free_iap_qty),paid=integer(row.iap_qty);
  if(free>U32-paid)throw new TypeError("Sequential dispatch total Manda exceeds native uint32");
  if(free+paid<fee)throw new TypeError("Insufficient Manda for sequential dispatch");
  const used=Math.min(free,fee);return {free_iap_qty:free-used,iap_qty:paid-(fee-used)};
}
export function planSequentialDispatchSkip(original:EntrustStart,passExpiry:number,priorRows:DispatchRowSkip[]|undefined,
  priorFinish:PaidDispatchFinish|undefined,raw:unknown,now:number,wallet:DispatchFinishWallet):{
    rows?:DispatchRowSkip[];finish?:PaidDispatchFinish;wallet:DispatchFinishWallet;
    receipt:{skip_price:number;list:EntrustStart["list"];user:DispatchFinishWallet}} {
  const request=object(raw,["entrust_id","serial","use_iap_qty","is_tuto","is_iap_pass"],["app_code","app_ver","market","pvid","otp"]);
  for(const key of ["app_code","app_ver","market","pvid","otp"])if(Object.hasOwn(request,key)&&
    (typeof request[key]!=="string"&&typeof request[key]!=="number"||typeof request[key]==="number"&&!Number.isFinite(request[key])))
    throw new TypeError("Sequential dispatch auth requires scalar form data");
  const serial=form(request.serial,-1,I32),supplied=form(request.use_iap_qty);
  if(form(request.is_tuto)!==0||form(request.is_iap_pass)!==0)throw new TypeError("Sequential dispatch supports only non-tutorial non-pass payment");
  if(priorFinish!==undefined)throw new TypeError("Sequential dispatch was already wholly finished; reconcile without success replay");
  const base=schedule(original,true),stamp=integer(now,1,I32);expiredAt(passExpiry,stamp);
  const id=typeof request.entrust_id==="number"&&Number.isSafeInteger(request.entrust_id)?String(request.entrust_id):request.entrust_id;
  if(typeof id!=="string"||!(/^[1-9]\d*$/.test(id))||BigInt(id)>0xffff_ffff_ffff_ffffn||id!==base.entrust_id)
    throw new TypeError("Sequential dispatch requires the exact owned job identity");
  const replayed=priorRows===undefined?{rows:[] as DispatchRowSkip[],effective:base}:replayDispatchRowSkips(base,passExpiry,priorRows);
  if(replayed.rows.length&&stamp<replayed.rows.at(-1)!.completed_at)throw new TypeError("Sequential dispatch clock predates an accepted payment");
  if(serial===-1) {
    if(priorRows===undefined) {
      const plan=planPaidDispatchFinish(base,passExpiry,undefined,raw,stamp,wallet);
      return {finish:plan.finish,wallet:plan.wallet,receipt:plan.receipt};
    }
    const {fee}=sequentialQuote(replayed.effective,passExpiry,stamp);
    if(supplied!==fee)throw new TypeError("Sequential whole-job request quote is stale or incorrect");
    const nextWallet=debit(wallet,fee),finish={completed_at:stamp,charged_fee:fee};
    const projected=projectSequentialFinish(replayed.effective,finish,passExpiry);
    return {rows:replayed.rows,finish,wallet:nextWallet,receipt:{skip_price:base.skip_price,list:projected.list,user:{...nextWallet}}};
  }
  if(supplied!==1||serial>=base.cnt||replayed.rows.some(row=>row.serial===serial))
    throw new TypeError("Sequential row request requires an unpaid current row and exact native fee1");
  const effective=applyRow(replayed.effective,serial,stamp),nextWallet=debit(wallet,1);
  const rows:DispatchRowSkip[]=[...replayed.rows,{serial,completed_at:stamp,charged_fee:1}];
  return {rows,wallet:nextWallet,receipt:{skip_price:base.skip_price,list:[{...effective.list[serial]}],user:{...nextWallet}}};
}
