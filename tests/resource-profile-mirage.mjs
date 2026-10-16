import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,copyFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareMirageProfile} from '../scripts/profiles/prepare-mirage.mjs';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'config/profiles/current-e6-materials.json');
const original=readFileSync(file),baseline=JSON.parse(original),before=structuredClone(baseline);
const pins=JSON.parse(readFileSync(path.join(root,'resources/manifests/mirage-originals.json')));
const imported=JSON.parse(readFileSync(path.join(root,'resources/manifests/imported-files.json')));
assert.deepEqual(pins.map(row=>row.name),['LEVELING.jet','ST002.jet','MIRAGE.jet']);
for(const pin of pins) {
  const source=imported.find(row=>row.destination===pin.destination);
  assert.ok(source);
  for(const key of ['source','destination','bytes','sha256']) assert.equal(pin[key],source[key]);
}
const candidate=prepareMirageProfile(baseline);
assert.equal(candidate.name,'current-e6-mirage');
assert.equal(candidate.preparedOnly,true);
assert.equal(candidate.expectedPackages,140);
assert.equal(candidate.resourceStamp,'1634687');
assert.equal(candidate.env.BLUSTONE_PACKAGE_NAMES,baseline.env.BLUSTONE_PACKAGE_NAMES+',MIRAGE.jet');
const stampKeys=['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'];
for(const key of stampKeys) assert.equal(candidate.env[key],'1634687');
for(const [key,value] of Object.entries(baseline.env))
  if(!stampKeys.includes(key)&&key!=='BLUSTONE_PACKAGE_NAMES') assert.equal(candidate.env[key],value);
assert.deepEqual(prepareMirageProfile(candidate),candidate);
assert.deepEqual(JSON.parse(readFileSync(path.join(root,'config/profiles/current-e6-mirage.json'))),candidate);
assert.deepEqual(baseline,before,'Pure preparation must not alter its input');
assert.deepEqual(readFileSync(file),original,'Preparation must preserve E6 baseline bytes');
assert.equal(preflight(root,candidate),140);

const future=structuredClone(baseline);
future.env.BLUSTONE_RESLIST_STAMP='1900000';future.resourceStamp='1900002';
const futureCandidate=prepareMirageProfile(future);
assert.equal(futureCandidate.resourceStamp,'1900003');
assert.deepEqual(prepareMirageProfile(futureCandidate),futureCandidate);
for(const key of stampKeys) assert.equal(futureCandidate.env[key],'1900003');
for(const value of ['0','-1','NaN','1634687.0','01','2147483648',1634687,undefined]) {
  const bad=structuredClone(baseline);bad.env.BLUSTONE_RESOURCE_VERSION=value;
  assert.throws(()=>prepareMirageProfile(bad),/stamp/);
}
const overflow=structuredClone(baseline);overflow.resourceStamp='2147483647';
assert.throws(()=>prepareMirageProfile(overflow),/overflow/);
const ceiling=structuredClone(candidate);ceiling.resourceStamp='2147483647';
assert.equal(prepareMirageProfile(ceiling).resourceStamp,'2147483647','Existing add need not increment again');
for(const change of [
  p=>{p.expectedPackages=138;},
  p=>{const a=p.env.BLUSTONE_PACKAGE_NAMES.split(',');[a[0],a[1]]=[a[1],a[0]];p.env.BLUSTONE_PACKAGE_NAMES=a.join(',');},
  p=>{p.env.BLUSTONE_PACKAGE_NAMES+=',MIRAGE.jet,MIRAGE.jet';p.expectedPackages=141;},
  p=>{p.env.BLUSTONE_PACKAGE_NAMES+=',GUILD.jet';p.expectedPackages=140;},
  p=>{p.env.BLUSTONE_PACKAGE_NAMES=p.env.BLUSTONE_PACKAGE_NAMES.replace('LEVELING.jet','FAKE.jet');},
]) {
  const bad=structuredClone(baseline);change(bad);assert.throws(()=>prepareMirageProfile(bad),/baseline/);
}
for(const key of ['BLUSTONE_RESOURCE_ASSET_GLOB','BLUSTONE_RESOURCE_ASSET_NAMES_EXTRA','BLUSTONE_RESOURCE_ASSET_NAMES']) {
  const bad=structuredClone(baseline);bad.env[key]='MIRAGE.jet';
  assert.throws(()=>prepareMirageProfile(bad),/separate/);
}
assert.throws(()=>prepareMirageProfile(null),/baseline/);
assert.throws(()=>prepareMirageProfile({env:{}}),/baseline/);
for(const bad of [null,[],pins.slice(1),[...pins].reverse(),pins.map((p,i)=>i===2?{...p,sha256:'0'.repeat(64)}:p),
  pins.map((p,i)=>i===0?{...p,bytes:p.bytes+1}:p),pins.map((p,i)=>i===1?{...p,destination:'wrong'}:p)])
  assert.throws(()=>prepareMirageProfile(baseline,{originals:bad}),/pins/);

const temporary=mkdtempSync(path.join(tmpdir(),'blustone-mirage-profile-'));
try {
  const options={resourceRoot:temporary,originals:pins};
  assert.throws(()=>prepareMirageProfile(baseline,options),/missing/);
  for(const pin of pins) {
    const dest=path.resolve(temporary,baseline.env.BLUSTONE_RESOURCE_ASSET_DIR,pin.name);
    assert.ok(dest.startsWith(path.resolve(temporary)+path.sep));
    mkdirSync(path.dirname(dest),{recursive:true});copyFileSync(path.join(root,pin.destination),dest);
  }
  assert.deepEqual(prepareMirageProfile(baseline,options),candidate);
  for(const pin of pins) {
    const dest=path.resolve(temporary,baseline.env.BLUSTONE_RESOURCE_ASSET_DIR,pin.name);
    const bytes=readFileSync(dest);bytes[bytes.length-1]^=1;writeFileSync(dest,bytes);
    assert.throws(()=>prepareMirageProfile(baseline,options),/conflicting bytes/);
    copyFileSync(path.join(root,pin.destination),dest);
    const conflict=path.resolve(temporary,baseline.env.BLUSTONE_PACKAGE_DIR,pin.name);
    mkdirSync(path.dirname(conflict),{recursive:true});writeFileSync(conflict,'AUTHORED_CORRUPT_TEST_ONLY');
    assert.throws(()=>prepareMirageProfile(baseline,options),/conflicting bytes/,'Good fallback cannot hide a bad preferred resource');
    rmSync(conflict);
    rmSync(dest);
    assert.throws(()=>prepareMirageProfile(baseline,options),/missing/);
    copyFileSync(path.join(root,pin.destination),dest);
  }
} finally {
  assert.ok(path.resolve(temporary).startsWith(path.join(path.resolve(tmpdir()),'blustone-mirage-profile-')));
  rmSync(temporary,{recursive:true,force:true});
}
assert.deepEqual(baseline,before);
assert.deepEqual(readFileSync(file),original);
console.log('Mirage profile readiness: exact original provenance and all3 pins,139-to140/stamp1634687, future stamps/idempotence, inactive/nonmutation, malformed/reordered/missing/corrupt/conflicting/overflow refusals passed.');
