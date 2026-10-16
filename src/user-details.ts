import type {LocalGameState,LocalCardInstance} from "./game.js";
import {earnedStageOrders} from "./progression.js";

export const LOCAL_USER_DETAIL_MAX=50;
/** Request identities are numeric U64 tokens, but this receiver narrows the
 * returned pvid to U32. Validate exact tokens BEFORE applying that bound. */
export function parseUserDetailTargets(raw:unknown):number[] {
  let tokens:string[];
  if(typeof raw==="string") {
    if(raw.length>32768||!(/^[ \t\r\n]*\[[ \t\r\n]*(?:[1-9]\d*[ \t\r\n]*(?:,[ \t\r\n]*[1-9]\d*[ \t\r\n]*)*)?\][ \t\r\n]*$/).test(raw))
      throw new TypeError("User detail requires a JSON numeric identity list");
    const body=raw.trim().slice(1,-1).trim();tokens=body?body.split(",").map(value=>value.trim()):[];
  }else if(Array.isArray(raw)&&raw.length<=LOCAL_USER_DETAIL_MAX) {
    tokens=Array.from(raw,value=>{
      if(typeof value!=="number"||!Number.isSafeInteger(value)||value<=0)throw new TypeError("User detail requires exact numeric identities");return String(value);
    });
  }else throw new TypeError("User detail requires a bounded identity list");
  if(tokens.length>LOCAL_USER_DETAIL_MAX||tokens.some(id=>BigInt(id)>0xffff_ffffn))
    throw new TypeError("User detail response pvid exceeds uint32/local batch bound");
  return [...new Set(tokens)].map(Number);
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)throw new TypeError("User detail progression requires uint32");return raw;
}
function text(raw:unknown,nonempty=false):string {
  if(typeof raw!=="string"||nonempty&&!raw||Buffer.from(raw,"utf8").toString("utf8")!==raw)throw new TypeError("User detail requires lossless reference/skin text");return raw;
}
function cardId(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<=0)throw new TypeError("User detail owned card requires exact positive identity");return raw;
}
const cardFields=["rank","rank_up_cnt","awk_step","overcome_cnt","awk_overcome","exp",
  "skill_1_level","skill_2_level","skill_3_level","skill_4_level","skill_5_level"] as const;

/** Read-only actual owned ordinary party. Stage placement/fallback and neutral
 * awake/history/messages are LOCAL display policies, never grants or original
 * account history. This DTO is not inventory, equipment or Gem projection. */
export function ownedUserDetail(pvid:number,game:LocalGameState,stageOrder:readonly string[],knownRefs:ReadonlySet<string>):Record<string,number|string> {
  if(!uint(pvid))throw new TypeError("User detail pvid must be positive");
  if(!stageOrder.length||new Set(stageOrder).size!==stageOrder.length||stageOrder.some(id=>typeof id!=="string"||!id.startsWith("n_")||text(id)!==id))
    throw new TypeError("User detail requires unique published ordinary stage order");
  const owned=new Map<number,LocalCardInstance>();
  for(const card of [...game.starter_cards,...game.recruited_cards]) {
    if(!card||typeof card!=="object")throw new TypeError("User detail owned card is unavailable");
    const id=cardId(card.inst_id),ref=text(card.ref_id,true);
    if(owned.has(id)||!knownRefs.has(ref))throw new TypeError("User detail duplicate owned identity or unpublished reference");owned.set(id,card);
  }
  const leader=owned.get(cardId(game.leader_inst_id)),decks=game.decks.filter(deck=>deck.type===1);
  if(!leader||decks.length!==1||!Array.isArray(decks[0].list)||decks[0].list.length<1||decks[0].list.length>5)
    throw new TypeError("User detail requires an actual owned leader and ordinary party");
  const members=decks[0].list,nonzero=members.filter(id=>id!==0);
  if(!nonzero.length||new Set(nonzero).size!==nonzero.length||nonzero.some(id=>!owned.has(cardId(id))))
    throw new TypeError("User detail ordinary party is empty/duplicated/unowned");
  let stage=stageOrder[0];for(const id of stageOrder)if(earnedStageOrders(game,id).length)stage=id;
  const result:Record<string,number|string>={pvid,group_exp:uint(game.exp),vip_exp:uint(game.vip_exp),
    league_level:uint(game.arena.league_level),rating_point:uint(game.arena.rating_point),awake:0,
    stage_id:stage,prev_rank:0,win_message:"",lose_message:""};
  const emit=(suffix:string,card:LocalCardInstance)=>{
    result[`inst_id_${suffix}`]=cardId(card.inst_id);result[`ref_id_${suffix}`]=text(card.ref_id,true);
    result[`skin_ref_id_${suffix}`]=text(card.skin_ref_id);
    for(const field of cardFields)result[`${field}_${suffix}`]=uint(card[field]);
  };
  emit("leader",leader);
  for(let slot=1;slot<=5;slot++) {
    const id=members[slot-1]??0;
    if(id===0)result[`inst_id_${slot}`]=0;else emit(String(slot),owned.get(id)!);
  }
  return result;
}
