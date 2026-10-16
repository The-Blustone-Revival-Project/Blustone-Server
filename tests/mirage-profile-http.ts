import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import type {Server} from 'node:http';
import {repositoryPath} from '../src/paths.js';

// Actual compiled app, no account/auth work, ephemeral loopback listener only.
const profilePath=repositoryPath('config/profiles/current-e6-mirage.json');
const baselinePath=repositoryPath('config/profiles/current-e6-materials.json');
const profileBytes=readFileSync(profilePath),baselineBytes=readFileSync(baselinePath);
const profile=JSON.parse(profileBytes.toString('utf8'));
const pins=JSON.parse(readFileSync(repositoryPath('resources/manifests/mirage-originals.json'),'utf8')) as
  {name:string;destination:string;bytes:number;sha256:string}[];
const hash=(algorithm:string,bytes:Buffer)=>createHash(algorithm).update(bytes).digest('hex');
const originals=new Map(pins.map(pin=>[pin.name,readFileSync(repositoryPath(pin.destination))]));
const previous=new Map(Object.entries(process.env).filter(([key])=>key.startsWith('BLUSTONE_')));
const directory=mkdtempSync(path.join(tmpdir(),'blustone-mirage-cdn-http-'));
const stateFile=path.join(directory,'state.json');
let server:Server|undefined;
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  for(const [key,value] of Object.entries(profile.env as Record<string,string>))process.env[key]=value;
  for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_CATALOG_PATH'])
    process.env[key]=repositoryPath(profile.env[key]);
  process.env.BLUSTONE_STATE_FILE=stateFile;
  process.env.BLUSTONE_BIND_HOST='127.0.0.1';
  process.env.BLUSTONE_BASE_URL='http://127.0.0.1:0';
  assert.ok(path.isAbsolute(stateFile));
  const {createApp}=await import(pathToFileURL(repositoryPath('dist/src/server.js')).href);
  const context=createApp({baseUrl:'http://127.0.0.1:0',stateFile});
  server=context.app.listen(0,'127.0.0.1');
  await new Promise<void>((resolve,reject)=>{server!.once('listening',resolve);server!.once('error',reject);});
  const address=server!.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
  const base=`http://127.0.0.1:${address.port}`,stamp=profile.resourceStamp;
  const stateBefore=existsSync(stateFile)?readFileSync(stateFile):undefined;
  const manifestResponse=await fetch(`${base}/reslist_${stamp}.list`);
  assert.equal(manifestResponse.status,200);
  const lines=(await manifestResponse.text()).trimEnd().split('\n').map(line=>line.replace(/\r$/,''));
  assert.equal(lines[0],stamp);assert.equal(lines[1],'140');assert.equal(lines.length,143);
  const rows=lines.slice(3).map(line=>line.split(','));
  assert.deepEqual(rows.map(row=>row[0]+'.jet'),profile.env.BLUSTONE_PACKAGE_NAMES.split(','));
  assert.equal(new Set(rows.map(row=>row[0])).size,140);
  assert.equal(Number(lines[2]),rows.reduce((total,row)=>total+Number(row[2]),0));
  for(const row of rows) {
    assert.equal(row.length,6);assert.equal(row[1],stamp);assert.match(row[2],/^[1-9][0-9]*$/);
    assert.equal(row[3],'0');assert.match(row[4],/^[A-F0-9]{32}$/);assert.match(row[5],/^[A-F0-9]{32}$/);
  }
  for(const pin of pins) {
    const original=originals.get(pin.name)!;
    assert.equal(original.length,pin.bytes);assert.equal(hash('sha256',original),pin.sha256);
    const row=rows.find(row=>row[0]===pin.name.slice(0,-4));assert.ok(row);
    assert.equal(row[4],hash('md5',original).toUpperCase(),'Manifest signature is inner original MD5');
    const response=await fetch(`${base}/${row[0]}_${stamp}.pkg`);
    assert.equal(response.status,200);
    const bytes=Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length,Number(row[2]));assert.equal(hash('md5',bytes).toUpperCase(),row[5]);
    assert.ok(bytes.length>=20);
    assert.deepEqual(Array.from({length:5},(_,i)=>bytes.readUInt32LE(i*4)),[Number(stamp),0,1,0,1]);
    // Complete PKGIv1 table: size then absolute offset, exactly one original entry.
    let cursor=20;const count=bytes.readUInt32LE(16),entries:{name:string;size:number;offset:number}[]=[];
    for(let index=0;index<count;index++) {
      assert.ok(cursor<bytes.length);const nameLength=bytes[cursor++];assert.ok(nameLength>0);
      assert.ok(cursor+nameLength+8<=bytes.length);
      const nameBytes=bytes.subarray(cursor,cursor+nameLength),name=nameBytes.toString('utf8');
      assert.deepEqual(Buffer.from(name,'utf8'),nameBytes);cursor+=nameLength;
      const size=bytes.readUInt32LE(cursor),offset=bytes.readUInt32LE(cursor+4);cursor+=8;
      entries.push({name,size,offset});
    }
    assert.deepEqual(entries,[{name:pin.name,size:pin.bytes,offset:cursor}]);
    const entry=entries[0];assert.equal(entry.offset+entry.size,bytes.length,'Exact payload EOF, no padding/trailing entry');
    const inner=bytes.subarray(entry.offset,entry.offset+entry.size);
    assert.deepEqual(inner,original);assert.equal(hash('sha256',inner),pin.sha256);
    assert.equal(hash('md5',inner).toUpperCase(),row[4]);
  }
  assert.deepEqual(readFileSync(profilePath),profileBytes);
  assert.deepEqual(readFileSync(baselinePath),baselineBytes);
  for(const pin of pins)assert.deepEqual(readFileSync(repositoryPath(pin.destination)),originals.get(pin.name));
  if(stateBefore)assert.deepEqual(readFileSync(stateFile),stateBefore);
  else assert.equal(existsSync(stateFile),false,'Unauthenticated CDN reads must not create persistent accounts/state');
  assert.equal(existsSync(stateFile+'.tmp'),false);
  console.log('Compiled Mirage CDN HTTP:140 ordered coherent rows, exact PKGIv1 tables/EOF, original MIRAGE+LEVELING+ST002 SHA/inner MD5/outer MD5+size, no baseline/original/state writes; inactive profile only.');
} finally {
  if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  for(const [key,value] of previous)if(value!==undefined)process.env[key]=value;
  assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'blustone-mirage-cdn-http-')));
  rmSync(directory,{recursive:true,force:true});
}
