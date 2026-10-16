import {createHash} from 'node:crypto';
import {validatedMiragePolicy,normalizeMirageRun,type MiragePolicy,type MirageRun} from './mirage-run.js';

export interface MirageReentryPolicy {
  readonly payment:'free-local';readonly daily_attempts:number;readonly day_offset_minutes:number;
  readonly on_unavailable:'abandon-local';readonly initial_floor:number;
  readonly floors:readonly MiragePolicy[];
  readonly transitions:readonly {readonly floor:number;readonly cleared:number;readonly failed:number}[];
}
export interface MirageAttemptHistory {
  generation:number;floor:number;begin_ltime:number;claimed:number[];revive_ids?:number[];abandoned:boolean;completed:boolean;
}
export interface MirageReentryOffer {generation:number;day:number;token:string;target:number;action:'reenter'|'abandon'|'inspect'}
export interface MirageSeries {
  policy:MirageReentryPolicy;generation:number;day:number;used:number;highest:number;history:MirageAttemptHistory[];
  offer?:MirageReentryOffer;last_reset?:{generation:number;stay:boolean};
}
const LIMIT=10000,I32=0x7fff_ffff,U32=0xffff_ffff;
function object(raw:unknown,required:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||required.some(key=>!Object.hasOwn(raw,key))||
    Reflect.ownKeys(raw).some(key=>typeof key!=='string'||![...required,...optional].includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,'value')))
    throw new TypeError('Mirage re-entry requires complete plain data fields');return raw as Record<string,unknown>;
}
function array(raw:unknown,max=LIMIT):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>Object.getOwnPropertyDescriptor(raw,String(i))).some(d=>!d?.enumerable||!Object.hasOwn(d,'value')))
    throw new TypeError('Mirage re-entry requires dense bounded arrays');return raw;
}
function integer(raw:unknown,min=0,max=I32):number {
  if(typeof raw!=='number'||!Number.isInteger(raw)||raw<min||raw>max)throw new TypeError('Mirage re-entry integer outside local bounds');return raw===0?0:raw;
}
function bool(raw:unknown):boolean {if(typeof raw!=='boolean')throw new TypeError('Mirage re-entry requires explicit boolean');return raw;}
function freeze<T>(raw:T):T {if(raw&&typeof raw==='object'){for(const value of Object.values(raw))freeze(value);Object.freeze(raw);}return raw;}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);

/** Every count, clock offset and transition is explicit LOCAL policy. The
 * extra floor list excludes the separately provided initial floor. */
export function configuredMirageReentry(raw:unknown,initial:MiragePolicy):MirageReentryPolicy {
  const input=object(raw,['payment','daily_attempts','day_offset_minutes','on_unavailable','floors','transitions']);
  if(input.payment!=='free-local'||input.on_unavailable!=='abandon-local')throw new TypeError('Explicit LOCAL free re-entry/abandon policy required');
  const first=validatedMiragePolicy(initial),floors=[first,...array(input.floors,LIMIT-1).map(validatedMiragePolicy)].sort((a,b)=>a.floor-b.floor);
  const ids=new Set(floors.map(row=>row.floor));if(ids.size!==floors.length)throw new TypeError('Duplicate Mirage re-entry floor');
  const transitions=array(input.transitions).map(value=>{
    const row=object(value,['floor','cleared','failed']);return {floor:integer(row.floor,1),cleared:integer(row.cleared,1),failed:integer(row.failed,1)};
  }).sort((a,b)=>a.floor-b.floor);
  if(transitions.length!==floors.length||new Set(transitions.map(row=>row.floor)).size!==transitions.length||
    transitions.some(row=>![row.floor,row.cleared,row.failed].every(id=>ids.has(id))))throw new TypeError('Every Mirage floor requires one complete known transition');
  return freeze({payment:'free-local',daily_attempts:integer(input.daily_attempts,1,100),day_offset_minutes:integer(input.day_offset_minutes,-840,840),
    on_unavailable:'abandon-local',initial_floor:first.floor,floors,transitions});
}
function policySnapshot(raw:unknown):MirageReentryPolicy {
  const row=object(raw,['payment','daily_attempts','day_offset_minutes','on_unavailable','initial_floor','floors','transitions']);
  const floors=array(row.floors).map(validatedMiragePolicy),initial=floors.find(floor=>floor.floor===integer(row.initial_floor,1));
  if(!initial)throw new TypeError('Missing captured Mirage initial floor');
  return configuredMirageReentry({payment:row.payment,daily_attempts:row.daily_attempts,day_offset_minutes:row.day_offset_minutes,
    on_unavailable:row.on_unavailable,floors:floors.filter(floor=>floor!==initial),transitions:row.transitions},initial);
}
export function mirageReentryDay(policy:MirageReentryPolicy,now:number):number {
  return Math.floor((integer(now)+integer(policy.day_offset_minutes,-840,840)*60)/86400);
}
/** Native UI treats wire begin_ltime+86400 as the retry deadline. Keep the
 * real enrollment timestamp in the journal; project an explicit LOCAL clock
 * without changing audited quota, ownership or actual attempt history. */
export function mirageReentryBeginTime(raw:MirageSeries,rawRun:MirageRun,now:number):number {
  const series=normalizeMirageSeries(raw,rawRun),run=normalizeMirageRun(rawRun),day=currentDay(series,run,now);
  if(run.cache.inst_base.state===0&&day===series.day&&series.used>=series.policy.daily_attempts)
    return integer((day+1)*86400-series.policy.day_offset_minutes*60-86400,0);
  // Strict native BGE blocks at equality; one second before entry is ready.
  return Math.max(0,run.cache.inst_base.begin_ltime-86401);
}
function token(run:MirageRun):string {return createHash('sha256').update(JSON.stringify(normalizeMirageRun(run))).digest('hex');}
function boundPolicy(policy:MirageReentryPolicy,run:MirageRun) {
  const floor=policy.floors.find(row=>row.floor===run.policy.floor);
  if(!floor||!same(floor,run.policy))throw new TypeError('Current Mirage run differs from captured series floor policy');
}
export function createMirageSeries(policy:MirageReentryPolicy,rawRun:MirageRun,now:number):MirageSeries {
  const captured=policySnapshot(policy),run=normalizeMirageRun(rawRun);boundPolicy(captured,run);
  if(run.policy.floor!==captured.initial_floor||run.cache.inst_base.state!==1||run.cache.inst_base.begin_ltime!==integer(now)||run.claimed.length)
    throw new TypeError('Mirage series requires the fresh initial run');
  return normalizeMirageSeries({policy:captured,generation:1,day:mirageReentryDay(captured,now),used:1,highest:0,history:[]},run);
}

/** A stale offer is preserved as journal data, but consuming it requires a
 * current generation/day/exact-run-token match. No member IDs are archived. */
export function normalizeMirageSeries(raw:unknown,rawRun:MirageRun):MirageSeries {
  const row=object(raw,['policy','generation','day','used','highest','history'],['offer','last_reset']);
  const policy=policySnapshot(row.policy),run=normalizeMirageRun(rawRun);boundPolicy(policy,run);
  const generation=integer(row.generation,1,LIMIT+1),day=integer(row.day,-1),used=integer(row.used,1,policy.daily_attempts);
  const history=array(row.history).map((value,index):MirageAttemptHistory=>{
    const item=object(value,['generation','floor','begin_ltime','claimed','abandoned','completed'],['revive_ids']);
    const floor=integer(item.floor,1),definition=policy.floors.find(row=>row.floor===floor);if(!definition)throw new TypeError('Unknown archived Mirage floor');
    if(integer(item.generation,1,LIMIT)!==index+1)throw new TypeError('Mirage attempt history must be a contiguous generation prefix');
    const claimed=array(item.claimed,definition.stairs.length).map((value,index)=>{if(value!==index+1)throw new TypeError('Archived Mirage claims must be an earned prefix');return index+1;});
    const abandoned=bool(item.abandoned),completed=bool(item.completed);
    if(completed&&(abandoned||claimed.length!==definition.stairs.length)||!completed&&claimed.length===definition.stairs.length)
      throw new TypeError('Archived Mirage outcome disagrees with earned claims');
    if(Object.hasOwn(item,'revive_ids')!==(definition.revive_prices!==undefined))throw new TypeError('Archived Mirage first-aid history must match its policy');
    const revive_ids=definition.revive_prices?array(item.revive_ids,definition.revive_prices.length).map(id=>integer(id,1,U32)):undefined;
    return {generation:index+1,floor,begin_ltime:integer(item.begin_ltime),claimed,abandoned,completed,...(revive_ids?{revive_ids}:{})};
  });
  if(history.length!==generation-1||day!==mirageReentryDay(policy,run.cache.inst_base.begin_ltime)||
    (history[0]?.floor??run.policy.floor)!==policy.initial_floor||
    history.some((item,index)=>item.begin_ltime>(history[index+1]?.begin_ltime??run.cache.inst_base.begin_ltime))||
    used!==1+history.filter(item=>mirageReentryDay(policy,item.begin_ltime)===day).length)
    throw new TypeError('Mirage generation/day/usage does not match attempt history');
  const highest=Math.max(run.cache.inst_base.highest,...history.filter(item=>item.completed).map(item=>item.floor));
  if(integer(row.highest)!==highest)throw new TypeError('Mirage highest floor must reflect completed attempts only');
  let offer:MirageReentryOffer|undefined,last_reset:MirageSeries['last_reset'];
  if(Object.hasOwn(row,'offer')) {
    const value=object(row.offer,['generation','day','token','target','action']);
    if(typeof value.token!=='string'||!/^[a-f0-9]{64}$/.test(value.token)||!['reenter','abandon','inspect'].includes(String(value.action))||
      typeof value.action!=='string'||!policy.floors.some(floor=>floor.floor===value.target))throw new TypeError('Malformed Mirage re-entry offer');
    offer={generation:integer(value.generation,1,generation),day:integer(value.day,-1),token:value.token,target:integer(value.target,1),action:value.action as MirageReentryOffer['action']};
  }
  if(Object.hasOwn(row,'last_reset')) {
    const value=object(row.last_reset,['generation','stay']);if(value.generation!==generation)throw new TypeError('Mirage reset receipt must bind current generation');
    last_reset={generation,stay:bool(value.stay)};
  }
  return {policy,generation,day,used,highest,history,...(offer?{offer}:{}),...(last_reset?{last_reset}:{})};
}
function currentDay(series:MirageSeries,run:MirageRun,now:number) {
  if(integer(now)<run.cache.inst_base.begin_ltime)throw new TypeError('Mirage re-entry clock rollback');
  const day=mirageReentryDay(series.policy,now);if(day<series.day)throw new TypeError('Mirage re-entry clock rollback');return day;
}
function expectedOffer(series:MirageSeries,run:MirageRun,day:number,now:number):MirageReentryOffer {
  const transition=series.policy.transitions.find(row=>row.floor===run.policy.floor)!;
  const target=run.cache.inst_base.state===0&&!run.abandoned?transition.cleared:transition.failed;
  const targetPolicy=series.policy.floors.find(row=>row.floor===target)!;
  const available=(day>series.day||series.used<series.policy.daily_attempts)&&series.history.length<LIMIT&&targetPolicy.hero.end_ltime>=now;
  return {generation:series.generation,day,token:token(run),target:available?target:run.policy.floor,
    action:available?'reenter':run.cache.inst_base.state===0?'inspect':'abandon'};
}
export function proposeMirageReentry(raw:MirageSeries,rawRun:MirageRun,now:number) {
  const series=normalizeMirageSeries(raw,rawRun),run=normalizeMirageRun(rawRun),day=currentDay(series,run,now),offer=expectedOffer(series,run,day,now);
  const replay=same(series.offer,offer);series.offer=offer;
  return {series,next_floor:offer.target,replay};
}
export function consumeMirageReentry(raw:MirageSeries,rawRun:MirageRun,stay:boolean,now:number) {
  bool(stay);const series=normalizeMirageSeries(raw,rawRun),run=normalizeMirageRun(rawRun),day=currentDay(series,run,now);
  if(!series.offer) {
    if(series.last_reset?.generation===series.generation&&series.last_reset.stay===stay)
      return {series,action:'inspect' as const,replay:true,floor:run.policy.floor};
    throw new TypeError('Mirage reset requires a current offered choice');
  }
  const offer=expectedOffer(series,run,day,now);
  if(!same(offer,series.offer))throw new TypeError('Mirage re-entry offer is stale; request a fresh choice');
  delete series.offer;
  if(offer.action!=='reenter') {
    series.last_reset={generation:series.generation,stay};return {series,action:offer.action,replay:false,floor:run.policy.floor};
  }
  const floor=stay?run.policy.floor:offer.target,newPolicy=series.policy.floors.find(row=>row.floor===floor)!;
  if(newPolicy.hero.end_ltime<now)throw new TypeError('Chosen Mirage re-entry floor deadline has expired');
  series.history.push({generation:series.generation,floor:run.policy.floor,begin_ltime:run.cache.inst_base.begin_ltime,claimed:[...run.claimed],
    ...(run.revive_ids?{revive_ids:[...run.revive_ids]}:{}),abandoned:run.abandoned===true,completed:run.cache.inst_base.state===0&&!run.abandoned});
  series.generation++;series.used=day>series.day?1:series.used+1;series.day=day;
  series.highest=Math.max(series.highest,run.cache.inst_base.highest);series.last_reset={generation:series.generation,stay};
  // The caller now constructs and validates the fresh run. This advanced
  // series intentionally cannot be normalized against the old run.
  return {series,newPolicy,floor,action:'reenter' as const,replay:false};
}
