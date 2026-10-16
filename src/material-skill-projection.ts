import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {isDeepStrictEqual} from "node:util";
import {repositoryPath} from "./paths.js";
import {MATERIAL_SKILL_SOURCE_PINS,selectMaterialEpisodeGraph} from "./material-skill-evidence.js";

export const MATERIAL_SKILL_PROFILE=process.env.BLUSTONE_MATERIAL_SKILL_PROFILE??"neutral";
if(!["neutral","episode-indexed-projection"].includes(MATERIAL_SKILL_PROFILE))
  throw new TypeError("Unknown material skill profile");

/** Explicit LOCAL adoption of these exact encounter variants. Neither matching
 * cost/art nor the retained graph proves an original ordinary skill table. */
export const MATERIAL_SKILL_DONORS=Object.freeze([
  Object.freeze({refId:"009",sourceIndex:13,actorId:"EVCB0201_009"}),
  Object.freeze({refId:"010",sourceIndex:130,actorId:"CB0302_010_1"}),
  Object.freeze({refId:"012",sourceIndex:143,actorId:"CB0601_012_1"}),
  Object.freeze({refId:"013",sourceIndex:4,actorId:"EVCB0201_013"}),
  Object.freeze({refId:"017",sourceIndex:150,actorId:"CB0401_017_1"}),
  Object.freeze({refId:"036",sourceIndex:68,actorId:"CB0601_036_1"}),
  Object.freeze({refId:"040",sourceIndex:70,actorId:"EVCB0301_040"}),
  Object.freeze({refId:"049",sourceIndex:93,actorId:"CB0202_049_1"}),
]);
interface EpisodeEffect {
  effect_type:number;target_type:number;target_stat:number;
  refer_target_type:number;refer_target_stat:number;
  base_number:number;duration:number;interval:number;
}
interface EpisodeSkill {type:number;target_rank:number;cost?:number;cool_time?:number;crt_chance?:number;effect:EpisodeEffect[]}
export interface MaterialWireEffect extends EpisodeEffect {
  serial:number;up_number:number;duration_up:number;value_calc:string;effect_desc:string[];
}
export interface MaterialWireSkill {
  target_rank:number;type:number;name:string;desc:string;cut_in_id:string;icon_id:string;
  cool_time:number;cost:number;crt_chance:number;effect:MaterialWireEffect[];
}
interface Projection {
  refId:string;sourceIndex:number;actorId:string;role:number;attr:number;
  skills:EpisodeSkill[];ordinaryRageCost:number;
}

/** Public pure validation also makes changed-source refusal testable without
 * ever editing a retained original. Raw byte pins deliberately include EOF. */
export function validateMaterialSkillSources(episodeBytes:Buffer,symbolicBytes:Buffer):Projection[] {
  const hash=(bytes:Buffer)=>createHash("sha256").update(bytes).digest("hex");
  if(hash(episodeBytes)!==MATERIAL_SKILL_SOURCE_PINS.episode.sha256 || hash(symbolicBytes)!==MATERIAL_SKILL_SOURCE_PINS.symbolic.sha256)
    throw new TypeError("Material skill projection source pin mismatch");
  const actors=JSON.parse(episodeBytes.toString("utf8")),symbolic=JSON.parse(symbolicBytes.toString("utf8"));
  return MATERIAL_SKILL_DONORS.map(donor=>{
    const selected=selectMaterialEpisodeGraph(donor.refId,donor.sourceIndex),actor=actors[donor.sourceIndex];
    const text=symbolic[`${donor.refId}|1|0`]?.EN;
    const match=typeof text==="string"?/^Uses (\d+) Rage Gauge when using a skill\.$/.exec(text):null;
    if(!match || !selected.ordinaryCostAgreement || Number(match[1])!==selected.ordinaryRageCost ||
      selected.source.actorId!==donor.actorId || actor.id!==donor.actorId || actor.ref_id!==donor.refId || actor.res_id!==`C${donor.refId}` ||
      actor.role!==selected.source.role || actor.attr!==selected.source.attr || !isDeepStrictEqual(actor.skill,selected.source.skill))
      throw new TypeError("Material skill donor identity, original cost or graph mismatch");
    const skills=structuredClone(actor.skill) as EpisodeSkill[],seen=new Set<number>();
    for(const skill of skills) {
      if(!Number.isInteger(skill.type)||skill.type<1||skill.type>5||seen.has(skill.type)||
        !Number.isInteger(skill.target_rank)||skill.target_rank<1||skill.target_rank>6||!Array.isArray(skill.effect))
        throw new TypeError("Invalid indexed material skill slot");
      seen.add(skill.type);
      for(const effect of skill.effect)if(Object.values(effect).some(value=>typeof value!=="number"||!Number.isFinite(value)))
        throw new TypeError("Invalid indexed material skill effect");
    }
    if(skills.find(skill=>skill.type===1)?.cost!==selected.ordinaryRageCost)
      throw new TypeError("Material skill active cost does not match ordinary literal");
    return {...donor,role:actor.role,attr:actor.attr,skills,ordinaryRageCost:selected.ordinaryRageCost};
  });
}

const selected=MATERIAL_SKILL_PROFILE==="episode-indexed-projection"
  ?validateMaterialSkillSources(readFileSync(repositoryPath(MATERIAL_SKILL_SOURCE_PINS.episode.path)),
    readFileSync(repositoryPath("resources/reference/episodes/SKILL_REF.json"))):[];

/** Ordinary wire wrappers are LOCAL: sequential serials, no growth, unresolved
 * formula/display/cinematic bindings empty, absent numeric metadata zero.
 * Raw source selectors, coefficients, rank gates and timing stay unchanged. */
export function projectMaterialSkillSlots(refId:string,neutral:MaterialWireSkill[]):MaterialWireSkill[] {
  const donor=selected.find(row=>row.refId===refId);
  if(!donor)return neutral;
  if(neutral.length!==5 || neutral.some((slot,index)=>slot.type!==index+1))
    throw new TypeError("Material projection requires all five ordinary skill slots");
  return neutral.map(slot=>{
    const source=donor.skills.find(skill=>skill.type===slot.type);
    if(!source)return {...slot,effect:[]};
    return {...slot,type:source.type,target_rank:source.target_rank,
      cost:source.cost??0,cool_time:source.cool_time??0,crt_chance:source.crt_chance??0,
      effect:source.effect.map((effect,index)=>({...effect,serial:index+1,
        up_number:0,duration_up:0,value_calc:"",effect_desc:[]}))};
  });
}

export function materialSkillProjectionProvenance() {
  return selected.map(({refId,sourceIndex,actorId,ordinaryRageCost})=>({refId,sourceIndex,actorId,ordinaryRageCost,
    source:{...MATERIAL_SKILL_SOURCE_PINS.episode,locator:`/${sourceIndex}/skill`},
    scope:"LOCAL_ORDINARY_ADOPTION_OF_RECOVERED_EPISODE" as const,
    originalOrdinaryMagnitudes:"UNKNOWN",ordinaryGrowth:"UNKNOWN",nativeOrdinaryActivation:"PENDING"}));
}
