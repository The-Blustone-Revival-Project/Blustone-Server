import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import type {GemReference} from "./gem-instances.js";
import {parseGemInstances} from "./gem-instances.js";
import {gemLevelPriceAt,type GemLevelPrice} from "./gem-level-prices.js";
import {GEM_STAT_KEYS} from "./gem-combinations.js";

type Gem=Record<string,unknown>;
interface Step {before:Gem;after:Gem}
interface Plan {inst_id:string;steps:Step[]}
export interface GemPolishJournal {
  classification:"local-supplied-sequence";
  reference_hash:string;
  plans:Plan[];
  cursors:number[];
}
const I32=0x7fff_ffff;
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Object.getPrototypeOf(raw)!==Object.prototype||Reflect.ownKeys(raw).length!==keys.length||
    keys.some(key=>{const d=Object.getOwnPropertyDescriptor(raw,key);return !d?.enumerable||!Object.hasOwn(d,"value");}))
    throw new TypeError("Gem polish requires exact plain JSON fields");return raw as Record<string,unknown>;
}
function list(raw:unknown,max:number):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(raw,String(i));return !d?.enumerable||!Object.hasOwn(d,"value");}).some(Boolean))
    throw new TypeError("Gem polish requires dense bounded arrays");return raw;
}
function integer(raw:unknown,min=0,max=I32):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<min||raw>max)throw new TypeError("Gem polish integer outside supported range");return raw;
}
export function polishIdentity(raw:unknown):string {
  const id=typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):raw;
  if(typeof id!=="string"||id.length>20||!/^[1-9]\d*$/.test(id)||BigInt(id)>0xffff_ffff_ffff_ffffn)throw new TypeError("Gem polish requires canonical positive uint64 ID");return id;
}
function jsonData(raw:unknown,depth=0):void {
  if(depth>12)throw new TypeError("Gem polish JSON nesting exceeds supported bound");
  if(raw===null||typeof raw==="string"||typeof raw==="boolean"||typeof raw==="number"&&Number.isFinite(raw))return;
  if(!raw||typeof raw!=="object"||Object.getPrototypeOf(raw)!==(Array.isArray(raw)?Array.prototype:Object.prototype))throw new TypeError("Gem polish requires JSON data");
  if(Array.isArray(raw))list(raw,10000);
  for(const key of Reflect.ownKeys(raw)) {
    if(Array.isArray(raw)&&key==="length")continue;
    const d=Object.getOwnPropertyDescriptor(raw,key);
    if(typeof key!=="string"||!d?.enumerable||!Object.hasOwn(d,"value"))throw new TypeError("Gem polish rejects accessor fields");
    jsonData(d.value,depth+1);
  }
}
function completeGem(raw:unknown,refs:readonly GemReference[]):Gem {
  jsonData(raw);
  const row=object(raw,["inst_id","ref_id","rank","level","position","target_inst_id","ability","abilities"]);
  const target=row.target_inst_id===0||row.target_inst_id==="0"?"0":polishIdentity(row.target_inst_id);
  const parsed=parseGemInstances({result_code:1,ret_data:[row]},refs,new Set([target]))[0];
  integer(parsed.level,1,15);if(!parsed.abilities)throw new TypeError("Gem polish requires complete authoritative abilities");
  const abilities=row.abilities as {main:Record<string,unknown>;sub:Record<string,unknown>[]};
  for(const record of [abilities.main,...abilities.sub])if(GEM_STAT_KEYS.some(key=>!Number.isFinite(Math.fround(Number(record[key])))))
    throw new TypeError("Gem polish supplied stat words exceed finite float32 range");
  for(const record of [parsed.abilities.main,...parsed.abilities.sub])if(Object.values(record.stats).some(n=>!Number.isFinite(Math.fround(n))))
    throw new TypeError("Gem polish native float32 stats must remain finite");
  return {...structuredClone(row),inst_id:parsed.inst_id,target_inst_id:parsed.target_inst_id};
}
export function gemPolishReferenceHash(refs:readonly GemReference[],prices:readonly GemLevelPrice[]) {
  return createHash("sha256").update(JSON.stringify({refs,prices})).digest("hex");
}
/** This admits supplied complete before/after states; it never rolls or infers
 * growth/chance from the anvil UI, price possibility or compensation fields. */
export function configuredGemPolish(raw:unknown,refs:readonly GemReference[],prices:readonly GemLevelPrice[]):ReadonlyMap<number,GemPolishJournal> {
  const root=object(raw,["classification","owners"]);
  if(root.classification!=="local-supplied-sequence")throw new TypeError("Gem polish sequence must be explicitly classified LOCAL");
  const owners=root.owners;
  if(!owners||typeof owners!=="object"||Object.getPrototypeOf(owners)!==Object.prototype)throw new TypeError("Gem polish owners require a data map");
  const result=new Map<number,GemPolishJournal>();
  for(const key of Reflect.ownKeys(owners)) {
    if(typeof key!=="string"||!/^[1-9]\d*$/.test(key)||!Number.isSafeInteger(Number(key)))throw new TypeError("Invalid Gem polish owner");
    const descriptor=Object.getOwnPropertyDescriptor(owners,key);
    if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))throw new TypeError("Gem polish owner must be JSON data");
    const seen=new Set<string>();let total=0;
    const plans=list(descriptor.value,1000).map(rawPlan=>{
      const p=object(rawPlan,["inst_id","steps"]),inst_id=polishIdentity(p.inst_id);
      if(seen.has(inst_id))throw new TypeError("Duplicate Gem polish plan");seen.add(inst_id);
      const steps=list(p.steps,10000).map(rawStep=>{
        const s=object(rawStep,["before","after"]),before=completeGem(s.before,refs),after=completeGem(s.after,refs);
        for(const field of ["inst_id","ref_id","rank","position","target_inst_id"])if(before[field]!==after[field])throw new TypeError("Gem polish changes stable ownership metadata");
        if(before.inst_id!==inst_id||Number(before.level)>14)throw new TypeError("Gem polish source identity/level mismatch");
        const quote=gemLevelPriceAt(prices,Number(before.level)+1);
        if(!quote||quote.price_type!==2)throw new TypeError("Gem polish requires explicit next-level gold2 quote");
        integer(quote.price);
        const failed=(after.abilities as any).level_up_failed;
        if(failed===0) {
          if(Number(after.level)!==Number(before.level)+1)throw new TypeError("Supplied polish success must advance exactly one level");
        }else if(after.level!==before.level||failed!==(before.abilities as any).level_up_failed+1)
          throw new TypeError("Supplied polish failure must retain level and increment its counter");
        return {before,after};
      });
      if(!steps.length)throw new TypeError("Gem polish needs supplied transitions");
      for(let i=1;i<steps.length;i++)if(!isDeepStrictEqual(steps[i-1].after,steps[i].before))throw new TypeError("Gem polish sequence has a gap");
      total+=steps.length;if(total>10000)throw new TypeError("Gem polish owner sequence exceeds supported bound");
      return {inst_id,steps};
    });
    if(!plans.length)throw new TypeError("Gem polish owner has no plan");
    result.set(Number(key),{classification:"local-supplied-sequence",reference_hash:gemPolishReferenceHash(refs,prices),plans,cursors:plans.map(()=>0)});
  }
  if(!result.size)throw new TypeError("Gem polish requires supplied owned plans");return result;
}
export function normalizeGemPolish(raw:unknown,refs:readonly GemReference[],prices:readonly GemLevelPrice[]):GemPolishJournal {
  const j=object(raw,["classification","reference_hash","plans","cursors"]);
  const normalized=configuredGemPolish({classification:j.classification,owners:{"1":j.plans}},refs,prices).get(1)!;
  if(j.reference_hash!==normalized.reference_hash)throw new TypeError("Captured Gem polish references/prices changed");
  const cursors=list(j.cursors,1000).map((n,i)=>integer(n,0,normalized.plans[i]?.steps.length??-1));
  if(cursors.length!==normalized.plans.length||!cursors.some(n=>n>0))throw new TypeError("Captured Gem polish needs completed work");
  return {...normalized,cursors};
}
export function sameGemPolishPolicy(a:GemPolishJournal,b:GemPolishJournal) {
  return a.reference_hash===b.reference_hash&&isDeepStrictEqual(a.plans,b.plans);
}
export function validateGemPolishHistory(journal:GemPolishJournal,gems:readonly Gem[]) {
  for(const [index,plan] of journal.plans.entries()) {
    const cursor=journal.cursors[index],owned=gems.find(g=>String(g.inst_id)===plan.inst_id);
    if(!cursor||!owned)continue; // A subsequent supported Gem sale remains legal.
    const expected=plan.steps[cursor-1].after;
    for(const key of ["ref_id","rank","level","ability","abilities"])if(!isDeepStrictEqual(owned[key],expected[key]))
      throw new TypeError("Captured Gem polish history disagrees with owned result");
  }
}
/** LOCAL batch law: checked maximum-funds admission, current discounted quote
 * per actual try, stop at first supplied success, never fabricate exhaustion.
 * Repeated funded requests are new work: native request has no operation nonce. */
export function planGemPolish(journal:GemPolishJournal,gems:readonly Gem[],gold:number,raw:Record<string,unknown>,fee:number) {
  const id=polishIdentity(raw.inst_id),max=typeof raw.max_tries==="string"&&/^[1-9]\d*$/.test(raw.max_tries)?Number(raw.max_tries):raw.max_tries;
  const maximum=integer(max,1,100),price=integer(fee),balance=integer(gold),budget=price*maximum;
  if(budget>I32||balance<budget)throw new TypeError("Insufficient checked maximum polish budget");
  const index=journal.plans.findIndex(p=>p.inst_id===id),owned=gems.find(g=>String(g.inst_id)===id);
  if(index<0||!owned)throw new TypeError("No owned supplied Gem polish sequence");
  const next=structuredClone(journal),plan=next.plans[index];let cursor=next.cursors[index],tries=0;
  let current:Gem={...owned,inst_id:id,target_inst_id:String(owned.target_inst_id)};
  for(;tries<maximum;) {
    const step=plan.steps[cursor];
    if(!step||!isDeepStrictEqual(current,step.before))throw new TypeError("Supplied Gem polish source state unavailable or stale");
    current=step.after;cursor++;tries++;
    if((current.abilities as any).level_up_failed===0)break;
  }
  next.cursors[index]=cursor;
  return {journal:next,gold:balance-price*tries,tries,gem:structuredClone(current),
    gems:gems.map(g=>String(g.inst_id)===id?structuredClone(current):g)};
}
