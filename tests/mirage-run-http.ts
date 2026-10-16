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
const directory=mkdtempSync(path.join(tmpdir(),'blustone-mirage-run-http-')),file=path.join(directory,'state.json');
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
  const launch=async(mode='local-configured')=>{
    const env:NodeJS.ProcessEnv={...Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('BLUSTONE_'))),...settings,
      BLUSTONE_MIRAGE_MODE:mode};
    if(mode==='local-configured')env.BLUSTONE_MIRAGE_POLICY_JSON=JSON.stringify(policy);
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
  const registered=seed.registerGuest({device_id:'mirage-http-owner'},{}).ret_data as any;
  const actor={pvid:registered.pvid,otp:registered.otp};
  const peer=seed.registerGuest({device_id:'mirage-http-peer'},{}).ret_data as any;
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
  assert.deepEqual(info.ret_data.entry,[{id:1000001,mirage_remain_hp:10000},{id:1000002,mirage_remain_hp:10000}]);
  assert.deepEqual(info.ret_data.inst_base.deck,[]);assert.deepEqual(info.ret_data.inst_enemy,policy.stairs[0].enemies);
  const enrollment=read();assert.equal(enrollment.version,12);assert.equal(enrollment.mirageRuns.length,1);
  assert.deepEqual(enrollment.mirageRuns[0][1].policy,policy);
  const sectionBytes=readFileSync(file);
  assert.deepEqual((await secure('/mirage/GetInfo',{entry:'1',inst_base:'0'})).ret_data,{entry:info.ret_data.entry});
  assert.deepEqual(readFileSync(file),sectionBytes);
  assert.deepEqual((await secure('/mirage/RegisterDeck',{inst_list:'[1000001]'})).ret_data,[1000001]);
  let gold=100;
  for(let stair=1;stair<=3;stair++) {
    const hp=9000-stair*500,packet={floor:'1',stair:String(stair),remain_deck_hp:JSON.stringify([{inst_id:1000001,hp_percent:hp}]),remain_enemy_hp:'[0]'};
    const end=await secure('/mirage/End',packet);assert.equal(end.result_code,1,JSON.stringify(end));assert.equal(end.ret_data.state,2);
    assert.deepEqual(end.ret_data.deck,[{inst_id:1000001,remain_hp_percent:hp}]);
    const endBytes=readFileSync(file);assert.deepEqual(await secure('/mirage/End',packet),end);assert.deepEqual(readFileSync(file),endBytes);
    const reward=await secure('/mirage/Reward',{floor:'1',stair:String(stair)});assert.equal(reward.result_code,1);
    assert.deepEqual(reward.ret_data.user.gold,{prev:gold,cur:gold+policy.stairs[stair-1].gold});gold+=policy.stairs[stair-1].gold;
    assert.equal(reward.ret_data.state,stair===3?0:1);assert.equal(reward.ret_data.cur_stair,Math.min(stair+1,3));
    assert.deepEqual(reward.ret_data.inst_enemy,stair===3?policy.stairs[2].enemies.map(row=>({...row,hp_percent:0})):policy.stairs[stair].enemies);
    const claimBytes=readFileSync(file),replayed=await secure('/mirage/Reward',{floor:'1',stair:String(stair)});
    assert.equal(replayed.result_code,1);assert.deepEqual(replayed.ret_data.user.gold,{prev:gold,cur:gold});
    assert.equal(replayed.ret_data.cur_stair,reward.ret_data.cur_stair);assert.equal(replayed.ret_data.state,reward.ret_data.state);
    assert.deepEqual(readFileSync(file),claimBytes);
  }
  assert.equal(gold,131);assert.deepEqual(owned(),{...initial,gold:131});
  const completed=read(),run=completed.mirageRuns[0][1];assert.deepEqual(run.claimed,[1,2,3]);assert.deepEqual(run.cache.entry,[]);assert.deepEqual(run.cache.inst_base.deck,[]);
  assert.equal(run.cache.inst_base.state,0);assert.equal(run.cache.inst_base.highest,1);assert.equal(completed.accounts.length,2);
  assert.deepEqual(completed.gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
  await stop();await launch('disabled'); // Persisted OTP and exact P384 key reused.
  const restartBytes=readFileSync(file),hydrated=await secure('/mirage/GetInfo');assert.equal(hydrated.result_code,1);
  assert.deepEqual(hydrated.ret_data,run.cache);assert.equal((await secure('/mirage/RegisterDeck',{inst_list:'[1000002]'})).result_code,2001);
  const refusedEnd=await secure('/mirage/End',{floor:'1',stair:'3',remain_deck_hp:'[{"inst_id":1000001,"hp_percent":7500}]',remain_enemy_hp:'[0]'});
  assert.equal(refusedEnd.result_code,2001);assert.equal(Object.hasOwn(refusedEnd,'ret_data'),false);
  assert.equal((await secure('/mirage/Reward',{floor:'1',stair:'3'})).result_code,2001);
  assert.deepEqual(readFileSync(file),restartBytes);assert.deepEqual(owned(),{...initial,gold:131});
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
  assert.deepEqual(readFileSync(profileFile),profileBytes);assert.deepEqual(readFileSync(baselineFile),baselineBytes);
} finally {
  await stop();
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  for(const [key,value] of previous)if(value!==undefined)process.env[key]=value;
  assert.ok(path.resolve(directory).startsWith(path.join(path.resolve(tmpdir()),'blustone-mirage-run-http-')));
  rmSync(directory,{recursive:true,force:true});
}
console.log('Compiled Mirage encrypted HTTP: original prepared CDN gate, authored enrollment/Register/End+replay/3gold claims+inlineenemies/schema12, finalHP release, persistedkey+OTP modeoff hydration/refusal and peer/ordinaryprogress preservation passed; no native combat claim.');
