import {characterIdentities} from "./character-materials.js";
import {MATERIAL_ARCHIVE_IDS} from "./material-stat-projection.js";
import {EXPANDED_MATERIAL_SKILL_DONORS} from "./material-skill-expansion.js";

export const HUNTER_MIN_RANK_PROFILE=process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE??"legacy";
const profiles=["legacy","catalogue-birth-rank-projection","material-catalogue-birth-rank-projection","expanded-material-catalogue-birth-rank-projection"];
if(!profiles.includes(HUNTER_MIN_RANK_PROFILE))throw new TypeError("Unknown Hunter minimum-rank profile");
/** Existing eight material identities only. The imported stat module has no
 * bootstrap dependency; snapshot the shared list so later caller mutation
 * cannot widen this explicit LOCAL partial catalogue policy. */
export const MATERIAL_CATALOGUE_BIRTH_IDS=Object.freeze([...MATERIAL_ARCHIVE_IDS]);
const materialBirthIds=new Set<string>(MATERIAL_CATALOGUE_BIRTH_IDS);
/** Explicit broader LOCAL catalogue adoption. Genovia has a supported birth
 * claim despite missing numeric archive stats; the two evidence gates differ. */
export const EXPANDED_MATERIAL_CATALOGUE_BIRTH_IDS=Object.freeze([
  ...MATERIAL_CATALOGUE_BIRTH_IDS,...EXPANDED_MATERIAL_SKILL_DONORS.map(row=>row.refId),
]);
const expandedBirthIds=new Set<string>(EXPANDED_MATERIAL_CATALOGUE_BIRTH_IDS);
/** COMMUNITY-SOURCED catalogue claims, never original server birth ranks. */
export function catalogueBirthRanks() {
  return new Map(characterIdentities.flatMap(row=>{
    const claim=row.claims.rarity;
    if(!/^\d{3}$/.test(row.id)||!claim||!/^\d$/.test(claim.value??"")||Number(claim.value)<1||Number(claim.value)>4)return [];
    if(claim.provenance.label!=="COMMUNITY-SOURCED")throw new TypeError("Hunter birth-rank provenance changed");
    return [[row.id,Number(claim.value)] as const];
  }));
}
/** GetMinRank reads the FIRST stat entry. Keep row order and every retained
 * numerical value; remove only ordinary rows below a known catalogue grade.
 * Unknown identities/awakened references remain unchanged. The state owner
 * must reject incompatible owned ranks before writing a loaded save. */
export function projectHunterMinimumRanks<T extends {base:{id:string;is_main?:number};is_main?:number;stat:readonly {rank:number;awk_step:number}[]}>(references:readonly T[],profile:string) {
  if(!profiles.includes(profile))throw new TypeError("Unknown Hunter minimum-rank profile");
  if(profile==="legacy")return [...references];
  const births=catalogueBirthRanks();
  return references.map(reference=>{
    // The current main001 is the user-name fixture, not an authoritative join
    // to catalogue Lantern. Preserve it and the fixed001 Search helper.
    if(reference.is_main===1||reference.base.is_main===1)return reference;
    const expanded=profile==="expanded-material-catalogue-birth-rank-projection";
    const materialOnly=profile==="material-catalogue-birth-rank-projection"||expanded;
    if(materialOnly&&!(expanded?expandedBirthIds:materialBirthIds).has(reference.base.id))return reference;
    const birth=births.get(reference.base.id);
    if(birth===undefined) {
      if(materialOnly)throw new TypeError("Selected material Hunter lacks a catalogue birth grade");
      return reference;
    }
    const stat=reference.stat.filter(row=>row.awk_step!==0||row.rank>=birth).map(row=>({...row}));
    if(!stat.length||stat[0].rank!==birth||stat[0].awk_step!==0||
      Array.from({length:6-birth},(_,index)=>birth+index).some(rank=>!stat.some(row=>row.rank===rank&&row.awk_step===0)))
      throw new TypeError("Projected Hunter minimum requires ordered ordinary birth-through5 stat coverage");
    return {...reference,stat} as T;
  });
}
