export const DORM_SHOP_ID="local_dorm_expansion";
/** Curated observations, not runtime price policy. No historical price at100. */
export const DORM_EXPANSION_EVIDENCE=Object.freeze({path:"resources/reference/dorm-expansion-screen-quotes.json",
  sha256:"5b463282280450b47dca1edc375a23fe8b68773b1cde99f89b37a1b9c2306104"});
export interface DormExpansion {capacity:number;manda:number;gold:number}
export interface DormExpansionPrice {capacity:number;gold:number;manda:number}
export interface DormExpansionPolicy {readonly mode:"local-priced";readonly prices:readonly Readonly<DormExpansionPrice>[]}
interface DormGame {gold:number;gacha_free_qty:number;gacha_iap_qty:number;dorm_expansion?:DormExpansion}
const U32=0xffff_ffff,INT32=0x7fff_ffff;
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>U32)throw new TypeError("Dorm value requires uint32");return raw;
}
function integer(raw:unknown):number {return typeof raw==="number"?raw:typeof raw==="string"&&/^(0|[1-9]\d*)$/.test(raw)&&raw.length<=10?Number(raw):NaN;}
function fields(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.getPrototypeOf(raw)!==Object.prototype||
    Reflect.ownKeys(raw).length!==keys.length||keys.some(key=>{const d=Object.getOwnPropertyDescriptor(raw,key);return !d?.enumerable||!Object.hasOwn(d,"value");}))throw new TypeError("Dorm settings require exact plain data fields");
  return raw as Record<string,unknown>;
}
function priceRows(raw:unknown):readonly Readonly<DormExpansionPrice>[] {
  if(typeof raw==="string") {
    if(raw.length>32768)throw new TypeError("Dorm price policy exceeds LOCAL bound");
    try{raw=JSON.parse(raw);}catch{throw new TypeError("Dorm prices require JSON array");}
  }
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length<1||raw.length>100||
    Reflect.ownKeys(raw).length!==raw.length+1||Array.from({length:raw.length},(_,i)=>Object.getOwnPropertyDescriptor(raw,String(i))).some(d=>!d?.enumerable||!Object.hasOwn(d,"value")))throw new TypeError("Dorm prices require1..100 dense tiers");
  return Object.freeze(raw.map((value,index)=>{
    const row=fields(value,["capacity","gold","manda"]),capacity=uint(row.capacity),gold=uint(row.gold),manda=uint(row.manda);
    if(capacity!==100+index*3||gold<1||manda<1||gold>INT32||manda>INT32)throw new TypeError("Dorm prices must be contiguous from100 in steps3 with positive signed prices");
    return Object.freeze({capacity,gold,manda});
  }));
}
/** All prices, maximum tiers and lifetime/no-reset behavior are LOCAL policy.
 * Historical images support a +3 example, not a universal original ladder. */
export function configuredDormExpansion(mode:unknown,rawPrices:unknown):DormExpansionPolicy|undefined {
  if(mode===undefined||mode==="disabled")return undefined;
  if(mode!=="local-priced")throw new TypeError("Unknown dorm expansion mode");
  return Object.freeze({mode,prices:priceRows(rawPrices)});
}
function policyValid(policy:DormExpansionPolicy) {
  if(!policy||policy.mode!=="local-priced")throw new TypeError("Explicit LOCAL dorm price policy required");
  return priceRows(policy.prices);
}
export function normalizeDormExpansion(raw:unknown):DormExpansion {
  const row=fields(raw,["capacity","manda","gold"]),capacity=uint(row.capacity),manda=uint(row.manda),gold=uint(row.gold);
  const total=BigInt(manda)+BigInt(gold);
  if(total<1n||100n+3n*total!==BigInt(capacity))throw new TypeError("Dorm capacity must match earned lifetime purchases");
  return {capacity,manda,gold};
}
export function hunterCapacity(source:DormExpansion|{dorm_expansion?:DormExpansion}|undefined):number {
  if(source===undefined)return 100;
  if(!source||typeof source!=="object")throw new TypeError("Dorm capacity owner required");
  const counter="capacity" in source?source:source.dorm_expansion;
  return counter===undefined?100:normalizeDormExpansion(counter).capacity;
}
/** Native CreateCardInvenExtend selects use_type9. It previews atoi(effect)
 * added to capacity; original item ID and effect/provide split are unknown.
 * Only payment1/2 calls are closed for this popup; no coupon path is enabled. */
export function dormExpansionReferences(policy:DormExpansionPolicy) {
  const prices=policyValid(policy);
  return {item:[{id:DORM_SHOP_ID,name:"Dorm Expansion",desc:"Expand the dorm by 3 hunter spaces.",rank:1,use_type:9,effect:"3",thumbnail_id:"",sell_price:0,collect_qty:0}],
    global_item:[{item_id:DORM_SHOP_ID,buy_limit:prices.length,provide_qty:1,type:2,ticket_ref_id:"",ticket_qty:0,
      price_list:prices.flatMap((row,index)=>[{price_type:1,buy_cnt:index+1,price:row.manda},{price_type:2,buy_cnt:index+1,price:row.gold}])}]};
}
export function dormPurchaseInventory(counter:DormExpansion|undefined) {
  const row=counter===undefined?undefined:normalizeDormExpansion(counter);
  return [{item_id:DORM_SHOP_ID,price_type:1,buy_cnt:row?.manda??0},{item_id:DORM_SHOP_ID,price_type:2,buy_cnt:row?.gold??0},{item_id:DORM_SHOP_ID,price_type:4,buy_cnt:0}];
}
/** Shared lifetime tier index matches native global.type2 lookup. No nonce or
 * time-window deduplication: each accepted funded request buys the next tier.
 * Caller authenticates and commits wallet and counter atomically; grants of
 * owned hunters must independently honor hunterCapacity even when disabled. */
export function planDormExpansion(payload:Record<string,unknown>,game:DormGame,policy:DormExpansionPolicy) {
  const prices=policyValid(policy);
  if(!payload||typeof payload!=="object"||Array.isArray(payload)||payload.target_ref_id!==DORM_SHOP_ID||integer(payload.qty)!==1||integer(payload.item_inst_id)!==0||
    ["price","capacity","card_inven_max","gold","manda","iap_qty","free_iap_qty","dorm_expansion","provide_qty","added","buy_cnt","jackpot_level","jackpot_multiply"].some(key=>Object.hasOwn(payload,key)))throw new TypeError("Unsupported dorm expansion packet");
  const payment=integer(payload.price_type);if(payment!==1&&payment!==2)throw new TypeError("Dorm expansion supports Manda or Rupees only");
  const current=game.dorm_expansion===undefined?undefined:normalizeDormExpansion(game.dorm_expansion),capacity=hunterCapacity(current);
  const tier=prices.find(row=>row.capacity===capacity);
  if(!tier)throw new TypeError("LOCAL dorm expansion tiers exhausted");
  const beforeGold=uint(game.gold),free=uint(game.gacha_free_qty),paid=uint(game.gacha_iap_qty);
  let gold=beforeGold,gacha_free_qty=free,gacha_iap_qty=paid;
  if(payment===1){if(free+paid<tier.manda)throw new TypeError("Insufficient Manda for dorm expansion");const debit=Math.min(free,tier.manda);gacha_free_qty-=debit;gacha_iap_qty-=tier.manda-debit;}
  else {if(gold<tier.gold)throw new TypeError("Insufficient Rupees for dorm expansion");gold-=tier.gold;}
  const counter={capacity:capacity+3,manda:(current?.manda??0)+(payment===1?1:0),gold:(current?.gold??0)+(payment===2?1:0)},before=payment===1?current?.manda??0:current?.gold??0;
  const receipt={jackpot_level:1,jackpot_multiply:1,user:{card_inven_max:{prev:capacity,cur:counter.capacity},
    ...(payment===1?{iap:{iap_qty:gacha_iap_qty,free_iap_qty:gacha_free_qty}}:{gold:{prev:beforeGold,cur:gold}})},
    target_inst:{item_id:DORM_SHOP_ID,price_type:payment,buy_cnt:{prev:before,cur:before+1}},consumed_inst_list:[]};
  return {gold,gacha_free_qty,gacha_iap_qty,counter,receipt};
}
