import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {prepareE10CompatibleProfile as prepare,writeE10CompatibleCandidate as write} from '../scripts/profiles/prepare-e10-compatible.mjs';
import {restorationOriginals} from '../scripts/profiles/prepare-restoration.mjs';
import {episode08Originals} from '../scripts/profiles/prepare-e8.mjs';
import {episode09Originals} from '../scripts/profiles/prepare-e9.mjs';
import {episode10Originals} from '../scripts/profiles/prepare-e10.mjs';
import {FEVER_ORIGINAL} from '../scripts/profiles/prepare-restoration-fever.mjs';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const outputName='current-e10-compatible-progression.json',environment={...process.env};
const oldProfiles=new Map(readdirSync(path.join(root,'config/profiles')).filter(name=>name.endsWith('.json'))
  .map(name=>[name,readFileSync(path.join(root,'config/profiles',name))]));
const baseline=read('config/profiles/current-restoration-fever-compatible-progression.json'),before=structuredClone(baseline);
const resource=read('config/profiles/current-e10.json'),resourceBefore=structuredClone(resource),candidate=prepare(baseline,{sourceProfiles:[]});
assert.deepEqual(candidate,read('config/profiles/'+outputName));assert.equal(candidate.expectedPackages,210);
assert.equal(candidate.preparedOnly,true);assert.equal(candidate.resourceStamp,'1634695');assert.equal(preflight(root,candidate),210);
const baseNames=baseline.env.BLUSTONE_PACKAGE_NAMES.split(','),resourceNames=resource.env.BLUSTONE_PACKAGE_NAMES.split(','),newNames=candidate.env.BLUSTONE_PACKAGE_NAMES.split(',');
const missing=resourceNames.filter(name=>!baseNames.includes(name));assert.equal(missing.length,40);
assert.deepEqual(newNames,[...baseNames,...missing]);assert.equal(new Set(newNames).size,210);
assert.deepEqual(baseNames.filter(name=>!resourceNames.includes(name)),['CFE_PUB.jet']);
assert.deepEqual(newNames.slice(0,170),baseNames,'native cache package ordering is retained for all current170 groups');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const expected=structuredClone(baseline.env);expected.BLUSTONE_PACKAGE_NAMES=newNames.join(',');for(const key of stampKeys)expected[key]='1634695';
assert.deepEqual(candidate.env,expected,'every nonresource runtime policy remains exact');
assert.equal(candidate.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE,'material-catalogue-birth-rank-projection');
assert.equal(candidate.env.BLUSTONE_MATERIAL_SKILL_PROFILE,'episode-indexed-projection');
assert.equal(candidate.env.BLUSTONE_MATERIAL_STAT_PROFILE,'archive-2019-projection');
assert.deepEqual(prepare(candidate,{sourceProfiles:[]}),candidate);
const fresh=prepare(baseline);
for(const [name,bytes] of oldProfiles)if(/^current.*\.json$/.test(name)&&name!==outputName) {
  const peer=JSON.parse(bytes);assert.ok(Number(fresh.resourceStamp)>Number(peer.resourceStamp??peer.env.BLUSTONE_RESOURCE_VERSION));
}

// Actual source bootstrap in isolated processes, without a TS/dist build,
// sockets, accounts, save file or environment mutation in this process.
const snapshot=profile=>{
  const code=`import{starterReference,starterInventory,recruitBirthRanks}from'./src/bootstrap.ts';
    import{HUNTER_TRACE_ITEMS,itemReference}from'./src/hunter-traces.ts';
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,births:recruitBirthRanks,eligible:HUNTER_TRACE_ITEMS,links:itemReference().trace}));`;
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',code],
    {cwd:root,env:{...process.env,...profile.env},encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
};
const oldSnapshot=snapshot(baseline),newSnapshot=snapshot(candidate);
assert.equal(oldSnapshot.refs.length,22);assert.equal(newSnapshot.refs.length,29);
for(const ref of oldSnapshot.refs)assert.deepEqual(newSnapshot.refs.find(row=>row.base.id===ref.base.id),ref,'all adopted existing Hunter graphs/stats remain exact');
const added=newSnapshot.refs.filter(row=>!oldSnapshot.refs.some(old=>old.base.id===row.base.id));
assert.deepEqual(added.map(row=>row.base.id),['020','021','024','039','041','052','056']);
for(const ref of added) {
  assert.equal(ref.base.is_source,0);assert.equal(ref.stat[0].hp,'1000');assert.equal(ref.stat[0].atk,'100');assert.equal(ref.stat[0].def,'50');
  assert.equal(ref.skill.length,5);assert.ok(ref.skill.every(slot=>slot.effect.length===0&&slot.cost===0),'new references retain explicit neutral mechanics');
}
assert.deepEqual({...newSnapshot,refs:oldSnapshot.refs},oldSnapshot,'art/reference expansion must not create inventory, births, exchange or acquisition authority');
const stamp=(profile,n)=>{profile.resourceStamp=String(n);for(const key of stampKeys)profile.env[key]=String(n);return profile;};
assert.equal(prepare(stamp(structuredClone(baseline),1634900),{sourceProfiles:[]}).resourceStamp,'1634901');
const peer=stamp(structuredClone(resource),1634800),advanced=prepare(candidate,{sourceProfiles:[peer]});
assert.equal(advanced.resourceStamp,'1634801');assert.deepEqual(prepare(advanced,{sourceProfiles:[peer]}),advanced);
assert.equal(prepare(stamp(structuredClone(candidate),2147483647),{sourceProfiles:[]}).resourceStamp,'2147483647');
assert.throws(()=>prepare(stamp(structuredClone(baseline),2147483647),{sourceProfiles:[]}),/overflow/);
assert.throws(()=>prepare(candidate,{sourceProfiles:[stamp(structuredClone(peer),2147483647)]}),/overflow/);
for(const value of ['0','01','-1','2147483648','NaN',1,undefined]) {
  const bad=structuredClone(baseline);bad.env.BLUSTONE_RESOURCE_VERSION=value;assert.throws(()=>prepare(bad,{sourceProfiles:[]}));
}
for(const mutate of [p=>delete p.resourceStamp,p=>p.resourceStamp='01',p=>p.expectedPackages=169,
  p=>p.env.BLUSTONE_PACKAGE_NAMES=p.env.BLUSTONE_PACKAGE_NAMES.split(',').reverse().join(','),
  p=>p.env.BLUSTONE_PACKAGE_NAMES+=',M012.jet',p=>delete p.env.BLUSTONE_MATERIAL_SKILL_PROFILE,
  p=>p.env.BLUSTONE_MATERIAL_STAT_PROFILE='neutral',p=>p.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE='catalogue-birth-rank-projection',
  p=>p.env.BLUSTONE_RECRUIT_CARD='049',p=>p.env.BLUSTONE_STATE_FILE='another-save.json',p=>p.env.BLUSTONE_GUILD_FUEL_MODE='local-requests']) {
  const bad=structuredClone(baseline);mutate(bad);assert.throws(()=>prepare(bad,{sourceProfiles:[]}));
}
const prior72=[...restorationOriginals(),...episode08Originals(),...episode09Originals(),...episode10Originals()],pins=[...prior72,FEVER_ORIGINAL];
assert.equal(prior72.length,72);assert.equal(pins.length,73);assert.equal(new Set(pins.map(row=>row.name)).size,73);
const dir=mkdtempSync(path.join(tmpdir(),'blustone-compatible-e10-'));
try {
  const assets=path.join(dir,baseline.env.BLUSTONE_RESOURCE_ASSET_DIR),packages=path.join(dir,baseline.env.BLUSTONE_PACKAGE_DIR);
  mkdirSync(assets,{recursive:true});mkdirSync(packages,{recursive:true});
  for(const pin of pins)copyFileSync(path.join(root,pin.destination),path.join(assets,pin.name));
  const options={resourceRoot:dir,sourceProfiles:[]};assert.deepEqual(prepare(baseline,options),candidate);
  const output=path.join(dir,'candidate.json');write(candidate,output);const saved=readFileSync(output);
  write(candidate,output);assert.deepEqual(readFileSync(output),saved);assert.throws(()=>write(advanced,output),/refusing overwrite/);assert.deepEqual(readFileSync(output),saved);
  for(const pin of [FEVER_ORIGINAL,episode10Originals()[0],episode08Originals()[0],episode09Originals()[0],restorationOriginals()[0]]) {
    const fallback=path.join(assets,pin.name),preferred=path.join(packages,pin.name);
    rmSync(fallback);assert.throws(()=>prepare(baseline,options),/Missing/);copyFileSync(path.join(root,pin.destination),fallback);
    writeFileSync(fallback,'corrupt original');assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);copyFileSync(path.join(root,pin.destination),fallback);
    writeFileSync(preferred,'bad preferred behind valid fallback');assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);
    copyFileSync(path.join(root,pin.destination),preferred);writeFileSync(fallback,'bad fallback behind valid preferred');
    assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);rmSync(preferred);copyFileSync(path.join(root,pin.destination),fallback);
  }
  const ledger=read('resources/manifests/imported-files.json');
  for(const pin of [FEVER_ORIGINAL,episode10Originals()[0],episode09Originals()[0]]) {
    assert.throws(()=>prepare(baseline,{...options,ledger:ledger.filter(row=>row.destination!==pin.destination)}),/provenance/);
    assert.throws(()=>prepare(baseline,{...options,ledger:[...ledger,ledger.find(row=>row.destination===pin.destination)]}),/provenance/);
    const changed=structuredClone(ledger);changed.find(row=>row.destination===pin.destination).source='unverified-source';
    assert.throws(()=>prepare(baseline,{...options,ledger:changed}),/provenance/);
  }
  const wrongResource=structuredClone(resource);wrongResource.env.BLUSTONE_PACKAGE_NAMES+=',CFE_PUB.jet';
  assert.throws(()=>prepare(baseline,{...options,resourceProfile:wrongResource}),/ordered|selection|complete/);
  const sourceOnly=read('config/profiles/current-e9.json');assert.throws(()=>prepare(baseline,{...options,resourceProfile:sourceOnly}),/complete209/);
  const command=path.join(root,'scripts/profiles/prepare-e10-compatible.mjs');
  const inspect=spawnSync(process.execPath,[command,'--inspect-only'],{cwd:dir,encoding:'utf8',timeout:20000});
  assert.equal(inspect.status,0,inspect.stderr);assert.equal(JSON.parse(inspect.stdout).inspectOnly,true);assert.equal(existsSync(path.join(dir,'config')),false);
  for(const args of [['--unknown'],['--inspect-only','--inspect-only'],['--inspect-only','--activate']]) {
    const result=spawnSync(process.execPath,[command,...args],{cwd:dir,encoding:'utf8',timeout:20000});assert.notEqual(result.status,0);assert.match(result.stderr,/Usage/);
  }
} finally {
  assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep));rmSync(dir,{recursive:true,force:true});
}
assert.deepEqual(baseline,before);assert.deepEqual(resource,resourceBefore);
assert.ok(Object.keys(process.env).length===Object.keys(environment).length&&Object.entries(environment).every(([key,value])=>process.env[key]===value),
  'Preparation must leave the process environment unchanged');
for(const [name,bytes] of oldProfiles)assert.deepEqual(readFileSync(path.join(root,'config/profiles',name)),bytes,'every old and published candidate profile remains byte-exact');
console.log('Compatible E10: exact170+40 ordered210/73 source pins, all adopted170 policies and22 references retained, seven neutral/unowned additions, fresh/future/idempotent/overflow/create-only/CLI/copy/ledger guards and real preflight PASS; inactive.');
