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
// loopback port. Historical screen-effective fees are projected as LOCAL raw
// inputs; original Guild state/base fees remain unknown. No live profile/device.
const directory=mkdtempSync(path.join(tmpdir(),"blustone-advancement-http-")),file=path.join(directory,"state.json");
const compiled=(name:string)=>pathToFileURL(repositoryPath("dist/src/"+name+".js")).href;
const {ServerState}=await import(compiled("state"));
const {parseStateWithGemIds}=await import(compiled("gem-wire"));
const {cardInstance,starterLevels}=await import(compiled("bootstrap"));
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
    BLUSTONE_DORM_EXPANSION_MODE:"disabled",BLUSTONE_ADVANCEMENT_GOLD_PROFILE:"screenshot-effective-quote-projection",
    BLUSTONE_PROFILE_MODE:"disabled",BLUSTONE_RUPEE_SHOP_MODE:"disabled",BLUSTONE_BAIT_SHOP_MODE:"disabled",BLUSTONE_VETERAN_GIFT_MODE:"disabled",
    BLUSTONE_DISPATCH_MODE:"disabled",BLUSTONE_QUEST_MODE:"disabled"};
  delete env.BLUSTONE_RESOURCE_AP_DAILY_LIMIT;delete env.BLUSTONE_RESOURCE_BP_DAILY_LIMIT;
  child=spawn(process.execPath,[repositoryPath("dist/src/server.js")],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout!.on("data",bytes=>{log+=bytes;});child.stderr!.on("data",bytes=>{log+=bytes;});
  for(let count=0;count<100;count++) {
    if(child.exitCode!==null||child.signalCode!==null)throw new Error("Compiled advancement server exited: "+log.slice(-1500));
    if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){
      assert.equal((await fetch(base+"/healthz")).status,200);return;
    }
    await delay(100);
  }
  throw new Error("Compiled advancement server did not listen: "+log.slice(-1500));
};
try {
  const seed=new ServerState(base,file,{dormExpansionMode:"disabled",dormExpansionPrices:undefined,resourceShopMode:"disabled",resourceApDailyLimit:undefined,resourceBpDailyLimit:undefined});
  const actor=seed.registerGuest({device_id:"advancement-http-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"advancement-http-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  const targetId=1000100,sources=[1000101,1000102,1000103];
  const maximumExp=Math.max(...starterLevels.card.filter((row:any)=>row.rank===3).map((row:any)=>row.min_exp));
  const target={...cardInstance(targetId,"003",3),exp:maximumExp,lock:1,skill_1_level:7,skill_2_level:3};
  game.recruited_cards=[target,...sources.map(id=>({...cardInstance(id,"003",3),lock:0}))];game.next_card_inst_id=1000104;
  game.card_book=game.card_book.filter((row:any)=>row.ref_id!=="003");game.card_book.push({ref_id:"003",rank:3});
  game.ap_updated_at=Date.now()+86_400_000;game.bp_updated_at=game.ap_updated_at;
  game.gold=20000;
  const wallet={free:game.gacha_free_qty,paid:game.gacha_iap_qty};
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
  const quote=(await secure("/reference/GetCardEnhancePrice")).body;
  assert.equal(quote.result_code,1);assert.deepEqual(quote.ret_data,{level:[100],rank:[1000,1000,4000,15000]});
  const decks=game.decks.map((deck:any)=>Object.fromEntries([["type",deck.type],...deck.list.map((id:number,index:number)=>[`inst_id_${index+1}`,id])]));
  const promote=(ids:number[])=>secure("/gym/RankUp",{target_inst_id:String(targetId),source_inst_list:JSON.stringify(ids),is_tuto:"0"});
  const partial=(await promote([sources[0]])).body;assert.equal(partial.result_code,1);
  assert.deepEqual(partial.ret_data,{user:{gold:{prev:20000,cur:16000},deck:decks},card:{target_inst:{inst_id:targetId,
    rank:{prev:3,cur:3},rank_up_cnt:{prev:0,cur:1},exp:{prev:maximumExp,cur:maximumExp}},removed_inst_list:[sources[0]]}});
  let current=owned(),retained=current.recruited_cards.find((row:any)=>row.inst_id===targetId);
  assert.equal(current.gold,16000);assert.equal(retained.rank,3);assert.equal(retained.rank_up_cnt,1);assert.equal(retained.exp,maximumExp);
  assert.equal(current.recruited_cards.some((row:any)=>row.inst_id===sources[0]),false);
  const partialBytes=readFileSync(file);assert.equal((await promote([sources[0]])).body.result_code,2001);assert.deepEqual(readFileSync(file),partialBytes,"Consumed source retry cannot charge again");
  const final=(await promote(sources.slice(1))).body;assert.equal(final.result_code,1);
  assert.deepEqual(final.ret_data,{user:{gold:{prev:16000,cur:8000},deck:decks},card:{target_inst:{inst_id:targetId,
    rank:{prev:3,cur:4},rank_up_cnt:{prev:1,cur:0},exp:{prev:maximumExp,cur:0}},removed_inst_list:sources.slice(1)}});
  current=owned();retained=current.recruited_cards.find((row:any)=>row.inst_id===targetId);
  assert.equal(current.gold,8000);assert.equal(retained.rank,4);assert.equal(retained.rank_up_cnt,0);assert.equal(retained.exp,0);
  assert.equal(retained.skill_1_level,7);assert.equal(retained.skill_2_level,3);
  assert.equal(retained.skill_4_level,target.skill_4_level,"Promotion does not invent a callback-ignored skill-field mutation");
  assert.deepEqual(current.recruited_cards.map((row:any)=>row.inst_id),[targetId]);assert.equal(current.card_book.find((row:any)=>row.ref_id==='003').rank,4);
  assert.equal(current.gacha_free_qty,wallet.free);assert.equal(current.gacha_iap_qty,wallet.paid);assert.deepEqual(current.starter_cards,game.starter_cards);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore,"Other account game remains exact");
  const settled=owned();const settledBytes=readFileSync(file);
  assert.equal((await promote(sources.slice(1))).body.result_code,2001);assert.deepEqual(readFileSync(file),settledBytes);
  await stop();await launch(); // Reuse persisted P384 key and bound actor OTP.
  assert.deepEqual(owned(),settled);assert.deepEqual((await secure("/reference/GetCardEnhancePrice")).body.ret_data,quote.ret_data);
  const inventory=(await secure("/lobby/GetCardInven")).body;assert.equal(inventory.result_code,1);
  const card=inventory.ret_data.find((row:any)=>row.inst_id===targetId);assert.equal(card.rank,4);assert.equal(card.exp,0);assert.equal(card.rank_up_cnt,0);
  for(const id of sources)assert.equal(inventory.ret_data.some((row:any)=>row.inst_id===id),false);
  const book=(await secure("/lobby/GetCardBook")).body;assert.equal(book.result_code,1);assert.equal(book.ret_data.find((row:any)=>row.ref_id==='003').rank,4);
  const stable=readFileSync(file);assert.equal((await promote(sources)).body.result_code,2001);assert.deepEqual(readFileSync(file),stable);
  assert.equal(owned().gold,8000);assert.equal(owned().gacha_free_qty,wallet.free);assert.equal(owned().gacha_iap_qty,wallet.paid);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
}finally{await stop();rmSync(directory,{recursive:true,force:true});}
console.log("Compiled advancement encrypted HTTP: LOCAL screen-effective rank vector, one material4000 +remaining two8000 total, exact native pairs/removal IDs, promotion/book/skills/wallet persistence and isolated-peer transport restart passed; original Guild/base prices remain unknown.");
