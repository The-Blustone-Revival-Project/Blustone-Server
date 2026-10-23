import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {repositoryPath} from "../src/paths.js";
import {polishRefs,polishPrices,suppliedGem,polishPolicy} from "./gem-polish-fixture.js";
const env={...process.env},clock=Date.now,dir=mkdtempSync(path.join(tmpdir(),"blustone-polish-http-")),file=path.join(dir,"state.json");
Date.now=()=>1_800_000_000_000;let server:ReturnType<typeof createServer>|undefined;
try {
  for(const key of Object.keys(process.env))if(key.startsWith("BLUSTONE_"))delete process.env[key];
  Object.assign(process.env,JSON.parse(readFileSync(repositoryPath("config/profiles/current-e6-gems.json"),"utf8")).env);
  process.env.BLUSTONE_GEM_REFERENCE_JSON=JSON.stringify(polishRefs);
  process.env.BLUSTONE_GEM_LEVEL_PRICES_JSON=JSON.stringify(polishPrices);
  const {ServerState}=await import("../src/state.js"),{createApp}=await import("../src/server.js");
  const {parseStateWithGemIds}=await import("../src/gem-wire.js");
  const seed=new ServerState("http://localhost",file),auth=seed.registerGuest({device_id:"polish-http-owner"},{}).ret_data as any;
  seed.registerGuest({device_id:"polish-http-peer"},{});
  const prior=JSON.parse(readFileSync(file,"utf8"));prior.gameStates[0][1].owned_gems=[suppliedGem()];prior.gameStates[0][1].gold=1000;
  writeFileSync(file,JSON.stringify(prior));
  const options={baseUrl:"http://127.0.0.1",stateFile:file,gemPolishMode:"local-supplied-sequence" as const,gemPolishPolicy:polishPolicy(auth.pvid)};
  let ctx=createApp(options),base="";
  const listen=async()=>{server=createServer(ctx.app);await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("No ephemeral port");base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;};
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
    const decoded=parseStateWithGemIds(text) as any;if(decoded.result_code===1)assert.equal(encrypted,true,"Successful replies require native encrypted transport");
    return {decoded,text};
  };
  assert.equal((await secure("/lobby/Enter",{})).decoded.result_code,1);
  const stable=readFileSync(file);
  assert.equal((await secure("/gem/LevelUp",{inst_id:suppliedGem().inst_id,max_tries:"0"})).decoded.result_code,2001);
  assert.deepEqual(readFileSync(file),stable);
  const failed=await secure("/gem/LevelUp",{inst_id:suppliedGem().inst_id,max_tries:"1"});
  assert.equal(failed.decoded.result_code,1);assert.equal(failed.decoded.ret_data.tries,1);
  assert.equal(failed.decoded.ret_data.gem.level,1);assert.equal(failed.decoded.ret_data.gem.abilities.level_up_failed,1);
  assert.ok(failed.text.includes('"inst_id":18446744073709551615'));assert.deepEqual(failed.decoded.ret_data.user,{gold:{cur:990},item:[]});
  assert.equal(failed.decoded.ret_data.achievement,null);
  const firstBytes=readFileSync(file);
  await close();ctx=createApp(options);await listen();assert.deepEqual(readFileSync(file),firstBytes);
  const success=(await secure("/gem/LevelUp",{inst_id:suppliedGem().inst_id,max_tries:"10"})).decoded;
  assert.equal(success.result_code,1);assert.equal(success.ret_data.tries,2);assert.deepEqual(success.ret_data.gem,suppliedGem(2,0,"250"));
  assert.deepEqual(success.ret_data.user,{gold:{cur:970},item:[]});
  const inventory=(await secure("/lobby/GetGemInven",{})).decoded.ret_data;
  assert.deepEqual(inventory,[suppliedGem(2,0,"250")]);
  const saved=JSON.parse(readFileSync(file,"utf8"));assert.equal(saved.version,16);
  assert.deepEqual(saved.gameStates[1],prior.gameStates[1]);
  assert.deepEqual(saved.gameStates[0][1],{...prior.gameStates[0][1],gold:970,owned_gems:[suppliedGem(2,0,"250")]});
  const beforeDisabled=readFileSync(file);
  await close();ctx=createApp({baseUrl:options.baseUrl,stateFile:file});await listen();
  assert.equal((await secure("/gem/LevelUp",{inst_id:suppliedGem().inst_id,max_tries:"1"})).decoded.result_code,2001);
  assert.deepEqual((await secure("/lobby/GetGemInven",{})).decoded.ret_data,inventory);
  assert.deepEqual(readFileSync(file),beforeDisabled);
} finally {
  if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  for(const key of Object.keys(process.env))if(!Object.hasOwn(env,key))delete process.env[key];Object.assign(process.env,env);
  Date.now=clock;rmSync(dir,{recursive:true,force:true});
}
console.log("Supplied Gem polish encrypted HTTP: full64 exact numeric Gem ID, accepted failure, two-try stop-success with supplied main/sub, absolute signed gold, replacement app/persisted client keys, peer/state preservation and disabled retention passed; authored transitions only, no original RNG or native UI claim.");
