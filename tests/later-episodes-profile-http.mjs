import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {verifySingleJet} from '../scripts/resources/verify-single-jet.mjs';
import {laterEpisodeOriginals} from '../scripts/profiles/prepare-later-episodes.mjs';
import {FEVER_ORIGINAL} from '../scripts/profiles/prepare-restoration-fever.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(readFileSync(path.join(root,name),'utf8'));
const baseline=read('config/profiles/current-e10-expanded-character-progression.json');
const candidate=read('config/profiles/current-later-episodes.json');
const allOriginals=laterEpisodeOriginals(),representatives=['M100.jet','M014.jet','C509.jet','C510.jet','N502.jet','CUT_E1801.jet','ST902.jet'];
const originals=[...representatives.map(name=>allOriginals.find(pin=>pin.name===name)),FEVER_ORIGINAL];
assert.ok(originals.every(Boolean));const monster=originals[0];
const expectedNames=[...baseline.env.BLUSTONE_PACKAGE_NAMES.split(','),...allOriginals.map(pin=>pin.name)];
assert.equal(expectedNames.length,280);assert.equal(candidate.expectedPackages,280);assert.equal(candidate.preparedOnly,true);
assert.deepEqual(candidate.env.BLUSTONE_PACKAGE_NAMES.split(','),expectedNames);
const policies=env=>Object.fromEntries(Object.entries(env).filter(([key])=>!['BLUSTONE_PACKAGE_NAMES','BLUSTONE_RESOURCE_VERSION','BLUSTONE_RESLIST_STAMP','BLUSTONE_RESLIST_HEADER_STAMP'].includes(key)));
assert.deepEqual(policies(candidate.env),policies(baseline.env),'All210 nonresource policies remain exact, including expanded skills/stats and selective birth projection');
assert.ok(Number(candidate.resourceStamp)>Number(baseline.resourceStamp));
const sourceHashes=new Map([...allOriginals,FEVER_ORIGINAL].map(pin=>[pin.destination,crypto.createHash('sha256').update(readFileSync(path.join(root,pin.destination))).digest('hex')]));
for(const pin of [...allOriginals,FEVER_ORIGINAL])assert.equal(sourceHashes.get(pin.destination),pin.sha256);
assert.equal(monster.bytes,584684);assert.equal(monster.sha256,'f133b1aec0d04c67e524abe97b795565c439b803ba5175f56d76fdc641283243');
assert.ok(expectedNames.includes('CFE_PUB.jet'),'Original fever asset retained');
const dir=mkdtempSync(path.join(tmpdir(),'blustone-later280-http-')),file=path.join(dir,'state.json');
const clean=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('BLUSTONE_')));
const previous={...process.env},realNow=Date.now;
let listener,coldListener;
try {
  // Authored disposable history, including a real paid rank3 draw. No live state.
  const seeded=spawnSync(process.execPath,['--input-type=module','--eval',`
    import assert from 'node:assert/strict';
    import {ServerState} from './dist/src/state.js';
    import {starterReference,recruitBirthRanks} from './dist/src/bootstrap.js';
    import {HUNTER_TRACE_ITEMS,itemReference} from './dist/src/hunter-traces.js';
    Date.now=()=>1800000000000;
    const state=new ServerState('http://localhost',${JSON.stringify(file)});
    const auth=[0,1,2].map(i=>state.registerGuest({device_id:'later280-'+i},{}).ret_data);
    process.env.BLUSTONE_RECRUIT_CARD='049';
    const draw=state.gachaPremium({...auth[0],cnt:1,item_inst_id:0},{});
    assert.equal(draw.ret_data.cnt,1);assert.equal(draw.ret_data.card.rank,3);
    assert.equal(draw.ret_data.card.ref_id,'049');
    const game=state.gameFor(state.accountFor(auth[0],{}));
    assert.equal(game.starter_cards.find(c=>c.ref_id==='002').rank,1);
    const main=game.starter_cards.find(c=>c.ref_id==='001'),mowgli=game.starter_cards.find(c=>c.ref_id==='002');
    main.exp=620;main.skill_1_level=7;mowgli.exp=520;
    game.gold=13579;game.stage_stars.n_01_01=3;
    game.decks=[{type:1,list:[mowgli.inst_id,main.inst_id,draw.ret_data.card.inst_id,0,0]},
      {type:4,list:[main.inst_id,mowgli.inst_id,0,0,0]},{type:5,list:[mowgli.inst_id,main.inst_id,0,0,0]}];
    for(let i=1;i<auth.length;i++){
      const peer=state.gameFor(state.accountFor(auth[i],{}));peer.gold=24680+i;peer.starter_cards[0].exp=100*i;
      peer.stage_stars['n_01_0'+(i+1)]=i;peer.gacha_iap_qty=21+i;peer.gacha_free_qty=31+i;
    }
    state.persist();console.log(JSON.stringify({auth,refs:starterReference,births:recruitBirthRanks,traceItems:HUNTER_TRACE_ITEMS,items:itemReference()}));`],
    {cwd:root,env:{...clean,...baseline.env},encoding:'utf8',timeout:30000,maxBuffer:2*1024*1024});
  assert.equal(seeded.status,0,seeded.stderr);const prior=JSON.parse(seeded.stdout),before=readFileSync(file),priorGames=JSON.parse(before).gameStates;
  for(const key of Object.keys(process.env))if(key.startsWith('BLUSTONE_'))delete process.env[key];
  Object.assign(process.env,candidate.env);delete process.env.BLUSTONE_STATE_FILE;Date.now=()=>1800000000000;
  // A fresh app snapshot is lazy; the first actual resource access below is a
  // native package Range request, before any manifest or full-package request.
  process.env.BLUSTONE_RESOURCE_SNAPSHOT='1';
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
  const refs=reference.ret_data;assert.equal(prior.refs.length,29);assert.equal(refs.length,40);
  for(const ref of prior.refs)assert.deepEqual(refs.find(r=>r.base.id===ref.base.id),ref,'Every compiled prior reference remains exact');
  const newIds=refs.filter(r=>!prior.refs.some(old=>old.base.id===r.base.id)).map(r=>r.base.id);
  assert.deepEqual(newIds,['008','019','023','028','035','043','046','057','064','068','071']);
  assert.ok(!refs.some(ref=>['509','510'].includes(ref.base.id)),'Variant art never manufactures ordinary references');
  for(const id of newIds){const ref=refs.find(r=>r.base.id===id);assert.equal(ref.stat[0].hp,'1000');assert.equal(ref.stat[0].atk,'100');assert.equal(ref.stat[0].def,'50');
    assert.equal(ref.skill.length,5);assert.ok(ref.skill.every(s=>s.cost===0&&s.effect.length===0));}
  const {recruitBirthRanks}=await import(pathToFileURL(path.join(root,'dist/src/bootstrap.js')).href);
  const {HUNTER_TRACE_ITEMS}=await import(pathToFileURL(path.join(root,'dist/src/hunter-traces.js')).href);
  assert.deepEqual(recruitBirthRanks,prior.births);assert.deepEqual(HUNTER_TRACE_ITEMS,prior.traceItems);
  const itemRefs=await secure('/reference/GetItem');assert.equal(itemRefs.result_code,1);
  assert.deepEqual(itemRefs.ret_data.trace,prior.items.trace,'Resource coverage does not add acquisition/drop links');
  for(const old of prior.items.item)assert.deepEqual(itemRefs.ret_data.item.find(item=>item.id===old.id),old,'All prior item/acquisition metadata remains exact');
  for(const id of newIds){const item=itemRefs.ret_data.item.find(item=>item.id==='local_library_trace_'+id);
    assert.ok(item);assert.equal(item.collect_qty,1);assert.match(item.desc,/Acquisition.*unreconstructed/i);
    assert.ok(!itemRefs.ret_data.trace.some(row=>row.item_id===item.id),'Neutral Library navigation is not an acquisition link');}
  const owned=priorGames.find(([pvid])=>pvid===auth.pvid)[1],ids=[...owned.starter_cards,...owned.recruited_cards].map(c=>c.inst_id);
  const inventory=await secure('/world/RefreshInven',{card_inst_list:JSON.stringify(ids)});
  assert.deepEqual(inventory.ret_data.card,[...owned.starter_cards,...owned.recruited_cards]);
  assert.ok(inventory.ret_data.card.every(c=>!newIds.includes(c.ref_id)),'New references grant no owned instances');
  const packagePath=`/M100_${stamp}.pkg`,original=readFileSync(path.join(root,monster.destination));
  const cold=await fetch(base+packagePath,{headers:{range:'bytes=0-63'}});assert.equal(cold.status,206);
  const coldBytes=Buffer.from(await cold.arrayBuffer());assert.equal(coldBytes.length,64);
  const packageSize=29+Buffer.byteLength(monster.name)+monster.bytes;
  assert.equal(cold.headers.get('content-range'),`bytes 0-63/${packageSize}`);
  const manifest=await fetch(`${base}/reslist_${stamp}.list`);assert.equal(manifest.status,200);
  const lines=(await manifest.text()).trimEnd().split(/\r?\n/),rows=lines.slice(3).map(line=>line.split(','));
  assert.equal(lines[0],stamp);assert.equal(lines[1],'280');assert.equal(rows.length,280);
  assert.deepEqual(rows.map(row=>row[0]+'.jet'),candidate.env.BLUSTONE_PACKAGE_NAMES.split(','));
  assert.equal(Number(lines[2]),rows.reduce((sum,row)=>sum+Number(row[2]),0));
  const full=await fetch(base+packagePath);assert.equal(full.status,200);const fullBytes=Buffer.from(await full.arrayBuffer());
  verifySingleJet(fullBytes,rows.find(row=>row[0]==='M100'),monster,original);assert.deepEqual(coldBytes,fullBytes.subarray(0,64));
  const raw=await fetch(base+'/M100.jet');assert.equal(raw.status,200);assert.deepEqual(Buffer.from(await raw.arrayBuffer()),original);
  for(const [range,start,end] of [['bytes=37-96',37,97],[`bytes=${fullBytes.length-17}-`,fullBytes.length-17,fullBytes.length]]){
    const response=await fetch(base+packagePath,{headers:{range}});assert.equal(response.status,206);
    assert.equal(response.headers.get('content-range'),`bytes ${start}-${end-1}/${fullBytes.length}`);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),fullBytes.subarray(start,end));
  }
  const invalidRange=await fetch(base+packagePath,{headers:{range:'bytes='+fullBytes.length+'-'}});assert.equal(invalidRange.status,416);await invalidRange.arrayBuffer();
  for(const pin of originals.filter(row=>row.name!==monster.name)){
    const response=await fetch(`${base}/${pin.name.slice(0,-4)}_${stamp}.pkg`);assert.equal(response.status,200);
    verifySingleJet(Buffer.from(await response.arrayBuffer()),rows.find(row=>row[0]+'.jet'===pin.name),pin,readFileSync(path.join(root,pin.destination)));
  }
  // The second application starts with an independent uninitialized lazy
  // snapshot, under the SAME env/import epoch. No mutable process-env switch.
  const coldContext=createApp({baseUrl:'http://127.0.0.1:0'});
  coldListener=coldContext.app.listen(0,'127.0.0.1');
  await new Promise((resolve,reject)=>{coldListener.once('listening',resolve);coldListener.once('error',reject);});
  const coldAddress=coldListener.address();assert.ok(coldAddress&&typeof coldAddress!=='string');assert.notEqual(coldAddress.port,8080);
  const coldBase=`http://127.0.0.1:${coldAddress.port}`;
  const secondManifest=await fetch(`${coldBase}/reslist_${stamp}.list`);assert.equal(secondManifest.status,200);
  assert.equal(await secondManifest.text(),lines.join('\n')+'\n','Fresh app creates the same complete280 snapshot');
  const secondPackage=await fetch(coldBase+packagePath);assert.equal(secondPackage.status,200);
  assert.deepEqual(Buffer.from(await secondPackage.arrayBuffer()),fullBytes,'Fresh app and warm app expose the same pinned original payload');
  const secondRange=await fetch(coldBase+packagePath,{headers:{range:'bytes=0-63'}});assert.equal(secondRange.status,206);
  assert.deepEqual(Buffer.from(await secondRange.arrayBuffer()),coldBytes);
  assert.deepEqual(readFileSync(file),settled,'Encrypted reads/package transport leave complete disposable save bytes unchanged');
  assert.deepEqual(JSON.parse(readFileSync(file)).gameStates,priorGames);
  new ServerState(base,file);assert.deepEqual(readFileSync(file),settled,'Restart preserves every owned tier, skill, deck and progression field');
  const invalid=JSON.parse(settled),badGame=invalid.gameStates.find(([pvid])=>pvid===auth.pvid)[1];
  badGame.recruited_cards.find(c=>c.ref_id==='049').rank=1;
  const invalidFile=path.join(dir,'invalid-owned-material.json'),invalidBytes=Buffer.from(JSON.stringify(invalid));writeFileSync(invalidFile,invalidBytes);
  assert.throws(()=>new ServerState(base,invalidFile),/minimum-rank projection lacks an owned rank\/awakening row/);
  assert.deepEqual(readFileSync(invalidFile),invalidBytes,'Incompatible owned material rank refuses without overwriting evidence');
  for(const pin of [...allOriginals,FEVER_ORIGINAL])assert.equal(crypto.createHash('sha256').update(readFileSync(path.join(root,pin.destination))).digest('hex'),sourceHashes.get(pin.destination),'Original resources were not modified by verification');
  console.log('Compiled later280 HTTP:29 exact prior refs plus11 neutral/unowned refs, no509/510 ordinary rows, three disposable games/paidBright3/legacyMowgli1/skills/decks/currency/progress exact, unchanged acquisition authority; encrypted references/inventory, actual280 snapshot manifest and8 representative original PKGI1 packages including retainedCFE, cold-range/full/raw/partial/invalid-range and second-app consistency PASS. Native later Episodes pending.');
}finally{
  for(const active of [listener,coldListener])if(active)await new Promise(resolve=>active.close(resolve));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(previous,key))delete process.env[key];Object.assign(process.env,previous);Date.now=realNow;
  rmSync(dir,{recursive:true,force:true});
}
