import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
process.env.BLUSTONE_SKILL_MATERIAL_PRICES_JSON=JSON.stringify([1,2,3,4].flatMap(role=>[2,3].map(level=>({role,level,
  source_1_ref_id:"AIRSHIP_TICKET",source_1_qty:level,source_2_ref_id:"",source_2_qty:0,
  source_3_ref_id:"",source_3_qty:0,source_4_ref_id:"",source_4_qty:0}))));
const {ServerState}=await import("../src/state.js"),{createApp}=await import("../src/server.js");
const dir=mkdtempSync(path.join(tmpdir(),"blustone-skill-material-http-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1800000000000;let server:ReturnType<typeof createServer>|undefined;
try {
  const seed=new ServerState("http://localhost",file),auth=seed.registerGuest({device_id:"skill-material-http-author"},{}).ret_data as any;
  seed.registerGuest({device_id:"skill-material-http-peer"},{});
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates[0][1],target=game.starter_cards[0],first=4294967301,second=4294967302;
  game.items=[{inst_id:first,ref_id:"AIRSHIP_TICKET",qty:2,lock:0},{inst_id:second,ref_id:"AIRSHIP_TICKET",qty:5,lock:0},
    {inst_id:9,ref_id:"AIRSHIP_TICKET",qty:8,lock:1}];game.next_item_inst_id=second+1;writeFileSync(file,JSON.stringify(saved));
  const ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file});server=createServer(ctx.app);
  await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));const address=server.address();if(!address||typeof address==="string")throw new Error("No disposable address");
  const base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
  const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
  const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
  const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
  const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:pub,format:"der",type:"spki"})})).digest();
  const sign=(data:Buffer)=>crypto.createHmac("sha384",key).update(data).digest("base64");assert.equal(exchange.headers.get("pv-signature"),sign(pub));
  const secure=async(route:string,values:Record<string,string>)=>{
    const plain=Buffer.from(String(new URLSearchParams({...values,otp:String(auth.otp),pvid:String(auth.pvid)}))),cipher=crypto.createCipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/octet-stream","pv-accesstoken":token,"pv-signature":sign(plain)},
      body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,200);
    const encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream")===true;let text:string;
    if(encrypted){const decipher=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32)),bytes=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);assert.equal(response.headers.get("pv-signature"),sign(bytes));text=bytes.toString("utf8");}
    else text=await response.text();const decoded=JSON.parse(text);if(decoded.result_code===1)assert.equal(encrypted,true);return decoded;
  };
  assert.equal((await secure("/lobby/Enter",{})).result_code,1);
  const prices=(await secure("/reference/GetLevel",{})).ret_data.skill;
  assert.ok(prices.filter((row:any)=>row.level===2).every((row:any)=>row.source_1_ref_id==="AIRSHIP_TICKET"&&row.source_1_qty===2));
  const single=await secure("/gym/SkillUp",{target_inst_id:String(target.inst_id),skill_idx:"1"});assert.equal(single.result_code,1);
  assert.deepEqual(single.ret_data.consumed_inst_list,[{inst_id:first,qty:2}]);assert.deepEqual(single.ret_data.user.gold,{prev:10000,cur:9800});
  const multi=await secure("/gym/MultiSkillUp",{target_inst_id:String(target.inst_id),mulit_skill_up_count:"[1,0,0,0,0]"});assert.equal(multi.result_code,1);
  assert.deepEqual(multi.ret_data.consumed_inst_list,[{inst_id:second,remain:2}]);assert.deepEqual(multi.ret_data.user.gold,{prev:9800,cur:9500});
  const inv=(await secure("/lobby/GetItemInven",{})).ret_data.item;assert.equal(inv.find((row:any)=>row.inst_id===first).qty,0);assert.equal(inv.find((row:any)=>row.inst_id===second).qty,2);assert.equal(inv.find((row:any)=>row.inst_id===9).qty,8);
  const before=readFileSync(file),restart=new ServerState(base,file),actor=(restart as any).gameByPvid.get(auth.pvid);
  assert.equal(actor.starter_cards[0].skill_1_level,3);assert.equal(actor.gold,9500);assert.deepEqual(actor.items,inv);assert.deepEqual(readFileSync(file),before);
  assert.deepEqual(JSON.parse(before.toString()).gameStates[1],saved.gameStates[1]);
}finally{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Configured skill materials encrypted HTTP: independent signed P384/AES exchange, shared role prices, single full64 qty delta and multi full64 absolute remain, zero/locked inventory, gold/skill debit, restart and peer preservation passed; authored recipes only, no original material mapping/native UI claim.");
