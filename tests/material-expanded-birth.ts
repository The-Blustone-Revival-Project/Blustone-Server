import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {repositoryPath} from '../src/paths.js';
import {MATERIAL_CATALOGUE_BIRTH_IDS,EXPANDED_MATERIAL_CATALOGUE_BIRTH_IDS,projectHunterMinimumRanks,catalogueBirthRanks} from '../src/hunter-minimum-rank.js';

const mode='expanded-material-catalogue-birth-rank-projection';
const ids=['021','024','039','041','052','056'];
assert.deepEqual(EXPANDED_MATERIAL_CATALOGUE_BIRTH_IDS,[...MATERIAL_CATALOGUE_BIRTH_IDS,...ids]);
assert.equal(MATERIAL_CATALOGUE_BIRTH_IDS.length,8);assert.equal(EXPANDED_MATERIAL_CATALOGUE_BIRTH_IDS.length,14);
assert.throws(()=>{(EXPANDED_MATERIAL_CATALOGUE_BIRTH_IDS as any).push('002');});
const ranks=[1,2,3,4,5].map(rank=>({rank,awk_step:0,hp:'source',hp_up:'unchanged'}));
const references=['001','002','003','004','005','006','020','999'].map(id=>({base:{id,is_main:id==='001'?1:0},stat:structuredClone(ranks)}));
const unaffected=projectHunterMinimumRanks(references,mode);assert.deepEqual(unaffected,references);
unaffected.forEach((row,i)=>assert.equal(row,references[i]));
const births=catalogueBirthRanks();
assert.deepEqual(ids.map(id=>births.get(id)),[2,2,3,3,4,4]);
for(const id of ids) {
  const source={base:{id,is_main:0},stat:[...structuredClone(ranks),{rank:1,awk_step:1,hp:'awake',hp_up:'retained'}]};
  const next=projectHunterMinimumRanks([source],mode)[0];
  assert.equal(next.stat[0].rank,births.get(id));
  assert.deepEqual(next.stat,source.stat.filter(row=>row.awk_step!==0||row.rank>=births.get(id)!));
  assert.deepEqual(source.stat.slice(0,5),ranks,'Input rows remain untouched');
  assert.deepEqual(projectHunterMinimumRanks([source],'material-catalogue-birth-rank-projection'),[source],'Old partial mode never widens');
}
for(const stat of [ranks.filter(row=>row.rank!==4),[...ranks].reverse(),ranks.filter(row=>row.rank<4)])
  assert.throws(()=>projectHunterMinimumRanks([{base:{id:'052'},stat}],mode),/ordered|coverage/);
const read=(name:string)=>JSON.parse(readFileSync(repositoryPath('config/profiles/'+name+'.json'),'utf8'));
const baseline=read('current-e10-expanded-skills-progression'),candidate=read('current-e10-expanded-character-progression');
assert.equal(candidate.preparedOnly,true);assert.equal(candidate.expectedPackages,210);
assert.equal(candidate.resourceStamp,baseline.resourceStamp);
assert.deepEqual({...candidate.env,BLUSTONE_MATERIAL_STAT_PROFILE:baseline.env.BLUSTONE_MATERIAL_STAT_PROFILE,
  BLUSTONE_HUNTER_MIN_RANK_PROFILE:baseline.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE},baseline.env);
const compiled=import.meta.url.endsWith('.js');
const run=(profile:any)=>spawnSync(process.execPath,[...(compiled?[]:['--import','tsx']),'--input-type=module','--eval',`
 import {starterReference,starterInventory,referenceRecruitRank,recruitBirthRanks} from './${compiled?'dist/':''}src/bootstrap.${compiled?'js':'ts'}';
 import {HUNTER_TRACE_ITEMS,itemReference} from './${compiled?'dist/':''}src/hunter-traces.${compiled?'js':'ts'}';
 console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,births:recruitBirthRanks,
  newBirths:Object.fromEntries(${JSON.stringify(ids)}.map(id=>[id,referenceRecruitRank(id)])),traces:HUNTER_TRACE_ITEMS,items:itemReference()}));`],
 {cwd:repositoryPath(),env:{...process.env,...profile.env},encoding:'utf8',timeout:30000,maxBuffer:3*1024*1024});
const oldRun=run(baseline),newRun=run(candidate);assert.equal(oldRun.status,0,oldRun.stderr);assert.equal(newRun.status,0,newRun.stderr);
const before=JSON.parse(oldRun.stdout),after=JSON.parse(newRun.stdout);assert.equal(after.refs.length,29);
for(const ref of after.refs) {
  const previous=before.refs.find((r:any)=>r.base.id===ref.base.id);
  if(!ids.includes(ref.base.id)){assert.deepEqual(ref,previous);continue;}
  assert.equal(ref.stat[0].rank,births.get(ref.base.id));assert.deepEqual({...ref,stat:previous.stat},previous);
  assert.equal(after.newBirths[ref.base.id],births.get(ref.base.id));
}
for(const item of after.items.item) {
  const previous=before.items.item.find((row:any)=>row.id===item.id);
  const id=item.id.replace('local_library_trace_','');
  if(ids.includes(id)) {
    assert.equal(item.rank,births.get(id),'Existing library navigation metadata follows the projected grade');
    assert.deepEqual({...item,rank:previous.rank},previous);
  } else assert.deepEqual(item,previous);
}
assert.deepEqual(after.items.trace,before.items.trace,'Library display grades add no acquisition link');
assert.deepEqual({...after,refs:before.refs,newBirths:before.newBirths,items:before.items},before,
  'No starter inventory, fixed recruit map or acquisition change');
const genovia=after.refs.find((r:any)=>r.base.id==='056');assert.equal(genovia.stat[0].hp,'1000');
assert.equal(genovia.stat[0].atk,'100');assert.equal(genovia.stat[0].def,'50');
console.log('Expanded selective birth:14 community gates, new grades2/2/3/3/4/4, old8/default/legacyMowgli1 and unselected refs untouched, row-order/awakening coverage, same210 profile and no inventory/acquisition grant passed; Genovia retains unknown-stat fixture.');
