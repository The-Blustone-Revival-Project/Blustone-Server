/** Complete source-shaped Mirage caches. Strict plain data, bounded arrays
 * and readiness admission are LOCAL validation, not recovered floor policy.
 * This module never creates an owned card, floor, enemy, resource or reward. */
export interface MirageEntry {id:number;mirage_remain_hp:number}
export interface MirageBase {bg_res:string;dlg_begin:string;dlg_end:string;new_record:number;floor:number;stair:number;state:number;
  deck:string[];tier_percent:number;highest:number;revive_price:number;begin_ltime:number}
export interface MirageEnemy {ref_id:string;hp_percent:number;rank:number;rank_up_cnt:number;overcome_cnt:number;exp:number;
  skill_1_level:number;skill_2_level:number;skill_3_level:number;skill_4_level:number;skill_5_level:number}
export interface MirageCache {entry:MirageEntry[];inst_base:MirageBase;inst_enemy:MirageEnemy[];
  ref_stair:{res_prefix:string;res_postfix_list:string[];list:{grade:number;balance:number}[]};
  ref_hero:{bonus:number;end_ltime:number;cur:string[];next:string[]}}
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||keys.some(key=>!Object.hasOwn(raw,key))||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)||!Object.getOwnPropertyDescriptor(raw,key)?.enumerable||
      !Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))throw new TypeError("Mirage cache requires complete plain data fields");return raw as Record<string,unknown>;
}
function array(raw:unknown,max:number):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>Object.getOwnPropertyDescriptor(raw,String(i))).some(d=>!d?.enumerable||!Object.hasOwn(d,"value")))throw new TypeError("Mirage cache requires dense bounded arrays");return raw;
}
function text(raw:unknown):string {if(typeof raw!=="string"||Buffer.from(raw,"utf8").toString("utf8")!==raw)throw new TypeError("Mirage cache requires lossless strings");return raw;}
function integer(raw:unknown,signed=true):number {if(typeof raw!=="number"||!Number.isInteger(raw)||raw<(signed?-0x8000_0000:0)||raw>(signed?0x7fff_ffff:0xffff_ffff))throw new TypeError("Unsupported Mirage integer width");return raw;}
function identity(raw:unknown):string {
  const id=typeof raw==="string"?raw:typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):"";
  if(!/^(?:0|[1-9]\d*)$/.test(id)||BigInt(id)>0xffff_ffff_ffff_ffffn)throw new TypeError("Mirage deck requires exact uint64 IDs");return id;
}
const baseInts=["floor","stair","state","tier_percent","highest","revive_price","begin_ltime"] as const;
const enemyInts=["rank","rank_up_cnt","overcome_cnt","exp","skill_1_level","skill_2_level","skill_3_level","skill_4_level","skill_5_level"] as const;
export function parseMirageCache(raw:unknown):MirageCache {
  const root=object(raw,["entry","inst_base","inst_enemy","ref_stair","ref_hero"]);
  const entry=array(root.entry,100).map(value=>{const row=object(value,["id","mirage_remain_hp"]);return {id:integer(row.id,false),mirage_remain_hp:integer(row.mirage_remain_hp)};});
  const base=object(root.inst_base,["bg_res","dlg_begin","dlg_end","new_record","deck",...baseInts]);
  const new_record=integer(base.new_record,false);if(new_record>255)throw new TypeError("Mirage new_record must preserve native byte");
  const inst_base={bg_res:text(base.bg_res),dlg_begin:text(base.dlg_begin),dlg_end:text(base.dlg_end),new_record,
    deck:array(base.deck,5).map(identity),...Object.fromEntries(baseInts.map(key=>[key,integer(base[key])]))} as MirageBase;
  const inst_enemy=array(root.inst_enemy,5).map(value=>{
    const row=object(value,["ref_id","hp_percent",...enemyInts]);return {ref_id:text(row.ref_id),hp_percent:integer(row.hp_percent),
      ...Object.fromEntries(enemyInts.map(key=>[key,integer(row[key],false)]))} as MirageEnemy;
  });
  const stairs=object(root.ref_stair,["res_prefix","res_postfix_list","list"]),hero=object(root.ref_hero,["bonus","end_ltime","cur","next"]);
  return {entry,inst_base,inst_enemy,ref_stair:{res_prefix:text(stairs.res_prefix),res_postfix_list:array(stairs.res_postfix_list,100).map(text),
    list:array(stairs.list,100).map(value=>{const row=object(value,["grade","balance"]);return {grade:integer(row.grade),balance:integer(row.balance)};})},
    ref_hero:{bonus:integer(hero.bonus),end_ltime:integer(hero.end_ltime),cur:array(hero.cur,100).map(text),next:array(hero.next,100).map(text)}};
}
/** Exact JSON numeric tokens are preserved before ordinary Number rounding.
 * JSON.rawJSON is also required when emitting an unsafe uint64 deck token. */
export function parseMirageCacheJson(source:string):MirageCache {
  const raw=JSON.parse(source,(_key,value,context?:{source:string})=>{
    if(typeof value==="number"&&Number.isInteger(value)&&!Number.isSafeInteger(value)) {
      if(!context?.source||!/^\d+$/.test(context.source))throw new TypeError("Exact Mirage uint64 JSON parsing unavailable");return context.source;
    }
    return value;
  });return parseMirageCache(raw);
}
export function mirageCacheWire(cache:MirageCache) {
  const valid=parseMirageCache(cache),json=JSON as typeof JSON&{rawJSON?:(value:string)=>unknown};
  return {...valid,inst_base:{...valid.inst_base,deck:valid.inst_base.deck.map(id=>{
    if(BigInt(id)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(id);if(!json.rawJSON)throw new TypeError("Exact Mirage uint64 emission unavailable");return json.rawJSON(id);
  })}};
}
/** Native MakeStageInst VCVT.F32.S32 then VDIV by literal10000. Source unit;
 * no automatic migration/heal of the existing LOCAL1000 placeholder. */
export function mirageHpRatio(raw:number):number {return Math.fround(Math.fround(integer(raw))/Math.fround(10000));}
/** Native stair balance uses signed float32 multiply by word0x38d1b717. */
export function mirageBalanceScale(raw:number):number {return Math.fround(Math.fround(integer(raw))*Math.fround(0.00009999999747378752));}
export interface MirageReadiness {
  owned:ReadonlyMap<number,{ref_id:string;name:string}>;
  // COMPLETE independently established membership/HP snapshot, never inferred
  // from ordinary deck or from1000 defaults. Schema checking is not provenance.
  commitments:ReadonlyMap<number,number>;
  heroIds:ReadonlySet<string>;resources:ReadonlySet<string>;dialogueIds:ReadonlySet<string>;
  enemySupported:(enemy:Readonly<MirageEnemy>)=>boolean;now:number;
}
export function requireMirageCombatCache(raw:unknown,context:MirageReadiness):MirageCache {
  const cache=parseMirageCache(raw),base=cache.inst_base,entries=new Map(cache.entry.map(row=>[row.id,row]));
  if(entries.size!==cache.entry.length||entries.size!==context.commitments.size||cache.entry.some(row=>!row.id||!context.owned.has(row.id)||
    !context.commitments.has(row.id)||context.commitments.get(row.id)!==row.mirage_remain_hp||row.mirage_remain_hp<0||row.mirage_remain_hp>10000))throw new TypeError("Mirage entry must exactly represent established owned commitments");
  const deck=base.deck.filter(id=>id!=="0");
  if(!deck.length||new Set(deck).size!==deck.length||deck.some(id=>BigInt(id)>0xffff_ffffn||!entries.has(Number(id))||entries.get(Number(id))!.mirage_remain_hp<=0)||
    new Set(deck.map(id=>context.owned.get(Number(id))!.ref_id)).size!==deck.length)throw new TypeError("Mirage sortie requires distinct living entered Hunters");
  const names=deck.map(id=>text(context.owned.get(Number(id))!.name));
  if(names.some(name=>!name)||new Set(names).size!==names.length)throw new TypeError("Mirage sortie requires distinct explicit native Hunter names");
  if(base.floor<1||base.stair<1||base.stair>cache.ref_stair.list.length||base.state!==1||base.revive_price<0||base.begin_ltime<0||base.highest<0||
    !Number.isInteger(context.now)||context.now<0||context.now>0x7fff_ffff||cache.ref_hero.end_ltime<context.now)throw new TypeError("Mirage combat floor/state/clock is unavailable");
  if(!cache.inst_enemy.length||cache.inst_enemy.some(enemy=>enemy.hp_percent<0||enemy.hp_percent>10000||!context.enemySupported(Object.freeze({...enemy})))||
    !cache.inst_enemy.some(enemy=>enemy.hp_percent>0))throw new TypeError("Mirage enemy references/projection or living camp is unavailable");
  if(cache.ref_stair.list.some(row=>row.grade<0||row.grade>3)||cache.ref_stair.list[base.stair-1].balance<=0||
    !cache.ref_stair.res_postfix_list.length||!context.resources.has(base.bg_res)||cache.ref_stair.res_postfix_list.some(postfix=>
      !postfix||!context.resources.has(cache.ref_stair.res_prefix+postfix)||!context.resources.has(postfix))||
    [base.dlg_begin,base.dlg_end].some(id=>id&&!context.dialogueIds.has(id)))throw new TypeError("Mirage selected stair/resource bindings are unavailable");
  if([...cache.ref_hero.cur,...cache.ref_hero.next].some(id=>!context.heroIds.has(id)))throw new TypeError("Mirage rotating Hunter reference unavailable");
  return cache;
}
