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
// loopback port, authored owned coupons only; never a live profile/device.
const directory=mkdtempSync(path.join(tmpdir(),"blustone-resource-http-")),file=path.join(directory,"state.json");
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
  const env={...process.env,BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:"127.0.0.1",BLUSTONE_BASE_URL:base,BLUSTONE_STATE_FILE:file,
    BLUSTONE_PACKAGE_DIR:repositoryPath("resources/test-fixtures/base-packages"),BLUSTONE_PACKAGE_NAMES:"E_NEW.jet",
    BLUSTONE_RESOURCE_SHOP_MODE:"archive-2018-base-only",BLUSTONE_RESOURCE_AP_DAILY_LIMIT:"3",BLUSTONE_RESOURCE_BP_DAILY_LIMIT:"3",
    BLUSTONE_PROFILE_MODE:"disabled",BLUSTONE_RUPEE_SHOP_MODE:"disabled",BLUSTONE_BAIT_SHOP_MODE:"disabled",BLUSTONE_VETERAN_GIFT_MODE:"disabled",
    BLUSTONE_DISPATCH_MODE:"disabled",BLUSTONE_QUEST_MODE:"disabled"};
  child=spawn(process.execPath,[repositoryPath("dist/src/server.js")],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout!.on("data",bytes=>{log+=bytes;});child.stderr!.on("data",bytes=>{log+=bytes;});
  for(let count=0;count<100;count++) {
    if(child.exitCode!==null||child.signalCode!==null)throw new Error("Compiled resource server exited: "+log.slice(-1500));
    if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){
      assert.equal((await fetch(base+"/healthz")).status,200);return;
    }
    await delay(100);
  }
  throw new Error("Compiled resource server did not listen: "+log.slice(-1500));
};
try {
  const seed=new ServerState(base,file,{resourceShopMode:"disabled",resourceApDailyLimit:undefined,resourceBpDailyLimit:undefined});
  const actor=seed.registerGuest({device_id:"resource-http-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"resource-http-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  const couponIds={ap:"9007199254740993",bp:"18446744073709551615"};
  game.items=[{inst_id:couponIds.ap,ref_id:"local_ap_coupon",qty:2,lock:0},{inst_id:couponIds.bp,ref_id:"local_bp_coupon",qty:2,lock:0}];
  game.ap=49;game.bp=9;game.ap_updated_at=Date.now()+86_400_000;game.bp_updated_at=game.ap_updated_at;
  game.gacha_free_qty=4;game.gacha_iap_qty=20;game.gold=20000;
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
  const reference=(await secure("/reference/GetItem")).body.ret_data;
  for(const [resource,id,type,amount] of [["ap","local_ap",1,60],["bp","local_bp",2,2]] as const) {
    assert.equal(reference.item.filter((row:any)=>row.use_type===type).length,1);
    assert.equal(reference.item.find((row:any)=>row.id===id).effect,String(amount));
    const offer=reference.global_item.find((row:any)=>row.item_id===id);
    assert.equal(offer.provide_qty,1);assert.equal(offer.buy_limit,3);assert.equal(offer.ticket_ref_id,`local_${resource}_coupon`);assert.equal(offer.ticket_qty,1);
    for(const payment of [1,2,4])for(let count=1;count<=3;count++)assert.equal(offer.price_list.find((row:any)=>row.price_type===payment&&row.buy_cnt===count).price,payment===1?5:payment===2?5000:1);
  }
  const inventory=async()=>(await secure("/lobby/GetItemInven")).body.ret_data;
  const initial=await inventory();
  assert.deepEqual(initial.global_item.filter((row:any)=>["local_ap","local_bp"].includes(row.item_id)),["local_ap","local_bp"].flatMap(item_id=>[1,2,4].map(price_type=>({item_id,price_type,buy_cnt:0}))));
  const buy=(target:string,payment:number,extra:Record<string,string>={})=>secure("/shop/BuyGlobalItem",{target_ref_id:target,price_type:String(payment),qty:"1",item_inst_id:"0",...extra});
  for(const [resource,id,amount,interval] of [["ap","local_ap",60,300],["bp","local_bp",2,1800]] as const) {
    for(const payment of [1,2,4]) {
      const before=owned(),oldVersion=read().version;
      const reply=await buy(id,payment,payment===4?{item_inst_id:couponIds[resource]}:{});assert.equal(reply.body.result_code,1);
      const data=reply.body.ret_data,current=owned();
      assert.equal(current[resource],before[resource]+amount);assert.equal(current[resource==="ap"?"bp":"ap"],before[resource==="ap"?"bp":"ap"]);
      assert.deepEqual(data.user[resource],{prev:before[resource],cur:current[resource],[`${resource}_charge_time`]:Math.floor(current[`${resource}_updated_at`]/1000)+interval});
      assert.deepEqual(data.target_inst,{item_id:id,price_type:payment,buy_cnt:{prev:0,cur:1}});assert.deepEqual(data.consumed_inst_list,[]);
      assert.equal(data.jackpot_level,1);assert.equal(data.jackpot_multiply,1);assert.equal("item" in data,false);
      if(payment===1){const free=Math.min(before.gacha_free_qty,5);assert.deepEqual(data.user.iap,{iap_qty:before.gacha_iap_qty-(5-free),free_iap_qty:before.gacha_free_qty-free});assert.equal(current.gold,before.gold);}
      if(payment===2){assert.deepEqual(data.user.gold,{prev:before.gold,cur:before.gold-5000});assert.equal(current.gacha_iap_qty,before.gacha_iap_qty);assert.equal(current.gacha_free_qty,before.gacha_free_qty);}
      if(payment===4){assert.equal(data.target_item_inst.qty,1);assert.ok(reply.text.includes(`"inst_id":${couponIds[resource]},"qty":1`));assert.equal(data.user.iap,undefined);assert.equal(data.user.gold,undefined);assert.equal(current.gold,before.gold);assert.equal(current.gacha_iap_qty,before.gacha_iap_qty);assert.equal(current.gacha_free_qty,before.gacha_free_qty);assert.equal(read().version,9);}
      else assert.equal(read().version,oldVersion,"Manda/gold alone cannot invent coupon schema history");
    }
    const stock=await inventory();assert.deepEqual(stock.global_item.filter((row:any)=>row.item_id===id),[1,2,4].map(price_type=>({item_id:id,price_type,buy_cnt:1})));
    const bytes=readFileSync(file);assert.equal((await buy(id,1)).body.result_code,2001);assert.deepEqual(readFileSync(file),bytes,"Shared three-payment cap refuses a fourth purchase without write");
  }
  const paid=owned();assert.equal(paid.ap,229);assert.equal(paid.bp,15);assert.equal(paid.gold,10000);assert.equal(paid.gacha_free_qty,0);assert.equal(paid.gacha_iap_qty,14);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore,"Unrelated actor game is untouched");
  await stop();await launch(); // Deliberately reuse the persisted key and bound OTP.
  assert.deepEqual(owned(),paid);assert.equal(read().version,9);
  const restarted=await inventory();assert.deepEqual(restarted.global_item.filter((row:any)=>["local_ap","local_bp"].includes(row.item_id)),["local_ap","local_bp"].flatMap(item_id=>[1,2,4].map(price_type=>({item_id,price_type,buy_cnt:1}))));
  for(const resource of ["ap","bp"] as const)assert.equal(restarted.item.find((row:any)=>row.ref_id===`local_${resource}_coupon`).qty,1);
  const stable=readFileSync(file);assert.equal((await buy("local_ap",4,{item_inst_id:couponIds.ap})).body.result_code,2001);assert.equal((await buy("local_bp",1)).body.result_code,2001);assert.deepEqual(readFileSync(file),stable);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
}finally{await stop();rmSync(directory,{recursive:true,force:true});}
console.log("Compiled resource-shop encrypted HTTP: isolated child/port, historical AP60/BP2 references, actual Manda/gold/exact-U64 coupon payments, shared cap, schema9 and persisted transport/ownership restart; peer game unchanged. No live profile or native UI claim.");
