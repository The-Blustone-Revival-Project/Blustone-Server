import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync,readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {repositoryPath} from '../src/paths.js';
import {MATERIAL_ARCHIVE_IDS,EXPANDED_MATERIAL_ARCHIVE_IDS,MATERIAL_ARCHIVE_SOURCE,
  materialArchiveObservations,validateMaterialArchiveObservations,projectMaterialStats} from '../src/material-stat-projection.js';

const added=['021','024','039','041','052'],oldMode='archive-2019-projection',newMode='archive-2019-expanded-projection';
assert.deepEqual(MATERIAL_ARCHIVE_IDS,['009','010','012','013','017','036','040','049']);
assert.deepEqual(EXPANDED_MATERIAL_ARCHIVE_IDS,[...MATERIAL_ARCHIVE_IDS,...added]);
assert.ok(Object.isFrozen(EXPANDED_MATERIAL_ARCHIVE_IDS));
assert.throws(()=>{(EXPANDED_MATERIAL_ARCHIVE_IDS as unknown as string[]).push('056');});
const bytes=readFileSync(repositoryPath(MATERIAL_ARCHIVE_SOURCE.path));
const lines=bytes.toString('utf8').trim().split(/\r?\n/),unquote=(v:string)=>v.replace(/^"|"$/g,'');
const header=lines.shift()!.split('\t').map(unquote);
const rows=lines.map(line=>Object.fromEntries(line.split('\t').map((v,i)=>[header[i],unquote(v)])));
const wire=['hp','atk','def','spd','crt_chance','crt_dmg','penetration','block_chance','block_dec_dmg','attr_enhance','attr_resist','hp_regen'];
const archive=['hp','atk','def','speed','crit','crit_damage','penetration','block','block_damage_reduction','element_enhance','element_resistance','hp_regen'];
const old=materialArchiveObservations(),expanded=materialArchiveObservations(newMode);
assert.equal(Object.keys(old).length,8);assert.equal(Object.keys(expanded).length,13);
for(const id of EXPANDED_MATERIAL_ARCHIVE_IDS) {
  const row=rows.find(r=>r.catalog_id===id)!;
  assert.equal(row.fetch_status,'ok');
  assert.deepEqual(wire.map(k=>expanded[id].values[k]),archive.map(k=>row[k]),'All twelve fields match independent pinned TSV columns');
  assert.deepEqual([expanded[id].url,expanded[id].captured,expanded[id].level,expanded[id].gearState],
    [row.source_url,row.capture_timestamp,'not shown','not established']);
  if(id in old)assert.deepEqual(expanded[id],old[id],'Original eight provenance records exact');
}
assert.equal(rows.find(r=>r.catalog_id==='056')!.fetch_status,'non-numeric-core-stats');
for(const id of ['020','056'])assert.ok(!(id in expanded));
const neutral={rank:4,awk_step:2,hp:'1000',hp_up:'10',atk_up:'1',def_up:'1',spd_up:'0'};
for(const id of added) {
  assert.deepEqual(projectMaterialStats(id,neutral,oldMode),neutral);
  assert.deepEqual(projectMaterialStats(id,neutral,'neutral'),neutral);
  assert.deepEqual(projectMaterialStats(id,neutral,newMode),{...neutral,...expanded[id].values});
}
for(const id of ['020','056','001'])assert.deepEqual(projectMaterialStats(id,neutral,newMode),neutral);
assert.deepEqual(neutral,{rank:4,awk_step:2,hp:'1000',hp_up:'10',atk_up:'1',def_up:'1',spd_up:'0'});
expanded['021'].values.hp='0';expanded['009'].url='changed';
assert.notEqual(materialArchiveObservations(newMode)['021'].values.hp,'0');
assert.deepEqual(materialArchiveObservations()['009'],old['009']);
const validated=validateMaterialArchiveObservations(bytes,newMode);validated['021'].values.atk='0';
assert.notEqual(validateMaterialArchiveObservations(bytes,newMode)['021'].values.atk,'0');
assert.throws(()=>validateMaterialArchiveObservations(Buffer.concat([bytes,Buffer.from('\n')]),newMode),/pin/);
// Malformed selected row cannot be admitted by replacing or removing a numeric value.
const selectedLine=lines.find(line=>line.split('\t').map(unquote)[header.indexOf('catalog_id')]==='021')!;
const badCells=selectedLine.split('\t');badCells[header.indexOf('hp')]='"???"';
assert.throws(()=>validateMaterialArchiveObservations(Buffer.from(bytes.toString().replace(selectedLine,badCells.join('\t'))),newMode),/pin/);
assert.throws(()=>materialArchiveObservations('unknown'),/Unknown/);

const profileDir=repositoryPath('config/profiles');
const profileFiles=readdirSync(profileDir).filter(name=>name.endsWith('.json'));
const profileBytes=new Map(profileFiles.map(name=>[name,readFileSync(path.join(profileDir,name))]));
const profile=JSON.parse(readFileSync(repositoryPath('config/profiles/current-e10-compatible-progression.json'),'utf8'));
const compiled=import.meta.url.endsWith('.js'),ext=compiled?'js':'ts',prefix=compiled?'dist/':'';
const folder=mkdtempSync(path.join(tmpdir(),'blustone-expanded-stats-'));
try {
  const stateFile=path.join(folder,'state.json');
  const run=(mode:string,seed=false)=>{
    const code=`import {starterReference,starterInventory,recruitBirthRanks} from './${prefix}src/bootstrap.${ext}';
      import {HUNTER_TRACE_ITEMS,itemReference} from './${prefix}src/hunter-traces.${ext}';
      import {ServerState} from './${prefix}src/state.${ext}';
      const state=new ServerState('http://localhost',${JSON.stringify(stateFile)});
      if(${seed})for(let i=0;i<3;i++) {const auth=state.registerGuest({device_id:'expanded-stat-dummy-'+i},{}).ret_data;
        const game=state.gameFor(state.accountFor(auth,{}));game.starter_cards[0].exp=610+i;game.gold=13000+i;
        state.setDeck({otp:auth.otp,deck_info:[{type:1,list:[game.starter_cards[0].inst_id,0,0,0]}]},{});}
      console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,births:recruitBirthRanks,
        traces:HUNTER_TRACE_ITEMS,items:itemReference()}));`;
    return spawnSync(process.execPath,[...(compiled?[]:['--import','tsx']),'--input-type=module','--eval',code],
      {cwd:repositoryPath(),env:{...process.env,...profile.env,BLUSTONE_MATERIAL_STAT_PROFILE:mode,
        BLUSTONE_MATERIAL_SKILL_PROFILE:'episode-indexed-expanded-projection'},encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  };
  const beforeRun=run(oldMode,true);assert.equal(beforeRun.status,0,beforeRun.stderr);
  const saved=readFileSync(stateFile),afterRun=run(newMode);assert.equal(afterRun.status,0,afterRun.stderr);
  const before=JSON.parse(beforeRun.stdout),after=JSON.parse(afterRun.stdout),observations=materialArchiveObservations(newMode);
  assert.equal(before.refs.length,29);assert.equal(after.refs.length,29);
  let changed=0;
  for(const ref of after.refs) {
    const prior=before.refs.find((r:any)=>r.base.id===ref.base.id);
    if(!added.includes(ref.base.id)){assert.deepEqual(ref,prior,'All other24 references remain exact');continue;}
    changed++;
    assert.deepEqual({...ref,stat:prior.stat},prior,'Identity, skills, equipment and dialog unchanged');
    assert.equal(ref.stat.length,prior.stat.length);
    for(let i=0;i<ref.stat.length;i++)assert.deepEqual(ref.stat[i],{...prior.stat[i],...observations[ref.base.id].values},
      'Only twelve historical repeated rank-base fields change; growth and selectors exact');
  }
  assert.equal(changed,5);
  assert.deepEqual({...after,refs:before.refs},before,'Inventory, birth, item and acquisition data exact');
  assert.deepEqual(readFileSync(stateFile),saved,'Three progressed dummy games/accounts unchanged by expanded startup');
  const restored=run(oldMode);assert.equal(restored.status,0,restored.stderr);assert.equal(restored.stdout,beforeRun.stdout);
  assert.deepEqual(readFileSync(stateFile),saved,'Old mode restart preserves save bytes');
  for(const [name,original] of profileBytes)assert.deepEqual(readFileSync(path.join(profileDir,name)),original);
} finally {rmSync(folder,{recursive:true,force:true});}
console.log('Expanded historical stats: five pinned twelve-column observations, all other24 references and old8 provenance exact; no skill/growth/birth/acquisition or three-game save changes. Historical level/gear unknown, repeated rank bases LOCAL.');
