import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {prepareE10Profile,writeE10Candidate,episode10Originals,E10_ORIGINAL_NAMES} from '../scripts/profiles/prepare-e10.mjs';
import {restorationOriginals} from '../scripts/profiles/prepare-restoration.mjs';
import {episode08Originals} from '../scripts/profiles/prepare-e8.mjs';
import {episode09Originals} from '../scripts/profiles/prepare-e9.mjs';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const oldProfiles=new Map(readdirSync(path.join(root,'config/profiles')).filter(name=>name.endsWith('.json'))
  .map(name=>[name,readFileSync(path.join(root,'config/profiles',name))]));
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const sourceFile=path.join(root,'config/profiles/current-e9.json'),sourceBytes=readFileSync(sourceFile);
const outputFile=path.join(root,'config/profiles/current-e10.json'),outputBytes=readFileSync(outputFile);
const source=read('config/profiles/current-e9.json'),before=structuredClone(source),originals=episode10Originals();
const fixtureOptions={sourceProfiles:[]};
const prior=[...restorationOriginals(),...episode08Originals(),...episode09Originals()],pins=[...prior,...originals],candidate=prepareE10Profile(source,fixtureOptions);
assert.equal(originals.length,4);assert.equal(pins.length,72);assert.equal(new Set(pins.map(p=>p.name)).size,72);
assert.equal(originals.reduce((sum,row)=>sum+row.bytes,0),1_902_675);
assert.equal(candidate.expectedPackages,209);assert.equal(candidate.resourceStamp,'1634694');assert.equal(candidate.preparedOnly,true);
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(','),[...source.env.BLUSTONE_PACKAGE_NAMES.split(','),...E10_ORIGINAL_NAMES]);
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const unchanged=env=>Object.fromEntries(Object.entries(env).filter(([key])=>!stampKeys.includes(key)&&key!=='BLUSTONE_PACKAGE_NAMES'));
assert.deepEqual(unchanged(candidate.env),unchanged(source.env));assert.deepEqual(source,before);
assert.deepEqual(prepareE10Profile(candidate,fixtureOptions),candidate);assert.deepEqual(read('config/profiles/current-e10.json'),candidate);
preflight(root,candidate);
// Keep this reviewed publication fixture stable when later chapters appear;
// the real default path must independently advance beyond every current peer.
const freshDefault=prepareE10Profile(source);
for(const [filename,bytes] of oldProfiles)if(/^current.*\.json$/.test(filename)&&filename!=='current-e10.json') {
  const peer=JSON.parse(bytes.toString('utf8'));
  assert.ok(Number(freshDefault.resourceStamp)>Number(peer.resourceStamp??peer.env.BLUSTONE_RESOURCE_VERSION),
    'Fresh E10 preparation must not collide with a newer repository profile');
}

// Isolated source-only bootstrap processes: no dist build/write and no state,
// sockets or device input. Publishing new material references is not ownership.
const snapshot=profile=>{
  const env={...process.env,...profile.env,BLUSTONE_MATERIAL_SKILL_PROFILE:'neutral',BLUSTONE_MATERIAL_STAT_PROFILE:'neutral'};
  const code=`import {starterReference,starterInventory,recruitBirthRanks} from './src/bootstrap.ts';
    import {HUNTER_TRACE_ITEMS,itemReference} from './src/hunter-traces.ts';
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,births:recruitBirthRanks,
      eligible:HUNTER_TRACE_ITEMS,links:itemReference().trace}));`;
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',code],
    {cwd:root,env,encoding:'utf8',timeout:30_000,maxBuffer:2*1024*1024});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
};
const oldSnapshot=snapshot(source),newSnapshot=snapshot(candidate);
assert.equal(oldSnapshot.refs.length,29);assert.deepEqual(newSnapshot,oldSnapshot,'E10 art selection changes no Hunter reference, inventory, rank or acquisition authority');
// Strict original JET parsing resolves aggregate ownership, not a filename alias.
const inspect=spawnSync('python',['-c',`import importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('jet_index','scripts/resources/jet-index.py');m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
result={}
for name in ['M012.jet','CUT_E1001.jet','CUT_E1002.jet','CUT_E1003.jet']:
 j=m.index_jet((Path('resources/runtime/assets')/name).read_bytes())
 result[name]={'eof':j['exact_eof'],'bytes':j['bytes'],'sha256':j['sha256'],'resources':{r['name']:r['payload_prefix_hex'] for r in j['resources']}}
print(json.dumps(result))`],{cwd:root,encoding:'utf8',timeout:20_000});
assert.equal(inspect.status,0,inspect.stderr);const indexed=JSON.parse(inspect.stdout);
for(const pin of originals){assert.equal(indexed[pin.name].sha256,pin.sha256);assert.equal(indexed[pin.name].eof,pin.bytes);}
for(const id of ['M034','M035','M036'])for(const suffix of ['AS1','AS2','AS3','DIE','R1','R2','S','TH'])
 assert.equal(indexed['M012.jet'].resources[id+'_'+suffix],'4154','Required original monster animation resolves in M012');
for(let i=1;i<=3;i++)assert.equal(indexed['CUT_E100'+i+'.jet'].resources['CUTIN_E100'+i],'4154');
const graphAudit=spawnSync('python',[path.join(root,'scripts/resources/audit-e10.py')],{cwd:root,encoding:'utf8',timeout:20_000});
assert.equal(graphAudit.status,0,graphAudit.stderr);const graph=JSON.parse(graphAudit.stdout);
assert.deepEqual(graph.characters,['004','009','012','014','030','041','049','052']);
assert.equal(graph.dialogs.length,9);assert.ok(graph.dialogs.every(row=>row.nodes===row.reachable));
assert.equal(Object.keys(graph.literal_resource_owners).length,13);
const actors=read('resources/reference/episodes/EPISODE_STAT_ACTORS.json');
for(const [index,id,res] of [[106,'CB1002_M1','M035'],[107,'CB1002_M2','M036'],[110,'CB1002_M3','M034']]) {
 assert.equal(actors[index].id,id);assert.equal(actors[index].res_id,res);
 assert.equal(actors.filter(row=>row.id===id).length,1,'Combat actor binding is unique');
}
const combat=read('resources/reference/episodes/EPISODE_COMBAT_CB1002.json');
assert.equal(combat.game_res_id,'900');
assert.deepEqual(combat.right.flat().map(row=>row.actor_id),['CB1002_M1','CB1002_M2','CB1002_M1','CB1002_M2','CB1002_M3']);
const setStamp=(profile,n)=>{profile.resourceStamp=String(n);for(const key of stampKeys)profile.env[key]=String(n);return profile;};
const future=setStamp(structuredClone(source),1634800);
assert.equal(prepareE10Profile(future,{sourceProfiles:[]}).resourceStamp,'1634801');
const peer=setStamp(structuredClone(source),1634900);
assert.equal(prepareE10Profile(candidate,{sourceProfiles:[peer]}).resourceStamp,'1634901','A completed union cannot collide with a future different source profile');
const advanced=prepareE10Profile(candidate,{sourceProfiles:[peer]});assert.deepEqual(prepareE10Profile(advanced,{sourceProfiles:[peer]}),advanced);
assert.equal(prepareE10Profile(setStamp(structuredClone(candidate),2147483647),{sourceProfiles:[]}).resourceStamp,'2147483647');
assert.throws(()=>prepareE10Profile(setStamp(structuredClone(source),2147483647),{sourceProfiles:[]}),/overflow/);
assert.throws(()=>prepareE10Profile(candidate,{sourceProfiles:[setStamp(structuredClone(source),2147483647)]}),/overflow/);
for(const bad of ['0','01','-1','2147483648','NaN',1,undefined]) {
  const p=structuredClone(source);p.env.BLUSTONE_RESOURCE_VERSION=bad;
  assert.throws(()=>prepareE10Profile(p,{sourceProfiles:[]}));
}
for(const mutate of [p=>delete p.resourceStamp,p=>p.resourceStamp='1634684',p=>p.expectedPackages=182,
  p=>p.env.BLUSTONE_PACKAGE_NAMES+=',C024.jet',p=>p.env.BLUSTONE_PACKAGE_NAMES=p.env.BLUSTONE_PACKAGE_NAMES.split(',').reverse().join(','),
  p=>p.env.BLUSTONE_RESOURCE_ASSET_NAMES='C024.jet',p=>delete p.env.BLUSTONE_CARD_REFERENCE_PROFILE,
  p=>p.env.BLUSTONE_GEM_POLISH_MODE='local-supplied-sequence']) {
  const p=structuredClone(source);mutate(p);assert.throws(()=>prepareE10Profile(p,{sourceProfiles:[]}));
}
const directory=mkdtempSync(path.join(tmpdir(),'blustone-e10-profile-'));
try {
  const assets=path.join(directory,source.env.BLUSTONE_RESOURCE_ASSET_DIR),packages=path.join(directory,source.env.BLUSTONE_PACKAGE_DIR);
  mkdirSync(assets,{recursive:true});mkdirSync(packages,{recursive:true});
  for(const pin of pins)copyFileSync(path.join(root,pin.destination),path.join(assets,pin.name));
  const options={resourceRoot:directory,sourceProfiles:[]};
  assert.deepEqual(prepareE10Profile(source,options),candidate);
  const output=path.join(directory,'candidate.json');writeE10Candidate(candidate,output);const saved=readFileSync(output);
  writeE10Candidate(candidate,output);assert.deepEqual(readFileSync(output),saved);
  assert.throws(()=>writeE10Candidate(advanced,output),/refusing overwrite/);assert.deepEqual(readFileSync(output),saved);
  const selected=originals[0],file=path.join(assets,selected.name);
  rmSync(file);assert.throws(()=>prepareE10Profile(source,options),/Missing E10 original/);
  copyFileSync(path.join(root,selected.destination),file);writeFileSync(file,Buffer.from('corrupt'));
  assert.throws(()=>prepareE10Profile(source,options),/bytes\/hash conflict/);copyFileSync(path.join(root,selected.destination),file);
  const preferred=path.join(packages,selected.name);writeFileSync(preferred,Buffer.from('bad preferred copy'));
  assert.throws(()=>prepareE10Profile(source,options),/bytes\/hash conflict/);rmSync(preferred);
  copyFileSync(path.join(root,selected.destination),preferred);writeFileSync(file,Buffer.from('bad fallback behind good preferred'));
  assert.throws(()=>prepareE10Profile(source,options),/bytes\/hash conflict/);rmSync(preferred);copyFileSync(path.join(root,selected.destination),file);
  const old=prior[0],oldFile=path.join(assets,old.name);writeFileSync(oldFile,Buffer.from('corrupt prior original'));
  assert.throws(()=>prepareE10Profile(source,options),/bytes\/hash conflict/);copyFileSync(path.join(root,old.destination),oldFile);
  const ledger=read('resources/manifests/imported-files.json');
  assert.throws(()=>prepareE10Profile(source,{...options,ledger:ledger.filter(row=>row.destination!==selected.destination)}),/provenance/);
  assert.throws(()=>prepareE10Profile(source,{...options,ledger:[...ledger,ledger.find(row=>row.destination===selected.destination)]}),/provenance/);
  const altered=structuredClone(originals);altered[0].source='guessed-source';
  assert.throws(()=>prepareE10Profile(source,{...options,originals:altered}),/pinned source/);
  const inspected=spawnSync(process.execPath,[path.join(root,'scripts/profiles/prepare-e10.mjs'),'--inspect-only'],{cwd:directory,encoding:'utf8',timeout:20_000});
  assert.equal(inspected.status,0,inspected.stderr);assert.equal(JSON.parse(inspected.stdout).inspectOnly,true);
  const typo=spawnSync(process.execPath,[path.join(root,'scripts/profiles/prepare-e10.mjs'),'--inspect-onyl'],{cwd:directory,encoding:'utf8',timeout:20_000});
  assert.notEqual(typo.status,0);assert.match(typo.stderr,/Usage:/,'Unknown options must not silently publish');
  assert.equal(existsSync(path.join(directory,'config')),false,'Inspect-only never creates output under the caller directory');
} finally {rmSync(directory,{recursive:true,force:true});}
assert.deepEqual(readFileSync(sourceFile),sourceBytes);assert.deepEqual(readFileSync(outputFile),outputBytes);
for(const [name,bytes] of oldProfiles)assert.deepEqual(readFileSync(path.join(root,'config/profiles',name)),bytes,'Every existing profile remains byte-identical');
console.log('E10 profile:205 to209 exact ordered groups, original M012 owns all three CB1002 monsters,3 original cuts,72 provenance pins, unchanged29 Hunter refs/ownership, fresh stamps, cold preflight, corruption/conflicting-copy and create-only refusal passed; inactive/no native activation.');
