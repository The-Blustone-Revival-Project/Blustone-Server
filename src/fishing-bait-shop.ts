import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import type {LocalGameState} from "./game.js";
import {repositoryPath} from "./paths.js";

export interface BaitShopCounter {day:number;buy_cnt:number}
export interface BaitShopPolicy {readonly dailyLimit:number}
const U32=0xffff_ffff, DAY=86_400_000;
const sourceBytes=readFileSync(repositoryPath("resources/reference/fishing-bait-offer-2018.json"));
const sha=(bytes:Buffer|string)=>createHash("sha256").update(bytes).digest("hex");
if(sha(sourceBytes)!=="73e5c4a9b03d93edafbd8eb2e5fa794f042a4aef25508f50d8eef705f8a81682")
  throw new TypeError("Historical bait offer source pin mismatch");
const source=JSON.parse(sourceBytes.toString("utf8"));
if(sha(source.source.raw)!==source.source.raw_sha256)throw new TypeError("Historical bait row pin mismatch");
Object.freeze(source.source);Object.freeze(source.offer);
export const FISHING_BAIT_OFFER_SOURCE=Object.freeze(source);
const integer=(value:unknown)=>typeof value==="number"?value:
  typeof value==="string"&&/^(0|[1-9]\d*)$/.test(value)?Number(value):NaN;
const u32=(value:unknown)=>typeof value==="number"&&Number.isInteger(value)&&value>=0&&value<=U32;
function policyValid(policy:BaitShopPolicy) {
  if(!policy||!Number.isInteger(policy.dailyLimit)||policy.dailyLimit<1||policy.dailyLimit>1000)
    throw new TypeError("Explicit LOCAL bait daily limit1..1000 required");
}
export function configuredBaitShop(mode:unknown,limit:unknown):BaitShopPolicy|undefined {
  if(mode===undefined||mode==="disabled")return undefined;
  if(mode!=="archive-2018-projection")throw new TypeError("Unknown fishing bait shop profile");
  const policy={dailyLimit:integer(limit)};policyValid(policy);return Object.freeze(policy);
}
export function normalizeBaitShopCounter(raw:unknown):BaitShopCounter {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).sort().join(",")!=="buy_cnt,day")
    throw new TypeError("Malformed bait purchase counter");
  const row=raw as BaitShopCounter;
  if(!Number.isSafeInteger(row.day)||row.day<0||!u32(row.buy_cnt)||row.buy_cnt<1)
    throw new TypeError("Malformed bait purchase counter");
  return {day:row.day,buy_cnt:row.buy_cnt};
}
function effective(counter:BaitShopCounter|undefined,now:number) {
  if(!Number.isSafeInteger(now)||now<0)throw new TypeError("Invalid bait purchase clock");
  const day=Math.floor(now/DAY),prior=counter===undefined?undefined:normalizeBaitShopCounter(counter);
  return {day:Math.max(day,prior?.day??day),buy_cnt:prior&&day<=prior.day?prior.buy_cnt:0};
}
/** Neutral item metadata and UTC/cap/spending behavior are LOCAL; only the
 * named historical10-for6 offer and independent native LU003 identity are joined. */
export function baitShopReferences(policy:BaitShopPolicy) {
  policyValid(policy);
  return {item:[{id:"LU003",name:"High-quality Bait",desc:"Historical2018 bait offer; neutral local item metadata.",
    thumbnail_id:"",rank:1,use_type:0,effect:"",sell_price:0,collect_qty:0}],
    global_item:[{item_id:"LU003",buy_limit:policy.dailyLimit,provide_qty:10,type:1,ticket_ref_id:"",ticket_qty:0,
      price_list:Array.from({length:policy.dailyLimit},(_,i)=>({price_type:1,buy_cnt:i+1,price:6}))}]};
}
export function baitPurchaseInventory(counter:BaitShopCounter|undefined,now:number) {
  return [{item_id:"LU003",price_type:1,buy_cnt:effective(counter,now).buy_cnt}];
}
/** Pure transaction plan. Caller authenticates, commits these fields together,
 * and rolls them back on failure. No catch, bait use, odds or fish grant. */
export function planBaitPurchase(payload:Record<string,unknown>,game:Pick<LocalGameState,
  "items"|"next_item_inst_id"|"gacha_free_qty"|"gacha_iap_qty">,
  counter:BaitShopCounter|undefined,policy:BaitShopPolicy,now:number) {
  policyValid(policy);
  if(payload.target_ref_id!=="LU003"||integer(payload.price_type)!==1||integer(payload.item_inst_id)!==0||integer(payload.qty)!==1||
    ["price","provide_qty","added","buy_cnt","gold","iap_qty","free_iap_qty"].some(key=>Object.hasOwn(payload,key)))
    throw new TypeError("Unsupported bait purchase packet");
  const prior=effective(counter,now);
  if(prior.buy_cnt>=policy.dailyLimit)throw new TypeError("LOCAL bait daily limit reached");
  if(!u32(game.gacha_free_qty)||!u32(game.gacha_iap_qty))throw new TypeError("Invalid bait purchase wallet");
  if(game.gacha_free_qty+game.gacha_iap_qty<6)throw new TypeError("Insufficient Manda");
  if(!Array.isArray(game.items))throw new TypeError("Invalid owned item inventory");
  const ids=new Set<number>();
  for(const row of game.items) {
    if(!row||!Number.isSafeInteger(row.inst_id)||row.inst_id<1||ids.has(row.inst_id))throw new TypeError("Invalid owned item identity");
    ids.add(row.inst_id);
  }
  const matches=game.items.filter(row=>row.ref_id==="LU003");
  if(matches.length>1)throw new TypeError("Ambiguous bait stacks");
  const existing=matches[0];
  if(existing&&(existing.lock!==0||!u32(existing.qty)||existing.qty>U32-10))throw new TypeError("Invalid unlocked bait stock");
  let next=game.next_item_inst_id;
  if(!Number.isSafeInteger(next)||next<1)throw new TypeError("Invalid item allocator");
  let id=existing?.inst_id;
  if(id===undefined) {
    for(const value of ids)next=Math.max(next,value+1);
    if(!Number.isSafeInteger(next)||next>=Number.MAX_SAFE_INTEGER)throw new TypeError("Item instance capacity reached");
    id=next++;
  }
  const items=structuredClone(game.items),qty=(existing?.qty??0)+10;
  if(existing)items.find(row=>row.inst_id===id)!.qty=qty;
  else items.push({inst_id:id,ref_id:"LU003",qty,lock:0});
  const free=Math.min(game.gacha_free_qty,6),gacha_free_qty=game.gacha_free_qty-free,
    gacha_iap_qty=game.gacha_iap_qty-(6-free),updated={day:prior.day,buy_cnt:prior.buy_cnt+1};
  return {items,next_item_inst_id:next,gacha_free_qty,gacha_iap_qty,counter:updated,
    receipt:{jackpot_level:1,jackpot_multiply:1,user:{iap:{iap_qty:gacha_iap_qty,free_iap_qty:gacha_free_qty}},
      // qty10 is LOCAL nominal goods quantity; native uses added for stock.
      // Original backend qty semantics are unproved. items above hold poststock.
      item:[{ref_id:"LU003",inst_id:id,qty:10,added:10}],
      target_inst:{item_id:"LU003",price_type:1,buy_cnt:{prev:prior.buy_cnt,cur:updated.buy_cnt}},consumed_inst_list:[]}};
}
