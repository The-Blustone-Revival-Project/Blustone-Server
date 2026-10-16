import type {LocalGameState} from "./game.js";
import {parseGemInstances,type GemReference} from "./gem-instances.js";
import {GEM_STAT_KEYS} from "./gem-combinations.js";
export const FRIENDLY_GEM_SERIAL_BASE=9_200_000_001;
/** Only mounted Gems affecting selected defenders are public. Parse the full
 * owned inventory first; preserve raw native stat units, not normalized values.
 * Both Gem serial and target link are RESPONSE-ONLY aliases. */
export function friendlyBattleGems(game:LocalGameState,references:readonly GemReference[],cardMirrors:ReadonlyMap<string,number>,occupiedIds:ReadonlySet<number|string>) {
  const raw=game.owned_gems??[],cards=[...game.starter_cards,...game.recruited_cards];
  const parsed=parseGemInstances({result_code:1,ret_data:raw},references,new Set(cards.map(card=>String(card.inst_id))),
    (id,slot)=>Number(cards.find(card=>String(card.inst_id)===id)?.[`${["weapon","armor","accessory"][slot]}_rank`]));
  const occupied=new Set([...occupiedIds].map(String));
  for(const card of cards)occupied.add(String(card.inst_id));
  for(const gem of parsed)occupied.add(gem.inst_id);
  for(const mirror of cardMirrors.values())occupied.add(String(mirror));
  const stat=(value:any)=>({rank:value.rank,awk_step:value.awk_step,...Object.fromEntries(GEM_STAT_KEYS.map(key=>[key,value[key]]))});
  return parsed.flatMap((gem,index)=>{
    const target=cardMirrors.get(gem.target_inst_id);if(target===undefined)return [];
    const mirror=FRIENDLY_GEM_SERIAL_BASE+index;
    if(!Number.isSafeInteger(mirror)||occupied.has(String(mirror)))throw new TypeError("Friendly Gem alias collides with existing identity");
    occupied.add(String(mirror));const source=raw[index],abilities=source.abilities as any;
    return [{ref_id:gem.ref_id,inst_id:mirror,rank:gem.rank,level:gem.level,position:gem.position,target_inst_id:target,
      ability:gem.ability,abilities:abilities===null?null:{level_up_failed:abilities.level_up_failed,main:stat(abilities.main),sub:abilities.sub.map(stat)}}];
  });
}
