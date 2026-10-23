import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {createApp} from "../src/server.js";
import {castFish,castOptions,castContext} from "./fishing-casts-fixture.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-fishing-casts-http-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
let server:ReturnType<typeof createServer>|undefined;
try {
  const seed=new ServerState("http://localhost",file);
  const auth=seed.registerGuest({device_id:"cast-http-owner"},{}).ret_data as any;
  seed.registerGuest({device_id:"cast-http-peer"},{});
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates[0][1],firstId=4_294_967_307;
  game.items=[{inst_id:8,ref_id:"unrelated",qty:7,lock:1}];game.next_item_inst_id=firstId;
  game.gacha_free_qty=10;game.gacha_iap_qty=20;game.gold=7000;
  writeFileSync(file,JSON.stringify(saved));
  const options={baseUrl:"http://127.0.0.1",stateFile:file,...castOptions()};
  let ctx=createApp(options),base="";
  const listen=async()=>{
    server=createServer(ctx.app);await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("No ephemeral loopback port");
    base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
  };
  const close=async()=>{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));};
  await listen();
  const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
  const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
  assert.equal(exchange.status,200);
  const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
  const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,
    publicKey:crypto.createPublicKey({key:pub,format:"der",type:"spki"})})).digest();
  const sign=(data:Buffer)=>crypto.createHmac("sha384",key).update(data).digest("base64");
  assert.equal(exchange.headers.get("pv-signature"),sign(pub));
  const secure=async(route:string,values:Record<string,string>)=>{
    const plaintext=Buffer.from(String(new URLSearchParams({...values,otp:String(auth.otp),pvid:String(auth.pvid)})));
    const cipher=crypto.createCipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/octet-stream",
      "pv-accesstoken":token,"pv-signature":sign(plaintext)},body:new Uint8Array(Buffer.concat([cipher.update(plaintext),cipher.final()]))});
    assert.equal(response.status,200);
    const encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream")===true;
    let text:string;
    if(encrypted){
      const decipher=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
      const bytes=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);
      assert.equal(response.headers.get("pv-signature"),sign(bytes));text=bytes.toString("utf8");
    }else text=await response.text();
    const decoded=JSON.parse(text);if(decoded.result_code===1)assert.equal(encrypted,true,"Successful replies require native encrypted transport");
    return {decoded,text};
  };
  assert.equal((await secure("/lobby/Enter",{})).decoded.result_code,1);
  assert.equal((await secure("/lobby/GetItemInven",{})).decoded.result_code,1);
  const refs=(await secure("/reference/GetItem",{})).decoded.ret_data.item;
  assert.equal(refs.find((item:any)=>item.id===castFish.id).use_type,17);
  assert.equal(refs.filter((item:any)=>item.id==="LU003").length,1);
  const buy=(await secure("/shop/BuyGlobalItem",{target_ref_id:"LU003",price_type:"1",item_inst_id:"0",qty:"1"})).decoded;
  assert.equal(buy.result_code,1);assert.equal(buy.ret_data.item[0].inst_id,firstId);
  assert.equal(buy.ret_data.item[0].added,10,"All bait in this HTTP workflow is actually bought, not seeded");
  const beforeBegin=JSON.parse(readFileSync(file,"utf8")).gameStates[0][1];
  const begin=(await secure("/fishing/Begin",castContext)).decoded;assert.equal(begin.result_code,1);
  assert.equal(begin.ret_data.log_id,1);assert.equal(begin.ret_data.fish_id,undefined);
  assert.deepEqual(JSON.parse(readFileSync(file,"utf8")).gameStates[0][1],beforeBegin);
  const pending=readFileSync(file);
  assert.deepEqual((await secure("/fishing/Begin",castContext)).decoded.ret_data,begin.ret_data);
  assert.deepEqual(readFileSync(file),pending);
  // Restore actual pending durable state and transport keys into a new app.
  await close();ctx=createApp(options);await listen();
  assert.deepEqual(readFileSync(file),pending);
  const caughtResponse=await secure("/fishing/EndWithSell",{log_id:"1",is_win:"1"}),caught=caughtResponse.decoded;
  assert.equal(caught.result_code,1);assert.deepEqual(caught.ret_data.item,[{inst_id:firstId+1,ref_id:castFish.id,added:1}]);
  assert.equal(caught.ret_data.user?.item,undefined,"Original ParseEnd reads ret_data.item, never user.item");
  assert.ok(caughtResponse.text.includes('"inst_id":'+(firstId+1)),"Full64-capable catch ID is numeric on encrypted wire");
  assert.deepEqual(caught.ret_data.consumed_inst_list,[{inst_id:firstId,qty:2}]);
  assert.deepEqual((await secure("/fishing/GetRecord",{})).decoded.ret_data,[{fish_id:castFish.id,grade:1,length:100}]);
  const caughtBytes=readFileSync(file);
  assert.equal((await secure("/fishing/EndWithSell",{log_id:"1",is_win:"0"})).decoded.result_code,10203);
  assert.deepEqual(readFileSync(file),caughtBytes,"No additive receipt or duplicate award on lost-response recovery");
  const sold=(await secure("/fishing/SellFish",{fish_id:castFish.id,grade:"1",qty:"1"})).decoded;
  assert.equal(sold.result_code,1);assert.equal(sold.ret_data.user.gold.cur,7011);
  assert.deepEqual(sold.ret_data.item,[{inst_id:firstId+1,qty:1}]);
  assert.equal((await secure("/fishing/Begin",castContext)).decoded.ret_data.log_id,2);
  const laterPending=readFileSync(file);
  assert.equal((await secure("/fishing/EndWithSell",{log_id:"1",is_win:"1"})).decoded.result_code,2001);
  assert.deepEqual(readFileSync(file),laterPending);
  const loss=(await secure("/fishing/EndWithSell",{log_id:"2",is_win:"0"})).decoded;
  assert.equal(loss.result_code,1);assert.deepEqual(loss.ret_data,{fish_id:"",grade:0,length:0,
    consumed_inst_list:[{inst_id:firstId,qty:2}],achievement:null});
  const settled=readFileSync(file),after=JSON.parse(settled.toString()),owner=after.gameStates[0][1];
  assert.equal(after.version,15);assert.equal(owner.items.find((item:any)=>item.inst_id===firstId).qty,6);
  assert.equal(owner.items.find((item:any)=>item.inst_id===firstId+1).qty,0);
  assert.equal(owner.gacha_free_qty,4);assert.equal(owner.gacha_iap_qty,20);assert.equal(owner.gold,7011);
  assert.deepEqual((await secure("/fishing/GetInven",{})).decoded.ret_data,[{fish_id:castFish.id,b_cnt:0,s_cnt:0,g_cnt:0}]);
  const ordinary=(await secure("/lobby/GetItemInven",{})).decoded.ret_data.item;
  assert.equal(ordinary.find((item:any)=>item.inst_id===firstId+1).qty,0);
  assert.deepEqual(after.gameStates[1],saved.gameStates[1]);assert.deepEqual(readFileSync(file),settled);
  await close();ctx=createApp({...options,fishingCastMode:"disabled",fishingCastPolicy:undefined});await listen();
  assert.equal((await secure("/fishing/Begin",castContext)).decoded.result_code,2001);
  assert.deepEqual((await secure("/fishing/GetRecord",{})).decoded.ret_data,[{fish_id:castFish.id,grade:1,length:100}]);
  assert.deepEqual(readFileSync(file),settled,"Disabled producer preserves its earned records and both inventories");
} finally {
  if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  Date.now=realNow;rmSync(dir,{recursive:true,force:true});
}
console.log("Configured fishing encrypted HTTP: actual purchased bait, pending app restart, full64 catch addition/owned debit, keep-to-sale, sentinel loss, records, terminal and stale replay, schema15 and disabled retention passed; authored data only, no native UI claim.");
