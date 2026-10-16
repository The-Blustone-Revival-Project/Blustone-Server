import {requireMirageCombatCache,type MirageReadiness} from "./mirage-cache.js";
import {mirageRegisterDeckWire} from "./mirage-register.js";

export interface MirageEndReport {floor:number;stair:number;deck:{id:string;hp:number}[];enemy:number[]}
const exact=Symbol("exact numeric uint64");
function collection(raw:unknown):unknown[] {
  if(typeof raw!=="string")throw new TypeError("Mirage End HP collections must be JSON strings");
  const parsed=JSON.parse(raw,(_key,value,context?:{source:string})=>{
    if(typeof value!=="number")return value;
    if(!context?.source||!/^\d+$/.test(context.source))throw new TypeError("Mirage End requires unsigned integer tokens");
    return Number.isSafeInteger(value)?value:{[exact]:context.source};
  });
  if(!Array.isArray(parsed)||parsed.length>5)throw new TypeError("Mirage End supports at most five actors per camp");
  return parsed;
}
function hp(raw:unknown):number {
  // Native wire is uint32; normal carried health0..10000 is LOCAL admission.
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>10000)throw new TypeError("Unsupported Mirage End normal-health value");return raw;
}
function coordinate(raw:unknown):number {
  const text=typeof raw==="number"&&Number.isInteger(raw)?String(raw):raw;
  if(typeof text!=="string"||!/^[1-9]\d*$/.test(text)||text.length>10||Number(text)>0x7fff_ffff)
    throw new TypeError("Mirage End requires a positive signed32 floor/stair");return Number(text);
}
export function parseMirageEnd(payload:Record<string,unknown>):MirageEndReport {
  if(["clear","win","state","reward","run_id","next_floor","next_stair"].some(key=>Object.hasOwn(payload,key)))
    throw new TypeError("Unsupported Mirage End outcome/producer fields");
  const seen=new Set<string>(),deck=collection(payload.remain_deck_hp).map(raw=>{
    if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).length!==2||!Object.hasOwn(raw,"inst_id")||!Object.hasOwn(raw,"hp_percent"))
      throw new TypeError("Mirage End requires exact inst_id/hp_percent rows");
    const row=raw as Record<string,unknown>,value=row.inst_id;
    const id=typeof value==="number"&&Number.isSafeInteger(value)&&value>0?String(value):
      value&&typeof value==="object"&&Object.hasOwn(value,exact)?(value as Record<symbol,string>)[exact]:"";
    if(!/^[1-9]\d*$/.test(id)||id.length>20||BigInt(id)>0xffff_ffff_ffff_ffffn||seen.has(id))throw new TypeError("Exact unique numeric uint64 Mirage actor required");
    seen.add(id);return {id,hp:hp(row.hp_percent)};
  });
  return {floor:coordinate(payload.floor),stair:coordinate(payload.stair),deck,enemy:collection(payload.remain_enemy_hp).map(hp)};
}
/** Pure normal-health settlement against an independently admitted complete
 * active run. No runtime route, enrollment, saved journal or rewards implied.
 * LOCAL outcome admission requires exactly one camp with surviving HP; native
 * OnFinish forces the losing side to0, but all-zero ties are ambiguous. */
export function planMirageEnd(rawCache:unknown,payload:Record<string,unknown>,context:MirageReadiness) {
  const cache=requireMirageCombatCache(rawCache,context),report=parseMirageEnd(payload),base=cache.inst_base;
  const selected=base.deck.filter(id=>id!=="0"),byId=new Map(report.deck.map(row=>[row.id,row.hp]));
  if(report.floor!==base.floor||report.stair!==base.stair||report.deck.length!==selected.length||selected.some(id=>!byId.has(id))||report.enemy.length!==cache.inst_enemy.length)
    throw new TypeError("Mirage End must bind the current floor/stair and exact selected camps");
  const playersAlive=report.deck.some(row=>row.hp>0),enemiesAlive=report.enemy.some(value=>value>0);
  if(playersAlive===enemiesAlive)throw new TypeError("Ambiguous or nonterminal Mirage End camps");
  const won=playersAlive,state=won?2:1;
  cache.entry=cache.entry.map(row=>byId.has(String(row.id))?{...row,mirage_remain_hp:byId.get(String(row.id))!}:row);
  cache.inst_enemy=cache.inst_enemy.map((row,index)=>({...row,hp_percent:report.enemy[index]}));
  cache.inst_base.state=state;
  const deck=selected.map(id=>({id,hp:byId.get(id)!})),wireIds=mirageRegisterDeckWire(selected);
  return {cache,won,report:{...report,deck},fingerprint:JSON.stringify({...report,deck}),
    receipt:{state,deck:deck.map((row,index)=>({inst_id:wireIds[index],remain_hp_percent:row.hp})),
      dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[]}};
}
