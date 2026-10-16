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
// loopback port. Every cost/effect/material is an explicit authored LOCAL
// fixture, with no original recipe, material issuance or native UI claim.
const directory=mkdtempSync(path.join(tmpdir(),"blustone-overcome-http-")),file=path.join(directory,"state.json");
const compiled=(name:string)=>pathToFileURL(repositoryPath("dist/src/"+name+".js")).href;
const oldMinimum=process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;delete process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;
const {ServerState}=await import(compiled("state"));
if(oldMinimum===undefined)delete process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE;else process.env.BLUSTONE_HUNTER_MIN_RANK_PROFILE=oldMinimum;
const {parseStateWithGemIds}=await import(compiled("gem-wire"));
const {cardInstance}=await import(compiled("bootstrap"));
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,"127.0.0.1",resolve));
const address=probe.address();if(!address||typeof address==="string")throw new Error("No disposable port");
const port=address.port,base=`http://127.0.0.1:${port}`;
await new Promise<void>((resolve,reject)=>probe.close(error=>error?reject(error):resolve()));
assert.notEqual(port,8080);
const policy={effect:[1,2,3].map(cnt=>({cnt,hp_percent:cnt*3,atk_percent:cnt*4,def_percent:cnt*5})),
  src:[1,2,3,4].flatMap(target_base_rank=>[1,2,3].map(overcome_cnt=>({target_base_rank,overcome_cnt,card_required_rank:1,card_cnt:1,item_list:[{ref_id:"local_overcome_stone",qty:3}],gold:17}))),
  items:[{id:"local_overcome_stone",name:"Authored stone",desc:"Local fixture",use_type:0,effect:"",thumbnail_id:"",rank:1,sell_price:0,collect_qty:0}]};
let child:ChildProcess|undefined;
const stop=async()=>{if(child&&child.exitCode===null&&child.signalCode===null){const exited=once(child,"exit");child.kill();await exited;}child=undefined;};
const launch=async(mode="local-configured",supplied:typeof policy|undefined=policy,expectRefusal=false)=>{
  const env:NodeJS.ProcessEnv={...process.env,BLUSTONE_PORT:String(port),BLUSTONE_BIND_HOST:"127.0.0.1",BLUSTONE_BASE_URL:base,BLUSTONE_STATE_FILE:file,
    BLUSTONE_PACKAGE_DIR:repositoryPath("resources/test-fixtures/base-packages"),BLUSTONE_PACKAGE_NAMES:"E_NEW.jet",
    BLUSTONE_RESOURCE_SHOP_MODE:"disabled",
    BLUSTONE_DORM_EXPANSION_MODE:"disabled",BLUSTONE_HUNTER_MIN_RANK_PROFILE:"legacy",BLUSTONE_QUICK_ADVANCEMENT_MODE:"disabled",
    BLUSTONE_HUNTER_OVERCOME_MODE:mode,BLUSTONE_HUNTER_OVERCOME_POLICY_JSON:supplied===undefined?undefined:JSON.stringify(supplied),
    BLUSTONE_PROFILE_MODE:"disabled",BLUSTONE_RUPEE_SHOP_MODE:"disabled",BLUSTONE_BAIT_SHOP_MODE:"disabled",BLUSTONE_VETERAN_GIFT_MODE:"disabled",
    BLUSTONE_DISPATCH_MODE:"disabled",BLUSTONE_QUEST_MODE:"disabled"};
  delete env.BLUSTONE_RESOURCE_AP_DAILY_LIMIT;delete env.BLUSTONE_RESOURCE_BP_DAILY_LIMIT;
  if(mode==="disabled")delete env.BLUSTONE_HUNTER_OVERCOME_POLICY_JSON;
  child=spawn(process.execPath,[repositoryPath("dist/src/server.js")],{cwd:directory,env,stdio:["ignore","pipe","pipe"]});
  let log="";child.stdout!.on("data",bytes=>{log+=bytes;});child.stderr!.on("data",bytes=>{log+=bytes;});
  for(let count=0;count<100;count++) {
    if(child.exitCode!==null||child.signalCode!==null){if(expectRefusal){assert.notEqual(child.exitCode,0);assert.match(log,/Configured transcendence policy differs from captured earned policy/);return;}throw new Error("Compiled Overcome server exited: "+log.slice(-1500));}
    if(log.includes(`Blustone TypeScript server listening on 127.0.0.1:${port}`)){
      assert.equal(expectRefusal,false,"Retuned captured policy must refuse before listening");assert.equal((await fetch(base+"/healthz")).status,200);return;
    }
    await delay(100);
  }
  throw new Error("Compiled Overcome server did not listen: "+log.slice(-1500));
};
try {
  const seed=new ServerState(base,file,{hunterOvercomeMode:"disabled",hunterOvercomePolicy:undefined,dormExpansionMode:"disabled",dormExpansionPrices:undefined,resourceShopMode:"disabled",resourceApDailyLimit:undefined,resourceBpDailyLimit:undefined});
  const actor=seed.registerGuest({device_id:"overcome-http-owner"},{}).ret_data as any;
  const peer=seed.registerGuest({device_id:"overcome-http-peer"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates.find(([pvid]:any)=>pvid===actor.pvid)[1];
  const targetId=1000100,sourceId=1000101,materialId="9007199254740993";
  const target={...cardInstance(targetId,"003",5),exp:123,overcome_cnt:0,skill_1_level:7,skill_2_level:3};
  const source={...cardInstance(sourceId,"003",3),lock:0};
  game.recruited_cards=[target,source];game.next_card_inst_id=1000102;
  game.items=[{inst_id:materialId,ref_id:"local_overcome_stone",qty:5,lock:0}];
  game.card_book=game.card_book.filter((row:any)=>row.ref_id!=="003");game.card_book.push({ref_id:"003",rank:5});
  game.ap_updated_at=Date.now()+86_400_000;game.bp_updated_at=game.ap_updated_at;
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
  const reference=(await secure("/reference/GetCardOvercome")).body;assert.equal(reference.result_code,1);
  assert.deepEqual(reference.ret_data,{effect:policy.effect,src:policy.src});
  const items=(await secure("/reference/GetItem")).body.ret_data;
  assert.deepEqual(items.item.find((row:any)=>row.id==='local_overcome_stone'),policy.items[0]);
  assert.equal(items.global_item.some((row:any)=>row.item_id==='local_overcome_stone'),false,"Policy metadata has no producer offer");
  assert.equal(owned().items[0].qty,5);assert.equal(owned().recruited_cards.length,2);assert.equal(read().hunterOvercomePolicy,undefined);
  assert.notEqual(read().version,11,"References alone cannot capture an earned effect policy");
  const packet={target_inst_id:String(targetId),src_inst_id_list:JSON.stringify([sourceId])};
  assert.equal((await secure("/mission/Start",{stage_id:"n_01_01"})).body.result_code,1);
  const busy=readFileSync(file);assert.equal((await secure("/gym/Overcome",packet)).body.result_code,2001);assert.deepEqual(readFileSync(file),busy);
  assert.equal((await secure("/mission/Complete",{stage_id:"n_01_01",play_info:'{"clear":0}'})).body.ret_data.accepted,true);
  const before=owned(),decks=before.decks.map((deck:any)=>Object.fromEntries([["type",deck.type],...deck.list.map((id:number,index:number)=>[`inst_id_${index+1}`,id])]));
  const paid=await secure("/gym/Overcome",packet);assert.equal(paid.body.result_code,1);const data=paid.body.ret_data;
  assert.deepEqual(Object.keys(data).sort(),["dailyquest_min_stage","daily_quest","linear_quest","achievement","user","target","removed_card","removed_item"].sort());
  assert.equal(data.dailyquest_min_stage,"");for(const key of ["daily_quest","linear_quest","achievement"])assert.deepEqual(data[key],[]);
  assert.deepEqual(data.user,{gold:{prev:before.gold,cur:before.gold-17},deck:decks});
  assert.deepEqual(data.target,{inst_id:targetId,overcome_cnt:1});assert.deepEqual(data.removed_card,[sourceId]);
  assert.equal(data.removed_item.length,1);assert.equal(data.removed_item[0].qty,3);assert.ok(paid.text.includes(`"inst_id":${materialId},"qty":3`),"Native removed_item uses exact U64 numeric removal DELTA3");
  const current=owned();assert.equal(current.gold,before.gold-17);assert.equal(current.items[0].qty,2);
  assert.deepEqual(current.recruited_cards,[{...target,overcome_cnt:1}]);assert.deepEqual(current.starter_cards,before.starter_cards);
  assert.deepEqual(current.card_book,before.card_book);assert.equal(current.card_book.find((row:any)=>row.ref_id==='003').rank,5);
  assert.equal(current.gacha_free_qty,before.gacha_free_qty);assert.equal(current.gacha_iap_qty,before.gacha_iap_qty);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
  const captured=read();assert.equal(captured.version,11);assert.deepEqual(captured.hunterOvercomePolicy,policy);assert.ok(Array.isArray(captured.quests)&&Array.isArray(captured.dispatches));
  const receiptBytes=readFileSync(file);assert.equal((await secure("/gym/Overcome",packet)).body.result_code,2001);assert.deepEqual(readFileSync(file),receiptBytes);
  await stop();await launch("disabled",undefined); // No policy JSON: captured history owns the retained wire table.
  assert.deepEqual(owned(),current);assert.deepEqual((await secure("/reference/GetCardOvercome")).body.ret_data,reference.ret_data);
  assert.deepEqual((await secure("/reference/GetItem")).body.ret_data.item.find((row:any)=>row.id==='local_overcome_stone'),policy.items[0]);
  const stable=readFileSync(file),repair=await secure("/world/RefreshInven",{card_inst_list:JSON.stringify([targetId]),item_ref_list:'["local_overcome_stone"]'});
  assert.equal(repair.body.result_code,1);assert.deepEqual(repair.body.ret_data.card,[{...target,overcome_cnt:1}]);
  assert.equal(repair.body.ret_data.item.length,1);assert.equal(repair.body.ret_data.item[0].qty,2);assert.ok(repair.text.includes(`"inst_id":${materialId}`));
  assert.equal((await secure("/gym/Overcome",packet)).body.result_code,2001);assert.deepEqual(readFileSync(file),stable,"Mode-off reads/absolute repair/refusal cannot change retained effects or ownership");
  assert.equal(read().version,11);assert.deepEqual(read().hunterOvercomePolicy,policy);
  assert.deepEqual(read().gameStates.find(([pvid]:any)=>pvid===peer.pvid)[1],peerBefore);
  await stop();const immutable=readFileSync(file),changed=structuredClone(policy);changed.effect[0].hp_percent+=1;
  await launch("local-configured",changed,true);assert.deepEqual(readFileSync(file),immutable,"A changed effect cannot silently retune captured ownership");
}finally{await stop();rmSync(directory,{recursive:true,force:true});}
console.log("Compiled Hunter Overcome encrypted HTTP: authored complete policy, actual busy refusal, gold17/material delta3/same-Hunter source removal, scalar count1 without rank/EXP/skill changes, schema11 capture, mode-off retained tables/absolute repair and changed-policy startup refusal passed; no original recipe or native UI claim.");
