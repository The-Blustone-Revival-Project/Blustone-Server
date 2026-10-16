import type {SkillLevelRow} from "./skill-training.js";
import type {LocalItemInstance} from "./game.js";
const sourceKeys=[1,2,3,4].flatMap(i=>[`source_${i}_ref_id`,`source_${i}_qty`]);
function uint(raw:unknown):number {if(typeof raw!=="number"||!Number.isInteger(raw)||raw<0||raw>0xffff_ffff)throw new TypeError("Skill material requires uint32 quantity");return raw;}
/** Optional sparse LOCAL recipe overlay. Unspecified rows retain explicit
 * gold-only fixtures. IDs must later bind to the published ordinary registry. */
export function applySkillMaterialPrices(base:SkillLevelRow[],raw:unknown):SkillLevelRow[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>200||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>Object.getOwnPropertyDescriptor(raw,String(i))).some(d=>!d?.enumerable||!Object.hasOwn(d,"value")))throw new TypeError("Skill recipes require dense bounded plain data");
  const result=base.map(row=>({...row})),seen=new Set<string>(),keys=["role","level",...sourceKeys];
  for(const value of raw) {
    if(!value||typeof value!=="object"||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype||keys.some(key=>!Object.hasOwn(value,key))||
      Reflect.ownKeys(value).some(key=>typeof key!=="string"||!keys.includes(key)||!Object.getOwnPropertyDescriptor(value,key)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key)!,"value")))throw new TypeError("Skill recipe requires complete own data fields");
    const row=value as Record<string,unknown>,role=uint(row.role),level=uint(row.level),key=`${role}:${level}`,target=result.find(row=>row.role===role&&row.level===level);
    if(role<1||role>4||level<1||level>50||!target||seen.has(key))throw new TypeError("Unknown or duplicate role/destination skill recipe");seen.add(key);
    for(const index of [1,2,3,4] as const) {
      const id=row[`source_${index}_ref_id`],qty=uint(row[`source_${index}_qty`]);
      if(typeof id!=="string"||Buffer.from(id,"utf8").toString("utf8")!==id||(id==="")!==(qty===0))throw new TypeError("Skill material ref and quantity must be paired");
      target[`source_${index}_ref_id`]=id;target[`source_${index}_qty`]=qty;
    }
  }
  return result;
}
export function skillMaterialRequirements(prices:readonly SkillLevelRow[],allowed:ReadonlySet<string>):Map<string,number> {
  const requirements=new Map<string,number>();
  for(const price of prices)for(const index of [1,2,3,4] as const) {
    const id=price[`source_${index}_ref_id`],qty=uint(price[`source_${index}_qty`]);
    if(typeof id!=="string"||(id==="")!==(qty===0)||id!==""&&!allowed.has(id))throw new TypeError("Skill material reference is not a published ordinary consumable");
    if(qty)requirements.set(id,uint((requirements.get(id)??0)+qty));
  }
  return requirements;
}
/** Single UseItem subtracts qty without clamping; multi writes absolute remain.
 * Refuse any shortage/identity ambiguity before preparing detached stock. */
export function planSkillMaterials(items:LocalItemInstance[],prices:readonly SkillLevelRow[],allowed:ReadonlySet<string>) {
  const requirements=skillMaterialRequirements(prices,allowed);
  if(!requirements.size)return {items,single:[] as {inst_id:number;qty:number}[],multi:[] as {inst_id:number;remain:number}[]};
  const ids=new Set<number>();
  for(const item of items) {
    if(!Number.isSafeInteger(item.inst_id)||item.inst_id<1||ids.has(item.inst_id))throw new TypeError("Skill material inventory identity is malformed/duplicated");ids.add(item.inst_id);
    if(requirements.has(item.ref_id)){uint(item.qty);if(item.lock!==0&&item.lock!==1)throw new TypeError("Skill material lock is malformed");}
  }
  const next=items.map(row=>({...row})),single:{inst_id:number;qty:number}[]=[],multi:{inst_id:number;remain:number}[]=[];
  for(const [ref_id,needed] of requirements) {
    const stacks=next.filter(row=>row.ref_id===ref_id&&row.lock===0).sort((a,b)=>a.inst_id-b.inst_id);
    const available=stacks.reduce((sum,row)=>uint(sum+row.qty),0);if(available<needed)throw new TypeError("Insufficient unlocked skill materials");
    let remaining=needed;
    for(const item of stacks){const qty=Math.min(remaining,item.qty);if(!qty)continue;item.qty-=qty;remaining-=qty;
      single.push({inst_id:item.inst_id,qty});multi.push({inst_id:item.inst_id,remain:item.qty});if(!remaining)break;}
  }
  return {items:next,single,multi};
}
