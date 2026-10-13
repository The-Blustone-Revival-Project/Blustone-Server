import type {GuildRecord} from "./guild-lobby.js";
import {guildApplications,type GuildApplication} from "./guild-applications.js";
import type {GuildMembershipPolicy} from "./guild-membership-policy.js";

function id(value:unknown):number {
  if(typeof value!=="string"||! /^[1-9]\d*$/.test(value)||BigInt(value)>0xffff_ffffn)
    throw new TypeError("Guild membership requires an exact supported uint32 decimal identity");
  return Number(value);
}
export function guildConfirmationRequest(payload:Record<string,unknown>) {
  if(typeof payload.target_pvid!=="string") throw new TypeError("Guild target_pvid requires JSON-array form string");
  const decoded=JSON.parse(payload.target_pvid,(_key,value,context?:{source:string})=>
    typeof value==="number"&&context?.source?context.source:value);
  if(!Array.isArray(decoded)||!decoded.length) throw new TypeError("Guild confirmation requires nonempty target list");
  const ids=decoded.map(value=>id(typeof value==="number"&&Number.isSafeInteger(value)?String(value):value));
  if(new Set(ids).size!==ids.length) throw new TypeError("Duplicate Guild confirmation targets");
  if(!["0","1",0,1].includes(payload.granted as string|number)) throw new TypeError("Guild granted requires 0 or 1");
  return {ids,granted:payload.granted==="1"||payload.granted===1};
}
export interface GuildActorGame {fc_point:number;active:boolean}
/** Wallet-neutral LOCAL public/approval lifecycle. Original backend role,
 * clock, admission/history policy is not inferred from callback grammar. */
export function planLocalGuildMembership(route:string,payload:Record<string,unknown>,records:readonly GuildRecord[],
  pending:readonly GuildApplication[],accounts:ReadonlyMap<number,{serverId:number}>,actor:{pvid:number;serverId:number},
  games:ReadonlyMap<number,GuildActorGame>,policy:Readonly<GuildMembershipPolicy>,now:number) {
  if(accounts.get(actor.pvid)?.serverId!==actor.serverId) throw new TypeError("Guild actor is not established");
  const own=records.find(record=>record.members.some(member=>member.pvid===actor.pvid));
  const application=pending.find(row=>row.pvid===actor.pvid);
  let next=structuredClone(records) as GuildRecord[],applications=structuredClone(pending) as GuildApplication[],changed=false;
  let affectedId=own?.id??application?.guild_id;
  const candidate=(pvid:number,target:GuildRecord)=>{
    const account=accounts.get(pvid),game=games.get(pvid);
    if(!account||account.serverId!==actor.serverId||!game||game.active||target.banished?.includes(pvid)||
      !Number.isInteger(game.fc_point)||game.fc_point<target.fc_point_limit||game.fc_point>0x7fff_ffff||pvid>0xffff_ffff)
      throw new TypeError("Guild candidate fails established scope, combat or authoritative FC admission");
    return game;
  };
  const join=(target:GuildRecord,pvids:number[])=>{
    if(target.members.length+pvids.length>policy.maxMembers) throw new TypeError("Configured Guild member capacity reached");
    const members=[...target.members,...pvids.map(pvid=>({pvid,role:policy.memberRole,newbie:policy.newbie,contribution:0,fc_point:candidate(pvid,target).fc_point}))];
    next=next.map(record=>record.id===target.id?{...record,members,member_cnt:members.length}:record);
  };
  if(route==="/guild/Apply") {
    const targetId=id(payload.guild_id),target=next.find(record=>record.id===targetId);
    if(!target||!target.members.every(member=>accounts.get(member.pvid)?.serverId===actor.serverId)) throw new TypeError("Guild target is not established on this server");
    if(typeof payload.desc!=="string"||Buffer.from(payload.desc,"utf8").toString("utf8")!==payload.desc) throw new TypeError("Guild application desc requires lossless UTF8 string");
    affectedId=targetId;
    if(own) {if(own.id!==targetId) throw new TypeError("Actor already joined another Guild");}
    else if(application) {
      if(application.guild_id!==targetId||application.desc!==payload.desc) throw new TypeError("Actor already owns a different pending application");
    } else {
      const game=candidate(actor.pvid,target);
      if(target.members.length>=policy.maxMembers) throw new TypeError("Configured Guild member capacity reached");
      if(target.type===1) join(target,[actor.pvid]);
      else if(target.type===2) {
        if(!Number.isInteger(now)||now<0||now>0xffff_ffff) throw new TypeError("Local application clock exceeds uint32");
        applications.push({pvid:actor.pvid,guild_id:targetId,desc:payload.desc,fc_point:game.fc_point,applied:now});
      } else throw new TypeError("Private Guild invitation lifecycle is not reconstructed");
      changed=true;
    }
  } else if(route==="/guild/CancelApplication") {
    if(own) throw new TypeError("Cancel cannot clear a joined actor's native affiliation");
    if(application) {applications=applications.filter(row=>row.pvid!==actor.pvid);changed=true;}
  } else if(route==="/guild/Leave") {
    if(application) throw new TypeError("Leave cannot clear a pending actor without cancelling its record");
    if(own) {
      if(own.members.find(member=>member.pvid===actor.pvid)!.role===1) throw new TypeError("Leader succession/dissolution is not reconstructed");
      const members=own.members.filter(member=>member.pvid!==actor.pvid);
      next=next.map(record=>record.id===own.id?{...record,members,member_cnt:members.length}:record);changed=true;
    }
  } else if(route==="/guild/ConfirmApplication") {
    if(!own||![1,2].includes(own.members.find(member=>member.pvid===actor.pvid)!.role)) throw new TypeError("Guild approval requires existing management role1or2");
    const {ids,granted}=guildConfirmationRequest(payload),accepted:number[]=[];
    for(const pvid of ids) {
      if(accounts.get(pvid)?.serverId!==actor.serverId) throw new TypeError("Guild approval target is unknown or foreign");
      const request=applications.find(row=>row.pvid===pvid),joined=next.find(record=>record.members.some(member=>member.pvid===pvid));
      if(request) {
        if(request.guild_id!==own.id) throw new TypeError("Guild manager does not own this application");
        if(granted) {candidate(pvid,own);accepted.push(pvid);}
      } else if(granted?joined?.id!==own.id:!!joined) throw new TypeError("Guild decision replay does not match current ownership");
    }
    if(accepted.length) join(own,accepted);
    const remaining=applications.filter(row=>row.guild_id!==own.id||!ids.includes(row.pvid));
    changed=remaining.length!==applications.length;applications=remaining;
  } else throw new TypeError("Unsupported local Guild membership route");
  applications=guildApplications(applications,next,accounts);
  return {guilds:next,applications,changed,affectedId};
}
