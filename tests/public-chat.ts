import assert from "node:assert/strict";
import crypto from "node:crypto";
import {createServer} from "node:http";
import {mkdtempSync,readFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {WebSocket} from "ws";
import {ServerState} from "../src/state.js";
import {attachLocalChat} from "../src/chat-service.js";
import {encodeChatFrame,decodeChatFrame} from "../src/chat-frame.js";
import {encodeChatRequest,decodeChatResponse,parseReceivedPublicPayload,type ChatResponse} from "../src/chat-message.js";
const dir=mkdtempSync(path.join(tmpdir(),"blustone-public-chat-")),server=createServer(),sockets:WebSocket[]=[];
let service:ReturnType<typeof attachLocalChat>|undefined;
const until=async(test:()=>boolean)=>{const end=Date.now()+5000;while(!test()){if(Date.now()>end)throw new Error("Public Chat fixture timed out");await new Promise(resolve=>setTimeout(resolve,10));}};
try {
  const file=path.join(dir,"state.json"),state=new ServerState("http://localhost",file,{publicChatMode:"local-memory",guildChatMode:"disabled"});
  const actors=["alpha","beta","other","foreign"].map(name=>{
    const auth=state.registerGuest({device_id:`public-chat-${name}`,nickname:name},{}).ret_data as any;
    const pair=crypto.generateKeyPairSync("ec",{namedCurve:"secp384r1"});
    const exchange=state.exchangeSecret({publicKey:pair.publicKey.export({format:"der",type:"spki"}).toString("base64url")});
    const key=crypto.createHash("sha384").update(crypto.diffieHellman({privateKey:pair.privateKey,publicKey:crypto.createPublicKey({key:exchange.body,format:"der",type:"spki"})})).digest();
    state.accountFor(auth,{"pv-accesstoken":exchange.accessToken});
    const encrypt=(data:Buffer)=>{const aes=crypto.createCipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));return Buffer.concat([aes.update(data),aes.final()]);};
    const decrypt=(data:Buffer)=>{const aes=crypto.createDecipheriv("aes-256-cbc",key.subarray(0,32),key.subarray(32));return Buffer.concat([aes.update(data),aes.final()]);};
    return {auth,token:exchange.accessToken,encrypt,decrypt};
  });
  (state as any).accountsByPvid.get(actors[3].auth.pvid).serverId=2;(state as any).persist();
  const bytes=readFileSync(file);
  assert.equal(state.baseInfo().url_list.find(row=>row.url_key==="new_chat")?.address,"ws://localhost/chat/public");
  assert.equal(state.baseInfo().url_list.some(row=>row.url_key==="guild_chat"||row.url_key==="chat_whole"),false);
  service=attachLocalChat(server,state);await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  const url=`ws://127.0.0.1:${(server.address() as any).port}/chat/public`;
  const connect=async(actor:typeof actors[number],token=actor.token)=>{
    const ws=new WebSocket(url,{headers:{"X-PV-AccessToken":token},perMessageDeflate:false});sockets.push(ws);
    const inbox:ChatResponse[]=[],faults:unknown[]=[];let closed=false;
    ws.on("error",()=>{});ws.on("close",()=>closed=true);
    ws.on("message",data=>{try{inbox.push(decodeChatResponse(decodeChatFrame(data as Buffer,actor.decrypt).toString("utf8")));}catch(error){faults.push(error);}});
    await new Promise<void>((resolve,reject)=>{ws.once("open",resolve);ws.once("error",reject);});
    return {ws,inbox,faults,get closed(){return closed;}};
  };
  await assert.rejects(()=>connect(actors[0],"unknown"));
  const clients=await Promise.all(actors.map(actor=>connect(actor))),[a,b,c,d]=clients;
  await until(()=>clients.every(client=>client.inbox.length===1));
  for(const client of clients){assert.equal(client.inbox[0].command,1);assert.equal(client.inbox[0].error.code,0);assert.equal(client.inbox[0].payload,null);}
  const send=(index:number,command:number,payload:unknown)=>clients[index].ws.send(encodeChatFrame(Buffer.from(encodeChatRequest({command,tag:"18446744073709551615",version:"AUTHORED",utc:1,payload})),actors[index].encrypt));
  const text=(index:number,message:string,extra={})=>send(index,10010,{message,type:10002,...extra});
  text(0,"before entry");await until(()=>a.inbox.length===2);assert.equal(a.inbox[1].error.code,2001);assert.equal(b.inbox.length,1);
  for(const [index,channel] of [[0,7],[1,7],[2,8],[3,7]])send(index,20000,{channel});
  await until(()=>a.inbox.length===3&&b.inbox.length===2&&c.inbox.length===2&&d.inbox.length===2);
  assert.deepEqual(a.inbox[2].payload,{channel:7});assert.equal(a.inbox[2].command,20000);
  text(0,"public 🧭");await until(()=>a.inbox.length===4&&b.inbox.length===3);
  for(const client of [a,b]){assert.equal(client.inbox.at(-1)!.command,10002);assert.equal(client.inbox.at(-1)!.tag,0xffff_ffff);
    assert.deepEqual(parseReceivedPublicPayload(client.inbox.at(-1)!.payload),{who:String(actors[0].auth.pvid),nickname:"alpha",message:"public 🧭"});}
  text(2,"other channel");text(3,"foreign server");await until(()=>c.inbox.length===3&&d.inbox.length===3);
  assert.equal(a.inbox.length,4);assert.equal(b.inbox.length,3);
  send(1,20000,{channel:8});await until(()=>b.inbox.length===4);
  text(0,"old room");await until(()=>a.inbox.length===5);assert.equal(b.inbox.length,4);
  text(2,"new room");await until(()=>b.inbox.length===5&&c.inbox.length===4);assert.equal(a.inbox.length,5);
  send(0,20000,{channel:0});await until(()=>a.inbox.length===6);assert.equal(a.inbox[5].error.code,2001);
  text(2,"still room8");await until(()=>b.inbox.length===6&&c.inbox.length===5);assert.equal(a.inbox.length,6);
  text(0,"spoof",{who:actors[1].auth.pvid});await until(()=>a.inbox.length===7);assert.equal(a.inbox[6].error.code,2001);
  send(0,10003,{message:"wrong branch",type:10002});await until(()=>a.inbox.length===8);assert.equal(a.inbox[7].error.code,2001);
  (state as any).accountsByPvid.get(actors[0].auth.pvid).serverId=2;
  text(0,"stale realm");await until(()=>a.closed);assert.equal(a.inbox.length,8);assert.equal(d.inbox.length,3);
  for(const client of clients)assert.deepEqual(client.faults,[]);
  assert.deepEqual(readFileSync(file),bytes,"Entry/text/switches do not persist accounts, channels, membership or gameplay");
  const disabled=new ServerState("http://localhost",file,{publicChatMode:"disabled",guildChatMode:"disabled"});
  assert.equal(disabled.baseInfo().url_list.some(row=>row.url_key==="new_chat"),false);
  assert.throws(()=>attachLocalChat(server,disabled),/explicit/);assert.deepEqual(readFileSync(file),bytes);
} finally {
  service?.close();for(const socket of sockets)socket.terminate();
  if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  rmSync(dir,{recursive:true,force:true});
}
console.log("Public Chat: real encrypted bootstrap/explicit channel entry, ordinary10010→10002 text, own echo, channel/server isolation, switch/refusal/stale realm and byte-preserved saves passed; no default channels or live users.");
