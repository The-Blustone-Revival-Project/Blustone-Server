import type {EntrustStart} from "./expedition-entrust-snapshot.js";
function word(raw:number):number {
  if(!Number.isInteger(raw)||raw< -0x8000_0000||raw>0xffff_ffff)throw new TypeError("Entrust server clock requires exact32 bits");return raw>>>0;
}
/** Original preview countdown, not backend completion/claim eligibility.
 * Preserve full64 snapshots; this consumer deliberately uses low32 timestamps.
 * Empty/all-zero lists use origin0, not a fabricated current-time origin. */
export function entrustDerivedEndWord(job:EntrustStart):number {
  let last=0,prefix=0;
  for(const row of job.list){const end=BigInt(row.end_utc);if(end===0n)break;last=Number(BigInt.asUintN(32,end));prefix++;}
  const remaining=Math.max(0,(job.list.length-prefix)|0);
  return (Math.imul(remaining,job.complete_second)+last)>>>0;
}
export function entrustCountdown(job:EntrustStart,currentServerWord:number):number {
  const now=word(currentServerWord);
  if(job.entrust_id==="0")return -1;
  return Math.max(0,(entrustDerivedEndWord(job)-now)|0);
}
/** GetClearCount scans ALL rows using zero-extended current32 versus signed64
 * end. If none count as elapsed, it returns ENTIRE length, including zero/future
 * rows. That fallback is native preview behavior, never reward entitlement. */
export function entrustNativeClearCount(job:EntrustStart,currentServerWord:number):number {
  const now=BigInt(word(currentServerWord));let count=0;
  for(const row of job.list){const end=BigInt(row.end_utc);if(end!==0n&&now>=BigInt.asIntN(64,end))count++;}
  return count===0?job.list.length:count;
}
