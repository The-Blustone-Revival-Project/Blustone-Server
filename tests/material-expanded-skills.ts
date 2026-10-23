import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {repositoryPath} from '../src/paths.js';
import {EXPANDED_MATERIAL_SKILL_DONORS,validateExpandedMaterialSkillSources} from '../src/material-skill-expansion.js';
import {characterIdentities} from '../src/character-materials.js';

const episode=readFileSync(repositoryPath('resources/reference/episodes/EPISODE_STAT_ACTORS.json'));
const symbolic=readFileSync(repositoryPath('resources/reference/episodes/SKILL_REF.json'));
const actors=JSON.parse(episode.toString()),sources=validateExpandedMaterialSkillSources(episode,symbolic);
const roles:Record<string,number>={Offense:1,Defense:2,Bomber:3,Support:4},elements:Record<string,number>={Fire:1,Ice:2,Lightning:3};
assert.deepEqual(sources.map(row=>row.refId),['021','024','039','041','052','056']);
for(const row of sources) {
  assert.deepEqual(row.skills,actors[row.sourceIndex].skill);
  assert.equal(actors.filter((a:any)=>a.id===row.actorId).length,1);
  const identity=characterIdentities.find(c=>c.id===row.refId)!;
  assert.equal(row.role,roles[identity.claims.role!.value!]);
  assert.equal(row.attr,elements[identity.claims.element!.value!]);
  assert.ok(!row.skills.some(skill=>skill.type===3),'Missing original type3 is never invented');
}
sources[0].skills[0].effect[0].base_number=999999;
assert.deepEqual(validateExpandedMaterialSkillSources(episode,symbolic)[0].skills,actors[137].skill);
assert.throws(()=>validateExpandedMaterialSkillSources(Buffer.concat([episode,Buffer.from('\n')]),symbolic),/pin/);
assert.throws(()=>validateExpandedMaterialSkillSources(episode,Buffer.concat([symbolic,Buffer.from('\n')])),/pin/);
assert.throws(()=>{(EXPANDED_MATERIAL_SKILL_DONORS[0] as any).sourceIndex=48;});
const art=spawnSync(process.platform==='win32'?'python':'python3',['-B',repositoryPath('tests/material-expanded-skill-icons.py')],
  {cwd:repositoryPath(),encoding:'utf8',timeout:30000});
assert.equal(art.status,0,art.stderr||art.stdout);
const read=(name:string)=>JSON.parse(readFileSync(repositoryPath('config/profiles/'+name+'.json'),'utf8'));
const baseline=read('current-e10-compatible-progression'),candidate=read('current-e10-expanded-skills-progression');
assert.deepEqual({...candidate.env,BLUSTONE_MATERIAL_SKILL_PROFILE:baseline.env.BLUSTONE_MATERIAL_SKILL_PROFILE},baseline.env);
assert.equal(candidate.preparedOnly,true);assert.equal(candidate.expectedPackages,210);
assert.equal(candidate.resourceStamp,baseline.resourceStamp,'Same original CDN bytes and ordering need no new resource stamp');
const compiled=import.meta.url.endsWith('.js');
const snapshot=(profile:any,cardMode='materials')=>{
  const code=`import {starterReference,starterInventory,recruitBirthRanks} from './${compiled?'dist/':''}src/bootstrap.${compiled?'js':'ts'}';
    import {HUNTER_TRACE_ITEMS,itemReference} from './${compiled?'dist/':''}src/hunter-traces.${compiled?'js':'ts'}';
    import {materialSkillProjectionProvenance} from './${compiled?'dist/':''}src/material-skill-projection.${compiled?'js':'ts'}';
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,births:recruitBirthRanks,
      traces:HUNTER_TRACE_ITEMS,items:itemReference(),provenance:materialSkillProjectionProvenance()}));`;
  return spawnSync(process.execPath,[...(compiled?[]:['--import','tsx']),'--input-type=module','--eval',code],
    {cwd:repositoryPath(),env:{...process.env,...profile.env,BLUSTONE_CARD_REFERENCE_PROFILE:cardMode},encoding:'utf8',timeout:30000,maxBuffer:3*1024*1024});
};
const oldRun=snapshot(baseline),newRun=snapshot(candidate);
assert.equal(oldRun.status,0,oldRun.stderr);assert.equal(newRun.status,0,newRun.stderr);
const before=JSON.parse(oldRun.stdout),after=JSON.parse(newRun.stdout);
assert.equal(before.refs.length,29);assert.equal(after.refs.length,29);
const donors=new Map(EXPANDED_MATERIAL_SKILL_DONORS.map(d=>[d.refId,d]));
for(const ref of after.refs) {
  const prior=before.refs.find((r:any)=>r.base.id===ref.base.id),donor=donors.get(ref.base.id);
  if(!donor){assert.deepEqual(ref,prior,'Every other Hunter reference remains exact');continue;}
  assert.deepEqual({...ref,skill:prior.skill},prior,'No base/stats/rank/equipment/dialogue retuning');
  for(let type=1;type<=5;type++) {
    const skill=ref.skill[type-1];
    const native:any=actors[donor.sourceIndex].skill.find((s:any)=>s.type===type);
    assert.equal(skill.icon_id,'C'+ref.base.id+'_SI'+type);assert.equal(skill.type,type);
    if(!native){assert.deepEqual({...skill,icon_id:prior.skill[type-1].icon_id},prior.skill[type-1]);continue;}
    assert.equal(skill.target_rank,native.target_rank);assert.equal(skill.cost,native.cost??0);
    assert.equal(skill.cool_time,native.cool_time??0);assert.equal(skill.crt_chance,native.crt_chance??0);
    assert.deepEqual(skill.effect,native.effect.map((effect:any,index:number)=>({...effect,serial:index+1,
      up_number:0,duration_up:0,value_calc:'',effect_desc:[]})),'Raw source graph stays ordered; native client performs its own conversion once');
  }
}
assert.deepEqual({...after,refs:before.refs,provenance:before.provenance},before,'No ownership, births, acquisition, item or inventory changes');
assert.equal(after.provenance.length,14);assert.deepEqual(after.provenance.slice(0,8),before.provenance);
assert.ok(!after.provenance.some((p:any)=>p.refId==='020'),'Sienna cost mismatch is excluded');
for(const [id,type,count] of [['052',5,2],['056',5,2]] as const)
  assert.equal(after.refs.find((r:any)=>r.base.id===id).skill[type-1].effect.length,count,'Do not pre-expand or flatten the native parser input');
assert.notEqual(snapshot(candidate,'starter').status,0,'Expanded projection still requires material-backed card references');
console.log('Expanded material skills: six exact indexed cost/role/element-matched graphs, source pins, raw nested/DoT inputs, all other23 refs and eight prior donors unchanged, no invented type3/growth, same210 resources and ownership/birth/acquisition preservation passed.');
