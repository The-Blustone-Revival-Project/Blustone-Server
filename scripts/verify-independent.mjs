// External-process compiled-server check. Uses a disposable copy of preserved state.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const folder = path.join(root, 'local/verification'); mkdirSync(folder, {recursive:true});
const stateFile = path.join(folder, 'state.json');
const port = 18081, base = `http://127.0.0.1:${port}`;
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
  child = spawn(process.execPath, [path.join(root, 'scripts/start-local.mjs'), '--port', String(port), '--host', '127.0.0.1', '--base-url', base, '--state-file', stateFile],
    {cwd: folder, env: {...process.env}, stdio:['ignore','pipe','pipe']});
  let logs=''; child.stdout.on('data', b=>{logs+=b;}); child.stderr.on('data', b=>{logs+=b;});
  child.once('error', error => { logs+=error.message; });
  for(let i=0;i<100;i++) {
    if(child.exitCode!==null) throw new Error('Compiled server exited: '+logs.slice(-1500));
    try { if((await fetch(base+'/healthz')).ok) return; } catch {}
    await delay(100);
  }
  throw new Error('Compiled server startup timed out: '+logs.slice(-1500));
};
const stop = async () => { if(child && child.exitCode===null) { const exited=once(child,'exit'); child.kill(); await exited; } };
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
  if(!response.headers.get('content-type')?.startsWith('application/octet-stream')) return JSON.parse(bytes);
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
  const manifest=await (await fetch(base+'/reslist_1634683.list')).text();
  const rows=manifest.trim().split(/\r?\n/).slice(3);assert.equal(rows.length,139);
  assert.ok(rows.every(row=>row.split(',')[1]==='1634683'));
  const first=rows[0].split(',')[0];const resource=await fetch(base+'/'+first+'_1634683.pkg',{headers:{Range:'bytes=0-63'}});
  assert.equal(resource.status,206);assert.equal((await resource.arrayBuffer()).byteLength,64);
  const portrait=await fetch(base+'/local-profile/replica-100.png');assert.equal(portrait.status,200);assert.match(portrait.headers.get('content-type'),/image\/png/);
  await stop(); await launch();
  // Reuse persisted transport key and bound credentials, proving process restart continuity.
  const afterLobby=await secure('/lobby/Enter',auth);assert.ok(afterLobby.ret_data);
  const after=JSON.parse(readFileSync(stateFile,'utf8'));
  for(const entry of before.gameStates) {
    const found=after.gameStates.find(row=>JSON.stringify(row[0])===JSON.stringify(entry[0]));
    assert.deepEqual(found,entry,'Existing account gameplay state changed');
  }
  const report={compiled_process:true,unrelated_working_directory:true,encrypted_ecdh_hmac_aes:true,
    authenticated_lobby_and_references:true,episode_log:true,resource_packages:rows.length,resource_range_206:true,
    compiled_portrait:true,persisted_transport_and_credentials:true,preserved_existing_games:before.gameStates.length,
    apk_install_or_device_actions:false};
  writeFileSync(path.join(folder,'standalone-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} finally { await stop(); }
