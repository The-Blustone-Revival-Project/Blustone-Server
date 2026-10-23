import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:net';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryPath} from '../src/paths.js';

// Real compiled child/ECDH/HMAC/AES. All accounts and reported outcomes are
// disposable LOCAL fixtures. Legacy state is produced by methods, not edited JSON.
const directory=mkdtempSync(path.join(tmpdir(),'blustone-terminal-adoption-http-')),file=path.join(directory,'state.json');
const profileFile=repositoryPath('config/profiles/current-restoration-fever-compatible-progression.json');
const policyFile=repositoryPath('config/policies/mirage-local-zero-reward.json');
const profileBytes=readFileSync(profileFile),policyBytes=readFileSync(policyFile);
const profile=JSON.parse(profileBytes.toString()),policy=JSON.parse(policyBytes.toString());
const savedEnv={...process.env},realNow=Date.now;
// Explicit LOCAL offset places the child near noon; no production time hook.
const current=new Date(),offset=720-current.getUTCHours()*60-current.getUTCMinutes();
const begin=Math.floor(realNow()/1000)-86400-120;
const reentry={payment:'free-local',daily_attempts:3,day_offset_minutes:offset,on_unavailable:'abandon-local',floors:[],
  transitions:[{floor:1,cleared:1,failed:1}]};
const settings:Record<string,string>={...profile.env,BLUSTONE_STATE_FILE:file,BLUSTONE_MIRAGE_MODE:'disabled',
  BLUSTONE_TEAM_LEVEL_PROFILE:'local-linear-100',BLUSTONE_RUPEE_SHOP_MODE:'archive-2021-base-only',BLUSTONE_RUPEE_SHOP_DAILY_LIMIT:'3'};
for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_CATALOG_PATH'])settings[key]=repositoryPath(settings[key]);
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));
const address=probe.address();assert.ok(address&&typeof address!=='string');const port=address.port;assert.notEqual(port,8080);
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
const base=`http://127.0.0.1:${port}`;Object.assign(settings,{BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:'127.0.0.1',BLUSTONE_BASE_URL:base});
let child:ChildProcess|undefined;
const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}child=undefined;};
const read=()=>JSON.parse(readFileSync(file,'utf8'));
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];Object.assign(process.env,settings);
  const compiled=(name:string)=>import(pathToFileURL(repositoryPath('dist/src/'+name+'.js')).href);
  const {ServerState}=await compiled('state'),{gameResponse}=await compiled('game-routes'),{parseStateWithGemIds}=await compiled('gem-wire');
  Date.now=()=>begin*1000;
  const seed=new ServerState(base,file,{mirageMode:'local-configured',miragePolicy:policy,rupeeShopMode:'archive-2021-base-only',rupeeShopDailyLimit:3});
  const actors=[0,1,2].map(i=>{const data=seed.registerGuest({device_id:'terminal-http-dummy-'+i},{}).ret_data;return {pvid:data.pvid,otp:data.otp};});
  const actor=actors[0]!;
  assert.equal(gameResponse(seed,'/shop/BuyGlobalItem',{...actor,target_ref_id:'local_rupee_pack',qty:1,price_type:1,item_inst_id:0},{}).result_code,1);
  assert.equal(read().version,8);
  const seedCall=(route:string,extra:Record<string,unknown>={})=>{const result=seed.mirageAction('/mirage/'+route,{...actor,...extra},{});assert.equal(result.result_code,1);return result.ret_data;};
  const ids=seedCall('GetInfo').entry.map((row:any)=>row.id);
  seedCall('RegisterDeck',{inst_list:JSON.stringify(ids)});
  seedCall('End',{floor:'1',stair:'1',remain_deck_hp:JSON.stringify(ids.map((inst_id:number)=>({inst_id,hp_percent:8000}))),remain_enemy_hp:'[0]'});
  seedCall('Reward',{floor:'1',stair:'1'});seedCall('GetNextFloor');seedCall('GetInfo',{reset:'1',stay:'1'});
  Date.now=realNow;
  const legacy=read(),legacyBytes=readFileSync(file),oldRun=structuredClone(legacy.mirageRuns[0][1]);
  assert.equal(legacy.version,12);assert.equal(legacy.mirageRuns.length,1);assert.equal(oldRun.abandoned,true);
  assert.deepEqual(oldRun.claimed,[1]);assert.equal(oldRun.cache.inst_base.begin_ltime,begin);assert.deepEqual(oldRun.cache.entry,[]);
  assert.equal(Object.hasOwn(legacy,'mirageSeries'),false);assert.equal(legacy.accounts.length,3);
  const oldAccounts=structuredClone(legacy.accounts),oldGames=structuredClone(legacy.gameStates);
  assert.equal(oldAccounts.find((a:any)=>a.pvid===actor.pvid).rupeeShopCounter.manda,1);
  const launch=async(mode:'local-configured'|'disabled'='local-configured',adoption='terminal-local')=>{
    const env:NodeJS.ProcessEnv={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('BLUSTONE_'))),...settings,
      BLUSTONE_MIRAGE_MODE:mode,BLUSTONE_MIRAGE_REENTRY_ADOPTION:adoption};
    if(mode==='local-configured'){env.BLUSTONE_MIRAGE_POLICY_JSON=JSON.stringify(policy);env.BLUSTONE_MIRAGE_REENTRY_JSON=JSON.stringify(reentry);}
    child=spawn(process.execPath,[repositoryPath('dist/src/server.js')],{cwd:directory,env,stdio:['ignore','pipe','pipe']});
    let log='';child.stdout!.on('data',data=>{log+=data;});child.stderr!.on('data',data=>{log+=data;});
    for(let i=0;i<100;i++){
      if(child.exitCode!==null||child.signalCode!==null)throw new Error('Compiled adoption child exited: '+log.slice(-1800));
      if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){assert.equal((await fetch(base+'/healthz')).status,200);return;}
      await delay(100);
    }
    throw new Error('Compiled adoption child did not listen: '+log.slice(-1800));
  };
  await launch();assert.deepEqual(readFileSync(file),legacyBytes,'Opt-in startup does not capture or rewrite legacy terminal data');
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const secret=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const sign=(bytes:Buffer)=>crypto.createHmac('sha384',secret).update(bytes).digest('base64');assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(route:string,extra:Record<string,string>={})=>{
    const plain=Buffer.from(String(new URLSearchParams({pvid:String(actor.pvid),otp:String(actor.otp),...extra})));
    const cipher=crypto.createCipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,200);
    const raw=Buffer.from(await response.arrayBuffer());
    if(!response.headers.get('content-type')?.startsWith('application/octet-stream')){const refused=parseStateWithGemIds(raw.toString()) as any;assert.notEqual(refused.result_code,1);return refused;}
    const decipher=crypto.createDecipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));
    const decoded=Buffer.concat([decipher.update(raw),decipher.final()]);assert.equal(response.headers.get('pv-signature'),sign(decoded));return parseStateWithGemIds(decoded.toString()) as any;
  };
  const reset={reset:'1',stay:'1',entry:'1',inst_base:'1',inst_enemy:'1',ref_stair_list:'1',ref_hero:'1'};
  const authBytes=readFileSync(file),terminal=await secure('/mirage/GetInfo');assert.equal(terminal.result_code,1);
  assert.equal(terminal.ret_data.inst_base.state,0);assert.equal(terminal.ret_data.inst_base.begin_ltime,begin-86401);
  assert.deepEqual(readFileSync(file),authBytes,'GetInfo projects adoption readiness without a write');
  assert.equal((await secure('/mirage/GetInfo',reset)).result_code,2001);assert.deepEqual(readFileSync(file),authBytes);
  // Actual HTTP failure proves run+series+offer are not partially committed.
  mkdirSync(file+'.tmp');try{assert.equal((await secure('/mirage/GetNextFloor')).result_code,2001);}finally{rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),authBytes);assert.equal(read().version,12);assert.equal(Object.hasOwn(read(),'mirageSeries'),false);
  const offer=await secure('/mirage/GetNextFloor');assert.equal(offer.result_code,1);assert.equal(offer.ret_data.next_floor,1);
  const captured=read(),series=captured.mirageSeries[0][1];assert.equal(captured.version,14);assert.equal(captured.mirageSeries.length,1);
  assert.deepEqual(captured.mirageRuns,legacy.mirageRuns);assert.deepEqual(captured.accounts,oldAccounts);assert.deepEqual(captured.gameStates,oldGames);
  assert.equal(series.generation,1);assert.equal(series.used,1);assert.deepEqual(series.history,[]);assert.equal(series.highest,0);
  const oldDay=Math.floor((begin+offset*60)/86400),currentDay=Math.floor((Math.floor(realNow()/1000)+offset*60)/86400);
  assert.notEqual(oldDay,currentDay);assert.equal(series.day,oldDay,'Original attempt day is retained, not adoption day');
  const offeredBytes=readFileSync(file);assert.equal((await secure('/mirage/GetNextFloor')).result_code,1);assert.deepEqual(readFileSync(file),offeredBytes);
  const fresh=await secure('/mirage/GetInfo',reset);assert.equal(fresh.result_code,1);assert.equal(fresh.ret_data.inst_base.state,1);assert.deepEqual(fresh.ret_data.inst_base.deck,[]);
  assert.deepEqual(fresh.ret_data.entry.map((row:any)=>row.id).sort(),[...ids].sort());assert.ok(fresh.ret_data.entry.every((row:any)=>row.mirage_remain_hp===10000));
  const next=read().mirageSeries[0][1];assert.equal(next.generation,2);assert.equal(next.used,1);assert.equal(next.day,currentDay);
  assert.deepEqual(next.history,[{generation:1,floor:1,begin_ltime:begin,claimed:[1],abandoned:true,completed:false}]);
  const newIds=fresh.ret_data.entry.map((row:any)=>row.id);assert.equal((await secure('/mirage/RegisterDeck',{inst_list:JSON.stringify(newIds)})).result_code,1);
  assert.equal((await secure('/mirage/End',{floor:'1',stair:'1',remain_deck_hp:JSON.stringify(newIds.map((inst_id:number)=>({inst_id,hp_percent:7300}))),remain_enemy_hp:'[0]'})).result_code,1);
  const damagedBytes=readFileSync(file),damaged=await secure('/mirage/GetInfo');assert.equal(damaged.ret_data.inst_base.state,2);
  assert.ok(damaged.ret_data.entry.every((row:any)=>row.mirage_remain_hp===7300));
  assert.deepEqual(await secure('/mirage/GetInfo',reset),damaged);assert.deepEqual(readFileSync(file),damagedBytes,'Lost reset response cannot heal later damage');
  await stop();await launch('local-configured','disabled');assert.deepEqual(readFileSync(file),damagedBytes);
  assert.deepEqual(await secure('/mirage/GetInfo'),damaged);assert.deepEqual(await secure('/mirage/GetInfo',reset),damaged);assert.deepEqual(readFileSync(file),damagedBytes);
  await stop();await launch('disabled','disabled');assert.deepEqual(readFileSync(file),damagedBytes);
  assert.deepEqual(await secure('/mirage/GetInfo'),damaged);assert.equal((await secure('/mirage/GetNextFloor')).result_code,2001);
  assert.equal((await secure('/card_handler/SetLeader',{target_inst_id:String(oldGames[0][1].leader_inst_id)})).result_code,2001,'Disabled mode retains active roster holds');
  assert.deepEqual(readFileSync(file),damagedBytes);
  const final=read();assert.deepEqual(final.accounts,oldAccounts);assert.equal(final.mirageRuns.length,1);
  for(const [pvid,game] of oldGames){const after=final.gameStates.find(([id]:any)=>id===pvid)[1];
    if(pvid!==actor.pvid)assert.deepEqual(after,game);else{const expected=structuredClone(game);for(const card of [...expected.starter_cards,...expected.recruited_cards])card.mirage_remain_hp=7300;assert.deepEqual(after,expected);}}
  assert.deepEqual(readFileSync(profileFile),profileBytes);assert.deepEqual(readFileSync(policyFile),policyBytes);
  console.log('Compiled terminal adoption encrypted HTTP: real-method Rupee/schema12 legacy seed, three accounts/two peers, startup/read no-write, offer write-failure rollback/schema14 original evidence/day, new owned generation2, damaged replay/no heal, adoption-disabled matching-policy restart and modeoff holds passed; no native claim.');
}finally{
  await stop();Date.now=realNow;for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key];Object.assign(process.env,savedEnv);
  rmSync(directory,{recursive:true,force:true});
}
