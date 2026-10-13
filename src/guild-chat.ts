import type {Server,IncomingMessage} from "node:http";
import type {Duplex} from "node:stream";
import {isUtf8} from "node:buffer";
import {WebSocket,WebSocketServer} from "ws";
import type {ServerState} from "./state.js";
import {decodeChatFrame,encodeChatFrame} from "./chat-frame.js";
import {decodeChatRequest,encodeChatResponse,receivedGuildPayloadWire,type ChatRequest} from "./chat-message.js";

type Scope=ReturnType<ServerState["chatGuildFor"]>;
interface Peer {socket:WebSocket;headers:Record<string,string>;scope:Scope}
/** Explicit local ephemeral ordinary Guild text only. Native command11000 and
 * per-recipient shared-key frames; joined room admission/fanout/limits are local
 * policy. No fuel, public channel, history, replay or reward producer. */
export function attachGuildChat(server:Server,state:ServerState) {
  if(!state.guildChatEnabled()) throw new Error("Guild Chat listener requires explicit local-memory mode");
  const wss=new WebSocketServer({noServer:true,perMessageDeflate:false,maxPayload:65536});
  const peers=new Set<Peer>();
  const scope=(peer:Peer)=>{
    const current=state.chatGuildFor(peer.headers);
    if(current.pvid!==peer.scope.pvid||current.serverId!==peer.scope.serverId||current.guildId!==peer.scope.guildId)
      throw new Error("Guild Chat subscription changed");
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
    if(pathname!=="/chat/guild") {socket.destroy();return;}
    const token=request.headers["x-pv-accesstoken"];
    const headers:Record<string,string>=typeof token==="string"?{"x-pv-accesstoken":token}:{};
    let initial:Scope;
    try{initial=state.chatGuildFor(headers);}catch{socket.end("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");return;}
    wss.handleUpgrade(request,socket,head,ws=>{
      const peer:Peer={socket:ws,headers,scope:initial};peers.add(peer);
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
        if(packet.command!==11000||!payload||typeof payload!=="object"||Array.isArray(payload)||
          Object.keys(payload).length!==2||!Object.hasOwn(payload,"message")||!Object.hasOwn(payload,"type")||
          (payload as any).type!==11000||typeof (payload as any).message!=="string"||!(payload as any).message.length) {
          try{reply(peer,current,packet.command|0,tag,null,{code:2001,message:"Only ordinary local Guild text is supported"});}
          catch{ws.terminate();}return;
        }
        const received=receivedGuildPayloadWire({who:String(current.pvid),nickname:current.nickname,message:(payload as any).message,type:11000});
        for(const recipient of peers) {
          let target:Scope;
          try{target=scope(recipient);}catch{recipient.socket.close(1008,"Guild subscription changed");continue;}
          if(target.serverId!==current.serverId||target.guildId!==current.guildId) continue;
          try{reply(recipient,target,11000,tag,received);}catch{recipient.socket.terminate();}
        }
      });
    });
  };
  server.on("upgrade",onUpgrade);
  const close=()=>{server.off("upgrade",onUpgrade);for(const peer of peers)peer.socket.terminate();peers.clear();wss.close();};
  return {close};
}
