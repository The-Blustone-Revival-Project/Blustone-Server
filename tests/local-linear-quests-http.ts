import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {createApp} from "../src/server.js";
import {QUEST_CURRENCY_FIELDS} from "../src/quest-contracts.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-linear-http-")),file=path.join(dir,"state.json"),realNow=Date.now;
Date.now=()=>1800000000000;let server:ReturnType<typeof createServer>|undefined;
try {
  const seed=new ServerState("http://localhost",file,{questMode:"disabled"}),auth=seed.registerGuest({device_id:"linear-http-author"},{}).ret_data as any;
  const saved=JSON.parse(readFileSync(file,"utf8")),game=saved.gameStates[0][1];
  game.cleared_stage_ids=["n_01_01","n_01_02","n_01_05"];game.stage_achievements={n_01_01:[0],n_01_05:[0]};game.stage_stars={n_01_01:1,n_01_05:1};writeFileSync(file,JSON.stringify(saved));
  const reward={...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),gold:3,item_list:[],card_list:[]};
  const reference={id:"local_http_daily",type:2,title:"Local daily",desc:"",desc_noti:"",npc_id:"",go_to:"",serial:1,target_val:3,option_val:0,reward};
  const first={...reference,id:"local_http_linear_a",type:3,serial:11,target_val:1,reward:{...reward,gold:7}},second={...first,id:"local_http_linear_b",serial:22,reward:{...reward,gold:9}};
  const options={baseUrl:"http://127.0.0.1",stateFile:file,questMode:"local-fixed" as const,questPolicy:{period_id:"authored-linear-fixed",minimum_stage:"n_01_05",
    references:[reference],rules:[{id:reference.id,event:"mission-win",stage_id:null}],owners:{[auth.pvid]:[{daily_quest_id:reference.id,is_rewarded:0,cur_val:0}]},
    linear:{references:[first,second],rules:[{id:first.id,event:"mission-win",stage_id:"n_01_01"},{id:second.id,event:"mission-win",stage_id:"n_01_02"}]}}};
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
  assert.equal(lobby.ret_data.linear_quest[0].id,first.id);
  assert.equal(typeof lobby.ret_data.linear_quest[0].reward,"string");assert.equal(JSON.parse(lobby.ret_data.linear_quest[0].reward).gold,7);
  const ref=(await secure("/dailyquest/GetRefList",{})).ret_data[0];assert.equal(typeof ref.reward,"string");assert.equal(JSON.parse(ref.reward).gold,3);
  const claim=(row:typeof first)=>({id:row.id,serial:String(row.serial),target_val:String(row.target_val)});
  assert.equal((await secure("/linearquest/Reward",claim(first))).result_code,2001);
  const win=async(stage_id:string)=>{assert.equal((await secure("/mission/Start",{stage_id})).result_code,1);
    const result=await secure("/mission/Complete",{stage_id,play_info:JSON.stringify({clear:1,time:1,dead:0})});assert.equal(result.ret_data.accepted,true);return result;};
  assert.equal((await win("n_01_01")).ret_data.linear_quest[0].cur_val,1);
  const held=await win("n_01_02");assert.equal(held.ret_data.linear_quest[0].id,first.id);assert.equal(held.ret_data.linear_quest[0].cur_val,1,"Future task does not earn before its predecessor claim");
  const advanced=await secure("/linearquest/Reward",claim(first));assert.equal(advanced.result_code,1);assert.equal(advanced.ret_data.linear_quest[0].id,second.id);assert.equal(advanced.ret_data.linear_quest[0].cur_val,0);assert.deepEqual(advanced.ret_data.reward,{gold:{cur:10007}});
  const stable=readFileSync(file),old=await secure("/linearquest/Reward",claim(first));assert.equal(old.ret_data.linear_quest[0].id,second.id);assert.deepEqual(readFileSync(file),stable);
  assert.equal((await win("n_01_02")).ret_data.linear_quest[0].cur_val,1);
  const end=await secure("/linearquest/Reward",claim(second));assert.equal(end.result_code,1);const terminal=end.ret_data.linear_quest[0];
  assert.equal(terminal.id,"");for(const key of ["title","desc","npc_id","go_to"])assert.equal(terminal[key],"");
  for(const key of ["serial","target_val","option_val","cur_val"])assert.equal(terminal[key],0);
  const preview=JSON.parse(terminal.reward);assert.deepEqual(preview,{...Object.fromEntries(QUEST_CURRENCY_FIELDS.map(key=>[key,0])),item_list:[],card_list:[]});
  assert.deepEqual(end.ret_data.reward,{gold:{cur:10016}});assert.equal(end.ret_data.user,undefined);
  const bytes=readFileSync(file),replay=await secure("/linearquest/Reward",claim(first));assert.deepEqual(replay.ret_data.linear_quest,[terminal]);assert.deepEqual(replay.ret_data.reward,{gold:{cur:10016}});assert.deepEqual(readFileSync(file),bytes);
  assert.equal(JSON.parse(bytes.toString()).version,4);const restart=new ServerState(base,file,{questMode:"disabled"});
  assert.equal((restart as any).quests.get(auth.pvid).linear.index,2);assert.equal((restart as any).gameByPvid.get(auth.pvid).gold,10016);
}finally{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));Date.now=realNow;rmSync(dir,{recursive:true,force:true});}
console.log("Local linear quests encrypted HTTP: signed P384/AES transport, string reward previews, current-only earned progression, claimed advancement, current-cache replay, full empty-ID terminal clearing and schema4 restart passed; authored sequence only, no original records or native UI claim.");
