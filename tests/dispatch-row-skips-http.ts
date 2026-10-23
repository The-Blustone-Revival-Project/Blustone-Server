import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const environment={...process.env},clock=Date.now,directory=mkdtempSync(path.join(tmpdir(),'blustone-row-skips-http-'));
const file=path.join(directory,'state.json');let now=1_800_000_000;Date.now=()=>now*1000;
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
  const id=start.ret_data.entrust_id,request={entrust_id:id,serial:'0',use_iap_qty:'1',is_tuto:'0',is_iap_pass:'0'};
  const initial=read(),original=structuredClone(initial.dispatches[0][1].active.snapshot),before=readFileSync(file),stamp=now;
  const route='/mission/SkipEntrust',refused=(r:any)=>{assert.notEqual(r.result_code,1);assert.equal(r.ret_data,null);};
  refused(await secure(route,request));assert.deepEqual(readFileSync(file),before);
  const enabled={...options,dispatchSkipMode:'local-manda-sequential' as const};
  await close();context=createApp(enabled);await listen();assert.deepEqual(readFileSync(file),before);
  const malformed:Record<string,string>[]=[{serial:'1'},{serial:'2'},{use_iap_qty:'2'},{is_iap_pass:'1'},{is_tuto:'1'},{completed_at:String(now)},
   {pvid:String(peer.pvid),otp:String(peer.otp)}];
  for(const patch of malformed) {refused(await secure(route,{...request,...patch}));assert.deepEqual(readFileSync(file),before);}
  mkdirSync(file+'.tmp');try{assert.equal((await secure(route,request,500)).ret_data,null);}finally{rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),before);
  const first=await secure(route,request);assert.equal(first.result_code,1);assert.deepEqual(first.ret_data.list.map((r:any)=>r.serial),[0]);
  assert.deepEqual(first.ret_data.user,{free_iap_qty:4,iap_qty:20});
  let paid=read();assert.equal(paid.version,19);assert.deepEqual(paid.quests,[]);assert.deepEqual(paid.dispatches[0][1].active.snapshot,original);
  assert.deepEqual(paid.dispatches[0][1].active.row_skips,[{serial:0,completed_at:stamp,charged_fee:1}]);
  const ownerBefore=initial.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1],expected=structuredClone(ownerBefore);
  expected.gacha_free_qty=4;assert.deepEqual(paid.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1],expected,'Only one Manda changes before collection');
  const firstBytes=readFileSync(file);refused(await secure(route,request));assert.deepEqual(readFileSync(file),firstBytes);
  const refresh1=(await secure('/mission/RefreshEntrust',{entrust_id:id})).ret_data;
  assert.deepEqual(refresh1.list.map((r:any)=>[r.begin_utc,r.end_utc]),[[String(stamp),String(stamp)],[String(stamp),String(stamp+150)],['0','0']]);
  assert.equal(entrustDerivedEndWord({...original,list:refresh1.list}),stamp+300);
  const nativeModel=structuredClone(start.ret_data.list);nativeModel[0].end_utc=String(stamp);
  assert.equal(entrustDerivedEndWord({...original,list:nativeModel}),stamp+300,'Native stamps selected row only; zero future rows preserve compressed forecast');
  assert.notEqual((await secure('/mission/EndEntrust',{entrust_id:id})).result_code,1);
  // NextAutoCombat starts the next row immediately; equal-second receipts are valid.
  const second=await secure(route,{...request,serial:'1'});assert.equal(second.result_code,1);
  assert.deepEqual(second.ret_data.list.map((r:any)=>r.serial),[1]);assert.deepEqual(second.ret_data.user,{free_iap_qty:3,iap_qty:20});
  paid=read();assert.deepEqual(paid.dispatches[0][1].active.row_skips,[{serial:0,completed_at:stamp,charged_fee:1},{serial:1,completed_at:stamp,charged_fee:1}]);
  const refresh2=(await secure('/mission/RefreshEntrust',{entrust_id:id})).ret_data;
  assert.equal(entrustDerivedEndWord({...original,list:refresh2.list}),stamp+150);
  now+=75;
  // Older whole-only mode still prices existing row history from compressed time.
  await close();context=createApp({...options,dispatchSkipMode:'local-manda-all'});await listen();
  const beforeAll=readFileSync(file);refused(await secure(route,{...request,serial:'2'}));assert.deepEqual(readFileSync(file),beforeAll);
  const whole={...request,serial:'-1',use_iap_qty:'2'};
  const finished=await secure(route,whole);assert.equal(finished.result_code,1);assert.deepEqual(finished.ret_data.user,{free_iap_qty:1,iap_qty:20});
  assert.deepEqual(finished.ret_data.list.map((r:any)=>r.serial),[0,1,2]);
  const mixed=read();assert.equal(mixed.version,19);assert.deepEqual(mixed.dispatches[0][1].active.paid_finish,{completed_at:now,charged_fee:2});
  assert.deepEqual(mixed.dispatches[0][1].active.snapshot,original);assert.deepEqual(mixed.accounts,initial.accounts);
  assert.deepEqual(mixed.gameStates.filter(([pvid]:any)=>pvid!==auth.pvid),initial.gameStates.filter(([pvid]:any)=>pvid!==auth.pvid));
  const mixedBytes=readFileSync(file);refused(await secure(route,whole));assert.deepEqual(readFileSync(file),mixedBytes);
  await close();context=createApp(options);await listen();assert.deepEqual(readFileSync(file),mixedBytes,'Cold modeoff load retains all paid history');
  refused(await secure(route,{...request,serial:'2'}));assert.deepEqual(readFileSync(file),mixedBytes);
  const cold=(await secure('/lobby/GetMissionInst')).ret_data.entrust;assert.deepEqual(cold.list.map((r:any)=>r.end_utc),Array(3).fill(String(now)));
  const collected=await secure('/mission/EndEntrust',{entrust_id:id});assert.equal(collected.result_code,1);
  assert.deepEqual(collected.ret_data.result.gold,{prev:ownerBefore.gold,cur:ownerBefore.gold+9});
  assert.equal(collected.ret_data.result.user_exp.cur,ownerBefore.exp+15);assert.equal(collected.ret_data.result.card_exp[0].cur,Number(card.exp)+21);
  assert.equal(collected.ret_data.result.item[0].added,9);
  const final=read();assert.equal(final.version,2);assert.equal(final.dispatches[0][1].active,null);
  const owner=final.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1];assert.equal(owner.gacha_free_qty,1);assert.equal(owner.gacha_iap_qty,20);assert.equal(owner.ap,47);
  const finalBytes=readFileSync(file),replay=await secure('/mission/EndEntrust',{entrust_id:id});assert.equal(replay.result_code,1);
  assert.deepEqual(replay.ret_data.result.item,[]);assert.deepEqual(readFileSync(file),finalBytes);
  console.log('Sequential dispatch encrypted HTTP: selected-row-only packets, same-second compression, native forecast agreement, exact-wallet atomic schema19, null refusals, mixed whole-only finish/cold modeoff and End-once rewards passed; LOCAL policy, native UI pending');
}finally{
  await close();Date.now=clock;for(const key of Object.keys(process.env))if(!Object.hasOwn(environment,key))delete process.env[key];Object.assign(process.env,environment);
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'blustone-row-skips-http-'));rmSync(directory,{recursive:true,force:true});
}
