import assert from 'node:assert/strict';
import {readFileSync,readdirSync,mkdtempSync,mkdirSync,copyFileSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {prepareLaterEpisodesProfile as prepare,writeLaterEpisodesCandidate as write,laterEpisodeOriginals} from '../scripts/profiles/prepare-later-episodes.mjs';
import {restorationOriginals} from '../scripts/profiles/prepare-restoration.mjs';
import {episode08Originals} from '../scripts/profiles/prepare-e8.mjs';
import {episode09Originals} from '../scripts/profiles/prepare-e9.mjs';
import {episode10Originals} from '../scripts/profiles/prepare-e10.mjs';
import {FEVER_ORIGINAL} from '../scripts/profiles/prepare-restoration-fever.mjs';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const oldProfiles=new Map(readdirSync(path.join(root,'config/profiles')).filter(name=>name.endsWith('.json'))
  .map(name=>[name,readFileSync(path.join(root,'config/profiles',name))]));
const environment={...process.env},baseline=read('config/profiles/current-e10-expanded-character-progression.json');
const baselineBefore=structuredClone(baseline),candidate=prepare(baseline,{sourceProfiles:[]});
const fixture=read('config/profiles/current-later-episodes.json');
assert.deepEqual(candidate,fixture);assert.equal(candidate.expectedPackages,280);assert.equal(candidate.preparedOnly,true);
assert.equal(candidate.resourceStamp,'1634696');assert.equal(preflight(root,candidate),280);
const originals=laterEpisodeOriginals(),baseNames=baseline.env.BLUSTONE_PACKAGE_NAMES.split(',');
assert.equal(originals.length,70);assert.equal(new Set(originals.map(p=>p.name)).size,70);
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(','),[...baseNames,...originals.map(p=>p.name)]);
const keys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
const expected={...baseline.env,BLUSTONE_PACKAGE_NAMES:candidate.env.BLUSTONE_PACKAGE_NAMES};for(const key of keys)expected[key]='1634696';
assert.deepEqual(candidate.env,expected,'ALL baseline runtime policies retained');
assert.deepEqual(prepare(candidate,{sourceProfiles:[]}),candidate);
const fresh=prepare(baseline);
for(const [name,bytes] of oldProfiles)if(/^current.*\.json$/.test(name)&&name!=='current-later-episodes.json') {
  const peer=JSON.parse(bytes);assert.ok(Number(fresh.resourceStamp)>Number(peer.resourceStamp??peer.env.BLUSTONE_RESOURCE_VERSION));
}
const snapshot=profile=>{
  const code=`import{starterReference,starterInventory,recruitBirthRanks}from'./src/bootstrap.ts';
    import{HUNTER_TRACE_ITEMS,itemReference}from'./src/hunter-traces.ts';
    console.log(JSON.stringify({refs:starterReference,inventory:starterInventory,births:recruitBirthRanks,eligible:HUNTER_TRACE_ITEMS,links:itemReference().trace}));`;
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','--eval',code],
    {cwd:root,env:{...process.env,...profile.env},encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
  assert.equal(result.status,0,result.stderr);return JSON.parse(result.stdout);
};
const before=snapshot(baseline),after=snapshot(candidate);
assert.equal(before.refs.length,29);
for(const ref of before.refs)assert.deepEqual(after.refs.find(r=>r.base.id===ref.base.id),ref,'Prior29 references exact');
const added=after.refs.filter(r=>!before.refs.some(b=>b.base.id===r.base.id));
assert.deepEqual(added.map(r=>r.base.id),['008','019','023','028','035','043','046','057','064','068','071']);
assert.equal(after.refs.length,40,'Variant art509/510 must not manufacture ordinary catalogue rows');
for(const ref of added) {
  assert.equal(ref.base.is_source,0);assert.equal(ref.stat[0].hp,'1000');assert.equal(ref.stat[0].atk,'100');assert.equal(ref.stat[0].def,'50');
  assert.ok(ref.skill.length===5&&ref.skill.every(s=>s.cost===0&&s.effect.length===0),'New art does not adopt unsupported ordinary skills');
}
assert.deepEqual({...after,refs:before.refs},before,'No birth, inventory, acquisition or trace widening');
const stamp=(profile,n)=>{profile.resourceStamp=String(n);for(const k of keys)profile.env[k]=String(n);return profile;};
assert.equal(prepare(stamp(structuredClone(baseline),1634900),{sourceProfiles:[]}).resourceStamp,'1634901');
const peer=stamp(structuredClone(baseline),1634800),advanced=prepare(candidate,{sourceProfiles:[peer]});
assert.equal(advanced.resourceStamp,'1634801');assert.deepEqual(prepare(advanced,{sourceProfiles:[peer]}),advanced);
assert.equal(prepare(stamp(structuredClone(candidate),2147483647),{sourceProfiles:[]}).resourceStamp,'2147483647');
assert.throws(()=>prepare(stamp(structuredClone(baseline),2147483647),{sourceProfiles:[]}),/overflow/);
assert.throws(()=>prepare(candidate,{sourceProfiles:[stamp(structuredClone(peer),2147483647)]}),/overflow/);
for(const value of ['0','01','-1','2147483648','NaN',1,undefined]) {
  const bad=structuredClone(baseline);bad.env.BLUSTONE_RESOURCE_VERSION=value;assert.throws(()=>prepare(bad,{sourceProfiles:[]}));
}
for(const mutate of [p=>delete p.resourceStamp,p=>p.expectedPackages=209,
  p=>p.env.BLUSTONE_PACKAGE_NAMES=p.env.BLUSTONE_PACKAGE_NAMES.split(',').reverse().join(','),
  p=>p.env.BLUSTONE_PACKAGE_NAMES+=',M014.jet',p=>p.env.BLUSTONE_MATERIAL_SKILL_PROFILE='episode-indexed-projection',
  p=>p.env.BLUSTONE_MATERIAL_STAT_PROFILE='archive-2019-projection',p=>p.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE='material-catalogue-birth-rank-projection',
  p=>p.env.BLUSTONE_RECRUIT_CARD='049',p=>p.env.BLUSTONE_STATE_FILE='different.json',p=>p.env.BLUSTONE_GUILD_FUEL_MODE='local-requests']) {
  const bad=structuredClone(baseline);mutate(bad);assert.throws(()=>prepare(bad,{sourceProfiles:[]}));
}
const ancestors=[...restorationOriginals(),...episode08Originals(),...episode09Originals(),...episode10Originals(),FEVER_ORIGINAL];
assert.equal(ancestors.length,73);
const dir=mkdtempSync(path.join(tmpdir(),'blustone-later-episodes-'));
try {
  const assets=path.join(dir,baseline.env.BLUSTONE_RESOURCE_ASSET_DIR),packages=path.join(dir,baseline.env.BLUSTONE_PACKAGE_DIR);
  mkdirSync(assets,{recursive:true});mkdirSync(packages,{recursive:true});
  for(const pin of [...ancestors,...originals])copyFileSync(path.join(root,pin.destination),path.join(assets,pin.name));
  const options={resourceRoot:dir,sourceProfiles:[]};assert.deepEqual(prepare(baseline,options),candidate);
  const output=path.join(dir,'candidate.json');write(candidate,output);const saved=readFileSync(output);write(candidate,output);
  assert.deepEqual(readFileSync(output),saved);assert.throws(()=>write(advanced,output),/refusing overwrite/);
  assert.deepEqual(readFileSync(output),saved);
  const probes=['C008.jet','C035_Q.jet','C509_EFT.jet','M014.jet','M100.jet','ST902.jet','CUT_E1801.jet','N502.jet'].map(n=>originals.find(p=>p.name===n));
  probes.push(FEVER_ORIGINAL,episode10Originals()[0]);
  for(const pin of probes) {
    const fallback=path.join(assets,pin.name),preferred=path.join(packages,pin.name);
    rmSync(fallback);assert.throws(()=>prepare(baseline,options),/Missing/);copyFileSync(path.join(root,pin.destination),fallback);
    writeFileSync(fallback,'corrupt');assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);copyFileSync(path.join(root,pin.destination),fallback);
    writeFileSync(preferred,'bad preferred');assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);
    copyFileSync(path.join(root,pin.destination),preferred);writeFileSync(fallback,'bad fallback');assert.throws(()=>prepare(baseline,options),/bytes\/hash conflict/);
    rmSync(preferred);copyFileSync(path.join(root,pin.destination),fallback);
  }
  const ledger=read('resources/manifests/imported-files.json');
  for(const pin of [originals[0],originals.at(-1),FEVER_ORIGINAL]) {
    assert.throws(()=>prepare(baseline,{...options,ledger:ledger.filter(r=>r.destination!==pin.destination)}),/provenance/);
    assert.throws(()=>prepare(baseline,{...options,ledger:[...ledger,ledger.find(r=>r.destination===pin.destination)]}),/provenance/);
    const changed=structuredClone(ledger);changed.find(r=>r.destination===pin.destination).source='unverified';
    assert.throws(()=>prepare(baseline,{...options,ledger:changed}),/provenance/);
  }
  const changed=structuredClone(originals);changed[0].sha256='0'.repeat(64);
  assert.throws(()=>prepare(baseline,{...options,originals:changed}),/pinned/);
  assert.throws(()=>prepare(baseline,{...options,originals:[...originals].reverse()}),/pinned/);
  const command=path.join(root,'scripts/profiles/prepare-later-episodes.mjs');
  const inspect=spawnSync(process.execPath,[command,'--inspect-only'],{cwd:dir,encoding:'utf8',timeout:30000});
  assert.equal(inspect.status,0,inspect.stderr);assert.equal(JSON.parse(inspect.stdout).inspectOnly,true);assert.equal(existsSync(path.join(dir,'config')),false);
  for(const args of [['--unknown'],['--inspect-only','--inspect-only'],['--inspect-only','--activate']]) {
    const result=spawnSync(process.execPath,[command,...args],{cwd:dir,encoding:'utf8',timeout:30000});assert.notEqual(result.status,0);assert.match(result.stderr,/Usage/);
  }
} finally {assert.ok(path.resolve(dir).startsWith(path.resolve(tmpdir())+path.sep));rmSync(dir,{recursive:true,force:true});}
assert.deepEqual(baseline,baselineBefore);
assert.ok(Object.keys(process.env).length===Object.keys(environment).length&&Object.entries(environment).every(([k,v])=>process.env[k]===v));
for(const [name,bytes] of oldProfiles)assert.deepEqual(readFileSync(path.join(root,'config/profiles',name)),bytes);
console.log('Later Episodes: exact210+70 ordered280 original packs/143 ancestor+new pins, all29 prior references and adopted policies retained,11 neutral library additions; fresh/idempotent/overflow/provenance/copy/create-only/CLI/preflight PASS. Native variant consumers/execution PENDING.');
