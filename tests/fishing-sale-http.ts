import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {createApp} from "../src/server.js";

// Authored imported inventories/prices only: no original catch/drop claim.
const dir=mkdtempSync(path.join(tmpdir(),"blustone-fishing-sale-http-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1_800_000_000_000;
let server:ReturnType<typeof createServer>|undefined;
try {
  const seed=new ServerState("http://localhost",file,{fishingSaleMode:"disabled"});
  const auth=seed.registerGuest({device_id:"fishing-http-owner"},{}).ret_data as any;
  seed.registerGuest({device_id:"fishing-http-peer"},{});
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates[0][1],stackId=4_294_967_307;
  game.items=[{inst_id:stackId,ref_id:"AUTHORED_FISH",qty:3,lock:0},{inst_id:8,ref_id:"unrelated",qty:7,lock:1}];
  game.next_item_inst_id=stackId+1;game.owned_fish=[{fish_id:"AUTHORED_FISH",b_cnt:3,s_cnt:0,g_cnt:0}];
  writeFileSync(file,JSON.stringify(saved));
  const options={baseUrl:"http://127.0.0.1",stateFile:file,fishingSaleMode:"local-bound" as const,
    fishingItems:[{id:"AUTHORED_FISH",name:"Authored fish",desc:"",thumbnail_id:"",effect:"",rank:1,use_type:17,sell_price:0,collect_qty:0}],
    fishingCatalogue:{pools:[],prices:[{fish_id:"AUTHORED_FISH",b_price:11,s_price:22,g_price:33}]},
    fishingSaleBindings:{[auth.pvid]:[{fish_id:"AUTHORED_FISH",grade:1,inst_id:stackId}]}};
  const ctx=createApp(options);server=createServer(ctx.app);
  await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("No disposable loopback port");
  const base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
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
  // Establish existing lazy inventory/day metadata before measuring sale/recovery.
  assert.equal((await secure("/lobby/GetItemInven",{})).decoded.result_code,1);
  const sale={fish_id:"AUTHORED_FISH",grade:"1",qty:"3"};
  const response=await secure("/fishing/SellFish",sale),sold=response.decoded;
  assert.equal(sold.result_code,1);assert.equal(sold.ret_data.sell,undefined,"Standalone sale has no EndWithSell wrapper");
  assert.deepEqual(sold.ret_data.user.gold,{prev:10000,cur:10033});
  assert.deepEqual(sold.ret_data.item,[{inst_id:stackId,qty:3}],"Exact full64-capable ID and removal delta, not absolute remaining quantity");
  assert.ok(response.text.includes('"inst_id":'+stackId),"Wire ID must remain numeric and retain its high word");
  assert.deepEqual(sold.ret_data.sell_result,{fish_id:"AUTHORED_FISH",b_cnt:0,s_cnt:0,g_cnt:0});
  const settled=readFileSync(file);
  assert.equal((await secure("/fishing/SellFish",sale)).decoded.result_code,2001,"An unavailable repeat cannot debit stacks or re-credit gold");
  assert.deepEqual(readFileSync(file),settled);
  // These reads prove authoritative HTTP data. Native GetInven inserts missing
  // fish keys and does NOT overwrite an existing stale count cache. Only the
  // ordinary GetItemInven zero tombstone is a source-backed upsert repair here.
  const counts=(await secure("/fishing/GetInven",{})).decoded;
  assert.deepEqual(counts.ret_data,[{fish_id:"AUTHORED_FISH",b_cnt:0,s_cnt:0,g_cnt:0}]);
  const inventory=(await secure("/lobby/GetItemInven",{})).decoded.ret_data.item;
  assert.deepEqual(inventory.find((row:any)=>row.inst_id===stackId),{inst_id:stackId,ref_id:"AUTHORED_FISH",qty:0,lock:0},"Zero tombstone repairs a stale native item cache");
  assert.deepEqual(inventory.find((row:any)=>row.inst_id===8),{inst_id:8,ref_id:"unrelated",qty:7,lock:1});
  assert.deepEqual(readFileSync(file),settled,"Authoritative ownership reads preserve state at this fixed clock");
  const restart=new ServerState(base,file,options),restored=(restart as any).gameByPvid.get(auth.pvid);
  assert.equal(restored.gold,10033);assert.equal(restored.items.find((row:any)=>row.inst_id===stackId).qty,0);
  assert.deepEqual(restored.owned_fish,counts.ret_data);assert.equal(restored.next_item_inst_id,stackId+1);
  const persisted=JSON.parse(settled.toString());assert.deepEqual(persisted.gameStates[1],saved.gameStates[1],"Peer gameplay is unchanged");
  assert.deepEqual(readFileSync(file),settled,"Restart does not grant catches or repeat settlement");
}finally{
  const listener=server;if(listener?.listening)await new Promise<void>((resolve,reject)=>listener.close(error=>error?reject(error):resolve()));
  Date.now=realNow;rmSync(dir,{recursive:true,force:true});
}
console.log("Fishing sale encrypted HTTP: independent signed P384/AES transport, explicit bound imported fish, full64 removal delta and absolute gold/counts, insufficient-repeat refusal, zero-tombstone inventory repair, peer isolation and restart passed; no catches/original prices/native UI claim.");
