import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {repositoryPath} from "./paths.js";
import {FUEL_SHOP_ID,BP_SHOP_ID} from "./shop-fuel.js";

export interface ResourceShopPolicy {
  readonly mode:"archive-2018-base-only";
  readonly apDailyLimit:number;
  readonly bpDailyLimit:number;
}
export const RESOURCE_SHOP_AMOUNTS=Object.freeze({ap:60,bp:2} as const);
export const RESOURCE_SHOP_COUPON_IDS=Object.freeze({ap:"local_ap_coupon",bp:"local_bp_coupon"} as const);
export const RESOURCE_SHOP_PRICES=Object.freeze({1:5,2:5000,4:1} as const);
/** Normal presentation is proved; suppressing all random bonuses is LOCAL. */
export const RESOURCE_SHOP_JACKPOT=Object.freeze({jackpot_level:1,jackpot_multiply:1} as const);
export const RESOURCE_SHOP_EVIDENCE=Object.freeze({path:"resources/reference/resource-shop-screen-quotes.json",
  sha256:"5c82b482ace33c9333e3aa4b970bf1e09836f33a48812c5c9b28ab2b7ae1a94b"});
const sha=(raw:Buffer|string)=>createHash("sha256").update(raw).digest("hex");
let sourceVerified=false;
function verifyEvidence() {
  if(sourceVerified)return;
  const bytes=readFileSync(repositoryPath(RESOURCE_SHOP_EVIDENCE.path));
  if(sha(bytes)!==RESOURCE_SHOP_EVIDENCE.sha256)throw new TypeError("Resource shop historical evidence pin changed");
  const evidence=JSON.parse(bytes.toString("utf8"));
  if(!Array.isArray(evidence.quotes)||evidence.quotes.some((row:any)=>typeof row.raw_tsv_row!=="string"||sha(row.raw_tsv_row)!==row.raw_row_sha256)||
    !evidence.quotes.some((row:any)=>row.filename_year===2018&&row.observation_kind==="fuel-complete-2018")||
    !evidence.quotes.some((row:any)=>row.filename_year===2018&&row.observation_kind==="invitations-complete-2018"))
    throw new TypeError("Resource shop base price anchors are missing");
  sourceVerified=true;
}
function limit(raw:unknown):number {
  const value=typeof raw==="string"&&/^[1-9]\d*$/.test(raw)&&raw.length<=4?Number(raw):raw;
  if(typeof value!=="number"||!Number.isInteger(value)||value<1||value>1000)throw new TypeError("Explicit LOCAL AP and BP shared daily limits1..1000 required");
  return value;
}
function policyValid(policy:ResourceShopPolicy) {
  if(!policy||policy.mode!=="archive-2018-base-only")throw new TypeError("Unknown resource shop mode");
  if(typeof policy.apDailyLimit!=="number"||typeof policy.bpDailyLimit!=="number")throw new TypeError("Numeric resource shop limits required");
  limit(policy.apDailyLimit);limit(policy.bpDailyLimit);verifyEvidence();
}
/** Canonical env adapter: incomplete and cap-only configurations refuse.
 * This does not attach any policy to accounts or migrate existing purchases. */
export function configuredResourceShop(mode:unknown,rawApLimit:unknown,rawBpLimit:unknown):ResourceShopPolicy|undefined {
  if(mode===undefined||mode==="disabled") {
    if(rawApLimit!==undefined||rawBpLimit!==undefined)throw new TypeError("Resource shop limits require an enabled resource shop mode");
    return undefined;
  }
  if(mode!=="archive-2018-base-only")throw new TypeError("Unknown resource shop mode");
  const policy:ResourceShopPolicy={mode,apDailyLimit:limit(rawApLimit),bpDailyLimit:limit(rawBpLimit)};
  verifyEvidence();return Object.freeze(policy);
}
export function resourceShopPolicyFromEnv(env:Record<string,string|undefined>=process.env) {
  return configuredResourceShop(env.BLUSTONE_RESOURCE_SHOP_MODE,env.BLUSTONE_RESOURCE_AP_DAILY_LIMIT,env.BLUSTONE_RESOURCE_BP_DAILY_LIMIT);
}
/** REPLACEMENT rows for existing local_ap/local_bp, not additive alternatives:
 * native ShopFuel/FCTicket select the first use_type1/2 record. Preserve the
 * canonical owned fuel_shop/bp_shop counts in the separate transaction owner.
 * All IDs/decomposition/caps are LOCAL; only base quotes come from images.
 * Native coupon lookup has no null guard: AP GetItemInst Gd4b160 followed by
 * VLDR Gd4b168; BP GetItemInst Gd484c6 followed by VLDR Gd484ce. Therefore
 * neither a blank coupon ID nor zero requirement is a safe disabled button. */
export function resourceShopReferences(policy:ResourceShopPolicy) {
  policyValid(policy);
  const resources=[{resource:"ap" as const,id:FUEL_SHOP_ID,use_type:1,name:"Fuel",thumbnail_id:"IT_ST",dailyLimit:policy.apDailyLimit},
    {resource:"bp" as const,id:BP_SHOP_ID,use_type:2,name:"Challenge Invitations",thumbnail_id:"IT_LT",dailyLimit:policy.bpDailyLimit}];
  const item=resources.map(row=>({id:row.id,use_type:row.use_type,name:row.name,thumbnail_id:row.thumbnail_id,rank:1,sell_price:0,collect_qty:0,
    desc:row.resource==="ap"?"Fuel used by the ornithopter for transport.":"Use to enter battles in Fight Club.",effect:String(RESOURCE_SHOP_AMOUNTS[row.resource])}));
  const coupons=resources.map(row=>({id:RESOURCE_SHOP_COUPON_IDS[row.resource],use_type:0,name:row.resource==="ap"?"Fuel Coupon":"Challenge Invitation Coupon",
    thumbnail_id:"",rank:1,sell_price:0,collect_qty:0,desc:`Exchange for ${RESOURCE_SHOP_AMOUNTS[row.resource]} ${row.resource==="ap"?"Fuel":"Challenge Invitations"}.`,effect:""}));
  return {item:[...item,...coupons],global_item:resources.map(row=>({item_id:row.id,buy_limit:row.dailyLimit,provide_qty:1,type:1,
    ticket_ref_id:RESOURCE_SHOP_COUPON_IDS[row.resource],ticket_qty:1,
    price_list:([1,2,4] as const).flatMap(price_type=>Array.from({length:row.dailyLimit},(_,i)=>({price_type,buy_cnt:i+1,price:RESOURCE_SHOP_PRICES[price_type]})))}))};
}
