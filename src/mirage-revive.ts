import type {LocalGameState} from "./game.js";
import {normalizeMirageRun,type MirageRun} from "./mirage-run.js";

const I32=0x7fff_ffff,U32=0xffff_ffff;
function wallet(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>I32)throw new TypeError("Mirage first-aid wallet must fit nonnegative signed32");return raw;
}
function targetId(raw:unknown):number {
  const value=typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):typeof raw==="string"?raw:"";
  if(value.length>10||!/^[1-9]\d*$/.test(value)||Number(value)>U32)throw new TypeError("Mirage first aid requires an exact owned uint32 target");return Number(value);
}
/** Optional LOCAL finite first-aid policy. Native supplies target ID only;
 * prices/cap, full-health restoration and free-first charging are explicit
 * revival policy, not recovered original prices/entitlement or nonce law. */
export function planMirageRevive(raw:MirageRun,payload:Record<string,unknown>,game:LocalGameState) {
  if(Object.keys(payload).some(key=>!["target_inst_id","app_code","app_ver","market","pvid","otp"].includes(key)))
    throw new TypeError("Unsupported Mirage first-aid packet fields");
  const run=normalizeMirageRun(raw),prices=run.policy.revive_prices,id=targetId(payload.target_inst_id);
  if(!prices||!run.revive_ids||run.cache.inst_base.state!==1)throw new TypeError("Configured active Mirage first aid is unavailable");
  const matches=[...game.starter_cards,...game.recruited_cards].filter(card=>card.inst_id===id),entry=run.cache.entry.find(row=>row.id===id);
  if(matches.length!==1||!entry||matches[0].mirage_remain_hp!==entry.mirage_remain_hp)throw new TypeError("First-aid target must bind an actual owned enrolled Hunter and exact carry");
  let gacha_free_qty=wallet(game.gacha_free_qty),gacha_iap_qty=wallet(game.gacha_iap_qty);
  if(gacha_free_qty+gacha_iap_qty>I32)throw new TypeError("Mirage first-aid wallet total exceeds native signed32 admission");
  const receipt=(hp:number,price:number)=>({inst_id:id,mirage_remain_hp:hp,revive_price:price,
    user:{iap:{free_iap_qty:gacha_free_qty,iap_qty:gacha_iap_qty}}});
  if(entry.mirage_remain_hp>0&&run.revive_ids.includes(id))return {run:raw,gacha_free_qty,gacha_iap_qty,
    starter_cards:game.starter_cards,recruited_cards:game.recruited_cards,receipt:receipt(entry.mirage_remain_hp,run.cache.inst_base.revive_price),replay:true};
  if(entry.mirage_remain_hp!==0)throw new TypeError("LOCAL first aid supports unconscious enrolled Hunters only");
  const price=prices[run.revive_ids.length];
  if(price===undefined||gacha_free_qty+gacha_iap_qty<price)throw new TypeError("First-aid use limit or funds exhausted");
  const free=Math.min(gacha_free_qty,price);gacha_free_qty-=free;gacha_iap_qty-=price-free;
  entry.mirage_remain_hp=10000;run.revive_ids.push(id);run.cache.inst_base.revive_price=prices[run.revive_ids.length]??-1;delete run.lastEnd;
  const starter_cards=structuredClone(game.starter_cards),recruited_cards=structuredClone(game.recruited_cards);
  for(const card of [...starter_cards,...recruited_cards])if(card.inst_id===id)card.mirage_remain_hp=10000;
  return {run:normalizeMirageRun(run),gacha_free_qty,gacha_iap_qty,starter_cards,recruited_cards,
    receipt:receipt(10000,run.cache.inst_base.revive_price),replay:false};
}
