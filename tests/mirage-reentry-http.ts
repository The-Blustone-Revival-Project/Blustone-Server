import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:net';
import {spawn,type ChildProcess} from 'node:child_process';
import {once} from 'node:events';
import {setTimeout as delay} from 'node:timers/promises';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {repositoryPath} from '../src/paths.js';

// Actual compiled child server and encrypted game RPCs. All content and gold
// are authored LOCAL fixtures; this test makes no native combat/UI claim.
const directory=mkdtempSync(path.join(tmpdir(),'blustone-mirage-reentry-http-')),file=path.join(directory,'state.json');
const profileFile=repositoryPath('config/profiles/current-e6-mirage.json'),baselineFile=repositoryPath('config/profiles/current-e6-materials.json');
const profileBytes=readFileSync(profileFile),baselineBytes=readFileSync(baselineFile),profile=JSON.parse(profileBytes.toString('utf8'));
const previous=new Map(Object.entries(process.env).filter(([key])=>key.startsWith('BLUSTONE_')));
const compiled=(name:string)=>pathToFileURL(repositoryPath('dist/src/'+name+'.js')).href;
const settings:Record<string,string>={...profile.env,BLUSTONE_STATE_FILE:file,BLUSTONE_MIRAGE_MODE:'disabled'};
for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_CATALOG_PATH'])settings[key]=repositoryPath(settings[key]);
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));
const address=probe.address();assert.ok(address&&typeof address!=='string');
const port=address.port,base=`http://127.0.0.1:${port}`;assert.notEqual(port,8080);
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
Object.assign(settings,{BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:'127.0.0.1',BLUSTONE_BASE_URL:base});
let child:ChildProcess|undefined;
const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill();await exited;}child=undefined;};
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,settings);
  const {ServerState}=await import(compiled('state'));
  const {cardInstance,starterReference}=await import(compiled('bootstrap'));
  const {parseStateWithGemIds}=await import(compiled('gem-wire'));
  const rankFor=(id:string)=>Math.max(id==='003'?3:2,starterReference.find((row:any)=>row.base.id===id).stat[0].rank);
  const enemy=(id:string)=>{const rank=rankFor(id);return {ref_id:id,hp_percent:10000,rank,rank_up_cnt:0,overcome_cnt:0,exp:0,
    skill_1_level:1,skill_2_level:rank>=2?1:0,skill_3_level:rank>=3?1:0,skill_4_level:rank>=4?1:0,skill_5_level:rank>=5?1:0};};
  const policy={enrollment:'rank-exp-id-projection',floor:1,bg_res:'MIRAGE_BG_G',dlg_begin:'',dlg_end:'',res_prefix:'MRG',res_postfix_list:['002'],
    stairs:[7,11,13].map((gold,i)=>({grade:i,balance:10000,enemies:[enemy(i===1?'004':'003')],gold})),
    hero:{bonus:0,end_ltime:1_900_000_000,cur:[],next:[]}};
  const deeper={...policy,floor:21,stairs:Array.from({length:6},(_,i)=>({grade:i%4,balance:10000,enemies:[enemy(i%2?'004':'003')],gold:2}))};
  // Explicit LOCAL offset puts this disposable test's current time near noon,
  // avoiding midnight races without introducing any production clock hook.
  const date=new Date(),offset=720-date.getUTCHours()*60-date.getUTCMinutes();
  const reentry={payment:'free-local',daily_attempts:3,day_offset_minutes:offset,on_unavailable:'abandon-local',floors:[deeper],
    transitions:[{floor:1,cleared:21,failed:1},{floor:21,cleared:1,failed:1}]};
  const launch=async(mode='local-configured')=>{
    const env:NodeJS.ProcessEnv={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('BLUSTONE_'))),...settings,
      BLUSTONE_MIRAGE_MODE:mode};
    if(mode==='local-configured'){env.BLUSTONE_MIRAGE_POLICY_JSON=JSON.stringify(policy);env.BLUSTONE_MIRAGE_REENTRY_JSON=JSON.stringify(reentry);}
    child=spawn(process.execPath,[repositoryPath('dist/src/server.js')],{cwd:directory,env,stdio:['ignore','pipe','pipe']});
    let log='';child.stdout!.on('data',bytes=>{log+=bytes;});child.stderr!.on('data',bytes=>{log+=bytes;});
    for(let count=0;count<100;count++) {
      if(child.exitCode!==null||child.signalCode!==null)throw new Error('Compiled Mirage child exited: '+log.slice(-1800));
      if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){
        assert.equal((await fetch(base+'/healthz')).status,200);return;
      }
      await delay(100);
    }
    throw new Error('Compiled Mirage child did not listen: '+log.slice(-1800));
  };
  const seed=new ServerState(base,file,{mirageMode:'disabled'});
  const registered=seed.registerGuest({device_id:'mirage-reentry-http-owner'},{}).ret_data as any;
  const actor={pvid:registered.pvid,otp:registered.otp};
  const peer=seed.registerGuest({device_id:'mirage-reentry-http-peer'},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,'utf8')),game=saved.gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  game.starter_cards=[cardInstance(1000001,'003',rankFor('003')),cardInstance(1000002,'004',rankFor('004'))];game.recruited_cards=[];
  game.leader_inst_id=1000001;game.decks=[{type:1,list:[1000001,1000002,0,0,0]}];
  game.card_book=[{ref_id:'001',rank:1},{ref_id:'002',rank:1},{ref_id:'003',rank:rankFor('003')},{ref_id:'004',rank:rankFor('004')}];
  game.gold=100;game.ap_updated_at=Date.now()+86400000;game.bp_updated_at=game.ap_updated_at;
  writeFileSync(file,JSON.stringify(saved));
  const initial=structuredClone(game),peerBefore=structuredClone(saved.gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1]);
  const read=()=>JSON.parse(readFileSync(file,'utf8'));
  const owned=()=>read().gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  await launch();
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const publicBytes=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const secret=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:publicBytes,format:'der',type:'spki'})})).digest();
  const sign=(raw:Buffer)=>crypto.createHmac('sha384',secret).update(raw).digest('base64');
  assert.equal(exchange.headers.get('pv-signature'),sign(publicBytes));
  const secure=async(route:string,extra:Record<string,string>={})=>{
    const plain=Buffer.from(String(new URLSearchParams({pvid:String(actor.pvid),otp:String(actor.otp),...extra})));
    const cipher=crypto.createCipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,200);
    const raw=Buffer.from(await response.arrayBuffer());
    if(!response.headers.get('content-type')?.startsWith('application/octet-stream')) {
      const refused=parseStateWithGemIds(raw.toString('utf8')) as any;
      assert.notEqual(refused.result_code,1,'Every successful RPC must be encrypted');return refused;
    }
    const decipher=crypto.createDecipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));
    const decoded=Buffer.concat([decipher.update(raw),decipher.final()]);
    assert.equal(response.headers.get('pv-signature'),sign(decoded));return parseStateWithGemIds(decoded.toString('utf8')) as any;
  };
  const metadataBefore=readFileSync(file);
  assert.equal((await secure('/reference/GetCard')).result_code,1);
  const manifest=await fetch(base+'/reslist_'+profile.resourceStamp+'.list');assert.equal(manifest.status,200);
  const manifestLines=(await manifest.text()).trimEnd().split('\n');assert.equal(manifestLines[0],profile.resourceStamp);assert.equal(manifestLines[1],'140');
  assert.deepEqual(readFileSync(file),metadataBefore,'Reference/CDN metadata reads do not enroll/create accounts');
  assert.equal(read().accounts.length,2);
  const info=await secure('/mirage/GetInfo');assert.equal(info.result_code,1,JSON.stringify(info));
  assert.equal(info.ret_data.inst_base.floor,1);assert.equal(info.ret_data.ref_stair.list.length,3);
  let disk=read(),series=disk.mirageSeries[0][1];assert.equal(disk.version,14);
  assert.equal(series.generation,1);assert.equal(series.used,1);assert.equal(series.highest,0);
  assert.deepEqual(series.policy.floors.map((row:any)=>row.floor),[1,21]);assert.deepEqual(series.history,[]);
  const register=async()=>{const reply=await secure('/mirage/RegisterDeck',{inst_list:'[1000001]'});assert.equal(reply.result_code,1);assert.deepEqual(reply.ret_data,[1000001]);};
  const end=async(floor:number,stair:number,hp=8500)=>{
    const reply=await secure('/mirage/End',{floor:String(floor),stair:String(stair),remain_deck_hp:JSON.stringify([{inst_id:1000001,hp_percent:hp}]),remain_enemy_hp:'[0]'});
    assert.equal(reply.result_code,1,JSON.stringify(reply));assert.equal(reply.ret_data.state,2);return reply;
  };
  const reward=async(floor:number,stair:number)=>{
    const reply=await secure('/mirage/Reward',{floor:String(floor),stair:String(stair)});assert.equal(reply.result_code,1,JSON.stringify(reply));return reply;
  };
  const next=async(expected:number)=>{
    const reply=await secure('/mirage/GetNextFloor');assert.equal(reply.result_code,1,JSON.stringify(reply));assert.deepEqual(reply.ret_data,{next_floor:expected});
  };
  const reset=async(stay:boolean)=>{
    const reply=await secure('/mirage/GetInfo',{reset:'1',stay:stay?'1':'0'});assert.equal(reply.result_code,1,JSON.stringify(reply));return reply;
  };
  await register();for(let stair=1;stair<=3;stair++){await end(1,stair);await reward(1,stair);}
  assert.equal(owned().gold,131);assert.deepEqual(owned(),{...initial,gold:131});
  await next(21);const offeredBytes=readFileSync(file);await next(21);assert.deepEqual(readFileSync(file),offeredBytes,'Identical next-floor quote does not rewrite');
  assert.equal(read().mirageSeries[0][1].offer.action,'reenter');
  const reentered=await reset(false);assert.equal(reentered.ret_data.inst_base.floor,21);assert.equal(reentered.ret_data.ref_stair.list.length,6);
  assert.equal(reentered.ret_data.inst_base.highest,1);assert.deepEqual(reentered.ret_data.inst_base.deck,[]);
  assert.ok(reentered.ret_data.entry.every((row:any)=>row.mirage_remain_hp===10000));
  disk=read();series=disk.mirageSeries[0][1];assert.equal(series.generation,2);assert.equal(series.used,2);assert.equal(series.highest,1);
  assert.deepEqual(series.history.map((row:any)=>({generation:row.generation,floor:row.floor,claimed:row.claimed,completed:row.completed})),
    [{generation:1,floor:1,claimed:[1,2,3],completed:true}]);
  await register();await end(21,1,8500);
  const progressedBytes=readFileSync(file),progressedRun=read().mirageRuns[0][1];
  // Simulate a lost reset reply by resending its exact fields after genuine
  // gameplay changed HP/state. Reply repairs CURRENT cache, never a new heal.
  const resetReplay=await reset(false);assert.equal(resetReplay.ret_data.inst_base.floor,21);assert.equal(resetReplay.ret_data.inst_base.state,2);
  assert.equal(resetReplay.ret_data.entry.find((row:any)=>row.id===1000001).mirage_remain_hp,8500);
  assert.deepEqual(resetReplay.ret_data.inst_enemy,progressedRun.cache.inst_enemy);
  assert.deepEqual(readFileSync(file),progressedBytes);assert.equal(read().mirageSeries[0][1].used,2);
  await reward(21,1);for(let stair=2;stair<=6;stair++){await end(21,stair,8000-stair*100);await reward(21,stair);}
  assert.equal(owned().gold,143);assert.deepEqual(owned(),{...initial,gold:143});
  await next(1);assert.equal(read().mirageSeries[0][1].offer.target,1);
  const stay=await reset(true);assert.equal(stay.ret_data.inst_base.floor,21,'Stay resets a fresh attempt on current floor rather than proposed floor1');
  assert.equal(stay.ret_data.inst_base.highest,21);assert.equal(stay.ret_data.ref_stair.list.length,6);
  assert.ok(stay.ret_data.entry.every((row:any)=>row.mirage_remain_hp===10000));
  disk=read();series=disk.mirageSeries[0][1];assert.equal(series.generation,3);assert.equal(series.used,3);assert.equal(series.highest,21);
  assert.deepEqual(series.history.map((row:any)=>row.floor),[1,21]);assert.deepEqual(series.history[1].claimed,[1,2,3,4,5,6]);
  assert.ok(series.history.every((row:any)=>!Object.hasOwn(row,'entry')&&!Object.hasOwn(row,'deck')));
  await next(21);assert.equal(read().mirageSeries[0][1].offer.action,'abandon');
  const abandoned=await reset(true);assert.equal(abandoned.ret_data.inst_base.state,0);assert.equal(abandoned.ret_data.inst_base.highest,21);
  assert.deepEqual(abandoned.ret_data.entry,[]);assert.deepEqual(abandoned.ret_data.inst_base.deck,[]);
  assert.deepEqual(owned(),{...initial,gold:143});
  disk=read();series=disk.mirageSeries[0][1];assert.equal(series.generation,3);assert.equal(series.used,3);assert.equal(series.highest,21);
  assert.equal(disk.mirageRuns[0][1].abandoned,true);assert.equal(disk.mirageRuns[0][1].cache.inst_base.highest,0,'Current abandoned run must not claim a fresh clear');
  assert.equal(series.history.length,2);const abortBytes=readFileSync(file);assert.deepEqual(await reset(true),abandoned);assert.deepEqual(readFileSync(file),abortBytes);
  assert.deepEqual(disk.gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);assert.equal(disk.accounts.length,2);
  await stop();await launch('disabled'); // Reuse exact persisted transport key/OTP.
  const restartBytes=readFileSync(file),hydrated=await secure('/mirage/GetInfo');assert.equal(hydrated.result_code,1);assert.deepEqual(hydrated.ret_data,abandoned.ret_data);
  assert.equal((await secure('/mirage/GetNextFloor')).result_code,2001);
  assert.equal((await secure('/mirage/GetInfo',{reset:'1',stay:'1'})).result_code,2001);
  const refusedEnd=await secure('/mirage/End',{floor:'21',stair:'1',remain_deck_hp:'[{"inst_id":1000001,"hp_percent":8000}]',remain_enemy_hp:'[0]'});
  assert.equal(refusedEnd.result_code,2001);assert.equal(Object.hasOwn(refusedEnd,'ret_data'),false);
  assert.deepEqual(readFileSync(file),restartBytes);assert.deepEqual(read().mirageSeries,disk.mirageSeries);assert.deepEqual(owned(),{...initial,gold:143});
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
  assert.deepEqual(readFileSync(profileFile),profileBytes);assert.deepEqual(readFileSync(baselineFile),baselineBytes);
} finally {
  await stop();
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  for(const [key,value] of previous)if(value!==undefined)process.env[key]=value;
  assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'blustone-mirage-reentry-http-')));
  rmSync(directory,{recursive:true,force:true});
}
console.log('Compiled Mirage re-entry encrypted HTTP: authoredfloor1 threeclears→floor21 sixclears→Stayfresh21→quotaabandon, CURRENTHP lostresetreplyrepair/noheal, schema14 archives/globalhighest/usage, persistedkey+OTP modeoff read/refusal and wallet/peer/baseline preservation passed; LOCAL3attempts/offset/transitions, no native UI claim.');
