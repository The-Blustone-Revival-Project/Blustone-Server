import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'node:http';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {repositoryPath} from '../src/paths.js';
import {createApp} from '../src/server.js';

// Bounded manual-style A/B, not a latency threshold test or cold-I/O benchmark.
const profile=JSON.parse(readFileSync(repositoryPath('config/profiles/current-restoration-fever-compatible-progression.json'),'utf8'));
const prior={...process.env},samples:unknown[]=[],manifests:Buffer[]=[];
try {
  for(const enabled of [false,true]) {
    for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
    Object.assign(process.env,profile.env,{BLUSTONE_RESOURCE_SNAPSHOT:enabled?'1':'0'});delete process.env.BLUSTONE_STATE_FILE;
    for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_CATALOG_PATH'])
      process.env[key]=path.resolve(repositoryPath(),profile.env[key]);
    const started=performance.now(),ctx=createApp({baseUrl:'http://127.0.0.1:0'}),server=createServer(ctx.app);
    const appCreateMs=performance.now()-started;
    await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
    try {
      const address=server.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
      const base=`http://127.0.0.1:${address.port}`,stamp=profile.resourceStamp;
      const timed=async(route:string,headers:Record<string,string>={})=>{
        const begin=performance.now(),response=await fetch(base+route,{headers});
        const bytes=Buffer.from(await response.arrayBuffer());return {ms:performance.now()-begin,status:response.status,bytes};
      };
      const first=await timed(`/reslist_${stamp}.list`),pkg=await timed(`/CFE_PUB_${stamp}.pkg`,{range:'bytes=0-15'}),second=await timed(`/reslist_${stamp}.list`);
      assert.equal(first.status,200);assert.equal(pkg.status,206);assert.equal(second.status,200);
      assert.deepEqual(first.bytes,second.bytes);assert.equal(pkg.bytes.readUInt32LE(0),Number(stamp));
      manifests.push(first.bytes);assert.equal(first.bytes.toString().split('\n')[1],'170');
      const round=(n:number)=>Math.round(n*100)/100;
      samples.push({snapshot:enabled,appCreateMs:round(appCreateMs),firstManifestMs:round(first.ms),rangePackageMs:round(pkg.ms),secondManifestMs:round(second.ms)});
    }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
  }
  assert.deepEqual(manifests[0],manifests[1]);
  console.log('Resource snapshot actual170 A/B '+JSON.stringify({profile:profile.name,stamp:profile.resourceStamp,samples,
    conditions:'same host/process, sequential off then on, OS cache uncontrolled; not cold I/O or native download timing'}));
}finally{
  for(const key of Object.keys(process.env))if(!Object.hasOwn(prior,key))delete process.env[key];Object.assign(process.env,prior);
}
