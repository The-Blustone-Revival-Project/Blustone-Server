import {createHash} from "node:crypto";
import type {LocalGameState} from "./game.js";
import type {FishingItemReference} from "./fishing-item-references.js";
import type {FishingCatalogue} from "./fishing-catalogue.js";
import {ownedFishingInventory} from "./fishing-inventory.js";
import {planFishingSale} from "./fishing-sale.js";

const I32=0x7fff_ffff,U32=0xffff_ffff;
export interface FishingTutorialPolicy {
  origin:"local-authored";stock:"new-stack-per-catch";bait_debit:"none-local";on_win:"sell";
  outcome:{fish_id:string;grade:number;length:number};
}
export interface FishingTutorialJournal {
  policy:FishingTutorialPolicy;reference_hash:string;item_inst_id:number;settled_ltime:number;
}
function object(raw:unknown,keys:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Object.getPrototypeOf(raw)!==Object.prototype||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!keys.includes(key)&&!optional.includes(key)||
      !Object.getOwnPropertyDescriptor(raw,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value"))||
    keys.some(key=>!Object.hasOwn(raw,key)))throw new TypeError("Fishing tutorial requires exact plain JSON fields");
  return raw as Record<string,unknown>;
}
function array(raw:unknown):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>10000||
    Reflect.ownKeys(raw).length!==raw.length+1||Array.from({length:raw.length},(_,i)=>{
      const d=Object.getOwnPropertyDescriptor(raw,String(i));return !d?.enumerable||!Object.hasOwn(d,"value");
    }).some(Boolean))throw new TypeError("Fishing tutorial requires dense bounded JSON arrays");return raw;
}
function uint(raw:unknown,min=0,max=U32):number {
  if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<min||raw>max)throw new TypeError("Fishing tutorial integer is outside its supported width");return raw;
}
function text(raw:unknown,empty=false):string {
  if(typeof raw!=="string"||!empty&&!raw||Buffer.from(raw,"utf8").toString("utf8")!==raw)throw new TypeError("Fishing tutorial requires lossless string data");return raw;
}
function policyShape(raw:unknown):FishingTutorialPolicy {
  const row=object(raw,["origin","stock","bait_debit","on_win","outcome"]);
  if(row.origin!=="local-authored"||row.stock!=="new-stack-per-catch"||row.bait_debit!=="none-local"||row.on_win!=="sell")
    throw new TypeError("Fishing tutorial requires explicit local settlement laws");
  const o=object(row.outcome,["fish_id","grade","length"]);
  return {origin:"local-authored",stock:"new-stack-per-catch",bait_debit:"none-local",on_win:"sell",
    outcome:{fish_id:text(o.fish_id),grade:uint(o.grade,1,3),length:uint(o.length,1,I32)}};
}
function priceRow(policy:FishingTutorialPolicy,catalogue:FishingCatalogue|undefined) {
  if(!catalogue)throw new TypeError("Fishing tutorial requires supplied prices");
  const source=object(catalogue,["pools","prices"]);array(source.pools);
  const matches=array(source.prices).map(raw=>object(raw,["fish_id","b_price","s_price","g_price"]))
    .filter(row=>row.fish_id===policy.outcome.fish_id);
  if(matches.length!==1)throw new TypeError("Fishing tutorial requires one complete fish price row");
  const row=matches[0];return {fish_id:text(row.fish_id),b_price:uint(row.b_price),s_price:uint(row.s_price),g_price:uint(row.g_price)};
}
function references(policy:FishingTutorialPolicy,items:readonly Readonly<FishingItemReference>[],catalogue:FishingCatalogue|undefined) {
  const matches=array(items).map(raw=>object(raw,["id","name","desc","thumbnail_id","effect","rank","use_type","sell_price","collect_qty"]))
    .filter(row=>row.id===policy.outcome.fish_id);
  if(matches.length!==1)throw new TypeError("Fishing tutorial requires one supplied fish definition");
  const row=matches[0],item={id:text(row.id),name:text(row.name,true),desc:text(row.desc,true),thumbnail_id:text(row.thumbnail_id,true),
    effect:text(row.effect,true),rank:uint(row.rank),use_type:uint(row.use_type),sell_price:uint(row.sell_price),collect_qty:uint(row.collect_qty)};
  if(item.use_type!==17)throw new TypeError("Fishing tutorial requires native type17 fish metadata");
  return {item,price:priceRow(policy,catalogue)};
}
/** Explicit LOCAL outcome and sale laws. The native tutorial completion request
 * supplies neither fish identity nor an ordinary cast/bait debit. */
export function configuredFishingTutorial(raw:unknown,items:readonly Readonly<FishingItemReference>[],catalogue:FishingCatalogue|undefined):FishingTutorialPolicy {
  const policy=policyShape(raw);references(policy,items,catalogue);return policy;
}
export function fishingTutorialReferenceHash(policy:FishingTutorialPolicy,items:readonly Readonly<FishingItemReference>[],catalogue:FishingCatalogue|undefined):string {
  const canonical=policyShape(policy);
  return createHash("sha256").update(JSON.stringify({policy:canonical,...references(canonical,items,catalogue)})).digest("hex");
}
function journalShape(raw:unknown):FishingTutorialJournal {
  const row=object(raw,["policy","reference_hash","item_inst_id","settled_ltime"]),policy=policyShape(row.policy);
  if(typeof row.reference_hash!=="string"||!/^([0-9a-f]{64})$/.test(row.reference_hash))throw new TypeError("Fishing tutorial reference hash is malformed");
  return {policy,reference_hash:row.reference_hash,item_inst_id:uint(row.item_inst_id,1,Number.MAX_SAFE_INTEGER-1),settled_ltime:uint(row.settled_ltime,0,I32)};
}
export function normalizeFishingTutorial(raw:unknown,items:readonly Readonly<FishingItemReference>[],catalogue:FishingCatalogue|undefined):FishingTutorialJournal {
  const journal=journalShape(raw);
  if(journal.reference_hash!==fishingTutorialReferenceHash(journal.policy,items,catalogue))throw new TypeError("Captured tutorial fish definitions or prices changed");
  return journal;
}
/** Auth is admitted by the caller. No client-selected outcome, gold, gauge,
 * ordinary log or extra producer field participates in this one-time path. */
export function validateFishingTutorialEnd(raw:unknown):void {
  const row=object(raw,["log_id","is_win"],["app_code","app_ver","market","pvid","otp"]);
  if((row.log_id!==-1&&row.log_id!=="-1")||(row.is_win!==1&&row.is_win!=="1"))throw new TypeError("Fishing tutorial requires native winning sentinel -1");
  for(const key of ["app_code","app_ver","market","pvid","otp"])if(Object.hasOwn(row,key)&&typeof row[key]!=="string"&&typeof row[key]!=="number")
    throw new TypeError("Fishing tutorial auth fields require scalar form data");
}
function inventory(game:LocalGameState) {
  const ids=new Set<number>(),items=array(game.items).map(raw=>{
    const row=object(raw,["inst_id","ref_id","qty","lock"]),inst_id=uint(row.inst_id,1,Number.MAX_SAFE_INTEGER);
    if(ids.has(inst_id))throw new TypeError("Fishing tutorial inventory has duplicate identities");ids.add(inst_id);
    return {inst_id,ref_id:text(row.ref_id),qty:uint(row.qty),lock:uint(row.lock,0,1)};
  });
  const next=uint(game.next_item_inst_id,1,Number.MAX_SAFE_INTEGER);
  if(items.some(item=>item.inst_id>=next))throw new TypeError("Fishing tutorial allocator must exceed all owned item IDs");
  return {items,next};
}
export function validateFishingTutorialStock(game:LocalGameState,rawJournal:FishingTutorialJournal):void {
  const journal=journalShape(rawJournal),{items,next}=inventory(game),item=items.find(row=>row.inst_id===journal.item_inst_id);
  if(!item||item.ref_id!==journal.policy.outcome.fish_id||item.qty!==0||item.lock!==0||next<=journal.item_inst_id)
    throw new TypeError("Fishing tutorial sold stack is missing or changed");
  // Later ordinary catches may own positive quantities; only this sold stack is pinned.
}
export function planFishingTutorial(game:LocalGameState,pvid:number,rawPolicy:FishingTutorialPolicy,reference_hash:string,
  catalogue:FishingCatalogue,raw:unknown,now:number) {
  validateFishingTutorialEnd(raw);uint(pvid,1,Number.MAX_SAFE_INTEGER);uint(now,0,I32);
  const policy=policyShape(rawPolicy),price=priceRow(policy,catalogue);
  const journal=journalShape({policy,reference_hash,item_inst_id:game.next_item_inst_id,settled_ltime:now});
  const {items,next}=inventory(game);if(next>=Number.MAX_SAFE_INTEGER)throw new TypeError("Fishing tutorial item allocator exhausted");
  const gold=uint(game.gold),amount=price[policy.outcome.grade===1?"b_price":policy.outcome.grade===2?"s_price":"g_price"];
  if(amount>U32-gold)throw new TypeError("Fishing tutorial sale overflows gold");
  const rows=array(game.owned_fish??[]).map(row=>object(row,["fish_id","b_cnt","s_cnt","g_cnt"]));
  const owned=ownedFishingInventory(rows),fish_id=policy.outcome.fish_id;
  const fish=owned.find(row=>row.fish_id===fish_id)??{fish_id,b_cnt:0,s_cnt:0,g_cnt:0};
  if(!owned.includes(fish))owned.push(fish);
  const isolated={fish_id,b_cnt:0,s_cnt:0,g_cnt:0},key=policy.outcome.grade===1?"b_cnt":policy.outcome.grade===2?"s_cnt":"g_cnt";
  isolated[key]=1;
  // Delegate sale arithmetic/receipt to the existing planner, with exactly the
  // newly generated stack in its ownership domain. Never sell earlier stock.
  const sale=planFishingSale({...game,items:[{inst_id:next,ref_id:fish_id,qty:1,lock:0}],owned_fish:[isolated]},pvid,
    {[String(pvid)]:[{fish_id,grade:policy.outcome.grade,inst_id:next}]},catalogue,new Set([fish_id]),{fish_id,grade:policy.outcome.grade,qty:1});
  // Shared ParseEnd adds ret_data.item before optional ParseSell removes it.
  return {items:[...items,...sale.items],owned_fish:owned,gold:sale.gold,next_item_inst_id:next+1,journal,
    receipt:{...policy.outcome,item:[{inst_id:next,ref_id:fish_id,added:1}],consumed_inst_list:[],
      sell:{...sale.receipt,sell_result:{...fish}}}};
}
