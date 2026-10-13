import type {LocalGameState} from "./game.js";
import {resourceChargeTime} from "./game.js";
import {trainingCurve} from "./training.js";
import {parseExpeditionEntrustRequest,expeditionEntrustQuote} from "./expedition-entrust.js";
import {parseEntrustStart,type EntrustStart} from "./expedition-entrust-snapshot.js";
import {parseEntrustEndResult,type EntrustEndResult} from "./expedition-entrust-end.js";

export interface DispatchPass {end_datetime:string;end_datetime_utc:number}
export interface DispatchPolicy {max_runs:number;gold_per_run:number;user_exp_per_run:number;card_exp_per_run:number;
  skip_price:number;entrust_second_per_cost:number;passes:Record<string,DispatchPass>}
export interface DispatchJob {snapshot:EntrustStart;deck:number[];pass:DispatchPass;gold:number;user_exp:number;card_exp:number}
export interface DispatchJournal {active:DispatchJob|null;last_id:string;last_deck:number[]}
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||
    keys.some(key=>!Object.hasOwn(raw,key))||Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))throw new TypeError("Incomplete local dispatch fields");
  return raw as Record<string,unknown>;
}
function uint(raw:unknown):number {if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)throw new TypeError("Local dispatch requires uint32");return raw;}
export function dispatchId(raw:unknown):string {
  const value=typeof raw==="string"?raw:typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):"";
  if(!/^(?:0|[1-9]\d*)$/.test(value)||BigInt(value)>0xffff_ffff_ffff_ffffn)throw new TypeError("Local dispatch requires exact64 ID");return value;
}
function total(value:number,count:number):number {const result=value*count;return uint(result);}
export function dispatchPass(raw:unknown):DispatchPass {
  const row=object(raw,["end_datetime","end_datetime_utc"]),date=row.end_datetime,utc=row.end_datetime_utc;
  if(typeof date!=="string"||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)||
    typeof utc!=="number"||!Number.isInteger(utc)||utc< -0x8000_0000||utc>0x7fff_ffff)throw new TypeError("Dispatch pass requires supplied date and signed UTC override");
  const [y,m,d,h,min,s]=date.match(/\d+/g)!.map(Number),calendar=new Date(Date.UTC(y,m-1,d));
  if(y<1000||calendar.getUTCFullYear()!==y||calendar.getUTCMonth()!==m-1||calendar.getUTCDate()!==d||h>23||min>59||s>59)
    throw new TypeError("Dispatch pass date is invalid");
  return {end_datetime:date,end_datetime_utc:utc};
}
export function dispatchPolicy(raw:unknown):DispatchPolicy {
  const row=object(raw,["max_runs","gold_per_run","user_exp_per_run","card_exp_per_run","skip_price","entrust_second_per_cost","passes"]);
  const max_runs=uint(row.max_runs);if(max_runs<1||max_runs>100)throw new TypeError("Local dispatch supports supplied run limit1..100");
  const values=Object.fromEntries(["gold_per_run","user_exp_per_run","card_exp_per_run","skip_price","entrust_second_per_cost"].map(key=>[key,uint(row[key])])) as Omit<DispatchPolicy,"max_runs"|"passes">;
  if(!values.entrust_second_per_cost)throw new TypeError("Dispatch quote denominator must be positive");
  const rawPasses=row.passes;if(!rawPasses||typeof rawPasses!=="object"||Array.isArray(rawPasses)||Object.getPrototypeOf(rawPasses)!==Object.prototype)throw new TypeError("Dispatch passes require explicit owner map");
  if(Reflect.ownKeys(rawPasses).some(key=>typeof key!=="string"||!Object.getOwnPropertyDescriptor(rawPasses,key)?.enumerable||
    !Object.hasOwn(Object.getOwnPropertyDescriptor(rawPasses,key)!,"value")))throw new TypeError("Dispatch pass map requires JSON data fields");
  const passes=Object.fromEntries(Object.entries(rawPasses).map(([id,value])=>{
    if(dispatchId(id)==="0"||BigInt(id)>BigInt(Number.MAX_SAFE_INTEGER))throw new TypeError("Dispatch pass owner unavailable");return [id,dispatchPass(value)];
  }));
  for(const value of [values.gold_per_run,values.user_exp_per_run,values.card_exp_per_run])total(value,max_runs);
  return {max_runs,...values,passes};
}
export function normalizeDispatch(raw:unknown):DispatchJournal {
  const row=object(raw,["active","last_id","last_deck"]),last_id=dispatchId(row.last_id),last_deck=row.last_deck;
  if(!Array.isArray(last_deck)||last_deck.length>5||Array.from(last_deck).some(id=>!Number.isSafeInteger(id)||id<1)||
    new Set(last_deck).size!==last_deck.length||(last_id==="0")!==(last_deck.length===0))throw new TypeError("Malformed collected dispatch participants");
  if(row.active===null)return {active:null,last_id,last_deck:[...last_deck]};
  const active=object(row.active,["snapshot","deck","pass","gold","user_exp","card_exp"]),snapshot=parseEntrustStart(active.snapshot);
  if(snapshot.entrust_id==="0"||snapshot.entrust_id===last_id||snapshot.cnt<1||snapshot.cnt>100||snapshot.list.length!==snapshot.cnt||
    !Array.isArray(active.deck)||!active.deck.length||active.deck.length>5||Array.from(active.deck).some(id=>!Number.isSafeInteger(id)||id<1)||new Set(active.deck).size!==active.deck.length)
    throw new TypeError("Malformed persisted dispatch job");
  const gold=uint(active.gold),user_exp=uint(active.user_exp),card_exp=uint(active.card_exp);
  for(const [index,item] of snapshot.list.entries())if(item.serial!==index||item.gold!==gold||item.user_exp!==user_exp||item.card_exp!==card_exp||item.item!=="[]"||
    BigInt(item.end_utc)>0x7fff_ffffn||BigInt(item.end_utc)<BigInt(item.begin_utc)||
    BigInt(item.end_utc)-BigInt(item.begin_utc)!==BigInt(snapshot.complete_second)||
    index>0&&item.begin_utc!==snapshot.list[index-1].end_utc)throw new TypeError("Incoherent dispatch row schedule/reward");
  if(snapshot.complete_second<0||!snapshot.entrust_second_per_cost)throw new TypeError("Invalid dispatch duration/quote");
  return {last_id,last_deck:[...last_deck],active:{snapshot,deck:[...active.deck],pass:dispatchPass(active.pass),gold,user_exp,card_exp}};
}
/** Explicit LOCAL one-job timed policy. Original admission stars/deck2 and
 * preview arithmetic are source-backed; supplied awards, timing equality,
 * run cap, no items and commitment/replay rules are local choices. */
export function planDispatchStart(game:LocalGameState,pvid:number,policy:DispatchPolicy,raw:unknown,id:string,now:number,
  stage:{id:string;ap_cost:number},benefit:{mode:number;value:number}|null):DispatchJob {
  const request=parseExpeditionEntrustRequest(raw);
  if(request.deck_type!==2||request.is_tuto!==0||request.stage_id!==stage.id||request.cnt<1||request.cnt>policy.max_runs||
    game.active_battle?.state==="active"||game.arena.active||game.search.active)throw new TypeError("Local dispatch requires idle normal deck2 request");
  const stars=(id:string)=>(game.stage_achievements[id]?.length??game.stage_stars[id]??0);
  if(!stars("n_01_05")||!stars(stage.id))throw new TypeError("Dispatch requires earned unlock and selected-stage stars");
  const pass=policy.passes[String(pvid)];if(!pass)throw new TypeError("Existing explicit owner pass snapshot required");
  const deck=game.decks.find(row=>row.type===2)?.list.filter(id=>id!==0)??[],cards=[...game.starter_cards,...game.recruited_cards];
  if(!deck.length||deck.length>5||new Set(deck).size!==deck.length||deck.some(id=>!cards.some(card=>card.inst_id===id&&trainingCurve(card)&&Number(card.exp)<=0x7fff_ffff)))throw new TypeError("Dispatch deck requires established supported owned Hunters");
  const quote=expeditionEntrustQuote(request.cnt,stage.ap_cost,benefit);uint(game.ap);if(game.ap<quote.fuel||!Number.isInteger(now)||now<1||now+quote.durationSeconds>0x7fff_ffff)
    throw new TypeError("Dispatch fuel/clock unavailable");
  const gold=policy.gold_per_run,user_exp=policy.user_exp_per_run,card_exp=policy.card_exp_per_run;
  if([gold,user_exp,card_exp].some(value=>value>0x7fff_ffff))throw new TypeError("Dispatch Start preview exceeds signed domain");
  const snapshot=parseEntrustStart({entrust_id:id,stage_id:stage.id,cnt:request.cnt,complete_second:quote.secondsPerRun,skip_price:policy.skip_price,
    entrust_second_per_cost:policy.entrust_second_per_cost,list:Array.from({length:request.cnt},(_,serial)=>({serial,gold,user_exp,card_exp,
      begin_utc:String(now+serial*quote.secondsPerRun),end_utc:String(now+(serial+1)*quote.secondsPerRun),item:"[]"}))});
  return {snapshot,deck,pass:{...pass},gold,user_exp,card_exp};
}
export function dispatchEndResult(game:LocalGameState,cards:{inst_id:string;prev:number;cur:number}[]=[],gold=game.gold,exp=game.exp):EntrustEndResult {
  return parseEntrustEndResult({gold:{prev:game.gold,cur:gold},user_exp:{prev:game.exp,cur:exp,max_ap:{prev:game.max_ap,cur:game.max_ap},
    ap:{cur:game.ap,ap_charge_time:resourceChargeTime(game,"ap")}},card_exp:cards,item:[]});
}
const codec=JSON as typeof JSON&{rawJSON?:(source:string)=>unknown};
function wireId(value:string):unknown {if(BigInt(value)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(value);if(!codec.rawJSON)throw new TypeError("Dispatch exact64 serialization unavailable");return codec.rawJSON(value);}
export function dispatchStartWire(snapshot:EntrustStart) {return {...snapshot,entrust_id:wireId(snapshot.entrust_id),list:snapshot.list.map(row=>({...row,begin_utc:wireId(row.begin_utc),end_utc:wireId(row.end_utc)}))};}
export function dispatchEndWire(result:EntrustEndResult) {return {...result,card_exp:result.card_exp.map(row=>({...row,inst_id:wireId(row.inst_id)})),item:result.item.map(row=>({...row,inst_id:wireId(row.inst_id)}))};}
