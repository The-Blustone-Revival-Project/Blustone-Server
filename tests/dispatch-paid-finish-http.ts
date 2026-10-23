import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const environment={...process.env},clock=Date.now,directory=mkdtempSync(path.join(tmpdir(),'blustone-paid-finish-http-'));
const file=path.join(directory,'state.json'),now=1_800_000_000;Date.now=()=>now*1000;
let server:ReturnType<typeof createServer>|undefined;
const close=async()=>{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));};
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  const {ServerState}=await import('../src/state.js'),{createApp}=await import('../src/server.js');
  const {entrustDerivedEndWord}=await import('../src/expedition-entrust-clock.js');
  const seed=new ServerState('http://localhost',file,{dispatchMode:'disabled'});
  const auth=seed.registerGuest({device_id:'paid-finish-http-owner'},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:'paid-finish-http-peer'},{}).ret_data as any;
  const game=seed.gameFor(seed.accountFor(auth,{})),card=game.starter_cards[0];
  game.decks.push({type:2,list:[card.inst_id,0,0,0,0]});
  game.stage_achievements={n_01_01:[0],n_01_05:[1]};game.stage_stars={n_01_01:1,n_01_05:1};
  game.gacha_free_qty=5;game.gacha_iap_qty=20;(seed as any).persist();
  const policy={max_runs:3,gold_per_run:3,user_exp_per_run:5,card_exp_per_run:7,skip_price:1,entrust_second_per_cost:60,
    items_per_run:[{ref_id:'AIRSHIP_TICKET',qty:3}],passes:{[auth.pvid]:{end_datetime:'1970-01-01 00:00:00',end_datetime_utc:0}}};
  const options={baseUrl:'http://127.0.0.1',stateFile:file,dispatchMode:'local-timed' as const,dispatchPolicy:policy};
  let context=createApp(options),base='';
  const read=()=>JSON.parse(readFileSync(file,'utf8'));
  const listen=async()=>{server=createServer(context.app);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
    const address=server.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
    base=`http://127.0.0.1:${address.port}`;context.state.baseUrl=base;};
  await listen();
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const secret=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const sign=(bytes:Buffer)=>crypto.createHmac('sha384',secret).update(bytes).digest('base64');assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(route:string,values:Record<string,string>={},status=200)=>{
    const plain=Buffer.from(String(new URLSearchParams({pvid:String(auth.pvid),otp:String(auth.otp),...values})));
    const cipher=crypto.createCipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,status);
    const encrypted=response.headers.get('content-type')?.startsWith('application/octet-stream')===true;
    let text:string;
    if(encrypted){const decipher=crypto.createDecipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32));
      const bytes=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);assert.equal(response.headers.get('pv-signature'),sign(bytes));text=bytes.toString();
    }else text=await response.text();
    const decoded=JSON.parse(text,(name,value,source?:{source:string})=>['entrust_id','begin_utc','end_utc'].includes(name)&&typeof value==='number'?source?.source:value);
    if(decoded.result_code===1)assert.equal(encrypted,true);return decoded;
  };
  const start=await secure('/mission/Entrust',{stage_id:'n_01_01',deck_type:'2',cnt:'3',is_tuto:'0'});assert.equal(start.result_code,1);
  const id=start.ret_data.entrust_id,request={entrust_id:id,serial:'-1',use_iap_qty:'8',is_tuto:'0',is_iap_pass:'0'};
  const initial=read(),job=initial.dispatches[0][1].active,original=structuredClone(job.snapshot),beforeSkip=readFileSync(file);
  assert.ok(original.list.every((row:any)=>BigInt(row.end_utc)>BigInt(now)),'Authoritative original schedule remains complete');
  assert.equal(start.ret_data.list[0].begin_utc,String(now));assert.equal(start.ret_data.list[0].end_utc,String(now+150));
  for(const row of start.ret_data.list.slice(1)){assert.equal(row.begin_utc,'0');assert.equal(row.end_utc,'0');}
  const {user:apUser,...projected}=start.ret_data;
  assert.equal(apUser.ap,47);assert.equal(entrustDerivedEndWord(projected),now+450,'Hidden future rows preserve original native forecast');
  const hydrated=(await secure('/lobby/GetMissionInst')).ret_data.entrust;
  assert.deepEqual(hydrated.list,start.ret_data.list);assert.deepEqual(readFileSync(file),beforeSkip);
  const skipRoute='/mission/SkipEntrust';
  const refused=(reply:any)=>{assert.notEqual(reply.result_code,1);assert.equal(reply.ret_data,null,'Any Skip refusal must bypass native nonnull failure parser');};
  refused(await secure(skipRoute,request));assert.deepEqual(readFileSync(file),beforeSkip,'Default disabled mode cannot pay or mutate cached state');
  const enabled={...options,dispatchSkipMode:'local-manda-all' as const};
  await close();context=createApp(enabled);await listen();assert.deepEqual(readFileSync(file),beforeSkip);
  const malformed:Record<string,string>[]=[{serial:'0'},{serial:'2'},{use_iap_qty:'1'},{is_iap_pass:'1'},{is_tuto:'1'},
    {entrust_id:id==='1'?'2':'1'},{completed_at:String(now)},{pvid:String(peer.pvid),otp:String(peer.otp)}];
  for(const patch of malformed){refused(await secure(skipRoute,{...request,...patch}));assert.deepEqual(readFileSync(file),beforeSkip);}
  const normalRefresh=await secure('/mission/RefreshEntrust',{entrust_id:id});assert.equal(normalRefresh.result_code,1);
  assert.deepEqual(normalRefresh.ret_data.list,start.ret_data.list);
  mkdirSync(file+'.tmp');try{const failed=await secure(skipRoute,request,500);assert.equal(failed.ret_data,null);}finally{rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),beforeSkip,'Write failure cannot retain wallet debit or paid_finish');
  const finished=await secure(skipRoute,request);assert.equal(finished.result_code,1);
  assert.deepEqual(finished.ret_data.user,{iap_qty:17,free_iap_qty:0});assert.equal(finished.ret_data.skip_price,1);
  assert.deepEqual(finished.ret_data.list.map((row:any)=>row.serial),[0,1,2]);
  const paid=read(),ownerBefore=initial.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1],owner=paid.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1];
  assert.equal(paid.version,18);assert.deepEqual(paid.quests,[],'Minimal schema18 still serializes its required higher-cohort array');
  assert.deepEqual(paid.dispatches[0][1].active.snapshot,original,'No projected accelerated clock rewrites original schedule');
  assert.deepEqual(paid.dispatches[0][1].active.paid_finish,{completed_at:now,charged_fee:8});
  const expected=structuredClone(ownerBefore);expected.gacha_free_qty=0;expected.gacha_iap_qty=17;
  assert.deepEqual(owner,expected,'Skip changes only Manda; AP, gold, EXP, Hunters and items wait for End');
  assert.deepEqual(paid.accounts,initial.accounts);assert.deepEqual(paid.gameStates.filter(([pvid]:any)=>pvid!==auth.pvid),initial.gameStates.filter(([pvid]:any)=>pvid!==auth.pvid));
  const paidBytes=readFileSync(file);refused(await secure(skipRoute,request));assert.deepEqual(readFileSync(file),paidBytes,'Duplicate Skip does not replay success or charge');
  const refresh=await secure('/mission/RefreshEntrust',{entrust_id:id});assert.equal(refresh.result_code,1);
  assert.deepEqual(refresh.ret_data.list.map((row:any)=>row.end_utc),Array(3).fill(String(now)));
  assert.deepEqual(refresh.ret_data.list.map((row:any)=>row.begin_utc),original.list.map((row:any)=>row.begin_utc));
  assert.equal(refresh.ret_data.user,undefined,'Cache refresh is not an invented wallet-recovery callback');
  assert.equal(entrustDerivedEndWord({...original,list:refresh.ret_data.list}),now);
  assert.deepEqual(readFileSync(file),paidBytes);
  await close();context=createApp(options);await listen();assert.deepEqual(readFileSync(file),paidBytes,'Modeoff reload keeps captured paid completion');
  refused(await secure(skipRoute,request));assert.deepEqual(readFileSync(file),paidBytes);
  const rehydrated=(await secure('/lobby/GetMissionInst')).ret_data.entrust;
  assert.deepEqual(rehydrated.list,refresh.ret_data.list);assert.deepEqual(readFileSync(file),paidBytes);
  const collected=await secure('/mission/EndEntrust',{entrust_id:id});assert.equal(collected.result_code,1);
  assert.deepEqual(collected.ret_data.result.gold,{prev:ownerBefore.gold,cur:ownerBefore.gold+9});
  assert.equal(collected.ret_data.result.user_exp.cur,ownerBefore.exp+15);
  assert.equal(collected.ret_data.result.card_exp[0].cur,Number(card.exp)+21);
  assert.equal(collected.ret_data.result.item[0].added,9);
  const final=read(),collectedOwner=final.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1];
  assert.equal(collectedOwner.gacha_free_qty,0);assert.equal(collectedOwner.gacha_iap_qty,17);assert.equal(collectedOwner.ap,47);
  assert.equal(final.dispatches[0][1].active,null);const finalBytes=readFileSync(file);
  const replay=await secure('/mission/EndEntrust',{entrust_id:id});assert.equal(replay.result_code,1);
  assert.deepEqual(replay.ret_data.result.item,[]);assert.deepEqual(readFileSync(file),finalBytes);
  console.log('Whole-job paid dispatch encrypted HTTP: future-zero forecast/projection, native exact quote8, disabled/auth/perrow/malformed/duplicate NULL refusals, failure rollback/schema18, free-first debit without early awards, paid cache refresh/modeoff hydration and End-only rewards passed; LOCAL schedule/rate and no native claim.');
}finally{
  await close();Date.now=clock;for(const key of Object.keys(process.env))if(!Object.hasOwn(environment,key))delete process.env[key];Object.assign(process.env,environment);
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'blustone-paid-finish-http-'));rmSync(directory,{recursive:true,force:true});
}
