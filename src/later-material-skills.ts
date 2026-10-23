/** LOCAL ordinary adoption of exact original later-Episode variants. Matching
 * catalogue identity and Rage cost is not proof of original ordinary balance. */
import {validateIndexedMaterialSkillSources} from './material-skill-expansion.js';

export const LATER_MATERIAL_SKILL_DONORS=Object.freeze([
  Object.freeze({refId:'008',sourceIndex:87,actorId:'CB1102_008',role:4,attr:3,ordinaryRageCost:4}),
  Object.freeze({refId:'019',sourceIndex:84,actorId:'CB1102_019',role:1,attr:3,ordinaryRageCost:3}),
  Object.freeze({refId:'023',sourceIndex:61,actorId:'CB1601_C023',role:1,attr:1,ordinaryRageCost:3}),
  Object.freeze({refId:'028',sourceIndex:78,actorId:'CB1101_028_1',role:1,attr:2,ordinaryRageCost:3}),
  Object.freeze({refId:'043',sourceIndex:76,actorId:'CB1101_043_1',role:2,attr:2,ordinaryRageCost:3}),
  Object.freeze({refId:'046',sourceIndex:39,actorId:'CB1402_C046',role:2,attr:2,ordinaryRageCost:3}),
  Object.freeze({refId:'057',sourceIndex:117,actorId:'EVCB0301_C057',role:4,attr:2,ordinaryRageCost:4}),
  Object.freeze({refId:'064',sourceIndex:43,actorId:'CB1602_C064',role:3,attr:3,ordinaryRageCost:4}),
  Object.freeze({refId:'068',sourceIndex:46,actorId:'CB1602_C068',role:3,attr:2,ordinaryRageCost:4}),
  //071's only retained actor is Offense, while its catalogue is Defense.
  //035 has no retained numeric graph. Both remain neutral.
]);
export function validateLaterMaterialSkillSources(episodeBytes:Buffer,symbolicBytes:Buffer) {
  return validateIndexedMaterialSkillSources(episodeBytes,symbolicBytes,LATER_MATERIAL_SKILL_DONORS);
}
