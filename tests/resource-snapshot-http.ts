import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer,type Server} from 'node:http';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../src/server.js';

const previous={...process.env},dir=mkdtempSync(path.join(tmpdir(),'blustone-resource-snapshot-'));
const assets=path.join(dir,'assets'),packages=path.join(dir,'packages'),tree=path.join(dir,'tree');
for(const d of [assets,packages,tree])mkdirSync(d);
const servers:Server[]=[];
const configure=(on:boolean,extra:Record<string,string>={})=>{
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,{BLUSTONE_RESOURCE_SNAPSHOT:on?'1':'0',BLUSTONE_PACKAGE_DIR:packages,
    BLUSTONE_RESOURCE_ASSET_DIR:assets,BLUSTONE_PACKAGE_TREE_DIR:tree,BLUSTONE_PACKAGE_NAMES:'Tiny.jet,E_NEW.jet',
    BLUSTONE_PACKAGE_MODE:'pkgi1-tree',BLUSTONE_RESOURCE_ASSET_NAMES:'Extra.jet',BLUSTONE_RESOURCE_ASSET_GLOB:'',
    BLUSTONE_RESLIST_STAMP:'200',BLUSTONE_RESLIST_HEADER_STAMP:'201',...extra});
};
const app=async()=>{
  const ctx=createApp({baseUrl:'http://127.0.0.1:0'}),server=createServer(ctx.app);servers.push(server);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
  return {base:`http://127.0.0.1:${address.port}`,state:ctx.state};
};
const get=async(base:string,route:string,headers:Record<string,string>={})=>{
  const response=await fetch(base+route,{headers});return {status:response.status,bytes:Buffer.from(await response.arrayBuffer()),
    range:response.headers.get('content-range'),length:response.headers.get('content-length'),accept:response.headers.get('accept-ranges')};
};
const md5=(b:Buffer)=>createHash('md5').update(b).digest('hex').toUpperCase();
try {
  writeFileSync(path.join(assets,'Tiny.jet'),'original tiny bytes');writeFileSync(path.join(assets,'E_NEW.jet'),'base original');
  writeFileSync(path.join(assets,'Extra.jet'),'folded original');
  configure(false);const off=await app();const offState=JSON.stringify(off.state.summary());
  const originalManifest=await get(off.base,'/reslist_200.list'),originalRaw=await get(off.base,'/Tiny.jet'),originalPkg=await get(off.base,'/Tiny_200.pkg');
  const originalTree=await get(off.base,'/E_NEW_200.pkg');
  configure(true);const on=await app();assert.deepEqual(await get(on.base,'/reslist_200.list'),originalManifest);
  assert.deepEqual(await get(on.base,'/Tiny.jet'),originalRaw);assert.deepEqual(await get(on.base,'/Tiny_200.pkg'),originalPkg);
  assert.deepEqual(await get(on.base,'/E_NEW_200.pkg'),originalTree);
  const rows=originalManifest.bytes.toString().trim().split('\n').slice(3).map(x=>x.split(','));
  assert.equal(rows[0]![4],md5(originalRaw.bytes));assert.equal(rows[0]![5],md5(originalPkg.bytes));
  assert.equal(originalPkg.bytes.readUInt32LE(0),200);assert.equal(originalManifest.bytes.toString().split('\n')[0],'201');
  for(const route of ['/Tiny.jet','/Tiny_200.pkg'])for(const range of ['bytes=0-4','bytes=4-','bytes=-3','bytes=999999-',
    'bytes=8-3','bytes=1-2,5-6','nonsense','bytes=0-4,3-8'])
    assert.deepEqual(await get(on.base,route,{range}),await get(off.base,route,{range}),route+' '+range);
  for(const ifRange of ['Thu, 01 Jan 1970 00:00:00 GMT','Thu, 01 Jan 2100 00:00:00 GMT','"wrong"'])
    assert.deepEqual(await get(on.base,'/Tiny.jet',{range:'bytes=0-2','if-range':ifRange}),await get(off.base,'/Tiny.jet',{range:'bytes=0-2','if-range':ifRange}));
  const rawResponse=await fetch(off.base+'/Tiny.jet');await rawResponse.arrayBuffer();
  const conditionals:Record<string,string>[]=[{'if-none-match':rawResponse.headers.get('etag')!},{'if-modified-since':rawResponse.headers.get('last-modified')!}];
  for(const headers of conditionals)
    assert.deepEqual(await get(on.base,'/Tiny.jet',headers),await get(off.base,'/Tiny.jet',headers),'Raw conditional-file behavior remains exact');
  assert.equal((await get(on.base,'/Missing_200.pkg')).status,404);
  // Raw and folded bytes/config remain one coherent app epoch after originals change.
  writeFileSync(path.join(assets,'Tiny.jet'),'changed tiny bytes longer');writeFileSync(path.join(assets,'Extra.jet'),'changed folded');
  assert.deepEqual(await get(on.base,'/Tiny.jet'),originalRaw);assert.deepEqual(await get(on.base,'/Tiny_200.pkg'),originalPkg);
  assert.deepEqual(await get(on.base,'/E_NEW_200.pkg'),originalTree);assert.deepEqual(await get(on.base,'/reslist_200.list'),originalManifest);
  assert.notDeepEqual((await get(off.base,'/Tiny.jet')).bytes,originalRaw.bytes);
  assert.notDeepEqual((await get(off.base,'/Tiny_200.pkg')).bytes,originalPkg.bytes);
  assert.notDeepEqual((await get(off.base,'/reslist_200.list')).bytes,originalManifest.bytes);
  configure(true,{BLUSTONE_PACKAGE_NAMES:'Tiny.jet',BLUSTONE_PACKAGE_MODE:'wrap',BLUSTONE_RESLIST_STAMP:'300',BLUSTONE_RESLIST_HEADER_STAMP:'301',
    BLUSTONE_FORCE_PACKAGE_RANGE:'1',BLUSTONE_RESLIST_HEADER:'override before snapshot'});
  const second=await app();const secondRaw=await get(second.base,'/Tiny.jet');assert.notDeepEqual(secondRaw.bytes,originalRaw.bytes);
  const secondPkg=await get(second.base,'/Tiny_300.pkg');assert.equal(secondPkg.status,206);assert.equal(secondPkg.bytes.readUInt32LE(0),300);
  assert.equal((await get(second.base,'/reslist_300.list')).bytes.toString(),'override before snapshot\n');
  // Mutating global env cannot change either app's completed resource epoch.
  configure(false,{BLUSTONE_PACKAGE_NAMES:'E_NEW.jet',BLUSTONE_PACKAGE_MODE:'empty',BLUSTONE_RESLIST_STAMP:'400',BLUSTONE_RESLIST_HEADER_STAMP:'401'});
  assert.deepEqual(await get(on.base,'/reslist_400.list'),originalManifest);assert.deepEqual(await get(on.base,'/Tiny_400.pkg'),originalPkg);
  assert.deepEqual(await get(second.base,'/Tiny_400.pkg'),secondPkg);assert.equal((await get(second.base,'/E_NEW_400.pkg')).status,404);
  assert.equal((await get(second.base,'/reslist_400.list')).bytes.toString(),'override before snapshot\n');
  const debug=async(body:unknown)=>{const r=await fetch(on.base+'/debug/reslist',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.equal(r.status,200);};
  await debug({sequence:['debug1','debug2']});assert.equal((await get(on.base,'/reslist_200.list')).bytes.toString(),'debug1\n');
  assert.equal((await get(on.base,'/reslist_200.list')).bytes.toString(),'debug2\n');
  await debug({body:'manual'});assert.equal((await get(on.base,'/reslist_200.list')).bytes.toString(),'manual\n');
  await debug({sequence:[]});assert.deepEqual(await get(on.base,'/reslist_200.list'),originalManifest);
  // New app sees new bytes. App creation stays lazy: change before its first build.
  configure(true);const lazy=await app();writeFileSync(path.join(assets,'Tiny.jet'),'latest before first snapshot');
  const latest=await get(lazy.base,'/Tiny.jet');assert.equal(latest.bytes.toString(),'latest before first snapshot');
  writeFileSync(path.join(assets,'Tiny.jet'),'after lazy snapshot');assert.deepEqual(await get(lazy.base,'/Tiny.jet'),latest);
  assert.deepEqual(await get(on.base,'/Tiny.jet'),originalRaw);
  // Non-container .pkg follows raw-file range semantics, including suffix ranges.
  configure(false,{BLUSTONE_PACKAGE_MODE:''});const rawOff=await app();
  configure(true,{BLUSTONE_PACKAGE_MODE:''});const rawOn=await app();
  for(const range of ['bytes=-3','bytes=0-2','bytes=999999-','nonsense'])
    assert.deepEqual(await get(rawOn.base,'/Tiny_200.pkg',{range}),await get(rawOff.base,'/Tiny_200.pkg',{range}));
  for(const mode of ['pkgi1','wrap','empty']) {
    configure(false,{BLUSTONE_PACKAGE_MODE:mode});const defaultMode=await app();
    configure(true,{BLUSTONE_PACKAGE_MODE:mode});const snapshotMode=await app();
    assert.deepEqual(await get(snapshotMode.base,'/reslist_200.list'),await get(defaultMode.base,'/reslist_200.list'),mode+' manifest');
    assert.deepEqual(await get(snapshotMode.base,'/Tiny_200.pkg'),await get(defaultMode.base,'/Tiny_200.pkg'),mode+' package');
  }
  configure(true,{BLUSTONE_RESLIST_BOOTSTRAP_HEADER:'bootstrap diagnostic'});const bootstrap=await app();
  assert.equal((await get(bootstrap.base,'/reslist_200.list')).bytes.toString(),'bootstrap diagnostic\n');
  writeFileSync(path.join(assets,'Tiny.jet'),'after bootstrap diagnostic before actual snapshot');
  assert.equal((await get(bootstrap.base,'/Tiny.jet')).bytes.toString(),'after bootstrap diagnostic before actual snapshot');
  assert.equal((await get(bootstrap.base,'/reslist_200.list')).bytes.toString().split('\n')[0],'201');
  assert.equal(JSON.stringify(off.state.summary()),offState,'Resource caching does not alter game/auth state');
  console.log('Resource snapshot HTTP: opt-in lazy app epochs, exact off/on manifest/raw/PKGI1/folded bytes+hashes, file/env mutations, new apps, raw/pkg range distinctions, debug overrides and state isolation passed.');
}finally{
  await Promise.all(servers.map(server=>new Promise<void>(resolve=>server.close(()=>resolve()))));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(previous,key))delete process.env[key];Object.assign(process.env,previous);
  rmSync(dir,{recursive:true,force:true});
}
