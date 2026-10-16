import {readFileSync} from 'node:fs';
import {repositoryPath} from './paths.js';
import {starterReference,starterLevels} from './bootstrap.js';
import type {LocalGameState} from './game.js';
import type {MirageCache,MirageEnemy,MirageReadiness} from './mirage-cache.js';
import {MIRAGE_RESOURCE_SOURCES,MIRAGE_ENVIRONMENT_SOURCE,originalMirageEnvironments,originalMirageResourceIndex} from './mirage-resources.js';
import {MIRAGE_BACKGROUND_SOURCE,originalMirageBackgroundPrefixes,originalMirageLayerDependencies} from './mirage-backgrounds.js';

const uint=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=0xffff_ffff;
const referenceMap=()=>{
  const result=new Map<string,typeof starterReference[number]>();
  for(const row of starterReference) {
    if(!row.base.id||result.has(row.base.id))throw new TypeError('Mirage requires unique canonical Hunter references');
    result.set(row.base.id,row);
  }
  return result;
};

/** Readiness for an explicitly configured local run. Assets are original;
 * floors/enrollment/enemies remain separately authored and admitted by callers.
 * In particular no membership is inferred from ordinary1000 placeholder HP. */
export function mirageRuntimeContext(game:LocalGameState,cache:MirageCache,now:number):MirageReadiness {
  if(!Number.isInteger(now)||now<0||now>0x7fff_ffff)throw new TypeError('Mirage runtime clock requires signed32 seconds');
  const refs=referenceMap(),owned=new Map<number,{ref_id:string;char_id:string}>(),cards=new Map<number,typeof game.starter_cards[number]>();
  for(const card of [...game.starter_cards,...game.recruited_cards]) {
    const reference=refs.get(card.ref_id),id=card.inst_id;
    if(!uint(id)||!id||owned.has(id)||!reference||typeof reference.base.char_id!=='string'||!reference.base.char_id)
      throw new TypeError('Mirage owned Hunter identity/reference/family is unavailable');
    owned.set(id,{ref_id:card.ref_id,char_id:reference.base.char_id});cards.set(id,card);
  }
  const commitments=new Map<number,number>();
  for(const entry of cache.entry) {
    const card=cards.get(entry.id);
    if(!card||commitments.has(entry.id)||!Number.isInteger(entry.mirage_remain_hp)||entry.mirage_remain_hp<0||entry.mirage_remain_hp>10000||
      card.mirage_remain_hp!==entry.mirage_remain_hp)
      throw new TypeError('Mirage explicit entry HP must exactly match real owned commitments');
    commitments.set(entry.id,entry.mirage_remain_hp);
  }
  for(const [id,card] of cards) {
    if(!commitments.has(id)&&card.mirage_remain_hp!==undefined&&card.mirage_remain_hp!==1000&&card.mirage_remain_hp!==-1)
      throw new TypeError('Unrepresented owned Mirage carry must not be omitted from explicit enrollment');
  }
  const read=(file:string)=>readFileSync(repositoryPath(file));
  const mirage=MIRAGE_RESOURCE_SOURCES.mirage,st=MIRAGE_RESOURCE_SOURCES.st002;
  const mirageIndex=originalMirageResourceIndex('mirage',read(mirage.pack),read(mirage.index));
  const stagePack=read(st.pack),stageIndex=read(st.index),stageResources=originalMirageResourceIndex('st002',stagePack,stageIndex);
  const leveling=read(MIRAGE_BACKGROUND_SOURCE.pack),environmentBytes=read(MIRAGE_ENVIRONMENT_SOURCE.path);
  originalMirageBackgroundPrefixes(leveling);
  const environments=originalMirageEnvironments(environmentBytes),readyEnvironments=new Set<string>();
  for(const id of ['2','15']) {
    originalMirageLayerDependencies(id,leveling,environmentBytes,stagePack,stageIndex);
    readyEnvironments.add(id);
  }
  const resources=new Set<string>();
  for(const [name,row] of [...mirageIndex,...stageResources]) {
    if(row.s2projection?.supported||row.atprojection?.supported)resources.add(name);
  }
  const enemySupported=(enemy:Readonly<MirageEnemy>):boolean=>{
    const reference=refs.get(enemy.ref_id);
    if(!reference||reference.base.is_source!==0||!uint(enemy.rank)||enemy.rank<1||enemy.rank>5||
      !reference.stat.some(row=>row.rank===enemy.rank&&row.awk_step===0)||
      !uint(enemy.rank_up_cnt)||enemy.rank_up_cnt>=(enemy.rank===5?1:enemy.rank)||enemy.overcome_cnt!==0||!uint(enemy.exp))return false;
    // Mirage's enemy DTO has no equipment/awakening fields. Until an explicit
    // consumer projection is supported, only neutral implicit baseline gear
    // and ordinary zero-Overcome instances are admitted.
    if(reference.equipment.length!==0)return false;
    const levels=starterLevels.card.filter(row=>row.rank===enemy.rank);
    if(!levels.length||levels.some((row,index)=>!uint(row.min_exp)||row.level!==index+1||index>0&&row.min_exp<=levels[index-1].min_exp)||
      enemy.exp<levels[0].min_exp||enemy.exp>levels[levels.length-1].min_exp)return false;
    for(let slot=1;slot<=5;slot++) {
      const level=enemy[`skill_${slot}_level` as keyof MirageEnemy];
      if(!uint(level)||(slot>enemy.rank?level!==0:level<1||!starterLevels.skill.some(row=>row.role===reference.base.role&&row.level===level&&row.rank<=enemy.rank)))return false;
    }
    return true;
  };
  return {owned,commitments,heroIds:new Set(refs.keys()),resources,dialogueIds:new Set(),environments,readyEnvironments,
    // No original stage-row res_prefix map is currently recovered. The
    // analytics campaign-stages export cannot supply native stage overrides.
    stageBackgroundPrefixes:new Map(),enemySupported,now,exhaustedRevivePrice:-1};
}
