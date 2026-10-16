import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:net";
import {spawn,type ChildProcess} from "node:child_process";
import {once} from "node:events";
import {setTimeout as delay} from "node:timers/promises";
import {mkdtempSync,readFileSync,rmSync,existsSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {repositoryPath} from "../src/paths.js";

// Source process imports the compiled constructor in LEGACY mode. Each actual
// HTTP child selects its own import-time community birth-rank projection.
const priorProfile=process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;delete process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;
let ServerState:any;
try{({ServerState}=await import(pathToFileURL(repositoryPath("dist/src/state.js")).href));}
finally{if(priorProfile===undefined)delete process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;else process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE=priorProfile;}
const directory=mkdtempSync(path.join(tmpdir(),"blustone-hunter-min-http-"));
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,"127.0.0.1",resolve));
const address=probe.address();if(!address||typeof address==="string")throw new Error("No disposable port");
const port=address.port,base=`http://127.0.0.1:${port}`;assert.notEqual(port,8080);
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
let child:ChildProcess|undefined;
const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,"exit");child.kill();await exited;}child=undefined;};
const launch=async(file:string,recruit:string,refusal=false)=>{
  const env:NodeJS.ProcessEnv={...process.env,BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:"127.0.0.1",BLUSTONE_BASE_URL:base,BLUSTONE_STATE_FILE:file,
    BLUSTONE_PACKAGE_DIR:repositoryPath("resources/test-fixtures/base-packages"),BLUSTONE_PACKAGE_NAMES:"E_NEW.jet",
    BLUSTONE_HUNTER_MIN_RANK_PROFILE:"catalogue-birth-rank-projection",BLUSTONE_RECRUIT_CARD:recruit,
    BLUSTONE_GACHA_CARD:"002",BLUSTONE_CARD_REFERENCE_PROFILE:"starter",BLUSTONE_RESOURCE_SHOP_MODE:"disabled",BLUSTONE_DORM_EXPANSION_MODE:"disabled",
    BLUSTONE_PROFILE_MODE:"disabled",BLUSTONE_RUPEE_SHOP_MODE:"disabled",BLUSTONE_BAIT_SHOP_MODE:"disabled",BLUSTONE_VETERAN_GIFT_MODE:"disabled",
    BLUSTONE_DISPATCH_MODE:"disabled",BLUSTONE_QUEST_MODE:"disabled"};
  delete env.BLUSTONE_RESOURCE_AP_DAILY_LIMIT;delete env.BLUSTONE_RESOURCE_BP_DAILY_LIMIT;
  if(recruit==="002")delete env.BLUSTONE_RECRUIT_CARD; // Exercise the real default pool selection.
  child=spawn(process.execPath,[repositoryPath("dist/src/server.js")],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout!.on("data",bytes=>{log+=bytes;});child.stderr!.on("data",bytes=>{log+=bytes;});
  for(let count=0;count<100;count++) {
    if(child.exitCode!==null||child.signalCode!==null){
      if(refusal){assert.notEqual(child.exitCode,0);assert.match(log,/Hunter minimum-rank projection lacks an owned rank\/awakening row/);return;}
      throw new Error("Compiled minimum-rank server exited: "+log.slice(-1500));
    }
    if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){
      assert.equal(refusal,false,"Incompatible owned legacy rank must refuse before listening");assert.equal((await fetch(base+"/healthz")).status,200);return;
    }
    await delay(100);
  }
  throw new Error("Compiled minimum-rank startup timed out: "+log.slice(-1500));
};
try {
  const legacyFile=path.join(directory,"legacy.json"),legacy=new ServerState(base,legacyFile);
  legacy.registerGuest({device_id:"legacy-minimum-rank-owner"},{});
  const before=readFileSync(legacyFile),saved=JSON.parse(before.toString()),oldMowgli=saved.gameStates[0][1].starter_cards.find((row:any)=>row.ref_id==='002');
  assert.equal(oldMowgli.rank,1,"Legacy seed must actually contain the incompatible earned rank");
  await launch(legacyFile,"002",true);assert.deepEqual(readFileSync(legacyFile),before,"Failed mode change must not rewrite, promote or erase legacy ownership");await stop();
  for(const [recruit,rank] of [["002",2],["003",3]] as const) {
    const file=path.join(directory,"fresh-"+recruit+".json");assert.equal(existsSync(file),false);await launch(file,recruit);
    const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
    const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
    assert.equal(exchange.status,200);const bytes=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
    const secret=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:bytes,format:"der",type:"spki"})})).digest();
    const sign=(raw:Buffer)=>crypto.createHmac("sha384",secret).update(raw).digest("base64");assert.equal(exchange.headers.get("pv-signature"),sign(bytes));
    let auth:Record<string,string>={};
    const secure=async(route:string,extra:Record<string,string>={})=>{
      const plain=Buffer.from(String(new URLSearchParams({...auth,...extra}))),cipher=crypto.createCipheriv("aes-256-cbc",secret.subarray(0,32),secret.subarray(32,48));
      const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/octet-stream","pv-accesstoken":token,"pv-signature":sign(plain)},
        body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,200);
      const raw=Buffer.from(await response.arrayBuffer()),encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream");let text=raw.toString("utf8");
      if(encrypted){const decipher=crypto.createDecipheriv("aes-256-cbc",secret.subarray(0,32),secret.subarray(32,48)),decoded=Buffer.concat([decipher.update(raw),decipher.final()]);assert.equal(response.headers.get("pv-signature"),sign(decoded));text=decoded.toString("utf8");}
      const body=JSON.parse(text);if(body.result_code===1)assert.equal(encrypted,true,"Success must use the real encrypted transport");return body;
    };
    const guest=await secure("/v2/account/RegisterGuest",{device_id:"fresh-minimum-owner-"+recruit});assert.equal(guest.result_code,1);
    auth={pvid:String(guest.pvid),otp:String(guest.ret_data.otp)};
    const references=(await secure("/reference/GetCard")).ret_data;
    assert.equal(references.find((row:any)=>row.base.id==='002').stat[0].rank,2);assert.equal(references.find((row:any)=>row.base.id==='003').stat[0].rank,3);
    const cards=(await secure("/lobby/GetCardInven")).ret_data;
    assert.ok(cards.some((row:any)=>row.ref_id==='002'));assert.ok(cards.filter((row:any)=>row.ref_id==='002').every((row:any)=>row.rank===2));
    const registered=JSON.parse(readFileSync(file,"utf8"));assert.equal(registered.gameStates[0][1].starter_cards.find((row:any)=>row.ref_id==='002').rank,2);
    const draw=await secure("/shop/GachaPremium",{cnt:"1"});assert.equal(draw.result_code,1);assert.equal(draw.ret_data.cnt,1);
    assert.equal(Array.isArray(draw.ret_data.card),false,"Native one-draw receipt is a single complete card DTO");
    assert.equal(draw.ret_data.card.ref_id,recruit);assert.equal(draw.ret_data.card.rank,rank);assert.deepEqual(draw.ret_data.card.reward,{ref_id:recruit,qty:1});
    const acquired=JSON.parse(readFileSync(file,"utf8")),owned=acquired.gameStates[0][1];
    assert.equal(owned.recruited_cards.find((row:any)=>row.inst_id===draw.ret_data.card.inst_id).rank,rank);
    await stop();await launch(file,recruit); // Same persisted security key/OTP.
    assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates[0][1],owned);
    const restored=(await secure("/lobby/GetCardInven")).ret_data;
    assert.equal(restored.find((row:any)=>row.inst_id===draw.ret_data.card.inst_id).rank,rank);
    assert.ok(restored.filter((row:any)=>row.ref_id==='002').every((row:any)=>row.rank===2));
    assert.equal((await secure("/reference/GetCard")).ret_data.find((row:any)=>row.base.id===recruit).stat[0].rank,rank);
    await stop();
  }
}finally{await stop();rmSync(directory,{recursive:true,force:true});}
console.log("Compiled minimum-rank encrypted HTTP: import-isolated community projection, fresh Mowgli2/Nene3 first reference rows and starter/draw ownership, both default/override single draws and persisted transport restart; incompatible legacy Mowgli1 startup refuses byte-identically. No original-stat or native UI claim.");
