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
// loopback port. The source ticket is an authored owned fixture, not IAP or
// original stock issuance. No live profile/device or purchase entitlement claim.
const directory=mkdtempSync(path.join(tmpdir(),"blustone-quick-http-")),file=path.join(directory,"state.json");
const compiled=(name:string)=>pathToFileURL(repositoryPath("dist/src/"+name+".js")).href;
const oldMinimum=process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;
process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE="catalogue-birth-rank-projection";
const {ServerState}=await import(compiled("state"));
if(oldMinimum===undefined)delete process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;else process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE=oldMinimum;
const {parseStateWithGemIds}=await import(compiled("gem-wire"));
const {cardInstance,starterLevels}=await import(compiled("bootstrap"));
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,"127.0.0.1",resolve));
const address=probe.address();if(!address||typeof address==="string")throw new Error("No disposable port");
const port=address.port,base=`http://127.0.0.1:${port}`;
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
assert.notEqual(port,8080);
let child:ChildProcess|undefined;
const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,"exit");child.kill();await exited;}child=undefined;};
const launch=async(profile="catalogue-birth-rank-projection",mode="local-owned-tickets",expectRefusal=false)=>{
  const env:NodeJS.ProcessEnv={...process.env,BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:"127.0.0.1",BLUSTONE_BASE_URL:base,BLUSTONE_STATE_FILE:file,
    BLUSTONE_PACKAGE_DIR:repositoryPath("resources/test-fixtures/base-packages"),BLUSTONE_PACKAGE_NAMES:"E_NEW.jet",
    BLUSTONE_RESOURCE_SHOP_MODE:"disabled",
    BLUSTONE_DORM_EXPANSION_MODE:"disabled",BLUSTONE_QUICK_ADVANCEMENT_MODE:mode,BLUSTONE_HUNTER_MIN_RANK_PROFILE:profile,
    BLUSTONE_PROFILE_MODE:"disabled",BLUSTONE_RUPEE_SHOP_MODE:"disabled",BLUSTONE_BAIT_SHOP_MODE:"disabled",BLUSTONE_VETERAN_GIFT_MODE:"disabled",
    BLUSTONE_DISPATCH_MODE:"disabled",BLUSTONE_QUEST_MODE:"disabled"};
  delete env.BLUSTONE_RESOURCE_AP_DAILY_LIMIT;delete env.BLUSTONE_RESOURCE_BP_DAILY_LIMIT;
  if(mode==="default-disabled")delete env.BLUSTONE_QUICK_ADVANCEMENT_MODE;
  child=spawn(process.execPath,[repositoryPath("dist/src/server.js")],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout!.on("data",bytes=>{log+=bytes;});child.stderr!.on("data",bytes=>{log+=bytes;});
  for(let count=0;count<100;count++) {
    if(child.exitCode!==null||child.signalCode!==null){if(expectRefusal){assert.notEqual(child.exitCode,0);assert.match(log,/quick advancement requires the catalogue minimum-rank profile/);return;}throw new Error("Compiled quick advancement server exited: "+log.slice(-1500));}
    if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){
      assert.equal(expectRefusal,false,"Incompatible mode must refuse before listening");assert.equal((await fetch(base+"/healthz")).status,200);return;
    }
    await delay(100);
  }
  throw new Error("Compiled quick advancement server did not listen: "+log.slice(-1500));
};
try {
  const seed=new ServerState(base,file,{quickAdvancementMode:"disabled",dormExpansionMode:"disabled",dormExpansionPrices:undefined,resourceShopMode:"disabled",resourceApDailyLimit:undefined,resourceBpDailyLimit:undefined});
  const actor=seed.registerGuest({device_id:"quick-http-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"quick-http-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  const targetId=1000100,ticketId="9007199254740993";
  const target={...cardInstance(targetId,"003",3),exp:123,rank_up_cnt:1,lock:1,skill_1_level:7,skill_2_level:3};
  game.recruited_cards=[target];game.next_card_inst_id=1000101;
  game.items=[{inst_id:ticketId,ref_id:"SU1",qty:2,lock:0}];
  game.card_book=game.card_book.filter((row:any)=>row.ref_id!=="003");game.card_book.push({ref_id:"003",rank:3});
  game.ap_updated_at=Date.now()+86_400_000;game.bp_updated_at=game.ap_updated_at;
  const wallet={free:game.gacha_free_qty,paid:game.gacha_iap_qty,gold:game.gold};
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
  const refs=(await secure("/reference/GetItem")).body.ret_data;
  for(const id of ["SU1","SU2"]) {
    const item=refs.item.find((row:any)=>row.id===id);assert.ok(item);assert.equal(item.use_type,0);assert.equal(item.effect,"");assert.equal(item.thumbnail_id,"");
    assert.equal(item.name,"Advancement Ticket");assert.equal(refs.global_item.some((row:any)=>row.item_id===id),false,"Ticket metadata cannot offer an unimplemented IAP/stock producer");
  }
  const packet={inst_id:ticketId,target_id:String(targetId),qty:"1"};
  const before=owned(),reply=await secure("/world/UseItem",packet);assert.equal(reply.body.result_code,1);
  const data=reply.body.ret_data;
  assert.deepEqual(Object.keys(data).sort(),["achievement","card","consumed_item_list","daily_quest","dailyquest_min_stage","linear_quest"].sort());
  assert.equal(data.dailyquest_min_stage,"");for(const key of ["achievement","daily_quest","linear_quest"])assert.deepEqual(data[key],[]);
  assert.deepEqual(data.card,{target_inst:{inst_id:targetId,rank:{prev:3,cur:4},rank_up_cnt:{prev:1,cur:0},exp:{prev:123,cur:0}}});
  assert.equal(data.consumed_item_list.length,1);assert.equal(data.consumed_item_list[0].qty,1);
  assert.ok(reply.text.includes(`"inst_id":${ticketId},"qty":1`),"Removal delta must use an exact numeric full64 token");
  const current=owned(),changed=current.recruited_cards.find((row:any)=>row.inst_id===targetId);
  assert.deepEqual(changed,{...target,rank:4,rank_up_cnt:0,exp:0});
  assert.equal(current.items[0].qty,1);assert.equal(current.items[0].inst_id,ticketId);
  assert.equal(current.starter_cards.length+current.recruited_cards.length,before.starter_cards.length+before.recruited_cards.length);
  assert.deepEqual(current.starter_cards,before.starter_cards);assert.deepEqual(current.decks,before.decks);
  assert.equal(current.gold,wallet.gold);assert.equal(current.gacha_free_qty,wallet.free);assert.equal(current.gacha_iap_qty,wallet.paid);
  assert.equal(current.card_book.find((row:any)=>row.ref_id==='003').rank,4);
  const settled=readFileSync(file);assert.equal((await secure("/world/UseItem",packet)).body.result_code,2001);assert.deepEqual(readFileSync(file),settled,"Promoted target cannot consume a second SU1");
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
  await stop();await launch(); // Same persisted P384 transport key and OTP.
  assert.deepEqual(owned(),current);
  const bytes=readFileSync(file),sync=await secure("/world/RefreshInven",{card_inst_list:JSON.stringify([targetId]),item_ref_list:'["SU1"]'});
  assert.equal(sync.body.result_code,1);assert.deepEqual(sync.body.ret_data.card,[changed]);
  assert.equal(sync.body.ret_data.item.length,1);assert.equal(sync.body.ret_data.item[0].ref_id,"SU1");assert.equal(sync.body.ret_data.item[0].qty,1);
  assert.equal(sync.body.ret_data.item[0].lock,0);assert.ok(sync.text.includes(`"inst_id":${ticketId}`));
  assert.deepEqual(readFileSync(file),bytes,"Absolute repair returns stock1 rather than applying another delta");
  assert.equal((await secure("/world/UseItem",packet)).body.result_code,2001);assert.deepEqual(readFileSync(file),bytes);
  const book=(await secure("/lobby/GetCardBook")).body;assert.equal(book.ret_data.find((row:any)=>row.ref_id==='003').rank,4);
  // Existing GetCardBook lazy energy-clock refresh is outside the ticket
  // transaction; capture its settled snapshot for subsequent mode checks.
  const afterBook=owned();
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
  await stop();const incompatible=readFileSync(file);await launch("legacy","local-owned-tickets",true);
  assert.deepEqual(readFileSync(file),incompatible,"Invalid mode/profile combination refuses before save writes");await stop();
  await launch("catalogue-birth-rank-projection","default-disabled");
  const disabled=(await secure("/reference/GetItem")).body.ret_data;
  // Inert definitions remain available for already owned tickets while mode
  // is off, so retained inventory can still resolve its reference safely.
  assert.equal(disabled.item.find((row:any)=>row.id==='SU1').use_type,0);
  assert.equal(disabled.global_item.some((row:any)=>row.item_id==='SU1'||row.item_id==='SU2'),false);
  const offBytes=readFileSync(file);assert.equal((await secure("/world/UseItem",packet)).body.result_code,2001);assert.deepEqual(readFileSync(file),offBytes);
  assert.deepEqual(owned(),afterBook);assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
}finally{await stop();rmSync(directory,{recursive:true,force:true});}
console.log("Compiled owned-ticket quick advancement encrypted HTTP: authored SU1 full64 delta, Nene3→4/counter reset/EXP0/book, unchanged skills/wallet/ownership count, replay refusal, absolute inventory repair/restart, required minimum-rank profile and disabled-mode preservation passed; no IAP or original stock producer claim.");
