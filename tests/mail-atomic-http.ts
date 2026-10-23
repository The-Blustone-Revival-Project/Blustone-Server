import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../src/server.js';
import {ServerState} from '../src/state.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-mail-atomic-http-')),file=path.join(directory,'state.json');
const clock=Date.now;Date.now=()=>1_800_000_000_000;
const context=createApp({baseUrl:'http://127.0.0.1',stateFile:file});
const listener=context.app.listen(0,'127.0.0.1');
try {
  await new Promise<void>((resolve,reject)=>{listener.once('listening',resolve);listener.once('error',reject);});
  const address=listener.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
  const base=`http://127.0.0.1:${address.port}`;context.state.baseUrl=base;
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const pub=Buffer.from(await exchange.arrayBuffer());
  const key=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,
    publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const sign=(bytes:Buffer)=>crypto.createHmac('sha384',key).update(bytes).digest('base64');
  assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(route:string,payload:Record<string,string>)=>{
    const plain=Buffer.from(String(new URLSearchParams(payload))),aes=crypto.createCipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plain)},
      body:new Uint8Array(Buffer.concat([aes.update(plain),aes.final()]))});
    const bytes=Buffer.from(await response.arrayBuffer());
    if(!response.headers.get('content-type')?.startsWith('application/octet-stream'))return {status:response.status,body:JSON.parse(bytes.toString())};
    const decipher=crypto.createDecipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const decoded=Buffer.concat([decipher.update(bytes),decipher.final()]);assert.equal(response.headers.get('pv-signature'),sign(decoded));
    return {status:response.status,body:JSON.parse(decoded.toString())};
  };
  const registered=await secure('/v2/account/RegisterGuest',{device_id:'mail-atomic-http'});assert.equal(registered.body.result_code,1);
  const auth={pvid:String(registered.body.pvid),otp:registered.body.ret_data.otp};
  assert.equal((await secure('/lobby/Enter',auth)).body.result_code,1);
  assert.equal((await secure('/mission/Start',{...auth,stage_id:'n_01_01'})).body.result_code,1);
  assert.equal((await secure('/mission/Complete',{...auth,stage_id:'n_01_01',play_info:'{"clear":1}'})).body.result_code,1);
  const state=context.state as any,game=state.gameByPvid.get(Number(auth.pvid));
  assert.equal(game.mail.received.length,1,'The accepted fixture win earns the existing LOCAL notice');
  const id=game.mail.received[0].id,mail=game.mail;
  const request=(operation:string,target_list:string)=>secure('/message/'+operation,{...auth,target_list});
  const failBoth=async(operation:string,target_list:string)=>{
    for(const kind of ['write','rename']) {
      const bytes=readFileSync(file),before=structuredClone(game),received=mail.received,deleted=mail.deleted,rows=[...received];
      const blocked=path.join(directory,'blocked-'+kind);mkdirSync(kind==='write'?file+'.tmp':blocked);
      if(kind==='rename')state.stateFile=blocked;
      try {
        const failed=await request(operation,target_list);assert.equal(failed.status,500);assert.notEqual(failed.body.result_code,1);
        assert.equal(failed.body.ret_data?.target_list,undefined);assert.equal(failed.body.ret_data?.unread_count,undefined);
      } finally {
        state.stateFile=file;rmdirSync(kind==='write'?file+'.tmp':blocked);
        if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');
      }
      assert.equal(game.mail,mail);assert.equal(mail.received,received);assert.equal(mail.deleted,deleted);
      for(let i=0;i<rows.length;i++)assert.equal(received[i],rows[i]);
      assert.deepEqual(game,before);assert.deepEqual(readFileSync(file),bytes);
    }
  };
  await failBoth('Read',String(id));
  assert.deepEqual((await request('Read',String(id))).body.ret_data,{unread_count:0,target_list:[id]});
  const beforeAttachment=readFileSync(file);
  assert.notEqual((await secure('/message/TakeAttachment',{...auth,message_id:String(id)})).body.result_code,1,
    'Native message_id request cannot invent an attachment for the owned notice');
  assert.deepEqual(readFileSync(file),beforeAttachment);
  await failBoth('Archive',String(id));
  assert.deepEqual((await request('Archive',String(id))).body.ret_data,{unread_count:0,target_list:[id]});
  await failBoth('RemoveReceived',id+',');
  assert.deepEqual((await request('RemoveReceived',id+',')).body.ret_data,{unread_count:0,target_list:[id]});
  assert.deepEqual(mail.deleted,[id]);assert.deepEqual(mail.received,[]);
  // Authored additional LOCAL rows exercise a mixed old-tombstone/fresh batch;
  // they are disposable test inputs, not new mail delivery or attachments.
  const extra=[mail.next_id++,mail.next_id++];
  mail.received.push(...extra.map(id=>({id,content:'Disposable batch fixture, no attachment.',created_datetime:1800000000,is_read:0,is_archived:0})));
  state.persist();
  const batch=[id,...extra],csv=batch.join(',')+',';
  await failBoth('RemoveReceived',csv);
  assert.deepEqual((await request('RemoveReceived',csv)).body.ret_data,{unread_count:0,target_list:batch});
  const settled=readFileSync(file),expected=structuredClone(game);
  mkdirSync(file+'.tmp');
  try {assert.deepEqual((await request('RemoveReceived',csv)).body.ret_data,{unread_count:0,target_list:batch});}
  finally {rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),settled,'Deleted retry performs no write or resurrection');
  assert.notEqual((await request('RemoveReceived',id+',999,')).body.result_code,1);
  assert.notEqual((await request('Read',String(extra[0]))).body.result_code,1);
  assert.deepEqual(readFileSync(file),settled);assert.deepEqual(game,expected);
  const cold=new ServerState(base,file);
  assert.deepEqual((cold as any).gameByPvid.get(Number(auth.pvid)),expected);
  assert.deepEqual(cold.mailAction('/message/RemoveReceived',{...auth,target_list:csv},{}).ret_data,{unread_count:0,target_list:batch});
  assert.deepEqual(readFileSync(file),settled);
} finally {
  await new Promise<void>((resolve,reject)=>listener.close(error=>error?reject(error):resolve()));Date.now=clock;
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));rmSync(directory,{recursive:true,force:true});
}
console.log('Mail encrypted HTTP: earned notice, Read/Archive/single+mixed-batch deletion, actual write/rename500 rollback with same nested refs, committed unread/ID receipts, no-write replay/cold tombstones and unsupported-attachment refusal passed; no gameplay or external messaging.');
