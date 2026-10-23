import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

const environment={...process.env},realNow=Date.now;
const directory=mkdtempSync(path.join(tmpdir(),'blustone-instant-dispatch-http-')),file=path.join(directory,'state.json');
const now=1_800_000_000;Date.now=()=>now*1000;
let server:ReturnType<typeof createServer>|undefined;
const close=async()=>{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));};
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  const {ServerState}=await import('../src/state.js'),{createApp}=await import('../src/server.js');
  const seed=new ServerState('http://localhost',file,{dispatchMode:'disabled'});
  const auth=seed.registerGuest({device_id:'instant-http-owner'},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:'instant-http-peer'},{}).ret_data as any;
  const game=seed.gameFor(seed.accountFor(auth,{})),target=game.starter_cards[0];
  game.decks.push({type:2,list:[target.inst_id,0,0,0,0]});
  game.stage_achievements={n_01_01:[0],n_01_05:[1]};game.stage_stars={n_01_01:1,n_01_05:1};
  (seed as any).persist();
  const date=(utc:number)=>new Date(utc*1000).toISOString().slice(0,19).replace('T',' ');
  const policy={max_runs:2,gold_per_run:3,user_exp_per_run:5,card_exp_per_run:7,
    items_per_run:[{ref_id:'AIRSHIP_TICKET',qty:3}],skip_price:1,entrust_second_per_cost:60,
    passes:{[auth.pvid]:{end_datetime:date(now+3600),end_datetime_utc:now+3600}}};
  const originalPolicy=structuredClone(policy),options={baseUrl:'http://127.0.0.1',stateFile:file,dispatchMode:'local-timed' as const,dispatchPolicy:policy};
  let context=createApp(options),base='';
  const listen=async()=>{server=createServer(context.app);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
    const address=server.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
    base=`http://127.0.0.1:${address.port}`;context.state.baseUrl=base;};
  const read=()=>JSON.parse(readFileSync(file,'utf8'));
  await listen();
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const key=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const sign=(data:Buffer)=>crypto.createHmac('sha384',key).update(data).digest('base64');assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(route:string,values:Record<string,string>={},actor=auth,status=200)=>{
    const plain=Buffer.from(String(new URLSearchParams({...values,pvid:String(actor.pvid),otp:String(actor.otp)})));
    const cipher=crypto.createCipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,status);
    const encrypted=response.headers.get('content-type')?.startsWith('application/octet-stream')===true;
    let text:string;
    if(encrypted){const decipher=crypto.createDecipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
      const decoded=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);assert.equal(response.headers.get('pv-signature'),sign(decoded));text=decoded.toString();
    }else text=await response.text();
    const decoded=JSON.parse(text,(name,value,source?:{source:string})=>name==='entrust_id'&&typeof value==='number'?source?.source:value);
    if(decoded.result_code===1)assert.equal(encrypted,true);return {decoded,text};
  };
  const route='/mission/EntrustByIAP',request={stage_id:'n_01_01',deck_type:'2',cnt:'2'};
  const before=read(),beforeBytes=readFileSync(file),ownerBefore=before.gameStates.find(([id]:any)=>id===auth.pvid)[1];
  assert.equal((await secure(route,request)).decoded.result_code,2001,'Instant dispatch is disabled by default');assert.deepEqual(readFileSync(file),beforeBytes);
  assert.equal((await secure('/lobby/GetMissionInst')).decoded.ret_data.entrust,undefined);
  assert.deepEqual(readFileSync(file),beforeBytes,'Default mode does not publish or capture an idle entitlement');
  const instantOptions={...options,dispatchInstantMode:'local-entitled' as const};
  await close();context=createApp(instantOptions);await listen();assert.deepEqual(readFileSync(file),beforeBytes);
  const idle=(await secure('/lobby/GetMissionInst')).decoded.ret_data.entrust;
  assert.deepEqual(idle,{entrust_id:'0',stage_id:'',cnt:0,complete_second:0,skip_price:policy.skip_price,
    entrust_second_per_cost:policy.entrust_second_per_cost,list:[],pass:policy.passes[auth.pvid]},
    'Idle mission bootstrap must expose the exact supplied pass without inventing an active job');
  assert.equal((context.state as any).dispatches.size,0);assert.deepEqual(readFileSync(file),beforeBytes);
  const peerIdle=(await secure('/lobby/GetMissionInst',{},peer)).decoded.ret_data;
  assert.equal(peerIdle.entrust,undefined,'No peer entitlement is synthesized');assert.deepEqual(readFileSync(file),beforeBytes);
  assert.equal((await secure(route,request,peer)).decoded.result_code,2001,'An entitlement is never copied to a peer');assert.deepEqual(readFileSync(file),beforeBytes);
  const invalidRequests:Record<string,string>[]=[{cnt:'0'},{cnt:'3'},{deck_type:'1'},{stage_id:'UNKNOWN'}];
  for(const patch of invalidRequests){
    assert.equal((await secure(route,{...request,...patch})).decoded.result_code,2001);assert.deepEqual(readFileSync(file),beforeBytes);
  }
  const expired={...policy,passes:{[auth.pvid]:{end_datetime:date(now),end_datetime_utc:now}}};
  await close();context=createApp({...instantOptions,dispatchPolicy:expired});await listen();
  assert.equal((await secure(route,request)).decoded.result_code,2001,'Pass equality is expired, matching native GT gate');assert.deepEqual(readFileSync(file),beforeBytes);
  await close();context=createApp(instantOptions);await listen();
  mkdirSync(file+'.tmp');try{assert.equal((await secure(route,request,auth,500)).decoded.error,'local server failure');}finally{rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),beforeBytes,'One failed compound commit cannot spend AP, pay awards or capture a partial job');
  assert.equal((context.state as any).dispatches.size,0);
  const response=await secure(route,request);assert.equal(response.decoded.result_code,1);
  const compound=response.decoded.ret_data;assert.deepEqual(Object.keys(compound).sort(),['end','entrust','skip']);
  assert.deepEqual(Object.keys(compound.entrust),['data']);assert.deepEqual(Object.keys(compound.skip),['data']);assert.deepEqual(Object.keys(compound.end),['data']);
  const start=compound.entrust.data,skip=compound.skip.data,end=compound.end.data;
  const id=start.entrust_id;assert.match(id,/^[1-9]\d*$/);assert.ok(BigInt(id)<=0xffff_ffff_ffff_ffffn);
  assert.ok(response.text.includes('"entrust_id":'+id),'Entrust identity is an exact native numeric token, not a float string');
  assert.equal(start.stage_id,request.stage_id);assert.equal(start.cnt,2);assert.equal(start.user.ap,48);assert.equal(typeof start.user.ap_charge_time,'number');
  assert.deepEqual(start.list.map((row:any)=>row.serial),[0,1]);
  for(const row of start.list)assert.deepEqual(JSON.parse(row.item),Array(3).fill('AIRSHIP_TICKET'));
  assert.equal(skip.skip_price,policy.skip_price);assert.deepEqual(skip.list,start.list,'Skip parser receives matching existing serials and string occurrence previews');
  assert.deepEqual(skip.user,{iap_qty:ownerBefore.gacha_iap_qty,free_iap_qty:ownerBefore.gacha_free_qty});
  assert.equal(end.user,null);assert.deepEqual(end.result.gold,{prev:ownerBefore.gold,cur:ownerBefore.gold+6});
  assert.equal(end.result.user_exp.cur,ownerBefore.exp+10);assert.equal(end.result.user_exp.ap.cur,48);
  assert.deepEqual(end.result.card_exp,[{inst_id:target.inst_id,prev:Number(target.exp),cur:Number(target.exp)+14}]);
  assert.equal(end.result.item.length,1);assert.equal(end.result.item[0].ref_id,'AIRSHIP_TICKET');assert.equal(end.result.item[0].added,6);
  const after=read(),owner=after.gameStates.find(([pvid]:any)=>pvid===auth.pvid)[1];
  assert.equal(after.version,2);assert.equal(after.dispatches.length,1);
  assert.deepEqual(after.dispatches[0],[auth.pvid,{active:null,last_id:id,last_deck:[target.inst_id]}]);
  assert.equal(owner.ap,48);assert.equal(owner.gold,ownerBefore.gold+6);assert.equal(owner.exp,ownerBefore.exp+10);
  assert.equal(owner.gacha_free_qty,ownerBefore.gacha_free_qty);assert.equal(owner.gacha_iap_qty,ownerBefore.gacha_iap_qty);
  assert.equal(Number(owner.starter_cards.find((card:any)=>card.inst_id===target.inst_id).exp),Number(target.exp)+14);
  assert.deepEqual(after.accounts,before.accounts);assert.deepEqual(after.gameStates.filter(([pvid]:any)=>pvid!==auth.pvid),before.gameStates.filter(([pvid]:any)=>pvid!==auth.pvid));
  assert.deepEqual(policy,originalPolicy,'Instant dispatch does not purchase, grant or extend supplied pass metadata');
  const finalBytes=readFileSync(file);
  const collected=(await secure('/mission/EndEntrust',{entrust_id:id})).decoded;
  assert.equal(collected.result_code,1);assert.deepEqual(collected.ret_data.result.item,[]);assert.deepEqual(collected.ret_data.result.gold,{prev:owner.gold,cur:owner.gold});
  assert.deepEqual(readFileSync(file),finalBytes,'Collected End repair does not repeat rewards');
  await close();context=createApp(options);await listen();assert.deepEqual(readFileSync(file),finalBytes);
  assert.equal((await secure('/lobby/GetMissionInst')).decoded.ret_data.entrust,undefined,'Cold modeoff removes idle pass publication without erasing journals');
  assert.deepEqual(readFileSync(file),finalBytes);
  assert.equal((await secure(route,request)).decoded.result_code,2001);assert.deepEqual(readFileSync(file),finalBytes);
  assert.equal((await secure('/mission/EndEntrust',{entrust_id:id})).decoded.result_code,1);assert.deepEqual(readFileSync(file),finalBytes);
  console.log('Entitled instant dispatch encrypted HTTP: disabled/expiry/owner/admission guards, exact compound parents/64-bit identity, one atomic AP+award commit, unchanged Manda/pass/peer, collected schema2 and End repair/disabled restart passed; authored entitlement and rewards, no native claim.');
}finally{
  await close();Date.now=realNow;for(const key of Object.keys(process.env))if(!Object.hasOwn(environment,key))delete process.env[key];Object.assign(process.env,environment);
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'blustone-instant-dispatch-http-'));rmSync(directory,{recursive:true,force:true});
}
