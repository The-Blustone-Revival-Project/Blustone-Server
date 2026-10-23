import assert from "node:assert/strict";
import type {GuildRecord} from "../src/guild-lobby.js";
import {normalizeGuildFuelLedger,reconcileGuildFuelMembership,planGuildFuelCreate,planGuildFuelSupport,planGuildFuelRelay,
  guildFuelRows,guildFuelWireMessage,GUILD_FUEL_MAX_SUPPORTS,type GuildFuelLedger,type GuildFuelActor} from "../src/guild-fuel-ledger.js";

const accounts=new Map(Array.from({length:10},(_,index)=>[index+1,{serverId:index===9?2:1}] as const));
function guild(id:number,pvids:number[]):GuildRecord {
  return {id,name:`Local Guild ${id}`,type:1,fc_point_limit:0,contribution:100,region:"",emblem_id:"",desc:"",rank:0,gvg_win_cnt:0,gvg_inf_win_cnt:0,
    members:pvids.map((pvid,index)=>({pvid,contribution:10,newbie:0,role:index===0?1:3,fc_point:0}))};
}
const guilds=[guild(20,[1,2,3,4,5,6,7]),guild(21,[8]),guild(22,[10])],actor=(pvid:number):GuildFuelActor=>({pvid,serverId:accounts.get(pvid)!.serverId});
const source=structuredClone({guilds,accounts:[...accounts]}),guildRef=guilds[0],membersRef=guilds[0].members;
assert.equal(GUILD_FUEL_MAX_SUPPORTS,5);
const created=planGuildFuelCreate(undefined,guilds,accounts,actor(1),"",1000,600);
assert.deepEqual(created,{ledger:{next_request_id:2,requests:[{id:1,owner_pvid:1,guild_id:20,server_id:1,regdate:1000,expdate:1600,cancelled:false,supporters:[]}]},
  event:{requestId:1,senderPvid:1,type:11010}});
assert.deepEqual(normalizeGuildFuelLedger(created.ledger,guilds,accounts),created.ledger);
assert.equal(reconcileGuildFuelMembership(created.ledger,guilds,accounts),created.ledger,"unchanged reconciliation retains exact ledger identity");
const creationWire=JSON.parse(guildFuelWireMessage(created.ledger,created.event,actor(2)));
assert.deepEqual(creationWire,{pvid:1,id:1,regdate:1000,expdate:1600,supports:0,supported:0,type:11010,result_code:1});
assert.equal(JSON.parse(guildFuelWireMessage(created.ledger,created.event,actor(1))).supported,1);
assert.deepEqual(guildFuelRows(created.ledger,guilds,accounts,actor(8)),[]);assert.deepEqual(guildFuelRows(created.ledger,guilds,accounts,actor(9)),[]);
assert.deepEqual(guildFuelRows(undefined,guilds,accounts,actor(1)),[]);
assert.throws(()=>guildFuelWireMessage(created.ledger,created.event,actor(10)),/scope/);
const first=planGuildFuelSupport(created.ledger,guilds,accounts,actor(2),"1",1001,7);
assert.equal(first.guilds[0].contribution,107);assert.equal(first.guilds[0].members.find(row=>row.pvid===2)!.contribution,17);
assert.equal(first.guilds[0].members.find(row=>row.pvid===1)!.contribution,10);assert.deepEqual(first.guilds.slice(1),guilds.slice(1));
assert.deepEqual(first.ledger.requests[0].supporters,[{pvid:2,at:1001,points:7,relayed:false}]);
assert.deepEqual(created.ledger.requests[0].supporters,[]);assert.notEqual(first.guilds,guilds);assert.notEqual(first.guilds[0],guildRef);
const second=planGuildFuelSupport(first.ledger,first.guilds,accounts,actor(3),1,1002,5);
assert.equal(second.guilds[0].contribution,112);assert.equal(second.ledger.requests[0].supporters.length,2);
const message=(supports:number,supported:1|true=1)=>JSON.stringify({type:11011,id:1,pvid:1,regdate:1000,expdate:1600,supports,supported});
const secondBefore=structuredClone(second);
const relay=planGuildFuelRelay(second.ledger,second.guilds,accounts,actor(2),message(1,true),1003);
assert.deepEqual(relay.event,{requestId:1,senderPvid:2,type:11011});assert.equal(relay.ledger.requests[0].supporters[0].relayed,true);
assert.equal(relay.ledger.requests[0].supporters[1].relayed,false);assert.deepEqual(second,secondBefore,"relay never awards another contribution or mutates source");
assert.equal(JSON.parse(guildFuelWireMessage(relay.ledger,relay.event,actor(4))).supports,2,"delayed receipt acknowledges count1 but server broadcasts current count2");
assert.equal(JSON.parse(guildFuelWireMessage(relay.ledger,relay.event,actor(4))).supported,0);
for(const viewer of [1,2,3])assert.equal(JSON.parse(guildFuelWireMessage(relay.ledger,relay.event,actor(viewer))).supported,1);
assert.throws(()=>planGuildFuelRelay(relay.ledger,second.guilds,accounts,actor(2),message(1),1004),/unrelayed/);
assert.throws(()=>planGuildFuelRelay(created.ledger,guilds,accounts,actor(2),message(1),1001),/unrelayed/);
assert.throws(()=>planGuildFuelRelay(second.ledger,second.guilds,accounts,actor(2),message(2),1003),/receipt/);
assert.throws(()=>planGuildFuelRelay(second.ledger,second.guilds,accounts,actor(3),message(1),1003),/receipt/);
assert.throws(()=>planGuildFuelRelay(second.ledger,second.guilds,accounts,actor(3),message(2),1001),/receipt/);
assert.throws(()=>guildFuelWireMessage(second.ledger,{requestId:1,senderPvid:2,type:11011},actor(1)),/authoritative/);
assert.throws(()=>guildFuelWireMessage(created.ledger,{requestId:1,senderPvid:2,type:11010},actor(1)),/authoritative/);
const directRows=guildFuelRows(relay.ledger,second.guilds,accounts,actor(2));directRows[0].supports=99;
assert.equal(relay.ledger.requests[0].supporters.length,2);

let fullLedger=relay.ledger,fullGuilds=second.guilds;
for(const pvid of [4,5,6]) {const next=planGuildFuelSupport(fullLedger,fullGuilds,accounts,actor(pvid),1,1003,0);fullLedger=next.ledger;fullGuilds=next.guilds;}
assert.equal(fullLedger.requests[0].supporters.length,5);assert.equal(fullGuilds[0].contribution,112);
assert.throws(()=>planGuildFuelSupport(fullLedger,fullGuilds,accounts,actor(7),1,1004,1),/full/);
assert.throws(()=>planGuildFuelSupport(first.ledger,first.guilds,accounts,actor(2),1,1002,7),/duplicate/);
assert.throws(()=>planGuildFuelSupport(created.ledger,guilds,accounts,actor(1),1,1001,7),/self/);
for(const pvid of [8,9,10])assert.throws(()=>planGuildFuelSupport(created.ledger,guilds,accounts,actor(pvid),1,1001,7));
assert.throws(()=>planGuildFuelSupport(created.ledger,guilds,accounts,{pvid:2,serverId:2},1,1001,7),/server/);
for(const id of [0,"0","01","-1",true,1.5,0x1_0000_0000,{},NaN])assert.throws(()=>planGuildFuelSupport(created.ledger,guilds,accounts,actor(2),id,1001,7));
for(const now of [999,1600,1601,0x8000_0000,1000.5])assert.throws(()=>planGuildFuelSupport(created.ledger,guilds,accounts,actor(2),1,now,7));
for(const points of [-1,0x8000_0000,0.5,NaN])assert.throws(()=>planGuildFuelSupport(created.ledger,guilds,accounts,actor(2),1,1001,points));
const overflow=structuredClone(guilds);overflow[0].contribution=0x7fff_ffff;
assert.throws(()=>planGuildFuelSupport(created.ledger,overflow,accounts,actor(2),1,1001,1),/contribution/);
overflow[0].contribution=100;overflow[0].members[1].contribution=0x7fff_ffff;
assert.throws(()=>planGuildFuelSupport(created.ledger,overflow,accounts,actor(2),1,1001,1),/contribution/);

// Donor history remains valid after departure, a server move or consuming its
// own contribution later. It is not compared to current spendable balances.
const moved=structuredClone(second.guilds);moved[0].members=moved[0].members.filter(row=>row.pvid!==2);
moved[2].members.push({...second.guilds[0].members[1],contribution:0,role:3});
const movedAccounts=new Map(accounts);movedAccounts.set(2,{serverId:2});
assert.deepEqual(normalizeGuildFuelLedger(second.ledger,moved,movedAccounts),second.ledger);
assert.equal(reconcileGuildFuelMembership(second.ledger,moved,movedAccounts),second.ledger);
assert.throws(()=>planGuildFuelRelay(second.ledger,moved,movedAccounts,{pvid:2,serverId:2},message(1),1003),/current Guild/);

const departed=structuredClone(guilds);departed[0].members=departed[0].members.filter(row=>row.pvid!==1);departed[0].members[0].role=1;
assert.throws(()=>normalizeGuildFuelLedger(created.ledger,departed,accounts),/owner/);
const cancelled=reconcileGuildFuelMembership(created.ledger,departed,accounts);assert.notEqual(cancelled,created.ledger);
assert.equal(cancelled.requests[0].cancelled,true);assert.equal(created.ledger.requests[0].cancelled,false);
assert.equal(reconcileGuildFuelMembership(cancelled,guilds,accounts),cancelled,"returning to the same Guild never reactivates a cancelled request");
assert.deepEqual(normalizeGuildFuelLedger(cancelled,[],accounts),cancelled,"cancelled record permits a missing old Guild");
assert.deepEqual(guildFuelRows(cancelled,guilds,accounts,actor(2)),[]);
assert.throws(()=>planGuildFuelCreate(cancelled,guilds,accounts,actor(1),"",1599,10),/cooldown/);
const replacement=planGuildFuelCreate(cancelled,guilds,accounts,actor(1),"",1600,10);
assert.equal(replacement.ledger.requests.length,1);assert.equal(replacement.event.requestId,2);assert.equal(replacement.ledger.next_request_id,3);
assert.equal(replacement.ledger.requests[0].expdate,1610);assert.deepEqual(replacement.ledger.requests[0].supporters,[]);
const ownerMoved=structuredClone(departed);ownerMoved[1].members.push({...guilds[0].members[0],role:3});
assert.throws(()=>planGuildFuelCreate(cancelled,ownerMoved,accounts,actor(1),"",1599,10),/cooldown/);
const nextGuildRequest=planGuildFuelCreate(cancelled,ownerMoved,accounts,actor(1),"",1600,10);assert.equal(nextGuildRequest.ledger.requests[0].guild_id,21);
const otherRequest=planGuildFuelCreate(created.ledger,guilds,accounts,actor(8),"",1000,10);
assert.equal(otherRequest.event.requestId,2);assert.equal(guildFuelRows(otherRequest.ledger,guilds,accounts,actor(2)).length,1);
assert.equal(guildFuelRows(otherRequest.ledger,guilds,accounts,actor(8))[0].pvid,8);
for(const bad of [null,{},"{}"," ",0,[],"x"])assert.throws(()=>planGuildFuelCreate(undefined,guilds,accounts,actor(1),bad,1000,10));
for(const ttl of [0,-1,86401,1.5,NaN])assert.throws(()=>planGuildFuelCreate(undefined,guilds,accounts,actor(1),"",1000,ttl));
assert.throws(()=>planGuildFuelCreate(undefined,guilds,accounts,actor(1),"",0x7fff_fffe,3),/expiry/);
assert.throws(()=>planGuildFuelCreate(undefined,guilds,accounts,actor(9),"",1000,10),/joined/);
assert.throws(()=>planGuildFuelCreate({next_request_id:0xffff_ffff,requests:[]},guilds,accounts,actor(1),"",1000,10),/allocator/);
const last=planGuildFuelCreate({next_request_id:0xffff_fffe,requests:[]},guilds,accounts,actor(1),"",1000,10);
assert.equal(last.event.requestId,0xffff_fffe);assert.equal(last.ledger.next_request_id,0xffff_ffff);

for(const change of [(l:GuildFuelLedger)=>{l.next_request_id=1;},(l:GuildFuelLedger)=>{l.requests.push(structuredClone(l.requests[0]));},
  (l:GuildFuelLedger)=>{l.requests[0].owner_pvid=999;},(l:GuildFuelLedger)=>{l.requests[0].expdate=l.requests[0].regdate;},
  (l:GuildFuelLedger)=>{l.requests[0].supporters.push({pvid:1,at:1001,points:1,relayed:false});},
  (l:GuildFuelLedger)=>{l.requests[0].supporters.push({pvid:999,at:1001,points:1,relayed:false});},
  (l:GuildFuelLedger)=>{l.requests[0].supporters[0].at=1600;},(l:GuildFuelLedger)=>{l.requests[0].supporters[0].points=-1;},
  (l:GuildFuelLedger)=>{l.requests[0].supporters[0].relayed=1 as unknown as boolean;},
  (l:GuildFuelLedger)=>{l.requests[0].supporters.push(structuredClone(l.requests[0].supporters[0]));}]) {
  const ledger=structuredClone(first.ledger);change(ledger);assert.throws(()=>normalizeGuildFuelLedger(ledger,guilds,accounts));
}
const excess=structuredClone(fullLedger);excess.requests[0].supporters.push({pvid:7,at:1004,points:0,relayed:false});assert.throws(()=>normalizeGuildFuelLedger(excess,guilds,accounts));
const malformed={...created.ledger,requests:new Array(1)};assert.throws(()=>normalizeGuildFuelLedger(malformed,guilds,accounts));
let invoked=false;const accessor={...created.ledger};Object.defineProperty(accessor,"requests",{enumerable:true,get(){invoked=true;return [];}});
assert.throws(()=>normalizeGuildFuelLedger(accessor,guilds,accounts));assert.equal(invoked,false);
const payload=JSON.parse(message(1));
for(const change of [{type:11010},{id:2},{pvid:2},{regdate:1001},{expdate:1601},{supports:2},{supported:0},{supported:false},
  {result_code:1},{ap:12},{id:"1"},{supports:1.5}])assert.throws(()=>planGuildFuelRelay(first.ledger,first.guilds,accounts,actor(2),JSON.stringify({...payload,...change}),1002));
for(const raw of ["", "{", "null", "[]", "{}", message(1).replace('"type":11011','"type":0,"type":11011'),
  message(1).replace('"type":11011','"\\u0074ype":0,"type":11011')])assert.throws(()=>planGuildFuelRelay(first.ledger,first.guilds,accounts,actor(2),raw,1002),TypeError);
assert.throws(()=>planGuildFuelRelay(first.ledger,first.guilds,accounts,actor(2),message(1),1600),/active/);
assert.deepEqual({guilds,accounts:[...accounts]},source);assert.equal(guilds[0],guildRef);assert.equal(guilds[0].members,membersRef);
assert.deepEqual(normalizeGuildFuelLedger(relay.ledger,second.guilds,accounts),relay.ledger,"no clock-dependent restore cleanup or hidden contribution rewrite");
console.log("Guild fuel ledger: owned empty-message creation, global cooldown/allocator, five unique supports/action4 counters, authoritative one-time relay, per-viewer scope, membership cancellation/history and malformed/overflow/nonmutation PASS; NO AP mutation.");
