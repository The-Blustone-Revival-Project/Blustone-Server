import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {repositoryPath} from '../src/paths.js';

const savedEnv={...process.env},directory=mkdtempSync(path.join(tmpdir(),'blustone-gem-manda-http-'));
const file=path.join(directory,'state.json');
let server:ReturnType<typeof createServer>|undefined;
const close=async()=>{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));};
try {
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,JSON.parse(readFileSync(repositoryPath('config/profiles/current-e6-gems.json'),'utf8')).env);
  const {ServerState}=await import('../src/state.js'),{createApp}=await import('../src/server.js');
  const {parseStateWithGemIds}=await import('../src/gem-wire.js');
  const ref={id:'LOCAL_MANDA_TEST_GEM',name:'Authored test Gem',desc:'No original balance claim',res_id:'G_1_001_R1',set_effect_id:1,rank:1,target:1};
  const prices=[{level:7,price_type:1,price:7},{level:9,price_type:1,price:11},
    {level:7,price_type:2,price:13},{level:9,price_type:2,price:17}];
  process.env.BLUSTONE_GEM_REFERENCE_JSON=JSON.stringify([ref]);
  process.env.BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON=JSON.stringify(prices);
  const options={baseUrl:'http://127.0.0.1',stateFile:file};
  const seed=new ServerState('http://localhost',file);
  const auth=seed.registerGuest({device_id:'gem-manda-http-owner'},{}).ret_data as any;
  seed.registerGuest({device_id:'gem-manda-http-peer'},{});
  const game=seed.gameFor(seed.accountFor(auth,{})),target=game.starter_cards[0];
  target.weapon_rank=3;game.gold=500;game.gacha_free_qty=5;game.gacha_iap_qty=20;
  const ids=['9007199254740993','18446744073709551615','3'];
  game.owned_gems=ids.map((inst_id,index)=>({inst_id,ref_id:ref.id,rank:1,level:index===1?9:7,
    position:index<2?index+1:0,target_inst_id:index<2?String(target.inst_id):'0',ability:'opaque-'+index,abilities:null}));
  (seed as any).persist();
  let context=createApp(options),base='';
  const listen=async()=>{server=createServer(context.app);await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
    const address=server.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
    base=`http://127.0.0.1:${address.port}`;context.state.baseUrl=base;};
  const read=()=>parseStateWithGemIds(readFileSync(file,'utf8')) as any;
  await listen();
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const secret=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,
    publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const sign=(data:Buffer)=>crypto.createHmac('sha384',secret).update(data).digest('base64');assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(values:Record<string,string>)=>{
    const plain=Buffer.from(String(new URLSearchParams({...values,pvid:String(auth.pvid),otp:String(auth.otp)})));
    const cipher=crypto.createCipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32));
    const response=await fetch(base+'/card_handler/EquipGem',{method:'POST',headers:{'content-type':'application/octet-stream',
      'pv-accesstoken':token,'pv-signature':sign(plain)},body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});
    assert.equal(response.status,200);const encrypted=response.headers.get('content-type')?.startsWith('application/octet-stream')===true;
    let text:string;
    if(encrypted){const decipher=crypto.createDecipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32));
      const decoded=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);
      assert.equal(response.headers.get('pv-signature'),sign(decoded));text=decoded.toString();
    }else text=await response.text();
    const decoded=parseStateWithGemIds(text) as any;if(decoded.result_code===1)assert.equal(encrypted,true);
    return {decoded,text};
  };
  const empty={target_inst_id:String(target.inst_id),price_type:'1',combination:'{"weapons":[0,0],"armors":[0,0],"accessories":[0,0]}'};
  const before=read(),beforeBytes=readFileSync(file),ownerBefore=before.gameStates.find(([id]:any)=>id===auth.pvid)[1];
  assert.equal((await secure({...empty,price_type:'4'})).decoded.result_code,2001);assert.deepEqual(readFileSync(file),beforeBytes);
  // Quote selection must follow payment1, never fall back to available gold2 rows.
  await close();process.env.BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON=JSON.stringify(prices.filter(row=>row.price_type===2));
  context=createApp(options);await listen();
  assert.deepEqual(readFileSync(file),beforeBytes);
  assert.equal((await secure(empty)).decoded.result_code,2001);assert.deepEqual(readFileSync(file),beforeBytes);
  await close();process.env.BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON=JSON.stringify(prices);context=createApp(options);await listen();
  // A real numeric full64 grid can retain/move these IDs without strtod rounding.
  const unchanged={...empty,combination:`{"weapons":[${ids[0]},${ids[1]}],"armors":[0,0],"accessories":[0,0]}`};
  const kept=await secure(unchanged);assert.equal(kept.decoded.result_code,1);assert.deepEqual(readFileSync(file),beforeBytes);
  assert.ok(kept.text.includes('"inst_id":'+ids[0]));assert.ok(kept.text.includes('"inst_id":'+ids[1]));
  const removed=await secure(empty);assert.equal(removed.decoded.result_code,1);
  const data=removed.decoded.ret_data;
  assert.deepEqual(data.user,{gold:{cur:500},gdp:{cur:0},iap_qty:7,free_iap_qty:0,item:[]},
    'Native ParseGemEquip consumes absolute root user scalars; free-first is explicit LOCAL settlement');
  assert.equal(data.user.iap,undefined);assert.equal(data.gems.length,3,'Full authoritative inventory includes unrelated unmounted rows');
  assert.ok(data.gems.every((gem:any)=>gem.target_inst_id==='0'&&gem.position===0));
  assert.ok(removed.text.includes('"inst_id":'+ids[0]));assert.ok(removed.text.includes('"inst_id":'+ids[1]));
  const after=read(),ownerAfter=after.gameStates.find(([id]:any)=>id===auth.pvid)[1];
  const expected=structuredClone(ownerBefore);expected.gacha_free_qty=0;expected.gacha_iap_qty=7;
  for(const gem of expected.owned_gems){gem.target_inst_id='0';gem.position=0;}
  assert.deepEqual(ownerAfter,expected,'Only mounted fields and the selected Manda wallet change');
  assert.deepEqual(after.accounts,before.accounts);
  assert.deepEqual(after.gameStates.filter(([id]:any)=>id!==auth.pvid),before.gameStates.filter(([id]:any)=>id!==auth.pvid));
  const paidBytes=readFileSync(file),retry=await secure(empty);assert.equal(retry.decoded.result_code,1);
  assert.deepEqual(retry.decoded.ret_data,data);assert.deepEqual(readFileSync(file),paidBytes,'Lost response retry neither charges again nor writes');
  await close();context=createApp(options);await listen();assert.deepEqual(readFileSync(file),paidBytes);
  const coldRetry=await secure(empty);assert.deepEqual(coldRetry.decoded.ret_data,data);assert.deepEqual(readFileSync(file),paidBytes);
  console.log('Gem Manda encrypted HTTP: native type1 form/full64 grid, selected quotes, explicit free-first charge, absolute scalar wallets/full inventory, unchanged gold/peer, type4/missingquote refusal and lost-reply/cold-restart no charge passed; supplied LOCAL fees only.');
}finally{
  await close();for(const key of Object.keys(process.env))if(!Object.hasOwn(savedEnv,key))delete process.env[key];Object.assign(process.env,savedEnv);
  assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'blustone-gem-manda-http-'));rmSync(directory,{recursive:true,force:true});
}
