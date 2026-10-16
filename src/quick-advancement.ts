import {mergeCardBook,type LocalGameState} from "./game.js";
export const QUICK_ADVANCEMENT_TICKETS={3:"SU1",4:"SU2"} as const;
export function quickAdvancementMode(raw:unknown):"disabled"|"local-owned-tickets" {
  if(raw!=="disabled"&&raw!=="local-owned-tickets")throw new TypeError("Unknown quick advancement mode");return raw;
}
export function quickAdvancementReferences() {
  return {item:["SU1","SU2"].map(id=>({id,name:"Advancement Ticket",desc:"Advances an eligible Hunter.",rank:1,use_type:0,effect:"",thumbnail_id:"",sell_price:0,collect_qty:0})),global_item:[]};
}
function id(raw:unknown):string {
  const value=typeof raw==="number"&&Number.isSafeInteger(raw)&&raw>0?String(raw):typeof raw==="string"?raw:"";
  if(value.length>20||!/^[1-9]\d*$/.test(value)||BigInt(value)>0xffff_ffff_ffff_ffffn)throw new TypeError("Exact positive owned identity required");return value;
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)throw new TypeError("Quick advancement requires uint32 state");return raw;
}
function numericId(value:string):unknown {
  if(BigInt(value)<=BigInt(Number.MAX_SAFE_INTEGER))return Number(value);
  const codec=JSON as typeof JSON&{rawJSON?:(raw:string)=>unknown};if(!codec.rawJSON)throw new TypeError("Exact numeric ticket serialization unavailable");return codec.rawJSON(value);
}
interface Reference {base:{id:string;is_main:number};stat:readonly {rank:number;awk_step:number}[]}
/** LOCAL completed-promotion policy: one owned ticket, next grade/level1,
 * reset credited count. Native preview/receipt grammar is recovered; original
 * award counter and IAP issuance are not. Initial popup timers/competitors
 * are not delivery conditions for an already owned recovery ticket. */
export function planQuickAdvancement(payload:Record<string,unknown>,game:LocalGameState,references:readonly Reference[],levels:readonly {rank:number;level:number;min_exp:number}[]) {
  if(payload.qty!==1&&payload.qty!=="1")throw new TypeError("Quick advancement consumes exactly one ticket");
  if(["ref_id","target_ref_id","rank","rank_up_cnt","exp","price","gold","added","effect","entitlement"].some(key=>Object.hasOwn(payload,key)))throw new TypeError("Unsupported quick advancement fields");
  const source=id(payload.inst_id),targetId=id(payload.target_id);
  if(BigInt(targetId)>BigInt(Number.MAX_SAFE_INTEGER))throw new TypeError("Owned Hunter identity exceeds supported model");
  const owned=[...game.starter_cards,...game.recruited_cards],matches=owned.filter(row=>String(row.inst_id)===targetId);
  if(matches.length!==1)throw new TypeError("Unambiguous owned target Hunter required");const target=matches[0];
  const rank=uint(target.rank),reference=references.find(row=>row.base.id===target.ref_id);
  if((rank!==3&&rank!==4)||target.awk_step!==0||!reference||reference.base.is_main!==0||reference.stat[0]?.rank!==rank||reference.stat[0]?.awk_step!==0)
    throw new TypeError("Ordinary natural three- or four-star target required");
  if(!reference.stat.some(row=>row.rank===rank+1&&row.awk_step===0))throw new TypeError("Next-grade target stat reference unavailable");
  const nextLevels=levels.filter(row=>row.rank===rank+1&&row.level===1);
  if(nextLevels.length!==1)throw new TypeError("Unambiguous next-grade level1 reference required");
  const exp=uint(nextLevels[0].min_exp),previousExp=uint(target.exp),credited=uint(target.rank_up_cnt);
  if(credited>=rank)throw new TypeError("Unsupported target credited progress");
  const seen=new Set<string>();let index=-1;
  game.items.forEach((row,i)=>{const key=id(row.inst_id);if(seen.has(key))throw new TypeError("Duplicate owned item identity");seen.add(key);if(key===source)index=i;});
  const item=game.items[index];
  if(!item||item.ref_id!==QUICK_ADVANCEMENT_TICKETS[rank]||item.lock!==0||uint(item.qty)<1)throw new TypeError("Unlocked funded matching advancement ticket required");
  const next={rank:rank+1,rank_up_cnt:0,exp},book=mergeCardBook(game.card_book,[{...target,...next}]);
  const receipt={dailyquest_min_stage:"",daily_quest:[],linear_quest:[],achievement:[],
    consumed_item_list:[{inst_id:numericId(source),qty:1}],card:{target_inst:{inst_id:Number(targetId),rank:{prev:rank,cur:next.rank},
      rank_up_cnt:{prev:credited,cur:0},exp:{prev:previousExp,cur:exp}}}};
  return {target,index,remaining:item.qty-1,next,book,receipt};
}
