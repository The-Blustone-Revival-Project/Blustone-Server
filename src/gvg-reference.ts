import {gvgScheduleTimes,type GvgScheduleTimes} from "./gvg-phase.js";

export const GVG_REWARD_SCALARS=Object.freeze(["vip_exp","honor","free_iap","paid_iap","ap","bp","gold"] as const);
export const GVG_REWARD_LISTS=Object.freeze(["card_list","item_list","skin_list"] as const);
export interface GvgRewardRegistry {cards:ReadonlySet<string>;items:ReadonlySet<string>;skins:ReadonlySet<string>}
export type GvgRewardPreview=Record<typeof GVG_REWARD_SCALARS[number],number>&Record<typeof GVG_REWARD_LISTS[number],string>;
export interface GvgRewardEntry {id:string;qty:number}
export interface GvgCamp {min_cp:number;camp_id:string;name?:string;link_camp:string}
export interface GvgReference {
  gvg:GvgScheduleTimes&{id:string;min_entry_cnt:number};
  reward:(GvgRewardPreview&{min_cp:number;max_cp:number})[];
  inf_reward:GvgRewardPreview[];
  point:{id:number;val:number}[];
  camp:GvgCamp[];
}
const emptyRegistry:GvgRewardRegistry={cards:new Set(),items:new Set(),skins:new Set()};
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)||Object.keys(raw).some(key=>!keys.includes(key)))
    throw new TypeError("Unsupported GvG reference object/field");
  return raw as Record<string,unknown>;
}
function text(raw:unknown,label:string,nonempty=false):string {
  if(typeof raw!=="string"||(nonempty&&!raw)||Buffer.from(raw,"utf8").toString("utf8")!==raw)
    throw new TypeError(`GvG ${label} requires lossless${nonempty?" nonempty":""} string`);
  return raw;
}
function integer(raw:unknown,label:string,signed=false):number {
  if(typeof raw!=="number"||!Number.isInteger(raw)||raw<(signed?-0x8000_0000:0)||raw>(signed?0x7fff_ffff:0xffff_ffff))
    throw new TypeError(`GvG ${label} requires exact ${signed?"int32":"uint32"}`);
  return raw;
}
function array(raw:unknown,label:string):unknown[] {
  if(!Array.isArray(raw)) throw new TypeError(`GvG ${label} requires explicit array`);
  return raw;
}
/** SRREWARD_INFO.parse consumes JSON STRING [{id,qty}], unlike dump's direct
 * arrays/ref_id. Empty string and literal[] both mean empty, preserved by caller.
 * Known-ID joins/unique entries are local admission, not original reward laws. */
export function gvgRewardEntries(raw:unknown,knownIds:ReadonlySet<string>):GvgRewardEntry[] {
  const encoded=text(raw,"reward list");
  if(encoded==="") return [];
  const seen=new Set<string>();
  return array(JSON.parse(encoded),"encoded reward list").map(value=>{
    const row=object(value,["id","qty"]),id=text(row.id,"reward identity",true);
    if(seen.has(id)||!knownIds.has(id)) throw new TypeError("Duplicate or unknown GvG reward identity");
    seen.add(id);return {id,qty:integer(row.qty,"reward quantity")};
  });
}
/** CAMP.link_camp is always a JSON STRING array of strict strings. No empty-
 * string shortcut or inferred undirected edge is introduced. */
export function gvgCampLinks(raw:unknown):string[] {
  const seen=new Set<string>();
  return array(JSON.parse(text(raw,"camp links")),"encoded camp links").map(value=>{
    const id=text(value,"linked camp",true);
    if(seen.has(id)) throw new TypeError("Duplicate GvG camp link");
    seen.add(id);return id;
  });
}
function preview(raw:unknown,registry:GvgRewardRegistry,bounds=false):GvgRewardPreview&{min_cp?:number;max_cp?:number} {
  const row=object(raw,[...GVG_REWARD_SCALARS,...GVG_REWARD_LISTS,...(bounds?["min_cp","max_cp"]:[])]);
  const scalars=Object.fromEntries(GVG_REWARD_SCALARS.map(key=>[key,integer(row[key],key)]));
  const lists=Object.fromEntries(GVG_REWARD_LISTS.map((key,index)=>{
    const encoded=text(row[key],key);
    gvgRewardEntries(encoded,[registry.cards,registry.items,registry.skins][index]);
    return [key,encoded];
  }));
  return {...scalars,...lists,...(bounds?{min_cp:integer(row.min_cp,"minimum CP",true),max_cp:integer(row.max_cp,"maximum CP",true)}:{})} as GvgRewardPreview;
}
/** PURE complete supplied wire decoder, never a default season/producer or UI
 * safety guarantee. Tables are siblings of gvg. Every numeric/list field must
 * be supplied; strict nonempty IDs, known rewards and coherent link graph are
 * local admission. No schedule sorting, reward generation or participation.
 * Empty collections are inspected offline only, not declared scene-safe. */
export function parseGvgReference(raw:unknown,registry:GvgRewardRegistry=emptyRegistry):GvgReference {
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new TypeError("Expected GvG envelope");
  const envelope=raw as Record<string,unknown>;
  if(envelope.result_code!==1) throw new TypeError("GvG reference requires result1");
  const data=object(envelope.ret_data,["gvg","reward","inf_reward","point","camp"]);
  const schedule=object(data.gvg,["id","min_entry_cnt","teaser_begin_dtm","register_begin_dtm","matching_begin_dtm",
    "deploy_begin_dtm","combat_begin_dtm","calc_begin_dtm","result_begin_dtm","finish_dtm","next_gvg_dtm"]);
  const gvg={...gvgScheduleTimes(schedule),id:text(schedule.id,"season identity",true),min_entry_cnt:integer(schedule.min_entry_cnt,"minimum entry count")};
  const reward=array(data.reward,"reward").map(row=>preview(row,registry,true)) as GvgReference["reward"];
  const inf=array(data.inf_reward,"infinite reward");
  if(inf.length>2) throw new TypeError("GvG infinite reward exceeds native two slots");
  const inf_reward=inf.map(row=>preview(row,registry)) as GvgRewardPreview[];
  const points=new Set<number>();
  const point=array(data.point,"point").map(value=>{
    const row=object(value,["id","val"]),id=integer(row.id,"point identity",true);
    if(points.has(id)) throw new TypeError("Duplicate GvG point identity");
    points.add(id);return {id,val:integer(row.val,"point value",true)};
  });
  const camps=new Set<string>();
  const camp=array(data.camp,"camp").map(value=>{
    const row=object(value,["min_cp","camp_id","name","link_camp"]),camp_id=text(row.camp_id,"camp identity",true);
    if(camps.has(camp_id)) throw new TypeError("Duplicate GvG camp identity");
    camps.add(camp_id);
    const link_camp=text(row.link_camp,"camp links");gvgCampLinks(link_camp);
    return {min_cp:integer(row.min_cp,"camp minimum CP"),camp_id,
      ...(Object.hasOwn(row,"name")?{name:text(row.name,"camp name")}:{}),link_camp};
  });
  for(const row of camp) for(const id of gvgCampLinks(row.link_camp))
    if(id===row.camp_id||!camps.has(id)) throw new TypeError("Unknown or self GvG camp link");
  return {gvg,reward,inf_reward,point,camp};
}
