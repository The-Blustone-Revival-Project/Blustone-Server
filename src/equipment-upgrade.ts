import type {LocalCardInstance,LocalItemInstance} from "./game.js";
import {parseEquipmentUpgradeRequest} from "./equipment-upgrade-request.js";
import {equipmentTransition} from "./equipment-transition.js";
import {noGuildEquipmentLevelFee,nativeGuildSaleValue,EQUIPMENT_POPUP_GOLD_PRICE_TYPE} from "./equipment-fee.js";
import {calculateHunterEquipment,parseHunterEquipment} from "./hunter-equipment.js";
import {equipmentLevelPriceAt,equipmentRankPriceAt,type EquipmentLevelPrice,type EquipmentRankPrice} from "./equipment-prices.js";
const parts=["weapon","armor","accessory"] as const;
interface Context {
  cards:readonly LocalCardInstance[]; items:readonly LocalItemInstance[]; gold:number;
  guildId:number; busyIds:ReadonlySet<number>;
  guildLevelBenefit?:{mode:number;value:number}|null;
  reference:(id:string)=>{attr:number;equipment:unknown[]}|undefined;
  levelPrices:readonly EquipmentLevelPrice[];rankPrices:readonly EquipmentRankPrice[];
}
/** Configured ordinary popup path. Affiliated level fees require an explicit
 * valid Guild table; affiliated rank/source-Hunter consumers stay unclosed. */
export function planEquipmentUpgrade(action:"level"|"rank",payload:unknown,context:Context) {
  try {
    const request=parseEquipmentUpgradeRequest(action,payload);
    if(request.source_inst_ids.length) throw new TypeError("Source-Hunter equipment workflow is not configured");
    const id=Number(request.inst_id);
    if(!Number.isSafeInteger(id)) throw new TypeError("Equipment target is outside supported owned identity domain");
    const targets=context.cards.filter(card=>card.inst_id===id);
    if(targets.length!==1) throw new TypeError("Equipment target is not uniquely owned");
    const target=targets[0];
    if(context.busyIds.has(id) || (target.mirage_remain_hp!==undefined && Number(target.mirage_remain_hp)!==1000))
      throw new TypeError("Equipment target has active combat commitments");
    const part=parts[request.slot],rank=Number(target[`${part}_rank`]),level=Number(target[`${part}_level`]);
    const next=equipmentTransition(action,rank,level);
    const reference=context.reference(target.ref_id);
    if(!reference) throw new TypeError("Equipment ordinary reference is missing");
    const stats=parseHunterEquipment(reference.equipment);
    calculateHunterEquipment(stats,request.slot,rank,level);
    calculateHunterEquipment(stats,request.slot,next.rank,next.level);
    const costs=new Map<string,number>();
    let quote:EquipmentLevelPrice|EquipmentRankPrice|undefined;
    const add=(ref:string,qty:number)=>{
      if(!Number.isSafeInteger(qty)||qty<0||qty>0xffff_ffff) throw new TypeError("Invalid equipment material quantity");
      if(qty>0) costs.set(ref,(costs.get(ref)??0)+qty);
    };
    if(action==="level") {
      quote=equipmentLevelPriceAt(context.levelPrices,next.level);
      if(!quote) throw new TypeError("Equipment next-level price is missing");
      for(const n of [1,2,3,4] as const) add(quote[`item${n}_ref_id`],quote[`item${n}_qty`]);
    } else {
      quote=equipmentRankPriceAt(context.rankPrices,next.rank,reference.attr);
      if(!quote || quote.card_qty!==0) throw new TypeError("Equipment next-rank no-source price is missing");
      add(quote.item_ref_id,quote.item_qty);
    }
    if(request.price_type!==quote.price_type) throw new TypeError("Equipment payment does not match quote");
    // Both buttons use gold2; only the level popup's Guild TYPE1 caller is closed.
    let fee:number;
    if(context.guildId===0) fee=noGuildEquipmentLevelFee(quote,0);
    else {
      if(action!=="level"||context.guildLevelBenefit===undefined) throw new TypeError("Guild equipment fee requires explicit valid level references and recovered level consumer");
      if(quote.price_type!==EQUIPMENT_POPUP_GOLD_PRICE_TYPE) throw new TypeError("Guild equipment popup requires gold2");
      fee=nativeGuildSaleValue(quote.price,context.guildLevelBenefit);
    }
    if(!Number.isSafeInteger(context.gold)||context.gold<fee||context.gold>0xffff_ffff)
      throw new TypeError("Equipment gold is invalid or insufficient");
    const items=context.items.map(item=>({...item}));
    if(new Set(items.map(item=>item.inst_id)).size!==items.length || items.some(item=>
      !Number.isSafeInteger(item.inst_id)||item.inst_id<1||!Number.isSafeInteger(item.qty)||item.qty<0||item.qty>0xffff_ffff))
      throw new TypeError("Equipment material inventory is invalid");
    const changed:Array<{inst_id:number;qty:number}>=[];
    for(const [ref,quantity] of costs) {
      if(!ref||!Number.isSafeInteger(quantity)||quantity>0xffff_ffff) throw new TypeError("Invalid combined equipment materials");
      const eligible=items.filter(item=>item.ref_id===ref&&item.lock===0).sort((a,b)=>a.inst_id-b.inst_id);
      if(eligible.reduce((sum,item)=>sum+item.qty,0)<quantity) throw new TypeError("Equipment unlocked materials are insufficient");
      let remaining=quantity;
      for(const item of eligible) {
        const spent=Math.min(remaining,item.qty);if(!spent) continue;
        item.qty-=spent;remaining-=spent;changed.push({inst_id:item.inst_id,qty:item.qty});
        if(!remaining) break;
      }
    }
    const card={...target,[`${part}_rank`]:next.rank,[`${part}_level`]:next.level};
    const gold=context.gold-fee;
    return {id,card,items,gold,data:{user:{gold:{cur:gold},card:[card],item:changed}}};
  } catch(error) {return {error:error instanceof Error?error.message:"Invalid equipment upgrade"};}
}
