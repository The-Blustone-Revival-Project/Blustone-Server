import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {gameResponse} from '../src/game-routes.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-guild-fuel-state-')),clock=Date.now;
const epoch=1_800_000_000;let now=epoch;Date.now=()=>now*1000;
const read=(file:string)=>JSON.parse(readFileSync(file,'utf8'));
const options={guildChatMode:'local-memory',guildFuelMode:'local-requests',guildFuelRequestSeconds:60,
  guildContributionPoints:{'1':0,'2':0,'3':0,'4':3}};
function fixture(name:string) {
  now=epoch;const file=path.join(directory,name+'.json'),seed=new ServerState('http://localhost',file);
  const auth=Array.from({length:9},(_,i)=>{
    const registered=seed.registerGuest({device_id:`${name}-${i}`,nickname:`Fuel${i}`},{}).ret_data as any;
    return {pvid:registered.pvid,otp:registered.otp};
  });
  const member=(i:number)=>({pvid:auth[i].pvid,role:i===0||i===7?1:3,newbie:0,contribution:10,fc_point:0});
  const guild=(id:number,members:unknown[])=>({id,name:'Authored'+id,type:1,fc_point_limit:0,contribution:100,
    region:'EN',emblem_id:'GD_IMG_1',desc:'Keep',rank:0,gvg_win_cnt:0,gvg_inf_win_cnt:0,members});
  (seed as any).guilds=[guild(1,Array.from({length:7},(_,i)=>member(i))),guild(2,[member(7)])];
  (seed as any).persist();
  const state:any=new ServerState('http://localhost',file,options as any);
  const headers=auth.map(actor=>{
    const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
    const exchange=state.exchangeSecret({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')});
    const header={'pv-accesstoken':exchange.accessToken,'x-pv-accesstoken':exchange.accessToken};state.accountFor(actor,header);return header;
  });
  const call=(route:string,i=0,extra:Record<string,unknown>={},s=state)=>gameResponse(s,'/guild/'+route,{...auth[i],...extra},{}) as any;
  const create=(i=0,message='')=>state.guildFuelChat(headers[i],11010,message);
  const payload=(event:any,i=0)=>state.guildFuelPayloadFor(event,auth[i].pvid);
  const row=(event:any,i=0)=>JSON.parse(payload(event,i).message);
  const support=(id:number,i=1,extra:Record<string,unknown>={})=>call('SupportFuel',i,{request_id:id,...extra});
  const relayMessage=(r:any)=>JSON.stringify({type:11011,id:r.id,pvid:r.pvid,expdate:r.expdate,
    regdate:r.regdate,supports:r.supports,supported:r.supported});
  const relay=(r:any,i=1)=>state.guildFuelChat(headers[i],11011,relayMessage(r));
  return {file,state,auth,headers,call,create,payload,row,support,relay,relayMessage};
}
function failedPersistence(f:ReturnType<typeof fixture>,operation:()=>unknown) {
  for(const kind of ['write','rename']) {
    const s=f.state,bytes=readFileSync(f.file),before=structuredClone(read(f.file));
    const guilds=s.guilds,memberList=guilds[0].members,member=memberList[1],ledger=s.guildFuelLedger;
    const requests=ledger?.requests,request=requests?.[0],supporters=request?.supporters;
    const blocked=path.join(directory,'blocked-'+kind);mkdirSync(kind==='write'?f.file+'.tmp':blocked);
    if(kind==='rename')s.stateFile=blocked;
    try {assert.throws(operation,/EISDIR|EPERM|EACCES|EEXIST|rename/);}
    finally {
      s.stateFile=f.file;rmdirSync(kind==='write'?f.file+'.tmp':blocked);
      if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');
    }
    assert.equal(s.guilds,guilds);assert.equal(s.guilds[0].members,memberList);assert.equal(memberList[1],member);
    assert.equal(s.guildFuelLedger,ledger);assert.equal(s.guildFuelLedger?.requests,requests);
    assert.equal(s.guildFuelLedger?.requests[0],request);assert.equal(s.guildFuelLedger?.requests[0]?.supporters,supporters);
    assert.deepEqual(readFileSync(f.file),bytes);assert.deepEqual(read(f.file),before);
  }
}
try {
  const f=fixture('guards'),{state,auth}=f,baseline=read(f.file),bytes=readFileSync(f.file);
  for(const bad of [undefined,0,-1,86401,1.5,'060','1e2'])
    assert.throws(()=>new ServerState('http://localhost',f.file,{...options,guildFuelRequestSeconds:bad} as any),/fuel|seconds|TTL/i);
  for(const bad of [{guildFuelMode:'unknown'},{guildChatMode:'disabled'},
    {guildContributionPoints:undefined},{guildContributionPoints:{'1':0,'2':0,'3':0,'4':-1}}])
    assert.throws(()=>new ServerState('http://localhost',f.file,{...options,...bad} as any),/fuel|chat|point|contribution/i);
  assert.throws(()=>new ServerState('http://localhost',undefined,options as any),/fuel|persist|state/i);
  const off:any=new ServerState('http://localhost',f.file,{guildFuelMode:'disabled'} as any);
  assert.equal(f.call('SupportFuel',1,{request_id:1},off).result_code,2001);
  assert.throws(()=>f.create(8),/fuel|Guild|guild|message/i);
  assert.throws(()=>f.create(0,'{"id":1}'),/fuel|message|empty/i);
  assert.deepEqual(readFileSync(f.file),bytes);
  failedPersistence(f,()=>f.create());
  const event=f.create(),request=f.row(event),id=request.id;
  assert.equal(request.result_code,1);assert.equal(request.pvid,auth[0].pvid);assert.equal(request.regdate,now);
  assert.equal(request.expdate,now+60);assert.equal(request.supports,0);assert.equal(Number(request.supported),1,'Owner cannot support their own request');
  assert.ok(Number.isInteger(id)&&id>0&&id<=0xffff_ffff);
  assert.throws(()=>f.payload(event,7),/fuel|scope|room/i);assert.throws(()=>f.payload(event,8),/fuel|joined/i);
  assert.throws(()=>f.create(),/fuel|cooldown|request/i);
  assert.equal(read(f.file).version,20);assert.deepEqual(read(f.file).accounts,baseline.accounts);
  assert.deepEqual(read(f.file).gameStates,baseline.gameStates,'Creating fuel requests never alters AP, wallet, battle or progress');
  const listed=f.call('GetFuelRequests',1).ret_data.fuel_requests;
  assert.equal(listed.length,1);assert.equal(listed[0].id,id);listed[0].supports=999;
  assert.equal(f.call('GetFuelRequests',1).ret_data.fuel_requests[0].supports,0,'Returned records are detached');
  for(const [actor,extra] of [[0,{}],[7,{}],[8,{}],[1,{pvid:auth[7].pvid,otp:auth[7].otp}],
    [1,{request_id:0}],[1,{request_id:0x1_0000_0000}],[1,{request_id:id,unknown:1}]] as [number,Record<string,unknown>][])
    assert.equal(f.support(id,actor,extra).result_code,2001);
  failedPersistence(f,()=>f.support(id));
  const supported=f.support(id),donorRow=supported.ret_data.fuel_requests[0];
  assert.equal(supported.result_code,1);assert.equal(donorRow.supports,1);assert.equal(Number(donorRow.supported),1);
  assert.equal(supported.ret_data.my_guild.contribution,13);assert.equal(supported.ret_data.guilds[0].contribution,103);
  assert.equal(Object.hasOwn(supported.ret_data,'user'),false,'Support has no fabricated AP/wallet receipt');
  assert.equal(Number(f.call('GetFuelRequests',0).ret_data.fuel_requests[0].supported),1);
  assert.equal(Number(f.call('GetFuelRequests',1).ret_data.fuel_requests[0].supported),1);
  const oneSupport=readFileSync(f.file);assert.equal(f.support(id).result_code,2001);assert.deepEqual(readFileSync(f.file),oneSupport);
  assert.throws(()=>f.relay(donorRow,2),/fuel|support|receipt|relay/i);
  assert.throws(()=>f.relay({...donorRow,supports:99}),/fuel|support|receipt|relay|match/i);
  failedPersistence(f,()=>f.relay(donorRow));
  const relay=f.relay(donorRow),ownerPayload=f.payload(relay),donorPayload=f.payload(relay,1),peerPayload=f.payload(relay,2);
  assert.equal(String(ownerPayload.who),String(auth[1].pvid));assert.equal(ownerPayload.type,11011);
  assert.equal(JSON.parse(ownerPayload.message).pvid,auth[0].pvid);
  assert.equal(Number(JSON.parse(donorPayload.message).supported),1);assert.equal(Number(JSON.parse(peerPayload.message).supported),0);
  assert.throws(()=>f.relay(donorRow),/fuel|relay|already|receipt/i);
  for(let i=2;i<=5;i++)assert.equal(f.support(id,i).result_code,1);
  assert.equal(f.support(id,6).result_code,2001,'Native manager limit five is enforced without inferred AP payout');
  assert.equal(f.call('GetFuelRequests',0).ret_data.fuel_requests[0].supports,5);
  assert.equal(f.row(relay,6).supports,5,'Delayed fanout reconstructs the current authoritative count');
  const settled=read(f.file);assert.deepEqual(settled.accounts,baseline.accounts);assert.deepEqual(settled.gameStates,baseline.gameStates);
  assert.equal(settled.guilds[0].contribution,115);assert.equal(settled.guildFuelLedger.requests[0].supporters.length,5);
  const coldBytes=readFileSync(f.file),cold=new ServerState('http://localhost',f.file,{guildFuelMode:'disabled'} as any);
  assert.deepEqual(readFileSync(f.file),coldBytes);assert.deepEqual((cold as any).guildFuelLedger,settled.guildFuelLedger);
  const retuned:any=new ServerState('http://localhost',f.file,{...options,guildContributionPoints:{'1':0,'2':0,'3':0,'4':9}} as any);
  assert.deepEqual(retuned.guildFuelLedger,settled.guildFuelLedger,'New contribution policy cannot retune captured donor receipts');
  assert.deepEqual(readFileSync(f.file),coldBytes);
  assert.equal(f.call('SupportFuel',6,{request_id:id},cold).result_code,2001);
  now=request.expdate;assert.equal(f.support(id,6).result_code,2001);const newer=f.create();assert.ok(f.row(newer).id>id);

  const c=fixture('cancel'),ce=c.create(),cr=c.row(ce),guilds=c.state.guilds;
  guilds[0].members=guilds[0].members.filter((m:any)=>m.pvid!==c.auth[0].pvid);
  guilds[0].members[0].role=1;
  failedPersistence(c,()=>c.state.persist());
  assert.equal(c.state.guildFuelLedger.requests[0].cancelled,false,'Failed persistence must not publish derived cancellation');
  c.state.persist();assert.equal(c.state.guildFuelLedger.requests[0].cancelled,true);
  assert.equal(c.support(cr.id).result_code,2001);
  guilds[0].members.push({pvid:c.auth[0].pvid,role:3,newbie:0,contribution:10,fc_point:0});c.state.persist();
  assert.equal(c.state.guildFuelLedger.requests[0].cancelled,true,'Rejoining cannot revive an old request');
  assert.throws(()=>c.create(),/fuel|cooldown|request/i);now=cr.expdate;assert.ok(c.row(c.create()).id>cr.id);
  c.state.guilds=c.state.guilds.filter((g:any)=>g.id!==1);c.state.persist();
  const deleted=readFileSync(c.file);new ServerState('http://localhost',c.file,{guildFuelMode:'disabled'} as any);
  assert.deepEqual(readFileSync(c.file),deleted,'Cancelled records may retain a now-deleted Guild identity');

  const schema=settled;
  for(let version=1;version<20;version++) {
    const file=path.join(directory,'old-'+version+'.json');writeFileSync(file,JSON.stringify({...schema,version}));
    const old=readFileSync(file);assert.throws(()=>new ServerState('http://localhost',file),/fuel|version|schema|state/i);assert.deepEqual(readFileSync(file),old);
  }
  for(const ledger of [undefined,{next_request_id:1,requests:[]}]) {
    const file=path.join(directory,'empty20.json');writeFileSync(file,JSON.stringify({...schema,guildFuelLedger:ledger}));
    assert.throws(()=>new ServerState('http://localhost',file),/fuel|version|schema/i);
  }
  for(const mutate of [
    (l:any)=>l.requests[0].supporters.push(l.requests[0].supporters[0]),
    (l:any)=>l.requests[0].supporters[0].points=-1,
    (l:any)=>l.requests[0].expdate=l.requests[0].regdate,
    (l:any)=>l.next_request_id=l.requests[0].id,
    (l:any)=>l.requests[0].id=0x1_0000_0000]) {
    const altered=structuredClone(schema);mutate(altered.guildFuelLedger);
    const file=path.join(directory,'bad20.json');writeFileSync(file,JSON.stringify(altered));const old=readFileSync(file);
    assert.throws(()=>new ServerState('http://localhost',file),/fuel|request|support|ledger|id|date|time|point/i);assert.deepEqual(readFileSync(file),old);
  }
}finally{Date.now=clock;rmSync(directory,{recursive:true,force:true});}
console.log('Guild fuel records: explicit policy/auth/affiliation/expiry/max-five guards, personalized authoritative receipts, one-time contribution/relay, schema20/cold mode-off retention, cancellation/rejoin/deleted-Guild handling and real write/rename nested-reference rollback passed; no AP/game/account changes.');
