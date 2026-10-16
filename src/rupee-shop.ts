import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {repositoryPath} from "./paths.js";

export const RUPEE_SHOP_ID="local_rupee_pack",RUPEE_COUPON_ID="local_rupee_coupon";
export const RUPEE_SHOP_EVIDENCE=Object.freeze({path:"resources/reference/rupee-shop-screen-quotes.json",sha256:"2b87d9a7576ff81d1b52bdbed7f6c2169c738c8180e61a88d1d46c29c3968bf5"});
export interface RupeeShopCounter {day:number;manda:number;coupon:number}
export interface RupeeShopPolicy {readonly mode:"archive-2017-base-only"|"archive-2021-base-only";readonly dailyLimit:number;readonly mandaPrice:10|5}
export interface RupeeShopOwned {inst_id:number|string;ref_id:string;qty:number;lock:number}
export interface RupeeShopGame {gold:number;gacha_free_qty:number;gacha_iap_qty:number;items:readonly RupeeShopOwned[]}
const U32=0xffff_ffff,U64=0xffff_ffff_ffff_ffffn,INT32=0x7fff_ffff,DAY=86_400_000;
const sha=(value:Buffer|string)=>createHash("sha256").update(value).digest("hex");
let evidenceVerified=false;
function verifyEvidence() {
  if(evidenceVerified)return;
  const bytes=readFileSync(repositoryPath(RUPEE_SHOP_EVIDENCE.path));
  if(sha(bytes)!==RUPEE_SHOP_EVIDENCE.sha256)throw new TypeError("Rupee shop image evidence pin changed");
  const source=JSON.parse(bytes.toString("utf8"));
  if(!Array.isArray(source.quotes)||source.quotes.some((row:any)=>typeof row.raw_tsv_row!=="string"||sha(row.raw_tsv_row)!==row.raw_row_sha256)||
    !source.quotes.some((row:any)=>row.filename_year===2017&&row.observation_kind==="base-price-10")||
    !source.quotes.some((row:any)=>row.filename_year===2021&&row.observation_kind==="base-price-5")||
    !source.quotes.some((row:any)=>row.observation_kind==="coupon-1"))throw new TypeError("Rupee shop historical quote anchors missing");
  evidenceVerified=true;
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>U32)throw new TypeError("Rupee shop requires uint32 quantities");return raw;
}
function integer(raw:unknown):number {return typeof raw==="number"?raw:typeof raw==="string"&&/^(0|[1-9]\d*)$/.test(raw)&&raw.length<=10?Number(raw):NaN;}
function identity(raw:unknown,zero=false):string {
  const id=typeof raw==="number"&&Number.isSafeInteger(raw)&&raw>=0?String(raw):typeof raw==="string"?raw:"";
  if(id.length>20||!(zero?/^(0|[1-9]\d*)$/:/^[1-9]\d*$/).test(id)||BigInt(id)>U64)throw new TypeError("Rupee coupon requires exact uint64 identity");return id;
}
function wireId(id:string):number|unknown {
  if(BigInt(id)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(id);
  const codec=JSON as typeof JSON&{rawJSON?:(text:string)=>unknown};
  if(!codec.rawJSON)throw new TypeError("Exact numeric coupon identity requires JSON.rawJSON");return codec.rawJSON(id);
}
function policyValid(policy:RupeeShopPolicy) {
  if(!policy||!Number.isInteger(policy.dailyLimit)||policy.dailyLimit<1||policy.dailyLimit>1000||
    !((policy.mode==="archive-2017-base-only"&&policy.mandaPrice===10)||(policy.mode==="archive-2021-base-only"&&policy.mandaPrice===5)))throw new TypeError("Explicit LOCAL shared Rupee cap and historical quote required");
  verifyEvidence();
}
export function configuredRupeeShop(mode:unknown,rawLimit:unknown):RupeeShopPolicy|undefined {
  if(mode===undefined||mode==="disabled")return undefined;
  if(mode!=="archive-2017-base-only"&&mode!=="archive-2021-base-only")throw new TypeError("Unknown Rupee shop mode");
  const policy:RupeeShopPolicy={mode,dailyLimit:integer(rawLimit),mandaPrice:mode==="archive-2017-base-only"?10:5};policyValid(policy);return Object.freeze(policy);
}
export function normalizeRupeeShopCounter(raw:unknown):RupeeShopCounter {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).sort().join(",")!=="coupon,day,manda")throw new TypeError("Malformed Rupee purchase counter");
  const row=raw as RupeeShopCounter;
  if(!Number.isSafeInteger(row.day)||row.day<0||!Number.isSafeInteger(uint(row.manda)+uint(row.coupon))||row.manda+row.coupon<1||row.manda+row.coupon>U32)throw new TypeError("Invalid Rupee purchase history");
  return {day:row.day,manda:row.manda,coupon:row.coupon};
}
function effective(counter:RupeeShopCounter|undefined,now:number):RupeeShopCounter {
  if(!Number.isSafeInteger(now)||now<0)throw new TypeError("Invalid Rupee purchase clock");
  const day=Math.floor(now/DAY),prior=counter===undefined?undefined:normalizeRupeeShopCounter(counter);
  return prior&&day<=prior.day?prior:{day:Math.max(day,prior?.day??day),manda:0,coupon:0};
}
/** LOCAL identities and5000x1 decomposition; native use_type11 selects the
 * gold shop record. Positive coupon requirement prevents an empty-ID lookup. */
export function rupeeShopReferences(policy:RupeeShopPolicy) {
  policyValid(policy);
  return {item:[{id:RUPEE_SHOP_ID,name:"Rupees",desc:"A small, shiny coin and the main currency of Midgard.",rank:1,use_type:11,effect:"5000",thumbnail_id:"IT_CO",sell_price:0,collect_qty:0},
    {id:RUPEE_COUPON_ID,name:"Rupee Coupon",desc:"Exchange this coupon for 5,000 Rupees.",rank:1,use_type:0,effect:"",thumbnail_id:"",sell_price:0,collect_qty:0}],
    global_item:[{item_id:RUPEE_SHOP_ID,buy_limit:policy.dailyLimit,provide_qty:1,type:1,ticket_ref_id:RUPEE_COUPON_ID,ticket_qty:1,
      price_list:Array.from({length:policy.dailyLimit},(_,i)=>({price_type:1,buy_cnt:i+1,price:policy.mandaPrice}))}]};
}
export function rupeePurchaseInventory(counter:RupeeShopCounter|undefined,now:number) {
  const row=effective(counter,now);
  return [{item_id:RUPEE_SHOP_ID,price_type:1,buy_cnt:row.manda},{item_id:RUPEE_SHOP_ID,price_type:2,buy_cnt:0},{item_id:RUPEE_SHOP_ID,price_type:4,buy_cnt:row.coupon}];
}
/** Pure plan, with shared Manda/coupon cap, LOCAL free-first spend and no
 * jackpot/GC6 bonus. Caller commits wallet, counter and optional coupon row
 * together. Native coupon receipt sets absolute remaining stock, not a delta. */
export function planRupeePurchase(payload:Record<string,unknown>,game:RupeeShopGame,counter:RupeeShopCounter|undefined,policy:RupeeShopPolicy,now:number) {
  policyValid(policy);
  if(!payload||payload.target_ref_id!==RUPEE_SHOP_ID||integer(payload.qty)!==1||
    ["price","provide_qty","added","buy_cnt","gold","iap_qty","free_iap_qty","jackpot_level","jackpot_multiply"].some(key=>Object.hasOwn(payload,key)))throw new TypeError("Unsupported Rupee purchase packet");
  const payment=integer(payload.price_type),id=identity(payload.item_inst_id,true);
  if((payment!==1&&payment!==4)||(payment===1&&id!=="0")||(payment===4&&id==="0"))throw new TypeError("Unsupported Rupee payment");
  const prior=effective(counter,now);
  if(prior.manda+prior.coupon>=policy.dailyLimit)throw new TypeError("LOCAL shared Rupee daily limit reached");
  const gold=uint(game.gold);if(gold>INT32-5000)throw new TypeError("LOCAL signed gold capacity reached");
  const free=uint(game.gacha_free_qty),paid=uint(game.gacha_iap_qty);
  if(!Array.isArray(game.items))throw new TypeError("Owned coupon inventory required");
  const seen=new Set<string>();let selected=-1;
  for(let index=0;index<game.items.length;index++) {
    const row=game.items[index];if(!row||typeof row!=="object"||Array.isArray(row))throw new TypeError("Malformed coupon inventory");
    const key=identity(row.inst_id);if(seen.has(key))throw new TypeError("Duplicate owned item identity");seen.add(key);uint(row.qty);
    if(key===id)selected=index;
  }
  let coupon:{index:number;remaining:number}|undefined,gacha_free_qty=free,gacha_iap_qty=paid;
  if(payment===1){if(free+paid<policy.mandaPrice)throw new TypeError("Insufficient Manda");const debit=Math.min(free,policy.mandaPrice);gacha_free_qty-=debit;gacha_iap_qty-=policy.mandaPrice-debit;}
  else {
    const matches=game.items.filter(row=>row.ref_id===RUPEE_COUPON_ID);
    if(matches.length!==1||selected<0||game.items[selected]!==matches[0])throw new TypeError("Unambiguous owned Rupee coupon required");
    const row=game.items[selected];if(row.lock!==0||row.qty<1)throw new TypeError("Unlocked funded Rupee coupon required");
    coupon={index:selected,remaining:row.qty-1};
  }
  const updated={day:prior.day,manda:prior.manda+(payment===1?1:0),coupon:prior.coupon+(payment===4?1:0)};
  const receipt={jackpot_level:1,jackpot_multiply:1,user:{gold:{prev:gold,cur:gold+5000},...(payment===1?{iap:{iap_qty:gacha_iap_qty,free_iap_qty:gacha_free_qty}}:{})},
    target_inst:{item_id:RUPEE_SHOP_ID,price_type:payment,buy_cnt:{prev:payment===1?prior.manda:prior.coupon,cur:payment===1?updated.manda:updated.coupon}},
    ...(coupon?{target_item_inst:{inst_id:wireId(id),qty:coupon.remaining}}:{}),consumed_inst_list:[]};
  return {gold:gold+5000,gacha_free_qty,gacha_iap_qty,counter:updated,...(coupon?{coupon}:{}),receipt};
}
