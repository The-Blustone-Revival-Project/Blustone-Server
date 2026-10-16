import {parseMirageCache,type MirageCache,type MirageEnemy,type MirageEntry} from "./mirage-cache.js";

export interface MiragePolicy {
  readonly enrollment:"rank-exp-id-projection";
  readonly floor:number;readonly bg_res:string;readonly dlg_begin:string;readonly dlg_end:string;
  readonly res_prefix:string;readonly res_postfix_list:readonly string[];
  readonly stairs:readonly {readonly grade:number;readonly balance:number;readonly enemies:readonly MirageEnemy[];readonly gold:number}[];
  readonly hero:{readonly bonus:number;readonly end_ltime:number;readonly cur:readonly string[];readonly next:readonly string[]};
  readonly revive_prices?:readonly number[];
}
export interface MirageRun {
  policy:MiragePolicy;cache:MirageCache;
  lastEnd?:{fingerprint:string;receipt:Record<string,unknown>};
  claimed:number[];abandoned?:true;revive_ids?:number[];
}
const I32=0x7fff_ffff,U32=0xffff_ffff;
function object(raw:unknown,required:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||required.some(key=>!Object.hasOwn(raw,key))||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||![...required,...optional].includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))
    throw new TypeError("Mirage run requires exact plain own data fields");return raw as Record<string,unknown>;
}
function array(raw:unknown,max:number):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>Object.getOwnPropertyDescriptor(raw,String(i))).some(value=>!value?.enumerable||!Object.hasOwn(value,"value")))
    throw new TypeError("Mirage run requires bounded dense arrays");return raw;
}
function integer(raw:unknown,min=0,max=I32):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<min||raw>max)throw new TypeError("Mirage run integer outside supported domain");return raw===0?0:raw;
}
function text(raw:unknown,nonempty=false):string {
  if(typeof raw!=="string"||nonempty&&!raw||Buffer.from(raw,"utf8").toString("utf8")!==raw||/[\u0000-\u001f]/.test(raw))
    throw new TypeError("Mirage run requires lossless text");return raw;
}
function names(raw:unknown,max:number,nonemptyList=false):string[] {
  const rows=array(raw,max).map(value=>text(value,true));
  if(nonemptyList&&!rows.length||new Set(rows).size!==rows.length)throw new TypeError("Mirage policy names must be nonempty and unique");return rows;
}
function freeze<T>(raw:T):T {
  if(raw&&typeof raw==="object"){for(const value of Object.values(raw))freeze(value);Object.freeze(raw);}return raw;
}
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function initialBase(floor:number,bg_res:string,dlg_begin:string,dlg_end:string,now:number,deck:readonly string[]=[]) {
  // Fixed neutral values are this LOCAL one-floor lifecycle's policy, not
  // recovered original record, tier, revive fee or ranking calculations.
  return {floor,bg_res,dlg_begin,dlg_end,new_record:0,stair:1,state:1,deck:[...deck],tier_percent:0,highest:0,revive_price:0,begin_ltime:now};
}
function enemyRows(raw:unknown):MirageEnemy[] {
  const enemies=parseMirageCache({entry:[],inst_base:initialBase(1,"","","",0),inst_enemy:array(raw,5),
    ref_stair:{res_prefix:"",res_postfix_list:[],list:[]},ref_hero:{bonus:0,end_ltime:0,cur:[],next:[]}}).inst_enemy;
  if(!enemies.length||enemies.some(row=>!row.ref_id||row.hp_percent!==10000))throw new TypeError("Configured Mirage enemies require full10000 HP and explicit reference IDs");return enemies;
}
/** Explicit LOCAL one-floor content only. No original stair/enemy/effect/gold
 * defaults are filled. Runtime readiness independently joins original assets,
 * supported Hunter references and actually owned enrollment/party records. */
export function validatedMiragePolicy(raw:unknown):MiragePolicy {
  const root=object(raw,["enrollment","floor","bg_res","dlg_begin","dlg_end","res_prefix","res_postfix_list","stairs","hero"],["revive_prices"]);
  if(root.enrollment!=="rank-exp-id-projection")throw new TypeError("Explicit LOCAL Mirage enrollment projection required");
  const floor=integer(root.floor,1),bg_res=text(root.bg_res,true),dlg_begin=text(root.dlg_begin),dlg_end=text(root.dlg_end);
  if(dlg_begin||dlg_end)throw new TypeError("Configured Mirage dialogue production is not supported");
  const res_prefix=text(root.res_prefix,true),res_postfix_list=names(root.res_postfix_list,100,true);
  const stairs=array(root.stairs,9).map(value=>{
    const row=object(value,["grade","balance","enemies","gold"]);
    return {grade:integer(row.grade,0,3),balance:integer(row.balance,1),enemies:enemyRows(row.enemies),gold:integer(row.gold)};
  });
  const required=floor<=20?3:floor<=40?6:9;
  if(stairs.length!==required)throw new TypeError("Configured Mirage floor requires explicit3/6/9 stairs for its floor band");
  const heroRaw=object(root.hero,["bonus","end_ltime","cur","next"]),hero={bonus:integer(heroRaw.bonus),end_ltime:integer(heroRaw.end_ltime),
    cur:names(heroRaw.cur,100),next:names(heroRaw.next,100)};
  const revive_prices=Object.hasOwn(root,"revive_prices")?array(root.revive_prices,100).map(value=>integer(value,1)):undefined;
  if(revive_prices&&!revive_prices.length)throw new TypeError("Enabled Mirage first aid requires explicit positive prices");
  return freeze({enrollment:root.enrollment,floor,bg_res,dlg_begin,dlg_end,res_prefix,res_postfix_list,stairs,hero,
    ...(revive_prices?{revive_prices}:{})}) as MiragePolicy;
}
function membership(cache:MirageCache,completed=false) {
  const entries=new Map<number,number>();
  for(const row of cache.entry){integer(row.id,1,U32);integer(row.mirage_remain_hp,0,10000);
    if(entries.has(row.id))throw new TypeError("Duplicate Mirage enrollment identity");entries.set(row.id,row.mirage_remain_hp);}
  if(completed&&(entries.size||cache.inst_base.deck.length))throw new TypeError("Completed Mirage run must release enrollment and party");
  if(!completed&&!entries.size)throw new TypeError("Configured Mirage run requires explicit enrollment");
  const seen=new Set<string>();
  for(const id of cache.inst_base.deck){if(!/^[1-9]\d*$/.test(id)||BigInt(id)>BigInt(U32)||!entries.has(Number(id))||seen.has(id))
    throw new TypeError("Registered Mirage party must contain distinct enrolled uint32 identities");seen.add(id);}
  return entries;
}
export function createMirageRun(policy:MiragePolicy,entries:readonly MirageEntry[],deck:readonly string[],now:number):MirageRun {
  const valid=validatedMiragePolicy(policy),time=integer(now);
  if(valid.hero.end_ltime<time)throw new TypeError("Configured Mirage rotation has already expired");
  const cache=parseMirageCache({entry:entries,inst_base:{...initialBase(valid.floor,valid.bg_res,valid.dlg_begin,valid.dlg_end,time,deck),revive_price:valid.revive_prices?.[0]??0},
    inst_enemy:valid.stairs[0].enemies,ref_stair:{res_prefix:valid.res_prefix,res_postfix_list:valid.res_postfix_list,
      list:valid.stairs.map(({grade,balance})=>({grade,balance}))},ref_hero:valid.hero});
  membership(cache);return normalizeMirageRun({policy:valid,cache,claimed:[],...(valid.revive_prices?{revive_ids:[]}:{})});
}
function normalizeEnd(raw:unknown,cache:MirageCache,entries:ReadonlyMap<number,number>) {
  const end=object(raw,["fingerprint","receipt"]),fingerprint=text(end.fingerprint,true);
  let decoded:unknown;try{decoded=JSON.parse(fingerprint);}catch{throw new TypeError("Invalid captured Mirage End fingerprint");}
  const report=object(decoded,["floor","stair","deck","enemy"]),base=cache.inst_base;
  if(report.floor!==base.floor||report.stair!==base.stair)throw new TypeError("Captured End coordinates do not bind current Mirage stair");
  const selected=base.deck,seen=new Set<string>(),deck=array(report.deck,5).map((value,index)=>{
    const row=object(value,["id","hp"]),id=text(row.id,true),hp=integer(row.hp,0,10000);
    if(id!==selected[index]||seen.has(id)||!entries.has(Number(id))||entries.get(Number(id))!==hp)throw new TypeError("Captured End Hunter carry does not match current selected enrollment");
    seen.add(id);return {id,hp};
  });
  const enemy=array(report.enemy,5).map(value=>integer(value,0,10000));
  if(!deck.length||deck.length!==selected.length||enemy.length!==cache.inst_enemy.length||enemy.some((hp,index)=>hp!==cache.inst_enemy[index].hp_percent))
    throw new TypeError("Captured End camps do not match Mirage cache");
  const alive=deck.some(row=>row.hp>0),enemyAlive=enemy.some(hp=>hp>0);
  if(alive===enemyAlive||base.state!==(alive?2:1))throw new TypeError("Captured End outcome is not a supported terminal camp");
  const canonical={floor:base.floor,stair:base.stair,deck,enemy};
  if(JSON.stringify(canonical)!==fingerprint)throw new TypeError("Captured End fingerprint must be canonical");
  const receipt=object(end.receipt,["state","deck","dailyquest_min_stage","daily_quest","linear_quest","achievement"]);
  if(receipt.state!==base.state||receipt.dailyquest_min_stage!==""||[receipt.daily_quest,receipt.linear_quest,receipt.achievement].some(rows=>array(rows,0).length))
    throw new TypeError("Captured End receipt contains unsupported state or economy/quest changes");
  const reply=array(receipt.deck,5).map((value,index)=>{
    const row=object(value,["inst_id","remain_hp_percent"]);
    if(row.inst_id!==Number(deck[index]?.id)||row.remain_hp_percent!==deck[index]?.hp)throw new TypeError("Captured End receipt differs from report");
    return {inst_id:integer(row.inst_id,1,U32),remain_hp_percent:integer(row.remain_hp_percent,0,10000)};
  });
  if(reply.length!==deck.length)throw new TypeError("Captured End receipt must contain the exact reported camp");
  return {fingerprint,receipt:{state:base.state,deck:reply,dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[]}};
}
/** Strict captured policy/cache journal. This validates structure/coherence;
 * the state owner must also bind every enrolled ID and carry to actual owned
 * Hunters, current reference support and persistent commitment provenance. */
export function normalizeMirageRun(raw:unknown):MirageRun {
  const root=object(raw,["policy","cache","claimed"],["lastEnd","abandoned","revive_ids"]),policy=validatedMiragePolicy(root.policy),cache=parseMirageCache(root.cache),base=cache.inst_base;
  const abandoned=Object.hasOwn(root,"abandoned");
  if(abandoned&&root.abandoned!==true)throw new TypeError("Mirage abandoned marker must be explicit true or absent");
  const reviveEnabled=policy.revive_prices!==undefined;
  if(Object.hasOwn(root,"revive_ids")!==reviveEnabled)throw new TypeError("Mirage first-aid history must exactly match its captured policy");
  const revive_ids=reviveEnabled?array(root.revive_ids,policy.revive_prices!.length).map(value=>integer(value,1,U32)):undefined;
  const revive_price=reviveEnabled?policy.revive_prices![revive_ids!.length]??-1:0;
  if(base.floor!==policy.floor||base.bg_res!==policy.bg_res||base.dlg_begin!==policy.dlg_begin||base.dlg_end!==policy.dlg_end||
    base.new_record!==0||base.tier_percent!==0||base.highest!==(base.state===0&&!abandoned?policy.floor:0)||base.revive_price!==revive_price||base.begin_ltime<0||base.begin_ltime>policy.hero.end_ltime||
    !same(cache.ref_stair,{res_prefix:policy.res_prefix,res_postfix_list:policy.res_postfix_list,list:policy.stairs.map(({grade,balance})=>({grade,balance}))})||!same(cache.ref_hero,policy.hero))
    throw new TypeError("Captured Mirage cache differs from bound static policy");
  const claimed=array(root.claimed,policy.stairs.length).map((value,index)=>{
    if(value!==index+1)throw new TypeError("Mirage claimed stairs must be the exact earned prefix");return index+1;
  });
  if(abandoned&&(base.state!==0||claimed.length>=policy.stairs.length||base.stair!==claimed.length+1)||
    base.state!==0&&base.state!==1&&base.state!==2||base.state===0&&!abandoned&&(claimed.length!==policy.stairs.length||base.stair!==policy.stairs.length)||
    base.state!==0&&(claimed.length>=policy.stairs.length||base.stair!==claimed.length+1))throw new TypeError("Mirage state/stair does not match claimed progress");
  const original=policy.stairs[base.stair-1].enemies;
  if(cache.inst_enemy.length!==original.length||cache.inst_enemy.some((row,index)=>{
    integer(row.hp_percent,0,10000);return !same({...row,hp_percent:10000},original[index]);
  }))throw new TypeError("Mirage enemy instance differs from configured current stair");
  const entries=membership(cache,base.state===0);
  if(base.state!==0&&revive_ids?.some(id=>!entries.has(id)))throw new TypeError("Active Mirage first-aid history must refer to enrolled Hunters");
  if(!abandoned&&(base.state===1&&!cache.inst_enemy.some(row=>row.hp_percent>0)||base.state!==1&&cache.inst_enemy.some(row=>row.hp_percent!==0)))
    throw new TypeError("Mirage enemy carry contradicts current state");
  let lastEnd:MirageRun["lastEnd"];
  if(Object.hasOwn(root,"lastEnd")){if(base.state===0)throw new TypeError("Completed Mirage run cannot retain a pending End receipt");lastEnd=normalizeEnd(root.lastEnd,cache,entries);}
  if(base.state===2&&!lastEnd)throw new TypeError("Reward-ready Mirage stair requires a bound winning End receipt");
  return {policy,cache,claimed,...(lastEnd?{lastEnd}:{}),...(abandoned?{abandoned:true as const}:{}),...(revive_ids?{revive_ids}:{})};
}
/** Explicit LOCAL interpretation of an existing native reset request: abandon
 * the captured run without replay, re-entry, healing or reward production.
 * The state owner releases its represented owned carry separately/atomically.
 * Original reset, pricing and floor-assignment laws remain unrecovered. */
export function abandonMirageRun(raw:MirageRun):MirageRun {
  const run=normalizeMirageRun(raw);
  if(run.cache.inst_base.state===0)return run;
  run.cache.entry=[];run.cache.inst_base.deck=[];run.cache.inst_base.state=0;run.cache.inst_base.highest=0;
  run.abandoned=true;delete run.lastEnd;
  return normalizeMirageRun(run);
}
/** LOCAL one-floor gold-only reward progression. Exactly one pending cleared
 * stair is claimed; no new floor, reset, revival, enrollment or item producer. */
export function advanceMirageReward(raw:MirageRun) {
  const run=normalizeMirageRun(raw),base=run.cache.inst_base;
  if(base.state!==2)throw new TypeError("Mirage reward requires an unclaimed winning stair");
  const gold=run.policy.stairs[base.stair-1].gold;run.claimed.push(base.stair);delete run.lastEnd;
  if(run.claimed.length===run.policy.stairs.length){
    base.state=0;base.highest=run.policy.floor;run.cache.entry=[];base.deck=[];
  }
  else {base.stair++;base.state=1;run.cache.inst_enemy=structuredClone([...run.policy.stairs[base.stair-1].enemies]);}
  const valid=normalizeMirageRun(run);
  return {run:valid,gold,receipt:{cur_stair:valid.cache.inst_base.stair,state:valid.cache.inst_base.state,inst_enemy:structuredClone(valid.cache.inst_enemy)}};
}
