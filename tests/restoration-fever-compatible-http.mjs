import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifySingleJet} from '../scripts/resources/verify-single-jet.mjs';
import {FEVER_ORIGINAL} from '../scripts/profiles/prepare-restoration-fever.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const baseline=read('config/profiles/current-e6-fever-compatible-progression.json');
const candidate=read('config/profiles/current-restoration-fever-compatible-progression.json');
const dir=mkdtempSync(path.join(tmpdir(),'blustone-compatible170-http-')),file=path.join(dir,'state.json');
const clean=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('BLUSTONE_')));
const previous={...process.env},realNow=Date.now;
let listener;
try {
  // Authored disposable history, including a real paid rank3 draw. No live state.
  const seeded=spawnSync(process.execPath,['--input-type=module','--eval',`
    import assert from 'node:assert/strict';
    import {ServerState} from './dist/src/state.js';
    import {starterReference} from './dist/src/bootstrap.js';
    Date.now=()=>1800000000000;
    const state=new ServerState('http://localhost',${JSON.stringify(file)});
    const auth=[0,1,2].map(i=>state.registerGuest({device_id:'compatible170-'+i},{}).ret_data);
    process.env.BLUSTONE_RECRUIT_CARD='049';
    const draw=state.gachaPremium({...auth[0],cnt:1,item_inst_id:0},{});
    assert.equal(draw.ret_data.cnt,1);assert.equal(draw.ret_data.card.rank,3);
    const game=state.gameFor(state.accountFor(auth[0],{}));
    assert.equal(game.starter_cards.find(c=>c.ref_id==='002').rank,1);
    const main=game.starter_cards.find(c=>c.ref_id==='001'),mowgli=game.starter_cards.find(c=>c.ref_id==='002');
    main.exp=620;main.skill_1_level=7;mowgli.exp=520;
    game.gold=13579;game.stage_stars.n_01_01=3;
    game.decks=[{type:1,list:[mowgli.inst_id,main.inst_id,draw.ret_data.card.inst_id,0,0]},
      {type:4,list:[main.inst_id,mowgli.inst_id,0,0,0]},{type:5,list:[mowgli.inst_id,main.inst_id,0,0,0]}];
    state.persist();console.log(JSON.stringify({auth,refs:starterReference}));`],
    {cwd:root,env:{...clean,...baseline.env},encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
  assert.equal(seeded.status,0,seeded.stderr);const prior=JSON.parse(seeded.stdout),before=readFileSync(file),priorGames=JSON.parse(before).gameStates;
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,candidate.env);delete process.env.BLUSTONE_STATE_FILE;Date.now=()=>1800000000000;
  const {createApp}=await import(pathToFileURL(path.join(root,'dist/src/server.js')).href);
  const {ServerState}=await import(pathToFileURL(path.join(root,'dist/src/state.js')).href);
  const ctx=createApp({baseUrl:'http://127.0.0.1:0',stateFile:file});
  assert.deepEqual(readFileSync(file),before,'Three dummy accounts restore without a rewrite');
  assert.throws(()=>new ServerState('http://localhost',file,{quickAdvancementMode:'local-owned-tickets'}),/requires the catalogue minimum-rank profile/);
  listener=ctx.app.listen(0,'127.0.0.1');await new Promise((resolve,reject)=>{listener.once('listening',resolve);listener.once('error',reject);});
  const address=listener.address();assert.ok(address&&typeof address!=='string');assert.notEqual(address.port,8080);
  const base=`http://127.0.0.1:${address.port}`,stamp=candidate.resourceStamp,auth=prior.auth[0];ctx.state.baseUrl=base;
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(exchange.status,200);const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get('pv-accesstoken');assert.ok(token);
  const key=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,
    publicKey:crypto.createPublicKey({key:pub,format:'der',type:'spki'})})).digest();
  const sign=data=>crypto.createHmac('sha384',key).update(data).digest('base64');assert.equal(exchange.headers.get('pv-signature'),sign(pub));
  const secure=async(route,values={})=>{
    const plaintext=Buffer.from(String(new URLSearchParams({...values,pvid:String(auth.pvid),otp:String(auth.otp)})));
    const cipher=crypto.createCipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plaintext)},
      body:Buffer.concat([cipher.update(plaintext),cipher.final()])});
    assert.equal(response.status,200);assert.ok(response.headers.get('content-type')?.startsWith('application/octet-stream'));assert.ok(response.headers.get('pv-signature'));
    const decipher=crypto.createDecipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));
    const bytes=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);assert.equal(response.headers.get('pv-signature'),sign(bytes));
    return JSON.parse(bytes);
  };
  assert.equal((await secure('/lobby/Enter')).result_code,1);
  assert.deepEqual(JSON.parse(readFileSync(file)).gameStates,priorGames,'Auth/lobby does not change any seeded game');
  const settled=readFileSync(file),reference=await secure('/reference/GetCard');assert.equal(reference.result_code,1);
  const refs=reference.ret_data;assert.equal(prior.refs.length,14);assert.equal(refs.length,22);
  for(const ref of prior.refs)assert.deepEqual(refs.find(r=>r.base.id===ref.base.id),ref,'Every compiled prior reference remains exact');
  const newIds=refs.filter(r=>!prior.refs.some(old=>old.base.id===r.base.id)).map(r=>r.base.id);
  assert.deepEqual(newIds,['007','011','014','016','018','030','048','054']);
  for(const id of newIds){const ref=refs.find(r=>r.base.id===id);assert.equal(ref.stat[0].hp,'1000');assert.equal(ref.stat[0].atk,'100');assert.equal(ref.stat[0].def,'50');
    assert.equal(ref.skill.length,5);assert.ok(ref.skill.every(s=>s.cost===0&&s.effect.length===0));}
  const owned=priorGames.find(([pvid])=>pvid===auth.pvid)[1],ids=[...owned.starter_cards,...owned.recruited_cards].map(c=>c.inst_id);
  const inventory=await secure('/world/RefreshInven',{card_inst_list:JSON.stringify(ids)});
  assert.deepEqual(inventory.ret_data.card,[...owned.starter_cards,...owned.recruited_cards]);
  assert.ok(inventory.ret_data.card.every(c=>!newIds.includes(c.ref_id)),'New references grant no owned instances');
  const manifest=await fetch(`${base}/reslist_${stamp}.list`);assert.equal(manifest.status,200);
  const lines=(await manifest.text()).trimEnd().split(/\r?\n/),rows=lines.slice(3).map(line=>line.split(','));
  assert.equal(lines[0],stamp);assert.equal(lines[1],'170');assert.equal(rows.length,170);
  assert.deepEqual(rows.map(row=>row[0]+'.jet'),candidate.env.BLUSTONE_PACKAGE_NAMES.split(','));
  const fever=await fetch(`${base}/CFE_PUB_${stamp}.pkg`);assert.equal(fever.status,200);
  verifySingleJet(Buffer.from(await fever.arrayBuffer()),rows.find(r=>r[0]==='CFE_PUB'),FEVER_ORIGINAL,readFileSync(path.join(root,FEVER_ORIGINAL.destination)));
  assert.deepEqual(readFileSync(file),settled,'Encrypted reads/package transport leave complete disposable save bytes unchanged');
  assert.deepEqual(JSON.parse(readFileSync(file)).gameStates,priorGames);
  new ServerState(base,file);assert.deepEqual(readFileSync(file),settled,'Restart preserves every owned tier, skill, deck and progression field');
  const invalid=JSON.parse(settled),badGame=invalid.gameStates.find(([pvid])=>pvid===auth.pvid)[1];
  badGame.recruited_cards.find(c=>c.ref_id==='049').rank=1;
  const invalidFile=path.join(dir,'invalid-owned-material.json'),invalidBytes=Buffer.from(JSON.stringify(invalid));writeFileSync(invalidFile,invalidBytes);
  assert.throws(()=>new ServerState(base,invalidFile),/minimum-rank projection lacks an owned rank\/awakening row/);
  assert.deepEqual(readFileSync(invalidFile),invalidBytes,'Incompatible owned material rank refuses without overwriting evidence');
  console.log('Compiled compatible170 HTTP:14 exact prior refs plus8 neutral/unowned refs, three restored accounts/paidBright/legacyMowgli1/skills/decks/progression exact, encrypted inventory and170 manifest/fever PKGI1 passed; native breadth pending.');
}finally{
  if(listener)await new Promise(resolve=>listener.close(resolve));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(previous,key))delete process.env[key];Object.assign(process.env,previous);Date.now=realNow;
  rmSync(dir,{recursive:true,force:true});
}
