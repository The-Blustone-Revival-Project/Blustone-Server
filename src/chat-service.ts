import type {Server,IncomingMessage} from "node:http";
import type {Duplex} from "node:stream";
import {isUtf8} from "node:buffer";
import {WebSocket,WebSocketServer} from "ws";
import type {ServerState} from "./state.js";
import {decodeChatFrame,encodeChatFrame} from "./chat-frame.js";
import {decodeChatRequest,encodeChatResponse,receivedGuildPayloadWire,receivedPublicPayloadWire,chatEnterPayload,type ChatRequest} from "./chat-message.js";

type Scope=ReturnType<ServerState["chatPublicFor"]>&{guildId?:number};
interface Peer {socket:WebSocket;headers:Record<string,string>;scope:Scope;kind:"guild"|"public";channel?:number}
interface ChatService {close():void}
const attached=new WeakMap<Server,{state:ServerState;service:ChatService}>();
/** Explicit local ephemeral ordinary text. Native commands and
 * per-recipient shared-key frames; joined room admission/fanout/limits are local
 * policy. No fuel, whole-chat, durable history, replay or reward producer. */
export function attachLocalChat(server:Server,state:ServerState):ChatService {
  if(!state.guildChatEnabled()&&!state.publicChatEnabled()) throw new Error("Chat listener requires explicit local-memory mode");
  const existing=attached.get(server);
  if(existing){if(existing.state!==state)throw new Error("Chat dispatcher already belongs to another state");return existing.service;}
  const wss=new WebSocketServer({noServer:true,perMessageDeflate:false,maxPayload:65536});
  const peers=new Set<Peer>();
  const scope=(peer:Peer)=>{
    const current:Scope=peer.kind==="guild"?state.chatGuildFor(peer.headers):state.chatPublicFor(peer.headers);
    if(current.pvid!==peer.scope.pvid||current.serverId!==peer.scope.serverId||
      peer.kind==="guild"&&current.guildId!==peer.scope.guildId)
      throw new Error("Chat subscription changed");
    return current;
  };
  const reply=(peer:Peer,current:Scope,command:number,tag:number,payload:unknown,error={code:0,message:""})=>{
    if(peer.socket.readyState!==WebSocket.OPEN) return;
    if(peer.socket.bufferedAmount>65536) {peer.socket.terminate();return;}
    // Empty token is parser-compatible LOCAL policy, not a new credential.
    peer.socket.send(encodeChatFrame(Buffer.from(encodeChatResponse({accessToken:"",command,tag,payload,error}),"utf8"),current.encrypt),
      {binary:true},error=>{if(error) peer.socket.terminate();});
  };
  const onUpgrade=(request:IncomingMessage,socket:Duplex,head:Buffer)=>{
    socket.on("error",()=>socket.destroy());
    let pathname:string;
    try{pathname=new URL(request.url??"/","http://localhost").pathname;}catch{socket.destroy();return;}
    const kind=pathname==="/chat/guild"&&state.guildChatEnabled()?"guild":
      pathname==="/chat/public"&&state.publicChatEnabled()?"public":undefined;
    if(!kind) {socket.destroy();return;}
    const token=request.headers["x-pv-accesstoken"];
    const headers:Record<string,string>=typeof token==="string"?{"x-pv-accesstoken":token}:{};
    let initial:Scope;
    try{initial=kind==="guild"?state.chatGuildFor(headers):state.chatPublicFor(headers);}catch{socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");return;}
    wss.handleUpgrade(request,socket,head,ws=>{
      const peer:Peer={socket:ws,headers,scope:initial,kind};peers.add(peer);
      ws.on("error",()=>ws.terminate());ws.on("close",()=>peers.delete(peer));
      ws.on("message",(data,binary)=>{
        let current:Scope,packet:ChatRequest;
        try {
          current=scope(peer);
          if(!binary||!Buffer.isBuffer(data)) throw new Error("Native Chat requires binary frames");
          const plain=decodeChatFrame(data,current.decrypt);
          if(!isUtf8(plain)) throw new Error("Invalid native Chat UTF8");
          packet=decodeChatRequest(plain.toString("utf8"));
        } catch {ws.close(1008,"Invalid Chat session or packet");return;}
        const tag=Number(BigInt(packet.tag)&0xffff_ffffn);
        const payload=packet.payload;
        if(peer.kind==="public"&&packet.command===20000) {
          try{const entry=chatEnterPayload(payload);peer.channel=entry.channel;reply(peer,current,20000,tag,entry);}
          catch{try{reply(peer,current,20000,tag,null,{code:2001,message:"Choose a channel from 1 to 9999"});}catch{ws.terminate();}}
          return;
        }
        const requestCommand=peer.kind==="guild"?11000:10010,innerCommand=peer.kind==="guild"?11000:10002;
        if(packet.command!==requestCommand||peer.kind==="public"&&peer.channel===undefined||!payload||typeof payload!=="object"||Array.isArray(payload)||
          Object.keys(payload).length!==2||!Object.hasOwn(payload,"message")||!Object.hasOwn(payload,"type")||
          (payload as any).type!==innerCommand||typeof (payload as any).message!=="string"||!(payload as any).message.length) {
          try{reply(peer,current,packet.command|0,tag,null,{code:2001,message:peer.kind==="public"&&peer.channel===undefined?"Select a channel before sending a message":"This Chat action is not available"});}
          catch{ws.terminate();}return;
        }
        const message={who:String(current.pvid),nickname:current.nickname,message:(payload as any).message};
        const received=peer.kind==="guild"?receivedGuildPayloadWire({...message,type:11000}):receivedPublicPayloadWire(message);
        const responseCommand=peer.kind==="guild"?11000:10002;
        for(const recipient of peers) {
          let target:Scope;
          try{target=scope(recipient);}catch{recipient.socket.close(1008,"Chat subscription changed");continue;}
          if(recipient.kind!==peer.kind||target.serverId!==current.serverId||
            peer.kind==="guild"&&target.guildId!==current.guildId||
            peer.kind==="public"&&recipient.channel!==peer.channel) continue;
          try{reply(recipient,target,responseCommand,tag,received);}catch{recipient.socket.terminate();}
        }
      });
      if(kind==="public") {
        // Source command1 ignores payload and asks only for an existing recent
        // preference. No default/random channel or readiness is fabricated.
        try{reply(peer,scope(peer),1,0,null);}catch{ws.terminate();}
      }
    });
  };
  server.on("upgrade",onUpgrade);
  let closed=false;
  const close=()=>{if(closed)return;closed=true;server.off("upgrade",onUpgrade);attached.delete(server);
    for(const peer of peers)peer.socket.terminate();peers.clear();wss.close();};
  const service={close};attached.set(server,{state,service});return service;
}
