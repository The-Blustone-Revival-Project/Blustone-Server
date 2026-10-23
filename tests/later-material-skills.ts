import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {repositoryPath} from '../src/paths.js';
import {LATER_MATERIAL_SKILL_DONORS,validateLaterMaterialSkillSources} from '../src/later-material-skills.js';
import {EXPANDED_MATERIAL_SKILL_DONORS,validateExpandedMaterialSkillSources,validateIndexedMaterialSkillSources} from '../src/material-skill-expansion.js';
import {characterIdentities} from '../src/character-materials.js';
import type {EpisodeSkill} from '../src/material-skill-projection.js';

const episode=readFileSync(repositoryPath('resources/reference/episodes/EPISODE_STAT_ACTORS.json'));
const symbolic=readFileSync(repositoryPath('resources/reference/episodes/SKILL_REF.json'));
const actors=JSON.parse(episode.toString()),texts=JSON.parse(symbolic.toString());
const expectedIds=['008','019','023','028','043','046','057','064','068'];
const sources=validateLaterMaterialSkillSources(episode,symbolic);
const art=spawnSync(process.platform==='win32'?'python':'python3',['-B',repositoryPath('tests/later-material-skill-icons.py')],
  {cwd:repositoryPath(),encoding:'utf8',timeout:30000});
assert.equal(art.status,0,art.stderr||art.stdout);
assert.deepEqual(sources.map(d=>d.refId),expectedIds);
assert.deepEqual(sources.map(d=>d.sourceIndex),[87,84,61,78,76,39,117,43,46]);
const roles:Record<string,number>={Offense:1,Defense:2,Bomber:3,Support:4},attrs:Record<string,number>={Fire:1,Ice:2,Lightning:3};
for(const row of sources) {
  const identity=characterIdentities.find(c=>c.id===row.refId)!,actor=actors[row.sourceIndex];
  assert.equal(actor.res_id,'C'+row.refId,'Base art only; no awakened/costume donor');
  assert.equal(row.role,roles[identity.claims.role!.value!]);assert.equal(row.attr,attrs[identity.claims.element!.value!]);
  assert.equal(actors.filter((a:any)=>a.id===row.actorId).length,1);
  const cost=/^Uses (\d+) Rage Gauge when using a skill\.$/.exec(texts[row.refId+'|1|0'].EN)!;
  assert.equal(row.ordinaryRageCost,Number(cost[1]));
  assert.deepEqual(row.skills,actor.skill,'Complete ordered raw source graph stays coherent');
  assert.ok(!row.skills.some(s=>s.type===3),'No missing type3 manufactured');
  assert.equal(row.skills.some(s=>s.type===5),['046','057','068'].includes(row.refId),'Sparse type5 retained');
}
assert.deepEqual([88,22,45].map(i=>actors[i].res_id),['C008B','C028B','C068A']);
assert.ok(!actors.some((a:any)=>a.ref_id==='035'),'C035 has no numeric graph; remains neutral');
assert.deepEqual(actors.flatMap((a:any,i:number)=>a.ref_id==='071'||a.res_id==='C071'?[i]:[]),[38]);
assert.equal(actors[38].role,1);assert.equal(characterIdentities.find(c=>c.id==='071')!.claims.role!.value,'Defense');
assert.ok(!sources.some(d=>d.refId==='071'),'Only071 graph conflicts with ordinary catalogue role; remains neutral');
assert.throws(()=>{(LATER_MATERIAL_SKILL_DONORS[0] as any).sourceIndex=88;});
assert.throws(()=>{(LATER_MATERIAL_SKILL_DONORS as unknown as unknown[]).push({});});
const mutableCopy=validateLaterMaterialSkillSources(episode,symbolic);mutableCopy[0].skills[0].effect[0].base_number=999999;
assert.deepEqual(validateLaterMaterialSkillSources(episode,symbolic)[0].skills,actors[87].skill);
assert.throws(()=>validateLaterMaterialSkillSources(Buffer.concat([episode,Buffer.from('\n')]),symbolic),/pin/);
assert.throws(()=>validateLaterMaterialSkillSources(episode,Buffer.concat([symbolic,Buffer.from('\n')])),/pin/);
for(const change of [{sourceIndex:88},{role:1},{attr:1},{ordinaryRageCost:3},{actorId:'CB1102_008_wrong'}])
  assert.throws(()=>validateIndexedMaterialSkillSources(episode,symbolic,[{...LATER_MATERIAL_SKILL_DONORS[0],...change}]),/identity|cost/);
// Shared-validator refactor must preserve the existing six-donor API exactly.
const sixBefore=EXPANDED_MATERIAL_SKILL_DONORS.map(d=>({...d,skills:structuredClone(actors[d.sourceIndex].skill)}));
assert.deepEqual(validateExpandedMaterialSkillSources(episode,symbolic),sixBefore);
const oldSix=validateExpandedMaterialSkillSources(episode,symbolic);oldSix[0].skills[0].effect.length=0;
assert.deepEqual(validateExpandedMaterialSkillSources(episode,symbolic),sixBefore);

const baseline=JSON.parse(readFileSync(repositoryPath('config/profiles/current-later-episodes.json'),'utf8'));
const candidate=JSON.parse(readFileSync(repositoryPath('config/profiles/current-later-episodes-skills.json'),'utf8'));
assert.equal(candidate.preparedOnly,true);assert.equal(candidate.expectedPackages,280);
assert.equal(candidate.resourceStamp,baseline.resourceStamp);
assert.deepEqual({...candidate.env,BLUSTONE_MATERIAL_SKILL_PROFILE:baseline.env.BLUSTONE_MATERIAL_SKILL_PROFILE},baseline.env);
const compiled=import.meta.url.endsWith('.js'),prefix=compiled?'dist/':'',ext=compiled?'js':'ts';
const snapshot=(mode:string,cardMode='materials')=>{
  const code=`import{starterReference,starterInventory,recruitBirthRanks}from'./${prefix}src/bootstrap.${ext}';
    import{HUNTER_TRACE_ITEMS,itemReference}from'./${prefix}src/hunter-traces.${ext}';
    import{materialSkillProjectionProvenance}from'./${prefix}src/material-skill-projection.${ext}';
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,births:recruitBirthRanks,
      traces:HUNTER_TRACE_ITEMS,items:itemReference(),provenance:materialSkillProjectionProvenance()}));`;
  return spawnSync(process.execPath,[...(compiled?[]:['--import','tsx']),'--input-type=module','--eval',code],
    {cwd:repositoryPath(),env:{...process.env,...baseline.env,BLUSTONE_MATERIAL_SKILL_PROFILE:mode,
      BLUSTONE_CARD_REFERENCE_PROFILE:cardMode},encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
};
const oldRun=snapshot('episode-indexed-expanded-projection'),newRun=snapshot('episode-indexed-later-projection');
assert.equal(oldRun.status,0,oldRun.stderr);assert.equal(newRun.status,0,newRun.stderr);
const before=JSON.parse(oldRun.stdout),after=JSON.parse(newRun.stdout);
assert.equal(before.refs.length,40);assert.equal(after.refs.length,40);
let changed=0;
for(const ref of after.refs) {
  const prior=before.refs.find((r:any)=>r.base.id===ref.base.id),donor=sources.find(d=>d.refId===ref.base.id);
  if(!donor){assert.deepEqual(ref,prior,'All other31 references exact, including C035/071');continue;}
  changed++;assert.deepEqual({...ref,skill:prior.skill},prior,'No stats, identity, equipment or dialogue changes');
  for(let type=1;type<=5;type++) {
    const skill=ref.skill[type-1];const source:EpisodeSkill|undefined=donor.skills.find(s=>s.type===type);
    assert.equal(skill.icon_id,'C'+ref.base.id+'_SI'+type);
    if(!source){assert.deepEqual({...skill,icon_id:prior.skill[type-1].icon_id},prior.skill[type-1]);continue;}
    assert.equal(skill.target_rank,source.target_rank);assert.equal(skill.cost,source.cost??0);
    assert.equal(skill.cool_time,source.cool_time??0);assert.equal(skill.crt_chance,source.crt_chance??0);
    assert.deepEqual(skill.effect,source.effect.map((effect,index)=>({...effect,serial:index+1,
      up_number:0,duration_up:0,value_calc:'',effect_desc:[]})),
      'Raw effect arrays remain ordered and unflattened; no guessed native interpretation');
  }
}
assert.equal(changed,9);assert.equal(before.provenance.length,14);assert.equal(after.provenance.length,23);
assert.deepEqual(after.provenance.slice(0,14),before.provenance,'All old14 donor provenance exact');
assert.deepEqual(after.provenance.slice(14).map((d:any)=>d.refId),expectedIds);
assert.deepEqual({...after,refs:before.refs,provenance:before.provenance},before,'No birth/inventory/item/trace/acquisition authority change');
assert.notEqual(snapshot('episode-indexed-later-projection','starter').status,0,'Material-backed profile remains required');
console.log('Later material skills:9 exact base-art/cost/catalogue-matched raw source graphs,071role mismatch and035no graph excluded, shared old6 API and old14 provenance exact; only9 skills change among40 refs, missing3/sparse5 preserved; no stats/birth/growth/acquisition changes.');
