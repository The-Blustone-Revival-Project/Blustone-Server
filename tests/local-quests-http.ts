import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {createApp} from "../src/server.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-quests-http-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1800000000000;let server:ReturnType<typeof createServer>|undefined;
try {
  const seed=new ServerState("http://localhost",file,{questMode:"disabled"}),auth=seed.registerGuest({device_id:"quests-http-author"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates[0][1];
  game.cleared_stage_ids=["n_01_01","n_01_05"];game.stage_achievements={n_01_01:[0],n_01_05:[0]};game.stage_stars={n_01_01:1,n_01_05:1};writeFileSync(file,JSON.stringify(saved));
  const reward={...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),gold:7,item_list:[],card_list:[]};
  const reference={id:"local_http_victories",type:2,title:"Local victory task",desc:"Explicit local task",desc_noti:"",npc_id:"",go_to:"",serial:1,target_val:2,option_val:0,reward};
  const options={baseUrl:"http://127.0.0.1",stateFile:file,questMode:"local-fixed" as const,questPolicy:{period_id:"authored-fixed-test",minimum_stage:"n_01_05",
    references:[reference],rules:[{id:reference.id,event:"mission-win",stage_id:"n_01_01"}],owners:{[auth.pvid]:[{daily_quest_id:reference.id,is_rewarded:0,cur_val:0}]}}};
  const ctx=createApp(options);server=createServer(ctx.app);await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
  const address=server.address();if(!address||typeof address==="string")throw new Error("No disposable loopback address");const base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
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
    let text:string;const encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream")===true;
    if(encrypted){const decipher=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32)),decoded=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);
      assert.equal(response.headers.get("pv-signature"),sign(decoded));text=decoded.toString("utf8");}else text=await response.text();
    const result=JSON.parse(text);if(result.result_code===1)assert.equal(encrypted,true);return result;
  };
  const lobby=await secure("/lobby/Enter",{});assert.equal(lobby.result_code,1);assert.equal(lobby.ret_data.dailyquest_min_stage,"n_01_05");
  assert.equal((await secure("/dailyquest/GetRefList",{})).ret_data[0].id,reference.id);
  const wireReference=(await secure("/dailyquest/GetRefList",{})).ret_data[0];assert.equal(typeof wireReference.reward,"string");assert.equal(JSON.parse(wireReference.reward).gold,7);
  const claim={daily_quest_id:reference.id,target_val:"2"};assert.equal((await secure("/dailyquest/RequestReward",claim)).result_code,2001);
  for(let count=1;count<=2;count++) {
    const start=await secure("/mission/Start",{stage_id:"n_01_01"});assert.equal(start.result_code,1);
    const complete=await secure("/mission/Complete",{stage_id:"n_01_01",play_info:JSON.stringify({clear:1,time:1,dead:0})});assert.equal(complete.ret_data.accepted,true);
    assert.equal(complete.ret_data.dailyquest_min_stage,"n_01_05");assert.equal(complete.ret_data.daily_quest[0].cur_val,count,"Original mission callback parses inline lobby quest overlay");
    assert.equal((await secure("/dailyquest/GetInstList",{})).ret_data[0].cur_val,count);
    assert.equal((await secure("/mission/Complete",{stage_id:"n_01_01",play_info:JSON.stringify({clear:1})})).ret_data.accepted,false);
  }
  const claimed=await secure("/dailyquest/RequestReward",claim);assert.equal(claimed.result_code,1);assert.equal(claimed.ret_data.daily_quest[0].is_rewarded,1);
  assert.deepEqual(claimed.ret_data.reward,{gold:{cur:10007}});assert.equal(claimed.ret_data.user,undefined,"Special quest reward does not use generic SyncUser");
  const actor=(ctx.state as any).gameByPvid.get(auth.pvid);actor.gold+=13;(ctx.state as any).persist();const bytes=readFileSync(file);
  const replay=await secure("/dailyquest/RequestReward",claim);assert.deepEqual(replay.ret_data.reward,{gold:{cur:10020}});assert.deepEqual(readFileSync(file),bytes);
  const restart=new ServerState(base,file,{questMode:"disabled"});assert.equal((restart as any).quests.get(auth.pvid).instances[0].cur_val,2);
  assert.equal((restart as any).quests.get(auth.pvid).instances[0].is_rewarded,1);assert.equal((restart as any).gameByPvid.get(auth.pvid).gold,10020);
}finally{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Local fixed quests encrypted HTTP: bound signed P384/AES transport, references/lobby/instances, two new matching victories, duplicate refusal, earned gold claim/current-wallet replay and disabled-mode restart preservation passed; no original quest/event/reward/native UI claim.");
