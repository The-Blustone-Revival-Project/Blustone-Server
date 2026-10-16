import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {ServerState} from "../src/state.js";
import {createApp} from "../src/server.js";
import {ARENA_RIVAL_PVID} from "../src/arena.js";

const dir=mkdtempSync(path.join(tmpdir(),"blustone-global-rank-http-")),file=path.join(dir,"state.json"),clock=Date.now;
Date.now=()=>1_800_000_000_000;
let server:ReturnType<typeof createServer>|undefined;
try {
  const seed=new ServerState("http://localhost",file);
  const actors=["global-http-self","global-http-peer","global-http-third"].map(device_id=>seed.registerGuest({device_id},{}).ret_data as any);
  let ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file}),base="";
  const listen=async()=>{
    server=createServer(ctx.app);await new Promise<void>(resolve=>server!.listen(0,"127.0.0.1",resolve));
    const address=server.address();if(!address||typeof address==="string")throw new Error("No ephemeral loopback port");
    base=`http://127.0.0.1:${address.port}`;ctx.state.baseUrl=base;
  };
  const close=async()=>{if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));};
  await listen();
  const client=async(auth:any)=>{
    const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
    const exchange=await fetch(base+"/shared_secret/Exchange",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},
      body:new URLSearchParams({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")})});
    assert.equal(exchange.status,200);const bytes=Buffer.from(await exchange.arrayBuffer()),token=exchange.headers.get("pv-accesstoken");assert.ok(token);
    const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,
      publicKey:crypto.createPublicKey({key:bytes,format:"der",type:"spki"})})).digest();
    const sign=(value:Buffer)=>crypto.createHmac("sha384",key).update(value).digest("base64");assert.equal(exchange.headers.get("pv-signature"),sign(bytes));
    return async(route:string,extra:Record<string,string>={})=>{
      const plain=Buffer.from(String(new URLSearchParams({...extra,pvid:String(auth.pvid),otp:String(auth.otp)})));
      const cipher=crypto.createCipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
      const response=await fetch(base+route,{method:"POST",headers:{"content-type":"application/octet-stream","pv-accesstoken":token,"pv-signature":sign(plain)},
        body:new Uint8Array(Buffer.concat([cipher.update(plain),cipher.final()]))});assert.equal(response.status,200);
      const encrypted=response.headers.get("content-type")?.startsWith("application/octet-stream")===true;
      let text:string;
      if(encrypted){
        const decipher=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));
        const value=Buffer.concat([decipher.update(Buffer.from(await response.arrayBuffer())),decipher.final()]);
        assert.equal(response.headers.get("pv-signature"),sign(value));text=value.toString("utf8");
      }else text=await response.text();
      const result=JSON.parse(text);if(result.result_code===1)assert.equal(encrypted,true);return result;
    };
  };
  const clients=await Promise.all(actors.map(client));
  for(const call of clients)assert.equal((await call("/lobby/Enter")).result_code,1);
  const [self,peer]=clients;
  assert.equal((await self("/arena/GetGlobalRankList",{page:"1",page_scale:"10"})).result_code,2001);
  for(let index=0;index<clients.length;index++) {
    const call=clients[index];assert.equal((await call("/arena/Enter")).result_code,1);
    const owned=(await call("/lobby/GetCardInven")).ret_data;
    assert.ok(Array.isArray(owned));
    const members=owned.slice(0,4).map((card:any)=>card.inst_id);
    assert.equal((await call("/world/SetDeck",{deck_info:JSON.stringify([{type:5,list:[...members,0]}])})).result_code,1);
    const wins=index===0?1:index===1?2:0;
    for(let win=0;win<wins;win++) {
      assert.equal((await call("/arena/BattleStart",{target_pvid:String(ARENA_RIVAL_PVID),bid:"0",is_revenge:"0",is_friendship:"0"})).result_code,1);
      assert.equal((await call("/arena/BattleComplete",{target_pvid:String(ARENA_RIVAL_PVID),is_revenge:"0",play_info:JSON.stringify({is_win:1,
        clear_time:10,dead_cnt:0,player_total_hp:100,player_total_hp_max:100,enemy_total_hp:0,enemy_total_hp_max:300,atk_max:181,atk_total:300,atk_cnt:2})})).result_code,1);
    }
  }
  const stable=readFileSync(file),page=(await self("/arena/GetGlobalRankList",{page:"1",page_scale:"2"}));
  assert.equal(page.result_code,1);assert.equal(page.ret_data.season_no,1);
  assert.deepEqual(page.ret_data.list.map((r:any)=>[r.battle.pvid,r.battle.rank,r.battle.rating_point]),[[actors[1].pvid,1,20],[actors[0].pvid,2,10]]);
  for(const rival of page.ret_data.list) {
    assert.deepEqual(Object.keys(rival).sort(),["nickname","thumbnail","profile_status","country_code","status","user_exp","vip_exp","chain_bonus","card_book","battle","deck","gem"].sort());
    assert.deepEqual(Object.keys(rival.deck),["inst_1","inst_2","inst_3","inst_4","inst_5"]);
    assert.deepEqual(rival.gem,[]);assert.deepEqual(rival.chain_bonus,[]);
  }
  const second=await self("/arena/GetGlobalRankList",{page:"2",page_scale:"2"});assert.equal(second.result_code,1);
  assert.deepEqual(second.ret_data.list.map((r:any)=>[r.battle.pvid,r.battle.rank]),[[actors[2].pvid,3]]);
  assert.deepEqual((await self("/arena/GetGlobalRankList",{page:"4294967295",page_scale:"100"})).ret_data.list,[]);
  assert.equal((await self("/arena/GetGlobalRankList",{page:"0",page_scale:"10"})).result_code,2001);
  assert.deepEqual(readFileSync(file),stable,"Pages and refusals do not alter clocks, rankings, cards or session state");
  assert.equal((await peer("/relation/Block",{target_list:JSON.stringify([actors[0].pvid])})).result_code,1);
  const blocked=readFileSync(file),visible=await self("/arena/GetGlobalRankList",{page:"1",page_scale:"10"});
  assert.deepEqual(visible.ret_data.list.map((r:any)=>r.battle.rank),[2,3]);assert.deepEqual(readFileSync(file),blocked);
  // Recreate app/server from disk; original independent client sessions remain valid.
  await close();ctx=createApp({baseUrl:"http://127.0.0.1",stateFile:file});await listen();
  const restored=await self("/arena/GetGlobalRankList",{page:"1",page_scale:"10"});assert.equal(restored.result_code,1);
  assert.deepEqual(restored.ret_data,visible.ret_data);assert.deepEqual(readFileSync(file),blocked);
} finally {
  if(server?.listening)await new Promise<void>((resolve,reject)=>server!.close(error=>error?reject(error):resolve()));
  Date.now=clock;rmSync(dir,{recursive:true,force:true});
}
console.log("Global ranking encrypted HTTP: independent actual accounts/registered defense5/earned local ratings, complete native Defender pages, rank-preserving blocks, zero-write paging/refusal and restored app with persisted client keys passed; no native UI/peer ranked-combat claim.");
