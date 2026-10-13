import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState,NativeAuthError} from "../src/state.js";
import {createApp} from "../src/server.js";
import {gameResponse} from "../src/game-routes.js";
import {mirageEndRefusal} from "../src/mirage.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-mirage-refusal-")),file=path.join(dir,"state.json");
let server:ReturnType<typeof createServer>|undefined;
try {
  const state=new ServerState("http://localhost",file),auth=state.registerGuest({device_id:"mirage-refusal-author"},{}).ret_data as any;
  const game=(state as any).gameByPvid.get(auth.pvid);game.starter_cards[0].mirage_remain_hp=425;(state as any).persist();
  const bytes=readFileSync(file),before=structuredClone(game);
  for(const values of [auth,{}, {...auth,otp:"wrong"},{...auth,pvid:999999}]) {
    const result=gameResponse(state,"/mirage/End",{...values,floor:2,stair:1,remain_deck_hp:'[{"inst_id":1000001,"hp_percent":10000}]'}) as any;
    assert.notEqual(result.result_code,1);assert.equal(Object.hasOwn(result,"ret_data"),false);assert.equal(Object.hasOwn(result,"data"),false);
    assert.equal(Object.hasOwn(JSON.parse(JSON.stringify(result)),"ret_data"),false,"Wire absence, not null, controls native key-existence parser branch");
    assert.deepEqual(game,before);assert.deepEqual(readFileSync(file),bytes);
  }
  assert.equal(Object.hasOwn(mirageEndRefusal(),"ret_data"),false);
  const ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file});server=createServer(ctx.app);
  await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));const address=server.address();if(!address||typeof address==="string")throw new Error("Missing disposable address");
  for(const values of [auth,{}, {...auth,otp:"wrong"}]) {
    const response:Response=await fetch(`http://127.0.0.1:${address.port}/mirage/End`,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams(Object.fromEntries(["pvid","otp"].filter(key=>Object.hasOwn(values,key)).map(key=>[key,String(values[key])])))});
    assert.equal(response.status,200);const body=await response.json() as any;assert.notEqual(body.result_code,1);assert.equal(Object.hasOwn(body,"ret_data"),false);assert.equal(Object.hasOwn(body,"data"),false);
  }
  assert.deepEqual(readFileSync(file),bytes);assert.deepEqual((ctx.state as any).gameByPvid.get(auth.pvid),before);
  const base=`http://127.0.0.1:${address.port}`;
  const exchange=async()=>{
    const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
    const response=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
    assert.equal(response.status,200);const pub=Buffer.from(await response.arrayBuffer()),token=response.headers.get("pv-accesstoken");assert.ok(token);
    const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,
      publicKey:crypto.createPublicKey({key:pub,format:"der",type:"spki"})})).digest();
    const sign=(value:Buffer)=>crypto.createHmac("sha384",key).update(value).digest("base64");
    assert.equal(response.headers.get("pv-signature"),sign(pub),"Independent client verifies signed P384 exchange");
    return {token,key,sign};
  };
  const bound=await exchange(),unbound=await exchange();
  const encrypt=(session:typeof bound,values:Record<string,string>)=>{
    const plain=Buffer.from(new URLSearchParams(values).toString()),cipher=crypto.createCipheriv("aes-256-cbc",session.key.subarray(0,32),session.key.subarray(32));
    return {body:Buffer.concat([cipher.update(plain),cipher.final()]),signature:session.sign(plain)};
  };
  const lobbyPacket=encrypt(bound,{pvid:String(auth.pvid),otp:String(auth.otp)});
  const bind=await fetch(base+"/lobby/Enter",{method:"POST",headers:{"content-type":"application/octet-stream","pv-accesstoken":bound.token,
    "pv-signature":lobbyPacket.signature},body:new Uint8Array(lobbyPacket.body)});
  assert.equal(bind.status,200);assert.match(bind.headers.get("content-type")??"",/^application\/octet-stream/);
  const decipher=crypto.createDecipheriv("aes-256-cbc",bound.key.subarray(0,32),bound.key.subarray(32));
  const lobbyPlain=Buffer.concat([decipher.update(Buffer.from(await bind.arrayBuffer())),decipher.final()]);
  assert.equal(bind.headers.get("pv-signature"),bound.sign(lobbyPlain));assert.equal(JSON.parse(lobbyPlain.toString()).result_code,1);
  // Exchange/binding legitimately persists transport metadata. Capture the
  // private fixture AFTER that setup; End/error paths must change nothing.
  const secureBytes=readFileSync(file),secureGame=structuredClone((ctx.state as any).gameByPvid.get(auth.pvid));
  const postEnd=async(body:Buffer,token:string|undefined,signature:string)=>{
    const response=await fetch(base+"/mirage/End",{method:"POST",headers:{"content-type":"application/octet-stream",
      ...(token?{"pv-accesstoken":token}:{}),"pv-signature":signature},body:new Uint8Array(body)});
    assert.equal(response.status,200);assert.match(response.headers.get("content-type")??"",/^application\/json/,"Native non-success is plaintext JSON");
    const result=await response.json() as any;assert.notEqual(result.result_code,1);
    assert.equal(Object.hasOwn(result,"ret_data"),false);assert.equal(Object.hasOwn(result,"data"),false);
    assert.deepEqual(readFileSync(file),secureBytes);assert.deepEqual((ctx.state as any).gameByPvid.get(auth.pvid),secureGame);
    return result;
  };
  const values={app_code:"_SR",app_ver:"2.8.0.1",market:"LOCAL",pvid:String(auth.pvid),otp:String(auth.otp),floor:"2",stair:"1",
    remain_deck_hp:'[{"inst_id":1000001,"hp_percent":10000}]',remain_enemy_hp:"[0]"};
  const valid=encrypt(bound,values);const unavailable=await postEnd(valid.body,bound.token,valid.signature);
  assert.match(unavailable.error,/not reconstructed/);
  const wrongOtp=encrypt(unbound,{...values,otp:"wrong"});const rejected=await postEnd(wrongOtp.body,unbound.token,wrongOtp.signature);
  assert.match(rejected.error,/authenticated/);
  const missing=encrypt(unbound,{floor:"2",stair:"1"});await postEnd(missing.body,unbound.token,missing.signature);
  await postEnd(Buffer.from([1,2,3]),"unknown-exchange-key","corrupted-signature");
  await postEnd(Buffer.from([1,2,3]),unbound.token,"corrupted-signature");
  await postEnd(valid.body,undefined,valid.signature);
  // This research server does not verify inbound HMAC and may authenticate a
  // bound session without OTP. The cases above make NO contrary hardening claim.
  // Isolated fault injection, explicitly labelled: exercise outer stateCall's
  // NativeAuthError shape independently of the route's own authentication catch.
  const originalMirage=ctx.state.mirageAction;let outerFaultReached=false;
  ctx.state.mirageAction=function(route,payload,headers){
    assert.equal(route,"/mirage/End");assert.equal(payload.floor,"2");assert.ok(headers["pv-accesstoken"]);
    outerFaultReached=true;throw new NativeAuthError(2001,"fixture global NativeAuthError");
  };
  try {assert.match((await postEnd(valid.body,bound.token,valid.signature)).error,/fixture global/);assert.equal(outerFaultReached,true);}
  finally {ctx.state.mirageAction=originalMirage;}
}finally{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));rmSync(dir,{recursive:true,force:true});}
console.log("Mirage End refusal: SDK/plain HTTP and independently signed P384/AES requests, unbound wrong/missing credentials, unknown-key/malformed decode and labelled outer NativeAuthError fault injection all omit data subtrees with private fixture/game unchanged; no inbound HMAC hardening, native UI or End settlement claim.");
