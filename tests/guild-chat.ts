import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {WebSocket} from "ws";
import {ServerState} from "../src/state.js";
import {attachGuildChat} from "../src/guild-chat.js";
import {attachLocalChat} from "../src/chat-service.js";
import {encodeChatFrame,decodeChatFrame} from "../src/chat-frame.js";
import {encodeChatRequest,decodeChatResponse,parseReceivedGuildPayload,type ChatResponse} from "../src/chat-message.js";
import {gameResponse} from "../src/game-routes.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-guild-chat-"));
const sockets:WebSocket[]=[];const server=createServer();let service:ReturnType<typeof attachGuildChat>|undefined;
const until=async(test:()=>boolean)=>{const end=Date.now()+5000;while(!test()){if(Date.now()>end)throw new Error("Guild Chat fixture timed out");await new Promise(resolve=>setTimeout(resolve,10));}};
try {
  const file=path.join(dir,"state.json"),state=new ServerState("http://localhost",file,{guildChatMode:"local-memory",publicChatMode:"local-memory"});
  const actors=["alpha","beta","other","unjoined"].map(name=>{
    const auth=state.registerGuest({device_id:`guild-chat-${name}`,nickname:name},{}).ret_data as any;
    const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
    const exchange=state.exchangeSecret({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")});
    const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,
      publicKey:crypto.createPublicKey({key:exchange.body,format:"der",type:"spki"})})).digest();
    state.accountFor(auth,{"pv-accesstoken":exchange.accessToken});
    const encrypt=(data:Buffer)=>{const aes=crypto.createCipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));return Buffer.concat([aes.update(data),aes.final()]);};
    const decrypt=(data:Buffer)=>{const aes=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));return Buffer.concat([aes.update(data),aes.final()]);};
    return {auth,token:exchange.accessToken,encrypt,decrypt};
  });
  const member=(actor:typeof actors[number],role:number)=>({pvid:actor.auth.pvid,contribution:0,newbie:0,role,fc_point:0});
  const record=(id:number,members:unknown[])=>({id,name:`Authored${id}`,type:1,fc_point_limit:0,contribution:0,region:"",emblem_id:"GD_IMG_1",desc:"",rank:0,gvg_win_cnt:0,gvg_inf_win_cnt:0,members});
  (state as any).guilds=[record(7001,[member(actors[0],1),member(actors[1],3)]),record(7002,[member(actors[2],1)])];
  (state as any).guilds[0].members[1].role=4;(state as any).guilds[0].members[1].newbie=1;
  (state as any).guildPending=[{pvid:actors[3].auth.pvid,guild_id:7001,desc:"",fc_point:0,applied:1}];
  (state as any).persist();const bytes=readFileSync(file);
  assert.equal(state.baseInfo().url_list.find(row=>row.url_key==="guild_chat")?.address,"ws://localhost/chat/guild");
  assert.deepEqual((gameResponse(state,"/guild/GetChattingLog",actors[0].auth) as any).ret_data,[]);
  assert.throws(()=>gameResponse(state,"/guild/GetChattingLog",{}),/authenticated/);
  service=attachGuildChat(server,state);await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  assert.equal(attachLocalChat(server,state),service,"Guild compatibility/public entry points share exactly one upgrade dispatcher");
  assert.equal(server.listenerCount("upgrade"),1);
  const url=`ws://127.0.0.1:${(server.address() as any).port}/chat/guild`;
  const connect=async(actor:typeof actors[number],token=actor.token,address=url)=>{
    const ws=new WebSocket(address,{headers:{"X-PV-AccessToken":token},perMessageDeflate:false});sockets.push(ws);
    const inbox:ChatResponse[]=[],faults:unknown[]=[];let closed=false;
    ws.on("error",()=>{});ws.on("close",()=>closed=true);
    ws.on("message",data=>{try{inbox.push(decodeChatResponse(decodeChatFrame(data as Buffer,actor.decrypt).toString("utf8")));}catch(error){faults.push(error);}});
    await new Promise<void>((resolve,reject)=>{ws.once("open",resolve);ws.once("error",reject);});
    return {ws,inbox,faults,get closed(){return closed;}};
  };
  await assert.rejects(()=>connect(actors[0],"unknown"));
  await assert.rejects(()=>connect(actors[3]));
  const a=await connect(actors[0]),b=await connect(actors[1]),c=await connect(actors[2]);
  const publicPeer=await connect(actors[0],actors[0].token,url.replace("/chat/guild","/chat/public"));
  await until(()=>publicPeer.inbox.length===1);assert.equal(publicPeer.inbox[0].command,1);
  publicPeer.ws.send(encodeChatFrame(Buffer.from(encodeChatRequest({command:20000,tag:"1",version:"AUTHORED",utc:1,payload:{channel:7}})),actors[0].encrypt));
  await until(()=>publicPeer.inbox.length===2);
  publicPeer.ws.send(encodeChatFrame(Buffer.from(encodeChatRequest({command:10010,tag:"2",version:"AUTHORED",utc:1,payload:{message:"public only",type:10002}})),actors[0].encrypt));
  await until(()=>publicPeer.inbox.length===3);assert.equal(a.inbox.length,0);assert.equal(b.inbox.length,0);
  const malformed=await connect(actors[0]);malformed.ws.send(Buffer.from([0]));await until(()=>malformed.closed);
  const text=await connect(actors[0]);text.ws.send("plaintext");await until(()=>text.closed);
  const send=(socket:WebSocket,actor:typeof actors[number],message:string,type=11000,extra={})=>socket.send(encodeChatFrame(Buffer.from(encodeChatRequest({command:11000,tag:"18446744073709551615",version:"AUTHORED",utc:1,
    payload:{message,type,...extra}})),actor.encrypt));
  send(a.ws,actors[0],"길드 🧭 message");await until(()=>a.inbox.length===1&&b.inbox.length===1);
  for(const client of [a,b]) {
    assert.equal(client.inbox[0].error.code,0);assert.equal(client.inbox[0].command,11000);assert.equal(client.inbox[0].tag,0xffff_ffff);
    assert.deepEqual(parseReceivedGuildPayload(client.inbox[0].payload),{who:String(actors[0].auth.pvid),nickname:"alpha",message:"길드 🧭 message",type:11000});
  }
  assert.equal(c.inbox.length,0);
  assert.equal(publicPeer.inbox.length,3,"Guild/private text is never delivered to public sockets for the same account");
  send(c.ws,actors[2],"other room");await until(()=>c.inbox.length===1);assert.equal(a.inbox.length,1);assert.equal(b.inbox.length,1);
  send(a.ws,actors[0],"",11010);await until(()=>a.inbox.length===2);assert.equal(a.inbox[1].error.code,2001);assert.equal(b.inbox.length,1);
  send(a.ws,actors[0],"spoof",11000,{who:actors[1].auth.pvid,nickname:"fake"});await until(()=>a.inbox.length===3);assert.equal(a.inbox[2].error.code,2001);assert.equal(b.inbox.length,1);
  // Disposable membership-change probe; never invokes a real player's input.
  (state as any).guilds[0].members=[member(actors[0],1)];
  send(a.ws,actors[0],"after leave");await until(()=>a.inbox.length===4&&b.closed);assert.equal(b.inbox.length,1);
  (state as any).sessionPvidByAccessToken.delete(actors[0].token);
  send(a.ws,actors[0],"revoked");await until(()=>a.closed);assert.equal(a.inbox.length,4);
  for(const client of [a,b,c])assert.deepEqual(client.faults,[]);
  assert.deepEqual(readFileSync(file),bytes,"All messaging/admission reads preserve complete account/Guild/wallet/roster saves");
  const disabled=new ServerState("http://localhost",file,{guildChatMode:"disabled"});
  const restart=new ServerState("http://localhost",file,{guildChatMode:"local-memory"});
  assert.deepEqual((gameResponse(restart,"/guild/GetChattingLog",actors[0].auth) as any).ret_data,[],"No ephemeral message history is manufactured on restart");
  assert.throws(()=>new ServerState("ftp://localhost",file,{guildChatMode:"local-memory"}),/HTTP/);
  assert.throws(()=>new ServerState("http://localhost",file,{guildChatMode:"unknown" as any}),/mode/);
  assert.equal(disabled.baseInfo().url_list.some(row=>row.url_key==="guild_chat"),false);
  assert.throws(()=>attachGuildChat(server,disabled),/explicit/);
  assert.equal((gameResponse(disabled,"/guild/GetChattingLog",actors[0].auth) as any).result_code,2001);
  assert.deepEqual(readFileSync(file),bytes);
} finally {
  service?.close();for(const socket of sockets)socket.terminate();
  if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  rmSync(dir,{recursive:true,force:true});
}
console.log("Local Guild Chat: real encrypted WebSocket peers, own echo, same-Guild isolation, exact sender/Unicode, fuel/spoof refusal, leave/revocation, opt-in URLs/archive and byte-preserved saves passed; disposable clients only.");
