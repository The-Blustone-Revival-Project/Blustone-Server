import assert from "node:assert/strict";
import {decodeChatRequest,encodeChatRequest,decodeChatResponse,encodeChatResponse,
  parseReceivedGuildPayload,receivedGuildPayloadWire,chatEnterPayload} from "../src/chat-message.js";
const request={command:11000,tag:"18446744073709551615",version:"1",utc:123,payload:{message:"길드 🧭",type:11010,extra:[null,true,{value:" kept "}]}};
const snapshot=JSON.stringify(request),wire=encodeChatRequest(request);
assert.match(wire,/"tag":18446744073709551615/);assert.match(wire,/"utc":123\.0/);
assert.deepEqual(decodeChatRequest(wire),request);
const decoded=decodeChatRequest(wire);(decoded.payload as any).extra[2].value="changed";
assert.equal(JSON.stringify(request),snapshot);
const payload=receivedGuildPayloadWire({who:"9007199254740993",nickname:"Sender",message:"Exact",type:11010});
const reply={accessToken:"",command:11000,tag:0xffff_ffff,payload,error:{code:0,message:""}};
const replyWire=encodeChatResponse(reply);assert.match(replyWire,/"who":9007199254740993/);
const received=decodeChatResponse(replyWire);
assert.deepEqual(parseReceivedGuildPayload(received.payload),{who:"9007199254740993",nickname:"Sender",message:"Exact",type:11010});
received.error.message="changed";assert.equal(reply.error.message,"");
assert.deepEqual(chatEnterPayload({channel:1}),{channel:1});assert.deepEqual(chatEnterPayload({channel:9999}),{channel:9999});
for(const channel of [0,-1,10000,"1",undefined,1.5]) assert.throws(()=>chatEnterPayload({channel}));
for(const patch of [{command:-1},{tag:"18446744073709551616"},{tag:"01"},{utc:0x8000_0000},{version:"bad\ud800"},{payload:undefined}])
  assert.throws(()=>encodeChatRequest({...request,...patch} as any));
for(const patch of [{accessToken:undefined},{command:0x8000_0000},{tag:0x1_0000_0000},{error:null},
  {error:{code:0}},{error:{code:1,message:"bad\ud800"}},{payload:undefined}])
  assert.throws(()=>encodeChatResponse({...reply,...patch} as any));
assert.throws(()=>decodeChatRequest(wire.replace('"tag":18446744073709551615','"tag":"18446744073709551615"')));
for(const tag of ["1.0","1e0"]){
  const safeFloatTag=decodeChatRequest(wire.replace('"tag":18446744073709551615',`"tag":${tag}`));
  assert.equal(safeFloatTag.tag,"1");assert.match(encodeChatRequest(safeFloatTag),/"tag":1,/);
}
assert.throws(()=>decodeChatResponse(replyWire.replace('"tag":4294967295','"tag":9007199254740993')));
assert.throws(()=>parseReceivedGuildPayload({who:"9007199254740993",nickname:"Sender",message:"Exact",type:11010}));
assert.throws(()=>parseReceivedGuildPayload({...payload,sender:1}));
const large=decodeChatRequest('{"command":1,"tag":0,"version":"1","utc":-1.0,"payload":{"count":18446744073709551615}}');
assert.match(encodeChatRequest(large),/"count":18446744073709551615/);
const floating=decodeChatRequest('{"command":1,"tag":0,"version":"1","utc":0,"payload":{"float":1e20}}');
assert.match(encodeChatRequest(floating),/"float":1e20/);
const largestFloat=decodeChatRequest('{"command":1,"tag":0,"version":"1","utc":0,"payload":1e308}');
assert.match(encodeChatRequest(largestFloat),/"payload":1e308/);
const rawJSON=(JSON as typeof JSON&{rawJSON:(source:string)=>unknown}).rawJSON;
for(const raw of ['1e400','"\\ud800"','"ordinary"','null','true'])
  assert.throws(()=>encodeChatRequest({...request,payload:rawJSON(raw)}),/finite JSON number/);
assert.match(encodeChatRequest({...request,payload:rawJSON('1e20')}),/"payload":1e20/);
assert.throws(()=>decodeChatRequest('{"command":1,"tag":0,"version":"1","utc":0,"payload":1e400}'));
assert.throws(()=>encodeChatRequest({...request,payload:{count:18446744073709551615}}));
const strange=decodeChatRequest('{"command":1,"tag":0,"version":"1","utc":0,"payload":{"__proto__":{"flag":true}}}');
assert.match(encodeChatRequest(strange),/"__proto__"/);assert.equal(({} as any).flag,undefined);
const cycle:any={};cycle.self=cycle;assert.throws(()=>encodeChatRequest({...request,payload:cycle}));
for(const value of [undefined,()=>1,Symbol("value"),new Date(),1n,{missing:undefined},{[Symbol("key")]:1},
  Object.defineProperty({},"hidden",{value:undefined}),Object.defineProperty({},"getter",{get:()=>1,enumerable:true})])
  assert.throws(()=>encodeChatRequest({...request,payload:value}));
const extra:any=[];extra.hidden=1;assert.throws(()=>encodeChatRequest({...request,payload:extra}));
assert.throws(()=>encodeChatRequest({...request,payload:Array(1)}));
const inherited=Array(1);Object.setPrototypeOf(inherited,{0:"inherited",length:1});
const inheritedBefore=Object.getOwnPropertyDescriptors(inherited);
assert.throws(()=>encodeChatRequest({...request,payload:inherited}),/plain objects\/arrays/);
assert.deepEqual(Object.getOwnPropertyDescriptors(inherited),inheritedBefore);
const customPrototype=[1];Object.setPrototypeOf(customPrototype,Object.create(Array.prototype));
assert.throws(()=>encodeChatRequest({...request,payload:customPrototype}),/plain objects\/arrays/);
let iterated=false;
const iterator=[1];Object.defineProperty(iterator,Symbol.iterator,{value:function*(){iterated=true;yield "injected";}});
assert.throws(()=>encodeChatRequest({...request,payload:iterator}));assert.equal(iterated,false);
assert.throws(()=>decodeChatResponse('{"result_code":1,"ret_data":{}}'));
assert.equal(JSON.stringify(request),snapshot);
console.log("Native Chat JSON: exact64 request/sender integers, UTC double token, strict response32/error strings, detached arbitrary JSON, channel admission and malformed/rounding refusal passed; no listener/auth/message delivery.");
