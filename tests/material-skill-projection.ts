import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawnSync} from "node:child_process";
import {repositoryPath} from "../src/paths.js";
import {MATERIAL_SKILL_DONORS,validateMaterialSkillSources} from "../src/material-skill-projection.js";

const episodeBytes=readFileSync(repositoryPath("resources/reference/episodes/EPISODE_STAT_ACTORS.json"));
const symbolicBytes=readFileSync(repositoryPath("resources/reference/episodes/SKILL_REF.json"));
const original=JSON.parse(episodeBytes.toString("utf8"));
const brightText=JSON.parse(symbolicBytes.toString("utf8"))["049|1|1"];
assert.equal(brightText.SUB_SERIAL,"0");
assert.equal(brightText.FORMULAR,"stat*(value+value_up*skill_level)*5/100");
assert.equal(brightText.IS_FLOAT,"0");
const bibiText=JSON.parse(symbolicBytes.toString("utf8"))["040|1|1"];
assert.equal(bibiText.SUB_SERIAL,"0");
assert.equal(bibiText.FORMULAR,"(-1*(stat*(8+2*rank))*(value+value_up*skill_level)/10000)*5");
assert.equal(bibiText.IS_FLOAT,"0");
const valid=validateMaterialSkillSources(episodeBytes,symbolicBytes);
const iconResources=spawnSync(process.platform==="win32"?"python":"python3",["-B",repositoryPath("tests/material-skill-icon-resources.py")],
  {cwd:repositoryPath(),encoding:"utf8",timeout:30_000});
assert.equal(iconResources.status,0,iconResources.stderr||iconResources.stdout);
assert.equal(valid.length,8);
for(const row of valid)assert.deepEqual(row.skills,original[row.sourceIndex].skill);
valid[0].skills[0].effect[0].base_number=999999;
assert.deepEqual(validateMaterialSkillSources(episodeBytes,symbolicBytes)[0].skills,original[13].skill);
for(const [episode,symbolic] of [[Buffer.concat([episodeBytes,Buffer.from("\n")]),symbolicBytes],
  [episodeBytes,Buffer.concat([symbolicBytes,Buffer.from("\n")])]])
  assert.throws(()=>validateMaterialSkillSources(episode,symbolic),/source pin/);
assert.throws(()=>{(MATERIAL_SKILL_DONORS[0] as any).sourceIndex=144;});
const baseline=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials.json"),"utf8"));
const profile=JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-materials-skills.json"),"utf8"));
const envWithout={...profile.env};delete envWithout.BLUSTONE_MATERIAL_SKILL_PROFILE;
assert.deepEqual(envWithout,baseline.env);assert.equal(profile.resourceStamp,baseline.resourceStamp);
assert.equal(profile.expectedPackages,139);assert.equal(profile.preparedOnly,true);
const compiled=import.meta.url.endsWith(".js");
const run=(mode:string|undefined,cardMode="materials")=>{
  const env={...process.env,...baseline.env,BLUSTONE_CARD_REFERENCE_PROFILE:cardMode,
    BLUSTONE_MATERIAL_SKILL_PROFILE:mode};
  if(mode===undefined)delete env.BLUSTONE_MATERIAL_SKILL_PROFILE;
  const code=`
    import assert from 'node:assert/strict';
    import fs from 'node:fs';
    import {starterReference,recruitBirthRanks} from './${compiled?"dist/":""}src/bootstrap.${compiled?"js":"ts"}';
    import {fixtureSkillSlots} from './${compiled?"dist/":""}src/skills.${compiled?"js":"ts"}';
    import {materialSkillProjectionProvenance} from './${compiled?"dist/":""}src/material-skill-projection.${compiled?"js":"ts"}';
    if(process.env.BLUSTONE_MATERIAL_SKILL_PROFILE==='episode-indexed-projection') {
      const sources=JSON.parse(fs.readFileSync('resources/reference/episodes/EPISODE_STAT_ACTORS.json','utf8'));
      for(const p of materialSkillProjectionProvenance()) {
        const before=fixtureSkillSlots(p.refId),a=before[0].effect[0].base_number;
        before[0].effect[0].base_number=999999;before[0].effect[0].effect_desc.push('mutated');
        assert.equal(fixtureSkillSlots(p.refId)[0].effect[0].base_number,a);
        assert.deepEqual(fixtureSkillSlots(p.refId)[0].effect[0].effect_desc,[]);
      }
    }
    console.log(JSON.stringify({refs:starterReference,births:recruitBirthRanks,provenance:materialSkillProjectionProvenance()}));`;
  return spawnSync(process.execPath,[...(compiled?[]:["--import","tsx"]),"--input-type=module","--eval",code],
    {cwd:repositoryPath(),env,encoding:"utf8",timeout:30_000});
};
const implicit=run(undefined),neutral=run("neutral"),active=run("episode-indexed-projection");
for(const output of [implicit,neutral,active])assert.equal(output.status,0,output.stderr);
assert.equal(implicit.stdout,neutral.stdout,"Default publication stays byte-equivalent");
const before=JSON.parse(neutral.stdout),after=JSON.parse(active.stdout);
assert.equal(after.refs.length,14);assert.equal(after.provenance.length,8);assert.deepEqual(after.births,before.births);
const selected=new Map(MATERIAL_SKILL_DONORS.map(d=>[d.refId,d]));
for(const ref of after.refs) {
  const prior=before.refs.find((row:any)=>row.base.id===ref.base.id),donor=selected.get(ref.base.id);
  if(!donor){assert.deepEqual(ref,prior,"All six existing references unchanged");continue;}
  assert.deepEqual({...ref,skill:prior.skill},prior,"No stat/base/equipment/dialogue changes");
  const source=original[donor.sourceIndex];
  assert.equal(ref.base.role,source.role);assert.equal(ref.base.attr,source.attr);
  assert.equal(ref.skill.length,5);
  for(let type=1;type<=5;type++) {
    const slot=ref.skill[type-1],native=source.skill.find((row:any)=>row.type===type);
    assert.equal(slot.type,type);assert.equal(slot.cut_in_id,"");assert.equal(slot.icon_id,`C${ref.base.id}_SI${type}`);
    assert.equal(slot.name,prior.skill[type-1].name);assert.equal(slot.desc,prior.skill[type-1].desc);
    if(!native){assert.deepEqual({...slot,icon_id:prior.skill[type-1].icon_id},prior.skill[type-1],
      "Missing original slots retain every neutral field except the LOCAL icon binding");continue;}
    assert.equal(slot.target_rank,native.target_rank);assert.equal(slot.cost,native.cost??0);
    assert.equal(slot.cool_time,native.cool_time??0);assert.equal(slot.crt_chance,native.crt_chance??0);
    assert.deepEqual(slot.effect,native.effect.map((effect:any,index:number)=>({...effect,
      serial:(ref.base.id==="049"||ref.base.id==="040")&&type===1?0:index+1,
      up_number:0,duration_up:0,value_calc:"",effect_desc:[]})),"Exact graph order/selectors/floating coefficients/raw timing plus explicit local wrapper");
  }
}
const karl=after.refs.find((r:any)=>r.base.id==="012").skill;
assert.equal(karl[0].cool_time,5000);assert.equal(karl[3].effect[0].base_number,1);
assert.equal(after.refs.find((r:any)=>r.base.id==="049").skill[0].crt_chance,0,"Missing Bright probability is not invented50");
assert.deepEqual(after.refs.find((r:any)=>r.base.id==="049").skill.slice(0,2).map((slot:any)=>slot.effect.map((effect:any)=>effect.serial)),
  [[0],[1]],"Only Bright active's sole effect binds the original description SUB_SERIAL; skill2 retains its wrapper identity");
assert.deepEqual(after.refs.find((r:any)=>r.base.id==="040").skill.map((slot:any)=>slot.effect.map((effect:any)=>effect.serial)),
  [[0],[1],[1],[1],[1]],"Only Bibi active binds SUB_SERIAL0; other slots retain their local identities despite symbolic mismatches");
assert.deepEqual(after.refs.find((r:any)=>r.base.id==="049").skill.slice(2).map((slot:any)=>({icon_id:slot.icon_id,effect:slot.effect})),
  [3,4,5].map(type=>({icon_id:`C049_SI${type}`,effect:[]})),"Original icon art never fills Bright's absent numeric graphs");
for(const [mode,card] of [["unknown","materials"],["episode-indexed-projection","starter"]]) {
  const invalid=run(mode,card);assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/material skill|Material skill/);
}
console.log("Material skill projection:8 exact indexed/pinned encounter graphs, literal costs, five-slot/tier/effect-order/raw timing, local no-growth wrappers, default isolation, variant separation, unknown/profile refusal and caller-copy safety passed; native ordinary execution unverified.");
