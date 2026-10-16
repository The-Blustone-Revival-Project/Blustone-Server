import type {LocalGameState,LocalCardInstance,LocalItemInstance} from "./game.js";
import {CARD_INSTANCE_LIMIT} from "./card-instance-namespace.js";
import type {HunterOvercomePolicy} from "./hunter-overcome-reference.js";
export type {HunterOvercomePolicy} from "./hunter-overcome-reference.js";
interface Reference {base:{id:string;char_id:string;is_source:number};stat:readonly {rank:number;awk_step:number}[]}
// Native SetCard derives bit2 from the exact reference ID, replacing the
// parsed source_field value: 901..904 mask3; 912..914 mask4; others mask7.
// This classifies existing published references only; it creates no records.
const WITHOUT_OVERCOME_SOURCE_BIT=new Set(["901","902","903","904"]);
const U32=0xffff_ffff,U64=0xffff_ffff_ffff_ffffn;
function uint(value:unknown):number {
  if(typeof value!=="number"||!Number.isInteger(value)||value<0||value>U32)throw new TypeError("Overcome requires uint32 fields");return value;
}
function itemId(value:unknown):string {
  const id=typeof value==="number"&&Number.isSafeInteger(value)&&value>0?String(value):typeof value==="string"?value:"";
  if(id.length>20||!/^[1-9]\d*$/.test(id)||BigInt(id)>U64)throw new TypeError("Exact positive owned item identity required");return id;
}
function cardId(value:unknown):number {
  const id=itemId(value),number=Number(id);
  if(!Number.isSafeInteger(number)||number>=CARD_INSTANCE_LIMIT)throw new TypeError("Overcome Hunter identity exceeds owned namespace");return number;
}
function numericId(value:string):unknown {
  if(BigInt(value)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(value);
  const codec=JSON as typeof JSON&{rawJSON?:(raw:string)=>unknown};
  if(!codec.rawJSON)throw new TypeError("Exact numeric material identity serialization unavailable");return codec.rawJSON(value);
}
function sourceIds(raw:unknown):number[] {
  let ids=raw;
  if(typeof ids==="string")try{ids=JSON.parse(ids);}catch{throw new TypeError("Invalid native src_inst_id_list");}
  if(!Array.isArray(ids)||Array.from({length:ids.length},(_,i)=>!Object.hasOwn(ids,i)).some(Boolean)||
    ids.some(id=>typeof id!=="number"||!Number.isSafeInteger(id)||id<=0||id>=CARD_INSTANCE_LIMIT)||new Set(ids).size!==ids.length)
    throw new TypeError("Source list requires unique safe numeric owned Hunter IDs");
  return [...ids];
}

/** Pure LOCAL one-step ordinary transition. Source family/resource admission
 * follows the native picker. Untranscended sources and exactly the configured
 * card count remain a local bound until source-credit transfer is recovered.
 * Native percent references apply the buff; no base stat is pre-multiplied. */
export function planHunterOvercome(payload:Record<string,unknown>,game:LocalGameState,policy:HunterOvercomePolicy,
    referenceRows:readonly Reference[],protectedIds:ReadonlySet<number>) {
  if(["target_cnt","overcome_cnt","awk_overcome","rank","exp","price","gold","item_list","removed_card","removed_item","effect"].some(key=>Object.hasOwn(payload,key)))
    throw new TypeError("Unsupported ordinary Overcome fields");
  const targetId=cardId(payload.target_inst_id),ids=sourceIds(payload.src_inst_id_list);
  const owned=[...game.starter_cards,...game.recruited_cards],seen=new Set<number>();
  for(const card of owned){const id=cardId(card.inst_id);if(seen.has(id))throw new TypeError("Duplicate owned Hunter identity");seen.add(id);}
  const target=owned.find(card=>card.inst_id===targetId);
  if(!target)throw new TypeError("Owned Overcome target required");
  const rank=uint(target.rank),previousCount=uint(target.overcome_cnt);
  if(rank<3||rank>5||target.awk_step!==0||target.awk_overcome!==0||previousCount>=rank-2)
    throw new TypeError("Target must be ordinary and below its rank-minus-two Overcome cap");
  const refs=referenceRows.filter(row=>row.base.id===target.ref_id);
  if(refs.length!==1||refs[0].base.is_source!==0||!refs[0].stat.length||refs[0].stat[0].awk_step!==0||
    !refs[0].stat.some(row=>row.rank===rank&&row.awk_step===0))throw new TypeError("Ordinary target rank reference unavailable");
  const baseRank=uint(refs[0].stat[0].rank),overcome_cnt=previousCount+1;
  const family=refs[0].base.char_id;
  if(typeof family!=="string"||!family)throw new TypeError("Target character family unavailable");
  const matches=policy.src.filter(row=>row.target_base_rank===baseRank&&row.overcome_cnt===overcome_cnt);
  if(matches.length!==1)throw new TypeError("An explicit unambiguous next-step Overcome recipe is required");
  const recipe=matches[0],required=uint(recipe.card_required_rank),count=uint(recipe.card_cnt),cost=uint(recipe.gold);
  if((count>0&&required<1)||required>5||ids.length!==count||ids.includes(targetId))throw new TypeError("Exactly the configured other Hunter sources are required");
  const effects=policy.effect.filter(row=>row.cnt===overcome_cnt);
  if(effects.length!==1||[effects[0].hp_percent,effects[0].atk_percent,effects[0].def_percent].some(value=>
    typeof value!=="number"||!Number.isFinite(value)||!Number.isFinite(Math.fround(value))||value<0))throw new TypeError("Explicit finite next-step native effect percentages required");
  for(const id of ids) {
    const card=owned.find(card=>card.inst_id===id);
    if(!card||card.lock!==0||protectedIds.has(id)||card.awk_overcome!==0||card.overcome_cnt!==0)
      throw new TypeError("Sources must be unlocked uncommitted untranscended owned Hunters");
    const sources=referenceRows.filter(row=>row.base.id===card.ref_id);
    if(sources.length!==1||!sources[0].stat.length||!sources[0].stat.some(row=>row.rank===card.rank&&row.awk_step===card.awk_step))
      throw new TypeError("Published source identity and current stat row required");
    const source=sources[0],special=source.base.is_source===1&&!WITHOUT_OVERCOME_SOURCE_BIT.has(source.base.id)&&uint(source.stat[0].rank)===baseRank;
    // Gfe0580..0588 admits matching minimum-rank resource cards directly.
    // A nonmatching special candidate falls through to normal family checks.
    // It does not inherit normal current-grade or awake-zero restrictions.
    if(!special&&(source.base.char_id!==family||uint(card.rank)<required||card.awk_step!==0))
      throw new TypeError("Source must match native character-family or resource-card admission");
  }
  const demand=new Map<string,number>();
  for(const row of recipe.item_list) {
    const qty=uint(row.qty);
    if(typeof row.ref_id!=="string"||!row.ref_id||qty===0)throw new TypeError("Positive paired Overcome material requirements required");
    demand.set(row.ref_id,uint((demand.get(row.ref_id)??0)+qty));
  }
  if(!cost&&!count&&!demand.size)throw new TypeError("A free Overcome bill of materials is unavailable");
  const previousGold=uint(game.gold);if(previousGold<cost)throw new TypeError("Insufficient Overcome gold");
  const itemIds=new Set<string>();
  for(const item of game.items) {
    const key=itemId(item.inst_id);if(itemIds.has(key))throw new TypeError("Duplicate owned material identity");itemIds.add(key);
    if(demand.has(item.ref_id)){uint(item.qty);if(item.lock!==0&&item.lock!==1)throw new TypeError("Invalid material lock");}
  }
  const items=structuredClone(game.items),removed_item:{inst_id:unknown;qty:number}[]=[];
  for(const [ref,quantity] of demand) {
    const stacks=items.filter(item=>item.ref_id===ref&&item.lock===0).sort((a,b)=>BigInt(itemId(a.inst_id))<BigInt(itemId(b.inst_id))?-1:1);
    // Aggregate in uint64-free BigInt arithmetic; demand remains uint32 and
    // numerous valid stacks may legitimately total more than uint32.
    if(stacks.reduce((sum,item)=>sum+BigInt(item.qty),0n)<BigInt(quantity))throw new TypeError("Insufficient unlocked Overcome materials");
    let remaining=quantity;
    for(const stack of stacks){const qty=Math.min(remaining,stack.qty);if(!qty)continue;stack.qty-=qty;remaining-=qty;
      removed_item.push({inst_id:numericId(itemId(stack.inst_id)),qty});if(!remaining)break;}
  }
  const removed=new Set(ids),copy=(cards:LocalCardInstance[]):LocalCardInstance[]=>cards.filter(card=>!removed.has(card.inst_id)).map(card=>
    card.inst_id===targetId?{...structuredClone(card),overcome_cnt}:structuredClone(card));
  const starter_cards=copy(game.starter_cards),recruited_cards=copy(game.recruited_cards);
  const decks=game.decks.map(deck=>({...structuredClone(deck),list:deck.list.map(id=>removed.has(id)?0:id)}));
  const gold=previousGold-cost;
  return {targetId,previousCount,overcome_cnt,gold,items:items as LocalItemInstance[],starter_cards,recruited_cards,decks,
    receipt:{dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[],user:{gold:{prev:previousGold,cur:gold}},
      target:{inst_id:targetId,overcome_cnt},removed_card:ids,removed_item}};
}
