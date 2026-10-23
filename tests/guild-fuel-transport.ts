import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createServer} from 'node:http';
import {mkdtempSync,readFileSync,mkdirSync,rmdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {createApp} from '../src/server.js';
import {attachLocalChat} from '../src/chat-service.js';
import {encodeChatFrame,decodeChatFrame} from '../src/chat-frame.js';
import {encodeChatRequest,decodeChatResponse,parseReceivedGuildPayload,type ChatResponse} from '../src/chat-message.js';

const directory=mkdtempSync(path.join(tmpdir(),'blustone-guild-fuel-transport-')),file=path.join(directory,'state.json');
const pointsEnv=process.env.BLUSTONE_GUILD_CONTRIBUTION_POINTS_JSON;
process.env.BLUSTONE_GUILD_CONTRIBUTION_POINTS_JSON=JSON.stringify({'1':0,'2':0,'3':0,'4':3});
const context=createApp({baseUrl:'http://127.0.0.1',stateFile:file,publicChatMode:'local-memory',guildChatMode:'local-memory',
  guildFuelMode:'local-requests',guildFuelRequestSeconds:600});
const server=createServer(context.app),service=attachLocalChat(server,context.state),sockets:WebSocket[]=[];
const until=async(test:()=>boolean)=>{const deadline=Date.now()+5000;while(!test()){
  if(Date.now()>deadline)throw new Error('Guild fuel transport fixture timed out');await new Promise(resolve=>setTimeout(resolve,5));}};
try {
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();if(!address||typeof address==='string')throw new Error('Missing loopback port');
  const base=`http://127.0.0.1:${address.port}`;context.state.baseUrl=base;
  const register=async(name:string)=>{
    const pair=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'});
    const exchange=await fetch(base+'/shared_secret/Exchange',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
      body:new URLSearchParams({publicKey:pair.publicKey.export({format:'der',type:'spki'}).toString('base64url')})});
    assert.equal(exchange.status,200);const publicKey=Buffer.from(await exchange.arrayBuffer());
    const key=crypto.createHash('sha384').update(crypto.diffieHellman({privateKey:pair.privateKey,
      publicKey:crypto.createPublicKey({key:publicKey,format:'der',type:'spki'})})).digest();
    const sign=(bytes:Buffer)=>crypto.createHmac('sha384',key).update(bytes).digest('base64');
    assert.equal(exchange.headers.get('pv-signature'),sign(publicKey));const token=exchange.headers.get('pv-accesstoken');assert.ok(token);
    const encrypt=(bytes:Buffer)=>{const aes=crypto.createCipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));return Buffer.concat([aes.update(bytes),aes.final()]);};
    const decrypt=(bytes:Buffer)=>{const aes=crypto.createDecipheriv('aes-256-cbc',key.subarray(0,32),key.subarray(32));return Buffer.concat([aes.update(bytes),aes.final()]);};
    const secure=async(route:string,values:Record<string,string>)=>{
      const plain=Buffer.from(String(new URLSearchParams(values))),response=await fetch(base+route,{method:'POST',headers:{
        'content-type':'application/octet-stream','pv-accesstoken':token,'pv-signature':sign(plain)},body:new Uint8Array(encrypt(plain))});
      if(response.status===500)return {status:500,body:await response.json()};
      assert.equal(response.status,200);
      if(!/^application\/octet-stream/.test(response.headers.get('content-type')??'')) {
        const failure=await response.json();assert.notEqual(failure.result_code,1,'Only the standard auth failure envelope may be plain JSON');
        return {status:200,body:failure};
      }
      const reply=decrypt(Buffer.from(await response.arrayBuffer()));assert.equal(response.headers.get('pv-signature'),sign(reply));
      return {status:response.status,body:JSON.parse(reply.toString('utf8'))};
    };
    const guest=await secure('/v2/account/RegisterGuest',{device_id:'fuel-transport-'+name,nickname:name});
    assert.equal(guest.body.result_code,1);
    const auth={app_code:'_SR',app_ver:'28010',market:'GOOGLE',pvid:String(guest.body.pvid),otp:String(guest.body.ret_data.otp)};
    const lobby=await secure('/lobby/Enter',auth);assert.equal(lobby.body.result_code,1);
    return {auth,pvid:Number(auth.pvid),token,encrypt,decrypt,secure,name};
  };
  const actors:Array<Awaited<ReturnType<typeof register>>>=[];
  for(const name of ['Owner','DonorOne','DonorTwo','Observer','Foreign','Unjoined'])actors.push(await register(name));
  type Actor=typeof actors[number];
  const member=(i:number)=>({pvid:actors[i].pvid,role:i===0||i===4?1:3,newbie:0,contribution:10,fc_point:0});
  const guild=(id:number,members:unknown[])=>({id,name:'Authored'+id,type:1,fc_point_limit:0,contribution:100,region:'EN',
    emblem_id:'GD_IMG_1',desc:'Transport fixture',rank:0,gvg_win_cnt:0,gvg_inf_win_cnt:0,members});
  (context.state as any).guilds=[guild(1,[0,1,2,3].map(member)),guild(2,[member(4)])];(context.state as any).persist();
  const baseline=JSON.parse(readFileSync(file,'utf8'));
  const bootstrap=await (await fetch(base+'/launcher/GetBaseInfo',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).json();
  const guildURL=bootstrap.url_list.find((r:any)=>r.url_key==='guild_chat')?.address;
  assert.equal(guildURL,base.replace('http:','ws:')+'/chat/guild');
  const connect=async(actor:Actor,url=guildURL)=>{
    const ws=new WebSocket(url,{headers:{'X-PV-AccessToken':actor.token},perMessageDeflate:false});sockets.push(ws);
    const inbox:ChatResponse[]=[],raw:Buffer[]=[],faults:unknown[]=[];
    ws.on('error',()=>{});ws.on('message',data=>{try{const bytes=Buffer.from(data as Buffer);raw.push(bytes);
      inbox.push(decodeChatResponse(decodeChatFrame(bytes,actor.decrypt).toString('utf8')));}catch(error){faults.push(error);}});
    await new Promise<void>((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});return {ws,inbox,raw,faults,actor};
  };
  await assert.rejects(()=>connect(actors[5]),/401/);
  const owner=await connect(actors[0]),one=await connect(actors[1]),two=await connect(actors[2]),observer=await connect(actors[3]);
  const foreign=await connect(actors[4]),publicOwner=await connect(actors[0],base.replace('http:','ws:')+'/chat/public');
  const room=[owner,one,two,observer];await until(()=>publicOwner.inbox.length===1);
  let tag=10;
  const send=(client:typeof owner,type:number,message:string,extra={})=>{
    const current=tag++;client.ws.send(encodeChatFrame(Buffer.from(encodeChatRequest({command:11000,tag:String(current),version:'AUTHORED',
      utc:Math.floor(Date.now()/1000),payload:{type,message,...extra}})),client.actor.encrypt));return current;
  };
  const refuse=async(client:typeof owner,type:number,message:string,extra={})=>{
    const counts=room.map(c=>c.inbox.length),foreignCount=foreign.inbox.length,publicCount=publicOwner.inbox.length;
    const expected=client.inbox.length+1,current=send(client,type,message,extra);await until(()=>client.inbox.length===expected);
    const error=client.inbox.at(-1)!;assert.equal(error.tag,current);assert.equal(error.error.code,2001);assert.equal(error.payload,null);
    for(let i=0;i<room.length;i++)assert.equal(room[i].inbox.length,counts[i]+Number(room[i]===client));
    assert.equal(foreign.inbox.length,foreignCount);assert.equal(publicOwner.inbox.length,publicCount);
  };
  const barrier=async()=>{
    const counts=room.map(c=>c.inbox.length),current=send(owner,11000,'transport barrier');
    await until(()=>room.every((c,i)=>c.inbox.length===counts[i]+1));
    for(const client of room){assert.equal(client.inbox.at(-1)!.tag,current);assert.equal(parseReceivedGuildPayload(client.inbox.at(-1)!.payload).type,11000);}
  };
  await refuse(owner,11010,'{"id":9}');await refuse(owner,11010,'',{who:actors[1].pvid});
  const beforeCreate=readFileSync(file);mkdirSync(file+'.tmp');
  try{await refuse(owner,11010,'');assert.deepEqual(readFileSync(file),beforeCreate);assert.equal((context.state as any).guildFuelLedger,undefined);}
  finally{rmdirSync(file+'.tmp');}
  const createTag=send(owner,11010,'');await until(()=>room.every(c=>c.inbox.some(m=>m.tag===createTag)));
  const created=room.map(client=>{
    const packet=client.inbox.find(m=>m.tag===createTag)!;assert.equal(packet.command,11000);assert.equal(packet.error.code,0);
    const payload=parseReceivedGuildPayload(packet.payload);assert.equal(payload.type,11010);assert.equal(payload.who,String(actors[0].pvid));
    const row=JSON.parse(payload.message);assert.equal(row.result_code,1);assert.equal(row.supports,0);assert.equal(row.pvid,actors[0].pvid);return row;
  });
  const id=created[0].id;assert.equal(created[0].supported,1);for(const row of created.slice(1))assert.equal(row.supported,0);
  assert.equal(foreign.inbox.length,0);assert.equal(publicOwner.inbox.length,1);
  assert.throws(()=>decodeChatResponse(decodeChatFrame(one.raw.at(-1)!,actors[0].decrypt).toString('utf8')),'A donor packet is encrypted under its own independent exchanged key');
  const postCreate=JSON.parse(readFileSync(file,'utf8'));assert.equal(postCreate.version,20);
  assert.deepEqual(postCreate.accounts,baseline.accounts);assert.deepEqual(postCreate.gameStates,baseline.gameStates);
  const support=async(actor:Actor,extra:Record<string,string>={})=>actor.secure('/guild/SupportFuel',{...actor.auth,request_id:String(id),...extra});
  const beforeSupport=readFileSync(file),counts=room.map(c=>c.inbox.length),guilds=(context.state as any).guilds,ledger=(context.state as any).guildFuelLedger;
  mkdirSync(file+'.tmp');try {
    const failure=await support(actors[1]);assert.equal(failure.status,500);assert.equal(failure.body.error,'local server failure');
    assert.deepEqual(readFileSync(file),beforeSupport);assert.equal((context.state as any).guilds,guilds);assert.equal((context.state as any).guildFuelLedger,ledger);
  }finally{rmdirSync(file+'.tmp');}
  await barrier();for(let i=0;i<room.length;i++)assert.equal(room[i].inbox.length,counts[i]+1,'Failed HTTP support emits no unsolicited fuel packet');
  const supportedOne=await support(actors[1]);assert.equal(supportedOne.status,200);assert.equal(supportedOne.body.result_code,1);
  const receiptOne=supportedOne.body.ret_data.fuel_requests[0];assert.equal(receiptOne.supports,1);assert.equal(receiptOne.supported,1);
  assert.equal(supportedOne.body.ret_data.my_guild.contribution,13);assert.equal(supportedOne.body.ret_data.guilds[0].contribution,103);
  assert.equal(Object.hasOwn(supportedOne.body.ret_data,'user'),false);
  const supportedTwo=await support(actors[2]);assert.equal(supportedTwo.body.result_code,1);
  const receiptTwo=supportedTwo.body.ret_data.fuel_requests[0];assert.equal(receiptTwo.supports,2);assert.equal(receiptTwo.supported,1);
  const preBarrier=room.map(c=>c.inbox.length);await barrier();
  for(let i=0;i<room.length;i++)assert.equal(room[i].inbox.length,preBarrier[i]+1,'HTTP settlement waits for the actual native11011 producer before fanout');
  for(const actor of [actors[0],actors[1],actors[4],actors[5]])assert.notEqual((await support(actor)).body.result_code,1);
  assert.notEqual((await support(actors[3],{supports:'999'})).body.result_code,1);
  assert.notEqual((await support(actors[1],{pvid:actors[2].auth.pvid,otp:actors[2].auth.otp})).body.result_code,1);
  const message=(row:any)=>JSON.stringify({type:11011,id:row.id,pvid:row.pvid,regdate:row.regdate,expdate:row.expdate,supports:row.supports,supported:row.supported});
  await refuse(observer,11011,message(receiptOne));await refuse(one,11011,message({...receiptOne,supports:99}));
  await refuse(one,11011,JSON.stringify({fuel_requests:[receiptOne]}));
  const beforeRelay=readFileSync(file),beforeLedger=(context.state as any).guildFuelLedger;mkdirSync(file+'.tmp');
  try{await refuse(one,11011,message(receiptOne));assert.deepEqual(readFileSync(file),beforeRelay);assert.equal((context.state as any).guildFuelLedger,beforeLedger);}
  finally{rmdirSync(file+'.tmp');}
  const relayOne=send(one,11011,message(receiptOne));await until(()=>room.every(c=>c.inbox.some(m=>m.tag===relayOne)));
  for(let i=0;i<room.length;i++){
    const packet=room[i].inbox.find(m=>m.tag===relayOne)!;assert.equal(packet.error.code,0);
    const payload=parseReceivedGuildPayload(packet.payload),row=JSON.parse(payload.message);
    assert.equal(payload.who,String(actors[1].pvid));assert.equal(payload.type,11011);assert.equal(row.pvid,actors[0].pvid);
    assert.equal(row.result_code,1);assert.equal(row.supports,2,'Delayed first donor relay projects the already committed second donor');
    assert.equal(row.supported,i===3?0:1,'Supported is recipient-specific, not copied from the sender');
  }
  const bytesAfterRelay=readFileSync(file);await refuse(one,11011,message(receiptOne));assert.deepEqual(readFileSync(file),bytesAfterRelay);
  const relayTwo=send(two,11011,message(receiptTwo));await until(()=>room.every(c=>c.inbox.some(m=>m.tag===relayTwo)));
  const final=JSON.parse(readFileSync(file,'utf8'));
  assert.equal(final.guilds[0].contribution,106);assert.equal(final.guildFuelLedger.requests[0].supporters.length,2);
  assert.ok(final.guildFuelLedger.requests[0].supporters.every((r:any)=>r.relayed));
  assert.deepEqual(final.accounts,baseline.accounts);assert.deepEqual(final.gameStates,baseline.gameStates,'Complete transport flow changes no AP, wallet or gameplay');
  assert.deepEqual(final.guilds[1],baseline.guilds[1]);
  for(let i=0;i<actors.length;i++){
    const result=await actors[i].secure('/guild/GetFuelRequests',actors[i].auth);assert.equal(result.body.result_code,1);
    const rows=result.body.ret_data.fuel_requests;assert.equal(rows.length,i<4?1:0);
    if(rows.length){assert.equal(rows[0].supports,2);assert.equal(rows[0].supported,i===3?0:1);}
  }
  assert.equal(foreign.inbox.length,0);assert.equal(publicOwner.inbox.length,1);
  for(const client of [...room,foreign,publicOwner])assert.deepEqual(client.faults,[],'Every recipient decodes only with its own authenticated key');
}finally{
  service.close();for(const socket of sockets)socket.terminate();
  if(server.listening)await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));
  if(pointsEnv===undefined)delete process.env.BLUSTONE_GUILD_CONTRIBUTION_POINTS_JSON;else process.env.BLUSTONE_GUILD_CONTRIBUTION_POINTS_JSON=pointsEnv;
  rmSync(directory,{recursive:true,force:true});
}
console.log('Guild fuel transport: actual signed P384/AES HTTP and independently encrypted native Guild WS create/support/relay, personalized flags/delayed count, isolated rooms, forgery/duplicates, no unsolicited support fanout and persistence-before-fanout rollback passed; no AP or gameplay mutation.');
