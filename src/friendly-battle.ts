import {starterReference,starterBookReference} from "./bootstrap.js";
import {arenaProfile} from "./arena.js";
import {normalizeArenaComments,type ArenaComments} from "./arena-comments.js";
import {CARD_INSTANCE_LIMIT} from "./card-instance-namespace.js";
import {parseHunterEquipment} from "./hunter-equipment.js";
import type {LocalGameState,LocalCardInstance} from "./game.js";
import {parseGemInstances,type GemReference} from "./gem-instances.js";
import {friendlyBattleGems} from "./friendly-battle-gems.js";

export const FRIENDLY_MIRROR_SERIAL_BASE=9_100_000_001;
export interface FriendlyBattlePeer {pvid:number;nickname:string;profile_status:string;arenaComments?:ArenaComments}
const U32=0xffff_ffff,U64=0xffff_ffff_ffff_ffffn;
const numbers=["rank","rank_up_cnt","overcome_cnt","exp","lock","regdate","mirage_remain_hp","equipment_exp","awk_step","awk_overcome",
  "weapon_rank","weapon_level","armor_rank","armor_level","accessory_rank","accessory_level",
  "skill_1_level","skill_2_level","skill_3_level","skill_4_level","skill_5_level","skin_total_count"] as const;
const strings=["ref_id","skin_ref_id","skin_id"] as const;
const record=(raw:unknown):raw is Record<string,unknown>=>!!raw&&typeof raw==="object"&&!Array.isArray(raw)&&
  (Object.getPrototypeOf(raw)===Object.prototype||Object.getPrototypeOf(raw)===null);
function field(row:unknown,key:string):unknown {
  if(!record(row))throw new TypeError("Friendly projection requires plain data records");
  const descriptor=Object.getOwnPropertyDescriptor(row,key);
  if(!descriptor?.enumerable||!Object.hasOwn(descriptor,"value"))throw new TypeError("Friendly projection requires own data fields");
  return descriptor.value;
}
function uint(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>U32)throw new TypeError("Friendly projection requires uint32 fields");return raw;
}
function text(raw:unknown,nonempty=false):string {
  if(typeof raw!=="string"||nonempty&&!raw||Buffer.from(raw,"utf8").toString("utf8")!==raw||/[\u0000-\u001f]/.test(raw))
    throw new TypeError("Friendly projection requires lossless text");return raw;
}
export function friendlyTargetPvid(raw:unknown):number {
  const value=typeof raw==="number"?raw:typeof raw==="string"&&/^[1-9]\d*$/.test(raw)&&raw.length<=10?Number(raw):NaN;
  if(!Number.isSafeInteger(value)||value<=0||value>U32)throw new TypeError("Friendly target requires an exact positive uint32 identity");return value;
}
function ownedId(raw:unknown):number {
  if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<=0||raw>=CARD_INSTANCE_LIMIT)throw new TypeError("Friendly owned Hunter identity is outside the owned namespace");return raw;
}
function occupiedId(raw:unknown):string {
  const value=typeof raw==="number"&&Number.isSafeInteger(raw)&&raw>0?String(raw):typeof raw==="string"?raw:"";
  if(value.length>20||!/^[1-9]\d*$/.test(value)||BigInt(value)>U64)throw new TypeError("Friendly occupied serial must be an exact positive uint64");return value;
}
function neutralCollectionEffects() {
  const keys=["atk","def","hp","crt_chance","crt_dmg"];
  if(!starterBookReference.length)throw new TypeError("Friendly collection reference is unavailable");
  for(const row of starterBookReference) {
    let effect:unknown;try{effect=JSON.parse(row.effect);}catch{throw new TypeError("Friendly collection reference is malformed");}
    if(!record(effect)||Object.keys(effect).sort().join(",")!==[...keys].sort().join(",")||keys.some(key=>effect[key]!==0))
      throw new TypeError("Nonneutral collection effects require a supported friendly projection");
  }
}
function cardProjection(card:LocalCardInstance,serial:number,knownRefs:ReadonlySet<string>) {
  const result:Record<string,string|number>={inst_id:serial};
  for(const key of strings)result[key]=text(field(card,key),key==="ref_id");
  for(const key of numbers)result[key]=uint(field(card,key));
  if(!result.rank||result.lock!==0&&result.lock!==1)throw new TypeError("Malformed friendly Hunter grade/lock");
  const reference=starterReference.find(row=>row.base.id===result.ref_id);
  if(!knownRefs.has(String(result.ref_id))||!reference||reference.base.is_source!==0||
    !reference.stat.some(row=>row.rank===result.rank&&row.awk_step===result.awk_step))
    throw new TypeError("Friendly Hunter ordinary rank/awakening reference is unavailable");
  const equipment=reference.equipment.length?parseHunterEquipment(reference.equipment):[];
  for(const [slot,name] of ["weapon","armor","accessory"].entries()) {
    const rank=Number(result[`${name}_rank`]),level=Number(result[`${name}_level`]);
    if(rank<1||level<1||(!equipment.length&&(rank!==1||level!==1))||
      equipment.length&&!equipment.some(row=>row.slot===slot&&row.rank===rank&&row.awk_step===result.awk_step))
      throw new TypeError("Friendly Hunter equipment reference is unavailable");
  }
  // Whitelist the complete current native instance DTO. Unknown private
  // per-card metadata is never copied across accounts or read through getters.
  return result;
}

function selectedDeck(game:LocalGameState,type:4|5,knownRefs:ReadonlySet<string>) {
  if(!Array.isArray(game.starter_cards)||!Array.isArray(game.recruited_cards)||!Array.isArray(game.decks))throw new TypeError("Friendly owned roster/decks required");
  const owned=new Map<number,LocalCardInstance>();
  for(const card of [...game.starter_cards,...game.recruited_cards]) {
    const id=ownedId(field(card,"inst_id")),ref=text(field(card,"ref_id"),true);
    if(owned.has(id)||!knownRefs.has(ref))throw new TypeError("Friendly owned roster is duplicated or unpublished");owned.set(id,card);
  }
  if(!owned.has(ownedId(game.leader_inst_id)))throw new TypeError("Friendly owned leader is unavailable");
  const decks=game.decks.filter(row=>field(row,"type")===type);
  if(decks.length!==1)throw new TypeError(`An explicit owned deck${type} is required`);
  const members=field(decks[0],"list");
  if(!Array.isArray(members)||members.length!==5||Array.from({length:5},(_,index)=>!Object.hasOwn(members,index)).some(Boolean))
    throw new TypeError("Friendly party requires exactly five dense slots");
  const selected=members.filter(id=>id!==0).map(ownedId);
  if(!selected.length||new Set(selected).size!==selected.length||selected.some(id=>!owned.has(id)))throw new TypeError("Friendly party is empty, duplicated or unowned");
  return {owned,members:members as number[],selected};
}

/** Native own party is explicit deck4. Do not allocate/copy a missing deck.
 * Validate mounted effects without changing the actor's existing serials. */
export function friendlyBattleAttackReady(game:LocalGameState,knownRefs:ReadonlySet<string>,gemReferences:readonly GemReference[]=[]) {
  neutralCollectionEffects();const {owned,selected}=selectedDeck(game,4,knownRefs);
  for(const id of selected)cardProjection(owned.get(id)!,id,knownRefs);
  parseGemInstances({result_code:1,ret_data:game.owned_gems??[]},gemReferences,new Set([...owned.keys()].map(String)),
    (id,slot)=>Number(owned.get(Number(id))?.[`${["weapon","armor","accessory"][slot]}_rank`]));
  uint(game.exp);uint(game.vip_exp);
}

/** Optional LOCAL defense selection and transient serials. Native request
 * does not choose a target deck: explicit saved type5 is local admission.
 * Rank0 and neutral current book/chain effects are local presentation policy;
 * no AI, ownership mutation, fee, standings or battle result is generated. */
export function ownedDefenseRival(peer:FriendlyBattlePeer,game:LocalGameState,knownRefs:ReadonlySet<string>,
    occupiedIds:ReadonlySet<number|string>,gemReferences:readonly GemReference[]=[]){
  const pvid=field(peer,"pvid");
  if(typeof pvid!=="number"||!Number.isSafeInteger(pvid)||pvid<=0)throw new TypeError("Owned defense requires a positive exact safe uint64 identity");
  const nickname=text(field(peer,"nickname"),true),status=text(field(peer,"profile_status"));
  const rawComments=Object.hasOwn(peer,"arenaComments")?field(peer,"arenaComments"):undefined;
  const comments=rawComments===undefined?undefined:normalizeArenaComments(rawComments);
  neutralCollectionEffects();
  const {owned,members,selected}=selectedDeck(game,5,knownRefs);
  const occupied=new Set([...occupiedIds].map(occupiedId));
  for(const id of owned.keys())occupied.add(String(id));
  const cardMirrors=new Map<string,number>(),deck:Record<string,Record<string,string|number>>={};
  members.forEach((id,index)=>{
    if(id===0){deck[`inst_${index+1}`]={inst_id:0};return;}
    const serial=FRIENDLY_MIRROR_SERIAL_BASE+index;
    if(occupied.has(String(serial)))throw new TypeError("Friendly transient card serial collision");occupied.add(String(serial));
    cardMirrors.set(String(id),serial);deck[`inst_${index+1}`]=cardProjection(owned.get(id)!,serial,knownRefs);
  });
  const leader=selected.includes(game.leader_inst_id)?owned.get(game.leader_inst_id)!:owned.get(selected[0])!;
  const battle=arenaProfile(pvid,game.arena,comments,0);
  for(const key of ["rank","season_no","weekly_no","league_level","rating_point","league_win","win","lose"] as const)uint(battle[key]);
  for(const key of ["start_message","win_message","lose_message"] as const)text(battle[key]);
  if(battle.league_level<1||battle.league_level>6||battle.league_win>6)throw new TypeError("Malformed friendly Arena counters");
  const gem=friendlyBattleGems(game,gemReferences,cardMirrors,new Set([...occupiedIds,...occupied]));
  return {nickname,thumbnail:text(field(leader,"ref_id"),true),profile_status:status,country_code:"",status:1,
    user_exp:uint(game.exp),vip_exp:uint(game.vip_exp),chain_bonus:[],card_book:{atk:0,def:0,hp:0,crt_dmg:0,crt_chance:0},battle,deck,gem};
}

/** Preserve the separately supported friendly-request U32 admission. The
 * shared native Defender DTO itself accepts full64 peer IDs; global ranking
 * uses the exact safe numeric subset through ownedDefenseRival directly. */
export function friendlyBattleRival(peer:FriendlyBattlePeer,game:LocalGameState,knownRefs:ReadonlySet<string>,
    occupiedIds:ReadonlySet<number|string>,gemReferences:readonly GemReference[]=[]) {
  friendlyTargetPvid(field(peer,"pvid"));
  return ownedDefenseRival(peer,game,knownRefs,occupiedIds,gemReferences);
}
