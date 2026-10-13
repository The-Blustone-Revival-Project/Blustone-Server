import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {createApp} from "../src/server.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-dispatch-http-")),file=path.join(dir,"state.json"),realNow=Date.now;
let time=1_800_000_000_000;Date.now=()=>time;
const seed=new ServerState("http://localhost",file,{dispatchMode:"disabled"}),auth=seed.registerGuest({device_id:"dispatch-http-fixture"},{}).ret_data as any;
const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates[0][1];
game.decks.push({type:2,list:[game.starter_cards[0].inst_id,0,0,0,0]});
game.stage_achievements={n_01_01:[0],n_01_05:[1]};game.stage_stars={n_01_01:1,n_01_05:1};writeFileSync(file,JSON.stringify(saved));
const options={baseUrl:"http://127.0.0.1",stateFile:file,dispatchMode:"local-timed" as const,dispatchPolicy:{max_runs:2,gold_per_run:3,user_exp_per_run:5,card_exp_per_run:7,
  skip_price:1,entrust_second_per_cost:60,passes:{[auth.pvid]:{end_datetime:"1970-01-01 00:00:00",end_datetime_utc:0}}}};
const ctx=createApp(options),server=createServer(ctx.app);
try {
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("No loopback port");
  const base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
  const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
  const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
  const pub=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
  const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:pub,format:"der",type:"spki"})})).digest();
  const sign=(data:Buffer)=>crypto.createHmac("sha384",key).update(data).digest("base64");assert.equal(exchange.headers.get("pv-signature"),sign(pub));
  const secure=async(route:string,values:Record<string,string>)=>{
    const plaintext=Buffer.from(String(new URLSearchParams({...values,otp:String(auth.otp),pvid:String(auth.pvid)}))),aes=crypto.createCipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
    const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/octet-stream","pv-accesstoken":token,"pv-signature":sign(plaintext)},
      body:new Uint8Array(Buffer.concat([aes.update(plaintext),aes.final()]))});assert.equal(response.status,200);
    let text:string;const encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream")===true;
    if(encrypted){
      const decrypt=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));const plain=Buffer.concat([decrypt.update(Buffer.from(await response.arrayBuffer())),decrypt.final()]);
      assert.equal(response.headers.get("pv-signature"),sign(plain));text=plain.toString("utf8");
    }else text=await response.text();
    const decoded=JSON.parse(text,function(name,value,context?:{source:string}){return name==="entrust_id"&&typeof value==="number"?context?.source:value;});
    if(decoded.result_code===1)assert.equal(encrypted,true,"Successful native transport must remain encrypted, not merely JSON-compatible");
    return decoded;
  };
  assert.equal((await secure("/lobby/Enter",{})).result_code,1);
  const start=await secure("/mission/Entrust",{stage_id:"n_01_01",deck_type:"2",cnt:"1",is_tuto:"0"});
  assert.equal(start.result_code,1);assert.equal(start.ret_data.user.ap,49);const id=start.ret_data.entrust_id;assert.match(id,/^[1-9]\d*$/);
  const hydration=await secure("/lobby/GetMissionInst",{});assert.equal(hydration.ret_data.entrust.entrust_id,id);assert.equal(hydration.ret_data.entrust.pass.end_datetime_utc,0);
  assert.equal((await secure("/mission/RefreshEntrust",{entrust_id:id})).ret_data.list.length,1);
  assert.equal((await secure("/mission/EndEntrust",{entrust_id:id})).result_code,2001);
  time+=150000;
  const end=await secure("/mission/EndEntrust",{entrust_id:id});assert.equal(end.result_code,1);assert.equal(end.ret_data.user,null);
  assert.deepEqual(end.ret_data.result.gold,{prev:10000,cur:10003});assert.equal(end.ret_data.result.user_exp.ap.cur,49);assert.equal(end.ret_data.result.card_exp[0].cur,7);
  const bytes=readFileSync(file),replay=await secure("/mission/EndEntrust",{entrust_id:id});assert.deepEqual(replay.ret_data.result.gold,{prev:10003,cur:10003});
  assert.deepEqual(replay.ret_data.result.card_exp[0],{inst_id:game.starter_cards[0].inst_id,prev:7,cur:7});assert.deepEqual(readFileSync(file),bytes);
  const restart=new ServerState(base,file,{dispatchMode:"local-timed",dispatchPolicy:options.dispatchPolicy});
  assert.equal((restart as any).dispatches.get(auth.pvid).last_id,id);assert.equal((restart as any).gameByPvid.get(auth.pvid).gold,10003);
}finally{
  if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  Date.now=realNow;rmSync(dir,{recursive:true,force:true});
}
console.log("Local dispatch encrypted HTTP: signed P384 exchange, bound lobby, exact64 Start/hydration/Refresh, elapsed End/AP/EXP/Gold, lost-reply repair and restart passed on disposable server; no native UI/live policy activation.");
