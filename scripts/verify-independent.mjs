// External-process compiled-server check. Uses a disposable copy of preserved state.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import {createServer} from 'node:net';
import {verifySingleJet} from './resources/verify-single-jet.mjs';
import {preflight} from './resources/verify.mjs';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const profileIndex=process.argv.indexOf('--profile');
const profileName=profileIndex===-1?'current-e6':process.argv[profileIndex+1];
if(typeof profileName!=='string' || !/^[\w-]+$/.test(profileName)) throw new Error('Invalid verification profile');
const profile=JSON.parse(readFileSync(path.join(root,'config/profiles',profileName+'.json'),'utf8'));
preflight(root,profile);
const stamp=profile.env.BLUSTONE_RESLIST_STAMP;
const expectedNames=profile.env.BLUSTONE_PACKAGE_NAMES.split(',').map(name=>name.slice(0,-4));
const outputFolder = path.join(root, 'local/verification',profileName); mkdirSync(outputFolder, {recursive:true});
const port = 18081, base = `http://127.0.0.1:${port}`;
const requireFreePort=async()=>{
  const probe=createServer();
  await new Promise((resolve,reject)=>{probe.once('error',reject);probe.listen(port,'127.0.0.1',resolve);});
  await new Promise((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
};
// Do not accept a preexisting server's health response or overwrite a concurrent
// verifier's state copy. This check sends no HTTP request and stops no process.
await requireFreePort();
// Each invocation owns its disposable state directory even if another verifier
// races the port probe. Never overwrite a concurrent writer's state copy.
const folder = mkdtempSync(path.join(outputFolder,'run-'));
const stateFile = path.join(folder, 'state.json');
const preserved = process.argv.includes('--fixture') ? '' : path.join(root, 'local/private/preserved-state.json');
if (existsSync(preserved)) copyFileSync(preserved, stateFile);
else {
  // Public/CI checkouts use one disposable generated fixture, never a private account dump.
  rmSync(stateFile, {force:true});
  const { ServerState } = await import(pathToFileURL(path.join(root, 'dist/src/state.js')).href);
  const fixture = new ServerState(base, stateFile);
  fixture.registerGuest({device_id:'standalone-generated-fixture'}, {});
}
const before = JSON.parse(readFileSync(stateFile, 'utf8'));
let child;
const launch = async () => {
  const env={...process.env,...profile.env};
  for(const key of ['BLUSTONE_PACKAGE_DIR','BLUSTONE_PACKAGE_TREE_DIR','BLUSTONE_UI_PACKAGE_TREE_DIR','BLUSTONE_RESOURCE_ASSET_DIR','BLUSTONE_CATALOG_PATH'])
    if(env[key])env[key]=path.resolve(root,env[key]);
  Object.assign(env,{BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:'127.0.0.1',BLUSTONE_BASE_URL:base,BLUSTONE_STATE_FILE:stateFile});
  // Own the listener process directly. Windows kill(SIGTERM) cannot invoke a
  // wrapper's forwarding handler and would leave its server child orphaned.
  child = spawn(process.execPath, [path.join(root,'dist/src/server.js')],
    {cwd: folder, env, stdio:['ignore','pipe','pipe']});
  let logs=''; child.stdout.on('data', b=>{logs+=b;}); child.stderr.on('data', b=>{logs+=b;});
  child.once('error', error => { logs+=error.message; });
  for(let i=0;i<100;i++) {
    if(child.exitCode!==null || child.signalCode!==null) throw new Error('Compiled server exited: '+logs.slice(-1500));
    // Only our owned child's successful listen callback authorizes HTTP probes;
    // a racing process on the checked port must not become the test subject.
    try { if(logs.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`) &&
      (await fetch(base+'/healthz')).ok) return; } catch {}
    await delay(100);
  }
  throw new Error('Compiled server startup timed out: '+logs.slice(-1500));
};
const stop = async () => {
  if(!child)return;
  const owned=child;
  if(owned.exitCode===null && owned.signalCode===null) {const exited=once(owned,'exit');owned.kill();await exited;}
  child=undefined;
  for(let i=0;i<50;i++) {
    try {await requireFreePort();return;} catch(error) {if(error.code!=='EADDRINUSE')throw error;}
    await delay(100);
  }
  throw new Error('Verifier listener did not close; no replacement process was started');
};
let secret,token;
async function exchange() {
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const response=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(response.status,200);const publicBytes=Buffer.from(await response.arrayBuffer());
  secret=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:publicBytes,format:'der',type:'spki'})})).digest();
  assert.equal(response.headers.get('pv-signature'),crypto.createHmac('sha384',secret).update(publicBytes).digest('base64'));
  token=response.headers.get('pv-accesstoken');assert.ok(token);
}
async function secure(route,values) {
  const plain=Buffer.from(String(new URLSearchParams(values)));const cipher=crypto.createCipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));
  const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,
    'pv-signature':crypto.createHmac('sha384',secret).update(plain).digest('base64')},body:Buffer.concat([cipher.update(plain),cipher.final()])});
  assert.equal(response.status,200,route);
  const bytes=Buffer.from(await response.arrayBuffer());
  assert.ok(response.headers.get('content-type')?.startsWith('application/octet-stream'),route+' must return encrypted bytes');
  const decipher=crypto.createDecipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));const decoded=Buffer.concat([decipher.update(bytes),decipher.final()]);
  assert.equal(response.headers.get('pv-signature'),crypto.createHmac('sha384',secret).update(decoded).digest('base64'));
  return JSON.parse(decoded);
}
try {
  await launch(); await exchange();
  const guest=await secure('/v2/account/RegisterGuest',{device_id:'standalone-migration-verification'});
  const auth={otp:String(guest.ret_data.otp),pvid:String(guest.pvid)};
  const lobby=await secure('/lobby/Enter',auth);assert.ok(lobby.ret_data);
  for(const route of ['/reference/GetStage','/reference/GetCard','/lobby/GetCardInven','/episode/GetLog']) {
    const reply=await secure(route,auth);assert.ok(reply.ret_data!==undefined,route);
  }
  const friendFloors=await secure('/mirage/GetFriendInfo',auth);
  assert.equal(friendFloors.result_code,1);assert.deepEqual(friendFloors.ret_data,[]);
  const ordinaryReferences=(await secure('/reference/GetCard',auth)).ret_data;
  const materialsIds=profileName==='current-e6-materials18'
    ? ['009','010','012','013','014','017','030','036','040','048','049','054']
    : ['009','010','012','013','017','036','040','049'];
  const expectedReferenceCount=profile.env.BLUSTONE_CARD_REFERENCE_PROFILE==='materials'?6+materialsIds.length:6;
  assert.equal(ordinaryReferences.length,expectedReferenceCount,'Compiled ordinary reference profile');
  if(profile.env.BLUSTONE_CARD_REFERENCE_PROFILE==='materials') {
    assert.deepEqual(ordinaryReferences.slice(6).map(row=>row.base.id),materialsIds);
    assert.ok(ordinaryReferences.slice(6).every(row=>row.is_main===0 && row.skill.length===5));
  }
  const areas=(await secure('/reference/GetArea',auth)).ret_data;
  const origin=areas.area.find(area=>area.id==='n_00');
  assert.ok(origin,'Hidden origin ordinal must remain present');
  assert.deepEqual(origin.stage,[],'Hidden origin must not steal a campaign stage');
  assert.deepEqual(origin.achieve_reward,[],'Hidden origin must not publish synthetic rewards');
  const campaignLinks=areas.area.flatMap(area=>area.stage);
  assert.equal(campaignLinks.length,50);
  assert.equal(new Set(campaignLinks.map(link=>link.stage_id)).size,50,'Campaign stage ownership must be unique');
  assert.deepEqual(campaignLinks.filter(link=>link.stage_id==='n_01_01').map(link=>link.area_id),['n_01']);
  const manifestReply=await fetch(base+'/reslist_'+stamp+'.list');assert.equal(manifestReply.status,200);
  const manifest=await manifestReply.text();
  const lines=manifest.trim().split(/\r?\n/),rows=lines.slice(3);
  assert.equal(lines[0],stamp);assert.equal(Number(lines[1]),profile.expectedPackages);
  assert.equal(rows.length,profile.expectedPackages);
  const columns=rows.map(row=>row.split(','));
  assert.deepEqual(columns.map(row=>row[0]),expectedNames,'Exact ordered package selection');
  assert.ok(columns.every(row=>row.length===6 && row[1]===stamp && row[3]==='0' &&
    Number.isSafeInteger(Number(row[2])) && Number(row[2])>=20 && /^[a-f0-9]{32}$/i.test(row[4]) && /^[a-f0-9]{32}$/i.test(row[5])));
  assert.equal(Number(lines[2]),columns.reduce((sum,row)=>sum+Number(row[2]),0),'Manifest total package bytes');
  const first=columns[0][0];const resource=await fetch(base+'/'+first+'_'+stamp+'.pkg',{headers:{Range:'bytes=0-63'}});
  assert.equal(resource.status,206);assert.equal((await resource.arrayBuffer()).byteLength,64);
  const verifiedOriginals=[];
  const pinManifest=profileName==='current-e7'?'episode07-originals.json':
    profileName==='current-e6-materials18'?'character-materials18-originals.json':null;
  if(pinManifest) {
    const pins=JSON.parse(readFileSync(path.join(root,'resources/manifests',pinManifest),'utf8'));
    for(const pin of pins) {
      const row=columns.find(row=>row[0]===pin.name.slice(0,-4));assert.ok(row,'Missing E7 manifest row');
      const file=[profile.env.BLUSTONE_PACKAGE_DIR,profile.env.BLUSTONE_RESOURCE_ASSET_DIR]
        .map(dir=>path.resolve(root,dir,pin.name)).find(file=>existsSync(file));assert.ok(file);
      const url=base+'/'+row[0]+'_'+stamp+'.pkg';
      const reply=await fetch(url);assert.equal(reply.status,200);
      const bytes=Buffer.from(await reply.arrayBuffer());
      assert.equal(Number(reply.headers.get('content-length')),bytes.length);
      verifiedOriginals.push(verifySingleJet(bytes,row,pin,readFileSync(file)));
      for(const [start,end,range] of [[0,63,'bytes=0-63'],[bytes.length-64,bytes.length-1,`bytes=${bytes.length-64}-`]]) {
        const ranged=await fetch(url,{headers:{Range:range}});
        assert.equal(ranged.status,206);
        assert.equal(ranged.headers.get('content-range'),`bytes ${start}-${end}/${bytes.length}`);
        assert.equal(ranged.headers.get('accept-ranges'),'bytes');
        assert.equal(Number(ranged.headers.get('content-length')),64);
        assert.deepEqual(Buffer.from(await ranged.arrayBuffer()),bytes.subarray(start,end+1));
      }
    }
    assert.equal(verifiedOriginals.length,profileName==='current-e7'?17:11);
  }
  const portrait=await fetch(base+'/local-profile/replica-100.png');assert.equal(portrait.status,200);assert.match(portrait.headers.get('content-type'),/image\/png/);
  await stop(); await launch();
  // Reuse persisted transport key and bound credentials, proving process restart continuity.
  const afterLobby=await secure('/lobby/Enter',auth);assert.ok(afterLobby.ret_data);
  assert.equal(await (await fetch(base+'/reslist_'+stamp+'.list')).text(),manifest,'Manifest must remain byte-identical after compiled restart');
  const after=JSON.parse(readFileSync(stateFile,'utf8'));
  for(const entry of before.gameStates) {
    const found=after.gameStates.find(row=>JSON.stringify(row[0])===JSON.stringify(entry[0]));
    assert.deepEqual(found,entry,'Existing account gameplay state changed');
  }
  const report={compiled_process:true,unrelated_working_directory:true,encrypted_ecdh_hmac_aes:true,
    direct_compiled_process:true,launcher_process_verified:false,
    profile:profileName,resource_stamp:stamp,exact_manifest_selection:true,manifest_restart_exact:true,
    added_original_jet_groups:verifiedOriginals,live_profile_activation:false,
    ordinary_reference_count:ordinaryReferences.length,authenticated_mirage_friend_floors:true,
    authenticated_lobby_and_references:true,unique_campaign_area_ownership:true,hidden_origin_rewards_absent:true,
    episode_log:true,resource_packages:rows.length,resource_range_206:true,
    compiled_portrait:true,persisted_transport_and_credentials:true,preserved_existing_games:before.gameStates.length,
    apk_install_or_device_actions:false};
  writeFileSync(path.join(outputFolder,'standalone-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} finally { await stop(); }
