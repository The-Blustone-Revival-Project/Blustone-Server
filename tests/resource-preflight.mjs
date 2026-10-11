import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {preflight} from '../scripts/resources/verify.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baseline=JSON.parse(readFileSync(path.join(root,'config/profiles/current-e6.json'),'utf8'));
const before=JSON.stringify(baseline);
assert.equal(preflight(root,baseline),139);
const future=structuredClone(baseline);
future.name='future-profile';future.resourceStamp='1635001';
for(const key of ['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP']) future.env[key]='1635001';
assert.equal(preflight(root,future),139,'coherent future profiles are not constrained to E6 stamp');
for(const key of ['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP']) {
  const broken=structuredClone(future);broken.env[key]='1635000';
  assert.throws(()=>preflight(root,broken),/Incoherent/);
}
for(const stamp of ['0','-1','1.5','NaN','2147483648',1634684,null]) {
  const broken=structuredClone(future);broken.resourceStamp=stamp;
  assert.throws(()=>preflight(root,broken),/Invalid declared resource stamp/);
}
const undeclared=structuredClone(future);delete undeclared.resourceStamp;
assert.throws(()=>preflight(root,undeclared),/Invalid declared resource stamp/);
const duplicate=structuredClone(baseline);duplicate.env.BLUSTONE_PACKAGE_NAMES+=',E_NEW.jet';duplicate.expectedPackages++;
assert.throws(()=>preflight(root,duplicate),/count\/order/);
const empty=structuredClone(baseline);empty.env.BLUSTONE_PACKAGE_NAMES+=',';
assert.throws(()=>preflight(root,empty),/package list/);
const missing=structuredClone(baseline);missing.env.BLUSTONE_PACKAGE_NAMES=missing.env.BLUSTONE_PACKAGE_NAMES.replace('E_NEW.jet','MISSING_ORIGINAL.jet');
assert.throws(()=>preflight(root,missing),/Missing/);
assert.equal(JSON.stringify(baseline),before,'preflight never mutates a profile');
console.log('Resource preflight: E6 pin, coherent future stamp, malformed/mismatched stamps, duplicate/missing package refusals passed');
