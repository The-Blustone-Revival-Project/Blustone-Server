/** Complete supplied native GetInst snapshot decoder. This is battle metadata,
 * not owned Hunter inventory, wallet data, enrollment or deployment authority. */
export const GVG_CARD_STATS=Object.freeze(["hp","atk","def","spd","crt_chance","crt_dmg","penetration","block_chance",
  "block_dec_dmg","attr_enhance","attr_resist","hp_regen","hp_up","atk_up","def_up"] as const);
export interface GvgCard extends Record<typeof GVG_CARD_STATS[number],string> {
  ref_id:string;skin_id:string;skill_level:string;level:number;overcome_cnt:number;cp:number;
  awk_step:number;awk_overcome:number;rank:number;enemy_camp_id?:string;remain_hp?:number;
}
export interface GvgInstance {
  enemy_guild_id:number;inf_gvg:number;auto_register:number;
  user:{guild_id:number;total_cp:number;offense_point:number;defense_point:number;commander:string};
  card_list:GvgCard[];
  deployed_list:{camp_id:string;order:string;card_1:string;card_2:string;card_3:string;card_4:string}[];
}
function object(raw:unknown,required:readonly string[],optional:readonly string[]=[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw)))
    throw new TypeError("GvG instance requires plain JSON object");
  const row=raw as Record<string,unknown>;
  if(required.some(key=>!Object.hasOwn(row,key))||Reflect.ownKeys(row).some(key=>typeof key!=="string"||
    ![...required,...optional].includes(key)||!Object.getOwnPropertyDescriptor(row,key)?.enumerable||
    !Object.hasOwn(Object.getOwnPropertyDescriptor(row,key)!,"value")))
    throw new TypeError("Incomplete or unsupported GvG instance fields");
  return row;
}
function text(raw:unknown):string {
  if(typeof raw!=="string"||Buffer.from(raw,"utf8").toString("utf8")!==raw)throw new TypeError("GvG instance requires lossless string");
  return raw;
}
function integer(raw:unknown,signed=false):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<(signed?-0x8000_0000:0)||raw>(signed?0x7fff_ffff:0xffff_ffff))
    throw new TypeError(`GvG instance requires exact ${signed?"int32":"uint32"}`);
  return raw;
}
function byte(raw:unknown):number {
  const value=integer(raw);if(value>255)throw new TypeError("GvG instance requires explicit byte flag");return value;
}
function serial(raw:unknown):string {
  const value=typeof raw==="string"?raw:typeof raw==="number"&&Number.isSafeInteger(raw)?String(raw):"";
  if(!/^(?:0|[1-9]\d*)$/.test(value)||BigInt(value)>0xffff_ffff_ffff_ffffn)throw new TypeError("GvG commander requires exact uint64 identity");
  return value;
}
function array(raw:unknown):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||
    Reflect.ownKeys(raw).some(key=>key!=="length"&&(typeof key!=="string"||!/^(?:0|[1-9]\d*)$/.test(key)||Number(key)>=raw.length)))
    throw new TypeError("GvG instance requires JSON array");
  for(let i=0;i<raw.length;i++)if(!Object.hasOwn(raw,i)||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,String(i))!,"value"))
    throw new TypeError("GvG instance requires dense data array");
  return raw;
}
/** Native skill_level is a JSON STRING array, assigning ordinal skill keys1..n.
 * No default five levels, skill availability, cap or training law is inferred. */
export function gvgCardSkillLevels(raw:unknown):number[] {
  return array(JSON.parse(text(raw))).map(value=>integer(value));
}
function card(raw:unknown):GvgCard {
  const row=object(raw,["ref_id","skin_id","skill_level","level","overcome_cnt","cp","awk_step","awk_overcome","rank",...GVG_CARD_STATS],
    ["enemy_camp_id","remain_hp"]);
  const stats=Object.fromEntries(GVG_CARD_STATS.map(key=>{
    const value=text(row[key]);
    // Finite decimal float32 is a supported local admission subset. Preserve
    // the supplied wire string; do not scale, balance or calculate a stat.
    if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())||!Number.isFinite(Math.fround(Number(value))))
      throw new TypeError("GvG card stat requires finite decimal float32 string");
    return [key,value];
  })) as Record<typeof GVG_CARD_STATS[number],string>;
  const skill_level=text(row.skill_level);gvgCardSkillLevels(skill_level);
  return {...stats,ref_id:text(row.ref_id),skin_id:text(row.skin_id),skill_level,
    level:integer(row.level,true),overcome_cnt:integer(row.overcome_cnt,true),cp:integer(row.cp,true),
    awk_step:integer(row.awk_step),awk_overcome:integer(row.awk_overcome),rank:integer(row.rank),
    ...(Object.hasOwn(row,"enemy_camp_id")?{enemy_camp_id:text(row.enemy_camp_id)}:{}),
    ...(Object.hasOwn(row,"remain_hp")?{remain_hp:integer(row.remain_hp,true)}:{})};
}
/** Missing top-level/user/collection fields refuse rather than becoming an
 * authoritative unregistered snapshot. Explicit empty collections are retained
 * for offline inspection only, not declared safe for a live scene. */
export function parseGvgInstance(raw:unknown):GvgInstance {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||![Object.prototype,null].includes(Object.getPrototypeOf(raw))||
    !["result_code","ret_data"].every(key=>Object.hasOwn(raw,key))||
    Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!Object.getOwnPropertyDescriptor(raw,key)?.enumerable||
      !Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))
    throw new TypeError("GvG instance envelope requires own JSON data fields");
  const envelope=raw as Record<string,unknown>;
  if(envelope.result_code!==1)
    throw new TypeError("GvG instance requires successful envelope");
  const row=object(envelope.ret_data,["enemy_guild_id","inf_gvg","auto_register","user","card_list","deployed_list"]);
  const user=object(row.user,["guild_id","total_cp","offense_point","defense_point","commander"]);
  const keys=["camp_id","order","card_1","card_2","card_3","card_4"] as const;
  return {enemy_guild_id:integer(row.enemy_guild_id),inf_gvg:byte(row.inf_gvg),auto_register:byte(row.auto_register),
    user:{guild_id:integer(user.guild_id),total_cp:integer(user.total_cp),offense_point:integer(user.offense_point),
      defense_point:integer(user.defense_point),commander:serial(user.commander)},
    card_list:array(row.card_list).map(card),deployed_list:array(row.deployed_list).map(value=>{
      const deck=object(value,keys);return Object.fromEntries(keys.map(key=>[key,text(deck[key])])) as GvgInstance["deployed_list"][number];
    })};
}
/** Capture-text entry preserves full64 commander tokens before JS rounding.
 * Decimal strings in the model are exact identity storage, not a native wire
 * string-conversion emulation. No player/account join or mutation occurs. */
export function parseGvgInstanceJson(source:string):GvgInstance {
  return parseGvgInstance(JSON.parse(source,function(key,value,context?:{source:string}){
    if(key==="commander"&&typeof value==="number"&&!Number.isSafeInteger(value)) {
      if(!context?.source||!/^(?:0|[1-9]\d*)$/.test(context.source))throw new TypeError("Unrecoverable GvG commander token");
      return context.source;
    }
    return value;
  }));
}
