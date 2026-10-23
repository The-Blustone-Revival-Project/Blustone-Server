import {parseEntrustStart,type EntrustStart} from "./expedition-entrust-snapshot.js";
import {entrustDerivedEndWord} from "./expedition-entrust-clock.js";

const I32=0x7fff_ffff,U32=0xffff_ffff;
function serverWord(raw:number):number {
  if(!Number.isInteger(raw)||raw< -0x8000_0000||raw>U32)throw new TypeError("Entrust quote clock requires exact32 bits");
  return raw>>>0;
}
/** ARM VCVT.U32.F32 (toward zero), including architectural saturation.
 * This does not authorize negative, absent or overflowed paid amounts. */
function nativeUnsignedConversion(raw:number):number {
  if(Number.isNaN(raw)||raw<=0)return 0;
  if(raw>=U32)return U32;
  return Math.trunc(raw);
}
/** Original GetSkipPrice G9bacc8. This is a native preview projection, NOT
 * server entitlement. It preserves wrap/clamp/no-job and zero-rate behavior.
 * The response's skip_price field is deliberately not read by this consumer. */
export function entrustNativeSkipPrice(rawJob:EntrustStart,currentServerWord:number):{price:number;derivedEndWord:number} {
  const job=parseEntrustStart(rawJob),now=serverWord(currentServerWord),derivedEndWord=entrustDerivedEndWord(job);
  if(job.entrust_second_per_cost===0)return {price:0,derivedEndWord};
  const dividend=job.entrust_id==="0"?-1:Math.max(0,(derivedEndWord-now)|0);
  const numerator=Math.fround(dividend),denominator=Math.fround(job.entrust_second_per_cost);
  const quotient=Math.fround(numerator/denominator),added=Math.fround(quotient+Math.fround(1));
  return {price:nativeUnsignedConversion(added),derivedEndWord};
}
/** Conservative LOCAL paid-admission subset, separate from original preview
 * quirks: an actual job, positive duration/rate, fully scheduled increasing
 * signed32 UTC ends, and a signed32 fee. No schedule wrap becomes a cheap bill.
 * Ownership, serial eligibility, configured rate and debit/persistence belong
 * to the transactional caller. This helper never checks/grants pass rights. */
export function admitEntrustSkipQuote(rawJob:EntrustStart,currentServerWord:number):number {
  const job=parseEntrustStart(rawJob),now=serverWord(currentServerWord);
  if(job.entrust_id==="0"||job.complete_second<=0||job.entrust_second_per_cost===0||!job.list.length||now>I32)
    throw new TypeError("Paid Entrust quote requires an ongoing scheduled job and positive rate");
  let previous=-1n;
  for(const row of job.list) {
    const begin=BigInt(row.begin_utc),end=BigInt(row.end_utc);
    if(end===0n||begin>end||end>BigInt(I32)||end<=previous)
      throw new TypeError("Paid Entrust quote requires coherent signed32 scheduled ends");
    previous=end;
  }
  const quote=entrustNativeSkipPrice(job,now);
  if(quote.derivedEndWord!==Number(previous)||quote.price<1||quote.price>I32)
    throw new TypeError("Paid Entrust quote exceeds its supported signed32 horizon or fee");
  return quote.price;
}
