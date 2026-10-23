/** Additional raw Episode graphs. Ordinary adoption remains an explicit LOCAL
 * policy; these donors do not establish ordinary magnitudes or skill growth. */
import {createHash} from 'node:crypto';
import {MATERIAL_SKILL_SOURCE_PINS} from './material-skill-evidence.js';
import type {EpisodeSkill} from './material-skill-projection.js';

export const EXPANDED_MATERIAL_SKILL_DONORS=Object.freeze([
  Object.freeze({refId:'021',sourceIndex:137,actorId:'CB0901_021_1',role:1,attr:1,ordinaryRageCost:3}),
  Object.freeze({refId:'024',sourceIndex:136,actorId:'CB0901_024_1',role:2,attr:3,ordinaryRageCost:3}),
  Object.freeze({refId:'039',sourceIndex:10,actorId:'EVCB0201_039',role:3,attr:3,ordinaryRageCost:4}),
  Object.freeze({refId:'041',sourceIndex:140,actorId:'CB0902_041_1',role:2,attr:3,ordinaryRageCost:3}),
  Object.freeze({refId:'052',sourceIndex:134,actorId:'CB0801_052_1',role:1,attr:3,ordinaryRageCost:3}),
  Object.freeze({refId:'056',sourceIndex:135,actorId:'CB0802_056_1',role:1,attr:2,ordinaryRageCost:3}),
]);
const effectFields=['effect_type','target_type','target_stat','refer_target_type','refer_target_stat','base_number','duration','interval'];
export function validateExpandedMaterialSkillSources(episodeBytes:Buffer,symbolicBytes:Buffer) {
  const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
  if(hash(episodeBytes)!==MATERIAL_SKILL_SOURCE_PINS.episode.sha256||hash(symbolicBytes)!==MATERIAL_SKILL_SOURCE_PINS.symbolic.sha256)
    throw new TypeError('Expanded material skill source pin mismatch');
  const actors=JSON.parse(episodeBytes.toString('utf8')),symbolic=JSON.parse(symbolicBytes.toString('utf8'));
  return EXPANDED_MATERIAL_SKILL_DONORS.map(donor=>{
    const actor=actors[donor.sourceIndex],text=symbolic[donor.refId+'|1|0']?.EN;
    const match=typeof text==='string'?/^Uses (\d+) Rage Gauge when using a skill\.$/.exec(text):null;
    if(!actor||actor.id!==donor.actorId||actor.ref_id!==donor.refId||actor.res_id!=='C'+donor.refId||
      actor.role!==donor.role||actor.attr!==donor.attr||!match||Number(match[1])!==donor.ordinaryRageCost||!Array.isArray(actor.skill))
      throw new TypeError('Expanded material donor identity, role, element or ordinary cost mismatch');
    const skills=structuredClone(actor.skill) as EpisodeSkill[],types=new Set<number>();
    for(const skill of skills) {
      if(!Number.isInteger(skill.type)||skill.type<1||skill.type>5||types.has(skill.type)||
        !Number.isInteger(skill.target_rank)||skill.target_rank<1||skill.target_rank>6||!Array.isArray(skill.effect))
        throw new TypeError('Invalid expanded material skill slot');
      types.add(skill.type);
      for(const effect of skill.effect)if(Object.keys(effect).length!==effectFields.length||
        effectFields.some(key=>!Object.hasOwn(effect,key))||Object.values(effect).some(value=>typeof value!=='number'||!Number.isFinite(value)))
        throw new TypeError('Invalid expanded material skill effect');
    }
    if(skills.find(skill=>skill.type===1)?.cost!==donor.ordinaryRageCost)
      throw new TypeError('Expanded material Episode cost differs from ordinary text');
    return {...donor,skills};
  });
}
