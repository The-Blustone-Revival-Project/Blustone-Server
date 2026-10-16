import {BP_SHOP_ID,FUEL_SHOP_ID,FUEL_SHOP_AP,BP_SHOP_AMOUNT,FUEL_SHOP_LIMIT,FUEL_SHOP_PRICES,normalizeFuelShop,settleFuelShop} from "./shop-fuel.js";
import {resourceChargeTime,type LocalGameState} from "./game.js";
import {RESOURCE_SHOP_AMOUNTS,RESOURCE_SHOP_COUPON_IDS,RESOURCE_SHOP_PRICES,type ResourceShopPolicy} from "./resource-shop.js";

const U32=0xffff_ffff,U64=0xffff_ffff_ffff_ffffn;
function integer(value:unknown):number {
  return typeof value==="number"?value:typeof value==="string"&&/^(0|[1-9]\d*)$/.test(value)&&value.length<=20?Number(value):NaN;
}
function uint(value:number) {if(!Number.isInteger(value)||value<0||value>U32)throw new TypeError("Invalid resource shop balance");return value;}
function identity(value:unknown) {
  const id=typeof value==="number"&&Number.isSafeInteger(value)&&value>=0?String(value):typeof value==="string"?value:"";
  if(id.length>20||!/^(0|[1-9]\d*)$/.test(id)||BigInt(id)>U64)throw new TypeError("Exact coupon identity required");return id;
}
function wireId(id:string):unknown {
  if(BigInt(id)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(id);
  const codec=JSON as typeof JSON&{rawJSON?:(value:string)=>unknown};
  if(!codec.rawJSON)throw new TypeError("Exact coupon serialization unavailable");return codec.rawJSON(id);
}
/** Pure plan. Preserve existing paid history when enabling/disabling historical
 * quotes. Coupon history exists only after a real coupon payment, including
 * after UTC rollover. Counts are shared across payment types per resource. */
export function planResourcePurchase(payload:Record<string,unknown>,game:LocalGameState,policy:ResourceShopPolicy|undefined,now:number) {
  const resource:"ap"|"bp"|undefined=payload.target_ref_id===FUEL_SHOP_ID?"ap":payload.target_ref_id===BP_SHOP_ID?"bp":undefined;
  if(!resource||integer(payload.qty)!==1||["price","provide_qty","added","buy_cnt","jackpot_level","jackpot_multiply","gold","ap","bp","iap_qty","free_iap_qty"].some(key=>Object.hasOwn(payload,key)))throw new TypeError("Unsupported resource purchase packet");
  if(!Number.isSafeInteger(now)||now<0)throw new TypeError("Invalid purchase clock");
  const payment=integer(payload.price_type),id=identity(payload.item_inst_id);
  if((payment!==1&&payment!==2&&!(payment===4&&policy))||(payment!==4&&id!=="0")||(payment===4&&id==="0"))throw new TypeError("Unsupported resource payment");
  const shopKey:"fuel_shop"|"bp_shop"=resource==="ap"?"fuel_shop":"bp_shop",counter=normalizeFuelShop(game[shopKey]);settleFuelShop(counter,now);
  const limit=policy?(resource==="ap"?policy.apDailyLimit:policy.bpDailyLimit):FUEL_SHOP_LIMIT;
  if(counter.manda+counter.gold+(counter.coupon??0)>=limit)throw new TypeError("Shared resource purchase limit reached");
  const amount=policy?RESOURCE_SHOP_AMOUNTS[resource]:(resource==="ap"?FUEL_SHOP_AP:BP_SHOP_AMOUNT);
  const previous=uint(game[resource]),gold=uint(game.gold),free=uint(game.gacha_free_qty),paid=uint(game.gacha_iap_qty);
  if(previous>0x7fff_ffff-amount)throw new TypeError("Resource capacity exceeded");
  let nextGold=gold,nextFree=free,nextPaid=paid,coupon:{index:number;remaining:number}|undefined;
  if(payment===4) {
    const couponRef=RESOURCE_SHOP_COUPON_IDS[resource],seen=new Set<string>();let selected=-1;
    for(let index=0;index<game.items.length;index++) {
      const row=game.items[index],key=identity(row.inst_id);uint(row.qty);
      if(key==="0"||seen.has(key))throw new TypeError("Ambiguous owned item identity");seen.add(key);if(key===id)selected=index;
    }
    const matches=game.items.filter(row=>row.ref_id===couponRef),row=game.items[selected];
    if(matches.length!==1||!row||row!==matches[0]||row.lock!==0||row.qty<1)throw new TypeError("Unlocked unambiguous owned resource coupon required");
    coupon={index:selected,remaining:row.qty-1};
  } else {
    const price=policy?RESOURCE_SHOP_PRICES[payment as 1|2]:FUEL_SHOP_PRICES[payment as 1|2];
    if(payment===1) {if(free+paid<price)throw new TypeError("Insufficient Manda");const debit=Math.min(free,price);nextFree-=debit;nextPaid-=price-debit;}
    else {if(gold<price)throw new TypeError("Insufficient Rupees");nextGold-=price;}
  }
  const key=payment===1?"manda":payment===2?"gold":"coupon",before=counter[key]??0;counter[key]=uint(before+1);
  const receipt={jackpot_level:1,jackpot_multiply:1,user:{[resource]:{prev:previous,cur:previous+amount,[`${resource}_charge_time`]:resourceChargeTime(game,resource)},
    ...(payment===1?{iap:{iap_qty:nextPaid,free_iap_qty:nextFree}}:payment===2?{gold:{prev:gold,cur:nextGold}}:{})},
    target_inst:{item_id:payload.target_ref_id,price_type:payment,buy_cnt:{prev:before,cur:before+1}},
    ...(coupon?{target_item_inst:{inst_id:wireId(id),qty:coupon.remaining}}:{}),consumed_inst_list:[]};
  return {resource,shopKey,amount:previous+amount,gold:nextGold,gacha_free_qty:nextFree,gacha_iap_qty:nextPaid,counter,coupon,receipt};
}
