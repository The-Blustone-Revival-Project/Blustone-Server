import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:net";
import {spawn,type ChildProcess} from "node:child_process";
import {once} from "node:events";
import {setTimeout as delay} from "node:timers/promises";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {pathToFileURL} from "node:url";
import {repositoryPath} from "../src/paths.js";

// Separate compiled server process, unrelated working directory, OS-selected
// loopback port. All prices at100/103 are explicit LOCAL fiction, not original
// historical quotes. Never a live profile/device.
const directory=mkdtempSync(path.join(tmpdir(),"blustone-dorm-http-")),file=path.join(directory,"state.json");
const compiled=(name:string)=>pathToFileURL(repositoryPath("dist/src/"+name+".js")).href;
const {ServerState}=await import(compiled("state"));
const {parseStateWithGemIds}=await import(compiled("gem-wire"));
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,"127.0.0.1",resolve));
const address=probe.address();if(!address||typeof address==="string")throw new Error("No disposable port");
const port=address.port,base=`http://127.0.0.1:${port}`;
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
assert.notEqual(port,8080);
let child:ChildProcess|undefined;
const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,"exit");child.kill();await exited;}child=undefined;};
const launch=async()=>{
  const env:NodeJS.ProcessEnv={...process.env,BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:"127.0.0.1",BLUSTONE_BASE_URL:base,BLUSTONE_STATE_FILE:file,
    BLUSTONE_PACKAGE_DIR:repositoryPath("resources/test-fixtures/base-packages"),BLUSTONE_PACKAGE_NAMES:"E_NEW.jet",
    BLUSTONE_RESOURCE_SHOP_MODE:"disabled",
    BLUSTONE_DORM_EXPANSION_MODE:"local-priced",BLUSTONE_DORM_EXPANSION_PRICES_JSON:JSON.stringify([{capacity:100,gold:50000,manda:3},{capacity:103,gold:60000,manda:4}]),
    BLUSTONE_PROFILE_MODE:"disabled",BLUSTONE_RUPEE_SHOP_MODE:"disabled",BLUSTONE_BAIT_SHOP_MODE:"disabled",BLUSTONE_VETERAN_GIFT_MODE:"disabled",
    BLUSTONE_DISPATCH_MODE:"disabled",BLUSTONE_QUEST_MODE:"disabled"};
  delete env.BLUSTONE_RESOURCE_AP_DAILY_LIMIT;delete env.BLUSTONE_RESOURCE_BP_DAILY_LIMIT;
  child=spawn(process.execPath,[repositoryPath("dist/src/server.js")],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout!.on("data",bytes=>{log+=bytes;});child.stderr!.on("data",bytes=>{log+=bytes;});
  for(let count=0;count<100;count++) {
    if(child.exitCode!==null||child.signalCode!==null)throw new Error("Compiled dorm server exited: "+log.slice(-1500));
    if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){
      assert.equal((await fetch(base+"/healthz")).status,200);return;
    }
    await delay(100);
  }
  throw new Error("Compiled dorm server did not listen: "+log.slice(-1500));
};
try {
  const seed=new ServerState(base,file,{dormExpansionMode:"disabled",dormExpansionPrices:undefined,resourceShopMode:"disabled",resourceApDailyLimit:undefined,resourceBpDailyLimit:undefined});
  const actor=seed.registerGuest({device_id:"dorm-http-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"dorm-http-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  assert.equal(game.dorm_expansion,undefined);
  game.ap_updated_at=Date.now()+86_400_000;game.bp_updated_at=game.ap_updated_at;
  game.gacha_free_qty=2;game.gacha_iap_qty=20;game.gold=100000;
  writeFileSync(file,JSON.stringify(saved));
  const peerBefore=structuredClone(saved.gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1]);
  const read=()=>JSON.parse(readFileSync(file,"utf8"));
  const owned=()=>read().gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  await launch();
  const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
  const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
  assert.equal(exchange.status,200);const publicBytes=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
  const secret=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:publicBytes,format:"der",type:"spki"})})).digest();
  const sign=(raw:Buffer)=>crypto.createHmac("sha384",secret).update(raw).digest("base64");assert.equal(exchange.headers.get("pv-signature"),sign(publicBytes));
  const secure=async(route:string,extra:Record<string,string>={})=>{
    const plain=Buffer.from(String(new URLSearchParams({pvid:String(actor.pvid),otp:String(actor.otp),...extra}))),cipher=crypto.createCipheriv("aes-256-cbc",secret.subarray(0,32),secret.subarray(32,48));
    const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/octet-stream","pv-accesstoken":token,"pv-signature":sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,200);
    const raw=Buffer.from(await response.arrayBuffer()),encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream");
    let text=raw.toString("utf8");
    if(encrypted){const decipher=crypto.createDecipheriv("aes-256-cbc",secret.subarray(0,32),secret.subarray(32,48)),decoded=Buffer.concat([decipher.update(raw),decipher.final()]);assert.equal(response.headers.get("pv-signature"),sign(decoded));text=decoded.toString("utf8");}
    const body=parseStateWithGemIds(text);if(body.result_code===1)assert.equal(encrypted,true,"Success must be real encrypted transport");
    return {body,text};
  };
  const id="local_dorm_expansion";
  const reference=(await secure("/reference/GetItem")).body.ret_data;
  const item=reference.item.find((row:any)=>row.id===id),offer=reference.global_item.find((row:any)=>row.item_id===id);
  assert.equal(reference.item.filter((row:any)=>row.use_type===9).length,1);assert.equal(item.use_type,9);assert.equal(item.effect,"3");
  assert.equal(offer.type,2);assert.equal(offer.buy_limit,2);assert.equal(offer.provide_qty,1);
  for(const [type,prices] of [[1,[3,4]],[2,[50000,60000]]] as const)
    for(let count=1;count<=2;count++)assert.equal(offer.price_list.find((row:any)=>row.price_type===type&&row.buy_cnt===count).price,prices[count-1]);
  const inventory=async()=>(await secure("/lobby/GetItemInven")).body.ret_data;
  const initial=await inventory();assert.equal(initial.item.some((row:any)=>row.ref_id===id),false,"Metadata never grants an owned expansion item");
  assert.deepEqual(initial.global_item.filter((row:any)=>row.item_id===id),[1,2,4].map(price_type=>({item_id:id,price_type,buy_cnt:0})));
  assert.equal(read().version,1);assert.equal(owned().dorm_expansion,undefined);
  const buy=(payment:number,extra:Record<string,string>={})=>secure("/shop/BuyGlobalItem",{target_ref_id:id,price_type:String(payment),item_inst_id:"0",qty:"1",...extra});
  for(const patch of [{qty:"2"},{price:"0"},{item_inst_id:"1"}] as Array<Record<string,string>>) {
    const before=readFileSync(file);assert.equal((await buy(1,patch)).body.result_code,2001);assert.deepEqual(readFileSync(file),before);
  }
  const first=(await buy(1)).body;assert.equal(first.result_code,1);
  assert.deepEqual(first.ret_data,{jackpot_level:1,jackpot_multiply:1,
    user:{card_inven_max:{prev:100,cur:103},iap:{iap_qty:19,free_iap_qty:0}},
    target_inst:{item_id:id,price_type:1,buy_cnt:{prev:0,cur:1}},consumed_inst_list:[]});
  assert.equal(read().version,10);assert.deepEqual(owned().dorm_expansion,{capacity:103,manda:1,gold:0});
  assert.equal(owned().gold,100000);assert.equal(owned().gacha_free_qty,0);assert.equal(owned().gacha_iap_qty,19);
  const second=(await buy(2)).body;assert.equal(second.result_code,1);
  assert.deepEqual(second.ret_data,{jackpot_level:1,jackpot_multiply:1,
    user:{card_inven_max:{prev:103,cur:106},gold:{prev:100000,cur:40000}},
    target_inst:{item_id:id,price_type:2,buy_cnt:{prev:0,cur:1}},consumed_inst_list:[]});
  assert.deepEqual(owned().dorm_expansion,{capacity:106,manda:1,gold:1});assert.equal(owned().gacha_iap_qty,19);assert.equal(owned().gacha_free_qty,0);
  const lobby=(await secure("/lobby/Enter")).body;assert.equal(lobby.result_code,1);assert.equal(lobby.ret_data.user.card_inven_max,106);
  const stock=await inventory();assert.deepEqual(stock.global_item.filter((row:any)=>row.item_id===id),[1,2,4].map(price_type=>({item_id:id,price_type,buy_cnt:price_type===4?0:1})));
  const settled=owned();assert.equal(settled.items.some((row:any)=>row.ref_id===id),false);
  const capped=readFileSync(file);assert.equal((await buy(1)).body.result_code,2001);assert.deepEqual(readFileSync(file),capped);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore,"Other account game remains exact");
  await stop();await launch(); // Reuse persisted P384 key and bound actor OTP.
  assert.deepEqual(owned(),settled);assert.equal(read().version,10);
  const restartedLobby=(await secure("/lobby/Enter")).body;assert.equal(restartedLobby.ret_data.user.card_inven_max,106);
  const restarted=await inventory();assert.deepEqual(restarted.global_item.filter((row:any)=>row.item_id===id),stock.global_item.filter((row:any)=>row.item_id===id));
  const stable=readFileSync(file);assert.equal((await buy(2)).body.result_code,2001);assert.deepEqual(readFileSync(file),stable);
  assert.deepEqual(owned().dorm_expansion,{capacity:106,manda:1,gold:1});assert.equal(owned().gold,40000);assert.equal(owned().gacha_iap_qty,19);assert.equal(owned().gacha_free_qty,0);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
}finally{await stop();rmSync(directory,{recursive:true,force:true});}
console.log("Compiled dorm expansion encrypted HTTP: explicit LOCAL100/103 prices, native type9/combined tiers, Manda then Rupees100→103→106, schema10, lobby/counter restoration, persisted transport and isolated peer restart passed; no original price or native UI claim.");
