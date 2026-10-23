import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareCompatibleRestorationFeverProfile as prepare,writeCompatibleRestorationFeverCandidate as write} from '../scripts/profiles/prepare-restoration-fever-compatible.mjs';
import {restorationOriginals} from '../scripts/profiles/prepare-restoration.mjs';
import {FEVER_ORIGINAL} from '../scripts/profiles/prepare-restoration-fever.mjs';
import {preflight} from '../scripts/resources/verify.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const oldProfiles=new Map(readdirSync(path.join(root,'config/profiles')).filter(name=>name.endsWith('.json'))
  .map(name=>[name,readFileSync(path.join(root,'config/profiles',name))]));
const baseline=read('config/profiles/current-e6-fever-compatible-progression.json');
const resource=read('config/profiles/current-restoration-fever.json');
const candidate=prepare(baseline,{sourceProfiles:[]}),saved=read('config/profiles/current-restoration-fever-compatible-progression.json');
const actualFresh=prepare(baseline);
for(const [name,bytes] of oldProfiles)if(/^current.*\.json$/.test(name)&&name!=='current-restoration-fever-compatible-progression.json') {
  const peer=JSON.parse(bytes),stamp=Number(peer.resourceStamp??peer.env.BLUSTONE_RESOURCE_VERSION);
  assert.ok(Number(actualFresh.resourceStamp)>stamp,'Real default preparation advances beyond every other current peer');
}
assert.deepEqual(candidate,saved);assert.equal(candidate.resourceStamp,'1634693');assert.equal(preflight(root,candidate),170);
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const expected=structuredClone(baseline.env);expected.BLUSTONE_PACKAGE_NAMES=resource.env.BLUSTONE_PACKAGE_NAMES;
for(const key of stampKeys)expected[key]='1634693';assert.deepEqual(candidate.env,expected);
assert.equal(candidate.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE,'material-catalogue-birth-rank-projection');
assert.equal(candidate.env.BLUSTONE_MATERIAL_SKILL_PROFILE,'episode-indexed-projection');
assert.equal(candidate.env.BLUSTONE_MATERIAL_STAT_PROFILE,'archive-2019-projection');
assert.deepEqual(prepare(candidate,{sourceProfiles:[]}),candidate);
const stamp=(p,n)=>{p.resourceStamp=String(n);for(const k of stampKeys)p.env[k]=String(n);return p;};
const peer=stamp(structuredClone(resource),1634800),advanced=prepare(candidate,{sourceProfiles:[peer]});
assert.equal(advanced.resourceStamp,'1634801');assert.deepEqual(prepare(advanced,{sourceProfiles:[peer]}),advanced);
assert.equal(prepare(stamp(structuredClone(baseline),1634900),{sourceProfiles:[]}).resourceStamp,'1634901');
assert.equal(prepare(stamp(structuredClone(candidate),2147483647),{sourceProfiles:[]}).resourceStamp,'2147483647');
assert.throws(()=>prepare(stamp(structuredClone(baseline),2147483647),{sourceProfiles:[]}),/overflow/);
assert.throws(()=>prepare(candidate,{sourceProfiles:[stamp(structuredClone(peer),2147483647)]}),/overflow/);
for(const mutate of [p=>delete p.resourceStamp,p=>p.resourceStamp='01',p=>p.expectedPackages=169,
  p=>p.env.BLUSTONE_PACKAGE_NAMES=p.env.BLUSTONE_PACKAGE_NAMES.split(',').reverse().join(','),
  p=>delete p.env.BLUSTONE_MATERIAL_SKILL_PROFILE,p=>p.env.BLUSTONE_MATERIAL_STAT_PROFILE='neutral',
  p=>p.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE='catalogue-birth-rank-projection',p=>p.env.BLUSTONE_RECRUIT_CARD='049',
  p=>p.env.BLUSTONE_GUILD_MODE='local',p=>p.env.BLUSTONE_STATE_FILE='somewhere-else.json']) {
  const p=structuredClone(baseline);mutate(p);assert.throws(()=>prepare(p,{sourceProfiles:[]}));
}
const dir=mkdtempSync(path.join(tmpdir(),'blustone-compatible170-'));
try {
  const assets=path.join(dir,resource.env.BLUSTONE_RESOURCE_ASSET_DIR),packages=path.join(dir,resource.env.BLUSTONE_PACKAGE_DIR);
  mkdirSync(assets,{recursive:true});mkdirSync(packages,{recursive:true});
  const pins=[...restorationOriginals(),FEVER_ORIGINAL];assert.equal(pins.length,33);
  for(const pin of pins)copyFileSync(path.join(root,pin.destination),path.join(assets,pin.name));
  const options={resourceRoot:dir,sourceProfiles:[]};assert.deepEqual(prepare(baseline,options),candidate);
  const output=path.join(dir,'candidate.json');write(candidate,output);const outputBytes=readFileSync(output);
  write(candidate,output);assert.deepEqual(readFileSync(output),outputBytes);
  assert.throws(()=>write(advanced,output),/refusing overwrite/);assert.deepEqual(readFileSync(output),outputBytes);
  const fever=path.join(assets,FEVER_ORIGINAL.name),preferred=path.join(packages,FEVER_ORIGINAL.name);
  rmSync(fever);assert.throws(()=>prepare(baseline,options),/Missing/);
  copyFileSync(path.join(root,FEVER_ORIGINAL.destination),fever);writeFileSync(preferred,'bad preferred');
  assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);
  copyFileSync(path.join(root,FEVER_ORIGINAL.destination),preferred);writeFileSync(fever,'bad fallback');
  assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);rmSync(preferred);
  copyFileSync(path.join(root,FEVER_ORIGINAL.destination),fever);
  const prior=pins[0];writeFileSync(path.join(assets,prior.name),'bad prior');
  assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);copyFileSync(path.join(root,prior.destination),path.join(assets,prior.name));
  const ledger=read('resources/manifests/imported-files.json');
  assert.throws(()=>prepare(baseline,{...options,ledger:ledger.filter(p=>p.destination!==FEVER_ORIGINAL.destination)}),/provenance/);
  assert.throws(()=>prepare(baseline,{...options,ledger:[...ledger,ledger.find(p=>p.destination===FEVER_ORIGINAL.destination)]}),/provenance/);
  const wrongResource=structuredClone(resource);wrongResource.env.BLUSTONE_PACKAGE_NAMES+=',C024.jet';
  assert.throws(()=>prepare(baseline,{...options,resourceProfile:wrongResource}),/ordered|selection/);
}finally{rmSync(dir,{recursive:true,force:true});}
for(const [name,bytes] of oldProfiles)assert.deepEqual(readFileSync(path.join(root,'config/profiles',name)),bytes);
console.log('Compatible restoration170: verified33 pins, exact140 runtime policies,170 original group order, all older profiles preserved, future/overflow/admission/ledger/copy/create-only guards passed; inactive.');
