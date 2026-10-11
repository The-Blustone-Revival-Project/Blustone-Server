import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {prepareGuildProfile} from '../scripts/profiles/prepare-guild.mjs';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'config/profiles/current-e6-materials.json');
const original=readFileSync(file),baseline=JSON.parse(original);
const pins=JSON.parse(readFileSync(path.join(root,'resources/manifests/guild-originals.json')));
const imported=JSON.parse(readFileSync(path.join(root,'resources/manifests/imported-files.json')));
assert.equal(pins.length,1);
const source=imported.find(row=>row.destination===pins[0].destination);
for(const key of ['source','destination','bytes','sha256']) assert.equal(pins[0][key],source[key]);
const candidate=prepareGuildProfile(baseline);
assert.equal(candidate.expectedPackages,140);
assert.equal(candidate.resourceStamp,'1634686');
assert.equal(candidate.env.BLUSTONE_PACKAGE_NAMES,baseline.env.BLUSTONE_PACKAGE_NAMES+',GUILD.jet');
assert.deepEqual(prepareGuildProfile(candidate),candidate);
assert.equal(candidate.env.BLUSTONE_CARD_REFERENCE_PROFILE,baseline.env.BLUSTONE_CARD_REFERENCE_PROFILE);
assert.deepEqual(readFileSync(file),original,'Preparation must preserve active baseline bytes');
preflight(root,candidate);
for(const value of ['0','NaN','1634686.0','2147483648']) {
  const bad=structuredClone(baseline);bad.env.BLUSTONE_RESOURCE_VERSION=value;
  assert.throws(()=>prepareGuildProfile(bad),/stamp/);
}
const overflow=structuredClone(baseline);
for(const key of ['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'])overflow.env[key]='2147483647';
assert.throws(()=>prepareGuildProfile(overflow),/overflow/);
const duplicate=structuredClone(baseline);duplicate.env.BLUSTONE_PACKAGE_NAMES+=',GUILD.jet,GUILD.jet';duplicate.expectedPackages=141;
assert.throws(()=>prepareGuildProfile(duplicate),/baseline/);
assert.throws(()=>prepareGuildProfile(baseline,{originals:[{...pins[0],sha256:'0'.repeat(64)}]}),/bytes/);
const temporary=mkdtempSync(path.join(tmpdir(),'blustone-guild-profile-'));
try {
  assert.throws(()=>prepareGuildProfile(baseline,{resourceRoot:temporary,originals:pins}),/missing/);
  const broken=path.resolve(temporary,baseline.env.BLUSTONE_PACKAGE_DIR,'GUILD.jet');
  assert.ok(broken.startsWith(path.resolve(temporary)+path.sep));
  mkdirSync(path.dirname(broken),{recursive:true});writeFileSync(broken,'AUTHORED_CORRUPT_TEST_ONLY');
  assert.throws(()=>prepareGuildProfile(baseline,{resourceRoot:temporary,originals:pins}),/bytes/);
} finally {
  assert.ok(path.resolve(temporary).startsWith(path.join(path.resolve(tmpdir()),'blustone-guild-profile-')));
  rmSync(temporary,{recursive:true,force:true});
}
console.log('Guild profile readiness: exact original pin,139-to140/stamp1634686, idempotence, no baseline mutation, missing/corrupt/duplicate/overflow refusals passed; inactive.');
