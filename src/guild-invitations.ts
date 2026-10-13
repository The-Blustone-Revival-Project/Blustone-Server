import type {GuildRecord} from "./guild-lobby.js";
import type {GuildApplication} from "./guild-applications.js";
import type {GuildActorGame} from "./guild-local-membership.js";
import type {GuildMembershipPolicy} from "./guild-membership-policy.js";
import type {GuildNotification} from "./guild-notification-state.js";

export interface GuildInvitation {pvid:number;guild_id:number;sender:number;notification_id:number;state:"pending"|"accepted"|"declined"}
function id(value:unknown) {
  if(typeof value!=="string"||! /^[1-9]\d*$/.test(value)||BigInt(value)>0xffff_ffffn) throw new TypeError("Guild invitation requires exact supported scalar identity");
  return Number(value);
}
export function guildInvitationState(raw:unknown,records:readonly GuildRecord[],accounts:ReadonlyMap<number,{serverId:number}>,messages:readonly GuildNotification[]):GuildInvitation[] {
  if(!Array.isArray(raw)) throw new TypeError("Guild invitations require an array");
  const active=new Set<string>(),ids=new Set<number>();
  return raw.map(value=>{
    if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(key=>!["pvid","guild_id","sender","notification_id","state"].includes(key)))
      throw new TypeError("Unsupported Guild invitation record");
    const row=value as GuildInvitation,record=records.find(record=>record.id===row.guild_id),recipient=accounts.get(row.pvid),sender=accounts.get(row.sender);
    const message=messages.find(message=>message.id===row.notification_id),key=row.guild_id+":"+row.pvid;
    if(!record||!recipient||!sender||recipient.serverId!==sender.serverId||
      record.members.some(member=>accounts.get(member.pvid)?.serverId!==recipient.serverId)||ids.has(row.notification_id)||
      !["pending","accepted","declined"].includes(row.state)||!message||message.recipient!==row.pvid||message.sender!==row.sender||message.guild_id!==row.guild_id||message.message!==2||
      (row.state==="pending"&&(active.has(key)||!record.invited_guests?.some(guest=>guest.pvid===row.pvid)||
        record.banished?.includes(row.pvid)||record.members.some(member=>member.pvid===row.pvid))))
      throw new TypeError("Guild invitation lacks coherent owned message/active membership state");
    ids.add(row.notification_id);if(row.state==="pending") active.add(key);return {...row};
  });
}
/** Declared LOCAL invitations; membership initialization/clock/expiry policies
 * are distinct from positively recovered wire/MSG2/recipient UI contracts. */
export function planLocalGuildInvitation(route:string,payload:Record<string,unknown>,records:readonly GuildRecord[],
  pending:readonly GuildApplication[],invites:readonly GuildInvitation[],messages:readonly GuildNotification[],
  actor:{pvid:number;serverId:number},accounts:ReadonlyMap<number,{serverId:number}>,games:ReadonlyMap<number,GuildActorGame>,
  policy:Readonly<GuildMembershipPolicy>,nextId:number,now:number) {
  let guilds=structuredClone(records) as GuildRecord[],invitations=structuredClone(invites) as GuildInvitation[],notifications=structuredClone(messages) as GuildNotification[];
  let changed=false,affectedId:number;
  const own=records.find(record=>record.members.some(member=>member.pvid===actor.pvid));
  if(route==="/guild/Invite") {
    const pvid=id(payload.target_pvid),recipient=accounts.get(pvid);
    if(!own||![1,2].includes(own.members.find(member=>member.pvid===actor.pvid)!.role)) throw new TypeError("Guild invitation requires joined manager1or2");
    affectedId=own.id;
    if(!recipient||recipient.serverId!==actor.serverId||pvid===actor.pvid||records.some(record=>record.members.some(member=>member.pvid===pvid)))
      throw new TypeError("Guild invitation target is unknown/foreign/self/already joined");
    if(!Array.isArray(own.invited_guests)||!Array.isArray(own.banished)) throw new TypeError("Guild invitation/ban histories are not established");
    if(own.banished.includes(pvid)) throw new TypeError("Guild invitation cannot bypass local indefinite ban");
    const existing=invitations.find(row=>row.pvid===pvid&&row.guild_id===own.id&&row.state==="pending");
    if(!existing) {
      if(own.invited_guests.some(row=>row.pvid===pvid)) throw new TypeError("Existing invitation producer/message ownership is not reconstructed");
      if(!games.has(pvid)||!Number.isInteger(nextId)||nextId<1||nextId>0xffff_ffff||messages.some(row=>row.id===nextId)||
        !Number.isInteger(now)||now<0||now>0xffff_ffff) throw new TypeError("Local invitation message identity/clock unavailable");
      guilds=guilds.map(record=>record.id===own.id?{...record,invited_guests:[...own.invited_guests!,{pvid}]}:record);
      invitations.push({pvid,guild_id:own.id,sender:actor.pvid,notification_id:nextId,state:"pending"});
      notifications.push({recipient:pvid,id:nextId,sender:actor.pvid,guild_id:own.id,message:2,supplement:"",read:0,regdate:now,deleted:0});
      nextId++;changed=true;
    }
  } else if(route==="/guild/ConfirmInvitation") {
    affectedId=id(payload.guild_id);
    if(!["0","1",0,1].includes(payload.agreed as string|number)) throw new TypeError("Guild agreed requires0or1");
    const agreed=payload.agreed==="1"||payload.agreed===1,target=guilds.find(record=>record.id===affectedId);
    const invitation=[...invitations].reverse().find(row=>row.pvid===actor.pvid&&row.guild_id===affectedId);
    if(!target||!invitation) throw new TypeError("Recipient does not own this Guild invitation");
    if(invitation.state!=="pending") {
      if(agreed?(invitation.state!=="accepted"||own?.id!==affectedId):invitation.state!=="declined") throw new TypeError("Guild invitation replay contradicts current outcome");
    } else {
      if(own) throw new TypeError("Joined actor cannot decide a pending Guild invitation");
      if(!Array.isArray(target.invited_guests)||!target.invited_guests.some(row=>row.pvid===actor.pvid)) throw new TypeError("Guild invitation history ownership is incomplete");
      let members=target.members;
      if(agreed) {
        const game=games.get(actor.pvid);
        if(pending.some(row=>row.pvid===actor.pvid)) throw new TypeError("Recipient must cancel its pending application before accepting");
        if(!game||game.active||!Number.isInteger(game.fc_point)||game.fc_point<target.fc_point_limit||game.fc_point>0x7fff_ffff||
          !Array.isArray(target.banished)||target.banished.includes(actor.pvid)||members.length>=policy.maxMembers)
          throw new TypeError("Guild invitation acceptance fails local FC/combat/ban/capacity admission");
        members=[...members,{pvid:actor.pvid,role:policy.memberRole,newbie:policy.newbie,contribution:0,fc_point:game.fc_point}];
      }
      invitation.state=agreed?"accepted":"declined";
      guilds=guilds.map(record=>record.id===affectedId?{...record,members,member_cnt:members.length,
        invited_guests:record.invited_guests!.filter(row=>row.pvid!==actor.pvid)}:record);changed=true;
    }
  } else throw new TypeError("Unsupported local Guild invitation route");
  return {guilds,invitations,notifications,nextId,changed,affectedId};
}
/** Joining through another supported path fulfils this Guild's own pending
 * offer. Other Guilds' offers/history are preserved; no expiry is invented. */
export function reconcileGuildInvitationJoins(records:readonly GuildRecord[],invites:readonly GuildInvitation[]) {
  const invitations=structuredClone(invites) as GuildInvitation[];
  for(const invite of invitations) {
    if(invite.state==="pending"&&records.some(record=>record.id===invite.guild_id&&record.members.some(member=>member.pvid===invite.pvid)))
      invite.state="accepted";
  }
  const guilds=records.map(record=>record.invited_guests===undefined?structuredClone(record):{
    ...structuredClone(record),invited_guests:record.invited_guests.filter(row=>!record.members.some(member=>member.pvid===row.pvid)).map(row=>({...row}))});
  return {guilds,invitations};
}
