import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from '../src/server.js';
import {ServerState} from '../src/state.js';
import {FIXTURE_FUEL_ID,FIXTURE_FUEL_AP} from '../src/supply.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-supply-atomic-http-')),file=path.join(directory,'state.json');
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
  const registered=await secure('/v2/account/RegisterGuest',{device_id:'supply-atomic-http'});assert.equal(registered.body.result_code,1);
  const auth={pvid:String(registered.body.pvid),otp:registered.body.ret_data.otp};
  assert.equal((await secure('/lobby/Enter',auth)).body.result_code,1);
  // Real accepted fixture mission completions earn the two existing LOCAL bonuses.
  for(const stage_id of ['n_01_01','n_01_02']) {
    assert.equal((await secure('/mission/Start',{...auth,stage_id})).body.result_code,1);
    assert.equal((await secure('/mission/Complete',{...auth,stage_id,play_info:'{"clear":1}'})).body.result_code,1);
  }
  const state=context.state as any,game=state.gameByPvid.get(Number(auth.pvid));
  assert.equal(game.special_supply.rows.length,2);
  game.gacha_free_qty=17;game.gacha_iap_qty=13;state.persist();
  const ids=game.special_supply.rows.map((r:any)=>r.id);
  const request=(route:string,extra:Record<string,string>)=>secure(route,{...auth,...extra});
  const failBoth=async(route:string,extra:Record<string,string>)=>{
    for(const kind of ['write','rename']) {
      const bytes=readFileSync(file),before=structuredClone(game),supply=game.special_supply,rows=supply.rows;
      const blocked=path.join(directory,'blocked-'+kind);mkdirSync(kind==='write'?file+'.tmp':blocked);
      if(kind==='rename')state.stateFile=blocked;
      try {
        const failure=await request(route,extra);assert.equal(failure.status,500);assert.notEqual(failure.body.result_code,1);
        assert.equal(failure.body.ret_data?.target_inst,undefined);assert.equal(failure.body.ret_data?.target_inst_id,undefined);
      } finally {
        state.stateFile=file;rmdirSync(kind==='write'?file+'.tmp':blocked);
        if(existsSync(blocked+'.tmp'))rmSync(blocked+'.tmp');
      }
      assert.equal(state.gameByPvid.get(Number(auth.pvid)),game);assert.equal(game.special_supply,supply);assert.equal(supply.rows,rows);
      assert.deepEqual(game,before);assert.deepEqual(readFileSync(file),bytes);
    }
  };
  const special='/supply/SpecialListReward',activity='/supply/ActivityReward';
  await failBoth(special,{id_list:JSON.stringify([ids[0]])});
  const firstGold=game.gold;
  const first=await request(special,{id_list:JSON.stringify([ids[0]])});assert.equal(first.body.result_code,1);
  assert.deepEqual(first.body.ret_data,{target_inst_id:[ids[0]],user:{gold:{prev:firstGold,cur:firstGold+10}}});
  assert.equal(game.gacha_free_qty,17);assert.equal(game.gacha_iap_qty,13);
  await failBoth(special,{id_list:JSON.stringify(ids)});
  const second=await request(special,{id_list:JSON.stringify(ids)});assert.equal(second.body.result_code,1);
  assert.equal(second.body.ret_data.user.gold.cur,firstGold+20);
  const settled=readFileSync(file);mkdirSync(file+'.tmp');
  try {assert.deepEqual((await request(special,{id_list:JSON.stringify(ids)})).body.ret_data,{target_inst_id:ids});}
  finally {rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),settled,'Settled replay needs no persistence or extra award');
  game.ap=1;game.bp=1;game.ap_updated_at=Date.now()-86_400_000;game.bp_updated_at=game.ap_updated_at;state.persist();
  await failBoth(activity,{id:FIXTURE_FUEL_ID});
  const reward=await request(activity,{id:FIXTURE_FUEL_ID});assert.equal(reward.body.result_code,1);
  assert.deepEqual(reward.body.ret_data.target_inst,{id:FIXTURE_FUEL_ID,status:2});
  assert.equal(reward.body.ret_data.user.ap.cur,game.max_ap+FIXTURE_FUEL_AP);assert.equal(game.bp,game.max_bp);
  assert.equal(reward.body.ret_data.user.ap.ap_charge_time,Math.floor(Date.now()/1000)+300);
  assert.equal(reward.body.ret_data.user.ap.prev,undefined,'Native Activity AP branch reads only cur/time');
  assert.equal(game.gacha_free_qty,17);assert.equal(game.gacha_iap_qty,13);
  const final=readFileSync(file);assert.notEqual((await request(activity,{id:FIXTURE_FUEL_ID})).body.result_code,1);
  new ServerState(base,file);assert.deepEqual(readFileSync(file),final);
  const cold=new ServerState(base,file);
  assert.notEqual(cold.claimActivitySupply({...auth,id:FIXTURE_FUEL_ID},{}).result_code,1);
  assert.deepEqual(readFileSync(file),final);
} finally {
  await new Promise<void>((resolve,reject)=>listener.close(error=>error?reject(error):resolve()));Date.now=clock;
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep));rmSync(directory,{recursive:true,force:true});
}
console.log('Supply encrypted HTTP: earned Special single/mixed claims, exact targeted native receipts, actual write/rename500 rollback, due AP/BP regeneration committed with daily claim, Manda preservation, retry/restart once-only settlement passed.');
