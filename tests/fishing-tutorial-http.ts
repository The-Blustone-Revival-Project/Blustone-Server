import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {ServerState} from '../src/state.js';
import {createApp} from '../src/server.js';
import {repositoryPath} from '../src/paths.js';

// Disposable authored policies and supplied outcomes; no native gameplay claim.
const directory=mkdtempSync(path.join(tmpdir(),'blustone-fishing-tutorial-http-'));
const file=path.join(directory,'state.json');
const policyFiles=['fishing-practice-items','fishing-practice-catalogue','fishing-practice-casts','fishing-practice-tutorial'];
const bytes=policyFiles.map(name=>readFileSync(repositoryPath('config/policies/'+name+'.json')));
const [items,catalogue,casts,tutorial]=bytes.map(value=>JSON.parse(value.toString()));
const options={baseUrl:'http://127.0.0.1',stateFile:file,baitShopMode:'archive-2018-projection' as const,baitShopDailyLimit:3,
  fishingItems:items,fishingCatalogue:catalogue,fishingCastMode:'local-configured' as const,fishingCastPolicy:casts,
  fishingSaleMode:'local-bound' as const,fishingSaleBindings:{}};
let server:ReturnType<typeof createServer>|undefined;
const read=()=>JSON.parse(readFileSync(file,'utf8'));
const close=async()=>{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));};
try {
  const seed=new ServerState('http://localhost',file);
  const auth=seed.registerGuest({device_id:'tutorial-http-owner'},{}).ret_data as any;
  seed.registerGuest({device_id:'tutorial-http-peer'},{});
  let context=createApp(options),base='';
  const listen=async()=>{
    server=createServer(context.app);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
    const address=server.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
    base=`http://127.0.0.1:${address.port}`;context.state.baseUrl=base;
  };
  await listen();
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);
  const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const key=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,
    publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const sign=(value:Buffer)=>crypto.createHmac('sha384',key).update(value).digest('base64');
  assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(route:string,values:Record<string,string>={},expectedStatus=200)=>{
    const plain=Buffer.from(String(new URLSearchParams({...values,pvid:String(auth.pvid),otp:String(auth.otp)})));
    const cipher=crypto.createCipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream',
      'pv-accesstoken':token,'pv-signature':sign(plain)},body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});
    assert.equal(response.status,expectedStatus);
    const encrypted=response.headers.get('content-type')?.startsWith('application/octet-stream')===true;
    let decoded;
    if(encrypted){
      const decipher=crypto.createDecipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
      const reply=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);
      assert.equal(response.headers.get('pv-signature'),sign(reply));decoded=JSON.parse(reply.toString());
    }else decoded=JSON.parse(await response.text());
    if(decoded.result_code===1)assert.equal(encrypted,true,'Success must use native encrypted transport');
    return decoded;
  };
  const end={log_id:'-1',is_win:'1'};
  const before=read(),beforeBytes=readFileSync(file),ownerBefore=before.gameStates.find(([id]:any)=>id===auth.pvid)[1];
  assert.equal((await secure('/fishing/EndWithSell',end)).result_code,2001,'Tutorial is disabled by default');
  assert.deepEqual(readFileSync(file),beforeBytes);
  await close();context=createApp({...options,fishingTutorialMode:'local-first-catch',fishingTutorialPolicy:tutorial});await listen();
  assert.deepEqual(readFileSync(file),beforeBytes,'Enabling tutorial does not capture or grant');
  const malformedPackets:Record<string,string>[]=[{log_id:'-1',is_win:'0'},{log_id:'-1',is_win:'true'},{...end,fish_id:items[0].id}];
  for(const malformed of malformedPackets) {
    assert.equal((await secure('/fishing/EndWithSell',malformed)).result_code,2001);assert.deepEqual(readFileSync(file),beforeBytes);
  }
  assert.deepEqual((await secure('/fishing/GetRecord')).ret_data,[]);
  assert.equal(ownerBefore.items.some((row:any)=>row.ref_id==='LU003'&&row.qty>0),false,'No bait is seeded or bought for the guide');
  mkdirSync(file+'.tmp');
  try{assert.equal((await secure('/fishing/EndWithSell',end,500)).error,'local server failure');}finally{rmdirSync(file+'.tmp');}
  assert.deepEqual(readFileSync(file),beforeBytes,'Failed first settlement must leave no journal or award');
  const first=await secure('/fishing/EndWithSell',end);assert.equal(first.result_code,1);
  const settled=read(),owner=settled.gameStates.find(([id]:any)=>id===auth.pvid)[1];
  const inst=ownerBefore.next_item_inst_id,fish=tutorial.outcome.fish_id;
  assert.equal(settled.version,17);assert.equal(settled.fishingTutorials.length,1);
  assert.deepEqual(first.ret_data.item,[{inst_id:inst,ref_id:fish,added:1}]);
  assert.equal(first.ret_data.user?.item,undefined,'Original ParseEnd reads ret_data.item, never user.item');
  assert.deepEqual(first.ret_data.consumed_inst_list,[]);
  assert.deepEqual(first.ret_data.sell.item,[{inst_id:inst,qty:1}]);
  assert.deepEqual(first.ret_data.sell.user.gold,{prev:ownerBefore.gold,cur:ownerBefore.gold+10});
  assert.deepEqual(first.ret_data.sell.sell_result,{fish_id:fish,b_cnt:0,s_cnt:0,g_cnt:0});
  const expected=structuredClone(ownerBefore);expected.gold+=10;expected.next_item_inst_id=inst+1;
  expected.items.push({inst_id:inst,ref_id:fish,qty:0,lock:0});expected.owned_fish=[{fish_id:fish,b_cnt:0,s_cnt:0,g_cnt:0}];
  assert.deepEqual(owner,expected,'Only local auto-sale, stack tombstone and item ID change; tutorial flags stay native-owned');
  assert.deepEqual(settled.accounts,before.accounts);
  assert.deepEqual(settled.gameStates.filter(([id]:any)=>id!==auth.pvid),before.gameStates.filter(([id]:any)=>id!==auth.pvid));
  const settledBytes=readFileSync(file);
  assert.equal((await secure('/fishing/EndWithSell',end)).result_code,10203);
  assert.deepEqual(readFileSync(file),settledBytes,'Duplicate must not replay additive receipt');
  assert.deepEqual((await secure('/fishing/GetRecord')).ret_data,[tutorial.outcome],'Sold catch remains a longest-catch record');
  assert.deepEqual((await secure('/fishing/GetInven')).ret_data,expected.owned_fish);
  const inven=(await secure('/lobby/GetItemInven')).ret_data.item;
  assert.equal(inven.find((row:any)=>row.inst_id===inst).qty,0,'Absolute inventory retains sold-stack tombstone');
  const references=(await secure('/reference/GetItem')).ret_data.item;
  assert.equal(references.find((row:any)=>row.id===fish).thumbnail_id,'FS001');
  // Ordinary bait comes only from an actual authored-shop purchase after the guide.
  const bought=await secure('/shop/BuyGlobalItem',{target_ref_id:'LU003',price_type:'1',item_inst_id:'0',qty:'1'});
  assert.equal(bought.result_code,1);assert.equal(bought.ret_data.item[0].added,10);
  const paid=read().gameStates.find(([id]:any)=>id===auth.pvid)[1];assert.equal(paid.gacha_free_qty,owner.gacha_free_qty-6);
  const cast=casts.contexts[0],begin=await secure('/fishing/Begin',{place_id:cast.place_id,cast_dist:String(cast.cast_dist),lure_id:cast.lure_id});
  assert.equal(begin.result_code,1);const pendingBytes=readFileSync(file);
  assert.equal((await secure('/fishing/EndWithSell',end)).result_code,2001,'Pending ordinary cast must precede tutorial duplicate cleanup');
  assert.deepEqual(readFileSync(file),pendingBytes);
  const lost=await secure('/fishing/EndWithSell',{log_id:String(begin.ret_data.log_id),is_win:'0'});assert.equal(lost.result_code,1);
  assert.equal((await secure('/fishing/EndWithSell',end)).result_code,10203);
  assert.deepEqual((await secure('/fishing/GetRecord')).ret_data,[tutorial.outcome]);
  const finalBytes=readFileSync(file);
  await close();context=createApp({...options,fishingTutorialMode:'disabled'});await listen();
  assert.deepEqual(readFileSync(file),finalBytes,'Disabled tutorial restores its captured evidence without writes');
  assert.deepEqual((await secure('/fishing/GetRecord')).ret_data,[tutorial.outcome]);
  assert.equal((await secure('/fishing/EndWithSell',end)).result_code,2001);
  assert.deepEqual(readFileSync(file),finalBytes);
  for(const [index,name] of policyFiles.entries())assert.deepEqual(readFileSync(repositoryPath('config/policies/'+name+'.json')),bytes[index]);
  console.log('Fishing tutorial encrypted HTTP: public practice policies, disabled/default refusal, zero-bait one-time auto-sale/schema17, atomic failure, tombstone/reference/record, purchased bait, pending-before-duplicate and disabled restart passed; no native claim.');
}finally{
  await close();assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'blustone-fishing-tutorial-http-'));
  rmSync(directory,{recursive:true,force:true});
}
