import type {GuildRecord} from "./guild-lobby.js";

const I32=0x7fff_ffff,U32=0xffff_ffff,LIMIT=10_000;
export const GUILD_FUEL_MAX_SUPPORTS=5;
export interface GuildFuelActor {pvid:number;serverId:number}
export interface GuildFuelSupport {pvid:number;at:number;points:number;relayed:boolean}
export interface GuildFuelRequest {
  id:number;owner_pvid:number;guild_id:number;server_id:number;regdate:number;expdate:number;cancelled:boolean;supporters:GuildFuelSupport[];
}
export interface GuildFuelLedger {next_request_id:number;requests:GuildFuelRequest[]}
export interface GuildFuelEvent {requestId:number;senderPvid:number;type:11010|11011}
export interface GuildFuelRow {pvid:number;id:number;regdate:number;expdate:number;supports:number;supported:0|1;type:11010}
type Accounts=ReadonlyMap<number,{serverId:number}>;
function object(raw:unknown,keys:readonly string[]):Record<string,unknown> {
  if(!raw||typeof raw!=="object"||Object.getPrototypeOf(raw)!==Object.prototype||Reflect.ownKeys(raw).length!==keys.length||
    keys.some(key=>{const d=Object.getOwnPropertyDescriptor(raw,key);return !d?.enumerable||!Object.hasOwn(d,"value");}))
    throw new TypeError("Guild fuel requires exact plain JSON data fields");return raw as Record<string,unknown>;
}
function array(raw:unknown,max=LIMIT):unknown[] {
  if(!Array.isArray(raw)||Object.getPrototypeOf(raw)!==Array.prototype||raw.length>max||Reflect.ownKeys(raw).length!==raw.length+1||
    Array.from({length:raw.length},(_,i)=>{const d=Object.getOwnPropertyDescriptor(raw,String(i));return !d?.enumerable||!Object.hasOwn(d,"value");}).some(Boolean))
    throw new TypeError("Guild fuel requires dense bounded JSON arrays");return raw;
}
function integer(raw:unknown,min=0,max=U32):number {
  if(typeof raw!=="number"||!Number.isSafeInteger(raw)||raw<min||raw>max)throw new TypeError("Guild fuel integer is outside its supported width");return raw;
}
function bool(raw:unknown):boolean {if(typeof raw!=="boolean")throw new TypeError("Guild fuel flags require explicit booleans");return raw;}
function known(accounts:Accounts,pvid:number) {integer(pvid,1);const account=accounts.get(pvid);if(!account)throw new TypeError("Guild fuel account is not established");return account;}
/** Guild records are independently established by the caller. Validate scope
 * uniqueness here; historical fuel donors need not remain in these records. */
function registry(guilds:readonly GuildRecord[],accounts:Accounts) {
  const ids=new Set<number>(),owners=new Map<number,GuildRecord>();
  for(const raw of array(guilds)) {
    if(!raw||typeof raw!=="object"||Object.getPrototypeOf(raw)!==Object.prototype||
      Reflect.ownKeys(raw).some(key=>typeof key!=="string"||!Object.hasOwn(Object.getOwnPropertyDescriptor(raw,key)!,"value")))
      throw new TypeError("Guild fuel requires established plain Guild data");
    const guild=raw as GuildRecord,id=integer(guild.id,1);if(ids.has(id))throw new TypeError("Duplicate Guild fuel scope");ids.add(id);
    integer(guild.contribution,0,I32);const members=array(guild.members);if(!members.length)throw new TypeError("Guild fuel scope has no joined members");
    const servers=new Set<number>();
    for(const value of members) {
      if(!value||typeof value!=="object"||Object.getPrototypeOf(value)!==Object.prototype||
        Reflect.ownKeys(value).some(key=>typeof key!=="string"||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key)!,"value")))
        throw new TypeError("Guild fuel requires established plain member data");
      const member=value as GuildRecord["members"][number],pvid=integer(member.pvid,1),account=known(accounts,pvid);
      if(owners.has(pvid))throw new TypeError("Guild fuel account has conflicting joined memberships");
      integer(member.contribution,0,I32);servers.add(integer(account.serverId,1));owners.set(pvid,guild);
    }
    if(servers.size!==1)throw new TypeError("Guild fuel scope crosses account servers");
  }
  return {owners};
}
function actorGuild(actor:GuildFuelActor,guilds:readonly GuildRecord[],accounts:Accounts,required=true) {
  const account=known(accounts,integer(actor.pvid,1));
  if(integer(actor.serverId,1)!==account.serverId)throw new TypeError("Guild fuel actor server is not authenticated");
  const guild=registry(guilds,accounts).owners.get(actor.pvid);
  if(!guild&&required)throw new TypeError("Guild fuel requires current joined membership");return guild;
}
function parseLedger(raw:unknown,guilds:readonly GuildRecord[],accounts:Accounts,allowStale=false):GuildFuelLedger {
  const source=object(raw,["next_request_id","requests"]),next_request_id=integer(source.next_request_id,1),ids=new Set<number>(),owners=new Set<number>();
  const membership=registry(guilds,accounts).owners;
  const requests=array(source.requests).map(value=>{
    const row=object(value,["id","owner_pvid","guild_id","server_id","regdate","expdate","cancelled","supporters"]);
    const id=integer(row.id,1),owner_pvid=integer(row.owner_pvid,1),guild_id=integer(row.guild_id,1),server_id=integer(row.server_id,1);
    known(accounts,owner_pvid);if(ids.has(id)||owners.has(owner_pvid)||id>=next_request_id)throw new TypeError("Guild fuel request identity, owner or allocator conflicts");
    ids.add(id);owners.add(owner_pvid);
    const regdate=integer(row.regdate,1,I32),expdate=integer(row.expdate,1,I32),cancelled=bool(row.cancelled);
    if(expdate<=regdate)throw new TypeError("Guild fuel request expiry must follow registration");
    const current=membership.get(owner_pvid);
    if(!allowStale&&!cancelled&&(!current||current.id!==guild_id||accounts.get(owner_pvid)!.serverId!==server_id))
      throw new TypeError("Active Guild fuel request owner is no longer in its captured Guild/server");
    const donors=new Set<number>();let prior=regdate;
    const supporters=array(row.supporters,GUILD_FUEL_MAX_SUPPORTS).map(rawSupport=>{
      const support=object(rawSupport,["pvid","at","points","relayed"]),pvid=integer(support.pvid,1),at=integer(support.at,1,I32),points=integer(support.points,0,I32);
      known(accounts,pvid);
      if(pvid===owner_pvid||donors.has(pvid)||at<regdate||at>=expdate||at<prior)throw new TypeError("Guild fuel donor/history is duplicate, self-owned or outside its lifetime");
      donors.add(pvid);prior=at;return {pvid,at,points,relayed:bool(support.relayed)};
    });
    return {id,owner_pvid,guild_id,server_id,regdate,expdate,cancelled,supporters};
  });
  return {next_request_id,requests};
}
export function normalizeGuildFuelLedger(raw:unknown,guilds:readonly GuildRecord[],accounts:Accounts):GuildFuelLedger {
  return parseLedger(raw,guilds,accounts);
}
/** Caller reconciles within the same persisted membership transaction. Never
 * reactivate a cancelled record after a leave/rejoin or server move. */
export function reconcileGuildFuelMembership(ledger:GuildFuelLedger,guilds:readonly GuildRecord[],accounts:Accounts):GuildFuelLedger {
  const parsed=parseLedger(ledger,guilds,accounts,true),members=registry(guilds,accounts).owners;let changed=false;
  for(const row of parsed.requests) {
    const own=members.get(row.owner_pvid);
    if(!row.cancelled&&(!own||own.id!==row.guild_id||accounts.get(row.owner_pvid)!.serverId!==row.server_id)){row.cancelled=true;changed=true;}
  }
  return changed?parsed:ledger;
}
export function planGuildFuelCreate(ledger:GuildFuelLedger|undefined,guilds:readonly GuildRecord[],accounts:Accounts,actor:GuildFuelActor,
  rawEmptyMessage:unknown,now:number,ttl:number):{ledger:GuildFuelLedger;event:GuildFuelEvent} {
  if(rawEmptyMessage!=="")throw new TypeError("Native Guild fuel creation requires the empty message string");
  integer(now,1,I32);integer(ttl,1,86400);if(ttl>I32-now)throw new TypeError("Guild fuel expiry exceeds signed32 UTC");
  const own=actorGuild(actor,guilds,accounts)!,base=normalizeGuildFuelLedger(ledger??{next_request_id:1,requests:[]},guilds,accounts);
  const prior=base.requests.find(row=>row.owner_pvid===actor.pvid);
  if(prior&&now<prior.expdate)throw new TypeError("Guild fuel request cooldown remains active, including cancelled requests");
  if(base.next_request_id===U32)throw new TypeError("Guild fuel request allocator is exhausted");
  const id=base.next_request_id;
  const request:GuildFuelRequest={id,owner_pvid:actor.pvid,guild_id:own.id,server_id:actor.serverId,regdate:now,expdate:now+ttl,cancelled:false,supporters:[]};
  return {ledger:{next_request_id:id+1,requests:[...base.requests.filter(row=>row.owner_pvid!==actor.pvid),request]},
    event:{requestId:id,senderPvid:actor.pvid,type:11010}};
}
function requestId(raw:unknown):number {
  return integer(typeof raw==="string"&&/^[1-9]\d*$/.test(raw)?Number(raw):raw,1);
}
function available(ledger:GuildFuelLedger,id:number,actor:GuildFuelActor,guilds:readonly GuildRecord[],accounts:Accounts,now:number) {
  const own=actorGuild(actor,guilds,accounts)!,request=ledger.requests.find(row=>row.id===id);
  if(!request||request.cancelled||request.guild_id!==own.id||request.server_id!==actor.serverId||now<request.regdate||now>=request.expdate)
    throw new TypeError("Guild fuel request is not active in the actor's current Guild/server");
  return request;
}
export function planGuildFuelSupport(ledger:GuildFuelLedger,guilds:readonly GuildRecord[],accounts:Accounts,actor:GuildFuelActor,
  rawRequestId:unknown,now:number,points4:number):{ledger:GuildFuelLedger;guilds:GuildRecord[];requestId:number} {
  integer(now,1,I32);integer(points4,0,I32);
  const next=normalizeGuildFuelLedger(ledger,guilds,accounts),request=available(next,requestId(rawRequestId),actor,guilds,accounts,now);
  if(request.owner_pvid===actor.pvid||request.supporters.some(row=>row.pvid===actor.pvid)||request.supporters.length>=GUILD_FUEL_MAX_SUPPORTS||
    request.supporters.length&&now<request.supporters.at(-1)!.at)throw new TypeError("Guild fuel support is self-owned, duplicate, full or before prior support");
  const owned=actorGuild(actor,guilds,accounts)!,member=owned.members.find(row=>row.pvid===actor.pvid)!;
  if(points4>I32-owned.contribution||points4>I32-member.contribution)throw new TypeError("Guild fuel contribution exceeds signed32 range");
  const nextGuilds=structuredClone(guilds) as GuildRecord[],target=nextGuilds.find(row=>row.id===owned.id)!;
  target.contribution+=points4;target.members.find(row=>row.pvid===actor.pvid)!.contribution+=points4;
  request.supporters.push({pvid:actor.pvid,at:now,points:points4,relayed:false});
  return {ledger:next,guilds:nextGuilds,requestId:request.id};
}
function relayMessage(raw:unknown) {
  if(typeof raw!=="string"||!raw.length||raw.length>8192||Buffer.from(raw,"utf8").toString("utf8")!==raw)
    throw new TypeError("Guild fuel relay requires bounded native JSON text");
  let parsed:unknown;try{parsed=JSON.parse(raw);}catch{throw new TypeError("Guild fuel relay contains invalid JSON");}
  const row=object(parsed,["type","id","pvid","regdate","expdate","supports","supported"]);
  // All admitted values are primitive numbers/bools; this key scan also rejects
  // duplicate/escaped-alias producer fields hidden by ordinary JSON.parse.
  const names=[...raw.matchAll(/"((?:[^"\\]|\\.)*)"\s*:/g)].map(match=>JSON.parse('"'+match[1]+'"') as string);
  if(names.length!==7||new Set(names).size!==7)throw new TypeError("Guild fuel relay has duplicate or ambiguous fields");
  if(row.type!==11011||(row.supported!==1&&row.supported!==true))throw new TypeError("Guild fuel relay must be a supported native11011 acknowledgment");
  return {id:integer(row.id,1),pvid:integer(row.pvid,1),regdate:integer(row.regdate,1,I32),expdate:integer(row.expdate,1,I32),supports:integer(row.supports,1,5)};
}
export function planGuildFuelRelay(ledger:GuildFuelLedger,guilds:readonly GuildRecord[],accounts:Accounts,actor:GuildFuelActor,
  rawJSONMessage:unknown,now:number):{ledger:GuildFuelLedger;event:GuildFuelEvent} {
  integer(now,1,I32);const message=relayMessage(rawJSONMessage),next=normalizeGuildFuelLedger(ledger,guilds,accounts);
  const request=available(next,message.id,actor,guilds,accounts,now),index=request.supporters.findIndex(row=>row.pvid===actor.pvid),receipt=request.supporters[index];
  if(!receipt||receipt.relayed||now<receipt.at||message.pvid!==request.owner_pvid||message.regdate!==request.regdate||message.expdate!==request.expdate||message.supports!==index+1)
    throw new TypeError("Guild fuel relay does not match the actor's unrelayed committed support receipt");
  receipt.relayed=true;return {ledger:next,event:{requestId:request.id,senderPvid:actor.pvid,type:11011}};
}
function projected(row:GuildFuelRequest,viewer:number):GuildFuelRow {
  return {pvid:row.owner_pvid,id:row.id,regdate:row.regdate,expdate:row.expdate,supports:row.supporters.length,
    supported:viewer===row.owner_pvid||row.supporters.some(receipt=>receipt.pvid===viewer)?1:0,type:11010};
}
export function guildFuelRows(ledger:GuildFuelLedger|undefined,guilds:readonly GuildRecord[],accounts:Accounts,viewer:GuildFuelActor):GuildFuelRow[] {
  const own=actorGuild(viewer,guilds,accounts,false);if(!ledger)return [];
  const base=normalizeGuildFuelLedger(ledger,guilds,accounts);if(!own)return [];
  return base.requests.filter(row=>!row.cancelled&&row.guild_id===own.id&&row.server_id===viewer.serverId)
    .sort((a,b)=>a.owner_pvid-b.owner_pvid).map(row=>projected(row,viewer.pvid));
}
/** Current membership of viewer and event sender is separately checked by the
 * authenticated dispatcher before each encrypted delivery. No actor fields are
 * accepted from the client broadcast as an authority. */
export function guildFuelWireMessage(ledger:GuildFuelLedger,event:GuildFuelEvent,viewer:GuildFuelActor):string {
  object(event,["requestId","senderPvid","type"]);integer(event.requestId,1);integer(event.senderPvid,1);integer(viewer.pvid,1);integer(viewer.serverId,1);
  const request=ledger.requests.find(row=>row.id===event.requestId);
  if(!request||request.cancelled||request.server_id!==viewer.serverId||
    event.type===11010&&event.senderPvid!==request.owner_pvid||
    event.type===11011&&!request.supporters.some(row=>row.pvid===event.senderPvid&&row.relayed)||
    event.type!==11010&&event.type!==11011)throw new TypeError("Guild fuel wire event is not authoritative in this scope");
  return JSON.stringify({...projected(request,viewer.pvid),type:event.type,result_code:1});
}
