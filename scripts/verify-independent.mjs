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
const exerciseBulk=process.argv.includes('--exercise-bulk');
const exerciseSale=process.argv.includes('--exercise-sale');
const exerciseEquipmentUpgrade=process.argv.includes('--exercise-equipment-upgrade');
const exerciseGemReplacement=process.argv.includes('--exercise-gem-replacement');
const exerciseGemSale=process.argv.includes('--exercise-gem-sale');
const exerciseGuildRecords=process.argv.includes('--exercise-guild-records');
const exerciseGuildFound=process.argv.includes('--exercise-guild-local-found');
const exerciseGemLevelReference=process.argv.includes('--exercise-gem-level-reference');
const exerciseGemMount=process.argv.includes('--exercise-gem-mount')||exerciseGemReplacement;
const exerciseGemInventory=process.argv.includes('--exercise-gem-inventory')||exerciseGemMount||exerciseGemSale;
if(exerciseGemSale&&exerciseGemMount) throw new Error('Gem sale and mount fixtures are distinct verification runs');
const authoredGemReference={id:'AUTHORED_GEM',name:'Authored HP Gem',desc:'Local parser fixture',res_id:'G_1_001_R1',set_effect_id:1,rank:1,target:1};
const authoredGemStat={rank:1,awk_step:0,hp:'10000',atk:'0',def:'0',spd:'0',crt_chance:'0',crt_dmg:'0',penetration:'0',
  block_chance:'0',block_dec_dmg:'0',attr_enhance:'0',attr_resist:'0',hp_regen:'0',hp_up:'0',atk_up:'0',def_up:'0'};
const authoredGem={ref_id:'AUTHORED_GEM',inst_id:'9007199254740993',rank:1,level:1,position:0,target_inst_id:'0',ability:'opaque',
  abilities:{level_up_failed:0,main:authoredGemStat,sub:[{...authoredGemStat,hp:'0',atk:'1000'}]}};
const authoredGemInventory=exerciseGemSale?[authoredGem,{...authoredGem,inst_id:'18446744073709551615'},{...authoredGem,inst_id:'3'}]:[authoredGem];
const exerciseEquipment=process.argv.includes('--exercise-equipment')||exerciseEquipmentUpgrade;
const fixtureEquipmentMaterial=exerciseEquipmentUpgrade?
  (await import(pathToFileURL(path.join(root,'dist/src/search-capsules.js')).href)).SEARCH_CAPSULE_ID:'';
if(exerciseEquipmentUpgrade&&(exerciseBulk||exerciseSale)) throw new Error('Use separate disposable fixtures for equipment and roster transactions');
const authoredEquipment={id:'AUTHORED_WEAPON',type:1,rank:1,awk_step:0,hp:'0',atk:'10000',def:'0',spd:'0',
  crt_chance:'0',crt_dmg:'0',penetration:'0',block_chance:'0',block_dec_dmg:'0',attr_enhance:'0',attr_resist:'0',
  hp_regen:'0',hp_up:'0',atk_up:'2000',def_up:'0'};
const authoredEquipmentLevelPrice={level:exerciseEquipmentUpgrade?10:2,price_type:2,price:17,item1_qty:exerciseEquipmentUpgrade?1:0,item1_ref_id:fixtureEquipmentMaterial,item2_qty:0,item2_ref_id:'',
  item3_qty:0,item3_ref_id:'',item4_qty:0,item4_ref_id:''};
const authoredEquipmentRankPrice={rank:exerciseEquipmentUpgrade?2:1,attr:1,price_type:2,price:23,item_qty:exerciseEquipmentUpgrade?1:0,item_ref_id:fixtureEquipmentMaterial,card_qty:0};
const authoredEquipmentPrices=exerciseEquipmentUpgrade?[authoredEquipmentLevelPrice,{...authoredEquipmentLevelPrice,level:11,price:29}]:[authoredEquipmentLevelPrice];
if(exerciseSale && exerciseBulk) throw new Error('Use separate disposable fixture runs for sale and bulk promotion');
const exerciseSocial=process.argv.includes('--exercise-social');
const monsterIndex=process.argv.indexOf('--exercise-monster');
const exerciseMonster=monsterIndex===-1?undefined:process.argv[monsterIndex+1];
if(monsterIndex!==-1 && (!process.argv.includes('--fixture') || typeof exerciseMonster!=='string' || !/^M[0-9]{3}$/.test(exerciseMonster)))
  throw new Error('Monster resource exercises require --fixture and one exact original namespace');
if((exerciseBulk || exerciseSocial || exerciseSale || exerciseEquipment || exerciseGemInventory || exerciseGuildRecords || exerciseGuildFound || exerciseGemLevelReference) && !process.argv.includes('--fixture')) throw new Error('Configured exercises require --fixture; private preserved saves are never mutation targets');
if(exerciseGuildFound&&(exerciseGuildRecords||exerciseBulk||exerciseSocial||exerciseSale||exerciseEquipment||exerciseGemInventory)) throw new Error('Local Guild creation requires a separate disposable verification run');
const profileIndex=process.argv.indexOf('--profile');
const profileName=profileIndex===-1?'current-e6':process.argv[profileIndex+1];
if(typeof profileName!=='string' || !/^[\w-]+$/.test(profileName)) throw new Error('Invalid verification profile');
const profile=JSON.parse(readFileSync(path.join(root,'config/profiles',profileName+'.json'),'utf8'));
if(exerciseGemInventory && profileName!=='current-e6-gems') throw new Error('Gem reference fixture requires the prepared original Gem owner profile');
if(exerciseGuildRecords && profileName!=='current-e6-guild') throw new Error('Guild lobby fixture requires prepared original Guild owner profile');
if(exerciseGuildFound && profileName!=='current-e6-guild') throw new Error('Local Guild creation fixture requires original Guild profile');
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
let bulkPvid, salePvid, equipmentPvid, gemPvid,founderPvid;
const preserved = process.argv.includes('--fixture') ? '' : path.join(root, 'local/private/preserved-state.json');
if (existsSync(preserved)) copyFileSync(preserved, stateFile);
else {
  // Public/CI checkouts use one disposable generated fixture, never a private account dump.
  rmSync(stateFile, {force:true});
  const { ServerState } = await import(pathToFileURL(path.join(root, 'dist/src/state.js')).href);
  const fixture = new ServerState(base, stateFile,{guildCreationMode:'disabled'});
  fixture.registerGuest({device_id:'standalone-generated-fixture'}, {});
  if(exerciseBulk || exerciseSale || exerciseEquipmentUpgrade) {
    const auth=fixture.registerGuest({device_id:'standalone-migration-verification'},{}).ret_data;
    const account=fixture.accountFor(auth,{}),game=fixture.gameFor(account);
    if(exerciseEquipmentUpgrade) equipmentPvid=account.pvid;
    else if(exerciseSale) salePvid=account.pvid;
    else bulkPvid=account.pvid;
    // Deliberately disposable test sources, not recruitment or recovered rewards.
    // This branch is unreachable for preserved/private-state verification.
    game.recruited_cards=Array.from({length:exerciseSale?2:4},(_,i)=>({...game.starter_cards[0],
      inst_id:1000200+i,rank:exerciseSale && i===0?5:1,rank_up_cnt:0,exp:0,lock:0,awk_step:0,awk_overcome:0,overcome_cnt:0}));
    game.next_card_inst_id=1000300;game.gold=5000;
    if(exerciseSale) game.card_book=game.card_book.map(row=>row.ref_id===game.recruited_cards[0].ref_id
      ? {...row,rank:Math.max(row.rank,5)}:row);
    if(exerciseEquipmentUpgrade) {
      game.recruited_cards=[];game.gold=100;
      game.starter_cards.find(card=>card.ref_id==='001').weapon_rank=1;
      game.starter_cards.find(card=>card.ref_id==='001').weapon_level=9;
      game.items=[{inst_id:1,ref_id:fixtureEquipmentMaterial,qty:3,lock:0}];game.next_item_inst_id=2;
    }
    const seeded=JSON.parse(readFileSync(stateFile,'utf8'));
    seeded.gameStates=seeded.gameStates.map(([pvid,saved])=>[pvid,pvid===account.pvid?game:saved]);
    writeFileSync(stateFile,JSON.stringify(seeded),{mode:0o600});
  }
  if(exerciseGemInventory) {
    const auth=fixture.registerGuest({device_id:'standalone-migration-verification'},{}).ret_data;
    const account=fixture.accountFor(auth,{}),game=fixture.gameFor(account);gemPvid=account.pvid;
    game.gem=12;game.owned_gems=authoredGemInventory;
    const seeded=JSON.parse(readFileSync(stateFile,'utf8'));
    seeded.gameStates=seeded.gameStates.map(([pvid,saved])=>[pvid,pvid===account.pvid?game:saved]);
    writeFileSync(stateFile,JSON.stringify(seeded),{mode:0o600});
  }
  if(exerciseGuildRecords) {
    const member=fixture.registerGuest({device_id:'standalone-established-guild-member'},{}).ret_data;
    const joined=fixture.registerGuest({device_id:'standalone-migration-verification'},{}).ret_data;
    const seeded=JSON.parse(readFileSync(stateFile,'utf8'));
    seeded.guilds=[{id:7001,name:'Authored Established Guild',type:1,fc_point_limit:0,contribution:10,region:'',emblem_id:'GD_IMG_1',
      desc:'Disposable fixture',rank:1,gvg_win_cnt:0,gvg_inf_win_cnt:0,member_cnt:2,members:[
        {pvid:joined.pvid,contribution:3,newbie:0,role:1,fc_point:30},
        {pvid:member.pvid,contribution:7,newbie:1,role:4,fc_point:10}]}];
    writeFileSync(stateFile,JSON.stringify(seeded),{mode:0o600});
  }
  if(exerciseGuildFound) {
    const founder=fixture.registerGuest({device_id:'standalone-migration-verification'},{}).ret_data;
    const game=fixture.gameFor(fixture.accountFor(founder,{}));founderPvid=founder.pvid;game.gold=100;
    const seeded=JSON.parse(readFileSync(stateFile,'utf8'));
    seeded.gameStates=seeded.gameStates.map(([pvid,saved])=>[pvid,pvid===founderPvid?game:saved]);
    writeFileSync(stateFile,JSON.stringify(seeded),{mode:0o600});
  }
}
const before = JSON.parse(readFileSync(stateFile, 'utf8'));
let child;
const launch = async () => {
  const env={...process.env,...profile.env};
  env.BLUSTONE_GUILD_CREATION_MODE=exerciseGuildFound?'local-gold':'disabled';
  if(exerciseGuildFound) env.BLUSTONE_GUILD_ACTION_PRICES_JSON=JSON.stringify([{action:1,price_type:2,price:17}]);
  if(exerciseGemInventory) env.BLUSTONE_GEM_REFERENCE_JSON=JSON.stringify([authoredGemReference]);
  if(exerciseGemSale) env.BLUSTONE_GEM_SELL_PRICES_JSON=JSON.stringify([{rank:1,level:1,price_type:2,price:13}]);
  if(exerciseGemLevelReference) env.BLUSTONE_GEM_LEVEL_PRICES_JSON=JSON.stringify([{level:2,price_type:2,price:17,possibility:12.5,failed_compensation:.375,add_sub_ability:1}]);
  if(exerciseGuildRecords) env.BLUSTONE_GUILD_ACTION_PRICES_JSON=JSON.stringify([{action:1,price_type:2,price:17},{action:2,price_type:1,price:23},{action:3,price_type:1,price:31}]);
  if(exerciseGemReplacement) {
    env.BLUSTONE_GEM_DISASSEMBLE_PRICES_JSON=JSON.stringify([{level:authoredGem.level,price_type:2,price:13}]);
    env.BLUSTONE_GEM_COMBINATIONS_JSON=JSON.stringify([{id:1,count:2,rank:0,awk_step:0,
      ...Object.fromEntries(['hp','atk','def','spd','crt_chance','crt_dmg','penetration','block_chance','block_dec_dmg','attr_enhance','attr_resist','hp_regen','hp_up','atk_up','def_up'].map(key=>[key,'0'])),hp:'6.00'}]);
  }
  if(exerciseSale) env.BLUSTONE_CARD_SELL_PROFIT_JSON=JSON.stringify([{rank:1,profit_type:2,profit_target:'',profit_qty:13}]);
  if(exerciseEquipment) env.BLUSTONE_EQUIPMENT_REFERENCE_JSON=JSON.stringify({'001':exerciseEquipmentUpgrade?
    [authoredEquipment,{...authoredEquipment,id:'AUTHORED_WEAPON2',rank:2,atk:'40000'}]:[authoredEquipment]});
  if(exerciseEquipment) {
    env.BLUSTONE_EQUIPMENT_LEVEL_PRICES_JSON=JSON.stringify(authoredEquipmentPrices);
    env.BLUSTONE_EQUIPMENT_RANK_PRICES_JSON=JSON.stringify([authoredEquipmentRankPrice]);
  }
  if(exerciseMonster) env.BLUSTONE_MONSTER_IDS=exerciseMonster;
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
let friendPeer,friendId,ownerConnection,peerConnection;
async function exchange() {
  const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
  const response=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
  assert.equal(response.status,200);const publicBytes=Buffer.from(await response.arrayBuffer());
  secret=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:publicBytes,format:'der',type:'spki'})})).digest();
  assert.equal(response.headers.get('pv-signature'),crypto.createHmac('sha384',secret).update(publicBytes).digest('base64'));
  token=response.headers.get('pv-accesstoken');assert.ok(token);
}
async function secure(route,values,{allowPlainRefusal=false}={}) {
  const plain=Buffer.from(String(new URLSearchParams(values)));const cipher=crypto.createCipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));
  const response=await fetch(base+route,{method:'POST',headers:{'content-type':'application/octet-stream','pv-accesstoken':token,
    'pv-signature':crypto.createHmac('sha384',secret).update(plain).digest('base64')},body:Buffer.concat([cipher.update(plain),cipher.final()])});
  assert.equal(response.status,200,route);
  const bytes=Buffer.from(await response.arrayBuffer());
  // Native failure envelopes deliberately remain plaintext (sendResponse).
  // Opt in only for explicit negative probes; a plaintext success is never OK.
  if(allowPlainRefusal && response.headers.get('content-type')?.startsWith('application/json')) {
    const refused=JSON.parse(bytes);
    assert.ok(Number.isInteger(refused.result_code) && refused.result_code!==1,'Plain response must be an explicit refusal');
    return refused;
  }
  assert.ok(response.headers.get('content-type')?.startsWith('application/octet-stream'),route+' must return encrypted bytes');
  const decipher=crypto.createDecipheriv('aes-256-cbc',secret.subarray(0,32),secret.subarray(32,48));const decoded=Buffer.concat([decipher.update(bytes),decipher.final()]);
  assert.equal(response.headers.get('pv-signature'),crypto.createHmac('sha384',secret).update(decoded).digest('base64'));
  const text=decoded.toString('utf8');
  if(exerciseGemInventory && ['/lobby/GetGemInven','/card_handler/EquipGem'].includes(route) && !allowPlainRefusal &&
    !(exerciseGemSale && route==='/lobby/GetGemInven' && JSON.parse(text).ret_data?.length===0))
    assert.ok(text.includes('"inst_id":9007199254740993'),'Large Gem identity must be an exact integer JSON token, never a strtod string');
  const {parseStateWithGemIds}=await import(pathToFileURL(path.join(root,'dist/src/gem-wire.js')).href);
  return parseStateWithGemIds(text);
}
try {
  await launch(); await exchange();
  const guest=await secure('/v2/account/RegisterGuest',{device_id:'standalone-migration-verification'});
  const auth={otp:String(guest.ret_data.otp),pvid:String(guest.pvid)};
  const lobby=await secure('/lobby/Enter',auth);assert.ok(lobby.ret_data);
  if(exerciseGemInventory) {
    assert.equal(Number(auth.pvid),gemPvid);
    assert.deepEqual((await secure('/reference/GetGem',auth)).ret_data,[authoredGemReference]);
    assert.deepEqual((await secure('/lobby/GetGemInven',auth)).ret_data,authoredGemInventory);
    const beforeMount=readFileSync(stateFile);
    assert.equal((await secure('/card_handler/EquipGem',{...auth,target_inst_id:'1000001',price_type:'2',combination:'{}'},
      {allowPlainRefusal:true})).result_code,2001,'Inventory read support must not fake an unproved mount');
    assert.deepEqual(readFileSync(stateFile),beforeMount);
    if(exerciseGemSale) {
      const current=JSON.parse(readFileSync(stateFile,'utf8')).gameStates.find(([pvid])=>pvid===gemPvid)[1];
      assert.deepEqual((await secure('/reference/GetGemSellPrice',auth)).ret_data,[{rank:1,level:1,price_type:2,price:13}]);
      const singleton={...auth,inst_id:authoredGem.inst_id};
      assert.deepEqual((await secure('/gem/Sell',singleton)).ret_data,{user:{gold:{cur:current.gold+13},item:[]}});
      const batch={...auth,inst_id_list:'[18446744073709551615,3]'};
      assert.deepEqual((await secure('/gem/Sell',batch)).ret_data,{user:{gold:{cur:current.gold+39},item:[]}});
      const soldBytes=readFileSync(stateFile);
      assert.equal((await secure('/gem/Sell',batch,{allowPlainRefusal:true})).result_code,2001,'Already sold request never duplicates credit');
      assert.deepEqual(readFileSync(stateFile),soldBytes);
      assert.deepEqual((await secure('/lobby/GetGemInven',auth)).ret_data,[]);
    }
    if(exerciseGemMount) {
      const current=JSON.parse(readFileSync(stateFile,'utf8')).gameStates.find(([pvid])=>pvid===gemPvid)[1];
      const target=current.starter_cards.find(card=>card.ref_id==='001');
      const request={...auth,target_inst_id:String(target.inst_id),price_type:'2',
        combination:'{"weapons":[9007199254740993,0],"armors":[0,0],"accessories":[0,0]}'};
      const reply=await secure('/card_handler/EquipGem',request);assert.equal(reply.result_code,1);
      assert.deepEqual(reply.ret_data.gems,[{...authoredGem,target_inst_id:String(target.inst_id),position:1}]);
      assert.deepEqual(reply.ret_data.user,{gold:{cur:current.gold},gdp:{cur:0},iap_qty:current.gacha_iap_qty,free_iap_qty:current.gacha_free_qty,item:[]});
      const mounted=readFileSync(stateFile);
      assert.deepEqual((await secure('/card_handler/EquipGem',request)).ret_data.gems,reply.ret_data.gems,'No-write desired-grid retry must echo authoritative rows');
      assert.deepEqual(readFileSync(stateFile),mounted);
      const removed=await secure('/card_handler/EquipGem',{...request,combination:'{"weapons":[0,0],"armors":[0,0],"accessories":[0,0]}'},{allowPlainRefusal:true});
      if(exerciseGemReplacement) {
        assert.equal(removed.result_code,1);assert.equal(removed.ret_data.user.gold.cur,current.gold-13);
        assert.deepEqual(removed.ret_data.gems,[authoredGem],'Removed Gem must retain full rolls and lossless wire identity');
        const removedBytes=readFileSync(stateFile);
        const emptyRequest={...request,combination:'{"weapons":[0,0],"armors":[0,0],"accessories":[0,0]}'};
        assert.deepEqual((await secure('/card_handler/EquipGem',emptyRequest)).ret_data,removed.ret_data,'Lost removal response retry repairs native ownership');
        assert.deepEqual(readFileSync(stateFile),removedBytes,'Removal replay must not debit or persist');
        const quoted=(await secure('/reference/GetGemDisassemblePrice',auth)).ret_data;
        assert.deepEqual(quoted,[{level:authoredGem.level,price_type:2,price:13}]);
        const setRows=(await secure('/reference/GetGemCombinationEffect',auth)).ret_data;
        assert.equal(setRows[0].hp,'6.00','Wire percentage must remain unscaled');
        assert.equal((await secure('/card_handler/EquipGem',request)).ret_data.user.gold.cur,current.gold-13,'Fresh mount into empty slot remains free');
      } else {
        assert.equal(removed.result_code,2001,'Missing removal fees never mean free unmount');
        assert.deepEqual(readFileSync(stateFile),mounted);
      }
    }
  }
  if(exerciseSocial) {
    ownerConnection={secret,token};
    await exchange();
    const registered=await secure('/v2/account/RegisterGuest',{device_id:'standalone-friend-verification'});
    friendPeer={otp:String(registered.ret_data.otp),pvid:String(registered.pvid)};
    peerConnection={secret,token};
    assert.equal((await secure('/relation/GetFriendReceivedCount',friendPeer)).ret_data,0);
    ({secret,token}=ownerConnection);
    const suggested=(await secure('/relation/GetSuggestedFriendList',{...auth,start:'0',length:'10'})).ret_data;
    assert.equal(suggested.start,0);assert.equal(suggested.length,suggested.list.length);
    assert.ok(suggested.list.some(row=>row.target_pvid===Number(friendPeer.pvid) && row.type==='candidate' && row.friend_id===0));
    const brief=(await secure('/relation/GetTargetUserInfo',{...auth,list:JSON.stringify([Number(friendPeer.pvid)])})).ret_data.list[0];
    assert.equal(brief.pvid,Number(friendPeer.pvid));assert.ok(brief.nick_name);
    assert.ok(!('otp' in brief) && !('device_id' in brief) && !('ref_id_leader' in brief),'Candidate brief must not expose credentials or a synthetic party');
    const searched=(await secure('/relation/FriendSearch',{...auth,target_nick_name:brief.nick_name,start:'0',end:'10'})).ret_data;
    assert.equal(searched.start,0);assert.equal(searched.length,searched.list.length);
    assert.ok(searched.list.some(row=>row.target_pvid===Number(friendPeer.pvid)));
    const requested=await secure('/relation/FriendRequest',{...auth,target_pvid:friendPeer.pvid});
    assert.equal(requested.result_code,1);friendId=requested.ret_data.friend_id;
    assert.ok(Number.isSafeInteger(friendId) && friendId>0);
    assert.equal(requested.ret_data.target_pvid,Number(friendPeer.pvid));
    ({secret,token}=peerConnection);
    assert.equal((await secure('/relation/GetFriendReceivedCount',friendPeer)).ret_data,1);
    const accepted=await secure('/relation/FriendReqAccept',{...friendPeer,target_friend_id:String(friendId)});
    assert.deepEqual(accepted.ret_data,{friend_id:friendId});
    assert.equal((await secure('/relation/GetFriendReceivedCount',friendPeer)).ret_data,0);
    const received=(await secure('/relation/GetList',{...friendPeer,type:'1'})).ret_data;
    assert.equal(received.list.length,1);assert.equal(received.list[0].target_pvid,Number(auth.pvid));
    assert.equal(received.list[0].type,'friend');
    ({secret,token}=ownerConnection);
    const sent=(await secure('/relation/GetList',{...auth,type:'1'})).ret_data;
    assert.equal(sent.list.length,1);assert.equal(sent.list[0].friend_id,friendId);
    assert.equal(sent.list[0].target_pvid,Number(friendPeer.pvid));
    assert.deepEqual((await secure('/relation/GetLikeCnt',{...auth,target_pvid:friendPeer.pvid})).ret_data,
      {target_pvid:Number(friendPeer.pvid),cnt:0});
    for(const state of [1,0,1])
      assert.deepEqual((await secure('/relation/ToggleLike',{...auth,target_pvid:friendPeer.pvid})).ret_data,
        {target_pvid:Number(friendPeer.pvid),is_like:state},'Repeated native request is a new toggle');
    const likedPeer=(await secure('/relation/GetList',{...auth,type:'1'})).ret_data.list.find(row=>row.target_pvid===Number(friendPeer.pvid));
    assert.equal(likedPeer.like_cnt,1);assert.equal(likedPeer.is_like,1);
    ({secret,token}=peerConnection);
    assert.deepEqual((await secure('/relation/GetLikeCnt',{...friendPeer,target_pvid:friendPeer.pvid})).ret_data,
      {target_pvid:Number(friendPeer.pvid),cnt:1});
    const ownLikeView=(await secure('/relation/GetTargetUserInfo',{...friendPeer,list:JSON.stringify([Number(friendPeer.pvid)])})).ret_data.list[0];
    assert.equal(ownLikeView.like_cnt,1);assert.equal(ownLikeView.is_like,0);
    ({secret,token}=ownerConnection);
    assert.ok(!(await secure('/relation/GetSuggestedFriendList',{...auth,start:'0',length:'10'})).ret_data.list.some(row=>row.target_pvid===Number(friendPeer.pvid)),
      'Accepted peer must leave discovery candidates');
    const oldId=friendId;
    assert.deepEqual((await secure('/relation/Unfriend',{...auth,target_friend_id_list:JSON.stringify([oldId])})).ret_data,{friend_id_list:[oldId]});
    friendId=(await secure('/relation/FriendRequest',{...auth,target_pvid:friendPeer.pvid})).ret_data.friend_id;
    assert.ok(friendId>oldId,'Deleted relation identity must never be reused');
    assert.deepEqual((await secure('/relation/Unfriend',{...auth,target_friend_id_list:JSON.stringify([oldId])})).ret_data,{friend_id_list:[oldId]});
    ({secret,token}=peerConnection);
    assert.equal((await secure('/relation/GetFriendReceivedCount',friendPeer)).ret_data,1,'Stale unfriend must not remove fresh request');
    assert.notEqual((await secure('/relation/FriendReqCancel',{...friendPeer,target_friend_id_list:JSON.stringify([friendId])},{allowPlainRefusal:true})).result_code,1,'Recipient cannot cancel sender request');
    assert.deepEqual((await secure('/relation/FriendReqReject',{...friendPeer,target_friend_id_list:JSON.stringify([friendId])})).ret_data,{friend_id_list:[friendId]});
    ({secret,token}=ownerConnection);
    friendId=(await secure('/relation/FriendRequest',{...auth,target_pvid:friendPeer.pvid})).ret_data.friend_id;
    assert.deepEqual((await secure('/relation/FriendReqCancel',{...auth,target_friend_id_list:JSON.stringify([friendId])})).ret_data,{friend_id_list:[friendId]});
    friendId=(await secure('/relation/FriendRequest',{...auth,target_pvid:friendPeer.pvid})).ret_data.friend_id;
    ({secret,token}=peerConnection);
    assert.deepEqual((await secure('/relation/FriendReqAccept',{...friendPeer,target_friend_id:String(friendId)})).ret_data,{friend_id:friendId});
    ({secret,token}=ownerConnection);
  }
  if(exerciseBulk) {
    assert.equal(Number(auth.pvid),bulkPvid,'Only disposable seeded account may be exercised');
    const request={...auth,src_rank:'1',src_cnt:'4',target_rank:'2',target_cnt:'1',price:'1200'};
    const beforeBulk=JSON.parse(readFileSync(stateFile,'utf8')).gameStates.find(([pvid])=>pvid===bulkPvid)[1];
    const refused=await secure('/gym/RankUpBundle',{...request,price:'0'},{allowPlainRefusal:true});
    assert.notEqual(refused.result_code,1,'Forged quote must refuse before consumption');
    assert.deepEqual(JSON.parse(readFileSync(stateFile,'utf8')).gameStates.find(([pvid])=>pvid===bulkPvid)[1],beforeBulk);
    const upgraded=await secure('/gym/RankUpBundle',request);assert.equal(upgraded.result_code,1);
    assert.deepEqual(upgraded.ret_data.card.removed_inst_id_list,[1000201,1000202,1000203]);
    assert.deepEqual(upgraded.ret_data.card.target_list,[{inst_id:1000200,rank:{cur:2},rank_up_cnt:{cur:0},exp:{cur:0}}]);
    assert.deepEqual(upgraded.ret_data.user.gold,{cur:3800});
    assert.notEqual((await secure('/gym/RankUpBundle',request,{allowPlainRefusal:true})).result_code,1,'Insufficient remaining sources must refuse');
  }
  if(exerciseSale) {
    assert.equal(Number(auth.pvid),salePvid,'Only disposable seeded sale account may be exercised');
    assert.deepEqual((await secure('/reference/GetExtra',auth)).ret_data.card_sell_profit,
      [{rank:1,profit_type:2,profit_target:'',profit_qty:13}],'Published quote must match explicit authored sale policy');
    const current=()=>JSON.parse(readFileSync(stateFile,'utf8')).gameStates.find(([pvid])=>pvid===salePvid)[1];
    const prior=current();
    assert.notEqual((await secure('/shop/SellCard',{...auth,inst_id_list:JSON.stringify([prior.starter_cards[0].inst_id])},
      {allowPlainRefusal:true})).result_code,1,'Protected main hunter must refuse');
    assert.deepEqual(current(),prior);
    const request={...auth,inst_id_list:JSON.stringify([1000200,1000201])};
    const sold=await secure('/shop/SellCard',request);assert.equal(sold.result_code,1);
    assert.deepEqual(sold.ret_data,{user:{gold:{cur:5026}},item:[]},'Sale uses reference minimum rank, despite one rank5 instance');
    assert.equal(current().recruited_cards.length,0);
    const settled=current();
    assert.notEqual((await secure('/shop/SellCard',request,{allowPlainRefusal:true})).result_code,1,'Replayed sold sources cannot credit again');
    assert.deepEqual(current(),settled);
  }
  for(const route of ['/reference/GetStage','/reference/GetCard','/lobby/GetCardInven','/episode/GetLog']) {
    const reply=await secure(route,auth);assert.ok(reply.ret_data!==undefined,route);
  }
  const friendFloors=await secure('/mirage/GetFriendInfo',auth);
  assert.equal(friendFloors.result_code,1);assert.deepEqual(friendFloors.ret_data,[]);
  assert.deepEqual((await secure('/lobby/GetGuildInfo',auth)).ret_data,
    exerciseGuildRecords?{my_guild:{guild_id:7001,status:3,newbie:0,role:1,contribution:3}}:
      {my_guild:{guild_id:0,status:0,newbie:0,role:0,contribution:0}},'Guild boot membership is flat PLAY_DATA');
  if(exerciseGuildRecords) {
    const member=before.accounts.find(account=>account.deviceId==='standalone-established-guild-member');
    const detailBytes=readFileSync(stateFile);
    assert.deepEqual((await secure('/guild/GetDetailInfo',{...auth,guild_id:'[7001,4294967297]'})).ret_data,{guilds:before.guilds},'Full established INFO must retain all native members and ignore unsupported unknown widths');
    assert.deepEqual((await secure('/guild/GetDetailInfo',{...auth,guild_id:'[]'})).ret_data,{guilds:[]});
    assert.deepEqual((await secure('/guild/Search',{...auth,keyword:'established'})).ret_data,{guilds:before.guilds},'Keyword search returns full known Guild rows');
    assert.deepEqual((await secure('/guild/Search',{...auth,keyword:'not present'})).ret_data,{guilds:[]});
    assert.deepEqual((await secure('/guild/GetRecommendations',auth)).ret_data,{guilds:before.guilds},'Recommendations use known corpus without invented eligibility');
    assert.deepEqual((await secure('/guild/GetRanking',{...auth,page:'0',size:'10'})).ret_data,before.guilds,'Ranking is native BARE array, not discovery wrapper');
    assert.deepEqual((await secure('/guild/GetRanking',{...auth,page:'2147483647',size:'2147483647'})).ret_data,[]);
    assert.deepEqual((await secure('/reference/GetGuildPrices',auth)).ret_data,
      [{action:1,price_type:2,price:17},{action:2,price_type:1,price:23},{action:3,price_type:1,price:31}]);
    const established=before.guilds[0];
    assert.deepEqual((await secure('/guild/GetUserGuilds',{...auth,target_pvid_list:JSON.stringify([Number(auth.pvid)])})).ret_data,
      {user_guilds:[{pvid:Number(auth.pvid),id:established.id,name:established.name,type:established.type,
        fc_point_limit:established.fc_point_limit,contribution:established.contribution,region:established.region,emblem_id:established.emblem_id}]});
    assert.equal((await secure('/guild/GetUserGuilds',{...auth,target_pvid_list:'[]'},{allowPlainRefusal:true})).result_code,2001);
    assert.equal((await secure('/guild/Update',auth,{allowPlainRefusal:true})).result_code,2001,'Supplied price does not enable unproved name/country settlement');
    assert.equal((await secure('/guild/GetDetailInfo',{...auth,guild_id:'[7001,7001]'},{allowPlainRefusal:true})).result_code,2001);
    assert.deepEqual(readFileSync(stateFile),detailBytes,'Detail reads do not mutate personal affiliation or gameplay');
    const leaderConnection={secret,token};await exchange();
    assert.deepEqual((await secure('/lobby/GetGuildInfo',{otp:member.otp,pvid:String(member.pvid)})).ret_data,
      {my_guild:{guild_id:7001,status:3,newbie:1,role:4,contribution:7}},'Personal contribution must not copy total Guild value');
    ({secret,token}=leaderConnection);
  }
  if(exerciseGemLevelReference) {
    const bytes=readFileSync(stateFile);
    assert.deepEqual((await secure('/reference/GetGemLevelUpPrice',auth)).ret_data,
      [{level:2,price_type:2,price:17,possibility:12.5,failed_compensation:.375,add_sub_ability:1}]);
    assert.equal((await secure('/gem/LevelUp',{...auth,inst_id:'1',max_tries:'7'},{allowPlainRefusal:true})).result_code,2001);
    assert.deepEqual(readFileSync(stateFile),bytes,'Price publication must not authorize unproved random upgrades');
  }
  assert.equal((await secure('/guild/Found',auth,{allowPlainRefusal:true})).result_code,2001,'Missing fees must not create a free Guild');
  if(exerciseGuildFound) {
    const request={...auth,name:'New Guild',desc:'Local fixture',type:'1',fc_point_limit:'500',region:'EN',emblem_id:'GD_IMG_1'};
    const created=await secure('/guild/Found',request);assert.equal(created.result_code,1);
    assert.deepEqual(created.ret_data.user,{gold:{prev:100,cur:83}},'Generic SyncUser requires both wallet fields');
    assert.deepEqual(created.ret_data.my_guild,{guild_id:1,status:3,newbie:0,role:1,contribution:0});
    assert.equal(created.ret_data.guilds[0].member_cnt,1);assert.equal(created.ret_data.guilds[0].rank,0);
    const createdBytes=readFileSync(stateFile);
    assert.equal((await secure('/guild/Found',request,{allowPlainRefusal:true})).result_code,2001,'Creation replay must not spend again');
    assert.deepEqual(readFileSync(stateFile),createdBytes);
    assert.deepEqual((await secure('/lobby/GetGuildInfo',auth)).ret_data,{my_guild:created.ret_data.my_guild});
    assert.equal((await secure('/guild/Search',{...auth,keyword:'new'})).ret_data.guilds[0].id,1);
    assert.deepEqual((await secure('/guild/GetRanking',{...auth,page:'0',size:'10'})).ret_data,[],'New local Guild gets no fabricated ranking');
  }
  assert.deepEqual((await secure('/reference/GetSkinRef',auth)).ret_data,{skin:[],bonus:[]});
  assert.deepEqual((await secure('/lobby/GetSkinInst',auth)).ret_data,{skin:[]});
  assert.equal((await secure('/skin/Buy',auth,{allowPlainRefusal:true})).result_code,2001,'Missing paid skin data must not grant mock ownership');
  for(const route of ['/dailyquest/GetRefList','/dailyquest/GetInstList'])
    assert.deepEqual((await secure(route,auth)).ret_data,[],'Absent quest data must use native collections');
  for(const route of ['/dailyquest/RequestReward','/linearquest/Reward'])
    assert.equal((await secure(route,{...auth,daily_quest_id:'TEST_ONLY_QUEST',id:'TEST_ONLY_QUEST',serial:'1',target_val:'5'},
      {allowPlainRefusal:true})).result_code,2001,'Missing quest data must not grant mock success');
  const ordinaryReferences=(await secure('/reference/GetCard',auth)).ret_data;
  if(exerciseEquipment) {
    assert.deepEqual(ordinaryReferences.find(card=>card.base.id==='001').equipment,exerciseEquipmentUpgrade?
      [authoredEquipment,{...authoredEquipment,id:'AUTHORED_WEAPON2',rank:2,atk:'40000'}]:[authoredEquipment]);
    assert.deepEqual((await secure('/reference/GetCardEquipmentLevelUpPrice',auth)).ret_data,authoredEquipmentPrices);
    assert.deepEqual((await secure('/reference/GetCardEquipmentRankUpPrice',auth)).ret_data,[authoredEquipmentRankPrice]);
    const beforeUpgradeRefusals=readFileSync(stateFile);
    for(const route of ['/card_handler/LevelUpEquipment','/card_handler/RankUpEquipment'])
      assert.equal((await secure(route,{...auth,inst_id:'1000001',part:'1',price_type:'0',source_inst_ids:'null'},
        {allowPlainRefusal:true})).result_code,2001,'Configured quote must not imply implemented settlement');
    assert.deepEqual(readFileSync(stateFile),beforeUpgradeRefusals,'Upgrade refusal must preserve complete account/save bytes');
    assert.ok(ordinaryReferences.filter(card=>card.base.id!=='001').every(card=>card.equipment.length===0),
      'Equipment reference input must not spread to other Hunters');
    const {parseHunterEquipment,calculateHunterEquipment}=await import(pathToFileURL(path.join(root,'dist/src/hunter-equipment.js')).href);
    const parsed=parseHunterEquipment([authoredEquipment]);
    assert.equal(calculateHunterEquipment(parsed,0,1,1).stats.atk,100);
    assert.equal(calculateHunterEquipment(parsed,0,1,10).stats.atk,280);
    if(exerciseEquipmentUpgrade) {
      assert.equal(Number(auth.pvid),equipmentPvid);
      const current=()=>JSON.parse(readFileSync(stateFile,'utf8')).gameStates.find(([pvid])=>pvid===equipmentPvid)[1];
      const target=current().starter_cards.find(card=>card.ref_id==='001');
      const request={...auth,inst_id:String(target.inst_id),part:'1',price_type:'2',source_inst_ids:'null'};
      for(const [route,rank,level,gold,quantity] of [['LevelUpEquipment',1,10,83,2],['RankUpEquipment',2,10,60,1],['LevelUpEquipment',2,11,31,0]]) {
        const reply=await secure('/card_handler/'+route,request);assert.equal(reply.result_code,1);
        assert.equal(reply.ret_data.user.gold.cur,gold);assert.deepEqual(reply.ret_data.user.item,[{inst_id:1,qty:quantity}]);
        assert.equal(Object.hasOwn(reply.ret_data,'item'),false,'Native equipment quantities belong inside user');
        const card=reply.ret_data.user.card[0];assert.equal(card.inst_id,target.inst_id);
        assert.equal(card.weapon_rank,rank);assert.equal(card.weapon_level,level);
        assert.equal(current().gold,gold);
      }
      const settled=readFileSync(stateFile);
      assert.notEqual((await secure('/card_handler/RankUpEquipment',request,{allowPlainRefusal:true})).result_code,1);
      assert.deepEqual(readFileSync(stateFile),settled,'Post-rank replay must refuse without another charge');
    }
  }
  let monsterReference;
  if(exerciseMonster) {
    monsterReference=(await secure('/reference/GetMonster',{...auth,list:JSON.stringify([exerciseMonster])})).ret_data;
    assert.deepEqual(Object.keys(monsterReference),[exerciseMonster]);
    assert.equal(monsterReference[exerciseMonster]._server,exerciseMonster);
    assert.equal(monsterReference[exerciseMonster].res_prefix,exerciseMonster,'Native draw prefix is the actor namespace, not its owner package');
    assert.equal(monsterReference[exerciseMonster].hp,'100','Resource widening must preserve neutral fixture balance');
    assert.equal(monsterReference[exerciseMonster].atk,'10');
    assert.equal(monsterReference[exerciseMonster].def,'5');
  }
  const materialsIds=profileName==='current-e6-materials18'
    ? ['009','010','012','013','014','017','030','036','040','048','049','054']
    : ['009','010','012','013','017','036','040','049'];
  const expectedReferenceCount=profile.env.BLUSTONE_CARD_REFERENCE_PROFILE==='materials'?6+materialsIds.length:6;
  assert.equal(ordinaryReferences.length,expectedReferenceCount,'Compiled ordinary reference profile');
  if(profile.env.BLUSTONE_CARD_REFERENCE_PROFILE==='materials') {
    assert.deepEqual(ordinaryReferences.slice(6).map(row=>row.base.id),materialsIds);
    assert.ok(ordinaryReferences.slice(6).every(row=>row.is_main===0 && row.skill.length===5));
    if(profile.env.BLUSTONE_MATERIAL_STAT_PROFILE==='archive-2019-projection') {
      const {materialArchiveObservations}=await import(pathToFileURL(path.join(root,'dist/src/material-stat-projection.js')).href);
      const observations=materialArchiveObservations();
      for(const card of ordinaryReferences.slice(6)) if(observations[card.base.id])
        for(const stat of card.stat) for(const [key,value] of Object.entries(observations[card.base.id].values))
          assert.equal(stat[key],value,'Compiled opt-in historical field must match its pinned observation');
    }
    const items=(await secure('/reference/GetItem',auth)).ret_data;
    for(const card of ordinaryReferences) {
      const bindings=items.item.filter(item=>item.use_type===3 && item.effect===card.base.id);
      assert.equal(bindings.length,1,'One compiled item post-processing binding per ordinary Hunter');
      assert.ok(bindings[0].collect_qty>0,'Compiled Library navigation threshold');
    }
    for(const role of [1,2,3,4])
      assert.ok(ordinaryReferences.some(card=>card.base.role===role && card.base.is_source===0),'Compiled nonempty ordinary Library role');
    assert.ok(ordinaryReferences.slice(6).every(card=>!items.trace.some(link=>
      link.item_id===items.item.find(item=>item.use_type===3 && item.effect===card.base.id).id)),
      'No acquisition source manufactured for added references');
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
    profileName==='current-e6-materials18'?'character-materials18-originals.json':
    profileName==='current-e6-guild'?'guild-originals.json':profileName==='current-e6-gems'?'gem-originals.json':null;
  const pins=pinManifest?JSON.parse(readFileSync(path.join(root,'resources/manifests',pinManifest),'utf8')):[];
  if(exerciseEquipment) {
    const registry=JSON.parse(readFileSync(path.join(root,'resources/reference/hunter-equipment-materials.json'),'utf8'));
    const owner=registry.packs.find(pack=>pack.records.some(record=>record.name==='C001_WEP'));
    assert.ok(owner,'Missing exact original equipment owner');
    if(!pins.some(pin=>pin.name===owner.package)) pins.push({name:owner.package,bytes:owner.bytes,sha256:owner.sha256});
  }
  if(exerciseMonster) {
    const registry=JSON.parse(readFileSync(path.join(root,'resources/reference/monster-art-namespaces.json'),'utf8'));
    const owner=registry.packs.find(pack=>Object.hasOwn(pack.namespaces,exerciseMonster));
    assert.ok(owner,'Missing exact original monster owner');
    if(!pins.some(pin=>pin.name===owner.package)) pins.push({name:owner.package,bytes:owner.bytes,sha256:owner.sha256});
  }
  if(pins.length) {
    for(const pin of pins) {
      const row=columns.find(row=>row[0]===pin.name.slice(0,-4));assert.ok(row,'Verification requires a separately selected original owner manifest row');
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
    assert.equal(verifiedOriginals.length,pins.length);
  }
  const portrait=await fetch(base+'/local-profile/replica-100.png');assert.equal(portrait.status,200);assert.match(portrait.headers.get('content-type'),/image\/png/);
  await stop(); await launch();
  if(exerciseGemInventory) {
    assert.deepEqual((await secure('/reference/GetGem',auth)).ret_data,[authoredGemReference]);
    const expectedGem=exerciseGemMount?{...authoredGem,target_inst_id:String(before.gameStates.find(([pvid])=>pvid===gemPvid)[1].starter_cards.find(card=>card.ref_id==='001').inst_id),position:1}:authoredGem;
    assert.deepEqual((await secure('/lobby/GetGemInven',auth)).ret_data,exerciseGemSale?[]:[expectedGem]);
  }
  // Reuse persisted transport key and bound credentials, proving process restart continuity.
  const afterLobby=await secure('/lobby/Enter',auth);assert.ok(afterLobby.ret_data);
  if(exerciseSocial) {
    const owned=(await secure('/relation/GetList',{...auth,type:'1'})).ret_data;
    assert.equal(owned.list.length,1);assert.equal(owned.list[0].friend_id,friendId);
    assert.equal(owned.list[0].like_cnt,1);assert.equal(owned.list[0].is_like,1,'Owned like must survive compiled restart');
    ({secret,token}=peerConnection);
    const peer=(await secure('/relation/GetList',{...friendPeer,type:'1'})).ret_data;
    assert.equal(peer.list.length,1);assert.equal(peer.list[0].friend_id,friendId);
    assert.equal(peer.list[0].target_pvid,Number(auth.pvid));
    ({secret,token}=ownerConnection);
  }
  if(exerciseMonster)
    assert.deepEqual((await secure('/reference/GetMonster',{...auth,list:JSON.stringify([exerciseMonster])})).ret_data,monsterReference,
      'Exact monster identity/prefix/fixture stats must survive compiled restart');
  if(profile.env.BLUSTONE_MATERIAL_STAT_PROFILE==='archive-2019-projection' || exerciseEquipment)
    assert.deepEqual((await secure('/reference/GetCard',auth)).ret_data,ordinaryReferences,
      'Historical reference policy must survive restart without changing records');
  if(exerciseEquipment) {
    assert.deepEqual((await secure('/reference/GetCardEquipmentLevelUpPrice',auth)).ret_data,authoredEquipmentPrices);
    assert.deepEqual((await secure('/reference/GetCardEquipmentRankUpPrice',auth)).ret_data,[authoredEquipmentRankPrice]);
  }
  assert.equal(await (await fetch(base+'/reslist_'+stamp+'.list')).text(),manifest,'Manifest must remain byte-identical after compiled restart');
  const after=JSON.parse(readFileSync(stateFile,'utf8'));
  if(exerciseGuildFound) {
    assert.equal(after.nextGuildId,2);assert.equal(after.guilds.length,1);
    assert.equal(after.guilds[0].members[0].pvid,founderPvid);
    assert.equal((await secure('/lobby/GetGuildInfo',auth)).ret_data.my_guild.guild_id,1,'Creation survives compiled restart');
  }
  if(exerciseGuildRecords) {
    assert.deepEqual(after.guilds,before.guilds,'Established joined Guild records must survive compiled restart and unrelated writes');
    assert.deepEqual((await secure('/guild/GetDetailInfo',{...auth,guild_id:'[7001]'})).ret_data,{guilds:before.guilds},'Full details remain available across compiled restart');
  }
  for(const entry of before.gameStates) {
    const found=after.gameStates.find(row=>JSON.stringify(row[0])===JSON.stringify(entry[0]));
    if(exerciseGemInventory && entry[0]===gemPvid) {
      const actual=structuredClone(found[1]),expected=structuredClone(entry[1]);
      if(exerciseGemMount){expected.owned_gems[0].target_inst_id=String(expected.starter_cards.find(card=>card.ref_id==='001').inst_id);expected.owned_gems[0].position=1;}
      if(exerciseGemReplacement) expected.gold-=13;
      if(exerciseGemSale){expected.gold+=39;expected.owned_gems=[];}
      for(const key of ['ap_updated_at','bp_updated_at']) {delete actual[key];delete expected[key];}
      assert.deepEqual(actual,expected,'Gem read/restart must preserve full raw inventory and legacy scalar separately');
      continue;
    }
    if(exerciseEquipmentUpgrade&&entry[0]===equipmentPvid) {
      const expected=structuredClone(entry[1]),actual=structuredClone(found[1]);
      expected.gold=31;const target=expected.starter_cards.find(card=>card.ref_id==='001');
      target.weapon_rank=2;target.weapon_level=11;
      expected.items[0].qty=0;
      for(const key of ['ap_updated_at','bp_updated_at']) {delete actual[key];delete expected[key];}
      assert.deepEqual(actual,expected,'Equipment transaction must persist only exact selected fields and authored gold fees');
      continue;
    }
    if(exerciseSale && entry[0]===salePvid) {
      const expected=structuredClone(entry[1]),actual=structuredClone(found[1]);
      expected.gold=5026;expected.recruited_cards=[];
      for(const key of ['ap_updated_at','bp_updated_at']) {delete actual[key];delete expected[key];}
      assert.deepEqual(actual,expected,'Sale must persist only exact roster removals and authored gold reward after restart');
      continue;
    }
    if(exerciseBulk && entry[0]===bulkPvid) {
      const expected=structuredClone(entry[1]);
      expected.gold=3800;expected.recruited_cards=[{...expected.recruited_cards[0],rank:2,exp:0,rank_up_cnt:0}];
      expected.card_book=expected.card_book.map(row=>row.ref_id===expected.recruited_cards[0].ref_id?{...row,rank:Math.max(row.rank,2)}:row);
      const actual=structuredClone(found[1]);
      // Lobby legitimately advances full-fuel clocks; every other owned field
      // must equal the exact single-promotion fixture projection after restart.
      for(const key of ['ap_updated_at','bp_updated_at']) {delete actual[key];delete expected[key];}
      assert.deepEqual(actual,expected,'Compiled bulk transaction persisted wrong ownership or unrelated gameplay');
      continue;
    }
    if(exerciseGuildRecords&&entry[0]===Number(auth.pvid)) {
      const actual=structuredClone(found[1]),expected=structuredClone(entry[1]);
      for(const key of ['ap_updated_at','bp_updated_at']) {delete actual[key];delete expected[key];}
      assert.deepEqual(actual,expected,'Joined Guild reads must preserve all gameplay except normal lobby fuel clocks');
      continue;
    }
    if(exerciseGuildFound&&entry[0]===founderPvid) {
      const actual=structuredClone(found[1]),expected=structuredClone(entry[1]);expected.gold=83;
      for(const key of ['ap_updated_at','bp_updated_at']) {delete actual[key];delete expected[key];}
      assert.deepEqual(actual,expected,'Creation changes only configured gold fee in founder gameplay');continue;
    }
    assert.deepEqual(found,entry,'Existing account gameplay state changed');
  }
  const report={compiled_process:true,unrelated_working_directory:true,encrypted_ecdh_hmac_aes:true,
    direct_compiled_process:true,launcher_process_verified:false,
    encrypted_bulk_rank_up_fixture:exerciseBulk,
    encrypted_hunter_sale_fixture:exerciseSale,
    configured_equipment_reference_fixture:exerciseEquipment,
    configured_equipment_upgrade_fixture:exerciseEquipmentUpgrade,
    configured_gem_inventory_fixture:exerciseGemInventory,
    configured_gem_mount_fixture:exerciseGemMount,
    configured_gem_replacement_fixture:exerciseGemReplacement,
    configured_gem_sale_fixture:exerciseGemSale,
    configured_gem_level_reference_fixture:exerciseGemLevelReference,
    configured_guild_lobby_fixture:exerciseGuildRecords,
    configured_local_guild_creation_fixture:exerciseGuildFound,
    encrypted_social_lifecycle_fixture:exerciseSocial,
    encrypted_social_cleanup_fixture:exerciseSocial,
    encrypted_social_discovery_fixture:exerciseSocial,
    encrypted_social_likes_fixture:exerciseSocial,
    encrypted_monster_resource_fixture:exerciseMonster??null,
    historical_material_projection:profile.env.BLUSTONE_MATERIAL_STAT_PROFILE==='archive-2019-projection',
    quest_empty_collections_and_claim_refusal:true,
    guild_flat_lobby_and_skin_empty_contracts:true,
    profile:profileName,resource_stamp:stamp,exact_manifest_selection:true,manifest_restart_exact:true,
    added_original_jet_groups:verifiedOriginals,live_profile_activation:false,
    ordinary_reference_count:ordinaryReferences.length,authenticated_mirage_friend_floors:true,
    compiled_library_navigation_bindings:profile.env.BLUSTONE_CARD_REFERENCE_PROFILE==='materials',native_library_rendering_verified:false,
    authenticated_lobby_and_references:true,unique_campaign_area_ownership:true,hidden_origin_rewards_absent:true,
    episode_log:true,resource_packages:rows.length,resource_range_206:true,
    compiled_portrait:true,persisted_transport_and_credentials:true,
    preserved_existing_games:before.gameStates.filter(([pvid])=>(!exerciseBulk || pvid!==bulkPvid) && (!exerciseSale || pvid!==salePvid) && (!exerciseEquipmentUpgrade || pvid!==equipmentPvid)).length,
    fixture_games_intentionally_promoted:exerciseBulk?1:0,
    apk_install_or_device_actions:false};
  writeFileSync(path.join(outputFolder,'standalone-verification.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} finally { await stop(); }
