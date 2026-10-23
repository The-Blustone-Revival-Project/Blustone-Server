import assert from 'node:assert/strict';
import {readFileSync,readdirSync,writeFileSync,mkdtempSync,mkdirSync,copyFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {prepareE8Profile,writeE8Candidate,episode08Originals,E8_ORIGINAL_NAMES} from '../scripts/profiles/prepare-e8.mjs';
import {restorationOriginals} from '../scripts/profiles/prepare-restoration.mjs';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const sourceFile=path.join(root,'config/profiles/current-restoration.json'),sourceBytes=readFileSync(sourceFile);
const outputFile=path.join(root,'config/profiles/current-e8.json'),outputBytes=readFileSync(outputFile);
const source=read('config/profiles/current-restoration.json'),before=structuredClone(source),originals=episode08Originals();
const fixtureOptions={sourceProfiles:[]};
const prior=restorationOriginals(),pins=[...prior,...originals],candidate=prepareE8Profile(source,fixtureOptions);
assert.equal(originals.length,14);assert.equal(pins.length,46);assert.equal(new Set(pins.map(p=>p.name)).size,46);
assert.equal(originals.reduce((sum,row)=>sum+row.bytes,0),13_792_516);
assert.equal(candidate.expectedPackages,183);assert.equal(candidate.resourceStamp,'1634689');assert.equal(candidate.preparedOnly,true);
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(','),[...source.env.BLUSTONE_PACKAGE_NAMES.split(','),...E8_ORIGINAL_NAMES]);
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const unchanged=env=>Object.fromEntries(Object.entries(env).filter(([key])=>!stampKeys.includes(key)&&key!=='BLUSTONE_PACKAGE_NAMES'));
assert.deepEqual(unchanged(candidate.env),unchanged(source.env));assert.deepEqual(source,before);
assert.deepEqual(prepareE8Profile(candidate,fixtureOptions),candidate);assert.deepEqual(read('config/profiles/current-e8.json'),candidate);
preflight(root,candidate);
// Keep the published historical E8 fixture fixed, while separately verifying
// fresh default preparation advances beyond every newer checked-in peer.
const freshDefault=prepareE8Profile(source);
for(const filename of readdirSync(path.join(root,'config/profiles')).filter(name=>/^current.*\.json$/.test(name)&&name!=='current-e8.json')) {
  const peer=read('config/profiles/'+filename);
  assert.ok(Number(freshDefault.resourceStamp)>Number(peer.resourceStamp??peer.env.BLUSTONE_RESOURCE_VERSION),
    'Fresh E8 preparation must not collide with a newer repository profile');
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
assert.equal(oldSnapshot.refs.length,22);assert.equal(newSnapshot.refs.length,24);
for(const ref of oldSnapshot.refs)assert.deepEqual(newSnapshot.refs.find(row=>row.base.id===ref.base.id),ref);
for(const id of ['052','056']) {
  const ref=newSnapshot.refs.find(row=>row.base.id===id);assert.ok(ref);assert.equal(ref.base.is_source,0);
  assert.equal(ref.stat[0].hp,'1000');assert.equal(ref.stat[0].atk,'100');assert.equal(ref.stat[0].def,'50');
  assert.equal(ref.skill.length,5);assert.ok(ref.skill.every(slot=>slot.effect.length===0&&slot.cost===0));
}
assert.deepEqual({...newSnapshot,refs:oldSnapshot.refs},oldSnapshot,'Prior ownership/birth/exchange/acquisition remain unchanged');
const setStamp=(profile,n)=>{profile.resourceStamp=String(n);for(const key of stampKeys)profile.env[key]=String(n);return profile;};
const future=setStamp(structuredClone(source),1634800);
assert.equal(prepareE8Profile(future,{sourceProfiles:[]}).resourceStamp,'1634801');
const peer=setStamp(structuredClone(source),1634900);
assert.equal(prepareE8Profile(candidate,{sourceProfiles:[peer]}).resourceStamp,'1634901','A completed union cannot collide with a future different source profile');
const advanced=prepareE8Profile(candidate,{sourceProfiles:[peer]});assert.deepEqual(prepareE8Profile(advanced,{sourceProfiles:[peer]}),advanced);
assert.equal(prepareE8Profile(setStamp(structuredClone(candidate),2147483647),{sourceProfiles:[]}).resourceStamp,'2147483647');
assert.throws(()=>prepareE8Profile(setStamp(structuredClone(source),2147483647),{sourceProfiles:[]}),/overflow/);
assert.throws(()=>prepareE8Profile(candidate,{sourceProfiles:[setStamp(structuredClone(source),2147483647)]}),/overflow/);
for(const bad of ['0','01','-1','2147483648','NaN',1,undefined]) {
  const p=structuredClone(source);p.env.BLUSTONE_RESOURCE_VERSION=bad;
  assert.throws(()=>prepareE8Profile(p,{sourceProfiles:[]}));
}
for(const mutate of [p=>delete p.resourceStamp,p=>p.resourceStamp='1634684',p=>p.expectedPackages=168,
  p=>p.env.BLUSTONE_PACKAGE_NAMES+=',C052.jet',p=>p.env.BLUSTONE_PACKAGE_NAMES=p.env.BLUSTONE_PACKAGE_NAMES.split(',').reverse().join(','),
  p=>p.env.BLUSTONE_RESOURCE_ASSET_NAMES='C052.jet',p=>delete p.env.BLUSTONE_CARD_REFERENCE_PROFILE,
  p=>p.env.BLUSTONE_GEM_POLISH_MODE='local-supplied-sequence']) {
  const p=structuredClone(source);mutate(p);assert.throws(()=>prepareE8Profile(p,{sourceProfiles:[]}));
}
const directory=mkdtempSync(path.join(tmpdir(),'blustone-e8-profile-'));
try {
  const assets=path.join(directory,source.env.BLUSTONE_RESOURCE_ASSET_DIR),packages=path.join(directory,source.env.BLUSTONE_PACKAGE_DIR);
  mkdirSync(assets,{recursive:true});mkdirSync(packages,{recursive:true});
  for(const pin of pins)copyFileSync(path.join(root,pin.destination),path.join(assets,pin.name));
  const options={resourceRoot:directory,sourceProfiles:[]};
  assert.deepEqual(prepareE8Profile(source,options),candidate);
  const output=path.join(directory,'candidate.json');writeE8Candidate(candidate,output);const saved=readFileSync(output);
  writeE8Candidate(candidate,output);assert.deepEqual(readFileSync(output),saved);
  assert.throws(()=>writeE8Candidate(advanced,output),/refusing overwrite/);assert.deepEqual(readFileSync(output),saved);
  const selected=originals[0],file=path.join(assets,selected.name);
  rmSync(file);assert.throws(()=>prepareE8Profile(source,options),/Missing E8 original/);
  copyFileSync(path.join(root,selected.destination),file);writeFileSync(file,Buffer.from('corrupt'));
  assert.throws(()=>prepareE8Profile(source,options),/bytes\/hash conflict/);copyFileSync(path.join(root,selected.destination),file);
  const preferred=path.join(packages,selected.name);writeFileSync(preferred,Buffer.from('bad preferred copy'));
  assert.throws(()=>prepareE8Profile(source,options),/bytes\/hash conflict/);rmSync(preferred);
  const old=prior[0],oldFile=path.join(assets,old.name);writeFileSync(oldFile,Buffer.from('corrupt prior original'));
  assert.throws(()=>prepareE8Profile(source,options),/bytes\/hash conflict/);copyFileSync(path.join(root,old.destination),oldFile);
  const ledger=read('resources/manifests/imported-files.json');
  assert.throws(()=>prepareE8Profile(source,{...options,ledger:ledger.filter(row=>row.destination!==selected.destination)}),/provenance/);
  assert.throws(()=>prepareE8Profile(source,{...options,ledger:[...ledger,ledger.find(row=>row.destination===selected.destination)]}),/provenance/);
  const altered=structuredClone(originals);altered[0].source='guessed-source';
  assert.throws(()=>prepareE8Profile(source,{...options,originals:altered}),/pinned source/);
  const inspected=spawnSync(process.execPath,[path.join(root,'scripts/profiles/prepare-e8.mjs'),'--inspect-only'],{cwd:directory,encoding:'utf8',timeout:20_000});
  assert.equal(inspected.status,0,inspected.stderr);assert.equal(JSON.parse(inspected.stdout).inspectOnly,true);
  assert.equal(existsSync(path.join(directory,'config')),false,'Inspect-only never creates output under the caller directory');
} finally {rmSync(directory,{recursive:true,force:true});}
assert.deepEqual(readFileSync(sourceFile),sourceBytes);assert.deepEqual(readFileSync(outputFile),outputBytes);
console.log('E8 profile:169→183 exact ordered groups/14 new originals/46 checked provenance pins,24 material refs with22 exact prior rows and2 neutral/unowned additions, future stamp collision/idempotence/overflow, prior settings/payload preservation, missing/corrupt/conflicting copies and ledger refusal passed; inactive/no native activation.');
