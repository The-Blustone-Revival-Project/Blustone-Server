import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import type {Server} from 'node:http';
import {repositoryPath} from '../src/paths.js';

// Actual compiled app, no account/auth work, ephemeral loopback listener only.
const profilePath=repositoryPath('config/profiles/current-restoration.json');
const baselinePath=repositoryPath('config/profiles/current-e6-materials.json');
const profileBytes=readFileSync(profilePath),baselineBytes=readFileSync(baselinePath);
const profile=JSON.parse(profileBytes.toString('utf8'));
const baseline=JSON.parse(baselineBytes.toString('utf8'));
const pins=JSON.parse(readFileSync(repositoryPath('resources/manifests/restoration-originals.json'),'utf8')) as
  {name:string;destination:string;bytes:number;sha256:string}[];
const hash=(algorithm:string,bytes:Buffer)=>createHash(algorithm).update(bytes).digest('hex');
const originals=new Map(pins.map(pin=>[pin.name,readFileSync(repositoryPath(pin.destination))]));
const previous=new Map(Object.entries(process.env).filter(([key])=>key.startsWith('BLUSTONE_')));
const directory=mkdtempSync(path.join(tmpdir(),'blustone-restoration-http-'));
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
  // Seed an existing account under the previous14-reference profile in a
  // separate compiled process. No native/private account is imported.
  const seedScript=`
    import {ServerState} from '${pathToFileURL(repositoryPath('dist/src/state.js')).href}';
    import {starterReference} from '${pathToFileURL(repositoryPath('dist/src/bootstrap.js')).href}';
    const state=new ServerState('http://localhost',process.env.BLUSTONE_STATE_FILE);
    const auth=state.registerGuest({device_id:'restoration-existing-owner'},{}).ret_data;
    const game=state.gameByPvid.get(auth.pvid);
    game.gold=7777;game.ap=42;game.bp=3;
    game.ap_updated_at=Date.now()+86400000;game.bp_updated_at=game.ap_updated_at;
    state.persist();console.log(JSON.stringify({refs:starterReference,pvid:auth.pvid,otp:auth.otp}));`;
  const seedEnv={...process.env,...baseline.env,BLUSTONE_STATE_FILE:stateFile};
  const prior=JSON.parse(execFileSync(process.execPath,['--input-type=module','--eval',seedScript],{cwd:directory,env:seedEnv,encoding:'utf8',maxBuffer:8*1024*1024}));
  assert.equal(prior.refs.length,14);
  const savedBytes=readFileSync(stateFile),saved=JSON.parse(savedBytes.toString('utf8'));
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
  assert.equal(lines[0],stamp);assert.equal(lines[1],'169');assert.equal(lines.length,172);
  const rows=lines.slice(3).map(line=>line.split(','));
  assert.deepEqual(rows.map(row=>row[0]+'.jet'),profile.env.BLUSTONE_PACKAGE_NAMES.split(','));
  assert.equal(new Set(rows.map(row=>row[0])).size,169);
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
  const cardResponse=await fetch(base+'/reference/GetCard',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:''});
  assert.equal(cardResponse.status,200);const cards=(await cardResponse.json()).ret_data;
  assert.equal(cards.length,22,'Combined ordinary reference publication');
  for(const row of prior.refs)assert.deepEqual(cards.find((next:any)=>next.base.id===row.base.id),row,'Existing reference stats/skills are never retuned by resource composition');
  const added=['007','011','014','016','018','030','048','054'];
  assert.deepEqual(cards.filter((row:any)=>!prior.refs.some((old:any)=>old.base.id===row.base.id)).map((row:any)=>row.base.id).sort(),added);
  for(const id of added){const row=cards.find((next:any)=>next.base.id===id);
    assert.ok(row.stat.every((stat:any)=>stat.hp==='1000'&&stat.atk==='100'&&stat.def==='50'),'Additional ordinary stats remain explicit neutral fixtures');
    assert.ok(row.skill.every((slot:any)=>slot.effect.length===0&&slot.cost===0));}
  const beforeGame=saved.gameStates.find(([id]:any)=>id===prior.pvid)[1];
  const ids=[...beforeGame.starter_cards,...beforeGame.recruited_cards].map((row:any)=>row.inst_id);
  const inven=await fetch(base+'/world/RefreshInven',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({pvid:String(prior.pvid),otp:prior.otp,card_inst_list:JSON.stringify(ids)})});
  assert.equal(inven.status,200);const inventory=(await inven.json()).ret_data.card;
  assert.deepEqual(inventory,[...beforeGame.starter_cards,...beforeGame.recruited_cards]);
  assert.deepEqual(readFileSync(stateFile),savedBytes,'CDN/reference/inventory reads preserve prior account, ownership, decks, wallets, claims and future energy clocks');
  assert.deepEqual(readFileSync(profilePath),profileBytes);
  assert.deepEqual(readFileSync(baselinePath),baselineBytes);
  for(const pin of pins)assert.deepEqual(readFileSync(repositoryPath(pin.destination)),originals.get(pin.name));
  if(stateBefore)assert.deepEqual(readFileSync(stateFile),stateBefore);
  else assert.equal(existsSync(stateFile),false,'Unauthenticated CDN reads must not create persistent accounts/state');
  assert.equal(existsSync(stateFile+'.tmp'),false);
  console.log('Compiled restoration HTTP:169 ordered CDN groups,32 original pins/PKGI tables/hashes,22 ordinary references with14 exact prior rows +8 neutral unowned additions, unchanged existing account/save/profile/ownership; no native activation claim.');
} finally {
  if(server)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  for(const [key,value] of previous)if(value!==undefined)process.env[key]=value;
  assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'blustone-restoration-http-')));
  rmSync(directory,{recursive:true,force:true});
}
