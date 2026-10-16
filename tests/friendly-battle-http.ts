import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:net";
import {spawn,type ChildProcess} from "node:child_process";
import {once} from "node:events";
import {setTimeout as delay} from "node:timers/promises";
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmdirSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {repositoryPath} from "../src/paths.js";

// Authored disposable accounts only. Actual compiled P384/AES HTTP proves
// preparation, not native scene execution or a friendly-battle result.
const directory=mkdtempSync(path.join(tmpdir(),"blustone-friendly-http-")),file=path.join(directory,"state.json");
const compiled=(name:string)=>pathToFileURL(repositoryPath("dist/src/"+name+".js")).href;
const {ServerState}=await import(compiled("state"));
const {gameResponse}=await import(compiled("game-routes"));
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,"127.0.0.1",resolve));
const address=probe.address();if(!address||typeof address==="string")throw new Error("No disposable port");
const port=address.port,base=`http://127.0.0.1:${port}`;assert.notEqual(port,8080);
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
let child:ChildProcess|undefined;
const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,"exit");child.kill();await exited;}child=undefined;};
const launch=async(enabled=true)=>{
  const env:NodeJS.ProcessEnv={...process.env,BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:"127.0.0.1",BLUSTONE_BASE_URL:base,BLUSTONE_STATE_FILE:file,
    BLUSTONE_PACKAGE_DIR:repositoryPath("resources/test-fixtures/base-packages"),BLUSTONE_PACKAGE_NAMES:"E_NEW.jet",
    BLUSTONE_FRIENDLY_BATTLE_MODE:enabled?"local-owned-defense":"disabled",BLUSTONE_HUNTER_MIN_RANK_PROFILE:"legacy",BLUSTONE_CARD_REFERENCE_PROFILE:"starter",
    BLUSTONE_GACHA_CARD:"002",BLUSTONE_QUICK_ADVANCEMENT_MODE:"disabled",BLUSTONE_RESOURCE_SHOP_MODE:"disabled",BLUSTONE_DORM_EXPANSION_MODE:"disabled",
    BLUSTONE_PROFILE_MODE:"disabled",BLUSTONE_RUPEE_SHOP_MODE:"disabled",BLUSTONE_BAIT_SHOP_MODE:"disabled",BLUSTONE_VETERAN_GIFT_MODE:"disabled",
    BLUSTONE_DISPATCH_MODE:"disabled",BLUSTONE_QUEST_MODE:"disabled"};
  delete env.BLUSTONE_RESOURCE_AP_DAILY_LIMIT;delete env.BLUSTONE_RESOURCE_BP_DAILY_LIMIT;
  child=spawn(process.execPath,[repositoryPath("dist/src/server.js")],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout!.on("data",bytes=>{log+=bytes;});child.stderr!.on("data",bytes=>{log+=bytes;});
  for(let count=0;count<100;count++) {
    if(child.exitCode!==null||child.signalCode!==null)throw new Error("Compiled friendly server exited: "+log.slice(-1500));
    if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){assert.equal((await fetch(base+"/healthz")).status,200);return;}
    await delay(100);
  }
  throw new Error("Compiled friendly startup timed out: "+log.slice(-1500));
};
try {
  const seed=new ServerState(base,file,{friendlyBattleMode:"disabled",profileMode:"archive-profile-projection",quickAdvancementMode:"disabled",
    resourceShopMode:"disabled",resourceApDailyLimit:undefined,resourceBpDailyLimit:undefined,dormExpansionMode:"disabled",dormExpansionPrices:undefined});
  const actor=seed.registerGuest({device_id:"friendly-http-actor"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"friendly-http-peer"},{}).ret_data as any;
  const stranger=seed.registerGuest({device_id:"friendly-http-stranger"},{}).ret_data as any;
  const web=seed.webLoginToken(peer,{});assert.equal(web.result_code,1);
  assert.equal(seed.updateWebProfile(web.ret_data.token,{nick_name:"Friendly Peer",info_message:"Ready to spar"}).result_code,1);
  const request=gameResponse(seed,"/relation/FriendRequest",{...actor,target_pvid:peer.pvid});assert.equal(request.result_code,1);
  assert.equal(gameResponse(seed,"/relation/FriendReqAccept",{...peer,target_friend_id:request.ret_data.friend_id}).result_code,1);
  const saved=JSON.parse(readFileSync(file,"utf8"));
  const gameFor=(data:any,pvid:number)=>data.gameStates.find(([id]:any)=>id===pvid)[1];
  const own=gameFor(saved,actor.pvid),other=gameFor(saved,peer.pvid);
  const find=(game:any,ref:string)=>[...game.starter_cards,...game.recruited_cards].find(row=>row.ref_id===ref);
  const own001=find(own,"001"),own002=find(own,"002"),peer001=find(other,"001"),peer002=find(other,"002");
  assert.ok(own001&&own002&&peer001&&peer002);assert.equal(own001.inst_id,peer001.inst_id);assert.equal(own002.inst_id,peer002.inst_id);
  own.decks=own.decks.filter((row:any)=>row.type!==4);own.decks.push({type:4,list:[own002.inst_id,own001.inst_id,0,0,0]});
  other.decks=other.decks.filter((row:any)=>row.type!==5);other.decks.push({type:5,list:[peer001.inst_id,peer002.inst_id,0,0,0]});
  Object.assign(peer001,{exp:123,skill_1_level:7,skill_2_level:2,private_fixture_secret:"never-public"});
  Object.assign(peer002,{exp:234,skill_1_level:6,skill_2_level:3});other.exp=321;other.vip_exp=45;
  for(const game of [own,other]){game.ap=1;game.bp=1;game.ap_updated_at=Date.now()-86_400_000;game.bp_updated_at=game.ap_updated_at;}
  writeFileSync(file,JSON.stringify(saved));await launch();
  const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
  const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
  assert.equal(exchange.status,200);const publicBytes=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
  const secret=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:publicBytes,format:"der",type:"spki"})})).digest();
  const sign=(bytes:Buffer)=>crypto.createHmac("sha384",secret).update(bytes).digest("base64");assert.equal(exchange.headers.get("pv-signature"),sign(publicBytes));
  const secure=async(extra:Record<string,string>)=>{
    const plain=Buffer.from(String(new URLSearchParams({pvid:String(actor.pvid),otp:String(actor.otp),...extra}))),cipher=crypto.createCipheriv("aes-256-cbc",secret.subarray(0,32),secret.subarray(32,48));
    const response=await fetch(base+"/world/GetFriendlyBattleInfo",{method:"POST",headers:{"content-type":"application/octet-stream","pv-accesstoken":token,"pv-signature":sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,200);
    const raw=Buffer.from(await response.arrayBuffer()),encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream");let text=raw.toString("utf8");
    if(encrypted){const decipher=crypto.createDecipheriv("aes-256-cbc",secret.subarray(0,32),secret.subarray(32,48)),decoded=Buffer.concat([decipher.update(raw),decipher.final()]);assert.equal(response.headers.get("pv-signature"),sign(decoded));text=decoded.toString("utf8");}
    const body=JSON.parse(text);if(body.result_code===1)assert.equal(encrypted,true,"Success must use actual encrypted transport");return body;
  };
  const packet={target_pvid:String(peer.pvid)},baseline=readFileSync(file),gameBaseline=JSON.parse(baseline.toString()).gameStates;
  assert.equal((await secure({target_pvid:String(stranger.pvid)})).result_code,10177);assert.deepEqual(readFileSync(file),baseline);
  const result=await secure(packet);assert.equal(result.result_code,1);assert.deepEqual(Object.keys(result.ret_data),["rival"]);
  const rival=result.ret_data.rival;
  assert.equal(rival.nickname,"Friendly Peer");assert.equal(rival.profile_status,"Ready to spar");assert.equal(rival.battle.pvid,peer.pvid);
  assert.equal(rival.user_exp,321);assert.equal(rival.vip_exp,45);assert.deepEqual(rival.gem,[]);assert.deepEqual(rival.chain_bonus,[]);
  assert.deepEqual(Object.keys(rival.deck),["inst_1","inst_2","inst_3","inst_4","inst_5"]);
  for(const [index,card] of [peer001,peer002].entries()) {
    const projected=rival.deck[`inst_${index+1}`];assert.equal(projected.inst_id,9_100_000_001+index);
    assert.equal(projected.private_fixture_secret,undefined);
    for(const [key,value] of Object.entries(card))if(key!=="inst_id"&&key!=="private_fixture_secret")assert.deepEqual(projected[key],value,key);
    assert.equal([own001.inst_id,own002.inst_id].includes(projected.inst_id),false);
  }
  for(const index of [3,4,5])assert.deepEqual(rival.deck[`inst_${index}`],{inst_id:0});
  assert.deepEqual(readFileSync(file),baseline,"Expired AP/BP clocks and both owned accounts must remain byte-identical");
  // Blocking the writer's initial .tmp path demonstrates successful reads
  // neither persist nor reach lazy resource regeneration through gameFor.
  mkdirSync(file+".tmp");try{assert.deepEqual((await secure(packet)).ret_data.rival,rival);assert.deepEqual(readFileSync(file),baseline);}finally{rmdirSync(file+".tmp");}
  await stop();await launch();assert.deepEqual((await secure(packet)).ret_data.rival,rival);assert.deepEqual(readFileSync(file),baseline,"Persisted transport key and OTP survive actual restart without a new exchange");
  await stop();
  for(const [pvid,type] of [[peer.pvid,5],[actor.pvid,4]]) {
    const missing=JSON.parse(baseline.toString());gameFor(missing,pvid).decks=gameFor(missing,pvid).decks.filter((row:any)=>row.type!==type);
    writeFileSync(file,JSON.stringify(missing));const before=readFileSync(file);await launch();
    assert.equal((await secure(packet)).result_code,2001);assert.deepEqual(readFileSync(file),before,"Missing explicit formations cannot be silently copied or persisted");await stop();
  }
  writeFileSync(file,baseline);await launch(false);assert.equal((await secure(packet)).result_code,2001);assert.deepEqual(readFileSync(file),baseline);await stop();
  assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates,gameBaseline);
}finally{await stop();rmSync(directory,{recursive:true,force:true});}
console.log("Compiled friendly preparation encrypted HTTP: accepted real friends, overlapping owned IDs mirrored only in complete rival DTOs, private extras omitted, missing formations/default disabled refused, expired energy and blocked writes untouched, actual persisted-key restart passed; no native battle claim.");
