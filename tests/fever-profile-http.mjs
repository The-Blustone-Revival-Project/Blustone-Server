import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {preflight} from '../scripts/resources/verify.mjs';
import {verifySingleJet} from '../scripts/resources/verify-single-jet.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const baseline=read('config/profiles/current-e6-materials-compatible-progression.json');
const candidate=read('config/profiles/current-e6-fever-compatible-progression.json');
const original=readFileSync(path.join(root,'resources/runtime/assets/CFE_PUB.jet'));
const pin={name:'CFE_PUB.jet',bytes:281615,sha256:'bae718faf6aa7f1b5f6f868ea77db78e3fc8f0770999729fa64dc1b99e4b7f8b'};
assert.equal(original.length,pin.bytes);
assert.equal(createHash('sha256').update(original).digest('hex'),pin.sha256);
const ledger=read('resources/manifests/imported-files.json').filter(row=>row.destination==='resources/runtime/assets/CFE_PUB.jet');
assert.equal(ledger.length,1);assert.equal(ledger[0].sha256,pin.sha256);assert.equal(ledger[0].bytes,pin.bytes);
assert.equal(preflight(root,candidate),140);
assert.equal(candidate.preparedOnly,true);
const expected=structuredClone(baseline.env);
expected.BLUSTONE_PACKAGE_NAMES+=',CFE_PUB.jet';
for(const key of ['BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'])expected[key]=candidate.resourceStamp;
assert.deepEqual(candidate.env,expected,'Every existing runtime policy/package remains exact');
assert.equal(candidate.resourceStamp,'1634691');
const previous=new Map(Object.entries(process.env).filter(([key])=>key.startsWith('BLUSTONE_')));
let listener;
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,candidate.env);
  for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_CATALOG_PATH'])process.env[key]=path.join(root,candidate.env[key]);
  // No login/gameplay and no persistent state access in this transport test.
  delete process.env.BLUSTONE_STATE_FILE;
  const {createApp}=await import(pathToFileURL(path.join(root,'dist/src/server.js')).href);
  const {app}=createApp({baseUrl:'http://127.0.0.1:0'});
  listener=app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>{listener.once('listening',resolve);listener.once('error',reject);});
  const address=listener.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
  const base=`http://127.0.0.1:${address.port}`,stamp=candidate.resourceStamp;
  const response=await fetch(`${base}/reslist_${stamp}.list`);assert.equal(response.status,200);
  const lines=(await response.text()).trimEnd().split(/\r?\n/);assert.equal(lines[0],stamp);assert.equal(lines[1],'140');
  const rows=lines.slice(3).map(line=>line.split(','));assert.equal(rows.length,140);
  assert.deepEqual(rows.map(row=>row[0]+'.jet'),candidate.env.BLUSTONE_PACKAGE_NAMES.split(','));
  const row=rows.find(row=>row[0]==='CFE_PUB');assert.ok(row);
  const pkg=await fetch(`${base}/CFE_PUB_${stamp}.pkg`);assert.equal(pkg.status,200);
  const bytes=Buffer.from(await pkg.arrayBuffer());
  assert.deepEqual(verifySingleJet(bytes,row,pin,original),{name:pin.name,originalBytes:pin.bytes,packageBytes:281655});
  assert.equal(Number(lines[2]),rows.reduce((sum,item)=>sum+Number(item[2]),0));
  console.log('Original fever profile: exact139 baseline, pinned CFE_PUB, coherent140 manifest and original PKGI1 payload passed; native validation pending');
} finally {
  if(listener)await new Promise(resolve=>listener.close(resolve));
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  for(const [key,value] of previous)process.env[key]=value;
}
